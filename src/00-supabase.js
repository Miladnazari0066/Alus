'use strict';

var SUPABASE_URL = 'https://thcflxsjlnenmardrqkz.supabase.co/rest/v1';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoY2ZseHNqbG5lbm1hcmRycWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzA5Mjc3OCwiZXhwIjoyMTA4NjY4Nzc4fQ.XChyHfZkbMMMsLwMPGBHGQCVkyg83D7oorbcpyYPTDg';

var STORAGE_SUPABASE_URL = 'https://njmuhoisajdcbyafpsai.supabase.co';
var STORAGE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbXVob2lzYWpkY2J5YWZwc2FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzA5MzY1OSwiZXhwIjoyMTA4NjY5NjU5fQ.4lapNcxrfLxp2B7tIoF1QwMwqb1zZeXv4ajiecAb01c';

var supabaseClient = null;
var supabaseStorageClient = null;
var syncChannel = null;
var pollInterval = null;
var isFetching = false;
var isSaving = false;
var pendingData = null; // صف ارسال داده‌ها
var lastSyncStatus = 'offline';

(function loadSupabaseSDK() {
  // اگر از قبل لود شده بود، مستقیماً راه‌اندازی کن
  if (window.supabase) {
    initSupabase();
    return;
  }
  
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.8/dist/umd/supabase.min.js';
  script.async = true;
  script.onload = function () { initSupabase(); };
  script.onerror = function () {
    var script2 = document.createElement('script');
    script2.src = 'https://unpkg.com/@supabase/supabase-js@2.39.8/dist/umd/supabase.min.js';
    script2.async = true;
    script2.onload = function () { initSupabase(); };
    document.head.appendChild(script2);
  };
  document.head.appendChild(script);
})();

function cleanUrl(url) {
  return url ? url.replace(/\/+$/, '') : '';
}

function initSupabase() {
  if (!window.supabase) return;
  if (supabaseClient) return; // جلوگیری از ساخت مجدد

  try {
    var dbUrl = cleanUrl(SUPABASE_URL);
    supabaseClient = window.supabase.createClient(dbUrl, SUPABASE_ANON_KEY);
    
    if (STORAGE_SUPABASE_URL) {
      var stUrl = cleanUrl(STORAGE_SUPABASE_URL);
      supabaseStorageClient = window.supabase.createClient(stUrl, STORAGE_SUPABASE_ANON_KEY);
    }
    console.log('[Supabase] Clients initialized.');
    updateSyncIndicator('online');

    // 👇 حالا که کلاینت آماده است، سیستم سینک را روشن می‌کنیم 👇
    startCloudSync();
    
    // دریافت اولیه اطلاعات از ابر
    pullFromCloud().then(function(cloudData) {
      if (cloudData) {
        var cloudStr = JSON.stringify(cloudData);
        var localStr = localStorage.getItem(K_DB);
        if (cloudStr !== localStr) {
          localStorage.setItem(K_DB, cloudStr);
          if (typeof clearCache === 'function') clearCache();
          if (typeof render === 'function') render();
          if (typeof toast === 'function') toast('سینک شد', 'اطلاعات از سرور دریافت شد', 'success');
        }
      }
    });

  } catch(e) {
    console.error('[Supabase] Init error:', e);
  }
}

function updateSyncIndicator(status) {
  lastSyncStatus = status;
  var el = document.getElementById('sync-indicator');
  if (!el) return;
  
  el.className = 'sync-indicator ' + (status === 'syncing' ? '' : status);
  
  if (status === 'online') {
    el.innerHTML = '<span class="dot"></span><span class="txt">متصل</span>';
  } else if (status === 'syncing') {
    el.innerHTML = '<span class="dot"></span><span class="txt">در حال ارسال...</span>';
  } else {
    el.innerHTML = '<span class="dot"></span><span class="txt">قطع</span>';
  }
}

// سیستم ارسال داده (با صف انتظار برای جلوگیری از گم شدن دیتا)
function syncToCloud(db) {
  if (!supabaseClient) return;
  
  pendingData = db;
  if (isSaving) return; 
  
  doSync();
}

function doSync() {
  if (!pendingData || !supabaseClient) return;
  
  var dataToSync = pendingData;
  pendingData = null;
  
  isSaving = true;
  updateSyncIndicator('syncing');
  console.log('[Sync] Uploading to cloud...');
  
  supabaseClient.from('alus_sync').upsert({ id: 'main_db', data: dataToSync, updated_at: new Date() })
    .then(function (res) { 
      isSaving = false;
      if (res.error) {
        console.error('[Sync Error]', res.error);
        updateSyncIndicator('offline');
      } else {
        console.log('[Sync] Upload success');
        updateSyncIndicator('online');
      }
      // اگر در حین ارسال، داده جدیدی ذخیره شده بود، آن را هم بفرست
      if (pendingData) doSync();
    })
    .catch(function(err) { 
      isSaving = false;
      console.error('[Sync Network Error]', err);
      updateSyncIndicator('offline');
      if (pendingData) doSync();
    });
}

function pullFromCloud() {
  if (!supabaseClient) return Promise.resolve(null);
  return supabaseClient.from('alus_sync').select('data').eq('id', 'main_db').single()
    .then(function (res) { return res.data ? res.data.data : null; })
    .catch(function () { return null; });
}

function uploadImageToCloud(file) {
  return new Promise(function(resolve, reject) {
    if (!supabaseStorageClient) return reject(new Error('استوریج متصل نیست.'));
    var fileName = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.jpg';
    supabaseStorageClient.storage.from('product-images')
      .upload(fileName, file, { contentType: 'image/jpeg', upsert: false })
      .then(function(res) {
        if (res.error) throw res.error;
        var publicUrl = supabaseStorageClient.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
        resolve(publicUrl);
      })
      .catch(function(err) { reject(err); });
  });
}

function startCloudSync() {
  if (!supabaseClient) return;

  if (syncChannel) supabaseClient.removeChannel(syncChannel);
  syncChannel = supabaseClient.channel('alus_sync_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alus_sync' }, function(payload) {
      if (payload.new && payload.new.id === 'main_db' && payload.new.data) {
        if (isSaving) return; 
        
        console.log('[Realtime] Change detected from other device');
        var cloudStr = JSON.stringify(payload.new.data);
        var localStr = localStorage.getItem(K_DB);
        
        if (cloudStr !== localStr) {
          localStorage.setItem(K_DB, cloudStr);
          if (typeof clearCache === 'function') clearCache();
          
          var activeEl = document.activeElement;
          var isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
          var hasModal = document.querySelector('.modal-bd') || document.querySelector('.drawer') || document.querySelector('.cmd-bd');
          
          if (typeof render === 'function' && !isInput && !hasModal) {
            render();
            if (typeof toast === 'function') toast('سینک شد', 'تغییرات از دستگاه دیگر', 'success');
          }
        }
      }
    })
    .subscribe(function(status) {
      console.log('[Realtime] Status:', status);
      if (status === 'SUBSCRIBED') {
        updateSyncIndicator('online');
      }
    });

  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(fetchLatestCloudData, 2000); 
  
  window.addEventListener('focus', fetchLatestCloudData);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') fetchLatestCloudData();
  });
  
  updateSyncIndicator('online');
}

function fetchLatestCloudData() {
  if (!supabaseClient || isFetching || isSaving) return;
  isFetching = true;
  
  supabaseClient.from('alus_sync').select('data').eq('id', 'main_db').single()
    .then(function(res) {
      isFetching = false;
      if (res.error) {
        if (res.error.code !== 'PGRST116') {
          updateSyncIndicator('offline');
        }
        return; 
      }
      
      updateSyncIndicator('online');
      
      if (res.data && res.data.data) {
        var cloudStr = JSON.stringify(res.data.data);
        var localStr = localStorage.getItem(K_DB);
        
        if (cloudStr !== localStr) {
          console.log('[Poll] New data from cloud detected');
          localStorage.setItem(K_DB, cloudStr);
          if (typeof clearCache === 'function') clearCache();
          
          var activeEl = document.activeElement;
          var isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
          var hasModal = document.querySelector('.modal-bd') || document.querySelector('.drawer') || document.querySelector('.cmd-bd');
          
          if (typeof render === 'function' && !isInput && !hasModal) {
            render();
            if (typeof toast === 'function') toast('سینک شد', 'تغییرات دستگاه دیگر اعمال شد', 'success');
          }
        }
      }
    })
    .catch(function(err) {
      isFetching = false;
      updateSyncIndicator('offline');
      console.warn('[Poll Network Error]', err);
    });
}
