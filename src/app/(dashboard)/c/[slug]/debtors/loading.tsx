import { DataTableSkeleton } from "@/components/dashboard/data-table-skeleton";
import { Card } from "@/components/shared/card";

export default function Loading() {
  return (
    <Card flush>
      <DataTableSkeleton />
    </Card>
  );
}
