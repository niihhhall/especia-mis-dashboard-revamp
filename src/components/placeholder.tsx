import type { ReactNode } from "react";

/** Simple page scaffold used until each tab's real content is built. */
export function Placeholder({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children?: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="page-title">{title}</h1>
        <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
          {phase}
        </span>
      </div>
      <div className="card-surface p-8 text-sm text-muted-foreground">
        {children ?? "This report isn't available yet."}
      </div>
    </section>
  );
}
