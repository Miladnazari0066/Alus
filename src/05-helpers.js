'use strict';

function findStock(db, pid, wid) {
  for (var i = 0; i < db.stocks.length; i++) {
    if (db.stocks[i].productId === pid && db.stocks[i].warehouseId === wid) return db.stocks[i];
  }
  return null;
}

function getWh(db, id) {
  for (var i = 0; i < db.warehouses.length; i++) if (db.warehouses[i].id === id) return db.warehouses[i];
  return null;
}

function getProd(db, id) {
  for (var i = 0; i < db.products.length; i++) if (db.products[i].id === id) return db.products[i];
  return null;
}

function whByType(db, type) {
  for (var i = 0; i < db.warehouses.length; i++) if (db.warehouses[i].type === type) return db.warehouses[i];
  return null;
}

function findProductByName(db, name) {
  var n = (name || '').trim().toLowerCase();
  if (!n) return null;
  for (var i = 0; i < db.products.length; i++) {
    if ((db.products[i].name || '').trim().toLowerCase() === n) return db.products[i];
  }
  return null;
}

/** Returns all stocks whose quantity has hit the low-stock threshold. */
function lowStockItems(db) {
  var out = [];
  db.stocks.forEach(function (s) {
    if (s.quantity === 0) return;
    var minQ = s.minQuantity || 5;
    var w = getWh(db, s.warehouseId);
    var p = getProd(db, s.productId);
    if (!p || !w || w.type === 'customer') return;
    if (s.quantity <= minQ) out.push({ stock: s, product: p, warehouse: w });
  });
  out.sort(function (a, b) { return a.stock.quantity - b.stock.quantity; });
  return out;
}

function sparklineData(db, whType, days) {
  days = days || 7;
  var ids = db.warehouses.filter(function (w) { return w.type === whType; }).map(function (w) { return w.id; });
  var result = [];
  for (var i = days - 1; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    var next = new Date(d);
    next.setDate(next.getDate() + 1);
    var qty = 0;
    db.transfers.forEach(function (t) {
      if (t.status !== 'approved') return;
      var at = new Date(t.completedAt || t.createdAt);
      if (at < d || at >= next) return;
      if (t.type === 'inbound' && ids.indexOf(t.destinationWarehouseId) >= 0) qty += t.quantity;
      else if (ids.indexOf(t.sourceWarehouseId) >= 0 || ids.indexOf(t.destinationWarehouseId) >= 0) qty += t.quantity;
    });
    result.push(qty);
  }
  return result;
}

function sparklineSVG(values, color, w, h) {
  w = w || 80;
  h = h || 34;
  if (!values.length) return '';
  var max = Math.max.apply(null, values.concat([1]));
  var step = w / (values.length - 1 || 1);
  var pts = values.map(function (v, i) {
    var x = i * step;
    var y = h - (v / max) * (h - 6) - 3;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  var area = '0,' + h + ' ' + pts + ' ' + w + ',' + h;
  return '<svg class="sparkline" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
    '<polygon points="' + area + '" fill="' + color + '" opacity=".09"/>' +
    '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';
}
