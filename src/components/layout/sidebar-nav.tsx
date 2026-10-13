"use client";

import { usePathname } from "next/navigation";

import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import type { NavItem } from "@/types/nav";

/**
 * The nav from `navFor()`, unchanged: flat lists stay one unlabelled group,
 * the open client's "Data" and "Reports" sections each get their label.
 */
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const sections = [...new Set(items.map((i) => i.section))].filter(Boolean) as NonNullable<
    NavItem["section"]
  >[];
  const groups =
    sections.length === 0
      ? [{ label: null, items }]
      : sections.map((s) => ({ label: s, items: items.filter((i) => i.section === s) }));

  // The old sidebar's <nav> had no name; "Main" tells it apart from the
  // "Reports" tab bar on report pages.
  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {groups.map((group) => (
        <SidebarGroup key={group.label ?? "nav"} className="py-0">
          {group.label && (
            <SidebarGroupLabel className="h-6 text-label uppercase tracking-[0.06em] text-text-secondary">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarNavItem key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </nav>
  );
}
