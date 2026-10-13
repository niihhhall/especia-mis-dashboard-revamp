-- Adjustments (manual_inputs) need a branch dimension too — confirmed
-- materially real, not hypothetical, by CityVibes' own real reference
-- workbook: its Closing Stock is tracked per branch there too (Jaipur and
-- Indore each have their own real cached figure), and the company-wide
-- total is naturally their sum. Before this, every manual override
-- (Closing Stock, Depreciation, Interest Expense, segment stock, revenue
-- overrides, ...) was period-level only, shared across every branch scope
-- — a real, previously-flagged limitation, now closed.
--
-- `set null`, not `cascade`, matching every other branch_id column here —
-- an adjustment's history must survive a branch being archived.
alter table public.manual_inputs
  add column branch_id uuid references public.branches(id) on delete set null;
create index manual_inputs_branch_idx on public.manual_inputs (period_id, branch_id);

-- The old unique(period_id, key, segment) would let a NEW branch-tagged row
-- collide with nothing (Postgres treats NULLs as distinct for uniqueness,
-- so existing null-branch rows are unaffected), but widen it to include
-- branch_id anyway so two rows for the SAME branch can't duplicate a key.
alter table public.manual_inputs drop constraint manual_inputs_period_id_key_segment_key;
alter table public.manual_inputs add constraint manual_inputs_period_id_key_segment_branch_key
  unique (period_id, key, segment, branch_id);
