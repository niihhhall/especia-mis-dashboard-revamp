// One-off: backfill the REAL production Tirupati company's MIS template,
// from the same source 0008_backfill_tirupati_template.sql was generated
// from (DEFAULT_TEMPLATE_LINES / DEFAULT_SEGMENTS in catalog.ts).
//
// 0008 hardcodes company id 11111111-1111-1111-1111-111111111111, which is
// the LOCAL dev seed's fixed id — production's real Tirupati company has a
// different id (created via createCompany's gen_random_uuid()), so 0008 was
// deliberately NOT pushed to production (see supabase/migrations' 0008 file
// itself, and the plan file's Phase 5 notes). This script does the same
// insert, targeted at the real production id, going through supabase-js
// (structured .insert() calls) rather than raw SQL so there's no
// hand-transcription step between the source arrays and what lands in the
// database.
//
// Run once: npx tsx scripts/backfill-tirupati-template-prod.mts
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { DEFAULT_SEGMENTS, DEFAULT_TEMPLATE_LINES } from "../src/lib/mis/catalog";

const PRODUCTION_TIRUPATI_ID = "57512ebb-14b1-45da-8946-8ffc3bf0b820";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.production.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

async function main() {
  const { data: company, error: companyErr } = await client
    .from("companies")
    .select("id, slug, name")
    .eq("id", PRODUCTION_TIRUPATI_ID)
    .maybeSingle();
  if (companyErr) throw new Error(`company lookup failed: ${companyErr.message}`);
  if (!company) throw new Error(`Refusing to proceed — company ${PRODUCTION_TIRUPATI_ID} not found in production.`);
  console.log("Target company:", company);

  const { count: existingLines } = await client
    .from("mis_template_lines")
    .select("*", { count: "exact", head: true })
    .eq("company_id", PRODUCTION_TIRUPATI_ID);
  const { count: existingSegments } = await client
    .from("mis_segments")
    .select("*", { count: "exact", head: true })
    .eq("company_id", PRODUCTION_TIRUPATI_ID);
  if ((existingLines ?? 0) > 0 || (existingSegments ?? 0) > 0) {
    throw new Error(
      `Refusing to proceed — company already has ${existingLines} template line(s) / ${existingSegments} segment(s). This script is meant to run once against an empty template.`,
    );
  }

  const lineRows = DEFAULT_TEMPLATE_LINES.map((l) => ({
    company_id: PRODUCTION_TIRUPATI_ID,
    section: l.section,
    sort_order: l.sortOrder,
    kind: l.kind,
    key: l.key,
    label: l.label,
    grouping: l.grouping ?? null,
    manual_key: l.manualKey ?? null,
    fallback_grouping: l.fallbackGrouping ?? null,
    negate: l.negate ?? false,
  }));
  const { error: lineErr } = await client.from("mis_template_lines").insert(lineRows);
  if (lineErr) throw new Error(`mis_template_lines insert failed: ${lineErr.message}`);
  console.log(`Inserted ${lineRows.length} mis_template_lines rows.`);

  const segmentRows = DEFAULT_SEGMENTS.map((s) => ({
    company_id: PRODUCTION_TIRUPATI_ID,
    key: s.key,
    label: s.label,
    sort_order: s.sortOrder,
    revenue_grouping: s.revenueGrouping ?? null,
    revenue_manual_key: s.revenueManualKey ?? null,
    revenue_fallback_grouping: s.revenueFallbackGrouping ?? null,
    purchase_groupings: s.purchaseGroupings,
  }));
  const { error: segErr } = await client.from("mis_segments").insert(segmentRows);
  if (segErr) throw new Error(`mis_segments insert failed: ${segErr.message}`);
  console.log(`Inserted ${segmentRows.length} mis_segments rows.`);

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
