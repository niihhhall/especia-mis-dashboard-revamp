"use client";

import { useState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Card } from "@/components/shared/card";

import { deleteGpDashboard } from "./actions";
import { DeleteRow } from "./delete-row";

export interface GpDashboardListItem {
  id: string;
  label: string;
}

/**
 * Every period with a GP Dashboard currently uploaded, with a destructive
 * delete: the GP Dashboard counterpart to `PeriodList`'s month delete.
 * Deleting the period itself already takes its GP Dashboard with it for
 * free (same row, `periods.gp_dashboard_html`); this is for removing just
 * the GP Dashboard, keeping the rest of that month's data untouched.
 *
 * In-page armed/confirm click, not `window.confirm`: a native confirm()
 * dialog silently does nothing when a browser/extension suppresses it
 * (found and fixed for period deletion; same fix applied here from the
 * start rather than repeating the bug).
 */
export function GpDashboardList({ slug, items }: { slug: string; items: GpDashboardListItem[] }) {
  const [rows, setRows] = useState(items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (rows.length === 0) return null;

  async function confirmDelete(id: string) {
    setArmedId(null);
    setPendingId(id);
    setError("");
    const result = await deleteGpDashboard(id, slug);
    setPendingId(null);
    if (result.ok) {
      setRows((prev) => prev.filter((p) => p.id !== id));
    } else {
      setError(result.message);
    }
  }

  return (
    <Card flush title="GP dashboards uploaded" className="max-w-xl gap-4 pb-0">
      <ul className="border-t border-border">
        {rows.map((p) => (
          <DeleteRow
            key={p.id}
            label={p.label}
            armed={armedId === p.id}
            pending={pendingId === p.id}
            question={<>Remove the GP Dashboard for {p.label}? The month&rsquo;s other data stays.</>}
            confirm={pendingId === p.id ? "Removing…" : "Remove GP dashboard"}
            trigger={`Remove GP dashboard for ${p.label}`}
            onArm={() => {
              setError("");
              setArmedId(p.id);
            }}
            onConfirm={() => confirmDelete(p.id)}
            onCancel={() => setArmedId(null)}
          />
        ))}
      </ul>
      <ActionStatus state={error ? { ok: false, message: error } : null} className="px-5 text-label font-medium not-empty:pb-4" />
    </Card>
  );
}