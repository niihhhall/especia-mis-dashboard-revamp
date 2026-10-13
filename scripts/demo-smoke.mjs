#!/usr/bin/env node
// HTTP smoke test for DEMO_MODE: every page and download must answer cleanly.
//
//   node scripts/demo-smoke.mjs                 (against http://localhost:3000)
//   BASE_URL=http://localhost:3001 node scripts/demo-smoke.mjs
//
// Needs a running demo server (`npm run dev` with DEMO_MODE=true). Requests run
// one at a time with a generous timeout, because the first hit of each route in
// `next dev` compiles it. Exits 1 if any check fails.

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const TIMEOUT_MS = 180_000;
const SLUG = "tirupati-automart";
const C = `/c/${SLUG}`;

const ERROR_MARKERS = [
  "Your project's URL and Key are required",
  "__next_error__",
  "Application error",
  "Unhandled Runtime Error",
  "Internal Server Error",
];

const FIRM_PAGES = ["/companies", "/users", "/profile", "/audit", "/review", "/audit?action=upload_tb"];
/** Firm pages that may answer 200 or redirect into the company. */
const FIRM_MAYBE_REDIRECT = ["/queries", "/reports", "/upload"];
/** Entry points that redirect into the app in demo mode. */
const ENTRY_REDIRECTS = ["/", "/login"];

const COMPANY_PAGES = [
  "dashboard",
  "pnl",
  "segment",
  "book-to-bank",
  "cash-conversion",
  "budget-vs-actual",
  "charts",
  "compare",
  "creditors",
  "debtors",
  "gp-dashboard",
  "history",
  "queries",
  "reports",
  "upload",
  "branches",
  "budget",
  "inputs",
  "mapping",
  "master-data",
  "template",
].map((p) => `${C}/${p}`);

const DOWNLOADS = [
  `/export/xlsx?company=${SLUG}`,
  `/export/xlsx?company=${SLUG}&scope=month`,
  `/export/xlsx?company=${SLUG}&report=pnl`,
  `/export/xlsx?company=${SLUG}&report=debtors`,
  `/export/xlsx?company=${SLUG}&report=creditors`,
  `/export/xlsx?company=${SLUG}&period=demo-apr-2026`,
  `${C}/budget/template`,
  `${C}/mapping/template`,
];

const results = [];

async function get(path, cookie) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      redirect: "manual",
      signal: controller.signal,
      headers: cookie ? { Cookie: cookie } : {},
    });
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, location: res.headers.get("location"), type: res.headers.get("content-type") ?? "", buf };
  } finally {
    clearTimeout(timer);
  }
}

function markerIn(body) {
  return ERROR_MARKERS.find((m) => body.includes(m)) ?? null;
}

function record(label, path, ok, detail) {
  results.push({ label, path, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(10)} ${path}${detail ? `  — ${detail}` : ""}`);
}

/** Resolves a Location header to an in-app path, or null if it leaves the app. */
function inAppPath(location) {
  if (!location) return null;
  const url = new URL(location, BASE_URL);
  return url.origin === new URL(BASE_URL).origin ? `${url.pathname}${url.search}` : null;
}

async function checkPage(label, path, { cookie, allowRedirect = false, expectCompany = false } = {}) {
  try {
    let res = await get(path, cookie);
    let finalPath = path;
    if (res.status >= 300 && res.status < 400) {
      const target = inAppPath(res.location);
      if (!allowRedirect) return record(label, path, false, `unexpected ${res.status} → ${res.location}`);
      if (!target) return record(label, path, false, `redirect leaves the app → ${res.location}`);
      if (target.startsWith("/login")) return record(label, path, false, `redirects to login → ${target}`);
      finalPath = target;
      res = await get(target, cookie);
      if (res.status >= 300 && res.status < 400) {
        const next = inAppPath(res.location);
        if (!next || next.startsWith("/login")) return record(label, path, false, `bad second hop → ${res.location}`);
        finalPath = next;
        res = await get(next, cookie);
      }
    }
    if (res.status !== 200) return record(label, path, false, `status ${res.status}${finalPath !== path ? ` at ${finalPath}` : ""}`);
    const body = res.buf.toString("utf8");
    const marker = markerIn(body);
    if (marker) return record(label, path, false, `error marker "${marker}"${finalPath !== path ? ` at ${finalPath}` : ""}`);
    if (expectCompany && !body.includes("Tirupati")) return record(label, path, false, "body does not mention Tirupati");
    record(label, path, true, finalPath !== path ? `→ ${finalPath}` : "");
  } catch (e) {
    record(label, path, false, e instanceof Error ? e.message : String(e));
  }
}

async function checkDownload(path) {
  try {
    const res = await get(path);
    if (res.status !== 200) return record("download", path, false, `status ${res.status}: ${res.buf.toString("utf8").slice(0, 120)}`);
    if (!res.type.includes("spreadsheetml")) return record("download", path, false, `content-type ${res.type}`);
    if (res.buf.subarray(0, 2).toString("latin1") !== "PK") return record("download", path, false, "body is not an xlsx (no PK header)");
    record("download", path, true, `${res.buf.length} bytes`);
  } catch (e) {
    record("download", path, false, e instanceof Error ? e.message : String(e));
  }
}

async function main() {
  console.log(`Demo smoke against ${BASE_URL}\n`);
  try {
    const probe = await get("/api/auth/refresh");
    console.log(`probe /api/auth/refresh → ${probe.status} ${probe.buf.toString("utf8")}\n`);
  } catch (e) {
    console.error(`No server answering at ${BASE_URL}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  for (const path of ENTRY_REDIRECTS) await checkPage("entry", path, { allowRedirect: true });
  for (const path of FIRM_PAGES) await checkPage("firm", path);
  for (const path of FIRM_MAYBE_REDIRECT) await checkPage("firm", path, { allowRedirect: true });
  for (const path of COMPANY_PAGES) await checkPage("company", path, { expectCompany: true });
  await checkPage("company", `${C}/compare?a=demo-jun-2026&b=demo-apr-2026`, { expectCompany: true });
  for (const path of DOWNLOADS) await checkDownload(path);
  for (const period of ["demo-apr-2026", "demo-may-2026"]) {
    for (const path of COMPANY_PAGES) {
      await checkPage(period.slice(5, 8), path, { cookie: `mis_period=${period}`, expectCompany: true });
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  ${f.label} ${f.path} — ${f.detail}`);
    process.exit(1);
  }
}

await main();
