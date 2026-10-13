-- Speed-only change to row-level security — same rules, evaluated once instead of once per row.
--
-- The read policies on master_tb / manual_inputs / ageing / stock_info / mis_budgets used
-- `can_see_period(period_id)`, a function that runs its own lookup (periods + visible companies +
-- the caller's role) FOR EVERY ROW. Reading one month of Royal Enterprise (3,346 ledger rows, fetched
-- in several pages per request) therefore cost ~1,100 ms per read; the same read with no policy costs
-- ~0.6 ms.
--
-- `visible_period_ids()` returns exactly the periods `can_see_period` accepts, as a set. A policy of
-- the form `period_id IN (SELECT visible_period_ids())` is uncorrelated, so Postgres evaluates the set
-- once and hash-matches each row against it. Visibility is identical:
--   - admin  : every period of every company
--   - ca     : periods of the companies assigned to them
--   - company: only PUBLISHED periods of their own company (a draft month stays invisible)
-- `can_see_period` itself is left in place (other callers / future use); only the five policies change.

create or replace function public.visible_period_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select pr.id
  from public.periods pr
  where pr.company_id in (select public.visible_company_ids())
    and (public.current_app_role() <> 'company' or pr.status = 'published');
$$;

revoke execute on function public.visible_period_ids() from public;
grant execute on function public.visible_period_ids() to authenticated, service_role;

drop policy if exists master_tb_read on public.master_tb;
create policy master_tb_read on public.master_tb
  for select to authenticated
  using (
    period_id in (select public.visible_period_ids())
    and company_id in (select public.visible_company_ids())
  );

drop policy if exists manual_inputs_read on public.manual_inputs;
create policy manual_inputs_read on public.manual_inputs
  for select to authenticated
  using (
    period_id in (select public.visible_period_ids())
    and company_id in (select public.visible_company_ids())
  );

drop policy if exists ageing_read on public.ageing;
create policy ageing_read on public.ageing
  for select to authenticated
  using (
    period_id in (select public.visible_period_ids())
    and company_id in (select public.visible_company_ids())
  );

drop policy if exists stock_info_read on public.stock_info;
create policy stock_info_read on public.stock_info
  for select to authenticated
  using (
    period_id in (select public.visible_period_ids())
    and company_id in (select public.visible_company_ids())
  );

drop policy if exists mis_budgets_read on public.mis_budgets;
create policy mis_budgets_read on public.mis_budgets
  for select to authenticated
  using (
    period_id in (select public.visible_period_ids())
    and company_id in (select public.visible_company_ids())
  );
