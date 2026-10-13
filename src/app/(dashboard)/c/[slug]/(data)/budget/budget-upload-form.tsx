"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/action-status";

import { bulkApplyBudget, type BulkBudgetState } from "./actions";

const initial: BulkBudgetState = { ok: false, message: "" };

const fileField =
  "w-full text-sm text-muted-foreground file:me-3 file:rounded-md file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary";

/**
 * Budget entry is Excel-only (no one-row quick editor, unlike Mapping) —
 * download lists this company's own P&L lines with the current FY's months
 * as columns, pre-filled with whatever's already entered; re-uploading
 * applies whatever cells were filled in, leaving blank cells untouched.
 */
export function BudgetUploadForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(bulkApplyBudget, initial);

  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-sm font-semibold">Budget via Excel</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Download this company&apos;s P&amp;L lines with the current financial year as columns, fill in
          Budget figures offline, then re-upload the same file — blank cells are left untouched.
        </p>
      </div>

      <a
        href={`/c/${encodeURIComponent(slug)}/budget/template`}
        className="inline-block rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        Download template
      </a>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="slug" value={slug} />
        <div className="min-w-[240px] flex-1 space-y-1.5">
          <label htmlFor="budgetFile" className="text-sm font-medium">
            Filled-in template <span className="text-muted-foreground">(.xlsx)</span>
          </label>
          <input id="budgetFile" name="file" type="file" accept=".xlsx" required className={fileField} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Applying…" : "Apply budget"}
        </button>
      </form>

      <ActionStatus state={state} />
    </div>
  );
}
