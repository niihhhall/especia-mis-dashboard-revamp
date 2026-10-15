"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Button } from "@/components/ui/button";
import type { SegmentDef, TemplateLine } from "@/lib/mis/catalog";
import type { ManualInputs } from "@/lib/mis/types";

import { saveInputs, type InputsState } from "./actions";
import { InputsSection, SegmentStockSection, type FieldDef } from "./inputs-section";

const initialState: InputsState = { ok: false, message: "" };

/** Universal fields every company has, regardless of its own template. */
const UNIVERSAL_GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Stock",
    fields: [{ key: "closingStock", label: "Closing stock", hint: "from stock info / count" }],
  },
  {
    title: "Below EBITDA",
    fields: [
      { key: "depreciation", label: "Depreciation" },
      { key: "interestExpense", label: "Interest expense", hint: "carved out of finance cost" },
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
  /** Which branch these adjustments belong to; null for a legacy single-branch period. */
  branchId: string | null;
  slug: string;
  /** This company's own template: drives which manual-override fields render. */
  template: TemplateLine[];
  /** This company's own segments: drives the segment-stock table (0 rows if none configured). */
  segments: SegmentDef[];
}) {
  // Curries the company's slug into the action; see the comment on
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

  // Revenue overrides and any other manual-override fields (e.g. Discount
  // Received, or whatever a company's own template defines): one fieldset
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
      <p className="text-body text-text-secondary">
        Per-period figures not in the Trial Balance, for <strong className="font-medium text-text-primary">{periodLabel}</strong>. Leave a
        field blank to fall back to its grouping sum (or zero).
      </p>

      {groups.map((group) => (
        <InputsSection key={group.title} title={group.title} fields={group.fields} value={val} />
      ))}

      {segments.length > 0 && <SegmentStockSection segments={segments} value={segVal} />}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending} className="h-8 rounded-md text-body">
          {pending ? "Saving…" : "Save adjustments"}
        </Button>
        <ActionStatus state={state} className="text-body" />
      </div>
    </form>
  );
}
