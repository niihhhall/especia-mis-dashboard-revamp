"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useShellCompany } from "@/components/layout/shell-company-provider";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { AppRole } from "@/lib/auth/session";
import { breadcrumbFor } from "@/lib/breadcrumb";
import { companySlugFromPath } from "@/lib/company-scope";
import { navFor } from "@/lib/nav";

/**
 * The company (or the product name), then the current nav label, with the
 * existing header subtitle as a second line. Not a heading: each page owns
 * its one h1.
 */
export function ShellBreadcrumb({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const slug = companySlugFromPath(pathname);
  const { company, hasSegments } = useShellCompany();
  const [first, current] = breadcrumbFor(pathname, navFor(role, slug, hasSegments ?? true), company);

  return (
    <div className="min-w-0">
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap gap-2 text-body sm:gap-2">
          <BreadcrumbItem className="min-w-0 gap-2">
            <BreadcrumbLink asChild className="truncate text-text-secondary hover:text-text-primary">
              <Link href={first.href ?? "/"}>{first.label}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {current && (
            <>
              <BreadcrumbSeparator className="text-text-muted [&>svg]:size-4">
                <ChevronRight aria-hidden="true" />
              </BreadcrumbSeparator>
              <BreadcrumbItem className="min-w-0 gap-2">
                <BreadcrumbPage className="truncate text-text-primary">{current.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <p className="truncate text-label text-text-secondary">
        {slug ? "Management information system" : "Client portal"}
      </p>
    </div>
  );
}
