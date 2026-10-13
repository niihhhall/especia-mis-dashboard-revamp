"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import type { CompanyCard as CompanyCardData } from "@/lib/data/portfolio";

import { CompanyCard } from "./company-card";

/**
 * Admin-only, collapsed by default — archived companies are the exception,
 * not something a CA scanning their client list should have to scroll past
 * every day. Editing is disabled here (`canEdit={false}`): the only action
 * that makes sense on an archived company is restoring it.
 */
export function ArchivedCompanies({ cards }: { cards: CompanyCardData[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="archived-companies"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
        Archived companies ({cards.length})
      </button>
      {open && (
        <div id="archived-companies" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <CompanyCard key={c.id} card={c} canEdit={false} canArchive={true} />
          ))}
        </div>
      )}
    </div>
  );
}
