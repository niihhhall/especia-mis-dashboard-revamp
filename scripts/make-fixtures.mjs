// Generate self-contained test fixtures from the reference workbooks into the
// project, so the engine unit test needs no external files.
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const RAW_DIR = "C:/Users/sjaya/Downloads/Especia-Dashboard-Demo/raw data";
const FIX = "C:/especia-dashboard/src/lib/mis/__tests__/fixtures";
const SEED = "C:/especia-dashboard/src/lib/mis/seed";
mkdirSync(FIX, { recursive: true });
mkdirSync(SEED, { recursive: true });

const rd = (f) => readFileSync(resolve(RAW_DIR, f));
const wb = XLSX.read(rd("Tirupati_Final_MIS_Apr26.xlsx"), { type: "buffer", cellFormula: true });
const U = XLSX.utils;
const v = (ws, a) => (ws[a]?.v ?? null);
const round2 = (x) => (typeof x === "number" ? Math.round(x * 100) / 100 : x);

// --- Master_TB oracle (signed, normalized) ---
const m = wb.Sheets["Master_TB"];
const mr = U.decode_range(m["!ref"]);
const master = [];
for (let r = 3; r <= mr.e.r + 1; r++) {
  const grouping = v(m, `B${r}`), particulars = v(m, `D${r}`);
  if (!particulars || !grouping) continue;
  master.push({
    grouping: String(grouping).trim(),
    bs_pl: v(m, `C${r}`),
    particulars: String(particulars).trim(),
    classification: v(m, `E${r}`),
    opening: round2(v(m, `E${r}` && `F${r}`)),
    debit: round2(v(m, `G${r}`)),
    credit: round2(v(m, `H${r}`)),
    closing: round2(v(m, `I${r}`)),
  });
}
// fix opening (col F)
for (let i = 0, r = 3; r <= mr.e.r + 1; r++) {
  const grouping = v(m, `B${r}`), particulars = v(m, `D${r}`);
  if (!particulars || !grouping) continue;
  master[i].opening = round2(v(m, `F${r}`));
  i++;
}
writeFileSync(resolve(FIX, "master_tb.expected.json"), JSON.stringify(master, null, 2));

// --- P&L expected (Apr'26 col E) by label ---
const p = wb.Sheets["P&L"];
const pr = U.decode_range(p["!ref"]);
const pnl = {};
for (let r = 1; r <= pr.e.r + 1; r++) {
  const label = v(p, `B${r}`), val = v(p, `E${r}`);
  if (label && typeof val === "number") pnl[String(label).trim()] = round2(val);
}
writeFileSync(resolve(FIX, "pnl.expected.json"), JSON.stringify(pnl, null, 2));

// --- Seed ledger->grouping map (Tirupati) ---
const seed = master.map((x) => ({
  ledger: x.particulars,
  grouping: x.grouping,
  bs_pl: x.bs_pl,
  classification: x.classification,
}));
writeFileSync(resolve(SEED, "ledger-map.tirupati.json"), JSON.stringify(seed, null, 2));

// --- Copy raw source files as fixtures ---
copyFileSync(resolve(RAW_DIR, "Tirupati Trial.xls"), resolve(FIX, "Tirupati_Trial.xlsx"));
copyFileSync(resolve(RAW_DIR, "Tirupati_Stock_Info.xlsx"), resolve(FIX, "Tirupati_Stock_Info.xlsx"));

console.log(`master rows: ${master.length}`);
console.log(`pnl labels: ${Object.keys(pnl).length}`);
console.log("Key P&L:", {
  Revenue: pnl["Revenue From Operations"],
  COGS: pnl["COGS"],
  GP: pnl["Gross Profit"],
  EBITDA: pnl["EBITDA"],
  EBT: pnl["EBT"],
});
