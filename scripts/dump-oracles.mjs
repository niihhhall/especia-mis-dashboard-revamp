// Dump computed values for Segment / Book to Bank / CCC from the reference
// workbook, to use as engine oracles. Prints to stdout.
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
const RAW = "C:/Users/sjaya/Downloads/Especia-Dashboard-Demo/raw data/Tirupati_Final_MIS_Apr26.xlsx";
const wb = XLSX.read(readFileSync(RAW), { type: "buffer", cellFormula: true });
const val = (sheet, a) => (wb.Sheets[sheet]?.[a]?.v ?? null);
const n = (x) => (typeof x === "number" ? Math.round(x * 100) / 100 : x);

console.log("===== Segment wise PL (label | C Vehicle | D Accessories | E Service | F Total | G %) =====");
const S = "Segment wise PL";
for (let r = 5; r <= 26; r++) {
  const label = val(S, `B${r}`);
  const c = val(S, `C${r}`), d = val(S, `D${r}`), e = val(S, `E${r}`), f = val(S, `F${r}`), g = val(S, `G${r}`);
  if (label == null && c == null && f == null) continue;
  console.log(`${r}\t${label ?? ""}\t${n(c)}\t${n(d)}\t${n(e)}\t${n(f)}\t${n(g)}`);
}

console.log("\n===== Book to Bank (label | E Apr'26) =====");
const B = "Book to Bank";
for (let r = 8; r <= 49; r++) {
  const label = val(B, `C${r}`);
  const e = val(B, `E${r}`);
  if (label == null && e == null) continue;
  console.log(`${r}\t${label ?? ""}\t${n(e)}`);
}

console.log("\n===== CCC ratio table (label | C prior | L Apr'26) =====");
const CC = "CCC";
for (let r = 5; r <= 16; r++) {
  const label = val(CC, `B${r}`);
  const c = val(CC, `C${r}`), l = val(CC, `L${r}`);
  if (label == null && l == null && c == null) continue;
  console.log(`${r}\t${label ?? ""}\tC=${n(c)}\tL=${n(l)}`);
}
console.log("\n===== CCC working cells =====");
for (const a of ["X6", "X8", "X9", "X11", "X12", "X14", "AJ5", "AJ6", "AJ9", "AJ10", "AJ13", "AJ14", "L6", "L7", "L9", "L10", "L12", "L13", "L15"]) {
  console.log(`${a} = ${n(val(CC, a))}`);
}
