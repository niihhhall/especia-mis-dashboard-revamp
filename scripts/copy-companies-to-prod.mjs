// One-off: copy CityVibes, Royal Enterprise, and Dynamic Expressions'
// company data from local dev into production, verbatim (same ids — safe,
// since these are fresh random UUIDs production has never seen).
//
// Copies, per company, in FK-safe order: companies -> branch_groups ->
// branches -> periods -> master_tb -> manual_inputs -> ledger_map ->
// mis_template_lines -> mis_segments -> report_scope_config.
//
// Deliberately NOT copied: ca_companies (local's assignments reference
// local's fake test users, meaningless in production — the real admin
// assigns a CA through the app once the company is live), audit_log
// (session history, not data), ageing/master_tb_edits (both empty for
// these 3 companies as of this writing, but copied too if present).
//
// Run with: node scripts/copy-companies-to-prod.mjs [--apply]
// Without --apply, it only reports what it WOULD copy (dry run).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SLUGS = ["cityvibes", "royal-enterprise", "dynamic-expressions-pvt-ltd"];
const APPLY = process.argv.includes("--apply");

function loadEnv(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).trim()];
      }),
  );
}

const localEnv = loadEnv(new URL("../.env.local", import.meta.url));
const prodEnv = loadEnv(new URL("../.env.production.local", import.meta.url));

const local = createClient(localEnv.NEXT_PUBLIC_SUPABASE_URL, localEnv.SUPABASE_SECRET_KEY);
const prod = createClient(prodEnv.NEXT_PUBLIC_SUPABASE_URL, prodEnv.SUPABASE_SECRET_KEY);

async function selectAll(client, table, filterCol, filterVal) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .eq(filterCol, filterVal)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`select ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) break;
  }
  return rows;
}

async function insertBatched(client, table, rows) {
  if (rows.length === 0) return;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await client.from(table).insert(chunk);
    if (error) throw new Error(`insert ${table} (rows ${i}-${i + chunk.length}): ${error.message}`);
  }
}

async function main() {
  console.log(APPLY ? "APPLY MODE — writing to production." : "DRY RUN — no writes. Pass --apply to actually copy.");

  // Pre-flight: refuse if any of these slugs already exist in production.
  const { data: existing, error: existErr } = await prod.from("companies").select("slug").in("slug", SLUGS);
  if (existErr) throw new Error(`prod company check: ${existErr.message}`);
  if ((existing ?? []).length > 0) {
    throw new Error(`Refusing to proceed — already in production: ${existing.map((c) => c.slug).join(", ")}`);
  }

  for (const slug of SLUGS) {
    console.log(`\n=== ${slug} ===`);
    const { data: company, error: cErr } = await local.from("companies").select("*").eq("slug", slug).maybeSingle();
    if (cErr) throw new Error(`local company lookup (${slug}): ${cErr.message}`);
    if (!company) throw new Error(`Company not found locally: ${slug}`);
    const companyId = company.id;

    const branchGroups = await selectAll(local, "branch_groups", "company_id", companyId);
    const branches = await selectAll(local, "branches", "company_id", companyId);
    const periods = await selectAll(local, "periods", "company_id", companyId);
    const periodIds = periods.map((p) => p.id);
    let masterTb = [];
    let manualInputs = [];
    let ageing = [];
    let masterTbEdits = [];
    for (const periodId of periodIds) {
      masterTb.push(...(await selectAll(local, "master_tb", "period_id", periodId)));
      manualInputs.push(...(await selectAll(local, "manual_inputs", "period_id", periodId)));
      ageing.push(...(await selectAll(local, "ageing", "period_id", periodId)));
      masterTbEdits.push(...(await selectAll(local, "master_tb_edits", "period_id", periodId)));
    }
    const ledgerMap = await selectAll(local, "ledger_map", "company_id", companyId);
    const templateLines = await selectAll(local, "mis_template_lines", "company_id", companyId);
    const segments = await selectAll(local, "mis_segments", "company_id", companyId);
    const scopeConfig = await selectAll(local, "report_scope_config", "company_id", companyId);

    console.log(
      `company=1 branch_groups=${branchGroups.length} branches=${branches.length} periods=${periods.length} ` +
        `master_tb=${masterTb.length} manual_inputs=${manualInputs.length} ageing=${ageing.length} ` +
        `master_tb_edits=${masterTbEdits.length} ledger_map=${ledgerMap.length} template_lines=${templateLines.length} ` +
        `segments=${segments.length} scope_config=${scopeConfig.length}`,
    );

    if (!APPLY) continue;

    await insertBatched(prod, "companies", [company]);
    await insertBatched(prod, "branch_groups", branchGroups);
    await insertBatched(prod, "branches", branches);
    await insertBatched(prod, "periods", periods);
    await insertBatched(prod, "master_tb", masterTb);
    await insertBatched(prod, "manual_inputs", manualInputs);
    await insertBatched(prod, "ageing", ageing);
    await insertBatched(prod, "master_tb_edits", masterTbEdits);
    await insertBatched(prod, "ledger_map", ledgerMap);
    await insertBatched(prod, "mis_template_lines", templateLines);
    await insertBatched(prod, "mis_segments", segments);
    await insertBatched(prod, "report_scope_config", scopeConfig);
    console.log(`Copied ${slug} to production.`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
