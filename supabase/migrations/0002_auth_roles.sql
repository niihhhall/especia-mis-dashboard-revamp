-- Especia MIS — authentication, roles and multi-company scoping.
--
-- Replaces the Phase-1 "everyone may read" policies with real per-role rules:
--   admin   -> every company
--   ca      -> only companies explicitly assigned in ca_companies
--   company -> only its own company, and only PUBLISHED periods
--
-- NOTE ON WRITES: the app's ingestion writes go through the service-role client,
-- which bypasses RLS entirely. These policies therefore secure READS only —
-- write authorisation is enforced in the server actions via requireRole().
-- Adding write policies here would give a false sense of protection.

-- --------------------------------------------------------------- profiles
-- One row per auth user. `company_id` is set for company-role users only;
-- ca/admin leave it null and reach companies through ca_companies / role.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin','ca','company')),
  company_id uuid references public.companies(id) on delete set null,
  name       text,
  email      text,
  created_at timestamptz not null default now()
);
create index if not exists profiles_company_idx on public.profiles (company_id);

-- A company-role profile is meaningless without a company to point at.
alter table public.profiles drop constraint if exists profiles_company_required;
alter table public.profiles add constraint profiles_company_required
  check (role <> 'company' or company_id is not null);

-- ----------------------------------------------------------- ca_companies
-- Which CA works on which company. Composite PK prevents duplicates.
create table if not exists public.ca_companies (
  ca_id      uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ca_id, company_id)
);
create index if not exists ca_companies_company_idx on public.ca_companies (company_id);

-- ---------------------------------------------------------------- queries
-- Notes a company raises against a period, and the CA's replies.
create table if not exists public.queries (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_id  uuid references public.periods(id) on delete set null,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  status     text not null default 'open' check (status in ('open','answered','closed')),
  created_at timestamptz not null default now()
);
create index if not exists queries_company_idx on public.queries (company_id, created_at desc);

create table if not exists public.query_replies (
  id         uuid primary key default gen_random_uuid(),
  query_id   uuid not null references public.queries(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists query_replies_query_idx on public.query_replies (query_id, created_at);

-- ------------------------------------------------------- helper functions
-- SECURITY DEFINER is load-bearing here: these read `profiles`, and a policy ON
-- profiles that queried profiles directly would recurse forever. Running as the
-- definer bypasses RLS inside the function and breaks that cycle.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $fn$
  select role from public.profiles where id = auth.uid();
$fn$;

create or replace function public.visible_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, auth
as $fn$
  select c.id
  from public.companies c
  where case (select p.role from public.profiles p where p.id = auth.uid())
    when 'admin'   then true
    when 'ca'      then exists (
                        select 1 from public.ca_companies x
                        where x.ca_id = auth.uid() and x.company_id = c.id)
    when 'company' then c.id = (select p.company_id from public.profiles p where p.id = auth.uid())
    else false
  end;
$fn$;

-- True when the caller may see this period. Company users are limited to
-- published months; ca/admin see drafts too (they are the ones preparing them).
create or replace function public.can_see_period(p_period_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $fn$
  select exists (
    select 1
    from public.periods pr
    where pr.id = p_period_id
      and pr.company_id in (select public.visible_company_ids())
      and (public.current_app_role() <> 'company' or pr.status = 'published')
  );
$fn$;

-- ------------------------------------------------------------------- RLS
-- Drop the Phase-1 read-everything policies.
do $mig$
declare t text;
begin
  foreach t in array array['companies','periods','master_tb','ledger_map','manual_inputs','stock_info']
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_read', t);
  end loop;
end $mig$;

alter table public.profiles      enable row level security;
alter table public.ca_companies  enable row level security;
alter table public.queries       enable row level security;
alter table public.query_replies enable row level security;

-- A user always sees their own profile; admins see everyone (user management).
create policy profiles_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or (select public.current_app_role()) = 'admin');

create policy ca_companies_read on public.ca_companies
  for select to authenticated
  using (ca_id = auth.uid() or (select public.current_app_role()) = 'admin');

create policy companies_read on public.companies
  for select to authenticated
  using (id in (select public.visible_company_ids()));

create policy periods_read on public.periods
  for select to authenticated
  using (
    company_id in (select public.visible_company_ids())
    and ((select public.current_app_role()) <> 'company' or status = 'published')
  );

-- Period-scoped data inherits the period's visibility, so a draft month stays
-- invisible to a company user even if they guess a row id.
create policy master_tb_read on public.master_tb
  for select to authenticated
  using (
    public.can_see_period(period_id)
    and company_id in (select public.visible_company_ids())
  );

create policy manual_inputs_read on public.manual_inputs
  for select to authenticated
  using (
    public.can_see_period(period_id)
    and company_id in (select public.visible_company_ids())
  );

create policy stock_info_read on public.stock_info
  for select to authenticated
  using (
    public.can_see_period(period_id)
    and company_id in (select public.visible_company_ids())
  );

-- The ledger map is preparation data, not client-facing.
create policy ledger_map_read on public.ledger_map
  for select to authenticated
  using (
    company_id in (select public.visible_company_ids())
    and (select public.current_app_role()) <> 'company'
  );

create policy queries_read on public.queries
  for select to authenticated
  using (company_id in (select public.visible_company_ids()));

create policy query_replies_read on public.query_replies
  for select to authenticated
  using (exists (
    select 1 from public.queries q
    where q.id = query_id and q.company_id in (select public.visible_company_ids())
  ));

-- ---------------------------------------------------------------- grants
-- Newer Supabase does not auto-expose new public tables; without these the
-- reads above fail with `permission denied` before RLS is ever consulted.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles, public.ca_companies, public.queries, public.query_replies
  to authenticated;
grant all privileges on public.profiles, public.ca_companies, public.queries, public.query_replies
  to service_role;
revoke execute on function public.current_app_role(), public.visible_company_ids(),
  public.can_see_period(uuid) from public;
grant execute on function public.current_app_role(), public.visible_company_ids(),
  public.can_see_period(uuid) to authenticated, service_role;

-- Phase 1 granted SELECT to `anon`. With auth in place, anonymous reads must go.
-- The plain REVOKE only affects tables that exist right now, so also change the
-- default for anything added later.
revoke select on all tables in schema public from anon;
alter default privileges in schema public revoke select on tables from anon;

-- NOTE ON PROVISIONING: `profiles` has no INSERT policy and there is no signup
-- trigger — deliberately. Accounts are created by an admin through the service-
-- role client, so there is no path for a user to invent their own role or point
-- themselves at another company. A signed-in user with no profile row resolves
-- to null in getSessionProfile() and is treated as having no access.
