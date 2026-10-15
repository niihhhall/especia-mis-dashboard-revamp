"use client";

import { Trash2 } from "lucide-react";

import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";

import type { BranchActionState } from "./actions";
import { BTN, StatusLine } from "./branch-ui";

/** Save (active branches only), Archive or Restore, and permanent Delete for one branch row. */
export function BranchRowActions({
  label,
  archived,
  dirty,
  pending,
  status,
  onSave,
  onArchive,
  onDelete,
}: {
  label: string;
  archived: boolean;
  dirty: boolean;
  pending: boolean;
  status: BranchActionState | null;
  onSave: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {!archived && (
        <Button size="sm" onClick={onSave} disabled={!dirty || pending} aria-label={`Save ${label}`} className={BTN}>
          {pending ? "Saving…" : "Save"}
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={onArchive} disabled={pending} aria-label={`${archived ? "Restore" : "Archive"} ${label}`} className={BTN}>
        {archived ? "Restore" : "Archive"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={pending}
        title={`Permanently delete ${label}`}
        className="size-8 rounded-md text-text-secondary hover:text-text-primary"
      >
        <Icon icon={Trash2} />
        <span className="sr-only">Permanently delete {label}</span>
      </Button>
      <StatusLine status={status} />
    </div>
  );
}
