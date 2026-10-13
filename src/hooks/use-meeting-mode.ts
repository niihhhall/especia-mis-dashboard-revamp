"use client";

import { useSyncExternalStore } from "react";

const MEETING_MODE_KEY = "especia-meeting-mode";
// `storage` only fires in OTHER tabs, never the one that made the write. This
// event is how the meeting mode button tells this tab's own
// useSyncExternalStore to re-read.
const MEETING_MODE_EVENT = "especia-meeting-mode-change";

function readMeetingMode(): boolean {
  try {
    return localStorage.getItem(MEETING_MODE_KEY) === "1";
  } catch {
    // Private browsing or storage blocked: meeting mode just won't persist.
    return false;
  }
}

function subscribeMeetingMode(callback: () => void): () => void {
  // Fires on changes from OTHER tabs/windows; the meeting mode button updates
  // this tab's own render directly via a matching dispatch.
  window.addEventListener("storage", callback);
  window.addEventListener(MEETING_MODE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(MEETING_MODE_EVENT, callback);
  };
}

/**
 * A CA/admin's own presentation toggle, not client-facing. It hides the sidebar
 * and sign-out control, widens the report, and scales the ROOT font size up
 * via `html.meeting` (globals.css). Tailwind's text-* utilities and the report
 * tables are all rem-based, so that one property proportionally enlarges every
 * table/KPI/heading without touching each page individually. An inline size
 * on a wrapper would not, since rem ignores it. This is for reading off a
 * projector in a client meeting.
 *
 * Persisted to localStorage rather than component state: `/companies` and
 * `/c/[slug]/...` are separate layout subtrees, so navigating between a client
 * and the company list would otherwise remount the shell and drop the
 * toggle mid-meeting. `useSyncExternalStore` reads it. The server snapshot is
 * always `false`, so there's nothing to reconcile on hydration; the real value
 * appears on the client's first paint after that, same as any other
 * client-only preference (theme, collapsed panels, and so on).
 */
export function useMeetingMode(enabled: boolean): [boolean, (v: boolean) => void] {
  const on = useSyncExternalStore(subscribeMeetingMode, readMeetingMode, () => false);

  const set = (v: boolean) => {
    try {
      localStorage.setItem(MEETING_MODE_KEY, v ? "1" : "0");
    } catch {
      // Storage blocked: fall through to the in-tab event below so the
      // toggle still works for this page view, just without persistence.
    }
    window.dispatchEvent(new Event(MEETING_MODE_EVENT));
  };

  return [enabled && on, set];
}
