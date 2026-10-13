"use client";

import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { ActionStatus } from "@/components/action-status";
import type { UserRow as UserRowData } from "@/lib/data/users";
import { ROLE_LABEL } from "@/lib/labels";
import { fieldText, focusRing } from "@/lib/ui-classes";

import { removeUser, resetPassword, updateUser, type UserFormState } from "./actions";
import { RoleFields, type CompanyOption } from "./role-fields";

const initial: UserFormState = { ok: false, message: "" };
const field = `h-9 w-full rounded-lg border border-border bg-background px-3 ${fieldText} ${focusRing}`;

const ROLE_TONE: Record<string, string> = {
  admin: "bg-muted text-foreground",
  ca: "bg-info/12 text-info-text",
  company: "bg-muted text-muted-foreground",
};

function initials(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";
}

function ResetPasswordInline({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [state, action, pending] = useActionState(resetPassword, initial);
  const inputId = `new-password-${userId}`;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
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
        className={`h-8 flex-1 rounded-md border border-border bg-background px-2 text-base sm:text-xs ${focusRing}`}
      />
      <button
        type="submit"
        disabled={pending}
        className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set password"}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="h-8 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-muted"
      >
        Cancel
      </button>
      <p id={`${inputId}-hint`} className="w-full text-caption text-muted-foreground">
        Use at least 8 characters.
      </p>
      <ActionStatus state={state} className="w-full text-xs font-medium" />
    </form>
  );
}

function EditForm({
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
    <form action={action} className="space-y-3 rounded-lg bg-muted/40 p-4">
      <input type="hidden" name="userId" value={user.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Name</span>
          <input name="name" defaultValue={user.name ?? ""} autoFocus className={field} />
        </label>
        <div className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
          <p className="flex min-h-9 items-center text-sm text-muted-foreground">
            <span className="line-clamp-2 min-w-0 break-words">{user.email ?? "—"}</span>
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
        <p className="text-caption text-muted-foreground">
          You cannot change your own role — sign in as another admin to do that.
        </p>
      )}

      <ActionStatus state={state.ok ? null : state} className="text-sm font-medium" />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="brand-grad inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-[scale,opacity] duration-150 ease-out hover:opacity-90 motion-safe:not-disabled:active:scale-[0.96] motion-reduce:not-disabled:active:opacity-80 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function UserRow({
  user,
  companies,
  isSelf,
}: {
  user: UserRowData;
  companies: CompanyOption[];
  isSelf: boolean;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "password">("view");
  const [removing, setRemoving] = useState(false);
  const [armed, setArmed] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const access =
    user.role === "company"
      ? (user.company?.name ?? "No company")
      : user.role === "ca"
        ? user.assignedCompanies.length === 0
          ? "No companies assigned"
          : user.assignedCompanies.map((c) => c.name).join(", ")
        : "Every company";

  // In-page armed confirm (same pattern as company-card.tsx), never
  // window.confirm — a suppressed native dialog silently does nothing.
  async function handleRemove() {
    setArmed(false);
    setRemoving(true);
    setRemoveError("");
    const result = await removeUser(user.id);
    setRemoving(false);
    if (!result.ok) setRemoveError(result.message);
  }

  if (mode === "edit") {
    return (
      <li className="p-4">
        <EditForm user={user} companies={companies} isSelf={isSelf} onClose={() => setMode("view")} />
      </li>
    );
  }

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}
            aria-hidden
          >
            {initials(user.name || user.email || "?")}
          </span>
          <div className="min-w-0">
            <p className="line-clamp-2 break-words text-sm font-semibold">
              {user.name || "—"}
              {isSelf && <span className="ms-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
            </p>
            <p className="line-clamp-2 break-words text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-6">
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-overline font-semibold uppercase ${ROLE_TONE[user.role]}`}
          >
            {ROLE_LABEL[user.role] ?? user.role}
          </span>
          {/* Two lines at most; the full assignment list is one Tab away in Edit. */}
          <p className="hidden max-w-xs text-xs text-muted-foreground sm:block">
            <span className="line-clamp-2 break-words">{access}</span>
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setMode("edit")}
              title="Edit"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" aria-hidden />
              <span className="sr-only">Edit {user.email}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "password" ? "view" : "password")}
              title="Reset password"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <KeyRound className="size-3.5" aria-hidden />
              <span className="sr-only">Reset password for {user.email}</span>
            </button>
            {!isSelf && (
              <button
                type="button"
                onClick={() => {
                  setRemoveError("");
                  setArmed(true);
                }}
                disabled={removing}
                title="Remove"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-60"
              >
                <Trash2 className="size-3.5" aria-hidden />
                <span className="sr-only">Remove {user.email}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {mode === "password" && (
        <div className="mt-3">
          <ResetPasswordInline userId={user.id} onClose={() => setMode("view")} />
        </div>
      )}
      {armed && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 rounded-lg bg-danger/5 px-3 py-2">
          <span className="text-xs text-danger">
            Remove {user.email ?? "this user"}? They&rsquo;re signed out and lose access at once.
          </span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="rounded-md bg-danger px-2 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-60"
          >
            {removing ? "Removing…" : "Remove user"}
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      )}
      <ActionStatus
        state={removeError ? { ok: false, message: removeError } : null}
        className="text-xs font-medium not-empty:mt-2"
      />
    </li>
  );
}
