/** The first focusable element: jumps past the sidebar and top bar to `#main`. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-50 focus:inline-flex focus:h-8 focus:items-center focus:rounded-md focus:border focus:border-border focus:bg-surface-raised focus:px-3 focus:text-body focus:font-medium focus:text-text-primary"
    >
      Skip to content
    </a>
  );
}
