'use strict';

function openSheet() {
  closeSheet();
  if (!App.user) return;
  var db = loadDB();
  var pending = db.transfers.filter(function (t) { return t.status.indexOf('pending') === 0; }).length;
  var bd = document.createElement('div');
  bd.className = 'sheet-bd';
  var sh = document.createElement('div');
  sh.className = 'sheet';
  var html = '<div class="sheet-handle"></div>';
  html += '<div class="sheet-user"><div class="avatar">' + esc(initials(App.user.name)) + '</div>' +
    '<div class="info"><b>' + esc(App.user.name) + '</b>' +
    '<span class="role-badge ' + App.user.role + '">' + ROLES[App.user.role] + '</span></div></div>';
  html += '<div class="sheet-sec">حساب کاربری</div>';
  html += '<button type="button" class="sheet-item" data-act="notif"><div class="sheet-ic info">' + IC.bell + '</div><b>مرکز اعلان‌ها</b>' + (pending ? '<span class="sheet-count">' + (pending > 9 ? '9+' : pending) + '</span>' : '') + '</button>';
  html += '<button type="button" class="sheet-item" data-act="reports"><div class="sheet-ic">' + IC.chart + '</div><b>گزارش‌ها و خروجی</b></button>';
  html += '<button type="button" class="sheet-item" data-act="theme"><div class="sheet-ic">' + (App.theme === 'light' ? IC.moon : IC.sun) + '</div><b>' + (App.theme === 'light' ? 'حالت تاریک' : 'حالت روشن') + '</b></button>';
  // 👇 گزینه میانبرهای کیبورد حذف شد 👇
  if (canManageUsers(App.user)) {
    html += '<div class="sheet-sec">مدیریت</div>';
    html += '<button type="button" class="sheet-item" data-act="users"><div class="sheet-ic warn">' + IC.users + '</div><b>کاربران و دسترسی‌ها</b></button>';
    if (canManageProducts(App.user)) {
      html += '<button type="button" class="sheet-item" data-act="products"><div class="sheet-ic success">' + IC.tag + '</div><b>کالاها</b></button>';
    }
    html += '<button type="button" class="sheet-item" data-act="stockInit"><div class="sheet-ic">' + IC.sparkle + '</div><b>مقداردهی موجودی</b></button>';
  }
  if (canZeroOut(App.user)) {
    html += '<button type="button" class="sheet-item" data-act="settings"><div class="sheet-ic danger">' + IC.settings + '</div><b>تنظیمات پیشرفته</b></button>';
  }
  html += '<div class="sheet-sec">خروج</div>';
  html += '<button type="button" class="sheet-item" data-act="logout"><div class="sheet-ic danger">' + IC.logout + '</div><b style="color:var(--red)">خروج از حساب</b></button>';
  sh.innerHTML = html;
  document.body.appendChild(bd);
  document.body.appendChild(sh);
  bd.addEventListener('click', closeSheet);
  $$('[data-act]', sh).forEach(function (b) {
    b.addEventListener('click', function () {
      var a = b.dataset.act;
      closeSheet();
      setTimeout(function () {
        if (a === 'notif') openNotif();
        else if (a === 'theme') toggleTheme();
        else if (a === 'logout') doLogout();
        else if (a === 'users') go('users');
        else if (a === 'products') go('products');
        else if (a === 'stockInit') go('stockInit');
        else if (a === 'reports') go('reports');
        else if (a === 'settings') go('settings');
      }, 120);
    });
  });
  attachRippleAll(sh);
}

function openUserMenu(anchor) {
  var old = document.querySelector('.userm');
  if (old) old.remove();
  var rect = anchor.getBoundingClientRect();
  var w = 250;
  var left = rect.left;
  if (left + w > window.innerWidth - 10) left = window.innerWidth - w - 10;
  if (left < 10) left = 10;
  var m = document.createElement('div');
  m.className = 'userm';
  m.style.top = (rect.bottom + 8) + 'px';
  m.style.left = left + 'px';
  m.innerHTML = '<div class="header"><div class="name">' + esc(App.user.name) + '</div>' +
    '<div class="role">' + ROLES[App.user.role] + '</div></div>' +
    '<button type="button" class="menu-i" data-a="notif">' + IC.bell + ' مرکز اعلان‌ها</button>' +
    '<button type="button" class="menu-i" data-a="reports">' + IC.chart + ' گزارش‌ها</button>' +
    '<button type="button" class="menu-i" data-a="theme">' + (App.theme === 'light' ? IC.moon : IC.sun) + ' تغییر تم</button>' +
    // 👇 گزینه میانبرهای کیبورد از منوی دسکتاپ هم حذف شد 👇
    (canZeroOut(App.user) ? '<button type="button" class="menu-i" data-a="settings">' + IC.settings + ' تنظیمات</button>' : '') +
    '<div class="sep"></div>' +
    '<button type="button" class="menu-i" data-a="logout" style="color:var(--red)">' + IC.logout + ' خروج</button>';
  document.body.appendChild(m);
  $$('.menu-i', m).forEach(function (b) {
    b.addEventListener('click', function () {
      var a = b.dataset.a;
      m.remove();
      if (a === 'logout') doLogout();
      else if (a === 'theme') toggleTheme();
      else if (a === 'notif') openNotif();
      else if (a === 'reports') go('reports');
      else if (a === 'settings') go('settings');
    });
  });
  setTimeout(function () {
    function h(ev) {
      if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', h); }
    }
    document.addEventListener('click', h);
  }, 10);
}
