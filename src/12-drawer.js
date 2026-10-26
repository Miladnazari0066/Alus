'use strict';

function openDrawer(opts) {
  closeDrawer();
  var bd = document.createElement('div');
  bd.className = 'drawer-bd';
  var dr = document.createElement('div');
  dr.className = 'drawer';
  dr.innerHTML = '<div class="drawer-head"><h3>' + opts.title + '</h3>' +
      '<button type="button" class="icon-btn drawer-x">' + IC.close + '</button></div>' +
    '<div class="drawer-body">' + opts.body + '</div>' +
    (opts.foot ? '<div class="drawer-foot">' + opts.foot + '</div>' : '');
  document.body.appendChild(bd);
  document.body.appendChild(dr);
  bd.addEventListener('click', closeDrawer);
  var dc = dr.querySelector('.drawer-x');
  if (dc) dc.addEventListener('click', closeDrawer);
  attachRippleAll(dr);
}

function closeDrawer() {
  $$('.drawer-bd').forEach(function (bd) {
    bd.style.animation = 'fadeOut .2s forwards';
    setTimeout(function () { if (bd.parentNode) bd.remove(); }, 200);
  });
  $$('.drawer').forEach(function (dr) {
    dr.style.animation = 'slideInLeft .3s reverse forwards';
    setTimeout(function () { if (dr.parentNode) dr.remove(); }, 250);
  });
}

function closeSheet() {
  $$('.sheet-bd').forEach(function (bd) {
    bd.style.animation = 'fadeOut .2s forwards';
    setTimeout(function () { if (bd.parentNode) bd.remove(); }, 200);
  });
  $$('.sheet').forEach(function (sh) {
    sh.classList.add('closing');
    setTimeout(function () { if (sh.parentNode) sh.remove(); }, 260);
  });
}
