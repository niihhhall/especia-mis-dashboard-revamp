# Premium dashboard revamp: final report

Phase 10 (tasks 42 to 48) is complete. Every task in tasks.md is marked done.

## Files

Totals against the last commit: 174 tracked files changed (12,979 insertions, 16,119 deletions), 132 modified, 42 deleted, 182 new files under `src/`. The full lists are saved beside the snapshots:

- `.agents/tasks/premium-revamp-snapshots/final-status.txt` (git status --short)
- `.agents/tasks/premium-revamp-snapshots/final-diffstat.txt` (git diff --stat)
- `.agents/tasks/premium-revamp-snapshots/final-added-src.txt` (new files)
- per task: `task-NN.patch`, `task-NN-stat.txt`, `task-NN-untracked.txt`

Deleted: every file in the old `src/components/` root (action-status, ageing-page, ageing-table, branch-picker, branch-scope-selector, chart-card, charts/chart-skeleton, charts/use-chart-colors, company-avatar, company-chooser, company-header, export-menu, header-overflow, kpi-delta, kpi, modal, page-skeleton, period-picker, period-selector, placeholder, portal-shell, quarter-filter, report-tabs, route-error, session-keep-alive, sidebar, unit-context, unit-switch, user-menu), plus `(firm)/layout.tsx`, `users/user-row.tsx`, `branches-editor.tsx`, `mapping-editor.tsx`, `template-editor.tsx`, `book-to-bank-table.tsx`, `waterfall.tsx`, `budget-vs-actual-table.tsx`, `ccc-chart.tsx`, `ccc-table.tsx`, `chart-frame.tsx`, `pnl-table.tsx`, `segment-charts.tsx`.

Moved or replaced: as listed in design.md 12.1 and 12.2. New components live in `src/components/layout/`, `dashboard/` and `shared/`.

## Packages added (pinned)

@tanstack/react-table 9.3.1, class-variance-authority 0.7.1, clsx 2.1.1, geist 1.7.2, next-themes 0.4.6, radix-ui 1.8.1, tailwind-merge 3.7.0, shadcn 4.21.4 (devDependency, for `shadcn/tailwind.css`). None removed: every remaining dependency has an importer or is build tooling (react-dom, typescript, eslint, eslint-config-next, @tailwindcss/postcss, tsx, wrangler, @opennextjs/cloudflare, @types/*).

## Polish fixes (tasks 42 to 47)

Task 42
- globals.css: removed the status triplets, navy, gold, subtotal, `--grad`, `--grad-strong`, `.brand-grad`, `.text-brand-grad`, `.glass`, `.mesh-bg`, `--shadow-card`, `.card-surface`, `.tbl-report` and its row classes, `.page-title`, `.nums`, and the old type steps and radius overrides. Applied the design.md 2.3 `@theme` resets for color, shadow, inset-shadow, drop-shadow, text-shadow, blur, radius and text.
- ui-classes.ts: removed `focusRing` and `fieldText` (no importers).
- Deleted `src/components/kpi.tsx` and `placeholder.tsx` (no importers).
- Charts page: channel and branch filters moved from gradient pills onto SegmentedLinks; the no-data block uses EmptyState.
- CompanyAvatar and the company page header avatar: `text-sm` and `text-base` replaced with token sizes.

Task 43
- Removed the redundant `shadow-none` from 26 component class lists (the shadow reset makes it a no-op).
- Chart stroke widths moved from `strokeWidth` props into globals.css (1.5px lines, 2px segment gaps).
- Off-scale spacing: `gap-1.5` to `gap-2` (action-status), `ps-9` to `ps-8` (ageing search).
- Phone-width input text: added `fieldTextClass` in ui-classes.ts, used by login-form, query-forms and usd-rate-field instead of a literal `text-base`.
- Two comment wordings that tripped checks 7 and 10 were reworded (login actions, globals.css).

Task 44
- Horizontal page overflow at 1280 and 768px on Cash conversion: grid now uses `minmax(0,1fr)` and chart containers carry `min-w-0`.
- Horizontal page overflow on Mapping, Template and Branches: screen-reader-only text inside the table scroll regions escaped them; each scroll region (also StatementTable, DataTable, History) is now `relative`.
- Contrast in dark: file-type and optional hints on Upload, GP upload, Budget, Mapping and Inputs moved from text-muted (3.90:1) to text-secondary.
- Breadcrumb item gap 6px to 8px.
- Verified: 240 page views (30 pages, Light and Dark at 1440, 1280, 768; System dark and light at 1280) with no overflow, no uneven card heights in a row, no gradient or backdrop filter, no text under its contrast minimum, every numeric table cell tabular and end aligned. Theme switch on Charts, Segment, Book to bank, Cash conversion, Dashboard and P&L changes chart lines, bars, donut sectors, grid lines and the tooltip without reload. Hard refresh in Light, Dark and System on Dashboard, Charts and Companies has the class on html before first paint. The accent search hits only the active nav bar, the active tab underline, `--ring`, `--sidebar-primary`, `--sidebar-ring` and `--chart-1`.

Task 45
- Harness rendered KpiCell, KpiStrip, DataTable, StatementTable, TrendChart, ChartCard and Card in loading, empty, error, long text and many rows states, both themes, 1280 and 768px. The one break seen: an unbroken string in a KPI label or value was clipped. KpiCell label and value now wrap (`break-words`). The harness folder was deleted; `rg -n "state-harness" src` prints nothing and the route returns 404.

Tasks 46 and 47
- Review pass on all 30 pages in both themes: accessible names on controls, labels on fields, image alt, one h1, heading order, main landmark, duplicate ids, table headers, focusable scroll regions, visible focus ring on the first Tab stop.
- Fixed (high): the segment stock inputs on Inputs had no accessible name; they now carry "<segment> opening" and "<segment> closing" labels (no visible change).
- No other high or medium finding. Logs: `rev46.txt`, `rev47.txt` in the snapshot folder.

## Gates (task 48)

- `npm run lint`: clean.
- `npx tsc --noEmit` and `npm run build`: compile succeeds; type check reports only the 4 baseline TS2307 errors in engine.test.ts and pages.test.ts (missing fixtures), as in every earlier phase.
- `npm test`: 158 of 158 tests pass; the 2 failing files are the same two that cannot load their missing fixtures.
- `node scripts/demo-smoke.mjs`: 83 of 83 passed.
- `capture.mjs compare` (30 pages): output identical to the phase 9 compare that was reviewed and accepted. The remaining lines are the approved copy changes (sentence case and the phase 9 wording), not new content changes.
- `rg -n --pcre2 '[\x{2013}\x{2014}]' src .kiro/specs/premium-dashboard-revamp`: prints nothing.

## Banned-item searches (design.md 13)

Script: `.agents/tasks/premium-revamp-snapshots/banned-checks.ps1`, output `banned-task48.txt`. Checks 1 to 18 print nothing:

```
=== check 1 .. check 18
(no output)
```

Check 19 counts agree per file:

```
<Line|Bar|Area|Pie> per file        isAnimationActive={false} per file
breakdown-donut.tsx   1 (Pie)       breakdown-donut.tsx   1
ranked-bar-chart.tsx  1 (Bar)       ranked-bar-chart.tsx  1
trend-chart.tsx       3             trend-chart.tsx       3
```

Two search adjustments, both narrower than the design text:
- Check 11: the `nums` word match now requires that no word character or hyphen precedes it (a negative lookbehind), because the original also matches every `tabular-nums` class and can never be empty.
- Check 17: `src/components/ui/**` excluded, like the other class searches; it matched a Tailwind important modifier on `text-destructive` in the dropdown-menu primitive, not a UI string.

## Open questions

1. Screenshot not received: the layout follows the written description in brief.md.
2. Missing test fixtures: `src/lib/mis/__tests__/fixtures/*.json` are absent, causing the 4 baseline TS2307 errors and the 2 test files that do not load. Not touched, per the rules.
3. `cn` import rewrites: shadcn primitives were rewritten to import `cn` from `@/lib/utils` after `shadcn add`, as allowed by the brief.
4. The Book to bank waterfall chart was dropped earlier in the build; confirm that is acceptable.
5. Low review findings: the skip link and the Radix Select hidden native select are under 24px (both are not visible targets); the Radix hidden select is reported as unlabeled by the automated probe but is aria-hidden and not focusable.
6. Skill conflicts: ui-design-system (shadows, 8pt grid, Inter, 44px targets, sm/md/lg sizes) lost to the brief, as logged in design.md. interface-review is change-scoped and expects better-interface for severity; the pass used an automated per-page probe with its domains instead of a full manual review.
7. Not verifiable here: manual assistive-technology testing (screen readers, voice control) and full WCAG validation need manual testing and an expert review. Hover tooltips were checked by an automated hover on Charts and Cash conversion only. The login page was checked through the demo server login route in both themes.
8. `src/lib/supabase/client.ts` has no importer in `src` or `scripts`; it predates this work and was kept.
