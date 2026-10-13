"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true after the client mounts.
 * Gates markup that depends on client-only state (the chosen theme), so the
 * server HTML and the first client render always match.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
