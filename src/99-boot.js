'use strict';

try {
  // bootstrap DB on first run
  if (!loadDB().users.length) saveDB(seed());

  App.user = currentUser();
  App.route = App.user ? restoreRoute() : { name: 'dashboard', params: {} };

  var app = document.getElementById('app');

  if (typeof render === 'function') {
    // نوبت ۳+ : render واقعی
    render();
  } else {
    // نوبت ۱ : فقط تأیید بارگذاری
    app.innerHTML =
      '<div style="padding:80px 24px;text-align:center;font-family:Vazirmatn,sans-serif">' +
        '<div style="width:80px;height:80px;margin:0 auto 20px;border-radius:50%;background:linear-gradient(135deg,#007AFF,#5856D6,#AF52DE);display:grid;place-items:center;color:#fff;font-size:36px;box-shadow:0 10px 30px -10px rgba(0,122,255,.6)">✓</div>' +
        '<h2 style="font-size:22px;margin-bottom:10px;color:#0a1220">پایه‌ها با موفقیت بارگذاری شد</h2>' +
        '<p style="color:#64748b;font-size:13px;line-height:1.9">مرحلهٔ ۱ از ۶ — نوبت بعدی: toast, modal, drawer, ...</p>' +
        '<p style="color:#94a3b8;font-size:11.5px;margin-top:14px">' +
          'کاربران: ' + loadDB().users.length +
          ' · انبارها: ' + loadDB().warehouses.length +
          ' · کالاها: ' + loadDB().products.length +
          ' · اسناد: ' + loadDB().transfers.length +
        '</p>' +
      '</div>';
  }
} catch (err) {
  var ee = document.getElementById('err');
  if (ee) {
    ee.style.display = 'block';
    ee.textContent = 'BOOT ERROR: ' + (err.message || err) + '\n' + (err.stack || '');
  }
  console.error('[boot]', err);
}
