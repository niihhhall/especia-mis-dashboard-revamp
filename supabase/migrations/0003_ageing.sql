-- Debtor / creditor ageing, uploaded per period alongside the Trial Balance.
--
-- One table with a `kind` discriminator rather than two near-identical tables:
-- the columns, the parser, the RLS rule and the report UI are the same for both
-- sides, and only the label differs.

create table if not exists public.ageing (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_id  uuid not null references public.periods(id) on delete cascade,
  kind       text not null check (kind in ('debtor','creditor')),
  party      text not null,
  b0_30      numeric(20,2) not null default 0,
  b30_60     numeric(20,2) not null default 0,
  b60_90     numeric(20,2) not null default 0,
  b90_180    numeric(20,2) not null default 0,
  b180_plus  numeric(20,2) not null default 0,
  total      numeric(20,2) not null default 0,
  created_at timestamptz not null default now(),
  -- A party appears once per side per period; re-uploading replaces the set.
  unique (period_id, kind, party)
);

create index if not exists ageing_period_kind_idx on public.ageing (period_id, kind);
create index if not exists ageing_company_idx on public.ageing (company_id);

alter table public.ageing enable row level security;

-- Same visibility rule as master_tb: the period must be visible to the caller,
-- and the row's own company must be one they can reach.
create policy ageing_read on public.ageing
  for select to authenticated
  using (
    public.can_see_period(period_id)
    and company_id in (select public.visible_company_ids())
  );

-- Newer Supabase does not auto-expose new tables.
grant select on public.ageing to authenticated;
grant all privileges on public.ageing to service_role;
