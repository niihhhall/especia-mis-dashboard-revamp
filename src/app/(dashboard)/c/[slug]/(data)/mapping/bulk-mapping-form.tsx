"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Card } from "@/components/shared/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { bulkApplyMapping, type BulkMappingState } from "./actions";

const initial: BulkMappingState = { ok: false, message: "" };
const BTN = "h-8 rounded-md text-body";

/** A native file input drawn on the field tokens; the button part is a flat raised chip. */
export const fileField =
  "w-full text-body text-text-secondary file:me-3 file:h-8 file:rounded-md file:border file:border-border file:bg-surface-raised file:px-3 file:text-body file:font-medium file:text-text-primary";

/**
 * Bulk mapping via a downloadable and re-uploadable Excel template: the
 * batch counterpart to the one-row-at-a-time editor below. Download lists
 * every ledger (mapped or not) with its current grouping pre-filled;
 * re-uploading the same file applies whatever "New Grouping" cells were
 * filled in, skipping any left blank.
 */
export function BulkMappingForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(bulkApplyMapping, initial);

  return (
    <Card
      title="Bulk mapping via Excel"
      subtitle={
        <>
          Download every ledger with its current grouping, fill in or correct{" "}
          <span className="font-medium text-text-primary">New Grouping</span> offline, then re-upload the same file: blank rows are left untouched.
        </>
      }
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <a href={`/c/${encodeURIComponent(slug)}/mapping/template`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN)}>
          Download template
        </a>

        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="slug" value={slug} />
          <div className="min-w-60 flex-1 space-y-2">
            <label htmlFor="bulkMappingFile" className="text-label text-text-secondary">
              Filled-in template <span className="text-text-secondary">(.xlsx)</span>
            </label>
            <input id="bulkMappingFile" name="file" type="file" accept=".xlsx" required className={fileField} />
          </div>
          <Button type="submit" size="sm" disabled={pending} className={BTN}>
            {pending ? "Applying…" : "Apply mapping"}
          </Button>
        </form>

        <ActionStatus state={state} className="text-body" />
      </div>
    </Card>
  );
}
