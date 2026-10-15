import { fmtAmount, negParens } from "@/lib/format";

/** A read-only amount: mono, right-aligned by its column, negatives in parentheses. */
export function AmountCell({ value }: { value: number }) {
  return <span className="block px-0 text-end">{negParens(fmtAmount(value))}</span>;
}
