/**
 * PushOptInBanner — MOBILE-EMOTIONAL-01
 *
 * Shows a one-time banner on the dashboard prompting push notification opt-in.
 * Dismissible — once dismissed or enabled, never shows again (localStorage).
 */
import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

const STORAGE_KEY = 'evidly_push_prompt_dismissed';

export function PushOptInBanner() {
  const { permission, subscribed, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Only show if push is supported, not yet decided, and not dismissed
    if (!('PushManager' in window)) return;
    if (permission !== 'default') return;
    if (subscribed) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    setDismissed(false);
  }, [permission, subscribed]);

  if (dismissed || permission !== 'default') return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const handleEnable = async () => {
    await requestPermission();
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div
      className="rounded-lg flex items-center justify-between gap-3 mb-4"
      style={{
        background: '#1E2D4D',
        color: '#FAF7F0',
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Bell size={20} className="shrink-0" style={{ color: '#A08C5A' }} />
        <div className="min-w-0">
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px' }}>
            Get instant alerts on your phone
          </p>
          <p style={{ fontSize: 12, color: 'rgba(250,247,240,0.7)', margin: 0 }}>
            Temperature excursions, service gaps, outbreak alerts.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleEnable}
          className="rounded-md font-semibold transition-colors"
          style={{
            background: '#A08C5A',
            color: '#FAF7F0',
            border: 'none',
            padding: '8px 16px',
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Enable alerts
        </button>
        <button
          onClick={handleDismiss}
          className="p-2.5 -m-1 rounded hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} style={{ color: 'rgba(250,247,240,0.5)' }} />
        </button>
      </div>
    </div>
  );
}
