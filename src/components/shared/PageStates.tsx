import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Shared page state components — loading skeleton, error state, empty state.
 * Used by all operator-facing pages to handle the three data states consistently.
 */

/* ── Loading Skeleton ─────────────────────────────────────── */

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4 p-6">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="rounded-lg animate-pulse bg-gray-200"
          style={{ height: i === 0 ? 96 : 72 }}
        />
      ))}
    </div>
  );
}

/* ── Error State ──────────────────────────────────────────── */

export function ErrorState({
  error,
  onRetry,
}: {
  error: Error | string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-4xl mb-3 text-amber-500">
        <AlertTriangle className="w-10 h-10 mx-auto" />
      </div>
      <h3 className="font-medium mb-1.5 text-[#1E2D4D]">
        Failed to load data
      </h3>
      <p className="text-gray-500 text-sm mb-4">
        {typeof error === 'string'
          ? error
          : error?.message || 'Something went wrong'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-[#1E2D4D] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#162340] transition-colors min-h-[44px]"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/* ── Empty State ──────────────────────────────────────────── */

export function PageEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center py-12 px-6">
      {icon && (
        <div className="mb-3 text-gray-400">{icon}</div>
      )}
      <h3 className="font-medium mb-1.5 text-[#1E2D4D]">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 text-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-[#1E2D4D] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#162340] transition-colors min-h-[44px]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
