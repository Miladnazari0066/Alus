'use strict';

/* Bulk selection state — persists across renders until user clears it */
var bulkSelection = {};

function pageTransfers(page) {
  var db = loadDB();
  var filter = 'all';
  var q = '';
  var list = db.transfers.filter(function (t) { return t.type !== 'inbound'; });
  var selectMode = false;

  function cnt(f) { return list.filter(function (t) { return t.status === f; }).length; }

  page.innerHTML = '<div class="page-head"><div><h1>جابه‌جایی‌ها</h1></div>' +
    (canCreate(App.user) ?
      '<div class="page-actions">' +
        '<button type="button" class="btn ghost" id="select-btn">' + IC.check + ' انتخاب چندتایی</button>' +
        '<button type="button" class="btn ghost" id="d-btn">' + IC.truck + ' ارسال به مشتری</button>' +
        '<button type="button" class="btn primary" id="n-btn">' + IC.plus + ' درخواست جدید</button>' +
      '</div>' : '') +
    '</div>' +
    '<div class="widget">' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px">' +
        '<button type="button" class="chip ' + (filter === 'all' ? 'active' : '') + '" data-f="all">همه <span class="count">' + list.length + '</span></button>' +
        '<button type="button" class="chip ' + (filter === 'pending_warehouse' ? 'active' : '') + '" data-f="pending_warehouse">انبار <span class="count">' + cnt('pending_warehouse') + '</span></button>' +
        '<button type="button" class="chip ' + (filter === 'pending_accountant' ? 'active' : '') + '" data-f="pending_accountant">حسابداری <span class="count">' + cnt('pending_accountant') + '</span></button>' +
        '<button type="button" class="chip ' + (filter === 'pending_manager' ? 'active' : '') + '" data-f="pending_manager">مدیر <span class="count">' + cnt('pending_manager') + '</span></button>' +
        '<button type="button" class="chip ' + (filter === 'approved' ? 'active' : '') + '" data-f="approved">تکمیل‌شده <span class="count">' + cnt('approved') + '</span></button>' +
        '<button type="button" class="chip ' + (filter === 'rejected' ? 'active' : '') + '" data-f="rejected">ردشده <span class="count">' + cnt('rejected') + '</span></button>' +
        '<div class="search-input" style="margin-right:auto">' + IC.search + '<input id="t-q" placeholder="جستجو..." /></div>' +
      '</div>' +
      '<div id="t-list"></div>' +
    '</div>' +
    '<div class="bulk-bar" id="bulk-bar">' +
      '<span class="bulk-count"><b id="bulk-n">0</b> مورد انتخاب شد</span>' +
      '<button type="button" class="btn success sm" id="bulk-approve">' + IC.check + ' تأیید همه</button>' +
      '<button type="button" class="btn danger sm" id="bulk-reject">' + IC.x + ' رد همه</button>' +
      '<button type="button" class="btn ghost sm" id="bulk-clear">لغو</button>' +
    '</div>';

  function updateBulkBar() {
    var n = Object.keys(bulkSelection).filter(function (k) { return bulkSelection[k]; }).length;
    var bar = $('#bulk-bar');
    if (!bar) return;
    $('#bulk-n').textContent = n;
    bar.classList.toggle('show', n > 0);
  }

  function draw() {
    var l = list.slice();
    if (filter !== 'all') l = l.filter(function (t) { return t.status === filter; });
    if (q) {
      var s = q.toLowerCase();
      l = l.filter(function (t) {
        var p = getProd(db, t.productId);
        return t.code.toLowerCase().indexOf(s) >= 0 || ((p && p.name) || '').toLowerCase().indexOf(s) >= 0;
      });
    }
    var el = $('#t-list');
    if (!l.length) {
      el.innerHTML = emptyState('موردی یافت نشد', 'فیلتر را تغییر دهید یا درخواست جدید ثبت کنید');
      updateBulkBar();
      return;
    }
    el.innerHTML = '<div class="t-list">' + l.map(function (t) {
      var item = transferItemHTML(db, t);
      if (selectMode) {
        var selCls = bulkSelection[t.id] ? ' selected' : '';
        item = item.replace('class="t-item"', 'class="t-item selectable' + selCls + '"');
        item = item.replace('<div class="t-row1">', '<div class="t-check" data-check="' + t.id + '">' + IC.check + '</div><div class="t-row1">');
      }
      return item;
    }).join('') + '</div>';

    $$('[data-tid]', el).forEach(function (x) {
      x.addEventListener('click', function (e) {
        if (selectMode && (e.target.closest('.t-check') || e.target.closest('.t-item'))) {
          var id = x.dataset.tid;
          bulkSelection[id] = !bulkSelection[id];
          updateBulkBar();
          draw();
          return;
        }
        if (!selectMode) openTransfer(x.dataset.tid);
      });
    });
    updateBulkBar();
  }

  $$('.chip[data-f]').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.dataset.f;
      $$('.chip[data-f]').forEach(function (x) { x.classList.toggle('active', x.dataset.f === filter); });
      draw();
    });
  });
  $('#t-q').addEventListener('input', function (e) { q = e.target.value.trim(); draw(); });

  var nb = $('#n-btn');
  if (nb) nb.addEventListener('click', function () { go('newTransfer'); });
  var dbtn = $('#d-btn');
  if (dbtn) dbtn.addEventListener('click', function () { go('directCustomer'); });
  var selBtn = $('#select-btn');
  if (selBtn) {
    selBtn.addEventListener('click', function () {
      selectMode = !selectMode;
      if (!selectMode) bulkSelection = {};
      toast(selectMode ? 'حالت انتخاب' : 'خروج از انتخاب', '', 'info');
      draw();
    });
  }

  $('#bulk-clear').addEventListener('click', function () {
    bulkSelection = {};
    selectMode = false;
    draw();
  });

  /* Single-transaction bulk approve — one loadDB, all mutations, one saveDB */
  $('#bulk-approve').addEventListener('click', function () {
    var ids = Object.keys(bulkSelection).filter(function (k) { return bulkSelection[k]; });
    if (!ids.length) return;
    var fresh = loadDB();
    var succeeded = 0, skipped = 0;
    ids.forEach(function (id) {
      var t = null;
      for (var i = 0; i < fresh.transfers.length; i++) if (fresh.transfers[i].id === id) { t = fresh.transfers[i]; break; }
      if (!t || !canApprove(App.user, t)) { skipped++; return; }
      var step = { userId: App.user.id, userName: App.user.name, at: new Date().toISOString(), note: 'تأیید گروهی' };
      if (t.status === 'pending_warehouse') {
        t.warehouseApproval = step;
        t.status = 'pending_accountant';
        succeeded++;
      } else if (t.status === 'pending_accountant') {
        t.accountantApproval = step;
        t.status = 'pending_manager';
        succeeded++;
      } else if (t.status === 'pending_manager') {
        if (t.type === 'inbound') {
          t.managerApproval = step;
          var ds = findStock(fresh, t.productId, t.destinationWarehouseId);
          if (!ds) {
            ds = { id: uid(), productId: t.productId, warehouseId: t.destinationWarehouseId, quantity: 0, reservedQty: 0, minQuantity: 5, updatedAt: new Date().toISOString() };
            fresh.stocks.push(ds);
          }
          ds.quantity = (ds.quantity || 0) + t.quantity;
          ds.updatedAt = new Date().toISOString();
          t.status = 'approved';
          t.completedAt = new Date().toISOString();
          succeeded++;
        } else {
          var srcS = findStock(fresh, t.productId, t.sourceWarehouseId);
          if (srcS && srcS.quantity >= t.quantity) {
            srcS.quantity -= t.quantity;
            srcS.reservedQty = Math.max(0, (srcS.reservedQty || 0) - t.quantity);
            srcS.updatedAt = new Date().toISOString();
            var dw = getWh(fresh, t.destinationWarehouseId);
            if (dw && dw.type !== 'customer') {
              var ds2 = findStock(fresh, t.productId, t.destinationWarehouseId);
              if (!ds2) {
                ds2 = { id: uid(), productId: t.productId, warehouseId: t.destinationWarehouseId, quantity: 0, reservedQty: 0, minQuantity: 5, updatedAt: new Date().toISOString() };
                fresh.stocks.push(ds2);
              }
              ds2.quantity = (ds2.quantity || 0) + t.quantity;
              ds2.updatedAt = new Date().toISOString();
            }
            t.managerApproval = step;
            t.status = 'approved';
            t.completedAt = new Date().toISOString();
            succeeded++;
          } else {
            skipped++;
          }
        }
      } else {
        skipped++;
      }
    });
    saveDB(fresh);
    bulkSelection = {};
    selectMode = false;
    toast('تأیید گروهی', succeeded + ' تأیید · ' + skipped + ' رد شد', succeeded ? 'success' : 'warn');
    render();
  });

  $('#bulk-reject').addEventListener('click', function () {
    var ids = Object.keys(bulkSelection).filter(function (k) { return bulkSelection[k]; });
    if (!ids.length) return;
    openModal({
      title: 'رد گروهی',
      desc: ids.length + ' درخواست انتخاب شده — دلیل رد را وارد کنید',
      body: '<div class="field"><label>دلیل <span class="req">*</span></label><textarea id="bulk-rj-reason"></textarea></div>',
      actions: [
        { label: 'انصراف', cls: 'ghost', onClick: function (c) { c.remove(); } },
        {
          label: IC.x + ' ثبت رد',
          cls: 'danger',
          onClick: function (c) {
            var reasonBox = c.querySelector('#bulk-rj-reason');
            var reason = reasonBox ? reasonBox.value.trim() : '';
            if (!reason) { toast('دلیل الزامی', '', 'warn'); return; }
            var fresh = loadDB();
            var ok = 0, skip = 0;
            ids.forEach(function (id) {
              var t = null;
              for (var i = 0; i < fresh.transfers.length; i++) if (fresh.transfers[i].id === id) { t = fresh.transfers[i]; break; }
              if (!t || !canApprove(App.user, t)) { skip++; return; }
              var stageMap = { pending_warehouse: 'warehouse', pending_accountant: 'accountant', pending_manager: 'manager' };
              if (t.type !== 'inbound') {
                var ss = findStock(fresh, t.productId, t.sourceWarehouseId);
                if (ss) {
                  ss.reservedQty = Math.max(0, (ss.reservedQty || 0) - t.quantity);
                  ss.updatedAt = new Date().toISOString();
                }
              }
              t.rejection = { userId: App.user.id, userName: App.user.name, at: new Date().toISOString(), reason: reason, stage: stageMap[t.status] };
              t.status = 'rejected';
              ok++;
            });
            saveDB(fresh);
            bulkSelection = {};
            selectMode = false;
            c.remove();
            toast('رد گروهی', ok + ' رد · ' + skip + ' ناموفق', ok ? 'success' : 'warn');
            render();
          }
        }
      ]
    });
  });

  draw();
}
