import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { activeCompanyId } from "@/lib/data/company-context";
import { getChartsData } from "@/lib/data/charts";
import { getChartScope, getCompany, getMisSegments, getSelectedPeriod } from "@/lib/data/mis";
import { getReportTabs } from "@/lib/data/report-tabs";
import { scopedLink } from "@/lib/data/scoped-link";
import { fyDisplay } from "@/lib/format";
import { fyLabel } from "@/lib/mis/period";
import { trimCommonPrefix } from "@/lib/mis/charts";

import { ChartsBoard } from "./charts-board";

export const metadata = { title: "Charts" };

const pill = "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors";
const on = "brand-grad text-white shadow-sm";
const off = "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground";

export default async function ChartsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scope?: string; ch?: string }>;
}) {
  const { slug } = await params;
  const { scope: scopeParam, ch } = await searchParams;
  const scoped = await scopedLink(slug);
  const companyId = await activeCompanyId(slug);
  const period = await getSelectedPeriod(companyId ?? undefined);

  if (!period || !companyId) {
    return (
      <section>
        <PageHeader title="Charts" filters={<PeriodSelector />} />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No data yet.{" "}
          <Link href={scoped("/upload")} className="font-medium text-primary underline">
            Upload a Trial Balance
          </Link>{" "}
          to see charts.
        </div>
      </section>
    );
  }

  const [chartScope, segments, company] = await Promise.all([
    getChartScope(companyId, scopeParam),
    getMisSegments(companyId),
    getCompany(companyId),
  ]);
  const { branches, branchGroups, scope, current } = chartScope;
  const live = branches.filter((b) => !b.archivedAt);

  const [data, tabs] = await Promise.all([
    getChartsData(companyId, period, scope, branches, branchGroups),
    getReportTabs(companyId, segments.length > 0),
  ]);

  // Filter pills: channels first (when the company has them), then the
  // branches of whichever channel is open — same idea as the P&L's buttons,
  // but as plain links so the scope always lives in the URL.
  // Which channel's branches to list: the open channel, or — once a branch is
  // picked — the channel it was picked from (`?ch=`), so every sibling button
  // stays on screen and the CA can hop between branches directly. A branch
  // picked company-wide has no `ch` and keeps listing every branch.
  const activeGroupId = current.startsWith("group:")
    ? current.slice(6)
    : current.startsWith("branch:") && ch && branchGroups.some((g) => g.id === ch)
      ? ch
      : null;
  const allChannels = current === "consolidated" || (current.startsWith("branch:") && !activeGroupId);
  const listBranches = activeGroupId ? live.filter((b) => b.groupId === activeGroupId) : live;
  const branchLabels = trimCommonPrefix(listBranches.map((b) => b.label));
  const href = (value: string) =>
    scoped(`/charts?scope=${value}${value.startsWith("branch:") && activeGroupId ? `&ch=${activeGroupId}` : ""}`);

  return (
    <section className="space-y-5">
      <PageHeader
        title="Charts"
        subtitle={
          <>
            {period.label} · {fyDisplay(fyLabel(period.month, company?.fy_start_month ?? 4))} · figures follow the filters below
          </>
        }
        filters={<PeriodSelector />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportTabs tabs={tabs} />
      </div>

      {live.length > 0 && (
        <div className="space-y-2">
          {branchGroups.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Channel">
              <Link
                href={href("consolidated")}
                aria-current={allChannels ? "true" : undefined}
                className={`${pill} ${allChannels ? on : off}`}
              >
                All channels
                {allChannels && <span className="sr-only">, selected</span>}
              </Link>
              {branchGroups.map((g) => (
                <Link
                  key={g.id}
                  href={href(`group:${g.id}`)}
                  aria-current={activeGroupId === g.id ? "true" : undefined}
                  className={`${pill} ${activeGroupId === g.id ? on : off}`}
                >
                  {g.label}
                  {activeGroupId === g.id && <span className="sr-only">, selected</span>}
                </Link>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Branch">
            {listBranches.map((b, i) => {
              const value = `branch:${b.id}`;
              const active = current === value;
              // The active branch links back out to its channel (or company).
              const back = activeGroupId ? `group:${activeGroupId}` : "consolidated";
              return (
                <Link
                  key={b.id}
                  href={href(active ? back : value)}
                  title={b.label}
                  aria-current={active ? "true" : undefined}
                  className={`${pill} ${active ? on : off}`}
                >
                  {branchLabels[i]}
                  {active && <span className="sr-only">, selected</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <ChartsBoard data={data} budgetHref={scoped("/budget")} />
    </section>
  );
}
