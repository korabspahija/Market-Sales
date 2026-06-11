# Zbritje 🏷️

**Zbritje** is a free, mobile-first web app where Kosovo supermarket chains publish their
time-limited sales and shoppers compare them in one place — across **Viva Fresh Store**,
**Eli-abi** and **Meridian Express**.

- **Shoppers** (no login): browse current sales sorted by biggest discount, search products
  accent-insensitively (`qumesht` finds *qumësht*), filter by chain/category, and find the
  nearest store by city with Google Maps directions.
- **Managers** (login): each chain's manager sees *their own* sales — including expired and
  upcoming ones — and can create, edit and delete them with product image upload.
  Shoppers only ever see sales that are currently active.

The whole UI is in Albanian.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4 |
| Database | PostgreSQL — Docker locally, [Supabase](https://supabase.com) free tier in production — via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Email/password (bcryptjs) + JWT session cookie (jose), `src/proxy.ts` guards `/menaxho` |
| Images | `src/lib/storage.ts` driver: local disk in dev, Supabase Storage in production |
| Hosting | Vercel (Hobby) — a daily cron pings `/api/health` so the free Supabase DB never pauses |

## Run locally

Prerequisites: **Node.js 22+** and **Docker**.

```powershell
# 1. database
docker run -d --name zbritje-db -e POSTGRES_USER=zbritje -e POSTGRES_PASSWORD=zbritje_dev `
  -e POSTGRES_DB=zbritje -p 127.0.0.1:5433:5432 postgres:16-alpine

# 2. env — the example file already contains working local-dev values
copy .env.example .env

# 3. install, migrate, seed (also regenerates the demo SVG images)
npm install
npx prisma migrate dev
npm run db:seed

# 4. go
npm run dev
```

Open http://localhost:3000.

### Demo manager accounts

Password for all three: **`Zbritje2026`**

| Chain | Email |
|---|---|
| Viva Fresh Store | `menaxher.viva@zbritje.app` |
| Eli-abi | `menaxher.eliabi@zbritje.app` |
| Meridian Express | `menaxher.meridian@zbritje.app` |

The seed creates ~31 realistic offers: 25 active, 3 expired and 3 upcoming — so you can see
that shoppers only get active ones while managers see everything of their chain.

## Project structure

```
prisma/            schema, migrations, seed (seed-data.ts holds the demo content)
src/app/           pages: / (offers), /oferta/[id], /dyqanet, /hyr, /menaxho (dashboard)
src/app/api/       REST route handlers: auth, sales CRUD (+ image upload), health
src/components/    SaleCard, SaleForm, SearchBar, nav, buttons
src/lib/           db (Prisma client), session, storage driver, validation (zod),
                   search normalization, formatting (sq locale), categories
src/proxy.ts       auth guard for /menaxho/* (Next 16 proxy convention)
```

---

## 🫵 Your turn — going live (everything that needs your accounts)

All code is done and verified locally. These are the only remaining steps, in order:

### 1. Create the Supabase project (free)

1. https://supabase.com → New project (pick the EU region, e.g. Frankfurt — closest to Kosovo).
2. **Connect → Session pooler**: copy the connection string and keep the database password.
3. **Storage → New bucket**: name `zbritje-images`, tick **Public bucket**.
4. **Project Settings → API**: copy the **Project URL** and the **service_role** key.

### 2. Migrate + seed the production database (from this machine)

In PowerShell, temporarily point at Supabase and push schema + demo data:

```powershell
$env:DATABASE_URL = "postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
npx prisma migrate deploy
npm run db:seed
Remove-Item Env:DATABASE_URL
```

### 3. Push the repo to GitHub

You handle git yourself — the `.gitignore` already excludes `node_modules`, `.next`,
`.env*`, uploads and the generated Prisma client.

### 4. Deploy on Vercel (free)

1. https://vercel.com → Add New Project → import `korabspahija/Market-Sales`.
2. Set the environment variables (Production):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase **session pooler** string from step 1 |
   | `SESSION_SECRET` | a fresh random secret: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"` |
   | `STORAGE_DRIVER` | `supabase` |
   | `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |
   | `SUPABASE_STORAGE_BUCKET` | `zbritje-images` |

3. Deploy. `vercel.json` already schedules the daily `/api/health` cron (09:00 UTC) that
   keeps the Supabase free tier awake — no extra setup.

### 5. Smoke-test production

- Home shows the offers; search `qumesht`; open a store's maps link.
- Log in with a demo account, create an offer with an image — the image should land in the
  Supabase bucket and show up on the home page.

That's it. 🎉

## Out of scope for v1 (named future phases)

- Branch-level sale targeting (a sale at only some locations of a chain)
- Browser-geolocation distance sorting (today: city filter + maps links)
- Delivery integration / monetization / chain self-onboarding
