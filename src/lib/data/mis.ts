import "server-only";
import { cookies } from "next/headers";

import { BRANCH_SCOPE_COOKIE } from "@/lib/branch-scope-cookie";
import { PERIOD_COOKIE } from "@/lib/period-cookie";
import type { SegmentDef, TemplateLine } from "@/lib/mis/catalog";
import type { BudgetByKey } from "@/lib/mis/budget";
import { sameFy } from "@/lib/mis/period";
import { isDemoMode } from "@/lib/demo/mode";
import {
  getDemoAgeing,
  getDemoBudget,
  getDemoCompany,
  getDemoGpDashboardHtml,
  getDemoGpDashboardPeriods,
  getDemoLedgerMap,
  getDemoManualInputs,
  getDemoMasterEdits,
  getDemoMasterRows,
  getDemoPeriods,
  getDemoSegments,
  getDemoTemplateRows,
  isDemoCompanyId,
} from "@/lib/demo/repository";
import { createClient } from "@/lib/supabase/server";
import { fetchAllPages } from "./paging";
import type { LedgerMapEntry, ManualInputs, MasterRow, MasterRowScope } from "@/lib/mis/types";

// Server-side reads for the dashboard. Uses the user-context (anon) client; RLS
// allows read. No caching yet — the tool is internal and low-traffic, and
// upload → render must always show fresh data. (Add tagged caching in polish.)

/**
 * Read failures must be loud.
 *
 * These reads used to swallow their error and return an empty result, which
 * made an RLS denial indistinguishable from "nothing uploaded yet" — a blank
 * dashboard, HTTP 200, and no clue anywhere in the UI. With row-level security
 * on, that would turn every policy mistake into a phantom "the data vanished"
 * hunt. A missing ROW still returns null/[]; a failed QUERY now throws.
 */
function fail(fn: string, error: { message: string; code?: string }): never {
  throw new Error(`${fn}: ${error.message}${error.code ? ` [${error.code}]` : ""}`);
}

/**
 * Which company a read applies to.
 *
 * `companyId` is now REQUIRED in practice, even though the parameter stays
 * optional for signature compatibility: there used to be an implicit fallback
 * here to `activeCompanyId()`, reading a header `proxy.ts` injected on every
 * request. Proxy is gone (Next 16 locked it to the Node.js runtime, which this
 * app's Cloudflare host does not run), so every caller now resolves its own
 * companyId — via `getScopedCompany(slug)` — from its own `params` and passes
 * it in explicitly. A caller that forgets gets an empty result, not another
 * company's data — the safe direction to fail in.
 */
async function resolveCompanyId(companyId?: string): Promise<string | null> {
  return companyId ?? null;
}

export interface Company {
  id: string;
  slug: string;
  name: string;
  fy_start_month: number;
  cin: string | null;
  address: string | null;
  gst: string | null;
  pan: string | null;
  logo_url: string | null;
}

export interface Period {
  id: string;
  company_id: string;
  month: string;
  label: string;
  days_in_period: number | null;
  status: "draft" | "published";
}

export async function getCompany(companyId?: string): Promise<Company | null> {
  if (isDemoMode()) return getDemoCompany(companyId);
  const id = await resolveCompanyId(companyId);
  if (!id) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, slug, name, fy_start_month, cin, address, gst, pan, logo_url")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("getCompany", error);
  return data;
}

export async function getPeriods(companyId?: string): Promise<Period[]> {
  if (isDemoMode()) return isDemoCompanyId(companyId) ? getDemoPeriods() : [];
  const id = await resolveCompanyId(companyId);
  if (!id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("periods")
    .select("id, company_id, month, label, days_in_period, status")
    .eq("company_id", id)
    .order("month", { ascending: false });
  if (error) fail("getPeriods", error);
  // `status` is a CHECK constraint, which the type generator renders as plain
  // `string`. The DB guarantees the two values; assert once at the boundary
  // rather than loosening Period downstream.
  return (data ?? []) as Period[];
}

/** The most recent period for a company, or null when none uploaded yet. */
export async function getLatestPeriod(companyId?: string): Promise<Period | null> {
  return (await getPeriods(companyId))[0] ?? null;
}

/** The period chosen via the period-selector cookie, else the latest. */
export async function getSelectedPeriod(companyId?: string): Promise<Period | null> {
  const periods = await getPeriods(companyId);
  const id = (await cookies()).get(PERIOD_COOKIE)?.value;
  if (id) {
    const found = periods.find((p) => p.id === id);
    if (found) return found;
  }
  return periods[0] ?? null;
}

/**
 * A period's uploaded GP Dashboard — a self-contained HTML working file the
 * CA produces outside this app and uploads verbatim, shown in an iframe.
 * `null` when nothing has been uploaded for this period yet. RLS on
 * `periods` (see `periods_read`, 0002_auth_roles.sql) already scopes this
 * column exactly like every other one on the row, including hiding a draft
 * period's GP Dashboard from a `company`-role reader — no special-casing
 * needed here.
 */
export async function getGpDashboardHtml(periodId: string): Promise<string | null> {
  if (isDemoMode()) return getDemoGpDashboardHtml(periodId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("periods")
    .select("gp_dashboard_html")
    .eq("id", periodId)
    .maybeSingle();
  if (error) fail("getGpDashboardHtml", error);
  return data?.gp_dashboard_html ?? null;
}

/**
 * Every period that currently has a GP Dashboard uploaded — id/label only
 * (never the HTML itself, which can run into MBs), for the delete list on
 * the Upload page. Deleting a period already takes its GP Dashboard with
 * it for free (`gp_dashboard_html` is a column on that same row, not a
 * separate table) — this is for removing just the GP Dashboard while
 * keeping the rest of the period's data.
 */
export async function getPeriodsWithGpDashboard(
  companyId?: string,
): Promise<{ id: string; label: string }[]> {
  if (isDemoMode()) return isDemoCompanyId(companyId) ? getDemoGpDashboardPeriods() : [];
  const id = await resolveCompanyId(companyId);
  if (!id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("periods")
    .select("id, label")
    .eq("company_id", id)
    .not("gp_dashboard_html", "is", null)
    .order("month", { ascending: false });
  if (error) fail("getPeriodsWithGpDashboard", error);
  return data ?? [];
}

/** The period immediately before the given one (periods are sorted newest first). */
export async function getPriorPeriod(
  period: Period,
  companyId?: string,
): Promise<Period | null> {
  const periods = await getPeriods(companyId);
  const idx = periods.findIndex((p) => p.id === period.id);
  return idx >= 0 ? (periods[idx + 1] ?? null) : null;
}

/**
 * Every period in the same financial year as `period`, up to and including it,
 * oldest first — the columns of an FY-to-date report.
 *
 * The FY boundary comes from `companies.fy_start_month` (4 = April for Indian
 * FY), so selecting Jun'26 yields Apr, May, Jun and deliberately excludes
 * Mar'26: that month belongs to the previous financial year and summing it into
 * a YTD figure would be wrong.
 */
export async function getFyPeriods(
  period: Period,
  companyId?: string,
): Promise<Period[]> {
  const [periods, company] = await Promise.all([getPeriods(companyId), getCompany(companyId)]);
  const fyStart = company?.fy_start_month ?? 4;
  return periods
    .filter((p) => sameFy(p.month, period.month, fyStart) && p.month <= period.month)
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * `scope` defaults to `{ kind: "consolidated" }`, which applies NO
 * `branch_id` filter at all — for every existing single-branch company
 * (every row's `branch_id` is null) this is the exact same query as before
 * this parameter existed, and for a multi-branch company it's every
 * branch's rows summed together by the engine's own `groupIndex`/
 * `sumClosing` (reused across `pnl.ts`/`book-to-bank.ts`/`ccc.ts`), which
 * already sums every row sharing a `grouping` regardless of how many
 * `particulars` rows contribute. So "Consolidated" needs no separate
 * aggregation code path — it's just "don't filter."
 */
export async function getMasterRows(
  periodId: string,
  scope: MasterRowScope = { kind: "consolidated" },
  groupings?: string[],
): Promise<MasterRow[]> {
  if (isDemoMode()) return getDemoMasterRows(periodId).filter((row) => !groupings || groupings.includes(row.grouping));
  const supabase = await createClient();
  // PostgREST caps any single response at its configured max-rows (1000 by
  // default), silently truncating a larger result rather than erroring — so
  // a multi-branch company's period (14 branches x ~240 ledgers each, easily
  // 3000+ master_tb rows) would otherwise come back partial with no signal
  // anything was wrong. `fetchAllPages` reads every page (see its doc comment).
  const baseQuery = (withCount: boolean) => {
    let query = supabase
      .from("master_tb")
      .select("grouping, bs_pl, particulars, classification, opening, debit, credit, closing, unmapped", {
        count: withCount ? "exact" : undefined,
      })
      .eq("period_id", periodId);
    if (scope.kind === "branch") query = query.eq("branch_id", scope.branchId);
    else if (scope.kind === "group") query = query.in("branch_id", scope.branchIds);
    if (groupings) query = query.in("grouping", groupings);
    return query;
  };
  const rows = await fetchAllPages("getMasterRows", (from, to, withCount) =>
    baseQuery(withCount).order("id", { ascending: true }).range(from, to),
  );
  return rows.map((r) => ({
    grouping: r.grouping,
    bsPl: r.bs_pl as MasterRow["bsPl"],
    particulars: r.particulars,
    classification: r.classification,
    opening: Number(r.opening),
    debit: Number(r.debit),
    credit: Number(r.credit),
    closing: Number(r.closing),
    unmapped: r.unmapped || undefined,
  }));
}

/**
 * Every branch's rows and adjustments for ONE period, fetched in a couple of queries and then SLICED in memory.
 *
 * A branch comparison (the Charts tab, the P&L's Branch-wise view) used to run `getMasterRows` +
 * `getManualInputs` once per branch — 28 queries for Royal's 14 branches. This fetches the same data once
 * and hands back the slice for any set of branches. Order is preserved on purpose: a slice is the fetched
 * rows (ordered by id, exactly as a per-branch query orders them) filtered down, so the engine adds the
 * same numbers in the same order and gets the same totals as before.
 */
export interface BranchSlices {
  rowsFor(branchIds: string[]): MasterRow[];
  manualFor(branchIds: string[]): ManualInputs;
}

export async function getBranchSlices(periodId: string, branchIds: string[]): Promise<BranchSlices> {
  if (isDemoMode()) return { rowsFor: () => [], manualFor: () => ({}) };
  if (branchIds.length === 0) return { rowsFor: () => [], manualFor: () => ({}) };
  const supabase = await createClient();

  const [rows, manualRows] = await Promise.all([
    fetchAllPages("getBranchSlices(master_tb)", (from, to, withCount) =>
      supabase
        .from("master_tb")
        .select("grouping, bs_pl, particulars, classification, opening, debit, credit, closing, unmapped, branch_id", {
          count: withCount ? "exact" : undefined,
        })
        .eq("period_id", periodId)
        .in("branch_id", branchIds)
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages("getBranchSlices(manual_inputs)", (from, to, withCount) =>
      supabase
        .from("manual_inputs")
        .select("key, segment, value, branch_id", { count: withCount ? "exact" : undefined })
        .eq("period_id", periodId)
        .in("branch_id", branchIds)
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);

  return {
    rowsFor: (ids) => {
      const want = new Set(ids);
      return rows
        .filter((r) => r.branch_id != null && want.has(r.branch_id))
        .map((r) => ({
          grouping: r.grouping,
          bsPl: r.bs_pl as MasterRow["bsPl"],
          particulars: r.particulars,
          classification: r.classification,
          opening: Number(r.opening),
          debit: Number(r.debit),
          credit: Number(r.credit),
          closing: Number(r.closing),
          unmapped: r.unmapped || undefined,
        }));
    },
    manualFor: (ids) => {
      const want = new Set(ids);
      return rowsToManualInputs(manualRows.filter((r) => r.branch_id != null && want.has(r.branch_id)));
    },
  };
}

/** True when the period has at least one trial-balance row (one cheap query, no row transfer). */
export async function periodHasMasterRows(periodId: string): Promise<boolean> {
  if (isDemoMode()) return getDemoMasterRows(periodId).length > 0;
  const supabase = await createClient();
  const { data, error } = await supabase.from("master_tb").select("id").eq("period_id", periodId).limit(1);
  if (error) fail("periodHasMasterRows", error);
  return (data ?? []).length > 0;
}

export async function getLedgerMap(companyId?: string): Promise<LedgerMapEntry[]> {
  if (isDemoMode()) return isDemoCompanyId(companyId) ? getDemoLedgerMap() : [];
  const id = await resolveCompanyId(companyId);
  if (!id) return [];
  const supabase = await createClient();
  // Same PostgREST 1000-row cap `getMasterRows` above pages around — not yet
  // hit by any company's ledger count in practice, but the bulk mapping-
  // template feature specifically fetches a company's ENTIRE ledger roster,
  // so this is the right moment to close the gap pre-emptively rather than
  // wait for a company large enough to hit it silently.
  const PAGE_SIZE = 1000;
  const rows: { ledger_name: string; grouping: string; bs_pl: string; classification: string | null }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("ledger_map")
      .select("ledger_name, grouping, bs_pl, classification")
      .eq("company_id", id)
      .order("ledger_name", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) fail("getLedgerMap", error);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows.map((r) => ({
    ledger: r.ledger_name,
    grouping: r.grouping,
    bs_pl: r.bs_pl as LedgerMapEntry["bs_pl"],
    classification: r.classification,
  }));
}

/**
 * A company's MIS template — the ordered P&L/Segment/Book-to-Bank line list
 * the engine (`pnl.ts`/`segment.ts`/`book-to-bank.ts`/`ccc.ts`) computes
 * from, replacing what used to be catalog.ts's fixed constants.
 *
 * A brand-new company with zero rows gets zero lines here — every report
 * section (Revenue/COGS/...) still renders its header and its zero
 * subtotal, just with nothing under it, until the CA maps a ledger with a
 * Section (see the Mapping page) or adds a line directly on the Template
 * page. This USED TO fall back to `DEFAULT_TEMPLATE_LINES` (Tirupati's own
 * vehicle-dealership template) so a blank company was never rendered — but
 * that meant every new company's reports silently showed Tirupati's own
 * line labels (Vehicle Sales, Registration & Rto Fee, ...) reading zero,
 * which reads as real, configured lines rather than "nothing set up yet".
 * `DEFAULT_TEMPLATE_LINES` still exists as the Template page's own
 * clone-from-scratch seed (an explicit, visible starting point a CA opts
 * into), just never as a silent read-path fallback.
 */
export async function getMisTemplate(companyId?: string): Promise<TemplateLine[]> {
  return getMisTemplateRows(companyId);
}

/**
 * Raw template rows for THIS company, id included, never falling back to
 * Tirupati's defaults — for the template editor, which must show exactly
 * what this company's own rows are (including genuinely zero), since
 * `getMisTemplate`'s fallback would be actively misleading to *edit*:
 * saving a "default" row here would silently fork a copy of Tirupati's
 * template under this company rather than reflect "nothing configured yet".
 */
export async function getMisTemplateRows(
  companyId?: string,
): Promise<(TemplateLine & { id: string })[]> {
  if (isDemoMode()) return isDemoCompanyId(companyId) ? getDemoTemplateRows() : [];
  const id = await resolveCompanyId(companyId);
  if (!id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mis_template_lines")
    .select("id, section, sort_order, kind, key, label, grouping, manual_key, fallback_grouping, negate")
    .eq("company_id", id)
    .order("section", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) fail("getMisTemplateRows", error);
  return (data ?? []).map((r) => ({
    id: r.id,
    section: r.section as TemplateLine["section"],
    sortOrder: r.sort_order,
    kind: r.kind as TemplateLine["kind"],
    key: r.key,
    label: r.label,
    grouping: r.grouping ?? undefined,
    manualKey: r.manual_key ?? undefined,
    fallbackGrouping: r.fallback_grouping ?? undefined,
    negate: r.negate,
  }));
}

/**
 * A company's segment definitions — see `getMisTemplate`'s fallback note.
 * `id` is included (harmless for engine callers, which only read the
 * `SegmentDef` fields) so the template editor can reference specific rows
 * for edit/delete/reorder without a second query.
 */
export async function getMisSegments(companyId?: string): Promise<(SegmentDef & { id: string })[]> {
  if (isDemoMode()) return isDemoCompanyId(companyId) ? getDemoSegments() : [];
  const id = await resolveCompanyId(companyId);
  if (!id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mis_segments")
    .select("id, key, label, sort_order, revenue_grouping, revenue_manual_key, revenue_fallback_grouping, purchase_groupings")
    .eq("company_id", id)
    .order("sort_order", { ascending: true });
  if (error) fail("getMisSegments", error);
  if (!data) return [];
  // A company can legitimately configure zero segments (Segment P&L doesn't
  // apply to its business) — an empty array here is meaningful, not "not
  // configured yet", so no fallback-to-default on length 0 like the template.
  return data.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    sortOrder: r.sort_order,
    revenueGrouping: r.revenue_grouping ?? undefined,
    revenueManualKey: r.revenue_manual_key ?? undefined,
    revenueFallbackGrouping: r.revenue_fallback_grouping ?? undefined,
    purchaseGroupings: r.purchase_groupings ?? [],
  }));
}

export interface BranchGroup {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
}

export interface Branch {
  id: string;
  groupId: string | null;
  key: string;
  label: string;
  sortOrder: number;
  archivedAt: string | null;
}

/**
 * A company's channel/region rollup groups (e.g. Royal Enterprise's B2C/
 * B2B) — empty for the common case of a company with no such layer, which
 * is meaningful, not "not configured yet" (same reasoning as
 * `getMisSegments`'s zero-segments case): the "group" scope depth just
 * shows nothing beyond Consolidated when this is empty, no fallback needed.
 */
export async function getBranchGroups(companyId?: string): Promise<BranchGroup[]> {
  if (isDemoMode()) return [];
  const id = await resolveCompanyId(companyId);
  if (!id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branch_groups")
    .select("id, key, label, sort_order")
    .eq("company_id", id)
    .order("sort_order", { ascending: true });
  if (error) fail("getBranchGroups", error);
  return (data ?? []).map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    sortOrder: r.sort_order,
  }));
}

/**
 * A company's Tally branch roster. Empty for the common (single-branch)
 * case — every report page hides its scope selector entirely when this is
 * empty, so an existing company never even mounts branch-aware UI.
 */
export async function getBranches(companyId?: string): Promise<Branch[]> {
  if (isDemoMode()) return [];
  const id = await resolveCompanyId(companyId);
  if (!id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, group_id, key, label, sort_order, archived_at")
    .eq("company_id", id)
    .order("sort_order", { ascending: true });
  if (error) fail("getBranches", error);
  return (data ?? []).map((r) => ({
    id: r.id,
    groupId: r.group_id,
    key: r.key,
    label: r.label,
    sortOrder: r.sort_order,
    archivedAt: r.archived_at,
  }));
}

/** The 4 report types a company can independently configure a scope depth for. */
export type ReportKind = "pnl" | "book_to_bank" | "ccc" | "segment";
export type ScopeDepth = "consolidated" | "group" | "branch";
const REPORT_KINDS: ReportKind[] = ["pnl", "book_to_bank", "ccc", "segment"];
const DEPTH_RANK: Record<ScopeDepth, number> = { consolidated: 0, group: 1, branch: 2 };

/**
 * Per-report scope depth for a company — how far that report's on-screen
 * selector and Excel export are allowed to go. Missing rows (the default,
 * common state — a brand-new company or one that's never opted a report
 * into more depth) read as `'consolidated'`, reproducing today's exact
 * behavior for every report on every company until a CA explicitly widens
 * one on the Branches admin page.
 */
export async function getReportScopeConfig(companyId?: string): Promise<Record<ReportKind, ScopeDepth>> {
  const defaults: Record<ReportKind, ScopeDepth> = {
    pnl: "consolidated",
    book_to_bank: "consolidated",
    ccc: "consolidated",
    segment: "consolidated",
  };
  if (isDemoMode()) return defaults;
  const id = await resolveCompanyId(companyId);
  if (!id) return defaults;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_scope_config")
    .select("report, scope_depth")
    .eq("company_id", id);
  if (error) fail("getReportScopeConfig", error);
  const result = { ...defaults };
  for (const r of data ?? []) {
    if (REPORT_KINDS.includes(r.report as ReportKind)) {
      result[r.report as ReportKind] = r.scope_depth as ScopeDepth;
    }
  }
  return result;
}

/** The cookie's decoded value — mirrors getSelectedPeriod's cookie read. */
export type BranchScopeSelection =
  | { kind: "consolidated" }
  | { kind: "branch"; branchId: string }
  | { kind: "group"; groupId: string };

/**
 * Reads the selected branch scope and validates it against the company's
 * ACTUAL branches/groups (an id from a stale value — a deleted/archived
 * branch, a different company entirely — falls back to Consolidated
 * rather than erroring or silently matching nothing).
 *
 * `override` — a report page's own `?scope=` query param — takes priority
 * over the `mis_branch_scope` cookie when present. This is what lets a
 * per-channel report tab (`/pnl?scope=group:<id>`) be a real, bookmarkable,
 * back-button-correct URL rather than depending on browser-local cookie
 * state: the URL is authoritative when given, the cookie is only the
 * remembered default for a plain, query-less page load (same role the
 * period cookie already plays elsewhere). A stale/foreign override id
 * degrades to Consolidated exactly like a stale cookie does — including
 * one left over from a channel group that's since been deleted.
 */
export async function getSelectedBranchScope(
  branches: Branch[],
  groups: BranchGroup[],
  override?: string | null,
): Promise<BranchScopeSelection> {
  const raw = override ?? (await cookies()).get(BRANCH_SCOPE_COOKIE)?.value;
  if (raw?.startsWith("branch:")) {
    const id = raw.slice("branch:".length);
    if (branches.some((b) => b.id === id && !b.archivedAt)) return { kind: "branch", branchId: id };
  } else if (raw?.startsWith("group:")) {
    const id = raw.slice("group:".length);
    if (groups.some((g) => g.id === id)) return { kind: "group", groupId: id };
  }
  return { kind: "consolidated" };
}

/**
 * Enforces `report_scope_config`'s `scope_depth` server-side, not just by
 * hiding the disallowed options in the selector — defense in depth against
 * a cookie set while viewing a deeper report and then carried over to a
 * shallower one (e.g. Book to Bank is Consolidated-only on both real
 * reference companies; a `branch:<id>` cookie left over from P&L must not
 * leak a per-branch Book to Bank figure).
 */
function clampToScopeDepth(selection: BranchScopeSelection, depth: ScopeDepth): BranchScopeSelection {
  if (depth === "consolidated") return { kind: "consolidated" };
  if (depth === "group" && selection.kind === "branch") return { kind: "consolidated" };
  return selection;
}

/** Turns a validated selection into what `getMasterRows` actually filters by. */
function resolveMasterRowScope(selection: BranchScopeSelection, branches: Branch[]): MasterRowScope {
  if (selection.kind === "branch") return { kind: "branch", branchId: selection.branchId };
  if (selection.kind === "group") {
    return {
      kind: "group",
      branchIds: branches.filter((b) => b.groupId === selection.groupId).map((b) => b.id),
    };
  }
  return { kind: "consolidated" };
}

/** The exact string `BranchScopeSelector`/the `mis_branch_scope` cookie use. */
function encodeBranchScope(selection: BranchScopeSelection): string {
  if (selection.kind === "branch") return `branch:${selection.branchId}`;
  if (selection.kind === "group") return `group:${selection.groupId}`;
  return "consolidated";
}

/**
 * One call for a report page to get everything it needs for branch scoping:
 * this company's branches/groups (for a selector to render, and hidden
 * entirely when `branches` is empty — every existing company today), the
 * effective scope depth, the resolved `MasterRowScope` to pass into
 * `getMasterRows`, and `current` — the encoded string a `BranchScopeSelector`
 * on that page renders as selected.
 *
 * `reports` takes more than one report kind for a page that combines
 * several into one view (the Dashboard shows P&L-, Book-to-Bank- and
 * CCC-derived figures side by side from ONE shared row fetch per month) —
 * the effective depth is the MOST RESTRICTIVE of the given reports' own
 * configured depths, since a shared fetch can't honor a deeper scope than
 * the shallowest report sharing it allows.
 *
 * `scopeOverride` is a report page's own `?scope=` query param, forwarded
 * straight to `getSelectedBranchScope` — see its doc comment. Optional and
 * last, so every existing caller (none of which pass it yet) is unaffected.
 */
export async function getReportScope(
  companyId: string | undefined,
  reports: ReportKind | ReportKind[],
  scopeOverride?: string | null,
): Promise<{
  branches: Branch[];
  branchGroups: BranchGroup[];
  depth: ScopeDepth;
  scope: MasterRowScope;
  current: string;
}> {
  const keys = Array.isArray(reports) ? reports : [reports];
  const [branches, branchGroups, config] = await Promise.all([
    getBranches(companyId),
    getBranchGroups(companyId),
    getReportScopeConfig(companyId),
  ]);
  const depth = keys
    .map((k) => config[k])
    .reduce((min, d) => (DEPTH_RANK[d] < DEPTH_RANK[min] ? d : min));
  const selection = clampToScopeDepth(
    await getSelectedBranchScope(branches, branchGroups, scopeOverride),
    depth,
  );
  const scope = resolveMasterRowScope(selection, branches);
  return { branches, branchGroups, depth, scope, current: encodeBranchScope(selection) };
}

/**
 * Scope resolution for the Charts tab. Unlike `getReportScope` this is NOT
 * clamped by `report_scope_config` — charts are a cross-report view, and a
 * branch comparison should work for any company that has branches, whatever
 * depth its P&L happens to be configured at. The scope comes from the URL
 * only (never the remembered cookie), so the page's own filter pills always
 * agree with what's on screen.
 */
export async function getChartScope(
  companyId: string | undefined,
  scopeParam?: string | null,
): Promise<{ branches: Branch[]; branchGroups: BranchGroup[]; scope: MasterRowScope; current: string }> {
  const [branches, branchGroups] = await Promise.all([getBranches(companyId), getBranchGroups(companyId)]);
  const selection = await getSelectedBranchScope(branches, branchGroups, scopeParam ?? "consolidated");
  return {
    branches,
    branchGroups,
    scope: resolveMasterRowScope(selection, branches),
    current: encodeBranchScope(selection),
  };
}

/**
 * `scope` defaults to `{ kind: "consolidated" }`, applying no `branch_id`
 * filter — for a single-branch company (every row's `branch_id` is null)
 * this is the same query as before this parameter existed. For a
 * multi-branch company, Consolidated correctly SUMS every branch's own
 * entered figure (see `rowsToManualInputs`) — matching how a CA actually
 * tracks a figure like Closing Stock in practice: per branch, with the
 * company-wide total being their sum (confirmed directly against
 * CityVibes' own real reference workbook, which tracks Closing Stock
 * separately per branch too).
 */
export async function getManualInputs(
  periodId: string,
  scope: MasterRowScope = { kind: "consolidated" },
): Promise<ManualInputs> {
  if (isDemoMode()) return getDemoManualInputs(periodId);
  const supabase = await createClient();
  let query = supabase.from("manual_inputs").select("key, segment, value").eq("period_id", periodId);
  if (scope.kind === "branch") query = query.eq("branch_id", scope.branchId);
  else if (scope.kind === "group") query = query.in("branch_id", scope.branchIds);
  const { data, error } = await query;
  if (error) fail("getManualInputs", error);
  return rowsToManualInputs(data ?? []);
}

/**
 * Reassemble the flat manual_inputs key/segment/value rows into ManualInputs.
 * No fixed segment-key list here — `manual_inputs.segment` is already free
 * text, so this just collects whatever keys actually have rows. A segment
 * missing from the result reads as 0 downstream (`segment.ts` does
 * `values[key] ?? 0`), so there's nothing to zero-fill.
 *
 * SUMS when more than one row shares a (key, segment) — a no-op for the
 * common single-branch case (at most one row per key ever exists there),
 * but exactly what a Consolidated/group scope needs: multiple branches'
 * own entered figures added together, not the last one processed winning.
 */
export function rowsToManualInputs(
  rows: { key: string; segment: string; value: number }[],
): ManualInputs {
  const mi: ManualInputs = {};
  let segOpen: Record<string, number> | undefined;
  let segClose: Record<string, number> | undefined;
  for (const r of rows) {
    const value = Number(r.value);
    if (r.segment) {
      const bucket = r.key === "segmentOpeningStock" ? (segOpen ??= {}) : (segClose ??= {});
      bucket[r.segment] = (bucket[r.segment] ?? 0) + value;
    } else {
      const acc = mi as Record<string, number>;
      acc[r.key] = (acc[r.key] ?? 0) + value;
    }
  }
  if (segOpen) mi.segmentOpeningStock = segOpen;
  if (segClose) mi.segmentClosingStock = segClose;
  return mi;
}

/**
 * Budget figures for one period — a flat `{key: amount}` bag, companion to
 * `getManualInputs`. Consolidated-only (no branch dimension, unlike
 * `manual_inputs`): `mis_budgets` deliberately has no `branch_id` column —
 * see `0016_mis_budgets.sql`.
 */
export async function getBudget(periodId: string): Promise<BudgetByKey> {
  if (isDemoMode()) return getDemoBudget(periodId);
  const supabase = await createClient();
  const { data, error } = await supabase.from("mis_budgets").select("key, amount").eq("period_id", periodId);
  if (error) fail("getBudget", error);
  const budget: BudgetByKey = {};
  for (const r of data ?? []) budget[r.key] = Number(r.amount);
  return budget;
}

export interface AgeingEntry {
  party: string;
  b0_30: number;
  b30_60: number;
  b60_90: number;
  b90_180: number;
  b180_plus: number;
  total: number;
}

/**
 * One side of a period's debtor/creditor ageing, largest outstanding first.
 * RLS scopes this to periods the caller may see, so a company user gets their
 * own published months only.
 */
export async function getAgeing(
  periodId: string,
  kind: "debtor" | "creditor",
): Promise<AgeingEntry[]> {
  if (isDemoMode()) return getDemoAgeing(periodId, kind);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ageing")
    .select("party, b0_30, b30_60, b60_90, b90_180, b180_plus, total")
    .eq("period_id", periodId)
    .eq("kind", kind)
    .order("total", { ascending: false });
  if (error) fail("getAgeing", error);
  return data ?? [];
}

export interface MasterEdit {
  particulars: string;
  field: "opening" | "debit" | "credit" | "closing";
  old_value: number;
  new_value: number;
  edited_at: string;
  editor: string | null;
  /** Which branch this edit applied to — null for a legacy single-branch period. */
  branchLabel: string | null;
}

/**
 * Manual edits for a period, newest first. RLS keeps this to staff — a company
 * user never sees the preparation trail.
 *
 * Joins `branches` so a multi-branch company's history can tell apart two
 * edits that share a `particulars` value (e.g. two branches' own "Capital
 * Account" row) — without it the panel would show two indistinguishable
 * rows.
 */
export async function getMasterEdits(periodId: string): Promise<MasterEdit[]> {
  if (isDemoMode()) return getDemoMasterEdits(periodId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_tb_edits")
    .select("particulars, field, old_value, new_value, edited_at, profiles(name, email), branches(label)")
    .eq("period_id", periodId)
    .order("edited_at", { ascending: false });
  if (error) fail("getMasterEdits", error);

  return (data ?? []).map((e) => {
    const p = e.profiles as { name: string | null; email: string | null } | null;
    const b = e.branches as { label: string | null } | null;
    return {
      particulars: e.particulars,
      field: e.field as MasterEdit["field"],
      old_value: Number(e.old_value),
      new_value: Number(e.new_value),
      edited_at: e.edited_at,
      branchLabel: b?.label ?? null,
      editor: p?.name ?? p?.email ?? null,
    };
  });
}
