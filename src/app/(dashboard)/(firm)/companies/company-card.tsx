"use client";

import { ArrowRight, History, Pencil, Upload as UploadIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useFmtCompact } from "@/components/layout/unit-context";
import { CompanyAvatar } from "@/components/shared/company-avatar";
import { Icon } from "@/components/shared/icon";
import { StatusText } from "@/components/shared/status-text";
import { Button, buttonVariants } from "@/components/ui/button";
import { companyPath } from "@/lib/company-scope";
import type { CompanyCard as CompanyCardData } from "@/lib/data/portfolio";
import { fyDisplay, negParens } from "@/lib/format";
import { fyLabel } from "@/lib/mis/period";
import { cn } from "@/lib/utils";

import { RestoreControl } from "./archive-control";
import { CompanyDialog } from "./company-dialog";
import { DeleteCompanyControl } from "./delete-company-control";
import { EditCompanyForm } from "./edit-company-form";
import { BTN } from "./form-field";
import { InfoField } from "./info-field";

/** Long month from a YYYY-MM-01 period month. */
function longMonth(month: string): string {
  const [y, m] = month.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function statusLabel(card: CompanyCardData): string {
  if (card.archivedAt) return "Archived";
  if (!card.latest) return "No data";
  return card.drafts > 0 ? "Under review" : "Published";
}

const ICON_LINK = cn(buttonVariants({ variant: "outline", size: "icon" }), "size-8 rounded-md text-text-secondary hover:text-text-primary");

/**
 * One company card on the Companies grid: view mode by default; Edit opens
 * the form in a dialog. Archive and permanent Delete live inside that dialog
 * (admin only), not on the card, so the grid a CA scans every day carries no
 * destructive action. An archived card has no Edit entry point (`canEdit` is
 * false for it), so it keeps Restore and Delete in its own footer. Every
 * confirm is in-page armed/confirm, never `window.confirm`.
 */
export function CompanyCard({ card, canEdit, canArchive }: { card: CompanyCardData; canEdit: boolean; canArchive: boolean }) {
  const fmtCompact = useFmtCompact();
  const [editing, setEditing] = useState(false);
  const dash = "-";

  return (
    <article className="flex flex-col rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <CompanyAvatar name={card.name} logoUrl={card.logoUrl} className="size-10 text-body" />
          <div className="min-w-0">
            <h2 className="line-clamp-2 break-words text-card-title text-text-primary">{card.name}</h2>
            <p className="line-clamp-2 break-words text-label text-text-secondary">{card.group}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusText emphasis={!card.archivedAt && card.drafts > 0 && Boolean(card.latest)}>{statusLabel(card)}</StatusText>
          {canEdit && !card.archivedAt && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              title="Edit company"
              className="size-8 rounded-md text-text-secondary hover:text-text-primary"
            >
              <Icon icon={Pencil} />
              <span className="sr-only">Edit {card.name}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <InfoField label="Latest period" value={card.latest ? longMonth(card.latest.month) : dash} />
        <InfoField label="Revenue" value={card.revenue === null ? dash : negParens(fmtCompact(card.revenue))} />
        <InfoField label="Manager" value={card.managers.join(" & ") || "Unassigned"} />
        <InfoField label="Financial year" value={card.latest ? fyDisplay(fyLabel(card.latest.month, 4)) : dash} />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Link href={companyPath(card.slug, "/dashboard")} className={cn(buttonVariants({ size: "sm" }), BTN, "flex-1")}>
          Open dashboard
          <Icon icon={ArrowRight} />
        </Link>
        <Link href={companyPath(card.slug, "/history")} title={`MIS history: ${card.name}`} className={ICON_LINK}>
          <Icon icon={History} />
          <span className="sr-only">MIS history</span>
        </Link>
        <Link href={companyPath(card.slug, "/upload")} title={`Upload: ${card.name}`} className={ICON_LINK}>
          <Icon icon={UploadIcon} />
          <span className="sr-only">Upload</span>
        </Link>
      </div>

      {canArchive && card.archivedAt && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <RestoreControl card={card} />
          <div className="flex justify-end">
            <DeleteCompanyControl card={card} onClose={() => {}} />
          </div>
        </div>
      )}

      <CompanyDialog open={editing} onClose={() => setEditing(false)} title="Edit company">
        <EditCompanyForm card={card} canArchive={canArchive} onClose={() => setEditing(false)} />
      </CompanyDialog>
    </article>
  );
}
