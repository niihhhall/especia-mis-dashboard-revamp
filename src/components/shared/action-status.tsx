"use client";

import { CircleAlert, Info } from "lucide-react";

import { Icon } from "@/components/shared/icon";
import { DEMO_WRITE_MESSAGE } from "@/lib/demo/messages";
import { cn } from "@/lib/utils";

export interface ActionResult {
  ok: boolean;
  message: string;
}

/**
 * The one renderer for a Server Action's `{ ok, message }` reply.
 *
 * The `<p role="status">` is always mounted (empty until there is something to
 * say), so screen readers announce every later update politely. The words
 * carry the meaning, not a color: a success reads in text-secondary, a
 * demo-mode refusal gets an Info icon, a failure a CircleAlert icon and
 * text-primary. `id` lets a field point `aria-describedby` at the message it
 * caused.
 */
export function ActionStatus({
  state,
  className = "text-body font-medium",
  id,
}: {
  state: ActionResult | null | undefined;
  className?: string;
  id?: string;
}) {
  const message = state?.message ?? "";
  const demo = !state?.ok && message === DEMO_WRITE_MESSAGE;
  const failed = Boolean(message) && !state?.ok && !demo;
  const icon = demo ? Info : failed ? CircleAlert : null;
  return (
    <p
      id={id}
      role="status"
      aria-live="polite"
      className={cn(
        className,
        failed ? "text-text-primary" : "text-text-secondary",
        icon && "inline-flex items-center gap-2",
      )}
    >
      {icon && <Icon icon={icon} size={14} />}
      {message}
    </p>
  );
}
