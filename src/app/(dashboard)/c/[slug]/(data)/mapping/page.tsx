import Link from "next/link";

import { DEFAULT_GROUPING, UNIVERSAL_NO_TEMPLATE_GROUPINGS } from "@/lib/mis/catalog";
import { getSelectedPeriod, getLedgerMap, getMasterRows, getMisTemplate } from "@/lib/data/mis";
import { activeCompanyId } from "@/lib/data/company-context";
import { plural } from "@/lib/format";
import { scopedLink } from "@/lib/data/scoped-link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";

import { MappingManager, type MapEntry, type UnmappedLedger } from "./mapping-editor";

export const metadata = { title: "Mapping" };

export default async function MappingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const scoped = await scopedLink(slug);
  const companyId = await activeCompanyId(slug);
  const [map, template] = await Promise.all([
    getLedgerMap(companyId ?? undefined),
    getMisTemplate(companyId ?? undefined),
  ]);
  const period = await getSelectedPeriod(companyId ?? undefined);
  const rows = period ? await getMasterRows(period.id) : [];

  const entries: MapEntry[] = map
    .map((e) => ({
      ledger: e.ledger,
      grouping: e.grouping,
      bsPl: e.bs_pl,
      classification: e.classification ?? null,
    }))
    .sort((a, b) => a.ledger.localeCompare(b.ledger));

  // Deduped by ledger name: a multi-branch company's master_tb carries one
  // row PER BRANCH for the same ledger, but ledger_map (and this whole page)
  // maps by ledger name alone, company-wide — the same unmapped ledger from
  // 14 branches is one mapping decision, not 14. Without this, the list (and
  // the React key each row renders with) repeats the same ledger name once
  // per branch it appears unmapped in.
  const seenUnmapped = new Set<string>();
  const unmapped: UnmappedLedger[] = rows
    .filter((r) => r.unmapped && !seenUnmapped.has(r.particulars) && seenUnmapped.add(r.particulars))
    .map((r) => ({ ledger: r.particulars, classification: r.classification, suggestion: DEFAULT_GROUPING }));

  // Every grouping this company's own template actually expects — the
  // suggestion list a brand-new company sees is otherwise built ONLY from
  // its own (initially empty) ledger_map, which means the first-ever upload
  // gives a CA no autocomplete at all and no validation against what the
  // engine will actually recognise.
  const templateGroupings = new Set(
    template
      .map((l) => (l.kind === "manual" ? l.fallbackGrouping : l.grouping))
      .filter((g): g is string => Boolean(g)),
  );
  // The 7 universal groupings (Capital A/c, Unsecured Loans, Fixed Assets,
  // Sundry Creditors/Debtors, Opening Stock, Cash/Bank/OD) are always valid
  // for every company — the engine computes them directly, with no template
  // line ever needed (see UNIVERSAL_NO_TEMPLATE_GROUPINGS) — but they'd
  // otherwise only show up in this dropdown once a CA had already typed one
  // in by hand via "New grouping…". Seeding them here means a brand-new
  // company's very first mapping pass can just pick them, not retype them.
  const groupings = [
    ...new Set([...map.map((e) => e.grouping), ...templateGroupings, ...UNIVERSAL_NO_TEMPLATE_GROUPINGS]),
  ].sort();

  // Template lines with nothing mapped to them yet — a typo'd or near-miss
  // grouping produces a silently-zero P&L line with no warning otherwise.
  const coveredGroupings = new Set([...map.map((e) => e.grouping), ...rows.map((r) => r.grouping)]);
  const missingLines = template.filter((l) => {
    const g = l.kind === "manual" ? l.fallbackGrouping : l.grouping;
    return g && !coveredGroupings.has(g);
  });

  return (
    <section>
      <PageHeader
        title="Ledger Mapping"
        subtitle={
          <span className="block max-w-prose break-words">
            The per-company map from raw Tally ledgers to MIS groupings — the heart of the transform.
            Resolve any unmapped ledgers, or re-assign a grouping; changes flow straight into Master Data
            and the MIS pages.
          </span>
        }
        filters={<PeriodSelector />}
      />

      {missingLines.length > 0 && (
        <div className="mb-5 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          <p className="font-medium">
            {plural(
              missingLines.length,
              "1 template line has no ledger mapped to it",
              "{n} template lines have no ledger mapped to them",
            )}
            {period ? ` for ${period.label}` : ""}:
          </p>
          <p className="mt-1 max-w-prose break-words text-pretty text-xs opacity-90">
            {missingLines.map((l) => l.label).join(", ")} — each will show as zero on the P&amp;L /
            Book to Bank until a ledger is mapped to its grouping (or the line is removed from the{" "}
            <Link href={scoped("/template")} className="underline">
              MIS Template
            </Link>
            ).
          </p>
        </div>
      )}

      <MappingManager
        entries={entries}
        unmapped={unmapped}
        groupings={groupings}
        templatedGroupings={templateGroupings}
        slug={slug}
      />
    </section>
  );
}
