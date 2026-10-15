"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Button } from "@/components/ui/button";
import type { CompanyCard as CompanyCardData } from "@/lib/data/portfolio";

import { archiveCompany, unarchiveCompany } from "./actions";
import { BTN } from "./form-field";

/**
 * One armed/confirm control: a quiet trigger, then the question with a
 * confirm and a Cancel button. Never `window.confirm`, which silently does
 * nothing when a browser or extension suppresses it.
 */
function ArmedControl({
  trigger,
  question,
  confirm,
  pendingLabel,
  run,
  align = "start",
}: {
  trigger: string;
  question: string;
  confirm: string;
  pendingLabel: string;
  /** Resolves to an error message, or "" on success. */
  run: () => Promise<string>;
  align?: "start" | "end";
}) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setPending(true);
    setError("");
    const message = await run();
    setPending(false);
    setArmed(false);
    setError(message);
  }

  return (
    <div>
      <div className={`flex flex-wrap items-center gap-2 ${align === "end" ? "justify-end" : ""}`}>
        {armed ? (
          <>
            <span className="text-body text-text-primary">{question}</span>
            <Button type="button" size="sm" onClick={go} disabled={pending} className={`${BTN} shrink-0`}>
              {pending ? pendingLabel : confirm}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setArmed(false)} className={BTN}>
              Cancel
            </Button>
          </>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => setArmed(true)} className={`${BTN} text-text-secondary`}>
            {trigger}
          </Button>
        )}
      </div>
      <ActionStatus state={error ? { ok: false, message: error } : null} className="text-label font-medium not-empty:mt-2" />
    </div>
  );
}

/** Archive, inside the Edit dialog: an occasional, deliberate action, not something for the grid. */
export function ArchiveControl({ card, onClose }: { card: CompanyCardData; onClose: () => void }) {
  const router = useRouter();
  return (
    <ArmedControl
      trigger="Archive company"
      question={`Archive ${card.name}? It leaves every company list until an admin restores it.`}
      confirm="Archive company"
      pendingLabel="Archiving…"
      run={async () => {
        const result = await archiveCompany(card.id);
        if (!result.ok) return result.message;
        router.refresh();
        onClose();
        return "";
      }}
    />
  );
}

/** Restore, on an archived card's footer. */
export function RestoreControl({ card }: { card: CompanyCardData }) {
  const router = useRouter();
  return (
    <ArmedControl
      trigger="Restore company"
      question={`Restore ${card.name} to the active grid?`}
      confirm="Restore company"
      pendingLabel="Restoring…"
      align="end"
      run={async () => {
        const result = await unarchiveCompany(card.id);
        // A plain function, not a <form action>: revalidatePath alone leaves
        // the mounted page stale, so router.refresh() moves the card between
        // the archived section and the active grid.
        if (!result.ok) return result.message;
        router.refresh();
        return "";
      }}
    />
  );
}
