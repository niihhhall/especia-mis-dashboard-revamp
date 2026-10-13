"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/action-status";
import type { SegmentDef, TemplateLine } from "@/lib/mis/catalog";
import type { ManualInputs } from "@/lib/mis/types";

import { saveInputs, type InputsState } from "./actions";

const initialState: InputsState = { ok: false, message: "" };

interface FieldDef {
  key: string;
  label: string;
  hint?: string;
}

/** Universal fields every company has, regardless of its own template. */
const UNIVERSAL_GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Stock",
    fields: [{ key: "closingStock", label: "Closing Stock", hint: "from Stock Info / count" }],
  },
  {
    title: "Below EBITDA",
    fields: [
      { key: "depreciation", label: "Depreciation" },
      { key: "interestExpense", label: "Interest Expense", hint: "carved out of Finance Cost" },
    ],
  },
];

export function InputsForm({
  initial,
  periodLabel,
  branchId,
  slug,
  template,
  segments,
}: {
  initial: ManualInputs;
  periodLabel: string;
  /** Which branch these adjustments belong to — null for a legacy single-branch period. */
  branchId: string | null;
  slug: string;
  /** This company's own template — drives which manual-override fields render. */
  template: TemplateLine[];
  /** This company's own segments — drives the segment-stock table (0 rows if none configured). */
  segments: SegmentDef[];
}) {
  // Curries the company's slug into the action — see the comment on
  // `saveInputs` for why a Server Action needs it passed this way.
  const [state, formAction, pending] = useActionState(saveInputs.bind(null, slug), initialState);
  const val = (k: string) => {
    const v = initial[k];
    return typeof v === "number" ? String(v) : "";
  };
  const segVal = (which: "segmentOpeningStock" | "segmentClosingStock", key: string) => {
    const t = initial[which];
    return t && typeof t[key] === "number" ? String(t[key]) : "";
  };

  // Revenue overrides + any other manual-override fields (e.g. Discount
  // Received, or whatever a company's own template defines) — one fieldset
  // per section, generated from the template rather than a fixed list, so
  // this form always matches whatever P&L lines this company actually has.
  const manualFieldGroups: { title: string; fields: FieldDef[] }[] = [
    { section: "revenue" as const, title: "Revenue overrides" },
    { section: "indirect_income" as const, title: "Indirect income overrides" },
    { section: "indirect_expense" as const, title: "Manual expenses" },
  ]
    .map(({ section, title }) => ({
      title,
      fields: template
        .filter((l) => l.section === section && l.kind === "manual" && l.manualKey)
        .map((l) => ({ key: l.manualKey!, label: l.label })),
    }))
    .filter((g) => g.fields.length > 0);

  const groups = [...manualFieldGroups, ...UNIVERSAL_GROUPS];

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      {branchId && <input type="hidden" name="branchId" value={branchId} />}
      <p className="text-sm text-muted-foreground">
        Per-period figures not in the Trial Balance, for <strong>{periodLabel}</strong>. Leave a field
        blank to fall back to its grouping sum (or zero).
      </p>

      {groups.map((group) => (
        <fieldset key={group.title} className="rounded-xl border border-border bg-card p-5">
          <legend className="px-1 text-sm font-semibold">{group.title}</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label htmlFor={f.key} className="text-sm font-medium">
                  {f.label}
                  {f.hint && <span className="ms-1 text-xs font-normal text-muted-foreground">({f.hint})</span>}
                </label>
                <input
                  id={f.key}
                  name={f.key}
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  defaultValue={val(f.key)}
                  placeholder="0"
                  className="nums w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      {segments.length > 0 && (
        <fieldset className="rounded-xl border border-border bg-card p-5">
          <legend className="px-1 text-sm font-semibold">Segment stock</legend>
          <p className="mb-3 text-xs text-muted-foreground">
            Opening / closing stock split per segment, for the Segment P&amp;L page.
          </p>
          <div tabIndex={0} role="region" aria-label="Segment stock" className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-overline uppercase text-muted-foreground">
                  <th className="py-1 font-semibold">Segment</th>
                  <th className="py-1 font-semibold">Opening</th>
                  <th className="py-1 font-semibold">Closing</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((s) => (
                  <tr key={s.key}>
                    <td className="py-1.5 pe-3">{s.label}</td>
                    <td className="py-1.5 pe-3">
                      <input
                        name={`segOpen_${s.key}`}
                        type="number"
                        step="0.01"
                        defaultValue={segVal("segmentOpeningStock", s.key)}
                        placeholder="0"
                        className="nums w-40 rounded-md border border-border bg-card px-2 py-1"
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        name={`segClose_${s.key}`}
                        type="number"
                        step="0.01"
                        defaultValue={segVal("segmentClosingStock", s.key)}
                        placeholder="0"
                        className="nums w-40 rounded-md border border-border bg-card px-2 py-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save adjustments"}
        </button>
        <ActionStatus state={state} className="text-sm" />
      </div>
    </form>
  );
}
