'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * Route error boundary. Catches any render-time crash on a panel page and
 * shows a recoverable screen (instead of a blank/white page), with a button
 * that re-renders the route and retries.
 */
export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin] route error:', error);
  }, [error]);

  return (
    <Card className="max-w-xl">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
          <AlertTriangle size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-ink-900">Something went wrong on this page</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            The screen hit an unexpected error while rendering. Your data is safe — try again below.
          </p>
          {error.message ? (
            <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 font-mono text-[12px] text-ink-600 ring-1 ring-[var(--color-line)]">
              {error.message}
            </p>
          ) : null}
          <Button className="mt-4" icon={<RefreshCw size={16} />} onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    </Card>
  );
}
