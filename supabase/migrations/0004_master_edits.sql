-- Audit log for manual Master TB corrections.
--
-- `master_tb` keeps the CURRENT value; this table is an append-only record of
-- every change, so a CA can answer "who changed this, from what, and when".
-- It also makes a re-upload survivable: replaceMasterRows wipes the row, but
-- the discarded values remain here to be re-entered.

create table if not exists public.master_tb_edits (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_id  uuid not null references public.periods(id) on delete cascade,
  -- The ledger name, which is what identifies a row within a period. Not a FK
  -- to master_tb.id on purpose: that id is destroyed and recreated on every
  -- re-upload, which would cascade the history away with it.
  particulars text not null,
  field      text not null check (field in ('opening','debit','credit','closing')),
  old_value  numeric(20,2) not null,
  new_value  numeric(20,2) not null,
  edited_by  uuid references public.profiles(id) on delete set null,
  edited_at  timestamptz not null default now()
);

create index if not exists master_tb_edits_period_idx
  on public.master_tb_edits (period_id, particulars);
create index if not exists master_tb_edits_recent_idx
  on public.master_tb_edits (period_id, edited_at desc);

alter table public.master_tb_edits enable row level security;

-- Preparation detail, not client-facing: same rule as ledger_map.
create policy master_tb_edits_read on public.master_tb_edits
  for select to authenticated
  using (
    company_id in (select public.visible_company_ids())
    and (select public.current_app_role()) <> 'company'
  );

grant select on public.master_tb_edits to authenticated;
grant all privileges on public.master_tb_edits to service_role;
