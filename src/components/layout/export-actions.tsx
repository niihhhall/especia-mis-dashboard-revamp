"use client";

import { Button } from "@/components/ui/button";
import { excelHref } from "@/lib/export-link";

/** Top bar export controls: full-MIS Excel download and browser Print / PDF. */
export function ExportActions({ slug }: { slug: string }) {
  return (
    <div className="flex items-center gap-3">
      <Button asChild variant="outline" size="sm" className="border-border">
        <a href={excelHref(slug)}>Download Excel</a>
      </Button>
      <Button type="button" variant="outline" size="sm" className="border-border" onClick={() => window.print()}>
        Print / PDF
      </Button>
    </div>
  );
}
