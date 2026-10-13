-- Company settings: soft-delete (archive) and a logo.
--
-- Archiving is a soft-delete, matching how `branches.archived_at` already
-- works — the company row and everything under it stays exactly as it was,
-- it's just excluded from the default company list/switcher for anyone but
-- an admin (see `listCompanies`'s `includeArchived` param). Nothing here
-- blocks direct access to an archived company's own `/c/[slug]/...` pages;
-- financial history for a client the firm no longer actively manages should
-- stay reachable, not disappear.
alter table public.companies
  add column if not exists archived_at timestamptz,
  add column if not exists logo_url text;

-- A public bucket for company logos. Public (not RLS-gated read) because a
-- logo is display chrome, not sensitive data, and it needs to render from a
-- plain <img src> without an auth header. All writes go through
-- `createAdminClient()` (service role, same as every other write path in
-- this app), so no insert/update/delete policy is needed on storage.objects
-- either — service role bypasses RLS entirely, exactly as it does for every
-- table in this schema.
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;
