import { CircleAlert } from "lucide-react";

import { Notice } from "@/components/shared/notice";
import { plural } from "@/lib/format";

/** Says how many rows break opening + debit - credit = closing, when any do. */
export function UnbalancedNotice({ count }: { count: number }) {
  if (count === 0) return null;
  return <Notice icon={CircleAlert}>{plural(count, "{n} row out of balance", "{n} rows out of balance")}</Notice>;
}
