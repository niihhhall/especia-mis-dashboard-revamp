"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import { fmtAmount, negParens } from "@/lib/format";

import { editMasterCell } from "./actions";

/**
 * One editable Master TB figure.
 *
 * Click to edit, Enter or blur to save, Escape to cancel. On failure the cell
 * reverts to the value the server still holds: it never leaves a number on screen
 * that was not actually stored, since every report derives from this table.
 */
export function EditableCell({
  particulars,
  field,
  value,
  originalValue,
  onSaved,
  slug,
  branchId,
}: {
  particulars: string;
  field: "opening" | "debit" | "credit" | "closing";
  value: number;
  /** The pre-edit Tally value, when this cell has been changed before. */
  originalValue?: number;
  onSaved: (field: string, next: number) => void;
  slug: string;
  /** Which branch this row belongs to; null for a legacy single-branch period. */
  branchId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Enter/Escape close the editor from the keyboard: focus then goes back
  // to the cell's button instead of falling to <body>. A blur (click away)
  // leaves focus wherever the user moved it.
  const refocus = useRef(false);
  const errorId = useId();

  useEffect(() => {
    if (!editing && refocus.current) {
      refocus.current = false;
      buttonRef.current?.focus();
    }
  }, [editing]);

  const edited = originalValue !== undefined;

  function commit() {
    const raw = draft.replace(/,/g, "").trim();
    setEditing(false);
    if (raw === "" || Number(raw) === value || !Number.isFinite(Number(raw))) return;

    const next = Number(raw);
    start(async () => {
      const fd = new FormData();
      fd.set("particulars", particulars);
      fd.set("field", field);
      fd.set("value", String(next));
      if (branchId) fd.set("branchId", branchId);
      const r = await editMasterCell(fd, slug);
      if (r.ok) {
        setError(null);
        onSaved(field, next);
      } else {
        setError(r.message);
      }
    });
  }

  if (editing) {
    return (
      <div className="-mx-2 text-end">
        <input
          autoFocus
          defaultValue={String(value)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Without this the Enter's keypress lands on the button that
              // just got focus back, and reopens the editor.
              e.preventDefault();
              refocus.current = true;
              commit();
            }
            if (e.key === "Escape") {
              refocus.current = true;
              setEditing(false);
            }
          }}
          aria-label={`${particulars} ${field}`}
          inputMode="decimal"
          className="num h-8 w-32 rounded-md border border-border-strong bg-surface px-2 text-end text-body text-text-primary"
        />
      </div>
    );
  }

  // The cell is plain structure; the button inside is the edit trigger, so
  // the cell is reachable by Tab and opens with Enter or Space.
  return (
    <div className={`-mx-3 text-end ${error ? "bg-surface-raised" : ""} ${pending ? "opacity-50" : ""}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        aria-label={`Edit ${particulars} ${field}, ${fmtAmount(value)}`}
        aria-describedby={error ? errorId : undefined}
        title={
          error
            ? error
            : edited
              ? `Edited: Tally value was ${fmtAmount(originalValue!)}`
              : "Click to edit"
        }
        className={`block h-13 w-full cursor-pointer px-3 text-end transition-colors hover:bg-surface-hover focus-visible:-outline-offset-2 ${
          edited ? "underline decoration-text-secondary decoration-1 underline-offset-4" : ""
        }`}
      >
        {negParens(fmtAmount(value))}
      </button>
      {error && (
        <span id={errorId} className="sr-only">
          {error}
        </span>
      )}
    </div>
  );
}
