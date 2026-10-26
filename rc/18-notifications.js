'use strict';

function requestNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
  try { Notification.requestPermission(); } catch (e) {}
}

function notifyBrowser(title, body, tag) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;
  try { new Notification(title, { body: body, tag: tag }); } catch (e) {}
}

function getActivityTime(t) {
  if (t.status === 'approved') return t.completedAt || t.createdAt;
  if (t.status === 'rejected' && t.rejection) return t.rejection.at || t.createdAt;
  return t.createdAt;
}

function groupItemsByDate(items, getDate) {
  var groups = { today: [], yesterday: [], week: [], older: [] };
  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  var weekStart = new Date(todayStart);      weekStart.setDate(weekStart.getDate() - 7);
  items.forEach(function (it) {
    var dt = getDate(it);
    var d = new Date(dt);
    if (isNaN(d.getTime())) d = new Date();
    if (d >= todayStart)          groups.today.push(it);
    else if (d >= yesterdayStart) groups.yesterday.push(it);
    else if (d >= weekStart)      groups.week.push(it);
    else                          groups.older.push(it);
  });
  return [
    { key: 'today',     label: 'امروز',        items: groups.today },
    { key: 'yesterday', label: 'دیروز',        items: groups.yesterday },
    { key: 'week',      label: 'این هفته',     items: groups.week },
    { key: 'older',     label: 'قدیمی‌تر',     items: groups.older }
  ].filter(function (g) { return g.items.length > 0; });
}

function openNotif() {
  closeNotif();
  var db = loadDB();
  var pending = db.transfers.filter(function (t) {
    return t && typeof t.status === 'string' && t.status.indexOf('pending') === 0;
  }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  var activity = db.transfers.filter(function (t) {
    return t && (t.status === 'approved' || t.status === 'rejected');
  }).sort(function (a, b) {
    return new Date(getActivityTime(b)) - new Date(getActivityTime(a));
  }).slice(0, 40);
  var lowStock = lowStockItems(db);
  var notifPerm = ('Notification' in window) ? Notification.permission : 'unsupported';

  var bd = document.createElement('div');
  bd.className = 'notif-bd';
  var panel = document.createElement('div');
  panel.className = 'notif-panel';
  var totalPending = pending.length + lowStock.length;
  var badge = totalPending > 9 ? '9+' : String(totalPending);
  var permBanner = '';
  if (notifPerm === 'default') {
    permBanner = '<div class="notif-perm-banner"><div class="npb-ic">' + IC.bellRing + '</div>' +
      '<div class="npb-text"><b>اعلان مرورگر فعال نیست</b>می‌خواهید از تغییرات مهم باخبر شوید؟</div>' +
      '<button type="button" class="btn primary" id="notif-perm-btn">فعال کن</button></div>';
  }
  panel.innerHTML =
    '<div class="notif-head">' +
      '<div class="notif-head-icon">' + IC.bell + (totalPending ? '<span class="notif-head-badge">' + badge + '</span>' : '') + '</div>' +
      '<div class="notif-head-titles">' +
        '<div class="notif-head-title">اعلان‌ها</div>' +
        '<div class="notif-head-sub"></div>' +
      '</div>' +
      '<button type="button" class="notif-close" title="بستن" aria-label="بستن">' + IC.close + '</button>' +
    '</div>' +
    permBanner +
    '<div class="notif-tabs" role="tablist">' +
      '<button type="button" class="notif-tab ' + (pending.length ? 'active' : (lowStock.length ? '' : 'active')) + '" data-tab="pending" role="tab">' + IC.clock + 'تأیید' + (pending.length ? '<span class="notif-tab-count">' + pending.length + '</span>' : '') + '</button>' +
      '<button type="button" class="notif-tab" data-tab="low" role="tab">' + IC.alert + 'کم‌موجود' + (lowStock.length ? '<span class="notif-tab-count">' + lowStock.length + '</span>' : '') + '</button>' +
      '<button type="button" class="notif-tab" data-tab="activity" role="tab">' + IC.fire + 'تغییرات' + (activity.length ? '<span class="notif-tab-count">' + activity.length + '</span>' : '') + '</button>' +
    '</div>' +
    '<div class="notif-body"></div>';

  document.body.appendChild(bd);
  document.body.appendChild(panel);
  var body = panel.querySelector('.notif-body');
  var sub = panel.querySelector('.notif-head-sub');
  var tab = pending.length ? 'pending' : (lowStock.length ? 'low' : 'activity');

  function setActiveTab() {
    $$('.notif-tab', panel).forEach(function (t) { t.classList.toggle('active', t.dataset.tab === tab); });
  }

  function renderTab() {
    setActiveTab();
    if (tab === 'pending') {
      sub.innerHTML = pending.length ? IC.clock + ' <b>' + pending.length + '</b> درخواست در انتظار' : IC.check + ' درخواستی در انتظار نیست';
      body.innerHTML = renderPending(pending, db);
    } else if (tab === 'low') {
      sub.innerHTML = lowStock.length ? IC.alert + ' <b>' + lowStock.length + '</b> قلم در آستانه اتمام' : IC.check + ' موجودی همه کالاها کافی است';
      body.innerHTML = renderLowStock(lowStock, db);
    } else {
      sub.innerHTML = activity.length ? IC.fire + ' <b>' + activity.length + '</b> تغییر اخیر' : IC.inbox + ' هنوز تغییری ثبت نشده';
      body.innerHTML = renderActivity(activity, db);
    }
    body.scrollTop = 0;
    bindNotif(panel);
  }

  $$('.notif-tab', panel).forEach(function (t) {
    t.addEventListener('click', function () { tab = t.dataset.tab; renderTab(); });
  });

  var nx = panel.querySelector('.notif-close');
  if (nx) nx.addEventListener('click', closeNotif);
  var permBtn = panel.querySelector('#notif-perm-btn');
  if (permBtn) {
    permBtn.addEventListener('click', function () {
      requestNotifPermission();
      var b = panel.querySelector('.notif-perm-banner');
      if (b) b.remove();
    });
  }
  bd.addEventListener('click', closeNotif);
  renderTab();
  attachRippleAll(panel);
}

function closeNotif() {
  $$('.notif-bd').forEach(function (bd) {
    bd.style.animation = 'fadeOut .2s forwards';
    setTimeout(function () { if (bd.parentNode) bd.remove(); }, 200);
  });
  $$('.notif-panel').forEach(function (p) {
    p.style.animation = 'notifOut .3s forwards';
    setTimeout(function () { if (p.parentNode) p.remove(); }, 280);
  });
}

function renderPending(pending, db) {
  if (!pending.length) {
    return '<div class="notif-empty"><div class="notif-empty-art">' + IC.check + '</div>' +
      '<b>همه‌چیز مرتب است</b><p>درخواستی در انتظار تأیید شما وجود ندارد</p></div>';
  }
  var groups = groupItemsByDate(pending, function (t) { return t.createdAt; });
  return groups.map(function (g) {
    return '<div class="notif-group"><div class="notif-group-label">' + g.label +
      '<span class="notif-group-count">' + g.items.length + '</span></div>' +
      g.items.map(function (t) { return pendingCardHTML(t, db); }).join('') + '</div>';
  }).join('');
}

function pendingCardHTML(t, db) {
  var p = getProd(db, t.productId);
  var st = stOf(t);
  var can = canApprove(App.user, t);
  var isIn = t.type === 'inbound';
  var stageClass = t.status === 'pending_warehouse' ? 'stage-1' : t.status === 'pending_accountant' ? 'stage-2' : 'stage-3';
  var stageLabel = t.status === 'pending_warehouse' ? 'مرحله ۱ · انباردار' :
                   t.status === 'pending_accountant' ? 'مرحله ۲ · حسابدار' : 'مرحله ۳ · مدیر';

  var routeHTML;
  if (isIn) {
    var dst = getWh(db, t.destinationWarehouseId);
    routeHTML = '<div class="notif-route">' +
      '<span class="notif-route-chip" style="background:rgba(14,165,233,.08);color:#0369a1;border-color:rgba(14,165,233,.2)">' + IC.factory + ' ' + esc(t.supplierName || 'تأمین‌کننده') + '</span>' +
      '<span class="notif-route-arrow">' + IC.arrowL + '</span>' +
      '<span class="notif-route-chip"><span class="notif-route-dot" style="background:' + (WH_COLOR[dst && dst.type] || '#007AFF') + '"></span>' + esc((dst && dst.name) || '—') + '</span>' +
    '</div>';
  } else {
    var src = getWh(db, t.sourceWarehouseId);
    var dst2 = getWh(db, t.destinationWarehouseId);
    routeHTML = '<div class="notif-route">' +
      '<span class="notif-route-chip"><span class="notif-route-dot" style="background:' + (WH_COLOR[src && src.type] || '#94a3b8') + '"></span>' + esc((src && src.name) || '—') + '</span>' +
      '<span class="notif-route-arrow">' + IC.arrowL + '</span>' +
      '<span class="notif-route-chip"><span class="notif-route-dot" style="background:' + (WH_COLOR[dst2 && dst2.type] || '#94a3b8') + '"></span>' + esc((dst2 && dst2.name) || '—') + '</span>' +
    '</div>';
  }

  var stepNum = st.step;
  var stepsHTML = '<div class="notif-steps">';
  for (var i = 1; i <= 4; i++) {
    stepsHTML += '<div class="notif-step ' + (i < stepNum ? 'done' : i === stepNum ? 'active' : '') + '"></div>';
  }
  stepsHTML += '</div>';

  var actionsHTML = '<div class="notif-actions">';
  if (can) {
    actionsHTML += '<button type="button" class="notif-btn approve" data-approve="' + t.id + '">' + IC.check + ' تأیید</button>';
    actionsHTML += '<button type="button" class="notif-btn reject" data-reject="' + t.id + '">' + IC.x + ' رد</button>';
  } else {
    actionsHTML += '<span class="notif-no-action">' + IC.info + ' این مرحله مربوط به نقش شما نیست</span>';
  }
  actionsHTML += '<button type="button" class="notif-btn ghost detail" data-open="' + t.id + '">جزئیات ' + IC.chevL + '</button>';
  actionsHTML += '</div>';

  return '<div class="notif-card pending ' + t.status + (isIn ? ' inbound' : '') + '">' +
    '<div class="notif-card-head">' +
      '<div class="notif-card-head-left">' +
        '<span class="notif-stage-badge ' + stageClass + '"><span class="notif-stage-dot"></span>' + stageLabel + '</span>' +
        (isIn ? '<span class="notif-type-badge">' + IC.inbound + ' ورود</span>' : '') +
      '</div>' +
      '<span class="notif-card-time">' + relTime(t.createdAt) + '</span>' +
    '</div>' +
    '<div class="notif-card-title"><b>' + esc((p && p.name) || 'نامشخص') + '</b>' +
      '<span class="notif-qty-badge">' + t.quantity + ' <span class="notif-qty-unit">' + esc((p && p.unit) || '') + '</span></span>' +
    '</div>' +
    routeHTML + stepsHTML +
    '<div class="notif-meta-row">' +
      '<span class="notif-meta-item">' + IC.user + '<b>' + esc(t.createdByName || '—') + '</b></span>' +
      '<span class="notif-meta-item">' + IC.clock + faDate(t.createdAt) + '</span>' +
    '</div>' +
    (t.description ? '<div class="notif-desc">' + esc(t.description) + '</div>' : '') +
    actionsHTML +
  '</div>';
}

function renderLowStock(lowStock, db) {
  if (!lowStock.length) {
    return '<div class="notif-empty"><div class="notif-empty-art" style="background:linear-gradient(135deg,rgba(0,122,255,.10),rgba(88,86,214,.06));color:var(--blue);border-color:rgba(0,122,255,.2)">' + IC.check + '</div>' +
      '<b>موجودی همه کالاها کافی است</b><p>هیچ کالایی به آستانه اتمام نرسیده</p></div>';
  }
  return lowStock.map(function (it) {
    return '<div class="notif-low-item">' +
      '<div class="nli-ic">' + IC.alert + '</div>' +
      '<div class="nli-body"><div class="nli-title">' + esc(it.product.name) + '</div>' +
        '<div class="nli-meta">' + esc(it.warehouse.name) + ' · آستانه: ' + it.stock.minQuantity + '</div></div>' +
      '<div class="nli-qty">' + it.stock.quantity + ' ' + esc(it.product.unit || '') + '</div>' +
    '</div>';
  }).join('');
}

function renderActivity(activity, db) {
  if (!activity.length) {
    return '<div class="notif-empty"><div class="notif-empty-art">' + IC.inbox + '</div>' +
      '<b>تغییری ثبت نشده</b><p>پس از تأیید یا رد اولین درخواست، اینجا نمایش داده می‌شود</p></div>';
  }
  var groups = groupItemsByDate(activity, getActivityTime);
  return groups.map(function (g) {
    return '<div class="notif-group"><div class="notif-group-label">' + g.label +
      '<span class="notif-group-count">' + g.items.length + '</span></div>' +
      g.items.map(function (t) { return activityCardHTML(t, db); }).join('') + '</div>';
  }).join('');
}

function activityCardHTML(t, db) {
  var p = getProd(db, t.productId);
  var ok = t.status === 'approved';
  var isIn = t.type === 'inbound';
  var actor = ok ? ((t.managerApproval && t.managerApproval.userName) || '—') : ((t.rejection && t.rejection.userName) || '—');
  var when = ok ? t.completedAt : (t.rejection && t.rejection.at);
  var txt = ok ? (isIn ? 'ثبت ورود' : 'تأیید نهایی') : 'رد شد';
  var dotClass = isIn && ok ? 'in' : (ok ? 'ok' : 'no');
  var actionClass = dotClass;
  var icon = isIn ? IC.inbound : (ok ? IC.check : IC.x);
  return '<div class="notif-card activity ' + (ok ? 'ok' : 'no') + '" data-nid="' + t.id + '">' +
    '<div class="notif-timeline-wrap">' +
      '<div class="notif-timeline-dot ' + dotClass + '">' + icon + '</div>' +
      '<div class="notif-timeline-line"></div>' +
    '</div>' +
    '<div class="notif-activity-body">' +
      '<div class="notif-activity-title"><b>' + esc((p && p.name) || '—') + '</b>' +
        '<span class="notif-qty-badge">' + t.quantity + ' <span class="notif-qty-unit">' + esc((p && p.unit) || '') + '</span></span>' +
      '</div>' +
      '<div class="notif-activity-meta">' +
        '<span class="notif-activity-action ' + actionClass + '">' + txt + '</span>' +
        '<span class="notif-meta-item">' + IC.user + '<b>' + esc(actor) + '</b></span>' +
        '<span class="notif-meta-item">' + IC.clock + relTime(when) + '</span>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function bindNotif(panel) {
  $$('[data-approve]', panel).forEach(function (b) {
    b.addEventListener('click', function (e) { e.stopPropagation(); doApprove(b.dataset.approve); });
  });
  $$('[data-reject]', panel).forEach(function (b) {
    b.addEventListener('click', function (e) { e.stopPropagation(); doReject(b.dataset.reject); });
  });
  $$('[data-open]', panel).forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var id = b.dataset.open;
      closeNotif();
      setTimeout(function () { openTransfer(id); }, 250);
    });
  });
  $$('.notif-card.activity[data-nid]', panel).forEach(function (card) {
    card.addEventListener('click', function () {
      var id = card.dataset.nid;
      closeNotif();
      setTimeout(function () { openTransfer(id); }, 250);
    });
  });
}
