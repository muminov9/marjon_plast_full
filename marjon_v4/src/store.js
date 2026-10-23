import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const DATA = process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.join(root, 'data.json');
const BACKUPDIR = process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : path.join(root, 'backups');

export const BUSINESS_COLLECTIONS = [
  'users', 'products', 'customers', 'suppliers', 'rawMaterials', 'productions',
  'sales', 'purchases', 'expenses', 'payments', 'workers', 'payroll', 'cash', 'audit'
];

export const BUSINESS_ROLES = ['ADMIN', 'MANAGER', 'CASHIER'];
export const TENANT_STATUSES = ['active', 'suspended', 'canceled'];
export const PLAN_IDS = ['trial', 'legacy', 'starter', 'business'];

let pool = null;

export function defaultBusinessSettings() {
  return { companyName: 'Business', logo: '', currency: 'UZS', locale: 'uz', openingCash: 0 };
}

export function emptyBusinessData() {
  return {
    tenantId: '',
    users: [],
    products: [],
    customers: [],
    suppliers: [],
    rawMaterials: [],
    productions: [],
    sales: [],
    purchases: [],
    expenses: [],
    payments: [],
    workers: [],
    payroll: [],
    cash: [],
    settings: defaultBusinessSettings(),
    audit: []
  };
}

// Kept for backwards compatibility with older callers.
export function initial() {
  return emptyBusinessData();
}

export function initialRoot() {
  return {
    version: 2,
    platformUsers: [],
    platformAudit: [],
    businesses: [],
    updatedAt: new Date().toISOString()
  };
}

function makeId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
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

export function stampBusinessData(data, tenantId) {
  if (!data || !tenantId) return data;
  data.tenantId = tenantId;
  if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
    data.settings.tenantId = tenantId;
  }
  for (const key of BUSINESS_COLLECTIONS) {
    if (!Array.isArray(data[key])) data[key] = [];
    for (const record of data[key]) {
      if (record && typeof record === 'object') record.tenantId = tenantId;
    }
  }
  return data;
}

function normalizeSettings(settings, fallbackName) {
  const s = Object.assign(defaultBusinessSettings(), settings || {});
  s.companyName = String(s.companyName || fallbackName || 'Business').slice(0, 80);
  s.logo = typeof s.logo === 'string' ? s.logo.slice(0, 700000) : '';
  s.currency = typeof s.currency === 'string' ? s.currency.slice(0, 10) : 'UZS';
  s.locale = ['uz', 'ru', 'en'].includes(s.locale) ? s.locale : 'uz';
  s.openingCash = Number.isFinite(Number(s.openingCash)) ? Math.max(0, Number(s.openingCash)) : 0;
  return s;
}

function normalizeBusiness(business, index) {
  const source = business && typeof business === 'object' ? business : {};
  const id = typeof source.id === 'string' && source.id ? source.id : makeId('biz');
  const data = Object.assign(emptyBusinessData(), source.data || legacyDataFrom(source));
  for (const key of BUSINESS_COLLECTIONS) if (!Array.isArray(data[key])) data[key] = [];
  data.settings = normalizeSettings(data.settings, source.name);
  if (!Array.isArray(data.users)) data.users = [];

  // A business user must never carry the platform role.
  for (const user of data.users) {
    if (user && !BUSINESS_ROLES.includes(user.role)) {
      user.role = 'CASHIER';
      user.active = false;
    }
  }
  stampBusinessData(data, id);

  const name = String(source.name || data.settings.companyName || 'Business').slice(0, 80);
  data.settings.companyName = data.settings.companyName || name;
  const createdAt = source.createdAt || new Date().toISOString();
  const subscription = Object.assign({
    planId: source.plan || 'trial',
    status: source.status === 'suspended' ? 'suspended' : 'active',
    provider: null,
    externalCustomerId: null,
    externalSubscriptionId: null,
    currentPeriodEnd: null,
    trialEndsAt: null,
    cancelAtPeriodEnd: false
  }, source.subscription || {});

  return {
    ...source,
    id,
    slug: source.slug || slugify(name) || ('business-' + (index + 1)),
    name,
    status: TENANT_STATUSES.includes(source.status) ? source.status : 'active',
    plan: PLAN_IDS.includes(source.plan) ? source.plan : 'trial',
    subscription,
    createdAt,
    updatedAt: source.updatedAt || createdAt,
    data
  };
}

function legacyDataFrom(source) {
  const data = {};
  for (const key of BUSINESS_COLLECTIONS) if (Array.isArray(source[key])) data[key] = source[key];
  if (source.settings && typeof source.settings === 'object') data.settings = source.settings;
  return data;
}

function hasLegacyData(parsed) {
  return !!parsed && typeof parsed === 'object' &&
    (Array.isArray(parsed.users) || Array.isArray(parsed.products) || Array.isArray(parsed.sales) || !!parsed.settings);
}

export function normalizeRoot(parsed) {
  if (!parsed || typeof parsed !== 'object') return initialRoot();

  let businesses;
  let legacy = false;
  if (Array.isArray(parsed.businesses) && (parsed.businesses.length || !hasLegacyData(parsed))) {
    businesses = parsed.businesses.map(normalizeBusiness);
  } else if (hasLegacyData(parsed)) {
    legacy = true;
    const data = Object.assign(emptyBusinessData(), legacyDataFrom(parsed));
    data.settings = normalizeSettings(data.settings, 'Marjon Plast');
    const name = data.settings.companyName || 'Marjon Plast';
    const business = normalizeBusiness({
      id: 'biz_default',
      slug: process.env.DEFAULT_BUSINESS_SLUG || slugify(name) || 'default',
      name,
      status: 'active',
      plan: 'legacy',
      subscription: { planId: 'legacy', status: 'active', provider: null },
      data,
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: parsed.updatedAt
    }, 0);
    businesses = [business];
  } else {
    businesses = [];
  }

  const normalized = {
    version: 2,
    platformUsers: Array.isArray(parsed.platformUsers) ? parsed.platformUsers : [],
    platformAudit: Array.isArray(parsed.platformAudit) ? parsed.platformAudit : [],
    businesses,
    updatedAt: parsed.updatedAt || new Date().toISOString()
  };
  if (legacy) normalized.legacyMigrated = true;
  return normalized;
}

function loadFile() {
  if (!fs.existsSync(DATA)) {
    const x = initialRoot();
    try { fs.writeFileSync(DATA, JSON.stringify(x, null, 2)); } catch { /* serverless (o'qiladigan) fayl tizimi */ }
    return x;
  }
  try {
    return JSON.parse(fs.readFileSync(DATA, 'utf8'));
  } catch (e) {
    console.error('data.json buzilgan ekan, zaxira saqlab bo\u2018sh holatdan boshlanmoqda:', e.message);
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(DATA, path.join(root, 'corrupt-' + ts + '.json'));
    } catch {}
    return initialRoot();
  }
}

function backupLegacyFile(snapshot) {
  try {
    if (!snapshot && !fs.existsSync(DATA)) return;
    if (!fs.existsSync(BACKUPDIR)) fs.mkdirSync(BACKUPDIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const target = path.join(BACKUPDIR, 'legacy-before-tenancy-' + ts + '.json');
    if (snapshot) fs.writeFileSync(target, JSON.stringify(snapshot, null, 2));
    else fs.copyFileSync(DATA, target);
  } catch (e) {
    console.error('Legacy migratsiya zaxirasi xatosi:', e.message);
  }
}

export function backupIfDue() {
  try {
    if (!fs.existsSync(BACKUPDIR)) fs.mkdirSync(BACKUPDIR, { recursive: true });
    const stamp = new Date().toLocaleDateString('en-CA');
    const target = path.join(BACKUPDIR, 'platform-' + stamp + '.json');
    if (fs.existsSync(target)) return;
    fs.copyFileSync(DATA, target);
    const files = fs.readdirSync(BACKUPDIR).filter((f) => /^platform-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    while (files.length > 30) fs.unlinkSync(path.join(BACKUPDIR, files.shift()));
  } catch (e) {
    console.error('Backup xatosi:', e.message);
  }
}

export function saveFile(db) {
  try {
    const tmp = DATA + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DATA);
    backupIfDue();
  } catch (e) {
    console.error('Diskga saqlash imkonsiz (serverless rejimida normal):', e.message);
  }
}

export async function connectRemote() {
  if (process.env.DATABASE_URL === '') return false;
  if (!process.env.DATABASE_URL || pool) return !!pool;
  try {
    const { Pool } = await import('@neondatabase/serverless');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });
    await pool.query('CREATE TABLE IF NOT EXISTS marjon_kv (key text PRIMARY KEY, value jsonb)');
    return true;
  } catch (e) {
    console.error('Remote DB ulanish xatosi:', e.message);
    pool = null;
    return false;
  }
}

export function isRemote() {
  return !!pool;
}

export async function loadRemote() {
  if (!pool) return null;
  try {
    const { rows } = await pool.query('SELECT value FROM marjon_kv WHERE key = $1', ['db']);
    if (!rows.length || !rows[0].value) return null;
    const raw = rows[0].value;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    console.error('Remote DB o\u2018qish xatosi:', e.message);
    return null;
  }
}

let pendingPush = Promise.resolve();

export async function pushRemote(db) {
  if (!pool) return;
  pendingPush = pendingPush.then(async () => {
    await pool.query(
      'INSERT INTO marjon_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      ['db', JSON.stringify(db)]
    );
  }).catch((e) => console.error('Remote saqlash xatosi:', e.message));
}

export function waitFlush() {
  return pendingPush;
}

const BACKUP_DAYS = Number(process.env.BACKUP_RETENTION || 14);
const safeKeyPart = (value) => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');

export async function backupRemote(tenantId, tenantData) {
  if (!pool || !tenantId) return null;
  const stamp = new Date().toLocaleDateString('en-CA');
  const tenantKey = safeKeyPart(tenantId);
  const prefix = 'backup_' + tenantKey + '_';
  const key = prefix + stamp;
  const payload = JSON.stringify(tenantData);
  pendingPush = pendingPush.then(async () => {
    await pool.query(
      'INSERT INTO marjon_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [key, payload]
    );
    const { rows } = await pool.query('SELECT key FROM marjon_kv WHERE key LIKE $1 ORDER BY key', [prefix + '%']);
    const all = rows.map((r) => r.key).filter((k) => k.startsWith(prefix)).sort();
    const excess = all.slice(0, Math.max(0, all.length - BACKUP_DAYS));
    for (const k of excess) await pool.query('DELETE FROM marjon_kv WHERE key = $1', [k]);
  }).catch((e) => console.error('Remote backup xatosi:', e.message));
  return key;
}

export async function listRemoteBackups(tenantId) {
  if (!pool || !tenantId) return [];
  const prefix = 'backup_' + safeKeyPart(tenantId) + '_';
  try {
    const { rows } = await pool.query('SELECT key, value FROM marjon_kv WHERE key LIKE $1 ORDER BY key DESC', [prefix + '%']);
    return rows.filter((r) => r.key.startsWith(prefix)).map((r) => ({
      key: r.key,
      date: r.key.slice(prefix.length),
      size: JSON.stringify(r.value).length
    }));
  } catch (e) {
    console.error('Backup ro\u2018yxat xatosi:', e.message);
    return [];
  }
}

export async function fetchRemoteBackup(tenantId, key) {
  if (!pool || !tenantId || typeof key !== 'string') return null;
  const prefix = 'backup_' + safeKeyPart(tenantId) + '_';
  if (!key.startsWith(prefix)) return null;
  try {
    const { rows } = await pool.query('SELECT value FROM marjon_kv WHERE key = $1', [key]);
    if (!rows.length) return null;
    const raw = rows[0].value;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    console.error('Backup o\u2018qish xatosi:', e.message);
    return null;
  }
}

let revCache = null;
const revOf = (d) => (d && d.updatedAt) || null;

export async function initDB() {
  const remote = await connectRemote();
  let parsed = null;
  if (remote) parsed = await loadRemote();
  if (!parsed) parsed = loadFile();
  const legacy = hasLegacyData(parsed) && !(Array.isArray(parsed.businesses) && parsed.businesses.length);
  const legacySnapshot = legacy ? JSON.parse(JSON.stringify(parsed)) : null;
  const n = normalizeRoot(parsed);
  revCache = revOf(n);
  if (legacy) {
    backupLegacyFile(legacySnapshot);
    if (remote) {
      try {
        await pool.query(
          'INSERT INTO marjon_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
          ['legacy_before_tenancy_' + new Date().toISOString().slice(0, 10), JSON.stringify(legacySnapshot)]
        );
      } catch (e) {
        console.error('Legacy remote zaxira xatosi:', e.message);
      }
    }
    saveFile(n);
    if (remote) await pushRemote(n);
    console.log('[marjon] legacy single-company data migrated into business "' + n.businesses[0].slug + '"');
  }
  console.log('[marjon] remote=' + remote + ' businesses=' + n.businesses.length + ' platformUsers=' + n.platformUsers.length);
  return n;
}

export function currentRev() {
  return revCache;
}

export function noteSave(db) {
  revCache = revOf(db);
}

export async function refreshDB() {
  if (!pool) return null;
  const parsed = await loadRemote();
  if (!parsed) return null;
  const n = normalizeRoot(parsed);
  revCache = revOf(n);
  return n;
}

export async function detectChange() {
  if (!pool) return false;
  try {
    const { rows } = await pool.query(
      "SELECT value->>'updatedAt' AS ua FROM marjon_kv WHERE key = $1",
      ['db']
    );
    const remote = rows.length ? rows[0].ua : revCache;
    return remote !== revCache;
  } catch (e) {
    console.error('Changeni tekshirish xatosi:', e.message);
    return false;
  }
}
