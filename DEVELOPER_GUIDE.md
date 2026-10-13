# Especia MIS Dashboard — Developer Guide

A complete handoff document. If you're picking this project up, read sections 1–5 to get it
running, then dip into the rest as needed.

---

## 1. What this app does

**Especia** (a CA / accounting firm) prepares a monthly **MIS** (Management Information System)
report for each client and presents it in review meetings. Historically this was done by hand in
Excel: take the client's **Tally Trial Balance** export, normalize it, and build a multi-sheet MIS
workbook.

This app **automates that pipeline**:

```
Upload Tally Trial Balance (.xls/.xlsx)
        │
        ▼
Parse + recover Dr/Cr signs + map each ledger to an MIS "grouping"
        │
        ▼
Master Data   (one normalized, signed row per ledger, per month — stored in Postgres)
        │
        ▼
Four calculated report pages, derived live from Master Data + per-period manual inputs:
   • P&L Detail      • Segment P&L      • Book to Bank      • Cash Conversion (CCC)
```

It is currently **single-client** (the seeded company is *Tirupati Automart*) but the schema carries
`company_id` on every table so multi-client + authentication can be added later. It already supports
**multiple months** (a period selector in the header switches between uploaded months).

The numbers are validated to match a reference Excel workbook exactly (see `src/lib/mis/__tests__/`).

---

## 2. Tech stack

| Layer        | Choice |
|--------------|--------|
| Framework    | Next.js 16 (App Router, React Server Components), TypeScript (strict) |
| Database     | Supabase (Postgres) — run locally via Docker |
| Styling      | Tailwind CSS v4 (CSS-first, no `tailwind.config.js`) |
| Charts       | Recharts |
| Excel I/O    | SheetJS (`xlsx`) — parsing uploads **and** building exports |
| Tests        | Vitest |

There is **no external backend** — Next.js server components/actions talk to Postgres directly.

---

## 3. Prerequisites

- **Node.js 20+** (developed on 24.16)
- **Docker Desktop** (required for local Supabase)
- The **Supabase CLI** is invoked via `npx supabase …` — no global install needed.

---

## 4. First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Start Docker Desktop (the app's Postgres runs in Docker)

# 3. Start the local Supabase stack.
#    First run pulls images (~5 min). Applies the migration + seed automatically.
npx supabase start
```

`supabase start` prints a block of URLs and keys. Then:

```bash
# 4. Create your local env file from the template
cp .env.example .env.local
```

Fill `.env.local` with the values from `npx supabase status`:

| .env.local variable                    | From `supabase status` |
|----------------------------------------|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`             | `API URL` (e.g. `http://127.0.0.1:55521`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `PUBLISHABLE_KEY` (aka anon key) |
| `SUPABASE_SECRET_KEY`                  | `SECRET_KEY` (aka service_role key) |

```bash
# 5. Run the dev server
npm run dev            # http://localhost:3000
```

> **Port note:** this project's Supabase is configured (in `supabase/config.toml`) to use the
> **555xx** port range (API `55521`, DB `55522`, Studio `55523`) so it can run alongside *other*
> local Supabase projects that use the default 543xx ports. If you only ever run this one project,
> you can change these back to the defaults.

To confirm it works, open `http://localhost:3000`, go to **Upload**, and upload the sample
`src/lib/mis/__tests__/fixtures/Tirupati_Trial.xlsx` for a month — the four report pages should
populate.

---

## 5. Commands

| Command | What it does |
|---------|--------------|
| `npm run dev`   | Dev server (Turbopack) at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run lint`  | ESLint |
| `npm test`      | **Vitest** — validates the parser + all four MIS engines against the reference-workbook numbers. Start here to confirm the calculation logic is intact after any change. |

Utility scripts (Node):

| Script | Purpose |
|--------|---------|
| `node scripts/gen-seed.mjs`      | Regenerate `supabase/seed.sql` (company + ledger map) from the seed JSON |
| `node scripts/make-fixtures.mjs` | Regenerate the test fixtures/oracle from the reference workbooks (needs those source files on disk) |
| `node scripts/dump-oracles.mjs`  | Print the workbook's Segment/Book-to-Bank/CCC values (used when building the engines) |
| `npx tsx scripts/verify-ingest.ts` | End-to-end check: parse the fixture TB → write to the running DB → read back → recompute P&L and assert it matches |

Regenerate DB types after a schema change:
```bash
npx supabase gen types typescript --local > src/lib/database.types.ts
```

Apply a schema change locally (re-runs migrations + seed, **wipes local data**):
```bash
npx supabase db reset
```

---

## 6. Data model (Postgres)

Defined in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Every table has
`company_id` for future multi-tenant support.

| Table | Purpose |
|-------|---------|
| `companies`     | One row per client. Seeded with *Tirupati Automart*. |
| `periods`       | One reporting month per company (`month`, `label` e.g. `Apr'26`, `status`). |
| `master_tb`     | **The Master Data.** One row per leaf ledger, per period. Columns mirror the reference workbook's `Master_TB` sheet: `grouping · bs_pl · particulars · classification · opening · debit · credit · closing`. Signed (assets/expenses +, liabilities/income/capital −). |
| `ledger_map`    | **The heart of the transform.** Per-company map from a raw Tally ledger name → its MIS `grouping`. Editable in the app (Mapping tab). |
| `manual_inputs` | Per-period figures **not** in the Trial Balance (closing stock, depreciation, interest, cash salary, segment stock splits, sales overrides). Flattened as `key · segment · value`. |
| `stock_info`    | Optional per-period stock values by category (from a Stock Info upload). |

**Security:** RLS is enabled with a read-for-everyone policy (Phase 1 has no auth). All **writes** go
through the service-role (admin) client server-side. When auth is added, tighten the SELECT policies
to company scoping. Note the explicit `GRANT`s at the bottom of the migration — newer Supabase does
**not** auto-expose new tables, so without those grants you get `permission denied`.

---

## 7. The transform pipeline (`src/lib/ingest/`)

### `parse-workbook.ts` — read the Excel
- `parseTrialBalance(buffer)` — reads a Tally Trial Balance. Skips the ~13 title/header rows and the
  `Grand Total` tail, detects the Particulars column, and returns each row's **unsigned** magnitudes
  plus an `isGroup` flag (primary-group headers vs leaf ledgers). Group headers are identified from a
  fixed list of Tally primary-group names in `catalog.ts` (`KNOWN_GROUP_NAMES`).
- `parseStockInfo(buffer)` — reads the two-table Stock Info sheet (opening/closing by category).
- Tally sometimes exports a file with an `.xls` extension that is actually modern OOXML; SheetJS
  handles both.

### `normalize.ts` — sign + map
- `recoverSigns(openMag, debit, credit, closeMag, nature)` — the raw export has **no Dr/Cr sign**.
  We recover it using the accounting identity **`closing = opening + debit − credit`**: pick the
  opening sign that makes `|closing|` match the reported closing magnitude. Ties (rows with no
  movement) are broken by the account's natural side.
- `normalizeTrialBalance(parsed, ledgerMap)` — turns parsed rows into signed `MasterRow`s, assigns
  each leaf its `grouping`/`bs_pl` from the `ledger_map`, and returns any **unmapped** ledgers (the
  review queue). Unmapped ledgers get a safe default grouping (`Other Expenses`).

Persistence lives in `src/lib/ingest/persist.ts` (admin-client writes: `upsertPeriod`,
`replaceMasterRows`, `saveManualInputs`, `saveStockInfo`).

---

## 8. The MIS engines (`src/lib/mis/`)

Pure, deterministic functions — no I/O. They take `MasterRow[]` + `ManualInputs` and return the
statement. This is why they're easy to unit-test against the workbook.

- **`catalog.ts`** — reference config: the Tally group names, account-nature rules (for sign
  tie-breaks), and the ordered **P&L line structure** (which grouping feeds each P&L line).
- **`pnl.ts`** — `computePnl`. `groupIndex()` builds SUMIFS-style lookups by grouping.
  - `Revenue = −Σ(revenue groupings)` (+ manual accessories/other overrides)
  - `COGS = OpeningStock + Purchases − ClosingStock + Rent + Loading`
  - `Gross Profit = Revenue − COGS`
  - `EBITDA = GP + Indirect Income − Indirect Expenses`
  - `EBIT = EBITDA − Depreciation`;  `EBT = EBIT − Interest`
  - Finance Cost line = `Σ(Finance Cost) − interest` (the interest is carved out below EBITDA).
- **`segment.ts`** — `computeSegment`. Splits revenue/purchases by segment (Vehicle / Accessories /
  Service), per-segment stock from manual inputs, and allocates Rent & Loading by revenue share.
- **`book-to-bank.ts`** — `computeBookToBank`. Cash-flow reconciliation from EBT through
  working-capital / loan / fixed-asset movements to closing bank balance, plus a waterfall.
  Movements use `opening − closing`, so they're unaffected by the creditor-sign note below.
- **`ccc.ts`** — `computeCcc`. Debtor/Inventory/Creditor days from annualized turnover over the
  closing balance; `CCC = DCP − CPP + ICP`.

### ⚠️ The Sundry Creditors / CCC decision (read this before touching `ccc.ts`)
The reference Excel stores the Sundry Creditors closing balance with a **forced-negative** sign that
breaks the `closing = opening + debit − credit` identity. That produces a nonsensical **−1-day**
creditor period and a **28-day** CCC. There are two defensible behaviours:
- **Legacy (current default):** `ccc.ts` forces `closingCreditors = −|…|` to reproduce the client's
  existing sheet exactly (CPP −1, CCC 28). Chosen by the client so numbers tie to what they've seen.
- **Corrected:** use the identity-correct sign → CPP +1, CCC 26. One-line change (remove the
  `-Math.abs(...)`).

This only affects the **CCC** page. Book to Bank is identical either way.

---

## 9. Manual inputs (the "Adjustments" tab)

Some figures aren't in the Trial Balance (they're the yellow cells in the original Excel): closing
stock, depreciation, interest, cash salary, employee-benefit expense, sales overrides, and per-segment
stock splits. They're entered per-period on the **Adjustments** screen and stored in `manual_inputs`.
Types are in `src/lib/mis/types.ts` (`ManualInputs`). If a manual value is absent, the engine falls
back to the grouping sum (or zero) — so a new month shows an "enter Adjustments" hint until filled.

---

## 10. Project structure

```
src/
  app/
    (dashboard)/            Route group sharing the sidebar + header shell (layout.tsx)
      master-data/          Master Data table (search + totals)
      upload/               Upload form + Server Action (actions.ts)
      mapping/              Ledger→grouping editor + unmapped queue (+ actions.ts)
      inputs/               "Adjustments" manual-inputs form (+ actions.ts)
      pnl/  segment/  book-to-bank/  cash-conversion/   The four report pages (+ their charts)
    export/xlsx/route.ts    GET handler → multi-sheet Excel export of the selected period
    layout.tsx  page.tsx  globals.css
  components/               Shared UI: sidebar, period-selector, export-menu, kpi, chart-card, ...
  lib/
    data/
      mis.ts                Server-side reads (getSelectedPeriod, getMasterRows, getManualInputs, …)
      constants.ts          DEFAULT_COMPANY_ID (the seeded Tirupati id)
    ingest/                 parse-workbook.ts, normalize.ts, persist.ts
    mis/                    types.ts, catalog.ts, pnl.ts, segment.ts, book-to-bank.ts, ccc.ts,
                            period.ts, seed/ledger-map.tirupati.json, __tests__/
    supabase/               client.ts (browser), server.ts (user-context), admin.ts (secret key)
    format.ts               Indian-locale number formatting (fmtAmount, fmtCompact, fmtPct)
    nav.ts                  Sidebar nav config
    period-cookie.ts        Client-safe cookie-name constant (see gotcha #1)
    database.types.ts       Generated Supabase types
supabase/
  migrations/0001_init.sql  Full schema + RLS + grants
  seed.sql                  Tirupati company + 76-row ledger map (generated)
  config.toml               Local stack config (ports, disabled services)
scripts/                    Dev/build utilities (see §5)
```

---

## 11. Key conventions & gotchas

1. **server-only vs client boundary.** Anything importing `server-only`, `next/headers`, or the
   Supabase server/admin clients must never be imported by a `"use client"` component — it drags
   server code into the client bundle and breaks the build. That's why the period cookie *name* lives
   in the tiny client-safe `src/lib/period-cookie.ts`, not in the server-only `data/mis.ts`.
2. **Supabase table grants.** Newer Supabase doesn't auto-expose new public tables. The migration
   ends with explicit `GRANT`s (anon/authenticated read, service_role all). Without them: `permission
   denied`. Keep them when adding tables.
3. **SheetJS in ESM/Node scripts** needs `XLSX.read(fs.readFileSync(path))` — `XLSX.readFile` doesn't
   work (no `fs` wired in the ESM build).
4. **No render-time mutation.** ESLint's `react-hooks/immutability` rejects reassigning a `let`
   inside a `.map()` during render (see `book-to-bank/waterfall.tsx` — it uses a `reduce` accumulator
   instead).
5. **This is Next.js 16.** APIs differ from older Next. The auto-generated `AGENTS.md` reminds you to
   read `node_modules/next/dist/docs/` before writing framework-level code. `params`/`searchParams`
   are async; cookie/DB reads make a route dynamic (expected here).
6. **Numbers are Indian-formatted** (lakhs/crores) via `src/lib/format.ts`. Financial cells use the
   `.num` class (tabular figures).

---

## 12. How to extend

**Add a new report page:** create `src/lib/mis/<engine>.ts` (pure function over `MasterRow[]` +
`ManualInputs`), add a unit test in `src/lib/mis/__tests__/` against known values, add a route under
`src/app/(dashboard)/<name>/page.tsx` (read via `getSelectedPeriod` + `getMasterRows` +
`getManualInputs`), and add it to `src/lib/nav.ts`. Add it to the Excel export in
`src/app/export/xlsx/route.ts` too.

**Change a ledger mapping:** do it in the app (Mapping tab) — it writes `ledger_map` and re-flows
into every page. To change the *default* seed, edit `src/lib/mis/seed/ledger-map.tirupati.json` and
`node scripts/gen-seed.mjs`.

**Add a new company:** insert a `companies` row + its `ledger_map`, then remove the single-company
assumption (`DEFAULT_COMPANY_ID` in `src/lib/data/constants.ts`) — thread a real `company_id` through
the reads (from the session, once auth exists).

**Add authentication / multi-tenant (biggest deferred item):** add Supabase Auth, replace
`DEFAULT_COMPANY_ID` with the signed-in user's company, and tighten the RLS SELECT policies from
`using (true)` to company-scoped (manager role sees all; company role sees only its own). The client
patterns in `src/lib/supabase/` already follow the `@supabase/ssr` cookie approach.

**Deploy:** it's a standard Next.js app + hosted Supabase. Point the env vars at a hosted Supabase
project (`supabase db push` the migration), then deploy to Vercel/Cloudflare/Node host.

---

## 13. Testing & validation approach

The correctness strategy is: **keep all financial logic in pure engine functions and pin them to the
reference workbook's real numbers.**

- `src/lib/mis/__tests__/engine.test.ts` — parser + P&L vs the `Master_TB`/`P&L` oracle (Apr'26).
- `src/lib/mis/__tests__/pages.test.ts` — Segment, Book to Bank, CCC vs their oracle values.
- Fixtures (`__tests__/fixtures/`) include the real sample Trial Balance + the expected outputs, so
  `npm test` re-proves the whole chain (parse → sign → map → compute) with no DB required.

Run `npm test` after **any** change to `ingest/` or `mis/`. If you change a formula intentionally,
update the oracle expectation in the test and say why.

---

## 14. Roadmap (deferred, in rough priority order)

1. **Auth + multi-client** (Supabase Auth + RLS; manager-sees-all vs client-scoped).
2. **More report tabs** from the original Excel: Debtor Ageing, Creditor Ageing, YOY Comparison,
   Summary. These need their own raw-data inputs (e.g. an ageing export).
3. **Deployment** to a host + hosted Supabase.
4. **Styling parity / polish** to more closely match the original design mock.
5. **Stock Info → segment stock** auto-wiring (currently segment stock is entered manually in
   Adjustments; it could be derived from a Stock Info upload).

---

## 15. Reference materials

The original artifacts this was built from (not shipped in the repo, but the numbers are pinned in the
tests): a Tally Trial Balance export, a Stock Info sheet, and the finished MIS Excel workbook whose
formulas define every calculation here. The sample Trial Balance + Stock Info are included as test
fixtures under `src/lib/mis/__tests__/fixtures/`.
