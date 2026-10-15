"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Renders an uploaded GP Dashboard HTML file live, in an iframe, with a
 * Fullscreen toggle so a CA can work the dashboard's own internal
 * tab-switching (it's a self-contained working file with its own UI, not
 * something this app builds) without our chrome around it.
 *
 * `srcDoc` (not a blob/data URL) gives the iframe's content an opaque
 * origin distinct from this app's: combined with `sandbox` carrying
 * `allow-scripts`/`allow-forms`/`allow-popups` but deliberately NOT
 * `allow-same-origin`, the uploaded file's own JS (its tab-switching, any
 * charting it does) runs normally, but cannot read this app's cookies, hit
 * its APIs with the viewer's session, or reach the parent window. A CA's
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
      className={cn("flex flex-col overflow-hidden rounded-lg border border-border bg-surface", isFullscreen && "h-dvh")}
    >
      <div className="flex h-12 shrink-0 items-center justify-end border-b border-border bg-surface px-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="h-8 rounded-md text-body"
        >
          <Icon icon={isFullscreen ? Minimize2 : Maximize2} size={14} />
          {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        </Button>
      </div>
      <iframe
        srcDoc={html}
        title={title}
        sandbox="allow-scripts allow-forms allow-popups"
        className={cn("w-full bg-surface", isFullscreen ? "min-h-0 flex-1" : "h-[80dvh]")}
      />
    </div>
  );
}