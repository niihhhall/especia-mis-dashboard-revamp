import { AuthError, requireUser } from "@/lib/auth/guard";
import { getScopedCompany } from "@/lib/data/company-context";
import {
  getAgeing,
  getCompany,
  getFyPeriods,
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getMisTemplate,
  getPeriods,
  getSelectedPeriod,
} from "@/lib/data/mis";
import {
  ageingSheet,
  bookToBankSheet,
  cccSheet,
  compactFyLabel,
  coverSheet,
  masterSheet,
  pnlSheet,
  segmentSheet,
  summarySheet,
  type MonthData,
  type WorkbookInput,
} from "@/lib/export/mis-workbook";
import { createWorkbook } from "@/lib/export/workbook";
import { computeBookToBank } from "@/lib/mis/book-to-bank";
import { computeCcc } from "@/lib/mis/ccc";
import { fyLabel } from "@/lib/mis/period";
import { computePnl } from "@/lib/mis/pnl";
import { computeSegment } from "@/lib/mis/segment";
import { buildYtd } from "@/lib/mis/ytd";

/** Which sheets to include. `all` is the whole pack. */
export type ReportKey =
  | "all"
  | "master"
  | "pnl"
  | "segment"
  | "book-to-bank"
  | "ccc"
  | "debtors"
  | "creditors";

const VALID: ReportKey[] = [
  "all",
  "master",
  "pnl",
  "segment",
  "book-to-bank",
  "ccc",
  "debtors",
  "creditors",
];

/**
 * Excel export of the MIS, in the client's own workbook format.
 *
 *   GET /export/xlsx                    the FY pack — every month side by side
 *   GET /export/xlsx?scope=month        just the selected month
 *   GET /export/xlsx?report=pnl         one sheet
 *   GET /export/xlsx?period=<id>        a specific month
 *
 * FY is the default because that is the client's normal deliverable: their own
 * workbook lays a whole financial year across the columns of every statement.
 *
 * The requested month is resolved against `getPeriods()` rather than trusted
 * from the query string. That read is RLS-filtered, so a company user asking
 * for another company's period — or one of their own still in draft — will
 * simply not find it.
 *
 * Which COMPANY comes from `?company=<slug>` — a Route Handler is not covered
 * by the `/c/[slug]` layout, so this resolves and access-checks the slug
 * itself via `getScopedCompany()`, the same function every page uses. This
 * used to travel through a `proxy.ts`-injected request header instead; a
 * Route Handler gets the full request URL natively, so it never needed the
 * header in the first place — it just reused the mechanism pages relied on
 * at the time. Naming another firm's client resolves no company and 404s,
 * exactly as before.
 */
export async function GET(request: Request) {
  // A route handler is not covered by any layout, so this guard has to be here.
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("report") ?? "all";
  const report = (VALID.includes(requested as ReportKey) ? requested : "all") as ReportKey;
  const scope = url.searchParams.get("scope") === "month" ? "month" : "fy";

  const scoped = await getScopedCompany(url.searchParams.get("company"));
  const companyId = scoped?.id;

  const periodId = url.searchParams.get("period");
  const period = periodId
    ? ((await getPeriods(companyId)).find((p) => p.id === periodId) ?? null)
    : await getSelectedPeriod(companyId);
  if (!period) return new Response("No reporting period to export.", { status: 404 });

  const company = await getCompany(companyId);

  // A draft month would otherwise appear as a silent extra column in a pack
  // sent to a client. Only published months are comparable.
  const fyPeriods = (await getFyPeriods(period, companyId)).filter((p) => p.status === "published");
  const periods =
    scope === "month" ? [period] : fyPeriods.length > 0 ? fyPeriods : [period];

  // CCC averages every balance against the FY's OPENING position and
  // annualises off the year-to-date run-rate — not just the exported month
  // alone — so it needs every FY month up to each one, regardless of which
  // months `scope`/`report` actually put on the page. Falls back to treating
  // `periods` as its own FY when there's no broader FY list (e.g. a lone
  // draft period), which is exactly correct if it genuinely is the FY's
  // first month and only an approximation otherwise — the same case the page
  // views degrade to.
  const [template, segmentDefs] = await Promise.all([
    getMisTemplate(companyId),
    getMisSegments(companyId),
  ]);

  const cccSource = fyPeriods.length > 0 ? fyPeriods : periods;
  const cccInputs = await Promise.all(
    cccSource.map(async (p) => {
      const [master, manual] = await Promise.all([getMasterRows(p.id), getManualInputs(p.id)]);
      return { id: p.id, master, manual };
    }),
  );
  const cccById = new Map(cccInputs.map((c) => [c.id, c]));

  const months: MonthData[] = await Promise.all(
    periods.map(async (p) => {
      // Reuse the CCC fetch when it already covers this period — no need to
      // re-read the same Master TB twice.
      const cached = cccById.get(p.id);
      const [rows, manual] = cached
        ? [cached.master, cached.manual]
        : await Promise.all([getMasterRows(p.id), getManualInputs(p.id)]);
      const cccIdx = cccInputs.findIndex((c) => c.id === p.id);
      const cccUpto = cccIdx >= 0 ? cccInputs.slice(0, cccIdx + 1) : [{ id: p.id, master: rows, manual }];
      return {
        period: p,
        rows,
        pnl: computePnl(rows, manual, template),
        segment: computeSegment(rows, manual, segmentDefs),
        btb: computeBookToBank(rows, manual, template),
        ccc: computeCcc(cccUpto, template),
      };
    }),
  );

  // Ageing is a snapshot, not a flow — always the selected month's.
  const [debtors, creditors] = await Promise.all([
    getAgeing(period.id, "debtor"),
    getAgeing(period.id, "creditor"),
  ]);

  const input: WorkbookInput = {
    company,
    months,
    selected: period,
    ytdLines: buildYtd(months.map((m) => m.pnl.lines)),
    debtors,
    creditors,
    fyLabel: compactFyLabel(fyLabel(period.month, company?.fy_start_month ?? 4)),
  };

  const wb = createWorkbook();
  const want = (key: ReportKey) => report === "all" || report === key;

  if (report === "all") {
    coverSheet(wb, input);
    summarySheet(wb, input);
  }
  if (want("master")) masterSheet(wb, input);
  if (want("pnl")) pnlSheet(wb, input);
  if (want("segment")) segmentSheet(wb, input);
  if (want("book-to-bank")) bookToBankSheet(wb, input);
  if (want("ccc")) cccSheet(wb, input);
  if (want("debtors") && debtors.length > 0) {
    ageingSheet(wb, "Debtor Ageing", "Debtors", debtors, period.label);
  }
  if (want("creditors") && creditors.length > 0) {
    ageingSheet(wb, "Creditor Ageing", "Creditors", creditors, period.label);
  }

  const buf = await wb.xlsx.writeBuffer();

  const slug = company?.slug ?? "mis";
  const stamp =
    scope === "month" || report !== "all"
      ? period.label.replace(/[^\w]/g, "")
      : input.fyLabel.replace(/[^\w-]/g, "");
  const suffix = report === "all" ? "MIS" : report.replace(/-/g, "_");
  const filename = `${slug}_${suffix}_${stamp}.xlsx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
