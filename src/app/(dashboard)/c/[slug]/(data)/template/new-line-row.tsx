"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { TemplateSection } from "@/lib/mis/catalog";

import { saveTemplateLine, type TemplateActionState } from "./actions";
import { draftOf, fillLine, LineCells, type LineDraft } from "./line-cells";
import { sectionLabel } from "./section-label";
import { BTN, CELL, NEW_ROW, StatusLine } from "./template-ui";

export function NewLineRow({ section, slug }: { section: TemplateSection; slug: string }) {
  const router = useRouter();
  const [d, setD] = useState<LineDraft>(draftOf());
  const [status, setStatus] = useState<TemplateActionState | null>(null);
  const [pending, start] = useTransition();
  const where = `new ${sectionLabel(section)} line`;

  function add() {
    const fd = new FormData();
    fd.set("section", section);
    fd.set("sortOrder", "999");
    fillLine(fd, d);
    start(async () => {
      const r = await saveTemplateLine(fd, slug);
      setStatus(r);
      if (r.ok) {
        setD(draftOf());
        router.refresh();
      }
    });
  }

  return (
    <tr className={NEW_ROW}>
      <td className={`${CELL} text-label text-text-secondary`}>+</td>
      <LineCells d={d} set={(p) => setD((x) => ({ ...x, ...p }))} name={where} placeholders />
      <td className={CELL}>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={add}
            disabled={!d.key.trim() || !d.label.trim() || pending}
            aria-label={`Add line to ${sectionLabel(section)}`}
            className={BTN}
          >
            {pending ? "Adding…" : "Add line"}
          </Button>
          <StatusLine status={status} />
        </div>
      </td>
    </tr>
  );
}
