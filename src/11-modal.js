'use strict';

function openModal(opts) {
  var bd = document.createElement('div');
  bd.className = 'modal-bd';
  bd.innerHTML = '<div class="modal"><h3>' + esc(opts.title) + '</h3>' +
    (opts.desc ? '<div class="desc">' + esc(opts.desc) + '</div>' : '') +
    '<div>' + (opts.body || '') + '</div>' +
    '<div class="modal-actions"></div></div>';
  var acts = bd.querySelector('.modal-actions');
  (opts.actions || []).forEach(function (a) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (a.cls || '');
    b.innerHTML = a.label;
    b.addEventListener('click', function () { if (a.onClick) a.onClick(bd); });
    acts.appendChild(b);
  });
  bd.addEventListener('click', function (e) { if (e.target === bd) close(); });
  document.body.appendChild(bd);
  attachRippleAll(bd);
  function close() {
    bd.style.animation = 'fadeOut .2s forwards';
    setTimeout(function () { if (bd.parentNode) bd.remove(); }, 200);
  }
  return { close: close, el: bd };
}

/** Keyboard shortcuts help modal — triggered by `?` key or menu. */
function openShortcutsHelp() {
  var rows = [
    ['جستجو و دستور', '⌘K'],
    ['داشبورد', '1'],
    ['موجودی', '2'],
    ['جابه‌جایی', '3'],
    ['ورود کالا', '4'],
    ['راهنمای میانبر', '?'],
    ['بستن / انصراف', 'Esc'],
    ['ارسال فرم', 'Enter'],
    ['رفتن به بعدی', '↓'],
    ['رفتن به قبلی', '↑']
  ];
  var body = '<div class="shortcuts-grid">';
  rows.forEach(function (r) {
    body += '<div class="shortcut-row"><span class="sc-label">' + r[0] + '</span><kbd>' + r[1] + '</kbd></div>';
  });
  body += '</div>';
  openModal({
    title: 'میانبرهای کیبورد',
    desc: 'با این ترکیب‌ها سریع‌تر کار کنید',
    body: body,
    actions: [{ label: 'متوجه شدم', cls: 'primary', onClick: function (c) { c.remove(); } }]
  });
}
