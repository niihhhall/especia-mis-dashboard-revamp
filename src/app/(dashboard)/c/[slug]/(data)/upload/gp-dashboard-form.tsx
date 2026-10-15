"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/ui/button";

import { uploadGpDashboard, type GpDashboardState } from "./actions";
import { BTN, FIELD, FILE, LABEL } from "./upload-fields";

const initial: GpDashboardState = { ok: false, message: "" };

/**
 * Upload the GP Dashboard HTML working file for one already-uploaded
 * reporting month, separate from `UploadForm` above on purpose. Unlike
 * Stock Info or Ageing (which only make sense alongside a fresh Trial
 * Balance), a CA should be able to update a month's GP Dashboard on its
 * own, any time, without re-running a full Trial Balance import, so this
 * targets an EXISTING period from a dropdown rather than a "Reporting
 * month" date picker.
 */
export function GpDashboardForm({ slug, periods }: { slug: string; periods: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(uploadGpDashboard, initial);

  if (periods.length === 0) return null;

  return (
    <Card
      title="GP dashboard"
      subtitle={<>Upload the GP Dashboard HTML working file for a month: shown on that month&rsquo;s GP Dashboard tab.</>}
      className="max-w-xl"
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="slug" value={slug} />

        <div className="space-y-2">
          <label htmlFor="periodId" className={LABEL}>
            Reporting month
          </label>
          <select id="periodId" name="periodId" defaultValue={periods[0]!.id} className={FIELD}>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="gpDashboard" className={LABEL}>
            GP Dashboard <span className="text-text-secondary">(.html)</span>
          </label>
          <input id="gpDashboard" name="gpDashboard" type="file" accept=".html,.htm,text/html" required className={FILE} />
        </div>

        <Button type="submit" size="sm" disabled={pending} className={BTN}>
          {pending ? "Uploading…" : "Upload GP dashboard"}
        </Button>
      </form>

      <ActionStatus state={state} className="text-body not-empty:mt-4" />
    </Card>
  );
}
