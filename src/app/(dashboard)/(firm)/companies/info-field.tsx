/** One label and value pair on a company card. */
export function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-label text-text-secondary">{label}</p>
      <p className="line-clamp-2 break-words text-body font-medium text-text-primary tabular-nums">{value}</p>
    </div>
  );
}
