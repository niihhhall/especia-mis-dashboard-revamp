"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useState } from "react";

import { ActionStatus } from "@/components/action-status";
import { fieldText, focusRing } from "@/lib/ui-classes";
import { createUser, type UserFormState } from "./actions";
import { RoleFields, type CompanyOption } from "./role-fields";

const initial: UserFormState = { ok: false, message: "" };

const field = `h-9 w-full rounded-lg border border-border bg-background px-3 ${fieldText} ${focusRing}`;

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
        <ActionStatus state={state.ok ? state : null} className="text-sm font-medium" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="brand-grad inline-flex h-9 items-center gap-1.5 rounded-lg ps-3.5 pe-4 text-sm font-semibold text-white shadow-sm transition-[scale,opacity] duration-150 ease-out hover:opacity-90 motion-safe:not-disabled:active:scale-[0.96] motion-reduce:not-disabled:active:opacity-80"
        >
          <Plus className="size-4" strokeWidth={2} absoluteStrokeWidth aria-hidden />
          Add user
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="card-surface w-full max-w-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold">Add user</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" aria-hidden />
          <span className="sr-only">Cancel</span>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Name</span>
          <input name="name" autoFocus className={field} placeholder="Priya Sharma" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Email <span className="text-danger">*</span>
          </span>
          <input name="email" type="email" required className={field} placeholder="name@example.com" />
        </label>
        <div className="sm:col-span-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Password <span className="text-danger">*</span>
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
            <span id="new-user-password-hint" className="mt-1 block text-caption text-muted-foreground">
              Use at least 8 characters. It&rsquo;s shown in the clear, so hand it to them directly. There is no
              invite email yet.
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

      <ActionStatus state={state.ok ? null : state} className="text-sm font-medium not-empty:mt-3" />

      <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex justify-end rounded-b-xl border-t border-border bg-card px-5 py-3">
        <button
          type="submit"
          disabled={pending}
          className="brand-grad inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-[scale,opacity] duration-150 ease-out hover:opacity-90 motion-safe:not-disabled:active:scale-[0.96] motion-reduce:not-disabled:active:opacity-80 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add user"}
        </button>
      </div>
    </form>
  );
}
