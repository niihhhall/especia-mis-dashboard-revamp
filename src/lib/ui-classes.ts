/**
 * Shared class strings for form controls.
 *
 * `fieldClass` is the one native field look (inputs, selects, textareas that
 * are not shadcn primitives): 32px, 6px radius, the input border raised to
 * border-strong on hover and focus, 16px text below `sm` so iOS Safari doesn't
 * zoom the page on focus and 13px from `sm` up. Focus rings come from the
 * global `:focus-visible` rule.
 */
export const fieldClass =
  "h-8 rounded-md border border-input bg-surface px-3 text-base text-text-primary hover:border-border-strong focus-visible:border-border-strong sm:text-body";
/** Field text only: 16px below `sm` (no iOS zoom), 13px from `sm` up. For shadcn Input and Textarea. */
export const fieldTextClass = "text-base sm:text-body";
