'use strict';

try {
  // اگر دیتابیس خالی است، دیتای نمایشی می‌سازیم
  if (!loadDB().users.length) saveDB(seed());

  // بازیابی نشست کاربر
  App.user = currentUser();
  App.route = App.user ? restoreRoute() : { name: 'dashboard', params: {} };

  // PWA و Splash — هر خطا فقط لاگ می‌شود، اجرای برنامه متوقف نمی‌شود
  try { PWA.init(); } catch (e) { console.error('[pwa]', e); }
  try { showSplash(); } catch (e) { console.error('[splash]', e); }

  // رندر اولیه
  render();
} catch (err) {
  var ee = document.getElementById('err');
  if (ee) {
    ee.style.display = 'block';
    ee.textContent = 'BOOT ERROR: ' + (err.message || err) + '\n' + (err.stack || '');
  }
  console.error('[boot]', err);
}
