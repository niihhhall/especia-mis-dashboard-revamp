"use client";

import { CloneBanner } from "@/components/shared/clone-banner";
import type { CompanySummary } from "@/lib/data/company-context";

import { cloneTemplateFrom } from "./actions";
import type { LineRow } from "./line-editor";
import { NewSegmentRow } from "./new-segment-row";
import { SECTIONS } from "./section-label";
import { SectionTable } from "./section-table";
import { SegmentEditor, type SegmentRow } from "./segment-editor";
import { SectionCard, sr } from "./template-ui";

/** The MIS template: one Card per section with its lines, then the segments. */
export function TemplateManager({
  slug,
  template,
  segments,
  cloneSources,
}: {
  slug: string;
  template: LineRow[];
  segments: SegmentRow[];
  cloneSources: CompanySummary[];
}) {
  return (
    <div className="space-y-6">
      {template.length === 0 && <CloneBanner variant="template" slug={slug} cloneSources={cloneSources} onClone={cloneTemplateFrom} />}

      {SECTIONS.map((s) => (
        <SectionTable key={s.key} section={s.key} hint={s.hint} lines={template.filter((l) => l.section === s.key)} slug={slug} />
      ))}

      <SectionCard
        title="Segments"
        hint={<>Optional: 0 segments hides Segment P&amp;L for this company.</>}
        label="Segments"
        heads={[sr("Order"), "Key", "Label", "Revenue source", "Purchase groupings", sr("Actions")]}
      >
        {segments.map((s, i) => (
          <SegmentEditor key={s.id} segment={s} slug={slug} isFirst={i === 0} isLast={i === segments.length - 1} />
        ))}
        <NewSegmentRow slug={slug} />
      </SectionCard>
    </div>
  );
}
