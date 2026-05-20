/**
 * NotificationsPage — NOTIFICATION-SUPER-01 + C10.5 digest layer
 *
 * Per-category notification preferences with email/sms/push toggles.
 * C10.5 additions: daily digest opt-out per category, at-least-one-channel
 * validation, SMS_AVAILABLE gate, phone number stub.
 * Reads/writes from notification_preferences table via Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, Save, Loader2, Mail, MessageSquare, Smartphone, Clock, Phone, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useOrgSummary } from '../../hooks/useOrgSummary';
import { NOTIFICATION_CATEGORIES } from '../../components/notifications/notificationConstants';
import {
  MUTED, NAVY, FONT,
} from '../../components/dashboard/shared/constants';
import type { NotificationCategory } from '../../constants/statusColors';

type Channel = 'email' | 'sms' | 'push';

// C10.5: SMS not yet available — flip to true in C10.6 (Twilio activation)
const SMS_AVAILABLE = false;

interface CategoryPreference {
  category: NotificationCategory;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  digest_opt_out?: boolean;
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
  const { timezone } = useOrgSummary();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // C10.5: per-category digest opt-out
  const [digestOptOut, setDigestOptOut] = useState<Record<NotificationCategory, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NOTIFICATION_CATEGORIES.forEach(cat => { init[cat.key] = false; });
    return init as Record<NotificationCategory, boolean>;
  });

  // C10.5: phone number (existing user_profiles.phone column)
  const [phone, setPhone] = useState('');
  const [phoneSaved, setPhoneSaved] = useState('');

  // Fetch existing preferences + phone
  const fetchPrefs = useCallback(async () => {
    if (isDemoMode || !user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [{ data }, { data: profileData }] = await Promise.all([
        supabase
          .from('notification_preferences')
          .select('category, email_enabled, sms_enabled, push_enabled, digest_opt_out')
          .eq('user_id', user.id),
        supabase
          .from('user_profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (data && data.length > 0) {
        const updates: Record<string, Record<Channel, boolean>> = {};
        const digestUpdates: Record<string, boolean> = {};
        data.forEach((row: CategoryPreference) => {
          updates[row.category] = {
            email: row.email_enabled,
            sms: row.sms_enabled,
            push: row.push_enabled,
          };
          digestUpdates[row.category] = row.digest_opt_out ?? false;
        });
        setPrefs(prev => ({ ...prev, ...updates }));
        setDigestOptOut(prev => ({ ...prev, ...digestUpdates }));
      }

      if (profileData?.phone) {
        setPhone(profileData.phone);
        setPhoneSaved(profileData.phone);
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

  // C10.5: at-least-one-channel validator (checks effective saved state)
  const validateChannelMinimum = (): string | null => {
    const willBeSaved = NOTIFICATION_CATEGORIES.map(cat => ({
      email: globalToggles.email && prefs[cat.key].email,
      sms: globalToggles.sms && prefs[cat.key].sms,
    }));
    const anyEmailEffective = willBeSaved.some(r => r.email);
    const anySmsEffective = SMS_AVAILABLE && willBeSaved.some(r => r.sms);

    if (!anyEmailEffective && !anySmsEffective) {
      return 'At least one category must have Email enabled. Without a delivery channel, you won\'t receive any notifications.';
    }
    return null;
  };

  const handleSave = async () => {
    if (isDemoMode) {
      alert('Preferences saved (demo mode)');
      return;
    }
    if (!user?.id) return;

    // Validate before saving
    const validationError = validateChannelMinimum();
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaveError(null);

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
        digest_opt_out: digestOptOut[cat.key] ?? false,
      }));

      // Save preferences + phone in parallel
      const promises: Promise<unknown>[] = [
        supabase
          .from('notification_preferences')
          .upsert(rows, { onConflict: 'user_id,category' }),
      ];

      // Save phone if changed
      if (phone !== phoneSaved) {
        promises.push(
          supabase
            .from('user_profiles')
            .update({ phone: phone.trim() || null })
            .eq('id', user.id),
        );
      }

      const results = await Promise.all(promises);
      const prefResult = results[0] as { error: { message: string } | null };
      if (prefResult.error) throw prefResult.error;

      setPhoneSaved(phone);
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
          {CHANNEL_META.map(ch => {
            const isSmsLocked = ch.key === 'sms' && !SMS_AVAILABLE;
            return (
              <div key={ch.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ch.icon size={18} color={MUTED} />
                  <div>
                    <span className="text-sm font-semibold text-navy-deeper">
                      {ch.label} Notifications
                      {isSmsLocked && <span className="ml-1.5 text-[11px] font-normal text-navy-mid">(coming soon)</span>}
                    </span>
                    <p className="text-xs text-navy-mid mt-0.5 mb-0">{ch.desc}</p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={isSmsLocked ? false : globalToggles[ch.key]}
                  onChange={v => toggleGlobal(ch.key, v)}
                  disabled={isSmsLocked}
                />
              </div>
            );
          })}
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
                  {CHANNEL_META.map(ch => {
                    const isSmsLocked = ch.key === 'sms' && !SMS_AVAILABLE;
                    const isDisabled = isSmsLocked || !globalToggles[ch.key];
                    return (
                      <td key={ch.key} className="text-center px-3.5 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSmsLocked ? false : (prefs[cat.key]?.[ch.key] || false)}
                          onChange={() => toggleCategory(cat.key, ch.key)}
                          disabled={isDisabled}
                          title={isSmsLocked ? 'SMS delivery coming soon' : undefined}
                          className={`w-[18px] h-[18px] accent-navy-muted ${isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer opacity-100'}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Digest — C10.5 */}
      <div className={cardClasses}>
        <h2 className="flex items-center gap-2 text-base font-bold text-navy-deeper mb-1 mt-0">
          <Clock size={18} color={NAVY} /> Daily Digest
        </h2>
        <p className="text-xs text-navy-mid mb-4 mt-0">
          Receive a single email each morning at 7 AM{timezone ? ` (${timezone})` : ''} summarizing
          all pending items. Urgent items may still be delivered individually.
        </p>
        <div className="flex flex-col gap-2.5">
          {NOTIFICATION_CATEGORIES.map(cat => (
            <div key={cat.key} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm font-medium text-navy-deeper">{cat.label}</span>
              </div>
              <ToggleSwitch
                checked={!digestOptOut[cat.key]}
                onChange={v => setDigestOptOut(prev => ({ ...prev, [cat.key]: !v }))}
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-navy-mid mt-3 mb-0">
          Toggle off a category to exclude it from your daily digest. It will still appear in your in-app feed.
        </p>
      </div>

      {/* Phone Number — C10.5 stub */}
      <div className={cardClasses}>
        <h2 className="flex items-center gap-2 text-base font-bold text-navy-deeper mb-1 mt-0">
          <Phone size={18} color={MUTED} /> SMS Phone Number
        </h2>
        <p className="text-xs text-navy-mid mb-3 mt-0">
          {SMS_AVAILABLE
            ? 'Enter your phone number to receive SMS alerts. E.164 format recommended (e.g. +15551234567).'
            : 'SMS delivery is coming soon. You can enter your number now and it will be ready when SMS launches.'}
        </p>
        <input
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          disabled={!SMS_AVAILABLE}
          className="w-full max-w-xs px-3 py-2 border border-border_ui-cool rounded-lg text-sm text-navy-deeper disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {/* Validation error banner */}
      {saveError && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg border border-red-200 bg-red-50">
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 m-0">{saveError}</p>
        </div>
      )}

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
