'use strict';

var K_DB   = 'alus_db_v1';
var K_SES  = 'alus_ses_v1';
var K_PREF = 'alus_pref_v1';
var K_ROUTE= 'alus_route_v1';

function emptyDB() {
  return { users: [], warehouses: [], products: [], stocks: [], transfers: [], adjustments: [] };
}

function migrateDB(d) {
  var changed = false;
  if (!d.adjustments) { d.adjustments = []; changed = true; }
  if (!d.users) { d.users = []; changed = true; }
  if (!d.warehouses) { d.warehouses = []; changed = true; }
  if (!d.products) { d.products = []; changed = true; }
  if (!d.stocks) { d.stocks = []; changed = true; }
  if (!d.transfers) { d.transfers = []; changed = true; }

  for (var i = 0; i < d.products.length; i++) {
    if (!d.products[i].components) { d.products[i].components = []; changed = true; }
    if (d.products[i].image === undefined) { d.products[i].image = ''; changed = true; }
  }

  for (var j = 0; j < d.warehouses.length; j++) {
    var w = d.warehouses[j];
    if (w.type === 'paint') {
      w.type = 'paint_in';
      if (!w.name || w.name === 'رنگ‌کاری') w.name = 'رنگ‌کاری داخلی';
      changed = true;
    }
  }

  for (var k = 0; k < d.stocks.length; k++) {
    if (d.stocks[k].minQuantity === undefined) { d.stocks[k].minQuantity = 5; changed = true; }
  }

  function ensure(type, name, order) {
    for (var x = 0; x < d.warehouses.length; x++) {
      if (d.warehouses[x].type === type) return;
    }
    d.warehouses.push({ id: uid(), name: name, type: type, isActive: true, order: order || 0 });
    changed = true;
  }
  ensure('central',         'انبار مرکزی', 1);
  ensure('paint_in',        'رنگ‌کاری داخلی', 2);
  ensure('paint_out',       'رنگ‌کاری بیرون', 3);
  ensure('upholstery',      'رویه‌کوبی', 4);
  ensure('store',           'فروشگاه', 5);
  ensure('showroom_khalij', 'نمایشگاه خلیج فارس', 6);
  ensure('showroom_alus',   'نمایشگاه الوس', 7);
  ensure('sold',            'کالای فروش‌رفته', 8);
  ensure('customer',        'مشتری', 9);

  var oldDefaults = { admin: 'admin', manager: 'manager', acc: 'acc', wh: 'wh' };
  for (var u = 0; u < d.users.length; u++) {
    if (oldDefaults[d.users[u].username] && d.users[u].password === oldDefaults[d.users[u].username]) {
      d.users[u].password = '1111';
      changed = true;
    }
  }
  return changed;
}

function loadDB() {
  var raw = null;
  try { raw = localStorage.getItem(K_DB); } catch (e) {}
  if (!raw) return emptyDB();
  try {
    var d = JSON.parse(raw);
    var changed = migrateDB(d);
    if (changed) {
      try { localStorage.setItem(K_DB, JSON.stringify(d)); } catch (e) {}
    }
    return d;
  } catch (e) {
    console.error('[loadDB]', e);
    return emptyDB();
  }
}

function saveDB(db) {
  try {
    localStorage.setItem(K_DB, JSON.stringify(db));
    return true;
  } catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
      if (typeof toast === 'function') toast('حافظه پر شد', 'حجم تصاویر کالاها را کم کنید', 'error');
    }
    console.error('[saveDB]', e);
    return false;
  }
}

/** Next sequence number for transfer/inbound codes. Uses max, not count — so deleting a code won't collide. */
function nextSeq(db, prefix) {
  var max = 0;
  for (var i = 0; i < db.transfers.length; i++) {
    var c = db.transfers[i] && db.transfers[i].code;
    if (c && c.indexOf(prefix) === 0) {
      var n = parseInt(c.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
}

function tcode(db) {
  var p = 'TR-' + ymd() + '-';
  return p + ('00' + nextSeq(db, p)).slice(-3);
}

function icode(db) {
  var p = 'IN-' + ymd() + '-';
  return p + ('00' + nextSeq(db, p)).slice(-3);
}

function seed() {
  var central  = { id: uid(), name: 'انبار مرکزی',            type: 'central',         isActive: true };
  var paintIn  = { id: uid(), name: 'رنگ‌کاری داخلی',        type: 'paint_in',        isActive: true };
  var paintOut = { id: uid(), name: 'رنگ‌کاری بیرون',         type: 'paint_out',       isActive: true };
  var uph      = { id: uid(), name: 'رویه‌کوبی',              type: 'upholstery',      isActive: true };
  var store    = { id: uid(), name: 'فروشگاه',                type: 'store',           isActive: true };
  var showK    = { id: uid(), name: 'نمایشگاه خلیج فارس',    type: 'showroom_khalij', isActive: true };
  var showA    = { id: uid(), name: 'نمایشگاه الوس',         type: 'showroom_alus',   isActive: true };
  var sold     = { id: uid(), name: 'کالای فروش‌رفته',       type: 'sold',            isActive: true };
  var customer = { id: uid(), name: 'مشتری',                  type: 'customer',        isActive: true };

  var users = [
    { id: uid(), name: 'راهبر سیستم', username: 'admin',   password: '1111', role: 'admin',             isActive: true },
    { id: uid(), name: 'مدیر',        username: 'manager', password: '1111', role: 'manager',           isActive: true },
    { id: uid(), name: 'حسابدار',     username: 'acc',     password: '1111', role: 'accountant',        isActive: true },
    { id: uid(), name: 'انباردار',    username: 'wh',      password: '1111', role: 'warehouse_officer', isActive: true }
  ];

  var p1 = {
    id: uid(), name: 'مبل مدل A', code: 'MB-A', unit: 'دست', image: '',
    components: [
      { id: uid(), name: 'مبل سه نفره', qty: 1 },
      { id: uid(), name: 'مبل یک نفره', qty: 2 },
      { id: uid(), name: 'میز جلو مبلی', qty: 1 }
    ],
    createdAt: new Date().toISOString()
  };
  var p2 = {
    id: uid(), name: 'مبل مدل B', code: 'MB-B', unit: 'سرویس', image: '',
    components: [
      { id: uid(), name: 'مبل سه نفره', qty: 1 },
      { id: uid(), name: 'مبل یک نفره', qty: 4 },
      { id: uid(), name: 'میز جلو مبلی', qty: 1 },
      { id: uid(), name: 'صندلی', qty: 2 }
    ],
    createdAt: new Date().toISOString()
  };
  var p3 = { id: uid(), name: 'مبل مدل C', code: 'MB-C', unit: 'عدد', image: '', components: [], createdAt: new Date().toISOString() };

  var now = new Date().toISOString();
  function st(pid, wid, q) {
    return { id: uid(), productId: pid, warehouseId: wid, quantity: q, reservedQty: 0, minQuantity: 5, updatedAt: now };
  }
  var stocks = [
    st(p1.id, central.id, 20), st(p1.id, paintIn.id, 12), st(p1.id, uph.id, 8), st(p1.id, showK.id, 3), st(p1.id, showA.id, 2),
    st(p2.id, central.id, 15), st(p2.id, paintOut.id, 6), st(p2.id, uph.id, 4), st(p2.id, store.id, 3), st(p2.id, sold.id, 1),
    st(p3.id, central.id, 30), st(p3.id, uph.id, 10), st(p3.id, store.id, 2)
  ];

  var transfers = [];
  for (var i = 0; i < 4; i++) {
    var d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * 7));
    var sts = ['pending_warehouse', 'pending_accountant', 'pending_manager', 'approved'];
    var status = sts[i % 4];
    var t = {
      id: uid(),
      code: 'TR-' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '-' + ('00' + (i + 1)).slice(-3),
      type: 'warehouse',
      sourceWarehouseId:      [central.id, paintIn.id, uph.id, central.id][i],
      destinationWarehouseId: [paintIn.id,  uph.id,     showK.id, paintOut.id][i],
      productId: [p1.id, p2.id, p3.id, p1.id][i],
      quantity: 2 + i,
      description: '',
      status: status,
      createdBy: users[3].id,
      createdByName: users[3].name,
      createdAt: d.toISOString()
    };
    if (status !== 'pending_warehouse') {
      t.warehouseApproval = { userId: users[3].id, userName: users[3].name, at: d.toISOString(), note: '' };
    }
    if (status === 'pending_manager' || status === 'approved') {
      t.accountantApproval = { userId: users[2].id, userName: users[2].name, at: d.toISOString(), note: '' };
    }
    if (status === 'approved') {
      t.managerApproval = { userId: users[1].id, userName: users[1].name, at: d.toISOString(), note: '' };
      t.completedAt = d.toISOString();
    }
    transfers.push(t);
  }

  var inb1 = {
    id: uid(),
    code: 'IN-' + ymd() + '-001',
    type: 'inbound',
    supplierName: 'چوب و مصنوعات پارس',
    invoiceNumber: 'INV-9841',
    productId: p1.id,
    quantity: 50,
    sourceWarehouseId: null,
    destinationWarehouseId: central.id,
    description: 'محموله کلاف خام',
    status: 'pending_warehouse',
    createdBy: users[3].id,
    createdByName: users[3].name,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  };
  transfers.unshift(inb1);

  return {
    warehouses: [central, paintIn, paintOut, uph, store, showK, showA, sold, customer],
    users: users,
    products: [p1, p2, p3],
    stocks: stocks,
    transfers: transfers,
    adjustments: []
  };
}
