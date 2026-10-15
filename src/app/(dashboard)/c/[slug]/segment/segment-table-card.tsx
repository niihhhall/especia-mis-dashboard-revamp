import { StatementTable } from "@/components/dashboard/statement-table";
import { Card } from "@/components/shared/card";
import { fmtPct, negParens } from "@/lib/format";
import type { SegmentRow } from "@/lib/mis/segment";
import type { StatementCell, StatementColumn, StatementHeadGroup, StatementRowData } from "@/types/statement";

const AMOUNTS = [
  { key: "revenue", label: "Revenue" },
  { key: "cogs", label: "COGS" },
  { key: "grossProfit", label: "Gross profit" },
] as const;

/**
 * The segment table: revenue, COGS and gross profit per segment plus the
 * total, with the prior month's figures (quiet) before each when there is a
 * prior month, then mix and GP %. Props only.
 */
export function SegmentTableCard({
  rows,
  periodLabel,
  priorLabel,
  priorByName,
  fmt,
}: {
  rows: SegmentRow[];
  periodLabel: string;
  priorLabel: string | null;
  priorByName?: Record<string, SegmentRow>;
  fmt: (v: number) => string;
}) {
  const showPrior = priorLabel !== null;
  const amount = (v: number) => negParens(fmt(v));
  const columns: StatementColumn[] = [
    ...AMOUNTS.flatMap((a) =>
      showPrior
        ? [{ key: `${a.key}-prior`, label: priorLabel }, { key: a.key, label: periodLabel }]
        : [{ key: a.key, label: a.label }],
    ),
    { key: "mix", label: "Mix" },
    { key: "gpPct", label: "GP %" },
  ];
  const groups: StatementHeadGroup[] | undefined = showPrior
    ? [...AMOUNTS.map((a) => ({ label: a.label, span: 2 })), { label: "Mix", span: 1 }, { label: "GP %", span: 1 }]
    : undefined;

  const body: StatementRowData[] = rows.map((s, i) => {
    const pr = priorByName?.[s.name];
    const cells: StatementCell[] = AMOUNTS.flatMap((a) => {
      const now = { text: amount(s[a.key]), negative: s[a.key] < 0 };
      if (!showPrior) return [now];
      const was = pr ? { text: amount(pr[a.key]), muted: true } : { text: "-", muted: true };
      return [was, now];
    });
    return {
      key: s.name,
      label: s.name,
      kind: i === rows.length - 1 ? "total" : "line",
      cells: [...cells, { text: negParens(fmtPct(s.mix)) }, { text: negParens(fmtPct(s.gpPct)), negative: s.gpPct < 0 }],
    };
  });

  return (
    <Card flush>
      <StatementTable label="Segment P&L" firstColumnLabel="Segment" columns={columns} groups={groups} rows={body} />
    </Card>
  );
}
