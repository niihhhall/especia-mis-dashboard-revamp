"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ReorderButtons } from "@/components/shared/reorder-buttons";
import { StatusText } from "@/components/shared/status-text";
import type { Branch, BranchGroup } from "@/lib/data/mis";

import { archiveBranch, deleteBranch, moveBranch, saveBranch, unarchiveBranch, type BranchActionState } from "./actions";
import { BranchRowActions } from "./branch-row-actions";
import { ArmedConfirm, CELL, FIELD, ROW } from "./branch-ui";

export function BranchEditor({
  branch,
  groups,
  slug,
  isFirst,
  isLast,
}: {
  branch: Branch;
  groups: BranchGroup[];
  slug: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(branch.label);
  const [groupId, setGroupId] = useState(branch.groupId ?? "");
  const [status, setStatus] = useState<BranchActionState | null>(null);
  // Which destructive step is waiting for its confirm click.
  const [arming, setArming] = useState<"archive" | "delete" | null>(null);
  const [pending, start] = useTransition();

  const dirty = label !== branch.label || groupId !== (branch.groupId ?? "");
  const archived = Boolean(branch.archivedAt);

  const run = (task: () => Promise<BranchActionState>, onFail?: () => void) =>
    start(async () => {
      const r = await task();
      if (!r.ok) {
        setStatus(r);
        onFail?.();
        return;
      }
      router.refresh();
    });

  function save() {
    const fd = new FormData();
    fd.set("id", branch.id);
    fd.set("key", branch.key);
    fd.set("label", label.trim());
    fd.set("groupId", groupId);
    fd.set("sortOrder", String(branch.sortOrder));
    start(async () => {
      const r = await saveBranch(fd, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }
  // Archiving asks first (in-page armed confirm, never window.confirm);
  // restoring an archived branch is harmless, so it acts at once.
  function toggleArchive() {
    setArming(null);
    start(async () => {
      const r = archived ? await unarchiveBranch(branch.id, slug) : await archiveBranch(branch.id, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }
  const remove = () => run(() => deleteBranch(branch.id, slug), () => setArming(null));
  const move = (direction: "up" | "down") => run(() => moveBranch(branch.id, direction, slug));

  return (
    <tr className={`${ROW} ${archived ? "opacity-50" : ""}`}>
      <td className={`${CELL} whitespace-nowrap`}>
        <ReorderButtons
          itemLabel={branch.label}
          onUp={() => move("up")}
          onDown={() => move("down")}
          upDisabled={isFirst || pending}
          downDisabled={isLast || pending}
        />
      </td>
      <td className={`${CELL} text-text-secondary`}>{branch.key}</td>
      <td className={CELL}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={archived}
          aria-label={`Label for ${branch.label}`}
          className={`${FIELD} w-56`}
        />
        {archived && <StatusText className="ms-2">archived</StatusText>}
      </td>
      <td className={CELL}>
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={archived} aria-label={`Group for ${branch.label}`} className={`${FIELD} w-44`}>
          <option value="">No group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </td>
      <td className={CELL}>
        {arming ? (
          <ArmedConfirm
            question={
              arming === "delete"
                ? `Delete ${branch.label} permanently? Months uploaded with it fall back to Consolidated.`
                : `Archive ${branch.label}? It leaves future uploads and the scope selector; past months stay in Consolidated totals.`
            }
            confirm={arming === "delete" ? (pending ? "Deleting…" : "Delete branch") : pending ? "Archiving…" : "Archive branch"}
            pending={pending}
            onConfirm={arming === "delete" ? remove : toggleArchive}
            onCancel={() => setArming(null)}
          />
        ) : (
          <BranchRowActions
            label={branch.label}
            archived={archived}
            dirty={dirty}
            pending={pending}
            status={status}
            onSave={save}
            onArchive={() => {
              if (archived) toggleArchive();
              else {
                setStatus(null);
                setArming("archive");
              }
            }}
            onDelete={() => {
              setStatus(null);
              setArming("delete");
            }}
          />
        )}
      </td>
    </tr>
  );
}
