# Premium dashboard revamp: task brief

Source of truth for this spec. This is the user's request, copied verbatim, followed by orchestrator notes.
Every phase (requirements, design, tasks, implementation) must read this whole file.

## Orchestrator notes

1. The project uses a `src/` directory. Every path in the STRUCTURE section is relative to `src/` (for example `src/app/(dashboard)/layout.tsx`, `src/components/ui/`, `src/lib/nav.ts`, `src/types/`).
2. The screenshot the user mentions was NOT attached to the conversation. The LAYOUT section below describes it in detail; treat the LAYOUT section as the screenshot spec. List "screenshot not received" in the open questions.
3. This version of Next.js has breaking changes. Read the relevant guides in `node_modules/next/dist/docs/` before writing code (see AGENTS.md at the repo root).
4. Tailwind may be v4 (there is a `postcss.config.mjs` and possibly no `tailwind.config`). If so, "darkMode: class" means `@custom-variant dark (&:where(.dark, .dark *));` in globals.css. Confirm the installed version.
5. Skills live in `.agents/skills/` (better-ui, better-typography, better-colors, better-layout, better-accessibility, better-writing, better-interface) and in `C:\Users\nihal\.kiro\skills\` (interface-review, break, ui-design-system and others). Check each one exists before relying on it.
6. The user also invoked the `ui-design-system` skill (`C:\Users\nihal\.kiro\skills\ui-design-system\SKILL.md`). It conflicts with this brief in several places (it suggests shadows, an 8pt grid, Inter and Fira Code, a 1.25 type scale, fluid type, 44px touch targets, sm/md/lg control sizes). This brief wins. Record each conflict in the open questions.
7. Process gate: each spec file (requirements.md, design.md, tasks.md) is written in its own phase, then the user approves it before the next phase starts.
8. No en dash and no em dash in any file, including the spec files.

## User request (verbatim)

GOAL

Revamp the whole dashboard in this workspace to a premium design. Match the attached screenshot for the layout. The screenshot shows the dark theme. Build three themes: Light, Dark, and System. Keep our data, routes, and business logic. Change the UI layer and the file structure only.

WHAT PREMIUM MEANS (apply every rule)

1. Restraint: one accent color, flat surfaces, thin borders, no effects.
2. Hierarchy: each screen has one clear focus. Large values are the first thing to read. Labels are quiet.
3. Consistency: the same card, the same spacing, the same type scale on every page and in every theme.
4. Precision: aligned numbers, equal gaps, equal heights in each row, no orphan elements.
5. Calm: more white space than the screenshot. Do not pack the screen.

CURRENT PROBLEMS (confirm each one in the code first)

The current site looks fully vibe-coded. Remove every item below:

1. Violet gradients on backgrounds, buttons, cards, charts, and text.
2. Decorative effects: glow, blur blobs, glassmorphism, neon borders, pulse animations, sparkle icons.
3. En dashes and em dashes in UI text, labels, and comments.
4. Emoji used as icons.
5. Too many badges, chips, and colored tags on one screen.
6. Generic filler copy. Example: "Unlock insights", "Supercharge your workflow".
7. Large rounded corners and heavy shadows.
8. Inconsistent spacing, font sizes, and card styles between pages.
9. Large components that mix data, logic, and markup in one file.

REFERENCES (read before you plan)

1. Inspiration site: https://stride-dashboard-two.vercel.app/?ws=vantage-admin&tab=team
   Copy the layout ideas only. Do not copy its JavaScript structure.
2. Component library: https://github.com/shadcn-ui/ui
3. Dashboard template: https://github.com/shadcndashboard/next-shadcn-dashboard
   Reuse its layout shell, sidebar, theme setup, and chart patterns where they fit.
4. Design skills: https://github.com/jakubkrehel/skills
5. The attached screenshot.
6. Our current dashboard code in this workspace.

STACK

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts through the shadcn Chart component, TanStack Table, lucide-react, next-themes, and the geist package. Use the stack that already exists in the project when it differs. Add only the packages that you need.

SKILLS (use them for quality, our rules win)

1. Before you write design.md, read these skills: better-ui, better-typography, better-colors, better-layout, better-accessibility, better-writing.
2. Use them to check each decision in design.md. Add one line for each skill with the findings that you applied.
3. If a skill conflicts with the HARD BANS, the DESIGN TOKENS, or the STRUCTURE section of this prompt, follow this prompt. Write each conflict in the open questions list.
4. In the POLISH PASS, run interface-review on each page. Fix every finding of high or medium severity.
5. Use break on KpiCell, TeamTable, and TrendChart. Show each one in the loading, empty, error, long text, and many rows states. Fix each problem.
6. If a skill is not available in this workspace, say so in the open questions list. Do not invent its rules.

THEMES (Light, Dark, System)

1. Use next-themes with these options: attribute="class", defaultTheme="system", enableSystem, disableTransitionOnChange. Add suppressHydrationWarning to the html tag.
2. Set Tailwind darkMode to "class".
3. Define the tokens twice in globals.css: values for :root (light) and values for .dark. Component code never checks the theme. Components use the variables only.
4. Add a ThemeToggle in the top bar. Use a shadcn DropdownMenu with three items: Light, Dark, System. Show a 16px sun, moon, or monitor icon. Mark the active item with a check icon.
5. Save the choice. Follow the operating system setting when the choice is System. Update live when the operating system setting changes.
6. The page must not flash the wrong theme on load. Test with a hard refresh in each theme.
7. Charts, the donut chart, the sparklines, and the tooltips read colors from the CSS variables. They must change with the theme without a reload.
8. Every screen must look correct in both themes. Body text needs a contrast ratio of at least 4.5 to 1. Large values need at least 3 to 1.

HARD BANS

1. No gradients. Do not use bg-gradient-*, from-*, via-*, to-*, linear-gradient, radial-gradient, or bg-clip-text.
2. No glow, blur, or backdrop-filter effects.
3. No en dash and no em dash in any file. Use a hyphen, a colon, a comma, or a new sentence.
4. No emoji in the UI.
5. No decorative animation. No pulse, no bounce, no shimmer except the loading skeleton.
6. No box shadows. Use 1px borders. This rule also applies to the light theme.
7. No hard-coded colors in components. No "dark:" color classes in components. Use the variables.

After the work, run a search for each banned item. The result must show zero matches.

DESIGN TOKENS

Define every value as a CSS variable in globals.css.

Color, Dark theme (.dark):
- background: #0a0a0b
- surface (cards, sidebar): #111113
- surface-raised (menus, sheets, row hover): #151518
- border: white at 8% opacity
- border-strong (hover, focus): white at 16% opacity
- text-primary: #fafafa
- text-secondary: #a1a1aa
- text-muted: #71717a
- accent: #3b82f6
- positive: #22c55e
- negative: #ef4444
- chart-1: #3b82f6, chart-2: #a1a1aa, chart-3: #52525b
- grid line: white at 6% opacity

Color, Light theme (:root):
- background: #fafafa
- surface (cards, sidebar): #ffffff
- surface-raised (menus, sheets, row hover): #f4f4f5
- border: black at 8% opacity
- border-strong (hover, focus): black at 16% opacity
- text-primary: #09090b
- text-secondary: #52525b
- text-muted: #71717a
- accent: #2563eb
- positive: #16a34a
- negative: #dc2626
- chart-1: #2563eb, chart-2: #71717a, chart-3: #a1a1aa
- grid line: black at 6% opacity

Use the accent only for the active nav bar, the main chart line, progress bars, and focus rings. Use positive and negative for delta text only.

Typography:
- Fonts: Geist Sans for all text. Geist Mono for the clock and for table numbers. Load both with the geist package and next/font. Set them as the CSS variables --font-sans and --font-mono. Use no other font family.
- Page title: 20px, weight 600, letter spacing -0.01em.
- Card title: 14px, weight 500.
- Body and table: 13px, weight 400.
- Label: 11px, weight 500. Use uppercase only for the sidebar group names, with letter spacing 0.06em.
- KPI value: 30px, weight 600, letter spacing -0.02em.
- Use tabular numbers (font-variant-numeric: tabular-nums) for every number.
- Line height: 1.2 for values, 1.5 for body.

Icons:
1. Use lucide-react only for UI icons. Do not use another icon set for UI icons.
2. Import each icon by name. Example: import { House } from "lucide-react". Do not import the whole package.
3. Size: 16px in the sidebar, tables, buttons, and menus. 14px inside inputs and small controls. 20px only for empty states.
4. Stroke width: 1.5 for all icons. Set it once in a shared wrapper or with a CSS variable.
5. Color: use currentColor. Do not set a color on an icon directly.
6. Icon colors by state: default is text-secondary. Hover is text-primary. Active nav item is text-primary. Do not use the accent color on icons.
7. Every icon button has an aria-label. Icons that only decorate a text label have aria-hidden="true".
8. Put all sidebar icons in lib/nav.ts next to the route. Mapping: Home is House. Business is Briefcase. Customer insights is UsersRound. Processes is Workflow. Insights is Lightbulb. Numbers is Hash. Weekly numbers is CalendarDays. Weekly analysis is ChartLine. Subscriptions is Repeat. Projections is TrendingUp. Network is Network. Collections is Layers. Check each name against the installed version. Use the nearest icon if a name does not exist.
9. No emoji, no filled or colored icons, no sparkle or magic-wand icons.
10. Brand logos, if needed, come from simple-icons. Render them in one flat color.

Spacing and shape:
- Use a 4px scale only: 4, 8, 12, 16, 20, 24, 32, 48.
- Card padding: 20px. Gap between cards: 24px. Page padding: 32px.
- Radius: 8px for cards. 6px for controls. Do not use another radius.
- Control height: 32px for all buttons, selects, and toggles.

Motion:
- Allow only a 150ms ease-out transition on color, border color, and background color.
- Respect prefers-reduced-motion.

LAYOUT (match the screenshot)

1. Sidebar, 248px wide, fixed.
   - Top: logo square, product name, small subtitle.
   - Groups with uppercase muted labels: DASHBOARD, TEAM, PERFORMANCE, NETWORK. 24px between groups.
   - Each item is 36px high, with a 16px icon and a text label.
   - Active item: 2px accent bar on the left and a surface-raised background. Optional count on the right.
   - Use the shadcn Sidebar component. Collapse to icons below 1024px.
2. Top bar, 56px high, one bottom border.
   - Left: breadcrumb.
   - Right: live clock with timezone (Geist Mono), ThemeToggle, and a bell button.
3. Page header: title, one-line subtitle, date range Select, compare Select. 24px below the top bar.
4. Tabs under the header: My performance, My team, Upper leaders. Use the shadcn Tabs component with an underline style. The active tab has a 2px accent underline.
5. KPI strip: six cells in one bordered row with 1px dividers. Each cell has a label, a value, a delta, and the text "vs prior". Each cell has the same height and the same alignment.
6. Main grid: left column 70%, right column 30%. Cards in the same row have the same height.
   - Left top: "Performance trend" line chart. 3 series. Legend. Left axis for counts, right axis for percent. ToggleGroup for 4W, 8W, and 12W. 1.5px lines. No dots. Dashed grid. Tooltip with a surface-raised background and a 1px border.
   - Left bottom: "My team" table. Columns: name, MG1, share, efficiency, momentum, weeks, 26-week sparkline. Right-align the numbers. Row height: 52px. Sortable headers. Sticky header. Clickable rows that open a Sheet. Row hover: surface-raised background.
   - Right top: "Conversion pipeline". Four rows with label, value, percent, and a 4px progress bar.
   - Right middle: "Positive message by source". Donut chart with the total in the center. Legend with a flat dot, name, and percent.
   - Right bottom: "Top leaderboard". Ranked list with the rank number, name, and value. No crown icon.
7. Rank labels (EMERALD, EAGLE, PLATINUM) are plain muted text. Do not use colored badges.

STRUCTURE (fix the file layout)

- app/layout.tsx : fonts, ThemeProvider, html tag
- app/(dashboard)/layout.tsx : shell with sidebar and top bar
- app/(dashboard)/page.tsx : overview page. Compose components only.
- app/(dashboard)/[section]/page.tsx : one folder for each sidebar item
- components/ui/ : shadcn primitives only. Do not edit them by hand.
- components/layout/ : AppSidebar, TopBar, PageHeader, ThemeProvider, ThemeToggle
- components/dashboard/ : KpiStrip, KpiCell, TrendChart, TeamTable, PipelineCard, SourceDonut, Leaderboard
- components/shared/ : DeltaText, Sparkline, ProgressRow, EmptyState, ErrorState
- lib/data/ : all data access and mock data. One file for each domain.
- lib/format.ts : number, percent, and date formatters
- lib/nav.ts : sidebar items, icons, and routes
- types/ : shared TypeScript types

Rules:
1. One component per file. Maximum 150 lines for each file.
2. Components receive props. They do not fetch data.
3. Pages fetch data and pass it down.
4. Remove dead code, unused files, and unused packages.

COPY RULES

1. Write short, factual labels. Example: "Active subs", "Reporting rate".
2. No marketing language. No exclamation marks.
3. No dashes in text. Use a colon or a comma.
4. Use sentence case for all titles and labels.

DATA

1. Do not change the current API calls or the database.
2. Where data is missing, add typed mock data in lib/data/. Mark it with a TODO.

PROCESS (Spec mode)

1. Inspect the current dashboard. List every page, component, and data source.
2. Write requirements.md. Include the problem list above with the file where each problem occurs.
3. Write design.md. Include the token list for both themes, the component map, the skill findings, and the move plan for files.
4. Write tasks.md. Make each task small. Each task must build and run on its own.
5. Wait for my approval after each file.
6. After every task, run lint, type check, and build. Fix errors before the next task.
7. Build in this order: fonts, tokens for both themes, theme provider and toggle, layout shell, shared components, KPI strip, chart, table, side cards, other pages, polish.

POLISH PASS (last task)

1. Open each page in Light, Dark, and System at 1440px, 1280px, and 768px. Check for overflow, misalignment, and uneven card heights.
2. Switch the theme on each page. Check that nothing keeps the old colors. Check charts, tooltips, and the donut chart first.
3. Check text contrast in both themes.
4. Check that every gap is a value from the 4px scale.
5. Check that every number uses tabular figures and is right-aligned in tables.
6. Check that the accent color appears only in the places that the tokens allow.
7. Check the loading, empty, and error state of every card in both themes.
8. Run interface-review and break as described in the SKILLS section.
9. Fix each problem. Write the list of fixes.

STATES AND QUALITY

1. Add a skeleton, an empty state, and an error state for every card and for the table.
2. Add aria labels to icon buttons, including the ThemeToggle. Add visible focus rings (2px accent, 2px offset).
3. Design for 1280px and above first. Make 768px work. Stack the right column below the left column on narrow screens.
4. Do not add features that the screenshot does not show.

DONE WHEN

1. Each page matches the screenshot structure.
2. Light, Dark, and System all work. The page does not flash on load. Charts change with the theme.
3. The search for gradients, dashes, glow, blur, emoji, and shadows returns zero matches.
4. Lint, type check, and build pass with no errors.
5. No hard-coded colors, font sizes, or spacing values remain in components.
6. The file structure matches the STRUCTURE section.
7. You give me a list of the files that you changed and a list of open questions.

## Reference screenshot (described by the orchestrator)

The user shared the screenshot in chat after phase 1 started. Agents cannot see it, so this is a written description. It shows the inspiration site (stride-dashboard-two.vercel.app, "Vantage Admin"), dark theme, about 1024px wide inside a browser. Use it for structure only. Where it differs from the LAYOUT, DESIGN TOKENS or HARD BANS sections, the brief wins.

Sidebar
- Top: small square logo (bar chart mark), "Vantage Admin", subtitle "Management".
- Groups separated by a 1px horizontal border, uppercase muted labels.
- DASHBOARD: Home (active, count 241 on the right), Business, Customer insights, Processes, Insights.
- TEAM: Numbers, Customers, Processes, Insights, Collections.
- PERFORMANCE: Weekly numbers, Weekly analysis, Subscriptions, Projections.
- NETWORK: Network, Boardplan.
- Active item: thin accent bar on the left edge plus a raised background.
- Note: the screenshot's item list differs from the brief's 12-item icon mapping (TEAM repeats Processes and Insights, adds Customers; NETWORK adds Boardplan; Collections sits under TEAM). Our own routes decide the items. Map them into these four groups.

Top bar
- Left: sidebar collapse icon, breadcrumb "Home > Performance overview".
- Right: clock "12:28 GMT+5:30" in mono, bell icon button. No theme toggle in the screenshot; the brief adds one between clock and bell.

Page header
- Title "Performance overview", subtitle "Personal, team and leadership metrics".
- Right: Select "Last 4 weeks" with a calendar icon, Select "Compare to prior", then a separate calendar icon button.

Tabs
- My performance, My team (active), Upper leaders. Each has a small leading icon. In the screenshot the active tab is a filled pill. The brief requires an underline style with a 2px accent underline instead.

KPI strip (six cells, one bordered row, 1px dividers)
- Active subs 2,796, delta -0.5%
- New customers 197, delta -4.8%
- MGI 1,735, delta -1.2%
- Efficiency 28.38%, delta -1.8 pts
- Positive messages 6,113, delta +5.3%
- Reporting rate 61.07%, delta -0.5 pts
- Each cell: label top left, small icon in a bordered square top right, large value, then delta and "vs prior".
- In the screenshot deltas sit in red or green tinted pills. The brief requires plain colored delta text, no pill background. Percent metrics use "pts" for their delta.

Main grid
- Left column about 70%, right about 30%. In the screenshot the panels are full-bleed sections split by 1px lines with no gaps. The brief requires separate 8px-radius cards with 24px gaps and more white space.

Performance trend (left top)
- Legend: Customers, MGI, Efficiency. Left axis 0 to 750 (counts), right axis 0% to 45% (percent). X axis weekly dates (Jul 21 to Sep 14). ToggleGroup 4W, 8W (active), 12W top right.
- Lines are thin with no dots. The screenshot has a faint area fill under the main line; the brief bans that look, use lines only.

My team (left bottom)
- Title "My team", subtitle "13 legs, My team, click a row for details" (the screenshot separates these with a middle dot).
- Columns: Leg (name), MGI (sorted, descending arrow), Share, EFF, Momentum, Weeks, 26 weeks (sparkline).
- Name cell: name on line 1 ("Julio & Liz Vasquez") with rank label (EMERALD, EAGLE, PLATINUM) next to it, line 2 muted "55 people, 37 reporting". The screenshot shows rank labels as colored badges; the brief requires plain muted text.
- Example row: 316, 18%, 28.49%, +1%, 75%, sparkline. Momentum is colored positive or negative. Weeks is a percent.

Conversion pipeline (right top)
- Rows: Positive messages 6,113; MGI 1,735 with step conversion 28.38%; Follow up 2+ 591 with 34.06%; New customers 197 with 33.33%. Each row has label, value, percent and a thin progress bar.

Positive message by source (right middle)
- Donut with "6,113" and "Total" in the center. Legend: Walk-ins 46.7%, Referrals 29.1%, Campaigns 17.4%, Other 6.9%.
- Four segments, but the tokens define only chart-1 to chart-3. Design must resolve this (open question).

Top leaderboard (right bottom)
- Ranked rows: 1 Julio & Liz Vasquez, 2 Oscar & Nayrobi Grinan 306, 3 Ramon & Ana Castillo 247. The screenshot uses a crown for rank 1 and large boxed rank numbers. The brief requires a plain rank number, no crown.

Ignore
- A yellow sparkle at the top right and a blue round button at the bottom right are browser extension overlays, not part of the dashboard.

Naming note
- The screenshot reads "MGI". The brief says "MG1". Use whatever name our data and current UI use, and list it as an open question.

## User clarification (highest precedence, overrides anything above that conflicts)

The user said, in short: the dashboard works, but its design is vague and lacks hierarchy. Change the design only. Do not alter any content.

What this means for every phase:
1. Content stays exactly as it is today: every page, route, nav item and its order, metric, label wording, number, table column, chart series, data field and piece of business logic. The redesign changes how existing content looks and is arranged, not what it says or which data it shows.
2. The screenshot and the LAYOUT section are aesthetic and structural inspiration: a fixed sidebar with grouped nav, a slim top bar, a page header with filters, underline tabs, a bordered KPI strip with dividers, a 70/30 card grid, a trend chart, a dense data table with a detail Sheet, progress rows, a donut, a ranked list. Apply these patterns to the content we already have.
3. Where a LAYOUT element has a matching existing content block, restyle that block into the pattern. Where our content has no match for a LAYOUT element, do not invent content or new data for it. List it in the open questions instead. Where we have content the LAYOUT does not mention, keep it and give it the same card and type treatment.
4. Sidebar: use our existing nav items and labels exactly, grouped into DASHBOARD, TEAM, PERFORMANCE, NETWORK only if that grouping fits them. Use the brief's icon mapping for items that match by name.
5. Naming such as MGI vs MG1: use whatever our current UI shows.
6. Exception to rule 1: the HARD BANS and COPY RULES still apply. Remove en and em dashes, emoji and exclamation marks, and change title case to sentence case. Keep the words themselves. Do not rewrite meaning. Generic filler copy that exists only as decoration (for example "Unlock insights") may be removed, but list every removed string in requirements.md so the user can confirm.
7. The DATA section's "add typed mock data where missing" applies only when an existing UI element already needs data it lacks. It does not license new widgets.
8. The CURRENT PROBLEMS list describes our current dashboard, not the screenshot. The inspiration site is itself vibe-coded; copy only its calm structure, not its effects (gradient-free violet accents, tinted pills, colored badges, crown icon, area fill are all out).

## User reiteration (highest precedence, same level as "User clarification")

The prompt and the screenshot are inspiration for look and structure only. Content stays exactly the same: the entire sidebar (every section, every item, its label words, its order, its visibility rules, the "Open company" block and the "All companies" link) and every component and its content. Redesign the layout and visuals without altering any content.

## Approved decisions for requirements.md (user said: go with the recommendations)

Requirements are approved with these answers to the open questions:

- OQ-1: move the shell into `src/app/(dashboard)/layout.tsx`. It reads the company slug from the path on the client, and company name and periods come from a small per-group provider, so the header updates when switching companies.
- OQ-2: keep every URL. Each nav item keeps its folder under `c/[slug]/` or `(firm)/`. No single `[section]` segment.
- OQ-3: keep the existing "Data" and "Reports" sidebar sections exactly. Flat lists stay flat. No new group headings.
- OQ-4: give each nav item a distinct lucide icon (visual only, labels unchanged).
- OQ-5, OQ-7, OQ-8, OQ-10, OQ-11, OQ-13: omit nav counts, clock, bell, compare Select, calendar icon button, tab icons and KPI cell icons.
- OQ-6: breadcrumb uses existing text: company name then the current nav label, or the product name then the nav label on firm pages.
- OQ-9: period selector goes in the page header. Unit switch, Excel export, meeting mode and ThemeToggle go on the right of the top bar. User menu goes to the sidebar footer. Demo banner is one line above the page header.
- OQ-12: the 10 dashboard KPIs render as one bordered strip of two rows of five at 1280px and above, wrapping evenly below. Other pages keep their own counts.
- OQ-14: 70/30 grid only on Book to bank (table, waterfall) and Cash conversion (table, chart). Full-width cards with 24px gaps everywhere else, including the dashboard.
- OQ-15: negative amounts show in parentheses, for example (1,234), in text-primary. Values are unchanged.
- OQ-16: no row detail Sheets. Existing dialogs stay dialogs, restyled. TanStack Table only for interactive list tables (master data, ageing, users, audit). Statements stay plain semantic tables.
- OQ-17: add chart-4, chart-5, chart-6 per theme as neutral grey steps. chart-1 stays the only accent.
- OQ-18: keep positive and negative colors on the Book to bank waterfall and the "Biggest variances" chart, because they encode deltas.
- OQ-19: keep the area mode on the monthly trend with a flat, low-opacity fill (no gradient).
- OQ-20: replace en and em dashes in all of `src/` and in the spec files, including Excel output strings and `fyDisplay` (becomes "FY 2026-27"), and update the one test expectation. Root docs, `supabase/` and `scripts/` are out of scope.
- OQ-21: sentence case only for labels written in UI code, `lib/nav.ts` and `lib/report-tabs.ts`. Labels from the database, engines and export stay as they are. The words never change, only capitalization.
- OQ-22: the 150-line rule applies to pages, layouts and components. Generated types, data access, engines, ingest, export, demo dataset and server actions are excluded. Large UI editors (for example `branches-editor.tsx`, `template-editor.tsx`, `charts-board.tsx`, `company-card.tsx`) are split.
- OQ-23: round shapes allowed only for avatars, legend dots and the donut. Everything else is 8px (cards) or 6px (controls).
- OQ-24: inputs use 16px text on phone widths only to stop iOS zoom. 13px everywhere else.
- OQ-25: load Geist through the `geist` package and next/font.
- OQ-26: 32px controls accepted over the 44px touch target suggestion.
- OQ-29: keep a subtle pulse on the loading skeleton only, off under reduced motion.
- OQ-30: KEEP the login subtitle "Access your dashboard portal." No copy is removed anywhere.
- OQ-31: PipelineCard, Leaderboard, Sparkline and ProgressRow are not created.
- Component names follow content: KpiStrip, KpiCell, TrendChart, DataTable (instead of TeamTable), BreakdownDonut (instead of SourceDonut). The `break` skill runs on KpiCell, DataTable and TrendChart.
- The `state-machine` skill is added to the polish pass next to `break`, to render every state of each card and table in both themes on a throwaway page that is deleted afterwards.

## How the references are used (applies to every phase)

- shadcn/ui (github.com/shadcn-ui/ui): the building blocks. Add primitives with the shadcn CLI into `src/components/ui/` and never hand edit them: Sidebar, Breadcrumb, Tabs, Select, DropdownMenu, ToggleGroup, Table, Chart, Skeleton, Dialog, Button and others as needed. The design lives in `globals.css`: map the brief tokens onto shadcn variable names (`--background`, `--card`, `--popover`, `--border`, `--ring`, `--primary`, `--sidebar*`, `--chart-*`, `--radius`). Set Tailwind shadow tokens to none globally so primitives that ship small shadows render flat without editing them.
- next-shadcn-dashboard (github.com/shadcndashboard/next-shadcn-dashboard): a reference only, on the same stack (Next 16, Tailwind v4, shadcn, next-themes, Recharts). Study and follow its patterns for the route group shell layout, root layout with fonts and ThemeProvider, `globals.css` token organization for light and dark, and chart card and data table composition. Do not fork it, install it, or copy its demo apps, auth pages, editor, animated components or colors.
- jakubkrehel/skills (installed in `.agents/skills/` and `C:\Users\nihal\.kiro\skills\`, see `skills-lock.json`): quality checks. Design phase: better-ui, better-typography, better-colors, better-layout, better-accessibility, better-writing, one line per skill in design.md. Polish pass: interface-review on each page (fix high and medium findings), break and state-machine on KpiCell, DataTable and TrendChart. The brief wins over any skill; log conflicts as open questions.
- Inspiration site and screenshot: look and structure only. No code copied.

## Approved design decisions (user approved design.md)

- RQ-1: light theme positive changes from #16a34a to #15803d (5.02:1). Dark positive unchanged.
- RQ-2: keep the brief border tokens (8% and 16%) as they are, with the mitigations in design.md 2.6. Adjust chart-3 in each theme to the nearest grey that reaches 3:1 against the surface (darker in light, lighter in dark), keeping it visually between chart-2 and the surface.

## Build rules (user approved tasks.md)

- Work directly in the current checkout: c:\Users\nihal\Desktop\github\especia\especia-dash\especia-mis-dashboard-2.0. No worktree, no new branch.
- Git is read-only for this work. Never run git commit, branch, checkout, switch, stash, reset, restore, clean, merge, rebase or push. Allowed: git status, git diff, git ls-files, git log.
- Snapshot folder: `c:\Users\nihal\Desktop\github\especia\especia-dash\especia-mis-dashboard-2.0\.agents\tasks\premium-revamp-snapshots` (inside the workspace, already untracked). It replaces `$env:TEMP\especia-revamp` everywhere below. Exclude this folder from the untracked file lists and from any content checks.
- Rollback safety without commits: before task 1, save `git diff` and the list of untracked files to `$env:TEMP\especia-revamp\00-before.patch` and `00-untracked.txt`. After each task, save the cumulative `git diff` (plus `git diff --stat` and the untracked file list) to `$env:TEMP\especia-revamp\task-NN.patch`. Copy any new untracked files the task created into `$env:TEMP\especia-revamp\task-NN-files\` keeping their relative paths.
- Pre-existing uncommitted changes in `src/app/(dashboard)/c/[slug]/cash-conversion/ccc-table.tsx` and `src/app/(dashboard)/c/[slug]/charts/chart-frame.tsx` belong to the user. Keep their behavior when restyling or splitting those files.
- Pauses: after phase 2 (shell), after phase 7 (all card types), and at the end. Phase 8 page tasks may run in parallel in this checkout, but `npm run build` steps must run one at a time because they share `.next/`.
- Mark each task done in tasks.md (`- [x]`) when its gates and checks pass.
- shadcn `cn` import (orchestrator, after task 3): `cn@0.2.6` is only a transitive dependency of the `shadcn` CLI package. Do not add `cn` as a direct dependency. Every primitive in `src/components/ui/` must import `cn` from `@/lib/utils` (the components.json `utils` alias), so the extended tailwind-merge text-size config from design.md 2.3 applies everywhere. When adding primitives (task 5 onward), first check the generated import. If the CLI writes `from "cn"`, find a CLI or components.json option that makes it use the alias. If none exists, rewriting that single import line to `@/lib/utils` right after `shadcn add` is an allowed, mechanical exception to "never hand edit ui primitives". Record it in the task evidence and in the final report. Never install packages the CLI adds on its own (for example `tw-animate-css`) unless the design needs them.

## Faster build rules (user decision, from task 10 onward)

Tasks 1 to 9 keep the per-task review. From task 10 on, review happens per phase:
- Per task (coder only, no reviewer): implement the task, run `npm run lint` and `npx tsc --noEmit` (only the 4 baseline errors allowed), run `npm test` when `src/lib` is touched, open only the pages the task touched on the demo server in Light and Dark, save the patch snapshot, mark the task `- [x]`.
- End of each phase (one gate plus one reviewer): run `npm run build` (only the 4 baseline errors), `npm test`, `node scripts/demo-smoke.mjs`, and the full 30-page `capture.mjs compare`. Then one reviewer reviews every change in the phase against the tasks, requirements.md, design.md, the hard bans and the content rule. Findings are fixed and re-reviewed before the next phase starts.
- User pauses stay as before: after phase 7 and at the end.
- Phase 8 pages still run one at a time unless the user asks for parallel.

## Carry-forward fixes (orchestrator)

- From the task 7 review: the new AppSidebar lost the nav landmark. In task 9, wrap the sidebar menu in a `<nav>` with an accessible name (keep the old sidebar's name if it had one, otherwise "Main"), in `src/components/layout/`, without editing `src/components/ui/`. Fix the other non-blocking notes in `review-a-task.md` for task 7 too if they are quick and in scope. Otherwise list them for the polish pass.
