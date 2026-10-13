"use client";

import { ArrowRight, History, Pencil, Upload as UploadIcon, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";

import { ActionStatus } from "@/components/action-status";
import { CompanyAvatar } from "@/components/company-avatar";
import { Modal } from "@/components/modal";
import { companyPath } from "@/lib/company-scope";
import type { CompanyCard as CompanyCardData } from "@/lib/data/portfolio";
import { useFmtCompact } from "@/components/layout/unit-context";
import { fyDisplay } from "@/lib/format";
import { fyLabel } from "@/lib/mis/period";
import { fieldText, focusRing } from "@/lib/ui-classes";

import {
  archiveCompany,
  deleteCompanyPermanently,
  removeCompanyLogo,
  unarchiveCompany,
  updateCompany,
  uploadCompanyLogo,
  type CompanyActionState,
  type LogoActionState,
} from "./actions";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const field = `h-9 w-full rounded-lg border border-border bg-background px-3 ${fieldText} ${focusRing}`;

function Field({
  name,
  label,
  defaultValue,
  required,
  autoFocusField,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  /** Focused when the modal opens (see `Modal`). */
  autoFocusField?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        data-autofocus={autoFocusField || undefined}
        className={field}
      />
    </label>
  );
}

function LogoEditor({ companyId, name, logoUrl }: { companyId: string; name: string; logoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(logoUrl);
  const [removeStatus, setRemoveStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [uploadState, uploadAction, uploading] = useActionState(
    async (_prev: LogoActionState, fd: FormData) => {
      setRemoveStatus(null);
      const result = await uploadCompanyLogo(_prev, fd);
      if (result.ok) setCurrent(result.logoUrl ?? null);
      return result;
    },
    { ok: false, message: "" } as LogoActionState,
  );
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    setRemoveStatus(null);
    const result = await removeCompanyLogo(companyId);
    setRemoving(false);
    // A refusal (e.g. demo mode) must say so, or the button looks broken.
    if (!result.ok) {
      setRemoveStatus(result);
      return;
    }
    setCurrent(null);
    // Plain function called from onClick, not a <form action> — needs its
    // own refresh so the card behind this form (once closed) shows the
    // removal too, same reasoning as the Archive control below.
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <CompanyAvatar name={name} logoUrl={current} className="size-12 text-base" />
      <div className="space-y-1">
        <form
          action={uploadAction}
          onChange={(e) => {
            // Auto-submit the moment a file is chosen — a logo picker doesn't
            // need its own separate "Upload" click once a file is selected.
            if (inputRef.current?.files?.length) e.currentTarget.requestSubmit();
          }}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="companyId" value={companyId} />
          <input
            ref={inputRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border ps-1.5 pe-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            <UploadIcon className="size-3" strokeWidth={2} absoluteStrokeWidth aria-hidden />
            {uploading ? "Uploading…" : current ? "Replace logo" : "Add logo"}
          </button>
          {current && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="text-xs font-medium text-muted-foreground hover:text-danger disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </form>
        <p className="text-caption text-muted-foreground">PNG, JPEG, WebP, or SVG — under 2 MB.</p>
        <ActionStatus
          state={removeStatus ?? (uploadState.ok ? null : uploadState)}
          className="text-caption font-medium"
        />
      </div>
    </div>
  );
}

/**
 * Type-the-name-to-confirm delete — a deliberately heavier gate than the
 * armed/confirm pattern used for a branch or a channel group, since deleting
 * a whole company takes every Trial Balance, mapping and template with it,
 * permanently, in one action.
 */
function DeleteCompanyControl({ card, onClose }: { card: CompanyCardData; onClose: () => void }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setPending(true);
    setError("");
    const result = await deleteCompanyPermanently(card.id, typed);
    setPending(false);
    if (result.ok) {
      router.refresh();
      onClose();
      return;
    }
    setError(result.message);
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="text-xs font-medium text-muted-foreground hover:text-danger"
      >
        Delete company permanently
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-danger/40 bg-danger/5 p-3">
      <p className="text-xs font-semibold text-danger">
        This permanently deletes {card.name} — every Trial Balance, mapping, and template with it. This
        cannot be undone.
      </p>
      <label className="mt-2 block">
        <span className="mb-1 block text-caption text-muted-foreground">
          Type <span className="font-semibold text-foreground">{card.name}</span> to confirm
        </span>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className={`h-8 w-full rounded-md border border-border bg-background px-2 text-base sm:text-xs ${focusRing}`}
        />
      </label>
      <ActionStatus
        state={error ? { ok: false, message: error } : null}
        className="text-caption font-medium not-empty:mt-1.5"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setArmed(false);
            setTyped("");
            setError("");
          }}
          className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending || typed.trim() !== card.name}
          className="rounded-md bg-danger px-2 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-40"
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </div>
  );
}

/** Same armed/confirm Archive control that used to sit on the card itself —
 * moved here since it's an occasional, deliberate action, not something
 * that belongs on the grid every CA scans daily. */
function ArchiveControl({ card, onClose }: { card: CompanyCardData; onClose: () => void }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleArchive() {
    setPending(true);
    setError("");
    const result = await archiveCompany(card.id);
    setPending(false);
    setArmed(false);
    if (result.ok) {
      router.refresh();
      onClose();
      return;
    }
    setError(result.message);
  }

  return (
    <div>
      {armed ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-danger">
            Archive {card.name}? It leaves every company list until an admin restores it.
          </span>
          <button
            type="button"
            onClick={handleArchive}
            disabled={pending}
            className="shrink-0 rounded-md bg-danger px-2 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-60"
          >
            {pending ? "Archiving…" : "Archive company"}
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-xs font-medium text-muted-foreground hover:text-danger"
        >
          Archive company
        </button>
      )}
      <ActionStatus
        state={error ? { ok: false, message: error } : null}
        className="text-xs font-medium not-empty:mt-1.5"
      />
    </div>
  );
}

function EditForm({ card, canArchive, onClose }: { card: CompanyCardData; canArchive: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState(async (prev: CompanyActionState, fd: FormData) => {
    const result = await updateCompany(prev, fd);
    if (result.ok) onClose();
    return result;
  }, { ok: false, message: "" } as CompanyActionState);

  return (
    <div className="card-surface flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="edit-company-title" className="text-sm font-bold">Edit company</h2>
        <button
          type="button"
          onClick={onClose}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" aria-hidden />
          <span className="sr-only">Cancel</span>
        </button>
      </div>

      <LogoEditor companyId={card.id} name={card.name} logoUrl={card.logoUrl} />

      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="companyId" value={card.id} />
        <div className="sm:col-span-2">
          <Field name="name" label="Company name" defaultValue={card.name} required autoFocusField />
        </div>
        <div className="sm:col-span-2 -mt-1">
          <span className="text-caption text-muted-foreground">
            Short link: <span className="font-medium text-foreground">/{card.slug}</span> — set once at
            creation, not editable here.
          </span>
        </div>
        <Field name="group" label="Group" defaultValue={card.group === card.name ? "" : card.group} />
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Financial year starts</span>
          <select name="fyStart" defaultValue={card.fyStartMonth} className={field}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <Field name="pan" label="PAN" defaultValue={card.pan ?? ""} />
        <Field name="gst" label="GST" defaultValue={card.gst ?? ""} />
        <Field name="cin" label="CIN" defaultValue={card.cin ?? ""} />
        <div className="sm:col-span-2">
          <Field name="address" label="Address" defaultValue={card.address ?? ""} />
        </div>

        <ActionStatus state={state.ok ? null : state} className="text-sm font-medium sm:col-span-2" />

        <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-border bg-card px-5 py-3 sm:col-span-2">
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

      {canArchive && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <ArchiveControl card={card} onClose={onClose} />
          <DeleteCompanyControl card={card} onClose={onClose} />
        </div>
      )}
    </div>
  );
}

/** Long month from a YYYY-MM-01 period month. */
function longMonth(month: string): string {
  const [y, m] = month.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function StatusPill({ card }: { card: CompanyCardData }) {
  const [tone, label] = card.archivedAt
    ? ["bg-muted text-muted-foreground", "Archived"]
    : !card.latest
      ? ["bg-muted text-muted-foreground", "No data"]
      : card.drafts > 0
        ? ["bg-warning/15 text-warning-text", "Under review"]
        : ["bg-success/12 text-success-text", "Published"];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold ${tone}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-caption font-medium text-muted-foreground">{label}</p>
      <p className="line-clamp-2 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

/**
 * One company card on the Companies grid — view mode by default, `EditForm`
 * opens in a full-screen `Modal` when "Edit" is clicked. Archive and
 * permanent Delete both live inside that modal now (admin-only), not on the
 * card itself — the grid a CA scans every day shouldn't carry a destructive
 * action for something occasional. An already-archived card has no Edit
 * entry point (`canEdit` is false for it), so it keeps its own direct
 * Restore/Delete controls in the footer instead. Every confirm step here is
 * in-page armed/confirm, never `window.confirm` — a native confirm() dialog
 * silently does nothing when a browser/extension suppresses it (found and
 * fixed for period deletion; same fix applied here up front).
 */
export function CompanyCard({
  card,
  canEdit,
  canArchive,
}: {
  card: CompanyCardData;
  canEdit: boolean;
  canArchive: boolean;
}) {
  const fmtCompact = useFmtCompact();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const dash = "—";

  async function handleRestore() {
    setPending(true);
    setError("");
    const result = await unarchiveCompany(card.id);
    setPending(false);
    setArmed(false);
    // `unarchiveCompany` is a plain function, not a <form action> or
    // useActionState — Next only auto-refreshes the route after those two.
    // Called directly like this (same shape as the Users page's removeUser),
    // revalidatePath alone marks the server cache stale but leaves this
    // already-mounted page showing the old split until something asks for
    // fresh data — router.refresh() is that ask, so the card actually moves
    // between the archived section and the active grid.
    if (result.ok) router.refresh();
    else setError(result.message);
  }

  return (
    <article className="card-surface flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <CompanyAvatar name={card.name} logoUrl={card.logoUrl} className="size-11 text-sm" />
          <div className="min-w-0">
            <h2 className="line-clamp-2 break-words text-base font-bold leading-tight">{card.name}</h2>
            <p className="line-clamp-2 break-words text-xs text-muted-foreground">{card.group}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusPill card={card} />
          {canEdit && !card.archivedAt && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Edit company"
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" strokeWidth={2} absoluteStrokeWidth aria-hidden />
              <span className="sr-only">Edit {card.name}</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        <InfoField label="Latest period" value={card.latest ? longMonth(card.latest.month) : dash} />
        <InfoField label="Revenue" value={card.revenue === null ? dash : fmtCompact(card.revenue)} />
        <InfoField label="Manager" value={card.managers.join(" & ") || "Unassigned"} />
        <InfoField label="Financial year" value={card.latest ? fyDisplay(fyLabel(card.latest.month, 4)) : dash} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Link
          href={companyPath(card.slug, "/dashboard")}
          className="brand-grad inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-[scale,opacity] duration-150 ease-out hover:opacity-90 motion-safe:not-disabled:active:scale-[0.96] motion-reduce:not-disabled:active:opacity-80"
        >
          Open dashboard
          <ArrowRight className="size-4" strokeWidth={2} absoluteStrokeWidth aria-hidden />
        </Link>
        <Link
          href={companyPath(card.slug, "/history")}
          title={`MIS history — ${card.name}`}
          className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <History className="size-4" strokeWidth={2} absoluteStrokeWidth aria-hidden />
          <span className="sr-only">MIS history</span>
        </Link>
        <Link
          href={companyPath(card.slug, "/upload")}
          title={`Upload — ${card.name}`}
          className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <UploadIcon className="size-4" strokeWidth={2} absoluteStrokeWidth aria-hidden />
          <span className="sr-only">Upload</span>
        </Link>
      </div>

      {/* Archive lives inside the Edit modal now (see `ArchiveControl`) —
          the grid a CA scans every day shouldn't carry it. An already-
          archived card has no Edit entry point at all (`canEdit` is false
          for it), so Restore and permanent Delete stay here, directly. */}
      {canArchive && card.archivedAt && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {armed ? (
              <>
                <span className="text-xs text-danger">Restore {card.name} to the active grid?</span>
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={pending}
                  className="shrink-0 rounded-md bg-danger px-2 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-60"
                >
                  {pending ? "Restoring…" : "Restore company"}
                </button>
                <button
                  type="button"
                  onClick={() => setArmed(false)}
                  className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setArmed(true)}
                className="text-xs font-medium text-muted-foreground hover:text-danger"
              >
                Restore company
              </button>
            )}
          </div>
          <div className="flex justify-end">
            <DeleteCompanyControl card={card} onClose={() => {}} />
          </div>
        </div>
      )}
      <ActionStatus
        state={error ? { ok: false, message: error } : null}
        className="text-xs font-medium not-empty:mt-2"
      />

      <Modal open={editing} onClose={() => setEditing(false)} labelledBy="edit-company-title">
        <EditForm card={card} canArchive={canArchive} onClose={() => setEditing(false)} />
      </Modal>
    </article>
  );
}
