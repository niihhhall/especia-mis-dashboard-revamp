-- Multi-branch / multi-store Tally support.
--
-- "Branch" is a new axis handled ENTIRELY at the data layer — the pure MIS
-- engine (pnl.ts/book-to-bank.ts/ccc.ts/segment.ts) never learns about it.
-- master_tb.branch_id is nullable: every existing single-branch company's
-- rows stay branch_id = null forever, so every query that doesn't filter by
-- branch_id keeps returning exactly what it returns today. See the plan
-- ("NEXT INITIATIVE — Multi-branch / multi-store Tally support") for the
-- full design.

-- ------------------------------------------------------------------ branch_groups
-- Optional per-company channel/region rollup (e.g. Royal Enterprise's
-- B2C/B2B). A company with no use for this (e.g. CityVibes: 2 branches, no
-- channel concept) simply has zero rows here — branches.group_id stays
-- null for all of them, and the "group" scope depth degrades to showing
-- nothing extra beyond Consolidated, no code branch required.
create table public.branch_groups (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  key         text not null,             -- stable identity, e.g. "b2c"
  label       text not null,             -- "B2C", "Retail (B2C)"
  sort_order  smallint not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, key)
);
create index branch_groups_company_idx on public.branch_groups (company_id, sort_order);

-- ------------------------------------------------------------------------ branches
-- One row per Tally branch/cost-centre column. `label` is matched verbatim
-- (trimmed) against the branch-name header detected on each upload, so it
-- must track whatever Tally itself calls that branch.
create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  group_id    uuid references public.branch_groups(id) on delete set null,
  key         text not null,             -- stable identity (slugified label)
  label       text not null,             -- exact Tally branch-column label
  sort_order  smallint not null,
  archived_at timestamptz,               -- soft-delete — see actions.ts's archiveBranch
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, key)
);
create index branches_company_idx on public.branches (company_id, sort_order);
create index branches_group_idx   on public.branches (group_id);

-- ------------------------------------------------------------------------ master_tb
-- `set null`, not `cascade`: deleting/archiving a branch must never delete
-- real financial history. See archiveBranch — branches are soft-deleted in
-- practice, so this FK action is a defense-in-depth backstop, not the
-- normal path.
alter table public.master_tb
  add column branch_id uuid references public.branches(id) on delete set null;
create index master_tb_branch_idx on public.master_tb (period_id, branch_id);

-- --------------------------------------------------------------- report_scope_config
-- Per-company, per-report scope depth: how far that report's on-screen
-- selector AND its Excel export sheet/column generation are allowed to go.
-- One config drives both surfaces — see the plan's "Excel export" section.
-- Default 'consolidated' for every report on every company reproduces
-- today's exact behavior; a CA opts a report into more depth explicitly.
create table public.report_scope_config (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  report      text not null check (report in ('pnl','book_to_bank','ccc','segment')),
  scope_depth text not null default 'consolidated'
                check (scope_depth in ('consolidated','group','branch')),
  updated_at  timestamptz not null default now(),
  unique (company_id, report)
);

-- --------------------------------------------------------------------- RLS
-- Same visible_company_ids()/current_app_role() staff-only pattern as
-- mis_template_lines/mis_segments (0007_company_templates.sql). Read-only
-- policies — every write goes through a Server Action using
-- createAdminClient() (service-role, bypasses RLS), authorized via
-- requireCompany(["ca","admin"], slug).
alter table public.branch_groups       enable row level security;
alter table public.branches            enable row level security;
alter table public.report_scope_config enable row level security;

create policy branch_groups_read on public.branch_groups
  for select to authenticated
  using (company_id in (select public.visible_company_ids())
         and (select public.current_app_role()) <> 'company');

create policy branches_read on public.branches
  for select to authenticated
  using (company_id in (select public.visible_company_ids())
         and (select public.current_app_role()) <> 'company');

create policy report_scope_config_read on public.report_scope_config
  for select to authenticated
  using (company_id in (select public.visible_company_ids())
         and (select public.current_app_role()) <> 'company');

grant select on public.branch_groups, public.branches, public.report_scope_config
  to authenticated;
grant all privileges on public.branch_groups, public.branches, public.report_scope_config
  to service_role;
