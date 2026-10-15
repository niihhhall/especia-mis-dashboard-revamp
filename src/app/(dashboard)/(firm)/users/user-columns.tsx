"use client";

import type { DataTableColumn } from "@/components/dashboard/data-table";
import { StatusText } from "@/components/shared/status-text";
import type { UserRow as UserRowData } from "@/lib/data/users";
import { ROLE_LABEL } from "@/lib/labels";

import { UserActions } from "./user-actions";
import { initials } from "./user-initials";

export type RowMode = "edit" | "password" | "remove";

function access(user: UserRowData): string {
  if (user.role === "company") return user.company?.name ?? "No company";
  if (user.role === "ca") {
    return user.assignedCompanies.length === 0 ? "No companies assigned" : user.assignedCompanies.map((c) => c.name).join(", ");
  }
  return "Every company";
}

/**
 * The Users columns: the person (initials tile, name, "(you)", email), the
 * role as plain text, what they can reach (two lines at most; the full list
 * is in Edit) and the row actions. Headers are read by screen readers only,
 * since the rows never had visible column titles.
 */
export function userColumns(
  selfId: string,
  removingId: string | null,
  open: (id: string, mode: RowMode | null) => void,
  current: (id: string) => RowMode | null,
): DataTableColumn<UserRowData>[] {
  const sr = (text: string) => {
    const Header = () => <span className="sr-only">{text}</span>;
    Header.displayName = `UserHeader${text}`;
    return Header;
  };
  return [
    {
      id: "user",
      header: sr("User"),
      cell: ({ row: { original: u } }) => (
        <div className="flex min-w-0 items-center gap-3 py-2">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-surface-raised text-label font-medium text-text-secondary"
            aria-hidden
          >
            {initials(u.name || u.email || "?")}
          </span>
          <div className="min-w-0">
            <p className="line-clamp-2 break-words text-body font-medium text-text-primary">
              {u.name || "-"}
              {u.id === selfId && <span className="ms-2 font-normal text-text-secondary">(you)</span>}
            </p>
            <p className="line-clamp-2 break-words text-label font-normal text-text-secondary">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: sr("Role"),
      cell: ({ row: { original: u } }) => <StatusText emphasis>{ROLE_LABEL[u.role] ?? u.role}</StatusText>,
    },
    {
      id: "access",
      header: sr("Access"),
      cell: ({ row: { original: u } }) => (
        <p className="max-w-xs whitespace-normal text-label text-text-secondary">
          <span className="line-clamp-2 break-words">{access(u)}</span>
        </p>
      ),
    },
    {
      id: "actions",
      header: sr("Actions"),
      meta: { align: "end" },
      cell: ({ row: { original: u } }) => (
        <UserActions
          email={u.email}
          isSelf={u.id === selfId}
          removing={removingId === u.id}
          onEdit={() => open(u.id, "edit")}
          onPassword={() => open(u.id, current(u.id) === "password" ? null : "password")}
          onRemove={() => open(u.id, "remove")}
        />
      ),
    },
  ];
}
