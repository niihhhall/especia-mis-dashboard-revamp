"use client";

import { PanelLeft } from "lucide-react";

import { ShellBreadcrumb } from "@/components/layout/shell-breadcrumb";
import { useShellCompany } from "@/components/layout/shell-company-provider";
import { TopBarActions } from "@/components/layout/top-bar-actions";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import type { AppRole } from "@/lib/auth/session";

/**
 * The 56px bar above every page: sidebar toggle and breadcrumb on the left;
 * unit switch, the report actions and the theme toggle on the right.
 */
export function TopBar({
  role,
  meeting,
  onToggleMeeting,
}: {
  role: AppRole;
  meeting: boolean;
  onToggleMeeting: () => void;
}) {
  const { toggleSidebar } = useSidebar();
  const { company } = useShellCompany();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-6 border-b border-border bg-background px-4 md:px-8 print:static">
      <div className="flex min-w-0 items-center gap-3">
        {!meeting && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle navigation"
            onClick={toggleSidebar}
            className="text-text-secondary hover:text-text-primary print:hidden"
          >
            <PanelLeft className="size-4" aria-hidden="true" />
          </Button>
        )}
        <ShellBreadcrumb role={role} />
      </div>
      <TopBarActions
        slug={company?.slug ?? null}
        showMeeting={role !== "company"}
        meeting={meeting}
        onToggleMeeting={onToggleMeeting}
      />
    </header>
  );
}
