import type { KpiDeltaView } from "@/types/kpi";

import { fmtPct } from "./format";

/**
 * Month-on-month change for a KPI cell, the rule the dashboard has always used.
 *
 * A missing or zero prior makes a percentage change meaningless, so it returns
 * null and the delta row is omitted. Under 0.05% counts as unchanged, which is
 * neither good nor bad. Otherwise the color follows goodness, never the sign of
 * the value: `goodWhenUp` is false for figures where rising is bad news (the
 * cash conversion cycle, debtors, inventory).
 */
export function kpiDelta(value: number, prior: number | undefined, goodWhenUp = true): KpiDeltaView | null {
  if (prior === undefined || prior === 0) return null;
  const change = (value - prior) / Math.abs(prior);
  const text = fmtPct(Math.abs(change));
  if (Math.abs(change) < 0.0005) return { text, direction: "flat", tone: "neutral", verdict: null };
  const up = change > 0;
  const good = up === goodWhenUp;
  return {
    text,
    direction: up ? "up" : "down",
    tone: good ? "positive" : "negative",
    verdict: good ? "favourable" : "adverse",
  };
}
