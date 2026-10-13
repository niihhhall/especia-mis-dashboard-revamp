/**
 * Shared B.S/P.L guess from a Tally classification — used wherever a ledger
 * needs a sensible default before a CA has explicitly chosen one: the
 * Mapping page's unmapped-row editor and the bulk mapping-template upload
 * both need the identical guess, so it lives here once rather than being
 * duplicated (it used to be a private helper inside `mapping-editor.tsx`
 * only, with no server-side equivalent for the new bulk-upload parser).
 */
export const PL_CLASSIFICATIONS = new Set([
  "Sales Accounts",
  "Purchase Accounts",
  "Direct Incomes",
  "Direct Expenses",
  "Indirect Incomes",
  "Indirect Expenses",
]);

/** Default B.S/P.L from a Tally classification (P&L groups → P.L). */
export function guessBsPl(classification: string | null): "B.S" | "P.L" {
  return classification && PL_CLASSIFICATIONS.has(classification) ? "P.L" : "B.S";
}
