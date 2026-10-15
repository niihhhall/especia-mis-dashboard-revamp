import { DEMO_WRITE_MESSAGE } from "@/lib/demo/messages";

import type { NewCompanyState } from "./actions";
import { FIELD, MONTHS } from "./form-field";

export const ERROR_ID = "add-company-error";

export type InvalidField = "name" | "slug" | "fyStart" | null;

/**
 * Which field a refusal from `createCompany` is about, so it can be marked
 * invalid, described by the message and focused. Null for refusals that are
 * not about one field (permissions, demo mode, a database error).
 */
export function invalidField(state: NewCompanyState): InvalidField {
  if (state.ok || !state.message || state.message === DEMO_WRITE_MESSAGE) return null;
  if (/company name|no letters or digits/i.test(state.message)) return "name";
  if (/^The link/.test(state.message)) return "slug";
  if (/^Financial year/.test(state.message)) return "fyStart";
  return null;
}

function Field({
  name,
  label,
  hint,
  required,
  placeholder,
  invalid,
  autoFocusField,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  invalid?: boolean;
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
        placeholder={placeholder}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? ERROR_ID : undefined}
        data-autofocus={autoFocusField || undefined}
        className={FIELD}
      />
      {hint && <span className="mt-1 block text-label text-text-secondary">{hint}</span>}
    </label>
  );
}

/** Every Add company field, in its existing order with its existing labels. */
export function NewCompanyFields({ invalid }: { invalid: InvalidField }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field
          name="name"
          label="Company name"
          required
          placeholder="Tirupati Automart Private Limited"
          invalid={invalid === "name"}
          autoFocusField
        />
      </div>
      <Field name="group" label="Group" placeholder="Tirupati Group" />
      <Field
        name="slug"
        label="Short link"
        hint="Used in the address bar. Left blank, it comes from the name."
        placeholder="tirupati"
        invalid={invalid === "slug"}
      />
      <label className="block">
        <span className="mb-1 block text-label text-text-secondary">Financial year starts</span>
        <select
          name="fyStart"
          defaultValue={4}
          aria-invalid={invalid === "fyStart" || undefined}
          aria-describedby={invalid === "fyStart" ? ERROR_ID : undefined}
          className={FIELD}
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <Field name="pan" label="PAN" />
      <Field name="gst" label="GST" />
      <Field name="cin" label="CIN" />
      <div className="sm:col-span-2">
        <Field name="address" label="Address" />
      </div>
    </div>
  );
}
