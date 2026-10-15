"use client";

import { KeyRound, Pencil, Trash2 } from "lucide-react";

import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";

import { BTN } from "./user-initials";

const ICON_BTN = "size-8 rounded-md text-text-secondary hover:text-text-primary";

/** Edit, Reset password and Remove for one row. Each opens its inline panel under the row. */
export function UserActions({
  email,
  isSelf,
  removing,
  onEdit,
  onPassword,
  onRemove,
}: {
  email: string | null;
  isSelf: boolean;
  removing: boolean;
  onEdit: () => void;
  onPassword: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button type="button" variant="ghost" size="icon" onClick={onEdit} title="Edit" className={ICON_BTN}>
        <Icon icon={Pencil} />
        <span className="sr-only">Edit {email}</span>
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={onPassword} title="Reset password" className={ICON_BTN}>
        <Icon icon={KeyRound} />
        <span className="sr-only">Reset password for {email}</span>
      </Button>
      {!isSelf && (
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} disabled={removing} title="Remove" className={ICON_BTN}>
          <Icon icon={Trash2} />
          <span className="sr-only">Remove {email}</span>
        </Button>
      )}
    </div>
  );
}

/** The armed Remove confirmation, shown under the row. Never `window.confirm`. */
export function RemoveConfirm({
  email,
  removing,
  onConfirm,
  onCancel,
}: {
  email: string | null;
  removing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="text-body text-text-primary">
        Remove {email ?? "this user"}? They&rsquo;re signed out and lose access at once.
      </span>
      <Button type="button" size="sm" onClick={onConfirm} disabled={removing} className={BTN}>
        {removing ? "Removing…" : "Remove user"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCancel} className={BTN}>
        Cancel
      </Button>
    </div>
  );
}
