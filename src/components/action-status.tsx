"use client";
import { Info } from "lucide-react";
import { DEMO_WRITE_MESSAGE } from "@/lib/demo/messages";
export interface ActionResult {
  ok: boolean;
  message: string;
}
/**
 * The one renderer for a Server Action's `{ ok, message }` reply.
 *
 * The `<p role="status">` is always mounted (empty until there is something to
 * say), so screen readers announce every later update politely. A demo-mode
 * refusal is not an error, so it gets the neutral info style instead of red.
 * `id` lets a field point `aria-describedby` at the message it caused.
 */
export function ActionStatus({
  state,
  className = "text-sm font-medium",
  id,
}: {
  state: ActionResult | null | undefined;
  className?: string;
  id?: string;
}) {
  const message = state?.message ?? "";
  const demo = !state?.ok && message === DEMO_WRITE_MESSAGE;
  const tone = !message ? "" : state?.ok ? "text-success-text" : demo ? "text-info-text" : "text-danger";
  return (
    <p id={id} role="status" aria-live="polite" className={`${className} ${tone}${demo ? " inline-flex items-center gap-1.5" : ""}`}>
      {demo && <Info className="size-3.5 shrink-0" aria-hidden />}
      {message}
    </p>
  );
}
