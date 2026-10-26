'use strict';

/**
 * Full-screen celebration modal with confetti (success only).
 * Used sparingly — major actions only (login, final approval, backup).
 */
function celebrate(title, desc, type, duration) {
  desc = desc || '';
  type = type || 'success';
  duration = duration || 2100;
  $$('.celebrate').forEach(function (el) { el.remove(); });
  var ov = document.createElement('div');
  ov.className = 'celebrate ' + type;
  var icon = type === 'success' ? IC.check : type === 'error' ? IC.x : type === 'warn' ? IC.alert : IC.info;
  var hint = type === 'success' ? 'عملیات با موفقیت انجام شد' :
             type === 'error'   ? 'لطفاً دوباره تلاش کنید' :
             type === 'warn'    ? 'نیاز به بررسی دارد' : 'اطلاع‌رسانی';
  ov.innerHTML = '<div class="celebrate-card"><div class="celebrate-icon">' + icon + '</div>' +
    '<div class="celebrate-text"><div class="celebrate-title">' + esc(title) + '</div>' +
    (desc ? '<div class="celebrate-desc">' + esc(desc) + '</div>' : '') +
    '<div class="celebrate-hint">' + hint + '</div></div></div>';

  if (type === 'success') {
    var colors = ['#007AFF', '#5856D6', '#AF52DE', '#34C759', '#FF9500', '#5AC8FA', '#FF2D55', '#FFCC00'];
    for (var i = 0; i < 70; i++) {
      var c = document.createElement('div');
      c.className = 'confetti';
      var color = colors[Math.floor(Math.random() * colors.length)];
      var size = 6 + Math.random() * 10;
      c.style.background = color;
      c.style.left = (Math.random() * 100) + '%';
      c.style.width = size + 'px';
      c.style.height = (size * 1.4) + 'px';
      c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      c.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      c.style.opacity = '0';
      (function (el) { setTimeout(function () { el.style.opacity = '1'; }, 100); })(c);
      ov.appendChild(c);
    }
  }
  document.body.appendChild(ov);
  var tm = setTimeout(function () {
    ov.classList.add('exit');
    setTimeout(function () { if (ov.parentNode) ov.remove(); }, 500);
  }, duration);
  ov.addEventListener('click', function () {
    clearTimeout(tm);
    ov.classList.add('exit');
    setTimeout(function () { if (ov.parentNode) ov.remove(); }, 500);
  });
}
