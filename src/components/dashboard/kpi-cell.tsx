import type { ReactNode } from "react";

import { DeltaText } from "@/components/shared/delta-text";
import type { KpiDeltaView } from "@/types/kpi";

/**
 * One cell of a KpiStrip: quiet label, the value at KPI size, then the change.
 * The value and delta rows keep their height when empty ("No data", or no
 * prior to compare against), so every cell in a row lines up. Values arrive
 * formatted; this component reads no cookies.
 */
export function KpiCell({
  label,
  value,
  delta,
  caption,
  sub,
}: {
  label: string;
  /** null renders "No data". */
  value: string | null;
  delta?: KpiDeltaView | null;
  /** Shown after the change, e.g. "vs last month". */
  caption?: string;
  /** A secondary line under the value, e.g. a margin. */
  sub?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 bg-surface p-5">
      <p className="break-words text-label text-text-secondary">{label}</p>
      {value === null ? (
        <p className="flex h-9 items-end text-body text-text-secondary">No data</p>
      ) : (
        <p className="break-words text-kpi text-text-primary tabular-nums">{value}</p>
      )}
      {sub && <div className="text-label text-text-secondary tabular-nums">{sub}</div>}
      <div className="min-h-5">{value !== null && delta && <DeltaText delta={delta} caption={caption} />}</div>
    </div>
  );
}
