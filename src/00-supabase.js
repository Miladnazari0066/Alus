'use strict';

// ⚠️ این مقادیر را با اطلاعات پروژه جدید خودت جایگزین کن
var SUPABASE_URL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoY2ZseHNqbG5lbm1hcmRycWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTI3NzgsImV4cCI6MjEwODY2ODc3OH0.SpJPTFzds6-5htJ6PdtRywDUlqUsIHBbvJzPRM8tr0U';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoY2ZseHNqbG5lbm1hcmRycWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzA5Mjc3OCwiZXhwIjoyMTA4NjY4Nzc4fQ.XChyHfZkbMMMsLwMPGBHGQCVkyg83D7oorbcpyYPTDg';

var supabaseClient = null;
var syncTimeout = null;

// این تابع کتابخانه را از اینترنت دانلود می‌کند و سایت را قفل نمی‌کند
(function loadSupabaseSDK() {
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.async = true;
  
  script.onload = function () {
    initSupabase();
  };
  
  script.onerror = function () {
    console.warn('[Supabase] jsdelivr failed, trying unpkg...');
    var script2 = document.createElement('script');
    script2.src = 'https://unpkg.com/@supabase/supabase-js@2';
    script2.async = true;
    script2.onload = function () { initSupabase(); };
    script2.onerror = function () {
      console.error('[Supabase] Failed to load SDK from all CDNs. Check your internet connection.');
    };
    document.head.appendChild(script2);
  };
  
  document.head.appendChild(script);
})();

function initSupabase() {
  if (window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('[Supabase] Client initialized successfully.');
    } catch(e) {
      console.error('[Supabase] Error creating client:', e);
    }
  }
}

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
