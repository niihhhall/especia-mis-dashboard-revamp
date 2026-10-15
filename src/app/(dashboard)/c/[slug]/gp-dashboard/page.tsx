import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { getSessionProfile } from "@/lib/auth/session";
import { activeCompanyId } from "@/lib/data/company-context";
import { getGpDashboardHtml, getMisSegments, getSelectedPeriod } from "@/lib/data/mis";
import { getReportTabs } from "@/lib/data/report-tabs";
import { scopedLink } from "@/lib/data/scoped-link";

import { GpDashboardViewer } from "./gp-dashboard-viewer";

export const metadata = { title: "GP dashboard" };

const LINK = "font-medium text-text-primary underline underline-offset-2";

export default async function GpDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const [current, profile] = await Promise.all([getSelectedPeriod(companyId), getSessionProfile()]);
  // Upload is a ca/admin-only screen (see the `(data)` layout guard): a
  // company-role viewer following this link would just land on "Not
  // available for your account", so they get a plain message instead.
  const canUpload = profile?.role !== "company";

  if (!current) {
    return (
      <section className="space-y-6">
        <PageHeader title="GP dashboard" filters={<PeriodSelector />} />
        <EmptyState
          title="No data yet."
          description={
            canUpload ? (
              <>
                <Link href={scoped("/upload")} className={LINK}>
                  Upload a trial balance
                </Link>{" "}
                first.
              </>
            ) : undefined
          }
        />
      </section>
    );
  }

  const [segments, html] = await Promise.all([getMisSegments(companyId), getGpDashboardHtml(current.id)]);

  return (
    <section className="space-y-6">
      <PageHeader title="GP dashboard" subtitle={current.label} filters={<PeriodSelector />} />

      <ReportTabs tabs={await getReportTabs(companyId, segments.length > 0)} />

      {html ? (
        <GpDashboardViewer html={html} title={`GP dashboard: ${current.label}`} />
      ) : (
        <EmptyState
          title={`No GP Dashboard uploaded for ${current.label} yet.`}
          description={
            canUpload ? (
              <>
                <Link href={scoped("/upload")} className={LINK}>
                  Upload one
                </Link>
                .
              </>
            ) : undefined
          }
        />
      )}
    </section>
  );
}
