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

const { data: lm, error: e1 } = await supabase
  .from("ledger_map")
  .select("company_id, ledger_name, grouping")
  .eq("grouping", "Inventories");
if (e1) throw e1;
console.log("ledger_map rows with grouping='Inventories':", lm.length);
console.log(JSON.stringify(lm, null, 2));

const { data: mtl, error: e2 } = await supabase
  .from("mis_template_lines")
  .select("company_id, key, label, grouping")
  .eq("grouping", "Inventories");
if (e2) throw e2;
console.log("mis_template_lines rows with grouping='Inventories':", mtl.length);
console.log(JSON.stringify(mtl, null, 2));

const { count, error: e3 } = await supabase
  .from("master_tb")
  .select("id", { count: "exact", head: true })
  .eq("grouping", "Inventories");
if (e3) throw e3;
console.log("master_tb rows with grouping='Inventories':", count);
