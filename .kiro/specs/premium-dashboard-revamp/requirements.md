# Premium dashboard revamp: requirements

## Introduction

This spec redesigns the Especia MIS dashboard (a CA firm's client portal that turns Tally trial balances into monthly MIS reports) to the restrained, flat, single-accent design in brief.md, with Light, Dark and System themes. Per the user clarification in brief.md, content does not change: every page, route, nav item and order, metric, label wording, number, column, chart series, data field and business rule stays. Only appearance, arrangement, component structure and file layout change.

The reference screenshot (Vantage Admin, a sales-team dashboard) and the LAYOUT section are style and structure patterns. Each pattern is applied to the existing content block it matches; patterns with no matching content are not built (see Decisions). The sidebar content (every section, item, label word, order, visibility rule, the "Open company" block and the "All companies" link) stays exactly as today.

## Current inventory

### Routes and pages

All dashboard pages render inside `PortalShell` (sidebar plus header), drawn by `(firm)/layout.tsx` or `c/[slug]/layout.tsx`. `(dashboard)/layout.tsx` is auth only and renders no chrome on purpose (see OQ-1).

| URL | File (under `src/app/`) | Lines | Renders |
|-----|-------------------------|-------|---------|
| `/` | `page.tsx` | 17 | Redirect by role: company user to `/c/[slug]/dashboard`, staff to `/companies` |
| `/login` | `login/page.tsx`, `login-form.tsx`, `actions.ts` | 54, 62, 66 | Sign-in card on a radial mesh background |
| `/companies` | `(dashboard)/(firm)/companies/page.tsx` | 49 | Client card grid, new company form, archived list |
| `/review` | `(firm)/review/page.tsx` | 106 | Review queue with status pills |
| `/upload` | `(firm)/upload/page.tsx` | 34 | Company chooser for MIS upload |
| `/queries` | `(firm)/queries/page.tsx` | 24 | Company chooser for notes and queries |
| `/reports` | `(firm)/reports/page.tsx` | 30 | Company chooser for reports |
| `/profile` | `(firm)/profile/page.tsx` | 38 | Signed-in profile |
| `/users` (admin) | `(firm)/users/page.tsx` + `user-row.tsx`, `new-user-form.tsx`, `role-fields.tsx` | 57, 272, 113, 139 | User list and provisioning |
| `/audit` (admin) | `(firm)/audit/page.tsx`, `load-more.tsx` | 202, 35 | Audit log with action pills |
| `/c/[slug]/dashboard` | `c/[slug]/dashboard/page.tsx` | 340 | Company header, 10 KPI tiles, report tab grid, branch scope, profit summary table, balance sheet summary table |
| `/c/[slug]/gp-dashboard` | `gp-dashboard/page.tsx`, `gp-dashboard-viewer.tsx` | 70, 56 | Uploaded GP dashboard HTML in a frame |
| `/c/[slug]/history` | `history/page.tsx` | 104 | MIS history list |
| `/c/[slug]/compare` | `compare/page.tsx`, `month-picker.tsx` | 108, 71 | Two-month comparison |
| `/c/[slug]/pnl` | `pnl/page.tsx`, `pnl-table.tsx` | 248, 72 | P&L detail, monthly or branch-wise, quarter filter |
| `/c/[slug]/segment` | `segment/page.tsx`, `segment-charts.tsx` | 191, 86 | Segment P&L table and charts |
| `/c/[slug]/book-to-bank` | `book-to-bank/page.tsx`, `book-to-bank-table.tsx`, `waterfall.tsx` | 155, 66, 87 | Cash reconciliation table and waterfall |
| `/c/[slug]/cash-conversion` | `cash-conversion/page.tsx`, `ccc-table.tsx`, `ccc-chart.tsx` | 149, 143, 51 | CCC days table and chart |
| `/c/[slug]/budget-vs-actual` | `budget-vs-actual/page.tsx`, `budget-vs-actual-table.tsx` | 85, 100 | Budget vs actual table |
| `/c/[slug]/debtors`, `/creditors` | `debtors/page.tsx`, `creditors/page.tsx` (6 each) | 6 | Shared `AgeingPage` |
| `/c/[slug]/charts` | `charts/page.tsx`, `charts-board.tsx`, `chart-frame.tsx` | 131, 514, 229 | Chart board with series chips and filters |
| `/c/[slug]/reports` | `reports/page.tsx`, `period-downloads.tsx` | 141, 53 | Report list and Excel downloads |
| `/c/[slug]/queries` | `queries/page.tsx`, `query-forms.tsx`, `actions.ts` | 92, 60, 44 | Notes and queries thread |
| `/c/[slug]/master-data` (staff) | `(data)/master-data/page.tsx`, `master-table.tsx`, `editable-cell.tsx` | 146, 199, 133 | Editable master TB |
| `/c/[slug]/upload` (staff) | `(data)/upload/page.tsx` + `upload-form.tsx`, `period-list.tsx`, `gp-dashboard-form.tsx`, `gp-dashboard-list.tsx` | 34, 165, 106, 74, 91 | TB and GP dashboard upload |
| `/c/[slug]/mapping` (staff) | `(data)/mapping/page.tsx`, `mapping-editor.tsx`, `bulk-mapping-form.tsx` | 103, 331, 59 | Ledger to grouping mapping |
| `/c/[slug]/inputs` (staff) | `(data)/inputs/page.tsx`, `inputs-form.tsx` | 88, 163 | Adjustments form |
| `/c/[slug]/budget` (staff) | `(data)/budget/page.tsx`, `budget-upload-form.tsx` | 16, 50 | Budget upload |
| `/c/[slug]/template` (staff) | `(data)/template/page.tsx`, `template-editor.tsx` | 37, 624 | MIS template editor |
| `/c/[slug]/branches` (staff) | `(data)/branches/page.tsx`, `branches-editor.tsx` | 37, 701 | Branches, groups, report scope editor |

Route handlers (no UI): `/api/auth/refresh` (GET, session refresh), `/export/xlsx` (GET, MIS pack and single report workbooks), `/c/[slug]/mapping/template` and `/c/[slug]/budget/template` (GET, template workbooks). Boundaries: `global-error.tsx`, `(firm)/error.tsx`, `(firm)/loading.tsx`, `c/[slug]/error.tsx`, `c/[slug]/loading.tsx`.

### Shared components (`src/components/`)

| File | Lines | Renders |
|------|-------|---------|
| `portal-shell.tsx` | 176 | App frame: skip link, sidebar, glass sticky header with period, unit, export, meeting mode, user menu, demo banner |
| `sidebar.tsx` | 165 | Navy sidebar, gradient logo tile, open company card, grouped nav, mobile `<dialog>` drawer |
| `header-overflow.tsx` | 155 | "More" menu folding export and meeting mode below xl |
| `kpi-delta.tsx` | 81 | KPI tile with colored 3px top border, arrow glyph, percent change, "favourable/adverse" text. Calls `getFmtCompact()` itself |
| `kpi.tsx` | 48 | KPI tile with status top border |
| `company-header.tsx` | 66 | Company identity block with status pill and static pill |
| `company-avatar.tsx` | 56 | Logo or gradient initials tile |
| `report-tabs.tsx` | 79 | Pill grid of report links, gradient active tab |
| `branch-scope-selector.tsx`, `branch-picker.tsx`, `period-picker.tsx`, `period-selector.tsx`, `quarter-filter.tsx`, `unit-switch.tsx` | 129, 67, 74, 50, 64, 83 | Segmented filters and selects (gradient active state) |
| `ageing-page.tsx`, `ageing-table.tsx` | 131, 155 | Debtors and creditors ageing with bucket pills |
| `chart-card.tsx`, `charts/chart-skeleton.tsx`, `charts/use-chart-colors.ts` | 31, 20, 59 | Chart card, chart skeleton and empty state, CSS variable reader (reads once on mount, does not react to theme changes) |
| `modal.tsx` | 69 | Native `<dialog>` modal, `shadow-2xl` |
| `page-skeleton.tsx`, `route-error.tsx`, `placeholder.tsx` | 29, 42, 25 | Loading, error, placeholder |
| `action-status.tsx`, `company-chooser.tsx`, `export-menu.tsx`, `user-menu.tsx`, `session-keep-alive.tsx`, `unit-context.tsx` | 34, 70, 24, 28, 25, 26 | Action reply, chooser list, export links, identity, keep-alive ping, unit context |

There is no `src/components/ui/` folder and no `components.json`.

### Data sources

| Source | Location | Notes |
|--------|----------|-------|
| Server reads | `src/lib/data/*.ts` | `mis.ts` (26 reads: company, periods, master rows, branches, segments, template, manual inputs, budget, ageing, edits), `company-context.ts`, `portfolio.ts`, `charts.ts`, `queries.ts`, `review.ts`, `users.ts`, `audit.ts`, `unit.ts`, `report-tabs.ts`, `scoped-link.ts`, `paging.ts`, `constants.ts` |
| Server actions | 11 `actions.ts` files under `src/app/` | login, companies, users, queries, upload, template, inputs, master-data, budget, mapping, branches |
| Supabase tables | via `@supabase/ssr` clients in `src/lib/supabase/` | ageing, audit_log, branch_groups, branches, ca_companies, companies, ledger_map, manual_inputs, master_tb, master_tb_edits, mis_budgets, mis_segments, mis_template_lines, periods, profiles, queries, query_replies, report_scope_config, stock_info. Storage bucket: company-logos. No RPC calls |
| Calculation engines | `src/lib/mis/` | pnl, segment, book-to-bank, ccc, budget, charts, quarters, ytd (pure, tested) |
| Ingest and export | `src/lib/ingest/`, `src/lib/export/` | Excel parsing and workbook building |
| Demo data | `src/lib/demo/` | `DEMO_MODE` serves an in-memory Tirupati Automart dataset and blocks writes |
| Client fetch | `session-keep-alive.tsx` | `fetch("/api/auth/refresh")` |
| Cookies and storage | `period-cookie.ts`, `unit-cookie.ts`, `branch-scope-cookie.ts`, meeting mode in localStorage | Selected period, unit, branch scope |
| Env var names | | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DEMO_MODE`, `NODE_ENV` |

### Installed stack

| Item | Status |
|------|--------|
| Next.js | 16.3.0 (App Router, async `params`, global `LayoutProps`, docs in `node_modules/next/dist/docs/`) |
| React | 19.2.8 |
| TypeScript | 5, strict, `@/*` maps to `./src/*` |
| Tailwind CSS | 4.3.3 via `@tailwindcss/postcss`, CSS-first, no `tailwind.config` file. Dark mode therefore means `@custom-variant dark (&:where(.dark, .dark *));` in globals.css |
| shadcn/ui | Not set up (no `components.json`, no `src/components/ui/`, no `class-variance-authority`, `tailwind-merge` or Radix) |
| recharts | 3.10.1, used directly (not through the shadcn Chart component) |
| @tanstack/react-table | Not installed |
| lucide-react | 1.32.0. All icon names in the brief exist: House, Briefcase, UsersRound, Workflow, Lightbulb, Hash, CalendarDays, ChartLine, Repeat, TrendingUp, Network, Layers, plus Sun, Moon, Monitor, Check, Bell, Calendar, PanelLeft |
| next-themes | Not installed |
| geist | Not installed. Font today is the system UI stack from `--font-sans`; no webfont is loaded |
| clsx | 2.1.1 present only as a transitive dependency |
| Lint, tests | `eslint` 9 with `eslint-config-next`, `vitest` 4. No `typecheck` script; `next build` runs the type check |
| Hosting | Cloudflare via `@opennextjs/cloudflare` |

Next.js docs relevant to this work: `01-app/01-getting-started/13-fonts.md`, `03-api-reference/02-components/font.md`, `03-api-reference/03-file-conventions/route-groups.md` (route groups must not resolve to the same URL), `layout.md` (typed `LayoutProps`), `dynamic-routes.md`.

Pre-existing working tree changes not made by this spec: `.agents/tasks/frontend-demo-final.md`, `c/[slug]/cash-conversion/ccc-table.tsx`, `c/[slug]/charts/chart-frame.tsx` (modified), plus untracked `.agents/`, `.claude/`, `.factory/`, `.kiro/`, `.pi/`, `skills-lock.json`.

## Confirmed problems

All nine are confirmed. Searches ran with ripgrep over `src/`.

### P1. Violet gradients (confirmed)

The brand gradient runs from violet `hsl(262 83% 58%)` to gold.

| File | Lines | Snippet |
|------|-------|---------|
| `src/app/globals.css` | 70, 73, 207-214, 224-229 | `--grad: linear-gradient(135deg, hsl(262 83% 58%) ...`, `.brand-grad`, `.text-brand-grad` with `background-clip: text`, `.mesh-bg` with three `radial-gradient` |
| `src/components/sidebar.tsx` | 120 | `background: "var(--grad)"` on the logo tile |
| `src/components/company-avatar.tsx` | 51 | inline `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))` |
| `src/app/login/page.tsx` | 32, 38 | `mesh-bg` page background, gradient logo tile |
| `src/app/(dashboard)/(firm)/users/user-row.tsx` | 140, 197 | `brand-grad` button, gradient avatar |
| Active state of segmented controls | `unit-switch.tsx:51`, `branch-scope-selector.tsx:111`, `branch-picker.tsx:63`, `period-picker.tsx:70`, `quarter-filter.tsx:39`, `report-tabs.tsx:74`, `ageing-table.tsx:83`, `charts/page.tsx:18`, `charts/chart-frame.tsx:206`, `pnl/page.tsx:212,221` | `"brand-grad text-white shadow-sm"` |
| Primary buttons | `route-error.tsx:31`, `new-user-form.tsx:44,118`, `new-company-form.tsx:112,187`, `company-card.tsx:362,495` | `brand-grad ... text-white shadow-sm` |

No `bg-gradient-*` utilities and no `from-`/`via-`/`to-` color utilities were found; every gradient goes through the custom classes or inline styles above.

### P2. Decorative effects (confirmed: glow, blur, glass; not found: neon borders, sparkle icons)

| File | Lines | Snippet |
|------|-------|---------|
| `src/app/globals.css` | 217-221 | `.glass { backdrop-filter: blur(14px) }` |
| `src/components/portal-shell.tsx` | 141 | `<header className="glass sticky ...">` |
| `src/app/(dashboard)/c/[slug]/gp-dashboard/gp-dashboard-viewer.tsx` | 48 | `bg-card/95 ... shadow-sm backdrop-blur` |
| `src/components/header-overflow.tsx` | 20-22 | icon swap animates `filter` with `blur-[4px]`, 300ms cubic-bezier, scale 0.25 |
| `src/components/sidebar.tsx` | 121 | glow `boxShadow: "0 6px 18px -6px hsl(var(--primary) / 0.6)"` |
| `src/app/login/page.tsx` | 39 | same glow |
| `src/components/company-header.tsx` | 35 | same glow |
| `src/components/page-skeleton.tsx`, `charts/chart-skeleton.tsx` | 8, 12 | `animate-pulse` (loading skeleton only, with `motion-reduce:animate-none`) |
| Press animation | `user-row.tsx:140`, `new-user-form.tsx:44,118`, `new-company-form.tsx:112,187`, `company-card.tsx:362,495` | `motion-safe:not-disabled:active:scale-[0.96]` |

Searched: `blur`, `backdrop`, `glass`, `glow`, `neon`, `drop-shadow`, `animate-`, `shimmer`, `keyframes`, `Sparkle`, `Wand`, `Stars`. No neon borders, no bounce or ping, no sparkle or wand icons.

### P3. En dashes and em dashes (confirmed)

634 occurrences in 139 files under `src/` (14 en dash, 620 em dash). Most are in comments; many are UI text or output strings. In the snippets below, `[em]` stands for U+2014 and `[en]` for U+2013 so this file stays dash free.

| File | Lines | Snippet |
|------|-------|---------|
| `src/app/layout.tsx` | 10 | `description: "Management Information System [em] Trial Balance ..."` |
| `src/components/ageing-table.tsx` | 12, 18-21, 142, 154 | bucket labels `"0[en]30"`, `"30[en]60"`, empty cell `"[em]"` |
| `src/app/(dashboard)/c/[slug]/cash-conversion/ccc-table.tsx` | 126-134 | `"Sales [em] Monthly"`, `"COGS [em] Annualised"` |
| `src/app/(dashboard)/c/[slug]/dashboard/page.tsx` | 158, 340 | YTD label `"Apr[en]Jun"`, empty cell `"[em]"` |
| `pnl-table.tsx:64`, `book-to-bank-table.tsx:61`, `segment/page.tsx:32`, `pnl/page.tsx:164`, `company-card.tsx:440` | | empty cell or margin `"[em]"` |
| `src/components/quarter-filter.tsx` | 36 | `" [em] no months uploaded yet"` |
| `src/components/unit-switch.tsx` | 80 | `aria-label="₹/$ [em] rupees per US dollar"` |
| `upload-form.tsx:161`, `company-card.tsx:141`, `branches-editor.tsx:34`, `audit/page.tsx:87` | | UI sentences joined with an em dash |
| `src/lib/demo/messages.ts` | 6, 9 | `"Not saved [em] this is a demo."`, demo banner |
| `src/lib/format.ts` | 106 | `fyDisplay` writes an en dash (`"FY 2026[en]27"`), asserted by `src/lib/__tests__/format.test.ts:109` |
| `src/lib/export/*.ts`, `src/lib/mis/book-to-bank.ts:282-283`, `src/lib/mis/catalog.ts:114-117`, `src/lib/demo/dataset.ts` | | dashes inside workbook titles, statement labels and demo copy |
| Heaviest comment files | `lib/data/mis.ts` (44), `lib/mis/book-to-bank.ts` (31), `lib/mis/catalog.ts` (25), `company-card.tsx` (16) | comments |

### P4. Emoji and glyphs used as icons (confirmed)

| File | Lines | Snippet |
|------|-------|---------|
| `src/app/(dashboard)/c/[slug]/(data)/mapping/mapping-editor.tsx` | 145 | `<option value="__new__">[heavy plus emoji U+2795] New grouping…</option>` |
| `src/lib/export/mapping-template-workbook.ts` | 57 | comment quoting the same emoji |
| `src/components/kpi-delta.tsx` | 73 | arrow glyphs `→ ↗ ↘` as trend icons |
| `src/app/(dashboard)/c/[slug]/(data)/branches/branches-editor.tsx` | 115, 125, 322, 332 | `↑` `↓` text glyphs as move buttons |
| `src/app/(dashboard)/c/[slug]/(data)/template/template-editor.tsx` | 155, 165, 466, 467 | `↑` `↓` move buttons |
| `src/app/(dashboard)/c/[slug]/(data)/mapping/mapping-editor.tsx` | 111 | `↩` glyph button |

### P5. Too many badges, chips and colored tags (confirmed)

| File | Lines | Snippet |
|------|-------|---------|
| `src/components/kpi-delta.tsx`, `kpi.tsx` | 29, 58; 33 | every KPI tile has a colored 3px top border plus a colored delta plus "favourable/adverse" text; the dashboard shows 10 tiles |
| `src/components/company-header.tsx` | 42, 64 | status pill with dot, static pill |
| `src/components/report-tabs.tsx` | 53-74 | pill grid of report links next to the KPI grid |
| `src/app/(dashboard)/(firm)/companies/company-card.tsx` | 385-398 | `StatusPill` with colored tone and dot on every card |
| `src/app/(dashboard)/(firm)/users/user-row.tsx` | 213 | `ROLE_TONE` colored role tag |
| `src/app/(dashboard)/(firm)/audit/page.tsx` | 100 | `ACTION_TONE` colored action tag per row |
| `src/app/(dashboard)/(firm)/review/page.tsx` | 26 | colored status pill per row |
| `src/app/(dashboard)/c/[slug]/queries/page.tsx` | 69, 74 | count pill and colored `STATUS_TONE` pill |
| `(data)/upload/period-list.tsx` | 68 | `STATUS_TONE` pill per period |
| `(data)/master-data/master-table.tsx` | 112 | warning pill |
| `(data)/branches/page.tsx:31`, `(data)/template/page.tsx:37`, `components/placeholder.tsx:17` | | "Staff only" accent pill |
| `charts/chart-frame.tsx`, `charts/charts-board.tsx` | 217-238; 171, 497, 514 | colored series `Chip` toggles |
| `src/components/ageing-table.tsx` | 81 | bucket filter pills |

### P6. Generic filler copy (mostly not found)

Searched UI files for: unlock, supercharge, seamless, effortless, powerful, at a glance, beautiful, magic, all-in-one, streamline, empower, welcome back, get started, journey, elevate, delight, and exclamation marks in strings. Also read every page subtitle under a `.page-title`. No marketing phrases and no exclamation marks were found; page subtitles are factual (period labels, scope, unit). The login subtitle `"Access your dashboard portal."` was reviewed and is kept (OQ-30).

Title case labels are widespread (for example `"Gross Profit"`, `"Net Profit (EBT)"`, `"Profit Summary"`, nav labels in `src/lib/nav.ts`, report tab labels in `src/lib/report-tabs.ts`), which breaks the sentence case copy rule. Per the clarification these become sentence case with the same words.

### Copy removals

None. No string is removed anywhere (OQ-30). The only copy edits are sentence case, dash replacement, emoji replacement and exclamation mark removal (none found), with the same words.

Strings reviewed and kept: `"Access your dashboard portal."` (login subtitle), `"Client Portal"` and `"Management Information System"` (product subtitle, becomes "Client portal" and "Management information system"), `"Prepared by Especia Associates LLP"`, `"Especia Associates LLP"` (login footer and sidebar footer), `"Your account details."` (profile subtitle), `"favourable"` and `"adverse"` (KPI meaning, needed so color is not the only signal), `"vs last month"`, `"Staff only"` (becomes plain muted text, not a pill), `"This report isn't available yet."`.

### P7. Large rounded corners and heavy shadows (confirmed)

| File | Lines | Snippet |
|------|-------|---------|
| `src/app/globals.css` | 141-143, 145-147, 197-203 | `--shadow-card: 0 4px 24px -8px ...`, `--radius-xl: 0.9rem`, `--radius-2xl: 1.25rem`, `.card-surface { box-shadow: var(--shadow-card) }` |
| `.card-surface` users | 19 TSX files | every card carries the shadow |
| `src/components/modal.tsx` | 69 | `shadow-2xl` |
| `src/components/header-overflow.tsx`, `portal-shell.tsx` | 128; 132 | `shadow-lg` |
| `kpi-delta.tsx`, `kpi.tsx`, `report-tabs.tsx` | 29, 58; 33; 53-54 | `shadow-card` |
| `src/components/sidebar.tsx` | 25 | inset box shadow as the active bar |
| `rounded-xl` | 62 uses in about 45 files | for example `kpi-delta.tsx`, `segment/page.tsx`, `branches-editor.tsx`, `dashboard/page.tsx:92` |
| `shadow-sm` | 24 uses | segmented controls and buttons listed in P1 |

### P8. Inconsistent spacing, font sizes and card styles (confirmed)

| Evidence | Detail |
|----------|--------|
| Type steps in TSX | 9 sizes in use: `text-sm` (213), `text-xs` (152), `text-caption` (26), `text-overline` (25), `text-base` (17), `text-metric` (4), `text-lg` (3), `text-ui` (3), `text-xl` (1) |
| Radius | 6 values: `rounded-lg` (84), `rounded-xl` (62), `rounded-md` (59), `rounded` (18), `rounded-full` (18), `rounded-sm` (4) |
| Card padding | `.card-surface` cards use `p-4` (5), `p-5` (9), `p-6` (1), `p-8` (1); KPI tiles use `p-3.5` |
| Page title | `.page-title` is 24px with -0.025em (brief: 20px, -0.01em); the company dashboard uses `CompanyHeader` instead |
| Tables | Report tables use the navy header `.tbl-report` with gold subtotal rows; other tables use ad hoc Tailwind |
| Hard-coded colors | `text-white` in 30 places, `bg-white/5`, `bg-white/10`, `border-white/5`, `text-white/55`, `text-white/65` in `sidebar.tsx`, `bg-black/60` in `modal.tsx:66` and `sidebar.tsx:94`, inline color styles in `segment-charts.tsx:64`, `charts-board.tsx:249`, `chart-frame.tsx:172,238`. No `dark:` classes and no hex colors in TSX |
| Controls | Heights mix `h-8`, `h-9` and padding-sized pills; `ui-classes.ts` sets `text-base sm:text-sm` on fields |

### P9. Large components that mix data, logic and markup (confirmed)

Files over 150 lines (excluding tests and JSON):

| Lines | File | Kind |
|-------|------|------|
| 1083 | `src/lib/database.types.ts` | generated types |
| 805 | `src/lib/data/mis.ts` | data access |
| 701 | `src/app/(dashboard)/c/[slug]/(data)/branches/branches-editor.tsx` | UI, state and markup |
| 686 | `src/lib/demo/dataset.ts` | demo data |
| 624 | `(data)/template/template-editor.tsx` | UI, state and markup |
| 535 | `(firm)/companies/company-card.tsx` | UI with several components |
| 514 | `c/[slug]/charts/charts-board.tsx` | UI, chart logic and markup |
| 460 | `(data)/branches/actions.ts` | server actions |
| 434 | `src/lib/export/mis-workbook.ts` | export |
| 394 | `(data)/template/actions.ts` | server actions |
| 367 | `(data)/upload/actions.ts` | server actions |
| 363 | `(firm)/companies/actions.ts` | server actions |
| 340 | `c/[slug]/dashboard/page.tsx` | data fetch, computation, two tables and markup in one file |
| 337 | `src/app/globals.css` | styles |
| 331 | `(data)/mapping/mapping-editor.tsx` | UI |
| 315 | `src/lib/mis/book-to-bank.ts` | engine |
| 299 | `src/lib/ingest/persist.ts` | ingest |
| 297 | `src/lib/mis/catalog.ts` | engine config |
| 272 | `(firm)/users/user-row.tsx` | UI |
| 248 | `c/[slug]/pnl/page.tsx` | data, computation and markup |
| 247 | `(data)/mapping/actions.ts` | server actions |
| 230 | `(firm)/users/actions.ts` | server actions |
| 229 | `c/[slug]/charts/chart-frame.tsx` | UI (three components) |
| 220 | `src/lib/ingest/parse-workbook.ts` | ingest |
| 202 | `(firm)/audit/page.tsx`, `src/lib/mis/ccc.ts` | page; engine |
| 199 | `(data)/master-data/master-table.tsx` | UI |
| 191 | `c/[slug]/segment/page.tsx` | page |
| 190 | `src/lib/data/portfolio.ts` | data access |
| 189 | `src/app/export/xlsx/route.ts` | route handler |
| 187 | `src/lib/export/workbook.ts` | export |
| 178 | `(firm)/companies/new-company-form.tsx` | UI |
| 176 | `src/components/portal-shell.tsx` | UI and localStorage logic |
| 168 | `src/lib/data/charts.ts` | data access |
| 165 | `src/components/sidebar.tsx`, `(data)/upload/upload-form.tsx` | UI |
| 163 | `(data)/inputs/inputs-form.tsx` | UI |
| 155 | `header-overflow.tsx`, `ageing-table.tsx`, `c/[slug]/book-to-bank/page.tsx` | UI |

Also: `kpi-delta.tsx` reads cookies through `getFmtCompact()`, so a presentational component fetches data.

## Sidebar route mapping

Rule from the clarification and the reiteration: the sidebar content stays exactly as today. Every section ("Data", "Reports"), every item, every label word, the item order, every visibility rule (role lists from `navFor()`, Segment P&L hidden without segments, staff-only blocks), the "Open company" block, the "All companies" link and the "Especia Associates LLP" footer line stay. The only label change is sentence case with the same words, and the only visual change per item is its lucide icon (OQ-4).

### Brief and screenshot items vs our routes

None of the brief's 12 items, and none of the screenshot's items (which add Customers and Boardplan and repeat Processes and Insights under Team), exists as a route or nav label in our app. No route is added for them.

| Brief or screenshot item | Our route or nav item | Status |
|--------------------------|-----------------------|--------|
| Home, Business, Customer insights, Processes, Insights, Numbers, Customers, Collections, Weekly numbers, Weekly analysis, Subscriptions, Projections, Network, Boardplan | none | No match, not built |

Because no label matches by name, the brief's icon mapping (House, Briefcase, UsersRound and so on) applies to none of our items. Each nav item gets a distinct lucide icon (OQ-4); design.md lists the mapping. Labels are untouched.

### Grouping

The DASHBOARD, TEAM, PERFORMANCE and NETWORK groups do not fit our items (there is no team, performance or network content). Our nav keeps its own grouping, styled with the screenshot's group pattern (uppercase muted label, 24px between groups, 1px divider):

| Nav list (role) | Groups today | Items in current order (sentence case) |
|-----------------|--------------|----------------------------------------|
| Company user | none (flat) | My dashboard, GP dashboard, MIS history, Compare months, Reports, Notes & queries, Profile |
| Firm staff (CA) | none (flat) | Companies, Review queue, MIS upload, Notes & queries, Reports, Profile |
| Firm admin | none (flat) | Companies, Review queue, MIS upload, Users, Audit log, Notes & queries, Reports, Profile |
| Open client (staff) | Data | Master data, Upload, Mapping, Adjustments, Budget, MIS template, Branches |
| Open client (staff) | Reports | Dashboard, GP dashboard, P&L detail, Budget vs actual, Segment P&L (hidden when the company has no segments), Book to bank, Cash conversion, Debtors, Creditors, Charts, Reports, Notes & queries |

Current routes not in the nav: `/login`, `/`, and the route handlers. Flat lists stay flat; no new group headings are added (OQ-3).

## Layout element mapping

Each LAYOUT and screenshot element, the existing content block it restyles, and its status. Matched: the pattern is applied to that content. No match: not built (the decision is recorded under Decisions). Extra existing content: content the LAYOUT does not mention, kept with the same card and type treatment.

### Shell

| LAYOUT element | Existing content block | Status |
|----------------|------------------------|--------|
| Sidebar, 248px, fixed | `sidebar.tsx` | Matched |
| Logo square, product name, subtitle | "E" tile, "Especia", "Client Portal" | Matched (flat tile, no gradient, no glow) |
| Uppercase group labels | "Data", "Reports" section headings | Matched (see Grouping) |
| 36px items, 16px icon | nav links (18px icons, `strokeWidth={2}` today) | Matched |
| Active item: 2px accent bar, surface-raised | inset 2px bar plus `bg-white/10` | Matched |
| Count on the right of an item | none | No match, omitted (OQ-5) |
| Collapse to icons below 1024px | mobile `<dialog>` drawer below `lg` | Matched (shadcn Sidebar collapsible) |
| Open company context | "Open company" block, "All companies" link | Extra existing content, kept exactly |
| Sidebar footer | "Especia Associates LLP" line | Extra existing content, kept; the user menu joins it in the footer (OQ-9) |
| Top bar, 56px, bottom border | header in `portal-shell.tsx` (min 64px, glass) | Matched |
| Sidebar collapse icon | mobile menu button | Matched |
| Breadcrumb | company name plus "Management Information System" text in the header | Matched (breadcrumb from the existing company name or "Especia MIS" and the current nav label; the existing second line "Management information system" or "Client portal" stays under it; OQ-6) |
| Clock with time zone | none | No match, omitted (OQ-7) |
| ThemeToggle | none | New control required by the brief |
| Bell button | none | No match, omitted (OQ-8) |
| Period selector, unit switch, Excel export, Print / PDF, meeting mode, user menu | header controls | Extra existing content, kept: period selector in the page header; unit switch, Excel export, Print / PDF, meeting mode and ThemeToggle on the right of the top bar; user menu in the sidebar footer (OQ-9) |
| Demo banner | strip above content | Extra existing content, kept as one line above the page header (OQ-9) |

### Page header and tabs

| LAYOUT element | Existing content block | Status |
|----------------|------------------------|--------|
| Title, one-line subtitle | `.page-title` plus muted subtitle on most pages; `CompanyHeader` on the dashboard (name, status, meta, GST/PAN/CIN, "Prepared by", FY) | Matched |
| Date range Select | header `PeriodSelector` (month) | Matched |
| Compare Select | none on the dashboard (KPIs always compare to last month); the Compare page has its own month pickers | No match, omitted (OQ-10) |
| Separate calendar icon button | none | No match, omitted (OQ-10) |
| Underline tabs | `ReportTabs` pill grid (Consolidated, GP dashboard, P&L detail, Segment P&L, Book to bank, Cash conversion, Debtors, Creditors, Budget vs actual, Charts, plus channel tabs) | Matched (underline tab nav; links stay links) |
| Tab leading icons | none | No match, omitted (OQ-11) |
| Segmented toggles (4W, 8W, 12W pattern) | P&L Monthly / Branch-wise, chart `Seg` controls, quarter filter, unit switch, period pickers, branch picker, ageing bucket filters | Matched (ToggleGroup style, same options) |
| Branch scope selector | `BranchScopeSelector` next to the tabs | Extra existing content, kept in the page header |

### KPI strip

| LAYOUT element | Existing content block | Status |
|----------------|------------------------|--------|
| Six cells in one bordered row with dividers | 10 `KpiDelta` tiles on the dashboard; `KpiTile`/`KpiDelta` rows on P&L, Cash conversion, Book to bank and Budget vs actual | Matched (same metrics and count per page; the dashboard strip is two rows of five, OQ-12) |
| Label, value, delta, "vs prior" | label, value, percent change, "favourable"/"adverse", "vs last month" | Matched (our words kept: "vs last month") |
| Delta as plain colored text | colored delta plus colored 3px top border plus arrow glyph | Matched (top border and glyph removed, lucide icon or text instead) |
| Icon in a bordered square per cell | none | No match, omitted (OQ-13) |
| "pts" for percent deltas | percent change for every metric | No match: our metrics are amounts and days, kept as today |

### Main grid and cards

| LAYOUT element | Existing content block | Status |
|----------------|------------------------|--------|
| 70/30 grid, equal row heights | pages pairing a table and a chart | Matched only on Book to bank (table, waterfall) and Cash conversion (table, chart); full-width cards everywhere else, including the dashboard (OQ-14) |
| "Performance trend" line chart | Charts page "Monthly trend" (bar, line, area modes, absolute or % of revenue) | Matched (same series and modes; the area mode keeps a flat, low-opacity fill, OQ-19) |
| Legend, dual axis, dashed grid, tooltip | legends and tooltips in `chart-frame.tsx`, `charts-board.tsx`, `ccc-chart.tsx`, `segment-charts.tsx`, `waterfall.tsx` | Matched |
| Dense table, sortable sticky header, right-aligned numbers, 52px rows | P&L, Segment, Book to bank, CCC, Budget vs actual, profit and balance sheet summaries (`.tbl-report`), master data, ageing, users, audit, review queue | Matched (sorting only where it exists today; report statements keep their fixed row order) |
| Clickable row opens a Sheet | none (no row detail view); company and user edit use `Modal` | No match, omitted; existing dialogs stay dialogs, restyled (OQ-16) |
| 26-week sparkline column | none | No match, omitted |
| Two-line name cell with muted second line | company cards, user rows, ageing party rows | Matched where a second line exists today |
| Conversion pipeline (progress rows) | none | No match, omitted |
| Donut with total in center, legend with dot and percent | Charts page "Expense breakdown" pie (`innerRadius` 62) | Matched (colors chart-1 to chart-6, OQ-17) |
| Ranked list | Charts page "Biggest variances" and "Branch comparison" bars | No match as a list; kept as charts |
| Rank labels as plain muted text | status, role, action, period status, query status, "Staff only" pills | Matched (pills become plain muted text) |
| Report statement styles (section, subtotal, total rows; frozen first column; percent sub-line) | `.tbl-report` | Extra existing content, kept with token styling |
| Profit summary, balance sheet summary | dashboard tables | Extra existing content, kept |

Naming: the screenshot's "MGI" and the brief's "MG1" do not appear in our UI or data. No column uses either name, so the question is resolved as not applicable.

Mock data: no existing UI element lacks data, so no mock data is added.

## Requirements

### R1. Themes

User story: as a user, I want Light, Dark and System themes, so that the dashboard matches my preference and environment.

1. THE SYSTEM SHALL provide the theme with next-themes using `attribute="class"`, `defaultTheme="system"`, `enableSystem` and `disableTransitionOnChange`, and the `<html>` tag SHALL carry `suppressHydrationWarning`.
2. THE SYSTEM SHALL enable class-based dark mode in Tailwind v4 with `@custom-variant dark (&:where(.dark, .dark *));` in `src/app/globals.css`.
3. THE top bar SHALL contain a ThemeToggle built on the shadcn DropdownMenu with three items, Light, Dark and System, a 16px Sun, Moon or Monitor trigger icon for the active choice, a Check icon on the active item, and an `aria-label`.
4. WHEN the user picks a theme, THE SYSTEM SHALL persist the choice and apply it on every later visit.
5. WHILE the choice is System, WHEN the operating system color scheme changes, THE SYSTEM SHALL switch themes live without a reload.
6. WHEN any page is hard refreshed in Light, Dark or System, THE SYSTEM SHALL paint the correct theme on first paint with no flash.
7. WHEN the theme changes, every chart line, axis, grid, donut segment, sparkline and tooltip SHALL update to the new theme colors without a reload.
8. THE components SHALL NOT read the theme in code to choose colors; they SHALL use CSS variables only.
9. THE native controls and scrollbars SHALL follow the active theme (`color-scheme` set per theme).

### R2. Design tokens

User story: as a developer, I want every color defined once per theme, so that components stay consistent and theme-agnostic.

1. THE `src/app/globals.css` file SHALL define every token in brief.md DESIGN TOKENS twice: light values on `:root` and dark values on `.dark`, with the exact values listed (background, surface, surface-raised, border, border-strong, text-primary, text-secondary, text-muted, accent, positive, negative, chart-1 to chart-3, grid line). The only approved deviations are the contrast fixes from RQ-1 and RQ-2: light positive #15803d and chart-3 #949499 light, #606068 dark.
2. THE tokens SHALL map to Tailwind utilities through `@theme inline`, and the shadcn variable names (`--background`, `--card`, `--popover`, `--border`, `--ring`, `--sidebar` and related) SHALL resolve to these tokens. Because shadcn uses `--accent` for hover surfaces, the brief's accent is stored under its own name (design.md) and shadcn's `--accent` resolves to surface-raised.
3. THE accent color SHALL appear only on the active nav bar, the main chart line (chart-1, the first series of each chart), progress bars (none exist today), the active tab underline and focus rings. Buttons, links, icons and selected toggles SHALL NOT use it.
4. THE positive and negative colors SHALL appear only on delta text and on the two delta charts in R9.6 (OQ-18). Negative amounts in tables and KPI values SHALL NOT be colored (OQ-15).
5. THE old tokens and classes (`--grad`, `--grad-strong`, `.brand-grad`, `.text-brand-grad`, `.glass`, `.mesh-bg`, `--shadow-card`, navy, gold, subtotal tints, status tints) SHALL be removed.

### R3. Typography

User story: as a reader, I want one type scale, so that values are easy to scan and pages feel consistent.

1. THE root layout SHALL load Geist Sans and Geist Mono through the `geist` package and `next/font` (OQ-25), exposed as `--font-sans` and `--font-mono`; no other font family SHALL be used.
2. THE scale SHALL be: page title 20px weight 600 tracking -0.01em; card title 14px weight 500; body and table 13px weight 400; label 11px weight 500; KPI value 30px weight 600 tracking -0.02em.
3. Uppercase with 0.06em tracking SHALL be used only for sidebar group names.
4. Every number SHALL use `font-variant-numeric: tabular-nums`; values SHALL use line height 1.2 and body text 1.5.
5. Geist Mono SHALL be used only for table numbers (the clock is omitted, OQ-7).
6. THE type steps SHALL be named tokens in globals.css; components SHALL NOT use arbitrary font sizes.
7. Inputs SHALL render text at 16px below the `sm` breakpoint only, to stop iOS zoom, and at 13px from `sm` up (OQ-24).

### R4. Icons

User story: as a user, I want quiet, consistent icons, so that they support labels without competing with data.

1. THE UI SHALL use lucide-react only, with named imports.
2. Icons SHALL be 16px in sidebar, tables, buttons and menus, 14px inside inputs and small controls, and 20px only in empty states.
3. Stroke width SHALL be 1.5 for all icons, set once in a shared wrapper or CSS variable.
4. Icons SHALL use `currentColor`: text-secondary by default, text-primary on hover and on the active nav item, never the accent.
5. Every icon-only button SHALL have an `aria-label`; decorative icons next to a text label SHALL have `aria-hidden="true"`.
6. Sidebar icons SHALL live in `src/lib/nav.ts` next to each route, and each nav item SHALL have a distinct lucide icon (OQ-4). Only the icon changes; the label, href, order and visibility of every item stay.
7. Text glyphs used as icons (arrows in `kpi-delta.tsx`, `branches-editor.tsx`, `template-editor.tsx`, `mapping-editor.tsx`) SHALL be replaced by lucide icons.

### R5. Spacing and shape

1. Spacing SHALL use only 4, 8, 12, 16, 20, 24, 32 and 48px.
2. Card padding SHALL be 20px, the gap between cards 24px, and page padding 32px.
3. Card radius SHALL be 8px and control radius 6px. The only other shape allowed is fully round, and only for avatars, legend dots and the donut (OQ-23).
4. Buttons, selects and toggles SHALL be 32px high (OQ-26: 32px is accepted over the 44px touch target suggestion).
5. Cards in the same row SHALL have equal height.

### R6. Motion

1. THE only transition SHALL be 150ms ease-out on color, border-color and background-color.
2. THE loading skeleton SHALL keep a subtle pulse (the only animation allowed, OQ-29). WHEN `prefers-reduced-motion: reduce` is set, THE SYSTEM SHALL disable all transitions and the skeleton animation.
3. Press scaling, blur swaps and other decorative animation SHALL be removed.

### R7. Layout shell

User story: as a user, I want a stable frame on every page, so that navigation and context are always in the same place.

1. THE sidebar SHALL be the shadcn Sidebar, 248px wide and fixed, with a top block (flat logo square "E", "Especia", subtitle "Client portal"), 36px items with a 16px icon and label, and an active state of a 2px accent bar on the left plus a surface-raised background.
2. THE sidebar SHALL show exactly the nav items returned by `navFor()` for the current role and company: every item, every label word (sentence case only), the same order, the same hrefs and the same visibility rules (company, staff and admin lists; the open-client "Data" and "Reports" lists; Segment P&L hidden without segments; meeting mode hiding the sidebar). No item, section or heading SHALL be added, removed, renamed or reordered.
3. WHERE a nav list has sections today ("Data", "Reports"), THE sidebar SHALL render each as an uppercase group label with 24px between groups. Flat lists (company user, firm staff, firm admin) SHALL stay flat with no new headings (OQ-3).
4. WHEN the viewport is below 1024px, THE sidebar SHALL collapse to icons; below 768px it SHALL open as a sheet.
5. THE sidebar SHALL keep, exactly as today, the "Open company" block (label, company name) and the "All companies" link for staff with a company open, and the "Especia Associates LLP" footer line.
6. THE top bar SHALL be 56px high with one bottom border, a sidebar collapse button and a breadcrumb on the left, and on the right the unit switch, Excel export, Print / PDF, meeting mode (staff only, as today) and the ThemeToggle (OQ-9).
7. THE breadcrumb SHALL use existing text only: the company name (or "Especia MIS" with no company open) and the current nav label, with the existing header subtitle ("Management information system" with a company open, "Client portal" without) kept as a second line under it (OQ-6).
8. THE existing header controls SHALL remain with the same behavior: period selector (moved to the page header), unit switch (Lakh, Crore, USD and rate field), Excel export, Print / PDF, meeting mode, user menu with identity and Sign out (moved to the sidebar footer) and demo banner (one line above the page header) (OQ-9).
9. THE page header SHALL sit 24px below the top bar and hold each page's existing title, its existing subtitle, the period selector on company pages, and that page's existing filters (period pickers, branch scope selector, quarter filter, branch picker, Monthly and Branch-wise switch).
10. THE dashboard page header SHALL carry the existing `CompanyHeader` content: company name, period status, meta line, GST, PAN and CIN, "Prepared by Especia Associates LLP" and the FY label, with the status and FY shown as plain muted text.
11. THE report navigation (`ReportTabs`, including channel tabs) SHALL render as underline tabs with a 2px accent underline on the active tab, keeping every tab label, order and link.
12. THE shell SHALL move into `src/app/(dashboard)/layout.tsx` (OQ-1). It SHALL read the company slug from the path on the client, and the company name, periods and segment flag SHALL come from a small per-group provider rendered by `c/[slug]/layout.tsx`, so WHEN the user navigates from one company to another, or between a company and a firm page, THE breadcrumb, sidebar and company context SHALL update.
13. THE shell SHALL keep the skip link, the auth guard in `(dashboard)/layout.tsx`, the company guard in `c/[slug]/layout.tsx`, the staff guard in `(data)/layout.tsx`, meeting mode and its localStorage persistence, and print styles.

### R8. KPI strip

1. EVERY page that shows `KpiDelta` or `KpiTile` today SHALL show the same metrics, in the same order, as cells of one bordered strip with 1px dividers, all cells in a row the same height and alignment. THE dashboard's 10 KPIs SHALL render as two rows of five at 1280px and above and wrap evenly below (OQ-12); other pages keep their own counts. KPI cells SHALL have no icons (OQ-13).
2. Each cell SHALL show the existing label, the value at KPI size, the existing percent change in positive or negative text color with no pill background, the existing "favourable" or "adverse" word, and the existing "vs last month" text.
3. THE delta color SHALL follow the existing `goodWhenUp` rule; the colored 3px top border and the arrow glyphs SHALL be removed, and the direction ("up", "down", "unchanged") SHALL stay available to screen readers.
4. WHEN a value is missing, THE cell SHALL show the existing "No data" text at the same cell height; WHEN no prior exists, THE delta row SHALL be omitted with the cell height unchanged.
5. KPI cells SHALL receive formatted values as props and SHALL NOT read cookies.
6. KPI values SHALL render in text-primary; a negative value SHALL show in parentheses (OQ-15). The `tone` coloring of `KpiTile` values and the adverse coloring of `KpiDelta` values SHALL be removed; meaning stays in the delta text and its "favourable" or "adverse" word.

### R9. Charts

1. EVERY existing chart (Charts page monthly trend, expense breakdown, branch or channel comparison, budget vs actual by month and by section, biggest variances, working capital balances, cash conversion cycle; Segment P&L charts; CCC chart; Book to bank waterfall) SHALL keep its title, subtitle, series, chart type options, filters and data.
2. Charts SHALL render through the shadcn Chart component on Recharts with 1.5px lines, no dots on line series, a dashed grid in the grid-line token, axis text in text-secondary (text-muted fails 4.5:1 in the dark theme, see design.md), no chart animation, and a tooltip with surface-raised background and a 1px border.
3. THE first series of each chart SHALL use chart-1 (accent); further series SHALL use chart-2 and chart-3, then chart-4 to chart-6, which are neutral grey steps per theme (OQ-17). chart-1 SHALL stay the only accent color in charts.
4. Segmented chart controls (`Seg`) and series toggles (`Chip`) SHALL render as ToggleGroup items with the same options; series identity SHALL be shown by a flat legend dot, not a colored chip.
5. THE "Expense breakdown" pie SHALL render as a donut with its total and the word "Total" in the center and a legend with a flat dot, name and percent.
6. THE Book to bank waterfall and the "Biggest variances" chart SHALL keep positive and negative colors, because they encode favourable and adverse deltas; their subtitle "green is favourable, red is unfavourable" stays (OQ-18). No other chart SHALL use positive or negative.
7. THE monthly trend SHALL keep its area mode, drawn with a flat, low-opacity fill of the series color and no gradient (OQ-19).
8. `useChartColors` SHALL re-read the CSS variables when the theme class on `<html>` changes, until every chart reads colors through the shadcn Chart config with `var(--chart-n)`.

### R10. Tables

1. EVERY existing table SHALL keep its rows, columns, column order, labels, emphasis rows (section, subtotal, total, separators), percent sub-lines, frozen first column, search, filters, editing and pagination.
2. Tables SHALL use 13px body text, Geist Mono tabular numbers right-aligned, a sticky header in surface-raised with text-secondary labels, 1px row borders, and row hover in surface-raised. Interactive list tables SHALL use 52px rows.
3. Subtotal and total rows SHALL be distinguished by weight and a stronger border, not by navy or gold fills.
4. Column sorting SHALL appear only where a table sorts today; report statements keep their fixed row order.
5. WHERE a list table has a primary name and a secondary fact today (company cards, user rows, ageing parties), THE name cell SHALL use the two-line pattern with a muted second line.
6. TanStack Table SHALL be used only for the interactive list tables: master data, ageing (debtors and creditors), users and audit log (OQ-16). Report statements (P&L, Segment, Book to bank, CCC, Budget vs actual, profit and balance sheet summaries) SHALL stay plain semantic `<table>` markup.
7. Negative amounts SHALL show in parentheses, for example (1,234), in text-primary (OQ-15). Only the display changes; values, Excel output and the formatter tests stay as they are.
8. No table row SHALL open a Sheet (OQ-16).

### R11. Labels, tags and status

1. Status, role, action, period status, query status, "Staff only" and count pills SHALL render as plain muted text (with a text-primary weight change where emphasis is needed), not colored badges.
2. Color SHALL not be the only carrier of meaning anywhere.

### R12. Dialogs and menus

1. THE existing `Modal` dialogs (new company, company edit) and the header overflow menu SHALL keep their content and behavior, restyled with surface-raised, a 1px border, no shadow, and a token scrim instead of `bg-black/60`.
2. Dialogs SHALL stay dialogs; none becomes a Sheet (OQ-16). The only Sheet is the sidebar on screens below 768px (R7.4).

### R13. Grid and cards

1. All cards SHALL share one Card component: surface background, 1px border, 8px radius, 20px padding, card title at 14px weight 500, optional muted subtitle.
2. THE 70/30 grid with equal row heights SHALL be used only on Book to bank (table left, waterfall right) and Cash conversion (table left, chart right) (OQ-14). Every other page, including the dashboard, SHALL use full-width cards with 24px gaps.
3. On narrow screens THE right column SHALL stack below the left.

### R14. Pages

1. Every page in the inventory SHALL keep its content and SHALL use the shared shell, page header, Card, table, KPI strip and control styles in both themes.
2. THE dashboard SHALL keep its 10 KPIs, report tabs, branch scope selector, profit summary and balance sheet summary, and the "Full line-by-line detail is under P&L detail" link.
3. THE login page SHALL keep its form and all of its text, including the subtitle "Access your dashboard portal." (OQ-30), without the mesh background, gradient tile or glow.
4. THE GP dashboard viewer SHALL keep the uploaded HTML frame unchanged inside; only its frame and buttons are restyled.

### R15. Excluded screenshot patterns

1. THE SYSTEM SHALL NOT add a clock, bell button, calendar icon button, compare Select, KPI cell icons, tab leading icons, nav counts, sparkline column, row detail Sheet, conversion pipeline or leaderboard. This is final (OQ-5, OQ-7, OQ-8, OQ-10, OQ-11, OQ-13, OQ-16, OQ-31).

### R16. Loading, empty and error states

1. Every card and the table SHALL have a skeleton, an empty state (20px icon, short factual text) and an error state with a retry where a retry is possible.
2. Skeletons SHALL match the final layout size so content does not shift.
3. Route `loading.tsx` and `error.tsx` boundaries SHALL use the shared skeleton and ErrorState components.
4. KpiCell (the KPI strip cell), DataTable (the shared TanStack list table, exercised with the ageing table) and TrendChart (the Charts page monthly trend) SHALL be checked in the polish pass with the `break` skill (loading, empty, error, long text and many rows) and the `state-machine` skill (every state of each card and table in both themes on a throwaway page that is deleted afterwards), and each problem fixed.
5. Existing empty-state wording (for example "No reporting period published yet.") SHALL be kept.

### R17. Accessibility

1. Every icon button, including ThemeToggle, sidebar collapse and the move up and move down buttons, SHALL have an `aria-label`.
2. Every focusable element SHALL show a visible 2px accent focus ring with a 2px offset.
3. Body text SHALL meet 4.5:1 contrast and large values 3:1 in both themes. text-muted measures below 4.5:1 on dark surfaces and on the light surface-raised (design.md contrast table), so it SHALL be used only for placeholders, disabled text and decorative glyphs; every readable label uses text-secondary or text-primary.
4. Charts SHALL have an accessible name and a text alternative for their data (legend or summary).
5. Sortable headers SHALL expose `aria-sort`; clickable rows SHALL be keyboard operable.
6. THE design SHALL target 1280px and above first, work at 768px, and stack the right column below the left on narrow screens.
7. THE `interface-review` skill SHALL be run on each page in the polish pass and every high or medium finding fixed. WCAG compliance also needs manual assistive technology testing, which this spec does not replace.

### R18. Copy

1. Existing words SHALL be kept; the only copy edits are: title case to sentence case (acronyms and names such as MIS, GP, P&L, EBT, COGS, CCC, YTD, GST, PAN, CIN, Especia and company names stay as they are), dashes replaced by a hyphen, colon or comma, and the emoji replaced by a lucide icon. No string is removed (OQ-30).
2. UI text SHALL contain no marketing language and no exclamation marks.
3. Empty table cells SHALL show a hyphen instead of an em dash, and number ranges (ageing buckets "0-30", YTD "Apr-Jun") SHALL use a hyphen.
4. Sentence case SHALL apply only to labels written in UI code, `src/lib/nav.ts` and `src/lib/report-tabs.ts`. Labels from the database, the calculation engines (`src/lib/mis/`) and the export (`src/lib/export/`) SHALL keep their capitalization (OQ-21).
5. En and em dashes SHALL be replaced in all of `src/` (UI text, comments, Excel output strings, statement labels, demo copy) and in the spec files. `fyDisplay` SHALL return "FY 2026-27" and its one test expectation SHALL be updated. Root docs, `supabase/` and `scripts/` are out of scope (OQ-20).

### R19. Hard bans with a zero-match search

Scope note: the generated shadcn primitives in `src/components/ui/` are not hand edited. Their shadow, ring, blur, animation and radius utilities SHALL be neutralized globally in `globals.css` (shadow and blur tokens set to none, ring shadows cleared, transitions limited to color properties, no `tw-animate-css`, radius scale limited to 6px and 8px), so the class-pattern searches exclude `src/components/ui/`; the dash and emoji searches still cover it.

1. WHEN the work is complete, a ripgrep search over `src/` SHALL return zero matches for: `bg-gradient`, `linear-gradient`, `radial-gradient`, `bg-clip-text`, `background-clip`, gradient color stops (`from-`, `via-`, `to-` color utilities), `blur`, `backdrop-filter`, `backdrop-blur`, `glow`, `shadow-` utilities, `box-shadow`, `boxShadow`, `drop-shadow`, `animate-` except the skeleton, `bounce`, `shimmer`, the characters U+2013 and U+2014, emoji ranges, `dark:` classes in components, hex or rgb colors in components, and Tailwind palette colors (`text-white`, `bg-black`, `violet-`, `purple-` and similar) in components.
2. THE search commands and their output SHALL be recorded in the final report.
3. Matches in identifiers that are not styles (for example the `onBlur` event) SHALL be excluded by the search pattern, not by editing code.

### R20. File structure

1. THE structure SHALL follow brief.md STRUCTURE, relative to `src/`: `app/layout.tsx` (fonts, ThemeProvider, html), `app/(dashboard)/layout.tsx` (shell), overview page composing components only, `components/ui/` (shadcn primitives, generated, not hand edited), `components/layout/` (AppSidebar, TopBar, PageHeader, ThemeProvider, ThemeToggle), `components/dashboard/` (KpiStrip, KpiCell, TrendChart, DataTable, BreakdownDonut; names follow our content instead of the brief's TeamTable and SourceDonut), `components/shared/` (DeltaText, EmptyState, ErrorState), `lib/data/` (one file per domain), `lib/format.ts`, `lib/nav.ts`, `types/`. PipelineCard, Leaderboard, Sparkline and ProgressRow have no matching content and are not created (OQ-31).
2. URLs SHALL NOT change; each sidebar item keeps its own folder under its existing route segment under `c/[slug]/` or `(firm)/`. No single dynamic `[section]` segment is added (OQ-2).
3. Each page, layout and component file SHALL hold one component and at most 150 lines. Generated types, data access, engines, ingest, export, the demo dataset and server actions are excluded. Large UI editors (`branches-editor.tsx`, `template-editor.tsx`, `charts-board.tsx`, `company-card.tsx` and others over 150 lines) SHALL be split (OQ-22).
4. Components SHALL receive props and SHALL NOT fetch data or read cookies; pages SHALL fetch and pass data down.
5. Dead code, unused files and unused packages SHALL be removed, including the old `components/` files once replaced.

### R21. Data preservation

1. THE spec SHALL NOT change Supabase queries, tables, migrations, RLS, server action behavior, route handlers, calculation engines, ingest or export logic, auth guards or demo mode behavior.
2. WHERE an existing UI element needs data it lacks, THE SYSTEM SHALL use typed mock data in `src/lib/data/` marked with a `TODO` comment. None is known today; mock data SHALL NOT be added for new widgets.
3. Every page SHALL show the same numbers, labels and rows before and after the redesign, in demo mode and with Supabase, checked with `node scripts/demo-smoke.mjs` and a side-by-side review of each page.
4. `npm test` (Vitest engine and format tests) SHALL pass unchanged, except the approved update of the `fyDisplay` expectation to "FY 2026-27" (OQ-20) and new tests for new pure helpers.

### R22. Build gates

1. After every task, `npm run lint`, a type check (`npx tsc --noEmit`) and `npm run build` SHALL pass with no errors.
2. `npm test` SHALL pass after every task that touches `src/lib/`.
3. Added packages SHALL be pinned to exact versions and limited to what is needed: next-themes, geist, @tanstack/react-table, and the shadcn dependencies (the `radix-ui` primitives package, class-variance-authority, tailwind-merge, clsx). design.md lists the exact versions.

## Out of scope

- Any content change: new or removed pages, nav items, metrics, columns, chart series, data fields or labels (beyond the copy rules).
- New widgets from the screenshot with no matching content: clock, bell, calendar button, compare Select, KPI icons, tab icons, nav counts, sparklines, row detail Sheet, conversion pipeline, leaderboard.
- Any change to sidebar content: sections, items, label words, order, visibility rules, the "Open company" block or the "All companies" link.
- Removing any copy.
- New routes, database tables or columns, API endpoints, and changes to business rules or calculations.
- Mock data for new widgets.

## Decisions

The user approved the recommendations ("go with the recommendations"). Each former open question and its decision:

| OQ | Topic | Decision |
|----|-------|----------|
| OQ-1 | Shell location | The shell moves into `src/app/(dashboard)/layout.tsx`. It reads the company slug from the path on the client; company name, periods and the segment flag come from a small per-group provider in `c/[slug]/layout.tsx`, so the header and sidebar update when switching companies (R7.12) |
| OQ-2 | Route structure | Every URL stays. Each nav item keeps its folder under `c/[slug]/` or `(firm)/`. No single `[section]` segment (R20.2) |
| OQ-3 | Sidebar groups | Keep the existing "Data" and "Reports" sections exactly. Flat lists stay flat. No new group headings (R7.3) |
| OQ-4 | Duplicate icons | Each nav item gets a distinct lucide icon. Visual only; labels, hrefs, order and visibility unchanged (R4.6) |
| OQ-5 | Nav counts | Omitted (R15) |
| OQ-6 | Breadcrumb | Existing text only: company name then the current nav label, or "Especia MIS" then the nav label on firm pages. The existing subtitle line stays under it (R7.7) |
| OQ-7 | Clock | Omitted (R15); Geist Mono is used for table numbers only (R3.5) |
| OQ-8 | Bell button | Omitted (R15) |
| OQ-9 | Header controls | Period selector in the page header. Unit switch, Excel export, Print / PDF, meeting mode and ThemeToggle on the right of the top bar. User menu in the sidebar footer. Demo banner as one line above the page header (R7.6, R7.8) |
| OQ-10 | Compare Select, calendar button | Both omitted (R15) |
| OQ-11 | Tab leading icons | Omitted (R15) |
| OQ-12 | 10 dashboard KPIs | One bordered strip, two rows of five at 1280px and above, wrapping evenly below. Other pages keep their own counts (R8.1) |
| OQ-13 | KPI cell icons | Omitted (R8.1, R15) |
| OQ-14 | 70/30 grid | Only on Book to bank (table, waterfall) and Cash conversion (table, chart). Full-width cards with 24px gaps everywhere else, including the dashboard (R13.2) |
| OQ-15 | Negative amounts | Shown in parentheses, for example (1,234), in text-primary. Values unchanged (R8.6, R10.7) |
| OQ-16 | Sheet and TanStack Table | No row detail Sheets. Existing dialogs stay dialogs, restyled. TanStack Table only for master data, ageing, users and audit; statements stay plain semantic tables (R10.6, R10.8, R12.2) |
| OQ-17 | Chart colors | chart-4, chart-5 and chart-6 added per theme as neutral grey steps; chart-1 stays the only accent (R9.3) |
| OQ-18 | Positive and negative in charts | Kept on the Book to bank waterfall and "Biggest variances", because they encode deltas (R9.6) |
| OQ-19 | Area mode | Kept on the monthly trend with a flat, low-opacity fill, no gradient (R9.7) |
| OQ-20 | Dashes outside UI text | Replaced in all of `src/` (including Excel output strings and `fyDisplay`, which becomes "FY 2026-27", with its one test expectation updated) and in the spec files. Root docs, `supabase/` and `scripts/` are out of scope (R18.5) |
| OQ-21 | Title case from data | Sentence case only for labels in UI code, `lib/nav.ts` and `lib/report-tabs.ts`. Database, engine and export labels keep their capitalization; words never change (R18.4) |
| OQ-22 | 150-line rule scope | Applies to pages, layouts and components. Generated types, data access, engines, ingest, export, demo dataset and server actions are excluded. Large UI editors are split (R20.3) |
| OQ-23 | Radius exceptions | Round shapes only for avatars, legend dots and the donut. Everything else is 8px (cards) or 6px (controls) (R5.3) |
| OQ-24 | Field text size | 16px on phone widths only, to stop iOS zoom; 13px everywhere else (R3.7) |
| OQ-25 | Fonts | Geist through the `geist` package and `next/font` (R3.1) |
| OQ-26 | ui-design-system conflicts | The brief wins on each point; 32px controls are accepted over 44px touch targets (R5.4) |
| OQ-27 | Skills | All requested skills are present; none is missing |
| OQ-28 | References | Fetched in phase 2; results are noted in design.md |
| OQ-29 | Skeleton animation | A subtle pulse on the loading skeleton only, off under reduced motion (R6.2) |
| OQ-30 | Login subtitle | Kept. No copy is removed anywhere (R14.3, R18.1) |
| OQ-31 | Brief components with no content | PipelineCard, Leaderboard, Sparkline and ProgressRow are not created (R20.1) |
| Naming | Component names | Names follow our content: KpiStrip, KpiCell, TrendChart, DataTable (instead of TeamTable), BreakdownDonut (instead of SourceDonut) (R20.1) |
| Polish | Skills in the polish pass | `interface-review` on each page; `break` and `state-machine` on KpiCell, DataTable and TrendChart, with the throwaway page deleted afterwards (R16.4, R17.7) |
| Contrast | text-muted use | Derived from R17.3 in phase 2: text-muted fails 4.5:1 on dark surfaces and on the light surface-raised, so it is limited to placeholders, disabled text and decorative glyphs; chart axis text uses text-secondary (R9.2, R17.3) |
| RQ-1 | Light positive contrast | Resolved, approved with design.md: light `positive` changes from #16a34a (3.30:1) to #15803d (5.02:1 on surface). Dark positive unchanged (R2.1, R17.3) |
| RQ-2 | Control and chart-3 contrast | Resolved, approved with design.md: the brief border tokens (8% and 16%) stay, with the mitigations in design.md 2.6. chart-3 becomes #949499 light and #606068 dark (3.02:1 and 3.03:1 on surface), between chart-2 and the surface. To keep chart-3 distinct, the added greys light chart-6 (#5a5a62) and dark chart-5 (#7f7f88) move as well (R2.1, R9.3) |

## Remaining open questions

None. RQ-1 and RQ-2 are resolved; see the Decisions table.

