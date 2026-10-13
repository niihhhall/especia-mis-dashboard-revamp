"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

/**
 * The body of an error.tsx boundary: what happened in plain words, a retry
 * (Next 16.3's `retry` re-fetches and re-renders the segment) and a way out.
 * The raw error message stays in the console — in production a Server
 * Component error only carries a digest anyway.
 */
export function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-lg py-16 text-center">
      <h1 className="page-title">This page didn&rsquo;t load</h1>
      <p className="mx-auto mt-2 max-w-prose text-pretty text-sm text-muted-foreground">
        Something went wrong while loading it. Try again, or go back to the companies list.
      </p>
      {error.digest && (
        <p className="mt-2 text-caption text-muted-foreground">Reference: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="brand-grad inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RotateCw className="size-4" aria-hidden />
          Try again
        </button>
        <Link
          href="/companies"
          className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to companies
        </Link>
      </div>
    </section>
  );
}
