import { activeCompanyId, listCompanies } from "@/lib/data/company-context";
import { getBranchGroups, getBranches, getReportScopeConfig } from "@/lib/data/mis";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";

import { BranchManager } from "./branches-editor";

export const metadata = { title: "Branches" };

export default async function BranchesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const companyId = await activeCompanyId(slug);
  const [branches, groups, scopeConfig, companies] = await Promise.all([
    getBranches(companyId ?? undefined),
    getBranchGroups(companyId ?? undefined),
    getReportScopeConfig(companyId ?? undefined),
    listCompanies(),
  ]);

  const cloneSources = companies.filter((c) => c.slug !== slug);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Branches"
        subtitle={
          <span className="block max-w-2xl">
            For a multi-branch Tally export — define this company&rsquo;s branches, optionally group
            them into channels (e.g. Retail vs Wholesale), and set how deep each report&rsquo;s scope
            goes. Empty by default: a single-branch company never sees a scope selector anywhere.
          </span>
        }
        filters={<PeriodSelector />}
        actions={<span className="text-label text-text-secondary">Staff only</span>}
      />

      <BranchManager
        slug={slug}
        branches={branches}
        groups={groups}
        scopeConfig={scopeConfig}
        cloneSources={cloneSources}
      />
    </section>
  );
}
