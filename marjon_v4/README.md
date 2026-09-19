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

- Har kuni birinchi saqlashda mahalliy `backups/data-YYYY-MM-DD.json` + masofaviy `backup_YYYY-MM-DD` (Neon) yaratiladi, `BACKUP_RETENTION` (default 14) kundan ortiq o'chiriladi.
- Admin panelda **Zaxira** bo'limida: yangi zaxira, yuklab olish, restore.

## Texnologiyalar

Express 5, Helmet, bcryptjs, jsonwebtoken, @neondatabase/serverless, pdfkit (PDF hisobot), xlsx (Excel), vanilla JS + CSS (kutubxonalarsiz frontend).