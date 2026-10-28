'use strict';

async function upgradePasswords() {
  var db = loadDB();
  var changed = false;
  for (var i = 0; i < db.users.length; i++) {
    var u = db.users[i];
    // اگر رمز ۶۴ کاراکتری نیست (یعنی هش نشده)، آن را هش می‌کنیم
    if (u.password && u.password.length !== 64) {
      u.password = await hashPassword(u.password);
      changed = true;
    }
  }
  if (changed) {
    saveDB(db);
    console.log('[Security] Passwords upgraded to SHA-256');
  }
}

try {
  if (typeof initSupabase === 'function') initSupabase();

  upgradePasswords().then(function() {
    if (!loadDB().users.length) saveDB(seed());

    App.user = currentUser();
    App.route = App.user ? restoreRoute() : { name: 'dashboard', params: {} };

    try { PWA.init(); } catch (e) { console.error('[pwa]', e); }
    try { showSplash(); } catch (e) { console.error('[splash]', e); }

    render();
  });

} catch (err) {
  var ee = document.getElementById('err');
  if (ee) {
    ee.style.display = 'block';
    ee.textContent = 'BOOT ERROR: ' + (err.message || err) + '\n' + (err.stack || '');
  }
  console.error('[boot]', err);
}