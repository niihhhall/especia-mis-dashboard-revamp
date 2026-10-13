-- Companies grid: the 1.0 portal shows each client under its group ("Tirupati
-- Automart" / "Tirupati Group"), which several clients of the same promoter
-- share. Nullable, because a standalone company legitimately has no group and
-- the card simply falls back to the company name.
alter table companies add column if not exists group_name text;

update companies set group_name = 'Tirupati Group'
where slug = 'tirupati' and group_name is null;
