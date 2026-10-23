# Marjon Plast Business v5

Full-stack biznes boshqaruv dasturi: **Express + PostgreSQL (Neon) + JWT auth + rollar + statistika + qidiruv/filter + backup + Excel/PDF**.

## Imkoniyatlar

- 🔐 **Haqiqiy login/register** — bcrypt hash, JWT (7 kun), bootstrap orqali birinchi admin yaratish, login urinishlarini cheklash
- 👤 **Rollar** — `ADMIN` (hammasi), `MANAGER` (boshqaruv), `CASHIER` (sotuv/kassa/оrqalar)
- 🗄️ **Real database** — Neon PostgreSQL (kotrollar uchun), mahalliy rejimda `data.json` (soddalik uchun)
- 📦 **Mahsulot CRUD** — kategoriya, birlik, kelish/sotish narxi, qoldiq, minimal qoldiq
- 💵 **Sotuv va foyda** — tannarx asosida avtomatik hisoblash, qarzga sotish, kirim, rasxod, oylik, kassa
- 📊 **Kunlik/haftalik/oylik/yillik statistika** — CSS grafiklar, top mahsulotlar va mijozlar
- 🔎 **Qidiruv va filter** — deyarli barcha bo'limlarda (kategoriya, to'lov turi, ism, sana)
- 📱 **Mobile responsive** — sidebar → gorizontal nav, adaptiv jadvallar
- 💾 **Backup** — kunlik avtomatik mahalliy + masofaviy (14 kun saqlanadi), qo'lda yaratish, yuklab olish, restore
- 🛡️ **Security** — helmet, CORS cheklovi, rate-limit, input validatsiya, audit log
- 🚀 **Deploy** — Render va Vercel tayyor konfig

## Windows / lokal ishga tushirish

1. Node.js 18+ o'rnating.
2. `npm install`
3. `.env.example` nusxasini `.env` qiling va `JWT_SECRET` ni o'zgartiring.
4. `npm run seed` — demo ma'lumot va `admin` foydalanuvchi yaratadi (parol `ADMIN_PASSWORD` env yoki default).
5. `npm start` → `http://localhost:3000`

Birinchi kirishda "Admin yaratish" havolasi orqali administrator yaratiladi.

### Mahalliy test

```
npm run dev
```

## Docker orqali ishga tushirish

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) o'rnating va ishga tushiring.
2. `marjon_v4` papkasida `.env` borligiga ishonch hosil qiling (`.env.example` nusxasi, `JWT_SECRET` o'zgartirilgan).
3. Ishga tushirish va yangilash:

   ```
   docker compose up -d --build
   ```

4. Brauzerda `http://localhost:3000` ni oching.

- `data.json` va `backups/` papkasi kompyuteringizdan konteynerga ulangan (bind mount) — ma'lumotlar konteyner o'chirilsa ham saqlanadi.
- `.env` ga `DATABASE_URL` (Neon/Supabase) qo'shing — cloud baza avtomatik ulanadi.
- Konteynerni to'xtatish: `docker compose down`

## PostgreSQL (Neon/Supabase) sozlash

`data.json` faqat offlayn demo uchun. Cloud deploy (Render/Vercel) da **albatta** PostgreSQL kerak:

1. [neon.tech](https://neon.tech) da bepul loyiha yarating.
2. Connection stringni oling:
   ```
   postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```
3. `.env` ga `DATABASE_URL=...` qo'shing.
4. Ilova birinchi ishga tushganda `marjon_kv` jadvalini avtomatik yaratadi va butun bazani bitta JSON blok sifatida saqlaydi (oddiy va ishonchli sxema).

> Supabase ham ishlaydi: Supabase -> Project Settings -> Database -> **Session pooler** connection stringini `DATABASE_URL`ga yozing.

## Production deploy

### Render (tavsiya etiladi — oddiy)

1. Repo'ni GitHub'ga yuklang va [render.com](https://render.com) da Blueprint orqali `render.yaml` ni tanlang.
2. Env o'zgaruvchilarni sozlang: `DATABASE_URL` (Neon) va kuchli `JWT_SECRET`.
3. Auto-deploy har bir commitda ishlaydi. Health: `/api/health`.

### Vercel

1. `vercel link` va `vercel` buyruqlari (routing `vercel.json` da sozlangan).
2. Environment o'zgaruvchilar: `JWT_SECRET`, `DATABASE_URL` (Neon).
3. `NODE_ENV=production` hal qilinsa kuchli `JWT_SECRET` talab qilinadi.

### Security eslatmalari

- Production'da `JWT_SECRET` ni kuchli qiling va boshqalarga ko'rsatmang.
- Xohlasangiz `ALLOWED_ORIGINS` bilan domenlar ro'yxatini cheklang.
- Login limiti har IP uchun 10 ta yaroqsiz urinish / 15 daqiqa; umumiy API limiti `RATE_LIMIT` (default 600).
- Audit log o'zgarishlarni kuzatadi (ADMIN ko'radi).

## Backup

- Mahalliy: kuniga bir marta butun baza uchun `backups/platform-YYYY-MM-DD.json` nusxasi olinadi. Admin **yangi zaxira** tugmasi bilan joriy biznes uchun `backups/tenant-<business-id>-YYYY-MM-DD.json` faylini yaratadi.
- Masofaviy: har bir biznes o'zgarganda kuniga bir marta `backup_<business-id>_YYYY-MM-DD` (Neon) nusxasi yoziladi; `BACKUP_RETENTION` (default 14) kundan ortiq nusxalar o'chiriladi.
- Admin panelda **Zaxira** bo'limida faqat joriy biznesning zaxiralari ko'rinadi: yangi zaxira, yuklab olish, restore.
- Butun platforma konfiguratsiyasi uchun ichki `platform-YYYY-MM-DD.json` nusxasi alohida saqlanadi va biznes API'laridan ochilmaydi.

## Multi-tenant (ko'p kompaniyali) rejim

Ilova endi bir nechta mustaqil biznesni bitta deploymentda xizmat qilishi mumkin.
Har bir biznes o'z ish maydoni, foydalanuvchilari, mahsulotlari, mijozlari,
yetkazib beruvchilari, sotuvlari, ombori, rasxodlari, oyliklari va hisobotlariga
ega. Har bir yozuv server tomonda `tenantId` bilan bog'lanadi.

- Login paytida biznes kodi (`slug`) kiritiladi. Bitta biznes bo'lsa, kod ixtiyoriy.
- Har bir API so'rovida JWT ichidagi tenant serverda qayta tekshiriladi; brauzer
  yuborgan `tenantId`, header yoki query parametrlar ishonchsiz hisoblanadi.
- Platform administrator va biznes administratori huquqlari butunlay ajratilgan.
  Platform token biznes API'lariga, biznes token platform API'lariga kira olmaydi.
  Platform administrator mavjud bo'lsa, login sahifasida alohida **Platform
  administrator** havolasi chiqadi; u yerda biznes yaratish, to'xtatish va
  faollashtirish mumkin.
- Yangi biznes ochish: `POST /api/onboarding/business` (biznes kodi, nom, admin,
  parol, valyuta, til). Faqat bepul `trial` tarifi; to'lov provayderi sozlanmagan
  paid tariflar ataylab rad etiladi.
- Biznes sozlamalari sahifasida nom, logo, valyuta, til va boshlang'ich kassa
  tahrirlanadi. Logo HTTPS URL yoki cheklangan PNG/JPEG/WebP/GIF data URL bo'lishi
  mumkin; SVG va `javascript:` URL rad etiladi.
- Zaxira, restore, Excel/PDF export, hisobotlar, audit va qidiruv faqat joriy
  biznes ma'lumotlari bilan ishlaydi. Local zaxira fayllari
  `tenant-<id>-<sana>.json`, remote kalitlar `backup_<id>_<sana>` ko'rinishida.
- Eski bitta kompaniyali `data.json` avtomatik ravishda bitta biznesga ko'chiriladi.
  Ko'chirishdan oldin `backups/legacy-before-tenancy-<timestamp>.json` yaratiladi.
  `SINGLE_TENANT_MODE=true` qilinsa, mavjud bo'lgandan keyin yangi biznes ochilmaydi.

To'liq arxitektura, xavfsizlik qoidalari, tariflar extension point va migratsiya
tafsiloti: [`docs/MULTI_TENANCY.md`](docs/MULTI_TENANCY.md).

### Isolation testlari

```bash
npm test
```

Testlar ikki biznes yaratib, bir biznesning boshqasining yozuvlarini o'qishi,
o'zgartirishi, o'chirishi, export/backup qilishi va restore qilishi mumkin
emasligini tekshiradi. Shuningdek platform/biznes admin ajratilishi, suspended
biznes, soxta `tenantId` va legacy migratsiya sinaladi.

> Multi-tenant tizimni "xavfsiz" deb e'lon qilishdan oldin `npm test` aynan shu
> kod va shu ma'lumotlar bazasida muvaffaqiyatli o'tgan bo'lishi shart.

## Texnologiyalar

Express 5, Helmet, bcryptjs, jsonwebtoken, @neondatabase/serverless, pdfkit (PDF hisobot), xlsx (Excel), vanilla JS + CSS (kutubxonalarsiz frontend).