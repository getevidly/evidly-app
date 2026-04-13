/**
 * NotificationPrefs.jsx — TASK-ASSIGN-01
 *
 * Per-user task notification preferences form.
 * Accessible from TaskManager gear icon.
 */

import { useState } from 'react';
import { X, Bell } from 'lucide-react';

const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]';

export function NotificationPrefs({ onClose }) {
  const [prefs, setPrefs] = useState({
    reminder_minutes: 30,
    notify_push: true,
    notify_email: true,
    notify_sms: false,
  });

  const set = (key, value) => setPrefs((p) => ({ ...p, [key]: value }));

  const handleSave = () => {
    alert('Task notification preferences saved (demo mode).');
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-sm rounded-2xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: '#1E2D4D' }} />
            <h2 className="text-base font-bold text-[var(--text-primary)]">Notification Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-panel)]">
            <X className="w-5 h-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Reminder (minutes before due)
            </label>
            <input
              type="number"
              className={inputClass}
              value={prefs.reminder_minutes}
              onChange={(e) => set('reminder_minutes', parseInt(e.target.value, 10) || 0)}
              min={0}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">Channels</label>
            {[
              { key: 'notify_push', label: 'Push Notifications' },
              { key: 'notify_email', label: 'Email' },
              { key: 'notify_sms', label: 'SMS' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-[var(--text-primary)]">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white"
              style={{ backgroundColor: '#1E2D4D' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
