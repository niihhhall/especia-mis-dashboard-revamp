"use client";

import { useEffect } from "react";

/** How often to ping: comfortably inside typical Supabase access-token
 *  expiry (commonly 1 hour), without being a wasteful amount of traffic for
 *  an internal tool this size. */
const INTERVAL_MS = 8 * 60 * 1000;

/**
 * Mounted once in the authenticated shell. Renders nothing. Its only job is
 * pinging `/api/auth/refresh` on an interval so a long-open tab with no
 * Server Action calls (just browsing reports) still gets its session cookie
 * refreshed. See the route handler for why this can't happen passively.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    const ping = () => {
      fetch("/api/auth/refresh", { cache: "no-store" }).catch(() => {
        // A missed ping is not fatal. The next one, or the user's own next
        // Server Action, gets another chance. Nothing here to surface to them.
      });
    };
    const id = setInterval(ping, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
