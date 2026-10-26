'use strict';

function toast(title, desc, type) {
  type = type || 'success';
  var wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  var icon = type === 'success' ? IC.check : type === 'error' ? IC.x : type === 'warn' ? IC.alert : IC.info;
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<div class="toast-icon">' + icon + '</div><div class="toast-body"><b>' + esc(title) + '</b>' + (desc ? '<span>' + esc(desc) + '</span>' : '') + '</div>';
  wrap.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('show'); });
  var t1 = setTimeout(function () {
    el.classList.remove('show');
    el.classList.add('hide');
    setTimeout(function () { if (el.parentNode) el.remove(); }, 260);
  }, 2900);
  el.addEventListener('click', function () {
    clearTimeout(t1);
    el.classList.remove('show');
    el.classList.add('hide');
    setTimeout(function () { if (el.parentNode) el.remove(); }, 260);
  });
}

/**
 * Undo toast — gives the user N seconds to revert an action.
 * The undo callback runs only if the user clicks "بازگردانی".
 */
function showUndoToast(title, onUndo, duration) {
  duration = duration || 5000;
  var wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  var el = document.createElement('div');
  el.className = 'toast undo show';
  el.innerHTML = '<div class="toast-icon">' + IC.alert + '</div><div class="toast-body"><b>' + esc(title) + '</b></div>' +
    '<button type="button" class="toast-undo-btn">' + IC.undo + ' بازگردانی</button><div class="toast-undo-bar"></div>';
  wrap.appendChild(el);
  var bar = el.querySelector('.toast-undo-bar');
  if (bar) bar.style.animationDuration = duration + 'ms';
  var done = false;
  function dismiss(ran) {
    if (done) return;
    done = true;
    if (ran && onUndo) {
      try { onUndo(); } catch (e) { console.error('[undo]', e); }
    }
    el.classList.remove('show');
    el.classList.add('hide');
    setTimeout(function () { if (el.parentNode) el.remove(); }, 260);
  }
  var btn = el.querySelector('.toast-undo-btn');
  if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); dismiss(true); });
  var tm = setTimeout(function () { dismiss(false); }, duration);
  el.addEventListener('click', function (e) {
    if (e.target === btn) return;
    clearTimeout(tm);
    dismiss(false);
  });
}
