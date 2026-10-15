import "server-only";

import type { TemplateLine } from "@/lib/mis/catalog";
import { computePnl } from "@/lib/mis/pnl";
import type { MasterRow } from "@/lib/mis/types";
import { getDemoCompanyCard } from "@/lib/demo/repository";
import { isDemoMode } from "@/lib/demo/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { listCompanies } from "./company-context";
import { periodHasMasterRows, rowsToManualInputs, type Period } from "./mis";
import { fetchAllPages } from "./paging";

export interface CompanyCard {
  id: string;
  slug: string;
  name: string;
  group: string;
  logoUrl: string | null;
  archivedAt: string | null;
  fyStartMonth: number;
  pan: string | null;
  gst: string | null;
  cin: string | null;
  address: string | null;
  /** Newest period on file, published or not, null before the first upload. */
  latest: Period | null;
  /** Revenue for `latest`, or null when there is nothing to compute from. */
  revenue: number | null;
  /** Whose desk this client sits on. Empty when nobody is assigned yet. */
  managers: string[];
  /** Months still in draft, the Review Queue's workload for this client. */
  drafts: number;
  updatedAt: string | null;
}

/**
 * One card per client the caller can see, for the Companies grid.
 *
 * Revenue is computed rather than stored: it comes from the same `computePnl`
 * the P&L page and the Excel export use, so a headline figure on a card can
 * never drift from the statement it summarises. That costs a trial-balance read
 * per company, which is why only the LATEST period is priced, not the year.
 *
 * `includeArchived` is for the admin-only "Archived companies" section -
 * everywhere else calls this with no argument, matching `listCompanies`'s own
 * default of excluding archived companies.
 */
export async function getCompanyCards(includeArchived = false): Promise<CompanyCard[]> {
  if (isDemoMode()) return [getDemoCompanyCard()];
  const companies = await listCompanies(includeArchived);
  if (companies.length === 0) return [];

  const admin = createAdminClient();
  const ids = companies.map((c) => c.id);

  // Assignments in one round trip rather than per card.
  const { data: links, error: linkErr } = await admin
    .from("ca_companies")
    .select("company_id, profiles!ca_companies_ca_id_fkey(name, email)")
    .in("company_id", ids);
  if (linkErr) throw new Error(`getCompanyCards(assignments): ${linkErr.message}`);

  const managersBy = new Map<string, string[]>();
  for (const l of links ?? []) {
    const p = l.profiles as { name: string | null; email: string | null } | null;
    const label = p?.name || p?.email;
    if (!label) continue;
    managersBy.set(l.company_id, [...(managersBy.get(l.company_id) ?? []), label]);
  }

  // The registration-detail fields the Edit form needs, beyond what
  // `listCompanies` already carries for the switcher/grid, one extra round
  // trip rather than widening `CompanySummary` for every caller of it.
  const { data: details, error: detailErr } = await admin
    .from("companies")
    .select("id, fy_start_month, pan, gst, cin, address")
    .in("id", ids);
  if (detailErr) throw new Error(`getCompanyCards(details): ${detailErr.message}`);
  const detailsById = new Map((details ?? []).map((d) => [d.id, d]));

  // Everything the cards need is read in a handful of queries for ALL companies at once, periods, template
  // lines, the latest months' adjustments and the latest months' revenue rows, and then split per company in
  // memory. (This used to be ~5 queries per company, so ~30 for the six-company grid; the free worker plan
  // caps a request at 50 outside calls, and every one of them costs latency.) Same user-context client as the
  // per-company readers, so exactly the same row-level security applies.
  const supabase = await createClient();
  const [periodRes, templateRes] = await Promise.all([
    supabase
      .from("periods")
      .select("id, company_id, month, label, days_in_period, status")
      .in("company_id", ids)
      .order("month", { ascending: false }),
    supabase
      .from("mis_template_lines")
      .select("company_id, section, sort_order, kind, key, label, grouping, manual_key, fallback_grouping, negate")
      .in("company_id", ids)
      .order("section", { ascending: true })
      .order("sort_order", { ascending: true }),
  ]);
  if (periodRes.error) throw new Error(`getCompanyCards(periods): ${periodRes.error.message}`);
  if (templateRes.error) throw new Error(`getCompanyCards(template): ${templateRes.error.message}`);

  const periodsBy = new Map<string, Period[]>(); // each list newest first
  for (const p of (periodRes.data ?? []) as Period[]) periodsBy.set(p.company_id, [...(periodsBy.get(p.company_id) ?? []), p]);
  const templateBy = new Map<string, TemplateLine[]>();
  for (const r of templateRes.data ?? []) {
    const line: TemplateLine = {
      section: r.section as TemplateLine["section"],
      sortOrder: r.sort_order,
      kind: r.kind as TemplateLine["kind"],
      key: r.key,
      label: r.label,
      grouping: r.grouping ?? undefined,
      manualKey: r.manual_key ?? undefined,
      fallbackGrouping: r.fallback_grouping ?? undefined,
      negate: r.negate,
    };
    templateBy.set(r.company_id, [...(templateBy.get(r.company_id) ?? []), line]);
  }

  // Revenue is the sum of the template's revenue lines, and each line reads one grouping, so only those
  // groupings' rows are fetched, not the whole trial balance (Royal alone is 3,000+ rows). computePnl sums by
  // grouping, so the revenue it returns is unchanged.
  const revenueGroupingsOf = (companyId: string) =>
    new Set(
      (templateBy.get(companyId) ?? [])
        .filter((l) => l.section === "revenue")
        .flatMap((l) => [l.grouping, l.fallbackGrouping])
        .filter((g): g is string => Boolean(g)),
    );
  const latestIds = companies.map((c) => periodsBy.get(c.id)?.[0]?.id).filter((id): id is string => Boolean(id));
  const allGroupings = [...new Set(companies.flatMap((c) => [...revenueGroupingsOf(c.id)]))];

  const [manualRes, revenueRows] =
    latestIds.length === 0
      ? [{ data: [], error: null }, []]
      : await Promise.all([
          supabase.from("manual_inputs").select("key, segment, value, period_id").in("period_id", latestIds),
          fetchAllPages("getCompanyCards(revenue rows)", (from, to, withCount) =>
            supabase
              .from("master_tb")
              .select("grouping, bs_pl, particulars, classification, opening, debit, credit, closing, period_id", {
                count: withCount ? "exact" : undefined,
              })
              .in("period_id", latestIds)
              .in("grouping", allGroupings)
              .order("id", { ascending: true })
              .range(from, to),
          ),
        ]);
  if (manualRes.error) throw new Error(`getCompanyCards(manual): ${manualRes.error.message}`);

  return Promise.all(
    companies.map(async (c) => {
      const periods = periodsBy.get(c.id) ?? []; // newest first
      const latest = periods[0] ?? null;

      let revenue: number | null = null;
      if (latest) {
        const template = templateBy.get(c.id) ?? [];
        const mine = revenueGroupingsOf(c.id);
        const rows: MasterRow[] = revenueRows
          .filter((r) => r.period_id === latest.id && mine.has(r.grouping))
          .map((r) => ({
            grouping: r.grouping,
            bsPl: r.bs_pl as MasterRow["bsPl"],
            particulars: r.particulars,
            classification: r.classification,
            opening: Number(r.opening),
            debit: Number(r.debit),
            credit: Number(r.credit),
            closing: Number(r.closing),
          }));
        const manual = rowsToManualInputs((manualRes.data ?? []).filter((m) => m.period_id === latest.id));
        // No trial balance rows means nothing was ever ingested for the month.
        // Reporting 0 there would read as "this client billed nothing", so the
        // card shows a dash instead.
        const ingested = rows.length > 0 || (await periodHasMasterRows(latest.id));
        revenue = ingested ? computePnl(rows, manual, template).totals.revenue : null;
      }

      const detail = detailsById.get(c.id);
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        group: c.group_name ?? c.name,
        logoUrl: c.logo_url,
        archivedAt: c.archived_at,
        fyStartMonth: detail?.fy_start_month ?? 4,
        pan: detail?.pan ?? null,
        gst: detail?.gst ?? null,
        cin: detail?.cin ?? null,
        address: detail?.address ?? null,
        latest,
        revenue,
        managers: managersBy.get(c.id) ?? [],
        drafts: periods.filter((p) => p.status === "draft").length,
        updatedAt: latest?.month ?? null,
      };
    }),
  );
}
