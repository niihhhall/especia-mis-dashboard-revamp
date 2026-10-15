import { fmtPct, negParens } from "@/lib/format";
import type { computePnl } from "@/lib/mis/pnl";
import type { StatementRowData } from "@/types/statement";

type Totals = ReturnType<typeof computePnl>["totals"];

const LINES = [
  { key: "revenue", label: "Revenue", goodWhenUp: true },
  { key: "cogs", label: "COGS", goodWhenUp: false },
  { key: "grossProfit", label: "Gross profit", goodWhenUp: true },
  { key: "indirectIncome", label: "Indirect income", goodWhenUp: true },
  { key: "indirectExpense", label: "Indirect expenses", goodWhenUp: false },
  { key: "ebitda", label: "EBITDA", goodWhenUp: true },
  { key: "ebt", label: "Net profit (EBT)", goodWhenUp: true },
] as const;

/** One row per headline line: baseline, compare and the change with its percent and favourable or adverse word. */
export function compareRows(lt: Totals, rt: Totals, fmt: (v: number) => string): StatementRowData[] {
  const show = (v: number) => negParens(fmt(v));
  return LINES.map((l) => {
    const lv = lt[l.key];
    const rv = rt[l.key];
    const diff = rv - lv;
    // A zero base makes percentage change meaningless.
    const pct = lv === 0 ? null : diff / Math.abs(lv);
    const good = diff === 0 ? null : diff > 0 === l.goodWhenUp;
    // Words, not color, say good or bad (WCAG 1.4.1).
    const word = good === null ? "" : good ? "favourable" : "adverse";
    const sub = pct !== null || good !== null ? `${pct !== null ? fmtPct(pct) : ""}${pct !== null && word ? " · " : ""}${word}` : undefined;
    return {
      key: l.key,
      label: l.label,
      kind: l.key === "ebt" ? "total" : "line",
      cells: [{ text: show(lv) }, { text: show(rv) }, { text: show(diff), negative: diff < 0, sub }],
    };
  });
}
