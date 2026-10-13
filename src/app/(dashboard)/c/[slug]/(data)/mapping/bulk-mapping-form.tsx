"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/action-status";

import { bulkApplyMapping, type BulkMappingState } from "./actions";

const initial: BulkMappingState = { ok: false, message: "" };

const fileField =
  "w-full text-sm text-muted-foreground file:me-3 file:rounded-md file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary";

/**
 * Bulk mapping via a downloadable/re-uploadable Excel template — the
 * batch counterpart to the one-row-at-a-time editor below. Download lists
 * every ledger (mapped or not) with its current grouping pre-filled;
 * re-uploading the same file applies whatever "New Grouping" cells were
 * filled in, skipping any left blank.
 */
export function BulkMappingForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(bulkApplyMapping, initial);

  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-sm font-semibold">Bulk mapping via Excel</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Download every ledger with its current grouping, fill in or correct{" "}
          <span className="font-medium">New Grouping</span> offline, then re-upload the same file — blank
          rows are left untouched.
        </p>
      </div>

      <a
        href={`/c/${encodeURIComponent(slug)}/mapping/template`}
        className="inline-block rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        Download template
      </a>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="slug" value={slug} />
        <div className="min-w-[240px] flex-1 space-y-1.5">
          <label htmlFor="bulkMappingFile" className="text-sm font-medium">
            Filled-in template <span className="text-muted-foreground">(.xlsx)</span>
          </label>
          <input
            id="bulkMappingFile"
            name="file"
            type="file"
            accept=".xlsx"
            required
            className={fileField}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Applying…" : "Apply mapping"}
        </button>
      </form>

      <ActionStatus state={state} />
    </div>
  );
}
