# Aksione 🏷️

**Aksione** (aksione.com) is a free, mobile-first web app where Kosovo supermarket chains
publish their time-limited sales and shoppers compare them in one place — across
**Viva Fresh Store**, **ETC**, **Interex**, **Albi Market**, **SPAR Kosova**,
**Meridian Express** and **Eli-abi**.

- **Shoppers** (no login): browse current sales sorted by biggest discount, search products
  accent-insensitively (`qumesht` finds *qumësht*), filter by chain/category, compare the
  same product across chains, and find the nearest store by city with Google Maps directions.
- **Managers** (login): each chain's manager sees *their own* sales — including expired and
  upcoming ones — and can create, edit and delete them with product image upload.
  Shoppers only ever see sales that are currently active. The manager area is intentionally
  not linked anywhere in the public UI — managers go directly to `/hyr`.
- **Flier ingestion (AI)**: managers upload flier pages as images; GPT-4o vision extracts
  the offers into a review table where the manager validates names/prices and bulk-publishes.
  Published offers carry a "📄 nga fletushka" link to the public `/fletushka/[id]` page with
  the original pages. Limits: 10 pages/upload, 40 pages/chain/day. Requires `OPENAI_API_KEY`.

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

# 3. install, migrate, seed
npm install
npx prisma migrate dev
npm run db:seed

# 4. go
npm run dev
```

Open http://localhost:3000. The manager login page is at `/hyr` (not linked publicly).

### Demo manager accounts

Password for all: **`Aksione2026`**

| Chain | Email |
|---|---|
| Viva Fresh Store | `menaxher.viva@aksione.com` |
| Eli-abi | `menaxher.eliabi@aksione.com` |
| Meridian Express | `menaxher.meridian@aksione.com` |
| ETC | `menaxher.etc@aksione.com` |
| Interex | `menaxher.interex@aksione.com` |
| Albi Market | `menaxher.albi@aksione.com` |
| SPAR Kosova | `menaxher.spar@aksione.com` |

The seed creates 7 chains, ~32 stores and ~63 offers (active, expired and upcoming) —
including the same product at different prices across chains, so the comparison shines.
Chain logos in `public/brands/` are the chains' real marks (favicon/site sources);
product images are generated SVG placeholders until real flier ingestion exists.

## Project structure

```
prisma/            schema, migrations, seed (seed-data.ts holds the demo content)
public/brands/     real chain logos
src/app/           pages: / (offers), /oferta/[id], /dyqanet, /hyr, /menaxho (dashboard)
src/app/api/       REST route handlers: auth, sales CRUD (+ image upload), health
src/components/    SaleCard, SaleForm, SearchBar, nav, buttons
src/lib/           db (Prisma client), session, storage driver, validation (zod),
                   search normalization, formatting (sq locale), categories
src/proxy.ts       auth guard for /menaxho/* (Next 16 proxy convention)
```

## Production

Live on Vercel + Supabase. Deployment env vars (Vercel → Settings → Environment Variables):
`DATABASE_URL` (Supabase session pooler), `SESSION_SECRET`, `STORAGE_DRIVER=supabase`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=zbritje-images`.

To reseed production:

```powershell
$env:DATABASE_URL = "<supabase session pooler connection string>"
npx prisma migrate deploy
npm run db:seed
Remove-Item Env:DATABASE_URL
```

Custom domain: add `aksione.com` in Vercel → Settings → Domains, then point the
Cloudflare DNS records Vercel shows you (CNAME, proxy off / DNS-only is simplest).

## Out of scope for v1 (named future phases)

- Flier ingestion with AI extraction (chains publish PDF fliers — auto-extract offers)
- Manager image library (reuse uploaded images), offer cloning, dashboard search/pagination
- Usage analytics (searches, chain clicks) as a sellable insights product
- Branch-level sale targeting, browser-geolocation distance sorting
- Delivery integration / monetization / chain self-onboarding
