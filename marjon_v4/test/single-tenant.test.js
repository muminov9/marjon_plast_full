import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'marjon-single-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'single-tenant-test-secret-long-enough';
process.env.DATA_FILE = path.join(tmp, 'data.json');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.DATABASE_URL = '';
process.env.PLATFORM_ADMIN_USERNAME = 'platform';
process.env.PLATFORM_ADMIN_PASSWORD = 'platform-pass-123';
process.env.ONBOARDING_RATE_LIMIT = '100';
process.env.SINGLE_TENANT_MODE = 'true';

let server;
let base;

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

async function api(pathname, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetch(base + pathname, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data };
}

test('single-tenant mode allows the first workspace and blocks the rest', async () => {
  const initial = await api('/api/auth/status');
  assert.equal(initial.data.singleTenantMode, true);
  assert.equal(initial.data.onboardingEnabled, true);

  const first = await api('/api/onboarding/business', {
    method: 'POST',
    body: {
      businessName: 'Only Company',
      slug: 'only-company',
      name: 'Only Owner',
      username: 'owner',
      password: 'correct-horse-123',
      currency: 'UZS',
      locale: 'uz'
    }
  });
  assert.equal(first.status, 201, JSON.stringify(first.data));

  const after = await api('/api/auth/status');
  assert.equal(after.data.onboardingEnabled, false);

  const second = await api('/api/onboarding/business', {
    method: 'POST',
    body: {
      businessName: 'Second Company',
      slug: 'second-company',
      name: 'Second Owner',
      username: 'owner2',
      password: 'correct-horse-123',
      currency: 'UZS',
      locale: 'uz'
    }
  });
  assert.equal(second.status, 403);

  const platform = await api('/api/platform/auth/login', {
    method: 'POST',
    body: { username: 'platform', password: 'platform-pass-123' }
  });
  assert.equal(platform.status, 200, JSON.stringify(platform.data));

  const created = await api('/api/platform/businesses', {
    method: 'POST',
    token: platform.data.token,
    body: {
      businessName: 'Third Company',
      slug: 'third-company',
      currency: 'UZS',
      locale: 'uz'
    }
  });
  assert.equal(created.status, 403);
});
