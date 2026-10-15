"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Icon } from "@/components/shared/icon";
import { ReorderButtons } from "@/components/shared/reorder-buttons";
import { Button } from "@/components/ui/button";
import type { BranchGroup } from "@/lib/data/mis";

import { deleteBranchGroup, moveBranchGroup, saveBranchGroup, type BranchActionState } from "./actions";
import { ArmedConfirm, BTN, CELL, FIELD, ROW, StatusLine } from "./branch-ui";

export function GroupEditor({ group, slug, isFirst, isLast }: { group: BranchGroup; slug: string; isFirst: boolean; isLast: boolean }) {
  const router = useRouter();
  const [label, setLabel] = useState(group.label);
  const [status, setStatus] = useState<BranchActionState | null>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  const dirty = label !== group.label;

  function save() {
    const fd = new FormData();
    fd.set("id", group.id);
    fd.set("key", group.key);
    fd.set("label", label.trim());
    fd.set("sortOrder", String(group.sortOrder));
    start(async () => {
      const r = await saveBranchGroup(fd, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }
  function move(direction: "up" | "down") {
    start(async () => {
      // A refusal (e.g. demo mode) must say so, or the arrow looks broken.
      const r = await moveBranchGroup(group.id, direction, slug);
      if (!r.ok) {
        setStatus(r);
        return;
      }
      router.refresh();
    });
  }
  function remove() {
    start(async () => {
      const r = await deleteBranchGroup(group.id, slug);
      if (!r.ok) {
        setStatus(r);
        setArmed(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <tr className={ROW}>
      <td className={`${CELL} whitespace-nowrap`}>
        <ReorderButtons
          itemLabel={group.label}
          onUp={() => move("up")}
          onDown={() => move("down")}
          upDisabled={isFirst || pending}
          downDisabled={isLast || pending}
        />
      </td>
      <td className={`${CELL} text-text-secondary`}>{group.key}</td>
      <td className={CELL}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} aria-label={`Label for ${group.label}`} className={`${FIELD} w-48`} />
      </td>
      <td className={CELL}>
        {armed ? (
          <ArmedConfirm
            question={`Delete ${group.label} permanently? Its branches are left without a group.`}
            confirm={pending ? "Deleting…" : "Delete group"}
            pending={pending}
            onConfirm={remove}
            onCancel={() => setArmed(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={!dirty || pending} aria-label={`Save ${group.label}`} className={BTN}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setStatus(null);
                setArmed(true);
              }}
              title={`Delete ${group.label}`}
              className="size-8 rounded-md text-text-secondary hover:text-text-primary"
            >
              <Icon icon={Trash2} />
              <span className="sr-only">Delete {group.label}</span>
            </Button>
            <StatusLine status={status} />
          </div>
        )}
      </td>
    </tr>
  );
}
