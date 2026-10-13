-- ------------------------------------------------------------------ audit_log
-- One append-only row per security-relevant or data-changing event: signing
-- in or out, an upload, an Adjustments save, a Mapping change, and every user-
-- management action. Master TB cell edits already have their own detailed
-- table (`master_tb_edits`, with old/new values per field) — this table does
-- not duplicate that; the admin Audit Log screen reads both and merges them
-- into one timeline.
--
-- `actor_email` and `actor_role` are captured AT THE TIME of the event rather
-- than joined live from `profiles`. A removed user's login history should
-- still read "who they were" after their account is gone, and a role change
-- should not rewrite what an earlier action looked like at the time.
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_role  text,
  action     text not null,
  company_id uuid references public.companies(id) on delete set null,
  period_id  uuid references public.periods(id) on delete set null,
  -- Free-text subject of the action: a ledger name, a target user's email, a
  -- period label — whatever reads naturally in the log without a join.
  target     text,
  -- Structured extras that vary by action (row counts, which fields changed,
  -- old/new role) — kept as JSON rather than a wide sparse table of columns
  -- only one or two action types ever populate.
  detail     jsonb,
  ip         text,
  user_agent text
);

create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id);
create index if not exists audit_log_company_idx on public.audit_log (company_id);
create index if not exists audit_log_action_idx on public.audit_log (action);

alter table public.audit_log enable row level security;

-- Admin-only read. A CA's own actions are still logged here (accountability
-- cuts both ways), but the log itself is firm-oversight, not a client- or
-- CA-facing feature — the same boundary as the Users screen.
drop policy if exists audit_log_read on public.audit_log;
create policy audit_log_read on public.audit_log
  for select to authenticated
  using ((select public.current_app_role()) = 'admin');

-- No INSERT policy, same reasoning as `profiles`: every write goes through the
-- service-role client from inside a server action, never from the browser, so
-- there is no legitimate client-side insert to allow.
revoke select on public.audit_log from anon;
grant select on public.audit_log to authenticated;
grant all privileges on public.audit_log to service_role;
