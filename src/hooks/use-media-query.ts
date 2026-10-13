"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches, live. The server snapshot is `true`
 * (the wide layout), so server markup never depends on the viewport.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", callback);
      return () => list.removeEventListener("change", callback);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true,
  );
}
