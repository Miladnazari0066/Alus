'use strict';

// -------------------------------------------------------------
// تنظیمات دیتابیس (پروژه اول)
// -------------------------------------------------------------
var SUPABASE_URL = 'https://thcflxsjlnenmardrqkz.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoY2ZseHNqbG5lbm1hcmRycWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzA5Mjc3OCwiZXhwIjoyMTA4NjY4Nzc4fQ.XChyHfZkbMMMsLwMPGBHGQCVkyg83D7oorbcpyYPTDg';

// -------------------------------------------------------------
// تنظیمات استوریج (پروژه دوم - عکس‌ها)
// -------------------------------------------------------------
var STORAGE_SUPABASE_URL = 'https://njmuhoisajdcbyafpsai.supabase.co';
var STORAGE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbXVob2lzYWpkY2J5YWZwc2FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzA5MzY1OSwiZXhwIjoyMTA4NjY5NjU5fQ.4lapNcxrfLxp2B7tIoF1QwMwqb1zZeXv4ajiecAb01c';

var supabaseClient = null;
var supabaseStorageClient = null;
var syncChannel = null;
var presenceChannel = null;
var onlineUsers = {};

var pollInterval = null;
var isFetching = false;
var isSaving = false;
var pendingData = null;
var syncToastTimeout = null;

// ساخت نوار پیشرفت بالای صفحه
if (!document.getElementById('top-sync-bar')) {
  var topBar = document.createElement('div');
  topBar.id = 'top-sync-bar';
  topBar.className = 'top-sync-bar';
  document.body.appendChild(topBar);
}

function updateSyncIndicator(status) {
  var el = document.getElementById('sync-indicator');
  if (!el) return;
  el.className = 'sync-pill ' + status;
  if (status === 'online') {
    el.innerHTML = IC.cloudCheck + '<span class="txt">همگام‌سازی فعال</span>';
  } else if (status === 'syncing') {
    el.innerHTML = IC.cloudSync + '<span class="txt">در حال ارسال...</span>';
  } else {
    el.innerHTML = IC.cloudOff + '<span class="txt">عدم دسترسی به سرور</span>';
  }
}

function pulseSyncIndicator() {
  var el = document.getElementById('sync-indicator');
  if (el) {
    el.classList.add('pulse');
    setTimeout(function() { el.classList.remove('pulse'); }, 1000);
  }
}

function showSyncToast(title, desc) {
  if (syncToastTimeout) clearTimeout(syncToastTimeout);
  syncToastTimeout = setTimeout(function() {
    if (typeof toast === 'function') toast(title, desc, 'success');
  }, 1500);
}

function checkDeviceOnline() {
  if (navigator.onLine === false) updateSyncIndicator('offline');
  else updateSyncIndicator('online');
}

window.addEventListener('online', function() {
  checkDeviceOnline();
  if (supabaseClient) fetchLatestCloudData();
});
window.addEventListener('offline', function() {
  updateSyncIndicator('offline');
});

(function loadSupabaseSDK() {
  if (window.supabase) { initSupabase(); return; }
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

// پاکسازی آدرس برای جلوگیری از خطای 404 (حذف /rest/v1 یا /storage/v1)
function cleanUrl(url) {
  if (!url) return '';
  return url.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '').replace(/\/storage\/v1\/?$/, '');
}

function initSupabase() {
  if (!window.supabase || supabaseClient) return;
  try {
    var dbUrl = cleanUrl(SUPABASE_URL);
    var stUrl = cleanUrl(STORAGE_SUPABASE_URL);
    supabaseClient = window.supabase.createClient(dbUrl, SUPABASE_ANON_KEY);
    if (stUrl) {
      supabaseStorageClient = window.supabase.createClient(stUrl, STORAGE_SUPABASE_ANON_KEY);
    }
    console.log('[Supabase] Clients initialized.');
    checkDeviceOnline();

    pullFromCloud().then(function(cloudData) {
      var localData = loadDB();
      var hasCloudData = cloudData && cloudData.users && cloudData.users.length > 0;
      var hasLocalData = localData.users && localData.users.length > 0;

      if (hasCloudData) {
        var cloudStr = JSON.stringify(cloudData);
        var localStr = localStorage.getItem(K_DB);
        if (cloudStr !== localStr) {
          localStorage.setItem(K_DB, cloudStr);
          if (typeof clearCache === 'function') clearCache();
          if (typeof render === 'function') render();
        }
      } else if (!hasLocalData) {
        var seedData = seed();
        localStorage.setItem(K_DB, JSON.stringify(seedData));
        if (typeof clearCache === 'function') clearCache();
        syncToCloud(seedData);
        if (typeof render === 'function') render();
      } else {
        syncToCloud(localData);
      }
      startCloudSync();
    });
  } catch(e) {
    console.error('[Supabase] Init error:', e);
  }
}

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

  var topBar = document.getElementById('top-sync-bar');
  if (topBar) { topBar.classList.remove('done'); topBar.classList.add('active'); }

  supabaseClient.from('alus_sync').upsert({ id: 'main_db', data: dataToSync, updated_at: new Date() })
    .then(function (res) {
      isSaving = false;
      if (res.error) console.error('[Sync] Upload error:', res.error);
      else console.log('[Sync] Upload success');
      updateSyncIndicator('online');

      if (topBar) {
        topBar.classList.remove('active');
        topBar.classList.add('done');
        setTimeout(function() { topBar.classList.remove('done'); topBar.style.width = '0%'; }, 600);
      }
      if (pendingData) doSync();
    })
    .catch(function(err) {
      isSaving = false;
      console.error('[Sync] Upload network error:', err);
      updateSyncIndicator('offline');
      if (topBar) topBar.classList.remove('active');
      if (pendingData) doSync();
    });
}

function pullFromCloud() {
  if (!supabaseClient) return Promise.resolve(null);
  return supabaseClient.from('alus_sync').select('data').eq('id', 'main_db').maybeSingle()
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
            pulseSyncIndicator();
            showSyncToast('اطلاعات به‌روز شد', 'آخرین تغییرات از دستگاه دیگر اعمال شد.');
          }
        }
      }
    })
    .subscribe(function(status) { console.log('[Realtime] Status:', status); });

  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(fetchLatestCloudData, 3000);
  window.addEventListener('focus', fetchLatestCloudData);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') fetchLatestCloudData();
  });
  checkDeviceOnline();
}

function fetchLatestCloudData() {
  if (!supabaseClient || isFetching || isSaving) return;
  isFetching = true;
  
  supabaseClient.from('alus_sync').select('data').eq('id', 'main_db').maybeSingle()
    .then(function(res) {
      isFetching = false;
      if (res.error) return;
      if (res.data && res.data.data) {
        var cloudStr = JSON.stringify(res.data.data);
        var localStr = localStorage.getItem(K_DB);
        if (cloudStr !== localStr) {
          localStorage.setItem(K_DB, cloudStr);
          if (typeof clearCache === 'function') clearCache();
          var activeEl = document.activeElement;
          var isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
          var hasModal = document.querySelector('.modal-bd') || document.querySelector('.drawer') || document.querySelector('.cmd-bd');
          if (typeof render === 'function' && !isInput && !hasModal) {
            render();
            pulseSyncIndicator();
            showSyncToast('اطلاعات به‌روز شد', 'آخرین تغییرات اعمال شد.');
          }
        }
      }
    })
    .catch(function(err) { isFetching = false; });
}

// -------------------------------------------------------------
// سیستم حضور آنلاین (Presence)
// -------------------------------------------------------------
function startPresence() {
  if (!supabaseClient || !App.user) return;
  if (presenceChannel) return;
  
  presenceChannel = supabaseClient.channel('presence_online', {
    config: { presence: { key: App.user.id } }
  });
  
  presenceChannel
    .on('presence', { event: 'sync' }, function() {
      var state = presenceChannel.presenceState();
      onlineUsers = {};
      Object.keys(state).forEach(function(uid) {
        if (state[uid] && state[uid].length) {
          onlineUsers[uid] = state[uid][0];
        }
      });
      console.log('[Presence] Online users:', Object.keys(onlineUsers).length);
      window.dispatchEvent(new CustomEvent('presence-changed', { detail: onlineUsers }));
    })
    .on('presence', { event: 'join' }, function(info) {
      console.log('[Presence] User joined:', info.key);
    })
    .on('presence', { event: 'leave' }, function(info) {
      console.log('[Presence] User left:', info.key);
    })
    .subscribe(function(status) {
      if (status === 'SUBSCRIBED') {
        updateMyActivity(App.route.name);
        saveLastSeen();
      }
    });
}

function updateMyActivity(page) {
  if (!presenceChannel || !App.user) return;
  try {
    presenceChannel.track({
      user_id: App.user.id,
      name: App.user.name,
      role: App.user.role,
      page: page,
      online_at: new Date().toISOString()
    });
  } catch(e) { console.error('[Presence] Track error:', e); }
}

function stopPresence() {
  if (presenceChannel) {
    try { presenceChannel.untrack(); } catch(e) {}
    try { supabaseClient.removeChannel(presenceChannel); } catch(e) {}
    presenceChannel = null;
    onlineUsers = {};
    window.dispatchEvent(new CustomEvent('presence-changed', { detail: {} }));
  }
}

function getOnlineUsers() {
  return onlineUsers;
}

function saveLastSeen() {
  if (!App.user) return;
  try {
    var db = loadDB();
    var changed = false;
    for (var i = 0; i < db.users.length; i++) {
      if (db.users[i].id === App.user.id) {
        db.users[i].lastSeen = new Date().toISOString();
        changed = true;
        break;
      }
    }
    if (changed) saveDB(db);
  } catch(e) { console.error('[LastSeen]', e); }
}

window.addEventListener('beforeunload', function() {
  if (App.user) saveLastSeen();
});

setInterval(function() {
  if (App.user && document.visibilityState === 'visible') {
    saveLastSeen();
  }
}, 5 * 60 * 1000);

window.addEventListener('presence-changed', function() {
  if (document.getElementById('u-table') && typeof window._usersDrawFn === 'function') {
    window._usersDrawFn();
  }
});