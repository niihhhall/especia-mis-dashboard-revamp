// The grouping catalog: fixed reference data describing how Tally groups
// behave, PLUS the default template seed used to start a brand-new company's
// MIS template. As of the per-company template feature, the actual P&L /
// Segment / Book-to-Bank line list a company reports on lives in the DB
// (`mis_template_lines` / `mis_segments`, see src/lib/data/mis.ts's
// getMisTemplate/getMisSegments), this file no longer drives every
// company's P&L directly. What stays here is genuinely universal: standard
// Tally primary-group names, and the sign-disambiguation rules that apply to
// every business regardless of industry.

/**
 * Tally PRIMARY GROUP header names that appear as non-leaf rows in a Trial
 * Balance export. Rows whose Particulars match one of these are subtotal
 * headers and are skipped during ingest; everything else is a leaf ledger.
 */
export const KNOWN_GROUP_NAMES = new Set<string>([
  "Capital Account",
  "Loans (Liability)",
  "Current Liabilities",
  "Fixed Assets",
  "Investments",
  "Current Assets",
  "Sales Accounts",
  "Purchase Accounts",
  "Direct Incomes",
  "Direct Expenses",
  "Indirect Incomes",
  "Indirect Expenses",
  "Suspense A/c",
  "Branch / Divisions",
  "Misc. Expenses (ASSET)",
]);

/** Rows that are grand/section totals, never leaves. */
export const TOTAL_ROW_NAMES = new Set<string>(["Grand Total", "Opening", "Closing", "Balance"]);

/**
 * Account nature by Tally classification (primary group). Debit-nature accounts
 * (assets, expenses) carry POSITIVE signed balances; credit-nature accounts
 * (liabilities, income, capital) carry NEGATIVE. Used to disambiguate signs when
 * the `closing = opening + debit - credit` identity has more than one solution
 * (i.e. rows with no period movement).
 */
const CREDIT_NATURE_CLASSIFICATIONS = new Set<string>([
  "Capital Account",
  "Loans (Liability)",
  "Current Liabilities",
  "Sales Accounts",
  "Direct Incomes",
  "Indirect Incomes",
]);

export function classificationNature(classification: string): 1 | -1 {
  return CREDIT_NATURE_CLASSIFICATIONS.has(classification) ? -1 : 1;
}

/**
 * Account nature by MIS grouping, preferred over classification for the sign
 * tie-break because a grouping can re-home a ledger (e.g. "Difference in opening
 * balances", classified under Profit & Loss A/c, is grouped as an asset).
 *
 * Universal groupings that apply to every business regardless of industry -
 * standard Schedule-III balance-sheet/capital concepts, not sourced from any
 * company's template. Industry-specific credit-nature groupings (a company's
 * own revenue lines, a dealership's "Vehicle Related Vehicle Obligations",
 * etc.) are DERIVED from that company's template instead of listed here -
 * see `deriveCreditNatureGroupings` below, so a CA adding a new negate-style
 * revenue line gets correct sign handling automatically, rather than having
 * to remember to update a second, separately-maintained list.
 */
const UNIVERSAL_CREDIT_NATURE_GROUPINGS = new Set<string>([
  "Capital A/c",
  "Cash, Bank & OD", // net bank OD position: credit-nature here
  "Unsecured Loans",
  "Sundry Creditors",
  "Duties & Taxes (Liability)",
  "Other Current Liabilities",
]);

/**
 * `companyGroupings` is the per-company set derived from its template via
 * `deriveCreditNatureGroupings`, callers fetch the template once (e.g. in
 * the upload Server Action) and pass the derived set down, keeping this
 * function itself pure and DB-free like the rest of the engine.
 */
export function groupingNature(companyGroupings: ReadonlySet<string>, grouping: string): 1 | -1 {
  return UNIVERSAL_CREDIT_NATURE_GROUPINGS.has(grouping) || companyGroupings.has(grouping) ? -1 : 1;
}

/**
 * Groupings the engine computes directly, `pnl.ts`'s `openingStock`,
 * `book-to-bank.ts`'s hardcoded Sundry Creditors/Debtors/Fixed Assets/
 * Capital A/c/Unsecured Loans/Cash,Bank&OD lines (see that file's own doc
 * comment). No company ever needs a template line for one of these; the
 * Mapping page's Section picker hides itself for them.
 */
export const UNIVERSAL_NO_TEMPLATE_GROUPINGS = new Set<string>([
  "Capital A/c",
  "Unsecured Loans",
  "Fixed Assets",
  "Sundry Creditors",
  "Sundry Debtors",
  "Opening Stock",
  "Cash, Bank & OD",
]);

/**
 * Which template sections make sense for a B.S. vs a P.L. ledger, drives
 * the Mapping page's Section picker so a CA can't file a P&L expense under
 * a Book-to-Bank section (or vice versa) while mapping a ledger.
 */
export const SECTIONS_BY_BS_PL: Record<"B.S" | "P.L", { value: TemplateSection; label: string }[]> = {
  "B.S": [
    { value: "btb_current_liability", label: "Book to Bank: Current Liability" },
    { value: "btb_current_asset", label: "Book to Bank: Current Asset" },
    { value: "btb_loan_liability", label: "Book to Bank: Loan / Liability" },
    { value: "btb_capital", label: "Book to Bank: Change in Capital" },
    { value: "btb_fixed_asset", label: "Book to Bank: Fixed Assets" },
    { value: "btb_investment", label: "Book to Bank: Investments" },
    { value: "btb_branch", label: "Book to Bank: Branch Balances" },
  ],
  "P.L": [
    { value: "revenue", label: "Revenue" },
    { value: "purchase", label: "Purchase" },
    { value: "direct_expense", label: "Direct Expense" },
    { value: "indirect_income", label: "Indirect Income" },
    { value: "indirect_expense", label: "Indirect Expense" },
  ],
};

// --------------------------- P&L line structure ---------------------------
// Ordered specification of a company's Profit Statement / Segment split /
// Book-to-Bank detail rows. Historically fixed TypeScript constants (written
// for Tirupati's own vehicle-dealership chart of accounts); now per-company
// data in `mis_template_lines` / `mis_segments`, loaded via
// `src/lib/data/mis.ts`'s `getMisTemplate`/`getMisSegments`. The types and
// `DEFAULT_*` seed data below are what a brand-new company's template starts
// from (or what an existing one falls back to when it hasn't been configured
// at all), never mutated in place, never assumed to be THE catalog for
// every company.

export type TemplateSection =
  | "revenue"
  | "purchase"
  | "direct_expense"
  | "indirect_income"
  | "indirect_expense"
  | "btb_current_liability"
  | "btb_current_asset"
  | "btb_loan_liability"
  | "btb_capital"
  | "btb_fixed_asset"
  | "btb_investment"
  | "btb_branch";

/**
 * One line of a company's template, shaped to match `mis_template_lines`
 * exactly (flat, not a discriminated union) so the DB row -> in-memory
 * mapping in `getMisTemplate` is a direct field copy.
 *
 * `kind: "computed"` has one narrow, fixed meaning today, Finance Cost, net
 * of `manual.interestExpense` (`grouping` names the Finance Cost grouping to
 * sum before the carve-out), a deliberate scope decision, not a general
 * formula engine. `btb_current_liability`/`btb_current_asset` sections are
 * always `kind: "grouping"` in practice; `pnl.ts`/`segment.ts`/
 * `book-to-bank.ts` only ever read the fields their own section needs.
 */
export interface TemplateLine {
  section: TemplateSection;
  sortOrder: number;
  kind: "grouping" | "manual" | "computed";
  key: string;
  label: string;
  grouping?: string;
  manualKey?: string;
  fallbackGrouping?: string;
  negate?: boolean;
}

/** One company segment, matching `mis_segments`, see `src/lib/mis/segment.ts`. */
export interface SegmentDef {
  key: string;
  label: string;
  sortOrder: number;
  revenueGrouping?: string;
  revenueManualKey?: string;
  revenueFallbackGrouping?: string;
  purchaseGroupings: string[];
}

/**
 * Every naturally credit-nature grouping this company's template implies:
 * any line with `negate: true` (a revenue/indirect-income line whose closing
 * balance reads negative and gets flipped to show positive), plus any
 * `btb_current_liability`/`btb_loan_liability`/`btb_capital` line (liability
 * and equity sections are credit-nature; `btb_fixed_asset`/`btb_current_asset`
 * stay debit-nature, so they're deliberately excluded here). Union this with
 * `UNIVERSAL_CREDIT_NATURE_GROUPINGS`, done inside `groupingNature`, callers
 * only need to pass this derived set.
 */
export function deriveCreditNatureGroupings(template: TemplateLine[]): Set<string> {
  const set = new Set<string>();
  const creditNatureSections = new Set<TemplateSection>(["btb_current_liability", "btb_loan_liability", "btb_capital"]);
  for (const l of template) {
    if (l.negate) {
      const g = l.kind === "manual" ? l.fallbackGrouping : l.grouping;
      if (g) set.add(g);
    }
    if (creditNatureSections.has(l.section) && l.grouping) set.add(l.grouping);
  }
  return set;
}

/**
 * Tirupati's own template, reshaped as the default seed for a brand-new
 * company (or a fallback when a company somehow has zero template rows).
 * This is exactly what the reference workbook drove before templates
 * existed, kept here as a known-good starting point a CA can clone from
 * (see the "clone from an existing company" admin-UI action), not as live
 * config for every company.
 */
export const DEFAULT_TEMPLATE_LINES: TemplateLine[] = [
  // --- Revenue --- "Other Income" sits in Revenue (not Indirect Income) -
  // confirmed directly against the reference workbook's own P&L sheet.
  { section: "revenue", sortOrder: 1, kind: "grouping", key: "vehicleSales", label: "Vehicle Sales", grouping: "Vehicle Sales", negate: true },
  { section: "revenue", sortOrder: 2, kind: "manual", key: "accessoriesSales", label: "Accessories Sales", manualKey: "accessoriesSales", fallbackGrouping: "Accessories Sales", negate: true },
  { section: "revenue", sortOrder: 3, kind: "manual", key: "otherSales", label: "Other Sales", manualKey: "otherSales", fallbackGrouping: "Other Sales", negate: true },
  { section: "revenue", sortOrder: 4, kind: "grouping", key: "otherIncome", label: "Other Income", grouping: "Other Income", negate: true },

  // --- Purchase (part of COGS) ---
  { section: "purchase", sortOrder: 1, kind: "grouping", key: "vehiclesPurchase", label: "Vehicles Purchase", grouping: "Vehicles Purchase" },
  { section: "purchase", sortOrder: 2, kind: "grouping", key: "accessoriesPurchase", label: "Accessories Purchase", grouping: "Accessories Purchase" },
  { section: "purchase", sortOrder: 3, kind: "grouping", key: "servicePurchase", label: "Service Purchase", grouping: "Service Purchase" },
  { section: "purchase", sortOrder: 4, kind: "grouping", key: "otherPurchase", label: "Other Purchase", grouping: "Other Purchase" },
  { section: "purchase", sortOrder: 5, kind: "grouping", key: "purchaseAc", label: "Purchase A/c", grouping: "Purchase A/c" },

  // --- Direct expense (part of COGS) ---
  { section: "direct_expense", sortOrder: 1, kind: "grouping", key: "rent", label: "Rent Expense", grouping: "Rent Expense" },
  { section: "direct_expense", sortOrder: 2, kind: "grouping", key: "loading", label: "Loading & Unloading Expenses", grouping: "Loading & Unloading Expenses" },
  { section: "direct_expense", sortOrder: 3, kind: "grouping", key: "transportationParking", label: "Transportation & Parking", grouping: "Transportation & Parking" },

  // --- Indirect income --- promoted out of pnl.ts's old inline hardcoding.
  { section: "indirect_income", sortOrder: 1, kind: "manual", key: "discountReceived", label: "Discount Received", manualKey: "discountReceived", fallbackGrouping: "Discount Received", negate: true },

  // --- Indirect expense --- each sums its grouping's closing balance unless
  // a manual override is provided. Finance Cost is `computed`: the interest
  // portion is carved out and shown below EBITDA as Interest Expense.
  { section: "indirect_expense", sortOrder: 1, kind: "grouping", key: "professionalExpense", label: "Professional Expense", grouping: "Professional Expense" },
  { section: "indirect_expense", sortOrder: 2, kind: "grouping", key: "administrativeCharges", label: "Administrative Charges", grouping: "Administrative Charges" },
  { section: "indirect_expense", sortOrder: 3, kind: "grouping", key: "directorRemuneration", label: "Director Remuneration", grouping: "Director Remuneration" },
  { section: "indirect_expense", sortOrder: 4, kind: "grouping", key: "utilities", label: "Utilities Expense", grouping: "Utilities Expense" },
  { section: "indirect_expense", sortOrder: 5, kind: "manual", key: "employeeBenefit", label: "Employee Benefit Expense", manualKey: "employeeBenefitExpense", fallbackGrouping: "Employee Benefit Expense" },
  { section: "indirect_expense", sortOrder: 6, kind: "grouping", key: "miscellaneous", label: "Miscellaneous Expense", grouping: "Miscellaneous Expense" },
  { section: "indirect_expense", sortOrder: 7, kind: "computed", key: "financeCost", label: "Finance Cost", grouping: "Finance Cost" },
  { section: "indirect_expense", sortOrder: 8, kind: "grouping", key: "fuel", label: "Fuel Expenses", grouping: "Fuel Expenses" },
  { section: "indirect_expense", sortOrder: 9, kind: "grouping", key: "insurance", label: "Insurance Premium Expenses", grouping: "Insurance Premium Expenses" },
  { section: "indirect_expense", sortOrder: 10, kind: "grouping", key: "lossOnSaleOfVehicle", label: "Loss on Sale of Vehicle", grouping: "Loss on Sale of Vehicle" },
  { section: "indirect_expense", sortOrder: 11, kind: "grouping", key: "office", label: "Office Expense", grouping: "Office Expense" },
  { section: "indirect_expense", sortOrder: 12, kind: "grouping", key: "otherExpenses", label: "Other Expenses", grouping: "Other Expenses" },
  { section: "indirect_expense", sortOrder: 13, kind: "grouping", key: "printing", label: "Printing & Stationery Expense", grouping: "Printing & Stationery Expense" },
  { section: "indirect_expense", sortOrder: 14, kind: "grouping", key: "professionalFee", label: "Professional Fee", grouping: "Professional Fee" },
  { section: "indirect_expense", sortOrder: 15, kind: "grouping", key: "registration", label: "Registration & Rto Fee", grouping: "Registration & Rto Fee" },
  { section: "indirect_expense", sortOrder: 16, kind: "grouping", key: "repairs", label: "Repaire & Maintenance", grouping: "Repairs & Maintenance" },
  { section: "indirect_expense", sortOrder: 17, kind: "grouping", key: "salesPromotion", label: "Sales Promotion", grouping: "Sales Promotion" },
  { section: "indirect_expense", sortOrder: 18, kind: "grouping", key: "festival", label: "Festival Expense", grouping: "Festival Expense" },
  { section: "indirect_expense", sortOrder: 19, kind: "manual", key: "staffWelfare", label: "Staff Welfare", manualKey: "staffWelfare" },
  { section: "indirect_expense", sortOrder: 20, kind: "grouping", key: "uniformExpense", label: "Uniform Expense", grouping: "Uniform Expense" },
  { section: "indirect_expense", sortOrder: 21, kind: "grouping", key: "telephone", label: "Telephone & Network Expense", grouping: "Telephone & Network Expense" },
  { section: "indirect_expense", sortOrder: 22, kind: "grouping", key: "traveling", label: "Traveling Expense", grouping: "Traveling Expense" },
  { section: "indirect_expense", sortOrder: 23, kind: "grouping", key: "marketing", label: "Marketing expenses", grouping: "Marketing expenses" },
  { section: "indirect_expense", sortOrder: 24, kind: "manual", key: "commission", label: "Commission Expense", manualKey: "commission" },
  { section: "indirect_expense", sortOrder: 25, kind: "manual", key: "cashSalary", label: "Cash Salary", manualKey: "cashSalary" },
  { section: "indirect_expense", sortOrder: 26, kind: "grouping", key: "roundOff", label: "Round Off", grouping: "Round Off" },

  // --- Book to Bank: current-liability / current-asset detail ---
  // Sundry Debtors/Creditors, Opening Stock, Cash/Bank/OD, Fixed Assets,
  // Capital A/c and Unsecured Loans are universal and computed directly in
  // book-to-bank.ts (not templated), only the genuinely per-company detail
  // breakout rows live here. "Vehicle Related Vehicle Obligations" is the
  // one dealership-specific line; the rest are standard enough that most
  // companies will keep them, but they're still per-company so a template
  // that doesn't need them can drop them.
  { section: "btb_current_liability", sortOrder: 1, kind: "grouping", key: "dutiesLiab", label: "Duties & Taxes (Liability)", grouping: "Duties & Taxes (Liability)" },
  { section: "btb_current_liability", sortOrder: 2, kind: "grouping", key: "vehicleObl", label: "Vehicle Related Obligations", grouping: "Vehicle Related Vehicle Obligations" },
  { section: "btb_current_liability", sortOrder: 3, kind: "grouping", key: "otherCL", label: "Other Current Liabilities", grouping: "Other Current Liabilities" },
  { section: "btb_current_asset", sortOrder: 1, kind: "grouping", key: "loansAdv", label: "Loans & Advances (Asset)", grouping: "Loans & Advances (Asset)" },
  { section: "btb_current_asset", sortOrder: 2, kind: "grouping", key: "otherCA", label: "Other Current Assets", grouping: "Other Current Assets" },
];

/** Tirupati's own 3-way segment split, reshaped as the default seed. */
export const DEFAULT_SEGMENTS: SegmentDef[] = [
  {
    key: "vehicle",
    label: "Vehicle Sales",
    sortOrder: 1,
    revenueGrouping: "Vehicle Sales",
    purchaseGroupings: ["Vehicles Purchase", "Purchase A/c"],
  },
  {
    key: "accessories",
    label: "Accessories Sales",
    sortOrder: 2,
    revenueManualKey: "accessoriesSales",
    revenueFallbackGrouping: "Accessories Sales",
    purchaseGroupings: ["Accessories Purchase"],
  },
  {
    key: "service",
    label: "Service",
    sortOrder: 3,
    revenueManualKey: "otherSales",
    revenueFallbackGrouping: "Other Sales",
    purchaseGroupings: ["Service Purchase", "Other Purchase"],
  },
];

/** Default grouping for a leaf ledger that has no confirmed mapping. */
export const DEFAULT_GROUPING = "Other Expenses";
