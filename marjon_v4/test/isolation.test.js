import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'marjon-isolation-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-tests';
process.env.DATA_FILE = path.join(tmp, 'data.json');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.DATABASE_URL = '';
process.env.PLATFORM_ADMIN_USERNAME = 'platform';
process.env.PLATFORM_ADMIN_PASSWORD = 'platform-pass-123';
process.env.PLATFORM_BOOTSTRAP_TOKEN = 'platform-bootstrap-token-123';
process.env.ONBOARDING_RATE_LIMIT = '1000';
delete process.env.SINGLE_TENANT_MODE;

let server;
let base;
let counter = 0;
const PASSWORD = 'correct-horse-123';

before(async () => {
  const { default: app } = await import('../src/app.js');
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function api(pathname, { method = 'GET', token, body, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = 'Bearer ' + token;
  const response = await fetch(base + pathname, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data, headers: response.headers, text };
}

async function onboard(label, extra = {}) {
  const n = ++counter;
  const response = await api('/api/onboarding/business', {
    method: 'POST',
    body: {
      businessName: `${label} ${n}`,
      slug: `${label.toLowerCase()}-${Date.now().toString(36)}-${n}`,
      name: `${label} Owner`,
      username: `owner${n}`,
      password: PASSWORD,
      currency: 'UZS',
      locale: 'uz',
      ...extra
    }
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return {
    token: response.data.token,
    user: response.data.user,
    business: response.data.business,
    label
  };
}

async function addProduct(tenant, name) {
  const response = await api('/api/products', {
    method: 'POST',
    token: tenant.token,
    body: { name, category: 'Test', unit: 'dona', buy: 10, sell: 20, stock: 5, min: 1 }
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  return response.data;
}

test('business onboarding creates isolated workspaces and tokens', async () => {
  const a = await onboard('Alpha');
  const b = await onboard('Beta');
  assert.notEqual(a.business.id, b.business.id);
  assert.notEqual(a.business.slug, b.business.slug);

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { business: a.business.slug, username: a.user.username, password: PASSWORD }
  });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  assert.equal(login.data.business.id, a.business.id);
  assert.equal(login.data.user.tenantId, undefined);

  const me = await api('/api/me', { token: login.data.token });
  assert.equal(me.status, 200);
  assert.equal(me.data.business.id, a.business.id);
});

test('a tenant cannot read, update or delete another tenant record', async () => {
  const a = await onboard('Alpha');
  const b = await onboard('Beta');
  const product = await addProduct(a, 'Alpha Secret Product');

  const listB = await api('/api/products', { token: b.token });
  assert.equal(listB.status, 200);
  assert.deepEqual(listB.data, []);

  const stateA = await api('/api/state', { token: a.token });
  assert.equal(stateA.data.products.some((p) => p.name === 'Alpha Secret Product'), true);
  assert.equal(stateA.data.products[0].tenantId, a.business.id);

  const stateB = await api('/api/state', { token: b.token });
  assert.equal(stateB.data.products.some((p) => p.name === 'Alpha Secret Product'), false);
  assert.equal(stateB.data.business.id, b.business.id);

  const update = await api('/api/products/' + product.id, {
    method: 'PUT', token: b.token, body: { name: 'Hijacked' }
  });
  assert.equal(update.status, 404);

  const remove = await api('/api/products/' + product.id, { method: 'DELETE', token: b.token });
  assert.equal(remove.status, 404);

  const stillThere = await api('/api/products', { token: a.token });
  assert.equal(stillThere.data[0].name, 'Alpha Secret Product');
});

test('tenant identifiers supplied by the browser are ignored', async () => {
  const a = await onboard('Alpha');
  const b = await onboard('Beta');
  const foreign = await addProduct(a, 'Foreign Product');

  const spoofHeader = await api('/api/state', {
    token: b.token,
    headers: {
      'X-Tenant-Id': a.business.id,
      'X-Business-Id': a.business.id,
      'X-Tenant': a.business.id
    }
  });
  assert.equal(spoofHeader.status, 200);
  assert.equal(spoofHeader.data.business.id, b.business.id);
  assert.equal(spoofHeader.data.products.some((p) => p.name === 'Foreign Product'), false);

  const spoofQuery = await api('/api/state?tenantId=' + encodeURIComponent(a.business.id), { token: b.token });
  assert.equal(spoofQuery.data.business.id, b.business.id);

  const created = await api('/api/products', {
    method: 'POST',
    token: b.token,
    body: { id: 'forced-id', tenantId: a.business.id, name: 'Beta Product', buy: 1, sell: 2, stock: 3 }
  });
  assert.equal(created.status, 200);
  assert.equal(created.data.tenantId, b.business.id);
  assert.notEqual(created.data.id, 'forced-id');

  const aProducts = await api('/api/products', { token: a.token });
  assert.equal(aProducts.data.some((p) => p.name === 'Beta Product'), false);
  assert.equal(aProducts.data.some((p) => p.id === foreign.id), true);
});

test('reports, exports and backups never include another tenant data', async () => {
  const a = await onboard('Alpha');
  const b = await onboard('Beta');
  const product = await addProduct(a, 'Alpha Export Secret');
  const sale = await api('/api/sales', {
    method: 'POST',
    token: a.token,
    body: { productId: product.id, qty: 1, payment: 'Naqd', date: '2026-10-20' }
  });
  assert.equal(sale.status, 200, JSON.stringify(sale.data));

  const reportA = await api('/api/reports', { token: a.token });
  const reportB = await api('/api/reports', { token: b.token });
  assert.equal(reportA.data.sales.some((s) => s.id === sale.data.id), true);
  assert.equal(reportB.data.sales.length, 0);
  assert.equal(reportB.data.revenue, 0);

  const exportResponse = await fetch(base + '/api/export/xlsx', { headers: { Authorization: 'Bearer ' + b.token } });
  assert.equal(exportResponse.status, 200);
  const workbook = XLSX.read(Buffer.from(await exportResponse.arrayBuffer()), { type: 'buffer' });
  const exported = workbook.SheetNames.map((name) => JSON.stringify(XLSX.utils.sheet_to_json(workbook.Sheets[name]))).join('\n');
  assert.equal(exported.includes('Alpha Export Secret'), false);

  const backupDownload = await api('/api/backup/download', { token: b.token });
  assert.equal(backupDownload.status, 200);
  assert.equal(backupDownload.text.includes('Alpha Export Secret'), false);
  assert.equal(JSON.parse(backupDownload.text).tenantId, b.business.id);

  const backupA = await api('/api/backup', { method: 'POST', token: a.token, body: {} });
  assert.equal(backupA.status, 200, JSON.stringify(backupA.data));
  const listB = await api('/api/backups', { token: b.token });
  const listA = await api('/api/backups', { token: a.token });
  assert.equal(listB.data.local.some((f) => f.file === backupA.data.localFile), false);
  assert.equal(listA.data.local.some((f) => f.file === backupA.data.localFile), true);

  const restoreForeignFile = await api('/api/backup/restore', {
    method: 'POST', token: b.token, body: { filename: backupA.data.localFile }
  });
  assert.equal(restoreForeignFile.status, 404);

  const snapshotA = JSON.parse((await api('/api/backup/download', { token: a.token })).text);
  const restoreForeignSnapshot = await api('/api/backup/restore', {
    method: 'POST', token: b.token, body: { snapshot: snapshotA }
  });
  assert.equal(restoreForeignSnapshot.status, 400);
  assert.match(restoreForeignSnapshot.data.message, /boshqa biznes/);
});

test('business settings are tenant scoped and validate logo input', async () => {
  const a = await onboard('Alpha');
  const b = await onboard('Beta');

  const update = await api('/api/settings', {
    method: 'PUT',
    token: a.token,
    body: { companyName: 'Alpha LLC', logo: 'https://example.com/alpha.png', currency: 'USD', locale: 'en' }
  });
  assert.equal(update.status, 200, JSON.stringify(update.data));

  const settingsA = await api('/api/business/settings', { token: a.token });
  const settingsB = await api('/api/business/settings', { token: b.token });
  assert.equal(settingsA.data.settings.companyName, 'Alpha LLC');
  assert.equal(settingsA.data.settings.currency, 'USD');
  assert.equal(settingsB.data.settings.companyName, b.business.name);
  assert.equal(settingsB.data.settings.logo, '');
  assert.notEqual(settingsB.data.settings.companyName, 'Alpha LLC');

  const badLogo = await api('/api/settings', {
    method: 'PUT', token: b.token, body: { logo: 'javascript:alert(1)' }
  });
  assert.equal(badLogo.status, 400);

  const hugeLogo = await api('/api/settings', {
    method: 'PUT', token: b.token, body: { logo: 'data:image/png;base64,' + 'A'.repeat(700001) }
  });
  assert.equal(hugeLogo.status, 400);

  const updateB = await api('/api/settings', {
    method: 'PUT', token: b.token, body: { companyName: 'Beta LLC', currency: 'EUR', locale: 'ru' }
  });
  assert.equal(updateB.status, 200);
  const settingsAAfter = await api('/api/business/settings', { token: a.token });
  assert.equal(settingsAAfter.data.settings.companyName, 'Alpha LLC');
  assert.equal(settingsAAfter.data.settings.currency, 'USD');
});

test('platform administrators and business administrators are separated', async () => {
  const a = await onboard('Alpha');
  const b = await onboard('Beta');

  const platformLogin = await api('/api/platform/auth/login', {
    method: 'POST',
    body: { username: process.env.PLATFORM_ADMIN_USERNAME, password: process.env.PLATFORM_ADMIN_PASSWORD }
  });
  assert.equal(platformLogin.status, 200, JSON.stringify(platformLogin.data));
  const platformToken = platformLogin.data.token;

  const businessOnPlatform = await api('/api/platform/businesses', { token: a.token });
  assert.equal(businessOnPlatform.status, 403);

  const platformOnBusiness = await api('/api/state', { token: platformToken });
  assert.equal(platformOnBusiness.status, 403);

  const list = await api('/api/platform/businesses', { token: platformToken });
  assert.equal(list.status, 200);
  assert.equal(Array.isArray(list.data), true);
  assert.equal(list.data.some((x) => x.id === a.business.id), true);
  assert.equal(list.data.some((x) => x.id === b.business.id), true);
  assert.equal(list.data.every((x) => x.data === undefined), true);
  assert.equal(JSON.stringify(list.data).includes('Alpha Secret'), false);

  const gammaUsername = 'gamma' + Date.now().toString(36);
  const created = await api('/api/platform/businesses', {
    method: 'POST',
    token: platformToken,
    body: {
      businessName: 'Gamma Created', slug: 'gamma-' + Date.now().toString(36),
      name: 'Gamma Owner', username: gammaUsername,
      password: PASSWORD, plan: 'starter', currency: 'USD', locale: 'en'
    }
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.status, 'active');
  assert.equal(created.data.data, undefined);

  const gammaLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { business: created.data.slug, username: gammaUsername, password: PASSWORD }
  });
  assert.equal(gammaLogin.status, 200, JSON.stringify(gammaLogin.data));

  const suspend = await api('/api/platform/businesses/' + b.business.id, {
    method: 'PATCH', token: platformToken, body: { status: 'suspended' }
  });
  assert.equal(suspend.status, 200);
  const blocked = await api('/api/state', { token: b.token });
  assert.equal(blocked.status, 403);
  const blockedLogin = await api('/api/auth/login', {
    method: 'POST', body: { business: b.business.slug, username: b.user.username, password: PASSWORD }
  });
  assert.equal(blockedLogin.status, 403);

  const reactivate = await api('/api/platform/businesses/' + b.business.id, {
    method: 'PATCH', token: platformToken, body: { status: 'active' }
  });
  assert.equal(reactivate.status, 200);
  const allowedAgain = await api('/api/state', { token: b.token });
  assert.equal(allowedAgain.status, 200);

  const platformRoleForBusinessUser = await api('/api/users', {
    method: 'POST', token: a.token,
    body: { name: 'Fake Platform', username: 'fakeplatform' + Date.now().toString(36), password: PASSWORD, role: 'PLATFORM_ADMIN' }
  });
  assert.equal(platformRoleForBusinessUser.status, 400);
});

test('onboarding rejects paid plans, weak secrets and duplicate slugs', async () => {
  const a = await onboard('Alpha');

  const paid = await api('/api/onboarding/business', {
    method: 'POST',
    body: {
      businessName: 'Paid Co', slug: 'paid-' + Date.now().toString(36),
      name: 'Paid Owner', username: 'paid' + Date.now().toString(36),
      password: PASSWORD, plan: 'starter'
    }
  });
  assert.equal(paid.status, 400);
  assert.match(paid.data.message, /provayder/);

  const weak = await api('/api/onboarding/business', {
    method: 'POST',
    body: {
      businessName: 'Weak Co', slug: 'weak-' + Date.now().toString(36),
      name: 'Weak Owner', username: 'weak' + Date.now().toString(36), password: '123'
    }
  });
  assert.equal(weak.status, 400);

  const duplicate = await api('/api/onboarding/business', {
    method: 'POST',
    body: {
      businessName: 'Duplicate Co', slug: a.business.slug,
      name: 'Duplicate Owner', username: 'duplicate' + Date.now().toString(36), password: PASSWORD
    }
  });
  assert.equal(duplicate.status, 409);
});

test('a token for one business cannot be replayed against another workspace identifier', async () => {
  const a = await onboard('Alpha');
  const b = await onboard('Beta');
  await addProduct(a, 'Alpha Replay Secret');

  const replay = await api('/api/auth/login', {
    method: 'POST',
    body: { business: b.business.slug, username: a.user.username, password: PASSWORD }
  });
  assert.equal(replay.status, 401);

  const crossDelete = await api('/api/sales/does-not-exist', { method: 'DELETE', token: b.token });
  assert.equal(crossDelete.status, 404);

  const state = await api('/api/state', { token: a.token });
  assert.equal(state.data.products.some((p) => p.name === 'Alpha Replay Secret'), true);
});
