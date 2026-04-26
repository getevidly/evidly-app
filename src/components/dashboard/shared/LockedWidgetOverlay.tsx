// Canonical lightweight locked-card overlay. Reuse for future locked widgets
// and align with future sidebar locked-nav rollout (per RBAC L-pattern,
// currently not implemented elsewhere).

import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

interface LockedWidgetOverlayProps {
  children: ReactNode;
  label?: string;
}

export default function LockedWidgetOverlay({
  children,
  label = 'Collecting data \u2014 insights appear as history builds',
}: LockedWidgetOverlayProps) {
  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
      <div style={{ opacity: 0.45, pointerEvents: 'none' }}>
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(250, 247, 240, 0.85)',
          borderRadius: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={24} color="#1E2D4D" />
          <span
            style={{
              color: '#1E2D4D',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}
