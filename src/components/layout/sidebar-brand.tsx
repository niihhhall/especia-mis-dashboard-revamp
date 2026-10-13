/** The sidebar's top block: a flat "E" tile, the product name and its subtitle. */
export function SidebarBrand() {
  return (
    <div className="flex h-10 items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-raised text-card-title font-semibold text-text-primary">
        E
      </span>
      <div className="min-w-0 group-data-[collapsible=icon]:hidden">
        <p className="text-card-title font-semibold text-text-primary">Especia</p>
        <p className="text-label text-text-secondary">Client portal</p>
      </div>
    </div>
  );
}
