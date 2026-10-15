"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/lib/ui-classes";

import { resetPassword, type UserFormState } from "./actions";
import { BTN } from "./user-initials";

const initial: UserFormState = { ok: false, message: "" };

export function ResetPasswordInline({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [state, action, pending] = useActionState(resetPassword, initial);
  const inputId = `new-password-${userId}`;
  return (
    <form action={action} className="flex max-w-2xl flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label htmlFor={inputId} className="sr-only">
        New password
      </label>
      <input
        id={inputId}
        name="password"
        type="text"
        required
        minLength={8}
        autoComplete="new-password"
        autoFocus
        aria-describedby={`${inputId}-hint`}
        className={`${fieldClass} min-w-48 flex-1`}
      />
      <Button type="submit" size="sm" disabled={pending} className={BTN}>
        {pending ? "Saving…" : "Set password"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onClose} className={BTN}>
        Cancel
      </Button>
      <p id={`${inputId}-hint`} className="w-full text-label text-text-secondary">
        Use at least 8 characters.
      </p>
      <ActionStatus state={state} className="w-full text-label font-medium" />
    </form>
  );
}
