import type { ReactNode } from "react";

/**
 * A headline metric tile, matching the 1.0 portal: a compact card carrying a
 * 3px status-coloured top border, so a row of KPIs reads at a glance before
 * any number is parsed. A missing value reads "No data" rather than a blank
 * tile or a misleading 0.
 */
export function KpiTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | null | undefined;
  sub?: ReactNode;
  tone?: "default" | "pos" | "neg";
}) {
  const missing = value == null || value === "";
  const valueColor =
    tone === "pos" ? "text-success-text" : tone === "neg" ? "text-danger" : "text-foreground";
  // Neutral tiles (and missing values) get the blue secondary rule; good/bad get green/red.
  const topColor =
    !missing && tone === "pos"
      ? "border-t-success"
      : !missing && tone === "neg"
        ? "border-t-danger"
        : "border-t-secondary";

  return (
    <div
      className={`rounded-xl border border-t-[3px] border-border ${topColor} bg-card p-3.5 shadow-card`}
    >
      <p className="text-overline font-bold uppercase text-muted-foreground">
        {label}
      </p>
      {missing ? (
        <p className="mt-2 text-metric font-semibold text-muted-foreground">No data</p>
      ) : (
        <p className={`nums mt-2 text-metric font-bold ${valueColor}`}>{value}</p>
      )}
      {sub && (
        <div className="mt-2 border-t border-border pt-2 text-caption text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  );
}
