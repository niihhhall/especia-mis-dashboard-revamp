"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ReorderButtons } from "@/components/shared/reorder-buttons";
import type { TemplateLine } from "@/lib/mis/catalog";

import { deleteTemplateLine, moveTemplateLine, saveTemplateLine, type TemplateActionState } from "./actions";
import { draftOf, fillLine, LineCells, type LineDraft } from "./line-cells";
import { ArmedConfirm, CELL, ROW, RowActions } from "./template-ui";

export type LineRow = TemplateLine & { id: string };

/**
 * Every editor row calls `router.refresh()` after a successful mutation: the
 * Server Actions already call `revalidatePath`, but that only marks the route
 * stale; `refresh()` is what re-fetches this page's data so the row list
 * (adds, deletes, reorders) reflects it. A row's own in-progress edit (its
 * local state) doesn't re-sync from the refreshed props while that row stays
 * mounted: a known, minor rough edge for a staff-only tool.
 */
export function LineEditor({ line, slug, isFirst, isLast }: { line: LineRow; slug: string; isFirst: boolean; isLast: boolean }) {
  const router = useRouter();
  const initial = draftOf(line);
  const [d, setD] = useState<LineDraft>(initial);
  const [status, setStatus] = useState<TemplateActionState | null>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  const dirty = (Object.keys(initial) as (keyof LineDraft)[]).some((k) => d[k] !== initial[k]);
  const name = line.label;

  function save() {
    const fd = new FormData();
    fd.set("id", line.id);
    fd.set("section", line.section);
    fd.set("sortOrder", String(line.sortOrder));
    fillLine(fd, d);
    start(async () => {
      const r = await saveTemplateLine(fd, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }
  function del() {
    start(async () => {
      const r = await deleteTemplateLine(line.id, slug);
      setStatus(r);
      setArmed(false);
      if (r.ok) router.refresh();
    });
  }
  function move(direction: "up" | "down") {
    start(async () => {
      // A refusal (e.g. demo mode) must say so, or the arrow looks broken.
      const r = await moveTemplateLine(line.id, direction, slug);
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
      <LineCells d={d} set={(p) => setD((x) => ({ ...x, ...p }))} name={name} />
      <td className={CELL}>
        {armed ? (
          <ArmedConfirm
            question={<>Delete &ldquo;{name}&rdquo;? It&rsquo;s removed from every report.</>}
            confirm={pending ? "Deleting…" : "Delete line"}
            pending={pending}
            onConfirm={del}
            onCancel={() => setArmed(false)}
          />
        ) : (
          <RowActions
            name={name}
            canSave={dirty}
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
