"use client";

import { useActionState, useEffect } from "react";

import { ActionStatus } from "@/components/action-status";
import { DEMO_WRITE_MESSAGE } from "@/lib/demo/messages";
import { plural } from "@/lib/format";
import { fieldText, focusRing } from "@/lib/ui-classes";

import { uploadTrialBalance, type UploadState } from "./actions";

const initial: UploadState = { ok: false, message: "" };

const field = `w-full rounded-md border border-border bg-card px-3 py-2 ${fieldText} ${focusRing}`;
const fileField =
  "w-full text-sm text-muted-foreground file:me-3 file:rounded-md file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary";

const ERROR_ID = "upload-error";

/** The field a refusal is about, so it can be marked invalid and focused. */
function invalidField(state: UploadState): "month" | "trialBalance" | null {
  if (state.ok || state.needsConfirm || !state.message) return null;
  if (state.message === "Choose a reporting month.") return "month";
  if (/^Upload a Trial Balance file|^No Trial Balance rows found/.test(state.message)) return "trialBalance";
  return null;
}

export function UploadForm({ slug }: { slug: string }) {
  // Curries the company's slug into the action — a Server Action has no
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
      <form action={formAction} className="space-y-5 rounded-xl border border-border bg-card p-6">
        {/* Present only after the action refused: re-submitting now carries the
            acknowledgement that manual edits will be replaced AND/OR that any
            new branch label the upload detected should be added as a new
            branch — the action's message says which applied, and sending
            both is harmless when only one did. */}
        {state.needsConfirm && (
          <>
            <input type="hidden" name="confirmDiscard" value="yes" />
            <input type="hidden" name="confirmNewBranches" value="yes" />
          </>
        )}
        <div className="space-y-1.5">
          <label htmlFor="month" className="text-sm font-medium">
            Reporting month
          </label>
          <input id="month" name="month" type="month" required className={field} {...invalidProps("month")} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="trialBalance" className="text-sm font-medium">
            Trial Balance <span className="text-muted-foreground">(.xls / .xlsx)</span>
          </label>
          <input
            id="trialBalance"
            name="trialBalance"
            type="file"
            accept=".xls,.xlsx"
            required
            className={fileField}
            {...invalidProps("trialBalance")}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="stockInfo" className="text-sm font-medium">
            Stock Info <span className="text-muted-foreground">(optional)</span>
          </label>
          <input id="stockInfo" name="stockInfo" type="file" accept=".xls,.xlsx" className={fileField} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="debtorsAgeing" className="text-sm font-medium">
            Debtors Ageing <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="debtorsAgeing"
            name="debtorsAgeing"
            type="file"
            accept=".xls,.xlsx"
            className={fileField}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="creditorsAgeing" className="text-sm font-medium">
            Creditors Ageing <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="creditorsAgeing"
            name="creditorsAgeing"
            type="file"
            accept=".xls,.xlsx"
            className={fileField}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending
            ? "Importing…"
            : state.needsConfirm
              ? "Re-upload and replace manual edits"
              : "Import & build Master Data"}
        </button>
      </form>

      {/* Both status lines stay mounted (empty until there is a reply), so
          a screen reader hears every result; only the box styling comes and
          goes with the message. */}
      <div
        className={
          !state.message
            ? ""
            : `rounded-lg border p-4 text-sm ${
                state.ok
                  ? "border-success/30 bg-success/5"
                  : state.needsConfirm
                    ? "border-warning/40 bg-warning/10 text-warning-foreground"
                    : state.message === DEMO_WRITE_MESSAGE
                      ? "border-info/30 bg-info/5"
                      : "border-danger/30 bg-danger/5"
              }`
        }
      >
        <p role="status" aria-live="polite">
          {state.needsConfirm ? state.message : ""}
        </p>
        <ActionStatus id={ERROR_ID} state={state.needsConfirm ? null : state} className="text-sm" />
        {state.needsConfirm && (
          <p className="mt-1 text-xs opacity-90">
            Re-attach the files and press the button again to go ahead. The replaced values stay
            in the edit history on Master Data.
          </p>
        )}
      </div>

      {state.ok && state.imported && state.imported.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-sm font-medium">Imported</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {state.imported.map((i) => (
              <li key={i.label}>
                <span className="text-foreground">{i.label}</span> — {plural(i.rows, "{n} row", "{n} rows")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.ok && state.unmapped && state.unmapped.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-sm font-medium">
            {plural(state.unmapped.length, "{n} unmapped ledger", "{n} unmapped ledgers")} — review on the Mapping tab:
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {state.unmapped.map((u) => (
              <li key={u.ledger}>
                <span className="text-foreground">{u.ledger}</span> — defaulted to {u.suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
