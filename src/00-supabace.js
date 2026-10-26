'use strict';

var SUPABASE_URL = 'https://cvvmzmznjjrywyknerhnf.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dm1tem5qanJ5d3lrbmVyaG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMzk1NzksImV4cCI6MjEwODYxNTU3OX0.mAojaDswxcNmb1QHIKlWYcdlGurskjs3iDriXRWsmVE';

var supabaseClient = null;
var syncTimeout = null;

function initSupabase() {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] Connected to', SUPABASE_URL);
  } else {
    console.warn('[Supabase] SDK not loaded properly.');
  }
}

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