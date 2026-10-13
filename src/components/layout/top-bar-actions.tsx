"use client";

import { ExportActions } from "@/components/layout/export-actions";
import { MeetingModeButton } from "@/components/layout/meeting-mode-button";
import { MoreActionsMenu } from "@/components/layout/more-actions-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UnitSwitch } from "@/components/layout/unit-switch";

/**
 * Right side of the top bar: unit switch, the report actions and the theme
 * toggle. From `xl` the report actions sit inline; below it they collapse
 * into the "More" menu. Export needs an open company (`slug`); meeting mode
 * is a staff presentation aid only.
 */
export function TopBarActions({
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
  const hasActions = slug !== null || showMeeting;

  return (
    <div className="flex shrink-0 items-center gap-6 print:hidden">
      <UnitSwitch />
      {hasActions && (
        <>
          <div className="hidden items-center gap-6 xl:flex">
            {slug && <ExportActions slug={slug} />}
            {showMeeting && <MeetingModeButton meeting={meeting} onToggle={onToggleMeeting} />}
          </div>
          <div className="xl:hidden">
            <MoreActionsMenu
              slug={slug}
              showMeeting={showMeeting}
              meeting={meeting}
              onToggleMeeting={onToggleMeeting}
            />
          </div>
        </>
      )}
      <ThemeToggle />
    </div>
  );
}
