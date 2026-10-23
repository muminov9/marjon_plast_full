# Multi-tenant architecture

This document describes the commercial multi-company mode of Marjon Business.
The application can now serve multiple independent businesses from one deployment
while preserving the previous single-company deployment.

## Data model

The persisted root is an envelope:

```json
{
  "version": 2,
  "platformUsers": [],
  "platformAudit": [],
  "businesses": [
    {
      "id": "biz_...",
      "slug": "company-code",
      "name": "Company name",
      "status": "active",
      "plan": "trial",
      "subscription": { "planId": "trial", "status": "trialing", "provider": null },
      "data": {
        "tenantId": "biz_...",
        "users": [],
        "products": [],
        "customers": [],
        "suppliers": [],
        "rawMaterials": [],
        "sales": [],
        "purchases": [],
        "expenses": [],
        "payments": [],
        "workers": [],
        "payroll": [],
        "cash": [],
        "audit": [],
        "settings": {}
      }
    }
  ]
}
```

Every business-owned record in `data` collections is stamped with `tenantId`
when it is saved. `data.tenantId` and `data.settings.tenantId` identify the
workspace. Platform users live only in `platformUsers` and are never written
into a business collection.

Collections covered by tenant stamping: `users`, `products`, `customers`,
`suppliers`, `rawMaterials`, `productions`, `sales`, `purchases`, `expenses`,
`payments`, `workers`, `payroll`, `cash`, `audit`.

## Request isolation

1. The browser sends only a JWT in `Authorization: Bearer ...`.
2. `auth` verifies the signature and requires `scope: "business"` plus a
   server-issued `tenantId`.
3. The tenant is loaded from the server-side root by that ID.
4. The requesting user is loaded from **that tenant's** user collection.
5. Tenant status and user status are checked on every request.
6. The handler executes inside an `AsyncLocalStorage` scope whose `db` is the
   tenant's data object.

Handlers never read a tenant ID from `req.body`, query parameters, or headers.
If a client sends `tenantId`, `X-Tenant-Id`, or similar values, they are ignored.
`crud` also refuses to update `tenantId`, `businessId`, or `passwordHash` from
request bodies. Cross-tenant object IDs resolve as `404` because every lookup is
performed inside the current tenant collection.

Roles are loaded from the database on every request, not trusted from the token.
The token role is informational only.

## Platform administrators vs business administrators

- `POST /api/platform/auth/login` returns a token with `scope: "platform"`.
- Business endpoints require `scope: "business"`.
- Platform endpoints require `scope: "platform"` and `role: "PLATFORM_ADMIN"`.
- A platform token cannot read business records through business APIs.
- A business admin token cannot call platform APIs.
- Platform APIs expose only workspace metadata and aggregate counters, never the
  business data collections.

Platform bootstrap options:

- Set `PLATFORM_ADMIN_USERNAME` and `PLATFORM_ADMIN_PASSWORD` (8+ chars). The
  account is created on first startup if it does not exist.
- Or call `POST /api/platform/bootstrap` with header
  `X-Platform-Bootstrap-Token` equal to `PLATFORM_BOOTSTRAP_TOKEN` (16+ chars).
  This only works when no platform administrator exists.

## Onboarding

Self-service onboarding is `POST /api/onboarding/business`:

- Requires a unique business code (slug), business name, owner name, username,
  password (8-100 chars), currency, and locale.
- The server generates the tenant and owner IDs.
- The owner is always created as a business `ADMIN`; client-supplied roles are
  ignored.
- Self-service can only create the free `trial` plan. Paid plans require a real
  payment integration and are rejected with a clear message.
- The endpoint is rate limited by IP (`ONBOARDING_RATE_LIMIT`, default 10/hour).
- Slugs are validated, reserved names are blocked, and duplicates return `409`.
- The response contains the first business token for immediate sign-in.

Platform administrators can create a workspace with
`POST /api/platform/businesses` (optionally with an owner account). The login
screen exposes a **Platform administrator** link when a platform account exists.
The console lists only workspace metadata and counters, and allows creating
workspaces plus suspending or reactivating them.

The platform console uses a separate `sessionStorage` token and never shares the
business token. It is hidden when `platformConfigured` is false; configure
`PLATFORM_ADMIN_USERNAME`/`PLATFORM_ADMIN_PASSWORD` or use the bootstrap endpoint
first.

## Business settings

`GET /api/business/settings` and `PUT /api/settings` are tenant scoped.
Business admins can edit:

- business name
- logo (HTTPS URL or bounded PNG/JPEG/WebP/GIF data URL; SVG and `javascript:`
  URLs are rejected)
- currency (`UZS`, `USD`, `EUR`, `RUB`, `KZT`, `TRY`)
- locale (`uz`, `ru`, `en`)
- opening cash

The browser settings page includes a logo file picker that converts the image
to a bounded data URL; the upload is still sent through the tenant-authenticated
settings endpoint.

## Backups, exports, and reports

- Local backups are named `tenant-<tenant-id>-<date>.json` and stamped with
  `tenantId`.
- Remote backup keys are `backup_<tenant-id>_<date>` and listing/restoring is
  filtered by the current tenant prefix.
- Restoring a file from another tenant returns `404`.
- A snapshot whose records carry another tenant ID is rejected with `400`.
- XLSX/PDF exports, reports, dashboards, cash, debts, audit, and search operate
  on the tenant-scoped `db` only.

## Subscription and plan extension point

Plans are defined in `src/app.js` (`PLANS`, `PLAN_BY_ID`). Each workspace stores
`plan`, `subscription.planId`, `subscription.status`, trial dates, and empty
external provider fields. `GET /api/plans` reports `paymentsConfigured: false`.
Trial dates and plan limits are currently recorded but not enforced; enforcement
must be wired to real subscription state before launch.

This is intentionally an extension point, not a payment implementation. To add
billing safely:

1. Choose a real provider and verify its webhook signatures server-side.
2. Store provider customer/subscription IDs in the subscription record.
3. Change plan only from verified webhook events, never directly from a browser
   request.
4. Validate plan limits on server-side writes as well as in the UI.
5. Add idempotency keys and an audit entry for every billing transition.
6. Test upgrade, downgrade, failed payment, cancellation, and webhook replay.

No paid plan should be activated until the provider is configured and tested in
the deployment environment.

## Single-company operation and migration

- If only one workspace exists, users can sign in with just username and
  password. With multiple workspaces, the business code disambiguates logins.
- Legacy `data.json` files (`users`, `products`, `sales`, `settings`, ... at the
  root) are detected on startup and migrated into one business with ID
  `biz_default` and a slug derived from the company name.
- Before migration, the old file is copied to
  `backups/legacy-before-tenancy-<timestamp>.json`. Remote stores also receive a
  `legacy_before_tenancy_<date>` safety key when Postgres is enabled.
- Legacy records are stamped with the new tenant ID and remain usable.
- `SINGLE_TENANT_MODE=true` disables new self-service and platform-created
  workspaces after the first one exists, preserving a single-company install.

## Production storage note

The active implementation stores the envelope as one JSON document (local file
or Neon JSONB key). Every save is tenant-scoped at the API layer, but concurrent
writes from multiple server instances are still last-write-wins. For higher
concurrency, migrate to the normalized PostgreSQL shape in
`prisma/schema.prisma`, keep `tenantId` on every business row, and enable
PostgreSQL row-level security using `current_setting('app.tenant_id')` in the
same transaction. Add tenant ID to every uniqueness constraint and index that
replaces a global constraint (for example `@@unique([tenantId, username])`).
After such a migration, rerun the isolation suite and add direct SQL/RLS tests.

## Isolation tests

Run:

```bash
npm test
```

The suite covers:

- onboarding two independent businesses,
- cross-tenant read/update/delete attempts,
- ignored tenant ID headers, query parameters, and body fields,
- reports, XLSX export, backup download/list/restore isolation,
- tenant-scoped settings and logo validation,
- platform/business administrator separation and suspended tenants,
- paid-plan rejection without a provider,
- legacy single-company migration, exact pre-migration safety backup, and login.

Do not describe a deployment as multi-tenant secure unless this suite has been
run successfully against the exact code and data store being deployed. Re-run it
after changing authentication, queries, exports, backups, or the storage layer.
