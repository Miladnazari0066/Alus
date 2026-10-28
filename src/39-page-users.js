'use strict';

function pageUsers(page) {
  var db = loadDB();
  var canEdit = canManageUsers(App.user);
  var assignable = App.user.role === 'admin' ?
    ['warehouse_officer', 'accountant', 'manager', 'admin'] :
    ['warehouse_officer', 'accountant', 'manager'];
  var state = { sort: null, dir: null };

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
          '<div class="field"><label>نقش</label>' +
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
      '<th></th></tr></thead><tbody>' +
      rows.map(function (u, i) {
        var isSelf = u.id === App.user.id;
        var editable = canEditUser(u);
        var roleCell = editable ?
          '<select class="role-select" data-role="' + u.id + '">' +
            assignable.map(function (r) { return '<option value="' + r + '" ' + (u.role === r ? 'selected' : '') + '>' + ROLES[r] + '</option>'; }).join('') +
          '</select>' :
          '<span class="role-badge ' + u.role + '">' + ROLES[u.role] + '</span>';
        var actionCell = isSelf ? '<span class="muted small">—</span>' :
          (editable ?
            '<button type="button" class="btn xs ' + (u.isActive ? 'warn' : 'success') + '" data-tog="' + u.id + '">' +
              (u.isActive ? 'غیرفعال' : 'فعال') + '</button>' :
            '<span class="muted small">—</span>');
        return '<tr><td><span class="row-num">' + (i + 1) + '</span></td>' +
          '<td><div class="user-cell"><div class="avatar-sm">' + esc(initials(u.name)) + '</div>' +
            '<div class="info"><b>' + esc(u.name) + '</b><span>' + (isSelf ? 'خودتان' : '') + '</span></div></div></td>' +
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
        role: role, isActive: true
      });
      saveDB(fresh);
      toast('افزوده شد', name, 'success');
      render();
    });
  }
  draw();
  attachRippleAll();
}