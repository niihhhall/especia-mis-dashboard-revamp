import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { SegmentedLinks } from "@/components/shared/segmented-links";
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

const LINK = "font-medium text-text-primary underline underline-offset-2";

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
        <EmptyState
          title="No data yet."
          description={
            <>
              <Link href={scoped("/upload")} className={LINK}>
                Upload a trial balance
              </Link>{" "}
              to see charts.
            </>
          }
        />
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
  // branches of whichever channel is open, same idea as the P&L's buttons,
  // but as plain links so the scope always lives in the URL.
  // Which channel's branches to list: the open channel, or, once a branch is
  // picked, the channel it was picked from (`?ch=`), so every sibling button
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
    <section className="space-y-6">
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
            <SegmentedLinks
              label="Channel"
              activeSuffix=", selected"
              className="flex-wrap"
              options={[
                { href: href("consolidated"), label: "All channels", active: allChannels },
                ...branchGroups.map((g) => ({
                  href: href(`group:${g.id}`),
                  label: g.label,
                  active: activeGroupId === g.id,
                })),
              ]}
            />
          )}
          <SegmentedLinks
            label="Branch"
            activeSuffix=", selected"
            className="flex-wrap"
            options={listBranches.map((b, i) => {
              const value = `branch:${b.id}`;
              const active = current === value;
              // The active branch links back out to its channel (or company).
              const back = activeGroupId ? `group:${activeGroupId}` : "consolidated";
              return { href: href(active ? back : value), label: branchLabels[i], title: b.label, active };
            })}
          />
        </div>
      )}

      <ChartsBoard data={data} budgetHref={scoped("/budget")} />
    </section>
  );
}
