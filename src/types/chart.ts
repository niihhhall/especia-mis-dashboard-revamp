/** One entry of a chart legend: a flat dot in `color`, the name and an optional detail (for example a percent). */
export interface LegendItem {
  name: string;
  color: string;
  detail?: string;
}

/** One plotted series: the data key, its legend name and its color token. */
export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

/** One x-axis point: the `label` plus one value per series key. */
export type ChartRow = Record<string, number | string | null>;

/** The rows behind a chart's CSV download, header row first. */
export type CsvRows = (string | number)[][];
export type ChartMode = "bar" | "line" | "area";
/** One slice of a part-to-whole chart. */
export interface BreakdownItem {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Text after the name in the legend, for example the amount and share. */
  detail?: string;
}

/** One category of a ranked (horizontal) bar chart: one value per series key. */
export interface RankedRow {
  name: string;
  /** The full name for the tooltip when `name` is shortened. */
  full?: string;
  values: Record<string, number | null>;
  /** Signed mode: favourable or adverse. Defaults to the sign of the value. */
  favorable?: boolean;
  /** Bar color for this row, instead of the series color. */
  color?: string;
}

