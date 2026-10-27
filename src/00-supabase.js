'use strict';

// ⚠️ مقادیر پروژه جدید خودت را اینجا جایگذاری کن
var SUPABASE_URL = 'https://thcflxsjlnenmardrqkz.supabase.co/rest/v1/';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoY2ZseHNqbG5lbm1hcmRycWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzA5Mjc3OCwiZXhwIjoyMTA4NjY4Nzc4fQ.XChyHfZkbMMMsLwMPGBHGQCVkyg83D7oorbcpyYPTDg';

var supabaseClient = null;
var syncTimeout = null;

// ساخت کلاینت با استفاده از فایل لوکال (بدون نیاز به اینترنت برای لود کتابخانه)
function initSupabase() {
  if (window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('[Supabase] Client initialized successfully.');
    } catch(e) {
      console.error('[Supabase] Error creating client:', e);
    }
  } else {
    console.warn('[Supabase] Library not found. Ensure src/supabase.min.js is loaded.');
  }
}

initSupabase();

function syncToCloud(db) {
  if (!supabaseClient) return;
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(function () {
    supabaseClient.from('alus_sync').upsert({ id: 'main_db', data: db, updated_at: new Date() })
      .then(function (res) {
        if (res.error) console.error('[Supabase Sync Error]', res.error);
      })
      .catch(function (err) {
        console.warn('[Supabase Sync Network Error]', err.message);
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
    .catch(function (err) {
      console.warn('[Supabase Pull Network Error]', err.message);
      return null;
    });
}
