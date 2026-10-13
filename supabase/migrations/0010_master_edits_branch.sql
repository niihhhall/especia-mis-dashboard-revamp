-- Master Data edits need a branch reference too: a multi-branch company's
-- edit-history log would otherwise show two indistinguishable "Capital
-- Account" rows when two branches' cells were each corrected. Nullable,
-- `on delete set null` (not cascade) for the same reason as
-- master_tb.branch_id — an edit's history must survive a branch being
-- archived/removed, just like it already survives a re-upload destroying
-- the master_tb row itself (see this table's own particulars comment).
alter table public.master_tb_edits
  add column branch_id uuid references public.branches(id) on delete set null;
create index master_tb_edits_branch_idx on public.master_tb_edits (period_id, branch_id);
