import { Info } from "lucide-react";

/** The single demo notice: one line above the page header. */
export function DemoBanner({ message }: { message: string }) {
  return (
    <div className="mb-6 flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-body text-text-primary">
      <Info className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
