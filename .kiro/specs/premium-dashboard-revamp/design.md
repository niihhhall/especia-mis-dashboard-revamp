# Premium dashboard revamp: design

## 1. Overview

The redesign replaces the UI layer of the Especia MIS dashboard with a flat, single-accent design system built on shadcn/ui (Radix, `new-york` style), Tailwind CSS v4 tokens, next-themes and the Geist fonts. Content does not change: every route, nav section, item, label word, order and visibility rule, every metric, column, chart series and data field stays. What changes is the visual layer (tokens, type, icons, surfaces), the arrangement (one shell in `(dashboard)/layout.tsx`, page headers, KPI strips, cards, underline tabs) and the file structure (one component per file, at most 150 lines, components receive props).

Locked technology stack: Next.js 16.3.0 App Router, React 19.2.8, TypeScript 5 strict, Tailwind CSS 4 (CSS-first, `@theme`), shadcn/ui CLI 4.21.4 with style `new-york` on the `radix-ui` package, Recharts 3.10.1 through the shadcn Chart component, TanStack Table 9.3.1, lucide-react (installed 1.32.0), next-themes 0.4.6, geist 1.7.2. Vitest for unit tests. No other UI library, icon set, font or animation package is added.

Reference fetches: shadcn docs were read from the source MDX in github.com/shadcn-ui/ui (`apps/v4/content/docs`: Next install, dark mode, theming, components.json, Tailwind v4, Sidebar, Chart, Tabs, ToggleGroup, Data table, Dropdown menu) and from the registry (`ui.shadcn.com/r/styles`). The ui.shadcn.com HTML pages were not fetched; the same docs were read from source. next-shadcn-dashboard was read (root layout, `(dashboard-layout)/layout.tsx`, `globals.css`, `components.json`, ThemeProvider, AppSidebar, DataTable). The inspiration site returned its server-rendered shell only (sidebar 238px, 12px uppercase group labels, skeleton blocks); its client-rendered panels were taken from the brief's screenshot description. No fetch failed outright.

## 2. Tokens

### 2.1 Brief tokens (source tier)

Defined twice in `src/app/globals.css`: light on `:root`, dark on `.dark`. Values are the brief's, except the three approved contrast fixes (RQ-1 and RQ-2, see 2.6): light `positive` is `#15803d`, `chart-3` is `#949499` light and `#606068` dark, and the added greys light `chart-6` and dark `chart-5` moved so they stay distinct from the new chart-3. shadcn already owns the name `--accent` (hover surfaces), so the brief's accent is stored as `--brand`.

| Variable | Light (`:root`) | Dark (`.dark`) | Role |
|----------|-----------------|----------------|------|
| `--background` | `#fafafa` | `#0a0a0b` | Page |
| `--surface` | `#ffffff` | `#111113` | Cards, sidebar, top bar |
| `--surface-raised` | `#f4f4f5` | `#151518` | Menus, sheets, row hover, table header |
| `--surface-hover` | `rgb(0 0 0 / 0.05)` | `rgb(255 255 255 / 0.05)` | Added: hover overlay inside menus and on ghost controls, works on any surface |
| `--border` | `rgb(0 0 0 / 0.08)` | `rgb(255 255 255 / 0.08)` | Card, table and divider borders |
| `--border-strong` | `rgb(0 0 0 / 0.16)` | `rgb(255 255 255 / 0.16)` | Hover and focus borders, subtotal and total rules |
| `--text-primary` | `#09090b` | `#fafafa` | Values, titles, body |
| `--text-secondary` | `#52525b` | `#a1a1aa` | Labels, subtitles, axis text, default icons |
| `--text-muted` | `#71717a` | `#71717a` | Placeholders, disabled text, decorative glyphs only (see 2.7) |
| `--brand` | `#2563eb` | `#3b82f6` | Brief "accent": active nav bar, active tab underline, focus ring, chart-1 |
| `--positive` | `#15803d` (RQ-1, brief `#16a34a`) | `#22c55e` | Delta text, favourable bars (R9.6) |
| `--negative` | `#dc2626` | `#ef4444` | Delta text, adverse bars (R9.6) |
| `--chart-1` | `#2563eb` | `#3b82f6` | First series (accent) |
| `--chart-2` | `#71717a` | `#a1a1aa` | Second series |
| `--chart-3` | `#949499` (RQ-2, brief `#a1a1aa`) | `#606068` (RQ-2, brief `#52525b`) | Third series |
| `--chart-4` | `#3f3f46` | `#e4e4e7` | Added neutral step (OQ-17) |
| `--chart-5` | `#18181b` | `#7f7f88` (moved from `#71717a`, RQ-2) | Added neutral step |
| `--chart-6` | `#5a5a62` (moved from `#8e8e96`, RQ-2) | `#c4c4c9` | Added neutral step |
| `--grid` | `rgb(0 0 0 / 0.06)` | `rgb(255 255 255 / 0.06)` | Chart grid lines |
| `--radius` | `0.5rem` | same | shadcn base radius (8px) |
| `color-scheme` | `light` | `dark` | Native controls and scrollbars |

chart-4 to chart-6 are ordered so neighbouring series indices differ most in lightness (light: 4 dark, 5 darkest, 6 mid; dark: 4 lightest, 5 mid, 6 light). Measured against the card surface: light 10.44, 17.72 and 6.83 to 1; dark 14.86, 4.75 and 10.86 to 1, all at least 3:1. Some grey pairs are close (light chart-2 and chart-6 1.41:1, dark chart-4 and chart-6 1.37:1, dark chart-2 and chart-5 1.55:1), so identity never rests on color alone: line series 4 to 6 use a dashed stroke (`strokeDasharray="4 3"`), bar and donut segments are separated by a 2px `var(--surface)` stroke, every chart has a legend in series order and a tooltip.

### 2.2 shadcn variable mapping

| shadcn variable | Points to | Note |
|-----------------|-----------|------|
| `--foreground` | `var(--text-primary)` | |
| `--card`, `--card-foreground` | `var(--surface)`, `var(--text-primary)` | |
| `--popover`, `--popover-foreground` | `var(--surface-raised)`, `var(--text-primary)` | Menus, select content, tooltips, chart tooltip |
| `--primary`, `--primary-foreground` | `var(--text-primary)`, `var(--surface)` | The one filled button per view is neutral ink, never blue |
| `--secondary`, `--secondary-foreground` | `var(--surface-raised)`, `var(--text-primary)` | |
| `--muted`, `--muted-foreground` | `var(--surface-raised)`, `var(--text-secondary)` | shadcn uses muted-foreground for descriptions, placeholders and axis text, so it maps to text-secondary for contrast |
| `--accent`, `--accent-foreground` | `var(--surface-hover)`, `var(--text-primary)` | shadcn hover and highlighted menu items |
| `--destructive` | `var(--negative)` | |
| `--border` | brief value (same name) | |
| `--input` | `var(--border)` | Hover and focus raise it to border-strong |
| `--ring` | `var(--brand)` | |
| `--chart-1` to `--chart-6` | brief values (same names) | |
| `--sidebar` | `var(--surface)` | |
| `--sidebar-foreground` | `var(--text-secondary)` | Default item text and icon |
| `--sidebar-primary`, `--sidebar-primary-foreground` | `var(--brand)`, `var(--surface)` | Only the active bar uses it |
| `--sidebar-accent`, `--sidebar-accent-foreground` | `var(--surface-raised)`, `var(--text-primary)` | Active and hovered items |
| `--sidebar-border`, `--sidebar-ring` | `var(--border)`, `var(--brand)` | |

### 2.3 Tailwind mapping

`@custom-variant dark (&:where(.dark, .dark *));` sits at the top of globals.css. Only globals.css may use it; components never use `dark:`.

Two theme blocks:

```css
@theme {
  /* Remove defaults so banned values cannot be written. Applied in the cleanup task, after every page is migrated (risk 4). */
  --color-*: initial;
  --color-black: #000;   /* kept only for shadcn overlay classes (bg-black/50) */
  --color-white: #fff;   /* kept only for shadcn destructive button text */
  --shadow-*: initial;
  --inset-shadow-*: initial;
  --drop-shadow-*: initial;
  --text-shadow-*: initial;
  --blur-*: initial;
  --radius-*: initial;
  --radius-xs: 6px; --radius-sm: 6px; --radius-md: 6px;
  --radius-lg: 8px; --radius-xl: 8px; --radius-2xl: 8px; --radius-3xl: 8px; --radius-4xl: 8px;
  --text-*: initial;
  --text-title: 1.25rem;  --text-title--line-height: 1.2;  --text-title--letter-spacing: -0.01em; --text-title--font-weight: 600;
  --text-card-title: 0.875rem; --text-card-title--line-height: 1.5; --text-card-title--font-weight: 500;
  --text-body: 0.8125rem; --text-body--line-height: 1.5;
  --text-label: 0.6875rem; --text-label--line-height: 1.5; --text-label--font-weight: 500;
  --text-kpi: 1.875rem;   --text-kpi--line-height: 1.2;   --text-kpi--letter-spacing: -0.02em; --text-kpi--font-weight: 600;
  --text-base: 1rem;      --text-base--line-height: 1.5;  /* phone-width inputs only (OQ-24) */
  --default-transition-duration: 150ms;
  --default-transition-timing-function: ease-out;
  --container-page: 87.5rem;     /* 1400px content cap, 1800px in meeting mode via --container-meeting */
  --container-meeting: 112.5rem;
}

@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-surface-hover: var(--surface-hover);
  --color-border-strong: var(--border-strong);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-brand: var(--brand);
  --color-positive: var(--positive);
  --color-negative: var(--negative);
  --color-grid: var(--grid);
  /* plus every shadcn pair from 2.2: card, popover, primary, secondary, muted, accent, destructive,
     border, input, ring, chart-1..6, sidebar* as --color-<name>: var(--<name>) */
}
```

Utilities therefore read `bg-surface`, `bg-surface-raised`, `text-text-primary`, `text-text-secondary`, `border-border`, `border-border-strong`, `bg-brand`, `text-positive`, `text-negative`, `text-title`, `text-card-title`, `text-body`, `text-label`, `text-kpi`. The doubled `text-text-*` prefix is accepted (better-colors).

`src/lib/utils.ts` (created by the shadcn CLI, not a ui primitive) uses `extendTailwindMerge` with `theme: { text: ["title", "card-title", "body", "label", "kpi", "base"] }`. Without it, tailwind-merge reads `text-label` as a color and drops `text-text-secondary` from the same class list.

### 2.4 Type, spacing, shape, motion

| Item | Value | Where |
|------|-------|-------|
| Page title | `text-title` (20px, 600, -0.01em, 1.2) | PageHeader `h1` |
| Card title | `text-card-title` (14px, 500) | Card header `h2` |
| Body, table | `text-body` (13px, 400, 1.5) | `body` default, tables, controls |
| Label | `text-label` (11px, 500) | KPI labels, table headers, captions, sidebar group names (with `uppercase tracking-[0.06em]`, the only uppercase use) |
| KPI value | `text-kpi` (30px, 600, -0.02em, 1.2) | KpiCell value |
| Numbers | `tabular-nums` everywhere; `font-mono tabular-nums` in table cells only | `.num` cell rule in globals.css |
| Spacing scale | 4, 8, 12, 16, 20, 24, 32, 48 (`1 2 3 4 5 6 8 12` in Tailwind units) | No other padding, margin or gap values in our components |
| Card padding, card gap, page padding | 20px (`p-5`), 24px (`gap-6`), 32px sides and bottom with 24px at the top so the page header sits 24px under the top bar (`px-8 pt-6 pb-8` from `md`, `px-4` below) | Card, page stacks, `main` |
| Within a group, between groups | 8px, 24px | Sidebar groups, form fields, header rows |
| Radius | 8px cards, dialogs, sheets (`rounded-lg` and up); 6px controls, menus, tooltips (`rounded-md` and down); `rounded-full` only for avatars, legend dots, donut | Theme radius scale above |
| Control height | 32px: `Button size="sm"` or `size="icon-sm"`, `SelectTrigger size="sm"`, `ToggleGroup size="sm"`, `Input className="h-8"`, native fields via `fieldClass` | Every control |
| Fixed heights | top bar 56px (`h-14`), nav item 36px (`h-9`), list table row 52px (`h-13`), statement row 36px | |
| Motion | 150ms ease-out on `color, background-color, border-color` only | Global rule below |
| Shadows | none | Theme reset plus ring reset below |

Global rules in globals.css (unlayered, so they beat the `@layer utilities` classes that shadcn primitives ship):

```css
*, ::before, ::after {
  transition-property: color, background-color, border-color !important;
  --tw-ring-shadow: 0 0 #0000 !important;
  --tw-inset-ring-shadow: 0 0 #0000 !important;
  --tw-ring-offset-shadow: 0 0 #0000 !important;
}
:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
.lucide { stroke-width: 1.5; }
.lucide :is(path, line, circle, rect, polyline, polygon, ellipse) { vector-effect: non-scaling-stroke; }
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after { transition-duration: 0s !important; animation: none !important; }
}
html { scroll-padding-block-start: 3.5rem; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
html.meeting { font-size: 115%; }
body { background: var(--background); color: var(--text-primary); font-family: var(--font-sans); font-size: var(--text-body); line-height: 1.5; }
input[type="checkbox"], input[type="radio"] { accent-color: var(--text-primary); }
```

The ring reset clears the box-shadow rings that shadcn primitives draw on focus; the `:focus-visible` outline replaces them with the brief's 2px accent ring and 2px offset. next-themes' `disableTransitionOnChange` injects its own unlayered `transition: none` rule with the important flag later in the document, so at equal specificity it still wins during a theme switch. `tw-animate-css` is not installed, so the primitives' `animate-in` and `zoom-in` classes do nothing and menus open instantly. The skeleton keeps Tailwind's default `animate-pulse` (OQ-29); the theme's `--animate-*` namespace is left at its defaults and the banned-items search keeps every other `animate-` class out.

Print: `@media print` repoints the `.dark` tokens to the light values, hides the sidebar, top bar, tabs and controls (`print:hidden`) and drops page padding, as today.

### 2.5 Token naming notes

- No component reads the theme. Every color is a utility or `var(--token)`.
- `--brand` is the only blue. A search for `brand` must hit only: the active nav bar, the active tab underline, `--ring`, `--sidebar-primary`, `--sidebar-ring` and `--chart-1`.
- Old tokens and classes are removed in the cleanup task: `--grad`, `--grad-strong`, `.brand-grad`, `.text-brand-grad`, `.glass`, `.mesh-bg`, `--shadow-card`, `.card-surface`, `.tbl-report` and its row classes, `.page-title`, `.nums`, navy, gold, subtotal and the status `success/warning/danger/info` triplets.

### 2.6 Contrast table

WCAG 2 ratios, computed from the token values (sRGB relative luminance).

| Foreground | Light on background / surface / raised | Dark on background / surface / raised | Requirement |
|------------|----------------------------------------|---------------------------------------|-------------|
| text-primary | 19.06 / 19.90 / 18.10 | 18.96 / 18.07 / 17.46 | 4.5, pass |
| text-secondary | 7.41 / 7.73 / 7.03 | 7.72 / 7.36 / 7.11 | 4.5, pass |
| text-muted | 4.63 / 4.83 / 4.40 | 4.09 / 3.90 / 3.77 | 4.5: fails on light raised and on every dark surface |
| brand (accent) | 4.95 / 5.17 / 4.70 | 5.38 / 5.13 / 4.95 | 3:1 for focus ring and bars, pass; never used as text |
| positive | 4.81 / 5.02 / 4.56 (`#15803d`, RQ-1) | 8.69 / 8.28 / 8.00 | 4.5 for 13px delta text, pass (brief `#16a34a` measured 3.16 / 3.30 / 3.00) |
| negative | 4.63 / 4.83 / 4.39 | 5.26 / 5.01 / 4.84 | 4.5: light fails on raised only |
| border 8% / border-strong 16% on surface | 1.19 / 1.45 | 1.22 / 1.59 | Decorative card edges need none; control boundaries fall short of 3:1, accepted with the mitigations below (RQ-2) |
| chart-3 on background / surface / raised | 2.89 / 3.02 / 2.75 (`#949499`) | 3.18 / 3.03 / 2.92 (`#606068`) | 3:1 for marks on the card surface, where every chart sits: pass (brief values measured 2.56 light and 2.44 dark, RQ-2) |

chart-3 against its neighbours (lightness contrast; chart-1 also differs by hue):

| Pair | Light | Dark |
|------|-------|------|
| chart-3 and chart-2 | 1.60 | 2.43 |
| chart-3 and chart-4 | 3.46 | 4.91 |
| chart-3 and chart-5 | 5.87 | 1.57 (chart-5 moved to `#7f7f88`; it was 1.29 at `#71717a`) |
| chart-3 and chart-6 | 2.26 (chart-6 moved to `#5a5a62`; it was 1.08 at `#8e8e96`) | 3.59 |
| chart-3 and chart-1 | 1.71 | 1.69 |

The new chart-3 sits between chart-2 and the surface in both themes (light: lighter than chart-2; dark: darker than chart-2). Moving it to 3:1 brought it next to an added grey in each theme (light chart-6 at 1.08:1, dark chart-5 at 1.29:1), so those two added steps moved as well; both are design values from OQ-17, not brief values, and both still meet 3:1 on the surface. The closest remaining grey pair to chart-3 is dark chart-5 at 1.57:1; series 5 draws dashed and every chart has a legend and tooltip.

Handling:

| Failure | Rule |
|---------|------|
| text-muted | Only for input placeholders (shadcn uses muted-foreground there, which is text-secondary anyway), disabled text and decorative glyphs such as breadcrumb separators. Every readable label, caption, axis tick, table header and sidebar group name uses text-secondary |
| positive, light | Resolved (RQ-1): light positive is `#15803d`, 5.02:1 on surface. Delta text still sits on `surface` (KPI strip), uses weight 500, and is always followed by the word "favourable" or "adverse" in text-secondary, so meaning never depends on the colored text |
| negative, light raised | Delta text never renders on surface-raised; chart tooltips show amounts in text-primary only |
| Control borders | Inputs and selects always have a visible text label; hover and focus raise the border to border-strong and the focus ring adds a 5:1 outline |
| chart-3 | Resolved (RQ-2): adjusted to 3:1 on the surface. Series 3 also always appears in the legend and tooltip, and every chart's data is also in a table or CSV download |
| Large values | KPI values are 30px semibold text-primary, 17:1 or more |

## 3. Theme setup

| Piece | Design |
|-------|--------|
| Provider | `src/components/layout/theme-provider.tsx`, a client wrapper around next-themes `ThemeProvider` (shadcn pattern) |
| Root layout | `src/app/layout.tsx`: `<html lang="en" suppressHydrationWarning className={cn(GeistSans.variable, GeistMono.variable)}>`, `<body>` wraps children in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`. Login and every dashboard page sit under it |
| Persistence | next-themes default: `localStorage["theme"]` holds `light`, `dark` or `system`. If storage is blocked, next-themes keeps the choice in memory for the session and falls back to System; nothing is logged |
| System changes | next-themes listens to `prefers-color-scheme` and swaps the class live while the choice is System |
| No flash | next-themes injects a blocking inline script in `<head>` that sets the class and `color-scheme` before first paint. `suppressHydrationWarning` covers the class mismatch on `<html>`. Server-rendered markup never depends on the theme, so nothing else can mismatch. Verified by a hard refresh in each theme in the polish pass |
| Transitions | `disableTransitionOnChange` suppresses the color transitions during the swap |

ThemeToggle (`src/components/layout/theme-toggle.tsx`, client):

- shadcn `DropdownMenu`. Trigger: `Button variant="ghost" size="icon-sm" aria-label="Change theme"` holding one 16px icon: Sun for Light, Moon for Dark, Monitor for System.
- Hydration: the chosen theme is unknown on the server. `useMounted()` (`useSyncExternalStore` with server snapshot `false`) gates the glyph; before mount the trigger renders an empty 16px box of the same size, so nothing shifts and nothing mismatches.
- Content: three `DropdownMenuCheckboxItem`s, "Light", "Dark" and "System", each with its 16px icon. `checked={theme === value}` makes the primitive draw the Check icon on the active item and expose `aria-checked`. The radio item is not used because its indicator is a filled circle.
- `onCheckedChange` calls `setTheme(value)`. The menu closes; focus returns to the trigger (Radix default).

Charts follow the theme without a reload:

- Every chart uses `ChartContainer` with a `ChartConfig` whose colors are `var(--chart-n)`, `var(--positive)` or `var(--negative)`. Recharts receives `stroke="var(--color-<key>)"` and `fill="var(--color-<key>)"`; the browser resolves them on every class change. Grid `stroke="var(--grid)"`, cursor `var(--surface-hover)`, axis ticks through the container's `muted-foreground` rule (text-secondary). No chart reads computed styles.
- Interim fix for `useChartColors` (first chart task, before every chart is migrated): a `MutationObserver` on `document.documentElement` watching `attributeFilter: ["class"]` re-reads the variables and sets state, and values are read raw (the new tokens are hex and rgb, not HSL triplets). The hook is deleted once the last chart uses `ChartConfig`.
- PNG export cannot rely on `var()`: a serialized SVG loses the document's variables. `src/lib/chart-export.ts` walks the live SVG and its clone in parallel and writes each element's computed `fill`, `stroke` and `font-family` onto the clone as attributes before serializing; legend colors and the canvas title colors come from a probe element's computed color; the canvas font is `getComputedStyle(document.body).fontFamily` so the export uses Geist.

## 4. Fonts

| Item | Design |
|------|--------|
| Package | `geist` 1.7.2: `import { GeistSans } from "geist/font/sans"` and `import { GeistMono } from "geist/font/mono"`. Both wrap `next/font/local`, so the Cloudflare build downloads nothing |
| Variables | The classes `GeistSans.variable` and `GeistMono.variable` on `<html>` define `--font-geist-sans` and `--font-geist-mono`; `@theme inline` maps them to `--font-sans` and `--font-mono` |
| Default | `body` uses `var(--font-sans)`; no other family appears anywhere |
| Mono | Only numeric table cells: the `.num` rule (`font-family: var(--font-mono); font-variant-numeric: tabular-nums; text-align: end`) used by StatementTable and DataTable numeric columns. KPI values, chart ticks and tooltips stay Geist Sans with `tabular-nums` |
| Weights | 400, 500 and 600 only; all ship in the variable files |

## 5. Layout shell

### 5.1 Where the shell lives (OQ-1)

Next 16 layouts do not re-render on navigation and cannot read the pathname or child params (`layout.md`: "Layouts do not rerender", "Accessing child segments"). Client components inside them do re-render, and `usePathname` is the documented way to read the path. The shell is therefore a client tree inside a server layout:

| File | Kind | Responsibility |
|------|------|----------------|
| `src/app/layout.tsx` | server | Fonts, `ThemeProvider`, `<html suppressHydrationWarning>`, metadata |
| `src/app/(dashboard)/layout.tsx` | server | Auth guard (unchanged, fails closed), then `Promise.all([requireUser(), getUnitSettings(), listCompanies(), cookies()])`. Renders `<AppShell profile unit usdRate demoMode defaultSidebarOpen directory>` and `SessionKeepAlive` outside demo mode. `directory` is `listCompanies()` mapped to `{ slug, name }`, an existing cached read; `defaultSidebarOpen` is the shadcn `sidebar_state` cookie (`"false"` means closed, anything else or missing means open) |
| `src/app/(dashboard)/(firm)/layout.tsx` | deleted | It only rendered `PortalShell`. Firm pages now render straight into the shared shell |
| `src/app/(dashboard)/c/[slug]/layout.tsx` | server | Keeps `generateMetadata` and the company guard. Fetches company, periods, selected period and segments exactly as today and renders `<CompanyScope value={{ slug, name, periods, selected, hasSegments }}>{children}</CompanyScope>`. The "Company not available" branch renders an `EmptyState` with the same copy and link, without `CompanyScope` |
| `src/app/(dashboard)/c/[slug]/(data)/layout.tsx` | server | Staff guard, unchanged |

How company context reaches the shell:

1. `ShellCompanyProvider` (inside AppShell) holds `{ company: { slug, name } | null, hasSegments: boolean | null }` in a small store (`useSyncExternalStore`).
2. `CompanyScope` (rendered by `c/[slug]/layout.tsx`) publishes its value to that store in a layout effect and clears it on unmount when the slug still matches. Layout effects run before paint, so a client navigation from `/companies` to `/c/x/...`, or from one company to another, never paints a stale header. `CompanyScope` also provides the same value through React context to the page below it, which is how `PeriodSelector` gets the periods.
3. Hard load (server render): the store starts empty, so the shell resolves the name from `directory` by the slug in the path, which is correct for every active company. An archived company (not in `listCompanies()`) shows its slug for the instant before the layout effect runs, the same fallback the sidebar uses today.
4. Segment P&L visibility on hard load: `CompanyScope` renders `<span hidden data-segments="none" />` when the company has no segments, and globals.css hides `[data-nav-item="segment"]` while `body:has([data-segments="none"])`. First paint is correct with no script; after hydration `navFor(role, slug, hasSegments)` drops the item from the list as today.

### 5.2 AppShell

```text
SidebarProvider (controlled open, style --sidebar-width: 15.5rem, --sidebar-width-icon: 3rem)
  SkipLink -> #main
  AppSidebar                       (not rendered in meeting mode)
  SidebarInset
    TopBar                         (sticky top-0, h-14, border-b, bg-background)
    main#main tabIndex=-1          (mx-auto w-full max-w-page px-8 pt-6 pb-8; px-4 below md; max-w-meeting px-12 in meeting mode)
      DemoBanner                   (demo mode only, one line)
      children                     (page: PageHeader then content)
```

| Concern | Design |
|---------|--------|
| Sidebar open state | Controlled. `wide = useMediaQuery("(min-width: 1024px)")`, server snapshot `true`. Wide: `open = userOpen`, `onOpenChange` updates `userOpen` and writes the `sidebar_state` cookie (`path=/; max-age=604800`, the shadcn default). Narrow (768 to 1023px): `open = narrowOpen`, default `false`, reset to `false` on pathname change, cookie untouched. Below 768px shadcn's own `isMobile` renders the sidebar as a Sheet |
| Width | 248px expanded (`--sidebar-width: 15.5rem`), 48px collapsed to icons (`collapsible="icon"`) |
| Meeting mode | `useMeetingMode` hook moved unchanged from `portal-shell.tsx` (same localStorage key and event, staff only). When on: sidebar and sidebar trigger are not rendered, `html.meeting` scales the root font, content cap widens |
| Units | `UnitProvider` from `unit-context.tsx` wraps the tree with `unit` and `usdRate` |
| Hydration | No theme- or storage-dependent markup on the server: meeting mode server snapshot `false` (as today), media query `true`, theme glyph gated by `useMounted` |

### 5.3 AppSidebar

Built from the shadcn Sidebar parts with `variant="sidebar" collapsible="icon"`; classes are passed through `className`, the primitive file is never edited.

| Region | Content (exactly as today) | Styling |
|--------|---------------------------|---------|
| Header (`SidebarHeader`, h-14) | Flat logo square "E", "Especia", subtitle "Client portal" | Square 32px, `rounded-md`, `bg-surface-raised`, `text-text-primary`, weight 600, no gradient or glow. Name 14px weight 600 text-primary, subtitle `text-label` text-secondary. Collapsed: square only |
| Open company (staff with a company open) | Label "Open company", company name (line-clamp 2), "All companies" link with ChevronLeft to `/companies` | A block inside `SidebarGroup` with 12px padding, 1px border, `rounded-md`, no fill. Label `text-label` text-secondary, name 13px weight 500 text-primary with `title` holding the full name, link 13px text-secondary, hover text-primary. Hidden when collapsed (the breadcrumb still names the company) |
| Nav | `navFor(role, slug, hasSegments)` unchanged. Flat lists: one `SidebarGroup` without a label. Open client: a "Data" group and a "Reports" group, each with `SidebarGroupLabel` | Group label: `text-label uppercase tracking-[0.06em] text-text-secondary`, 24px between groups (`gap-6` on the content). Items in `SidebarMenu` with 4px between items |
| Item | `SidebarMenuButton asChild isActive tooltip={label}` wrapping `<Link href aria-current>` with the item's icon and label; `data-nav-item="segment"` on Segment P&L | `h-9`, 16px icon via `Icon`, label 13px weight 500. Default text-secondary; hover `bg-surface-raised` text-primary; active `bg-surface-raised` text-primary plus a 2px brand bar: `relative before:absolute before:inset-y-2 before:start-0 before:w-0.5 before:bg-brand` (square ends, no radius) shown only when active. Collapsed: the tooltip shows the label |
| Footer (`SidebarFooter`) | `UserMenu` (name or email, role label, Sign out button, hidden in demo mode as today) then "Especia Associates LLP" | Identity 13px weight 500 text-primary and `text-label` text-secondary; Sign out `Button variant="outline" size="sm"`; footer line `text-label` text-secondary; 1px top border |

Active rule (unchanged): `pathname === href || pathname.startsWith(href + "/")`.

Distinct icons (OQ-4); only icons change, every label, href and order stays:

| List | Item (sentence case) | Icon |
|------|----------------------|------|
| Company | My dashboard, GP dashboard, MIS history, Compare months, Reports, Notes & queries, Profile | LayoutDashboard, Monitor, History, GitCompareArrows, FileDown, MessagesSquare, UserRound |
| Firm (admin inserts Users and Audit log after MIS upload) | Companies, Review queue, MIS upload, Users, Audit log, Notes & queries, Reports, Profile | Building2, ClipboardCheck, Upload, UserCog, ScrollText, MessagesSquare, FileDown, UserRound |
| Open client, Data | Master data, Upload, Mapping, Adjustments, Budget, MIS template, Branches | Table2, Upload, Waypoints, SlidersHorizontal, Wallet, Layers, GitBranch |
| Open client, Reports | Dashboard, GP dashboard, P&L detail, Budget vs actual, Segment P&L, Book to bank, Cash conversion, Debtors, Creditors, Charts, Reports, Notes & queries | LayoutDashboard, Monitor, FileText, Target, ChartPie, Landmark, RefreshCw, Users, Truck, ChartColumn, FileDown, MessagesSquare |

All names exist in the installed lucide-react; `BarChart3` (an alias) is replaced by its canonical `ChartColumn`.

### 5.4 TopBar (56px)

| Side | Content | Design |
|------|---------|--------|
| Left | Sidebar toggle | `Button variant="ghost" size="icon-sm" aria-label="Toggle navigation"` with PanelLeft, calls `toggleSidebar()`. Our own button, because the shadcn `SidebarTrigger` hard-codes the title-case text "Toggle Sidebar". Hidden in meeting mode |
| Left | Breadcrumb | shadcn `Breadcrumb`: line 1 is crumb 1 (company name, or "Especia MIS" with no company) as a link to the company dashboard or `/companies`, a ChevronRight separator in text-muted, then crumb 2, the current nav label (`BreadcrumbPage`, text-primary, `aria-current="page"`). Line 2 is the existing subtitle "Management information system" (company open) or "Client portal" (`text-label` text-secondary). Labels come from `breadcrumbFor(pathname, navFor(...), company)` in `src/lib/breadcrumb.ts` (pure, tested). A route with no nav match (for example the root redirect) shows crumb 1 only |
| Right, from `xl` | Unit switch, Download Excel, Print / PDF, Meeting mode, ThemeToggle | 12px between bordered controls, 24px between groups (units, export, meeting, theme). Download Excel and Print / PDF render only with a company open, Meeting mode only for staff, exactly as today |
| Right, below `xl` | Unit switch, "More" menu, ThemeToggle | "More" is a shadcn `DropdownMenu` (Ellipsis icon, visible label "More" from `sm`) holding Download Excel, Print / PDF and Meeting mode with its On state, replacing the popover in `header-overflow.tsx` |
| Print | Selected period label | `hidden print:inline`, as today |

Unit switch: `ToggleGroup type="single" size="sm" variant="outline"` with Lakh, Crore, $ (same titles); deselecting the active item writes `auto`, matching "click the highlighted one again". Items are `aria-disabled` while the refresh runs (as today). With $ active, `UsdRateField` follows: a 32px `Input` 64px wide, label "₹/$", `inputMode="decimal"`, commit on blur or Enter through `parseUsdRate` (range 1 to 1000; anything else is clamped or reset to the default 88 by the existing parser), placeholder 88.

Meeting mode button: `Button variant="outline" size="sm" aria-pressed` with Maximize2 or Minimize2 swapped instantly (no cross-fade, see skill conflicts), label "Meeting mode" from `sm`.

### 5.5 PageHeader

`src/components/layout/page-header.tsx`, server-safe:

```tsx
interface PageHeaderProps {
  title: React.ReactNode;        // the page's existing h1 text
  subtitle?: React.ReactNode;    // the existing one-line subtitle, text-secondary
  leading?: React.ReactNode;     // dashboard only: CompanyAvatar
  meta?: React.ReactNode;        // dashboard only: address, GST/PAN/CIN, "Prepared by ...", status and FY as text
  filters?: React.ReactNode;     // PeriodSelector and the page's existing filters, end-aligned, wrap
  actions?: React.ReactNode;     // existing page actions (New company, New user)
}
```

Layout: `flex flex-wrap items-end justify-between gap-6`. `main` uses `pt-6 pb-8 px-8` from `md` so the header sits 24px below the top bar; 24px separates the header from the content. Title `text-title text-balance`, subtitle `text-body text-text-secondary text-pretty`, one line where it fits. Filters group with 12px gaps. Company pages pass `<PeriodSelector />` first in `filters` (OQ-9). Firm pages have no period selector, as today.

PeriodSelector: shadcn `Select` with `SelectTrigger size="sm" aria-label="Reporting period"` (the existing name), a 14px CalendarDays icon inside the trigger, listing `periods` and the selected id from `useCompanyScope()`. On change it writes the period cookie and calls `router.refresh()` in a transition exactly as `period-selector.tsx` does now; while pending the trigger is `aria-disabled` and further changes are ignored. An empty list renders the existing "No period" text in text-secondary.

### 5.6 ReportTabs

`src/components/layout/report-tabs.tsx` keeps the current matching logic (path plus `scope`, `ch` handling) and every label, order and link from `REPORT_TABS`, `visibleReportTabs` and `withChannelTabs`. Markup changes to an underline link nav, not the shadcn Tabs primitive, because these are links (`role="tab"` would misreport them):

```text
nav[aria-label="Reports"] > ul.flex.gap-6.border-b.overflow-x-auto.overscroll-x-contain > li > Link
Link: h-9 inline-flex items-center text-body font-medium text-text-secondary hover:text-text-primary
      aria-[current=page]:text-text-primary
      relative after:absolute after:inset-x-0 after:-bottom-px after:h-0.5
      aria-[current=page]:after:bg-brand
```

The bar scrolls horizontally instead of wrapping; on mount the active tab is scrolled into view (`scrollIntoView({ block: "nearest", inline: "nearest" })`), and the next tab's partial visibility is the scroll cue. `print:hidden`. The page puts ReportTabs and the existing BranchScopeSelector on one row (`flex items-end justify-between gap-6`), tabs first.

### 5.7 Demo banner, skip link, print

- DemoBanner: one line above the page header, `DEMO_BANNER_MESSAGE` unchanged (dash replaced), `Notice` styling: 1px border, `rounded-md`, `bg-surface-raised`, Info icon 16px text-secondary, 13px text-primary, 24px below it.
- SkipLink: first focusable element, "Skip to content", visible on focus at the top start corner as a 32px `bg-surface-raised` chip with a 1px border.
- Print: unchanged behavior; tokens forced to light; shell chrome hidden.

## 6. Component map

Rules for every file below: one exported component per file (a provider file may also export its hook), at most 150 lines, props in, no data fetching, no cookie reads. Pages fetch and pass data down. Client components are marked.

### 6.1 `src/components/ui/` (shadcn CLI, never hand edited)

`npx shadcn@4.21.4 init` (Radix, style `new-york`, base color neutral, CSS variables on), then `npx shadcn@4.21.4 add` for: `sidebar` (brings `sheet`, `tooltip`, `separator`, `skeleton`, `input`, `button` and `src/hooks/use-mobile.ts`), `breadcrumb`, `dropdown-menu`, `select`, `toggle-group` (brings `toggle`), `table`, `chart` (brings `card`), `dialog`, `label`, `textarea`.

Not added: `tabs` (ReportTabs are links), `badge` (pills become text), `checkbox`, `switch`, `avatar`, `sonner`, `alert`.

`components.json`: `"style": "new-york"`, `"rsc": true`, `"tsx": true`, `tailwind.css: "src/app/globals.css"`, `"baseColor": "neutral"`, `"cssVariables": true`, `"iconLibrary": "lucide"`, aliases `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`.

### 6.2 `src/components/layout/`

| File | Client | Props sketch | Replaces | Used by |
|------|--------|--------------|----------|---------|
| `app-shell.tsx` | yes | `{ profile: ShellProfile; unit: MoneyUnit; usdRate: number; demoMode: boolean; defaultSidebarOpen: boolean; directory: ShellCompanyLink[]; children }` | `portal-shell.tsx` | `(dashboard)/layout.tsx` |
| `shell-company-provider.tsx` | yes | `{ directory; children }`; exports `useShellCompany(): { company: ShellCompanyLink | null; hasSegments: boolean | null }` and `usePublishShellCompany()` | new (OQ-1) | app-shell, company-scope |
| `company-scope.tsx` | yes | `{ value: CompanyScopeValue; children }`; exports `useCompanyScope()` | company props of `PortalShell` | `c/[slug]/layout.tsx` |
| `app-sidebar.tsx` | yes | `{ role: AppRole; profile: ShellProfile; demoMode: boolean }` | `sidebar.tsx` (`Sidebar`, `MobileNav`, `SidebarContent`) | app-shell |
| `sidebar-brand.tsx` | no | none | sidebar logo block | app-sidebar |
| `open-company-block.tsx` | no | `{ name: string }` | sidebar open company block | app-sidebar |
| `sidebar-nav.tsx` | yes | `{ items: NavItem[] }` (groups by `section`) | sidebar nav loop | app-sidebar |
| `sidebar-nav-item.tsx` | yes | `{ item: NavItem; active: boolean }` | `NavLink` | sidebar-nav |
| `user-menu.tsx` | no | `{ profile: ShellProfile; demoMode: boolean }` | `user-menu.tsx` | app-sidebar footer |
| `top-bar.tsx` | yes | `{ role: AppRole; meeting: boolean; onToggleMeeting: () => void }` | header in `portal-shell.tsx` | app-shell |
| `shell-breadcrumb.tsx` | yes | `{ role: AppRole }` | header title block | top-bar |
| `top-bar-actions.tsx` | yes | `{ slug: string | null; showMeeting: boolean; meeting: boolean; onToggleMeeting }` | `header-overflow.tsx` inline part | top-bar |
| `more-actions-menu.tsx` | yes | same as top-bar-actions | `header-overflow.tsx` popover | top-bar-actions |
| `export-actions.tsx` | yes | `{ slug: string }` | `export-menu.tsx` | top-bar-actions |
| `meeting-mode-button.tsx` | yes | `{ meeting: boolean; onToggle: () => void }` | `MeetingButton` | top-bar-actions |
| `unit-switch.tsx` | yes | none (reads `useUnitState`) | `unit-switch.tsx` | top-bar-actions |
| `usd-rate-field.tsx` | yes | `{ rate: number; pending: boolean; onCommit: (rate: number) => void }` | rate input in `unit-switch.tsx` | unit-switch |
| `unit-context.tsx` | yes | `UnitProvider { unit; usdRate; children }` plus hooks | `unit-context.tsx` (moved) | app-shell, charts, tables |
| `theme-provider.tsx` | yes | `ComponentProps<typeof NextThemesProvider>` | new | `app/layout.tsx` |
| `theme-toggle.tsx` | yes | none | new | top-bar-actions |
| `page-header.tsx` | no | see 5.5 | `.page-title` blocks, `CompanyHeader` frame | every page |
| `period-selector.tsx` | yes | none (reads `useCompanyScope`) | `period-selector.tsx` | company page headers |
| `report-tabs.tsx` | yes | `{ tabs: ReportTab[] }` | `report-tabs.tsx` | report pages |
| `demo-banner.tsx` | no | `{ message: string }` | banner in `portal-shell.tsx` | app-shell |
| `skip-link.tsx` | no | none | skip link in `portal-shell.tsx` | app-shell |
| `session-keep-alive.tsx` | yes | none | `session-keep-alive.tsx` (moved, logic unchanged) | `(dashboard)/layout.tsx` |

### 6.3 `src/components/dashboard/`

| File | Client | Props sketch | Replaces | Used by |
|------|--------|--------------|----------|---------|
| `kpi-strip.tsx` | no | `{ label: string; columns: 4 | 5; children }` | KPI grids | dashboard, P&L, Book to bank, Cash conversion, Budget vs actual |
| `kpi-cell.tsx` | no | `{ label: string; value: string | null; delta?: KpiDeltaView; caption?: string; sub?: React.ReactNode }` | `kpi-delta.tsx`, `kpi.tsx` | kpi-strip pages |
| `kpi-strip-skeleton.tsx` | no | `{ cells: number; columns: 4 | 5 }` | none | route `loading.tsx` |
| `company-page-header.tsx` | no | `{ company: Company; period: Period }` composing PageHeader | `company-header.tsx` | dashboard |
| `chart-card.tsx` | yes | `{ title; subtitle?; controls?; legend?: LegendItem[]; downloads?: { csv: string; png: boolean }; state: "ready" | "empty"; emptyText?: string; height: number; children }` | `chart-card.tsx`, `ChartFrame` | every chart |
| `chart-downloads.tsx` | yes | `{ title: string; csv: string; legend: LegendItem[]; target: React.RefObject<HTMLElement> }` | PNG and CSV buttons in `chart-frame.tsx` | chart-card |
| `chart-legend.tsx` | no | `{ items: LegendItem[] }` | legend and `Chip` display | chart-card, breakdown-donut |
| `chart-skeleton.tsx` | no | `{ height: number }` | `charts/chart-skeleton.tsx` | chart-card, loading |
| `series-toggle.tsx` | yes | `{ options: LegendItem[]; value: string[]; onChange }` (ToggleGroup multiple, dot plus label) | `Chip` toggles | trend cards |
| `trend-chart.tsx` | yes | `{ data: ChartRow[]; series: SeriesDef[]; mode: "bar" | "line" | "area"; format: (v: number) => string; height: number; label: string }` | `SeriesChart`, `CccComponentsChart`, `SegmentGpBar` | Charts page trend, budget by month, working capital, CCC cycle; Cash conversion; Segment |
| `breakdown-donut.tsx` | yes | `{ items: BreakdownItem[]; centerValue?: string; format; height: number; label: string }` | expense pie, `SegmentRevenuePie` | Charts page, Segment |
| `ranked-bar-chart.tsx` | yes | `{ rows: RankedRow[]; format; signed?: boolean; height: number; label: string }` (horizontal bars; `signed` colors favourable positive and adverse negative) | compare, expense bar mode, budget by section, biggest variances | Charts page |
| `waterfall-chart.tsx` | yes | `{ steps: WaterfallStep[]; height: number; label: string }` | `book-to-bank/waterfall.tsx` | Book to bank |
| `statement-table.tsx` | no | `{ label: string; columns: StatementColumn[]; rows: StatementRow[]; frozenFirst?: boolean; maxHeight?: "none" | "screen" }` | every `.tbl-report` table | dashboard summaries, P&L, Book to bank, CCC, Budget vs actual, Segment, Compare |
| `statement-row.tsx` | no | `{ row: StatementRow; columns: StatementColumn[] }` | row markup | statement-table |
| `data-table.tsx` | yes | `<T>{ label: string; columns: ColumnDef<T>[]; data: T[]; getRowId: (r: T) => string; empty: React.ReactNode; renderExpanded?: (r: T) => React.ReactNode; toolbar?: React.ReactNode }` (TanStack v9 `useTable` with `features` from `data-table-features.ts`) | ad hoc list tables | master data, ageing, users, audit |
| `data-table-features.ts` | no | shared `tableFeatures({ ... })` object: core, expanding; sorting registered but unused (no table sorts today) | none | data-table |
| `data-table-skeleton.tsx` | no | `{ columns: number; rows: number }` | none | loading |
| `ageing-table.tsx` | yes | `{ rows: AgeingEntry[]; noun: string }` (search Input, bucket ToggleGroup, DataTable) | `components/ageing-table.tsx` | debtors, creditors |
| `ageing-columns.tsx` | no | `ageingColumns(fmtAmount): ColumnDef<AgeingEntry>[]` | column markup | ageing-table |
| `ageing-report.tsx` | no | `{ view: AgeingView }` | `ageing-page.tsx` markup | debtors, creditors pages |

Page-private components stay next to their route (App Router colocation) and follow the same rules: see the move plan in section 12.

### 6.4 `src/components/shared/`

| File | Client | Props sketch | Replaces | Used by |
|------|--------|--------------|----------|---------|
| `card.tsx` | no | `{ title?: string; subtitle?: React.ReactNode; actions?: React.ReactNode; footer?: React.ReactNode; flush?: boolean; className?: string; children }` composing `ui/card` with `gap-4 py-5`, header and content `px-5`, `flush` removes body padding for edge-to-edge tables | `.card-surface` | every card |
| `card-error-boundary.tsx` | yes | `{ title: string; children }` React error boundary rendering `ErrorState` with Retry (`router.refresh()`) | none | wraps every client chart and DataTable |
| `delta-text.tsx` | no | `{ delta: KpiDeltaView; caption?: string }` | delta row in `kpi-delta.tsx` | kpi-cell |
| `empty-state.tsx` | no | `{ icon?: LucideIcon; title: string; description?: React.ReactNode; action?: React.ReactNode }` | dashed empty boxes, `ChartEmpty` | cards, tables, pages |
| `error-state.tsx` | yes | `{ title?: string; message: string; onRetry?: () => void }` | `route-error.tsx` | error boundaries, card-error-boundary |
| `icon.tsx` | no | `{ icon: LucideIcon; size?: 14 | 16 | 20; label?: string; className?: string }`; `aria-hidden` unless `label` | ad hoc `size-* strokeWidth` props | everywhere |
| `notice.tsx` | no | `{ icon?: LucideIcon; children }` (1px border, `rounded-md`, `bg-surface-raised`) | tinted notice boxes (adjustments notice, demo banner) | P&L, demo banner, forms |
| `status-text.tsx` | no | `{ children; emphasis?: boolean }` (text-secondary, text-primary weight 500 when `emphasis`) | `StatusPill`, `ROLE_TONE`, `ACTION_TONE`, `STATUS_TONE`, `StatusText` copies, "Staff only" pills | companies, users, audit, review, queries, upload, branches, template |
| `page-skeleton.tsx` | no | `{ variant: "report" | "list" | "form" }` built from `ui/skeleton` | `page-skeleton.tsx` | `loading.tsx` |
| `segmented-control.tsx` | yes | `<V>{ label: string; options: { value: V; label: string; title?: string }[]; value: V; onChange: (v: V) => void; allowEmpty?: boolean }` (ToggleGroup single) | `Seg` | Charts page controls, ageing buckets |
| `segmented-links.tsx` | no | `{ label: string; options: { href: string; label: string; active: boolean; disabled?: boolean; title?: string }[] }` | link-based toggles | quarter filter, Monthly and Branch-wise, charts range |
| `quarter-filter.tsx` | no | same props as today | `quarter-filter.tsx` | P&L |
| `period-picker.tsx` | yes | same props as today, shadcn Select | `period-picker.tsx` | master data, inputs |
| `branch-picker.tsx` | yes | same props as today, shadcn Select | `branch-picker.tsx` | master data, inputs |
| `branch-scope-selector.tsx` | yes | same props as today, shadcn Select with `SelectGroup` per channel | `branch-scope-selector.tsx` | report pages |
| `company-avatar.tsx` | no | same props as today; initials on `bg-surface-raised` text-secondary, `rounded-full`, logo image with a 1px inset outline | `company-avatar.tsx` | chooser, cards, dashboard header |
| `company-chooser.tsx` | no | same props as today | `company-chooser.tsx` | firm upload, queries, reports |
| `action-status.tsx` | no | same props as today, `role="status"` region always rendered | `action-status.tsx` | forms |
| `reorder-buttons.tsx` | yes | `{ itemLabel: string; onUp; onDown; upDisabled: boolean; downDisabled: boolean }` (ArrowUp and ArrowDown icon buttons) | arrow glyph buttons | branches, template editors |
| `clone-banner.tsx` | no | the existing `CloneBanner` props | two `CloneBanner` copies, merged only if identical | branches, template |

### 6.5 Types, hooks, lib

| File | Content |
|------|---------|
| `src/types/nav.ts` | `NavItem` (moved from `lib/nav.ts`) |
| `src/types/report.ts` | `ReportTab` (moved from `components/report-tabs.tsx`; `lib/report-tabs.ts` stops importing from components) |
| `src/types/shell.ts` | `ShellProfile`, `ShellCompanyLink`, `CompanyScopeValue` |
| `src/types/kpi.ts` | `KpiDeltaView { text: string; direction: "up" | "down" | "flat"; tone: "positive" | "negative" | "neutral"; verdict: "favourable" | "adverse" | null }` |
| `src/types/chart.ts` | `SeriesDef { key; label; color }`, `LegendItem`, `ChartRow`, `BreakdownItem`, `RankedRow`, `WaterfallStep` |
| `src/types/statement.ts` | `StatementColumn { key; label; minWidth? }`, `StatementRow { key; label; kind: "line" | "section" | "subtotal" | "total"; separatorAbove?: boolean; cells: Record<string, { value: string; sub?: string; numeric: boolean }> }` |
| `src/hooks/use-media-query.ts`, `use-meeting-mode.ts`, `use-mounted.ts` | Client hooks (`useSyncExternalStore`) |
| `src/lib/utils.ts` | `cn` with the tailwind-merge extension |
| `src/lib/kpi.ts` | `kpiDelta(value, prior, goodWhenUp): KpiDeltaView | null`, the exact rule from `kpi-delta.tsx` (zero prior omits, under 0.05% is flat, color follows goodness) |
| `src/lib/breadcrumb.ts` | `breadcrumbFor(pathname, items, company): Crumb[]` |
| `src/lib/chart-export.ts` | `exportChartPng`, `downloadCsv`, `inlineComputedColors` (moved from `chart-frame.tsx`) |
| `src/lib/export-link.ts` | `excelHref(slug)` (moved from `export-menu.tsx`) |
| `src/lib/format.ts` | adds `negParens(formatted: string): string` ("-1,234" to "(1,234)", other strings unchanged); `fyDisplay` returns the hyphen form |
| `src/lib/ui-classes.ts` | `fieldClass` (h-8, `rounded-md`, border-input, bg-surface, px-3, `text-base sm:text-body`), `focusRing` removed (global rule) |
| `src/lib/data/ageing.ts` | `loadAgeingView(slug, kind)`: the reads `ageing-page.tsx` makes today, moved out of the component |

### 6.6 States per card and table

| Block | Loading | Empty | Error |
|-------|---------|-------|-------|
| Page | Route `loading.tsx` renders `PageSkeleton` (report: header bar, KPI strip skeleton, tab bar, two card skeletons at final heights; list: header and table skeleton; form: header and one card) | Existing page empty states, e.g. "No reporting period published yet." with its existing link, as `EmptyState` with Inbox | Route `error.tsx` renders `ErrorState` with the existing `RouteError` copy and Retry |
| KPI strip | `KpiStripSkeleton` (label bar 11px, value bar 30px, delta bar 13px per cell) | Each missing value shows "No data" at the same height | Covered by the page boundary (values are server props) |
| Chart card | `ChartSkeleton` at the chart height until the client chart mounts (ResponsiveContainer needs a measured box) | `EmptyState` with ChartColumn and the existing empty sentence (for example "No segment revenue for this month.") inside the same height | `CardErrorBoundary` shows `ErrorState` "This chart could not be drawn." with Retry; logged with `console.error` |
| Statement table | Card skeleton with 6 row bars | Existing empty text in a row spanning all columns | Page boundary |
| DataTable | `DataTableSkeleton` (header plus 8 rows of 52px) | `empty` prop: the existing empty and "no search results" copy with a Clear search action where it exists today (ageing) | `CardErrorBoundary`, same copy pattern "This table could not be shown." with Retry |
| Forms and editors | Submit button keeps its label with `aria-disabled` while pending (existing pattern) | n/a | Existing `ActionStatus` messages, unchanged |

New strings introduced by the design: "Change theme", "Light", "Dark", "System", "Toggle navigation", "More" (existing), "This chart could not be drawn.", "This table could not be shown.", "Retry" (existing in RouteError), "Total" (donut center, approved in R9.5). No existing string is removed.

### 6.7 Error handling, validation and invariants

| Operation | Failure | Recoverable | Caller receives | Logged |
|-----------|---------|-------------|-----------------|--------|
| Server data read in a page or layout | Supabase error, thrown by `lib/data` | Yes, Retry | Route `error.tsx` with ErrorState | Existing server logging (unchanged) |
| `listCompanies()` in `(dashboard)/layout.tsx` | Throws | Yes | The layout catches it and passes an empty `directory`, so pages still render; the shell shows the slug until `CompanyScope` publishes the name after hydration. The auth guard is not inside this catch and still fails closed | `console.error` with the message |
| Client chart render | Exception in Recharts or data mapping | Yes | `CardErrorBoundary` ErrorState in that card only | `console.error` |
| PNG export | Missing SVG, image load or canvas failure | Yes | Nothing downloads; the button stays enabled (today's behavior) | `console.error` |
| Theme storage | localStorage blocked | Yes | In-memory theme for the session | No |
| Sidebar cookie write | Blocked | Yes | State works for the page view | No |
| Meeting mode storage | Blocked | Yes | Toggle works for the page view (existing) | No |
| Unit and period cookies | Write ignored | Yes | Refresh shows the old unit or period | No |

| External input | Rule | On failure |
|----------------|------|------------|
| `sidebar_state` cookie | Optional, `"true"` or `"false"` | Anything else means open |
| USD rate field | Required when $ is on, number 1 to 1000 (existing `parseUsdRate`) | Clamped or reset to 88, field shows the stored value |
| Theme value | `light`, `dark` or `system` (next-themes validates against its list) | Falls back to System |
| `?scope=`, `?q=`, `?ch=` | Existing parsers, unchanged | Existing fallbacks |
| Pathname slug | `companySlugFromPath` (existing) | Firm nav, "Especia MIS" crumb |

| Invariant | Owner | Why there |
|-----------|-------|-----------|
| Nav content (items, labels, order, visibility) | `src/lib/nav.ts`, guarded by a parity test | Single source for sidebar and breadcrumb |
| Report tab content | `src/lib/report-tabs.ts`, parity test | Same |
| Accent only in allowed places | Tokens (`--brand` mapped only to ring, sidebar-primary, chart-1) plus the banned-items search | Components cannot reach the color by any other name |
| No theme logic in components | Token architecture; search for `useTheme` outside `theme-toggle.tsx` must be empty | Keeps theme switching CSS-only and live |
| Negative display in parentheses | `negParens` at the formatting call site in pages and table helpers | Formatter tests and Excel output stay unchanged |
| 150 lines per UI file | Line-count check in the final task (section 13) | Structure rule |

Testability:

| Unit tests (Vitest, `src/lib/__tests__/`) | Integration and manual |
|------------------------------------------|------------------------|
| `negParens`, `fyDisplay` (updated), `kpiDelta` (zero prior, flat, goodWhenUp), `breadcrumbFor` (firm, company, unknown path, archived company fallback), nav parity (every role list: lower-cased labels, hrefs and order equal to a fixture captured before the change; icons unique within each list), report tab parity | `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test`, `node scripts/demo-smoke.mjs`, hard refresh per theme, `break` and `state-machine` harness pages for KpiCell, DataTable and TrendChart, `interface-review` per page |

## 7. Page by page plan

Every page: shell, then PageHeader with the existing title and subtitle, then content cards with 24px gaps. "Full" means full-width cards stacked; "70/30" means `grid xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-6` with `h-full` cards (equal row heights), stacking below 1280px with the left card first. Content (text, numbers, rows, columns, series, links, controls) is unchanged on every page; only the components drawing it change.

| Route | Composition | Grid |
|-------|-------------|------|
| `/` | Role redirect, no UI (unchanged). `(dashboard)/page.tsx` is not created: `/` is a redirect and the overview is the company dashboard | n/a |
| `/login` | No shell. Centered `Card` 400px wide on `bg-background`: flat "E" square, "Sign in", subtitle "Access your dashboard portal." (kept), form with `Label` plus `Input` fields and one filled `Button`, `ActionStatus`, footer "Especia Associates LLP". Mesh background, gradient tile and glow removed | n/a |
| `/companies` | PageHeader (actions: New company button opening the existing form in `Dialog`). Card grid of `CompanyCard` (avatar, two-line name and meta, `StatusText` instead of the pill, info fields, edit `Dialog`, logo editor, archive and delete controls as today). Admin: "Archived companies" Card below | Cards `grid gap-6 md:grid-cols-2 xl:grid-cols-3` (unchanged card grid content) |
| `/review` | PageHeader (existing counts subtitle). Card with the review list, status as `StatusText`, issue levels as text with CircleAlert or Info icons | Full |
| `/upload`, `/queries`, `/reports` (firm) | PageHeader. Card holding `CompanyChooser` rows (52px, avatar, two-line name) | Full |
| `/profile` | PageHeader "Your account details.". Card with the existing fields as a definition list | Full |
| `/users` (admin) | PageHeader (existing count sentence, New user action). Card `flush` with `DataTable`: columns Name (two-line: name, email), Role (`StatusText`), Companies, Actions (Edit, Reset password, Remove as today). Edit and reset forms render through `renderExpanded` in a full-width row, as they expand inline today | Full |
| `/audit` (admin) | PageHeader, existing filters (action, company) as Select. Card `flush` with `DataTable`: When (mono), Who, Action (`StatusText`), Details. `LoadMore` button below the table | Full |
| `/c/[slug]/dashboard` | `CompanyPageHeader` (avatar, company name as h1, Published or Draft as `StatusText`, address, GST, PAN, CIN, "Prepared by Especia Associates LLP", FY label as text, PeriodSelector). `KpiStrip columns={5}` with the 10 KPIs in today's order. Row: ReportTabs and BranchScopeSelector. Card "Profit summary" (subtitle: unit and months to date) with `StatementTable frozenFirst`. Card "Balance sheet summary" (unit, closing position). Footnote "Full line-by-line detail is under P&L detail." with its link. No period: `EmptyState` with the existing two sentences and link | Full |
| `/c/[slug]/gp-dashboard` | PageHeader, existing period choice, the uploaded HTML frame unchanged inside a `Card flush`; frame buttons as `Button size="sm"`; the sticky toolbar loses `backdrop-blur` and becomes `bg-surface` with a bottom border | Full |
| `/c/[slug]/history` | PageHeader. Card with the existing MIS history rows | Full |
| `/c/[slug]/compare` | PageHeader with the two existing `MonthPicker` selects as filters. Card with the comparison as `StatementTable` | Full |
| `/c/[slug]/pnl` | PageHeader (PeriodSelector, QuarterFilter via `SegmentedLinks`, Monthly and Branch-wise via `SegmentedLinks`, BranchScopeSelector). ReportTabs. Adjustments `Notice` (same sentence, dash replaced, same link). `KpiStrip columns={4}`: Revenue, Gross profit (margin sub), EBITDA (margin sub), Net profit (EBT) (margin sub). Card with `StatementTable frozenFirst maxHeight="screen"` | Full |
| `/c/[slug]/segment` | PageHeader. ReportTabs and BranchScopeSelector row. Card with the segment table (`StatementTable`). Card "Revenue share by segment" (`BreakdownDonut`, no center value). Card "Gross profit by segment" (`TrendChart mode="bar"`). No segments: `EmptyState` with the existing sentence and link | Full |
| `/c/[slug]/book-to-bank` | PageHeader. ReportTabs row. `KpiStrip columns={4}`. 70/30: left Card with the reconciliation `StatementTable`, right Card with `WaterfallChart` (subtitle kept) | 70/30 |
| `/c/[slug]/cash-conversion` | PageHeader. ReportTabs and BranchScopeSelector row. `KpiStrip columns={4}` (Cash conversion cycle, Debtor collection, Inventory period, Creditor payment, with their prior-month subs). 70/30: left Card "Working sheet" `StatementTable`, right Card "CCC components (days)" `TrendChart mode="bar"` | 70/30 |
| `/c/[slug]/budget-vs-actual` | PageHeader. ReportTabs row. `KpiStrip columns={4}` (Budget revenue, Actual revenue and the two existing tiles). Card with `StatementTable` | Full |
| `/c/[slug]/debtors`, `/creditors` | `AgeingReport`: PageHeader, ReportTabs, Card `flush` with `AgeingTable` (search Input with the existing placeholder, bucket `SegmentedControl` "0-30", "30-60" and so on, DataTable with the party two-line cell, Clear search) | Full |
| `/c/[slug]/charts` | PageHeader with the existing range control (`SegmentedLinks`, as it is a link today). Chart cards in today's order: Monthly trend (`TrendChart`, modes bar, line, area; absolute or % of revenue `SegmentedControl`; `SeriesToggle`), Expense breakdown (`BreakdownDonut` with the total in the center, or `RankedBarChart` in its bar mode; month and category Selects), Branch or Channel comparison (`RankedBarChart`), Budget vs Actual by month (`TrendChart`), by section (`RankedBarChart`), biggest variances (`RankedBarChart signed`), Working capital balances (`TrendChart`), Cash conversion cycle (days) (`TrendChart`). Each card keeps PNG and CSV downloads | Full |
| `/c/[slug]/reports` | PageHeader. Card with the report list and `PeriodDownloads` | Full |
| `/c/[slug]/queries` | PageHeader (open count as text, not a pill). Card per thread with `StatusText` for status; reply and new query forms with `Textarea` and `Button` | Full |
| `/c/[slug]/master-data` (staff) | PageHeader (PeriodPicker, BranchPicker, existing links). Unbalanced warning as `Notice` with CircleAlert instead of the pill. Card `flush` with `DataTable` (search, existing columns, `EditableCell` cells, amounts mono and right-aligned) | Full |
| `/c/[slug]/upload` (staff) | PageHeader. Card upload form, Card period list (`StatusText` per period), Card GP dashboard form, Card GP dashboard list | Full |
| `/c/[slug]/mapping` (staff) | PageHeader. Card bulk mapping form. Card mapping editor table (native selects styled with `fieldClass`; the "New grouping…" option loses its emoji; the undo glyph becomes an Undo2 icon button with the existing label) | Full |
| `/c/[slug]/inputs` (staff) | PageHeader (PeriodPicker, BranchPicker). Card adjustments form | Full |
| `/c/[slug]/budget` (staff) | PageHeader. Card budget upload form | Full |
| `/c/[slug]/template` (staff) | PageHeader with "Staff only" as `StatusText`. `CloneBanner` as `Notice`. One Card per section table and the segment editor; move buttons via `ReorderButtons` | Full |
| `/c/[slug]/branches` (staff) | PageHeader with "Staff only" as text. Cards: groups, branches, report scope; `ReorderButtons` | Full |
| Boundaries | `loading.tsx` files: `PageSkeleton`. `error.tsx` files: `ErrorState`. `global-error.tsx` imports `globals.css` and renders `ErrorState` inside its own `<html suppressHydrationWarning>` and body with the Geist variables and the same `ThemeProvider` options | n/a |


Note (recorded in phase 8, from the phase 7 review): Cash conversion keeps the 70/30 grid but pairs the untitled ratio block (7 rows) with "CCC components (days)" on the right, and puts "Working sheet" (19 rows) full width below. A 19-row sheet beside a 280px chart left a large empty right column; the content, order of rows and series are unchanged.

Note (recorded in phase 8, from the phase 7 review): Segment P&L keeps today's order: the notice, the two chart cards ("Revenue share by segment", "Gross profit by segment"), then the segment table. The row above lists the table first; the baseline arrangement was kept so nothing moves.

Note (phase 8): rows that never had visible column titles (Users, Audit log) render on DataTable with screen-reader-only headers (User, Role, Access, Actions; Event, When). Nothing visible was added. DataTable gained an optional enderExpanded row for the inline Users forms.
Note (user decision during task 20): the Book to bank waterfall and its 70/30 grid were dropped because no page renders a waterfall today; the page is the KPI strip plus a full-width table, and `WaterfallChart` (section 6.3 and 8) is not built.

Two visual changes worth naming, both from the brief's color rules: `KpiTile` values no longer turn green or red by `tone`, and report tables no longer color negative cells red. Both were color-only signals; the values, their sign (now parentheses) and the delta words carry the meaning.

## 8. Charts

Shared rules, implemented once in the dashboard chart components:

| Rule | Implementation |
|------|----------------|
| Container | `ChartContainer config={...} className="h-[var(--chart-h)] w-full"` with `--chart-h` set from the `height` prop (280px trend charts, 240px donut and side charts, 260px ranked bars), so ResponsiveContainer measures on first render |
| Colors | `ChartConfig` entries: series i uses `var(--chart-i)`; signed bars use `var(--positive)` and `var(--negative)`; waterfall totals use `var(--chart-2)` |
| Lines | `strokeWidth={1.5}`, `dot={false}`, `activeDot={false}`, series 4 to 6 `strokeDasharray="4 3"`, existing curve type kept |
| Area mode | `<Area>` with `fill="var(--color-<key>)" fillOpacity={0.12}` and the same 1.5px stroke; no `<defs>` and no gradients (OQ-19) |
| Bars | `radius={0}`, `stroke="var(--surface)" strokeWidth={2}` between adjacent bars and stacked segments |
| Grid | `<CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--grid)" />` |
| Axes | `tickLine={false} axisLine={false}`, ticks 11px text-secondary (the container's `muted-foreground` rule), tick formatter uses the page formatter plus `negParens` |
| Tooltip | `<ChartTooltip cursor={{ fill: "var(--surface-hover)" }} content={<ChartTooltipContent className="border-border bg-popover" />} />`: surface-raised, 1px border, 6px radius, no shadow (shadow utilities do not exist). Values in text-primary, tabular |
| Legend | `ChartLegend` (flat 8px round dot, name, optional percent) above the plot, in series order |
| Motion | `isAnimationActive={false}` on every series |
| Accessibility | `accessibilityLayer` on every Recharts chart; the card is a `<figure>` labelled by its title; the CSV download and legend are the text alternative |

| Existing chart | New component | Specifics |
|----------------|---------------|-----------|
| Charts page, Monthly trend (bar, line, area; absolute or % of revenue; series toggles) | `TrendChart` | Same metrics and toggles; `SeriesToggle` replaces `Chip`; chart-1 is the first selected series |
| Charts page, Expense breakdown (pie or bar, month and category) | `BreakdownDonut`, `RankedBarChart` | Donut `innerRadius="68%" outerRadius="100%"`, 2px surface separators, center: total amount at 20px weight 600 text-primary and "Total" at 11px text-secondary; legend with dot, name and percent. Slice colors keep today's index order over six colors |
| Charts page, Branch or Channel comparison | `RankedBarChart` | Horizontal bars, chart-1 |
| Charts page, Budget vs Actual by month | `TrendChart` | Two series, chart-1 (actual) and chart-2 (budget) as today's order |
| Charts page, Budget vs Actual by section | `RankedBarChart` | Grouped bars chart-1 and chart-2 |
| Charts page, biggest variances | `RankedBarChart signed` | Favourable positive, adverse negative (OQ-18); subtitle kept |
| Charts page, Working capital balances | `TrendChart` | Existing series in order |
| Charts page, Cash conversion cycle (days) | `TrendChart` | Single series chart-1; subtitle "DCP + ICP − CPP" kept (U+2212 is a minus sign, not a dash) |
| Segment, Revenue share by segment | `BreakdownDonut` | No center value (none shown today) |
| Segment, Gross profit by segment | `TrendChart mode="bar"` | Today the bars take the sign colors. Gross profit is a value, not a delta, so under R9.6 every bar uses chart-1 and a loss reads from the bar falling below the zero line and from the tooltip value in parentheses |
| Cash conversion, CCC components (days) | `TrendChart mode="bar"` | Existing series order |
| Book to bank waterfall | `WaterfallChart` | Totals chart-2, increases positive, decreases negative (OQ-18) |

## 9. Tables

| Kind | Tables | Build |
|------|--------|-------|
| Statements | Dashboard profit summary and balance sheet summary, P&L, Segment, Book to bank, CCC working sheet, Budget vs actual, Compare | `StatementTable`: plain semantic `<table>` inside a focusable scroll region (`role="region" tabIndex={0} aria-label`, as today) |
| Interactive lists | Master data, Debtors and Creditors ageing, Users, Audit log | `DataTable` on TanStack Table 9.3.1 (`useTable`, `tableFeatures`, `<table.FlexRender>`), rendered with the shadcn `Table` parts |
| Other lists | Review queue, company chooser, history, reports, queries | Existing lists inside Cards, restyled with the same row tokens |

| Rule | Statements | DataTable |
|------|------------|-----------|
| Text | 13px body | 13px body |
| Header | `sticky top-0 bg-surface-raised`, `text-label text-text-secondary`, first column start-aligned, numbers end-aligned | Same |
| Row height | 36px (`py-2`), taller with a percent sub-line | 52px (`h-13`) |
| Borders | 1px `border-border` between rows; no vertical rules except the frozen column edge | Same |
| Hover | `bg-surface-raised` on hover-capable pointers (Tailwind v4 `hover:`) | Same |
| Numbers | `.num`: Geist Mono, `tabular-nums`, end-aligned, negatives `(1,234)` in text-primary via `negParens` | Same |
| Percent sub-line | `block text-label text-text-secondary` under the amount | n/a |
| Section row | Weight 600, text-primary, 12px extra top padding, no fill | n/a |
| Subtotal row | Weight 600, `border-t border-border-strong` | n/a |
| Total row | Weight 600, `border-t border-border-strong` and `border-b border-border-strong` | n/a |
| Separator | `border-t border-border-strong` above the row (today's `row-sep`) | n/a |
| Frozen first column | `sticky start-0 bg-surface` (opaque, matching hover), a 1px end edge via `after:` pseudo element | n/a |
| Sticky header scope | The scroll region gets `max-h-[70dvh] overflow-auto` when `maxHeight="screen"` (long P&L), so the header sticks inside it | Card body `max-h-[70dvh] overflow-auto` |
| Sorting | Fixed order | None today, so headers are plain text; the sorting feature stays registered for later and exposes `aria-sort` when enabled |
| Empty cell | "-" (hyphen) | "-" |
| Two-line cell | n/a | Name 13px weight 500 text-primary, second line `text-label` text-secondary (ageing party, user email) |

The statement row kinds map one to one from the engines' `StatementLine.emphasis` (`section`, `subtotal`, `total`) and today's `row-sep`, so no engine changes.

## 10. Copy changes

| Rule | Application |
|------|-------------|
| Sentence case | Labels in UI code, `lib/nav.ts`, `lib/report-tabs.ts`: first word capitalized, the rest lower case except acronyms and names: MIS, GP, P&L, EBT, EBITDA, COGS, CCC, DCP, ICP, CPP, YTD, FY, GST, PAN, CIN, TB, OD, Q1 to Q4, US$, Excel, PDF, Tally, Especia, LLP, month names, company and person names. Examples: "My Dashboard" to "My dashboard", "Notes & Queries" to "Notes & queries", "Net Profit (EBT)" to "Net profit (EBT)", "Cash, Bank & OD" to "Cash, bank & OD", "CCC (Days)" to "CCC (days)", "Apr Opening" to "Apr opening", "Audit Log" to "Audit log". Database, engine and export labels are untouched (OQ-21) |
| Dashes in sentences | Em dash becomes a colon, comma or full stop by meaning: "Not saved: this is a demo.", "Management Information System: Trial Balance to MIS reporting." (metadata, then sentence case), quarter tooltip "Apr-Jun, no months uploaded yet", aria-label "₹/$: rupees per US dollar" |
| Dashes in ranges | Hyphen: ageing buckets "0-30", "30-60", YTD "YTD (Apr-Jun)", `fyDisplay` "FY 2026-27" (test expectation updated) |
| Empty cells | "-" instead of the em dash |
| Comments, Excel strings, statement labels, demo copy | Dashes replaced with a hyphen, colon or comma in all of `src/` (OQ-20); Excel titles keep their words |
| Emoji | The heavy plus emoji in "New grouping…" (a native `<option>`, which cannot hold an icon) is deleted, the words stay. The comment quoting it in `lib/export/mapping-template-workbook.ts` is reworded |
| Glyph icons | KPI arrows become ArrowUpRight, ArrowDownRight and ArrowRight (14px, `aria-hidden`, the sr-only "up", "down", "unchanged" kept); move buttons become ArrowUp and ArrowDown icon buttons with their existing accessible names; the mapping undo glyph becomes Undo2 |
| Exclamation marks, marketing copy | None exist; none are added |
| Removals | None (OQ-30) |

## 11. Skill findings

- better-ui: no shadows by project convention with 1px borders for structure; transitions name exact properties (color, background-color, border-color) and never `all`; theme-switch transitions suppressed by `disableTransitionOnChange`; hover styles only through Tailwind v4 `hover:` (hover-capable pointers); `overscroll-behavior: contain` on the sidebar content, menus, dialogs and the tab scroller; icons use `currentColor`, one library, 1.5px rendered stroke for 400 to 500 weight text via `vector-effect: non-scaling-stroke`; state changes use transitions, no keyframes; logo images get a 1px inset outline.
- better-typography: unitless line heights (1.2 values and titles, 1.5 body); one named type scale with size, line height, weight and tracking per role; `tabular-nums` on every number; no weight under 400 below 18px; font smoothing once on `html`; `text-balance` on titles and `text-pretty` on subtitles; rem sizes so meeting mode scales; inputs at 16px on phones only (OQ-24); truncated company names keep the full text in a `title` and the breadcrumb.
- better-colors: two tiers (brief roles in `:root` and `.dark`, shadcn names point at them); the brand blue renamed `--brand` so `primary` and `accent` mean one thing each; one switching mechanism (the `.dark` class); every text and mark pair measured and recorded (2.6) with failures reported, not silently changed; status hues (green 142, red 27) sit more than 15 degrees from the blue accent; the shadcn `--accent` hover role gets its own token instead of borrowing a border value.
- better-layout: grouping by space (8px within, 24px between groups, 12px between bordered controls); logical properties only (`ms`, `me`, `ps`, `pe`, `start`, `end`, `inset-inline`); `minmax(0, 1fr)` grid tracks and `min-w-0` on flex children holding tables; `scroll-padding-block-start` equal to the 56px top bar; `100dvh` shell; numbers end-aligned and text start-aligned; visual order equals DOM order (70/30 left card first); the scrolling tab bar keeps a partially visible next tab as its cue.
- better-accessibility: native elements first (ReportTabs stay links in a labelled `nav` with `aria-current`); skip link is the first focusable element; `:focus-visible` 2px brand outline with 2px offset measures 5.1:1 or more on every surface; every icon-only button has an `aria-label` naming the action and decorative icons are `aria-hidden`; Radix handles menu and dialog focus trap, Escape and focus return; `ActionStatus` keeps a stable `role="status"` region; color never carries meaning alone (favourable and adverse words, sr-only direction, parentheses for negatives); reduced motion disables transitions and the skeleton pulse; scroll regions stay focusable and labelled.
- better-writing: one capitalization policy (sentence case) per element type; new controls are verb-first ("Change theme", "Toggle navigation"); existing terms kept everywhere; error states say what failed and offer Retry; no exclamation marks; status text kept as words rather than colored badges.

Skill conflicts (the brief wins; each is logged here as the brief instructs):

| Skill | Skill says | Brief rule applied |
|-------|-----------|--------------------|
| better-ui | Use layered shadows for elevation | No box shadows; 1px borders only |
| better-ui | Pressed buttons scale to 0.96 | No decorative animation; press scale removed |
| better-ui | Cross-fade contextual icon swaps over 300ms with blur | Only color transitions; the meeting mode icon swaps instantly |
| better-ui | Outer radius equals inner radius plus padding | Only 8px and 6px exist; a 6px menu holds 6px items |
| better-typography | Use en dashes for ranges and em dashes for asides | No dashes; hyphens, colons and commas |
| better-typography | Long-form body starts at 16px | 13px body (dense professional tool, which the skill allows) |
| better-colors | Prefer `oklch()` for a new system | The brief's hex and rgb values are kept exactly |
| better-accessibility | Aim for 44px touch and 40px pointer targets | 32px controls (OQ-26); still above the 24px AA minimum |
| better-accessibility | Control boundaries need 3:1 | Brief border tokens kept at 1.19 and 1.45 to 1 with mitigations (RQ-2, resolved) |
| better-accessibility | Body text 4.5:1 | Brief light `positive` measured 3.30:1; changed to `#15803d`, 5.02:1 (RQ-1, resolved) |
| ui-design-system | Shadows, 8pt grid, Inter and Fira Code, 1.25 modular scale, fluid type, 44px targets, sm, md and lg control sizes | No shadows, 4px scale, Geist Sans and Mono, the brief's fixed sizes, one 32px control size |
| Brief vs shadcn Tabs | The brief asks for the shadcn Tabs component | ReportTabs navigate, so they are links styled as underline tabs (approved R7.11); Tabs is not installed |

## 12. Move plan

### 12.1 `src/components/` (every current file)

| Current file | Action | Target | Reason |
|--------------|--------|--------|--------|
| `action-status.tsx` | move | `components/shared/action-status.tsx` | Shared form feedback; tokens only |
| `ageing-page.tsx` | split | `lib/data/ageing.ts` (`loadAgeingView`), `components/dashboard/ageing-report.tsx` | It fetches data inside a component |
| `ageing-table.tsx` | replace | `components/dashboard/ageing-table.tsx`, `ageing-columns.tsx` on `DataTable` | TanStack list table, bucket pills become a segmented control |
| `branch-picker.tsx` | move | `components/shared/branch-picker.tsx` | shadcn Select, gradient active state removed |
| `branch-scope-selector.tsx` | move | `components/shared/branch-scope-selector.tsx` | shadcn Select with groups |
| `chart-card.tsx` | replace | `components/dashboard/chart-card.tsx` | Merged with `ChartFrame` |
| `charts/chart-skeleton.tsx` | replace | `components/dashboard/chart-skeleton.tsx`, `components/shared/empty-state.tsx` | `ChartEmpty` becomes EmptyState |
| `charts/use-chart-colors.ts` | fix, then delete | none | MutationObserver interim fix; deleted when every chart uses `ChartConfig` |
| `company-avatar.tsx` | move | `components/shared/company-avatar.tsx` | Gradient initials become a flat tile |
| `company-chooser.tsx` | move | `components/shared/company-chooser.tsx` | Used by three firm pages |
| `company-header.tsx` | replace | `components/dashboard/company-page-header.tsx` | Composes PageHeader; pills become text, glow removed |
| `export-menu.tsx` | split | `components/layout/export-actions.tsx`, `lib/export-link.ts` | `excelHref` is a helper, not UI |
| `header-overflow.tsx` | split | `components/layout/top-bar-actions.tsx`, `more-actions-menu.tsx`, `meeting-mode-button.tsx` | Popover becomes DropdownMenu; blur icon swap removed |
| `kpi-delta.tsx` | replace | `components/dashboard/kpi-cell.tsx`, `components/shared/delta-text.tsx`, `lib/kpi.ts` | Reads cookies; colored border and glyphs removed |
| `kpi.tsx` | replace | `components/dashboard/kpi-cell.tsx` | One cell component |
| `modal.tsx` | delete | `components/ui/dialog.tsx` | Dialogs move to the shadcn Dialog |
| `page-skeleton.tsx` | move | `components/shared/page-skeleton.tsx` | Built from `ui/skeleton`, variants per page type |
| `period-picker.tsx` | move | `components/shared/period-picker.tsx` | shadcn Select |
| `period-selector.tsx` | move | `components/layout/period-selector.tsx` | Reads periods from CompanyScope, sits in the page header |
| `placeholder.tsx` | delete | none | No importer (dead code) |
| `portal-shell.tsx` | split | `components/layout/app-shell.tsx`, `top-bar.tsx`, `demo-banner.tsx`, `skip-link.tsx`, `hooks/use-meeting-mode.ts` | Shell moves into `(dashboard)/layout.tsx` |
| `quarter-filter.tsx` | move | `components/shared/quarter-filter.tsx` on `SegmentedLinks` | Gradient active state removed, dash in tooltip replaced |
| `report-tabs.tsx` | move | `components/layout/report-tabs.tsx`, `types/report.ts` | Underline link nav |
| `route-error.tsx` | replace | `components/shared/error-state.tsx` | One error component |
| `session-keep-alive.tsx` | move | `components/layout/session-keep-alive.tsx` | Unchanged logic |
| `sidebar.tsx` | replace | `components/layout/app-sidebar.tsx`, `sidebar-brand.tsx`, `sidebar-nav.tsx`, `sidebar-nav-item.tsx`, `open-company-block.tsx` | shadcn Sidebar; mobile `<dialog>` becomes its Sheet |
| `unit-context.tsx` | move | `components/layout/unit-context.tsx` | Shell provider |
| `unit-switch.tsx` | split | `components/layout/unit-switch.tsx`, `usd-rate-field.tsx` | ToggleGroup |
| `user-menu.tsx` | move | `components/layout/user-menu.tsx` | Sidebar footer |

### 12.2 Large UI files and touched app files

| Current file (lines) | Action | Targets (colocated unless noted) |
|----------------------|--------|----------------------------------|
| `(data)/branches/branches-editor.tsx` (737) | split | `branch-manager.tsx` (container), `group-editor.tsx`, `new-group-row.tsx`, `branch-editor.tsx`, `new-branch-row.tsx`, `report-scope-row.tsx`; `StatusText` to `shared/status-text.tsx`; `CloneBanner` to `shared/clone-banner.tsx`; arrows to `shared/reorder-buttons.tsx` |
| `(data)/template/template-editor.tsx` (655) | split | `template-manager.tsx`, `section-table.tsx`, `line-editor.tsx`, `new-line-row.tsx`, `segment-editor.tsx`, `new-segment-row.tsx`, `section-label.ts`; shared StatusText, CloneBanner, ReorderButtons |
| `(firm)/companies/company-card.tsx` (569) | split | `company-card.tsx`, `logo-editor.tsx`, `delete-company-control.tsx`, `archive-control.tsx`, `edit-company-form.tsx`, `info-field.tsx`, `form-field.tsx`; `StatusPill` replaced by StatusText; `Modal` by Dialog |
| `c/[slug]/charts/charts-board.tsx` (557) | split | `charts-board.tsx` (range state and order only), `trend-card.tsx`, `expense-card.tsx`, `compare-card.tsx`, `budget-cards.tsx`, `working-capital-cards.tsx`; chart drawing moves to `components/dashboard/*` |
| `c/[slug]/charts/chart-frame.tsx` (242) | replace | `components/dashboard/chart-card.tsx`, `chart-downloads.tsx`, `chart-legend.tsx`, `series-toggle.tsx`, `shared/segmented-control.tsx`, `lib/chart-export.ts` |
| `c/[slug]/dashboard/page.tsx` (360) | split | `page.tsx` (fetch and compose), `dashboard-data.ts` (pure month snapshot, YTD and balance column builders moved verbatim), `dashboard-kpis.tsx`, `profit-summary-card.tsx`, `balance-sheet-card.tsx` |
| `(data)/mapping/mapping-editor.tsx` (343) | split | `mapping-manager.tsx`, `editable-row.tsx`, `grouping-select.tsx` |
| `(firm)/users/user-row.tsx` (292) | split | `user-columns.tsx` (DataTable columns), `user-actions.tsx`, `edit-user-form.tsx`, `reset-password-inline.tsx`, `user-initials.ts` |
| `c/[slug]/pnl/page.tsx` (269) | split | `page.tsx`, `pnl-data.ts` (pure column builders), `pnl-filters.tsx`, `pnl-kpis.tsx` |
| `(firm)/audit/page.tsx` (218) | split | `page.tsx`, `audit-format.ts` (`roleName`, `when`, `summarize`), `audit-columns.tsx`, `audit-filters.tsx` |
| `(data)/master-data/master-table.tsx` (215) | split | `master-table.tsx` (DataTable and search), `master-columns.tsx`, `amount-cell.tsx`, `unbalanced-notice.tsx` |
| `c/[slug]/segment/page.tsx` (208) | split | `page.tsx`, `segment-data.ts`, `segment-table-card.tsx`, `segment-chart-cards.tsx` |
| `(firm)/companies/new-company-form.tsx` (196) | split | `new-company-form.tsx` (Dialog and action), `new-company-fields.tsx` |
| `(data)/upload/upload-form.tsx` (184) | split | `upload-form.tsx`, `upload-fields.tsx` |
| `(data)/inputs/inputs-form.tsx` (176) | split | `inputs-form.tsx`, `inputs-section.tsx` |
| `c/[slug]/book-to-bank/page.tsx` (169) | split | `page.tsx`, `btb-data.ts`, `btb-kpis.tsx` |
| `c/[slug]/cash-conversion/page.tsx` (165) | split | `page.tsx`, `ccc-data.ts`, `ccc-kpis.tsx` |
| `(data)/master-data/page.tsx` (157) | split | `page.tsx`, `master-data-header.tsx` |
| `c/[slug]/reports/page.tsx` (154) | split | `page.tsx`, `report-list.tsx` |
| `c/[slug]/cash-conversion/ccc-table.tsx` (151) | replace | `ccc-rows.ts` (rows for StatementTable), uses `components/dashboard/statement-table.tsx` |
| `(firm)/users/role-fields.tsx` (149), `(data)/master-data/editable-cell.tsx` (143), `ageing-table.tsx` (165) | restyle or replace | Under 150 after token classes; ageing replaced above |
| `pnl/pnl-table.tsx`, `book-to-bank/book-to-bank-table.tsx`, `budget-vs-actual/budget-vs-actual-table.tsx` | replace | `*-rows.ts` builders feeding `StatementTable` |
| `book-to-bank/waterfall.tsx`, `cash-conversion/ccc-chart.tsx`, `segment/segment-charts.tsx` | replace | `components/dashboard/waterfall-chart.tsx`, `trend-chart.tsx`, `breakdown-donut.tsx` |
| `gp-dashboard/gp-dashboard-viewer.tsx` | restyle | Blur toolbar becomes a flat bordered bar |
| `(dashboard)/(firm)/layout.tsx` | delete | Shell is shared now |
| `(dashboard)/layout.tsx`, `c/[slug]/layout.tsx`, `app/layout.tsx`, `login/page.tsx`, `global-error.tsx`, every `loading.tsx` and `error.tsx` | edit | As in sections 3, 5 and 7 |
| `src/app/globals.css` (370) | rewrite | Tokens, theme blocks, global rules, statement and `.num` rules, print. Stylesheet, not a component; the 150-line rule does not apply |
| `src/lib/nav.ts`, `src/lib/report-tabs.ts`, `src/lib/format.ts`, `src/lib/ui-classes.ts`, `src/lib/demo/messages.ts` | edit | Icons and sentence case; types moved; `negParens` and `fyDisplay`; field classes; dashes |

Server action files, data access, engines, ingest, export and the demo dataset are not split (OQ-22). Only their dashes change.

### 12.3 Packages

Versions checked on npm on the day of writing; pin exactly (no caret).

| Package | Version | Kind | Why |
|---------|---------|------|-----|
| `next-themes` | 0.4.6 | dependency | Themes |
| `geist` | 1.7.2 | dependency | Fonts through `next/font/local` |
| `@tanstack/react-table` | 9.3.1 | dependency | DataTable (the shadcn data table guide targets v9) |
| `radix-ui` | 1.8.1 | dependency | Primitives used by the `new-york` registry items |
| `class-variance-authority` | 0.7.1 | dependency | shadcn variants |
| `tailwind-merge` | 3.7.0 | dependency | `cn` |
| `clsx` | 2.1.1 | dependency | `cn` (transitive today, made direct) |
| `shadcn` | 4.21.4 | run with `npx`, not installed | CLI only. If `init` adds `@import "shadcn/tailwind.css"` to globals.css, keep it and add `shadcn` 4.21.4 as a devDependency |

Not added: `tw-animate-css` (if `init` adds it, remove the import and the package), `motion`, `framer-motion`, any icon set other than lucide, any font package other than geist.

Kept as installed: `recharts` 3.10.1. The shadcn `chart` registry item declares `recharts@3.8.0`; after `add chart`, confirm `package.json` and the lockfile still resolve 3.10.1 and restore it if the CLI changed it.

Removed if unused at the end: none expected. The final task checks every dependency with a ripgrep import search and removes any without importers.

## 13. Banned items search

Run from the repo root in PowerShell. Every command must print nothing (ripgrep exit code 1). Patterns are single-quoted so PowerShell passes them unchanged; the exclamation marks inside them are regex lookbehinds and ripgrep glob negations, not prose. `src/components/ui/` is excluded from class-pattern searches (R19 scope note); the dash and emoji searches cover it. Each pattern was dry-run against the current tree: it runs, and it matches today's violations without matching `onBlur`, `.blur()`, the `blurb` data key or focus comments.

```powershell
# 1. En and em dashes, in src and the spec files
rg -n --pcre2 '[\x{2013}\x{2014}]' src .kiro/specs/premium-dashboard-revamp

# 2. Emoji
rg -n --pcre2 '[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}\x{200D}]' src

# 3. Arrow glyphs used as icons
rg -n --pcre2 '[\x{2190}-\x{21FF}]' src -g '*.tsx'

# 4. Gradients and clipped text
rg -n -i 'gradient|bg-clip-text|background-clip|bg-(linear|radial|conic)-' src -g '!src/components/ui/**'

# 5. Blur, glass, glow, neon (style contexts only)
rg -n --pcre2 '(?<![\w-])blur-|(?<![\w.-])blur\(|backdrop-(filter|blur)|\bglass\b|\bglow\b|\bneon\b' src -g '!src/components/ui/**'

# 6. Shadows and ring shadows
rg -n --pcre2 '(?<![\w-])(shadow|inset-shadow|drop-shadow|text-shadow)-|box-shadow|boxShadow|(?<![\w-])ring-(\d|\[|inset|offset)' src -g '!src/components/ui/**'

# 7. Decorative animation and non-color transitions
rg -n --pcre2 '(?<![\w-])animate-|@keyframes|\bbounce\b|\bshimmer\b|active:scale|(?<![\w-])scale-(\d|\[)|transition-(all|transform)|(?<![\w-])duration-(?!150\b)\d+' src -g '!src/components/ui/**'

# 8. dark: classes outside globals.css
rg -n --pcre2 '(?<![\w-])dark:' src -g '*.tsx' -g '*.ts' -g '!src/components/ui/**'

# 9. Hard-coded colors outside globals.css (Excel styling and demo HTML are data, not UI)
rg -n --pcre2 '#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(' src -g '!src/app/globals.css' -g '!src/components/ui/**' -g '!src/lib/export/**' -g '!src/lib/demo/**'

# 10. Tailwind palette colors
rg -n --pcre2 '(?<![\w-])(text|bg|border|ring|outline|fill|stroke|from|via|to|divide|decoration|accent|caret|placeholder)-(white|black|(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b' src -g '!src/components/ui/**'

# 11. Old classes and tokens
rg -n --pcre2 'brand-grad|mesh-bg|card-surface|tbl-(report|frozen)|shadow-card|--grad\b|\bnums\b|page-title|text-(metric|overline|caption|ui)\b|(success|warning|danger|info)-text' src

# 12. Spacing off the 4px scale (allowed: 1 2 3 4 5 6 8 12)
rg -n --pcre2 '(?<![\w-])-?(p|px|py|pt|pb|ps|pe|pl|pr|m|mx|my|mt|mb|ms|me|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(0\.5|1\.5|2\.5|3\.5|7|9|10|11|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|\[)' src -g '*.tsx' -g '!src/components/ui/**'

# 13. Font sizes outside the token scale (text-base allowed only in ui-classes.ts)
rg -n --pcre2 '(?<![\w-])text-(xs|sm|lg|xl|[2-9]xl|\[\d)' src -g '*.tsx' -g '!src/components/ui/**'
rg -n --pcre2 '(?<![\w-])text-base\b' src -g '!src/lib/ui-classes.ts' -g '!src/app/globals.css' -g '!src/components/ui/**'

# 14. Arbitrary radius
rg -n --pcre2 '(?<![\w-])rounded(-[a-z]{1,2})?-\[' src -g '!src/components/ui/**'

# 15. Icon rules: no namespace imports, no per-icon stroke props
rg -n --pcre2 'import \* as \w+ from "lucide-react"|strokeWidth|absoluteStrokeWidth' src -g '!src/components/ui/**'

# 16. Theme logic outside the toggle
rg -n 'useTheme|resolvedTheme' src -g '!src/components/layout/theme-toggle.tsx' -g '!src/components/layout/theme-provider.tsx'

# 17. Exclamation marks in UI strings
rg -n --pcre2 '"[^"\n]*[A-Za-z]!"|>[^<>{}\n]*[A-Za-z]!\s*<' src -g '*.tsx'
```

Two checks that are not ripgrep:

```powershell
# 18. UI files over 150 lines (pages, layouts, components; ui primitives excluded)
Get-ChildItem -Recurse -File src\app, src\components -Include *.tsx |
  Where-Object { $_.FullName -notmatch '\\components\\ui\\' } |
  Where-Object { (Get-Content -LiteralPath $_.FullName).Count -gt 150 } |
  ForEach-Object { $_.FullName }

# 19. Chart animation: every series element in src/components/dashboard must carry isAnimationActive={false}
rg -n --pcre2 '<(Line|Bar|Area|Pie)\b' src/components/dashboard
rg -c 'isAnimationActive=\{false\}' src/components/dashboard
```

Check 18 must print nothing; in check 19 the two counts per file must agree. All outputs go into the final report (R19.2).

## 14. Risks and open questions

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shell company context on hard load | First paint of an archived company page shows its slug instead of its name for one frame | `directory` seed covers every active company; `CompanyScope` publishes in a layout effect; the slug fallback matches today's sidebar fallback |
| Sidebar at 768 to 1023px on hard load | The server assumes a wide screen, so tablets paint the sidebar expanded and then collapse it once | Accepted; checked at 768px in the polish pass. Desktop and phone widths are unaffected |
| shadcn CLI side effects | `init` and `add` rewrite parts of `globals.css` and `package.json`; `add chart` declares `recharts@3.8.0` | Run the CLI in its own task, diff `globals.css` and `package.json` afterwards, restore recharts 3.10.1, re-apply tokens |
| Namespace resets break unmigrated pages | `--color-*: initial`, `--text-*: initial` and `--radius-*: initial` remove the classes old pages still use; the build passes but those pages lose styling | Add the new tokens first beside the old ones; apply the resets only in the cleanup task after every page is migrated and the old-class search (check 11) is empty |
| tailwind-merge and custom sizes | Without the `extendTailwindMerge` config, `cn("text-text-secondary", "text-label")` silently drops the color | Configure `cn` in the token task; a unit test asserts both classes survive |
| Unlayered global rules | The transition and ring resets carry the CSS important flag; a future need for transform motion has to edit them | Documented in globals.css next to the rule; the brief bans such motion today |
| TanStack Table v9 | v9 changed the API (`useTable`, `tableFeatures`, `FlexRender`); fewer examples exist | Pinned 9.3.1, following the shadcn v9 data table guide; DataTable wraps all usage in one file |
| PNG export with CSS variables | A serialized SVG loses `var()` colors and the page font | `inlineComputedColors` before serializing; manual export check in both themes |
| Contrast of brief tokens | Borders on controls stay below 3:1 | Resolved by RQ-1 and RQ-2: light `positive` and `chart-3` changed (2.1, 2.6); borders kept with the mitigations in 2.6 |

Resolved questions (also recorded in the Decisions section of requirements.md):

- RQ-1, resolved: light `positive` changes from `#16a34a` (3.30:1) to `#15803d` (5.02:1 on surface). Dark positive unchanged.
- RQ-2, resolved: the brief border tokens (8% and 16%) stay with the mitigations in 2.6. `chart-3` becomes `#949499` light (3.02:1 on surface) and `#606068` dark (3.03:1 on surface), between chart-2 and the surface. To keep it distinct, light `chart-6` moves to `#5a5a62` (6.83:1) and dark `chart-5` to `#7f7f88` (4.75:1).

No open questions remain from the design phase.

