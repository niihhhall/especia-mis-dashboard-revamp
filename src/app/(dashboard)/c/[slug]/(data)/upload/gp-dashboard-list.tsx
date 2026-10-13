"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { ActionStatus } from "@/components/action-status";

import { deleteGpDashboard } from "./actions";

export interface GpDashboardListItem {
  id: string;
  label: string;
}

/**
 * Every period with a GP Dashboard currently uploaded, with a destructive
 * delete — the GP Dashboard counterpart to `PeriodList`'s month delete.
 * Deleting the period itself already takes its GP Dashboard with it for
 * free (same row, `periods.gp_dashboard_html`); this is for removing just
 * the GP Dashboard, keeping the rest of that month's data untouched.
 *
 * In-page armed/confirm click, not `window.confirm` — a native confirm()
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
    <div className="max-w-xl space-y-3">
      <p className="text-sm font-medium">GP Dashboards uploaded</p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((p) => {
          const armed = armedId === p.id;
          return (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-sm font-medium">{p.label}</span>
              {armed ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="text-xs text-danger">
                    Remove the GP Dashboard for {p.label}? The month&rsquo;s other data stays.
                  </span>
                  <button
                    type="button"
                    onClick={() => confirmDelete(p.id)}
                    disabled={pendingId === p.id}
                    className="shrink-0 rounded-md bg-danger px-2 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-60"
                  >
                    {pendingId === p.id ? "Removing…" : "Remove GP Dashboard"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setArmedId(null)}
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setArmedId(p.id);
                  }}
                  title={`Remove GP Dashboard for ${p.label}`}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  <span className="sr-only">Remove GP Dashboard for {p.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <ActionStatus state={error ? { ok: false, message: error } : null} className="text-xs font-medium" />
    </div>
  );
}
