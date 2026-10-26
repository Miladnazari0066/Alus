'use strict';

function pushSearchHistory(q) {
  q = (q || '').trim();
  if (!q || q.length < 2) return;
  var hist = getSearchHistory().filter(function (h) { return h !== q; });
  hist.unshift(q);
  hist = hist.slice(0, 6);
  App.prefs.searchHistory = hist;
  savePrefs();
}

function getSearchHistory() {
  return (App.prefs && App.prefs.searchHistory) || [];
}

function clearSearchHistory() {
  App.prefs.searchHistory = [];
  savePrefs();
}

function globalSearchEntries(db, q) {
  var query = (q || '').trim().toLowerCase();
  if (!query) return [];
  var out = [];
  db.products.forEach(function (p) {
    if ((p.name || '').toLowerCase().indexOf(query) >= 0 || (p.code || '').toLowerCase().indexOf(query) >= 0) {
      out.push({ label: p.name, sub: 'کالا · ' + (p.code || '—'), icon: IC.tag, run: function () { go('stock'); }, sec: 'کالاها' });
    }
  });
  db.users.forEach(function (u) {
    if ((u.name || '').toLowerCase().indexOf(query) >= 0 || (u.username || '').toLowerCase().indexOf(query) >= 0) {
      out.push({ label: u.name, sub: 'کاربر · ' + ROLES[u.role], icon: IC.users, run: function () { go('users'); }, sec: 'کاربران' });
    }
  });
  db.transfers.forEach(function (t) {
    if ((t.code || '').toLowerCase().indexOf(query) >= 0) {
      var p = getProd(db, t.productId);
      out.push({ label: t.code, sub: 'انتقال · ' + ((p && p.name) || '—'), icon: IC.swap, run: function () { openTransfer(t.id); }, sec: 'انتقال‌ها' });
    }
  });
  return out.slice(0, 8);
}
