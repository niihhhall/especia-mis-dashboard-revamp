"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { ActionStatus } from "@/components/action-status";
import { Modal } from "@/components/modal";
import { DEMO_WRITE_MESSAGE } from "@/lib/demo/messages";
import { fieldText, focusRing } from "@/lib/ui-classes";

import { createCompany, type NewCompanyState } from "./actions";

const initial: NewCompanyState = { ok: false, message: "" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const field = `h-9 w-full rounded-lg border border-border bg-background px-3 ${fieldText} ${focusRing}`;

const ERROR_ID = "add-company-error";

/**
 * Which field a refusal from `createCompany` is about, so it can be marked
 * invalid, described by the message and focused. Null for refusals that are
 * not about one field (permissions, demo mode, a database error).
 */
function invalidField(state: NewCompanyState): "name" | "slug" | "fyStart" | null {
  if (state.ok || !state.message || state.message === DEMO_WRITE_MESSAGE) return null;
  if (/company name|no letters or digits/i.test(state.message)) return "name";
  if (/^The link/.test(state.message)) return "slug";
  if (/^Financial year/.test(state.message)) return "fyStart";
  return null;
}

function Field({
  name,
  label,
  hint,
  required,
  placeholder,
  invalid,
  autoFocusField,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  invalid?: boolean;
  autoFocusField?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? ERROR_ID : undefined}
        data-autofocus={autoFocusField || undefined}
        className={field}
      />
      {hint && <span className="mt-1 block text-caption text-muted-foreground">{hint}</span>}
    </label>
  );
}

/**
 * Onboard a client without leaving the grid — a full-screen `Modal` rather
 * than a permanent form, since adding a company is occasional while scanning
 * the list is what a CA does every day; a permanent inline form would push
 * the clients they came for below the fold.
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
      <ActionStatus
        state={!open && state.ok ? state : null}
        className="text-sm font-medium"
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="brand-grad inline-flex h-9 items-center gap-1.5 rounded-lg ps-3.5 pe-4 text-sm font-semibold text-white shadow-sm transition-[scale,opacity] duration-150 ease-out hover:opacity-90 motion-safe:not-disabled:active:scale-[0.96] motion-reduce:not-disabled:active:opacity-80"
      >
        <Plus className="size-4" strokeWidth={2} absoluteStrokeWidth aria-hidden />
        Add company
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="add-company-title">
        <form ref={formRef} action={action} className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="add-company-title" className="text-sm font-bold">Add company</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only">Cancel</span>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                name="name"
                label="Company name"
                required
                placeholder="Tirupati Automart Private Limited"
                invalid={invalid === "name"}
                autoFocusField
              />
            </div>
            <Field name="group" label="Group" placeholder="Tirupati Group" />
            <Field
              name="slug"
              label="Short link"
              hint="Used in the address bar. Left blank, it comes from the name."
              placeholder="tirupati"
              invalid={invalid === "slug"}
            />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Financial year starts
              </span>
              <select
                name="fyStart"
                defaultValue={4}
                aria-invalid={invalid === "fyStart" || undefined}
                aria-describedby={invalid === "fyStart" ? ERROR_ID : undefined}
                className={field}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <Field name="pan" label="PAN" />
            <Field name="gst" label="GST" />
            <Field name="cin" label="CIN" />
            <div className="sm:col-span-2">
              <Field name="address" label="Address" />
            </div>
          </div>

          <ActionStatus
            id={ERROR_ID}
            state={state.ok ? null : state}
            className="text-sm font-medium not-empty:mt-3"
          />

          <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex justify-end border-t border-border bg-card px-5 py-3">
            <button
              type="submit"
              disabled={pending}
              className="brand-grad inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-[scale,opacity] duration-150 ease-out hover:opacity-90 motion-safe:not-disabled:active:scale-[0.96] motion-reduce:not-disabled:active:opacity-80 disabled:opacity-60"
            >
              {pending ? "Adding…" : "Add company"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
