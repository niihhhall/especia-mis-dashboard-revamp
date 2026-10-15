"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { BranchGroup } from "@/lib/data/mis";

import { saveBranch, type BranchActionState } from "./actions";
import { BTN, CELL, FIELD, StatusLine } from "./branch-ui";

export function NewBranchRow({ groups, slug }: { groups: BranchGroup[]; slug: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [groupId, setGroupId] = useState("");
  const [status, setStatus] = useState<BranchActionState | null>(null);
  const [pending, start] = useTransition();

  function add() {
    const fd = new FormData();
    fd.set("label", label.trim());
    fd.set("groupId", groupId);
    fd.set("sortOrder", "999");
    start(async () => {
      const r = await saveBranch(fd, slug);
      setStatus(r);
      if (r.ok) {
        setLabel("");
        setGroupId("");
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
          placeholder="Label, exactly as Tally shows it"
          aria-label="Label for new branch"
          className={`${FIELD} w-56`}
        />
      </td>
      <td className={CELL}>
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Group for new branch" className={`${FIELD} w-44`}>
          <option value="">No group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </td>
      <td className={CELL}>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={add} disabled={!label.trim() || pending} className={BTN}>
            {pending ? "Adding…" : "Add branch"}
          </Button>
          <StatusLine status={status} />
        </div>
      </td>
    </tr>
  );
}
