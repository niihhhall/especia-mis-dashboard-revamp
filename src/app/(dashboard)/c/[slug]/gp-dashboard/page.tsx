import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { getReportTabs } from "@/lib/data/report-tabs";

import { getSessionProfile } from "@/lib/auth/session";
import { activeCompanyId } from "@/lib/data/company-context";
import { getGpDashboardHtml, getMisSegments, getSelectedPeriod } from "@/lib/data/mis";
import { scopedLink } from "@/lib/data/scoped-link";

import { GpDashboardViewer } from "./gp-dashboard-viewer";

export const metadata = { title: "GP Dashboard" };

export default async function GpDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = await activeCompanyId(slug);
  const [current, profile] = await Promise.all([getSelectedPeriod(companyId ?? undefined), getSessionProfile()]);
  // Upload is a ca/admin-only screen (see the `(data)` layout guard) — a
  // company-role viewer following this link would just land on "Not
  // available for your account", so they get a plain message instead.
  const canUpload = profile?.role !== "company";

  if (!current) {
    return (
      <section>
        <PageHeader title="GP Dashboard" filters={<PeriodSelector />} />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {canUpload ? (
            <>
              No data yet.{" "}
              <Link href={scoped("/upload")} className="font-medium text-primary underline">
                Upload a Trial Balance
              </Link>{" "}
              first.
            </>
          ) : (
            "No data yet."
          )}
        </div>
      </section>
    );
  }

  const [segments, html] = await Promise.all([
    getMisSegments(companyId ?? undefined),
    getGpDashboardHtml(current.id),
  ]);

  return (
    <section className="space-y-6">
      <PageHeader title="GP Dashboard" subtitle={current.label} filters={<PeriodSelector />} />

      <ReportTabs tabs={await getReportTabs(companyId ?? undefined, segments.length > 0)} />

      {html ? (
        <GpDashboardViewer html={html} title={`GP Dashboard — ${current.label}`} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {canUpload ? (
            <>
              No GP Dashboard uploaded for {current.label} yet.{" "}
              <Link href={scoped("/upload")} className="font-medium text-primary underline">
                Upload one
              </Link>
              .
            </>
          ) : (
            `No GP Dashboard uploaded for ${current.label} yet.`
          )}
        </div>
      )}
    </section>
  );
}
