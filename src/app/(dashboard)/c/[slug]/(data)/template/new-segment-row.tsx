"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { saveSegment, type TemplateActionState } from "./actions";
import { BTN, CELL, FIELD, NEW_ROW, StatusLine } from "./template-ui";

export function NewSegmentRow({ slug }: { slug: string }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [revenueGrouping, setRevenueGrouping] = useState("");
  const [revenueManualKey, setRevenueManualKey] = useState("");
  const [purchaseGroupings, setPurchaseGroupings] = useState("");
  const [status, setStatus] = useState<TemplateActionState | null>(null);
  const [pending, start] = useTransition();
  const where = "new segment";

  function add() {
    const fd = new FormData();
    fd.set("sortOrder", "999");
    fd.set("key", key.trim());
    fd.set("label", label.trim());
    fd.set("revenueGrouping", revenueGrouping.trim());
    fd.set("revenueManualKey", revenueManualKey.trim());
    fd.set("purchaseGroupings", purchaseGroupings);
    start(async () => {
      const r = await saveSegment(fd, slug);
      setStatus(r);
      if (r.ok) {
        setKey("");
        setLabel("");
        setRevenueGrouping("");
        setRevenueManualKey("");
        setPurchaseGroupings("");
        router.refresh();
      }
    });
  }

  return (
    <tr className={NEW_ROW}>
      <td className={`${CELL} text-label text-text-secondary`}>+</td>
      <td className={CELL}>
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="key" aria-label={`Key for ${where}`} className={`${FIELD} w-28`} />
      </td>
      <td className={CELL}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" aria-label={`Label for ${where}`} className={`${FIELD} w-36`} />
      </td>
      <td className={`${CELL} space-y-1`}>
        <input value={revenueGrouping} onChange={(e) => setRevenueGrouping(e.target.value)} placeholder="Revenue grouping" aria-label={`Revenue grouping for ${where}`} className={`${FIELD} w-40`} />
        <input value={revenueManualKey} onChange={(e) => setRevenueManualKey(e.target.value)} placeholder="or manual key" aria-label={`Revenue manual key for ${where}`} className={`${FIELD} w-40`} />
      </td>
      <td className={CELL}>
        <input
          value={purchaseGroupings}
          onChange={(e) => setPurchaseGroupings(e.target.value)}
          placeholder="Purchase groupings, comma-separated"
          aria-label={`Purchase groupings for ${where}`}
          className={`${FIELD} w-56`}
        />
      </td>
      <td className={CELL}>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={add} disabled={!key.trim() || !label.trim() || pending} className={BTN}>
            {pending ? "Adding…" : "Add segment"}
          </Button>
          <StatusLine status={status} />
        </div>
      </td>
    </tr>
  );
}
