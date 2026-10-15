"use client";

import { useState } from "react";

import { DataTable } from "@/components/dashboard/data-table";
import { ActionStatus } from "@/components/shared/action-status";
import type { UserRow as UserRowData } from "@/lib/data/users";

import { removeUser } from "./actions";
import { EditUserForm } from "./edit-user-form";
import { ResetPasswordInline } from "./reset-password-inline";
import type { CompanyOption } from "./role-fields";
import { RemoveConfirm } from "./user-actions";
import { userColumns, type RowMode } from "./user-columns";

/** The users list as a DataTable; Edit, Reset password and Remove open inline under their row. */
export function UsersTable({ users, companies, selfId }: { users: UserRowData[]; companies: CompanyOption[]; selfId: string }) {
  const [modes, setModes] = useState<Record<string, RowMode | null>>({});
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const open = (id: string, mode: RowMode | null) => {
    setErrors((e) => ({ ...e, [id]: "" }));
    setModes((m) => ({ ...m, [id]: mode }));
  };
  const close = (id: string) => setModes((m) => ({ ...m, [id]: null }));

  // In-page armed confirm, never window.confirm: a suppressed native dialog silently does nothing.
  async function handleRemove(id: string) {
    close(id);
    setRemovingId(id);
    const result = await removeUser(id);
    setRemovingId(null);
    if (!result.ok) setErrors((e) => ({ ...e, [id]: result.message }));
  }

  const columns = userColumns(selfId, removingId, open, (id) => modes[id] ?? null);

  return (
    <DataTable
      label="Users"
      columns={columns}
      data={users}
      getRowId={(u) => u.id}
      empty={null}
      renderExpanded={(u) => {
        const mode = modes[u.id] ?? null;
        const error = errors[u.id];
        if (mode === "edit") return <EditUserForm user={u} companies={companies} isSelf={u.id === selfId} onClose={() => close(u.id)} />;
        if (mode === "password") return <ResetPasswordInline userId={u.id} onClose={() => close(u.id)} />;
        if (mode === "remove") {
          return (
            <RemoveConfirm email={u.email} removing={removingId === u.id} onConfirm={() => handleRemove(u.id)} onCancel={() => close(u.id)} />
          );
        }
        return error ? <ActionStatus state={{ ok: false, message: error }} className="text-label font-medium" /> : null;
      }}
    />
  );
}
