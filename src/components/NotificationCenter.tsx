/**
 * NotificationCenter — NOTIFICATION-SUPER-01
 *
 * Thin wrapper: renders NotificationBell + NotificationPanel.
 * All demo data arrays have been removed (zero fake data rule).
 * Unified data comes from NotificationContext → useNotificationData.
 */

import { useState } from 'react';
import { NotificationBell } from './notifications/NotificationBell';
import { NotificationPanel } from './notifications/NotificationPanel';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <NotificationBell onClick={() => setIsOpen(prev => !prev)} />
      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
