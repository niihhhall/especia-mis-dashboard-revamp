import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The named type steps (text-title, text-label, ...) are font sizes, not
// colors. Registering them keeps cn("text-text-secondary", "text-label")
// from dropping the color class.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["title", "card-title", "body", "label", "kpi", "base"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
