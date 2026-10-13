"use client";

import { Maximize2, Minimize2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Meeting mode toggle. One fixed label, with the on/off state in `aria-pressed`. */
export function MeetingModeButton({ meeting, onToggle }: { meeting: boolean; onToggle: () => void }) {
  const Glyph = meeting ? Minimize2 : Maximize2;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={meeting}
      onClick={onToggle}
      className="border-border aria-pressed:bg-surface-raised aria-pressed:text-text-primary"
    >
      <Glyph className="size-4" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Meeting mode</span>
    </Button>
  );
}
