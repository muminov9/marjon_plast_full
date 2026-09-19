import 'dotenv/config';
import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken';
import path from 'path'; import { fileURLToPath } from 'url'; import fs from 'fs'; import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { initial, initDB, saveFile, pushRemote, waitFlush, backupRemote, listRemoteBackups, fetchRemoteBackup, isRemote } from './store.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url)); const root = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3000); const SECRET = process.env.JWT_SECRET || 'change-me-in-production';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me-in-production')) {
  console.error('XAVFSIZLIK: production rejimida .env faylida kuchli JWT_SECRET sozlang.'); process.exit(1);
}
const app = express(); app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src-attr': ["'unsafe-inline'"] } } }));
const corsOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, maxAge: 600 }));
app.use(express.json({ limit: '1mb' }));
const rlWin = 15 * 60e3, rlMax = Number(process.env.RATE_LIMIT || 600), rlStore = new Map();
app.use((req, res, next) => {
  const now = Date.now(), key = req.ip || 'x';
  let r = rlStore.get(key);
  if (!r || now > r.reset) { r = { count: 0, reset: now + rlWin }; rlStore.set(key, r); }
  r.count++;
  if (r.count > rlMax) return res.status(429).json({ message: 'Juda ko\u2018p so\u2018rov. Birozdan so\u2018ng qayta urinib ko\u2018ring' });
  next();
});
const trim = (v, max = 200) => { const s = String(v ?? '').trim(); return s.length > max ? s.slice(0, max) : s; };
let db = null;
app.use(async (req, res, next) => {
  if (!db) db = await initDB();
  await waitFlush();
  next();
});
app.use(express.static(path.join(root, 'public')));
const id = p => p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
const today = () => new Date().toLocaleDateString('en-CA');
const money = v => { const n = Number(v); return Number.isFinite(n) ? n : 0 };
const backedDates = new Set();
function save() { saveFile(db); pushRemote(db); if (isRemote()) { const t = new Date().toLocaleDateString('en-CA'); if (!backedDates.has(t)) { backedDates.add(t); backupRemote(db); } } }
const BACKUPDIR = path.join(root, 'backups');
function forceLocalBackup() {
  try {
    if (!fs.existsSync(BACKUPDIR)) fs.mkdirSync(BACKUPDIR, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    let f = path.join(BACKUPDIR, 'data-' + stamp + '.json'), n = 1;
    while (fs.existsSync(f)) f = path.join(BACKUPDIR, 'data-' + stamp + '-' + (n++) + '.json');
    fs.writeFileSync(f, JSON.stringify(db, null, 2));
    return path.basename(f);
  } catch (e) { console.error('Lokal backup xatosi:', e.message); return null; }
}
function log(user, action, entity, entityId, details = '') {
  db.audit.unshift({ id: id('log'), date: new Date().toISOString(), userId: user?.id || '', userName: user?.name || 'System', action, entity, entityId, details });
  db.audit = db.audit.slice(0, 500); save();
}
function auth(req, res, next) { const t = (req.headers.authorization || '').replace(/^Bearer\s+/, ''); if (!t) return res.status(401).json({ message: 'Avval tizimga kiring' }); try { req.user = jwt.verify(t, SECRET); next(); } catch { return res.status(401).json({ message: 'Sessiya tugagan yoki yaroqsiz' }); } }
const roles = { ADMIN: ['*'], MANAGER: ['dashboard', 'products', 'customers', 'debts', 'suppliers', 'sales', 'purchases', 'workers', 'payroll', 'cash', 'reports'], CASHIER: ['dashboard', 'customers', 'debts', 'sales', 'cash', 'reports'] };
function can(section) { return (req, res, next) => { if (req.user.role === 'ADMIN' || roles[req.user.role]?.includes(section)) return next(); res.status(403).json({ message: 'Bu bo\u2018limga ruxsat yo\u2018q' }); }; }
function admin(req, res, next) { return req.user.role === 'ADMIN' ? next() : res.status(403).json({ message: 'Faqat Admin' }); }
function safeUser(u) { return { id: u.id, name: u.name, username: u.username, role: u.role, active: u.active, createdAt: u.createdAt }; }
const publicState = () => { const { rawMaterials, productions, ...rest } = db; return { ...rest, users: db.users.map(safeUser) }; };
const VALID_ROLES = ['ADMIN', 'MANAGER', 'CASHIER'];
const loginAttempts = new Map();
function failCount(key) { const now = Date.now(); let rec = loginAttempts.get(key); if (!rec || now > rec.reset) { rec = { count: 0, reset: now + 15 * 60e3 }; loginAttempts.set(key, rec); } rec.count++; return rec; }
function resetFail(key) { loginAttempts.delete(key); }
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/auth/status', (req, res) => res.json({ hasUsers: db.users.length > 0 }));
app.post('/api/auth/bootstrap', async (req, res) => {
  if (db.users.length) return res.status(409).json({ message: 'Admin allaqachon yaratilgan' });
  const { name, username, password } = req.body;
  if (!name || !username || !password || password.length < 6) return res.status(400).json({ message: 'Ism, login va kamida 6 belgili parol kerak' });
  const u = { id: id('usr'), name: String(name).trim(), username: String(username).trim(), passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN', active: true, createdAt: new Date().toISOString() };
  db.users.push(u); save(); log(u, 'CREATE', 'user', u.id, u.username);
  res.json({ user: safeUser(u) });
});
function userKey(req) { return (req.ip || 'ip') + ':' + (req.body?.username || '').toString().toLowerCase(); }
app.post('/api/auth/login', async (req, res) => {
  const key = userKey(req); const rec = failCount(key);
  if (rec.count > 10 && Date.now() < rec.reset) return res.status(429).json({ message: 'Juda ko\u2018p urinish. 15 daqiqadan keyin qaytadan urinib ko\u2018ring' });
  const uname = trim(req.body.username, 60), pass = String(req.body.password || '');
  if (pass.length > 100) return res.status(400).json({ message: 'Parol juda uzun' });
  const u = db.users.find(x => x.username === uname);
  if (!u || !u.active || !(await bcrypt.compare(pass, u.passwordHash))) return res.status(401).json({ message: 'Login yoki parol noto\u2018g\u2018ri' });
  resetFail(key);
  const token = jwt.sign({ id: u.id, name: u.name, username: u.username, role: u.role }, SECRET, { expiresIn: '7d' });
  log(u, 'LOGIN', 'auth', u.id); res.json({ token, user: safeUser(u) });
});
app.get('/api/me', auth, (req, res) => { const u = db.users.find(x => x.id === req.user.id); if (!u) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' }); res.json({ user: safeUser(u), permissions: roles[u.role] || [] }); });
app.patch('/api/me/password', auth, async (req, res) => {
  const u = db.users.find(x => x.id === req.user.id); if (!u) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
  const current = String(req.body.currentPassword || ''), next = String(req.body.newPassword || '');
  if (next.length < 6 || next.length > 100) return res.status(400).json({ message: 'Yangi parol 6-100 belgi bo\u2018lishi kerak' });
  if (!(await bcrypt.compare(current, u.passwordHash))) return res.status(403).json({ message: 'Joriy parol noto\u2018g\u2018ri' });
  u.passwordHash = await bcrypt.hash(next, 12); save(); log(u, 'UPDATE', 'password', u.id);
  res.json({ ok: true });
});
app.get('/api/state', auth, (req, res) => res.json(publicState()));
app.get('/api/users', auth, admin, (req, res) => res.json(db.users.map(safeUser)));
app.post('/api/users', auth, admin, async (req, res) => {
  const { name, username, password, role = 'CASHIER' } = req.body;
  if (!name || !username || !password || password.length < 6) return res.status(400).json({ message: 'Ma\u2019lumotlar yetarli emas' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ message: 'Rol noto\u2018g\u2018ri' });
  if (db.users.some(x => x.username.toLowerCase() === String(username).trim().toLowerCase())) return res.status(409).json({ message: 'Bu login band' });
  const u = { id: id('usr'), name: String(name).trim(), username: String(username).trim(), passwordHash: await bcrypt.hash(password, 12), role, active: true, createdAt: new Date().toISOString() };
  db.users.push(u); save(); log(req.user, 'CREATE', 'user', u.id, u.username);
  res.json(safeUser(u));
});
app.patch('/api/users/:id', auth, admin, async (req, res) => {
  const u = db.users.find(x => x.id === req.params.id); if (!u) return res.status(404).json({ message: 'Topilmadi' });
  if (req.body.name) u.name = String(req.body.name).trim();
  if (req.body.role) { if (!VALID_ROLES.includes(req.body.role)) return res.status(400).json({ message: 'Rol noto\u2018g\u2018ri' }); u.role = req.body.role; }
  if (typeof req.body.active === 'boolean') u.active = req.body.active;
  if (req.body.password) u.passwordHash = await bcrypt.hash(req.body.password, 12);
  save(); log(req.user, 'UPDATE', 'user', u.id); res.json(safeUser(u));
});
function crud(route, key, section, fields, numeric = []) {
  const MAX = { name: 120, category: 80, unit: 20, phone: 40, address: 200, role: 60, note: 400 };
  app.get('/api/' + route, auth, can(section), (req, res) => res.json(db[key] || []));
  app.post('/api/' + route, auth, can(section), (req, res) => {
    if (!req.body?.name && fields.includes('name')) return res.status(400).json({ message: 'Nom kerak' });
    const x = { id: id(key.slice(0, 3)), createdAt: new Date().toISOString() };
    for (const f of fields) {
      if (numeric.includes(f)) { x[f] = Math.max(0, money(req.body[f])); continue; }
      x[f] = Array.isArray(req.body[f]) ? req.body[f] : trim(req.body[f], MAX[f] || 200);
    }
    db[key].push(x); save(); log(req.user, 'CREATE', key, x.id); res.json(x);
  });
  app.put('/api/' + route + '/:id', auth, can(section), (req, res) => {
    const x = db[key].find(v => v.id === req.params.id); if (!x) return res.status(404).json({ message: 'Topilmadi' });
    for (const f of Object.keys(req.body || {})) {
      if (f === 'id' || f === 'createdAt') continue;
      if (numeric.includes(f)) { if (f !== 'debt') x[f] = Math.max(0, money(req.body[f])); else x[f] = money(req.body[f]); continue; }
      if (!Array.isArray(req.body[f]) && typeof req.body[f] !== 'boolean') x[f] = String(req.body[f]).slice(0, MAX[f] || 200).trim();
      else x[f] = req.body[f];
    }
    save(); log(req.user, 'UPDATE', key, x.id); res.json(x);
  });
  app.delete('/api/' + route + '/:id', auth, can(section), (req, res) => {
    const i = db[key].findIndex(v => v.id === req.params.id); if (i < 0) return res.status(404).json({ message: 'Topilmadi' });
    const [x] = db[key].splice(i, 1); save(); log(req.user, 'DELETE', key, x.id); res.json({ ok: true });
  });
}
crud('products', 'products', 'products', ['name', 'category', 'unit', 'buy', 'sell', 'stock', 'min'], ['buy', 'sell', 'stock', 'min']);
crud('customers', 'customers', 'customers', ['name', 'phone', 'address', 'debt'], ['debt']);
crud('suppliers', 'suppliers', 'suppliers', ['name', 'phone', 'address', 'debt'], ['debt']);
crud('workers', 'workers', 'workers', ['name', 'role', 'salary', 'payday', 'phone'], ['salary', 'payday']);
app.get('/api/debts', auth, can('debts'), (req, res) => { const c = db.customers.map(x => ({ ...x, paid: db.sales.filter(s => s.customerId === x.id && s.payment !== 'Qarz').reduce((a, s) => a + s.total, 0) })); res.json(c); });
app.post('/api/sales', auth, can('sales'), (req, res) => {
  const { productId } = req.body;
  const payment = ['Naqd', 'Karta', 'Qarz'].includes(req.body.payment) ? req.body.payment : 'Naqd';
  const customerId = trim(req.body.customerId, 60), date = String(req.body.date || today()).slice(0, 10), note = trim(req.body.note, 400);
  const p = db.products.find(x => x.id === productId); if (!p) return res.status(400).json({ message: 'Mahsulot topilmadi' });
  const q = money(req.body.qty); if (q <= 0 || p.stock < q) return res.status(400).json({ message: 'Qoldiq yetarli emas' });
  if (payment === 'Qarz' && !db.customers.some(c => c.id === customerId)) return res.status(400).json({ message: 'Qarzga sotish uchun mijoz tanlash shart' });
  const total = q * money(p.sell);
  const s = { id: id('sal'), date, productId, qty: q, sell: p.sell, total, payment, customerId: customerId || '', note, createdAt: new Date().toISOString() };
  p.stock -= q; db.sales.push(s);
  if (payment === 'Qarz') { const c = db.customers.find(x => x.id === customerId); if (c) c.debt = money(c.debt) + total; }
  db.cash.push({ id: id('cash'), date: s.date, type: 'income', amount: payment === 'Qarz' ? 0 : total, source: 'sale', refId: s.id, note });
  save(); log(req.user, 'CREATE', 'sale', s.id); res.json(s);
});
app.delete('/api/sales/:id', auth, can('sales'), (req, res) => {
  const i = db.sales.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ message: 'Topilmadi' });
  const [s] = db.sales.splice(i, 1);
  const p = db.products.find(x => x.id === s.productId);
  if (p) p.stock = money(p.stock) + money(s.qty);
  if (s.payment === 'Qarz' && s.customerId) {
    const c = db.customers.find(x => x.id === s.customerId);
    if (c) c.debt = Math.max(0, money(c.debt) - money(s.total));
  }
  const cashIdx = db.cash.findIndex(x => x.refId === s.id && x.source === 'sale');
  if (cashIdx >= 0) db.cash.splice(cashIdx, 1);
  save(); log(req.user, 'DELETE', 'sale', s.id); res.json({ ok: true });
});
app.post('/api/purchases', auth, can('purchases'), (req, res) => {
  const { productId } = req.body;
  const supplierId = trim(req.body.supplierId, 60), date = String(req.body.date || today()).slice(0, 10), note = trim(req.body.note, 400);
  const p = db.products.find(x => x.id === productId); if (!p) return res.status(400).json({ message: 'Mahsulot topilmadi' });
  const q = money(req.body.qty), price = money(req.body.buy); if (q <= 0 || price < 0) return res.status(400).json({ message: 'Miqdor yoki narx noto\u2018g\u2018ri' });
  p.stock += q; p.buy = price;
  const x = { id: id('pur'), date, productId, qty: q, buy: price, total: q * price, supplierId: supplierId || '', note, createdAt: new Date().toISOString() };
  db.purchases.push(x);
  db.cash.push({ id: id('cash'), date: x.date, type: 'expense', amount: x.total, source: 'purchase', refId: x.id, note });
  save(); log(req.user, 'CREATE', 'purchase', x.id); res.json(x);
});
app.post('/api/expenses', auth, can('cash'), (req, res) => {
  const amount = money(req.body.amount); if (amount <= 0) return res.status(400).json({ message: 'Summa noto\u2018g\u2018ri' });
  const x = { id: id('exp'), date: String(req.body.date || today()).slice(0, 10), category: trim(req.body.category, 80) || 'Boshqa', amount, note: trim(req.body.note, 400), createdAt: new Date().toISOString() };
  db.expenses.push(x);
  db.cash.push({ id: id('cash'), date: x.date, type: 'expense', amount: x.amount, source: 'expense', refId: x.id, note: x.note });
  save(); log(req.user, 'CREATE', 'expense', x.id); res.json(x);
});
app.post('/api/customer-payments', auth, can('debts'), (req, res) => {
  const c = db.customers.find(x => x.id === req.body.customerId); const amount = money(req.body.amount);
  if (!c || amount <= 0) return res.status(400).json({ message: 'Mijoz yoki summa noto\u2018g\u2018ri' });
  c.debt = Math.max(0, money(c.debt) - amount);
  const x = { id: id('pay'), date: String(req.body.date || today()).slice(0, 10), customerId: c.id, amount, note: trim(req.body.note, 400), createdAt: new Date().toISOString() };
  db.cash.push({ id: id('cash'), date: x.date, type: 'income', amount, source: 'debt_payment', refId: x.id, note: x.note });
  save(); log(req.user, 'CREATE', 'debt_payment', x.id, c.name); res.json(x);
});
app.post('/api/payroll', auth, can('payroll'), (req, res) => {
  const w = db.workers.find(x => x.id === req.body.workerId), amount = money(req.body.amount);
  if (!w || amount <= 0) return res.status(400).json({ message: 'Ishchi yoki summa noto\u2018g\u2018ri' });
  const date = String(req.body.date || today()).slice(0, 10);
  const x = { id: id('pay'), workerId: w.id, date, month: trim(req.body.month, 10) || date.slice(0, 7), amount, type: ['salary', 'advance'].includes(req.body.type) ? req.body.type : 'salary', note: trim(req.body.note, 400), createdAt: new Date().toISOString() };
  db.payroll.push(x);
  db.cash.push({ id: id('cash'), date: x.date, type: 'expense', amount, source: 'payroll', refId: x.id, note: w.name });
  save(); log(req.user, 'CREATE', 'payroll', x.id, w.name); res.json(x);
});
app.get('/api/dashboard', auth, can('dashboard'), (req, res) => {
  const t = today(), sales = db.sales.filter(x => x.date === t), rev = sales.reduce((a, x) => a + x.total, 0), cost = sales.reduce((a, x) => { const p = db.products.find(p => p.id === x.productId); return a + x.qty * money(p?.buy); }, 0), exp = db.expenses.filter(x => x.date === t).reduce((a, x) => a + x.amount, 0), debt = db.customers.reduce((a, x) => a + money(x.debt), 0);
  res.json({ today: t, revenue: rev, cost, expense: exp, profit: rev - cost - exp, stockValue: db.products.reduce((a, p) => a + money(p.stock) * money(p.buy), 0), debt, products: db.products.length, customers: db.customers.length, workers: db.workers.length, lowStock: db.products.filter(p => money(p.stock) <= money(p.min)) });
});
app.get('/api/stats', auth, can('reports'), (req, res) => {
  const period = ['day', 'week', 'month', 'year'].includes(req.query.period) ? req.query.period : 'month';
  const from = String(req.query.from || ''), to = String(req.query.to || '');
  const pCost = s => { const p = db.products.find(p => p.id === s.productId); return s.qty * money(p?.buy); };
  const inRange = x => (!from || x.date >= from) && (!to || x.date <= to);
  const sales = db.sales.filter(inRange), expenses = db.expenses.filter(inRange), payroll = db.payroll.filter(inRange), purchases = db.purchases.filter(inRange);
  const now = new Date();
  const fmt = d => d.toLocaleDateString('en-CA');
  const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
  const startOfWeek = d => { const t = new Date(d); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); t.setHours(0, 0, 0, 0); return t; };
  let labels = [];
  if (period === 'day') { for (let i = 29; i >= 0; i--) labels.push(fmt(addDays(now, -i))); }
  else if (period === 'week') { for (let i = 7; i >= 0; i--) labels.push(fmt(addDays(startOfWeek(now), -7 * i))); }
  else if (period === 'month') { for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); labels.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); } }
  else { for (let i = 4; i >= 0; i--) labels.push(String(now.getFullYear() - i)); }
  const keyOf = x => period === 'day' ? x.date : period === 'week' ? fmt(startOfWeek(new Date(x.date))) : period === 'month' ? String(x.date).slice(0, 7) : String(x.date).slice(0, 4);
  const idx = {}; labels.forEach((l, i) => idx[l] = i);
  const revenue = labels.map(() => 0), cost = labels.map(() => 0), expense = labels.map(() => 0), pay = labels.map(() => 0), purch = labels.map(() => 0);
  for (const s of sales) { const i = idx[keyOf(s)]; if (i === undefined) continue; revenue[i] += s.total; cost[i] += pCost(s); }
  for (const e of expenses) { const i = idx[keyOf(e)]; if (i === undefined) continue; expense[i] += e.amount; }
  for (const p of payroll) { const i = idx[keyOf(p)]; if (i === undefined) continue; pay[i] += p.amount; }
  for (const p of purchases) { const i = idx[keyOf(p)]; if (i === undefined) continue; purch[i] += p.total; }
  const profit = labels.map((_, i) => revenue[i] - cost[i] - expense[i] - pay[i]);
  const sum = a => a.reduce((x, y) => x + y, 0);
  const byProd = {};
  for (const s of sales) { byProd[s.productId] = byProd[s.productId] || { qty: 0, rev: 0 }; byProd[s.productId].qty += s.qty; byProd[s.productId].rev += s.total; }
  const topProducts = Object.entries(byProd).map(([id, v]) => ({ product: db.products.find(p => p.id === id)?.name || '—', qty: v.qty, revenue: v.rev })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const byCust = {};
  for (const s of sales) { if (!s.customerId) continue; byCust[s.customerId] = (byCust[s.customerId] || 0) + s.total; }
  const topCustomers = Object.entries(byCust).map(([id, v]) => ({ customer: db.customers.find(c => c.id === id)?.name || '—', revenue: v })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  res.json({ period, labels, revenue, cost, expense, payroll: pay, purchases: purch, profit, totals: { revenue: sum(revenue), cost: sum(cost), expense: sum(expense), payroll: sum(pay), purchases: sum(purch), profit: sum(profit) }, topProducts, topCustomers });
});
app.get('/api/reports', auth, can('reports'), (req, res) => {
  const from = String(req.query.from || '1900-01-01'), to = String(req.query.to || '2999-12-31'), between = x => x.date >= from && x.date <= to,
    sales = db.sales.filter(between), purchases = db.purchases.filter(between), expenses = db.expenses.filter(between), payroll = db.payroll.filter(between);
  const revenue = sales.reduce((a, x) => a + x.total, 0), cost = sales.reduce((a, x) => { const p = db.products.find(p => p.id === x.productId); return a + x.qty * money(p?.buy); }, 0),
    expense = expenses.reduce((a, x) => a + x.amount, 0), pay = payroll.reduce((a, x) => a + x.amount, 0);
  res.json({ from, to, revenue, cost, expense, payroll: pay, purchases: purchases.reduce((a, x) => a + x.total, 0), profit: revenue - cost - expense - pay, sales, purchases, expenses, payroll });
});
app.get('/api/audit', auth, admin, (req, res) => res.json(db.audit));
app.get('/api/cash', auth, can('cash'), (req, res) => { const income = db.cash.filter(x => x.type === 'income').reduce((a, x) => a + x.amount, 0), expense = db.cash.filter(x => x.type === 'expense').reduce((a, x) => a + x.amount, 0); res.json({ openingCash: money(db.settings.openingCash), income, expense, balance: money(db.settings.openingCash) + income - expense, items: db.cash }); });
app.put('/api/settings', auth, admin, (req, res) => { if (req.body.companyName) db.settings.companyName = trim(req.body.companyName, 80); if (req.body.currency) db.settings.currency = trim(req.body.currency, 10); if (req.body.openingCash !== undefined) db.settings.openingCash = Math.max(0, money(req.body.openingCash)); save(); log(req.user, 'UPDATE', 'settings', '1'); res.json(db.settings); });
app.get('/api/backups', auth, admin, async (req, res) => {
  let local = [];
  try { if (fs.existsSync(BACKUPDIR)) local = fs.readdirSync(BACKUPDIR).filter(f => /\.json$/.test(f)).map(f => { const st = fs.statSync(path.join(BACKUPDIR, f)); return { file: f, date: (f.match(/data-([\d-]+)/) || [])[1] || '', size: st.size }; }).sort((a, b) => b.date.localeCompare(a.date)); } catch (e) { console.error('Lokal backup ro\u2018yxat xatosi:', e.message); }
  const remote = await listRemoteBackups();
  res.json({ local, remote });
});
app.post('/api/backup', auth, admin, async (req, res) => {
  saveFile(db); const localFile = forceLocalBackup(); const remoteKey = await backupRemote(db);
  save(); log(req.user, 'CREATE', 'backup', '1', remoteKey || localFile);
  res.json({ ok: true, localFile, remoteKey, at: new Date().toISOString() });
});
app.get('/api/backup/download', auth, admin, (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename=marjon-backup-' + new Date().toISOString().slice(0, 10) + '.json');
  res.type('application/json').send(JSON.stringify(db, null, 2));
});
app.post('/api/backup/restore', auth, admin, async (req, res) => {
  let snap = null, label = '';
  try {
    if (req.body.snapshot) { snap = typeof req.body.snapshot === 'string' ? JSON.parse(req.body.snapshot) : req.body.snapshot; label = 'snapshot'; }
    else if (req.body.key) { snap = await fetchRemoteBackup(String(req.body.key)); label = req.body.key; }
    else if (req.body.filename) { const f = path.join(BACKUPDIR, path.basename(String(req.body.filename))); if (fs.existsSync(f)) { snap = JSON.parse(fs.readFileSync(f, 'utf8')); label = req.body.filename; } }
  } catch (e) { return res.status(400).json({ message: 'Backup fayli buzilgan yoki yaroqsiz' }); }
  if (!snap || typeof snap !== 'object' || !Array.isArray(snap.users) || !Array.isArray(snap.products) || !Array.isArray(snap.sales)) return res.status(400).json({ message: 'Yaroqsiz backup' });
  db = Object.assign(initial(), snap, { settings: Object.assign(Object.assign({}, initial().settings), snap.settings || {}) });
  save(); log(req.user, 'RESTORE', 'backup', '1', label); backedDates.clear();
  res.json({ ok: true, restored: label });
});
app.get('/api/export/xlsx', auth, can('reports'), (req, res) => {
  const wb = XLSX.utils.book_new();
  for (const [k, v] of Object.entries(publicState())) if (Array.isArray(v)) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(v), k.slice(0, 31));
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=marjon-hisobot.xlsx');
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buf);
});
app.get('/api/export/pdf', auth, can('reports'), (req, res) => {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=marjon-hisobot.pdf');
  doc.pipe(res);
  doc.fontSize(20).text(db.settings.companyName, { align: 'center' }); doc.moveDown();
  doc.fontSize(12).text('Biznes hisobot'); doc.moveDown();
  const revenue = db.sales.reduce((a, x) => a + x.total, 0), cost = db.sales.reduce((a, x) => { const p = db.products.find(p => p.id === x.productId); return a + x.qty * money(p?.buy); }, 0),
    expense = db.expenses.reduce((a, x) => a + x.amount, 0), pay = db.payroll.reduce((a, x) => a + x.amount, 0),
    stock = db.products.reduce((a, p) => a + money(p.stock) * money(p.buy), 0), debt = db.customers.reduce((a, c) => a + money(c.debt), 0);
  const fmt = n => money(n).toLocaleString('uz-UZ') + ' UZS';
  doc.text(`Jami sotuv: ${fmt(revenue)}`);
  doc.text(`Tannarxi: ${fmt(cost)}`);
  doc.text(`Rasxodlar: ${fmt(expense)}`);
  doc.text(`Oyliklar: ${fmt(pay)}`);
  doc.text(`Jami foyda: ${fmt(revenue - cost - expense - pay)}`);
  doc.text(`Ombor qiymati: ${fmt(stock)}`);
  doc.text(`Mijozlar qarzi: ${fmt(debt)}`);
  doc.moveDown();
  doc.text(`Yaratilgan: ${new Date().toLocaleString('uz-UZ')}`);
  doc.end();
});
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON ma\u2019lumoti noto\u2018g\u2018ri' });
  console.error(err);
  res.status(500).json({ message: 'Server xatosi' });
});
app.use('/api', (req, res) => res.status(404).json({ message: 'API yo\u2018nalishi topilmadi' }));
app.get('/{*splat}', (req, res) => res.sendFile(path.join(root, 'public', 'index.html')));

export default app;
export { PORT };