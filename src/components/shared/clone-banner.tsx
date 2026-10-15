"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActionStatus, type ActionResult } from "@/components/shared/action-status";
import { Notice } from "@/components/shared/notice";
import { Button } from "@/components/ui/button";
import type { CompanySummary } from "@/lib/data/company-context";
import { fieldClass } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * The two existing CloneBanner copies (Branches and MIS Template) differ in
 * their words and their action, so they stay two named variants of one
 * component. The words below are the existing ones, unchanged.
 */
const VARIANTS = {
  branches: {
    message: "No branches yet: start from an existing company\u2019s roster, or add branches below.",
    selectLabel: "Company to clone branches from",
    button: "Clone branches",
  },
  template: {
    message: "No template yet: start from an existing company, or add lines below.",
    selectLabel: "Company to clone the template from",
    button: "Clone template",
  },
} as const;

/**
 * Shown when a company has no branches or no template yet: pick another
 * company and copy its setup. The page passes its own clone server action.
 */
export function CloneBanner({
  variant,
  slug,
  cloneSources,
  onClone,
}: {
  variant: keyof typeof VARIANTS;
  slug: string;
  cloneSources: CompanySummary[];
  /** The page's clone action: `(sourceSlug, targetSlug)`. */
  onClone: (source: string, slug: string) => Promise<ActionResult>;
}) {
  const copy = VARIANTS[variant];
  const router = useRouter();
  const [source, setSource] = useState(cloneSources[0]?.slug ?? "");
  const [status, setStatus] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  function clone() {
    if (!source) return;
    start(async () => {
      const r = await onClone(source, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <Notice>
      <p className="font-medium">{copy.message}</p>
      {cloneSources.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            aria-label={copy.selectLabel}
            className={cn(fieldClass, "w-56")}
          >
            {cloneSources.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" className="text-body" onClick={clone} disabled={pending}>
            {pending ? "Cloning…" : copy.button}
          </Button>
          <ActionStatus state={status} className="text-label" />
        </div>
      )}
    </Notice>
  );
}
