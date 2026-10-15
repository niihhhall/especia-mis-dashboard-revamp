"use client";

import type { TemplateSection } from "@/lib/mis/catalog";

import { LineEditor, type LineRow } from "./line-editor";
import { NewLineRow } from "./new-line-row";
import { sectionLabel } from "./section-label";
import { SectionCard, sr } from "./template-ui";

/** One template section as a Card: its lines in order, then the new line row. */
export function SectionTable({ section, hint, lines, slug }: { section: TemplateSection; hint: string; lines: LineRow[]; slug: string }) {
  const name = sectionLabel(section);
  return (
    <SectionCard
      title={name}
      hint={hint}
      label={`${name} template lines`}
      heads={[sr("Order"), "Key", "Label", "Kind", "Source", "Negate", sr("Actions")]}
    >
      {lines.map((l, i) => (
        <LineEditor key={l.id} line={l} slug={slug} isFirst={i === 0} isLast={i === lines.length - 1} />
      ))}
      <NewLineRow section={section} slug={slug} />
    </SectionCard>
  );
}
