"use client";

import { Download, Ellipsis, Maximize2, Minimize2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { excelHref } from "@/lib/export-link";

/**
 * Below `xl` the report actions collapse into one "More" menu so the top bar
 * never pushes its controls off the edge.
 */
export function MoreActionsMenu({
  slug,
  showMeeting,
  meeting,
  onToggleMeeting,
}: {
  slug: string | null;
  showMeeting: boolean;
  meeting: boolean;
  onToggleMeeting: () => void;
}) {
  const MeetingGlyph = meeting ? Minimize2 : Maximize2;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="border-border">
          <Ellipsis className="size-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">More</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-label="More actions" className="w-56 border-border">
        {slug && (
          <>
            <DropdownMenuItem asChild>
              <a href={excelHref(slug)}>
                <Download className="size-4" aria-hidden="true" />
                Download Excel
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              // Print after the menu has closed so it is not in the printout.
              onSelect={() => window.setTimeout(() => window.print(), 0)}
            >
              <Printer className="size-4" aria-hidden="true" />
              Print / PDF
            </DropdownMenuItem>
          </>
        )}
        {showMeeting && (
          <DropdownMenuItem onSelect={onToggleMeeting}>
            <MeetingGlyph className="size-4" aria-hidden="true" />
            Meeting mode
            {meeting && <span className="ms-auto text-label text-text-secondary">On</span>}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
