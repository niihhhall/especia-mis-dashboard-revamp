"use client";

import Link from "next/link";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { NavItem } from "@/types/nav";

/**
 * One nav link: 36px, 16px icon and label. Active adds the raised background
 * and a 2px accent bar at the inline start. Collapsed, the tooltip names it.
 */
export function SidebarNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <SidebarMenuItem data-nav-item={item.navId}>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className="relative h-9 text-body font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary data-[active=true]:bg-surface-raised data-[active=true]:text-text-primary data-[active=true]:before:absolute data-[active=true]:before:inset-y-2 data-[active=true]:before:start-0 data-[active=true]:before:w-0.5 data-[active=true]:before:bg-brand"
      >
        <Link href={item.href} aria-current={active ? "page" : undefined}>
          <Icon className="size-4" aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
