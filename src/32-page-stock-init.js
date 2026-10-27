'use strict';

function pageStockInit(page) {
  var db = loadDB();
  var stockable = db.warehouses.filter(function (w) { return w.type !== 'customer'; });
  var comps = [];
  var currentImage = '';

  var datalist = '<datalist id="prod-suggest">' +
    db.products.map(function (p) {
      return '<option value="' + esc(p.name) + '">' + (p.code ? esc(p.code) : '') + (p.unit ? ' · ' + esc(p.unit) : '') + '</option>';
    }).join('') + '</datalist>';

  page.innerHTML = '<div class="page-head"><div><h1>مقداردهی اولیه</h1>' +
    '<div class="sub">نام کالا را تایپ کنید، واحد شمارش را انتخاب کنید و موجودی را ثبت کنید</div></div></div>' +
    '<div class="widget" style="max-width:860px">' + datalist +
      '<form id="if" class="form-grid" autocomplete="off">' +
        '<div class="field full">' +
          '<label>نام کالا <span class="req">*</span></label>' +
          '<input id="ip" list="prod-suggest" required placeholder="مثلاً: مبل مدل A" autocomplete="off" spellcheck="false" />' +
          '<div class="hint">' + IC.info + ' اگر کالا در لیست باشد به‌روزرسانی می‌شود، در غیر این صورت کالای جدید ساخته می‌شود.</div>' +
          '<div id="prod-status"></div>' +
        '</div>' +
        '<div class="field"><label>واحد شمارش <span class="req">*</span></label>' +
          '<select id="iu" required>' +
            UNITS.map(function (u) { return '<option value="' + u + '"' + (u === 'دست' ? ' selected' : '') + '>' + u + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label>انبار <span class="req">*</span></label>' +
          '<select id="iw" required><option value="">انتخاب...</option>' +
            stockable.map(function (w) { return '<option value="' + w.id + '">' + esc(w.name) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label>تعداد <span class="req">*</span></label>' +
          '<input id="iq" type="number" min="0" required placeholder="0" /></div>' +
        '<div class="field"><label>حد هشدار (کم‌موجودی)</label>' +
          '<input id="imin" type="number" min="0" value="5" placeholder="5" />' +
          '<div class="hint">' + IC.info + ' وقتی به این تعداد یا کمتر رسید، هشدار داده می‌شود</div></div>' +
        '<div class="field full">' +
          '<label>تصویر کالا</label>' +
          '<div class="img-upload-box">' +
            '<div class="img-upload-preview" id="img-preview">' + IC.image + '</div>' +
            '<div class="img-upload-info">' +
              '<label for="img-input">انتخاب یا تغییر تصویر</label>' +
              '<small>فرمت JPG/PNG · تصویر مستقیماً در ابر (Supabase) ذخیره می‌شود</small>' +
              '<div class="img-upload-actions">' +
                '<button type="button" class="btn ghost sm" id="img-btn">' + IC.upload + ' انتخاب فایل</button>' +
                '<button type="button" class="btn ghost sm" id="img-clear" style="display:none">' + IC.trash + ' حذف</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<input type="file" id="img-input" accept="image/*" style="display:none" />' +
        '</div>' +
        '<div class="full" id="kit-wrap" style="display:none">' +
          '<div class="kit-box">' +
            '<div class="kit-head">' +
              '<div class="kit-head-title"><div class="kit-ic">' + IC.grid + '</div>' +
                '<div>اقلام تشکیل‌دهنده یک <span class="kit-unit-name" id="kit-unit-name">دست</span> کامل' +
                  '<small>مشخص کنید یک <span id="kit-unit-name-2">دست</span> از چه اقلامی ساخته می‌شود</small>' +
                '</div></div>' +
              '<button type="button" class="btn xs primary" id="kit-add">' + IC.plus + ' افزودن قلم</button>' +
            '</div>' +
            '<div class="kit-list" id="kit-list"></div>' +
            '<div class="kit-total" id="kit-total" style="display:none"></div>' +
            '<div class="kit-hint">' + IC.info + ' هر تعداد که ثبت کنید، برابر است با همین بسته‌ی اقلام.</div>' +
          '</div>' +
        '</div>' +
        '<div class="full" id="iq-hint"></div>' +
        '<div class="full row" style="justify-content:flex-end;margin-top:6px">' +
          '<button class="btn primary" type="submit" id="if-submit">' + IC.check + ' ثبت موجودی</button>' +
        '</div>' +
      '</form>' +
    '</div>';

  var pInput = $('#ip');
  var unitSel = $('#iu');
  var wSel = $('#iw');
  var qtyInput = $('#iq');
  var minInput = $('#imin');
  var statusBox = $('#prod-status');

  function updateImagePreview() {
    var box = $('#img-preview');
    var clr = $('#img-clear');
    if (currentImage) {
      box.innerHTML = '<img src="' + esc(currentImage) + '" alt="">';
      if (clr) clr.style.display = '';
    } else {
      box.innerHTML = IC.image;
      if (clr) clr.style.display = 'none';
    }
  }

  $('#img-btn').addEventListener('click', function () { $('#img-input').click(); });
  $('#img-input').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) { toast('حجم زیاد', 'حداکثر ۴ مگابایت', 'error'); return; }
    
    var btn = $('#img-btn');
    if (btn) { btn.classList.add('loading'); btn.textContent = 'در حال آپلود...'; }

    // فشرده‌سازی و آپلود به ابر
    compressImage(f, 400, 0.75).then(function (dataUrl) {
      // تبدیل Base64 به Blob (فایل فیزیکی) برای ارسال به Supabase
      var arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1],
          bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
      while(n--){ u8arr[n] = bstr.charCodeAt(n); }
      var blob = new Blob([u8arr], {type:mime});

      uploadImageToCloud(blob).then(function(publicUrl) {
        currentImage = publicUrl; // فقط لینک عکس رو ذخیره میکنیم
        updateImagePreview();
        toast('آپلود موفق', 'تصویر در ابر ذخیره شد', 'success');
      }).catch(function(err) {
        toast('خطای آپلود', err.message || 'اتصال به استوریج برقرار نشد', 'error');
      }).finally(function() {
        if (btn) { btn.classList.remove('loading'); btn.innerHTML = IC.upload + ' انتخاب فایل'; }
      });
    }).catch(function (err) { 
      if (btn) { btn.classList.remove('loading'); btn.innerHTML = IC.upload + ' انتخاب فایل'; }
      toast('خطا', err.message || '', 'error'); 
    });
    
    e.target.value = '';
  });
  $('#img-clear').addEventListener('click', function () { currentImage = ''; updateImagePreview(); });

  function renderKit() {
    var u = unitSel.value;
    var isKit = isKitUnit(u);
    $('#kit-wrap').style.display = isKit ? '' : 'none';
    $('#kit-unit-name').textContent = u;
    $('#kit-unit-name-2').textContent = u;
    if (!isKit) return;
    var list = $('#kit-list');
    if (!comps.length) {
      list.innerHTML = '<div class="kit-empty"><b>هنوز قلمی اضافه نشده</b>روی «افزودن قلم» بزنید</div>';
      $('#kit-total').style.display = 'none';
      return;
    }
    list.innerHTML = comps.map(function (c, i) {
      return '<div class="kit-row">' +
        '<input class="kit-name" data-i="' + i + '" value="' + esc(c.name) + '" placeholder="نام قلم" />' +
        '<input class="kit-qty" data-i="' + i + '" type="number" min="1" value="' + (c.qty || 1) + '" placeholder="تعداد" />' +
        '<button type="button" class="kit-del" data-i="' + i + '" title="حذف">' + IC.trash + '</button>' +
      '</div>';
    }).join('');
    var total = comps.reduce(function (a, c) { return a + (parseInt(c.qty, 10) || 0); }, 0);
    $('#kit-total').style.display = '';
    $('#kit-total').innerHTML = IC.grid + ' جمع اقلام در هر ' + esc(u) + ': <b>' + total.toLocaleString('fa-IR') + '</b> عدد';
    $$('.kit-name', list).forEach(function (inp) {
      inp.addEventListener('input', function () { comps[+inp.dataset.i].name = inp.value; });
    });
    $$('.kit-qty', list).forEach(function (inp) {
      inp.addEventListener('input', function () {
        comps[+inp.dataset.i].qty = Math.max(1, parseInt(inp.value, 10) || 1);
        var t = comps.reduce(function (a, c) { return a + (parseInt(c.qty, 10) || 0); }, 0);
        $('#kit-total').innerHTML = IC.grid + ' جمع اقلام: <b>' + t.toLocaleString('fa-IR') + '</b> عدد';
      });
    });
    $$('.kit-del', list).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.dataset.i;
        var row = b.closest('.kit-row');
        if (row) row.style.animation = 'fadeOut .18s forwards';
        setTimeout(function () { comps.splice(i, 1); renderKit(); }, 180);
      });
    });
  }

  function updateProductStatus() {
    var val = pInput.value.trim();
    if (!val) { statusBox.innerHTML = ''; return; }
    var fresh = loadDB();
    var match = findProductByName(fresh, val);
    if (match) {
      currentImage = match.image || '';
      updateImagePreview();
      var stockList = fresh.stocks.filter(function (s) { return s.productId === match.id && s.quantity > 0; });
      var totalQ = stockList.reduce(function (a, s) { return a + s.quantity; }, 0);
      var compCount = (match.components || []).length;
      statusBox.innerHTML = '<div style="margin-top:8px;padding:12px 14px;background:rgba(52,199,89,.10);border:1px solid rgba(52,199,89,.22);border-radius:16px;font-size:12.5px;color:#047857;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        IC.check + ' کالای موجود: <b>' + esc(match.name) + '</b> ' +
        '<span class="unit-chip">' + esc(match.unit || '—') + '</span>' +
        (compCount ? ' <span class="kit-chip" style="cursor:default">' + IC.grid + ' ' + compCount + ' قلم</span>' : '') +
        (totalQ > 0 ? ' <span style="opacity:.8">(موجودی فعلی: ' + totalQ + ')</span>' : '') +
      '</div>';
      if (match.unit && match.unit !== unitSel.value) {
        var found = false;
        for (var k = 0; k < UNITS.length; k++) if (UNITS[k] === match.unit) { found = true; break; }
        unitSel.value = found ? match.unit : 'عدد';
      }
      comps = (match.components || []).map(function (c) {
        return { id: c.id || uid(), name: c.name || '', qty: c.qty || 1 };
      });
      renderKit();
    } else {
      currentImage = '';
      updateImagePreview();
      if (comps.length) { comps = []; renderKit(); }
      statusBox.innerHTML = '<div style="margin-top:8px;padding:12px 14px;background:rgba(0,122,255,.10);border:1px solid rgba(0,122,255,.22);border-radius:16px;font-size:12.5px;color:var(--blue);display:flex;align-items:center;gap:8px">' +
        IC.plus + ' کالای جدید ساخته می‌شود: <b>' + esc(val) + '</b></div>';
    }
  }

  function updReservedHint() {
    var box = $('#iq-hint');
    var name = pInput.value.trim();
    var wid = wSel.value;
    if (!name || !wid) { box.innerHTML = ''; return; }
    var tmp = loadDB();
    var m = findProductByName(tmp, name);
    if (!m) { box.innerHTML = ''; return; }
    var s = findStock(tmp, m.id, wid);
    var rq = s ? (s.reservedQty || 0) : 0;
    if (rq > 0) {
      box.innerHTML = '<div style="padding:12px 16px;background:rgba(255,149,0,.1);border-radius:16px;font-size:12.5px;color:#b45309">' +
        IC.alert + ' این کالا ' + rq + ' ' + esc(m.unit || '') + ' رزرو دارد. مقدار جدید نباید کمتر از ' + rq + ' باشد.</div>';
    } else {
      box.innerHTML = '';
    }
  }

  pInput.addEventListener('input', function () { updateProductStatus(); updReservedHint(); });
  pInput.addEventListener('change', function () { updateProductStatus(); updReservedHint(); });
  wSel.addEventListener('change', updReservedHint);
  unitSel.addEventListener('change', renderKit);

  $('#kit-add').addEventListener('click', function () {
    comps.push({ id: uid(), name: '', qty: 1 });
    renderKit();
    var list = $('#kit-list');
    var rows = $$('.kit-row', list);
    if (rows.length) {
      var last = rows[rows.length - 1];
      var ni = last.querySelector('.kit-name');
      if (ni) ni.focus();
    }
  });

  $('#if').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = pInput.value.trim();
    var unit = unitSel.value;
    var wid = wSel.value;
    var qty = parseInt(qtyInput.value, 10);
    var minQ = parseInt(minInput.value, 10);
    if (!name || !wid || isNaN(qty) || qty < 0) { toast('اطلاعات ناقص', 'نام، انبار و تعداد الزامی است', 'error'); return; }
    if (name.length < 2) { toast('نام کوتاه است', '', 'warn'); return; }
    if (isKitUnit(unit)) {
      var cleanComps = comps.map(function (c) {
        return { id: c.id || uid(), name: (c.name || '').trim(), qty: Math.max(1, parseInt(c.qty, 10) || 1) };
      }).filter(function (c) { return c.name.length > 0; });
      if (!cleanComps.length) { toast('اقلام خالی است', 'حداقل یک قلم وارد کنید', 'warn'); return; }
      comps = cleanComps;
    }
    var btn = $('#if-submit');
    if (btn) btn.classList.add('loading');
    setTimeout(function () {
      try {
        var fresh = loadDB();
        var product = findProductByName(fresh, name);
        var created = false;
        if (!product) {
          product = {
            id: uid(), name: name, code: '', unit: unit, image: currentImage || '',
            components: isKitUnit(unit) ? comps.slice() : [],
            createdAt: new Date().toISOString()
          };
          fresh.products.push(product);
          created = true;
        } else {
          product.unit = unit;
          product.image = currentImage || '';
          product.components = isKitUnit(unit) ? comps.slice() : [];
        }
        var s = findStock(fresh, product.id, wid);
        var rq = s ? (s.reservedQty || 0) : 0;
        if (qty < rq) { if (btn) btn.classList.remove('loading'); toast('کمتر از رزرو', 'حداقل ' + rq + ' باشد', 'error'); return; }
        if (s) {
          s.quantity = qty;
          s.minQuantity = isNaN(minQ) ? 5 : minQ;
          s.updatedAt = new Date().toISOString();
        } else {
          fresh.stocks.push({
            id: uid(), productId: product.id, warehouseId: wid,
            quantity: qty, reservedQty: 0, minQuantity: isNaN(minQ) ? 5 : minQ,
            updatedAt: new Date().toISOString()
          });
        }
        saveDB(fresh);
        if (created) toast('کالا و موجودی ثبت شد', product.name, 'success');
        else toast('موجودی به‌روزرسانی شد', product.name, 'success');
        go('stock');
      } catch (err) {
        if (btn) btn.classList.remove('loading');
        toast('خطا', err.message || '', 'error');
      }
    }, 350);
  });

  renderKit();
  setTimeout(function () { pInput.focus(); }, 100);
}
