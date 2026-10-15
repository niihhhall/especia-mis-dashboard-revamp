// Demo-mode copy, safe to import from client components (no `server-only`).
// `mode.ts` re-exports DEMO_WRITE_MESSAGE so Server Actions and the UI share
// one string, and <ActionStatus> can tell a demo refusal from a real error.

/** What every blocked Server Action replies in demo mode. */
export const DEMO_WRITE_MESSAGE = "Not saved: this is a demo.";

/** The single demo notice, shown as a banner above every page. */
export const DEMO_BANNER_MESSAGE = "Demo mode: illustrative Tirupati Automart data. Changes are not saved.";
