// Demo dataset for DEMO_MODE — illustrative Tirupati Automart figures for three
// months of FY 2026-27 (Apr'26, May'26, Jun'26). Pure module on purpose: no
// `server-only`, relative imports only, so vitest can check the numbers
// directly. `repository.ts` is the server-only wrapper the app imports.
//
// The trial balances are generated, not hand-typed, so they always balance:
// every row satisfies opening + debit − credit = closing, Σ opening = Σ closing
// = 0 each month, Capital A/c carries the prior month's profit forward, and the
// bank ledger absorbs whatever the other ledgers leave over.

import { DEFAULT_GROUPING, DEFAULT_SEGMENTS, DEFAULT_TEMPLATE_LINES } from "../mis/catalog";
import { computePnl } from "../mis/pnl";
import { computeSegment } from "../mis/segment";
import type { SegmentDef, TemplateLine } from "../mis/catalog";
import type { BudgetByKey } from "../mis/budget";
import type { LedgerMapEntry, ManualInputs, MasterRow } from "../mis/types";
import type { AgeingEntry, Company, MasterEdit, Period } from "../data/mis";
import type { QueryThread } from "../data/queries";
import type { AuditEvent } from "../data/audit";
import type { UserRow } from "../data/users";
import type { CompanySummary } from "../data/company-context";
import type { CompanyCard } from "../data/portfolio";
import type { AuditAction } from "../audit/log";

export const DEMO_COMPANY_ID = "demo-tirupati-automart";
export const DEMO_COMPANY_SLUG = "tirupati-automart";
export const DEMO_PERIOD_IDS = { apr: "demo-apr-2026", may: "demo-may-2026", jun: "demo-jun-2026" } as const;

const COMPANY_NAME = "Tirupati Automart";
const COMPANY_ADDRESS = "Illustrative demo data — Tirupati, Andhra Pradesh";
const CA_NAME = "Priya Sharma";
const CA_EMAIL = "priya.sharma@example.com";
const COMPANY_USER_NAME = "Tirupati Accounts Team";
const COMPANY_USER_EMAIL = "accounts@example.com";
const ADMIN_EMAIL = "demo@especia.local";

type MonthKey = keyof typeof DEMO_PERIOD_IDS;
/** Oldest first — the order the balances roll forward in. */
const MONTHS: readonly MonthKey[] = ["apr", "may", "jun"];

const PERIODS: Record<MonthKey, Period> = {
  apr: { id: DEMO_PERIOD_IDS.apr, company_id: DEMO_COMPANY_ID, month: "2026-04-01", label: "Apr'26", days_in_period: 30, status: "published" },
  may: { id: DEMO_PERIOD_IDS.may, company_id: DEMO_COMPANY_ID, month: "2026-05-01", label: "May'26", days_in_period: 31, status: "published" },
  jun: { id: DEMO_PERIOD_IDS.jun, company_id: DEMO_COMPANY_ID, month: "2026-06-01", label: "Jun'26", days_in_period: 30, status: "published" },
};

const COMPANY: Company = {
  id: DEMO_COMPANY_ID,
  slug: DEMO_COMPANY_SLUG,
  name: COMPANY_NAME,
  fy_start_month: 4,
  cin: null,
  address: COMPANY_ADDRESS,
  gst: null,
  pan: null,
  logo_url: null,
};

export const demoCompanySummary: Readonly<CompanySummary> = {
  id: DEMO_COMPANY_ID,
  slug: DEMO_COMPANY_SLUG,
  name: COMPANY_NAME,
  group_name: COMPANY_NAME,
  archived_at: null,
  logo_url: null,
};

// ------------------------------- trial balance -------------------------------

type ManualKey =
  | "accessoriesSales"
  | "otherSales"
  | "employeeBenefitExpense"
  | "depreciation"
  | "staffWelfare"
  | "commission"
  | "cashSalary";

interface PlSpec {
  particulars: string;
  grouping: string;
  classification: string;
  /** Apr'26 signed closing (income negative, expense positive). */
  apr: number;
  /** When set, the manual input of that key mirrors this ledger (as a positive figure). */
  manual?: ManualKey;
}

// The last four ledgers carry the figures the P&L takes from manual inputs only
// (depreciation, staff welfare, commission, cash salary). Their groupings have
// no template line, so the P&L counts each once (via the manual input) while
// the trial balance still records the cash/asset side — which is what keeps
// Book to Bank's "Check (must = 0)" at zero.
const PL_SPECS: readonly PlSpec[] = [
  { particulars: "Sales - Two Wheelers", grouping: "Vehicle Sales", classification: "Sales Accounts", apr: -18_500_000 },
  { particulars: "Sales - Accessories", grouping: "Accessories Sales", classification: "Sales Accounts", apr: -1_250_000, manual: "accessoriesSales" },
  { particulars: "Service & Labour Charges", grouping: "Other Sales", classification: "Sales Accounts", apr: -900_000, manual: "otherSales" },
  { particulars: "Dealer Incentive Received", grouping: "Other Income", classification: "Indirect Incomes", apr: -120_000 },
  { particulars: "Purchase - Vehicles", grouping: "Vehicles Purchase", classification: "Purchase Accounts", apr: 12_200_000 },
  { particulars: "Purchase - Accessories", grouping: "Accessories Purchase", classification: "Purchase Accounts", apr: 650_000 },
  { particulars: "Purchase - Spares & Lubricants", grouping: "Service Purchase", classification: "Purchase Accounts", apr: 300_000 },
  { particulars: "Showroom Rent", grouping: "Rent Expense", classification: "Direct Expenses", apr: 240_000 },
  { particulars: "Loading & Unloading Charges", grouping: "Loading & Unloading Expenses", classification: "Direct Expenses", apr: 45_000 },
  { particulars: "Vehicle Transportation & Parking", grouping: "Transportation & Parking", classification: "Direct Expenses", apr: 38_000 },
  { particulars: "Discount Received", grouping: "Discount Received", classification: "Indirect Incomes", apr: -42_000 },
  { particulars: "Audit & Professional Charges", grouping: "Professional Expense", classification: "Indirect Expenses", apr: 180_000 },
  { particulars: "Bank & Administrative Charges", grouping: "Administrative Charges", classification: "Indirect Expenses", apr: 26_000 },
  { particulars: "Director Remuneration", grouping: "Director Remuneration", classification: "Indirect Expenses", apr: 250_000 },
  { particulars: "Electricity Charges", grouping: "Utilities Expense", classification: "Indirect Expenses", apr: 95_000 },
  { particulars: "Salaries & Wages", grouping: "Employee Benefit Expense", classification: "Indirect Expenses", apr: 520_000, manual: "employeeBenefitExpense" },
  { particulars: "Interest on OD & Loans", grouping: "Finance Cost", classification: "Indirect Expenses", apr: 160_000 },
  { particulars: "Fuel Expenses", grouping: "Fuel Expenses", classification: "Indirect Expenses", apr: 34_000 },
  { particulars: "Insurance Premium", grouping: "Insurance Premium Expenses", classification: "Indirect Expenses", apr: 28_000 },
  { particulars: "Office Expenses A/c", grouping: "Office Expense", classification: "Indirect Expenses", apr: 33_000 },
  { particulars: "Printing & Stationery", grouping: "Printing & Stationery Expense", classification: "Indirect Expenses", apr: 14_000 },
  { particulars: "RTO Registration Charges", grouping: "Registration & Rto Fee", classification: "Indirect Expenses", apr: 85_000 },
  { particulars: "Repairs & Maintenance", grouping: "Repairs & Maintenance", classification: "Indirect Expenses", apr: 42_000 },
  { particulars: "Sales Promotion Expenses", grouping: "Sales Promotion", classification: "Indirect Expenses", apr: 65_000 },
  { particulars: "Telephone & Internet Charges", grouping: "Telephone & Network Expense", classification: "Indirect Expenses", apr: 12_500 },
  { particulars: "Travelling & Conveyance", grouping: "Traveling Expense", classification: "Indirect Expenses", apr: 22_000 },
  { particulars: "Advertisement & Marketing", grouping: "Marketing expenses", classification: "Indirect Expenses", apr: 110_000 },
  { particulars: "Depreciation A/c", grouping: "Depreciation", classification: "Indirect Expenses", apr: 80_000, manual: "depreciation" },
  { particulars: "Staff Welfare Expenses", grouping: "Staff Welfare", classification: "Indirect Expenses", apr: 18_000, manual: "staffWelfare" },
  { particulars: "Commission Paid", grouping: "Commission Expense", classification: "Indirect Expenses", apr: 45_000, manual: "commission" },
  { particulars: "Cash Salary Paid", grouping: "Cash Salary", classification: "Indirect Expenses", apr: 60_000, manual: "cashSalary" },
];

/** Jun'26 only: two ledgers that arrived without a confirmed mapping. */
const JUN_UNMAPPED: readonly { particulars: string; closing: number }[] = [
  { particulars: "Showroom Decoration Exp", closing: 18_000 },
  { particulars: "GST Late Fee", closing: 12_500 },
];

interface BsSpec {
  particulars: string;
  grouping: string;
  classification: string;
  /** Apr'26 opening (signed). */
  opening: number;
  /** Closing per month, oldest first (signed). */
  closings: readonly [number, number, number];
}

const BS_SPECS: readonly BsSpec[] = [
  { particulars: "Loan from Directors", grouping: "Unsecured Loans", classification: "Loans (Liability)", opening: -4_200_000, closings: [-4_050_000, -3_900_000, -3_750_000] },
  { particulars: "Sundry Creditors - Vendors", grouping: "Sundry Creditors", classification: "Current Liabilities", opening: -3_500_000, closings: [-3_800_000, -3_950_000, -4_180_000] },
  { particulars: "GST Payable", grouping: "Duties & Taxes (Liability)", classification: "Current Liabilities", opening: -420_000, closings: [-465_000, -488_000, -512_000] },
  { particulars: "Customer Booking Advances", grouping: "Vehicle Related Vehicle Obligations", classification: "Current Liabilities", opening: -650_000, closings: [-720_000, -760_000, -805_000] },
  { particulars: "Expenses Payable", grouping: "Other Current Liabilities", classification: "Current Liabilities", opening: -310_000, closings: [-295_000, -318_000, -334_000] },
  { particulars: "Showroom Furniture & Equipment", grouping: "Fixed Assets", classification: "Fixed Assets", opening: 7_800_000, closings: [7_950_000, 8_120_000, 8_060_000] },
  { particulars: "Sundry Debtors - Customers", grouping: "Sundry Debtors", classification: "Current Assets", opening: 4_000_000, closings: [4_400_000, 4_650_000, 4_980_000] },
  { particulars: "Advance to Suppliers", grouping: "Loans & Advances (Asset)", classification: "Current Assets", opening: 350_000, closings: [380_000, 340_000, 410_000] },
  { particulars: "TDS Receivable", grouping: "Other Current Assets", classification: "Current Assets", opening: 120_000, closings: [135_000, 148_000, 162_000] },
  { particulars: "Cash in Hand", grouping: "Cash, Bank & OD", classification: "Current Assets", opening: 185_000, closings: [210_000, 196_000, 228_000] },
];

const CAPITAL = { particulars: "Capital A/c - Proprietor", grouping: "Capital A/c", classification: "Capital Account", aprOpening: -6_500_000 };
const BANK = { particulars: "HDFC Bank Current A/c", grouping: "Cash, Bank & OD", classification: "Current Assets" };
const OPENING_STOCK = { particulars: "Opening Stock", grouping: "Opening Stock", classification: "Current Assets" };

/** Opening stock per month — May/Jun equal the previous month's closing stock. */
const OPENING_STOCK_BY_MONTH: Record<MonthKey, number> = { apr: 1_700_000, may: 2_100_000, jun: 2_250_000 };
const CLOSING_STOCK_BY_MONTH: Record<MonthKey, number> = { apr: 2_100_000, may: 2_250_000, jun: 2_400_000 };
const SEGMENT_OPENING: Record<MonthKey, Record<string, number>> = {
  apr: { vehicle: 1_450_000, accessories: 150_000, service: 100_000 },
  may: { vehicle: 1_750_000, accessories: 210_000, service: 140_000 },
  jun: { vehicle: 1_870_000, accessories: 230_000, service: 150_000 },
};
const SEGMENT_CLOSING: Record<MonthKey, Record<string, number>> = {
  apr: { vehicle: 1_750_000, accessories: 210_000, service: 140_000 },
  may: { vehicle: 1_870_000, accessories: 230_000, service: 150_000 },
  jun: { vehicle: 2_000_000, accessories: 245_000, service: 155_000 },
};

const round = (value: number, to: number) => Math.round(value / to) * to;

/** Month-on-month growth, varied per ledger so the trend lines are not identical. */
function plAmount(spec: PlSpec, index: number, month: MonthKey): number {
  if (month === "apr") return spec.apr;
  const factor = month === "may" ? 1.06 + (index % 5) * 0.01 : 1.12 + ((index * 3) % 7) * 0.01;
  return round(spec.apr * factor, 100);
}

function makeRow(
  particulars: string,
  grouping: string,
  bsPl: MasterRow["bsPl"],
  classification: string,
  opening: number,
  closing: number,
  unmapped?: boolean,
): MasterRow {
  const movement = closing - opening;
  const row: MasterRow = {
    grouping,
    bsPl,
    particulars,
    classification,
    opening,
    debit: movement > 0 ? movement : 0,
    credit: movement < 0 ? -movement : 0,
    closing,
  };
  if (unmapped) row.unmapped = true;
  return row;
}

interface MonthData {
  rows: MasterRow[];
  manual: ManualInputs;
}

function buildMonths(): Record<MonthKey, MonthData> {
  const out = {} as Record<MonthKey, MonthData>;
  let prevCapitalClosing = 0;
  let prevBankClosing = 0;
  let prevPlSum = 0;

  MONTHS.forEach((month, k) => {
    const plRows = PL_SPECS.map((spec, i) =>
      makeRow(spec.particulars, spec.grouping, "P.L", spec.classification, 0, plAmount(spec, i, month)),
    );
    if (month === "jun") {
      for (const u of JUN_UNMAPPED) {
        plRows.push(makeRow(u.particulars, DEFAULT_GROUPING, "P.L", "Indirect Expenses", 0, u.closing, true));
      }
    }

    const bsRows = BS_SPECS.map((spec) =>
      makeRow(
        spec.particulars,
        spec.grouping,
        "B.S",
        spec.classification,
        k === 0 ? spec.opening : spec.closings[k - 1],
        spec.closings[k],
      ),
    );

    const stock = OPENING_STOCK_BY_MONTH[month];
    bsRows.push(makeRow(OPENING_STOCK.particulars, OPENING_STOCK.grouping, "B.S", OPENING_STOCK.classification, stock, stock));

    // Capital takes the previous month's full profit: −(Σ P&L closings + opening stock − closing stock).
    const capitalOpening =
      k === 0
        ? CAPITAL.aprOpening
        : prevCapitalClosing + prevPlSum + OPENING_STOCK_BY_MONTH[MONTHS[k - 1]] - CLOSING_STOCK_BY_MONTH[MONTHS[k - 1]];
    bsRows.unshift(makeRow(CAPITAL.particulars, CAPITAL.grouping, "B.S", CAPITAL.classification, capitalOpening, capitalOpening));

    const others = [...bsRows, ...plRows];
    const bankOpening = k === 0 ? -others.reduce((a, r) => a + r.opening, 0) : prevBankClosing;
    const bankClosing = -others.reduce((a, r) => a + r.closing, 0);
    bsRows.push(makeRow(BANK.particulars, BANK.grouping, "B.S", BANK.classification, bankOpening, bankClosing));

    const rows = [...bsRows, ...plRows];
    const manual: ManualInputs = {
      closingStock: CLOSING_STOCK_BY_MONTH[month],
      segmentOpeningStock: { ...SEGMENT_OPENING[month] },
      segmentClosingStock: { ...SEGMENT_CLOSING[month] },
    };
    PL_SPECS.forEach((spec, i) => {
      if (!spec.manual) return;
      manual[spec.manual] = Math.abs(plRows[i].closing);
    });
    const financeCost = plRows[PL_SPECS.findIndex((s) => s.grouping === "Finance Cost")].closing;
    manual.interestExpense = round(financeCost * 0.375, 100);

    out[month] = { rows, manual };
    prevCapitalClosing = capitalOpening;
    prevBankClosing = bankClosing;
    prevPlSum = plRows.reduce((a, r) => a + r.closing, 0);
  });
  return out;
}

const MONTH_DATA = buildMonths();

const TEMPLATE: readonly TemplateLine[] = DEFAULT_TEMPLATE_LINES;
const SEGMENTS: readonly (SegmentDef & { id: string })[] = DEFAULT_SEGMENTS.map((segment) => ({
  ...segment,
  purchaseGroupings: [...segment.purchaseGroupings],
  id: `demo-segment-${segment.key}`,
}));

function monthOf(periodId: string): MonthKey | null {
  return MONTHS.find((m) => DEMO_PERIOD_IDS[m] === periodId) ?? null;
}

function copyManual(manual: ManualInputs): ManualInputs {
  const copy: ManualInputs = { ...manual };
  if (manual.segmentOpeningStock) copy.segmentOpeningStock = { ...manual.segmentOpeningStock };
  if (manual.segmentClosingStock) copy.segmentClosingStock = { ...manual.segmentClosingStock };
  return copy;
}

// ---------------------------------- getters ----------------------------------

export function isDemoCompanyId(id: string | undefined | null): boolean {
  return id === DEMO_COMPANY_ID;
}

export function isDemoPeriodId(id: string | undefined | null): boolean {
  return typeof id === "string" && monthOf(id) !== null;
}

export function getDemoCompany(id: string | undefined | null): Company | null {
  return isDemoCompanyId(id) ? { ...COMPANY } : null;
}

export function getDemoCompanySummary(): CompanySummary {
  return { ...demoCompanySummary };
}

export function getDemoCompanyBySlug(slug: string | null): CompanySummary | null {
  return slug === DEMO_COMPANY_SLUG ? getDemoCompanySummary() : null;
}

/** Newest first, like `getPeriods`. */
export function getDemoPeriods(): Period[] {
  return [...MONTHS].reverse().map((m) => ({ ...PERIODS[m] }));
}

export function getDemoMasterRows(periodId: string): MasterRow[] {
  const month = monthOf(periodId);
  return month ? MONTH_DATA[month].rows.map((row) => ({ ...row })) : [];
}

export function getDemoManualInputs(periodId: string): ManualInputs {
  const month = monthOf(periodId);
  return month ? copyManual(MONTH_DATA[month].manual) : {};
}

/** One entry per mapped ledger across all three months, by ledger name (like production). */
export function getDemoLedgerMap(): LedgerMapEntry[] {
  const byLedger = new Map<string, LedgerMapEntry>();
  for (const month of MONTHS) {
    for (const row of MONTH_DATA[month].rows) {
      if (row.unmapped || byLedger.has(row.particulars)) continue;
      byLedger.set(row.particulars, {
        ledger: row.particulars,
        grouping: row.grouping,
        bs_pl: row.bsPl,
        classification: row.classification,
      });
    }
  }
  return [...byLedger.values()].sort((a, b) => a.ledger.localeCompare(b.ledger));
}

export function getDemoTemplateRows(): (TemplateLine & { id: string })[] {
  return TEMPLATE.map((line, index) => ({ ...line, id: `demo-template-${index}` }));
}

export function getDemoSegments(): (SegmentDef & { id: string })[] {
  return SEGMENTS.map((segment) => ({ ...segment, purchaseGroupings: [...segment.purchaseGroupings] }));
}

// ---------------------------------- budget -----------------------------------

const BUDGET_SECTIONS = new Set<TemplateLine["section"]>([
  "revenue",
  "purchase",
  "direct_expense",
  "indirect_income",
  "indirect_expense",
]);
const INCOME_SECTIONS = new Set<TemplateLine["section"]>(["revenue", "indirect_income"]);

function buildBudget(month: MonthKey): BudgetByKey {
  const { rows, manual } = MONTH_DATA[month];
  const template = [...TEMPLATE];
  const pnl = computePnl(rows, manual, template);
  const actualByKey = new Map(pnl.lines.map((l) => [l.key, l.value]));
  const budget: BudgetByKey = {};
  template
    .filter((line) => BUDGET_SECTIONS.has(line.section))
    .forEach((line, i) => {
      const actual = actualByKey.get(line.key) ?? 0;
      if (actual === 0) return;
      // Alternate the plan's direction per line so Budget vs Actual shows a
      // mix of favourable and adverse variances.
      const factor = INCOME_SECTIONS.has(line.section) ? (i % 2 === 0 ? 1.05 : 0.96) : i % 2 === 0 ? 0.97 : 1.04;
      budget[line.key] = round(actual * factor, 1_000);
    });
  budget.budgetOpeningStock = OPENING_STOCK_BY_MONTH[month];
  budget.budgetClosingStock = CLOSING_STOCK_BY_MONTH[month];
  budget.budgetDepreciation = round(Number(manual.depreciation ?? 0), 1_000);
  budget.budgetInterestExpense = round(Number(manual.interestExpense ?? 0), 1_000);
  return budget;
}

const BUDGETS: Record<MonthKey, BudgetByKey> = {
  apr: buildBudget("apr"),
  may: buildBudget("may"),
  jun: buildBudget("jun"),
};

export function getDemoBudget(periodId: string): BudgetByKey {
  const month = monthOf(periodId);
  return month ? { ...BUDGETS[month] } : {};
}

/** `{ key: { periodId: amount } }` — the shape the budget template route pre-fills from. */
export function getDemoBudgetMatrix(periodIds: string[]): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const periodId of periodIds) {
    const month = monthOf(periodId);
    if (!month) continue;
    for (const [key, amount] of Object.entries(BUDGETS[month])) (matrix[key] ??= {})[periodId] = amount;
  }
  return matrix;
}

// ---------------------------------- ageing -----------------------------------

type Buckets = readonly [number, number, number, number, number];

const DEBTOR_PARTIES: readonly { party: string; share: number; buckets: Buckets }[] = [
  { party: "Sri Venkateswara Auto Finance", share: 0.27, buckets: [0.62, 0.24, 0.1, 0.04, 0] },
  { party: "Balaji Finance Ltd", share: 0.22, buckets: [0.55, 0.3, 0.1, 0.05, 0] },
  { party: "Tirumala Fleet Services", share: 0.17, buckets: [0.4, 0.3, 0.18, 0.08, 0.04] },
  { party: "Sai Krishna Logistics", share: 0.14, buckets: [0.5, 0.25, 0.15, 0.1, 0] },
  { party: "Govt. Employees Co-op Society", share: 0.12, buckets: [0.3, 0.25, 0.2, 0.15, 0.1] },
  { party: "Padmavathi Travels", share: 0.08, buckets: [0.2, 0.2, 0.2, 0.2, 0.2] },
];

const CREDITOR_PARTIES: readonly { party: string; share: number; buckets: Buckets }[] = [
  { party: "Bharat Two Wheelers Pvt Ltd", share: 0.46, buckets: [0.7, 0.25, 0.05, 0, 0] },
  { party: "Sri Lakshmi Auto Spares", share: 0.16, buckets: [0.55, 0.3, 0.1, 0.05, 0] },
  { party: "Sapthagiri Accessories Hub", share: 0.13, buckets: [0.6, 0.25, 0.15, 0, 0] },
  { party: "Andhra Lubricants & Oils", share: 0.1, buckets: [0.5, 0.3, 0.1, 0.1, 0] },
  { party: "Rayalaseema Transport Co", share: 0.09, buckets: [0.45, 0.35, 0.2, 0, 0] },
  { party: "Padmavathi Printers & Stationers", share: 0.06, buckets: [0.4, 0.3, 0.2, 0.05, 0.05] },
];

function splitAgeing(total: number, parties: typeof DEBTOR_PARTIES): AgeingEntry[] {
  let allocated = 0;
  const entries = parties.map((p, i) => {
    const partyTotal = i === parties.length - 1 ? total - allocated : round(total * p.share, 100);
    allocated += partyTotal;
    let bucketed = 0;
    const b = p.buckets.map((share, j) => {
      const value = j === p.buckets.length - 1 ? partyTotal - bucketed : round(partyTotal * share, 100);
      bucketed += value;
      return value;
    });
    return { party: p.party, b0_30: b[0], b30_60: b[1], b60_90: b[2], b90_180: b[3], b180_plus: b[4], total: partyTotal };
  });
  return entries.sort((a, b) => b.total - a.total);
}

function groupingClosing(month: MonthKey, grouping: string): number {
  return MONTH_DATA[month].rows.filter((r) => r.grouping === grouping).reduce((a, r) => a + r.closing, 0);
}

export function getDemoAgeing(periodId: string, kind: "debtor" | "creditor"): AgeingEntry[] {
  const month = monthOf(periodId);
  if (!month) return [];
  return kind === "debtor"
    ? splitAgeing(groupingClosing(month, "Sundry Debtors"), DEBTOR_PARTIES)
    : splitAgeing(Math.abs(groupingClosing(month, "Sundry Creditors")), CREDITOR_PARTIES);
}

// ------------------------------- master edits --------------------------------

function closingOf(month: MonthKey, particulars: string): number {
  return MONTH_DATA[month].rows.find((r) => r.particulars === particulars)?.closing ?? 0;
}

const MASTER_EDITS: Record<MonthKey, readonly MasterEdit[]> = {
  apr: [],
  may: [
    {
      particulars: "Electricity Charges",
      field: "closing",
      old_value: 98_500,
      new_value: closingOf("may", "Electricity Charges"),
      edited_at: "2026-06-04T10:42:00.000Z",
      editor: CA_NAME,
      branchLabel: null,
    },
  ],
  jun: [
    {
      particulars: "Office Expenses A/c",
      field: "closing",
      old_value: 36_500,
      new_value: closingOf("jun", "Office Expenses A/c"),
      edited_at: "2026-07-04T11:20:00.000Z",
      editor: CA_NAME,
      branchLabel: null,
    },
  ],
};

export function getDemoMasterEdits(periodId: string): MasterEdit[] {
  const month = monthOf(periodId);
  return month ? MASTER_EDITS[month].map((e) => ({ ...e })) : [];
}

// ------------------------------- GP dashboard --------------------------------

function buildGpDashboardHtml(): string {
  const { rows, manual } = MONTH_DATA.jun;
  const result = computeSegment(rows, manual, getDemoSegments());
  const inr = (v: number) => Math.round(v).toLocaleString("en-IN");
  const pct = (v: number) => `${(v * 100).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const line = (r: (typeof result.segments)[number], total = false) =>
    `<tr${total ? ' class="total"' : ""}><td>${r.name}</td><td>${inr(r.revenue)}</td><td>${inr(r.cogs)}</td><td>${inr(r.grossProfit)}</td><td>${pct(r.gpPct)}</td></tr>`;
  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8"><title>GP Dashboard — Jun\'26 (demo)</title>',
    "<style>",
    "body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:24px;color:#1f2933;background:#fff}",
    "h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#52606d;font-size:13px}",
    "table{border-collapse:collapse;width:100%;max-width:760px;font-size:14px}",
    "th,td{border:1px solid #d9e2ec;padding:8px 12px;text-align:right}th:first-child,td:first-child{text-align:left}",
    "th{background:#f0f4f8}tr.total td{font-weight:600;background:#f8fafc}",
    "</style></head><body>",
    "<h1>GP Dashboard — Jun'26 (demo)</h1>",
    `<p>${COMPANY_NAME} · illustrative figures in ₹</p>`,
    "<table><thead><tr><th>Segment</th><th>Revenue</th><th>COGS</th><th>Gross Profit</th><th>GP %</th></tr></thead><tbody>",
    ...result.segments.map((r) => line(r)),
    line(result.total, true),
    "</tbody></table></body></html>",
  ].join("\n");
}

const GP_DASHBOARD_HTML = buildGpDashboardHtml();

export function getDemoGpDashboardHtml(periodId: string): string | null {
  return periodId === DEMO_PERIOD_IDS.jun ? GP_DASHBOARD_HTML : null;
}

export function getDemoGpDashboardPeriods(): { id: string; label: string }[] {
  return [{ id: PERIODS.jun.id, label: PERIODS.jun.label }];
}

// ----------------------------------- users -----------------------------------

const COMPANY_REF = { id: DEMO_COMPANY_ID, slug: DEMO_COMPANY_SLUG, name: COMPANY_NAME };

export function getDemoUsers(): UserRow[] {
  return [
    {
      id: "demo-user",
      name: "Demo User",
      email: ADMIN_EMAIL,
      role: "admin",
      createdAt: "2026-01-05T09:00:00.000Z",
      company: null,
      assignedCompanies: [],
    },
    {
      id: "demo-ca-1",
      name: CA_NAME,
      email: CA_EMAIL,
      role: "ca",
      createdAt: "2026-01-12T10:30:00.000Z",
      company: null,
      assignedCompanies: [{ ...COMPANY_REF }],
    },
    {
      id: "demo-company-1",
      name: COMPANY_USER_NAME,
      email: COMPANY_USER_EMAIL,
      role: "company",
      createdAt: "2026-02-02T08:15:00.000Z",
      company: { ...COMPANY_REF },
      assignedCompanies: [],
    },
  ];
}

// ---------------------------------- queries ----------------------------------

const QUERIES: readonly QueryThread[] = [
  {
    id: "demo-query-jun",
    body: "Sales Promotion and Marketing are both up in Jun'26 compared with May. Can you confirm whether the festival campaign costs were booked in full this month?",
    status: "open",
    created_at: "2026-07-06T06:45:00.000Z",
    period_label: "Jun'26",
    author_name: COMPANY_USER_NAME,
    author_role: "company",
    replies: [],
  },
  {
    id: "demo-query-may",
    body: "Finance Cost went up in May'26. Is this the new OD limit or a one-off charge?",
    status: "answered",
    created_at: "2026-06-08T07:10:00.000Z",
    period_label: "May'26",
    author_name: COMPANY_USER_NAME,
    author_role: "company",
    replies: [
      {
        id: "demo-reply-may-1",
        body: "It is mostly the higher OD utilisation during the month — the interest portion is shown separately below EBIT. No one-off charges were booked.",
        created_at: "2026-06-09T11:25:00.000Z",
        author_name: CA_NAME,
        author_role: "ca",
      },
    ],
  },
  {
    id: "demo-query-apr",
    body: "Please share the Apr'26 MIS pack in Excel for the bank review meeting.",
    status: "closed",
    created_at: "2026-05-06T05:30:00.000Z",
    period_label: "Apr'26",
    author_name: COMPANY_USER_NAME,
    author_role: "company",
    replies: [
      {
        id: "demo-reply-apr-1",
        body: "Shared — use Download Excel on the Reports page for the full pack.",
        created_at: "2026-05-07T09:05:00.000Z",
        author_name: CA_NAME,
        author_role: "ca",
      },
      {
        id: "demo-reply-apr-2",
        body: "Received, thank you.",
        created_at: "2026-05-07T12:40:00.000Z",
        author_name: COMPANY_USER_NAME,
        author_role: "company",
      },
    ],
  },
];

/** Newest first, like `getQueries`. */
export function getDemoQueries(): QueryThread[] {
  return QUERIES.map((q) => ({ ...q, replies: q.replies.map((r) => ({ ...r })) }));
}

// ----------------------------------- audit -----------------------------------

type DemoAuditEvent = AuditEvent & { companyId: string | null };

const editEvent = (month: MonthKey, id: string): DemoAuditEvent => {
  const edit = MASTER_EDITS[month][0];
  return {
    id,
    at: edit.edited_at,
    action: "master_tb_edit",
    actorEmail: CA_EMAIL,
    actorRole: "ca",
    companyName: COMPANY_NAME,
    periodLabel: PERIODS[month].label,
    target: edit.particulars,
    detail: { field: edit.field, from: edit.old_value, to: edit.new_value },
    ip: null,
    companyId: DEMO_COMPANY_ID,
  };
};

const companyEvent = (
  id: string,
  at: string,
  action: AuditAction,
  actorEmail: string,
  actorRole: string,
  month: MonthKey | null,
  target: string | null,
  detail: Record<string, unknown> | null,
  ip: string,
): DemoAuditEvent => ({
  id,
  at,
  action,
  actorEmail,
  actorRole,
  companyName: COMPANY_NAME,
  periodLabel: month ? PERIODS[month].label : null,
  target,
  detail,
  ip,
  companyId: DEMO_COMPANY_ID,
});

const AUDIT_EVENTS: readonly DemoAuditEvent[] = [
  {
    id: "a-demo-1",
    at: "2026-05-02T03:44:00.000Z",
    action: "login_success",
    actorEmail: CA_EMAIL,
    actorRole: "ca",
    companyName: null,
    periodLabel: null,
    target: null,
    detail: null,
    ip: "203.0.113.10",
    companyId: null,
  },
  companyEvent("a-demo-2", "2026-05-03T05:12:00.000Z", "upload_tb", CA_EMAIL, "ca", "apr", "Trial Balance", { rows: MONTH_DATA.apr.rows.length }, "203.0.113.10"),
  companyEvent("a-demo-3", "2026-05-03T05:30:00.000Z", "upload_ageing", CA_EMAIL, "ca", "apr", "Debtors & Creditors ageing", null, "203.0.113.10"),
  companyEvent("a-demo-4", "2026-05-04T06:05:00.000Z", "save_adjustments", CA_EMAIL, "ca", "apr", "Adjustments", null, "203.0.113.10"),
  companyEvent("a-demo-5", "2026-05-20T08:40:00.000Z", "user_create", ADMIN_EMAIL, "admin", null, COMPANY_USER_EMAIL, { role: "company" }, "198.51.100.7"),
  companyEvent("a-demo-6", "2026-06-03T04:58:00.000Z", "upload_tb", CA_EMAIL, "ca", "may", "Trial Balance", { rows: MONTH_DATA.may.rows.length }, "203.0.113.10"),
  editEvent("may", "m-demo-1"),
  companyEvent("a-demo-7", "2026-06-10T09:15:00.000Z", "bulk_edit_budget", CA_EMAIL, "ca", null, "Budget template", { periods: 3 }, "203.0.113.10"),
  {
    id: "a-demo-8",
    at: "2026-06-18T14:02:00.000Z",
    action: "login_failed",
    actorEmail: "unknown@example.com",
    actorRole: null,
    companyName: null,
    periodLabel: null,
    target: null,
    detail: null,
    ip: "203.0.113.24",
    companyId: null,
  },
  companyEvent("a-demo-9", "2026-07-02T05:20:00.000Z", "upload_tb", CA_EMAIL, "ca", "jun", "Trial Balance", { rows: MONTH_DATA.jun.rows.length }, "203.0.113.10"),
  companyEvent("a-demo-10", "2026-07-03T06:10:00.000Z", "edit_mapping", CA_EMAIL, "ca", null, "Advertisement & Marketing", { grouping: "Marketing expenses" }, "203.0.113.10"),
  editEvent("jun", "m-demo-2"),
  companyEvent("a-demo-11", "2026-07-05T07:35:00.000Z", "upload_gp_dashboard", CA_EMAIL, "ca", "jun", "GP Dashboard", null, "203.0.113.10"),
];

/** Mirrors `listAuditEvents`' filters (action / company / before), newest first, one page. */
export function listDemoAuditEvents(
  opts: { before?: string; action?: AuditAction | "master_tb_edit"; companyId?: string } = {},
): { events: AuditEvent[]; hasMore: boolean } {
  const events = AUDIT_EVENTS.filter(
    (e) =>
      (!opts.action || e.action === opts.action) &&
      (!opts.companyId || e.companyId === opts.companyId) &&
      (!opts.before || e.at < opts.before),
  )
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((e): AuditEvent => {
      const { companyId: _companyId, ...event } = e;
      void _companyId;
      return { ...event, detail: event.detail ? { ...event.detail } : null };
    });
  return { events, hasMore: false };
}

// ------------------------------- company card --------------------------------

export function getDemoCompanyCard(): CompanyCard {
  const latest = PERIODS.jun;
  const { rows, manual } = MONTH_DATA.jun;
  return {
    id: DEMO_COMPANY_ID,
    slug: DEMO_COMPANY_SLUG,
    name: COMPANY_NAME,
    group: COMPANY_NAME,
    logoUrl: null,
    archivedAt: null,
    fyStartMonth: COMPANY.fy_start_month,
    pan: null,
    gst: null,
    cin: null,
    address: COMPANY_ADDRESS,
    latest: { ...latest },
    revenue: computePnl(rows, manual, [...TEMPLATE]).totals.revenue,
    managers: [CA_NAME],
    drafts: 0,
    updatedAt: latest.month,
  };
}
