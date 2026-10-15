import { fieldClass } from "@/lib/ui-classes";

/** Shared look for the upload forms. */
export const FIELD = `${fieldClass} w-full`;
export const LABEL = "text-label text-text-secondary";
export const BTN = "h-8 rounded-md text-body";
export const FILE =
  "w-full text-body text-text-secondary file:me-3 file:h-8 file:rounded-md file:border file:border-border file:bg-surface-raised file:px-3 file:text-body file:font-medium file:text-text-primary";

type InvalidProps = (name: "month" | "trialBalance") => Record<string, unknown>;

function FileField({ id, label, hint, required, invalid }: {
  id: string;
  label: string;
  hint: string;
  required?: boolean;
  invalid?: Record<string, unknown>;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={LABEL}>
        {label} <span className="text-text-secondary">{hint}</span>
      </label>
      <input id={id} name={id} type="file" accept=".xls,.xlsx" required={required} className={FILE} {...invalid} />
    </div>
  );
}

/** The Trial Balance upload fields, in their existing order with their existing labels. */
export function UploadFields({ invalidProps }: { invalidProps: InvalidProps }) {
  return (
    <>
      <div className="space-y-2">
        <label htmlFor="month" className={LABEL}>
          Reporting month
        </label>
        <input id="month" name="month" type="month" required className={FIELD} {...invalidProps("month")} />
      </div>
      <FileField id="trialBalance" label="Trial balance" hint="(.xls / .xlsx)" required invalid={invalidProps("trialBalance")} />
      <FileField id="stockInfo" label="Stock info" hint="(optional)" />
      <FileField id="debtorsAgeing" label="Debtors ageing" hint="(optional)" />
      <FileField id="creditorsAgeing" label="Creditors ageing" hint="(optional)" />
    </>
  );
}
