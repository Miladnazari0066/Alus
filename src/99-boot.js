'use strict';

try {
  if (!loadDB().users.length) saveDB(seed());

  App.user = currentUser();
  App.route = App.user ? restoreRoute() : { name: 'dashboard', params: {} };

  try { PWA.init(); } catch (e) { console.error('[pwa]', e); }
  try { showSplash(); } catch (e) { console.error('[splash]', e); }

  var app = document.getElementById('app');

  if (typeof render === 'function') {
    render();
  } else {
    app.innerHTML =
      '<div style="padding:60px 24px;text-align:center;font-family:Vazirmatn,sans-serif;max-width:640px;margin:0 auto">' +
        '<div style="width:80px;height:80px;margin:0 auto 20px;border-radius:50%;background:linear-gradient(135deg,#007AFF,#5856D6,#AF52DE);display:grid;place-items:center;color:#fff;font-size:36px;box-shadow:0 10px 30px -10px rgba(0,122,255,.6)">✓</div>' +
        '<h2 style="font-size:22px;margin-bottom:10px;color:#0a1220">UI Primitives Ready</h2>' +
        '<p style="color:#64748b;font-size:13px;line-height:1.9">مرحلهٔ ۲ از ۶ — با دکمه‌های زیر تست کن</p>' +
        '<div id="test-btns" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:24px"></div>' +
        '<p style="color:#94a3b8;font-size:11.5px;margin-top:20px">' +
          'کاربران: ' + loadDB().users.length +
          ' · انبارها: ' + loadDB().warehouses.length +
          ' · کالاها: ' + loadDB().products.length +
          ' · اسناد: ' + loadDB().transfers.length +
        '</p>' +
      '</div>';

    var tests = [
      ['toast-success', 'Toast ✓',   function () { toast('تست موفق', 'این یک پیام است', 'success'); }],
      ['toast-error',   'Toast ✗',   function () { toast('خطا', 'مشکل رخ داد', 'error'); }],
      ['toast-warn',    'Toast ⚠',   function () { toast('هشدار', 'نیاز به بررسی', 'warn'); }],
      ['undo-toast',    'Undo Toast', function () { showUndoToast('آیتم حذف شد', function () { toast('بازگردانی شد', '', 'success'); }, 5000); }],
      ['modal',         'Modal',     function () { openModal({ title: 'مودال تست', desc: 'توضیح کوتاه', body: '<p style="line-height:1.9">سلام! این یک مودال تست است.</p>', actions: [{ label: 'انصراف', cls: 'ghost', onClick: function (c) { c.remove(); } }, { label: 'باشه', cls: 'primary', onClick: function (c) { c.remove(); toast('تأیید شد', '', 'success'); } }] }); }],
      ['drawer',        'Drawer',    function () { openDrawer({ title: 'Drawer تست', body: '<p style="line-height:1.9">یک drawer ساده.</p><div style="margin-top:20px"><button type="button" class="btn primary" id="drawer-close-test">بستن</button></div>', foot: '<button type="button" class="btn ghost" id="drawer-foot-close">بستن پاورقی</button>' }); setTimeout(function () { var a = document.getElementById('drawer-close-test'); if (a) a.addEventListener('click', closeDrawer); var b = document.getElementById('drawer-foot-close'); if (b) b.addEventListener('click', closeDrawer); }, 50); }],
      ['celebrate',     'Celebrate', function () { celebrate('تست موفق', 'confetti animation', 'success', 2000); }],
      ['celebrate-info','Celebrate ℹ', function () { celebrate('اطلاع', 'بدون confetti', 'info', 1500); }],
      ['splash',        'Splash',    function () { showSplash(); }],
      ['shortcuts',     'Shortcuts', function () { openShortcutsHelp(); }],
      ['skeleton',      'Skeleton',  function () { showSkeleton(app); setTimeout(function () { location.reload(); }, 2200); }],
      ['chart-bar',     'Bar Chart', function () { var b = document.getElementById('demo-chart'); if (b) b.remove(); var d = document.createElement('div'); d.id = 'demo-chart'; d.className = 'widget'; d.style.marginTop = '24px'; d.innerHTML = '<div class="w-head"><div class="w-title">نمودار تست</div></div>' + renderBarChartSVG([3, 7, 2, 9, 5, 6, 4], ['شنبه', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'جمعه'], '#007AFF'); app.appendChild(d); }],
      ['chart-donut',   'Donut',     function () { var b = document.getElementById('demo-donut'); if (b) b.remove(); var d = document.createElement('div'); d.id = 'demo-donut'; d.className = 'widget'; d.style.marginTop = '24px'; d.innerHTML = '<div class="w-head"><div class="w-title">Donut تست</div></div>' + renderDonutSVG([{ name: 'مرکزی', value: 120, color: '#007AFF' }, { name: 'رنگ‌کاری', value: 45, color: '#FF9500' }, { name: 'رویه‌کوبی', value: 30, color: '#5AC8FA' }, { name: 'فروشگاه', value: 15, color: '#34C759' }], 130); app.appendChild(d); }],
      ['kit-pop',       'Kit Pop',   function () { var db = loadDB(); var p = db.products[0]; if (!p || !p.components.length) { toast('کیت ندارد', '', 'warn'); return; } var b = document.createElement('button'); b.type = 'button'; b.textContent = 'hover me'; b.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);padding:8px 16px;border-radius:100px;background:#007AFF;color:#fff;border:0;font-family:Vazirmatn;cursor:pointer;z-index:9999'; document.body.appendChild(b); showKitPop(b, p); setTimeout(function () { hideKitPop(); b.remove(); }, 3000); }]
    ];
    var wrap = document.getElementById('test-btns');
    tests.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = t[1];
      b.style.cssText = 'padding:8px 14px;border-radius:100px;background:#f1f5f9;border:1px solid #cbd5e1;font-family:Vazirmatn;font-size:12px;cursor:pointer;color:#334155';
      b.addEventListener('click', t[2]);
      wrap.appendChild(b);
    });
  }
} catch (err) {
  var ee = document.getElementById('err');
  if (ee) {
    ee.style.display = 'block';
    ee.textContent = 'BOOT ERROR: ' + (err.message || err) + '\n' + (err.stack || '');
  }
  console.error('[boot]', err);
}
