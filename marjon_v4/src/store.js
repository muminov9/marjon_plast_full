import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const DATA = path.join(root, 'data.json');
const BACKUPDIR = path.join(root, 'backups');

let pool = null;

export function initial() {
  return {
    users: [],
    products: [],
    customers: [],
    suppliers: [],
    rawMaterials: [],
    productions: [],
    sales: [],
    purchases: [],
    expenses: [],
    workers: [],
    payroll: [],
    cash: [],
    settings: { companyName: 'Marjon Plast', currency: 'UZS', openingCash: 0 },
    audit: []
  };
}

function normalize(parsed) {
  const base = initial();
  return Object.assign(base, parsed, { settings: Object.assign(base.settings, parsed.settings || {}) });
}

function loadFile() {
  if (!fs.existsSync(DATA)) {
    const x = initial();
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
    return initial();
  }
}

export function backupIfDue() {
  try {
    if (!fs.existsSync(BACKUPDIR)) fs.mkdirSync(BACKUPDIR, { recursive: true });
    const stamp = new Date().toLocaleDateString('en-CA');
    const target = path.join(BACKUPDIR, 'data-' + stamp + '.json');
    if (fs.existsSync(target)) return;
    fs.copyFileSync(DATA, target);
    const files = fs.readdirSync(BACKUPDIR).filter((f) => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
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

export async function backupRemote(db) {
  if (!pool) return null;
  const stamp = new Date().toLocaleDateString('en-CA');
  const key = 'backup_' + stamp;
  const payload = JSON.stringify(db);
  pendingPush = pendingPush.then(async () => {
    await pool.query(
      'INSERT INTO marjon_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [key, payload]
    );
    const { rows } = await pool.query("SELECT key FROM marjon_kv WHERE key LIKE 'backup_%' ORDER BY key");
    const all = rows.map((r) => r.key).sort();
    const excess = all.slice(0, Math.max(0, all.length - BACKUP_DAYS));
    for (const k of excess) await pool.query('DELETE FROM marjon_kv WHERE key = $1', [k]);
  }).catch((e) => console.error('Remote backup xatosi:', e.message));
  return key;
}

export async function listRemoteBackups() {
  if (!pool) return [];
  try {
    const { rows } = await pool.query("SELECT key, value FROM marjon_kv WHERE key LIKE 'backup_%' ORDER BY key DESC");
    return rows.map((r) => ({ key: r.key, date: r.key.replace('backup_', ''), size: JSON.stringify(r.value).length }));
  } catch (e) {
    console.error('Backup ro\u2018yxat xatosi:', e.message);
    return [];
  }
}

export async function fetchRemoteBackup(key) {
  if (!pool) return null;
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

export async function initDB() {
  const remote = await connectRemote();
  let parsed = null;
  if (remote) parsed = await loadRemote();
  if (!parsed) parsed = loadFile();
  const n = normalize(parsed);
  console.log('[marjon] remote=' + remote + ' users=' + n.users.length + ' products=' + n.products.length);
  return n;
}