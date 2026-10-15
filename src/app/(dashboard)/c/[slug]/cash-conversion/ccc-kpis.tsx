import { KpiCell } from "@/components/dashboard/kpi-cell";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import type { CccResult } from "@/lib/mis/ccc";

/** The four cycle KPIs, each with the prior month's figure under it when there is one. Props only. */
export function CccKpis({ c, prior }: { c: CccResult; prior: { c: CccResult; label: string } | null }) {
  const was = (v: number) => (prior ? `${prior.label}: ${v}d` : undefined);
  return (
    <KpiStrip label="Cash conversion figures" columns={4}>
      <KpiCell label="Cash conversion cycle" value={`${c.ccc}d`} sub={prior ? was(prior.c.ccc) : "DCP + ICP − CPP"} />
      <KpiCell label="Debtor collection" value={`${c.dcp}d`} sub={prior && was(prior.c.dcp)} />
      <KpiCell label="Inventory period" value={`${c.icp}d`} sub={prior && was(prior.c.icp)} />
      <KpiCell label="Creditor payment" value={`${c.cpp}d`} sub={prior && was(prior.c.cpp)} />
    </KpiStrip>
  );
}
