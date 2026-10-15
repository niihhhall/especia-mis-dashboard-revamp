import { CompanyChooser } from "@/components/shared/company-chooser";
import { requireRole } from "@/lib/auth/guard";
import { getCompanyCards } from "@/lib/data/portfolio";

export const metadata = { title: "MIS upload" };

/** Long month from a YYYY-MM-01 period month. */
function longMonth(month: string): string {
  const [y, m] = month.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

/**
 * MIS Upload starts by asking which client, then hands off to that client's
 * uploader, the same Trial Balance, Adjustments, Mapping and Master TB screens
 * that already exist, scoped to the company in the URL.
 */
export default async function UploadChooserPage() {
  await requireRole(["ca", "admin"]);

  const companies = await getCompanyCards();

  return (
    <CompanyChooser
      companies={companies}
      destination="/upload"
      title="MIS upload"
      subtitle="Choose a company to open its upload centre: Trial Balance, ageing, mapping and Master Data."
      hint={(c) =>
        c.latest
          ? `Last uploaded ${longMonth(c.latest.month)}${c.drafts > 0 ? ` · ${c.drafts} draft` : ""}`
          : "No trial balance uploaded yet"
      }
    />
  );
}
