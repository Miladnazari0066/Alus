'use strict';

var ROLES = {
  warehouse_officer: 'انباردار',
  accountant: 'حسابدار',
  manager: 'مدیر',
  admin: 'راهبر سیستم'
};

var STATUS = {
  pending_warehouse:  { label: 'در انتظار تأیید انبار',     tone: 'pending_warehouse',  step: 1 },
  pending_accountant: { label: 'در انتظار تأیید حسابدار',   tone: 'pending_accountant', step: 2 },
  pending_manager:    { label: 'در انتظار تأیید مدیر',      tone: 'pending_manager',    step: 3 },
  approved:           { label: 'انتقال انجام شد',          tone: 'approved',           step: 4 },
  rejected:           { label: 'رد شد',                    tone: 'rejected',           step: -1 }
};

var IN_STATUS = {
  pending_warehouse:  { label: 'در انتظار تأیید انبار',    tone: 'pending_warehouse',  step: 1 },
  pending_accountant: { label: 'در انتظار تأیید حسابدار',  tone: 'pending_accountant', step: 2 },
  pending_manager:    { label: 'در انتظار تأیید مدیر',     tone: 'pending_manager',    step: 3 },
  approved:           { label: 'ورود ثبت شد',              tone: 'approved',           step: 4 },
  rejected:           { label: 'رد شد',                    tone: 'rejected',           step: -1 }
};

function stOf(t) { return t.type === 'inbound' ? IN_STATUS[t.status] : STATUS[t.status]; }

var WH_COLOR = {
  central:        '#007AFF',
  paint_in:       '#FF9500',
  paint_out:      '#EA580C',
  upholstery:     '#5AC8FA',
  store:          '#34C759',
  showroom_khalij:'#AF52DE',
  showroom_alus:  '#9333EA',
  sold:           '#FF3B30',
  customer:       '#94a3b8'
};

var UNITS = ['دست', 'سرویس', 'عدد', 'متر', 'کیلوگرم', 'بسته'];
var KIT_UNITS = ['دست', 'سرویس'];
function isKitUnit(u) { return KIT_UNITS.indexOf(u) >= 0; }
