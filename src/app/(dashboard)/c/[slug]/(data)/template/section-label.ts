import type { TemplateSection } from "@/lib/mis/catalog";

export const SECTIONS: { key: TemplateSection; label: string; hint: string }[] = [
  { key: "revenue", label: "Revenue", hint: "Sums into revenue from operations" },
  { key: "purchase", label: "Purchase", hint: "Part of COGS" },
  { key: "direct_expense", label: "Direct expense", hint: "Part of COGS" },
  { key: "indirect_income", label: "Indirect income", hint: "Below gross profit" },
  { key: "indirect_expense", label: "Indirect expense", hint: "Below gross profit, drives EBITDA" },
  { key: "btb_current_liability", label: "Book to bank: Current liabilities", hint: "Working-capital detail" },
  { key: "btb_current_asset", label: "Book to bank: Current assets", hint: "Working-capital detail" },
  { key: "btb_loan_liability", label: "Book to bank: Loan / liability", hint: "Extra particulars alongside the universal unsecured loans line" },
  { key: "btb_capital", label: "Book to bank: Change in capital", hint: "Extra particulars alongside the universal capital A/c line" },
  { key: "btb_fixed_asset", label: "Book to bank: Fixed assets", hint: "Extra particulars alongside Purchase/Sale of fixed assets" },
  { key: "btb_investment", label: "Book to bank: Investments", hint: "Own section: only shows when a company has lines here" },
  { key: "btb_branch", label: "Book to bank: Branch balances", hint: "Own section: only shows when a company has lines here" },
];

export function sectionLabel(section: TemplateSection): string {
  return SECTIONS.find((s) => s.key === section)?.label ?? section;
}
