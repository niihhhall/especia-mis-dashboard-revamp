"use client";

import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table";
import { StatusText } from "@/components/shared/status-text";
import type { AuditEvent } from "@/lib/data/audit";
import { AUDIT_ACTION_LABEL } from "@/lib/labels";

/** One audit row ready to draw: the event plus its summary line and display time, built on the server. */
export interface AuditRow {
  e: AuditEvent;
  actor: string;
  note: string | null;
  at: string;
}

function header(text: string) {
  const Header = () => <span className="sr-only">{text}</span>;
  Header.displayName = `AuditHeader${text}`;
  return Header;
}

/**
 * The audit columns: the event (action as plain text, target, then the actor
 * line and the summary) and the time. Headers are read by screen readers
 * only, since the list never had visible column titles.
 */
const auditColumns: DataTableColumn<AuditRow>[] = [
  {
    id: "event",
    header: header("Event"),
    cell: ({ row: { original: r } }) => (
      <div className="min-w-0 py-3 whitespace-normal">
        <div className="flex flex-wrap items-center gap-2">
          <StatusText emphasis>{AUDIT_ACTION_LABEL[r.e.action as keyof typeof AUDIT_ACTION_LABEL] ?? r.e.action}</StatusText>
          {r.e.target && <span className="line-clamp-2 min-w-0 break-words text-body font-medium text-text-primary">{r.e.target}</span>}
        </div>
        <p className="mt-1 text-label font-normal text-text-secondary">{r.actor}</p>
        {r.note && <p className="mt-1 text-label font-normal text-text-secondary">{r.note}</p>}
      </div>
    ),
  },
  {
    id: "at",
    header: header("When"),
    meta: { align: "end" },
    cell: ({ row: { original: r } }) => (
      <time dateTime={r.e.at} className="text-label text-text-secondary">
        {r.at}
      </time>
    ),
  },
];

/** The audit list as a DataTable. Rows arrive built and serializable from the page. */
export function AuditTable({ rows }: { rows: AuditRow[] }) {
  return <DataTable label="Audit log" columns={auditColumns} data={rows} getRowId={(r) => r.e.id} empty={null} />;
}