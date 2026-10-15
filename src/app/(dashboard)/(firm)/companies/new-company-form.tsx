"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";

import { createCompany, type NewCompanyState } from "./actions";
import { CompanyDialog } from "./company-dialog";
import { BTN } from "./form-field";
import { ERROR_ID, invalidField, NewCompanyFields } from "./new-company-fields";

const initial: NewCompanyState = { ok: false, message: "" };

/**
 * Onboard a client without leaving the grid: a dialog rather than a
 * permanent form, since adding a company is occasional while scanning the
 * list is what a CA does every day; a permanent inline form would push the
 * clients they came for below the fold.
 */
export function NewCompanyForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Closing on success happens in the submit flow, not an effect. An effect
  // would run after the render that already showed the form again, so React
  // would paint the panel and then immediately tear it down.
  const [state, action, pending] = useActionState(async (prev: NewCompanyState, fd: FormData) => {
    const result = await createCompany(prev, fd);
    if (result.ok) setOpen(false);
    return result;
  }, initial);

  const invalid = invalidField(state);

  // A field-level refusal moves focus to that field, which then announces
  // the message through aria-describedby.
  useEffect(() => {
    if (!invalid) return;
    const el = formRef.current?.elements.namedItem(invalid);
    if (el instanceof HTMLElement) el.focus();
  }, [state, invalid]);

  return (
    <div className="flex items-center gap-3">
      <ActionStatus state={!open && state.ok ? state : null} className="text-body font-medium" />
      <Button type="button" size="sm" onClick={() => setOpen(true)} className={BTN}>
        <Icon icon={Plus} />
        Add company
      </Button>

      <CompanyDialog open={open} onClose={() => setOpen(false)} title="Add company">
        <form ref={formRef} action={action} className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="add-company-title" className="text-card-title text-text-primary">
              Add company
            </h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} className="size-8 rounded-md text-text-secondary">
              <Icon icon={X} />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>

          <NewCompanyFields invalid={invalid} />

          <ActionStatus id={ERROR_ID} state={state.ok ? null : state} className="text-body font-medium not-empty:mt-3" />

          <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex justify-end border-t border-border bg-surface px-5 py-3">
            <Button type="submit" size="sm" disabled={pending} className={BTN}>
              {pending ? "Adding…" : "Add company"}
            </Button>
          </div>
        </form>
      </CompanyDialog>
    </div>
  );
}
