"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Button } from "@/components/ui/button";
import type { CompanyCard as CompanyCardData } from "@/lib/data/portfolio";

import { deleteCompanyPermanently } from "./actions";
import { BTN, FIELD } from "./form-field";

/**
 * Type-the-name-to-confirm delete: a deliberately heavier gate than the
 * armed/confirm pattern used for a branch or a channel group, since deleting
 * a whole company takes every Trial Balance, mapping and template with it,
 * permanently, in one action.
 */
export function DeleteCompanyControl({ card, onClose }: { card: CompanyCardData; onClose: () => void }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setPending(true);
    setError("");
    const result = await deleteCompanyPermanently(card.id, typed);
    setPending(false);
    if (result.ok) {
      router.refresh();
      onClose();
      return;
    }
    setError(result.message);
  }

  if (!armed) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setArmed(true)} className={`${BTN} text-text-secondary`}>
        Delete company permanently
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-border-strong bg-surface-raised p-3">
      <p className="text-body font-medium text-text-primary">
        This permanently deletes {card.name}: every Trial Balance, mapping, and template with it. This cannot be
        undone.
      </p>
      <label className="mt-2 block">
        <span className="mb-1 block text-label text-text-secondary">
          Type <span className="font-medium text-text-primary">{card.name}</span> to confirm
        </span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} className={FIELD} />
      </label>
      <ActionStatus state={error ? { ok: false, message: error } : null} className="text-label font-medium not-empty:mt-2" />
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setArmed(false);
            setTyped("");
            setError("");
          }}
          className={BTN}
        >
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleDelete} disabled={pending || typed.trim() !== card.name} className={BTN}>
          {pending ? "Deleting…" : "Delete permanently"}
        </Button>
      </div>
    </div>
  );
}
