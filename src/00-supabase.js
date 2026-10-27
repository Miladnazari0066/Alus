'use strict';

// 👇👇 این دو خط را با Project URL و anon key پروژه جدیدت جایگزین کن 👇👇
var SUPABASE_URL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoY2ZseHNqbG5lbm1hcmRycWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTI3NzgsImV4cCI6MjEwODY2ODc3OH0.SpJPTFzds6-5htJ6PdtRywDUlqUsIHBbvJzPRM8tr0U';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoY2ZseHNqbG5lbm1hcmRycWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzA5Mjc3OCwiZXhwIjoyMTA4NjY4Nzc4fQ.XChyHfZkbMMMsLwMPGBHGQCVkyg83D7oorbcpyYPTDg';
// 👆👆 ======================================================= 👆👆

var supabaseClient = null;
var syncTimeout = null;

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
