"use client";

import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { downloadCsv, exportChartPng } from "@/lib/chart-export";
import type { LegendItem } from "@/types/chart";

const buttonCls = "bg-surface text-body text-text-secondary hover:bg-surface-hover hover:text-text-primary";

/** PNG and CSV downloads for one chart card (the CSV is the exact data behind the chart). */
export function ChartDownloads({
  title,
  csv,
  legend,
  target,
}: {
  title: string;
  csv?: (string | number)[][];
  legend: LegendItem[];
  target: RefObject<HTMLElement | null>;
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={buttonCls}
        onClick={() => target.current && void exportChartPng(target.current, title, legend)}
      >
        PNG
      </Button>
      {csv && (
        <Button type="button" variant="outline" size="sm" className={buttonCls} onClick={() => downloadCsv(csv, title)}>
          CSV
        </Button>
      )}
    </>
  );
}
