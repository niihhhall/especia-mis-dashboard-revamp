import { redirect } from "next/navigation";

import { CompanyChooser } from "@/components/company-chooser";
import { requireUser } from "@/lib/auth/guard";
import { companyPath } from "@/lib/company-scope";
import { defaultCompanySlug } from "@/lib/data/company-context";
import { getCompanyCards } from "@/lib/data/portfolio";

export const metadata = { title: "Reports" };

/**
 * Which client's MIS to download.
 *
 * A company user never sees this step — they have one company, so they go
 * straight to their own reports.
 */
export default async function ReportsChooserPage() {
  const profile = await requireUser();

  if (profile.role === "company") {
    const slug = await defaultCompanySlug();
    if (slug) redirect(companyPath(slug, "/reports"));
  }

  const companies = await getCompanyCards();

  return (
    <CompanyChooser
      companies={companies}
      destination="/reports"
      title="Reports & Downloads"
      subtitle="Choose a company to view its reports on screen or download the Excel MIS."
      hint={(c) => (c.latest ? `Latest ${c.latest.label}` : "No reporting period yet")}
    />
  );
}
