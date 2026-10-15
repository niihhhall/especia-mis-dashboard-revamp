/** How a statement row reads. Maps onto the engines' emphasis values. */
export type StatementRowKind = "line" | "section" | "subtotal" | "total";

/** One value cell: the text to show, whether it is negative, an optional quiet percent line. */
export interface StatementCell {
  text: string;
  negative?: boolean;
  sub?: string;
  /** Context figures (for example the prior month) read quieter. */
  muted?: boolean;
}

export interface StatementColumn {
  key: string;
  label: string;
}

/** A header row above the columns: each group spans span columns; a span of 1 is the column itself. */
export interface StatementHeadGroup {
  label: string;
  span: number;
}

export interface StatementRowData {
  key: string;
  label: string;
  kind?: StatementRowKind;
  /** Text for the leading reference column, when the table has one (for example "I"). */
  ref?: string;
  /** A secondary, derived line: italic and quiet. */
  quiet?: boolean;
  /** A strong rule above the row, to set a new block of rows apart. */
  separator?: boolean;
  cells: StatementCell[];
}
