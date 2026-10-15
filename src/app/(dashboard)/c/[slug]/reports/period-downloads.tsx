"use client";

import { useState } from "react";

import { Card } from "@/components/shared/card";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Opt {
  id: string;
  label: string;
}

/**
 * Download the full pack for a month other than the one in view, without
 * having to switch the header period selector first.
 */
export function PeriodDownloads({
  periods,
  currentId,
  companySlug,
}: {
  periods: Opt[];
  currentId: string;
  /** Route Handlers sit outside `/c/[slug]`, so the company travels in the query. */
  companySlug: string;
}) {
  const [id, setId] = useState(currentId);
  if (periods.length < 2) return null;

  return (
    <Card
      title="Download an earlier month"
      subtitle="The complete pack for any published month."
      actions={
        <>
          <Select value={id} onValueChange={setId}>
            <SelectTrigger size="sm" aria-label="Month to download" className="h-8 rounded-md text-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end" className="border-border">
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-body">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <a
            href={`/export/xlsx?company=${encodeURIComponent(companySlug)}&period=${id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 rounded-md text-body")}
          >
            Download {periods.find((p) => p.id === id)?.label} pack
          </a>
        </>
      }
      className="gap-0"
    >
      {null}
    </Card>
  );
}
