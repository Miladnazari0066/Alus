'use strict';

var NAV = [
  { key: 'dashboard',     label: 'داشبورد',        icon: IC.home,     roles: ['admin', 'manager', 'accountant', 'warehouse_officer'], kbd: '1' },
  { key: 'stock',         label: 'موجودی',         icon: IC.layers,   roles: ['admin', 'manager', 'accountant', 'warehouse_officer'], kbd: '2' },
  { key: 'transfers',     label: 'جابه‌جایی',      icon: IC.swap,     roles: ['admin', 'manager', 'accountant', 'warehouse_officer'], kbd: '3' },
  { key: 'inbounds',      label: 'ورود کالا',      icon: IC.inbound,  roles: ['admin', 'manager', 'accountant', 'warehouse_officer'], kbd: '4' },
  { key: 'reports',       label: 'گزارش‌ها',       icon: IC.chart,    roles: ['admin', 'manager', 'accountant', 'warehouse_officer'] },
  { key: 'newTransfer',   label: 'درخواست جدید',   icon: IC.plus,     roles: ['admin', 'manager', 'warehouse_officer'] },
  { key: 'newInbound',    label: 'ثبت ورود',       icon: IC.factory,  roles: ['admin', 'manager', 'warehouse_officer'] },
  { key: 'directCustomer',label: 'ارسال به مشتری', icon: IC.truck,    roles: ['admin', 'manager', 'warehouse_officer'] },
  { key: 'stockInit',     label: 'مقداردهی',       icon: IC.sparkle,  roles: ['admin', 'manager', 'warehouse_officer'] },
  { key: 'products',      label: 'کالاها',         icon: IC.tag,      roles: ['admin', 'manager'] },
  { key: 'users',         label: 'کاربران',        icon: IC.users,    roles: ['admin', 'manager'] },
  { key: 'settings',      label: 'تنظیمات',        icon: IC.settings, roles: ['admin'] }
];

function go(name, params) {
  App.route = { name: name, params: params || {} };
  saveRoute();
  window.scrollTo(0, 0);
  render();
}
window.go = go;

function toggleTheme() {
  App.theme = App.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', App.theme);
  savePrefs();
  var b = $('#theme-btn');
  if (b) b.innerHTML = App.theme === 'light' ? IC.moon : IC.sun;
  toast(App.theme === 'light' ? 'حالت روشن' : 'حالت تاریک', '', 'success');
}

function doLogin(u, p) {
  var us = loadDB().users;
  for (var i = 0; i < us.length; i++) {
    if (us[i].username === u && us[i].password === p && us[i].isActive) {
      try { localStorage.setItem(K_SES, us[i].id); } catch (e) {}
      App.user = sanitizeUser(us[i]);
      return App.user;
    }
  }
  return null;
}

function doLogout() {
  try { localStorage.removeItem(K_SES); } catch (e) {}
  clearRoute();
  App.user = null;
  closeSheet();
  render();
  celebrate('خارج شدید', 'به امید دیدار', 'info', 1600);
}

function render() {
  try {
    App.user = currentUser();
    if (!App.user) { renderLogin(); return; }
    renderShell();
  } catch (e) {
    var errEl = document.getElementById('err');
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = 'RENDER ERROR: ' + (e.message || e) + '\n' + (e.stack || '');
    }
    console.error('[render]', e);
  }
}

function renderLogin() {
  $$('.celebrate').forEach(function (el) { el.remove(); });
  app.innerHTML = '<div class="login">' +
    '<div class="login-left">' +
      '<div class="llogo"><div class="badge-i">' + BRAND_A + '</div>' +
        '<div><div class="alus-wm wm">Alus</div><div class="tagline">Furniture Management</div></div></div>' +
      '<div class="ltag">' +
        '<h2>کنترل هوشمند موجودی<br>و جابه‌جایی مبلمان</h2>' +
        '<p>مدیریت دقیق انبارها، ورود از تأمین‌کننده و انتقال با سه مرحله تأیید — همه در یک پنل یکپارچه.</p>' +
        '<div class="lfeat">' +
          '<div class="lfeat-item">' + IC.shield + '<span>سه مرحله تأیید برای هر انتقال</span></div>' +
          '<div class="lfeat-item">' + IC.grid + '<span>تعریف دست و سرویس با اقلام تشکیل‌دهنده</span></div>' +
          '<div class="lfeat-item">' + IC.chart + '<span>گزارش‌های حرفه‌ای با خروجی Excel و PDF</span></div>' +
        '</div>' +
      '</div>' +
      '<div style="opacity:.65;font-size:12px">© ۱۴۰۴ · Alus · نسخه ۱٫۱</div>' +
    '</div>' +
    '<div class="login-right"><div class="login-card">' +
      '<h1>خوش آمدید 👋</h1>' +
      '<div class="sub">برای ادامه وارد حساب خود شوید</div>' +
      '<form class="login-form" id="lf">' +
        '<div class="field"><label>' + IC.users + ' انتخاب سریع کاربر</label>' +
          '<select id="lu-select"><option value="">— انتخاب کنید —</option>' +
            '<option value="admin">راهبر سیستم</option>' +
            '<option value="manager">مدیر</option>' +
            '<option value="acc">حسابدار</option>' +
            '<option value="wh">انباردار</option>' +
          '</select>' +
          '<div class="hint">' + IC.info + ' با انتخاب، نام کاربری و رمز به‌صورت خودکار پر می‌شود</div>' +
        '</div>' +
        '<div class="field"><label>نام کاربری</label>' +
          '<input id="lu" required placeholder="admin" autocomplete="username" /></div>' +
        '<div class="field"><label>رمز عبور</label>' +
          '<div class="pw-wrap">' +
            '<input id="lp" type="password" required placeholder="••••••••" autocomplete="current-password" />' +
            '<button type="button" class="pw-toggle" id="pw-tog" title="نمایش رمز">' + IC.eye + '</button>' +
          '</div></div>' +
        '<button class="btn primary block" type="submit" style="margin-top:6px;height:48px;font-size:14.5px">' + IC.check + ' ورود به سیستم</button>' +
      '</form>' +
    '</div></div>' +
  '</div>';

  var busy = false;
  var sel = $('#lu-select');
  if (sel) {
    sel.addEventListener('change', function () {
      if (sel.value) {
        $('#lu').value = sel.value;
        $('#lp').value = '1111';
      } else {
        $('#lu').value = '';
        $('#lp').value = '';
      }
    });
  }
  var pwTog = $('#pw-tog');
  if (pwTog) {
    pwTog.addEventListener('click', function () {
      var pw = $('#lp');
      if (!pw) return;
      if (pw.type === 'password') { pw.type = 'text'; pwTog.innerHTML = IC.eyeOff; }
      else { pw.type = 'password'; pwTog.innerHTML = IC.eye; }
    });
  }
  $('#lf').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    var u = $('#lu').value.trim();
    var p = $('#lp').value;
    var btn = $('#lf button[type="submit"]');
    if (btn) btn.classList.add('loading');
    $('#lu').disabled = true;
    $('#lp').disabled = true;
    if (sel) sel.disabled = true;
    setTimeout(function () {
      var user = doLogin(u, p);
      if (!user) {
        busy = false;
        if (btn) btn.classList.remove('loading');
        $('#lu').disabled = false;
        $('#lp').disabled = false;
        if (sel) sel.disabled = false;
        var card = $('.login-card');
        if (card) {
          card.style.animation = 'shake .5s';
          setTimeout(function () { card.style.animation = ''; }, 500);
        }
        toast('ورود ناموفق', 'نام کاربری یا رمز اشتباه است', 'error');
        return;
      }
      try { requestNotifPermission(); } catch (e) {}
      celebrate('خوش آمدید ' + user.name, '', 'success', 1600);
      render();
    }, 400);
  });
  attachRippleAll();
}

function renderShell() {
  var user = App.user;
  var navItem = null;
  for (var i = 0; i < NAV.length; i++) {
    if (NAV[i].key === App.route.name) { navItem = NAV[i]; break; }
  }
  if (!navItem || navItem.roles.indexOf(user.role) < 0) {
    App.route = { name: 'dashboard', params: {} };
    saveRoute();
  }
  var items = NAV.filter(function (n) { return n.roles.indexOf(user.role) >= 0; });
  var db = loadDB();
  var pendingAll = db.transfers.filter(function (t) { return t.status.indexOf('pending') === 0; }).length + lowStockItems(db).length;
  var pendingTransfers = db.transfers.filter(function (t) { return t.type !== 'inbound' && t.status.indexOf('pending') === 0; }).length;

  var pillsHTML = items.map(function (it) {
    return '<button type="button" class="nav-pill ' + (App.route.name === it.key ? 'active' : '') + '" data-nav="' + it.key + '">' +
      it.icon + '<span>' + it.label + '</span>' +
      (it.key === 'transfers' && pendingTransfers ? '<span class="nbadge">' + pendingTransfers + '</span>' : '') +
      (it.kbd ? '<span class="kbd">' + it.kbd + '</span>' : '') + '</button>';
  }).join('');

  var tabsDef = [
    { key: 'dashboard', label: 'خانه',    icon: IC.home,  badge: 0 },
    { key: 'stock',     label: 'موجودی',  icon: IC.layers, badge: 0 },
    { key: 'transfers', label: 'انتقال',  icon: IC.swap,   badge: pendingTransfers },
    { key: 'reports',   label: 'گزارش',   icon: IC.chart,  badge: 0 },
    { key: '__more',    label: 'بیشتر',   icon: IC.more,   badge: 0 }
  ];
  var tabKeys = ['dashboard', 'stock', 'transfers', 'reports'];
  var onOther = tabKeys.indexOf(App.route.name) < 0;
  var tabsHTML = tabsDef.map(function (t) {
    var active = App.route.name === t.key || (t.key === '__more' && onOther);
    var bdg = t.badge ? '<span class="tab-badge">' + (t.badge > 9 ? '9+' : t.badge) + '</span>' : '';
    return '<button type="button" class="tab-btn ' + (active ? 'active' : '') + '" data-tab="' + t.key + '">' + t.icon + bdg + '<span>' + t.label + '</span></button>';
  }).join('');

  app.innerHTML =
    '<div class="nav-wrap"><nav class="navbar">' +
      '<div class="nav-brand">' +
        '<div class="brand-logo">' + BRAND_A + '</div>' +
        '<div class="brand-text"><div class="alus-wm wm">Alus</div><small>پنل مدیریت</small></div>' +
      '</div>' +
      '<div class="nav-pills">' + pillsHTML + '</div>' +
      '<div class="nav-right">' +
        '<button type="button" class="search-btn" id="search-btn">' + IC.search + '<span>جستجو...</span><kbd>⌘K</kbd></button>' +
        '<button type="button" class="icon-btn" id="shortcuts-btn" title="میانبرها (?)">' + IC.keyboard + '</button>' +
        '<button type="button" class="icon-btn" id="notif-btn" title="اعلان‌ها">' + IC.bell + (pendingAll ? '<span class="pulse"></span>' : '') + '</button>' +
        '<button type="button" class="icon-btn" id="theme-btn" title="تم">' + (App.theme === 'light' ? IC.moon : IC.sun) + '</button>' +
        '<button type="button" class="user-btn" id="user-menu">' +
          '<div class="who-text"><b>' + esc(user.name) + '</b><span>' + ROLES[user.role] + '</span></div>' +
          '<div class="avatar">' + esc(initials(user.name)) + '</div>' +
        '</button>' +
      '</div>' +
    '</nav></div>' +
    '<div class="page" id="page"></div>' +
    '<div class="bottom-tabs">' + tabsHTML + '</div>';

  $$('[data-nav]').forEach(function (el) {
    el.addEventListener('click', function () { go(el.dataset.nav); });
  });
  $$('.tab-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.tab;
      if (k === '__more') openSheet();
      else go(k);
    });
  });
  var sb = $('#search-btn');
  if (sb) sb.addEventListener('click', openCmd);
  var shb = $('#shortcuts-btn');
  if (shb) shb.addEventListener('click', openShortcutsHelp);
  var tb = $('#theme-btn');
  if (tb) tb.addEventListener('click', toggleTheme);
  var nb = $('#notif-btn');
  if (nb) nb.addEventListener('click', openNotif);
  var um = $('#user-menu');
  if (um) {
    um.addEventListener('click', function (e) {
      e.stopPropagation();
      if (window.innerWidth <= 900) openSheet();
      else openUserMenu(um);
    });
  }
  renderPage();
  attachRippleAll();
}

function renderPage() {
  var page = $('#page');
  if (!page) return;
  var fns = {
    dashboard:      typeof pageDashboard     === 'function' ? pageDashboard     : null,
    stock:          typeof pageStock         === 'function' ? pageStock         : null,
    stockInit:      typeof pageStockInit     === 'function' ? pageStockInit     : null,
    transfers:      typeof pageTransfers     === 'function' ? pageTransfers     : null,
    inbounds:       typeof pageInbounds      === 'function' ? pageInbounds      : null,
    reports:        typeof pageReports       === 'function' ? pageReports       : null,
    newTransfer:    typeof pageNewTransfer   === 'function' ? pageNewTransfer   : null,
    newInbound:     typeof pageNewInbound    === 'function' ? pageNewInbound    : null,
    directCustomer: typeof pageDirectCustomer === 'function' ? pageDirectCustomer : null,
    products:       typeof pageProducts      === 'function' ? pageProducts      : null,
    users:          typeof pageUsers         === 'function' ? pageUsers         : null,
    settings:       typeof pageSettings      === 'function' ? pageSettings      : null
  };
  var fn = fns[App.route.name] || fns.dashboard;
  if (typeof fn === 'function') {
    fn(page);
  } else {
    page.innerHTML = '<div class="widget">' + emptyState('صفحه بارگذاری نشد', 'فایل این صفحه هنوز اضافه نشده') + '</div>';
  }
  attachRippleAll();
}

var app = document.getElementById('app');

window.addEventListener('storage', function (e) {
  if (e.key === K_DB) {
    App.user = currentUser();
    render();
  }
});