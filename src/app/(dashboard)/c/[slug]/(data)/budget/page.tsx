import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";

import { BudgetUploadForm } from "./budget-upload-form";

export const metadata = { title: "Budget" };

export default async function BudgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Budget"
        subtitle={
          <span className="block max-w-2xl">
            Enter a Budget figure per P&amp;L line, per month: compared against Actual on{" "}
            <span className="font-medium">Budget vs actual</span>. Entry is Excel-based: download, fill in
            offline, re-upload.
          </span>
        }
        filters={<PeriodSelector />}
      />

      <BudgetUploadForm slug={slug} />
    </section>
  );
}
