// Pure helpers behind the Charts tab, no DB, so they're fixture-testable.

import type { TemplateLine } from "./catalog";
import type { StatementLine } from "./types";

export type ExpenseSection = "purchase" | "direct_expense" | "indirect_expense";

export interface ExpenseItem {
  key: string;
  label: string;
  section: ExpenseSection;
  value: number;
}

export interface VarianceRow {
  key: string;
  label: string;
  section: "revenue" | "purchase" | "direct_expense" | "indirect_income" | "indirect_expense";
  budget: number;
  actual: number;
}

const EXPENSE_SECTIONS = new Set<string>(["purchase", "direct_expense", "indirect_expense"]);
const PL_SECTIONS = new Set<string>(["revenue", "purchase", "direct_expense", "indirect_income", "indirect_expense"]);

/** The cost lines of a month's P&L (purchase, direct and indirect expense), tagged with their section. */
export function expenseItems(template: TemplateLine[], lines: StatementLine[]): ExpenseItem[] {
  const byKey = new Map(lines.map((l) => [l.key, l]));
  const out: ExpenseItem[] = [];
  for (const t of template) {
    if (!EXPENSE_SECTIONS.has(t.section)) continue;
    const line = byKey.get(t.key);
    if (!line) continue;
    out.push({ key: t.key, label: t.label, section: t.section as ExpenseSection, value: line.value });
  }
  return out;
}

/** Every P&L template line with its Budget and Actual side by side (a missing side reads as 0). */
export function varianceRows(
  template: TemplateLine[],
  actual: StatementLine[],
  budget: StatementLine[],
): VarianceRow[] {
  const a = new Map(actual.map((l) => [l.key, l.value]));
  const b = new Map(budget.map((l) => [l.key, l.value]));
  return template
    .filter((t) => PL_SECTIONS.has(t.section))
    .map((t) => ({
      key: t.key,
      label: t.label,
      section: t.section as VarianceRow["section"],
      budget: b.get(t.key) ?? 0,
      actual: a.get(t.key) ?? 0,
    }));
}

/**
 * Strips the longest run of leading words every label shares ("ROYAL
 * ENTERPRISE (PUNE)", "ROYAL ENTERPRISE (SURAT)" → "(PUNE)", "(SURAT)"), so
 * chart axes stay readable. Fewer than two labels are returned untouched.
 */
export function trimCommonPrefix(labels: string[]): string[] {
  if (labels.length < 2) return labels;
  const words = labels.map((l) => l.split(" "));
  let n = 0;
  while (words.every((w) => w.length > n + 1 && w[n] === words[0][n])) n += 1;
  return n === 0 ? labels : words.map((w) => w.slice(n).join(" "));
}

/** RFC-4180-style CSV: quotes any cell containing a comma, quote or newline. */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
