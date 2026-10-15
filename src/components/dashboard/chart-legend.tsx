import type { LegendItem } from "@/types/chart";

/** A flat legend: round dot, name and an optional detail, in series order. */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label text-text-secondary">
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />
          <span>{item.name}</span>
          {item.detail && <span className="tabular-nums">{item.detail}</span>}
        </li>
      ))}
    </ul>
  );
}
