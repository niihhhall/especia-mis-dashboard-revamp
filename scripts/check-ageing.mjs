import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

// Mirror of parse-ageing.ts, run directly so the check does not depend on the
// TS toolchain (npx tsx hung previously).
const num = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") { const n = Number(v.replace(/[,\s₹]/g, "")); return Number.isFinite(n) ? n : 0; }
  return 0;
};
function parseAgeing(buffer) {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, blankrows: false });
  const headerIdx = aoa.findIndex((r) => r.some((c) => typeof c === "string" && c.replace(/\s/g, "") === "0-30"));
  if (headerIdx === -1) throw new Error("no header");
  const totalsRow = headerIdx > 0 ? aoa[headerIdx - 1] : null;
  const reportedTotal = totalsRow ? num(totalsRow[totalsRow.length - 1]) || null : null;
  const rows = [];
  for (const raw of aoa.slice(headerIdx + 1)) {
    const party = typeof raw[0] === "string" ? raw[0].trim() : "";
    if (!party) continue;
    if (/^(grand\s*)?total$/i.test(party)) continue;
    const b = [num(raw[1]), num(raw[2]), num(raw[3]), num(raw[4]), num(raw[5])];
    const total = raw[6] !== undefined ? num(raw[6]) : b.reduce((a, x) => a + x, 0);
    if (!b.some(Boolean) && !total) continue;
    rows.push({ party, b0_30: b[0], b30_60: b[1], b60_90: b[2], b90_180: b[3], b180_plus: b[4], total });
  }
  return { rows, reportedTotal };
}

const EXPECT = { "Creditors Aging.xlsx": 20410066.08, "Debtors Aging.xlsx": 14065752 };
let ok = true;
for (const [f, expected] of Object.entries(EXPECT)) {
  const r = parseAgeing(new Uint8Array(readFileSync(`W:/ROW TB TO MIS/July 2026/${f}`)));
  const sum = r.rows.reduce((a, x) => a + x.total, 0);
  const buckets = r.rows.reduce((a, x) => a + x.b0_30 + x.b30_60 + x.b60_90 + x.b90_180 + x.b180_plus, 0);
  const matchFile = Math.abs(sum - expected) < 1;
  const matchBuckets = Math.abs(sum - buckets) < 1;
  ok = ok && matchFile && matchBuckets;
  console.log(`${f}
  rows parsed      ${r.rows.length}
  sum of totals    ${sum.toFixed(2)}
  expected         ${expected.toFixed(2)}   ${matchFile ? "MATCH" : "*** MISMATCH ***"}
  reportedTotal    ${r.reportedTotal?.toFixed(2)}
  buckets add up   ${buckets.toFixed(2)}    ${matchBuckets ? "MATCH" : "*** MISMATCH ***"}
  sample           ${JSON.stringify(r.rows[0])}`);
}
console.log(ok ? "\nPARSER OK" : "\nPARSER FAILED");
