import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { getSessionProfile } from "@/lib/auth/session";
import { activeCompanyId } from "@/lib/data/company-context";
import { getCompany, getPeriods, getSelectedPeriod } from "@/lib/data/mis";
import { scopedLink } from "@/lib/data/scoped-link";
import { fyDisplay } from "@/lib/format";
import { fyLabel } from "@/lib/mis/period";
import { cn } from "@/lib/utils";

import { PeriodDownloads } from "./period-downloads";
import { ReportList } from "./report-list";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const [profile, company, periods, selected, scoped] = await Promise.all([
    getSessionProfile(),
    getCompany(companyId),
    getPeriods(companyId),
    getSelectedPeriod(companyId),
    scopedLink(slug),
  ]);

  // `/export/xlsx` is a Route Handler, so it sits outside the `/c/[slug]` tree
  // and has no path segment to scope by: the company has to travel in the
  // query string or the handler resolves no company and finds no period.
  const xlsx = (query: string) => `/export/xlsx?company=${encodeURIComponent(company?.slug ?? "")}&${query}`;
  const isStaff = profile?.role !== "company";

  if (!selected) {
    return (
      <section className="space-y-6">
        <PageHeader title="Reports" filters={<PeriodSelector />} />
        <EmptyState
          title="No reports published yet."
          description={
            isStaff ? (
              <>
                <Link href={scoped("/upload")} className="font-medium text-text-primary underline underline-offset-2">
                  Upload a trial balance
                </Link>{" "}
                to build this month&rsquo;s reports.
              </>
            ) : (
              "Your CA will publish this month's MIS here."
            )
          }
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Reports" subtitle="View any report on screen, or download it as Excel." filters={<PeriodSelector />} />

      {/* The whole pack, for the month currently in view. */}
      <Card
        title="Complete MIS pack"
        subtitle={
          <>
            All five sheets for {selected.label} · {fyDisplay(fyLabel(selected.month, company?.fy_start_month ?? 4))}
          </>
        }
        actions={
          <a href={xlsx(`period=${selected.id}`)} className={cn(buttonVariants({ size: "sm" }), "h-8 rounded-md text-body")}>
            Download {selected.label} Excel
          </a>
        }
        className="gap-0"
      >
        {null}
      </Card>

      <ReportList
        periodLabel={selected.label}
        viewHref={scoped}
        downloadHref={(key) => xlsx(`report=${key}&period=${selected.id}`)}
      />

      <PeriodDownloads periods={periods.map((p) => ({ id: p.id, label: p.label }))} currentId={selected.id} companySlug={company?.slug ?? ""} />

      <p className="text-body text-text-secondary">
        For a PDF, open a report and use Print / PDF in the header: it prints without the sidebar.
      </p>
    </section>
  );
}
