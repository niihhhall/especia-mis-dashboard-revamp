"use client";

import { useRef, type ReactNode } from "react";

import { ChartEmpty, ChartSkeleton } from "@/components/charts/chart-skeleton";
import { toCsv } from "@/lib/mis/charts";

export interface LegendItem {
  name: string;
  color: string;
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const safeName = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

/** A theme token as a canvas colour. Tokens are hex or rgb, so the value is used raw. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Resolves once the SVG has stopped changing — Recharts animates bars and
 * lines by rewriting their attributes every frame, so a capture taken mid-way
 * would freeze half-grown bars. Gives up waiting after `maxMs`.
 */
function whenSettled(el: Element, quietMs = 200, maxMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    let quiet: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      clearTimeout(quiet);
      quiet = setTimeout(done, quietMs);
    });
    const cap = setTimeout(done, maxMs);
    function done() {
      observer.disconnect();
      clearTimeout(quiet);
      clearTimeout(cap);
      resolve();
    }
    observer.observe(el, { attributes: true, childList: true, subtree: true, characterData: true });
    quiet = setTimeout(done, quietMs);
  });
}

/** Renders the card's first Recharts SVG to a PNG (2x), with the title and legend drawn on top. */
async function exportPng(container: HTMLElement, title: string, legend: LegendItem[]) {
  const first = container.querySelector<SVGSVGElement>("svg.recharts-surface");
  if (!first) return;
  await whenSettled(container);
  const svg = container.querySelector<SVGSVGElement>("svg.recharts-surface");
  if (!svg) return;
  const colors = { surface: token("--card"), title: token("--foreground"), text: token("--muted-foreground") };
  const { width, height } = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.style.fontFamily = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const xml = new XMLSerializer().serializeToString(clone);

  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const head = 56;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width) * scale;
    canvas.height = Math.ceil(height + head + 8) * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = colors.surface;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colors.title;
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillText(title, 12, 24);
    ctx.font = "12px system-ui, sans-serif";
    let x = 12;
    for (const item of legend) {
      ctx.fillStyle = item.color;
      ctx.fillRect(x, 38, 10, 10);
      ctx.fillStyle = colors.text;
      ctx.fillText(item.name, x + 15, 47);
      x += 15 + ctx.measureText(item.name).width + 16;
    }
    ctx.drawImage(img, 0, head, width, height);
    download(canvas.toDataURL("image/png"), `${safeName(title)}.png`);
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

/**
 * One chart card: title, its own controls, the chart, and PNG / CSV download
 * (the CSV is the exact data behind the chart, so a CA can re-use it in Excel).
 */
export function ChartFrame({
  title,
  subtitle,
  controls,
  legend = [],
  showLegend = false,
  csv,
  loading = false,
  empty,
  height = 270,
  children,
}: {
  title: string;
  subtitle?: string;
  controls?: ReactNode;
  legend?: LegendItem[];
  /** Draw the legend on screen too (cards without series chips). It is always drawn into the PNG. */
  showLegend?: boolean;
  csv?: (string | number)[][];
  /** Show a skeleton of `height` in place of the chart. */
  loading?: boolean;
  /** A message shown instead of the chart when there is nothing to plot. */
  empty?: ReactNode;
  height?: number;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  const hasChart = !loading && !empty;

  return (
    <div className="card-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          {hasChart && (
            <button
              type="button"
              onClick={() => body.current && void exportPng(body.current, title, legend)}
              className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              PNG
            </button>
          )}
          {csv && hasChart && (
            <button
              type="button"
              onClick={() =>
                download(
                  `data:text/csv;charset=utf-8,${encodeURIComponent(toCsv(csv))}`,
                  `${safeName(title)}.csv`,
                )
              }
              className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              CSV
            </button>
          )}
        </div>
      </div>
      <div ref={body} className="p-5 pt-2">
        {hasChart && showLegend && legend.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {legend.map((l) => (
              <li key={l.name} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: l.color }} />
                {l.name}
              </li>
            ))}
          </ul>
        )}
        {loading ? <ChartSkeleton height={height} /> : empty ? <ChartEmpty>{empty}</ChartEmpty> : children}
      </div>
    </div>
  );
}

/** Segmented control — the same pill look as the P&L's Monthly / Branch-wise toggle. */
export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-0.5 rounded-[9px] border border-border bg-card p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
            o.value === value
              ? "brand-grad text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A toggleable series chip that doubles as the legend entry. */
export function Chip({
  active,
  color,
  children,
  onClick,
}: {
  active: boolean;
  color: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? "border-transparent bg-muted text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className="size-2.5 rounded-sm" style={{ background: active ? color : "transparent", border: `1.5px solid ${color}` }} />
      {children}
    </button>
  );
}
