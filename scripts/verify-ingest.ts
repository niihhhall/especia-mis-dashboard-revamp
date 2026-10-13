// End-to-end ingest verification against the running local DB. Replicates the
// upload server action: parse the fixture Trial Balance, load the ledger_map
// from Postgres, normalize, insert a period + master_tb, then read back and
// check the row count and that the P&L engine still reproduces the oracle from
// DB-round-tripped data. Run: npx tsx scripts/verify-ingest.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { DEFAULT_COMPANY_ID } from "../src/lib/data/constants";
import { parseTrialBalance } from "../src/lib/ingest/parse-workbook";
import { normalizeTrialBalance } from "../src/lib/ingest/normalize";
import { deriveCreditNatureGroupings, DEFAULT_TEMPLATE_LINES } from "../src/lib/mis/catalog";
import { computePnl } from "../src/lib/mis/pnl";
import type { LedgerMapEntry, MasterRow } from "../src/lib/mis/types";

function env(name: string): string {
  const raw = readFileSync(fileURLToPath(new URL("../.env.local", import.meta.url)), "utf8");
  const line = raw.split(/\r?\n/).find((l) => l.startsWith(name + "="));
  if (!line) throw new Error(`${name} missing from .env.local`);
  return line.slice(name.length + 1).trim();
}

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false },
});

const fx = (p: string) =>
  readFileSync(fileURLToPath(new URL(`../src/lib/mis/__tests__/fixtures/${p}`, import.meta.url)));

const APR26_MANUAL = {
  accessoriesSales: 1977513.81,
  otherSales: 6214935.7,
  discountReceived: 1092,
  employeeBenefitExpense: 756842,
  closingStock: 53427016.35,
  cashSalary: 437361,
  depreciation: 0,
  interestExpense: 648343,
};

async function main() {
  const { data: mapRows, error: mapErr } = await supabase
    .from("ledger_map")
    .select("ledger_name, grouping, bs_pl, classification")
    .eq("company_id", DEFAULT_COMPANY_ID);
  if (mapErr) throw mapErr;
  console.log(`ledger_map rows in DB: ${mapRows?.length ?? 0}`);
  const ledgerMap: LedgerMapEntry[] = (mapRows ?? []).map((r) => ({
    ledger: r.ledger_name,
    grouping: r.grouping,
    bs_pl: r.bs_pl,
    classification: r.classification,
  }));

  const creditNatureGroupings = deriveCreditNatureGroupings(DEFAULT_TEMPLATE_LINES);
  const parsed = parseTrialBalance(fx("Tirupati_Trial.xlsx"));
  const { rows, unmapped } = normalizeTrialBalance(parsed, ledgerMap, creditNatureGroupings);
  console.log(`parsed leaves: ${rows.length}, unmapped: ${unmapped.length}`);

  const { data: period, error: pErr } = await supabase
    .from("periods")
    .upsert(
      { company_id: DEFAULT_COMPANY_ID, month: "2026-04-01", label: "Apr'26", days_in_period: 30, status: "published" },
      { onConflict: "company_id,month" },
    )
    .select("id")
    .single();
  if (pErr) throw pErr;

  await supabase.from("master_tb").delete().eq("period_id", period.id);
  const payload = rows.map((r) => ({
    company_id: DEFAULT_COMPANY_ID,
    period_id: period.id,
    grouping: r.grouping,
    bs_pl: r.bsPl,
    particulars: r.particulars,
    classification: r.classification,
    opening: r.opening,
    debit: r.debit,
    credit: r.credit,
    closing: r.closing,
    unmapped: Boolean(r.unmapped),
  }));
  const ins = await supabase.from("master_tb").insert(payload);
  if (ins.error) throw ins.error;

  const { data: back, error: bErr } = await supabase
    .from("master_tb")
    .select("grouping, bs_pl, particulars, classification, opening, debit, credit, closing, unmapped")
    .eq("period_id", period.id);
  if (bErr) throw bErr;

  const dbRows: MasterRow[] = (back ?? []).map((r) => ({
    grouping: r.grouping,
    bsPl: r.bs_pl,
    particulars: r.particulars,
    classification: r.classification,
    opening: Number(r.opening),
    debit: Number(r.debit),
    credit: Number(r.credit),
    closing: Number(r.closing),
    unmapped: r.unmapped || undefined,
  }));
  console.log(`master_tb rows read back: ${dbRows.length}`);

  const pnl = computePnl(dbRows, APR26_MANUAL, DEFAULT_TEMPLATE_LINES);
  const t = pnl.totals;
  const check = (name: string, got: number, exp: number) => {
    const ok = Math.abs(got - exp) <= 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${got.toFixed(2)} (expected ${exp})`);
    if (!ok) process.exitCode = 1;
  };
  check("Revenue", t.revenue, 76852748.93);
  check("Gross Profit", t.grossProfit, 7530909.95);
  check("EBITDA", t.ebitda, 2927922.75);
  check("EBT", t.ebt, 2279579.75);
  console.log("Done — Master Data persisted for Apr'26.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
