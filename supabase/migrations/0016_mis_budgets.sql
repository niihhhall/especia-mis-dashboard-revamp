-- Budget vs Actual: per-period, per-P&L-line budget figures. EAV-shaped like
-- manual_inputs, but a separate table (not a new manual_inputs.key
-- namespace) — a budget figure is a forecast a CA types in for EVERY P&L
-- line (grouping/manual/computed alike — computeBudgetPnl ignores
-- mis_template_lines.kind entirely, see src/lib/mis/budget.ts), not an
-- override of a Trial-Balance-derived value, so it doesn't belong in the
-- "figures not in the Trial Balance" table manual_inputs already is.
--
-- `key` is either a mis_template_lines.key for this company, or one of four
-- fixed universal scalar keys (budgetOpeningStock, budgetClosingStock,
-- budgetDepreciation, budgetInterestExpense) mirroring manual_inputs'
-- UNIVERSAL_MANUAL_KEYS — needed to reproduce COGS/EBITDA/EBT arithmetic
-- from flat budget numbers the same way computePnl does from Actual ones.
--
-- Consolidated-only in v1, deliberately no branch_id — the user's confirmed
-- scope is company-level budgeting. Extending this later is additive (same
-- shape as 0011_manual_inputs_branch.sql), not a rewrite.
create table if not exists public.mis_budgets (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_id  uuid not null references public.periods(id) on delete cascade,
  key        text not null,
  amount     numeric(20,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, key)
);
create index if not exists mis_budgets_company_idx on public.mis_budgets (company_id, period_id);

-- --------------------------------------------------------------------- RLS
-- Client-visible, like manual_inputs — NOT staff-only like
-- mis_template_lines/branches. A `company`-role viewer can already see
-- Adjustments-derived figures (Closing Stock, etc.) through /pnl even
-- though they can't edit them (the Adjustments *page* is staff-gated by
-- (data)/layout.tsx, not by RLS). Budget vs Actual is architecturally a
-- Reports-section page like /pnl, so this follows manual_inputs_read's
-- shape exactly (0002_auth_roles.sql) rather than mis_template_lines_read's
-- (0007_company_templates.sql).
alter table public.mis_budgets enable row level security;

create policy mis_budgets_read on public.mis_budgets
  for select to authenticated
  using (
    public.can_see_period(period_id)
    and company_id in (select public.visible_company_ids())
  );

-- Writes go through the service-role client from Server Actions
-- (requireCompany(["ca","admin"], slug) enforces authorization app-side),
-- same as every other write path here.
grant select on public.mis_budgets to authenticated;
grant all privileges on public.mis_budgets to service_role;
