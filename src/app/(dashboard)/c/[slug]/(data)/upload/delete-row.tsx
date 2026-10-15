"use client";

import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";

import { BTN } from "./upload-fields";

/**
 * One row of an uploaded-items list with an in-page armed delete: a trash
 * icon button, then the question with confirm and Cancel. Never
 * `window.confirm`, which silently does nothing when a browser suppresses it.
 */
export function DeleteRow({ label, meta, armed, pending, question, confirm, trigger, onArm, onConfirm, onCancel }: {
  label: string;
  meta?: ReactNode;
  armed: boolean;
  pending: boolean;
  question: ReactNode;
  confirm: string;
  /** The trash button's name and title. */
  trigger: string;
  onArm: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <li className="flex min-h-13 items-center justify-between gap-3 border-b border-border px-5 py-2 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-body font-medium text-text-primary">{label}</span>
        {meta}
      </div>
      {armed ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-body text-text-primary">{question}</span>
          <Button type="button" size="sm" onClick={onConfirm} disabled={pending} className={`${BTN} shrink-0`}>
            {confirm}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel} className={BTN}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="icon" onClick={onArm} title={trigger} className="size-8 rounded-md text-text-secondary hover:text-text-primary">
          <Icon icon={Trash2} />
          <span className="sr-only">{trigger}</span>
        </Button>
      )}
    </li>
  );
}
