"use client";

import { Upload as UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { CompanyAvatar } from "@/components/shared/company-avatar";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";

import { removeCompanyLogo, uploadCompanyLogo, type LogoActionState } from "./actions";
import { BTN } from "./form-field";

export function LogoEditor({ companyId, name, logoUrl }: { companyId: string; name: string; logoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(logoUrl);
  const [removeStatus, setRemoveStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [uploadState, uploadAction, uploading] = useActionState(
    async (_prev: LogoActionState, fd: FormData) => {
      setRemoveStatus(null);
      const result = await uploadCompanyLogo(_prev, fd);
      if (result.ok) setCurrent(result.logoUrl ?? null);
      return result;
    },
    { ok: false, message: "" } as LogoActionState,
  );
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    setRemoveStatus(null);
    const result = await removeCompanyLogo(companyId);
    setRemoving(false);
    // A refusal (e.g. demo mode) must say so, or the button looks broken.
    if (!result.ok) {
      setRemoveStatus(result);
      return;
    }
    setCurrent(null);
    // Plain function called from onClick, not a <form action>: it needs its
    // own refresh so the card behind this form (once closed) shows the
    // removal too, same reasoning as the Archive control.
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <CompanyAvatar name={name} logoUrl={current} className="size-12 text-body" />
      <div className="space-y-1">
        <form
          action={uploadAction}
          onChange={(e) => {
            // Auto-submit the moment a file is chosen: a logo picker doesn't
            // need its own separate "Upload" click once a file is selected.
            if (inputRef.current?.files?.length) e.currentTarget.requestSubmit();
          }}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="companyId" value={companyId} />
          <input ref={inputRef} type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading} className={BTN}>
            <Icon icon={UploadIcon} size={14} />
            {uploading ? "Uploading…" : current ? "Replace logo" : "Add logo"}
          </Button>
          {current && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={removing} className={`${BTN} text-text-secondary`}>
              Remove
            </Button>
          )}
        </form>
        <p className="text-label text-text-secondary">PNG, JPEG, WebP, or SVG: under 2 MB.</p>
        <ActionStatus state={removeStatus ?? (uploadState.ok ? null : uploadState)} className="text-label font-medium" />
      </div>
    </div>
  );
}
