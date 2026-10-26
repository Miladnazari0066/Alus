'use strict';

function pageDashboard(page) {
  var db = loadDB();

  function totalOf(t) {
    var ids = db.warehouses.filter(function (w) { return w.type === t; }).map(function (w) { return w.id; });
    if (!ids.length) return 0;
    return db.stocks.filter(function (s) { return ids.indexOf(s.warehouseId) >= 0; })
      .reduce(function (a, s) { return a + s.quantity; }, 0);
  }
  function totalAvail(t) {
    var ids = db.warehouses.filter(function (w) { return w.type === t; }).map(function (w) { return w.id; });
    if (!ids.length) return 0;
    return db.stocks.filter(function (s) { return ids.indexOf(s.warehouseId) >= 0; })
      .reduce(function (a, s) { return a + (s.quantity - (s.reservedQty || 0)); }, 0);
  }

  var pending = db.transfers.filter(function (t) { return t.status.indexOf('pending') === 0; }).length;
  var lowStock = lowStockItems(db);
  var totalItems = ['central', 'paint_in', 'paint_out', 'upholstery', 'store', 'showroom_khalij', 'showroom_alus', 'sold']
    .reduce(function (a, t) { return a + totalOf(t); }, 0);
  var approvedWeek = (function () {
    var t0 = new Date();
    t0.setDate(t0.getDate() - 7);
    t0.setHours(0, 0, 0, 0);
    return db.transfers.filter(function (t) {
      return t.status === 'approved' && new Date(t.completedAt || t.createdAt) >= t0;
    }).length;
  })();
  var hour = new Date().getHours();
  var greet = hour < 12 ? 'صبح بخیر' : hour < 17 ? 'ظهر بخیر' : hour < 20 ? 'عصر بخیر' : 'شب بخیر';
  var feed = db.transfers.slice(0, 6);
  var pendingW = db.transfers.filter(function (t) { return t.status === 'pending_warehouse'; }).length;
  var pendingA = db.transfers.filter(function (t) { return t.status === 'pending_accountant'; }).length;
  var pendingM = db.transfers.filter(function (t) { return t.status === 'pending_manager'; }).length;
  var approvedN = db.transfers.filter(function (t) { return t.status === 'approved'; }).length;
  var maxPipe = Math.max(pendingW, pendingA, pendingM, approvedN, 1);

  var weekValues = [0, 0, 0, 0, 0, 0, 0];
  var weekLabels = ['شنبه', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'جمعه'];
  var now = new Date();
  db.transfers.forEach(function (t) {
    if (t.status !== 'approved') return;
    var d = new Date(t.completedAt || t.createdAt);
    var diff = Math.floor((now - d) / 86400000);
    if (diff >= 0 && diff < 7) weekValues[6 - diff] += 1;
  });

  function statCard(type, label, icon, accent) {
    var v = totalOf(type);
    var av = totalAvail(type);
    var sp = sparklineData(db, type, 7);
    var color = WH_COLOR[type] || '#007AFF';
    return '<div class="stat w-3">' +
      '<div class="stat-head"><div class="stat-title">' +
        '<div class="stat-ic" style="background:' + accent + '">' + icon + '</div>' +
        '<span>' + esc(label) + '</span>' +
      '</div></div>' +
      '<div class="stat-body">' +
        '<div class="stat-value" data-count="' + v + '">0</div>' +
        '<div class="stat-spark">' + sparklineSVG(sp, color, 80, 34) + '</div>' +
      '</div>' +
      '<div class="stat-foot">' + IC.trend + ' قابل استفاده: ' + av.toLocaleString('fa-IR') + ' · ۷ روز اخیر</div>' +
    '</div>';
  }

  page.innerHTML = '<div class="bento">' +
    '<div class="hero w-8">' +
      '<h2>' + greet + ' ' + esc((App.user.name || '').split(' ')[0]) + '</h2>' +
      '<p>' + (pending ? 'شما ' + pending + ' درخواست در انتظار تأیید دارید.' : 'همه‌چیز مرتب است.') +
        (lowStock.length ? ' · ' + lowStock.length + ' قلم در آستانه اتمام' : '') + '</p>' +
      '<div class="hero-stats">' +
        '<div class="hero-stat"><div class="k">کل اقلام</div><div class="v"><span data-count="' + totalItems + '">0</span> <small>عدد</small></div></div>' +
        '<div class="hero-stat"><div class="k">در انتظار</div><div class="v"><span data-count="' + pending + '">0</span> <small>درخواست</small></div></div>' +
        '<div class="hero-stat"><div class="k">تأییدشده (۷ روز)</div><div class="v"><span data-count="' + approvedWeek + '">0</span> <small>سند</small></div></div>' +
      '</div>' +
      (canCreate(App.user) ?
        '<div class="hero-quick">' +
          '<button type="button" data-action="newTransfer">' + IC.plus + ' درخواست جدید</button>' +
          '<button type="button" data-action="newInbound">' + IC.factory + ' ثبت ورود</button>' +
          '<button type="button" data-action="directCustomer">' + IC.truck + ' ارسال به مشتری</button>' +
        '</div>' : '') +
    '</div>' +

    '<div class="widget w-4">' +
      '<div class="w-head"><div><div class="w-title"><div class="ic">' + IC.zap + '</div>دسترسی سریع</div></div></div>' +
      '<div class="qa">' +
        '<button type="button" class="qa-btn" data-action="newTransfer"><div class="ic">' + IC.plus + '</div><b>درخواست انتقال</b><span>ثبت جابه‌جایی</span></button>' +
        '<button type="button" class="qa-btn alt-1" data-action="newInbound"><div class="ic">' + IC.factory + '</div><b>ورود کالا</b><span>از تأمین‌کننده</span></button>' +
        '<button type="button" class="qa-btn alt-2" data-action="stockInit"><div class="ic">' + IC.sparkle + '</div><b>مقداردهی</b><span>ثبت موجودی</span></button>' +
        '<button type="button" class="qa-btn alt-3" data-action="reports"><div class="ic">' + IC.chart + '</div><b>گزارش‌ها</b><span>خروجی Excel/PDF</span></button>' +
      '</div>' +
    '</div>' +

    (lowStock.length ?
      '<div class="widget w-12 low-stock-widget">' +
        '<div class="w-head"><div><div class="w-title warn"><div class="ic warn">' + IC.alert + '</div>هشدار موجودی کم</div>' +
          '<div class="w-sub">' + lowStock.length + ' قلم در آستانه اتمام است</div></div>' +
          '<button type="button" class="btn xs ghost" data-action="notif">مشاهده همه</button></div>' +
        '<div class="low-stock-list">' +
          lowStock.slice(0, 3).map(function (it) {
            return '<div class="low-stock-item">' +
              '<div class="lsi-name">' + esc(it.product.name) + '</div>' +
              '<div class="lsi-wh">' + esc(it.warehouse.name) + '</div>' +
              '<div class="lsi-qty">' + it.stock.quantity + ' ' + esc(it.product.unit || '') + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' : '') +

    '<div class="wh-section"><span class="wh-section-title">انبارها</span><span class="wh-section-line"></span><span class="wh-section-count">۴ انبار</span></div>' +
    statCard('central',    'انبار مرکزی',      IC.package, 'linear-gradient(135deg,#007AFF,#5856D6)') +
    statCard('paint_in',   'رنگ‌کاری داخلی',   IC.palette, 'linear-gradient(135deg,#FF9500,#E67E00)') +
    statCard('paint_out',  'رنگ‌کاری بیرون',    IC.palette, 'linear-gradient(135deg,#EA580C,#C2410C)') +
    statCard('upholstery', 'رویه‌کوبی',         IC.hammer,  'linear-gradient(135deg,#5AC8FA,#0EA5E9)') +

    '<div class="wh-section"><span class="wh-section-title">نمایشگاه و فروش</span><span class="wh-section-line"></span><span class="wh-section-count">۴ مکان</span></div>' +
    statCard('store',           'فروشگاه',              IC.store,   'linear-gradient(135deg,#34C759,#00A14B)') +
    statCard('showroom_khalij', 'نمایشگاه خلیج فارس',   IC.store,   'linear-gradient(135deg,#AF52DE,#7c3aed)') +
    statCard('showroom_alus',   'نمایشگاه الوس',        IC.store,   'linear-gradient(135deg,#9333EA,#6b21a8)') +
    statCard('sold',            'کالای فروش‌رفته',       IC.receipt, 'linear-gradient(135deg,#FF3B30,#D70015)') +

    '<div class="widget w-6">' +
      '<div class="w-head"><div><div class="w-title"><div class="ic info">' + IC.shield + '</div>خط تأیید</div>' +
        '<div class="w-sub">' + pending + ' در انتظار · ' + approvedN + ' تکمیل‌شده</div></div></div>' +
      '<div class="pipe">' +
        '<div class="pipe-step active"><div class="pipe-num">۱</div>' +
          '<div class="lbl">تأیید انباردار<small>انباردار</small>' +
            '<div class="pipe-bar"><div class="pipe-bar-fill" style="width:' + Math.round(pendingW / maxPipe * 100) + '%"></div></div>' +
          '</div><div class="pipe-count">' + pendingW + '</div></div>' +
        '<div class="pipe-step ' + (pendingA > 0 ? 'active' : '') + '"><div class="pipe-num">۲</div>' +
          '<div class="lbl">تأیید حسابدار<small>حسابداری</small>' +
            '<div class="pipe-bar"><div class="pipe-bar-fill" style="width:' + Math.round(pendingA / maxPipe * 100) + '%"></div></div>' +
          '</div><div class="pipe-count">' + pendingA + '</div></div>' +
        '<div class="pipe-step ' + (pendingM > 0 ? 'active' : '') + '"><div class="pipe-num">۳</div>' +
          '<div class="lbl">تأیید مدیر<small>مدیر</small>' +
            '<div class="pipe-bar"><div class="pipe-bar-fill" style="width:' + Math.round(pendingM / maxPipe * 100) + '%"></div></div>' +
          '</div><div class="pipe-count">' + pendingM + '</div></div>' +
        '<div class="pipe-step done"><div class="pipe-num">✓</div>' +
          '<div class="lbl">تکمیل‌شده<small>نهایی</small>' +
            '<div class="pipe-bar"><div class="pipe-bar-fill" style="width:' + Math.round(approvedN / maxPipe * 100) + '%"></div></div>' +
          '</div><div class="pipe-count">' + approvedN + '</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="widget w-6">' +
      '<div class="w-head"><div><div class="w-title"><div class="ic">' + IC.fire + '</div>آخرین فعالیت‌ها</div></div>' +
        '<button type="button" class="btn xs ghost" data-action="transfers">مشاهده</button></div>' +
      '<div class="feed">' +
        (feed.length ?
          feed.map(function (t) {
            var p = getProd(db, t.productId);
            var isIn = t.type === 'inbound';
            var avTone = t.status === 'approved' ? (isIn ? 'info' : 'success') :
                          t.status === 'rejected' ? 'danger' : 'warn';
            var title = isIn ?
              '<b>' + esc(t.createdByName || '') + '</b> ورود <span class="tag">' + esc((p && p.name) || '') + '</span>' :
              '<b>' + esc(t.createdByName || '') + '</b> انتقال <span class="tag">' + esc((p && p.name) || '') + '</span>';
            return '<div class="feed-item" data-tid="' + t.id + '">' +
              '<div class="feed-av ' + avTone + '">' + esc(initials(t.createdByName || 'SY')) + '</div>' +
              '<div class="feed-body">' +
                '<div class="feed-title">' + title + '</div>' +
                '<div class="feed-meta">' + IC.clock + ' ' + relTime(t.createdAt) + '</div>' +
              '</div></div>';
          }).join('') :
          emptyState('فعالیتی ثبت نشده')) +
      '</div>' +
    '</div>' +

    '<div class="widget w-12">' +
      '<div class="w-head"><div><div class="w-title"><div class="ic">' + IC.chart + '</div>آخرین ۷ روز</div>' +
        '<div class="w-sub">تعداد اسناد تأییدشده روزانه</div></div></div>' +
      '<div class="chart-bar-wrap" style="background:transparent;border:none;padding:12px 0">' +
        renderBarChartSVG(weekValues, weekLabels, '#007AFF') +
      '</div>' +
    '</div>' +

    '<div class="widget w-5">' +
      '<div class="w-head"><div><div class="w-title"><div class="ic">' + IC.users + '</div>تیم</div></div>' +
        (canManageUsers(App.user) ? '<button type="button" class="btn xs ghost" data-action="users">مدیریت</button>' : '') +
      '</div>' +
      '<div class="team">' +
        db.users.slice(0, 5).map(function (u) {
          return '<div class="team-row">' +
            '<div class="avatar" style="width:36px;height:36px;font-size:12px">' + esc(initials(u.name)) + '</div>' +
            '<div class="team-info"><b>' + esc(u.name) + '</b><span>' + (u.isActive ? 'فعال' : 'غیرفعال') + '</span></div>' +
            '<span class="role-badge ' + u.role + '">' + ROLES[u.role] + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>' +

    '<div class="widget w-7">' +
      '<div class="w-head"><div><div class="w-title"><div class="ic danger">' + IC.clock + '</div>در انتظار تأیید</div>' +
        '<div class="w-sub">' + pending + ' درخواست</div></div>' +
        '<button type="button" class="btn xs ghost" data-action="notif">اعلان‌ها</button></div>' +
      (pending ?
        '<div class="t-list">' +
          db.transfers.filter(function (t) { return t.status.indexOf('pending') === 0; })
            .slice(0, 3)
            .map(function (t) { return transferItemHTML(db, t); }).join('') +
        '</div>' :
        emptyState('همه‌چیز تأیید شده')) +
    '</div>' +
  '</div>';

  $$('[data-action]', page).forEach(function (b) {
    b.addEventListener('click', function () {
      var a = b.dataset.action;
      if (a === 'newTransfer')        go('newTransfer');
      else if (a === 'newInbound')    go('newInbound');
      else if (a === 'directCustomer') go('directCustomer');
      else if (a === 'stockInit')     go('stockInit');
      else if (a === 'transfers')     go('transfers');
      else if (a === 'users')         go('users');
      else if (a === 'reports')       go('reports');
      else if (a === 'notif')         openNotif();
    });
  });
  $$('[data-tid]', page).forEach(function (el) {
    el.addEventListener('click', function () { openTransfer(el.dataset.tid); });
  });
  $$('[data-count]', page).forEach(function (el) { countUp(el, +el.dataset.count); });
}
