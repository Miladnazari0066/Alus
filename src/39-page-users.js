'use strict';

var PAGE_LABELS = {
  dashboard: 'داشبورد',
  stock: 'موجودی',
  stockInit: 'مقداردهی',
  transfers: 'جابه‌جایی‌ها',
  inbounds: 'ورود کالا',
  reports: 'گزارش‌ها',
  newTransfer: 'ثبت درخواست',
  newInbound: 'ثبت ورود',
  directCustomer: 'ارسال به مشتری',
  products: 'مدیریت کالاها',
  users: 'مدیریت کاربران',
  settings: 'تنظیمات'
};

function pageUsers(page) {
  var db = loadDB();
  var canEdit = canManageUsers(App.user);
  var assignable = App.user.role === 'admin' ?
    ['warehouse_officer', 'accountant', 'manager', 'admin'] :
    ['warehouse_officer', 'accountant', 'manager'];
  var state = { sort: null, dir: null };

  var shieldIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';

  page.innerHTML = '<div class="page-head"><div><h1>کاربران</h1></div></div>' +
    (canEdit ?
      '<div class="widget" style="margin-bottom:16px;max-width:900px">' +
        '<form id="uf" class="form-grid">' +
          '<div class="field"><label>نام <span class="req">*</span></label>' +
            '<input id="un" required placeholder="محمد احمدی" /></div>' +
          '<div class="field"><label>نام کاربری <span class="req">*</span></label>' +
            '<input id="uu" required placeholder="m.ahmadi" style="font-family:monospace;direction:ltr;text-align:left" /></div>' +
          '<div class="field"><label>رمز <span class="req">*</span></label>' +
            '<input id="up" required type="password" /></div>' +
          '<div class="field"><label>نقش پیش‌فرض</label>' +
            '<select id="ur">' +
              assignable.map(function (r) { return '<option value="' + r + '">' + ROLES[r] + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="field" style="grid-column:1/-1;flex-direction:row;justify-content:flex-end">' +
            '<button type="submit" class="btn primary">' + IC.plus + ' افزودن</button>' +
          '</div>' +
        '</form>' +
      '</div>' : '') +
    '<div class="table-card">' +
      '<div class="table-toolbar">' +
        '<div class="w-title" style="font-size:13.5px"><div class="ic">' + IC.users + '</div>کاربران</div>' +
        '<span style="margin-right:auto;font-size:12px;color:var(--muted)">' +
          '<b style="color:var(--text-2)">' + db.users.filter(function (u) { return u.isActive; }).length + '</b> فعال · ' +
          db.users.length + ' کل' +
        '</span>' +
        '<span id="online-count-badge" style="font-size:12px;color:var(--green);display:flex;align-items:center;gap:4px;margin-right:12px">' +
          '<span style="width:7px;height:7px;border-radius:50%;background:var(--green);display:inline-block"></span>' +
          '<b id="online-count">0</b> آنلاین' +
        '</span>' +
      '</div>' +
      '<div class="table-scroll" id="u-table"></div>' +
    '</div>';

  function draw() {
    var rows = db.users.slice();
    if (state.sort && state.dir) {
      rows = sortRows(rows, state.sort, state.dir, function (r, k) {
        if (k === 'name')     return r.name;
        if (k === 'username') return r.username;
        if (k === 'role')     return ROLES[r.role] || '';
        if (k === 'status')   return r.isActive ? 1 : 0;
        return '';
      });
    }
    
    var online = (typeof getOnlineUsers === 'function') ? getOnlineUsers() : {};
    var onlineCountEl = document.getElementById('online-count');
    if (onlineCountEl) onlineCountEl.textContent = Object.keys(online).length;
    
    var ind = function (key) {
      return '<span class="sort-ind">' + (state.sort === key ? (state.dir === 'asc' ? '▲' : '▼') : '⇅') + '</span>';
    };
    var sa = function (key) {
      var c = 'data-sort="' + key + '"';
      if (state.sort === key) c += ' class="' + (state.dir === 'asc' ? 'sort-asc' : 'sort-desc') + '"';
      return c;
    };
    
    var table = '<table class="dt"><thead><tr><th>#</th>' +
      '<th ' + sa('name')     + '>کاربر ' + ind('name') + '</th>' +
      '<th ' + sa('username') + '>نام کاربری ' + ind('username') + '</th>' +
      '<th ' + sa('role')     + '>نقش ' + ind('role') + '</th>' +
      '<th ' + sa('status')   + '>وضعیت ' + ind('status') + '</th>' +
      '<th style="width:120px;text-align:left">عملیات</th></tr></thead><tbody>' +
      
      rows.map(function (u, i) {
        var isSelf = u.id === App.user.id;
        var editable = canEditUser(u);
        var isOnline = online.hasOwnProperty(u.id);
        var presence = online[u.id];
        
        // 👇 وضعیت آنلاین/آفلاین 👇
        var statusInfo;
        if (isOnline && presence) {
          var pageLabel = PAGE_LABELS[presence.page] || 'نامشخص';
          statusInfo = '<span style="color:var(--green);font-size:11px;display:flex;align-items:center;gap:4px;">' +
            '<span style="width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 4px var(--green);display:inline-block"></span>' +
            'آنلاین · ' + pageLabel +
          '</span>';
        } else if (u.lastSeen) {
          statusInfo = '<span style="color:var(--muted);font-size:11px;display:block">آخرین بازدید: ' + relTime(u.lastSeen) + '</span>';
        } else {
          statusInfo = '<span style="color:var(--muted);font-size:11px;display:block">آفلاین</span>';
        }
        
        var avatarExtra = isOnline ? '<span class="online-dot"></span>' : '';
        
        var roleCell = editable ?
          '<select class="role-select" data-role="' + u.id + '">' +
            assignable.map(function (r) { return '<option value="' + r + '" ' + (u.role === r ? 'selected' : '') + '>' + ROLES[r] + '</option>'; }).join('') +
          '</select>' :
          '<span class="role-badge ' + u.role + '">' + ROLES[u.role] + '</span>';
        
        var actionCell = isSelf ? '<span class="muted small">—</span>' :
          (editable ?
            '<div style="display:flex; gap:4px; justify-content:flex-end;">' +
              '<button type="button" class="btn xs ghost" data-perm="' + u.id + '" title="مدیریت دسترسی‌ها">' + shieldIcon + '</button>' +
              '<button type="button" class="btn xs ' + (u.isActive ? 'warn' : 'success') + '" data-tog="' + u.id + '">' +
                (u.isActive ? 'غیرفعال' : 'فعال') + '</button>' +
            '</div>' :
            '<span class="muted small">—</span>');
        
        return '<tr><td><span class="row-num">' + (i + 1) + '</span></td>' +
          '<td><div class="user-cell">' +
            '<div class="avatar-sm" style="position:relative">' + esc(initials(u.name)) + avatarExtra + '</div>' +
            '<div class="info">' +
              '<b>' + esc(u.name) + '</b>' +
              '<span>' + statusInfo + (isSelf ? ' · خودتان' : '') + '</span>' +
            '</div>' +
          '</div></td>' +
          '<td><span class="code-chip" style="direction:ltr;unicode-bidi:isolate;display:inline-block">' + esc(u.username) + '</span></td>' +
          '<td>' + roleCell + '</td>' +
          '<td>' + (u.isActive ?
            '<span class="status-pill on"><span class="dot"></span>فعال</span>' :
            '<span class="status-pill off"><span class="dot"></span>غیرفعال</span>') + '</td>' +
          '<td class="actions-cell">' + actionCell + '</td></tr>';
      }).join('') +
      '</tbody></table>';
    $('#u-table').innerHTML = table;

    $$('[data-sort]', $('#u-table')).forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.dataset.sort;
        if (state.sort !== k) { state.sort = k; state.dir = 'asc'; }
        else if (state.dir === 'asc') { state.dir = 'desc'; }
        else { state.sort = null; state.dir = null; }
        draw();
      });
    });
    
    $$('[data-tog]').forEach(function (b) {
      b.addEventListener('click', function () {
        var fresh = loadDB();
        var u = fresh.users.filter(function (x) { return x.id === b.dataset.tog; })[0];
        if (!u) return;
        if (!canEditUser(u)) { toast('دسترسی ندارید', '', 'error'); render(); return; }
        u.isActive = !u.isActive;
        saveDB(fresh);
        toast(u.isActive ? 'فعال' : 'غیرفعال', u.name, 'success');
        render();
      });
    });
    
    $$('[data-role]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var fresh = loadDB();
        var u = fresh.users.filter(function (x) { return x.id === sel.dataset.role; })[0];
        if (!u) return;
        if (!canEditUser(u)) { toast('دسترسی ندارید', '', 'error'); render(); return; }
        var nr = sel.value;
        if (!canAssignRole(nr)) { toast('دسترسی ندارید', 'نقش قابل تخصیص نیست', 'error'); render(); return; }
        u.role = nr;
        saveDB(fresh);
        toast('نقش تغییر کرد', u.name + ' → ' + ROLES[u.role], 'success');
        render();
      });
    });

    $$('[data-perm]').forEach(function(b) {
      b.addEventListener('click', function() {
        var uid = b.dataset.perm;
        var u = loadDB().users.filter(function(x) { return x.id === uid; })[0];
        if (!u) return;
        var checkboxesHTML = '';
        for (var key in ALL_PERMISSIONS) {
          var isChecked = hasPermission(u, key) ? 'checked' : '';
          checkboxesHTML += 
            '<label style="display:flex; align-items:center; gap:8px; padding:10px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border); cursor:pointer; margin-bottom:8px">' +
              '<input type="checkbox" class="perm-cb" data-key="' + key + '" ' + isChecked + ' style="width:16px; height:16px; cursor:pointer">' +
              '<span style="font-size:12.5px; font-weight:600; color:var(--text-2)">' + ALL_PERMISSIONS[key] + '</span>' +
            '</label>';
        }
        openModal({
          title: 'مدیریت دسترسی‌ها',
          desc: 'برای ' + u.name + ' (' + ROLES[u.role] + ')',
          body: '<div style="max-height:400px; overflow-y:auto; padding:4px">' + checkboxesHTML + '</div>',
          actions: [
            { label: 'بازگشت به پیش‌فرض', cls: 'danger', onClick: function(c) {
                var fresh = loadDB();
                var fu = fresh.users.filter(function(x){return x.id === uid;})[0];
                if (fu) { delete fu.permissions; saveDB(fresh); toast('بازنشانی شد', '', 'success'); c.remove(); render(); }
            }},
            { label: 'ذخیره تغییرات', cls: 'primary', onClick: function(c) {
                var fresh = loadDB();
                var fu = fresh.users.filter(function(x){return x.id === uid;})[0];
                if (!fu) return;
                fu.permissions = {};
                var cbs = c.querySelectorAll('.perm-cb');
                for (var i = 0; i < cbs.length; i++) {
                  fu.permissions[cbs[i].dataset.key] = cbs[i].checked;
                }
                saveDB(fresh);
                toast('ذخیره شد', 'دسترسی‌ها اعمال شد', 'success');
                c.remove();
                render();
            }}
          ]
        });
      });
    });
  }

  if (canEdit) {
    $('#uf').addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = $('#un').value.trim();
      var username = $('#uu').value.trim();
      var password = $('#up').value;
      var role = $('#ur').value;
      if (!name || !username || !password) return;
      if (!canAssignRole(role)) { toast('دسترسی ندارید', '', 'error'); return; }
      var fresh = loadDB();
      if (fresh.users.some(function (u) { return u.username === username; })) {
        toast('تکرار', 'این نام کاربری قبلاً ثبت شده', 'error');
        return;
      }
      var hashedPassword = await hashPassword(password);
      fresh.users.push({
        id: uid(), name: name, username: username, password: hashedPassword,
        role: role, isActive: true, permissions: {}, lastSeen: null
      });
      saveDB(fresh);
      toast('افزوده شد', name, 'success');
      render();
    });
  }
  
  // 👇 ثبت تابع draw برای آپدیت خودکار با تغییر Presence 👇
  window._usersDrawFn = draw;
  
  draw();
  attachRippleAll();
}