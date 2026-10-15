import type { SegmentDef } from "@/lib/mis/catalog";
import { fieldClass } from "@/lib/ui-classes";

export interface FieldDef {
  key: string;
  label: string;
  hint?: string;
}

const NUM = `${fieldClass} num`;
const BOX = "rounded-lg border border-border bg-surface p-5";
const LEGEND = "px-1 text-card-title text-text-primary";

/** One fieldset of adjustment figures, two per row. */
export function InputsSection({ title, fields, value }: { title: string; fields: FieldDef[]; value: (k: string) => string }) {
  return (
    <fieldset className={BOX}>
      <legend className={LEGEND}>{title}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <label htmlFor={f.key} className="text-label text-text-secondary">
              {f.label}
              {f.hint && <span className="ms-1 text-text-secondary">({f.hint})</span>}
            </label>
            <input
              id={f.key}
              name={f.key}
              type="number"
              step="0.01"
              inputMode="decimal"
              defaultValue={value(f.key)}
              placeholder="0"
              className={`${NUM} w-full`}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/** Opening and closing stock per segment, for the Segment P&L page. */
export function SegmentStockSection({
  segments,
  value,
}: {
  segments: SegmentDef[];
  value: (which: "segmentOpeningStock" | "segmentClosingStock", key: string) => string;
}) {
  const TH = "py-2 pe-3 text-start text-label font-medium text-text-secondary";
  return (
    <fieldset className={BOX}>
      <legend className={LEGEND}>Segment stock</legend>
      <p className="mb-3 text-body text-text-secondary">Opening / closing stock split per segment, for the Segment P&amp;L page.</p>
      <div tabIndex={0} role="region" aria-label="Segment stock" className="overflow-x-auto">
        <table className="w-full text-body text-text-primary">
          <thead>
            <tr className="border-b border-border">
              <th className={TH}>Segment</th>
              <th className={TH}>Opening</th>
              <th className={TH}>Closing</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => (
              <tr key={s.key} className="border-b border-border last:border-0">
                <td className="py-2 pe-3">{s.label}</td>
                <td className="py-2 pe-3">
                  <input aria-label={`${s.label} opening`} name={`segOpen_${s.key}`} type="number" step="0.01" defaultValue={value("segmentOpeningStock", s.key)} placeholder="0" className={`${NUM} w-40`} />
                </td>
                <td className="py-2">
                  <input aria-label={`${s.label} closing`} name={`segClose_${s.key}`} type="number" step="0.01" defaultValue={value("segmentClosingStock", s.key)} placeholder="0" className={`${NUM} w-40`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}
