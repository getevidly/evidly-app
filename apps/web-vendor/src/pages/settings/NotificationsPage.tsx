import { useState, useEffect } from 'react';
import { Bell, Save, Loader2, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { useNotificationPreferences, useUpdateNotificationPreferences, type NotificationPreferences, type NotificationChannel } from '../../hooks/api/useSettings';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, NAVY, FONT,
} from '@shared/components/dashboard/shared/constants';

const EVENT_DEFAULTS: { key: string; label: string }[] = [
  { key: 'job_assigned', label: 'Job assigned' },
  { key: 'job_completed', label: 'Job completed' },
  { key: 'qa_rejected', label: 'QA rejected' },
  { key: 'deficiency_found', label: 'Deficiency found' },
  { key: 'timecard_approval', label: 'Timecard needs approval' },
  { key: 'cert_expiring', label: 'Certificate expiring' },
];

const CHANNEL_META: { key: NotificationChannel; label: string; icon: any }[] = [
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'push', label: 'Push', icon: Smartphone },
];

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 12,
  boxShadow: CARD_SHADOW,
  padding: 24,
  marginBottom: 20,
};

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: checked ? NAVY : '#d1d5db',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: 3,
        left: checked ? 23 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

export function NotificationsPage() {
  const { data: serverPrefs, isLoading } = useNotificationPreferences();
  const { mutate: updatePrefs, isLoading: saving } = useUpdateNotificationPreferences();

  const [globalToggles, setGlobalToggles] = useState<Record<NotificationChannel, boolean>>({
    email: false,
    sms: false,
    push: false,
  });

  const [events, setEvents] = useState<Record<string, Record<NotificationChannel, boolean>>>(() => {
    const init: Record<string, Record<NotificationChannel, boolean>> = {};
    EVENT_DEFAULTS.forEach(e => {
      init[e.key] = { email: false, sms: false, push: false };
    });
    return init;
  });

  useEffect(() => {
    if (serverPrefs) {
      setGlobalToggles(serverPrefs.globalToggles);
      const evMap: Record<string, Record<NotificationChannel, boolean>> = {};
      serverPrefs.events.forEach(e => {
        evMap[e.key] = { ...e.channels };
      });
      setEvents(prev => ({ ...prev, ...evMap }));
    }
  }, [serverPrefs]);

  const toggleGlobal = (channel: NotificationChannel, val: boolean) => {
    setGlobalToggles(prev => ({ ...prev, [channel]: val }));
  };

  const toggleEvent = (eventKey: string, channel: NotificationChannel) => {
    setEvents(prev => ({
      ...prev,
      [eventKey]: { ...prev[eventKey], [channel]: !prev[eventKey][channel] },
    }));
  };

  const handleSave = async () => {
    const prefs: NotificationPreferences = {
      globalToggles,
      events: EVENT_DEFAULTS.map(e => ({
        key: e.key,
        label: e.label,
        channels: events[e.key],
      })),
    };
    try {
      await updatePrefs(prefs);
      alert('Notification preferences saved');
    } catch {
      alert('Failed to save preferences');
    }
  };

  if (isLoading) {
    return (
      <div style={{ ...FONT }}>
        <div style={{ ...cardStyle, height: 120 }}>
          <div style={{ background: PANEL_BG, borderRadius: 8, height: 20, width: 200, marginBottom: 16 }} />
          <div style={{ background: PANEL_BG, borderRadius: 8, height: 14, width: '50%' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...FONT }}>
      {/* Global Toggles */}
      <div style={cardStyle}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: '0 0 16px' }}>
          <Bell size={18} color={NAVY} /> Notification Channels
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {CHANNEL_META.map(ch => (
            <div key={ch.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ch.icon size={18} color={MUTED} />
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: BODY_TEXT }}>{ch.label} Notifications</span>
                  <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
                    {ch.key === 'email' && 'Receive notifications via email'}
                    {ch.key === 'sms' && 'Receive text message alerts'}
                    {ch.key === 'push' && 'Receive push notifications in browser'}
                  </p>
                </div>
              </div>
              <ToggleSwitch checked={globalToggles[ch.key]} onChange={v => toggleGlobal(ch.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Event Settings */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: '0 0 16px' }}>
          Event Settings
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: PANEL_BG, borderBottom: `2px solid ${CARD_BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT, minWidth: 180 }}>Event</th>
                {CHANNEL_META.map(ch => (
                  <th key={ch.key} style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT, minWidth: 80 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <ch.icon size={14} /> {ch.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVENT_DEFAULTS.map(evt => (
                <tr key={evt.key} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: BODY_TEXT }}>{evt.label}</td>
                  {CHANNEL_META.map(ch => (
                    <td key={ch.key} style={{ textAlign: 'center', padding: '10px 14px' }}>
                      <input
                        type="checkbox"
                        checked={events[evt.key]?.[ch.key] || false}
                        onChange={() => toggleEvent(evt.key, ch.key)}
                        disabled={!globalToggles[ch.key]}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: NAVY,
                          cursor: globalToggles[ch.key] ? 'pointer' : 'not-allowed',
                          opacity: globalToggles[ch.key] ? 1 : 0.4,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 24px',
            borderRadius: 8,
            border: 'none',
            background: NAVY,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
