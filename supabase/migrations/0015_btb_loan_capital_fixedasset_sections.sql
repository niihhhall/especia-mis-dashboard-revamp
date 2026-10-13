-- Book to Bank: let a company add its own detail lines under the three
-- sections that were previously 100% universal (a single hardcoded line
-- each, no template hook at all) — Loan/Liability (Unsecured Loans),
-- Change in Capital (Capital A/c), and Fixed Assets (Purchase/Sale). A CA
-- can now file a *different* particular (e.g. a named secured loan, a
-- distinct capital contribution, a separately-tracked asset ledger) under
-- one of these sections without touching the universal line, exactly the
-- same additive pattern `btb_current_liability`/`btb_current_asset` already
-- use alongside Sundry Creditors/Debtors. See book-to-bank.ts for the read
-- side; the double-count guard in template/actions.ts's saveTemplateLine
-- still refuses the exact universal grouping name itself (Unsecured Loans,
-- Capital A/c, Fixed Assets) under any section, new or old.
alter table public.mis_template_lines drop constraint mis_template_lines_section_check;
alter table public.mis_template_lines add constraint mis_template_lines_section_check
  check (section in (
    'revenue', 'purchase', 'direct_expense',
    'indirect_income', 'indirect_expense',
    'btb_current_liability', 'btb_current_asset',
    'btb_investment', 'btb_branch',
    'btb_loan_liability', 'btb_capital', 'btb_fixed_asset'
  ));
