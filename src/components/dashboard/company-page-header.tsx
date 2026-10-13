import { CompanyAvatar } from "@/components/company-avatar";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import type { Company, Period } from "@/lib/data/mis";
import { fyDisplay } from "@/lib/format";
import { fyLabel } from "@/lib/mis/period";

/**
 * The identity block at the top of a company's dashboard: who this report is
 * for, which month, and who prepared it, the things a client checks first in
 * a review meeting. Status and financial year are plain muted text.
 */
export function CompanyPageHeader({ company, period }: { company: Company; period: Period }) {
  const meta = [company.address].filter(Boolean).join(" · ");
  const ids = [
    company.gst && `GST ${company.gst}`,
    company.pan && `PAN ${company.pan}`,
    company.cin && `CIN ${company.cin}`,
  ].filter(Boolean);

  return (
    <PageHeader
      leading={<CompanyAvatar name={company.name} logoUrl={company.logo_url} className="size-12 text-base" />}
      title={company.name}
      meta={
        <div className="mt-1 flex flex-col gap-1">
          <p className="text-label text-text-secondary">
            {period.status === "published" ? "Published" : "Draft"}
          </p>
          {meta && <p className="text-body text-text-secondary">{meta}</p>}
          <p className="flex flex-wrap gap-x-3 text-label text-text-secondary">
            {ids.length > 0 && <span>{ids.join("  ")}</span>}
            <span>Prepared by Especia Associates LLP</span>
          </p>
        </div>
      }
      filters={
        <>
          <PeriodSelector />
          <span className="text-label text-text-secondary">
            {fyDisplay(fyLabel(period.month, company.fy_start_month))}
          </span>
        </>
      }
    />
  );
}
