import { getFmtCompact } from "@/lib/data/unit";
import { fmtPct } from "@/lib/format";

/**
 * KPI tile carrying a month-on-month change, as on the 1.0 company dashboard.
 *
 * `goodWhenUp` exists because direction is not universally good: revenue rising
 * is positive, but the cash conversion cycle or creditor days rising is not. The
 * caller decides which way is favourable and the arrow colours accordingly.
 */
export async function KpiDelta({
  label,
  value,
  prior,
  format = "money",
  goodWhenUp = true,
  suffix,
}: {
  label: string;
  /** null (or a non-finite number) renders the tile's "No data" state. */
  value: number | null;
  prior?: number;
  format?: "money" | "days";
  goodWhenUp?: boolean;
  suffix?: string;
}) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <div className="rounded-xl border border-t-[3px] border-border border-t-secondary bg-card p-3.5 shadow-card">
        <p className="text-overline font-bold uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 text-metric font-semibold text-muted-foreground">No data</p>
      </div>
    );
  }

  const fmtCompact = await getFmtCompact();
  const shown =
    format === "days" ? `${Math.round(value)}d` : `${fmtCompact(value)}${suffix ?? ""}`;

  // Guard the divide: a zero base makes percentage change meaningless, so the
  // delta row is simply omitted rather than showing Infinity.
  const canCompare = prior !== undefined && prior !== 0;
  const change = canCompare ? (value - prior!) / Math.abs(prior!) : null;
  const up = (change ?? 0) > 0;
  const flat = change !== null && Math.abs(change) < 0.0005;
  // No prior month (or no movement) is neither good nor bad: neutral rule.
  // Colour follows goodness, never the sign of the value — a loan balance is
  // negative by nature and isn't bad news on its own.
  const good = change === null || flat ? null : up === goodWhenUp;

  const tone =
    good === null ? "text-muted-foreground" : good ? "text-success-text" : "text-danger";
  const topColor =
    good === null ? "border-t-secondary" : good ? "border-t-success" : "border-t-danger";

  return (
    <div
      className={`rounded-xl border border-t-[3px] border-border ${topColor} bg-card p-3.5 shadow-card`}
    >
      <p className="text-overline font-bold uppercase text-muted-foreground">
        {label}
      </p>
      <p
        className={`nums mt-2 text-metric font-bold ${
          good === false ? "text-danger" : "text-foreground"
        }`}
      >
        {shown}
      </p>
      {change !== null && (
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-border pt-2">
          <span className={`nums inline-flex items-center gap-0.5 text-xs font-semibold ${tone}`}>
            <span aria-hidden>{flat ? "→" : up ? "↗" : "↘"}</span>
            <span className="sr-only">{flat ? "unchanged" : up ? "up" : "down"}</span>{" "}
            {fmtPct(Math.abs(change))}
          </span>
          {/* Colour alone can't say good or bad (WCAG 1.4.1). */}
          {good !== null && (
            <span className={`text-caption font-medium ${tone}`}>{good ? "favourable" : "adverse"}</span>
          )}
          <span className="text-caption text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  );
}
