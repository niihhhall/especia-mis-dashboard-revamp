"use client";

import { useEffect, useState } from "react";

/**
 * Chart colours read from the CSS custom properties in globals.css.
 *
 * Recharts takes SVG props (`fill`, `stroke`), not class names, so it cannot
 * consume Tailwind tokens. Reading the variables off the document keeps the
 * charts on the same palette as everything else instead of drifting into
 * hardcoded hex.
 *
 * The tokens are hex and rgb values, so they are read raw. The theme class
 * lives on <html>, so a MutationObserver re-reads them whenever that class
 * changes and the charts redraw in the new palette without a reload.
 * Callers should guard the first paint with `if (!colors.length)`.
 */
export interface ChartColors {
  /** The six-series categorical palette (--chart-1 to --chart-6). */
  colors: string[];
  /** Chrome colours for grid lines, axis text and the hover cursor. */
  axis: { grid: string; text: string; cursor: string };
  /** Sign-based overrides, outside the categorical palette. */
  sign: { pos: string; neg: string; muted: string };
}

function readColors(): ChartColors {
  const root = getComputedStyle(document.documentElement);
  const read = (name: string) => root.getPropertyValue(name).trim();
  return {
    colors: [
      read("--chart-1"),
      read("--chart-2"),
      read("--chart-3"),
      read("--chart-4"),
      read("--chart-5"),
      read("--chart-6"),
    ],
    axis: {
      grid: read("--grid"),
      text: read("--muted-foreground"),
      cursor: read("--surface-hover"),
    },
    sign: {
      pos: read("--positive"),
      neg: read("--negative"),
      muted: read("--muted-foreground"),
    },
  };
}

export function useChartColors(): ChartColors {
  const [state, setState] = useState<ChartColors>({
    colors: [],
    axis: { grid: "", text: "", cursor: "" },
    sign: { pos: "", neg: "", muted: "" },
  });

  useEffect(() => {
    // Intentional: the values only exist once the stylesheet is applied to the
    // DOM, so they cannot be read at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readColors());

    const observer = new MutationObserver(() => setState(readColors()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return state;
}
