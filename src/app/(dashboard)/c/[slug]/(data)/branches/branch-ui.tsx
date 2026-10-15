"use client";

import type { ReactNode } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/lib/ui-classes";

import type { BranchActionState } from "./actions";

/** Shared look for the branch editor rows. */
export const FIELD = fieldClass;
export const BTN = "h-8 rounded-md text-body";
export const ROW = "border-b border-border last:border-0 align-top";
export const CELL = "px-3 py-2 first:ps-5 last:pe-5";
export const HEAD = "px-3 py-2 text-start text-label font-medium text-text-secondary first:ps-5 last:pe-5";

export function StatusLine({ status }: { status: BranchActionState | null }) {
  return <ActionStatus state={status} className="text-label" />;
}

/** The in-page armed confirm: the question, the confirm button and Cancel. Never `window.confirm`. */
export function ArmedConfirm({
  question,
  confirm,
  pending,
  onConfirm,
  onCancel,
}: {
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
