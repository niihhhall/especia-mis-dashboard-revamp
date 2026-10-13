-- Especia MIS Dashboard — initial schema.
-- The DB mirrors the reference workbook's Master Data: master_tb columns match
-- the Master_TB sheet. Every table carries company_id for future multi-tenant +
-- auth (Phase: auth). For now RLS allows read to everyone; writes go through the
-- service-role (admin) client server-side, which bypasses RLS.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ companies
create table if not exists public.companies (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  name           text not null,
  fy_start_month smallint not null default 4, -- 4 = April (Indian FY)
  pan            text,
  gst            text,
  cin            text,
  address        text,
  created_at     timestamptz not null default now()
);

-- -------------------------------------------------------------------- periods
create table if not exists public.periods (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  month          date not null,             -- 1st of the reporting month
  label          text not null,             -- e.g. "Apr'26"
  days_in_period smallint,
  status         text not null default 'draft' check (status in ('draft','published')),
  created_at     timestamptz not null default now(),
  unique (company_id, month)
);

-- ------------------------------------------------------------------- master_tb
-- One row per leaf ledger per period. Mirrors Master_TB: Grouping | B.S/P.L |
-- Particulars | Classification | Opening | Debit | Credit | Closing.
create table if not exists public.master_tb (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  period_id      uuid not null references public.periods(id) on delete cascade,
  grouping       text not null,
  bs_pl          text not null check (bs_pl in ('B.S','P.L')),
  particulars    text not null,
  classification text not null,
  opening        numeric(20,2) not null default 0,
  debit          numeric(20,2) not null default 0,
  credit         numeric(20,2) not null default 0,
  closing        numeric(20,2) not null default 0,
  unmapped       boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists master_tb_period_idx on public.master_tb (period_id);
create index if not exists master_tb_grouping_idx on public.master_tb (period_id, grouping);

-- ------------------------------------------------------------------ ledger_map
-- Per-company mapping: raw Tally ledger name -> MIS grouping. The editable
-- "heart" of the transform (auto-suggest + review queue maintain it).
create table if not exists public.ledger_map (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  ledger_name    text not null,
  grouping       text not null,
  bs_pl          text not null check (bs_pl in ('B.S','P.L')),
  classification text,
  source         text not null default 'manual' check (source in ('auto','manual')),
  updated_at     timestamptz not null default now(),
  unique (company_id, ledger_name)
);

-- --------------------------------------------------------------- manual_inputs
-- Per-period figures not in the Trial Balance (closing stock, depreciation,
-- interest, cash salary, segment stock splits, sales overrides, ...).
create table if not exists public.manual_inputs (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_id  uuid not null references public.periods(id) on delete cascade,
  key        text not null,
  segment    text not null default '',       -- '' = not segment-specific
  value      numeric(20,2) not null default 0,
  unique (period_id, key, segment)
);

-- ------------------------------------------------------------------ stock_info
create table if not exists public.stock_info (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  period_id     uuid not null references public.periods(id) on delete cascade,
  category      text not null,               -- e.g. BHAKURI / SPARES / VEHICLES
  opening_value numeric(20,2) not null default 0,
  closing_value numeric(20,2) not null default 0,
  unique (period_id, category)
);

-- --------------------------------------------------------------------- RLS
-- Phase 1 (no auth yet): everyone may read; writes are service-role only.
-- Tighten SELECT to company scoping when auth lands.
alter table public.companies    enable row level security;
alter table public.periods      enable row level security;
alter table public.master_tb    enable row level security;
alter table public.ledger_map   enable row level security;
alter table public.manual_inputs enable row level security;
alter table public.stock_info   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['companies','periods','master_tb','ledger_map','manual_inputs','stock_info']
  loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true);',
      t || '_read', t
    );
  end loop;
end $$;

-- Table privileges. Newer Supabase does not auto-expose new public tables, so
-- grant explicitly: reads for anon/authenticated (RLS still filters), full
-- access for the service-role (admin/ingestion) client.
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
