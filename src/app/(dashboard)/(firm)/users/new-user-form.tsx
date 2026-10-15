"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/lib/ui-classes";

import { createUser, type UserFormState } from "./actions";
import { RoleFields, type CompanyOption } from "./role-fields";
import { BTN } from "./user-initials";

const initial: UserFormState = { ok: false, message: "" };
const field = `${fieldClass} w-full`;
const LABEL = "mb-1 block text-label text-text-secondary";

/**
 * Onboard a login, collapsed by default for the same reason
 * `new-company-form.tsx` is: creating an account is occasional, scanning the
 * roster is routine, and a permanently open form would push it below the fold.
 */
export function NewUserForm({ companies }: { companies: CompanyOption[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("company");
  const [companyId, setCompanyId] = useState("");
  const [assignedIds, setAssignedIds] = useState<string[]>([]);

  const [state, action, pending] = useActionState(async (prev: UserFormState, fd: FormData) => {
    const result = await createUser(prev, fd);
    if (result.ok) {
      setOpen(false);
      setRole("company");
      setCompanyId("");
      setAssignedIds([]);
    }
    return result;
  }, initial);

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <ActionStatus state={state.ok ? state : null} className="text-body font-medium" />
        <Button type="button" size="sm" onClick={() => setOpen(true)} className={BTN}>
          <Icon icon={Plus} />
          Add user
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="w-full max-w-2xl rounded-lg border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-card-title text-text-primary">Add user</h2>
        <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} className="size-8 rounded-md text-text-secondary">
          <Icon icon={X} />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Name</span>
          <input name="name" autoFocus className={field} placeholder="Priya Sharma" />
        </label>
        <label className="block">
          <span className={LABEL}>
            Email <span className="text-text-primary">*</span>
          </span>
          <input name="email" type="email" required className={field} placeholder="name@example.com" />
        </label>
        <div className="sm:col-span-2">
          <label className="block">
            <span className={LABEL}>
              Password <span className="text-text-primary">*</span>
            </span>
            <input
              name="password"
              type="text"
              required
              minLength={8}
              autoComplete="new-password"
              aria-describedby="new-user-password-hint"
              className={field}
            />
            <span id="new-user-password-hint" className="mt-1 block text-label text-text-secondary">
              Use at least 8 characters. It&rsquo;s shown in the clear, so hand it to them directly. There is no invite
              email yet.
            </span>
          </label>
        </div>
      </div>

      <div className="mt-4">
        <RoleFields
          role={role}
          onRoleChange={setRole}
          companies={companies}
          companyId={companyId}
          onCompanyChange={setCompanyId}
          assignedIds={assignedIds}
          onAssignedChange={setAssignedIds}
        />
      </div>

      <ActionStatus state={state.ok ? null : state} className="text-body font-medium not-empty:mt-3" />

      <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex justify-end rounded-b-lg border-t border-border bg-surface px-5 py-3">
        <Button type="submit" size="sm" disabled={pending} className={BTN}>
          {pending ? "Adding…" : "Add user"}
        </Button>
      </div>
    </form>
  );
}
