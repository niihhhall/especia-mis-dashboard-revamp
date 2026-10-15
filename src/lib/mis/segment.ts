// Segment P&L engine. Mirrors the reference workbook's "Segment wise PL"
// sheet: revenue from the P&L revenue lines, purchases split by segment,
// per-segment stock from manual inputs, and Rent/Loading allocated by
// revenue share, for whatever segments a company's own template defines
// (0 to N of them; Tirupati's are Vehicle/Accessories/Service, but nothing
// here assumes any fixed count or names).

import type { SegmentDef } from "./catalog";
import { groupIndex } from "./pnl";
import type { ManualInputs, MasterRow } from "./types";

export interface SegmentRow {
  name: string;
  revenue: number;
  mix: number;
  openingStock: number;
  purchase: number;
  closingStock: number;
  netConsumption: number;
  rent: number;
  loading: number;
  cogs: number;
  grossProfit: number;
  gpPct: number;
}

export interface SegmentResult {
  segments: SegmentRow[];
  total: SegmentRow;
}

export function computeSegment(
  master: MasterRow[],
  manual: ManualInputs = {},
  segments: SegmentDef[],
): SegmentResult {
  const { sumClosing } = groupIndex(master);
  const n = (v: number | undefined) => (typeof v === "number" ? v : undefined);

  const revenueFor = (def: SegmentDef): number => {
    const manualVal = def.revenueManualKey ? n(manual[def.revenueManualKey] as number | undefined) : undefined;
    if (manualVal !== undefined) return manualVal;
    const g = def.revenueFallbackGrouping ?? def.revenueGrouping;
    return g ? -sumClosing(g) : 0;
  };
  const purchaseFor = (def: SegmentDef): number =>
    def.purchaseGroupings.reduce((a, g) => a + sumClosing(g), 0);

  const opening = manual.segmentOpeningStock ?? {};
  const closing = manual.segmentClosingStock ?? {};
  const rentTotal = sumClosing("Rent Expense");
  const loadingTotal = sumClosing("Loading & Unloading Expenses");

  const revenueByKey = new Map(segments.map((def) => [def.key, revenueFor(def)]));
  const purchaseByKey = new Map(segments.map((def) => [def.key, purchaseFor(def)]));
  const totalRev = [...revenueByKey.values()].reduce((a, b) => a + b, 0);

  const build = (def: SegmentDef): SegmentRow => {
    const rev = revenueByKey.get(def.key) ?? 0;
    const share = totalRev ? rev / totalRev : 0;
    const rent = rentTotal * share;
    const loading = loadingTotal * share;
    const openingStock = opening[def.key] ?? 0;
    const closingStock = closing[def.key] ?? 0;
    const netConsumption = openingStock + (purchaseByKey.get(def.key) ?? 0) - closingStock;
    const cogs = netConsumption + rent + loading;
    const grossProfit = rev - cogs;
    return {
      name: def.label,
      revenue: rev,
      mix: share,
      openingStock,
      purchase: purchaseByKey.get(def.key) ?? 0,
      closingStock,
      netConsumption,
      rent,
      loading,
      cogs,
      grossProfit,
      gpPct: rev ? grossProfit / rev : 0,
    };
  };

  const rows = segments.map(build);

  const sum = (f: keyof SegmentRow) => rows.reduce((a, s) => a + (s[f] as number), 0);
  const totalCogs = sum("cogs");
  const totalGp = totalRev - totalCogs;
  const total: SegmentRow = {
    name: "Total",
    revenue: totalRev,
    mix: 1,
    openingStock: sum("openingStock"),
    purchase: sum("purchase"),
    closingStock: sum("closingStock"),
    netConsumption: sum("netConsumption"),
    rent: sum("rent"),
    loading: sum("loading"),
    cogs: totalCogs,
    grossProfit: totalGp,
    gpPct: totalRev ? totalGp / totalRev : 0,
  };

  return { segments: rows, total };
}
