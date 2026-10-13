-- Book to Bank restructure: split "Loan / capital changes" into two
-- standalone sections (Loan/Liability, Change in Capital — the engine and
-- read side already do this without a schema change, since Capital A/c and
-- Unsecured Loans are both universal groupings), and add two new
-- per-company template sections — Investments and Branch Balances — that
-- used to have no home of their own and got folded into
-- `btb_current_asset` instead. See book-to-bank.ts for the read side.
alter table public.mis_template_lines drop constraint mis_template_lines_section_check;
alter table public.mis_template_lines add constraint mis_template_lines_section_check
  check (section in (
    'revenue', 'purchase', 'direct_expense',
    'indirect_income', 'indirect_expense',
    'btb_current_liability', 'btb_current_asset',
    'btb_investment', 'btb_branch'
  ));
