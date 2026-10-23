import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.join(__dirname, '..', 'data.json');
const adminPassword = process.env.ADMIN_PASSWORD || 'abdulaziz2277';
const now = new Date().toISOString();
const tenantId = 'biz_default';
const tenant = {
  id: tenantId,
  slug: process.env.DEFAULT_BUSINESS_SLUG || 'marjon-plast',
  name: 'Marjon Plast',
  status: 'active',
  plan: 'legacy',
  subscription: {
    planId: 'legacy', status: 'active', provider: null,
    externalCustomerId: null, externalSubscriptionId: null,
    currentPeriodEnd: null, trialEndsAt: null, cancelAtPeriodEnd: false
  },
  createdAt: now,
  updatedAt: now,
  data: {
    tenantId,
    users: [{
      id: 'usr_admin', tenantId, name: 'Administrator', username: 'admin',
      passwordHash: await bcrypt.hash(adminPassword, 12), role: 'ADMIN',
      active: true, createdAt: now
    }],
    products: [
      { id: 'p1', tenantId, name: 'Plastik paket', category: 'Paket', unit: 'dona', buy: 500, sell: 800, stock: 1000, min: 100 },
      { id: 'p2', tenantId, name: 'Konteyner', category: 'Idish', unit: 'dona', buy: 3000, sell: 5000, stock: 250, min: 30 }
    ],
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
    settings: { tenantId, companyName: 'Marjon Plast', logo: '', currency: 'UZS', locale: 'uz', openingCash: 0 },
    audit: []
  }
};
const db = {
  version: 2,
  platformUsers: [],
  platformAudit: [],
  businesses: [tenant],
  updatedAt: now
};
fs.writeFileSync(target, JSON.stringify(db, null, 2));
console.log(`Demo tayyor. Biznes kodi: ${tenant.slug}. Login: admin / ${adminPassword}`);
