// Core domain types for the MIS pipeline: raw Trial Balance -> normalized
// Master rows -> computed MIS pages. These mirror the columns of the reference
// workbook's `Master_TB` sheet and the DB tables that persist them.

/** One row of the raw Tally Trial Balance export (values are UNSIGNED magnitudes). */
export interface RawLedgerRow {
  particulars: string;
  opening: number; // unsigned magnitude
  debit: number; // period transaction (>= 0)
  credit: number; // period transaction (>= 0)
  closing: number; // unsigned magnitude
  /**
   * Which Tally branch column this row came from, for a multi-branch export
   * (`ParsedTrialBalance.branches` names them). Undefined for a legacy
   * single-block file, every current single-branch company's rows never
   * set this.
   */
  branchLabel?: string;
}

/** B.S (balance sheet) vs P.L (profit & loss) classification flag. */
export type BsPl = "B.S" | "P.L";

/**
 * Which `master_tb` rows a fetch should return, the ENTIRE mechanism by
 * which "branch" becomes a new axis. The pure engine functions
 * (`computePnl`/`computeBookToBank`/`computeCcc`/`computeSegment`) never see
 * this type; `getMasterRows` in `src/lib/data/mis.ts` is the only place it's
 * consumed, as a SQL filter, before any `MasterRow[]` is built. "group"
 * carries already-resolved branch ids (not a `groupId`) so `getMasterRows`
 * itself needs no extra lookup or `companyId` parameter, the caller
 * resolves group membership once, from the same `branches` it already
 * fetched for the scope selector.
 */
export type MasterRowScope =
  | { kind: "consolidated" }
  | { kind: "branch"; branchId: string }
  | { kind: "group"; branchIds: string[] };

/**
 * A normalized Master row, one per leaf ledger, with SIGNED balances
 * (assets/expenses positive; liabilities/income/capital negative). Mirrors
 * `Master_TB`: Grouping | B.S/P.L | Particulars | Classification | Opening |
 * Debit | Credit | Closing.
 */
export interface MasterRow {
  grouping: string; // MIS line-item key (SUMIFS target)
  bsPl: BsPl;
  particulars: string; // raw Tally ledger name
  classification: string; // Tally primary group
  opening: number; // signed
  debit: number; // period debit (unsigned, as in source)
  credit: number; // period credit (unsigned, as in source)
  closing: number; // signed; closing = opening + debit - credit
  /** True when this ledger had no confirmed mapping and used the safe default. */
  unmapped?: boolean;
  /**
   * Ingest-only fields for a multi-branch upload, never set by
   * `getMasterRows` (branch scoping there is a `branch_id` SQL filter, not a
   * returned column) and never read by the pure engine functions, which stay
   * branch-unaware by design. `branchLabel` is the raw Tally branch-column
   * name, carried through by `normalizeTrialBalance` from `RawLedgerRow`;
   * `branchId` is the resolved `branches.id`, attached afterward by the
   * upload action (which has DB access to the company's branch roster) right
   * before `replaceMasterRows` persists it.
   */
  branchLabel?: string;
  branchId?: string | null;
}

/** A per-company ledger -> grouping mapping entry. */
export interface LedgerMapEntry {
  ledger: string;
  grouping: string;
  bs_pl: BsPl;
  classification?: string | null;
}

/**
 * Per-period figures NOT derivable from the Trial Balance (the workbook's
 * yellow/manual cells). Any provided value overrides the grouping-sum default.
 *
 * Three fields are universal, non-templated financial concepts every company
 * needs regardless of its MIS template: `closingStock`, `depreciation`,
 * `interestExpense`. Everything else, revenue overrides, named
 * indirect-expense fields (Cash Salary, Staff Welfare, Commission, Employee
 * Benefit Expense, …), is read generically by whatever `manualKey` a
 * company's own `mis_template_lines` rows define, via the index signature
 * below. `pnl.ts` already treated this as a dynamic bag in practice (via a
 * cast); the type now says so directly.
 */
export interface ManualInputs {
  closingStock?: number; // P&L: Closing Stock (from Stock Info)
  depreciation?: number; // P&L: Depreciation
  interestExpense?: number; // P&L: Interest Expense (also carved out of Finance Cost)
  /** Per-segment stock splits (Segment P&L), keyed by each company's own segment keys. */
  segmentOpeningStock?: SegmentValues;
  segmentClosingStock?: SegmentValues;
  /** Per-template manual-override fields, keyed by `manualKey`. */
  [manualKey: string]: number | SegmentValues | undefined;
}

/**
 * Per-segment figures, keyed by each company's own `mis_segments.key` values
 *, replaces the old fixed `{vehicle, accessories, service}` triplet, which
 * only ever fit Tirupati's own business. A missing key reads as 0 (every
 * consumer does `values[key] ?? 0`), so this never needs zero-filling.
 */
export type SegmentValues = Record<string, number>;

/** A single line of a computed statement, ready to render. */
export interface StatementLine {
  key: string;
  label: string;
  value: number;
  /** Percentage of a base (e.g. revenue) when applicable. */
  ratio?: number;
  emphasis?: "section" | "subtotal" | "total";
}

/** Computed P&L Detail result. */
export interface PnlResult {
  lines: StatementLine[];
  totals: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    indirectIncome: number;
    indirectExpense: number;
    ebitda: number;
    ebit: number;
    ebt: number;
  };
}
