import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.production.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const { data: companies, error: ce } = await supabase
  .from("companies")
  .select("id, name")
  .in("id", [
    "57512ebb-14b1-45da-8946-8ffc3bf0b820",
    "15398263-cd38-4db2-aa3b-da28600e2989",
    "9b177469-5ab5-4fb3-84b9-eea38e12fe60",
    "0b7bfa31-d2c7-4f31-a80e-cf7201df3c9e",
    "c1d0d998-fc7b-4d15-a5fe-d3bd1c661dcb",
  ]);
if (ce) throw ce;
console.log("Companies affected:", JSON.stringify(companies, null, 2));

const dryRun = !process.argv.includes("--apply");
console.log(dryRun ? "\n--- DRY RUN (pass --apply to actually write) ---\n" : "\n--- APPLYING ---\n");

if (!dryRun) {
  const { data: lmUpdated, error: e1 } = await supabase
    .from("ledger_map")
    .update({ grouping: "Opening Stock" })
    .eq("grouping", "Inventories")
    .select("company_id, ledger_name");
  if (e1) throw e1;
  console.log("ledger_map updated:", lmUpdated.length);

  const { data: mtbUpdated, error: e2 } = await supabase
    .from("master_tb")
    .update({ grouping: "Opening Stock" })
    .eq("grouping", "Inventories")
    .select("id");
  if (e2) throw e2;
  console.log("master_tb updated:", mtbUpdated.length);
}
