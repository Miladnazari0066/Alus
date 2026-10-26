'use strict';

document.addEventListener('keydown', function (e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openCmd();
    return;
  }
  if (e.key === 'Escape') {
    closeCmd();
    closeDrawer();
    closeNotif();
    closeSheet();
    hideKitPop();
    var pdfM = document.querySelector('.pdf-modal');
    if (pdfM) pdfM.remove();
    var m = document.querySelector('.modal-bd');
    if (m) m.remove();
    var um = document.querySelector('.userm');
    if (um) um.remove();
    $$('.celebrate').forEach(function (el) { el.remove(); });
    return;
  }
  if (!App.user) return;
  if (e.target.matches('input,textarea,select')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === '?') { e.preventDefault(); openShortcutsHelp(); return; }
  var map = { '1': 'dashboard', '2': 'stock', '3': 'transfers', '4': 'inbounds' };
  if (map[e.key] && NAV.filter(function (n) { return n.key === map[e.key] && n.roles.indexOf(App.user.role) >= 0; }).length) {
    go(map[e.key]);
  }
});
