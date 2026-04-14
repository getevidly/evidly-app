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

const cardClasses = 'bg-white border border-border_ui-cool rounded-xl shadow-[0_1px_3px_rgba(11,22,40,.06),0_1px_2px_rgba(11,22,40,.04)] p-6 mb-5';

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`w-[44px] h-6 rounded-xl border-none relative shrink-0 transition-colors duration-200 ${checked ? 'bg-navy-muted' : 'bg-gray-300'} ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer opacity-100'}`}
    >
      <div
        className="w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left] duration-200"
        style={{ left: checked ? 23 : 3 }}
      />
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
        <div className={`${cardClasses} h-[120px]`}>
          <div className="bg-[#EEF1F7] rounded-lg h-5 w-[200px] mb-4" />
          <div className="bg-[#EEF1F7] rounded-lg h-3.5 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...FONT }}>
      {/* Global Channel Toggles */}
      <div className={cardClasses}>
        <h2 className="flex items-center gap-2 text-base font-bold text-navy-deeper mb-4 mt-0">
          <Bell size={18} color={NAVY} /> Notification Channels
        </h2>
        <div className="flex flex-col gap-3.5">
          {CHANNEL_META.map(ch => (
            <div key={ch.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ch.icon size={18} color={MUTED} />
                <div>
                  <span className="text-sm font-semibold text-navy-deeper">{ch.label} Notifications</span>
                  <p className="text-xs text-navy-mid mt-0.5 mb-0">{ch.desc}</p>
                </div>
              </div>
              <ToggleSwitch checked={globalToggles[ch.key]} onChange={v => toggleGlobal(ch.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Per-Category Settings */}
      <div className={cardClasses}>
        <h2 className="text-base font-bold text-navy-deeper mb-1 mt-0">
          Category Preferences
        </h2>
        <p className="text-xs text-navy-mid mb-4 mt-0">
          Control which notification categories reach you on each channel.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#EEF1F7] border-b-2 border-border_ui-cool">
                <th className="text-left px-3.5 py-2.5 font-semibold text-navy-deeper min-w-[200px]">Category</th>
                {CHANNEL_META.map(ch => (
                  <th key={ch.key} className="text-center px-3.5 py-2.5 font-semibold text-navy-deeper min-w-[80px]">
                    <div className="flex items-center justify-center gap-1">
                      <ch.icon size={14} /> {ch.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_CATEGORIES.map(cat => (
                <tr key={cat.key} className="border-b border-border_ui-cool">
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div>
                        <span className="font-semibold text-navy-deeper">{cat.label}</span>
                        <p className="text-[11px] text-navy-mid mt-0.5 mb-0">{cat.description}</p>
                      </div>
                    </div>
                  </td>
                  {CHANNEL_META.map(ch => (
                    <td key={ch.key} className="text-center px-3.5 py-2.5">
                      <input
                        type="checkbox"
                        checked={prefs[cat.key]?.[ch.key] || false}
                        onChange={() => toggleCategory(cat.key, ch.key)}
                        disabled={!globalToggles[ch.key]}
                        className={`w-[18px] h-[18px] accent-navy-muted ${globalToggles[ch.key] ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-40'}`}
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
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 py-2.5 px-6 rounded-lg border-none bg-navy-muted text-white text-sm font-semibold ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100'}`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
