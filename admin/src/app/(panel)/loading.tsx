import { StatSkeleton, TableSkeleton } from '@/components/ui/Skeleton';

/**
 * Route-transition placeholder. Renders immediately while the target page's
 * React tree is being prepared, so clicking a sidebar link always paints
 * something instantly instead of waiting on the next screen's data.
 */
export default function PanelLoading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-56 rounded-lg bg-ink-100" />
      <StatSkeleton count={4} />
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] ring-1 ring-[var(--color-line)]">
        <TableSkeleton rows={8} cols={5} />
      </div>
    </div>
  );
}
