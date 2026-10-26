'use strict';

try {
  if (!loadDB().users.length) saveDB(seed());

  App.user = currentUser();
  App.route = App.user ? restoreRoute() : { name: 'dashboard', params: {} };

  try { PWA.init(); } catch (e) { console.error('[pwa]', e); }
  try { showSplash(); } catch (e) { console.error('[splash]', e); }

  render();
} catch (err) {
  var ee = document.getElementById('err');
  if (ee) {
    ee.style.display = 'block';
    ee.textContent = 'BOOT ERROR: ' + (err.message || err) + '\n' + (err.stack || '');
  }
  console.error('[boot]', err);
}
