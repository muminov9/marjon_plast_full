import 'dotenv/config';
import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken';
import path from 'path'; import { fileURLToPath } from 'url'; import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { initial, initDB, saveFile, pushRemote, waitFlush } from './store.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url)); const root = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3000); const SECRET = process.env.JWT_SECRET || 'change-me-in-production';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me-in-production')) {
  console.error('XAVFSIZLIK: production rejimida .env faylida kuchli JWT_SECRET sozlang.'); process.exit(1);
}
const app = express(); app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src-attr': ["'unsafe-inline'"] } } }));
app.use(cors()); app.use(express.json({ limit: '1mb' }));
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
function save() { saveFile(db); pushRemote(db); }
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
  const u = db.users.find(x => x.username === String(req.body.username || '').trim());
  if (!u || !u.active || !(await bcrypt.compare(req.body.password || '', u.passwordHash))) return res.status(401).json({ message: 'Login yoki parol noto\u2018g\u2018ri' });
  resetFail(key);
  const token = jwt.sign({ id: u.id, name: u.name, username: u.username, role: u.role }, SECRET, { expiresIn: '7d' });
  log(u, 'LOGIN', 'auth', u.id); res.json({ token, user: safeUser(u) });
});
app.get('/api/me', auth, (req, res) => { const u = db.users.find(x => x.id === req.user.id); if (!u) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' }); res.json({ user: safeUser(u), permissions: roles[u.role] || [] }); });
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
  app.get('/api/' + route, auth, can(section), (req, res) => res.json(db[key] || []));
  app.post('/api/' + route, auth, can(section), (req, res) => {
    if (!req.body?.name && fields.includes('name')) return res.status(400).json({ message: 'Nom kerak' });
    const x = { id: id(key.slice(0, 3)), createdAt: new Date().toISOString() };
    for (const f of fields) x[f] = numeric.includes(f) ? money(req.body[f]) : (req.body[f] ?? (f.endsWith('s') ? [] : ''));
    db[key].push(x); save(); log(req.user, 'CREATE', key, x.id); res.json(x);
  });
  app.put('/api/' + route + '/:id', auth, can(section), (req, res) => {
    const x = db[key].find(v => v.id === req.params.id); if (!x) return res.status(404).json({ message: 'Topilmadi' });
    for (const f of Object.keys(req.body || {})) { if (f === 'id' || f === 'createdAt') continue; x[f] = numeric.includes(f) ? money(req.body[f]) : req.body[f]; }
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
  const { productId, qty, payment = 'Naqd', customerId = '', date = today(), note = '' } = req.body;
  const p = db.products.find(x => x.id === productId); if (!p) return res.status(400).json({ message: 'Mahsulot topilmadi' });
  const q = money(qty); if (q <= 0 || p.stock < q) return res.status(400).json({ message: 'Qoldiq yetarli emas' });
  if (payment === 'Qarz' && !db.customers.some(c => c.id === customerId)) return res.status(400).json({ message: 'Qarzga sotish uchun mijoz tanlash shart' });
  const total = q * money(p.sell);
  const s = { id: id('sal'), date: String(date || ''), productId, qty: q, sell: p.sell, total, payment: String(payment), customerId: customerId || '', note: String(note || ''), createdAt: new Date().toISOString() };
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
  const { productId, qty, buy, supplierId = '', date = today(), note = '' } = req.body;
  const p = db.products.find(x => x.id === productId); if (!p) return res.status(400).json({ message: 'Mahsulot topilmadi' });
  const q = money(qty), price = money(buy); if (q <= 0 || price < 0) return res.status(400).json({ message: 'Miqdor yoki narx noto\u2018g\u2018ri' });
  p.stock += q; p.buy = price;
  const x = { id: id('pur'), date: String(date || ''), productId, qty: q, buy: price, total: q * price, supplierId: supplierId || '', note: String(note || ''), createdAt: new Date().toISOString() };
  db.purchases.push(x);
  db.cash.push({ id: id('cash'), date: x.date, type: 'expense', amount: x.total, source: 'purchase', refId: x.id, note });
  save(); log(req.user, 'CREATE', 'purchase', x.id); res.json(x);
});
app.post('/api/expenses', auth, can('cash'), (req, res) => {
  const amount = money(req.body.amount); if (amount <= 0) return res.status(400).json({ message: 'Summa noto\u2018g\u2018ri' });
  const x = { id: id('exp'), date: String(req.body.date || today()), category: String(req.body.category || 'Boshqa'), amount, note: String(req.body.note || ''), createdAt: new Date().toISOString() };
  db.expenses.push(x);
  db.cash.push({ id: id('cash'), date: x.date, type: 'expense', amount: x.amount, source: 'expense', refId: x.id, note: x.note });
  save(); log(req.user, 'CREATE', 'expense', x.id); res.json(x);
});
app.post('/api/customer-payments', auth, can('debts'), (req, res) => {
  const c = db.customers.find(x => x.id === req.body.customerId); const amount = money(req.body.amount);
  if (!c || amount <= 0) return res.status(400).json({ message: 'Mijoz yoki summa noto\u2018g\u2018ri' });
  c.debt = Math.max(0, money(c.debt) - amount);
  const x = { id: id('pay'), date: String(req.body.date || today()), customerId: c.id, amount, note: String(req.body.note || ''), createdAt: new Date().toISOString() };
  db.cash.push({ id: id('cash'), date: x.date, type: 'income', amount, source: 'debt_payment', refId: x.id, note: x.note });
  save(); log(req.user, 'CREATE', 'debt_payment', x.id, c.name); res.json(x);
});
app.post('/api/payroll', auth, can('payroll'), (req, res) => {
  const w = db.workers.find(x => x.id === req.body.workerId), amount = money(req.body.amount);
  if (!w || amount <= 0) return res.status(400).json({ message: 'Ishchi yoki summa noto\u2018g\u2018ri' });
  const date = String(req.body.date || today());
  const x = { id: id('pay'), workerId: w.id, date, month: String(req.body.month || date.slice(0, 7)), amount, type: String(req.body.type || 'salary'), note: String(req.body.note || ''), createdAt: new Date().toISOString() };
  db.payroll.push(x);
  db.cash.push({ id: id('cash'), date: x.date, type: 'expense', amount, source: 'payroll', refId: x.id, note: w.name });
  save(); log(req.user, 'CREATE', 'payroll', x.id, w.name); res.json(x);
});
app.get('/api/dashboard', auth, can('dashboard'), (req, res) => {
  const t = today(), sales = db.sales.filter(x => x.date === t), rev = sales.reduce((a, x) => a + x.total, 0), cost = sales.reduce((a, x) => { const p = db.products.find(p => p.id === x.productId); return a + x.qty * money(p?.buy); }, 0), exp = db.expenses.filter(x => x.date === t).reduce((a, x) => a + x.amount, 0), debt = db.customers.reduce((a, x) => a + money(x.debt), 0);
  res.json({ today: t, revenue: rev, cost, expense: exp, profit: rev - cost - exp, stockValue: db.products.reduce((a, p) => a + money(p.stock) * money(p.buy), 0), debt, products: db.products.length, customers: db.customers.length, workers: db.workers.length, lowStock: db.products.filter(p => money(p.stock) <= money(p.min)) });
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
app.put('/api/settings', auth, admin, (req, res) => { if (req.body.companyName) db.settings.companyName = String(req.body.companyName).trim(); if (req.body.currency) db.settings.currency = String(req.body.currency).trim(); if (req.body.openingCash !== undefined) db.settings.openingCash = Math.max(0, money(req.body.openingCash)); save(); log(req.user, 'UPDATE', 'settings', '1'); res.json(db.settings); });
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