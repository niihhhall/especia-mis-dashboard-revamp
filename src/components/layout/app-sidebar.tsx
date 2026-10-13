"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { OpenCompanyBlock } from "@/components/layout/open-company-block";
import { useShellCompany } from "@/components/layout/shell-company-provider";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AppRole } from "@/lib/auth/session";
import { companySlugFromPath } from "@/lib/company-scope";
import { navFor } from "@/lib/nav";
import type { ShellProfile } from "@/types/shell";

/**
 * The shadcn Sidebar holding the existing nav. The open client comes from the
 * URL, so the sidebar and the page can never disagree about which company is
 * shown. 248px wide, icons only when collapsed, a sheet below 768px.
 */
export function AppSidebar({
  role,
  profile,
  demoMode,
}: {
  role: AppRole;
  profile: ShellProfile;
  demoMode: boolean;
}) {
  const pathname = usePathname();
  const slug = companySlugFromPath(pathname);
  const { company, hasSegments } = useShellCompany();
  const items = navFor(role, slug, hasSegments ?? true);
  const { setOpenMobile } = useSidebar();

  // The sheet below 768px closes once a navigation lands, as the old drawer did.
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-sidebar-border print:hidden">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-2">
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent className="gap-6 py-4">
        {slug && role !== "company" && (
          <SidebarGroup className="py-0">
            <OpenCompanyBlock name={company?.name ?? slug} />
          </SidebarGroup>
        )}
        <SidebarNav items={items} />
      </SidebarContent>
      <SidebarFooter className="gap-3 border-t border-sidebar-border p-4 group-data-[collapsible=icon]:hidden">
        <UserMenu profile={profile} demoMode={demoMode} />
        <p className="text-label text-text-secondary">Especia Associates LLP</p>
      </SidebarFooter>
    </Sidebar>
  );
}
