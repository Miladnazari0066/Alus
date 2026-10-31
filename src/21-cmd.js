'use strict';

function openCmd() {
  if ($('#cmd-bd')) return;
  var bd = document.createElement('div');
  bd.className = 'cmd-bd';
  bd.id = 'cmd-bd';
  
  // 👇 اصلاح شد: به جای roles از سیستم دسترسی‌های جدید (perm) استفاده میکند 👇
  var items = NAV.filter(function (i) { return hasPermission(App.user, i.perm); });
  
  bd.innerHTML = '<div class="cmd"><input id="cmd-input" placeholder="جستجو یا اجرای دستور..." autocomplete="off" /><div class="cmd-list" id="cmd-list"></div></div>';
  document.body.appendChild(bd);
  var input = $('#cmd-input');
  var list = $('#cmd-list');
  var sel = 0;
  var currentQuery = '';
  var db = loadDB();

  function build(q) {
    currentQuery = q;
    var query = (q || '').toLowerCase().trim();
    var html = '';

    var hist = getSearchHistory();
    if (!query && hist.length) {
      html += '<div class="cmd-history-title">' + IC.history + ' جستجوهای اخیر</div>';
      hist.forEach(function (h) {
        html += '<div class="cmd-history-item" data-hist="' + esc(h) + '">' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
          '<span class="cmd-hist-q">' + esc(h) + '</span>' +
          '<button type="button" class="cmd-hist-x" data-hist-x="' + esc(h) + '" title="حذف">' + IC.close + '</button></div>';
      });
    }

    var navItems = items.map(function (i) {
      return { label: i.label, icon: i.icon, kbd: '↵', run: function () { go(i.key); }, sec: 'صفحه‌ها' };
    });
    
    var acts = [
      { label: 'مرکز اعلان‌ها',    icon: IC.bell,    run: function () { openNotif(); }, sec: 'اقدامات' },
      { label: App.theme === 'light' ? 'حالت تاریک' : 'حالت روشن', icon: App.theme === 'light' ? IC.moon : IC.sun, run: toggleTheme, sec: 'تنظیمات' },
      { label: 'خروج از حساب', icon: IC.logout, run: doLogout, sec: 'تنظیمات' }
    ];

    var globals = query ? globalSearchEntries(db, query) : [];
    var navFiltered = query ? navItems.concat(acts).filter(function (c) { return c.label.toLowerCase().indexOf(query) >= 0; }) : navItems.concat(acts);

    var all = [];
    globals.forEach(function (g) { all.push(g); });
    navFiltered.forEach(function (g) { all.push(g); });

    if (!all.length) {
      list.innerHTML = html + '<div class="cmd-empty">موردی یافت نشد</div>';
      list._f = [];
      return;
    }

    var lastSec = null;
    all.forEach(function (c, i) {
      if (c.sec && c.sec !== lastSec) {
        html += '<div class="cmd-sec">' + c.sec + '</div>';
        lastSec = c.sec;
      }
      html += '<div class="cmd-item ' + (i === sel ? 'sel' : '') + '" data-i="' + i + '">' + c.icon +
        '<div style="flex:1;min-width:0"><b>' + esc(c.label) + '</b>' +
        (c.sub ? '<div class="cmd-sub">' + esc(c.sub) + '</div>' : '') +
        '</div>' + (c.kbd ? '<span class="kbd">' + c.kbd + '</span>' : '') + '</div>';
    });
    list.innerHTML = html;
    list._f = all;

    $$('.cmd-item', list).forEach(function (el) {
      el.addEventListener('click', function () {
        var c = all[+el.dataset.i];
        closeCmd();
        if (currentQuery.trim().length >= 2) pushSearchHistory(currentQuery);
        if (c && c.run) c.run();
      });
      el.addEventListener('mouseenter', function () {
        sel = +el.dataset.i;
        $$('.cmd-item', list).forEach(function (x) { x.classList.toggle('sel', +x.dataset.i === sel); });
      });
    });
    $$('.cmd-history-item', list).forEach(function (el) {
      el.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-hist-x]')) return;
        input.value = el.dataset.hist;
        sel = 0;
        build(el.dataset.hist);
        input.focus();
      });
      var x = el.querySelector('[data-hist-x]');
      if (x) {
        x.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var target = x.getAttribute('data-hist-x');
          App.prefs.searchHistory = getSearchHistory().filter(function (hh) { return hh !== target; });
          savePrefs();
          build(input.value);
        });
      }
    });
  }

  build('');
  input.focus();
  input.addEventListener('input', function () { sel = 0; build(input.value); });
  input.addEventListener('keydown', function (e) {
    var f = list._f || [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      sel = Math.min(sel + 1, f.length - 1);
      $$('.cmd-item', list).forEach(function (x) { x.classList.toggle('sel', +x.dataset.i === sel); });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      sel = Math.max(sel - 1, 0);
      $$('.cmd-item', list).forEach(function (x) { x.classList.toggle('sel', +x.dataset.i === sel); });
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      var c = f[sel];
      if (c) {
        closeCmd();
        if (currentQuery.trim().length >= 2) pushSearchHistory(currentQuery);
        if (c.run) c.run();
      }
    }
    if (e.key === 'Escape') closeCmd();
  });
  bd.addEventListener('click', function (e) { if (e.target === bd) closeCmd(); });
}

function closeCmd() {
  var x = $('#cmd-bd');
  if (x) x.remove();
}
