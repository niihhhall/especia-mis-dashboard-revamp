import { activeCompanyId, listCompanies } from "@/lib/data/company-context";
import { getMisSegments, getMisTemplateRows } from "@/lib/data/mis";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";

import { TemplateManager } from "./template-manager";

export const metadata = { title: "MIS template" };

export default async function TemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const companyId = await activeCompanyId(slug);
  // getMisTemplateRows (not getMisTemplate), this editor must show exactly
  // what THIS company's own rows are, including genuinely zero. The
  // fallback-to-Tirupati's-defaults behavior every OTHER page relies on (so
  // a brand-new company never renders a blank statement) would be actively
  // misleading here: saving a "default" row would silently fork a copy of
  // Tirupati's template under this company rather than reflect "nothing
  // configured yet".
  const [template, segments, companies] = await Promise.all([
    getMisTemplateRows(companyId ?? undefined),
    getMisSegments(companyId ?? undefined),
    listCompanies(),
  ]);

  const cloneSources = companies.filter((c) => c.slug !== slug);

  return (
    <section className="space-y-6">
      <PageHeader
        title="MIS template"
        subtitle={
          <span className="block max-w-2xl">
            The P&amp;L / Book to Bank line list and segment split this company&rsquo;s reports are
            built from. Every report (Dashboard, P&amp;L Detail, Segment P&amp;L, Book to Bank, Cash
            Conversion) reads this directly: a change here is live immediately.
          </span>
        }
        filters={<PeriodSelector />}
        actions={<span className="text-label text-text-secondary">Staff only</span>}
      />

      <TemplateManager slug={slug} template={template} segments={segments} cloneSources={cloneSources} />
    </section>
  );
}
