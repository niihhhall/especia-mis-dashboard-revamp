"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { ActionStatus } from "@/components/action-status";
import { PERIOD_STATUS_LABEL } from "@/lib/labels";

import { deletePeriod } from "./actions";

export interface PeriodListItem {
  id: string;
  label: string;
  status: string;
}

const STATUS_TONE: Record<string, string> = {
  published: "bg-success/12 text-success-text",
  draft: "bg-muted text-muted-foreground",
};

/**
 * Every month uploaded for this company, with a destructive delete — the
 * counterpart to the upload form above it. Re-uploading a month (the form)
 * replaces its data; this removes the month itself, cascading to every table
 * keyed off `period_id`. Client-side because of the confirm step and the
 * per-row pending/error state a plain form action can't express per-row.
 *
 * Confirmation is an in-page armed/confirm click, not `window.confirm` —
 * a native confirm() dialog is a silent single point of failure: some
 * browsers/extensions suppress it outright, and when that happens
 * `!window.confirm(...)` is simply `true` with no error and no visible sign
 * anything was blocked, so a delete click just does nothing forever. Two
 * plain clicks in the page's own DOM has no such failure mode.
 */
export function PeriodList({ slug, periods }: { slug: string; periods: PeriodListItem[] }) {
  const [rows, setRows] = useState(periods);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (rows.length === 0) return null;

  async function confirmDelete(id: string) {
    setArmedId(null);
    setPendingId(id);
    setError("");
    const result = await deletePeriod(id, slug);
    setPendingId(null);
    if (result.ok) {
      setRows((prev) => prev.filter((p) => p.id !== id));
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="max-w-xl space-y-3">
      <p className="text-sm font-medium">Uploaded months</p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((p) => {
          const armed = armedId === p.id;
          return (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium">{p.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-overline font-semibold uppercase ${STATUS_TONE[p.status] ?? STATUS_TONE.draft}`}
                >
                  {PERIOD_STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>
              {armed ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="text-xs text-danger">
                    Delete {p.label} permanently? Its Trial Balance and every report built on it go too.
                  </span>
                  <button
                    type="button"
                    onClick={() => confirmDelete(p.id)}
                    disabled={pendingId === p.id}
                    className="shrink-0 rounded-md bg-danger px-2 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-60"
                  >
                    {pendingId === p.id ? "Deleting…" : `Delete ${p.label}`}
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
                  title={`Delete ${p.label}`}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  <span className="sr-only">Delete {p.label}</span>
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
