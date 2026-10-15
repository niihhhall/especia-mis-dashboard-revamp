"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ReorderButtons } from "@/components/shared/reorder-buttons";
import type { SegmentDef } from "@/lib/mis/catalog";

import { deleteSegment, moveSegment, saveSegment, type TemplateActionState } from "./actions";
import { ArmedConfirm, CELL, FIELD, ROW, RowActions } from "./template-ui";

export type SegmentRow = SegmentDef & { id: string };

export function SegmentEditor({ segment, slug, isFirst, isLast }: { segment: SegmentRow; slug: string; isFirst: boolean; isLast: boolean }) {
  const router = useRouter();
  const [key, setKey] = useState(segment.key);
  const [label, setLabel] = useState(segment.label);
  const [revenueGrouping, setRevenueGrouping] = useState(segment.revenueGrouping ?? "");
  const [revenueManualKey, setRevenueManualKey] = useState(segment.revenueManualKey ?? "");
  const [revenueFallbackGrouping, setRevenueFallbackGrouping] = useState(segment.revenueFallbackGrouping ?? "");
  const [purchaseGroupings, setPurchaseGroupings] = useState(segment.purchaseGroupings.join(", "));
  const [status, setStatus] = useState<TemplateActionState | null>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const name = `segment ${segment.label}`;

  function save() {
    const fd = new FormData();
    fd.set("id", segment.id);
    fd.set("sortOrder", String(segment.sortOrder));
    fd.set("key", key.trim());
    fd.set("label", label.trim());
    fd.set("revenueGrouping", revenueGrouping.trim());
    fd.set("revenueManualKey", revenueManualKey.trim());
    fd.set("revenueFallbackGrouping", revenueFallbackGrouping.trim());
    fd.set("purchaseGroupings", purchaseGroupings);
    start(async () => {
      const r = await saveSegment(fd, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }
  function del() {
    start(async () => {
      const r = await deleteSegment(segment.id, slug);
      setStatus(r);
      setArmed(false);
      if (r.ok) router.refresh();
    });
  }
  function move(direction: "up" | "down") {
    start(async () => {
      const r = await moveSegment(segment.id, direction, slug);
      if (!r.ok) {
        setStatus(r);
        return;
      }
      router.refresh();
    });
  }

  return (
    <tr className={ROW}>
      <td className={`${CELL} whitespace-nowrap`}>
        <ReorderButtons itemLabel={name} onUp={() => move("up")} onDown={() => move("down")} upDisabled={isFirst || pending} downDisabled={isLast || pending} />
      </td>
      <td className={CELL}>
        <input value={key} onChange={(e) => setKey(e.target.value)} aria-label={`Key for ${name}`} className={`${FIELD} w-28`} />
      </td>
      <td className={CELL}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} aria-label={`Label for ${name}`} className={`${FIELD} w-36`} />
      </td>
      <td className={`${CELL} space-y-1`}>
        <input value={revenueGrouping} onChange={(e) => setRevenueGrouping(e.target.value)} placeholder="Revenue grouping" aria-label={`Revenue grouping for ${name}`} className={`${FIELD} w-40`} />
        <input value={revenueManualKey} onChange={(e) => setRevenueManualKey(e.target.value)} placeholder="or manual key" aria-label={`Revenue manual key for ${name}`} className={`${FIELD} w-40`} />
        <input
          value={revenueFallbackGrouping}
          onChange={(e) => setRevenueFallbackGrouping(e.target.value)}
          placeholder="fallback grouping"
          aria-label={`Revenue fallback grouping for ${name}`}
          className={`${FIELD} w-40`}
        />
      </td>
      <td className={CELL}>
        <input
          value={purchaseGroupings}
          onChange={(e) => setPurchaseGroupings(e.target.value)}
          placeholder="Purchase groupings, comma-separated"
          aria-label={`Purchase groupings for ${name}`}
          className={`${FIELD} w-56`}
        />
      </td>
      <td className={CELL}>
        {armed ? (
          <ArmedConfirm
            question={<>Delete segment &ldquo;{segment.label}&rdquo;? Its column leaves Segment P&amp;L.</>}
            confirm={pending ? "Deleting…" : "Delete segment"}
            pending={pending}
            onConfirm={del}
            onCancel={() => setArmed(false)}
          />
        ) : (
          <RowActions
            name={name}
            canSave
            pending={pending}
            status={status}
            onSave={save}
            onDelete={() => {
              setStatus(null);
              setArmed(true);
            }}
          />
        )}
      </td>
    </tr>
  );
}
