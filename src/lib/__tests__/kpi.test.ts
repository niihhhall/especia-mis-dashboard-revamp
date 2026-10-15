import { describe, expect, it } from "vitest";

import { kpiDelta } from "../kpi";

describe("kpiDelta", () => {
  it("omits the change when there is no prior or the prior is zero", () => {
    expect(kpiDelta(100, undefined)).toBeNull();
    expect(kpiDelta(100, 0)).toBeNull();
  });

  it("treats a change under 0.05% as flat, neither favourable nor adverse", () => {
    expect(kpiDelta(100.04, 100)).toEqual({ text: "0.0%", direction: "flat", tone: "neutral", verdict: null });
    expect(kpiDelta(-150000, -150000)).toEqual({ text: "0.0%", direction: "flat", tone: "neutral", verdict: null });
  });

  it("colors by goodness: up is favourable by default", () => {
    expect(kpiDelta(105.9, 100)).toEqual({ text: "5.9%", direction: "up", tone: "positive", verdict: "favourable" });
    expect(kpiDelta(90, 100)).toEqual({ text: "10.0%", direction: "down", tone: "negative", verdict: "adverse" });
  });

  it("flips the verdict when goodWhenUp is false", () => {
    expect(kpiDelta(107.1, 100, false)).toEqual({ text: "7.1%", direction: "up", tone: "negative", verdict: "adverse" });
    expect(kpiDelta(90, 100, false)).toEqual({ text: "10.0%", direction: "down", tone: "positive", verdict: "favourable" });
  });

  it("measures against the size of a negative prior, so the direction follows the value", () => {
    // -50 to -100 is a fall of 100% of the prior's size.
    expect(kpiDelta(-100, -50)).toEqual({ text: "100.0%", direction: "down", tone: "negative", verdict: "adverse" });
  });
});
