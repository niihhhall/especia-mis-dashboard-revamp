import { Notice } from "@/components/shared/notice";

/** The single demo notice: one line above the page header. */
export function DemoBanner({ message }: { message: string }) {
  return (
    <Notice className="mb-6">
      <p>{message}</p>
    </Notice>
  );
}
