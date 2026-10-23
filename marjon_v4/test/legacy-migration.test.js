import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'marjon-legacy-'));
const dataFile = path.join(tmp, 'data.json');
const backupDir = path.join(tmp, 'backups');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'legacy-test-secret-that-is-long-enough';
process.env.DATA_FILE = dataFile;
process.env.BACKUP_DIR = backupDir;
process.env.DATABASE_URL = '';
delete process.env.PLATFORM_ADMIN_USERNAME;
delete process.env.PLATFORM_ADMIN_PASSWORD;
delete process.env.SINGLE_TENANT_MODE;

const PASSWORD = 'legacy-password-123';
let server;
let base;
let legacyData;

before(async () => {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  legacyData = {
    users: [{
      id: 'usr_legacy', name: 'Legacy Admin', username: 'legacyadmin',
      passwordHash, role: 'ADMIN', active: true, createdAt: '2026-01-01T00:00:00.000Z'
    }],
    products: [{
      id: 'p_legacy', name: 'Legacy Product', category: 'Old', unit: 'dona',
      buy: 100, sell: 200, stock: 7, min: 1
    }],
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
    settings: { companyName: 'Legacy Company', currency: 'UZS', openingCash: 5000 },
    audit: [],
    updatedAt: '2026-01-02T00:00:00.000Z'
  };
  fs.writeFileSync(dataFile, JSON.stringify(legacyData, null, 2));
  const { default: app } = await import('../src/app.js');
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function api(pathname, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetch(base + pathname, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data, text };
}

test('legacy single-company data is migrated into a tenant with a safety backup', async () => {
  const status = await api('/api/auth/status');
  assert.equal(status.status, 200);
  assert.equal(status.data.hasBusinesses, true);
  assert.equal(status.data.hasUsers, true);

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { username: 'legacyadmin', password: PASSWORD }
  });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  assert.equal(login.data.business.slug, 'legacy-company');

  const state = await api('/api/state', { token: login.data.token });
  assert.equal(state.status, 200);
  assert.equal(state.data.business.id, login.data.business.id);
  assert.equal(state.data.products.some((p) => p.name === 'Legacy Product'), true);
  assert.equal(state.data.products.every((p) => p.tenantId === login.data.business.id), true);
  assert.equal(state.data.settings.companyName, 'Legacy Company');

  const stored = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.equal(stored.version, 2);
  assert.equal(stored.businesses.length, 1);
  assert.equal(stored.businesses[0].data.products[0].tenantId, stored.businesses[0].id);
  assert.equal(stored.businesses[0].data.users[0].role, 'ADMIN');

  const safetyBackups = fs.readdirSync(backupDir).filter((f) => f.startsWith('legacy-before-tenancy-'));
  assert.equal(safetyBackups.length, 1);
  const safety = JSON.parse(fs.readFileSync(path.join(backupDir, safetyBackups[0]), 'utf8'));
  assert.deepEqual(safety, legacyData);
});

test('legacy login remains deterministic after restart-like refresh', async () => {
  const again = await api('/api/auth/login', {
    method: 'POST',
    body: { username: 'legacyadmin', password: PASSWORD }
  });
  assert.equal(again.status, 200);
  const state = await api('/api/state', { token: again.data.token });
  assert.equal(state.data.settings.openingCash, 5000);
  assert.equal(state.data.products.length, 1);
});
