"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Card } from "@/components/shared/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { bulkApplyBudget, type BulkBudgetState } from "./actions";

const initial: BulkBudgetState = { ok: false, message: "" };
const BTN = "h-8 rounded-md text-body";
const fileField =
  "w-full text-body text-text-secondary file:me-3 file:h-8 file:rounded-md file:border file:border-border file:bg-surface-raised file:px-3 file:text-body file:font-medium file:text-text-primary";

/**
 * Budget entry is Excel-only (no one-row quick editor, unlike Mapping):
 * download lists this company's own P&L lines with the current FY's months
 * as columns, pre-filled with whatever's already entered; re-uploading
 * applies whatever cells were filled in, leaving blank cells untouched.
 */
export function BudgetUploadForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(bulkApplyBudget, initial);

  return (
    <Card
      title="Budget via Excel"
      subtitle={
        <>
          Download this company&apos;s P&amp;L lines with the current financial year as columns, fill in Budget figures
          offline, then re-upload the same file: blank cells are left untouched.
        </>
      }
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <a href={`/c/${encodeURIComponent(slug)}/budget/template`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN)}>
          Download template
        </a>

        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="slug" value={slug} />
          <div className="min-w-60 flex-1 space-y-2">
            <label htmlFor="budgetFile" className="text-label text-text-secondary">
              Filled-in template <span className="text-text-secondary">(.xlsx)</span>
            </label>
            <input id="budgetFile" name="file" type="file" accept=".xlsx" required className={fileField} />
          </div>
          <Button type="submit" size="sm" disabled={pending} className={BTN}>
            {pending ? "Applying…" : "Apply budget"}
          </Button>
        </form>

        <ActionStatus state={state} className="text-body" />
      </div>
    </Card>
  );
}
