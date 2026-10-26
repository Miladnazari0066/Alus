'use strict';

function pageInbounds(page) {
  var db = loadDB();
  var filter = 'all';
  var list = db.transfers.filter(function (t) { return t.type === 'inbound'; });

  function cnt(f) { return list.filter(function (t) { return t.status === f; }).length; }

  page.innerHTML = '<div class="page-head"><div><h1>ورود کالا از تأمین‌کننده</h1></div>' +
    (canCreate(App.user) ? '<div class="page-actions"><button type="button" class="btn primary" id="ni-btn">' + IC.factory + ' ثبت ورود جدید</button></div>' : '') +
    '</div>' +
    '<div class="widget">' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px">' +
        '<button type="button" class="chip ' + (filter === 'all' ? 'active' : '') + '" data-f="all">همه <span class="count">' + list.length + '</span></button>' +
        '<button type="button" class="chip ' + (filter === 'pending_warehouse' ? 'active' : '') + '" data-f="pending_warehouse">انبار <span class="count">' + cnt('pending_warehouse') + '</span></button>' +
        '<button type="button" class="chip ' + (filter === 'pending_accountant' ? 'active' : '') + '" data-f="pending_accountant">حسابداری <span class="count">' + cnt('pending_accountant') + '</span></button>' +
        '<button type="button" class="chip ' + (filter === 'pending_manager' ? 'active' : '') + '" data-f="pending_manager">مدیر <span class="count">' + cnt('pending_manager') + '</span></button>' +
        '<button type="button" class="chip ' + (filter === 'approved' ? 'active' : '') + '" data-f="approved">تأییدشده <span class="count">' + cnt('approved') + '</span></button>' +
        '<button type="button" class="chip ' + (filter === 'rejected' ? 'active' : '') + '" data-f="rejected">ردشده <span class="count">' + cnt('rejected') + '</span></button>' +
      '</div>' +
      '<div id="i-list"></div>' +
    '</div>';

  function draw() {
    var l = list.slice();
    if (filter !== 'all') l = l.filter(function (t) { return t.status === filter; });
    var el = $('#i-list');
    if (!l.length) { el.innerHTML = emptyState('موردی یافت نشد', 'ورود جدیدی ثبت کنید'); return; }
    el.innerHTML = '<div class="t-list">' + l.map(function (t) { return transferItemHTML(db, t); }).join('') + '</div>';
    $$('[data-tid]', el).forEach(function (x) {
      x.addEventListener('click', function () { openTransfer(x.dataset.tid); });
    });
  }

  $$('.chip[data-f]').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.dataset.f;
      $$('.chip[data-f]').forEach(function (x) { x.classList.toggle('active', x.dataset.f === filter); });
      draw();
    });
  });
  var nb = $('#ni-btn');
  if (nb) nb.addEventListener('click', function () { go('newInbound'); });
  draw();
}
