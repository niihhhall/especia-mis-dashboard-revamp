import { AuthError, requireCompany } from "@/lib/auth/guard";
import { getCompany, getLedgerMap, getMasterRows, getMisTemplate, getSelectedPeriod } from "@/lib/data/mis";
import { buildMappingTemplateWorkbook, type MappingTemplateRow } from "@/lib/export/mapping-template-workbook";
import { guessBsPl } from "@/lib/mis/bs-pl";

/**
 * GET /c/[slug]/mapping/template — downloads the bulk mapping-template
 * workbook (see the plan's "Bulk ledger mapping" section). A nested segment
 * under the existing `mapping/` page folder, not a sibling `route.ts` next
 * to `page.tsx` (Next.js disallows both in the same segment).
 *
 * NOT covered by `(data)/layout.tsx`'s role gate — layouts only wrap
 * `page.tsx`, never a Route Handler — so this checks explicitly, exactly
 * like every other ca/admin write path in this codebase.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let companyId: string;
  try {
    ({ companyId } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }

  const [company, map, template, period] = await Promise.all([
    getCompany(companyId),
    getLedgerMap(companyId),
    getMisTemplate(companyId),
    getSelectedPeriod(companyId),
  ]);
  const rows = period ? await getMasterRows(period.id) : [];

  // Same union the Mapping page itself renders: every already-mapped
  // ledger, plus any ledger in the current period's Trial Balance that
  // isn't in ledger_map yet (today's "unmapped" set) — one row each.
  const byLedger = new Map<string, MappingTemplateRow>();
  for (const e of map) {
    byLedger.set(e.ledger, {
      ledger: e.ledger,
      classification: e.classification ?? null,
      currentGrouping: e.grouping,
      bsPl: e.bs_pl,
    });
  }
  for (const r of rows) {
    if (r.unmapped && !byLedger.has(r.particulars)) {
      byLedger.set(r.particulars, {
        ledger: r.particulars,
        classification: r.classification,
        currentGrouping: "",
        bsPl: guessBsPl(r.classification),
      });
    }
  }

  const templateGroupings = template
    .map((l) => (l.kind === "manual" ? l.fallbackGrouping : l.grouping))
    .filter((g): g is string => Boolean(g));
  const groupings = [...templateGroupings, ...map.map((e) => e.grouping)];

  const wb = buildMappingTemplateWorkbook(company?.name ?? slug, [...byLedger.values()], groupings);
  const buf = await wb.xlsx.writeBuffer();

  const filename = `${slug}_ledger_mapping_template.xlsx`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
