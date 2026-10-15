"use client";

import { useActionState, useEffect } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/format";

import { uploadTrialBalance, type UploadState } from "./actions";
import { BTN, UploadFields } from "./upload-fields";

const initial: UploadState = { ok: false, message: "" };

const ERROR_ID = "upload-error";
const BOX = "rounded-lg border border-border bg-surface p-5";

/** The field a refusal is about, so it can be marked invalid and focused. */
function invalidField(state: UploadState): "month" | "trialBalance" | null {
  if (state.ok || state.needsConfirm || !state.message) return null;
  if (state.message === "Choose a reporting month.") return "month";
  if (/^Upload a Trial Balance file|^No Trial Balance rows found/.test(state.message)) return "trialBalance";
  return null;
}

export function UploadForm({ slug }: { slug: string }) {
  // Curries the company's slug into the action: a Server Action has no
  // `params` of its own to read it from directly.
  const [state, formAction, pending] = useActionState(uploadTrialBalance.bind(null, slug), initial);
  const invalid = invalidField(state);

  // A field-level refusal moves focus to that field, which announces the
  // message through aria-describedby.
  useEffect(() => {
    if (invalid) document.getElementById(invalid)?.focus();
  }, [state, invalid]);

  const invalidProps = (name: "month" | "trialBalance") =>
    invalid === name ? { "aria-invalid": true, "aria-describedby": ERROR_ID } : {};

  return (
    <div className="max-w-xl space-y-6">
      <form action={formAction} className={`space-y-5 ${BOX}`}>
        {/* Present only after the action refused: re-submitting now carries the
            acknowledgement that manual edits will be replaced AND/OR that any
            new branch label the upload detected should be added as a new
            branch. The action's message says which applied, and sending
            both is harmless when only one did. */}
        {state.needsConfirm && (
          <>
            <input type="hidden" name="confirmDiscard" value="yes" />
            <input type="hidden" name="confirmNewBranches" value="yes" />
          </>
        )}
        <UploadFields invalidProps={invalidProps} />
        <Button type="submit" size="sm" disabled={pending} className={BTN}>
          {pending ? "Importing…" : state.needsConfirm ? "Re-upload and replace manual edits" : "Import & build master data"}
        </Button>
      </form>

      {/* Both status lines stay mounted (empty until there is a reply), so
          a screen reader hears every result; only the box comes and goes
          with the message. */}
      <div className={state.message ? `rounded-md border ${state.needsConfirm ? "border-border-strong" : "border-border"} bg-surface-raised p-4 text-body` : ""}>
        <p role="status" aria-live="polite" className="text-text-primary">
          {state.needsConfirm ? state.message : ""}
        </p>
        <ActionStatus id={ERROR_ID} state={state.needsConfirm ? null : state} className="text-body" />
        {state.needsConfirm && (
          <p className="mt-1 text-label text-text-secondary">
            Re-attach the files and press the button again to go ahead. The replaced values stay in the edit history on
            Master Data.
          </p>
        )}
      </div>

      {state.ok && state.imported && state.imported.length > 0 && (
        <div className={BOX}>
          <p className="mb-2 text-card-title text-text-primary">Imported</p>
          <ul className="space-y-1 text-body text-text-secondary">
            {state.imported.map((i) => (
              <li key={i.label}>
                <span className="text-text-primary">{i.label}</span>: {plural(i.rows, "{n} row", "{n} rows")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.ok && state.unmapped && state.unmapped.length > 0 && (
        <div className={BOX}>
          <p className="mb-2 text-card-title text-text-primary">
            {plural(state.unmapped.length, "{n} unmapped ledger", "{n} unmapped ledgers")}: review on the Mapping tab:
          </p>
          <ul className="space-y-1 text-body text-text-secondary">
            {state.unmapped.map((u) => (
              <li key={u.ledger}>
                <span className="text-text-primary">{u.ledger}</span>: defaulted to {u.suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
