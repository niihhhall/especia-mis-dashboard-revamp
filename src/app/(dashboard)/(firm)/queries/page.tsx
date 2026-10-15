import { redirect } from "next/navigation";

import { CompanyChooser } from "@/components/shared/company-chooser";
import { requireUser } from "@/lib/auth/guard";
import { companyPath } from "@/lib/company-scope";
import { defaultCompanySlug } from "@/lib/data/company-context";
import { getCompanyCards } from "@/lib/data/portfolio";

export const metadata = { title: "Notes & queries" };

/** Which client's notes to open. */
export default async function QueriesChooserPage() {
  const profile = await requireUser();

  if (profile.role === "company") {
    const slug = await defaultCompanySlug();
    if (slug) redirect(companyPath(slug, "/queries"));
  }

  const companies = await getCompanyCards();

  return (
    <CompanyChooser
      companies={companies}
      destination="/queries"
      title="Notes & queries"
      subtitle="Choose a company to read and answer its queries."
    />
  );
}
