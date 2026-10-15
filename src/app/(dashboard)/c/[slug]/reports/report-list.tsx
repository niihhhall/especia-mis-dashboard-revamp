import Link from "next/link";

import { Card } from "@/components/shared/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The reports a client can view or take away. */
const REPORTS = [
  {
    key: "pnl",
    label: "P&L detail",
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
    label: "Book to bank",
    href: "/book-to-bank",
    blurb: "Cash reconciliation from profit through working capital to the closing bank balance.",
  },
  {
    key: "ccc",
    label: "Cash conversion",
    href: "/cash-conversion",
    blurb: "Debtor, inventory and creditor days, and the resulting cash conversion cycle.",
  },
  {
    key: "master",
    label: "Master data",
    href: null,
    blurb: "The normalised trial balance every figure above comes from.",
  },
] as const;

const BTN = cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 rounded-md text-body");

/** One Card per report with View and Download. Hrefs arrive built; props only. */
export function ReportList({
  periodLabel,
  viewHref,
  downloadHref,
}: {
  periodLabel: string;
  viewHref: (path: string) => string;
  downloadHref: (key: string) => string;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {REPORTS.map((r) => (
        <Card key={r.key} title={r.label} subtitle={r.blurb} className="h-full">
          <div className="flex items-center gap-2">
            {r.href && (
              <Link href={viewHref(r.href)} className={BTN}>
                View<span className="sr-only"> {r.label}</span>
              </Link>
            )}
            <a href={downloadHref(r.key)} className={BTN}>
              Download<span className="sr-only"> {r.label} for {periodLabel} as Excel</span>
            </a>
          </div>
        </Card>
      ))}
    </div>
  );
}
