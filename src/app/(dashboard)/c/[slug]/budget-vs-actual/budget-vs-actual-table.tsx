import { getFmtAmount, getUnitCaption } from "@/lib/data/unit";
import { fmtPct } from "@/lib/format";
import type { TemplateLine } from "@/lib/mis/catalog";
import { mergeRows } from "@/lib/mis/merge-rows";
import type { StatementLine } from "@/lib/mis/types";

/**
 * Which direction of variance is "good" for a given row — section-aware, not
 * a flat "negative = red" rule. Revenue/income-type rows (and the profit
 * subtotals they roll into) are favorable when Actual > Budget; cost-type
 * rows (and the COGS/EBITDA-adjacent subtotals) are favorable when
 * Actual < Budget, since spending more than planned is unfavorable even
 * though the number itself is positive. Built once from the company's own
 * template, mirroring exactly how `computePnl`/`computeBudgetPnl` already
 * partition their line keys by section.
 */
function buildRevenueTypeKeys(template: TemplateLine[]): Set<string> {
  const keys = new Set(["revenue", "indirectIncome", "grossProfit", "ebitda", "ebit"]);
  for (const l of template) {
    if (l.section === "revenue" || l.section === "indirect_income") keys.add(l.key);
  }
  return keys;
}

export async function BudgetVsActualTable({
  actual,
  budget,
  template,
}: {
  actual: StatementLine[];
  budget: StatementLine[];
  template: TemplateLine[];
}) {
  const fmtAmount = await getFmtAmount();
  const caption = await getUnitCaption();
  const rows = mergeRows([{ lines: actual }, { lines: budget }]);
  const actualByKey = Object.fromEntries(actual.map((l) => [l.key, l]));
  const budgetByKey = Object.fromEntries(budget.map((l) => [l.key, l]));
  const revenueTypeKeys = buildRevenueTypeKeys(template);
  const colCount = 4;

  return (
    <div tabIndex={0} role="region" aria-label="Budget vs Actual" className="scrollbar-thin overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <table className="tbl-report tbl-frozen" style={{ minWidth: "560px" }}>
        <thead>
          <tr>
            <th>Particulars</th>
            <th>Budget {caption}</th>
            <th>Actual {caption}</th>
            <th>Variance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (row.emphasis === "section") {
              return (
                <tr key={row.key} className="row-grp">
                  <td colSpan={colCount}>{row.label}</td>
                </tr>
              );
            }

            const rowClass =
              row.emphasis === "total" ? "row-tot" : row.emphasis === "subtotal" ? "row-sub" : "";

            const a = actualByKey[row.key]?.value ?? 0;
            const b = budgetByKey[row.key]?.value ?? 0;
            const variance = a - b;
            const variancePct = b !== 0 ? variance / b : null;

            // Favorable direction depends on section — see buildRevenueTypeKeys.
            // Suppressed on subtotal/total rows (`row.emphasis`), matching
            // PnlTable's own convention: those rows already carry their own
            // background/weight styling (.row-sub/.row-tot), and `.pos`/`.neg`
            // would either clash or (on the navy .row-tot background) lose to
            // its higher-specificity white text rule anyway.
            const isRevenueType = revenueTypeKeys.has(row.key);
            const favorable = isRevenueType ? variance > 0 : variance < 0;
            const unfavorable = isRevenueType ? variance < 0 : variance > 0;
            const varianceClass = row.emphasis ? "" : favorable ? "pos" : unfavorable ? "neg" : "";

            return (
              <tr key={row.key} className={rowClass}>
                <td>{row.label}</td>
                <td className="nums">{fmtAmount(b)}</td>
                <td className="nums">{fmtAmount(a)}</td>
                <td className={`nums${varianceClass ? ` ${varianceClass}` : ""}`}>
                  {fmtAmount(variance)}
                  {variancePct !== null && (
                    <span className="pnl-pct">
                      {fmtPct(variancePct)}
                      {/* Colour alone can't say good or bad (WCAG 1.4.1). */}
                      {varianceClass && ` · ${favorable ? "favourable" : "adverse"}`}
                    </span>
                  )}
                  {variancePct === null && varianceClass && (
                    <span className="pnl-pct">{favorable ? "favourable" : "adverse"}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
