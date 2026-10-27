'use strict';

// --- ۱. پروژه اول (دیتابیس) ---
var SUPABASE_URL = 'https://thcflxsjlnenmardrqkz.supabase.co/rest/v1/';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoY2ZseHNqbG5lbm1hcmRycWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzA5Mjc3OCwiZXhwIjoyMTA4NjY4Nzc4fQ.XChyHfZkbMMMsLwMPGBHGQCVkyg83D7oorbcpyYPTDg';

// --- ۲. پروژه دوم (عکس‌ها) ---
// ⚠️ این دو خط را با آدرس و کلید پروژه دوم (مخصوص عکس) جایگزین کن 👇
var STORAGE_SUPABASE_URL = 'https://njmuhoisajdcbyafpsai.supabase.co/rest/v1/';
var STORAGE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbXVob2lzYWpkY2J5YWZwc2FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzA5MzY1OSwiZXhwIjoyMTA4NjY5NjU5fQ.4lapNcxrfLxp2B7tIoF1QwMwqb1zZeXv4ajiecAb01c';
// ⚠️ ======================================================= 👆

var supabaseClient = null;        // برای دیتابیس
var supabaseStorageClient = null; // برای عکس‌ها
var syncTimeout = null;

function initSupabase() {
  if (window.supabase) {
    try {
      // اتصال دیتابیس
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // اتصال استوریج (فقط اگر آدرس رو عوض کرده باشی)
      if (STORAGE_SUPABASE_URL && STORAGE_SUPABASE_URL.indexOf('اینجا') === -1) {
        supabaseStorageClient = window.supabase.createClient(STORAGE_SUPABASE_URL, STORAGE_SUPABASE_ANON_KEY);
      }
      console.log('[Supabase] DB and Storage Clients initialized.');
    } catch(e) {
      console.error('[Supabase] Error creating clients:', e);
    }
  }
}

initSupabase();

// سینک دیتابیس
function syncToCloud(db) {
  if (!supabaseClient) return;
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(function () {
    supabaseClient.from('alus_sync').upsert({ id: 'main_db', data: db, updated_at: new Date() })
      .then(function (res) {
        if (res.error) console.error('[Supabase Sync Error]', res.error);
      });
  }, 2000);
}

function pullFromCloud() {
  if (!supabaseClient) return Promise.resolve(null);
  return supabaseClient.from('alus_sync').select('data').eq('id', 'main_db').single()
    .then(function (res) {
      if (res.data && res.data.data) return res.data.data;
      return null;
    })
    .catch(function (err) { return null; });
}

// آپلود عکس به اکانت دوم
function uploadImageToCloud(file) {
  return new Promise(function(resolve, reject) {
    if (!supabaseStorageClient) {
      return reject(new Error('اکانت استوریج (پروژه دوم) متصل نیست. آدرس و کلید را چک کنید.'));
    }
    
    var fileName = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.jpg';
    
    supabaseStorageClient.storage
      .from('product-images')
      .upload(fileName, file, { contentType: 'image/jpeg', upsert: false })
      .then(function(res) {
        if (res.error) throw res.error;
        // گرفتن لینک عمومی برای نمایش در سایت
        var publicUrl = supabaseStorageClient.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
        resolve(publicUrl);
      })
      .catch(function(err) { reject(err); });
  });
}
