'use strict';

function doApprove(id) {
  openModal({
    title: 'تأیید مرحله',
    desc: 'آیا از تأیید این مرحله مطمئن هستید؟',
    body: '<div class="field"><label>یادداشت (اختیاری)</label><textarea id="ap-note"></textarea></div>',
    actions: [
      { label: 'انصراف', cls: 'ghost', onClick: function (c) { c.remove(); } },
      {
        label: IC.check + ' تأیید',
        cls: 'success',
        onClick: function (c) {
          var btn = c.querySelector('button.success');
          if (btn) btn.classList.add('loading');
          var noteBox = c.querySelector('#ap-note');
          var note = noteBox ? noteBox.value.trim() : '';
          setTimeout(function () {
            try {
              var db = loadDB();
              var t = null;
              for (var i = 0; i < db.transfers.length; i++) {
                if (db.transfers[i].id === id) { t = db.transfers[i]; break; }
              }
              if (!t) { c.remove(); return; }
              if (!canApprove(App.user, t)) { c.remove(); toast('دسترسی ندارید', '', 'error'); return; }
              var step = { userId: App.user.id, userName: App.user.name, at: new Date().toISOString(), note: note };
              var finalized = false;

              if (t.type === 'inbound') {
                if (t.status === 'pending_warehouse') { t.warehouseApproval = step; t.status = 'pending_accountant'; }
                else if (t.status === 'pending_accountant') { t.accountantApproval = step; t.status = 'pending_manager'; }
                else if (t.status === 'pending_manager') {
                  t.managerApproval = step;
                  var ds = findStock(db, t.productId, t.destinationWarehouseId);
                  if (!ds) {
                    ds = { id: uid(), productId: t.productId, warehouseId: t.destinationWarehouseId, quantity: 0, reservedQty: 0, minQuantity: 5, updatedAt: new Date().toISOString() };
                    db.stocks.push(ds);
                  }
                  ds.quantity = (ds.quantity || 0) + t.quantity;
                  ds.updatedAt = new Date().toISOString();
                  t.status = 'approved';
                  t.completedAt = new Date().toISOString();
                  finalized = true;
                }
              } else {
                if (t.status === 'pending_warehouse') { t.warehouseApproval = step; t.status = 'pending_accountant'; }
                else if (t.status === 'pending_accountant') { t.accountantApproval = step; t.status = 'pending_manager'; }
                else if (t.status === 'pending_manager') {
                  t.managerApproval = step;
                  var srcStock = findStock(db, t.productId, t.sourceWarehouseId);
                  if (!srcStock || srcStock.quantity < t.quantity) {
                    c.remove(); toast('موجودی کافی نیست', '', 'error'); return;
                  }
                  srcStock.quantity -= t.quantity;
                  srcStock.reservedQty = Math.max(0, (srcStock.reservedQty || 0) - t.quantity);
                  srcStock.updatedAt = new Date().toISOString();
                  var dstW = getWh(db, t.destinationWarehouseId);
                  if (dstW && dstW.type !== 'customer') {
                    var ds2 = findStock(db, t.productId, t.destinationWarehouseId);
                    if (!ds2) {
                      ds2 = { id: uid(), productId: t.productId, warehouseId: t.destinationWarehouseId, quantity: 0, reservedQty: 0, minQuantity: 5, updatedAt: new Date().toISOString() };
                      db.stocks.push(ds2);
                    }
                    ds2.quantity = (ds2.quantity || 0) + t.quantity;
                    ds2.updatedAt = new Date().toISOString();
                  }
                  t.status = 'approved';
                  t.completedAt = new Date().toISOString();
                  finalized = true;
                }
              }

              saveDB(db);
              try { c.remove(); } catch (e) {}
              closeNotif();
              if (finalized) {
                celebrate(t.type === 'inbound' ? 'ورود کالا ثبت شد' : 'انتقال قطعی شد', '', 'success', 2000);
                notifyBrowser(t.type === 'inbound' ? 'ورود کالا ثبت شد' : 'انتقال قطعی شد',
                  t.code + ' — ' + ((getProd(db, t.productId) || {}).name || ''), t.id);
              } else {
                toast('تأیید شد', 'به مرحله بعد منتقل شد', 'success');
                notifyBrowser('تأیید شد', t.code, t.id);
              }
              requestAnimationFrame(function () { requestAnimationFrame(function () { render(); }); });
            } catch (err) {
              try { c.remove(); } catch (e) {}
              toast('خطا', err.message || 'عملیات ناموفق', 'error');
            }
          }, 400);
        }
      }
    ]
  });
}

function doReject(id) {
  openModal({
    title: 'رد درخواست',
    desc: 'دلیل رد را وارد کنید.',
    body: '<div class="field"><label>دلیل <span class="req">*</span></label><textarea id="rj-reason"></textarea></div>',
    actions: [
      { label: 'انصراف', cls: 'ghost', onClick: function (c) { c.remove(); } },
      {
        label: IC.x + ' ثبت رد',
        cls: 'danger',
        onClick: function (c) {
          var reasonBox = c.querySelector('#rj-reason');
          var reason = reasonBox ? reasonBox.value.trim() : '';
          if (!reason) { toast('دلیل الزامی است', '', 'warn'); return; }
          var btn = c.querySelector('button.danger');
          if (btn) btn.classList.add('loading');
          setTimeout(function () {
            try {
              var db = loadDB();
              var t = null;
              for (var i = 0; i < db.transfers.length; i++) {
                if (db.transfers[i].id === id) { t = db.transfers[i]; break; }
              }
              if (!t) { c.remove(); return; }
              if (!canApprove(App.user, t)) { c.remove(); toast('دسترسی ندارید', '', 'error'); return; }

              var stageMap = { pending_warehouse: 'warehouse', pending_accountant: 'accountant', pending_manager: 'manager' };
              var stage = stageMap[t.status];
              var undoState = {
                transferId: t.id,
                prevStatus: t.status,
                reservedDelta: 0,
                prevRejection: t.rejection ? JSON.parse(JSON.stringify(t.rejection)) : null
              };
              if (t.type !== 'inbound') {
                var srcStock = findStock(db, t.productId, t.sourceWarehouseId);
                if (srcStock) {
                  srcStock.reservedQty = Math.max(0, (srcStock.reservedQty || 0) - t.quantity);
                  srcStock.updatedAt = new Date().toISOString();
                  undoState.reservedDelta = t.quantity;
                }
              }
              t.rejection = { userId: App.user.id, userName: App.user.name, at: new Date().toISOString(), reason: reason, stage: stage };
              t.status = 'rejected';
              saveDB(db);
              c.remove();
              closeNotif();

              showUndoToast('درخواست «' + t.code + '» رد شد', function () {
                try {
                  var fresh = loadDB();
                  var tf = null;
                  for (var j = 0; j < fresh.transfers.length; j++) {
                    if (fresh.transfers[j].id === undoState.transferId) { tf = fresh.transfers[j]; break; }
                  }
                  if (!tf) return;
                  tf.status = undoState.prevStatus;
                  tf.rejection = undoState.prevRejection;
                  if (undoState.reservedDelta > 0) {
                    var ss = findStock(fresh, tf.productId, tf.sourceWarehouseId);
                    if (ss) {
                      ss.reservedQty = (ss.reservedQty || 0) + undoState.reservedDelta;
                      ss.updatedAt = new Date().toISOString();
                    }
                  }
                  saveDB(fresh);
                  toast('بازگردانی شد', 'وضعیت به حالت قبل بازگشت', 'success');
                  requestAnimationFrame(function () { requestAnimationFrame(function () { render(); }); });
                } catch (err) {
                  toast('خطا در بازگردانی', err.message || '', 'error');
                }
              }, 5000);
              requestAnimationFrame(function () { requestAnimationFrame(function () { render(); }); });
            } catch (err) {
              try { c.remove(); } catch (e) {}
              toast('خطا', err.message || 'عملیات ناموفق', 'error');
            }
          }, 400);
        }
      }
    ]
  });
}

function openTransfer(id) {
  var db = loadDB();
  var t = null;
  for (var i = 0; i < db.transfers.length; i++) {
    if (db.transfers[i].id === id) { t = db.transfers[i]; break; }
  }
  if (!t) { toast('یافت نشد', '', 'error'); return; }
  var st = stOf(t);
  var isIn = t.type === 'inbound';
  var p = getProd(db, t.productId);
  var src = getWh(db, t.sourceWarehouseId);
  var dst = getWh(db, t.destinationWarehouseId);

  var steps = [
    { title: 'ثبت درخواست', done: true, at: t.createdAt, user: t.createdByName, icon: IC.plus },
    { title: 'تأیید انباردار', step: t.warehouseApproval, icon: IC.package },
    { title: 'تأیید حسابدار', step: t.accountantApproval, icon: IC.shield },
    { title: 'تأیید مدیر',     step: t.managerApproval, icon: IC.users },
    { title: isIn ? 'ورود قطعی' : 'انتقال قطعی', done: !!t.completedAt, at: t.completedAt, icon: IC.check }
  ];
  var rMap = { warehouse: 1, accountant: 2, manager: 3 };
  var rStep = t.rejection ? rMap[t.rejection.stage] : -1;
  var tlHTML = steps.map(function (s, i) {
    var cls = '';
    if (i === 0 || i === 4) cls = s.done ? 'done' : '';
    else {
      if (s.step) cls = 'done';
      else if (i === rStep) cls = 'rejected';
      else if (i === st.step) cls = 'active';
    }
    var meta = [];
    if (s.at) meta.push('<b>' + esc(s.user || '') + '</b> · ' + faDate(s.at));
    if (s.step) meta.push('<b>' + esc(s.step.userName) + '</b> · ' + faDate(s.step.at));
    if (i === rStep && t.rejection) {
      meta.push('<span style="color:#FF3B30">رد توسط <b>' + esc(t.rejection.userName) + '</b><br>دلیل: ' + esc(t.rejection.reason) + '</span>');
    }
    var icon = cls === 'done' ? IC.check : cls === 'rejected' ? IC.x : cls === 'active' ? IC.clock : s.icon;
    return '<li class="' + cls + '"><div class="tl-node">' + icon + '</div>' +
      '<div class="tl-title">' + s.title + '</div>' +
      (meta.length ? '<div class="tl-meta">' + meta.join('<br>') + '</div>' : '') + '</li>';
  }).join('');

  var prodHistory = db.transfers.filter(function (tt) { return tt.productId === t.productId; })
    .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); })
    .slice(0, 8);
  var historyHTML = '<div style="margin-top:16px"><div style="font-weight:700;margin-bottom:12px">تاریخچه این کالا</div>' +
    '<div class="prod-timeline">' +
      prodHistory.map(function (ph) {
        var phSt = stOf(ph);
        var isPHin = ph.type === 'inbound';
        var cls = ph.status === 'approved' ? 'done' : ph.status === 'rejected' ? 'rejected' : 'active';
        var icon = ph.status === 'approved' ? IC.check : ph.status === 'rejected' ? IC.x : IC.clock;
        var desc = isPHin ? 'ورود از ' + (ph.supplierName || '—') : 'انتقال ' + ph.quantity + ' عدد';
        return '<div class="pt-item ' + cls + '"><div class="pt-node">' + icon + '</div>' +
          '<div class="pt-title">' + esc(ph.code) + ' · ' + esc(desc) + '</div>' +
          '<div class="pt-meta">' + esc(phSt.label) + ' · ' + relTime(ph.createdAt) + '</div></div>';
      }).join('') +
    '</div></div>';

  var kitBlock = '';
  if (p && p.components && p.components.length && isKitUnit(p.unit)) {
    kitBlock = '<div style="margin-top:16px"><div style="font-weight:700;margin-bottom:10px">اقلام یک ' + esc(p.unit) + ' کامل</div>' +
      '<div class="kit-list">' +
        p.components.map(function (c) {
          return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:var(--surface-2);border:1px solid var(--border);border-radius:14px;font-size:13px"><b>' + esc(c.name) + '</b><span class="notif-qty">×' + c.qty + '</span></div>';
        }).join('') +
      '</div></div>';
  }

  var imgBlock = '';
  if (p && p.image) {
    imgBlock = '<div style="text-align:center;margin-bottom:14px"><img src="' + esc(p.image) + '" alt="" style="max-width:100%;max-height:200px;border-radius:16px;border:1px solid var(--border)"></div>';
  }

  var body = imgBlock +
    '<div class="dl" style="grid-template-columns:repeat(2,1fr);display:grid;gap:1px;margin-bottom:16px">' +
      '<div class="dl-item"><div class="k">وضعیت</div><div class="v"><span class="badge ' + st.tone + '"><span class="dot"></span>' + st.label + '</span></div></div>' +
      '<div class="dl-item"><div class="k">نوع</div><div class="v">' + (isIn ? 'ورود' : (t.type === 'direct-customer' ? 'ارسال به مشتری' : 'انتقال')) + '</div></div>' +
      (isIn ?
        '<div class="dl-item"><div class="k">تأمین‌کننده</div><div class="v">' + esc(t.supplierName || '—') + '</div></div>' :
        '<div class="dl-item"><div class="k">مبدأ</div><div class="v">' + esc((src && src.name) || '—') + '</div></div>') +
      '<div class="dl-item"><div class="k">مقصد</div><div class="v">' + esc((dst && dst.name) || '—') + '</div></div>' +
      '<div class="dl-item"><div class="k">کالا</div><div class="v">' + esc((p && p.name) || '—') + '</div></div>' +
      '<div class="dl-item"><div class="k">تعداد</div><div class="v">' + t.quantity + ' ' + esc((p && p.unit) || '') + '</div></div>' +
      (isIn && t.invoiceNumber ? '<div class="dl-item" style="grid-column:1/-1"><div class="k">شماره فاکتور</div><div class="v" style="font-family:monospace;direction:ltr;text-align:left">' + esc(t.invoiceNumber) + '</div></div>' : '') +
      (t.customerName ? '<div class="dl-item"><div class="k">مشتری</div><div class="v">' + esc(t.customerName) + '</div></div><div class="dl-item"><div class="k">تماس</div><div class="v">' + esc(t.customerPhone || '—') + '</div></div>' : '') +
      (t.description ? '<div class="dl-item" style="grid-column:1/-1"><div class="k">توضیحات</div><div class="v" style="font-weight:400">' + esc(t.description) + '</div></div>' : '') +
    '</div>' +
    kitBlock +
    '<div style="font-weight:700;margin:16px 0 14px">مراحل تأیید</div>' +
    '<ul class="tl">' + tlHTML + '</ul>' +
    historyHTML;

  var foot = '';
  if (canApprove(App.user, t)) {
    foot = '<button type="button" class="btn success" id="d-approve" style="flex:1">' + IC.check + ' تأیید</button>' +
           '<button type="button" class="btn danger" id="d-reject">' + IC.x + ' رد</button>';
  } else {
    foot = '<div class="muted small" style="text-align:center;width:100%">اقدامی برای شما در دسترس نیست</div>';
  }

  openDrawer({
    title: '<span style="font-family:monospace;font-size:13px;color:var(--muted);direction:ltr;display:inline-block">' + esc(t.code) + '</span>',
    body: body,
    foot: foot
  });
  var ap = $('#d-approve');
  if (ap) ap.addEventListener('click', function () { closeDrawer(); doApprove(t.id); });
  var rj = $('#d-reject');
  if (rj) rj.addEventListener('click', function () { closeDrawer(); doReject(t.id); });
}
