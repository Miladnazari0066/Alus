'use strict';

var SUPABASE_URL = 'https://ythblbdfjlxmeqwkikhoi.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0aGJsYmRmamx4bWVxd2tpaG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNjE0NzIsImV4cCI6MjEwODYzNzQ3Mn0.IRoMTEZXFwT0YfffQuUyMLWIgmsD7m2c_a0rQ-ifF2w';

var supabaseClient = null;
var syncTimeout = null;

// ساخت کلاینت با استفاده از فایل لوکال
function initSupabase() {
  if (window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('[Supabase] Client initialized successfully.');
    } catch(e) {
      console.error('[Supabase] Error creating client:', e);
    }
  } else {
    console.warn('[Supabase] Library not found. Ensure src/supabase.min.js is loaded before this file.');
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
      return null;
    });
}
