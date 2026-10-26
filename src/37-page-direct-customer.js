'use strict';

function pageDirectCustomer(page) {
  var db = loadDB();
  var uph = whByType(db, 'upholstery');
  if (!uph) {
    page.innerHTML = '<div class="page-head"><div><h1>ارسال مستقیم به مشتری</h1></div></div>' +
      '<div class="widget">' + emptyState('انبار رویه‌کوبی یافت نشد') + '</div>';
    return;
  }

  page.innerHTML = '<div class="page-head"><div><h1>ارسال مستقیم به مشتری</h1></div></div>' +
    '<div class="widget" style="max-width:760px">' +
      '<form id="dcf" class="form-grid">' +
        '<div class="field"><label>کالا <span class="req">*</span></label>' +
          '<select id="dp" required><option value="">انتخاب...</option>' +
            db.products.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label>تعداد <span class="req">*</span></label>' +
          '<input id="dq" type="number" min="1" required /></div>' +
        '<div class="field"><label>نام مشتری <span class="req">*</span></label>' +
          '<input id="dn" required /></div>' +
        '<div class="field"><label>شماره تماس</label><input id="dph" /></div>' +
        '<div class="full field"><label>توضیحات</label><textarea id="dd"></textarea></div>' +
        '<div class="full" id="dav"></div>' +
        '<div class="full row" style="justify-content:flex-end;margin-top:6px">' +
          '<button type="button" class="btn ghost" id="cancel-btn">انصراف</button>' +
          '<button type="submit" class="btn primary">' + IC.truck + ' ثبت</button>' +
        '</div>' +
      '</form>' +
    '</div>';

  function upd() {
    var pid = $('#dp').value;
    var box = $('#dav');
    if (!pid) { box.innerHTML = ''; return; }
    var s = findStock(db, pid, uph.id);
    if (!s) {
      box.innerHTML = '<div style="padding:14px 18px;background:rgba(255,59,48,.1);border-radius:20px;color:#FF3B30;font-size:12.5px">' +
        'این کالا در رویه‌کوبی موجود نیست</div>';
      return;
    }
    var avail = s.quantity - (s.reservedQty || 0);
    box.innerHTML = '<div style="padding:14px 18px;background:var(--grad-soft);border-radius:20px;font-size:12.5px">' +
      'موجودی قابل استفاده: <b style="color:#007AFF;font-size:16px">' + avail + '</b></div>';
  }

  $('#dp').addEventListener('change', upd);
  $('#cancel-btn').addEventListener('click', function () { go('transfers'); });

  $('#dcf').addEventListener('submit', function (e) {
    e.preventDefault();
    var pid = $('#dp').value;
    var qty = +$('#dq').value;
    var name = $('#dn').value.trim();
    var phone = $('#dph').value.trim();
    var desc = $('#dd').value.trim();
    if (!pid || !qty || qty <= 0 || !name) { toast('اطلاعات ناقص', '', 'warn'); return; }
    try {
      var fresh = loadDB();
      var customer = whByType(fresh, 'customer');
      var uphW = whByType(fresh, 'upholstery');
      if (!customer || !uphW) { toast('یافت نشد', '', 'error'); return; }
      var s = findStock(fresh, pid, uphW.id);
      var avail = s ? s.quantity - (s.reservedQty || 0) : 0;
      if (!s || qty > avail) { toast('موجودی کافی نیست', 'قابل استفاده: ' + avail, 'error'); return; }
      s.reservedQty = (s.reservedQty || 0) + qty;
      s.updatedAt = new Date().toISOString();
      var t = {
        id: uid(),
        code: tcode(fresh),
        type: 'direct-customer',
        sourceWarehouseId: uphW.id,
        destinationWarehouseId: customer.id,
        productId: pid,
        quantity: qty,
        customerName: name,
        customerPhone: phone,
        description: desc,
        status: 'pending_warehouse',
        createdBy: App.user.id,
        createdByName: App.user.name,
        createdAt: new Date().toISOString()
      };
      fresh.transfers.unshift(t);
      saveDB(fresh);
      toast('ثبت شد', 'در انتظار تأیید انباردار', 'success');
      go('transfers');
    } catch (err) {
      toast('خطا', err.message || '', 'error');
    }
  });
}
