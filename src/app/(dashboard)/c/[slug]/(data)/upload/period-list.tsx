"use client";

import { useState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Card } from "@/components/shared/card";
import { StatusText } from "@/components/shared/status-text";
import { PERIOD_STATUS_LABEL } from "@/lib/labels";

import { deletePeriod } from "./actions";
import { DeleteRow } from "./delete-row";

export interface PeriodListItem {
  id: string;
  label: string;
  status: string;
}

/**
 * Every month uploaded for this company, with a destructive delete: the
 * counterpart to the upload form above it. Re-uploading a month (the form)
 * replaces its data; this removes the month itself, cascading to every table
 * keyed off `period_id`. Client-side because of the confirm step and the
 * per-row pending/error state a plain form action can't express per-row.
 *
 * Confirmation is an in-page armed/confirm click, not `window.confirm`:
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
    <Card flush title="Uploaded months" className="max-w-xl gap-4 pb-0">
      <ul className="border-t border-border">
        {rows.map((p) => (
          <DeleteRow
            key={p.id}
            label={p.label}
            meta={<StatusText emphasis={p.status === "published"}>{PERIOD_STATUS_LABEL[p.status] ?? p.status}</StatusText>}
            armed={armedId === p.id}
            pending={pendingId === p.id}
            question={`Delete ${p.label} permanently? Its Trial Balance and every report built on it go too.`}
            confirm={pendingId === p.id ? "Deleting…" : `Delete ${p.label}`}
            trigger={`Delete ${p.label}`}
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