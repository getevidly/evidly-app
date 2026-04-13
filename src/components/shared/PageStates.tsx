import React from 'react';

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
          className="rounded-lg animate-pulse"
          style={{ background: '#E8EDF4', height: i === 0 ? 96 : 72 }}
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
    <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>&#x26A0;</div>
      <h3 style={{ fontWeight: 500, marginBottom: 6, color: '#1E2D4D' }}>
        Failed to load data
      </h3>
      <p style={{ color: '#6B7F96', fontSize: 14, marginBottom: 16 }}>
        {typeof error === 'string'
          ? error
          : error?.message || 'Something went wrong'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: '#1e4d6b',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            cursor: 'pointer',
            fontSize: 14,
          }}
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
    <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
      {icon && (
        <div style={{ marginBottom: 12, color: '#6B7F96' }}>{icon}</div>
      )}
      <h3 style={{ fontWeight: 500, marginBottom: 6, color: '#1E2D4D' }}>
        {title}
      </h3>
      {description && (
        <p style={{ color: '#6B7F96', fontSize: 14, marginBottom: 16 }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            background: '#1e4d6b',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
