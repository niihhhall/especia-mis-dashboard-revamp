"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import type { CompanyCard as CompanyCardData } from "@/lib/data/portfolio";

import { CompanyCard } from "./company-card";

/**
 * Admin only, collapsed by default: archived companies are the exception,
 * not something a CA scanning their client list should have to scroll past
 * every day. Editing is disabled here (`canEdit={false}`): the only action
 * that makes sense on an archived company is restoring it.
 */
export function ArchivedCompanies({ cards }: { cards: CompanyCardData[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6 rounded-lg border border-border bg-surface p-5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="archived-companies"
        className="-ms-2 h-8 rounded-md text-card-title text-text-primary"
      >
        <Icon icon={open ? ChevronDown : ChevronRight} />
        Archived companies ({cards.length})
      </Button>
      {open && (
        <div id="archived-companies" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <CompanyCard key={c.id} card={c} canEdit={false} canArchive={true} />
          ))}
        </div>
      )}
    </div>
  );
}
