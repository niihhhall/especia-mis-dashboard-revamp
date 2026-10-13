// Small helpers for reporting periods.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-04" -> { monthDate: "2026-04-01", label: "Apr'26" }. */
export function periodFromMonthInput(monthInput: string): { monthDate: string; label: string } {
  const [y, m] = monthInput.split("-").map(Number);
  const label = `${MONTHS[(m ?? 1) - 1]}'${String(y).slice(2)}`;
  return { monthDate: `${monthInput}-01`, label };
}

/** Number of days in a "2026-04" month (default day-basis for ratios). */
export function daysInMonth(monthInput: string): number {
  const [y, m] = monthInput.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

// ---------------------------------------------------------------- financial year
// Indian FY runs April→March by default; `companies.fy_start_month` stores the
// start month (4 = April), so this is per-company rather than hardcoded.

/** First month of the financial year containing `monthIso` ("2026-06-01" -> "2026-04-01"). */
export function fyStartMonth(monthIso: string, fyStartMonthNo = 4): string {
  const [y, m] = monthIso.slice(0, 7).split("-").map(Number);
  const startYear = m >= fyStartMonthNo ? y : y - 1;
  return `${startYear}-${String(fyStartMonthNo).padStart(2, "0")}-01`;
}

/** True when both months fall in the same financial year. */
export function sameFy(aIso: string, bIso: string, fyStartMonthNo = 4): boolean {
  return fyStartMonth(aIso, fyStartMonthNo) === fyStartMonth(bIso, fyStartMonthNo);
}

/** "2026-06-01" -> "FY 2026-27" (or "FY 2026" when the FY starts in January). */
export function fyLabel(monthIso: string, fyStartMonthNo = 4): string {
  const startYear = Number(fyStartMonth(monthIso, fyStartMonthNo).slice(0, 4));
  if (fyStartMonthNo === 1) return `FY ${startYear}`;
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}
