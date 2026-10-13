"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Renders an uploaded GP Dashboard HTML file live, in an iframe, with a
 * Fullscreen toggle so a CA can work the dashboard's own internal
 * tab-switching (it's a self-contained working file with its own UI, not
 * something this app builds) without our chrome around it.
 *
 * `srcDoc` (not a blob/data URL) gives the iframe's content an opaque
 * origin distinct from this app's — combined with `sandbox` carrying
 * `allow-scripts`/`allow-forms`/`allow-popups` but deliberately NOT
 * `allow-same-origin`, the uploaded file's own JS (its tab-switching, any
 * charting it does) runs normally, but cannot read this app's cookies, hit
 * its APIs with the viewer's session, or reach the parent window — a CA's
 * working file runs sandboxed the same way regardless of how much it's
 * trusted.
 */
export function GpDashboardViewer({ html, title }: { html: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl border border-border bg-card ${isFullscreen ? "h-dvh" : ""}`}
    >
      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        className="absolute end-3 top-3 z-10 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card/95 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur hover:bg-muted"
      >
        {isFullscreen ? <Minimize2 className="size-3.5" aria-hidden /> : <Maximize2 className="size-3.5" aria-hidden />}
        {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      </button>
      <iframe
        srcDoc={html}
        title={title}
        sandbox="allow-scripts allow-forms allow-popups"
        className={`w-full rounded-xl ${isFullscreen ? "h-full" : "h-[80dvh]"}`}
      />
    </div>
  );
}
