import { toCsv } from "@/lib/mis/charts";
import type { LegendItem } from "@/types/chart";

/** Browser-only helpers behind a chart card's PNG and CSV downloads. */

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const safeName = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

/** A theme token as a canvas colour. Tokens are hex or rgb, so the value is used raw. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Any CSS colour (including `var(--x)`) resolved to the value the browser paints. */
function resolveColor(color: string, host: HTMLElement): string {
  const probe = document.createElement("span");
  probe.style.color = color;
  host.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

/**
 * Resolves once the SVG has stopped changing: Recharts animates bars and
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

/**
 * A serialized SVG loses the document's CSS variables, so every element of the
 * clone gets the live element's computed fill, stroke and font as attributes.
 */
export function inlineComputedColors(live: SVGSVGElement, clone: SVGSVGElement) {
  const from = [live, ...Array.from(live.querySelectorAll("*"))];
  const to = [clone, ...Array.from(clone.querySelectorAll("*"))];
  from.forEach((el, i) => {
    const target = to[i];
    if (!target) return;
    const cs = getComputedStyle(el);
    const fill = cs.getPropertyValue("fill");
    const stroke = cs.getPropertyValue("stroke");
    if (fill) target.setAttribute("fill", fill);
    if (stroke) target.setAttribute("stroke", stroke);
    if (el.tagName === "text" || el.tagName === "tspan") target.setAttribute("font-family", `${cs.fontFamily}, system-ui, sans-serif`);
  });
}

/** Renders the container's first Recharts SVG to a PNG (2x), with the title and legend drawn on top. */
export async function exportChartPng(container: HTMLElement, title: string, legend: LegendItem[]) {
  if (!container.querySelector("svg.recharts-surface")) return;
  await whenSettled(container);
  const svg = container.querySelector<SVGSVGElement>("svg.recharts-surface");
  if (!svg) return;
  const font = getComputedStyle(document.body).fontFamily;
  const colors = { surface: token("--card"), title: token("--foreground"), text: token("--muted-foreground") };
  const swatches = legend.map((item) => resolveColor(item.color, container));
  const { width, height } = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineComputedColors(svg, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.style.fontFamily = `${font}, system-ui, sans-serif`;
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
    ctx.font = `600 15px ${font}`;
    ctx.fillText(title, 12, 24);
    ctx.font = `12px ${font}`;
    let x = 12;
    legend.forEach((item, i) => {
      ctx.fillStyle = swatches[i];
      ctx.beginPath();
      ctx.arc(x + 5, 43, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.fillText(item.name, x + 15, 47);
      x += 15 + ctx.measureText(item.name).width + 16;
    });
    ctx.drawImage(img, 0, head, width, height);
    download(canvas.toDataURL("image/png"), `${safeName(title)}.png`);
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

/** Downloads the exact rows behind a chart as `<title>.csv`. */
export function downloadCsv(rows: (string | number)[][], title: string) {
  download(`data:text/csv;charset=utf-8,${encodeURIComponent(toCsv(rows))}`, `${safeName(title)}.csv`);
}
