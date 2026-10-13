// Repairs the MIS Template "Move up/down" bug: every new line added via the
// Mapping page's auto-create-template-line flow (or the Template page's own
// "Add line") was inserted with a hardcoded sort_order of 999 (fixed in this
// same commit — see template/actions.ts and mapping/actions.ts). Once two or
// more lines in the same company+section share sort_order 999, "swap with
// the adjacent row in sort_order order" becomes unstable, and Move up/down
// jumps rows instead of moving them one step.
//
// This is a one-time data repair for companies whose template already has
// colliding sort_order values from before the code fix: within each
// (company_id, section) group, it re-sequences every line to a clean 1..N,
// ordered by (current sort_order, created_at) so already-distinct rows keep
// their relative order and only genuinely-tied rows get split by insertion
// order. Only groups that actually contain a duplicate are touched.
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

const { data: lines, error } = await supabase
  .from("mis_template_lines")
  .select("id, company_id, section, sort_order, created_at, label")
  .order("company_id", { ascending: true })
  .order("section", { ascending: true })
  .order("sort_order", { ascending: true })
  .order("created_at", { ascending: true });
if (error) throw error;

const { data: companies, error: ce } = await supabase.from("companies").select("id, name");
if (ce) throw ce;
const nameOf = new Map(companies.map((c) => [c.id, c.name]));

const groups = new Map(); // `${company_id}::${section}` -> rows in stable order
for (const row of lines) {
  const key = `${row.company_id}::${row.section}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

const updates = []; // { id, from, to, company, section, label }
for (const [key, rows] of groups) {
  const seen = new Set();
  let hasDup = false;
  for (const r of rows) {
    if (seen.has(r.sort_order)) hasDup = true;
    seen.add(r.sort_order);
  }
  if (!hasDup) continue;
  const [companyId, section] = key.split("::");
  rows.forEach((r, i) => {
    const to = i + 1;
    if (r.sort_order !== to) {
      updates.push({ id: r.id, from: r.sort_order, to, company: nameOf.get(companyId) ?? companyId, section, label: r.label });
    }
  });
}

console.log(`${updates.length} line(s) need a new sort_order, across ${new Set(updates.map((u) => u.company)).size} compan(y/ies):\n`);
for (const u of updates) {
  console.log(`  ${u.company} / ${u.section} / "${u.label}": ${u.from} -> ${u.to}`);
}

const dryRun = !process.argv.includes("--apply");
console.log(dryRun ? "\n--- DRY RUN (pass --apply to actually write) ---" : "\n--- APPLYING ---");

if (!dryRun) {
  for (const u of updates) {
    const { error: ue } = await supabase.from("mis_template_lines").update({ sort_order: u.to }).eq("id", u.id);
    if (ue) throw ue;
  }
  console.log(`Updated ${updates.length} row(s).`);
}
