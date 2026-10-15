"use client";

import { X } from "lucide-react";
import { useActionState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import type { CompanyCard as CompanyCardData } from "@/lib/data/portfolio";

import { updateCompany, type CompanyActionState } from "./actions";
import { ArchiveControl } from "./archive-control";
import { DeleteCompanyControl } from "./delete-company-control";
import { BTN, FIELD, FormField, MONTHS } from "./form-field";
import { LogoEditor } from "./logo-editor";

/** The Edit company form shown in the dialog. Archive and permanent Delete sit at its foot (admin only). */
export function EditCompanyForm({
  card,
  canArchive,
  onClose,
}: {
  card: CompanyCardData;
  canArchive: boolean;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(async (prev: CompanyActionState, fd: FormData) => {
    const result = await updateCompany(prev, fd);
    if (result.ok) onClose();
    return result;
  }, { ok: false, message: "" } as CompanyActionState);

  return (
    <div className="flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="edit-company-title" className="text-card-title text-text-primary">
          Edit company
        </h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} className="size-8 rounded-md text-text-secondary">
          <Icon icon={X} />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>

      <LogoEditor companyId={card.id} name={card.name} logoUrl={card.logoUrl} />

      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="companyId" value={card.id} />
        <div className="sm:col-span-2">
          <FormField name="name" label="Company name" defaultValue={card.name} required autoFocusField />
        </div>
        <div className="sm:col-span-2 -mt-1">
          <span className="text-label text-text-secondary">
            Short link: <span className="font-medium text-text-primary">/{card.slug}</span>: set once at creation,
            not editable here.
          </span>
        </div>
        <FormField name="group" label="Group" defaultValue={card.group === card.name ? "" : card.group} />
        <label className="block">
          <span className="mb-1 block text-label text-text-secondary">Financial year starts</span>
          <select name="fyStart" defaultValue={card.fyStartMonth} className={FIELD}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <FormField name="pan" label="PAN" defaultValue={card.pan ?? ""} />
        <FormField name="gst" label="GST" defaultValue={card.gst ?? ""} />
        <FormField name="cin" label="CIN" defaultValue={card.cin ?? ""} />
        <div className="sm:col-span-2">
          <FormField name="address" label="Address" defaultValue={card.address ?? ""} />
        </div>

        <ActionStatus state={state.ok ? null : state} className="text-body font-medium sm:col-span-2" />

        <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-border bg-surface px-5 py-3 sm:col-span-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className={BTN}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={pending} className={BTN}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      {canArchive && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <ArchiveControl card={card} onClose={onClose} />
          <DeleteCompanyControl card={card} onClose={onClose} />
        </div>
      )}
    </div>
  );
}
