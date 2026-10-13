"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import { fmtAmount } from "@/lib/format";

import { editMasterCell } from "./actions";

/**
 * One editable Master TB figure.
 *
 * Click to edit, Enter or blur to save, Escape to cancel. On failure the cell
 * reverts to the value the server still holds — never leaves a number on screen
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
  /** Which branch this row belongs to — null for a legacy single-branch period. */
  branchId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Enter/Escape close the editor from the keyboard — focus then goes back
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
      <td className="px-1 py-1 text-end">
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
          className="nums w-32 rounded border border-primary bg-card px-2 py-1 text-end text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </td>
    );
  }

  // The <td> is plain structure; the button inside is the edit trigger, so
  // the cell is reachable by Tab and opens with Enter or Space.
  return (
    <td
      className={`nums p-0 text-end ${value < 0 ? "text-danger" : ""} ${error ? "bg-danger/10" : ""} ${
        pending ? "opacity-50" : ""
      }`}
    >
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
              ? `Edited — Tally value was ${fmtAmount(originalValue!)}`
              : "Click to edit"
        }
        className={`block w-full cursor-pointer px-3 py-1.5 text-end transition-colors hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
          edited ? "underline decoration-primary decoration-2 underline-offset-4" : ""
        }`}
      >
        {fmtAmount(value)}
      </button>
      {error && (
        <span id={errorId} className="sr-only">
          {error}
        </span>
      )}
    </td>
  );
}
