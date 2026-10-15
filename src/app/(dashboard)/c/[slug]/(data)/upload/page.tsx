import { activeCompanyId } from "@/lib/data/company-context";
import { getPeriods, getPeriodsWithGpDashboard } from "@/lib/data/mis";

import { GpDashboardForm } from "./gp-dashboard-form";
import { GpDashboardList } from "./gp-dashboard-list";
import { PeriodList } from "./period-list";
import { UploadForm } from "./upload-form";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";

export const metadata = { title: "Upload" };

export default async function UploadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const companyId = await activeCompanyId(slug);
  const [periods, gpDashboardPeriods] = await Promise.all([
    getPeriods(companyId ?? undefined),
    getPeriodsWithGpDashboard(companyId ?? undefined),
  ]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Upload"
        subtitle={
          <span className="block max-w-xl">
            Upload a Tally Trial Balance for a reporting month. The app parses it, recovers Dr/Cr signs,
            maps each ledger to its MIS grouping, and rebuilds the Master Data for that month.
          </span>
        }
        filters={<PeriodSelector />}
      />
      <UploadForm slug={slug} />

      <div>
        <PeriodList slug={slug} periods={periods.map((p) => ({ id: p.id, label: p.label, status: p.status }))} />
      </div>

      <div className="space-y-6">
        <GpDashboardForm slug={slug} periods={periods.map((p) => ({ id: p.id, label: p.label }))} />
        <GpDashboardList slug={slug} items={gpDashboardPeriods} />
      </div>
    </section>
  );
}
