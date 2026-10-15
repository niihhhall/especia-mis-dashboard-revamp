import { describe, expect, it } from "vitest";

import { fmtAmount, fmtCompact, fmtPct, fyDisplay, negParens, plural, unitCaption } from "../format";
import { DEFAULT_USD_RATE, parseUnit, parseUsdRate } from "../unit-cookie";

describe("fmtCompact", () => {
  it("auto (default) keeps the original per-figure Cr / L / rupees behaviour, with symbol and suffix", () => {
    expect(fmtCompact(34474386.17)).toBe("₹3.45 Cr");
    expect(fmtCompact(7531000)).toBe("₹75.31 L");
    expect(fmtCompact(29356)).toBe("₹29,356");
    expect(fmtCompact(-6869955.1)).toBe("-₹68.70 L");
    expect(fmtCompact(34474386.17, "auto")).toBe("₹3.45 Cr");
  });

  it("lakh shows every figure as a plain number in lakh (no ₹, no L)", () => {
    expect(fmtCompact(34474386.17, "lakh")).toBe("344.74");
    expect(fmtCompact(7531000, "lakh")).toBe("75.31");
    expect(fmtCompact(29356, "lakh")).toBe("0.29");
    expect(fmtCompact(-6869955.1, "lakh")).toBe("-68.70");
    expect(fmtCompact(167664000, "lakh")).toBe("1,676.64");
  });

  it("crore shows plain numbers in crore, with 4 places under 1 lakh so small figures don't read as zero", () => {
    expect(fmtCompact(34474386.17, "crore")).toBe("3.45");
    expect(fmtCompact(7531000, "crore")).toBe("0.75");
    expect(fmtCompact(29356, "crore")).toBe("0.0029");
    expect(fmtCompact(-6869955.1, "crore")).toBe("-0.69");
  });

  it("usd shows whole dollars at the given rate, western grouping, no symbol", () => {
    expect(fmtCompact(40025599, "usd", 88)).toBe("454,836");
    expect(fmtCompact(-8800, "usd", 88)).toBe("-100");
    expect(fmtCompact(40025599, "usd", 80)).toBe("500,320");
    expect(fmtCompact(10, "usd", 88)).toBe("0");
  });

  it("zero is a plain 0 in the unit modes and ₹0 in auto", () => {
    expect(fmtCompact(0)).toBe("₹0");
    for (const u of ["lakh", "crore", "usd"] as const) expect(fmtCompact(0, u)).toBe("0");
  });
});

describe("unitCaption", () => {
  it("names the unit for table headings", () => {
    expect(unitCaption("auto")).toBe("₹");
    expect(unitCaption("lakh")).toBe("₹ Lakh");
    expect(unitCaption("crore")).toBe("₹ Crore");
    expect(unitCaption("usd", 85)).toBe("US$ @ ₹85/$");
  });
});

describe("cookie parsing", () => {
  it("accepts only lakh / crore / usd; anything else is auto", () => {
    expect(parseUnit("lakh")).toBe("lakh");
    expect(parseUnit("crore")).toBe("crore");
    expect(parseUnit("usd")).toBe("usd");
    expect(parseUnit("auto")).toBe("auto");
    expect(parseUnit("million")).toBe("auto");
    expect(parseUnit(undefined)).toBe("auto");
  });

  it("falls back to the default rate for a missing, junk or out-of-range rate", () => {
    expect(parseUsdRate("83.5")).toBe(83.5);
    expect(parseUsdRate(undefined)).toBe(DEFAULT_USD_RATE);
    expect(parseUsdRate("abc")).toBe(DEFAULT_USD_RATE);
    expect(parseUsdRate("0")).toBe(DEFAULT_USD_RATE);
    expect(parseUsdRate("5000")).toBe(DEFAULT_USD_RATE);
  });
});

describe("fmtAmount with a display unit", () => {
  it("keeps the full rupee amount in auto", () => {
    expect(fmtAmount(68662994.2)).toBe("6,86,62,994.20");
    expect(fmtAmount(-1234.5, "auto")).toBe("-1,234.50");
  });
  it("shows plain lakh / crore / dollar numbers, no symbols", () => {
    expect(fmtAmount(7531000, "lakh")).toBe("75.31");
    expect(fmtAmount(-250000, "lakh")).toBe("-2.50");
    expect(fmtAmount(49800000, "crore")).toBe("4.9800");
    expect(fmtAmount(250000, "crore")).toBe("0.0250");
    expect(fmtAmount(880000, "usd", 88)).toBe("10,000");
    expect(fmtAmount(-880000, "usd", 88)).toBe("-10,000");
  });
  it("collapses negligible amounts to 0 in a unit", () => {
    expect(fmtAmount(0, "lakh")).toBe("0");
    expect(fmtAmount(120, "crore")).toBe("0");
    expect(fmtAmount(10, "usd", 88)).toBe("0");
  });
});
describe("near-zero values never show a negative zero", () => {
  it("rounds before taking the sign in every unit", () => {
    expect(fmtCompact(-0.4)).toBe("₹0");
    expect(fmtCompact(-100, "lakh")).toBe("0");
    expect(fmtCompact(-100, "crore")).toBe("0");
    expect(fmtCompact(-40, "usd", 88)).toBe("0");
    expect(fmtAmount(-0.004)).toBe("0.00");
    expect(fmtPct(-0.0004)).toBe("0.0%");
  });
  it("keeps the sign once the rounded value is non-zero", () => {
    expect(fmtCompact(-0.6)).toBe("-₹1");
    expect(fmtCompact(-600, "lakh")).toBe("-0.01");
    expect(fmtAmount(-0.006)).toBe("-0.01");
    expect(fmtPct(-0.0006)).toBe("-0.1%");
  });
});

describe("negParens", () => {
  it("wraps a formatted negative amount in parentheses without its sign", () => {
    expect(negParens("-1,234")).toBe("(1,234)");
    expect(negParens(fmtCompact(-150000))).toBe("(₹1.50 L)");
    expect(negParens(fmtCompact(-6869955.1, "lakh"))).toBe("(68.70)");
  });
  it("leaves positive, zero and non-numeric strings alone", () => {
    expect(negParens("1,234")).toBe("1,234");
    expect(negParens(fmtCompact(0))).toBe("₹0");
    expect(negParens("No data")).toBe("No data");
    expect(negParens("")).toBe("");
  });
});

describe("fyDisplay", () => {
  it("uses an en dash for the year range and leaves single years alone", () => {
    expect(fyDisplay("FY 2026-27")).toBe("FY 2026-27");
    expect(fyDisplay("FY 2026")).toBe("FY 2026");
  });
});

describe("plural", () => {
  it("picks the whole message by the en-IN plural rules", () => {
    expect(plural(1, "{n} month needs attention", "{n} months need attention")).toBe("1 month needs attention");
    expect(plural(3, "{n} month needs attention", "{n} months need attention")).toBe("3 months need attention");
    expect(plural(0, "{n} user", "{n} users")).toBe("0 users");
  });
  it("groups large counts the Indian way and leaves forms without {n} alone", () => {
    expect(plural(100000, "{n} ledger", "{n} ledgers")).toBe("1,00,000 ledgers");
    expect(plural(1, "One row", "Many rows")).toBe("One row");
  });
});