'use strict';

/** Shared transfer summary card used by dashboard, transfers, inbounds. */
function transferItemHTML(db, t) {
  var st = stOf(t);
  var isIn = t.type === 'inbound';
  var p = getProd(db, t.productId);
  var src = getWh(db, t.sourceWarehouseId);
  var dst = getWh(db, t.destinationWarehouseId);
  var stepsHTML = '';
  for (var i = 1; i <= 4; i++) {
    var cls = '';
    if (t.status === 'approved') {
      cls = 'done';
    } else if (t.status === 'rejected') {
      var rMap = { warehouse: 1, accountant: 2, manager: 3 };
      var rS = t.rejection ? rMap[t.rejection.stage] : 0;
      if (i < rS) cls = 'done';
      else if (i === rS) cls = 'rejected';
    } else {
      if (i < st.step) cls = 'done';
      else if (i === st.step) cls = 'active';
    }
    stepsHTML += '<div class="t-step ' + cls + '"></div>';
  }
  var route = isIn ?
    '<div class="t-route" style="color:#0369a1">' + IC.factory + ' ' + esc(t.supplierName || '—') + ' ' + IC.arrowL + ' ' + esc((dst && dst.name) || '—') + '</div>' :
    '<div class="t-route">' + esc((src && src.name) || '—') + ' ' + IC.arrowL + ' ' + esc((dst && dst.name) || '—') + '</div>';
  return '<div class="t-item" data-tid="' + t.id + '">' +
    '<div class="t-row1">' +
      '<span class="t-code" style="direction:ltr;unicode-bidi:isolate;display:inline-block">' + esc(t.code) + '</span>' +
      '<span class="badge ' + st.tone + '"><span class="dot"></span>' + st.label + '</span>' +
      (isIn ? '<span class="badge inbound">' + IC.inbound + ' ورود</span>' : '') +
      '<span class="small muted" style="margin-right:auto">' + relTime(t.createdAt) + '</span>' +
    '</div>' +
    '<div class="t-row2">' + route +
      '<span>' + esc((p && p.name) || '') + '</span>' +
      '<span class="t-qty">' + t.quantity + ' ' + esc((p && p.unit) || '') + '</span>' +
      '<div class="t-progress">' + stepsHTML + '</div>' +
    '</div>' +
  '</div>';
}

function pageStock(page) {
  var db = loadDB();
  var state = { wh: '', q: '', sort: null, dir: null, page: 1, perPage: 15 };
  var selectedStocks = {};

  var editIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

  page.innerHTML = '<div class="page-head"><div><h1>موجودی انبارها</h1>' +
    '<div class="sub">نمای کلی موجودی همه انبارها و نمایشگاه‌ها</div></div></div>' +
    '<div class="table-card">' +
      '<div class="table-toolbar">' +
        '<div class="search-input">' + IC.search + '<input id="s-q" placeholder="جستجو..." /></div>' +
        '<select class="chip" id="s-wh" style="height:40px;padding:0 36px 0 16px;appearance:none;' +
          'background-image:url(&quot;data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2.5\'><polyline points=\'6 9 12 15 18 9\'/></svg>&quot;);' +
          'background-repeat:no-repeat;background-position:left 14px center;background-size:12px;border-radius:100px">' +
          '<option value="">همه انبارها</option>' +
          db.warehouses.filter(function (w) { return w.type !== 'customer'; }).map(function (w) {
            return '<option value="' + w.id + '">' + esc(w.name) + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="table-scroll" id="s-table"></div>' +
      '<div id="s-pagination"></div>' +
    '</div>' +
    
    '<div class="bulk-bar" id="stock-bulk-bar" style="background:var(--g3); backdrop-filter:blur(24px); border-radius:100px; padding:10px 10px 10px 20px; box-shadow:0 20px 40px -10px rgba(0,0,0,.3)">' +
      '<span class="bulk-count" style="font-size:13.5px"><b id="stock-bulk-n" style="font-size:15px">0</b> مورد انتخاب شد</span>' +
      '<button type="button" class="btn danger sm hold-btn" id="stock-bulk-delete" style="height:40px; padding:0 18px; position:relative; overflow:hidden; border-radius:100px; width:120px;">' +
        '<span class="hold-progress"></span>' +
        '<span class="hold-text" id="bulk-del-txt" style="display:flex;align-items:center;gap:6px;font-weight:700;justify-content:center">حذف</span>' +
      '</button>' +
      '<button type="button" class="btn ghost sm" id="stock-bulk-clear" style="height:40px; width:40px; padding:0; border-radius:50%; justify-content:center">' + IC.close + '</button>' +
    '</div>';

  function buildRows() {
    return db.stocks.filter(function (s) {
      if (state.wh && s.warehouseId !== state.wh) return false;
      if (state.q) {
        var p = getProd(db, s.productId);
        if (!p) return false;
        var q = state.q.toLowerCase();
        if (p.name.toLowerCase().indexOf(q) < 0 && (p.code || '').toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    }).map(function (s) {
      return { s: s, p: getProd(db, s.productId), w: getWh(db, s.warehouseId) };
    }).filter(function (r) { return r.p && r.w && r.w.type !== 'customer'; });
  }

  function updateBulkBar() {
    var n = Object.keys(selectedStocks).filter(function(k) { return selectedStocks[k]; }).length;
    var bar = document.getElementById('stock-bulk-bar');
    if (!bar) return;
    document.getElementById('stock-bulk-n').textContent = n;
    if (n > 0) bar.classList.add('show');
    else bar.classList.remove('show');
  }

  function draw() {
    var allRows = buildRows();
    
    if (state.sort && state.dir) {
      allRows = sortRows(allRows, state.sort, state.dir, function (r, k) {
        if (k === 'name')     return r.p.name;
        if (k === 'wh')       return r.w.name;
        if (k === 'qty')      return r.s.quantity;
        if (k === 'reserved') return r.s.reservedQty || 0;
        if (k === 'avail')    return r.s.quantity - (r.s.reservedQty || 0);
        if (k === 'updated')  return r.s.updatedAt || '';
        return '';
      });
    }

    var totalPages = Math.ceil(allRows.length / state.perPage) || 1;
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    var startIndex = (state.page - 1) * state.perPage;
    var rows = allRows.slice(startIndex, startIndex + state.perPage);

    var tbl = $('#s-table');
    var pag = $('#s-pagination');

    if (!rows.length) {
      tbl.innerHTML = emptyState('موردی یافت نشد', 'فیلترها را تغییر دهید یا کالای جدیدی اضافه کنید');
      pag.innerHTML = '';
      updateBulkBar();
      return;
    }
    
    var sa = function (key) {
      var c = 'data-sort="' + key + '"';
      if (state.sort === key) c += ' class="' + (state.dir === 'asc' ? 'sort-asc' : 'sort-desc') + '"';
      return c;
    };
    var ind = function (key) {
      return '<span class="sort-ind">' + (state.sort === key ? (state.dir === 'asc' ? '▲' : '▼') : '⇅') + '</span>';
    };
    
    var allChecked = rows.length > 0 && rows.every(function(r) { return selectedStocks[r.s.id]; });
    
    tbl.innerHTML = '<table class="dt"><thead><tr>' +
      '<th style="width: 40px; text-align: center;"><input type="checkbox" id="select-all-stocks" style="cursor:pointer; width:16px; height:16px;" ' + (allChecked ? 'checked' : '') + '></th>' +
      '<th ' + sa('name')     + '>کالا ' + ind('name') + '</th>' +
      '<th ' + sa('wh')       + '>انبار ' + ind('wh') + '</th>' +
      '<th ' + sa('qty')      + ' style="text-align:left">موجودی ' + ind('qty') + '</th>' +
      '<th ' + sa('reserved') + ' style="text-align:left">رزرو ' + ind('reserved') + '</th>' +
      '<th ' + sa('avail')    + ' style="text-align:left">قابل استفاده ' + ind('avail') + '</th>' +
      '<th class="col-sm-hide" ' + sa('updated') + '>به‌روزرسانی ' + ind('updated') + '</th>' +
      '<th style="text-align:left; width:80px;">عملیات</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        var hasComp = r.p.components && r.p.components.length;
        var kitChip = hasComp ? '<span class="kit-chip" data-pid="' + r.p.id + '">' + IC.grid + ' ' + r.p.components.length + ' قلم</span>' : '';
        var minQ = r.s.minQuantity || 5;
        var isLow = r.s.quantity > 0 && r.s.quantity <= minQ;
        var rowCls = isLow ? ' class="row-low"' : '';
        var lowBadge = isLow ? ' <span class="low-stock-badge">' + IC.alert + ' کم</span>' : '';
        
        var imgHTML = r.p.image ?
          '<img class="img-thumb img-trigger" src="' + esc(r.p.image) + '" alt="" data-pid="' + r.p.id + '" data-wid="' + r.w.id + '">' :
          '<div class="img-thumb-placeholder">' + IC.package + '</div>';

        var isChecked = selectedStocks[r.s.id] ? 'checked' : '';

        return '<tr' + rowCls + ' data-row-id="' + r.s.id + '">' +
          '<td style="text-align: center;"><input type="checkbox" class="stock-checkbox" data-id="' + r.s.id + '" style="cursor:pointer; width:16px; height:16px;" ' + isChecked + '></td>' +
          '<td><div class="cell-product"><div class="img-wrap">' + imgHTML +
          '<div class="info"><b>' + esc(r.p.name) + '</b>' +
            '<div style="display:flex;gap:4px;margin-top:2px">' +
              (r.p.code ? '<span class="code-chip">' + esc(r.p.code) + '</span>' : '') +
              '<span class="unit-chip">' + esc(r.p.unit || '') + '</span>' +
              kitChip +
            '</div></div></div></div></td>' +
          '<td><div class="wh-cell"><span class="wh-dot" style="background:' + (WH_COLOR[r.w.type] || '#94a3b8') + '"></span>' + esc(r.w.name) + '</div></td>' +
          '<td class="num">' + r.s.quantity + ' <span class="unit">' + esc(r.p.unit || '') + '</span>' + lowBadge + '</td>' +
          '<td class="num muted">' + (r.s.reservedQty || 0) + '</td>' +
          '<td class="num"><span class="qty-hl">' + (r.s.quantity - (r.s.reservedQty || 0)) + '</span></td>' +
          '<td class="date-cell col-sm-hide">' + relTime(r.s.updatedAt) + '</td>' +
          '<td class="actions-cell">' +
            '<div style="display:flex;gap:4px;justify-content:flex-end">' +
              '<button type="button" class="btn xs ghost" data-edit="' + r.s.id + '" title="ویرایش">' + editIcon + '</button>' +
              '<button type="button" class="btn xs danger" data-del="' + r.s.id + '" title="حذف">' + IC.trash + '</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('') + '</tbody></table>';

    // رندر دکمه‌های صفحه‌بندی
    pag.innerHTML = '<div class="pagination-container">' +
      '<button type="button" class="btn xs ghost" id="pg-prev" ' + (state.page === 1 ? 'disabled' : '') + '>' + IC.chevR + ' قبلی</button>' +
      '<span class="pagination-info">صفحه ' + state.page + ' از ' + totalPages + '</span>' +
      '<button type="button" class="btn xs ghost" id="pg-next" ' + (state.page === totalPages ? 'disabled' : '') + '>بعدی ' + IC.chevL + '</button>' +
    '</div>';
    
    $('#pg-prev').addEventListener('click', function() { if (state.page > 1) { state.page--; draw(); } });
    $('#pg-next').addEventListener('click', function() { if (state.page < totalPages) { state.page++; draw(); } });

    $$('th[data-sort]', tbl).forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.dataset.sort;
        if (state.sort !== k) { state.sort = k; state.dir = 'asc'; }
        else if (state.dir === 'asc') { state.dir = 'desc'; }
        else { state.sort = null; state.dir = null; }
        state.page = 1;
        draw();
      });
    });

    var selectAllCb = document.getElementById('select-all-stocks');
    if (selectAllCb) {
      selectAllCb.addEventListener('change', function() {
        var checked = this.checked;
        rows.forEach(function(r) { selectedStocks[r.s.id] = checked; });
        draw();
      });
    }

    $$('.stock-checkbox', tbl).forEach(function(cb) {
      cb.addEventListener('change', function() {
        selectedStocks[this.dataset.id] = this.checked;
        updateBulkBar();
        var allCbs = $$('.stock-checkbox', tbl);
        var allChk = allCbs.length > 0 && allCbs.every(function(c) { return c.checked; });
        if (selectAllCb) selectAllCb.checked = allChk;
      });
    });

    // پاپ‌آپ عکس
    var pop = document.getElementById('global-img-pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'global-img-pop';
      pop.className = 'img-pop';
      document.body.appendChild(pop);
    }

    function showPopover(imgEl) {
      var pid = imgEl.dataset.pid;
      var wid = imgEl.dataset.wid;
      var p = getProd(db, pid);
      var w = getWh(db, wid);
      var s = findStock(db, pid, wid);
      if (!p || !w) return;
      
      pop.innerHTML = 
        '<img src="' + imgEl.src + '" alt="">' +
        '<div class="info">' +
          '<b>' + esc(p.name) + '</b>' +
          '<small>کد: ' + esc(p.code || '—') + '</small>' +
          '<div class="wh-badge">' + esc(w.name) + ' · موجودی: ' + (s ? s.quantity : 0) + ' ' + esc(p.unit) + '</div>' +
        '</div>';

      var rect = imgEl.getBoundingClientRect();
      var isMobile = window.innerWidth <= 900;
      pop.classList.add('show');
      var popRect = pop.getBoundingClientRect();
      
      var top, left;
      if (isMobile) {
        top = rect.bottom + 10;
        left = (window.innerWidth - popRect.width) / 2;
        if (top + popRect.height > window.innerHeight) top = rect.top - popRect.height - 10;
      } else {
        top = rect.top;
        left = rect.left + rect.width + 12;
        if (left + popRect.width > window.innerWidth) left = rect.left - popRect.width - 12;
        if (top + popRect.height > window.innerHeight) top = window.innerHeight - popRect.height - 12;
      }
      if (top < 10) top = 10;

      pop.style.top = top + 'px';
      pop.style.left = left + 'px';
    }

    function hidePopover() { pop.classList.remove('show'); }

    $$('.img-trigger', tbl).forEach(function(img) {
      img.addEventListener('mouseenter', function() { if (window.innerWidth > 900) showPopover(img); });
      img.addEventListener('mouseleave', function() { if (window.innerWidth > 900) hidePopover(); });
      img.addEventListener('click', function(e) { e.stopPropagation(); showPopover(img); });
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.img-trigger') && !e.target.closest('.img-pop')) hidePopover();
    });

    // فرم ویرایش
    $$('[data-edit]', tbl).forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var sid = btn.dataset.edit;
        var stock = db.stocks.filter(function(s){return s.id === sid;})[0];
        if (!stock) return;
        var prod = getProd(db, stock.productId);
        var wh = getWh(db, stock.warehouseId);
        
        var editCurrentImage = prod.image || '';
        
        openModal({
          title: 'ویرایش کالا و موجودی',
          desc: 'تغییر تمام مشخصات کالا و موجودی در این انبار',
          body: 
            '<div class="form-grid" style="gap:14px">' +
              '<div class="full" style="display:flex; gap:14px; align-items:flex-start; padding:12px; background:var(--surface-2); border-radius:16px; border:1px dashed var(--border-2)">' +
                '<div id="edit-img-preview" style="width:64px; height:64px; border-radius:12px; background:var(--surface); display:grid; place-items:center; color:var(--muted); border:1px solid var(--border); flex-shrink:0; overflow:hidden">' + 
                  (editCurrentImage ? '<img src="'+esc(editCurrentImage)+'" style="width:100%;height:100%;object-fit:cover">' : IC.image) + 
                '</div>' +
                '<div style="flex:1">' +
                  '<div style="font-size:12.5px; font-weight:700; margin-bottom:6px">تصویر کالا</div>' +
                  '<button type="button" class="btn ghost sm" id="edit-img-btn">' + IC.upload + ' انتخاب تصویر</button>' +
                  '<input type="file" id="edit-img-input" accept="image/*" style="display:none">' +
                '</div>' +
              '</div>' +
              
              '<div class="field"><label>نام کالا <span class="req">*</span></label><input id="edit-name" value="' + esc(prod.name) + '" /></div>' +
              '<div class="field"><label>کد کالا</label><input id="edit-code" value="' + esc(prod.code || '') + '" /></div>' +
              '<div class="field"><label>واحد شمارش</label><select id="edit-unit">' + 
                UNITS.map(function(u) { return '<option value="'+u+'" '+(prod.unit === u ? 'selected' : '')+'>'+u+'</option>'; }).join('') + 
              '</select></div>' +
              
              '<div class="field"><label>تعداد موجودی <span class="req">*</span></label><input id="edit-qty" type="number" min="0" value="' + stock.quantity + '" style="font-weight:800;font-size:16px;color:var(--blue)" /></div>' +
              '<div class="field"><label>حد هشدار (کم‌موجودی)</label><input id="edit-min" type="number" min="0" value="' + (stock.minQuantity || 5) + '" /></div>' +
            '</div>' +
            
            '<div style="margin-top:16px;padding:12px 14px;background:rgba(255,149,0,.1);border:1px solid rgba(255,149,0,.24);border-radius:12px;font-size:12px;color:#b45309;display:flex;align-items:flex-start;gap:8px">' +
              '<div style="flex-shrink:0;margin-top:2px">' + IC.alert.replace('width="24"', 'width="16"').replace('height="24"', 'height="16"') + '</div>' +
              '<div>تعداد موجودی نباید کمتر از مقدار رزرو شده (<b>' + (stock.reservedQty || 0) + ' ' + esc(prod.unit) + '</b>) باشد.</div>' +
            '</div>',
          actions: [
            { label: 'انصراف', cls: 'ghost', onClick: function(c) { c.remove(); } },
            { label: IC.check + ' ذخیره تغییرات', cls: 'primary', onClick: function(c) {
                var newName = document.getElementById('edit-name').value.trim();
                var newCode = document.getElementById('edit-code').value.trim();
                var newUnit = document.getElementById('edit-unit').value;
                var newQty = parseInt(document.getElementById('edit-qty').value, 10);
                var newMin = parseInt(document.getElementById('edit-min').value, 10);
                
                if (!newName) { toast('نام الزامی است', '', 'error'); return; }
                if (isNaN(newQty) || newQty < (stock.reservedQty || 0)) {
                  toast('مقدار نامعتبر', 'تعداد نمی‌تواند کمتر از رزرو باشد', 'error');
                  return;
                }
                
                var fresh = loadDB();
                var fp = fresh.products.filter(function(p){return p.id === prod.id;})[0];
                if (fp) {
                  fp.name = newName;
                  fp.code = newCode;
                  fp.unit = newUnit;
                  fp.image = editCurrentImage;
                }
                
                var fs = fresh.stocks.filter(function(s){return s.id === sid;})[0];
                if (fs) {
                  fs.quantity = newQty;
                  fs.minQuantity = isNaN(newMin) ? 5 : newMin;
                  fs.updatedAt = new Date().toISOString();
                }
                
                saveDB(fresh);
                toast('ویرایش شد', 'تغییرات با موفقیت ذخیره شد', 'success');
                c.remove();
                go('stock');
            }}
          ]
        });
        
        setTimeout(function() {
          var imgBtn = document.getElementById('edit-img-btn');
          var imgInput = document.getElementById('edit-img-input');
          var imgPreview = document.getElementById('edit-img-preview');
          
          if (imgBtn && imgInput) {
            imgBtn.addEventListener('click', function() { imgInput.click(); });
            imgInput.addEventListener('change', function(e) {
              var f = e.target.files && e.target.files[0];
              if (!f) return;
              if (f.size > 4 * 1024 * 1024) { toast('حجم زیاد', 'حداکثر ۴ مگابایت', 'error'); return; }
              
              imgBtn.classList.add('loading');
              imgBtn.textContent = 'در حال آپلود...';
              
              compressImage(f, 400, 0.75).then(function(dataUrl) {
                var arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
                while(n--){ u8arr[n] = bstr.charCodeAt(n); }
                var blob = new Blob([u8arr], {type:mime});
                
                uploadImageToCloud(blob).then(function(publicUrl) {
                  editCurrentImage = publicUrl;
                  imgPreview.innerHTML = '<img src="'+esc(publicUrl)+'" style="width:100%;height:100%;object-fit:cover">';
                  toast('آپلود موفق', 'تصویر جدید ذخیره شد', 'success');
                }).catch(function(err) {
                  toast('خطای آپلود', err.message || '', 'error');
                }).finally(function() {
                  imgBtn.classList.remove('loading');
                  imgBtn.innerHTML = IC.upload + ' انتخاب تصویر';
                });
              }).catch(function(err) {
                imgBtn.classList.remove('loading');
                imgBtn.innerHTML = IC.upload + ' انتخاب تصویر';
                toast('خطا', err.message || '', 'error');
              });
              e.target.value = '';
            });
          }
        }, 100);
      });
    });

    $$('[data-del]', tbl).forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var sid = btn.dataset.del;
        deleteStocks([sid]);
      });
    });
  }

  function deleteStocks(ids) {
    openModal({
      title: 'حذف موجودی',
      desc: 'آیا از حذف ' + (ids.length > 1 ? ids.length + ' مورد' : 'این مورد') + ' مطمئن هستید؟',
      body: '<div style="padding:12px 14px;background:rgba(255,59,48,.1);border-radius:14px;font-size:12.5px;color:#b91c1c">' + IC.alert + ' با این کار ردیف موجودی از این انبار حذف می‌شود (کالا از بخش کالاها حذف نمی‌شود).</div>',
      actions: [
        { label: 'انصراف', cls: 'ghost', onClick: function(c) { c.remove(); } },
        { label: IC.trash + ' بله، حذف کن', cls: 'danger', onClick: function(c) {
            var fresh = loadDB();
            var backup = fresh.stocks.filter(function(s) { return ids.indexOf(s.id) >= 0; });
            fresh.stocks = fresh.stocks.filter(function(s) { return ids.indexOf(s.id) < 0; });
            saveDB(fresh);
            c.remove();
            selectedStocks = {};
            showUndoToast(ids.length + ' ردیف موجودی حذف شد', function() {
              var f2 = loadDB();
              f2.stocks = f2.stocks.concat(backup);
              saveDB(f2);
              toast('بازگردانی شد', 'موجودی‌ها بازگشتند', 'success');
              go('stock');
            }, 5000);
            go('stock');
        }}
      ]
    });
  }

  function executeDirectDelete(ids) {
    var fresh = loadDB();
    var backup = fresh.stocks.filter(function(s) { return ids.indexOf(s.id) >= 0; });
    fresh.stocks = fresh.stocks.filter(function(s) { return ids.indexOf(s.id) < 0; });
    saveDB(fresh);
    selectedStocks = {};
    
    showUndoToast(ids.length + ' ردیف موجودی حذف شد', function() {
      var f2 = loadDB();
      f2.stocks = f2.stocks.concat(backup);
      saveDB(f2);
      toast('بازگردانی شد', 'موجودی‌ها بازگشتند', 'success');
      go('stock');
    }, 5000);
    
    go('stock');
  }

  $('#s-q').addEventListener('input', function (e) { 
    state.q = e.target.value.trim(); 
    state.page = 1;
    draw(); 
  });
  $('#s-wh').addEventListener('change', function (e) { 
    state.wh = e.target.value; 
    state.page = 1;
    draw(); 
  });

  document.getElementById('stock-bulk-clear').addEventListener('click', function(e) {
    e.stopPropagation();
    selectedStocks = {};
    draw();
  });

  var delBtn = document.getElementById('stock-bulk-delete');
  var delTxt = document.getElementById('bulk-del-txt');
  var holdTimer = null, holdInterval = null, holdProgress = 0;
  var holdDuration = 3000;
  var progressBar = delBtn.querySelector('.hold-progress');

  function startHold(e) {
    e.preventDefault();
    holdProgress = 0;
    progressBar.style.width = '0%';
    
    delTxt.textContent = 'نگه دارید...';
    toast('برای تایید حذف، ۳ ثانیه نگه دارید', '', 'info');

    holdInterval = setInterval(function() {
      holdProgress += 50;
      var pct = (holdProgress / holdDuration) * 100;
      if (pct > 100) pct = 100;
      progressBar.style.width = pct + '%';
    }, 50);
    
    holdTimer = setTimeout(function() {
      clearInterval(holdInterval);
      progressBar.style.width = '0%';
      delTxt.textContent = 'حذف';
      
      var ids = Object.keys(selectedStocks).filter(function(k) { return selectedStocks[k]; });
      if (ids.length > 0) {
        executeDirectDelete(ids);
      }
    }, holdDuration);
  }

  function cancelHold() {
    if (holdTimer) clearTimeout(holdTimer);
    if (holdInterval) clearInterval(holdInterval);
    progressBar.style.width = '0%';
    delTxt.textContent = 'حذف';
  }

  delBtn.addEventListener('mousedown', startHold);
  delBtn.addEventListener('touchstart', startHold, { passive: false });
  delBtn.addEventListener('mouseup', cancelHold);
  delBtn.addEventListener('mouseleave', cancelHold);
  delBtn.addEventListener('touchend', cancelHold);
  delBtn.addEventListener('touchcancel', cancelHold);

  draw();
}