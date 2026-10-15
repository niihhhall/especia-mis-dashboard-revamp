import type { MasterEdit } from "@/lib/data/mis";
import { fmtAmount, negParens } from "@/lib/format";

const FIELD_LABEL: Record<string, string> = {
  opening: "Opening",
  debit: "Debit",
  credit: "Credit",
  closing: "Closing",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const TH = "px-3 py-2 text-label font-medium text-text-secondary first:ps-5 last:pe-5";
const TD = "px-3 py-2 first:ps-5 last:pe-5";

/** The month's manual corrections, newest first, open by default. */
export function EditHistory({ edits, periodLabel }: { edits: MasterEdit[]; periodLabel: string | undefined }) {
  if (edits.length === 0) return null;
  return (
    <details className="rounded-lg border border-border bg-surface" open>
      <summary className="cursor-pointer px-5 pt-5 text-card-title text-text-primary">Edit history ({edits.length})</summary>
      <p className="mt-1 max-w-prose break-words px-5 text-pretty text-body text-text-secondary">
        Manual corrections to {periodLabel}. Re-uploading this month replaces them with the Tally values: these
        entries remain here as the record.
      </p>
      <div className="scrollbar-thin mt-4 max-h-72 overflow-auto border-t border-border">
        <table className="w-full min-w-max text-body text-text-primary">
          <thead>
            <tr className="border-b border-border bg-surface-raised text-start">
              <th className={`${TH} text-start`}>When</th>
              <th className={`${TH} text-start`}>Who</th>
              <th className={`${TH} text-start`}>Ledger</th>
              <th className={`${TH} text-start`}>Field</th>
              <th className={`${TH} text-end`}>From</th>
              <th className={`${TH} text-end`}>To</th>
            </tr>
          </thead>
          <tbody>
            {edits.map((e, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className={`${TD} text-text-secondary`}>{when(e.edited_at)}</td>
                <td className={TD}>{e.editor ?? "-"}</td>
                <td className={TD}>
                  {e.particulars}
                  {e.branchLabel && <span className="ms-2 text-label text-text-secondary">· {e.branchLabel}</span>}
                </td>
                <td className={`${TD} text-text-secondary`}>{FIELD_LABEL[e.field] ?? e.field}</td>
                <td className={`${TD} num text-text-secondary`}>{negParens(fmtAmount(e.old_value))}</td>
                <td className={`${TD} num font-medium`}>{negParens(fmtAmount(e.new_value))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
