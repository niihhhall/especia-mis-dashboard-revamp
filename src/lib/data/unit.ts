import "server-only";

import { cookies } from "next/headers";

import { fmtAmount, fmtCompact, unitCaption } from "@/lib/format";
import { parseUnit, parseUsdRate, UNIT_COOKIE, USD_RATE_COOKIE, type MoneyUnit } from "@/lib/unit-cookie";

/** The viewer's chosen display unit and dollar rate (header switch). Read per request from cookies. */
export async function getUnitSettings(): Promise<{ unit: MoneyUnit; usdRate: number }> {
  const jar = await cookies();
  return { unit: parseUnit(jar.get(UNIT_COOKIE)?.value), usdRate: parseUsdRate(jar.get(USD_RATE_COOKIE)?.value) };
}

/** `fmtCompact` already bound to the viewer's unit — server pages call this once and use it like the plain function. */
export async function getFmtCompact(): Promise<(v: number) => string> {
  const { unit, usdRate } = await getUnitSettings();
  return (v) => fmtCompact(v, unit, usdRate);
}

/** `fmtAmount` (the full-precision table amount) bound to the viewer's unit. */
export async function getFmtAmount(): Promise<(v: number) => string> {
  const { unit, usdRate } = await getUnitSettings();
  return (v) => fmtAmount(v, unit, usdRate);
}

/** The caption for table headings, e.g. "₹ Lakh" (plain "₹" when the unit is auto). */
export async function getUnitCaption(): Promise<string> {
  const { unit, usdRate } = await getUnitSettings();
  return unitCaption(unit, usdRate);
}
