import Link from "next/link";

/**
 * Keyset pagination — "older" rather than an offset page number, so a new
 * event landing at the top between page loads (a login two seconds after you
 * opened this) can never push a row you have already seen onto the next page
 * a second time.
 *
 * A plain link rather than client-side "append more" state: the log is
 * read occasionally and in full pages, not scrolled continuously, and a link
 * keeps the page shareable — reload it and you are back where you were.
 */
export function LoadMore({
  before,
  action,
  company,
}: {
  before: string;
  action?: string;
  company?: string;
}) {
  const params = new URLSearchParams();
  if (action) params.set("action", action);
  if (company) params.set("company", company);
  params.set("before", before);

  return (
    <div className="flex justify-center">
      <Link
        href={`/audit?${params.toString()}`}
        className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted"
      >
        Load older
      </Link>
    </div>
  );
}
