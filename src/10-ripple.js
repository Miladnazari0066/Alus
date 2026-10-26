'use strict';

function attachRipple(el) {
  if (!el || el._rip) return;
  el._rip = true;
  el.addEventListener('click', function (e) {
    var r = el.getBoundingClientRect();
    var s = document.createElement('span');
    s.className = 'rip';
    var sz = Math.max(r.width, r.height);
    s.style.width = s.style.height = sz + 'px';
    s.style.left = (e.clientX - r.left - sz / 2) + 'px';
    s.style.top  = (e.clientY - r.top  - sz / 2) + 'px';
    el.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.remove(); }, 700);
  });
}

function attachRippleAll(root) {
  $$('.btn', root || document).forEach(function (b) { attachRipple(b); });
}
