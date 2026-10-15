"use client";

import { useRef, type ReactNode } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * The companies folder's dialog: shadcn Dialog on a flat surface with a 1px
 * border. Escape and the backdrop close it, focus is trapped inside, moves to
 * the first `[data-autofocus]` field on open and returns to the trigger on
 * close. Children mount only while open, so a form inside starts fresh.
 */
export function CompanyDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** The accessible name; the visible heading is rendered by the child. */
  title: string;
  children: ReactNode;
}) {
  // No DialogTrigger here (the dialog is opened from state), so the opener is
  // remembered on open and focused again on close.
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onCloseAutoFocus={(e) => {
          if (opener.current?.isConnected) {
            e.preventDefault();
            opener.current.focus();
          }
        }}
        onOpenAutoFocus={(e) => {
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          const target = (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>("[data-autofocus]");
          if (target) {
            e.preventDefault();
            target.focus();
          }
        }}
        className="scrollbar-thin max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl gap-0 overflow-y-auto overscroll-contain rounded-lg border-border bg-surface p-0 sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {open ? children : null}
      </DialogContent>
    </Dialog>
  );
}
