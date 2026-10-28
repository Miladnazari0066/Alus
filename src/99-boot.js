'use strict';

try {
  if (typeof initSupabase === 'function') initSupabase();

  if (!loadDB().users.length) saveDB(seed());

  App.user = currentUser();
  App.route = App.user ? restoreRoute() : { name: 'dashboard', params: {} };

  try { PWA.init(); } catch (e) { console.error('[pwa]', e); }
  try { showSplash(); } catch (e) { console.error('[splash]', e); }

  if (typeof pullFromCloud === 'function') {
    pullFromCloud().then(function (cloudData) {
      if (cloudData) {
        var cloudStr = JSON.stringify(cloudData);
        var localStr = localStorage.getItem(K_DB);
        if (cloudStr !== localStr) {
          localStorage.setItem(K_DB, cloudStr);
          if (typeof clearCache === 'function') clearCache();
        }
      }
      render();
      if (typeof startCloudSync === 'function') startCloudSync();
    });
  } else {
    render();
  }

} catch (err) {
  var ee = document.getElementById('err');
  if (ee) {
    ee.style.display = 'block';
    ee.textContent = 'BOOT ERROR: ' + (err.message || err) + '\n' + (err.stack || '');
  }
  console.error('[boot]', err);
  render();
}
