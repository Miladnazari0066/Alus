'use strict';

function pageNewInbound(page) {
  var db = loadDB();
  var central = whByType(db, 'central');
  if (!central) {
    page.innerHTML = '<div class="page-head"><div><h1>ثبت ورود کالا</h1></div></div>' +
      '<div class="widget">' + emptyState('انبار مرکزی یافت نشد') + '</div>';
    return;
  }
  page.innerHTML = '<div class="page-head"><div><h1>ثبت ورود کالا</h1>' +
    '<div class="sub">از تأمین‌کننده به انبار مرکزی</div></div>' +
    '<div class="page-actions">' +
      '<button type="button" class="btn ghost" id="back-btn">' + IC.chevR + ' بازگشت</button>' +
    '</div></div>' +
    '<div class="widget" style="max-width:820px;margin:0 auto">' +
      '<form id="ibf" class="form-grid">' +
        '<div class="field full"><label>نام تأمین‌کننده <span class="req">*</span></label>' +
          '<input id="ib-supplier" required placeholder="چوب و مصنوعات پارس" /></div>' +
        '<div class="field"><label>کالا <span class="req">*</span></label>' +
          '<select id="ib-product" required><option value="">انتخاب...</option>' +
            db.products.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label>تعداد <span class="req">*</span></label>' +
          '<input id="ib-qty" type="number" min="1" required /></div>' +
        '<div class="field"><label>شماره فاکتور</label>' +
          '<input id="ib-invoice" placeholder="INV-..." style="font-family:monospace;direction:ltr;text-align:left" /></div>' +
        '<div class="field"><label>انبار مقصد</label>' +
          '<input value="' + esc(central.name) + '" disabled style="font-weight:700" /></div>' +
        '<div class="field full"><label>توضیحات</label><textarea id="ib-desc"></textarea></div>' +
        '<div class="full row" style="justify-content:flex-end;margin-top:6px">' +
          '<button type="submit" class="btn primary">' + IC.check + ' ثبت</button>' +
        '</div>' +
      '</form>' +
    '</div>';

  $('#back-btn').addEventListener('click', function () { go('inbounds'); });

  $('#ibf').addEventListener('submit', function (e) {
    e.preventDefault();
    var supplierName = $('#ib-supplier').value.trim();
    var productId = $('#ib-product').value;
    var quantity = parseInt($('#ib-qty').value, 10);
    var invoiceNumber = $('#ib-invoice').value.trim();
    var description = $('#ib-desc').value.trim();
    if (!supplierName || !productId || !quantity || quantity <= 0) {
      toast('اطلاعات ناقص', '', 'warn');
      return;
    }
    try {
      var fresh = loadDB();
      var centralW = whByType(fresh, 'central');
      if (!centralW) { toast('انبار مرکزی یافت نشد', '', 'error'); return; }
      var t = {
        id: uid(),
        code: icode(fresh),
        type: 'inbound',
        supplierName: supplierName,
        invoiceNumber: invoiceNumber,
        productId: productId,
        quantity: quantity,
        sourceWarehouseId: null,
        destinationWarehouseId: centralW.id,
        description: description,
        status: 'pending_warehouse',
        createdBy: App.user.id,
        createdByName: App.user.name,
        createdAt: new Date().toISOString()
      };
      fresh.transfers.unshift(t);
      saveDB(fresh);
      toast('ثبت شد', 'در انتظار تأیید انباردار', 'success');
      notifyBrowser('ورود جدید', t.code, t.id);
      go('inbounds');
      setTimeout(function () { openTransfer(t.id); }, 300);
    } catch (err) {
      toast('خطا', err.message || '', 'error');
    }
  });
}
