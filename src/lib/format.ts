// Indian-locale number formatting for financial figures.

const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/**
 * True when `v` shows as zero at `digits` decimals. The sign is decided after
 * rounding, so a value like -0.004 never displays as "-0.00" or "-₹0".
 */
function roundsToZero(v: number, digits: number): boolean {
  return Math.round(Math.abs(v) * 10 ** digits) === 0;
}

/**
 * Full amount with Indian digit grouping, 2 decimals (e.g. 68,66,29,942.42), the default "auto" unit.
 * With the header switch on Lakh / Crore / $ the same cell shows the figure in that one unit as a plain
 * number (no ₹, no L / Cr): lakh 2 places, crore 4 places (detail lines are small next to a crore), whole
 * dollars at `usdRate` rupees per $.
 */
export function fmtAmount(
  v: number,
  unit: "auto" | "lakh" | "crore" | "usd" = "auto",
  usdRate = 88,
): string {
  if (unit === "auto") return inr2.format(roundsToZero(v, 2) ? 0 : v);
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (unit === "lakh") return abs < 500 ? "0" : `${sign}${lakhFmt.format(abs / 1e5)}`;
  if (unit === "crore") return abs < 500 ? "0" : `${sign}${croreFmt4.format(abs / 1e7)}`;
  const dollars = Math.round(abs / usdRate);
  return dollars === 0 ? "0" : `${sign}${usdFmt.format(dollars)}`;
}

/** Whole-rupee amount (no decimals). */
export function fmtWhole(v: number): string {
  return inr0.format(Math.round(v));
}

const usdFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const lakhFmt = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const croreFmt2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const croreFmt4 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

/**
 * Compact label for KPI tiles and summaries.
 *  - "auto"  (default): crore from 1 Cr up, lakh from 1 L up, whole rupees below, WITH symbol and suffix -
 *    e.g. ₹4.98 Cr, ₹75.31 L.
 *  - "lakh" / "crore" / "usd": every figure in that one unit as a PLAIN NUMBER, the header switch names the
 *    unit, so no ₹ and no L / Cr is repeated in each cell. Crore uses 4 places under 1 lakh so small figures
 *    don't read as 0; dollars are whole dollars at `usdRate` rupees per $, grouped the western way.
 */
export function fmtCompact(
  v: number,
  unit: "auto" | "lakh" | "crore" | "usd" = "auto",
  usdRate = 88,
): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (unit === "lakh") return roundsToZero(abs / 1e5, 2) ? "0" : `${sign}${lakhFmt.format(abs / 1e5)}`;
  if (unit === "crore") {
    const digits = abs >= 1e5 ? 2 : 4;
    return roundsToZero(abs / 1e7, digits)
      ? "0"
      : `${sign}${(digits === 2 ? croreFmt2 : croreFmt4).format(abs / 1e7)}`;
  }
  if (unit === "usd") {
    const dollars = Math.round(abs / usdRate);
    return dollars === 0 ? "0" : `${sign}${usdFmt.format(dollars)}`;
  }
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  const rupees = Math.round(abs);
  return rupees === 0 ? "₹0" : `${sign}₹${inr0.format(rupees)}`;
}

/** Short caption naming what the figures are in, for table headings ("₹ Lakh", "US$ @ ₹88"). */
export function unitCaption(unit: "auto" | "lakh" | "crore" | "usd", usdRate = 88): string {
  if (unit === "lakh") return "₹ Lakh";
  if (unit === "crore") return "₹ Crore";
  if (unit === "usd") return `US$ @ ₹${usdRate}/$`;
  return "₹";
}

const pluralRules = new Intl.PluralRules("en-IN");

/**
 * Picks the singular or plural form of a whole message by the locale's plural
 * rules, never by `n === 1`. `{n}` in either form is replaced by the count:
 * `plural(3, "{n} month needs attention", "{n} months need attention")`.
 */
export function plural(n: number, one: string, other: string): string {
  const form = pluralRules.select(n) === "one" ? one : other;
  return form.replaceAll("{n}", inr0.format(n));
}

/** Percentage with one decimal (0.093 -> "9.3%"). */
export function fmtPct(ratio: number): string {
  return `${(roundsToZero(ratio * 100, 1) ? 0 : ratio * 100).toFixed(1)}%`;
}

/**
 * Display form of a formatted negative amount: "-1,234" -> "(1,234)",
 * "-₹1.50 L" -> "(₹1.50 L)". Every other string is returned unchanged.
 * Display only: values, exports and the formatters themselves keep the sign.
 */
export function negParens(formatted: string): string {
  return formatted.startsWith("-") ? `(${formatted.slice(1)})` : formatted;
}

/**
 * Display form of an FY label: "FY 2026-27" stays "FY 2026-27" (plain hyphen
 * for the range, matching `fyLabel`).
 */
export function fyDisplay(fy: string): string {
  return fy;
}
