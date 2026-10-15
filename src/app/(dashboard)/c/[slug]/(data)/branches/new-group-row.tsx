"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { saveBranchGroup, type BranchActionState } from "./actions";
import { BTN, CELL, FIELD, StatusLine } from "./branch-ui";

export function NewGroupRow({ slug }: { slug: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<BranchActionState | null>(null);
  const [pending, start] = useTransition();

  function add() {
    const fd = new FormData();
    fd.set("label", label.trim());
    fd.set("sortOrder", "999");
    start(async () => {
      const r = await saveBranchGroup(fd, slug);
      setStatus(r);
      if (r.ok) {
        setLabel("");
        router.refresh();
      }
    });
  }

  return (
    <tr className="bg-surface-raised">
      <td className={`${CELL} text-label text-text-secondary`}>+</td>
      <td></td>
      <td className={CELL}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label, e.g. Retail (B2C)"
          aria-label="Label for new channel group"
          className={`${FIELD} w-48`}
        />
      </td>
      <td className={CELL}>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={add} disabled={!label.trim() || pending} className={BTN}>
            {pending ? "Adding…" : "Add group"}
          </Button>
          <StatusLine status={status} />
        </div>
      </td>
    </tr>
  );
}
