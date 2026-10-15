"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ReportKind, ScopeDepth } from "@/lib/data/mis";

import { saveReportScopeDepth, type BranchActionState } from "./actions";
import { CELL, FIELD, ROW, StatusLine } from "./branch-ui";

export const REPORTS: { key: ReportKind; label: string; hint: string }[] = [
  { key: "pnl", label: "P&L", hint: "Can split down to single branches" },
  { key: "book_to_bank", label: "Book to bank", hint: "Usually read for the whole company" },
  { key: "ccc", label: "Cash conversion", hint: "Usually split no further than channel groups" },
  { key: "segment", label: "Segment P&L", hint: "Independent of branch: a company's own revenue-line split" },
];

const DEPTH_OPTIONS: { value: ScopeDepth; label: string }[] = [
  { value: "consolidated", label: "Consolidated only" },
  { value: "group", label: "Consolidated + groups" },
  { value: "branch", label: "Consolidated + groups + branches" },
];

export function ReportScopeRow({
  report,
  label,
  hint,
  depth,
  disabled,
  slug,
}: {
  report: ReportKind;
  label: string;
  hint: string;
  depth: ScopeDepth;
  disabled: boolean;
  slug: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(depth);
  const [status, setStatus] = useState<BranchActionState | null>(null);
  const [pending, start] = useTransition();

  function change(next: ScopeDepth) {
    setValue(next);
    start(async () => {
      const r = await saveReportScopeDepth(report, next, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <tr className={ROW}>
      <td className={`${CELL} font-medium text-text-primary`}>{label}</td>
      <td className={`${CELL} text-label text-text-secondary`}>{hint}</td>
      <td className={CELL}>
        <select
          value={value}
          disabled={disabled || pending}
          onChange={(e) => change(e.target.value as ScopeDepth)}
          aria-label={`Scope depth for ${label}`}
          className={`${FIELD} w-64`}
        >
          {DEPTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className={CELL}>
        <StatusLine status={status} />
      </td>
    </tr>
  );
}
