# Premium dashboard revamp: tasks

Source documents: brief.md (highest precedence: "User clarification", "User reiteration", "Approved decisions for requirements.md", "How the references are used", "Approved design decisions"), requirements.md (approved) and design.md (approved). Every task changes how existing content looks and is arranged, never what it says or which data it shows.

## How to run every task

Read this section once; every task below refers to it by name.

Repo root: `c:\Users\nihal\Desktop\github\especia\especia-dash\especia-mis-dashboard-2.0`. Shell: PowerShell. Paths below are repo-relative.

Before coding:
- Read AGENTS.md and the guide in `node_modules/next/dist/docs/` for any Next.js API the task touches (layouts, `next/font`, route groups, `loading.tsx`, `error.tsx`).
- `src/app/(dashboard)/c/[slug]/cash-conversion/ccc-table.tsx` and `src/app/(dashboard)/c/[slug]/charts/chart-frame.tsx` had uncommitted edits before this spec started. Build on the working tree version of these files; never revert them with git.
- Never hand edit `src/components/ui/`. Add primitives only with `npx shadcn@4.21.4 add <name>`.
- Pin every added package to an exact version (design.md 12.3). No other package is added.

Gates (run after every task, all must pass with no errors):

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Plus `npm test` whenever the task creates or edits anything under `src/lib/`.

Demo server (the runtime check in every task):

```powershell
$env:DEMO_MODE = "true"; npm run dev          # run in the background, http://localhost:3000
node scripts/demo-smoke.mjs                    # every page and download answers cleanly
```

The demo company slug is `tirupati-automart`, so company pages live at `http://localhost:3000/c/tirupati-automart/<page>`. "Open in both themes" means: open the page, use the ThemeToggle (from task 5 on) to switch Light and Dark, and confirm nothing keeps the old theme's colors. Before task 5, check Light only.

Content check (defined in task 1): `node "$env:TEMP\especia-baseline\capture.mjs" compare <paths>` must report no differences for the named pages. Allowed differences are only the approved copy rules: sentence case, dashes to a hyphen, colon or comma, negative amounts in parentheses, the em dash empty cell to a hyphen, and arrow glyphs replaced by icons. The script normalizes these, so any remaining difference is a content change and must be fixed before the task is done. Charts render on the client, so chart titles, legends, series names and tooltip values are checked by eye against the baseline screenshots taken in task 1.

Parallel rule: tasks marked parallel-safe touch only their own route folder plus new files nobody else creates. They read shared components but do not edit them, do not install packages and do not edit `globals.css`, `src/lib/nav.ts`, `src/lib/report-tabs.ts`, `components.json`, `package.json` or any layout file. Tasks marked "runs alone" edit at least one of those shared files. If parallel-safe tasks run at the same time in one checkout, run their `npm run build` steps one after another (they share `.next/`), or use separate git worktrees.

## Phase 0: baseline

- [x] 1. Capture the content baseline and add the parity tests
  - Goal: freeze today's content so every later task can prove it changed nothing but the look.
  - Create `src/lib/__tests__/nav-parity.test.ts`: for every role, for `slug` null and `"tirupati-automart"`, and for `hasSegments` true and false, assert that `navFor()` returns the same lower-cased labels, hrefs, `section` values and order as an inline fixture captured from the current code. Labels are compared lower-cased so the later sentence case pass keeps the test green.
  - Create `src/lib/__tests__/report-tabs-parity.test.ts`: same idea for `REPORT_TABS`, `visibleReportTabs(true)`, `visibleReportTabs(false)` and `withChannelTabs` with a fixed channel list.
  - Create the throwaway script `$env:TEMP\especia-baseline\capture.mjs` (outside the repo, never committed). Mode `baseline` fetches every page in the `FIRM_PAGES`, `FIRM_MAYBE_REDIRECT` and `COMPANY_PAGES` lists of `scripts/demo-smoke.mjs` from the demo server, strips `<script>` and `<style>`, strips tags, collapses whitespace, and writes one text file per page into `$env:TEMP\especia-baseline\before\`. Mode `compare <paths>` captures the same pages into `after\` and prints a line diff per page. Before diffing, both sides are normalized: lower-cased, U+2013 and U+2014 replaced by "-", `(1,234)` style amounts rewritten to `-1,234`, arrow glyphs U+2190 to U+21FF removed, the words "change theme", "toggle navigation", "light", "dark", "system", "retry", "skip to content" ignored when they appear only on the after side.
  - Take Light theme screenshots of every page in the lists above at 1280px into `$env:TEMP\especia-baseline\shots\` (browser or `npx playwright screenshot` if available; otherwise the browser's full-page capture).
  - Files: create `src/lib/__tests__/nav-parity.test.ts`, `src/lib/__tests__/report-tabs-parity.test.ts`. Outside the repo: `$env:TEMP\especia-baseline\capture.mjs`, `before\`, `shots\`.
  - Satisfies: R21.3, R7.2, R7.11; design.md 6.7 (testability).
  - Content check: none changes; this task only records.
  - Verify: gates; `npm test` passes with the two new test files; with the demo server running, `node "$env:TEMP\especia-baseline\capture.mjs" baseline` writes one file per page, then `node "$env:TEMP\especia-baseline\capture.mjs" compare` immediately after reports zero differences.

## Phase 1: foundation (every task runs alone)

- [x] 2. Load Geist Sans and Geist Mono
  - Goal: the only font families are Geist Sans and Geist Mono, exposed as `--font-sans` and `--font-mono`.
  - Install `geist@1.7.2` (`npm install --save-exact geist@1.7.2`). In `src/app/layout.tsx` import `GeistSans` from `geist/font/sans` and `GeistMono` from `geist/font/mono` and put both `.variable` classes on `<html>`. In `src/app/globals.css` set `--font-sans: var(--font-geist-sans)` and `--font-mono: var(--font-geist-mono)` in `@theme inline` and make `body` use `var(--font-sans)`. Remove the system stack comment in `layout.tsx`. Keep `metadata` text as it is (dashes are fixed in task 40).
  - Files: modify `package.json`, `package-lock.json`, `src/app/layout.tsx`, `src/app/globals.css`.
  - Satisfies: R3.1, OQ-25; design.md 4.
  - Content check: every page text unchanged (`capture.mjs compare` for all pages).
  - Verify: gates; demo server: open `/c/tirupati-automart/dashboard` and `/companies`, DevTools Computed font-family of `body` resolves to Geist; the Network tab shows the font files served from `/_next/static/media`, no request to an external font host.

- [x] 3. Initialize shadcn and the `cn` helper
  - Goal: shadcn is configured for this repo without changing how any page looks yet.
  - Run `npx shadcn@4.21.4 init` (Radix, style `new-york`, base color neutral, CSS variables on). Make `components.json` match design.md 6.1 exactly (`rsc`, `tsx`, `tailwind.css: "src/app/globals.css"`, `iconLibrary: "lucide"`, aliases `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`).
  - Restore the token blocks the CLI wrote into `src/app/globals.css` (diff the file against the previous commit and remove the CLI's `:root`, `.dark` and `@theme inline` additions). Keep only `@import "shadcn/tailwind.css"` if the CLI added it, and then add `shadcn@4.21.4` as an exact devDependency. If `tw-animate-css` was added, remove its import and uninstall it.
  - Pin `radix-ui@1.8.1`, `class-variance-authority@0.7.1`, `tailwind-merge@3.7.0`, `clsx@2.1.1` with `--save-exact`.
  - `src/lib/utils.ts`: `cn` built on `extendTailwindMerge` with `theme: { text: ["title", "card-title", "body", "label", "kpi", "base"] }`.
  - Create `src/lib/__tests__/utils.test.ts`: `cn("text-text-secondary", "text-label")` keeps both classes; `cn("p-4", "p-5")` keeps `p-5`.
  - Files: create `components.json`, `src/lib/utils.ts`, `src/lib/__tests__/utils.test.ts`; modify `package.json`, `package-lock.json`, `src/app/globals.css` (net change limited to the optional import).
  - Satisfies: R22.3; design.md 2.3 (tailwind-merge), 6.1, 12.3; risk "shadcn CLI side effects".
  - Content check: all pages unchanged in words and look (`capture.mjs compare` for all pages; compare the dashboard against its baseline screenshot).
  - Verify: gates; `npm test`; `git diff src/app/globals.css` shows no token changes; `npm ls recharts` still resolves 3.10.1; demo server: `node scripts/demo-smoke.mjs` passes.

- [x] 4. Define the tokens for both themes
  - Goal: every brief token exists on `:root` (light) and `.dark` with the approved values, the shadcn names point at them, and the global rules are in place. Old classes keep working until their pages migrate.
  - In `src/app/globals.css`: add `@custom-variant dark (&:where(.dark, .dark *));`; write the `:root` and `.dark` blocks from design.md 2.1 (including the RQ-1 and RQ-2 values: light positive `#15803d`, chart-3 `#949499` and `#606068`, light chart-6 `#5a5a62`, dark chart-5 `#7f7f88`) and the shadcn mapping from 2.2; add the `@theme` type scale (`--text-title`, `--text-card-title`, `--text-body`, `--text-label`, `--text-kpi`, `--text-base`), `--default-transition-*`, `--container-page`, `--container-meeting` and the `@theme inline` color mappings from 2.3, written as `var(--x)` not `hsl(var(--x))`; add the global rules from 2.4 (transition property limit, ring shadow reset, `:focus-visible` outline, `.lucide` stroke, reduced motion, `html`, `body`, checkbox accent) and the `.num` rule from section 4.
  - Do not apply the namespace resets (`--color-*: initial`, `--shadow-*: initial`, `--text-*: initial`, `--radius-*: initial`) yet; they come in task 42. Keep the old-only tokens and classes (`--navy`, `--gold`, `--subtotal`, status `success/warning/danger/info` triplets, `--grad`, `--grad-strong`, `.brand-grad`, `.text-brand-grad`, `.glass`, `.mesh-bg`, `--shadow-card`, `.card-surface`, `.tbl-report`, `.page-title`, `.nums`) with their current values and `hsl()` mappings.
  - Repoint the six inline `hsl(var(--...))` uses to `var(--...)` so they stay valid with hex tokens: `src/components/company-header.tsx`, `src/components/sidebar.tsx`, `src/components/company-avatar.tsx`, `src/app/login/page.tsx`, `src/app/(dashboard)/(firm)/users/user-row.tsx`, `src/app/(dashboard)/(firm)/users/role-fields.tsx`. No other change in those files.
  - `src/components/charts/use-chart-colors.ts` interim fix (R9.8): read the variables raw (no `hsl()` wrap), read `sign.pos` and `sign.neg` from `--positive` and `--negative`, grid from `--grid`, cursor from `--surface-hover`, and re-read on a `MutationObserver` watching `document.documentElement` with `attributeFilter: ["class"]`.
  - Files: modify `src/app/globals.css`, `src/components/charts/use-chart-colors.ts` and the six files above.
  - Satisfies: R2.1, R2.2, R1.2, R1.9, R3.2, R3.4, R3.6, R6.1, R6.2, R17.2; design.md 2.1 to 2.6, 4.
  - Content check: all pages unchanged in words and numbers (`capture.mjs compare` for all pages). Colors change by design; every page must stay readable.
  - Verify: gates; demo server: open `/c/tirupati-automart/dashboard`, `/c/tirupati-automart/charts` and `/companies`; in DevTools Console `getComputedStyle(document.documentElement).getPropertyValue("--chart-3")` returns `#949499`; add the `dark` class to `<html>` by hand in DevTools and confirm the charts on `/c/tirupati-automart/charts` redraw in the dark palette without a reload; `node scripts/demo-smoke.mjs` passes.

- [x] 5. Add the theme provider and the ThemeToggle
  - Goal: Light, Dark and System work, persist, follow the OS live and never flash.
  - Install `next-themes@0.4.6` (exact). `npx shadcn@4.21.4 add dropdown-menu button`.
  - Create `src/components/layout/theme-provider.tsx` (client wrapper), `src/components/layout/theme-toggle.tsx` (design.md 3: ghost icon button, `aria-label="Change theme"`, three `DropdownMenuCheckboxItem`s Light, Dark, System with Sun, Moon, Monitor at 16px, check on the active one), `src/hooks/use-mounted.ts`.
  - `src/app/layout.tsx`: `<html lang="en" suppressHydrationWarning>`, wrap children in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`. `src/app/global-error.tsx`: same provider options and `suppressHydrationWarning` on its own `<html>`.
  - Mount `ThemeToggle` temporarily at the right end of the existing header in `src/components/portal-shell.tsx` (removed with that file in task 7).
  - Files: create the three files above and the shadcn `src/components/ui/dropdown-menu.tsx`, `src/components/ui/button.tsx`; modify `package.json`, `package-lock.json`, `src/app/layout.tsx`, `src/app/global-error.tsx`, `src/components/portal-shell.tsx`.
  - Satisfies: R1.1, R1.3 to R1.6, R1.8; design.md 3.
  - Content check: all pages unchanged (`capture.mjs compare`, the theme words are ignored by the script).
  - Verify: gates; demo server: on `/c/tirupati-automart/dashboard` pick each theme, hard refresh (Ctrl+Shift+R) in each and watch for a flash; with System chosen, toggle DevTools Rendering "prefers-color-scheme" and confirm the page switches live; reload and confirm the choice persisted (`localStorage.theme`); keyboard: Tab to the toggle, Enter opens, arrows move, Escape closes and focus returns; the console shows no hydration warning.

Checkpoint 1: open `/c/tirupati-automart/dashboard` and `/companies` and switch Light, Dark and System. Fonts are Geist, the palette is the new one, the toggle works, and nothing flashes on a hard refresh. Pages still have their old layout.

## Phase 2: layout shell (every task runs alone)

- [x] 6. Move nav types, add the distinct nav icons and the shell helpers
  - Goal: the data layer the shell needs, with no visible change except the icons in the current sidebar.
  - Create `src/types/nav.ts` (move `NavItem` out of `src/lib/nav.ts`), `src/types/report.ts` (move `ReportTab` out of `src/components/report-tabs.tsx`; `src/lib/report-tabs.ts` and `src/lib/data/report-tabs.ts` import it from types), `src/types/shell.ts` (`ShellProfile`, `ShellCompanyLink`, `CompanyScopeValue`).
  - `src/lib/nav.ts`: give each item the icon from design.md 5.3 (named lucide imports, `ChartColumn` instead of `BarChart3`) and add `data-nav-item` support for Segment P&L. Labels, hrefs, order, sections and visibility stay exactly as they are.
  - Create `src/lib/breadcrumb.ts` (`breadcrumbFor(pathname, items, company)`) with `src/lib/__tests__/breadcrumb.test.ts` (firm page, company page, unknown path shows crumb 1 only, archived company falls back to the slug).
  - Create `src/hooks/use-media-query.ts` and `src/hooks/use-meeting-mode.ts` (logic moved unchanged from `portal-shell.tsx`; `portal-shell.tsx` imports the hook).
  - Extend `nav-parity.test.ts`: icons are unique within each list.
  - Files: create the types, `src/lib/breadcrumb.ts`, its test and the two hooks; modify `src/lib/nav.ts`, `src/lib/report-tabs.ts`, `src/lib/data/report-tabs.ts`, `src/components/report-tabs.tsx`, `src/components/sidebar.tsx` (import path only), `src/components/portal-shell.tsx`, `src/lib/__tests__/nav-parity.test.ts`.
  - Satisfies: R4.6, R7.7, R20.1; design.md 5.3, 5.4, 6.5, 6.7.
  - Content check: nav and report tab parity tests pass; `capture.mjs compare` for all pages reports no differences.
  - Verify: gates; `npm test`; demo server: open `/companies` and `/c/tirupati-automart/dashboard`, each sidebar item shows a different icon, meeting mode still hides the sidebar and survives a reload.

- [x] 7. Build the AppShell with the shadcn Sidebar and the TopBar
  - Goal: one shared shell in `src/app/(dashboard)/layout.tsx` with the new sidebar, breadcrumb and top bar, holding every existing control.
  - `npx shadcn@4.21.4 add sidebar breadcrumb tooltip` (brings `sheet`, `separator`, `skeleton`, `input` and `src/hooks/use-mobile.ts`). Confirm `npm ls recharts` is unchanged.
  - Create in `src/components/layout/`: `app-shell.tsx`, `shell-company-provider.tsx`, `company-scope.tsx`, `app-sidebar.tsx`, `sidebar-brand.tsx`, `open-company-block.tsx`, `sidebar-nav.tsx`, `sidebar-nav-item.tsx`, `top-bar.tsx`, `shell-breadcrumb.tsx`, `skip-link.tsx`, `demo-banner.tsx`. Move `src/components/user-menu.tsx`, `src/components/unit-context.tsx` and `src/components/session-keep-alive.tsx` into `src/components/layout/` and update their importers.
  - `src/app/(dashboard)/layout.tsx`: auth guard unchanged, then `Promise.all` and `<AppShell>` as design.md 5.1. `src/app/(dashboard)/c/[slug]/layout.tsx`: keep `generateMetadata` and the company guard, render `CompanyScope` (with the hidden `data-segments` marker) instead of `PortalShell`; the "Company not available" branch keeps its words and link. Delete `src/app/(dashboard)/(firm)/layout.tsx`, `src/components/portal-shell.tsx`, `src/components/sidebar.tsx`.
  - The top bar right side holds, for now, the existing `UnitSwitch`, `HeaderOverflow` and `ThemeToggle` unchanged. `PeriodSelector` renders temporarily as one row at the top of the `CompanyScope` children (it moves into PageHeader in task 9). Add the `[data-nav-item="segment"]` hiding rule to `globals.css`.
  - Files: as listed; modify `src/app/globals.css`.
  - Satisfies: R7.1 to R7.8, R7.12, R7.13, R4.2 to R4.5, R17.1; design.md 5.1 to 5.4, 5.7, 6.2.
  - Content check: sidebar shows exactly the items, labels, sections and order of the parity fixture for an admin in demo mode, with and without a company open; the "Open company" block, "All companies" link, user identity, Sign out and "Especia Associates LLP" are present; `capture.mjs compare` for all pages reports no differences.
  - Verify: gates; `npm test`; demo server: navigate `/companies` to `/c/tirupati-automart/dashboard` to `/companies` with client links and confirm the breadcrumb and sidebar update without a reload; at 1280px the sidebar is 248px, at 900px it collapses to icons with tooltips, at 700px it opens as a sheet; the active item shows the 2px accent bar; the skip link appears on the first Tab; meeting mode hides the sidebar and its trigger; both themes; `node scripts/demo-smoke.mjs` passes.

- [x] 8. Rebuild the top bar actions
  - Goal: unit switch, Excel export, Print / PDF, meeting mode and the overflow menu in the new controls, same behavior.
  - `npx shadcn@4.21.4 add toggle-group` (brings `toggle`).
  - Create in `src/components/layout/`: `top-bar-actions.tsx`, `more-actions-menu.tsx` (DropdownMenu below `xl`), `export-actions.tsx`, `meeting-mode-button.tsx`, `unit-switch.tsx` (ToggleGroup Lakh, Crore, $; deselect writes `auto`), `usd-rate-field.tsx`. Create `src/lib/export-link.ts` (`excelHref`, moved from `export-menu.tsx`). Delete `src/components/header-overflow.tsx`, `src/components/export-menu.tsx`, `src/components/unit-switch.tsx`.
  - Files: as listed; modify `src/components/layout/top-bar.tsx`.
  - Satisfies: R7.6, R7.8, R12.1; design.md 5.4.
  - Content check: control labels and titles unchanged (Lakh, Crore, $, Download Excel, Print / PDF, Meeting mode, More, the rate field label and placeholder); `capture.mjs compare` for `/c/tirupati-automart/dashboard` and `/companies`.
  - Verify: gates; `npm test`; demo server on `/c/tirupati-automart/pnl`: switch Lakh, Crore and $ and confirm the amounts change exactly as before; with $ enter 90 and press Enter, then enter 5000 and blur (clamped as before); Download Excel returns an `.xlsx`; Print / PDF opens the print dialog; meeting mode on and off; at 1100px the "More" menu holds the same three actions; both themes.

- [x] 9. Add PageHeader, PeriodSelector and ReportTabs to every page
  - Goal: every page starts with the same header pattern and company pages carry the period selector in it.
  - `npx shadcn@4.21.4 add select`.
  - Create `src/components/layout/page-header.tsx`; move `src/components/period-selector.tsx` to `src/components/layout/period-selector.tsx` (shadcn Select, reads `useCompanyScope()`, same cookie and `router.refresh()` behavior); move `src/components/report-tabs.tsx` to `src/components/layout/report-tabs.tsx` (underline link nav, design.md 5.6). Create `src/components/dashboard/company-page-header.tsx` replacing `src/components/company-header.tsx` (pills become `text-label text-text-secondary` text, glow removed; delete the old file).
  - Replace the title block of every page under `src/app/(dashboard)/` with `PageHeader` holding its existing title, subtitle, filters and actions; pass `<PeriodSelector />` first in `filters` on company pages. Remove the temporary period row from `c/[slug]/layout.tsx`. This is one mechanical pattern across the page files; page bodies stay as they are.
  - Files: as listed; modify every `page.tsx` under `src/app/(dashboard)/(firm)/` and `src/app/(dashboard)/c/[slug]/`, `src/components/ageing-page.tsx`, `src/components/branch-scope-selector.tsx` (import path), `src/app/(dashboard)/c/[slug]/layout.tsx`.
  - Satisfies: R7.9 to R7.11, R4.7 (period icon size); design.md 5.5, 5.6, 7.
  - Content check: every title, subtitle, filter and tab label unchanged; `capture.mjs compare` for all pages.
  - Verify: gates; demo server: change the period on `/c/tirupati-automart/pnl` and confirm the numbers change as before; on `/c/tirupati-automart/dashboard` the header shows avatar, name, status, address, GST, PAN, CIN, "Prepared by" and FY; report tabs show a 2px accent underline on the active tab and scroll horizontally at 768px with the active tab in view; channel tabs still appear on pages that had them; both themes; `node scripts/demo-smoke.mjs` passes.

Checkpoint 2: the full frame. Open `/companies`, `/users`, `/c/tirupati-automart/dashboard`, `/c/tirupati-automart/pnl` and `/c/tirupati-automart/master-data` at 1440, 1024 and 768px in both themes. The sidebar, breadcrumb, top bar and page headers are final; page bodies still have their old cards.

## Phase 3: shared components (every task runs alone; they install primitives and update shared importers)

- [ ] 10. Create Card, states, Icon, Notice, StatusText and the route boundaries
  - Goal: the shared building blocks every later card uses.
  - `npx shadcn@4.21.4 add card skeleton` (skip any already present).
  - Create in `src/components/shared/`: `card.tsx`, `empty-state.tsx`, `error-state.tsx`, `card-error-boundary.tsx`, `icon.tsx`, `notice.tsx`, `status-text.tsx`, `page-skeleton.tsx` (variants report, list, form). Use them in every `loading.tsx` and `error.tsx` under `src/app/(dashboard)/` and in `src/app/global-error.tsx` (same copy as `RouteError`). Delete `src/components/route-error.tsx` and `src/components/page-skeleton.tsx`.
  - Files: as listed; modify `src/app/(dashboard)/(firm)/loading.tsx`, `src/app/(dashboard)/(firm)/error.tsx`, `src/app/(dashboard)/c/[slug]/loading.tsx`, `src/app/(dashboard)/c/[slug]/error.tsx`, `src/app/global-error.tsx`.
  - Satisfies: R13.1, R16.1 to R16.3, R11.1; design.md 6.4, 6.6.
  - Content check: error copy and Retry label identical to `route-error.tsx`; `capture.mjs compare` for all pages.
  - Verify: gates; demo server: throttle the network in DevTools and load `/c/tirupati-automart/pnl` to see the report skeleton; temporarily throw in a page locally to see the ErrorState and Retry, then revert the throw; both themes.

- [ ] 11. Restyle the filters and pickers
  - Goal: every filter control uses the shadcn Select or ToggleGroup at 32px.
  - Create `src/components/shared/segmented-control.tsx` and `src/components/shared/segmented-links.tsx`. Move to `src/components/shared/`: `quarter-filter.tsx` (on SegmentedLinks), `period-picker.tsx`, `branch-picker.tsx`, `branch-scope-selector.tsx` (shadcn Select, `SelectGroup` per channel). Same props, same URLs, same cookies. Update every importer (import paths only).
  - Files: create and move as listed; modify the importers: `book-to-bank/page.tsx`, `pnl/page.tsx`, `segment/page.tsx`, `cash-conversion/page.tsx`, `dashboard/page.tsx`, `(data)/inputs/page.tsx`, `(data)/master-data/page.tsx` under `src/app/(dashboard)/c/[slug]/`.
  - Satisfies: R7.9, R9.4, R5.4; design.md 6.4.
  - Content check: every option label, tooltip and order unchanged (quarter tooltip dashes are fixed in task 40); `capture.mjs compare` for dashboard, pnl, segment, book-to-bank, cash-conversion, inputs, master-data.
  - Verify: gates; demo server: on `/c/tirupati-automart/pnl` click each quarter and the Monthly and Branch-wise switch and confirm the URL and numbers match the baseline behavior; change branch scope on `/c/tirupati-automart/dashboard`; change period and branch on `/c/tirupati-automart/master-data`; keyboard through each control; both themes.

- [ ] 12. Restyle avatar, chooser and form helpers, and add the remaining primitives
  - Goal: the last shared pieces, so page tasks never install packages.
  - `npx shadcn@4.21.4 add dialog label textarea input`.
  - Move to `src/components/shared/`: `company-avatar.tsx` (flat tile, no gradient), `company-chooser.tsx`, `action-status.tsx`. Create `src/components/shared/reorder-buttons.tsx` and `src/components/shared/clone-banner.tsx` (read both `CloneBanner` copies in `branches-editor.tsx` and `template-editor.tsx`; merge only if identical, otherwise keep two named variants in this one file's props). Add `fieldClass` to `src/lib/ui-classes.ts`, keeping `focusRing` and `fieldText` until task 42. Update every importer (import paths only).
  - Files: as listed; modify the importers of `action-status`, `company-avatar` and `company-chooser` found by `rg -l "action-status|company-avatar|company-chooser" src`.
  - Satisfies: R4.7 (reorder icons are ready), R5.4, R3.7; design.md 6.4, 6.5.
  - Content check: `capture.mjs compare` for `/companies`, `/upload`, `/queries`, `/reports`, `/c/tirupati-automart/dashboard`.
  - Verify: gates; `npm test`; demo server: open `/upload`, `/queries` and `/reports` (firm) and click a company in each chooser; submit a demo form (for example a query on `/c/tirupati-automart/queries`) and confirm the existing "Not saved" status message still appears in its status region; both themes.

Checkpoint 3: nothing new to look at beyond restyled filters, pickers and loading states. Review `/c/tirupati-automart/pnl` filters and a throttled load.

## Phase 4: KPI strip

- [ ] 13. Build the KPI strip and move the dashboard KPIs onto it (runs alone)
  - Goal: KpiStrip and KpiCell exist, and the dashboard shows its 10 KPIs as two rows of five.
  - Create `src/types/kpi.ts`, `src/lib/kpi.ts` (`kpiDelta`, the exact rule from `kpi-delta.tsx`) with `src/lib/__tests__/kpi.test.ts` (zero prior omits, under 0.05% is flat, color follows `goodWhenUp`), and add `negParens` to `src/lib/format.ts` with tests in `src/lib/__tests__/format.test.ts`.
  - Create `src/components/dashboard/kpi-strip.tsx`, `kpi-cell.tsx`, `kpi-strip-skeleton.tsx` and `src/components/shared/delta-text.tsx` (ArrowUpRight, ArrowDownRight, ArrowRight at 14px, `aria-hidden`, sr-only "up", "down", "unchanged" kept, "favourable" or "adverse" and "vs last month" kept).
  - Split `src/app/(dashboard)/c/[slug]/dashboard/page.tsx`: move the pure month snapshot, YTD and balance column builders verbatim into `dashboard-data.ts`; create `dashboard-kpis.tsx` rendering `KpiStrip columns={5}` from props (no cookie reads). Delete `src/components/kpi-delta.tsx`. Use `KpiStripSkeleton` in the dashboard `loading.tsx` if the dashboard has one, otherwise in the report `PageSkeleton` variant.
  - Files: as listed.
  - Satisfies: R8.1 to R8.6, R3.2, R3.4; design.md 6.3, 6.5, 6.6.
  - Content check: the 10 KPI labels, values, percent changes, "favourable" or "adverse" words and "vs last month" text match the baseline in the same order; "No data" cells keep the cell height; `capture.mjs compare /c/tirupati-automart/dashboard`.
  - Verify: gates; `npm test`; demo server: `/c/tirupati-automart/dashboard` at 1440 and 1280px shows two rows of five with equal heights and 1px dividers, at 1024 and 768px the cells wrap evenly; switch the unit and period and confirm values follow; both themes (delta colors pass in light with `#15803d`).

Checkpoint 4: the dashboard KPI strip. Compare it side by side with the baseline screenshot: same numbers and words, new hierarchy.

## Phase 5: chart

- [ ] 14. Add the chart foundation and move the Charts page frame onto it (runs alone)
  - Goal: the chart card, legend, downloads and skeleton exist and every Charts page card uses the new frame.
  - `npx shadcn@4.21.4 add chart`; then restore `recharts` to 3.10.1 in `package.json` and the lockfile if the CLI changed it (`npm ls recharts`).
  - Create `src/types/chart.ts`, `src/lib/chart-export.ts` (`exportChartPng`, `downloadCsv`, `inlineComputedColors`, moved from `chart-frame.tsx`), and in `src/components/dashboard/`: `chart-card.tsx`, `chart-downloads.tsx`, `chart-legend.tsx`, `chart-skeleton.tsx`, `series-toggle.tsx`.
  - Reduce `src/app/(dashboard)/c/[slug]/charts/chart-frame.tsx` (working tree version) to a thin adapter that renders the new `ChartCard` with its current props, so every card on the page gets the new frame now. It is deleted in task 19.
  - Files: as listed; modify `package.json`, `package-lock.json`, `chart-frame.tsx`.
  - Satisfies: R9.1, R9.2, R9.4, R16.1, R17.4; design.md 3 (PNG export), 6.3, 8.
  - Content check: every chart title, subtitle, control label and download label on `/c/tirupati-automart/charts` matches the baseline screenshot; `capture.mjs compare /c/tirupati-automart/charts`.
  - Verify: gates; `npm test`; demo server: on `/c/tirupati-automart/charts` download one PNG and one CSV in Light and in Dark and open them (PNG colors match the theme, font is Geist, CSV rows match the chart); both themes.

- [ ] 15. Build TrendChart and the Monthly trend card (runs alone)
  - Goal: the first real chart on the new component.
  - Create `src/components/dashboard/trend-chart.tsx` (modes bar, line, area; 1.5px lines, no dots, dashed `var(--grid)`, tooltip on `bg-popover` with a 1px border, `isAnimationActive={false}`, `accessibilityLayer`, flat area fill at 0.12 opacity, series 4 to 6 dashed). Create `src/app/(dashboard)/c/[slug]/charts/trend-card.tsx` (mode SegmentedControl, absolute or % of revenue, SeriesToggle) and move the monthly trend out of `charts-board.tsx`.
  - Files: create the two files; modify `charts-board.tsx`.
  - Satisfies: R9.1 to R9.4, R9.7, R1.7; design.md 8.
  - Content check: same metrics, series names and toggle options as the baseline; tooltip values match the baseline for the same month (check two months by hover).
  - Verify: gates; demo server: on `/c/tirupati-automart/charts` switch bar, line and area, absolute and percent, and each series toggle; switch the theme with the tooltip open and confirm lines, grid, axis text and tooltip change color without a reload; range control still works.

Checkpoint 5: the Monthly trend card on `/c/tirupati-automart/charts` in both themes.

## Phase 6: tables

- [ ] 16. Build StatementTable and the dashboard summary cards (runs alone)
  - Goal: report statements use one table component, starting with the dashboard.
  - Create `src/types/statement.ts`, `src/components/dashboard/statement-table.tsx`, `src/components/dashboard/statement-row.tsx` (design.md 9: sticky header, `.num` cells, section, subtotal, total and separator rows by weight and border, frozen first column, focusable labelled scroll region, `negParens` on display).
  - Create `src/app/(dashboard)/c/[slug]/dashboard/profit-summary-card.tsx` and `balance-sheet-card.tsx`; `dashboard/page.tsx` now fetches and composes only (at most 150 lines). Keep the footnote and its link, and the no period EmptyState with its two sentences and link.
  - Files: as listed; modify `dashboard/page.tsx`, `dashboard/dashboard-data.ts`.
  - Satisfies: R10.1 to R10.3, R10.6, R10.7, R14.2, R20.3; design.md 7 (dashboard), 9.
  - Content check: every row label, column, amount, percent sub-line and emphasis row of both summaries matches the baseline; negative amounts read `(1,234)`; `capture.mjs compare /c/tirupati-automart/dashboard`.
  - Verify: gates; demo server: `/c/tirupati-automart/dashboard` scroll the profit summary horizontally at 768px (first column stays frozen, header sticks); Tab into the scroll region and scroll with arrow keys; both themes; `node scripts/demo-smoke.mjs` passes.

- [ ] 17. Build DataTable and move the ageing reports onto it (runs alone)
  - Goal: the interactive list table exists, starting with debtors and creditors.
  - Install `@tanstack/react-table@9.3.1` (exact). `npx shadcn@4.21.4 add table`.
  - Create `src/components/dashboard/data-table.tsx`, `data-table-features.ts`, `data-table-skeleton.tsx`, `ageing-table.tsx`, `ageing-columns.tsx`, `ageing-report.tsx`, and `src/lib/data/ageing.ts` (`loadAgeingView`, the reads moved from `ageing-page.tsx`). Update `debtors/page.tsx` and `creditors/page.tsx`. Delete `src/components/ageing-page.tsx` and `src/components/ageing-table.tsx`.
  - Files: as listed; modify `package.json`, `package-lock.json`.
  - Satisfies: R10.1, R10.2, R10.5, R10.6, R16.1; design.md 6.3, 9.
  - Content check: same parties, buckets, amounts, columns, search placeholder, bucket labels and empty and no search result copy as the baseline; `capture.mjs compare /c/tirupati-automart/debtors /c/tirupati-automart/creditors`.
  - Verify: gates; `npm test`; demo server: on `/c/tirupati-automart/debtors` search for a party, pick each bucket, use Clear search, and confirm rows match the baseline behavior; rows are 52px with two-line party cells; header sticks inside the card; same on creditors; both themes.

Checkpoint 6: the dashboard summaries and the debtors and creditors pages in both themes.

## Phase 7: remaining card types (donut, ranked bars, waterfall and the summary cards on report pages)

- [ ] 18. Build BreakdownDonut and RankedBarChart with the Expense breakdown card (runs alone)
  - Goal: the donut and ranked bar cards.
  - Create `src/components/dashboard/breakdown-donut.tsx` (inner 68%, 2px surface separators, center total at 20px and "Total", legend with dot, name and percent) and `src/components/dashboard/ranked-bar-chart.tsx` (horizontal, chart-1, `signed` mode for favourable and adverse). Create `src/app/(dashboard)/c/[slug]/charts/expense-card.tsx` (pie mode becomes the donut, bar mode the ranked bars, month and category Selects) and move it out of `charts-board.tsx`.
  - Files: create the three files; modify `charts-board.tsx`.
  - Satisfies: R9.1, R9.3, R9.5; design.md 8.
  - Content check: same categories, amounts, percents, month and category options as the baseline; slice order unchanged.
  - Verify: gates; demo server: on `/c/tirupati-automart/charts` switch the expense card between pie and bar, change month and category, hover a slice; switch the theme with the donut visible and confirm segments, separators, center text and legend change without a reload.

- [ ] 19. Move the remaining Charts page cards and finish the charts-board split (runs alone)
  - Goal: every Charts page card on the new components; `charts-board.tsx` holds only range state and card order.
  - Create in `src/app/(dashboard)/c/[slug]/charts/`: `compare-card.tsx` (RankedBarChart), `budget-cards.tsx` (by month TrendChart, by section RankedBarChart, biggest variances RankedBarChart `signed` with its subtitle), `working-capital-cards.tsx` (working capital TrendChart, cash conversion cycle TrendChart with "DCP + ICP − CPP"). `charts-board.tsx` at most 150 lines. Delete `chart-frame.tsx`.
  - Files: as listed; modify `charts-board.tsx`, `charts/page.tsx` if imports change.
  - Satisfies: R9.1, R9.6, R20.3; design.md 8, 12.2.
  - Content check: every card title, subtitle, series, control and download on `/c/tirupati-automart/charts` matches the baseline screenshot in the same order; `capture.mjs compare /c/tirupati-automart/charts`.
  - Verify: gates; demo server: exercise every control on `/c/tirupati-automart/charts`, download one CSV per card and compare with the baseline values; theme switch with charts visible; at 768px no card overflows.

- [ ] 20. Book to bank: waterfall, KPIs and the 70/30 grid (parallel-safe with 21)
  - Goal: Book to bank in the final pattern.
  - Create `src/components/dashboard/waterfall-chart.tsx` (totals chart-2, increases positive, decreases negative). In `src/app/(dashboard)/c/[slug]/book-to-bank/` create `btb-data.ts`, `btb-kpis.tsx` (`KpiStrip columns={4}`), `btb-rows.ts` (rows for StatementTable); `page.tsx` composes the 70/30 grid (`grid xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-6`, equal heights). Delete `book-to-bank-table.tsx` and `waterfall.tsx`.
  - Files: as listed.
  - Satisfies: R8.1, R9.6, R10.1, R13.2, R13.3; design.md 7, 8.
  - Content check: KPIs, reconciliation rows, waterfall steps and subtitle "green is favourable, red is unfavourable" unchanged; `capture.mjs compare /c/tirupati-automart/book-to-bank`.
  - Verify: gates; demo server: `/c/tirupati-automart/book-to-bank` at 1440px left and right cards have equal height, at 1024px the waterfall stacks below the table; quarter filter still works; theme switch with the waterfall tooltip open.

- [ ] 21. Cash conversion: KPIs, working sheet and CCC chart in the 70/30 grid (parallel-safe with 20)
  - Goal: Cash conversion in the final pattern.
  - In `src/app/(dashboard)/c/[slug]/cash-conversion/` create `ccc-data.ts`, `ccc-kpis.tsx` (four KPIs with their prior month subs), `ccc-rows.ts` (from the working tree `ccc-table.tsx`, keeping its uncommitted changes), and compose `page.tsx` as 70/30 with "Working sheet" and "CCC components (days)" (`TrendChart mode="bar"`). Delete `ccc-table.tsx` and `ccc-chart.tsx` after their logic is moved.
  - Files: as listed.
  - Satisfies: R8.1, R9.1, R10.1, R13.2; design.md 7, 8.
  - Content check: same KPIs, rows, series and labels as the baseline; `capture.mjs compare /c/tirupati-automart/cash-conversion`.
  - Verify: gates; demo server: `/c/tirupati-automart/cash-conversion` equal card heights at 1440px, stacked at 1024px; branch scope selector still changes the numbers; theme switch with the chart visible.

- [ ] 22. Segment P&L cards and retire the old chart helpers (runs alone; depends on 19, 20, 21)
  - Goal: the last charts move and the interim chart code is deleted.
  - In `src/app/(dashboard)/c/[slug]/segment/` create `segment-data.ts`, `segment-table-card.tsx` (StatementTable), `segment-chart-cards.tsx` ("Revenue share by segment" BreakdownDonut without a center value, "Gross profit by segment" TrendChart bars in chart-1); `page.tsx` at most 150 lines; the no segments EmptyState keeps its sentence and link. Delete `segment-charts.tsx`, `src/components/chart-card.tsx`, `src/components/charts/chart-skeleton.tsx`, `src/components/charts/use-chart-colors.ts` (confirm `rg -l "use-chart-colors|charts/chart-skeleton|components/chart-card" src` is empty first).
  - Files: as listed.
  - Satisfies: R9.1, R9.8, R20.5; design.md 8, 12.1.
  - Content check: same segment rows, shares and gross profit values; `capture.mjs compare /c/tirupati-automart/segment`.
  - Verify: gates; demo server: `/c/tirupati-automart/segment` in both themes, hover both charts; a company without segments still hides the Segment P&L nav item on a hard refresh (DevTools: the `data-segments="none"` marker is present when it applies); `node scripts/demo-smoke.mjs` passes.

Checkpoint 7: every chart and statement page: `/c/tirupati-automart/charts`, `book-to-bank`, `cash-conversion`, `segment`, `dashboard`, in both themes at 1440 and 768px.

## Phase 8: other pages (parallel-safe unless noted; each touches only its own route folder)

- [ ] 23. P&L page
  - Goal: P&L in the final pattern and under 150 lines per file.
  - In `src/app/(dashboard)/c/[slug]/pnl/` create `pnl-data.ts` (pure column builders), `pnl-filters.tsx`, `pnl-kpis.tsx` (`KpiStrip columns={4}`: Revenue, Gross profit, EBITDA, Net profit (EBT) with margin subs), `pnl-rows.ts`; `page.tsx` composes; adjustments sentence in `Notice`; `StatementTable frozenFirst maxHeight="screen"`. Delete `pnl-table.tsx`.
  - Satisfies: R8.1, R10.1 to R10.3, R10.7, R20.3; design.md 7, 9, 12.2.
  - Content check: every line, column (monthly, branch-wise, quarters), amount and margin unchanged; `capture.mjs compare /c/tirupati-automart/pnl` plus the same with `?q=` and Branch-wise query strings used in the baseline.
  - Verify: gates; demo server: `/c/tirupati-automart/pnl` every quarter, Monthly and Branch-wise, branch scope; header sticks inside the 70dvh region; both themes.

- [ ] 24. Budget vs actual page
  - Goal: KPIs and the statement on the new components.
  - In `src/app/(dashboard)/c/[slug]/budget-vs-actual/` create `bva-rows.ts` and `bva-kpis.tsx`; `page.tsx` composes; delete `budget-vs-actual-table.tsx`.
  - Satisfies: R8.1, R10.1; design.md 7.
  - Content check: `capture.mjs compare /c/tirupati-automart/budget-vs-actual`.
  - Verify: gates; demo server: `/c/tirupati-automart/budget-vs-actual` both themes, at 768px the table scrolls inside its card.

- [ ] 25. Compare and History pages
  - Goal: both pages on Card and StatementTable or Card lists.
  - `src/app/(dashboard)/c/[slug]/compare/page.tsx` and `month-picker.tsx` (shadcn Select, same months), comparison as StatementTable (add `compare-rows.ts` if `page.tsx` would exceed 150 lines); `src/app/(dashboard)/c/[slug]/history/page.tsx` rows in a Card with the shared row tokens.
  - Satisfies: R10.1, R14.1; design.md 7.
  - Content check: `capture.mjs compare /c/tirupati-automart/compare /c/tirupati-automart/history`.
  - Verify: gates; demo server: pick two months on compare and confirm values match the baseline for the same months; open history; both themes.

- [ ] 26. Company Reports and Notes and queries pages
  - Goal: report list and query threads on Card and StatusText.
  - `src/app/(dashboard)/c/[slug]/reports/page.tsx` split into `page.tsx` and `report-list.tsx`; `period-downloads.tsx` buttons at 32px. `src/app/(dashboard)/c/[slug]/queries/page.tsx` and `query-forms.tsx`: thread Cards, status as StatusText, open count as text, forms on `Textarea` and `Button`.
  - Satisfies: R11.1, R14.1, R20.3; design.md 7.
  - Content check: `capture.mjs compare /c/tirupati-automart/reports /c/tirupati-automart/queries`.
  - Verify: gates; demo server: download one report per type on `/c/tirupati-automart/reports`; submit a reply on `/c/tirupati-automart/queries` and see the demo status message; both themes.

- [ ] 27. GP dashboard viewer
  - Goal: flat frame around the unchanged uploaded HTML.
  - `src/app/(dashboard)/c/[slug]/gp-dashboard/gp-dashboard-viewer.tsx` and `page.tsx`: `Card flush`, toolbar `bg-surface` with a bottom border and no `backdrop-blur`, buttons `Button size="sm"`.
  - Satisfies: R14.4, R2 bans (blur); design.md 7.
  - Content check: frame content identical; `capture.mjs compare /c/tirupati-automart/gp-dashboard`.
  - Verify: gates; demo server: open `/c/tirupati-automart/gp-dashboard`, use every toolbar button, scroll the frame and confirm the toolbar stays usable; both themes.

- [ ] 28. Split the company card (not parallel with 29)
  - Goal: `company-card.tsx` (569 lines) split into focused files with identical behavior.
  - In `src/app/(dashboard)/(firm)/companies/` create `logo-editor.tsx`, `delete-company-control.tsx`, `archive-control.tsx`, `edit-company-form.tsx` (shadcn Dialog instead of `Modal`), `info-field.tsx`, `form-field.tsx`; `company-card.tsx` keeps the card layout (avatar, two-line name and meta, StatusText instead of `StatusPill`). Every file at most 150 lines.
  - Satisfies: R11.1, R12.1, R12.2, R20.3; design.md 12.2.
  - Content check: card fields, labels, buttons and dialog texts unchanged; `capture.mjs compare /companies`.
  - Behavior check: open edit, change a field, save (demo answers "Not saved" as before), Escape closes and focus returns to the trigger; open the logo editor; open archive and delete confirmations and cancel them; same confirmations and wording as the baseline.
  - Verify: gates; demo server: the behavior check on `/companies` in both themes.

- [ ] 29. New company form, archived companies and the companies page (depends on 28)
  - Goal: the rest of the companies folder, and `Modal` retired.
  - `new-company-form.tsx` split into `new-company-form.tsx` (Dialog and action) and `new-company-fields.tsx`; `archived-companies.tsx` as a Card; `page.tsx` card grid `grid gap-6 md:grid-cols-2 xl:grid-cols-3`. Delete `src/components/modal.tsx` after `rg -l "components/modal" src` is empty.
  - Satisfies: R12.1, R13.1, R20.3; design.md 7.
  - Content check: `capture.mjs compare /companies`.
  - Behavior check: New company opens the Dialog with every field and label as before; submit shows the demo status; Escape closes.
  - Verify: gates; demo server: the behavior check and archived list on `/companies` in both themes.

- [ ] 30. Users page on DataTable
  - Goal: users list as a DataTable, `user-row.tsx` (292 lines) split.
  - In `src/app/(dashboard)/(firm)/users/` create `user-columns.tsx`, `user-actions.tsx`, `edit-user-form.tsx`, `reset-password-inline.tsx`, `user-initials.ts`; delete `user-row.tsx`; restyle `new-user-form.tsx` and `role-fields.tsx` (checkbox accent from the global rule, no inline color); `page.tsx` uses `DataTable` with `renderExpanded` for the inline edit and reset forms.
  - Satisfies: R10.5, R10.6, R11.1, R20.3; design.md 7, 12.2.
  - Content check: same users, emails, roles, companies and action labels; `capture.mjs compare /users`.
  - Behavior check: Edit expands the inline form under the row with the same fields, Reset password expands its inline form, Remove asks for the same confirmation, New user opens the same form; each submit shows the demo status.
  - Verify: gates; `npm test`; demo server: the behavior check on `/users` in both themes; rows are 52px.

- [ ] 31. Audit log page on DataTable
  - Goal: audit list as a DataTable with Select filters.
  - In `src/app/(dashboard)/(firm)/audit/` create `audit-format.ts` (`roleName`, `when`, `summarize` moved verbatim), `audit-columns.tsx`, `audit-filters.tsx` (shadcn Select for action and company, same query strings); `page.tsx` at most 150 lines; `load-more.tsx` as `Button size="sm"`.
  - Satisfies: R10.6, R11.1, R20.3; design.md 7.
  - Content check: `capture.mjs compare /audit "/audit?action=upload_tb"`.
  - Behavior check: each action filter and company filter gives the same rows as the baseline; Load more appends the same next page.
  - Verify: gates; `npm test`; demo server: the behavior check on `/audit` in both themes.

- [ ] 32. Review queue, Profile and the firm chooser pages
  - Goal: the remaining firm pages on Card and StatusText.
  - `src/app/(dashboard)/(firm)/review/page.tsx` (status as StatusText, issue levels as text with CircleAlert or Info), `profile/page.tsx` (definition list in a Card), `upload/page.tsx`, `queries/page.tsx`, `reports/page.tsx` (CompanyChooser rows in a Card).
  - Satisfies: R11.1, R14.1; design.md 7.
  - Content check: `capture.mjs compare /review /profile /upload /queries /reports`.
  - Verify: gates; demo server: open each page, click into a company from each chooser; both themes.

- [ ] 33. Login page
  - Goal: flat login card with every word kept.
  - `src/app/login/page.tsx` and `login-form.tsx`: centered 400px Card on `bg-background`, flat "E" square, "Sign in", "Access your dashboard portal.", `Label` and `Input` fields, one filled `Button`, ActionStatus, footer "Especia Associates LLP". No mesh, gradient tile or glow.
  - Satisfies: R14.3; design.md 7.
  - Content check: in demo mode `/login` redirects, so check the words by reading the JSX against the baseline source (`git show HEAD:src/app/login/page.tsx`); run once with `$env:DEMO_MODE = "false"` and local Supabase if available, otherwise state that the visual check was done by temporarily rendering the form on a throwaway route that is deleted before the task ends.
  - Verify: gates; the page in both themes by one of the two methods above; keyboard focus ring on each field and the button.

- [ ] 34. Master data page
  - Goal: master data on DataTable with `master-table.tsx` (215 lines) and `page.tsx` (157) split.
  - In `src/app/(dashboard)/c/[slug]/(data)/master-data/` create `master-columns.tsx`, `amount-cell.tsx`, `unbalanced-notice.tsx` (Notice with CircleAlert instead of the pill), `master-data-header.tsx`; `master-table.tsx` keeps DataTable and search; restyle `editable-cell.tsx`.
  - Satisfies: R10.1, R10.2, R10.6, R11.1, R20.3; design.md 7, 12.2.
  - Content check: `capture.mjs compare /c/tirupati-automart/master-data`.
  - Behavior check: search filters the same rows; editing a cell, pressing Enter and Escape behaves as before (demo answers "Not saved"); amounts are mono and right-aligned; the unbalanced notice shows the same sentence when it applies.
  - Verify: gates; demo server: the behavior check in both themes.

- [ ] 35. Split the branches editor
  - Goal: `branches-editor.tsx` (737 lines) split with identical behavior.
  - In `src/app/(dashboard)/c/[slug]/(data)/branches/` create `branch-manager.tsx` (container), `group-editor.tsx`, `new-group-row.tsx`, `branch-editor.tsx`, `new-branch-row.tsx`, `report-scope-row.tsx`; use `shared/status-text.tsx`, `shared/clone-banner.tsx`, `shared/reorder-buttons.tsx` (ArrowUp and ArrowDown with their existing accessible names); delete `branches-editor.tsx`; `page.tsx` shows "Staff only" as text.
  - Satisfies: R4.7, R11.1, R17.1, R20.3; design.md 7, 12.2.
  - Content check: `capture.mjs compare /c/tirupati-automart/branches`.
  - Behavior check: add a group, add a branch, rename, move up and down (first and last buttons disabled as before), change report scope, clone banner shown when it applied before; each save shows the demo status; keyboard reaches every control.
  - Verify: gates; demo server: the behavior check in both themes.

- [ ] 36. Split the template editor
  - Goal: `template-editor.tsx` (655 lines) split with identical behavior.
  - In `src/app/(dashboard)/c/[slug]/(data)/template/` create `template-manager.tsx`, `section-table.tsx`, `line-editor.tsx`, `new-line-row.tsx`, `segment-editor.tsx`, `new-segment-row.tsx`, `section-label.ts`; shared StatusText, CloneBanner as Notice, ReorderButtons; delete `template-editor.tsx`; "Staff only" as text.
  - Satisfies: R4.7, R11.1, R20.3; design.md 7, 12.2.
  - Content check: `capture.mjs compare /c/tirupati-automart/template`.
  - Behavior check: one Card per section with the same lines in order; add a line, edit a line, move up and down, add and edit a segment; each save shows the demo status.
  - Verify: gates; demo server: the behavior check in both themes.

- [ ] 37. Mapping page
  - Goal: `mapping-editor.tsx` (343 lines) split; emoji and undo glyph replaced.
  - In `src/app/(dashboard)/c/[slug]/(data)/mapping/` create `mapping-manager.tsx`, `editable-row.tsx`, `grouping-select.tsx` (native select with `fieldClass`; the "New grouping…" option loses its emoji, the words stay); undo glyph becomes an Undo2 icon button with the existing label; restyle `bulk-mapping-form.tsx` and `page.tsx`; delete `mapping-editor.tsx`.
  - Satisfies: R4.7, R18.1, R20.3; design.md 7, 10.
  - Content check: `capture.mjs compare /c/tirupati-automart/mapping` (the emoji is the only allowed removal and is normalized by inspection).
  - Behavior check: change a grouping, choose "New grouping…", undo, upload the bulk mapping form; same results as before in demo.
  - Verify: gates; demo server: the behavior check in both themes; the mapping template download still returns a file.

- [ ] 38. Data upload page
  - Goal: upload forms and lists on Card and StatusText.
  - In `src/app/(dashboard)/c/[slug]/(data)/upload/` split `upload-form.tsx` into `upload-form.tsx` and `upload-fields.tsx`; restyle `period-list.tsx` (StatusText per period), `gp-dashboard-form.tsx`, `gp-dashboard-list.tsx`, `page.tsx`.
  - Satisfies: R11.1, R20.3; design.md 7.
  - Content check: `capture.mjs compare /c/tirupati-automart/upload`.
  - Verify: gates; demo server: choose a file in each form and submit (demo status), period list statuses read as before; both themes.

- [ ] 39. Inputs, Budget and the data layout
  - Goal: the last data pages.
  - `src/app/(dashboard)/c/[slug]/(data)/inputs/inputs-form.tsx` split into `inputs-form.tsx` and `inputs-section.tsx`; restyle `inputs/page.tsx`, `budget/page.tsx`, `budget/budget-upload-form.tsx`, `(data)/layout.tsx` (staff guard unchanged, no `card-surface`).
  - Satisfies: R14.1, R20.3, R7.13; design.md 7.
  - Content check: `capture.mjs compare /c/tirupati-automart/inputs /c/tirupati-automart/budget`.
  - Verify: gates; demo server: change period and branch on inputs, submit the form (demo status), download the budget template; both themes.

Checkpoint 8: every page is on the new design. Walk all pages in the smoke list in both themes and compare with the baseline screenshots.

## Phase 9: text cleanup (runs alone)

- [ ] 40. Replace every en and em dash in `src/`
  - Goal: zero U+2013 and U+2014 in `src/`, words unchanged.
  - Replace by meaning (design.md 10): asides become a colon, comma or full stop; ranges become a hyphen; empty cells "-". Covers UI text, comments, Excel output strings in `src/lib/export/`, statement labels, `src/lib/demo/messages.ts` and the dataset, metadata in `src/app/layout.tsx`, the quarter tooltip, the "₹/$" aria label. `fyDisplay` in `src/lib/format.ts` returns "FY 2026-27"; update the one expectation in `src/lib/__tests__/format.test.ts`. Remove any remaining arrow glyph used as an icon. Engine, database and export label wording stays; only the dash characters change (OQ-20, OQ-21). Root docs, `supabase/` and `scripts/` are out of scope.
  - Files: every file returned by `rg -l --pcre2 '[\x{2013}\x{2014}]' src` and `rg -l --pcre2 '[\x{2190}-\x{21FF}]' src -g '*.tsx'`.
  - Satisfies: R18.1, R18.3, R18.5; design.md 10, 13 checks 1 and 3.
  - Content check: `capture.mjs compare` for all pages (dashes are normalized, so no differences); download every Excel file in the `DOWNLOADS` list of `scripts/demo-smoke.mjs` and confirm titles keep their words.
  - Verify: gates; `npm test` (all engine and format tests pass, the only changed expectation is `fyDisplay`); `rg -n --pcre2 '[\x{2013}\x{2014}]' src` prints nothing; `rg -n --pcre2 '[\x{2190}-\x{21FF}]' src -g '*.tsx'` prints nothing; `node scripts/demo-smoke.mjs` passes.

- [ ] 41. Sentence case for UI labels
  - Goal: every title and label written in UI code, `src/lib/nav.ts` and `src/lib/report-tabs.ts` in sentence case, words unchanged.
  - Apply design.md 10 (acronyms and names keep their case: MIS, GP, P&L, EBT, EBITDA, COGS, CCC, DCP, ICP, CPP, YTD, FY, GST, PAN, CIN, TB, OD, Q1 to Q4, US$, Excel, PDF, Tally, Especia, LLP, month names, company and person names). Labels from the database, `src/lib/mis/` engines and `src/lib/export/` are not touched.
  - Files: `src/lib/nav.ts`, `src/lib/report-tabs.ts`, and the UI files under `src/app/` and `src/components/` that hold title case labels.
  - Satisfies: R18.1, R18.4; design.md 10.
  - Content check: nav and report tab parity tests pass unchanged (they compare lower-cased); `capture.mjs compare` for all pages reports no differences (it lower-cases).
  - Verify: gates; `npm test`; demo server: read the sidebar, tabs, headers, KPI labels, table headers and buttons on `/c/tirupati-automart/dashboard`, `/c/tirupati-automart/pnl` and `/users` and confirm sentence case with acronyms intact; Excel files keep their original label case.

Checkpoint 9: the copy pass. Review the sidebar, report tabs and a few headers for sentence case and the absence of dashes.

## Phase 10: cleanup and polish (every task runs alone)

- [ ] 42. Retire the old styles and apply the namespace resets
  - Goal: only the new tokens remain, so banned values cannot be written.
  - Confirm design.md 13 check 11 (old classes and tokens) is empty outside `globals.css`. Then in `src/app/globals.css` delete `--grad`, `--grad-strong`, `.brand-grad`, `.text-brand-grad`, `.glass`, `.mesh-bg`, `--shadow-card`, `.card-surface`, `.tbl-report` and its row classes, `.page-title`, `.nums`, navy, gold, subtotal and the status triplets, and apply the `@theme` resets from design.md 2.3 (`--color-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`, `--text-shadow-*`, `--blur-*`, `--radius-*`, `--text-*` with the kept values). Remove `focusRing` and `fieldText` from `src/lib/ui-classes.ts` after their importers use `fieldClass`. Delete `src/components/kpi.tsx`, `src/components/placeholder.tsx` and any file left in the old `src/components/` root that design.md 12.1 replaces (confirm each has no importer with `rg`).
  - Files: modify `src/app/globals.css`, `src/lib/ui-classes.ts` and remaining importers; delete the files named above.
  - Satisfies: R2.5, R19 scope note, R20.5; design.md 2.3, 2.5, 12.1; risk "namespace resets".
  - Content check: `capture.mjs compare` for all pages.
  - Verify: gates; `npm test`; demo server: open every page in the smoke list in both themes and confirm none lost styling (no unstyled text, no missing borders, no default radius); `node scripts/demo-smoke.mjs` passes.

- [ ] 43. Banned items search, line counts and unused code
  - Goal: design.md 13 checks 1 to 19 return zero matches, and no dead code or unused package remains.
  - Run every command in design.md 13 from the repo root, fix each match in the component (never by editing `src/components/ui/`), and rerun until all print nothing. Check 18 (UI files over 150 lines) prints nothing. In check 19 the two counts agree per file.
  - For each dependency in `package.json`, search for an import (`rg -n "from \"<name>|require\(\"<name>" src scripts`) and remove packages with no importer (none expected). Delete unused files found by `rg` for each export of each changed file.
  - Files: whatever the searches name; `package.json`, `package-lock.json` only if a package is removed.
  - Satisfies: R19.1 to R19.3, R20.3, R20.5; design.md 13.
  - Content check: `capture.mjs compare` for all pages.
  - Verify: gates; `npm test`; save the command list and outputs for task 48; demo server: `node scripts/demo-smoke.mjs` passes.

- [ ] 44. Polish: viewport and theme matrix
  - Goal: POLISH PASS items 1 to 6.
  - Open every page of the smoke list in Light, Dark and System at 1440, 1280 and 768px. Check for overflow, misalignment, uneven card heights in a row and orphan elements.
  - Switch the theme on each page; check charts, tooltips and the donut first (`/c/tirupati-automart/charts`, `segment`, `book-to-bank`, `cash-conversion`), then everything else; nothing keeps the old colors. Hard refresh each theme on three pages and confirm no flash.
  - Check text contrast in both themes against design.md 2.6 (DevTools contrast picker on labels, table headers, axis ticks, delta text, sidebar group names).
  - Check that every gap is on the 4px scale (DevTools box model on cards, page padding, header, KPI strip, tables).
  - Check that every number is tabular and right-aligned in tables.
  - Check accent usage: `rg -n "brand" src/app src/components/layout src/components/dashboard src/components/shared src/lib src/hooks src/types` hits only the active nav bar, active tab underline, `--ring`, `--sidebar-primary`, `--sidebar-ring` and `--chart-1`; on screen the blue appears only on those, chart-1 series and focus rings.
  - Fix each problem and write each fix into the list for task 48.
  - Files: whatever the fixes need.
  - Satisfies: R1.6, R1.7, R5, R13, R17.3, R17.6; brief POLISH PASS 1 to 6.
  - Content check: `capture.mjs compare` for all pages.
  - Verify: gates; `npm test` if `src/lib/` changed; the matrix above with no open problem.

- [ ] 45. Polish: states, break and state-machine
  - Goal: POLISH PASS item 7 and the `break` and `state-machine` part of item 8.
  - Read `C:\Users\nihal\.kiro\skills\break\SKILL.md` and the `state-machine` skill. Create a throwaway harness page `src/app/(dashboard)/state-harness/page.tsx` (with any helper files beside it) that renders KpiCell, DataTable and TrendChart in loading, empty, error, long text and many rows states, plus the skeleton, empty and error state of every card type (Card, ChartCard, StatementTable card, DataTable card, KpiStrip) with mock props.
  - Check each state in both themes; fix each problem in the real component. Then delete the harness folder and confirm `rg -n "state-harness" src` is empty.
  - Files: create and then delete `src/app/(dashboard)/state-harness/`; modify the components that need fixes.
  - Satisfies: R16.1, R16.2, R16.4; brief SKILLS 5, POLISH PASS 7 and 8.
  - Content check: no real page text changes (`capture.mjs compare` for all pages).
  - Verify: gates (after the harness is deleted); demo server: `http://localhost:3000/state-harness` during the task; after deletion it returns the not found page; record each fix for task 48.

- [ ] 46. Polish: interface-review on the company report pages
  - Goal: POLISH PASS item 8 (interface-review) for dashboard, gp-dashboard, history, compare, pnl, segment, book-to-bank, cash-conversion, budget-vs-actual, debtors, creditors, charts, reports, queries.
  - Read `C:\Users\nihal\.kiro\skills\interface-review\SKILL.md`; run it on each page; fix every high and medium finding; list low findings as open questions. The brief wins over any finding that conflicts with it; log those conflicts.
  - Files: whatever the fixes need.
  - Satisfies: R17.7; brief SKILLS 4.
  - Content check: `capture.mjs compare` for the pages above.
  - Verify: gates; `npm test` if `src/lib/` changed; rerun interface-review on each fixed page and confirm no high or medium finding remains.

- [ ] 47. Polish: interface-review on the firm and data pages
  - Goal: the same for companies, review, upload, queries, reports, users, audit, profile, login, and the staff pages master-data, upload, mapping, inputs, budget, template, branches.
  - Same method as task 46.
  - Files: whatever the fixes need.
  - Satisfies: R17.7; brief SKILLS 4.
  - Content check: `capture.mjs compare` for the pages above.
  - Verify: gates; `npm test` if `src/lib/` changed; no high or medium finding remains.

- [ ] 48. Final gates and report
  - Goal: DONE WHEN items 1 to 7 proven and reported.
  - Rerun the gates, `npm test`, `node scripts/demo-smoke.mjs`, every design.md 13 search, and `capture.mjs compare` for all pages; all clean.
  - Write `.kiro/specs/premium-dashboard-revamp/report.md`: the list of changed, created, moved and deleted files (`git diff --stat` and `git status --short` against the commit before task 1), the list of fixes from tasks 43 to 47, the search commands with their (empty) outputs, the packages added with versions, and the open questions (low interface-review findings, skill conflicts found during polish, anything not verifiable such as manual assistive technology testing and the login page check method).
  - Delete `$env:TEMP\especia-baseline\`.
  - Files: create `.kiro/specs/premium-dashboard-revamp/report.md`.
  - Satisfies: R19.2, R22; brief DONE WHEN.
  - Verify: gates; `npm test`; `rg -n --pcre2 '[\x{2013}\x{2014}]' src .kiro/specs/premium-dashboard-revamp` prints nothing.

Checkpoint 10: read `report.md`, then walk the app in each theme.

## Summary

| Task | Title | Phase | Estimate (min) | Parallel-safe | Depends on |
|------|-------|-------|----------------|---------------|------------|
| 1 | Content baseline and parity tests | 0 | 45 | no | none |
| 2 | Geist fonts | 1 | 30 | no | 1 |
| 3 | shadcn init and `cn` | 1 | 45 | no | 2 |
| 4 | Tokens for both themes | 1 | 90 | no | 3 |
| 5 | Theme provider and toggle | 1 | 60 | no | 4 |
| 6 | Nav icons, types and shell helpers | 2 | 60 | no | 5 |
| 7 | AppShell, Sidebar and TopBar | 2 | 90 | no | 6 |
| 8 | Top bar actions | 2 | 75 | no | 7 |
| 9 | PageHeader, PeriodSelector, ReportTabs | 2 | 90 | no | 8 |
| 10 | Card, states and boundaries | 3 | 75 | no | 9 |
| 11 | Filters and pickers | 3 | 75 | no | 10 |
| 12 | Avatar, chooser, helpers, primitives | 3 | 75 | no | 11 |
| 13 | KPI strip and dashboard KPIs | 4 | 90 | no | 12 |
| 14 | Chart foundation | 5 | 75 | no | 13 |
| 15 | TrendChart and Monthly trend | 5 | 75 | no | 14 |
| 16 | StatementTable and dashboard summaries | 6 | 90 | no | 15 |
| 17 | DataTable and ageing | 6 | 90 | no | 16 |
| 18 | BreakdownDonut, RankedBarChart, expense card | 7 | 75 | no | 17 |
| 19 | Remaining Charts cards | 7 | 75 | no | 18 |
| 20 | Book to bank | 7 | 75 | yes (with 21) | 19 |
| 21 | Cash conversion | 7 | 75 | yes (with 20) | 19 |
| 22 | Segment P&L, retire chart helpers | 7 | 75 | no | 19, 20, 21 |
| 23 | P&L | 8 | 90 | yes | 22 |
| 24 | Budget vs actual | 8 | 60 | yes | 22 |
| 25 | Compare and History | 8 | 60 | yes | 22 |
| 26 | Company Reports and queries | 8 | 60 | yes | 22 |
| 27 | GP dashboard viewer | 8 | 30 | yes | 22 |
| 28 | Company card split | 8 | 90 | yes (not with 29) | 22 |
| 29 | New company form and companies page | 8 | 60 | yes (not with 28) | 28 |
| 30 | Users on DataTable | 8 | 90 | yes | 22 |
| 31 | Audit log on DataTable | 8 | 75 | yes | 22 |
| 32 | Review, Profile, firm choosers | 8 | 60 | yes | 22 |
| 33 | Login | 8 | 45 | yes | 22 |
| 34 | Master data | 8 | 90 | yes | 22 |
| 35 | Branches editor split | 8 | 90 | yes | 22 |
| 36 | Template editor split | 8 | 90 | yes | 22 |
| 37 | Mapping | 8 | 75 | yes | 22 |
| 38 | Data upload | 8 | 60 | yes | 22 |
| 39 | Inputs, Budget, data layout | 8 | 60 | yes | 22 |
| 40 | Dash cleanup | 9 | 75 | no | 23 to 39 |
| 41 | Sentence case | 9 | 75 | no | 40 |
| 42 | Retire old styles, resets | 10 | 75 | no | 41 |
| 43 | Banned search, line counts, unused code | 10 | 60 | no | 42 |
| 44 | Viewport and theme matrix | 10 | 90 | no | 43 |
| 45 | States, break, state-machine | 10 | 90 | no | 44 |
| 46 | interface-review, report pages | 10 | 90 | no | 45 |
| 47 | interface-review, firm and data pages | 10 | 90 | no | 46 |
| 48 | Final gates and report | 10 | 45 | no | 47 |

Total: 48 tasks in 11 phases (0 to 10), about 3,480 minutes, roughly 58 hours of agent time run one after another. Tasks 20 and 21 can run together, and the 17 page tasks in phase 8 (23 to 39) can run in parallel except that 29 follows 28; with phase 8 run in parallel the elapsed time drops by about 17 hours to roughly 41 hours. Every other task runs alone because it edits `globals.css`, `src/lib/nav.ts`, `src/lib/report-tabs.ts`, a layout, `components.json` or `package.json`, or many files at once.
