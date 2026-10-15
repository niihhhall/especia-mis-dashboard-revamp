"use client";

import { Check } from "lucide-react";

import { Icon } from "@/components/shared/icon";

import { ROLE_LABEL } from "@/lib/labels";
import { fieldClass } from "@/lib/ui-classes";

export interface CompanyOption {
  id: string;
  slug: string;
  name: string;
}

const ROLES = [
  { value: "company", label: ROLE_LABEL.company, hint: "Reads its own reports only" },
  { value: "ca", label: ROLE_LABEL.ca, hint: "Uploads and edits assigned companies" },
  { value: "admin", label: ROLE_LABEL.admin, hint: "Full access to every company" },
] as const;

const selectCls = `${fieldClass} w-full`;

/**
 * The role-dependent half of the user form: a company login points at exactly
 * one company, a CA login points at zero or more, and an admin login points at
 * none. Shared between the create and edit forms so the two can never drift:
 * whichever fields a role needs is decided here once.
 */
export function RoleFields({
  role,
  onRoleChange,
  companies,
  companyId,
  onCompanyChange,
  assignedIds,
  onAssignedChange,
  lockRole,
}: {
  role: string;
  onRoleChange: (v: string) => void;
  companies: CompanyOption[];
  companyId: string;
  onCompanyChange: (v: string) => void;
  assignedIds: string[];
  onAssignedChange: (ids: string[]) => void;
  /** True for an admin editing their own row: role has to stay admin. */
  lockRole?: boolean;
}) {
  const toggle = (id: string) => {
    onAssignedChange(
      assignedIds.includes(id) ? assignedIds.filter((x) => x !== id) : [...assignedIds, id],
    );
  };

  return (
    <div className="space-y-3">
      {/* Native radios named `role`, so the Server Action reads the same
          field and values as before; each card is the radio's label. */}
      <fieldset disabled={lockRole}>
        <legend className="mb-2 block text-label text-text-secondary">Role</legend>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className="relative cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-start text-body font-medium text-text-primary transition-colors hover:bg-surface-raised has-[:checked]:border-border-strong has-[:checked]:bg-surface-raised has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => onRoleChange(r.value)}
                className="sr-only"
              />
              <span className="flex items-start justify-between gap-1">
                {r.label}
                {role === r.value && (
                  <span className="inline-flex shrink-0 items-center text-text-secondary">
                    <Icon icon={Check} size={14} />
                    <span className="sr-only">Selected</span>
                  </span>
                )}
              </span>
              <span className="mt-1 block text-label font-normal text-text-secondary">{r.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {/* A disabled fieldset submits nothing, so a locked role still has to
          reach the action (it refuses a missing role). */}
      {lockRole && <input type="hidden" name="role" value={role} />}

      {role === "company" && (
        <label className="block">
          <span className="mb-1 block text-label text-text-secondary">Company *</span>
          <select
            name="companyId"
            value={companyId}
            onChange={(e) => onCompanyChange(e.target.value)}
            required
            className={selectCls}
          >
            <option value="">Choose a company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {role === "ca" && (
        <div>
          <span className="mb-2 block text-label text-text-secondary">Assigned companies</span>
          {companies.length === 0 ? (
            <p className="text-body text-text-secondary">No companies exist yet.</p>
          ) : (
            <div className="scrollbar-thin grid max-h-40 grid-cols-2 gap-1 overflow-y-auto overscroll-contain rounded-md border border-border bg-surface p-2">
              {companies.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-body text-text-primary hover:bg-surface-raised"
                >
                  <input
                    type="checkbox"
                    name="assignedCompanyIds"
                    value={c.id}
                    checked={assignedIds.includes(c.id)}
                    onChange={() => toggle(c.id)}
                    className="size-3.5"
                  />
                  <span className="line-clamp-2 min-w-0 break-words">{c.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {role === "admin" && (
        <p className="rounded-md border border-border bg-surface-raised px-3 py-2 text-body text-text-secondary">
          Admins see and can edit every company: no company or assignment to set.
        </p>
      )}
    </div>
  );
}
