"use client";

import { useActionState, useState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Button } from "@/components/ui/button";
import type { UserRow as UserRowData } from "@/lib/data/users";
import { fieldClass } from "@/lib/ui-classes";

import { updateUser, type UserFormState } from "./actions";
import { RoleFields, type CompanyOption } from "./role-fields";
import { BTN } from "./user-initials";

const initial: UserFormState = { ok: false, message: "" };

/** The inline Edit form shown under a user's row. */
export function EditUserForm({
  user,
  companies,
  isSelf,
  onClose,
}: {
  user: UserRowData;
  companies: CompanyOption[];
  isSelf: boolean;
  onClose: () => void;
}) {
  const [role, setRole] = useState<string>(user.role);
  const [companyId, setCompanyId] = useState(user.company?.id ?? "");
  const [assignedIds, setAssignedIds] = useState<string[]>(user.assignedCompanies.map((c) => c.id));

  const [state, action, pending] = useActionState(async (prev: UserFormState, fd: FormData) => {
    const result = await updateUser(prev, fd);
    if (result.ok) onClose();
    return result;
  }, initial);

  return (
    <form action={action} className="max-w-2xl space-y-3">
      <input type="hidden" name="userId" value={user.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-label text-text-secondary">Name</span>
          <input name="name" defaultValue={user.name ?? ""} autoFocus className={`${fieldClass} w-full`} />
        </label>
        <div className="block">
          <span className="mb-1 block text-label text-text-secondary">Email</span>
          <p className="flex min-h-8 items-center text-body text-text-secondary">
            <span className="line-clamp-2 min-w-0 break-words">{user.email ?? "-"}</span>
          </p>
        </div>
      </div>

      <RoleFields
        role={role}
        onRoleChange={setRole}
        companies={companies}
        companyId={companyId}
        onCompanyChange={setCompanyId}
        assignedIds={assignedIds}
        onAssignedChange={setAssignedIds}
        lockRole={isSelf}
      />
      {isSelf && (
        <p className="text-label text-text-secondary">
          You cannot change your own role: sign in as another admin to do that.
        </p>
      )}

      <ActionStatus state={state.ok ? null : state} className="text-body font-medium" />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className={BTN}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending} className={BTN}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
