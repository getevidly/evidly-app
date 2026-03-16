/**
 * NotificationsPage — NOTIFICATION-SUPER-01
 *
 * Per-category notification preferences with email/sms/push toggles.
 * Reads/writes from notification_preferences table via Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, Save, Loader2, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { NOTIFICATION_CATEGORIES } from '../../components/notifications/notificationConstants';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, NAVY, FONT,
} from '../../components/dashboard/shared/constants';
import type { NotificationCategory } from '../../constants/statusColors';

type Channel = 'email' | 'sms' | 'push';

interface CategoryPreference {
  category: NotificationCategory;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
}

const CHANNEL_META: { key: Channel; label: string; icon: typeof Mail; desc: string }[] = [
  { key: 'email', label: 'Email', icon: Mail, desc: 'Receive notifications via email' },
  { key: 'sms', label: 'SMS', icon: MessageSquare, desc: 'Receive text message alerts' },
  { key: 'push', label: 'Push', icon: Smartphone, desc: 'Receive push notifications in browser' },
];

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 12,
  boxShadow: CARD_SHADOW,
  padding: 24,
  marginBottom: 20,
};

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: checked ? NAVY : '#d1d5db',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
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
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [globalToggles, setGlobalToggles] = useState<Record<Channel, boolean>>({
    email: true,
    sms: false,
    push: true,
  });

  const [prefs, setPrefs] = useState<Record<NotificationCategory, Record<Channel, boolean>>>(() => {
    const init: Record<string, Record<Channel, boolean>> = {};
    NOTIFICATION_CATEGORIES.forEach(cat => {
      init[cat.key] = { email: true, sms: false, push: true };
    });
    return init as Record<NotificationCategory, Record<Channel, boolean>>;
  });

  // Fetch existing preferences
  const fetchPrefs = useCallback(async () => {
    if (isDemoMode || !user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('notification_preferences')
        .select('category, email_enabled, sms_enabled, push_enabled')
        .eq('user_id', user.id);

      if (data && data.length > 0) {
        const updates: Record<string, Record<Channel, boolean>> = {};
        data.forEach((row: CategoryPreference) => {
          updates[row.category] = {
            email: row.email_enabled,
            sms: row.sms_enabled,
            push: row.push_enabled,
          };
        });
        setPrefs(prev => ({ ...prev, ...updates }));
      }
    } catch {
      // Fall back to defaults
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, user?.id]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const toggleGlobal = (channel: Channel, val: boolean) => {
    setGlobalToggles(prev => ({ ...prev, [channel]: val }));
  };

  const toggleCategory = (category: NotificationCategory, channel: Channel) => {
    setPrefs(prev => ({
      ...prev,
      [category]: { ...prev[category], [channel]: !prev[category][channel] },
    }));
  };

  const handleSave = async () => {
    if (isDemoMode) {
      alert('Preferences saved (demo mode)');
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      const orgId = profile?.organization_id;
      if (!orgId) throw new Error('No org');

      const rows = NOTIFICATION_CATEGORIES.map(cat => ({
        user_id: user.id,
        organization_id: orgId,
        category: cat.key,
        email_enabled: globalToggles.email && prefs[cat.key].email,
        sms_enabled: globalToggles.sms && prefs[cat.key].sms,
        push_enabled: globalToggles.push && prefs[cat.key].push,
      }));

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(rows, { onConflict: 'user_id,category' });

      if (error) throw error;
      alert('Notification preferences saved');
    } catch {
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
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
      {/* Global Channel Toggles */}
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
                  <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>{ch.desc}</p>
                </div>
              </div>
              <ToggleSwitch checked={globalToggles[ch.key]} onChange={v => toggleGlobal(ch.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Per-Category Settings */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: '0 0 4px' }}>
          Category Preferences
        </h2>
        <p style={{ fontSize: 12, color: MUTED, margin: '0 0 16px' }}>
          Control which notification categories reach you on each channel.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: PANEL_BG, borderBottom: `2px solid ${CARD_BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT, minWidth: 200 }}>Category</th>
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
              {NOTIFICATION_CATEGORIES.map(cat => (
                <tr key={cat.key} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: cat.color,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <span style={{ fontWeight: 600, color: BODY_TEXT }}>{cat.label}</span>
                        <p style={{ fontSize: 11, color: MUTED, margin: '2px 0 0' }}>{cat.description}</p>
                      </div>
                    </div>
                  </td>
                  {CHANNEL_META.map(ch => (
                    <td key={ch.key} style={{ textAlign: 'center', padding: '10px 14px' }}>
                      <input
                        type="checkbox"
                        checked={prefs[cat.key]?.[ch.key] || false}
                        onChange={() => toggleCategory(cat.key, ch.key)}
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
