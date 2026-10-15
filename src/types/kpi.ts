/** A month-on-month change, ready to draw: the words and the color role. */
export interface KpiDeltaView {
  /** The absolute percent change, e.g. "5.9%". */
  text: string;
  direction: "up" | "down" | "flat";
  /** Color role: favourable, adverse, or neither (flat). */
  tone: "positive" | "negative" | "neutral";
  verdict: "favourable" | "adverse" | null;
}

/** One KPI cell as the page hands it down: formatted value, optional change. */
export interface KpiItem {
  key: string;
  label: string;
  /** null renders the cell's "No data" state. */
  value: string | null;
  delta: KpiDeltaView | null;
}
