-- RLS isolation check. Runs entirely inside a transaction that ROLLS BACK, so
-- the fixtures (a second company, a draft period) never persist.
--
--   docker exec -i supabase_db_especia_dashboard psql -U postgres -d postgres < scripts/rls-check.sql
begin;

-- Fixtures ------------------------------------------------------------------
-- A company the CA is deliberately NOT assigned to, so "CA sees only assigned
-- companies" is tested rather than assumed.
insert into companies (id, slug, name, fy_start_month)
values ('22222222-2222-2222-2222-222222222222', 'othercorp', 'Other Corp Ltd', 4);

insert into periods (id, company_id, month, label, status)
values ('33333333-3333-3333-3333-333333333333',
        '22222222-2222-2222-2222-222222222222', '2026-04-01', 'Apr''26', 'published');

-- A draft month on the company user's OWN company. Its id is left alone —
-- master_tb references it — so its row count is what proves the hiding works.
update periods set status = 'draft' where label = 'Jul''26';

create temp table expect as
select
  (select count(*) from master_tb) as all_master_rows,
  (select count(*) from master_tb m join periods p on p.id = m.period_id
    where p.status = 'draft') as draft_master_rows;

-- Impersonation: Supabase resolves auth.uid() from the JWT claims.
create or replace function pg_temp.act_as(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
end $$;

\echo ''
\echo '### baseline (no RLS, as superuser)'
select * from expect;

\echo ''
\echo '### ADMIN — expect 2 companies, 6 periods, 1 draft visible, ALL master rows'
select pg_temp.act_as('983ff7c6-2470-450c-8cff-5eb7dea79a73');
select (select count(*) from companies) as companies,
       (select count(*) from periods)   as periods,
       (select count(*) from periods where status='draft') as drafts_visible,
       (select count(*) from master_tb) as master_rows;
reset role;

\echo ''
\echo '### CA — expect 1 company (Tirupati), 5 periods, draft VISIBLE, ledger_map visible'
select pg_temp.act_as('9ef63108-e798-47a0-8e78-f9493ccb8c32');
select (select count(*) from companies) as companies,
       (select count(*) from periods)   as periods,
       (select count(*) from periods where status='draft') as drafts_visible,
       (select count(*) from ledger_map) as ledger_map_rows;
select name as ca_visible_company from companies;
reset role;

\echo ''
\echo '### COMPANY — expect 1 company, 4 periods, 0 drafts, 0 ledger_map,'
\echo '###           and master_rows = all_master_rows MINUS draft_master_rows'
select pg_temp.act_as('de004bf1-013b-4d41-acda-809a989eccdf');
select (select count(*) from companies) as companies,
       (select count(*) from periods)   as periods,
       (select count(*) from periods where status='draft') as drafts_must_be_0,
       (select count(*) from ledger_map) as ledger_map_must_be_0,
       (select count(*) from master_tb)  as master_rows_excl_draft;
select label from periods order by month;
reset role;

\echo ''
\echo '### ANON — expect permission denied'
set local role anon;
select count(*) as anon_companies from companies;
reset role;

rollback;
