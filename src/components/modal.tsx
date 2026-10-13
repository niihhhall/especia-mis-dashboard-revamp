"use client";

import { useEffect, useRef } from "react";

/**
 * A full-screen modal on the native `<dialog>` element. `showModal()` puts it
 * in the top layer and makes the page behind inert, so Tab stays inside and
 * Escape closes it for free; a click on the dimmed backdrop closes it too.
 * Focus moves to the first `[data-autofocus]` field (or the dialog's first
 * focusable element) on open and returns to whatever opened it on close.
 *
 * Children only mount while open, so a form inside starts fresh each time.
 * The panel scrolls (`overscroll-contain`, so the page behind never moves);
 * forms keep their action row in view with `sticky bottom-0`.
 */
export function Modal({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  // Where the pointer went down — a drag from a field out onto the backdrop
  // ends with a click on the dialog, and must not close it.
  const downOnBackdrop = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    // React's autoFocus fires while the dialog is still closed (and so
    // unfocusable), so the first field is focused here, after showModal().
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    // Escape (`cancel` then `close`) and form-driven closes all report back.
    const handleClose = () => onCloseRef.current();
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
      if (dialog.open) dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && downOnBackdrop.current) e.currentTarget.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl overflow-visible border-0 bg-transparent p-0 backdrop:bg-black/60"
    >
      {open ? (
        <div className="scrollbar-thin max-h-[90dvh] overflow-y-auto overscroll-contain rounded-xl bg-card shadow-2xl">
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
