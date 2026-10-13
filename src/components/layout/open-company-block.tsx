import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/**
 * Which client is open, and the way back to the list. Staff only: a company
 * user has exactly one company and nowhere to return to. Hidden while the
 * sidebar is collapsed to icons; the breadcrumb still names the company.
 */
export function OpenCompanyBlock({ name }: { name: string }) {
  return (
    <div className="rounded-md border border-border p-3 group-data-[collapsible=icon]:hidden">
      <p className="text-label text-text-secondary">Open company</p>
      <p title={name} className="line-clamp-2 break-words text-body font-medium text-text-primary">
        {name}
      </p>
      <Link
        href="/companies"
        className="mt-1 inline-flex items-center gap-1 text-body text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        All companies
      </Link>
    </div>
  );
}
