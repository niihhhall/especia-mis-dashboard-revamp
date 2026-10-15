"use client";

import type { ReactNode } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/lib/ui-classes";

import type { TemplateActionState } from "./actions";

/** Shared look for the template editor rows. */
export const FIELD = fieldClass;
export const BTN = "h-8 rounded-md text-body";
export const ROW = "border-b border-border last:border-0 align-top";
export const CELL = "px-3 py-2 first:ps-5 last:pe-5";
export const NEW_ROW = "bg-surface-raised";
const HEAD = "px-3 py-2 text-start text-label font-medium text-text-secondary first:ps-5 last:pe-5";

export const sr = (text: string) => <span className="sr-only">{text}</span>;

export function StatusLine({ status }: { status: TemplateActionState | null }) {
  return <ActionStatus state={status} className="text-label" />;
}

/** The in-page armed confirm. Never `window.confirm`, which silently does nothing when suppressed. */
export function ArmedConfirm({ question, confirm, pending, onConfirm, onCancel }: {
  question: ReactNode;
  confirm: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-body text-text-primary">{question}</span>
      <Button type="button" size="sm" onClick={onConfirm} disabled={pending} className={BTN}>
        {confirm}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCancel} className={BTN}>
        Cancel
      </Button>
    </div>
  );
}

/** Save, Delete and the status for an existing row. */
export function RowActions({ name, canSave, pending, status, onSave, onDelete }: {
  name: string;
  canSave: boolean;
  pending: boolean;
  status: TemplateActionState | null;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={onSave} disabled={!canSave || pending} aria-label={`Save ${name}`} className={BTN}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onDelete} disabled={pending} aria-label={`Delete ${name}`} className={BTN}>
        Delete
      </Button>
      <StatusLine status={status} />
    </div>
  );
}

/** One Card per section: title, hint, then the table in a labelled scroll region. */
export function SectionCard({ title, hint, label, heads, children }: {
  title: string;
  hint: ReactNode;
  label: string;
  heads: ReactNode[];
  children: ReactNode;
}) {
  return (
    <Card flush title={title} subtitle={hint} className="gap-4">
      <div tabIndex={0} role="region" aria-label={label} className="scrollbar-thin relative overflow-x-auto border-t border-border focus-visible:-outline-offset-2">
        <table className="w-full text-body text-text-primary">
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              {heads.map((h, i) => (
                <th key={i} className={HEAD}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </Card>
  );
}
