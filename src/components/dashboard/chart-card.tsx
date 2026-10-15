"use client";

import { ChartColumn } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { ChartDownloads } from "@/components/dashboard/chart-downloads";
import { ChartLegend } from "@/components/dashboard/chart-legend";
import { ChartSkeleton } from "@/components/dashboard/chart-skeleton";
import { Card } from "@/components/shared/card";
import { CardErrorBoundary } from "@/components/shared/card-error-boundary";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";
import type { LegendItem } from "@/types/chart";

/**
 * One chart card: title, subtitle, the card's own controls, PNG and CSV
 * downloads, an optional legend, then the chart, its skeleton or its empty
 * sentence. The chart is a figure named by the title.
 */
export function ChartCard({
  title,
  subtitle,
  controls,
  legend = [],
  showLegend = false,
  csv,
  state = "ready",
  empty,
  height = 270,
  downloads = true,
  className,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  controls?: ReactNode;
  legend?: LegendItem[];
  /** Draw the legend on screen too. It is always drawn into the PNG. */
  showLegend?: boolean;
  csv?: (string | number)[][];
  state?: "ready" | "loading" | "empty";
  /** The sentence shown instead of the chart when `state` is "empty". */
  empty?: ReactNode;
  height?: number;
  /** Offer PNG and CSV downloads (cards that had none keep none). */
  downloads?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const body = useRef<HTMLElement>(null);
  const ready = state === "ready";

  return (
    <Card className={cn("h-full", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-card-title text-balance text-text-primary">{title}</h2>
          {subtitle && <p className="mt-1 text-body text-pretty text-text-secondary">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          {ready && downloads && <ChartDownloads title={title} csv={csv} legend={legend} target={body} />}
        </div>
      </div>
      <figure ref={body} aria-label={title} className="mt-4 min-w-0">
        {ready && showLegend && legend.length > 0 && (
          <div className="mb-3">
            <ChartLegend items={legend} />
          </div>
        )}
        {state === "loading" ? (
          <ChartSkeleton height={height} />
        ) : state === "empty" ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-text-secondary">
            <Icon icon={ChartColumn} size={20} />
            <p className="text-body text-pretty">{empty}</p>
          </div>
        ) : (
          <CardErrorBoundary title={title} message="This chart could not be drawn.">
            {children}
          </CardErrorBoundary>
        )}
      </figure>
    </Card>
  );
}
