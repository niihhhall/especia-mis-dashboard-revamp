"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { DemoBanner } from "@/components/layout/demo-banner";
import { ShellCompanyProvider } from "@/components/layout/shell-company-provider";
import { SkipLink } from "@/components/layout/skip-link";
import { TopBar } from "@/components/layout/top-bar";
import { UnitProvider } from "@/components/layout/unit-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMeetingMode } from "@/hooks/use-meeting-mode";
import { DEMO_BANNER_MESSAGE } from "@/lib/demo/messages";
import type { MoneyUnit } from "@/lib/unit-cookie";
import type { ShellCompanyLink, ShellProfile } from "@/types/shell";

const SIDEBAR_STYLE = { "--sidebar-width": "15.5rem", "--sidebar-width-icon": "3rem" } as CSSProperties;

/** The shadcn default cookie for the sidebar's open state, read by `(dashboard)/layout.tsx`. */
const SIDEBAR_COOKIE = "sidebar_state";

/**
 * The one frame for every dashboard page: sidebar, top bar and the scrolling
 * content column. It lives in `(dashboard)/layout.tsx`, which does not
 * re-render on navigation, so everything that depends on the path (the open
 * company, the active item, the breadcrumb) is read on the client.
 */
export function AppShell({
  profile,
  unit,
  usdRate,
  demoMode,
  defaultSidebarOpen,
  directory,
  children,
}: {
  profile: ShellProfile;
  unit: MoneyUnit;
  usdRate: number;
  demoMode: boolean;
  defaultSidebarOpen: boolean;
  directory: ShellCompanyLink[];
  children: ReactNode;
}) {
  // Client-facing accounts never see this: it's a CA/admin presentation aid.
  const [meeting, setMeeting] = useMeetingMode(profile.role !== "company");

  // Meeting mode scales the root font size (html.meeting in globals.css).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("meeting", meeting);
    return () => root.classList.remove("meeting");
  }, [meeting]);

  // From 1024px the saved choice applies. Between 768 and 1023px the sidebar
  // starts as icons and collapses again on every navigation; below 768px the
  // primitive shows it as a sheet.
  const wide = useMediaQuery("(min-width: 1024px)");
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(defaultSidebarOpen);
  const [narrow, setNarrow] = useState({ open: false, path: pathname });
  if (narrow.path !== pathname) setNarrow({ open: false, path: pathname });

  const onOpenChange = (next: boolean) => {
    if (wide) {
      setUserOpen(next);
      return;
    }
    setNarrow({ open: next, path: pathname });
    // The primitive saves every change to its cookie right after this call.
    // A narrow-screen toggle must not overwrite the wide-screen choice, so
    // put the saved value back once it has.
    queueMicrotask(() => {
      document.cookie = `${SIDEBAR_COOKIE}=${userOpen}; path=/; max-age=604800`;
    });
  };

  return (
    <ShellCompanyProvider directory={directory}>
      <UnitProvider unit={unit} usdRate={usdRate}>
        <SidebarProvider
          open={wide ? userOpen : narrow.open}
          onOpenChange={onOpenChange}
          style={SIDEBAR_STYLE}
          className="bg-background"
        >
          <SkipLink />
          {!meeting && <AppSidebar role={profile.role} profile={profile} demoMode={demoMode} />}
          <div className="relative flex min-w-0 flex-1 flex-col bg-background">
            <TopBar role={profile.role} meeting={meeting} onToggleMeeting={() => setMeeting(!meeting)} />
            <main
              id="main"
              tabIndex={-1}
              className={
                meeting
                  ? "mx-auto w-full max-w-meeting px-4 pt-6 pb-8 md:px-12"
                  : "mx-auto w-full max-w-page px-4 pt-6 pb-8 md:px-8"
              }
            >
              {demoMode && <DemoBanner message={DEMO_BANNER_MESSAGE} />}
              {children}
            </main>
          </div>
        </SidebarProvider>
      </UnitProvider>
    </ShellCompanyProvider>
  );
}
