// Client-safe (no server-only deps): the display-unit preference shared by the header switch, the server
// pages that format figures, and the chart components.
export const UNIT_COOKIE = "mis_unit";
export const USD_RATE_COOKIE = "mis_usd_rate";

/**
 * "auto" keeps the original behaviour (₹4.98 Cr, ₹75.31 L chosen per figure, symbol and suffix shown).
 * "lakh" / "crore" / "usd" show every figure in ONE unit as a plain number, the unit is named by the header
 * switch, so the cells carry no ₹ symbol and no L / Cr suffix.
 */
export type MoneyUnit = "auto" | "lakh" | "crore" | "usd";

/** Rupees per US dollar used until the viewer sets their own (shown beside the $ button). */
export const DEFAULT_USD_RATE = 88;

export function parseUnit(raw: string | undefined | null): MoneyUnit {
  return raw === "lakh" || raw === "crore" || raw === "usd" ? raw : "auto";
}

export function parseUsdRate(raw: string | undefined | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 && n <= 1000 ? n : DEFAULT_USD_RATE;
}
