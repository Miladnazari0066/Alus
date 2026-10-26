'use strict';

function pageNewTransfer(page) {
  var db = loadDB();
  var sources = db.warehouses.filter(function (w) { return allowedSourceTypes().indexOf(w.type) >= 0; });
  if (!sources.length) {
    page.innerHTML = '<div class="page-head"><div><h1>درخواست جابه‌جایی</h1></div></div>' +
      '<div class="widget">' + emptyState('انباری برای مبدأ یافت نشد') + '</div>';
    return;
  }
  var state = { step: 1, src: '', dst: '', pid: '', qty: 0, desc: '', customerName: '', customerPhone: '' };

  page.innerHTML = '<div class="page-head"><div><h1>درخواست جابه‌جایی</h1></div></div>' +
    '<div class="widget" style="max-width:760px;margin:0 auto">' +
      '<div class="wiz-steps"><div class="wiz-line"><div class="wiz-fill" id="wiz-fill"></div></div>' +
        '<div class="wiz-step active" data-step="1"><div class="num">۱</div><div class="lbl">مسیر</div></div>' +
        '<div class="wiz-step" data-step="2"><div class="num">۲</div><div class="lbl">کالا</div></div>' +
        '<div class="wiz-step" data-step="3"><div class="num">۳</div><div class="lbl">تأیید</div></div>' +
      '</div>' +
      '<div id="wiz-body"></div>' +
      '<div style="display:flex;gap:10px;margin-top:22px;justify-content:space-between">' +
        '<button type="button" class="btn ghost" id="wiz-back">قبلی</button>' +
        '<button type="button" class="btn primary" id="wiz-next">بعدی</button>' +
      '</div>' +
    '</div>';

  function updateSteps() {
    $$('.wiz-step').forEach(function (el) {
      var s = +el.dataset.step;
      el.classList.toggle('active', s === state.step);
      el.classList.toggle('done', s < state.step);
    });
    $('#wiz-fill').style.width = ((state.step - 1) / 2 * 100) + '%';
  }

  function draw() {
    updateSteps();
    var body = $('#wiz-body');
    var back = $('#wiz-back');
    var next = $('#wiz-next');
    back.style.visibility = state.step === 1 ? 'hidden' : 'visible';
    next.innerHTML = state.step === 3 ? (IC.check + ' ثبت نهایی') : ('بعدی ' + IC.arrowL);

    if (state.step === 1) {
      var srcW = null;
      for (var i = 0; i < sources.length; i++) {
        if (sources[i].id === state.src) { srcW = sources[i]; break; }
      }
      var allowed = state.src ? allowedDest(srcW && srcW.type) : [];
      var dests = db.warehouses.filter(function (w) { return allowed.indexOf(w.type) >= 0; });
      body.innerHTML = '<div class="form-grid">' +
        '<div class="field"><label>انبار مبدأ <span class="req">*</span></label>' +
          '<select id="w-src"><option value="">انتخاب...</option>' +
            sources.map(function (w) { return '<option value="' + w.id + '" ' + (state.src === w.id ? 'selected' : '') + '>' + esc(w.name) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label>انبار مقصد <span class="req">*</span></label>' +
          '<select id="w-dst" ' + (!state.src ? 'disabled' : '') + '>' +
            '<option value="">' + (state.src ? 'انتخاب...' : 'ابتدا مبدأ') + '</option>' +
            dests.map(function (w) { return '<option value="' + w.id + '" ' + (state.dst === w.id ? 'selected' : '') + '>' + esc(w.name) + '</option>'; }).join('') +
          '</select></div>' +
      '</div>' +
      '<div style="margin-top:16px" class="muted small">مسیر مجاز خودکار محدود می‌شود.</div>';
      $('#w-src').addEventListener('change', function (e) { state.src = e.target.value; state.dst = ''; draw(); });
      $('#w-dst').addEventListener('change', function (e) { state.dst = e.target.value; draw(); });
    } else if (state.step === 2) {
      var stock = findStock(db, state.pid, state.src);
      var avail = stock ? stock.quantity - (stock.reservedQty || 0) : 0;
      body.innerHTML = '<div class="form-grid">' +
        '<div class="field"><label>کالا <span class="req">*</span></label>' +
          '<select id="w-pid"><option value="">انتخاب...</option>' +
            db.products.map(function (p) { return '<option value="' + p.id + '" ' + (state.pid === p.id ? 'selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label>تعداد <span class="req">*</span></label>' +
          '<input id="w-qty" type="number" min="1" value="' + (state.qty || '') + '" /></div>' +
        '<div class="full field"><label>توضیحات</label>' +
          '<textarea id="w-desc">' + esc(state.desc) + '</textarea></div>' +
        (state.pid && state.src ? '<div class="full"><div style="padding:14px 18px;background:var(--grad-soft);border-radius:20px;font-size:12.5px">موجودی قابل استفاده: <b style="color:#007AFF;font-size:16px">' + avail + '</b></div></div>' : '') +
      '</div>';
      $('#w-pid').addEventListener('change', function (e) { state.pid = e.target.value; state.qty = 0; draw(); });
      $('#w-qty').addEventListener('input', function (e) { state.qty = +e.target.value; });
      $('#w-desc').addEventListener('input', function (e) { state.desc = e.target.value; });
    } else {
      var srcW2 = getWh(db, state.src);
      var dstW = getWh(db, state.dst);
      var p2 = getProd(db, state.pid);
      var kitMini = '';
      if (p2 && p2.components && p2.components.length && isKitUnit(p2.unit)) {
        kitMini = '<div style="margin-top:12px;padding:12px 14px;background:var(--surface-2);border-radius:16px;font-size:12px;color:var(--text-2)">' +
          IC.grid + ' اقلام: ' + p2.components.map(function (c) { return esc(c.name) + ' ×' + c.qty; }).join(' + ') + '</div>';
      }
      var customerBlock = '';
      if (dstW && dstW.type === 'sold') {
        customerBlock = '<div class="full form-grid" style="margin-top:8px;padding-top:14px;border-top:1px dashed var(--border)">' +
          '<div class="field"><label>نام مشتری</label>' +
            '<input id="w-cname" value="' + esc(state.customerName) + '" placeholder="اختیاری" /></div>' +
          '<div class="field"><label>شماره تماس</label>' +
            '<input id="w-cphone" value="' + esc(state.customerPhone) + '" placeholder="اختیاری" /></div>' +
        '</div>';
      }
      body.innerHTML = '<div class="dl" style="grid-template-columns:1fr 1fr;display:grid;gap:1px">' +
        '<div class="dl-item"><div class="k">مبدأ</div><div class="v">' + esc((srcW2 && srcW2.name) || '') + '</div></div>' +
        '<div class="dl-item"><div class="k">مقصد</div><div class="v">' + esc((dstW && dstW.name) || '') + '</div></div>' +
        '<div class="dl-item"><div class="k">کالا</div><div class="v">' + esc((p2 && p2.name) || '') + '</div></div>' +
        '<div class="dl-item"><div class="k">تعداد</div><div class="v">' + state.qty + ' ' + esc((p2 && p2.unit) || '') + '</div></div>' +
      '</div>' + kitMini +
      (dstW && dstW.type === 'sold' ? '<div style="margin-top:14px;padding:12px 14px;background:rgba(255,59,48,.08);border:1px solid rgba(255,59,48,.2);border-radius:14px;font-size:12px;color:#b91c1c">' + IC.alert + ' انتقال به «کالای فروش‌رفته»</div>' : '') +
      customerBlock +
      '<div style="margin-top:16px" class="muted small">' + IC.info + ' پس از ثبت، در انتظار تأیید انباردار</div>';
      if (dstW && dstW.type === 'sold') {
        var c1 = $('#w-cname');
        if (c1) c1.addEventListener('input', function (e) { state.customerName = e.target.value; });
        var c2 = $('#w-cphone');
        if (c2) c2.addEventListener('input', function (e) { state.customerPhone = e.target.value; });
      }
    }
  }

  $('#wiz-back').addEventListener('click', function () {
    if (state.step > 1) { state.step--; draw(); }
  });

  $('#wiz-next').addEventListener('click', function () {
    if (state.step === 1) {
      if (!state.src || !state.dst) { toast('اطلاعات ناقص', 'مبدأ و مقصد', 'warn'); return; }
      state.step = 2;
      draw();
    } else if (state.step === 2) {
      if (!state.pid || !state.qty || state.qty <= 0) { toast('اطلاعات ناقص', 'کالا و تعداد', 'warn'); return; }
      var stock = findStock(db, state.pid, state.src);
      var avail = stock ? stock.quantity - (stock.reservedQty || 0) : 0;
      if (state.qty > avail) { toast('موجودی کافی نیست', 'قابل استفاده: ' + avail, 'error'); return; }
      state.step = 3;
      draw();
    } else {
      var btn = $('#wiz-next');
      btn.classList.add('loading');
      setTimeout(function () {
        try {
          var fresh = loadDB();
          var srcStock = findStock(fresh, state.pid, state.src);
          if (!srcStock) { btn.classList.remove('loading'); toast('کالا یافت نشد', '', 'error'); return; }
          var avail2 = srcStock.quantity - (srcStock.reservedQty || 0);
          if (state.qty > avail2) { btn.classList.remove('loading'); toast('موجودی کافی نیست', '', 'error'); return; }
          srcStock.reservedQty = (srcStock.reservedQty || 0) + state.qty;
          srcStock.updatedAt = new Date().toISOString();
          var dstW = getWh(fresh, state.dst);
          var t = {
            id: uid(),
            code: tcode(fresh),
            type: dstW.type === 'customer' ? 'direct-customer' : 'warehouse',
            sourceWarehouseId: state.src,
            destinationWarehouseId: state.dst,
            productId: state.pid,
            quantity: state.qty,
            description: state.desc,
            customerName: state.customerName || '',
            customerPhone: state.customerPhone || '',
            status: 'pending_warehouse',
            createdBy: App.user.id,
            createdByName: App.user.name,
            createdAt: new Date().toISOString()
          };
          fresh.transfers.unshift(t);
          saveDB(fresh);
          toast('ثبت شد', 'در انتظار تأیید انباردار', 'success');
          notifyBrowser('درخواست جدید', t.code, t.id);
          go('transfers');
        } catch (err) {
          btn.classList.remove('loading');
          toast('خطا', err.message || '', 'error');
        }
      }, 400);
    }
  });
  draw();
}
