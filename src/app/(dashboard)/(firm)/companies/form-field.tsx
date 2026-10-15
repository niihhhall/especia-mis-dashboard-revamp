import { fieldClass } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The 32px control size every button in the companies folder uses. */
export const BTN = "h-8 rounded-md text-body";

/** A native input or select at the shared field style. */
export const FIELD = cn(fieldClass, "w-full");

/** A labelled text input. `autoFocusField` is focused when the dialog opens. */
export function FormField({
  name,
  label,
  defaultValue,
  required,
  autoFocusField,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  autoFocusField?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-label text-text-secondary">
        {label}
        {required && <span className="text-text-primary"> *</span>}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        data-autofocus={autoFocusField || undefined}
        className={FIELD}
      />
    </label>
  );
}
