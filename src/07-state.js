'use strict';

var App = {
  user: null,
  route: { name: 'dashboard', params: {} },
  theme: 'light',
  prefs: {}
};

try { App.prefs = JSON.parse(localStorage.getItem(K_PREF) || '{}'); } catch (e) { App.prefs = {}; }
App.theme = App.prefs.theme || 'light';
document.documentElement.setAttribute('data-theme', App.theme);

function savePrefs() {
  try { localStorage.setItem(K_PREF, JSON.stringify({ theme: App.theme, searchHistory: App.prefs.searchHistory || [] })); } catch (e) {}
}

function sanitizeUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, username: u.username, role: u.role, isActive: u.isActive, permissions: u.permissions || {} };
}

function currentUser() {
  var id = null;
  try { id = localStorage.getItem(K_SES); } catch (e) {}
  if (!id) return null;
  var us = loadDB().users;
  for (var i = 0; i < us.length; i++) {
    if (us[i].id === id && us[i].isActive) return sanitizeUser(us[i]);
  }
  return null;
}

function saveRoute() {
  try { sessionStorage.setItem(K_ROUTE, JSON.stringify(App.route)); } catch (e) {}
}

function clearRoute() {
  try { sessionStorage.removeItem(K_ROUTE); } catch (e) {}
}

function restoreRoute() {
  try {
    var r = sessionStorage.getItem(K_ROUTE);
    if (!r) return { name: 'dashboard', params: {} };
    var p = JSON.parse(r);
    if (!p || typeof p.name !== 'string') return { name: 'dashboard', params: {} };
    return { name: p.name, params: p.params || {} };
  } catch (e) {
    return { name: 'dashboard', params: {} };
  }
}