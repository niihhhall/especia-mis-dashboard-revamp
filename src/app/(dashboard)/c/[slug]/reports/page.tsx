import Link from "next/link";

import { getSessionProfile } from "@/lib/auth/session";
import { getCompany, getPeriods, getSelectedPeriod } from "@/lib/data/mis";
import { scopedLink } from "@/lib/data/scoped-link";
import { activeCompanyId } from "@/lib/data/company-context";
import { fyDisplay } from "@/lib/format";
import { fyLabel } from "@/lib/mis/period";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";

import { PeriodDownloads } from "./period-downloads";

export const metadata = { title: "Reports" };

/** The reports a client can view or take away. */
const REPORTS = [
  {
    key: "pnl",
    label: "P&L Detail",
    href: "/pnl",
    blurb: "Full profit statement, line by line, with every month of the financial year.",
  },
  {
    key: "segment",
    label: "Segment P&L",
    href: "/segment",
    blurb: "Revenue, COGS and gross profit split by Vehicle, Accessories and Service.",
  },
  {
    key: "book-to-bank",
    label: "Book to Bank",
    href: "/book-to-bank",
    blurb: "Cash reconciliation from profit through working capital to the closing bank balance.",
  },
  {
    key: "ccc",
    label: "Cash Conversion",
    href: "/cash-conversion",
    blurb: "Debtor, inventory and creditor days, and the resulting cash conversion cycle.",
  },
  {
    key: "master",
    label: "Master Data",
    href: null,
    blurb: "The normalised trial balance every figure above comes from.",
  },
] as const;

export default async function ReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const companyId = await activeCompanyId(slug);
  const [profile, company, periods, selected, scoped] = await Promise.all([
    getSessionProfile(),
    getCompany(companyId ?? undefined),
    getPeriods(companyId ?? undefined),
    getSelectedPeriod(companyId ?? undefined),
    scopedLink(slug),
  ]);

  // `/export/xlsx` is a Route Handler, so it sits outside the `/c/[slug]` tree
  // and has no path segment to scope by — the company has to travel in the
  // query string or the handler resolves no company and finds no period.
  const xlsx = (params: string) =>
    `/export/xlsx?company=${encodeURIComponent(company?.slug ?? "")}&${params}`;

  const isStaff = profile?.role !== "company";

  if (!selected) {
    return (
      <section className="space-y-4">
        <PageHeader title="Reports" filters={<PeriodSelector />} />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <p>No reports published yet.</p>
          <p className="mt-1">
            {isStaff ? (
              <>
                <Link href={scoped("/upload")} className="font-semibold text-primary underline underline-offset-2">
                  Upload a Trial Balance
                </Link>{" "}
                to build this month&rsquo;s reports.
              </>
            ) : (
              "Your CA will publish this month's MIS here."
            )}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="View any report on screen, or download it as Excel."
        filters={<PeriodSelector />}
      />

      {/* The whole pack, for the month currently in view. */}
      <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Complete MIS pack</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            All five sheets for {selected.label} ·{" "}
            {fyDisplay(fyLabel(selected.month, company?.fy_start_month ?? 4))}
          </p>
        </div>
        <a
          href={xlsx(`period=${selected.id}`)}
          className="inline-flex h-9 shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[scale,opacity] duration-150 ease-out hover:opacity-90 motion-safe:not-disabled:active:scale-[0.96] motion-reduce:not-disabled:active:opacity-80"
        >
          Download {selected.label} Excel
        </a>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {REPORTS.map((r) => (
          <div key={r.key} className="card-surface flex flex-col gap-3 p-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{r.label}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.blurb}</p>
            </div>
            <div className="mt-auto flex items-center gap-2">
              {r.href && (
                <Link
                  href={scoped(r.href)}
                  className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  View<span className="sr-only"> {r.label}</span>
                </Link>
              )}
              <a
                href={xlsx(`report=${r.key}&period=${selected.id}`)}
                className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                Download<span className="sr-only"> {r.label} for {selected.label} as Excel</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      <PeriodDownloads
        periods={periods.map((p) => ({ id: p.id, label: p.label }))}
        currentId={selected.id}
        companySlug={company?.slug ?? ""}
      />

      <p className="text-xs text-muted-foreground">
        For a PDF, open a report and use Print / PDF in the header — it prints without the sidebar.
      </p>
    </section>
  );
}
