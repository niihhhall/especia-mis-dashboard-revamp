"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { companySlugFromPath } from "@/lib/company-scope";
import type { ShellCompanyLink } from "@/types/shell";

/** What the open company publishes to the shell. */
interface Published {
  company: ShellCompanyLink;
  hasSegments: boolean;
}

interface Store {
  get: () => Published | null;
  set: (value: Published | null) => void;
  subscribe: (listener: () => void) => () => void;
}

function createStore(): Store {
  let value: Published | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const ShellCompanyContext = createContext<{ store: Store; directory: ShellCompanyLink[] } | null>(null);

function useShellContext() {
  const ctx = useContext(ShellCompanyContext);
  if (!ctx) throw new Error("ShellCompanyProvider is missing.");
  return ctx;
}

/**
 * Lets the shell in `(dashboard)/layout.tsx` know which company is open.
 * Layouts do not re-render on navigation, so `c/[slug]/layout.tsx` publishes
 * the company through `CompanyScope`, and the shell reads it here.
 */
export function ShellCompanyProvider({
  directory,
  children,
}: {
  directory: ShellCompanyLink[];
  children: ReactNode;
}) {
  const [store] = useState(createStore);
  return (
    <ShellCompanyContext.Provider value={{ store, directory }}>{children}</ShellCompanyContext.Provider>
  );
}

/**
 * The company the path points at. Before `CompanyScope` publishes (the server
 * render and the first paint of a hard load) the name comes from the
 * directory; an archived company missing from it resolves to null, and the
 * callers show its slug.
 */
export function useShellCompany(): { company: ShellCompanyLink | null; hasSegments: boolean | null } {
  const { store, directory } = useShellContext();
  const published = useSyncExternalStore(store.subscribe, store.get, () => null);
  const slug = companySlugFromPath(usePathname());
  if (!slug) return { company: null, hasSegments: null };
  if (published && published.company.slug === slug) return published;
  return { company: directory.find((c) => c.slug === slug) ?? null, hasSegments: null };
}

/** Publishes the open company before paint, and clears it on unmount if it is still the one shown. */
export function usePublishShellCompany(company: ShellCompanyLink, hasSegments: boolean): void {
  const { store } = useShellContext();
  const { slug, name } = company;
  useLayoutEffect(() => {
    store.set({ company: { slug, name }, hasSegments });
    return () => {
      if (store.get()?.company.slug === slug) store.set(null);
    };
  }, [store, slug, name, hasSegments]);
}
