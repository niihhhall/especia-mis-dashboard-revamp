import { SegmentedLinks } from "@/components/shared/segmented-links";
import { quartersParam, type Quarter } from "@/lib/mis/quarters";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The quarter's month range for an April-start year and so on, shown as the button's tooltip. */
function monthRange(quarter: Quarter, fyStartMonthNo: number): string {
  const first = (fyStartMonthNo - 1 + (quarter - 1) * 3) % 12;
  return `${MONTHS[first]}-${MONTHS[(first + 2) % 12]}`;
}

/**
 * Q1 to Q4 toggles for the month-by-month statements. All four start off (plain monthly columns);
 * switching one on folds that quarter's months into a single column, and several can be on at once.
 * Plain links: the choice lives in `?q=` so a view can be bookmarked or shared, and the buttons are
 * always unselected on a fresh visit. A quarter with no months uploaded is shown dimmed and inert.
 */
export function QuarterFilter({
  selected,
  available,
  fyStartMonthNo,
  buildHref,
}: {
  selected: Quarter[];
  available: Set<Quarter>;
  fyStartMonthNo: number;
  /** The page's own URL for a given set of picked quarters (keeps its other params). */
  buildHref: (quarters: Quarter[]) => string;
}) {
  return (
    <SegmentedLinks
      label="Fold months into quarters"
      activeSuffix=", selected"
      options={([1, 2, 3, 4] as Quarter[]).map((q) => {
        const active = selected.includes(q);
        const next = active ? selected.filter((x) => x !== q) : [...selected, q];
        return {
          href: buildHref(next),
          label: `Q${q}`,
          active,
          disabled: !available.has(q),
          title: `${monthRange(q, fyStartMonthNo)}${available.has(q) ? "" : ", no months uploaded yet"}`,
          data: available.has(q) ? { "data-quarters": quartersParam(next) } : undefined,
        };
      })}
    />
  );
}
