"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/action-status";

import { uploadGpDashboard, type GpDashboardState } from "./actions";

const initial: GpDashboardState = { ok: false, message: "" };

const field = "w-full rounded-md border border-border bg-card px-3 py-2 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const fileField =
  "w-full text-sm text-muted-foreground file:me-3 file:rounded-md file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary";

/**
 * Upload the GP Dashboard HTML working file for one already-uploaded
 * reporting month — separate from `UploadForm` above on purpose. Unlike
 * Stock Info/Ageing (which only make sense alongside a fresh Trial
 * Balance), a CA should be able to update a month's GP Dashboard on its
 * own, any time, without re-running a full Trial Balance import — so this
 * targets an EXISTING period from a dropdown rather than a "Reporting
 * month" date picker.
 */
export function GpDashboardForm({
  slug,
  periods,
}: {
  slug: string;
  periods: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(uploadGpDashboard, initial);

  if (periods.length === 0) return null;

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-sm font-semibold">GP Dashboard</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Upload the GP Dashboard HTML working file for a month — shown on that month&rsquo;s GP
          Dashboard tab.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="slug" value={slug} />

        <div className="space-y-1.5">
          <label htmlFor="periodId" className="text-sm font-medium">
            Reporting month
          </label>
          <select id="periodId" name="periodId" defaultValue={periods[0]!.id} className={field}>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gpDashboard" className="text-sm font-medium">
            GP Dashboard <span className="text-muted-foreground">(.html)</span>
          </label>
          <input
            id="gpDashboard"
            name="gpDashboard"
            type="file"
            accept=".html,.htm,text/html"
            required
            className={fileField}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Upload GP Dashboard"}
        </button>
      </form>

      <ActionStatus state={state} />
    </div>
  );
}
