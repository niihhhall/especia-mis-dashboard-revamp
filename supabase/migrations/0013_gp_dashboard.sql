-- GP Dashboard: a CA-uploaded, self-contained HTML working file shown
-- verbatim for a period — not a computed report, so it lives as a plain
-- nullable text column rather than a new table. No new RLS policy is
-- needed: `periods_read` (0002_auth_roles.sql) already scopes every column
-- on this row by visible_company_ids() and, for a `company`-role reader,
-- requires status = 'published' — this column inherits that automatically.
alter table public.periods
  add column if not exists gp_dashboard_html text;
