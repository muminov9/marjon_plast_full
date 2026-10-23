import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { timingSafeEqual } from 'node:crypto';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import {
  BUSINESS_COLLECTIONS, BUSINESS_ROLES, TENANT_STATUSES,
  emptyBusinessData, defaultBusinessSettings, stampBusinessData,
  initDB, saveFile, pushRemote, waitFlush, backupRemote, listRemoteBackups,
  fetchRemoteBackup, isRemote, refreshDB, detectChange, noteSave
} from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const WEAK_JWT_SECRETS = new Set(['change-me-in-production', 'change-this-to-a-long-random-secret']);
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || WEAK_JWT_SECRETS.has(process.env.JWT_SECRET))) {
  console.error('XAVFSIZLIK: production rejimida .env faylida kamida 32 belgili tasodifiy JWT_SECRET sozlang.');
  process.exit(1);
}

const singleTenantMode = process.env.SINGLE_TENANT_MODE === 'true';
const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: {
  'script-src-attr': ["'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:']
} } }));
const corsOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, maxAge: 600 }));
app.use(express.json({ limit: '1mb' }));

const trim = (v, max = 200) => {
  const s = String(v ?? '').trim();
  return s.length > max ? s.slice(0, max) : s;
};
const money = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const today = () => new Date().toLocaleDateString('en-CA');
const id = (p) => p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

const ROLE_PERMISSIONS = {
  ADMIN: ['*'],
  MANAGER: ['dashboard', 'products', 'customers', 'debts', 'suppliers', 'sales', 'purchases', 'workers', 'payroll', 'rawmat', 'expenses', 'dpay', 'reports'],
  CASHIER: ['dashboard', 'customers', 'debts', 'sales', 'rawmat', 'expenses', 'dpay', 'reports']
};
const VALID_ROLES = BUSINESS_ROLES;
const RESERVED_SLUGS = new Set(['api', 'admin', 'auth', 'platform', 'onboarding', 'www', 'app', 'login', 'settings']);
const CURRENCIES = new Set(['UZS', 'USD', 'EUR', 'RUB', 'KZT', 'TRY']);
const LOCALES = new Set(['uz', 'ru', 'en']);
const PLANS = Object.freeze([
  { id: 'trial', name: 'Trial', selfServe: true, limits: { users: 3, products: 100 }, features: ['Core accounting', '1 workspace'], price: null, currency: null, billing: 'none' },
  { id: 'starter', name: 'Starter', selfServe: false, limits: { users: 10, products: 1000 }, features: ['Core accounting', 'Reports', 'Backup'], price: null, currency: null, billing: 'external' },
  { id: 'business', name: 'Business', selfServe: false, limits: { users: 50, products: 10000 }, features: ['Core accounting', 'Reports', 'Backup', 'Priority support'], price: null, currency: null, billing: 'external' }
]);
const PLAN_BY_ID = new Map(PLANS.map((p) => [p.id, p]));

// Tenant context. Every authenticated business request runs inside this scope,
// and `db` only ever resolves to the current tenant's data.
const als = new AsyncLocalStorage();
let root = null;

const db = new Proxy({}, {
  get(_target, prop) {
    const scope = als.getStore();
    const data = scope ? scope.db : root;
    return data ? data[prop] : undefined;
  },
  set(_target, prop, value) {
    const scope = als.getStore();
    const data = scope ? scope.db : root;
    if (!data) return false;
    data[prop] = value;
    return true;
  },
  has(_target, prop) {
    const scope = als.getStore();
    const data = scope ? scope.db : root;
    return !!data && prop in data;
  },
  ownKeys() {
    const scope = als.getStore();
    const data = scope ? scope.db : root;
    return data ? Reflect.ownKeys(data) : [];
  },
  getOwnPropertyDescriptor(_target, prop) {
    const scope = als.getStore();
    const data = scope ? scope.db : root;
    if (!data || !(prop in data)) return undefined;
    return { configurable: true, enumerable: true, writable: true, value: data[prop] };
  }
});

const rlWin = 15 * 60e3;
const rlMax = Number(process.env.RATE_LIMIT || 600);
const rlStore = new Map();
app.use((req, res, next) => {
  const now = Date.now(), key = req.ip || 'x';
  let r = rlStore.get(key);
  if (!r || now > r.reset) { r = { count: 0, reset: now + rlWin }; rlStore.set(key, r); }
  r.count++;
  if (r.count > rlMax) return res.status(429).json({ message: 'Juda ko\u2018p so\u2018rov. Birozdan so\u2018ng qayta urinib ko\u2018ring' });
  next();
});

function persistRoot() {
  root.updatedAt = new Date().toISOString();
  noteSave(root);
  saveFile(root);
  pushRemote(root);
}

function runTenant(tenant, user, fn) {
  return als.run({ db: tenant.data, tenant, user }, fn);
}

async function ensurePlatformAdmin() {
  const username = trim(process.env.PLATFORM_ADMIN_USERNAME, 60);
  const password = String(process.env.PLATFORM_ADMIN_PASSWORD || '');
  if (!username || password.length < 8) return false;
  if (root.platformUsers.some((u) => String(u.username).toLowerCase() === username.toLowerCase())) return false;
  root.platformUsers.push({
    id: id('padmin'),
    name: trim(process.env.PLATFORM_ADMIN_NAME || 'Platform Administrator', 80),
    username,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'PLATFORM_ADMIN',
    active: true,
    createdAt: new Date().toISOString()
  });
  return true;
}

app.use(async (req, res, next) => {
  if (!root) {
    root = await initDB();
    if (await ensurePlatformAdmin()) persistRoot();
  }
  await waitFlush();
  if (isRemote() && req.path.startsWith('/api/')) {
    try {
      if (await detectChange()) {
        const fresh = await refreshDB();
        if (fresh) root = fresh;
      }
    } catch (e) {
      console.error('Sinxronlash xatosi:', e.message);
    }
  }
  next();
});
app.use(express.static(path.join(rootDir, 'public')));

const BACKUPDIR = process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : path.join(rootDir, 'backups');
const backedDates = new Set();
const safeKeyPart = (value) => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');

function save() {
  const scope = als.getStore();
  const now = new Date().toISOString();
  if (scope) {
    stampBusinessData(scope.db, scope.tenant.id);
    scope.tenant.updatedAt = now;
  }
  root.updatedAt = now;
  noteSave(root);
  saveFile(root);
  pushRemote(root);
  if (scope && isRemote()) {
    const t = today();
    const marker = scope.tenant.id + ':' + t;
    if (!backedDates.has(marker)) {
      backedDates.add(marker);
      backupRemote(scope.tenant.id, scope.db);
    }
  }
}

function log(user, action, entity, entityId, details = '') {
  const scope = als.getStore();
  if (!scope) return;
  scope.db.audit.unshift({ id: id('log'), date: new Date().toISOString(), userId: user?.id || '', userName: user?.name || 'System', action, entity, entityId, details });
  scope.db.audit = scope.db.audit.slice(0, 500);
  save();
}

function logPlatform(user, action, entity, entityId, details = '') {
  root.platformAudit.unshift({ id: id('plog'), date: new Date().toISOString(), userId: user?.id || '', userName: user?.name || 'System', action, entity, entityId, details });
  root.platformAudit = root.platformAudit.slice(0, 500);
  persistRoot();
}

function safeUser(u) {
  return { id: u.id, name: u.name, username: u.username, role: u.role, active: u.active, createdAt: u.createdAt };
}

function publicBusiness(b) {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    status: b.status,
    plan: b.plan,
    subscription: {
      planId: b.subscription?.planId || b.plan,
      status: b.subscription?.status || 'active',
      trialEndsAt: b.subscription?.trialEndsAt || null,
      currentPeriodEnd: b.subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: !!b.subscription?.cancelAtPeriodEnd
    },
    createdAt: b.createdAt
  };
}

function platformBusinessView(b) {
  return {
    ...publicBusiness(b),
    users: b.data.users.length,
    products: b.data.products.length,
    sales: b.data.sales.length,
    customers: b.data.customers.length,
    updatedAt: b.updatedAt
  };
}

const publicState = () => {
  const { productions, ...rest } = db;
  return { ...rest, users: db.users.map(safeUser) };
};

function bearer(req) {
  return (req.headers.authorization || '').replace(/^Bearer\s+/, '');
}

function auth(req, res, next) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ message: 'Avval tizimga kiring' });
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ message: 'Sessiya tugagan yoki yaroqsiz' });
  }
  if (payload.scope !== 'business' || !payload.tenantId) return res.status(403).json({ message: 'Bu token biznes API uchun yaroqsiz' });
  const tenant = root.businesses.find((b) => b.id === payload.tenantId);
  if (!tenant) return res.status(401).json({ message: 'Biznes topilmadi' });
  if (tenant.status !== 'active') return res.status(403).json({ message: 'Biznes faol emas. Platform administrator bilan bog\u2018laning' });
  const user = tenant.data.users.find((u) => u.id === (payload.sub || payload.id));
  if (!user || !user.active) return res.status(401).json({ message: 'Foydalanuvchi topilmadi yoki bloklangan' });
  req.tenant = tenant;
  req.user = { ...safeUser(user), tenantId: tenant.id };
  req.db = tenant.data;
  als.run({ db: tenant.data, tenant, user: req.user }, next);
}

function platformAuth(req, res, next) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ message: 'Platform administrator kirishi kerak' });
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ message: 'Sessiya tugagan yoki yaroqsiz' });
  }
  if (payload.scope !== 'platform' || payload.role !== 'PLATFORM_ADMIN') {
    return res.status(403).json({ message: 'Platform administrator huquqi kerak' });
  }
  const user = root.platformUsers.find((u) => u.id === (payload.sub || payload.id));
  if (!user || !user.active || user.role !== 'PLATFORM_ADMIN') return res.status(401).json({ message: 'Platform administrator topilmadi' });
  req.platformUser = user;
  next();
}

function can(section) {
  return (req, res, next) => {
    if (req.user.role === 'ADMIN' || ROLE_PERMISSIONS[req.user.role]?.includes(section)) return next();
    res.status(403).json({ message: 'Bu bo\u2018limga ruxsat yo\u2018q' });
  };
}

function admin(req, res, next) {
  return req.user.role === 'ADMIN' ? next() : res.status(403).json({ message: 'Faqat biznes administratori' });
}

const loginAttempts = new Map();
function failCount(key) {
  const now = Date.now();
  let rec = loginAttempts.get(key);
  if (!rec || now > rec.reset) { rec = { count: 0, reset: now + 15 * 60e3 }; loginAttempts.set(key, rec); }
  rec.count++;
  return rec;
}

const onboardingAttempts = new Map();
const onboardingMax = Number(process.env.ONBOARDING_RATE_LIMIT || 10);
function onboardingLimit(req, res, next) {
  const now = Date.now(), key = req.ip || 'x';
  let rec = onboardingAttempts.get(key);
  if (!rec || now > rec.reset) { rec = { count: 0, reset: now + 60 * 60e3 }; onboardingAttempts.set(key, rec); }
  rec.count++;
  if (rec.count > onboardingMax) return res.status(429).json({ message: 'Juda ko\u2018p biznes ochish urinishi. Keyinroq qayta urinib ko\u2018ring' });
  next();
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function requestedSlug(body, businessName) {
  const raw = body.slug !== undefined && String(body.slug).trim() !== '' ? body.slug : businessName;
  return slugify(raw);
}

function slugAvailable(slug, exceptId = null) {
  return !root.businesses.some((b) => b.slug === slug && b.id !== exceptId);
}

function uniqueSlug(base) {
  let slug = base || 'business';
  let n = 2;
  while (!slugAvailable(slug)) slug = (base || 'business') + '-' + n++;
  return slug;
}

function validLogo(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (s.length > 700000) return null;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(s)) return s;
  if (/^https:\/\/[^\s"'<>]{1,480}$/.test(s)) return s;
  return null;
}

function validateAccount(body) {
  const name = trim(body.name || body.adminName, 80);
  const username = trim(body.username, 40);
  const password = String(body.password || '');
  if (name.length < 2) return { error: 'Administrator ismini kiriting' };
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) return { error: 'Login 3-40 belgi, faqat harf, raqam, nuqta, _ va - bo\u2018lishi kerak' };
  if (password.length < 8 || password.length > 100) return { error: 'Parol 8-100 belgi bo\u2018lishi kerak' };
  return { name, username, password };
}

function validateBusinessBody(body) {
  const name = trim(body.businessName || body.companyName, 80);
  if (name.length < 2) return { error: 'Biznes nomini kiriting' };
  const slug = requestedSlug(body, name);
  if (slug.length < 2) return { error: 'Biznes kodi noto\u2018g\u2018ri' };
  if (RESERVED_SLUGS.has(slug)) return { error: 'Bu biznes kodi band' };
  const currency = trim(body.currency || 'UZS', 10).toUpperCase();
  const locale = trim(body.locale || 'uz', 5).toLowerCase();
  if (!CURRENCIES.has(currency)) return { error: 'Valyuta qo\u2018llab-quvvatlanmaydi' };
  if (!LOCALES.has(locale)) return { error: 'Til qo\u2018llab-quvvatlanmaydi' };
  return { name, slug, currency, locale };
}

async function createBusiness({ name, slug, currency = 'UZS', locale = 'uz', logo = '', plan = 'trial', owner }) {
  const now = new Date().toISOString();
  const tenant = {
    id: id('biz'),
    slug,
    name,
    status: 'active',
    plan,
    subscription: {
      planId: plan,
      status: plan === 'trial' ? 'trialing' : 'active',
      provider: null,
      externalCustomerId: null,
      externalSubscriptionId: null,
      currentPeriodEnd: null,
      trialEndsAt: plan === 'trial' ? new Date(Date.now() + 14 * 864e5).toISOString() : null,
      cancelAtPeriodEnd: false
    },
    createdAt: now,
    updatedAt: now,
    data: emptyBusinessData()
  };
  tenant.data.settings = Object.assign(defaultBusinessSettings(), {
    companyName: name,
    logo,
    currency,
    locale,
    openingCash: 0
  });
  if (owner) {
    tenant.data.users.push({
      id: id('usr'),
      name: owner.name,
      username: owner.username,
      passwordHash: await bcrypt.hash(owner.password, 12),
      role: 'ADMIN',
      active: true,
      createdAt: now
    });
  }
  stampBusinessData(tenant.data, tenant.id);
  if (!slugAvailable(slug)) {
    const error = new Error('Bu biznes kodi band');
    error.status = 409;
    throw error;
  }
  root.businesses.push(tenant);
  return tenant;
}

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/plans', (req, res) => res.json({
  plans: PLANS.filter((p) => p.selfServe || p.id !== 'trial'),
  paymentsConfigured: false,
  note: 'Payment provider is not configured. Paid plans require a real provider integration and webhook verification before activation.'
}));

app.get('/api/auth/status', (req, res) => res.json({
  hasUsers: root.businesses.some((b) => b.data.users.length > 0),
  hasBusinesses: root.businesses.length > 0,
  singleTenantMode,
  onboardingEnabled: !singleTenantMode || root.businesses.length === 0,
  platformConfigured: root.platformUsers.length > 0
}));

app.post('/api/auth/bootstrap', onboardingLimit, async (req, res) => {
  if (root.businesses.length) return res.status(409).json({ message: 'Biznes allaqachon yaratilgan. Biznes kodi bilan kiring' });
  const account = validateAccount({ name: req.body.name, username: req.body.username, password: req.body.password });
  if (account.error) return res.status(400).json({ message: account.error });
  const name = trim(req.body.businessName || 'My Business', 80);
  const tenant = await createBusiness({ name, slug: uniqueSlug(slugify(name) || 'default'), owner: account });
  const user = tenant.data.users[0];
  runTenant(tenant, user, () => log(user, 'CREATE', 'business', tenant.id, tenant.slug));
  res.status(201).json({ user: safeUser(user), business: publicBusiness(tenant) });
});

app.post('/api/onboarding/business', onboardingLimit, async (req, res) => {
  if (singleTenantMode && root.businesses.length) return res.status(403).json({ message: 'Bu o\u2018rnatma bitta kompaniya rejimida ishlaydi' });
  const business = validateBusinessBody(req.body);
  if (business.error) return res.status(400).json({ message: business.error });
  if (!slugAvailable(business.slug)) return res.status(409).json({ message: 'Bu biznes kodi band' });
  const account = validateAccount({ name: req.body.name, username: req.body.username, password: req.body.password });
  if (account.error) return res.status(400).json({ message: account.error });
  const plan = trim(req.body.plan || 'trial', 20) || 'trial';
  const selectedPlan = PLAN_BY_ID.get(plan);
  if (!selectedPlan || !selectedPlan.selfServe) {
    return res.status(400).json({ message: 'Tanlangan tarif uchun to\u2018lov provayderi sozlanmagan. Trial tarifidan foydalaning' });
  }
  const tenant = await createBusiness({ ...business, plan: selectedPlan.id, owner: account });
  const user = tenant.data.users[0];
  runTenant(tenant, user, () => log(user, 'CREATE', 'business', tenant.id, tenant.slug));
  logPlatform(null, 'CREATE', 'business', tenant.id, tenant.slug);
  const token = jwt.sign({
    sub: user.id, tenantId: tenant.id, role: user.role, scope: 'business',
    name: user.name, username: user.username
  }, SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: safeUser(user), business: publicBusiness(tenant) });
});

app.post('/api/auth/login', async (req, res) => {
  const key = (req.ip || 'ip') + ':' + String(req.body?.username || '').toLowerCase();
  const rec = failCount(key);
  if (rec.count > 10 && Date.now() < rec.reset) return res.status(429).json({ message: 'Juda ko\u2018p urinish. 15 daqiqadan keyin qaytadan urinib ko\u2018ring' });
  const uname = trim(req.body.username, 60);
  const pass = String(req.body.password || '');
  const workspace = trim(req.body.business || req.body.workspace, 80).toLowerCase();
  if (pass.length > 100) return res.status(400).json({ message: 'Parol juda uzun' });

  let candidates = root.businesses.filter((b) => b.data.users.some((u) => String(u.username).toLowerCase() === uname.toLowerCase()));
  if (workspace) candidates = candidates.filter((b) => b.slug.toLowerCase() === workspace || b.id === workspace);
  if (!candidates.length) return res.status(401).json({ message: 'Login, parol yoki biznes kodi noto\u2018g\u2018ri' });
  if (candidates.length > 1) return res.status(400).json({ message: 'Bu login bir nechta biznesda mavjud. Biznes kodini kiriting', code: 'WORKSPACE_REQUIRED' });
  const tenant = candidates[0];
  if (tenant.status !== 'active') return res.status(403).json({ message: 'Biznes faol emas. Platform administrator bilan bog\u2018laning' });
  const user = tenant.data.users.find((u) => String(u.username).toLowerCase() === uname.toLowerCase());
  if (!user || !user.active || !(await bcrypt.compare(pass, user.passwordHash))) {
    return res.status(401).json({ message: 'Login, parol yoki biznes kodi noto\u2018g\u2018ri' });
  }
  loginAttempts.delete(key);
  runTenant(tenant, user, () => log(user, 'LOGIN', 'auth', user.id));
  const token = jwt.sign({
    sub: user.id, tenantId: tenant.id, role: user.role, scope: 'business',
    name: user.name, username: user.username
  }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: safeUser(user), business: publicBusiness(tenant) });
});

app.post('/api/platform/bootstrap', onboardingLimit, async (req, res) => {
  const expected = String(process.env.PLATFORM_BOOTSTRAP_TOKEN || '');
  if (!expected || expected.length < 16) return res.status(404).json({ message: 'Platform bootstrap sozlanmagan' });
  if (!safeEqual(req.headers['x-platform-bootstrap-token'], expected)) return res.status(403).json({ message: 'Bootstrap token noto\u2018g\u2018ri' });
  if (root.platformUsers.length) return res.status(409).json({ message: 'Platform administrator allaqachon mavjud' });
  const account = validateAccount({ name: req.body.name, username: req.body.username, password: req.body.password });
  if (account.error) return res.status(400).json({ message: account.error });
  const user = {
    id: id('padmin'), name: account.name, username: account.username,
    passwordHash: await bcrypt.hash(account.password, 12),
    role: 'PLATFORM_ADMIN', active: true, createdAt: new Date().toISOString()
  };
  root.platformUsers.push(user);
  logPlatform(user, 'CREATE', 'platform_admin', user.id);
  const token = jwt.sign({ sub: user.id, scope: 'platform', role: 'PLATFORM_ADMIN', name: user.name, username: user.username }, SECRET, { expiresIn: '12h' });
  res.status(201).json({ token, user: safeUser(user) });
});

app.post('/api/platform/auth/login', async (req, res) => {
  const key = 'platform:' + (req.ip || 'ip') + ':' + String(req.body?.username || '').toLowerCase();
  const rec = failCount(key);
  if (rec.count > 10 && Date.now() < rec.reset) return res.status(429).json({ message: 'Juda ko\u2018p urinish. 15 daqiqadan keyin qaytadan urinib ko\u2018ring' });
  const uname = trim(req.body.username, 60);
  const pass = String(req.body.password || '');
  const user = root.platformUsers.find((u) => String(u.username).toLowerCase() === uname.toLowerCase());
  if (!user || !user.active || user.role !== 'PLATFORM_ADMIN' || !(await bcrypt.compare(pass, user.passwordHash))) {
    return res.status(401).json({ message: 'Platform login yoki parol noto\u2018g\u2018ri' });
  }
  loginAttempts.delete(key);
  const token = jwt.sign({ sub: user.id, scope: 'platform', role: 'PLATFORM_ADMIN', name: user.name, username: user.username }, SECRET, { expiresIn: '12h' });
  logPlatform(user, 'LOGIN', 'platform_admin', user.id);
  res.json({ token, user: safeUser(user) });
});

app.get('/api/platform/me', platformAuth, (req, res) => {
  res.json({ user: safeUser(req.platformUser), scope: 'platform' });
});

app.get('/api/platform/businesses', platformAuth, (req, res) => {
  res.json(root.businesses.map(platformBusinessView));
});

app.get('/api/platform/businesses/:id', platformAuth, (req, res) => {
  const business = root.businesses.find((b) => b.id === req.params.id);
  if (!business) return res.status(404).json({ message: 'Biznes topilmadi' });
  res.json(platformBusinessView(business));
});

app.post('/api/platform/businesses', platformAuth, async (req, res) => {
  if (singleTenantMode && root.businesses.length) return res.status(403).json({ message: 'Bu o\u2018rnatma bitta kompaniya rejimida ishlaydi' });
  const business = validateBusinessBody(req.body);
  if (business.error) return res.status(400).json({ message: business.error });
  if (!slugAvailable(business.slug)) return res.status(409).json({ message: 'Bu biznes kodi band' });
  const plan = trim(req.body.plan || 'trial', 20) || 'trial';
  if (!PLAN_BY_ID.has(plan)) return res.status(400).json({ message: 'Tarif noto\u2018g\u2018ri' });
  let owner = null;
  if (req.body.username || req.body.password || req.body.name || req.body.adminName) {
    const account = validateAccount(req.body);
    if (account.error) return res.status(400).json({ message: account.error });
    owner = account;
  }
  const tenant = await createBusiness({ ...business, plan, owner });
  logPlatform(req.platformUser, 'CREATE', 'business', tenant.id, tenant.slug);
  res.status(201).json(platformBusinessView(tenant));
});

app.patch('/api/platform/businesses/:id', platformAuth, (req, res) => {
  const business = root.businesses.find((b) => b.id === req.params.id);
  if (!business) return res.status(404).json({ message: 'Biznes topilmadi' });
  if (req.body.name !== undefined) {
    const name = trim(req.body.name, 80);
    if (name.length < 2) return res.status(400).json({ message: 'Biznes nomi noto\u2018g\u2018ri' });
    business.name = name;
    business.data.settings.companyName = name;
  }
  if (req.body.slug !== undefined) {
    const slug = slugify(req.body.slug);
    if (!slug || RESERVED_SLUGS.has(slug)) return res.status(400).json({ message: 'Biznes kodi noto\u2018g\u2018ri' });
    if (!slugAvailable(slug, business.id)) return res.status(409).json({ message: 'Bu biznes kodi band' });
    business.slug = slug;
  }
  if (req.body.status !== undefined) {
    if (!TENANT_STATUSES.includes(req.body.status)) return res.status(400).json({ message: 'Holat noto\u2018g\u2018ri' });
    business.status = req.body.status;
    business.subscription.status = req.body.status === 'active' ? 'active' : req.body.status;
  }
  if (req.body.plan !== undefined) {
    if (!PLAN_BY_ID.has(req.body.plan)) return res.status(400).json({ message: 'Tarif noto\u2018g\u2018ri' });
    business.plan = req.body.plan;
    business.subscription.planId = req.body.plan;
  }
  business.updatedAt = new Date().toISOString();
  logPlatform(req.platformUser, 'UPDATE', 'business', business.id, business.slug);
  res.json(platformBusinessView(business));
});

app.get('/api/me', auth, (req, res) => {
  res.json({
    user: req.user,
    business: publicBusiness(req.tenant),
    permissions: ROLE_PERMISSIONS[req.user.role] || [],
    scope: 'business'
  });
});

app.patch('/api/me/password', auth, async (req, res) => {
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
  const current = String(req.body.currentPassword || '');
  const next = String(req.body.newPassword || '');
  if (next.length < 8 || next.length > 100) return res.status(400).json({ message: 'Yangi parol 8-100 belgi bo\u2018lishi kerak' });
  if (!(await bcrypt.compare(current, user.passwordHash))) return res.status(403).json({ message: 'Joriy parol noto\u2018g\u2018ri' });
  user.passwordHash = await bcrypt.hash(next, 12);
  save();
  log(req.user, 'UPDATE', 'password', user.id);
  res.json({ ok: true });
});

app.get('/api/state', auth, (req, res) => {
  res.json({ ...publicState(), business: publicBusiness(req.tenant) });
});

app.get('/api/business/settings', auth, (req, res) => {
  res.json({ business: publicBusiness(req.tenant), settings: db.settings });
});

app.get('/api/users', auth, admin, (req, res) => res.json(db.users.map(safeUser)));
app.post('/api/users', auth, admin, async (req, res) => {
  const { name, username, password, role = 'CASHIER' } = req.body;
  if (!name || !username || !password || password.length < 8) return res.status(400).json({ message: 'Ism, login va kamida 8 belgili parol kerak' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ message: 'Rol noto\u2018g\u2018ri' });
  if (db.users.some((x) => x.username.toLowerCase() === String(username).trim().toLowerCase())) return res.status(409).json({ message: 'Bu login band' });
  const user = {
    id: id('usr'), name: String(name).trim(), username: String(username).trim(),
    passwordHash: await bcrypt.hash(password, 12), role, active: true,
    createdAt: new Date().toISOString(), tenantId: req.tenant.id
  };
  db.users.push(user);
  save();
  log(req.user, 'CREATE', 'user', user.id, user.username);
  res.json(safeUser(user));
});

app.patch('/api/users/:id', auth, admin, async (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Topilmadi' });
  if (req.body.name) user.name = String(req.body.name).trim();
  if (req.body.role) {
    if (!VALID_ROLES.includes(req.body.role)) return res.status(400).json({ message: 'Rol noto\u2018g\u2018ri' });
    user.role = req.body.role;
  }
  if (typeof req.body.active === 'boolean') user.active = req.body.active;
  if (req.body.password) user.passwordHash = await bcrypt.hash(req.body.password, 12);
  save();
  log(req.user, 'UPDATE', 'user', user.id);
  res.json(safeUser(user));
});

function crud(route, key, section, fields, numeric = []) {
  const MAX = { name: 120, category: 80, unit: 20, phone: 40, address: 200, role: 60, note: 400 };
  app.get('/api/' + route, auth, can(section), (req, res) => res.json(db[key] || []));
  app.post('/api/' + route, auth, can(section), (req, res) => {
    if (!req.body?.name && fields.includes('name')) return res.status(400).json({ message: 'Nom kerak' });
    const x = { id: id(key.slice(0, 3)), tenantId: req.tenant.id, createdAt: new Date().toISOString() };
    for (const f of fields) {
      if (numeric.includes(f)) { x[f] = Math.max(0, money(req.body[f])); continue; }
      x[f] = Array.isArray(req.body[f]) ? req.body[f] : trim(req.body[f], MAX[f] || 200);
    }
    db[key].push(x);
    save();
    log(req.user, 'CREATE', key, x.id);
    res.json(x);
  });
  app.put('/api/' + route + '/:id', auth, can(section), (req, res) => {
    const x = db[key].find((v) => v.id === req.params.id);
    if (!x) return res.status(404).json({ message: 'Topilmadi' });
    for (const f of Object.keys(req.body || {})) {
      if (f === 'id' || f === 'createdAt' || f === 'tenantId' || f === 'businessId' || f === 'passwordHash') continue;
      if (numeric.includes(f)) { if (f !== 'debt') x[f] = Math.max(0, money(req.body[f])); else x[f] = money(req.body[f]); continue; }
      if (!Array.isArray(req.body[f]) && typeof req.body[f] !== 'boolean') x[f] = String(req.body[f]).slice(0, MAX[f] || 200).trim();
      else x[f] = req.body[f];
    }
    save();
    log(req.user, 'UPDATE', key, x.id);
    res.json(x);
  });
  app.delete('/api/' + route + '/:id', auth, can(section), (req, res) => {
    const i = db[key].findIndex((v) => v.id === req.params.id);
    if (i < 0) return res.status(404).json({ message: 'Topilmadi' });
    const [x] = db[key].splice(i, 1);
    save();
    log(req.user, 'DELETE', key, x.id);
    res.json({ ok: true });
  });
}
crud('products', 'products', 'products', ['name', 'category', 'unit', 'buy', 'sell', 'stock', 'min'], ['buy', 'sell', 'stock', 'min']);
crud('customers', 'customers', 'customers', ['name', 'phone', 'address', 'debt'], ['debt']);
crud('suppliers', 'suppliers', 'suppliers', ['name', 'phone', 'address', 'debt'], ['debt']);
crud('workers', 'workers', 'workers', ['name', 'role', 'salary', 'payday', 'phone'], ['salary', 'payday']);

app.get('/api/debts', auth, can('debts'), (req, res) => {
  const c = db.customers.map((x) => ({ ...x, paid: db.sales.filter((s) => s.customerId === x.id && s.payment !== 'Qarz').reduce((a, s) => a + s.total, 0) }));
  res.json(c);
});

app.post('/api/sales', auth, can('sales'), (req, res) => {
  const { productId } = req.body;
  const payment = ['Naqd', 'Karta', 'Qarz'].includes(req.body.payment) ? req.body.payment : 'Naqd';
  const customerId = trim(req.body.customerId, 60);
  const date = String(req.body.date || today()).slice(0, 10);
  const note = trim(req.body.note, 400);
  const p = db.products.find((x) => x.id === productId);
  if (!p) return res.status(400).json({ message: 'Mahsulot topilmadi' });
  const q = money(req.body.qty);
  if (q <= 0 || p.stock < q) return res.status(400).json({ message: 'Qoldiq yetarli emas' });
  if (payment === 'Qarz' && !db.customers.some((c) => c.id === customerId)) return res.status(400).json({ message: 'Qarzga sotish uchun mijoz tanlash shart' });
  const total = q * money(p.sell);
  const sale = { id: id('sal'), tenantId: req.tenant.id, date, productId, qty: q, sell: p.sell, total, payment, customerId: customerId || '', note, createdAt: new Date().toISOString() };
  p.stock -= q;
  db.sales.push(sale);
  if (payment === 'Qarz') {
    const c = db.customers.find((x) => x.id === customerId);
    if (c) c.debt = money(c.debt) + total;
  }
  db.cash.push({ id: id('cash'), tenantId: req.tenant.id, date: sale.date, type: 'income', amount: payment === 'Qarz' ? 0 : total, source: 'sale', refId: sale.id, note });
  save();
  log(req.user, 'CREATE', 'sale', sale.id);
  res.json(sale);
});

app.delete('/api/sales/:id', auth, can('sales'), (req, res) => {
  const i = db.sales.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ message: 'Topilmadi' });
  const [sale] = db.sales.splice(i, 1);
  const p = db.products.find((x) => x.id === sale.productId);
  if (p) p.stock = money(p.stock) + money(sale.qty);
  if (sale.payment === 'Qarz' && sale.customerId) {
    const c = db.customers.find((x) => x.id === sale.customerId);
    if (c) c.debt = Math.max(0, money(c.debt) - money(sale.total));
  }
  const cashIdx = db.cash.findIndex((x) => x.refId === sale.id && x.source === 'sale');
  if (cashIdx >= 0) db.cash.splice(cashIdx, 1);
  save();
  log(req.user, 'DELETE', 'sale', sale.id);
  res.json({ ok: true });
});

app.post('/api/purchases', auth, can('purchases'), (req, res) => {
  const { productId } = req.body;
  const supplierId = trim(req.body.supplierId, 60);
  const date = String(req.body.date || today()).slice(0, 10);
  const note = trim(req.body.note, 400);
  const p = db.products.find((x) => x.id === productId);
  if (!p) return res.status(400).json({ message: 'Mahsulot topilmadi' });
  const q = money(req.body.qty), price = money(req.body.buy);
  if (q <= 0 || price < 0) return res.status(400).json({ message: 'Miqdor yoki narx noto\u2018g\u2018ri' });
  p.stock += q;
  p.buy = price;
  const purchase = { id: id('pur'), tenantId: req.tenant.id, date, productId, qty: q, buy: price, total: q * price, supplierId: supplierId || '', note, createdAt: new Date().toISOString() };
  db.purchases.push(purchase);
  db.cash.push({ id: id('cash'), tenantId: req.tenant.id, date: purchase.date, type: 'expense', amount: purchase.total, source: 'purchase', refId: purchase.id, note });
  save();
  log(req.user, 'CREATE', 'purchase', purchase.id);
  res.json(purchase);
});

app.post('/api/expenses', auth, can('expenses'), (req, res) => {
  const amount = money(req.body.amount);
  if (amount <= 0) return res.status(400).json({ message: 'Summa noto\u2018g\u2018ri' });
  const expense = {
    id: id('exp'), tenantId: req.tenant.id, date: String(req.body.date || today()).slice(0, 10),
    category: trim(req.body.category, 80) || 'Boshqa', amount, note: trim(req.body.note, 400),
    createdAt: new Date().toISOString()
  };
  db.expenses.push(expense);
  db.cash.push({ id: id('cash'), tenantId: req.tenant.id, date: expense.date, type: 'expense', amount: expense.amount, source: 'expense', refId: expense.id, note: expense.note });
  save();
  log(req.user, 'CREATE', 'expense', expense.id);
  res.json(expense);
});

app.put('/api/expenses/:id', auth, can('expenses'), (req, res) => {
  const i = db.expenses.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ message: 'Topilmadi' });
  const old = db.expenses[i];
  const amount = money(req.body.amount) > 0 ? money(req.body.amount) : old.amount;
  const upd = { ...old, date: String(req.body.date || old.date || today()).slice(0, 10), category: trim(req.body.category, 80) || old.category || 'Boshqa', amount, note: trim(req.body.note, 400) };
  db.expenses[i] = upd;
  const ci = db.cash.findIndex((c) => c.refId === old.id && c.source === 'expense');
  if (ci >= 0) { db.cash[ci].date = upd.date; db.cash[ci].amount = upd.amount; db.cash[ci].note = upd.note; }
  save();
  log(req.user, 'UPDATE', 'expense', old.id);
  res.json(upd);
});

app.delete('/api/expenses/:id', auth, can('expenses'), (req, res) => {
  const i = db.expenses.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ message: 'Topilmadi' });
  const [expense] = db.expenses.splice(i, 1);
  const ci = db.cash.findIndex((c) => c.refId === expense.id && c.source === 'expense');
  if (ci >= 0) db.cash.splice(ci, 1);
  save();
  log(req.user, 'DELETE', 'expense', expense.id);
  res.json({ ok: true });
});

app.post('/api/customer-payments', auth, can('dpay'), (req, res) => {
  const c = db.customers.find((x) => x.id === req.body.customerId);
  const amount = money(req.body.amount);
  if (!c || amount <= 0) return res.status(400).json({ message: 'Mijoz yoki summa noto\u2018g\u2018ri' });
  c.debt = Math.max(0, money(c.debt) - amount);
  const payment = {
    id: id('dpay'), tenantId: req.tenant.id, date: String(req.body.date || today()).slice(0, 10),
    customerId: c.id, amount, note: trim(req.body.note, 400), createdAt: new Date().toISOString()
  };
  db.payments.push(payment);
  db.cash.push({ id: id('cash'), tenantId: req.tenant.id, date: payment.date, type: 'income', amount, source: 'debt_payment', refId: payment.id, note: payment.note });
  save();
  log(req.user, 'CREATE', 'debt_payment', payment.id, c.name);
  res.json(payment);
});

app.delete('/api/customer-payments/:id', auth, can('dpay'), (req, res) => {
  const i = db.payments.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ message: 'Topilmadi' });
  const [payment] = db.payments.splice(i, 1);
  const c = db.customers.find((x) => x.id === payment.customerId);
  if (c) c.debt = money(c.debt) + money(payment.amount);
  const ci = db.cash.findIndex((x) => x.refId === payment.id && x.source === 'debt_payment');
  if (ci >= 0) db.cash.splice(ci, 1);
  save();
  log(req.user, 'DELETE', 'debt_payment', payment.id);
  res.json({ ok: true });
});

app.post('/api/payroll', auth, can('payroll'), (req, res) => {
  const w = db.workers.find((x) => x.id === req.body.workerId);
  const amount = money(req.body.amount);
  if (!w || amount <= 0) return res.status(400).json({ message: 'Ishchi yoki summa noto\u2018g\u2018ri' });
  const date = String(req.body.date || today()).slice(0, 10);
  const payment = {
    id: id('pay'), tenantId: req.tenant.id, workerId: w.id, date,
    month: trim(req.body.month, 10) || date.slice(0, 7), amount,
    type: ['salary', 'advance'].includes(req.body.type) ? req.body.type : 'salary',
    note: trim(req.body.note, 400), createdAt: new Date().toISOString()
  };
  db.payroll.push(payment);
  db.cash.push({ id: id('cash'), tenantId: req.tenant.id, date: payment.date, type: 'expense', amount, source: 'payroll', refId: payment.id, note: w.name });
  save();
  log(req.user, 'CREATE', 'payroll', payment.id, w.name);
  res.json(payment);
});

app.put('/api/payroll/:id', auth, can('payroll'), (req, res) => {
  const i = db.payroll.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ message: 'Topilmadi' });
  const old = db.payroll[i];
  const w = db.workers.find((x) => x.id === req.body.workerId);
  const amount = money(req.body.amount);
  if (!w || amount <= 0) return res.status(400).json({ message: 'Ishchi yoki summa noto\u2018g\u2018ri' });
  const date = String(req.body.date || old.date || today()).slice(0, 10);
  const upd = {
    ...old, workerId: w.id, date,
    month: (req.body.month && trim(req.body.month, 10)) || date.slice(0, 7), amount,
    type: ['salary', 'advance'].includes(req.body.type) ? req.body.type : old.type,
    note: req.body.note !== undefined ? trim(req.body.note, 400) : (old.note || '')
  };
  db.payroll[i] = upd;
  const ci = db.cash.findIndex((c) => c.refId === old.id && c.source === 'payroll');
  if (ci >= 0) { db.cash[ci].date = date; db.cash[ci].amount = amount; db.cash[ci].note = w.name; }
  save();
  log(req.user, 'UPDATE', 'payroll', old.id, w.name);
  res.json(upd);
});

app.delete('/api/payroll/:id', auth, can('payroll'), (req, res) => {
  const i = db.payroll.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ message: 'Topilmadi' });
  const [payment] = db.payroll.splice(i, 1);
  const ci = db.cash.findIndex((c) => c.refId === payment.id && c.source === 'payroll');
  if (ci >= 0) db.cash.splice(ci, 1);
  save();
  log(req.user, 'DELETE', 'payroll', payment.id);
  res.json({ ok: true });
});

app.get('/api/dashboard', auth, can('dashboard'), (req, res) => {
  const t = today();
  const sales = db.sales.filter((x) => x.date === t);
  const revenue = sales.reduce((a, x) => a + x.total, 0);
  const cost = sales.reduce((a, x) => { const p = db.products.find((p) => p.id === x.productId); return a + x.qty * money(p?.buy); }, 0);
  const expense = db.expenses.filter((x) => x.date === t).reduce((a, x) => a + x.amount, 0);
  const debt = db.customers.reduce((a, x) => a + money(x.debt), 0);
  res.json({
    today: t, revenue, cost, expense, profit: revenue - cost - expense,
    stockValue: db.products.reduce((a, p) => a + money(p.stock) * money(p.buy), 0),
    debt, products: db.products.length, customers: db.customers.length, workers: db.workers.length,
    lowStock: db.products.filter((p) => money(p.stock) <= money(p.min))
  });
});

app.get('/api/stats', auth, can('reports'), (req, res) => {
  const period = ['day', 'week', 'month', 'year'].includes(req.query.period) ? req.query.period : 'month';
  const from = String(req.query.from || ''), to = String(req.query.to || '');
  const pCost = (s) => { const p = db.products.find((p) => p.id === s.productId); return s.qty * money(p?.buy); };
  const inRange = (x) => (!from || x.date >= from) && (!to || x.date <= to);
  const sales = db.sales.filter(inRange), expenses = db.expenses.filter(inRange), payroll = db.payroll.filter(inRange), purchases = db.purchases.filter(inRange);
  const now = new Date();
  const fmt = (d) => d.toLocaleDateString('en-CA');
  const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
  const startOfWeek = (d) => { const t = new Date(d); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); t.setHours(0, 0, 0, 0); return t; };
  const labels = [];
  if (period === 'day') { for (let i = 29; i >= 0; i--) labels.push(fmt(addDays(now, -i))); }
  else if (period === 'week') { for (let i = 7; i >= 0; i--) labels.push(fmt(addDays(startOfWeek(now), -7 * i))); }
  else if (period === 'month') { for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); labels.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); } }
  else { for (let i = 4; i >= 0; i--) labels.push(String(now.getFullYear() - i)); }
  const keyOf = (x) => period === 'day' ? x.date : period === 'week' ? fmt(startOfWeek(new Date(x.date))) : period === 'month' ? String(x.date).slice(0, 7) : String(x.date).slice(0, 4);
  const idx = {};
  labels.forEach((l, i) => idx[l] = i);
  const revenue = labels.map(() => 0), cost = labels.map(() => 0), expense = labels.map(() => 0), pay = labels.map(() => 0), purch = labels.map(() => 0);
  for (const s of sales) { const i = idx[keyOf(s)]; if (i === undefined) continue; revenue[i] += s.total; cost[i] += pCost(s); }
  for (const e of expenses) { const i = idx[keyOf(e)]; if (i === undefined) continue; expense[i] += e.amount; }
  for (const p of payroll) { const i = idx[keyOf(p)]; if (i === undefined) continue; pay[i] += p.amount; }
  for (const p of purchases) { const i = idx[keyOf(p)]; if (i === undefined) continue; purch[i] += p.total; }
  const profit = labels.map((_, i) => revenue[i] - cost[i] - expense[i] - pay[i]);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const byProd = {};
  for (const s of sales) { byProd[s.productId] = byProd[s.productId] || { qty: 0, rev: 0 }; byProd[s.productId].qty += s.qty; byProd[s.productId].rev += s.total; }
  const topProducts = Object.entries(byProd).map(([pid, v]) => ({ product: db.products.find((p) => p.id === pid)?.name || '\u2014', qty: v.qty, revenue: v.rev })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const byCust = {};
  for (const s of sales) { if (!s.customerId) continue; byCust[s.customerId] = (byCust[s.customerId] || 0) + s.total; }
  const topCustomers = Object.entries(byCust).map(([cid, v]) => ({ customer: db.customers.find((c) => c.id === cid)?.name || '\u2014', revenue: v })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  res.json({ period, labels, revenue, cost, expense, payroll: pay, purchases: purch, profit, totals: { revenue: sum(revenue), cost: sum(cost), expense: sum(expense), payroll: sum(pay), purchases: sum(purch), profit: sum(profit) }, topProducts, topCustomers });
});

app.get('/api/reports', auth, can('reports'), (req, res) => {
  const from = String(req.query.from || '1900-01-01'), to = String(req.query.to || '2999-12-31');
  const between = (x) => x.date >= from && x.date <= to;
  const sales = db.sales.filter(between), purchases = db.purchases.filter(between), expenses = db.expenses.filter(between), payroll = db.payroll.filter(between);
  const revenue = sales.reduce((a, x) => a + x.total, 0);
  const cost = sales.reduce((a, x) => { const p = db.products.find((p) => p.id === x.productId); return a + x.qty * money(p?.buy); }, 0);
  const expense = expenses.reduce((a, x) => a + x.amount, 0);
  const pay = payroll.reduce((a, x) => a + x.amount, 0);
  res.json({ from, to, revenue, cost, expense, payroll: pay, purchases: purchases.reduce((a, x) => a + x.total, 0), profit: revenue - cost - expense - pay, sales, purchases, expenses, payroll });
});

app.get('/api/audit', auth, admin, (req, res) => res.json(db.audit));
app.get('/api/cash', auth, can('cash'), (req, res) => {
  const income = db.cash.filter((x) => x.type === 'income').reduce((a, x) => a + x.amount, 0);
  const expense = db.cash.filter((x) => x.type === 'expense').reduce((a, x) => a + x.amount, 0);
  res.json({ openingCash: money(db.settings.openingCash), income, expense, balance: money(db.settings.openingCash) + income - expense, items: db.cash });
});

app.post('/api/raw-materials', auth, can('rawmat'), (req, res) => {
  const name = trim(req.body.name, 120);
  if (!name) return res.status(400).json({ message: 'Xomashyo nomi kiritilmadi' });
  const qty = money(req.body.qty), price = money(req.body.price);
  if (qty <= 0) return res.status(400).json({ message: 'Miqdor noto\u2018g\u2018ri' });
  const date = String(req.body.date || today()).slice(0, 10);
  const material = { id: id('raw'), tenantId: req.tenant.id, date, name, qty, price, total: qty * price, unit: trim(req.body.unit, 20) || 'kg', note: trim(req.body.note, 400), createdAt: new Date().toISOString() };
  db.rawMaterials.push(material);
  db.cash.push({ id: id('cash'), tenantId: req.tenant.id, date: material.date, type: 'expense', amount: material.total, source: 'raw_material', refId: material.id, note: name });
  save();
  log(req.user, 'CREATE', 'raw_material', material.id, name);
  res.json(material);
});

app.delete('/api/raw-materials/:id', auth, can('rawmat'), (req, res) => {
  const i = db.rawMaterials.findIndex((v) => v.id === req.params.id);
  if (i < 0) return res.status(404).json({ message: 'Topilmadi' });
  const [material] = db.rawMaterials.splice(i, 1);
  const ci = db.cash.findIndex((c) => c.refId === material.id && c.source === 'raw_material');
  if (ci >= 0) db.cash.splice(ci, 1);
  save();
  log(req.user, 'DELETE', 'raw_material', material.id);
  res.json({ ok: true });
});

app.put('/api/settings', auth, admin, (req, res) => {
  const body = req.body || {};
  const nextName = body.companyName !== undefined ? body.companyName : body.name;
  if (nextName !== undefined) {
    const name = trim(nextName, 80);
    if (name.length < 2) return res.status(400).json({ message: 'Biznes nomi noto\u2018g\u2018ri' });
    db.settings.companyName = name;
    req.tenant.name = name;
  }
  if (body.logo !== undefined) {
    const logo = validLogo(body.logo);
    if (logo === null) return res.status(400).json({ message: 'Logo https URL yoki PNG/JPEG/WebP/GIF data URL bo\u2018lishi kerak' });
    db.settings.logo = logo;
  }
  if (body.currency !== undefined) {
    const currency = trim(body.currency, 10).toUpperCase();
    if (!CURRENCIES.has(currency)) return res.status(400).json({ message: 'Valyuta qo\u2018llab-quvvatlanmaydi' });
    db.settings.currency = currency;
  }
  if (body.locale !== undefined) {
    const locale = trim(body.locale, 5).toLowerCase();
    if (!LOCALES.has(locale)) return res.status(400).json({ message: 'Til qo\u2018llab-quvvatlanmaydi' });
    db.settings.locale = locale;
  }
  if (body.openingCash !== undefined) db.settings.openingCash = Math.max(0, money(body.openingCash));
  save();
  log(req.user, 'UPDATE', 'settings', req.tenant.id);
  res.json(db.settings);
});

function localBackupPrefix(tenant) {
  return 'tenant-' + safeKeyPart(tenant.id) + '-';
}

function forceLocalBackup(tenant) {
  try {
    if (!fs.existsSync(BACKUPDIR)) fs.mkdirSync(BACKUPDIR, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const prefix = localBackupPrefix(tenant);
    let f = path.join(BACKUPDIR, prefix + stamp + '.json'), n = 1;
    while (fs.existsSync(f)) f = path.join(BACKUPDIR, prefix + stamp + '-' + (n++) + '.json');
    fs.writeFileSync(f, JSON.stringify(tenant.data, null, 2));
    return path.basename(f);
  } catch (e) {
    console.error('Lokal backup xatosi:', e.message);
    return null;
  }
}

function listLocalBackups(tenant) {
  const prefix = localBackupPrefix(tenant);
  try {
    if (!fs.existsSync(BACKUPDIR)) return [];
    return fs.readdirSync(BACKUPDIR)
      .filter((f) => f.startsWith(prefix) && /\.json$/.test(f))
      .map((f) => {
        const st = fs.statSync(path.join(BACKUPDIR, f));
        return { file: f, date: f.slice(prefix.length).replace(/\.json$/, ''), size: st.size };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    console.error('Lokal backup ro\u2018yxat xatosi:', e.message);
    return [];
  }
}

app.get('/api/backups', auth, admin, async (req, res) => {
  const local = listLocalBackups(req.tenant);
  const remote = await listRemoteBackups(req.tenant.id);
  res.json({ local, remote });
});

app.post('/api/backup', auth, admin, async (req, res) => {
  save();
  const localFile = forceLocalBackup(req.tenant);
  const remoteKey = await backupRemote(req.tenant.id, req.tenant.data);
  log(req.user, 'CREATE', 'backup', req.tenant.id, remoteKey || localFile);
  res.json({ ok: true, localFile, remoteKey, at: new Date().toISOString() });
});

app.get('/api/backup/download', auth, admin, (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename=' + safeKeyPart(req.tenant.slug) + '-backup-' + new Date().toISOString().slice(0, 10) + '.json');
  res.type('application/json').send(JSON.stringify(req.tenant.data, null, 2));
});

function snapshotTenantIds(snapshot) {
  const ids = new Set();
  if (typeof snapshot.tenantId === 'string' && snapshot.tenantId) ids.add(snapshot.tenantId);
  for (const key of BUSINESS_COLLECTIONS) {
    if (!Array.isArray(snapshot[key])) continue;
    for (const record of snapshot[key]) {
      if (record && typeof record.tenantId === 'string' && record.tenantId) ids.add(record.tenantId);
    }
  }
  return ids;
}

function sanitizeSnapshot(snapshot, tenant, currentUser) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Yaroqsiz backup');
  for (const key of BUSINESS_COLLECTIONS) {
    if (!Array.isArray(snapshot[key])) throw new Error('Yaroqsiz backup: ' + key);
  }
  const ids = snapshotTenantIds(snapshot);
  if ([...ids].some((value) => value !== tenant.id)) throw new Error('Bu backup boshqa biznesga tegishli');
  const clean = emptyBusinessData();
  for (const key of BUSINESS_COLLECTIONS) {
    clean[key] = snapshot[key]
      .filter((record) => record && typeof record === 'object' && !Array.isArray(record))
      .map((record) => ({ ...record, tenantId: tenant.id }));
  }
  clean.users = clean.users.filter((u) => u.username && u.passwordHash && VALID_ROLES.includes(u.role));
  if (!clean.users.some((u) => u.id === currentUser.id && u.role === 'ADMIN' && u.active)) {
    throw new Error('Backup joriy biznes administratorini o\u2018z ichiga olmaydi');
  }
  const sourceSettings = snapshot.settings && typeof snapshot.settings === 'object' && !Array.isArray(snapshot.settings) ? snapshot.settings : {};
  const settings = defaultBusinessSettings();
  settings.companyName = trim(sourceSettings.companyName, 80) || tenant.name;
  const restoredLogo = validLogo(sourceSettings.logo);
  settings.logo = restoredLogo === null ? '' : restoredLogo;
  settings.currency = CURRENCIES.has(String(sourceSettings.currency).toUpperCase()) ? String(sourceSettings.currency).toUpperCase() : 'UZS';
  settings.locale = LOCALES.has(sourceSettings.locale) ? sourceSettings.locale : 'uz';
  settings.openingCash = Math.max(0, money(sourceSettings.openingCash));
  clean.settings = settings;
  clean.tenantId = tenant.id;
  stampBusinessData(clean, tenant.id);
  return clean;
}

app.post('/api/backup/restore', auth, admin, async (req, res) => {
  let snapshot = null, label = '';
  try {
    if (req.body.snapshot) {
      snapshot = typeof req.body.snapshot === 'string' ? JSON.parse(req.body.snapshot) : req.body.snapshot;
      label = 'snapshot';
    } else if (req.body.key) {
      snapshot = await fetchRemoteBackup(req.tenant.id, String(req.body.key));
      label = String(req.body.key);
      if (!snapshot) return res.status(404).json({ message: 'Backup topilmadi' });
    } else if (req.body.filename) {
      const filename = path.basename(String(req.body.filename));
      if (!filename.startsWith(localBackupPrefix(req.tenant))) return res.status(404).json({ message: 'Backup topilmadi' });
      const file = path.join(BACKUPDIR, filename);
      if (fs.existsSync(file)) { snapshot = JSON.parse(fs.readFileSync(file, 'utf8')); label = filename; }
      if (!snapshot) return res.status(404).json({ message: 'Backup topilmadi' });
    }
  } catch (e) {
    return res.status(400).json({ message: e.message || 'Backup fayli buzilgan yoki yaroqsiz' });
  }
  if (!snapshot) return res.status(400).json({ message: 'Yaroqsiz backup' });
  let clean;
  try {
    clean = sanitizeSnapshot(snapshot, req.tenant, req.user);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
  for (const key of BUSINESS_COLLECTIONS) req.tenant.data[key] = clean[key];
  req.tenant.data.settings = clean.settings;
  req.tenant.data.tenantId = req.tenant.id;
  req.tenant.name = clean.settings.companyName;
  save();
  log(req.user, 'RESTORE', 'backup', req.tenant.id, label);
  backedDates.clear();
  res.json({ ok: true, restored: label });
});

app.get('/api/export/xlsx', auth, can('reports'), (req, res) => {
  const wb = XLSX.utils.book_new();
  for (const [key, value] of Object.entries(publicState())) {
    if (Array.isArray(value)) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(value), key.slice(0, 31));
  }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=' + safeKeyPart(req.tenant.slug) + '-hisobot.xlsx');
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buf);
});

app.get('/api/export/pdf', auth, can('reports'), (req, res) => {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=' + safeKeyPart(req.tenant.slug) + '-hisobot.pdf');
  doc.pipe(res);
  const currency = db.settings.currency || 'UZS';
  const locale = db.settings.locale === 'ru' ? 'ru-RU' : db.settings.locale === 'en' ? 'en-GB' : 'uz-UZ';
  const fmt = (n) => money(n).toLocaleString(locale) + ' ' + currency;
  doc.fontSize(20).text(db.settings.companyName, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Biznes hisobot');
  doc.moveDown();
  const revenue = db.sales.reduce((a, x) => a + x.total, 0);
  const cost = db.sales.reduce((a, x) => { const p = db.products.find((p) => p.id === x.productId); return a + x.qty * money(p?.buy); }, 0);
  const expense = db.expenses.reduce((a, x) => a + x.amount, 0);
  const pay = db.payroll.reduce((a, x) => a + x.amount, 0);
  const stock = db.products.reduce((a, p) => a + money(p.stock) * money(p.buy), 0);
  const debt = db.customers.reduce((a, c) => a + money(c.debt), 0);
  doc.text(`Jami sotuv: ${fmt(revenue)}`);
  doc.text(`Tannarxi: ${fmt(cost)}`);
  doc.text(`Rasxodlar: ${fmt(expense)}`);
  doc.text(`Oyliklar: ${fmt(pay)}`);
  doc.text(`Jami foyda: ${fmt(revenue - cost - expense - pay)}`);
  doc.text(`Ombor qiymati: ${fmt(stock)}`);
  doc.text(`Mijozlar qarzi: ${fmt(debt)}`);
  doc.text(`Biznes kodi: ${req.tenant.slug}`);
  doc.moveDown();
  doc.text(`Yaratilgan: ${new Date().toLocaleString(locale)}`);
  doc.end();
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON ma\u2019lumoti noto\u2018g\u2018ri' });
  if (err?.status && err.status >= 400 && err.status < 500) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Server xatosi' });
});
app.use('/api', (req, res) => res.status(404).json({ message: 'API yo\u2018nalishi topilmadi' }));
app.get('/{*splat}', (req, res) => res.sendFile(path.join(rootDir, 'public', 'index.html')));

export default app;
export { PORT };
