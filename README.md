# Especia MIS Dashboard

Turns a client's monthly **Tally Trial Balance** export into a set of **MIS reports** — the pipeline
is: upload → normalized **Master Data** → four calculated pages (**P&L Detail, Segment P&L, Book to
Bank, Cash Conversion**). Built with Next.js 16 + Supabase (Postgres) + TypeScript.

> **New here? Read [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md)** — it covers the architecture, data
> model, the calculation engines, conventions/gotchas, and how to extend the app.

# Frontend-only demo (Windows PowerShell)

```powershell
npm install
Copy-Item .env.example .env.local
# Set DEMO_MODE=true in .env.local
npm run dev
```

Open `http://localhost:3000` (Companies) or `http://localhost:3000/c/tirupati-automart/dashboard`. Docker Desktop, `npx supabase start`, and Supabase credentials are not required. Stop the server with `Ctrl+C`.

In demo mode you are signed in as an admin, so every page works: the firm pages (Companies, Users,
Audit, Review, Queries, Reports, Upload, Profile) and every Tirupati Automart page (Dashboard, P&L,
Segment, Book to Bank, Cash Conversion, Budget vs Actual, Charts, Compare, Debtors, Creditors,
GP Dashboard, History, Queries, Reports, plus the staff pages Upload, Master Data, Mapping, Template,
Budget, Inputs, Branches). The figures are illustrative sample data for Apr'26, May'26 and Jun'26
(FY 2026-27); use the period selector to switch months. Excel downloads (MIS pack, single reports,
budget and mapping templates) produce workbooks from the demo data. Any form that would save
something (uploads, edits, mapping, users, companies, queries) replies
"Not saved — this is a demo." and nothing is written.

To check every page and download against a running demo server:

```powershell
node scripts/demo-smoke.mjs   # BASE_URL defaults to http://localhost:3000; exits 1 on any failure
```

## Supabase development

```bash
npm install
# Start Docker Desktop, then:
npx supabase start                 # first run pulls images (~5 min); applies migration + seed
cp .env.example .env.local         # fill from `npx supabase status` (see the guide)
npm run dev                        # http://localhost:3000
```

Then open **Upload**, upload `src/lib/mis/__tests__/fixtures/Tirupati_Trial.xlsx` for a month, and the
report pages populate.

## Commands

| Command | |
|---------|--|
| `npm run dev`   | Dev server |
| `npm run build` | Production build |
| `npm run lint`  | ESLint |
| `npm test`      | Vitest — validates the parser + MIS engines against the reference workbook |

## Layout

- `src/app/(dashboard)/…` — the pages (Master Data, Upload, Mapping, Adjustments + the 4 reports)
- `src/lib/ingest/` — Excel parsing, Dr/Cr sign recovery, ledger→grouping mapping, persistence
- `src/lib/mis/` — the pure, tested calculation engines (P&L, Segment, Book-to-Bank, CCC)
- `src/lib/data/` — server-side reads; `src/lib/supabase/` — DB clients
- `supabase/` — schema migration, seed, local config

See the [Developer Guide](DEVELOPER_GUIDE.md) for everything else.
