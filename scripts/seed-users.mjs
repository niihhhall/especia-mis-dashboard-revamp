// Seeds one user per role against the LOCAL Supabase stack, for development.
// Uses the service-role key: auth.admin.createUser is the only way to make an
// account now that self-signup is disabled.
//
//   node scripts/seed-users.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: companies, error: cErr } = await admin.from("companies").select("id, slug, name");
if (cErr) throw new Error(cErr.message);
const tirupati = companies.find((c) => c.slug === "tirupati") ?? companies[0];
if (!tirupati) throw new Error("No company to attach the company-role user to.");

const USERS = [
  { email: "admin@especia.test", password: "especia123", role: "admin", name: "Admin User", company_id: null },
  { email: "ca@especia.test", password: "especia123", role: "ca", name: "CA User", company_id: null },
  { email: "company@especia.test", password: "especia123", role: "company", name: "Tirupati Viewer", company_id: tirupati.id },
];

for (const u of USERS) {
  // Idempotent: reuse the account if a previous run already made it.
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((x) => x.email === u.email);

  let id = existing?.id;
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) throw new Error(`${u.email}: ${error.message}`);
    id = data.user.id;
  }

  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id, role: u.role, company_id: u.company_id, name: u.name, email: u.email });
  if (pErr) throw new Error(`${u.email} profile: ${pErr.message}`);
  console.log(`${existing ? "updated" : "created"}  ${u.role.padEnd(8)} ${u.email}`);
}

// The CA is assigned to Tirupati only — leaving a second company unassigned is
// what makes the "CA cannot see companies they aren't assigned to" test real.
const { data: caProfile } = await admin.from("profiles").select("id").eq("role", "ca").single();
const { error: aErr } = await admin
  .from("ca_companies")
  .upsert({ ca_id: caProfile.id, company_id: tirupati.id });
if (aErr) throw new Error(`assignment: ${aErr.message}`);
console.log(`assigned CA -> ${tirupati.name}`);
