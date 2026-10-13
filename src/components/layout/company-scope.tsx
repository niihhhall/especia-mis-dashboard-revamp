"use client";

import { createContext, useContext, type ReactNode } from "react";

import { usePublishShellCompany } from "@/components/layout/shell-company-provider";
import type { CompanyScopeValue } from "@/types/shell";

const CompanyScopeContext = createContext<CompanyScopeValue | null>(null);

/** The open company for the pages below `c/[slug]/layout.tsx`: name, periods and segment flag. */
export function useCompanyScope(): CompanyScopeValue {
  const value = useContext(CompanyScopeContext);
  if (!value) throw new Error("useCompanyScope must be used inside CompanyScope.");
  return value;
}

/**
 * Rendered by `c/[slug]/layout.tsx`. It hands the company to the pages below
 * through context and publishes it to the shell (breadcrumb, sidebar).
 *
 * The hidden marker lets globals.css hide "Segment P&L" on the first paint of
 * a hard load, before the shell knows the company has no segments.
 */
export function CompanyScope({ value, children }: { value: CompanyScopeValue; children: ReactNode }) {
  usePublishShellCompany({ slug: value.slug, name: value.name }, value.hasSegments);
  return (
    <CompanyScopeContext.Provider value={value}>
      {!value.hasSegments && <span hidden data-segments="none" />}
      {children}
    </CompanyScopeContext.Provider>
  );
}
