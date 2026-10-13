-- Per-company MIS template — the configurable replacement for the hardcoded
-- P&L/Segment/Book-to-Bank grouping catalog in src/lib/mis/catalog.ts.
--
-- Today every company's P&L line items and 3-way segment split (Vehicle /
-- Accessories / Service) come from fixed TypeScript constants written for
-- Tirupati's own (vehicle-dealership) chart of accounts. This migration adds
-- the schema to make that per-company instead, so a client in any industry
-- can define its own P&L line list and its own segments, without a code
-- change. See the plan doc for the full design and rollout phases.

-- ------------------------------------------------------------- mis_template_lines
-- Replaces REVENUE_LINES / PURCHASE_LINES / DIRECT_EXPENSE_LINES /
-- INDIRECT_EXPENSE_LINES, and also covers Book to Bank's current-liability /
-- current-asset detail rows — same shape (an ordered, labeled, grouping- or
-- manual-sourced line), so one table instead of a second near-duplicate
-- mechanism. `kind='computed'` is a narrow, fixed meaning (today: Finance
-- Cost net of manual.interestExpense), not a general formula engine.
create table if not exists public.mis_template_lines (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  section        text not null check (section in (
                    'revenue', 'purchase', 'direct_expense',
                    'indirect_income', 'indirect_expense',
                    'btb_current_liability', 'btb_current_asset'
                  )),
  sort_order     smallint not null,
  kind           text not null check (kind in ('grouping', 'manual', 'computed')),
  -- Stable identity: the StatementLine key, the manual_inputs field name
  -- (for kind='manual' revenue/indirect_income lines), and the Excel/UI key.
  key            text not null,
  label          text not null,
  -- kind='grouping': the Master TB grouping this line sums.
  -- kind='computed': the grouping the computed value is based on.
  grouping       text,
  -- kind='manual': the ManualInputs field to read; falls back to summing
  -- `fallback_grouping` when that manual value is absent.
  manual_key     text,
  fallback_grouping text,
  -- True for a naturally credit-nature line (a revenue/indirect-income line
  -- whose closing balance reads negative and must be flipped to show
  -- positive). Also doubles as this line's own credit-nature signal — see
  -- the read-side derivation note below.
  negate         boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (company_id, key)
);
create index if not exists mis_template_lines_company_idx
  on public.mis_template_lines (company_id, section, sort_order);

-- ------------------------------------------------------------------ mis_segments
-- Replaces the fixed vehicle/accessories/service triplet (SegmentTriplet in
-- src/lib/mis/types.ts) with a variable-length, per-company list. Its own
-- table rather than a mis_template_lines row because a segment carries a
-- many-valued purchase_groupings array, which doesn't fit the
-- one-grouping-per-row shape the P&L lines use.
create table if not exists public.mis_segments (
  id                        uuid primary key default gen_random_uuid(),
  company_id                uuid not null references public.companies(id) on delete cascade,
  -- Also the key stored in manual_inputs.segment for this segment's stock
  -- opening/closing rows — manual_inputs.segment is already free text, so no
  -- migration is needed there.
  key                       text not null,
  label                     text not null,
  sort_order                smallint not null,
  revenue_grouping          text,
  revenue_manual_key        text,
  revenue_fallback_grouping text,
  purchase_groupings        text[] not null default '{}',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (company_id, key)
);
create index if not exists mis_segments_company_idx
  on public.mis_segments (company_id, sort_order);

-- --------------------------------------------------------------------- RLS
-- Preparation/configuration data, not client-facing — same rule as
-- ledger_map and master_tb_edits: staff (ca/admin) only, never `company`.
alter table public.mis_template_lines enable row level security;
alter table public.mis_segments        enable row level security;

create policy mis_template_lines_read on public.mis_template_lines
  for select to authenticated
  using (
    company_id in (select public.visible_company_ids())
    and (select public.current_app_role()) <> 'company'
  );

create policy mis_segments_read on public.mis_segments
  for select to authenticated
  using (
    company_id in (select public.visible_company_ids())
    and (select public.current_app_role()) <> 'company'
  );

-- Newer Supabase does not auto-expose new tables. Writes go through the
-- service-role client from Server Actions (requireRole/requireCompany
-- enforce authorization app-side), same as every other write path here.
grant select on public.mis_template_lines, public.mis_segments to authenticated;
grant all privileges on public.mis_template_lines, public.mis_segments to service_role;
