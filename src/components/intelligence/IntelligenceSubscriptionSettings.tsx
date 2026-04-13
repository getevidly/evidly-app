/**
 * INTEL-HUB-1 — Intelligence Subscription Settings
 *
 * Full subscription management UI.
 * Demo mode: saves to sessionStorage. Live mode: persists to Supabase.
 */

import { useState } from 'react';
import {
  Bell, Mail, Smartphone, Shield, MapPin, Building2, Clock,
  Users, ChevronDown, ChevronUp, Eye, Flame, UtensilsCrossed,
} from 'lucide-react';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, GOLD, BODY_TEXT, MUTED,
  PANEL_BG, TEXT_TERTIARY, BORDER_SUBTLE,
} from '../dashboard/shared/constants';
import type { IntelligenceSubscription } from '../../hooks/useIntelligenceHub';
import type { SourceStatus } from '../../data/demoIntelligenceData';
import { DEMO_CLIENT_PROFILE } from '../../lib/businessImpactContext';

interface Props {
  subscription: IntelligenceSubscription;
  sourceStatus: SourceStatus[];
  onUpdate: (updates: Partial<IntelligenceSubscription>) => void;
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: typeof Bell }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4" style={{ color: GOLD }} />
      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED }}>{title}</h3>
    </div>
  );
}

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!enabled)} className="flex items-center gap-2">
      <div
        className="w-8 h-4.5 rounded-full p-0.5 transition-colors"
        style={{ backgroundColor: enabled ? '#1e4d6b' : '#d1d5db' }}
      >
        <div
          className="w-3.5 h-3.5 rounded-full bg-white transition-transform"
          style={{ transform: enabled ? 'translateX(14px)' : 'translateX(0)' }}
        />
      </div>
      <span className="text-xs" style={{ color: BODY_TEXT }}>{label}</span>
    </button>
  );
}

export function IntelligenceSubscriptionSettings({ subscription, sourceStatus, onUpdate }: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Group sources by type
  const sourceGroups: Record<string, SourceStatus[]> = {};
  for (const src of sourceStatus) {
    const type = src.type;
    if (!sourceGroups[type]) sourceGroups[type] = [];
    sourceGroups[type].push(src);
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-1" style={{ color: BODY_TEXT }}>Intelligence Settings</h2>
      <p className="text-xs mb-5" style={{ color: TEXT_TERTIARY }}>Configure which intelligence you receive and how it's delivered.</p>

      {/* ── Your Business Profile ──────────────── */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${GOLD}`, boxShadow: CARD_SHADOW }}>
        <SectionHeader title="Your Business Profile" icon={Building2} />
        <div className="space-y-3">
          <div>
            <span className="text-sm font-bold" style={{ color: BODY_TEXT }}>{DEMO_CLIENT_PROFILE.organization_name}</span>
            <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              {DEMO_CLIENT_PROFILE.segment.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: MUTED }}>
            <div><span className="font-semibold" style={{ color: BODY_TEXT }}>Locations:</span> {DEMO_CLIENT_PROFILE.total_locations}</div>
            <div><span className="font-semibold" style={{ color: BODY_TEXT }}>Employees:</span> ~{DEMO_CLIENT_PROFILE.total_locations * DEMO_CLIENT_PROFILE.avg_employees_per_location}</div>
            <div><span className="font-semibold" style={{ color: BODY_TEXT }}>Dual Jurisdiction:</span> {DEMO_CLIENT_PROFILE.dual_jurisdiction ? 'Yes (NPS + County)' : 'No'}</div>
            <div><span className="font-semibold" style={{ color: BODY_TEXT }}>Peak Season:</span> {DEMO_CLIENT_PROFILE.peak_season_months.map(m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]).join(', ')}</div>
          </div>
          <div>
            <span className="text-[10px] font-semibold mb-1 block" style={{ color: TEXT_TERTIARY }}>Monitored Locations</span>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_CLIENT_PROFILE.locations.map(loc => (
                <span key={loc.id} className="px-2 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: PANEL_BG, color: MUTED }}>
                  {loc.name}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold mb-1 block" style={{ color: TEXT_TERTIARY }}>Key Suppliers</span>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_CLIENT_PROFILE.key_suppliers.map(s => (
                <span key={s} className="px-2 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: PANEL_BG, color: MUTED }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold mb-1 block" style={{ color: TEXT_TERTIARY }}>Active Compliance Priorities</span>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_CLIENT_PROFILE.compliance_priorities.map(p => (
                <span key={p} className="px-2 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Sources ────────────────────────── */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <SectionHeader title="Active Sources" icon={Eye} />
        <div className="space-y-3">
          {Object.entries(sourceGroups).map(([type, sources]) => (
            <div key={type}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2 capitalize" style={{ color: TEXT_TERTIARY }}>{type}</div>
              <div className="space-y-1.5">
                {sources.map(src => {
                  const active = subscription.active_sources.includes(src.id);
                  return (
                    <div key={src.id} className="flex items-center justify-between py-1">
                      <div className="flex-1">
                        <span className="text-xs font-medium" style={{ color: BODY_TEXT }}>{src.name}</span>
                        <span className="text-[10px] ml-2" style={{ color: TEXT_TERTIARY }}>{(src.jurisdictions || []).join(', ')}</span>
                      </div>
                      <button
                        onClick={() => {
                          const next = active
                            ? subscription.active_sources.filter(id => id !== src.id)
                            : [...subscription.active_sources, src.id];
                          onUpdate({ active_sources: next });
                        }}
                        className="w-8 h-4 rounded-full p-0.5 transition-colors"
                        style={{ backgroundColor: active ? '#1e4d6b' : '#d1d5db' }}
                      >
                        <div className="w-3 h-3 rounded-full bg-white transition-transform" style={{ transform: active ? 'translateX(16px)' : 'translateX(0)' }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alert Severity ────────────────────────── */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <SectionHeader title="Alert Severity" icon={Bell} />
        <div className="space-y-2">
          {(['critical', 'high', 'medium', 'low'] as const).map(sev => {
            const active = subscription.alert_severity.includes(sev);
            const colors: Record<string, string> = { critical: '#dc2626', high: '#d97706', medium: '#2563eb', low: '#16a34a' };
            const estimates: Record<string, string> = { critical: '~1-2/week', high: '~3-5/week', medium: '~5-8/week', low: '~10-15/week' };
            return (
              <div key={sev} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[sev] }} />
                  <span className="text-xs font-medium capitalize" style={{ color: BODY_TEXT }}>{sev}</span>
                  <span className="text-[10px]" style={{ color: TEXT_TERTIARY }}>{estimates[sev]}</span>
                </div>
                <button
                  onClick={() => {
                    const next = active
                      ? subscription.alert_severity.filter(s => s !== sev)
                      : [...subscription.alert_severity, sev];
                    onUpdate({ alert_severity: next });
                  }}
                  className="w-8 h-4 rounded-full p-0.5 transition-colors"
                  style={{ backgroundColor: active ? '#1e4d6b' : '#d1d5db' }}
                >
                  <div className="w-3 h-3 rounded-full bg-white transition-transform" style={{ transform: active ? 'translateX(16px)' : 'translateX(0)' }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Pillar Focus ─────────────────────────── */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <SectionHeader title="Pillar Focus" icon={Shield} />
        <div className="flex gap-2">
          {([
            { key: 'both', label: 'Both', icon: Shield },
            { key: 'food_safety', label: 'Food Safety', icon: UtensilsCrossed },
            { key: 'facility_safety', label: 'Facility Safety', icon: Flame },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => onUpdate({ pillar_focus: opt.key })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center"
              style={{
                backgroundColor: subscription.pillar_focus === opt.key ? '#1e4d6b' : PANEL_BG,
                color: subscription.pillar_focus === opt.key ? '#fff' : MUTED,
                border: `1px solid ${subscription.pillar_focus === opt.key ? '#1e4d6b' : BORDER_SUBTLE}`,
              }}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Competitor Watch ─────────────────────── */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <SectionHeader title="Competitor Watch Radius" icon={Building2} />
        <div className="flex gap-2">
          {[1, 5, 10, 25].map(mi => (
            <button
              key={mi}
              onClick={() => onUpdate({ competitor_radius_miles: mi })}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 text-center"
              style={{
                backgroundColor: subscription.competitor_radius_miles === mi ? '#1e4d6b' : PANEL_BG,
                color: subscription.competitor_radius_miles === mi ? '#fff' : MUTED,
                border: `1px solid ${subscription.competitor_radius_miles === mi ? '#1e4d6b' : BORDER_SUBTLE}`,
              }}
            >
              {mi} mi
            </button>
          ))}
        </div>
      </div>

      {/* ── Delivery Preferences ─────────────────── */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <SectionHeader title="Delivery Preferences" icon={Mail} />
        <div className="space-y-4">
          {/* In-App */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5" style={{ color: MUTED }} />
              <span className="text-xs font-medium" style={{ color: BODY_TEXT }}>In-App Notifications</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>Always On</span>
          </div>

          {/* Email */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" style={{ color: MUTED }} />
                <span className="text-xs font-medium" style={{ color: BODY_TEXT }}>Email Alerts</span>
              </div>
              <button
                onClick={() => onUpdate({ delivery_email: !subscription.delivery_email })}
                className="w-8 h-4 rounded-full p-0.5 transition-colors"
                style={{ backgroundColor: subscription.delivery_email ? '#1e4d6b' : '#d1d5db' }}
              >
                <div className="w-3 h-3 rounded-full bg-white transition-transform" style={{ transform: subscription.delivery_email ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
            {subscription.delivery_email && (
              <div className="flex gap-1.5 ml-6">
                {(['immediate', 'daily', 'weekly'] as const).map(freq => (
                  <button
                    key={freq}
                    onClick={() => onUpdate({ delivery_email_frequency: freq })}
                    className="px-2.5 py-1 rounded text-[10px] font-medium capitalize"
                    style={{
                      backgroundColor: subscription.delivery_email_frequency === freq ? '#1e4d6b' : PANEL_BG,
                      color: subscription.delivery_email_frequency === freq ? '#fff' : MUTED,
                    }}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SMS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-3.5 w-3.5" style={{ color: MUTED }} />
                <span className="text-xs font-medium" style={{ color: BODY_TEXT }}>SMS Alerts</span>
              </div>
              <button
                onClick={() => onUpdate({ delivery_sms: !subscription.delivery_sms })}
                className="w-8 h-4 rounded-full p-0.5 transition-colors"
                style={{ backgroundColor: subscription.delivery_sms ? '#1e4d6b' : '#d1d5db' }}
              >
                <div className="w-3 h-3 rounded-full bg-white transition-transform" style={{ transform: subscription.delivery_sms ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
            {subscription.delivery_sms && (
              <div className="flex gap-1.5 ml-6">
                {(['critical', 'high'] as const).map(thr => (
                  <button
                    key={thr}
                    onClick={() => onUpdate({ delivery_sms_threshold: thr })}
                    className="px-2.5 py-1 rounded text-[10px] font-medium capitalize"
                    style={{
                      backgroundColor: subscription.delivery_sms_threshold === thr ? '#1e4d6b' : PANEL_BG,
                      color: subscription.delivery_sms_threshold === thr ? '#fff' : MUTED,
                    }}
                  >
                    {thr} & above
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Executive Snapshots ──────────────────── */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <SectionHeader title="Executive Snapshots" icon={Clock} />
        <div className="space-y-3">
          <div>
            <span className="text-[10px] font-semibold mb-1 block" style={{ color: TEXT_TERTIARY }}>Frequency</span>
            <div className="flex gap-1.5">
              {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                <button
                  key={freq}
                  onClick={() => onUpdate({ executive_snapshot_frequency: freq })}
                  className="px-3 py-1.5 rounded text-xs font-medium capitalize flex-1 text-center"
                  style={{
                    backgroundColor: subscription.executive_snapshot_frequency === freq ? '#1e4d6b' : PANEL_BG,
                    color: subscription.executive_snapshot_frequency === freq ? '#fff' : MUTED,
                    border: `1px solid ${subscription.executive_snapshot_frequency === freq ? '#1e4d6b' : BORDER_SUBTLE}`,
                  }}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold mb-1 block" style={{ color: TEXT_TERTIARY }}>Recipients</span>
            <div className="flex flex-wrap gap-1.5">
              {(subscription.executive_snapshot_recipients || []).map(email => (
                <span key={email} className="px-2 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: PANEL_BG, color: MUTED }}>
                  {email}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Escalation Policy ───────────────────── */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <SectionHeader title="Escalation Policy" icon={Users} />
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ backgroundColor: PANEL_BG }}>
                <th className="text-left px-2 py-1.5 font-semibold" style={{ color: MUTED }}>Severity</th>
                <th className="text-center px-2 py-1.5 font-semibold" style={{ color: MUTED }}>In-App</th>
                <th className="text-center px-2 py-1.5 font-semibold" style={{ color: MUTED }}>Email</th>
                <th className="text-center px-2 py-1.5 font-semibold" style={{ color: MUTED }}>SMS</th>
              </tr>
            </thead>
            <tbody>
              {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
                <tr key={sev} className="border-t capitalize" style={{ borderColor: BORDER_SUBTLE }}>
                  <td className="px-2 py-1.5 font-medium" style={{ color: BODY_TEXT }}>{sev}</td>
                  <td className="px-2 py-1.5 text-center text-green-600">&#10003;</td>
                  <td className="px-2 py-1.5 text-center" style={{ color: subscription.delivery_email && subscription.alert_severity.includes(sev) ? '#16a34a' : TEXT_TERTIARY }}>
                    {subscription.delivery_email && subscription.alert_severity.includes(sev) ? '✓' : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-center" style={{ color: subscription.delivery_sms && (sev === 'critical' || (sev === 'high' && subscription.delivery_sms_threshold === 'high')) ? '#16a34a' : TEXT_TERTIARY }}>
                    {subscription.delivery_sms && (sev === 'critical' || (sev === 'high' && subscription.delivery_sms_threshold === 'high')) ? '✓' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
