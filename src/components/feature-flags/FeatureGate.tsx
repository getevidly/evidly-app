/**
 * FEATURE-FLAGS-02 — User-facing feature gate component
 *
 * Wraps gated features and shows appropriate disabled UI
 * based on the flag's reason from the DB-backed useFeatureFlag hook.
 *
 * 6 gate variants: scheduled, pending, criteria_not_met,
 * role_restricted, plan_restricted, disabled
 */
import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Lock,
  Shield,
  Star,
  Wrench,
  CheckCircle,
  Bell,
  BellOff,
  ArrowRight,
} from 'lucide-react';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useFeatureCriteriaProgress, CriteriaProgress } from '../../hooks/useFeatureCriteriaProgress';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SkeletonCard } from '../ui/Skeleton';

// ── Colors ──
const GOLD = '#A08C5A';
const NAVY = '#1E2D4D';
const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const GRAY = '#6B7280';
const MUTED = '#9CA3AF';
const GREEN = '#10B981';
const AMBER = '#F59E0B';
const BG_CARD = '#FFFFFF';
const BORDER = '#E5E7EB';

interface FeatureGateProps {
  flagKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ flagKey, children, fallback }: FeatureGateProps) {
  const { enabled, reason, message, messageTitle, loading, flagData } = useFeatureFlag(flagKey);

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px' }}>
        <SkeletonCard />
      </div>
    );
  }

  if (enabled) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const name = flagData?.name || flagKey.replace(/_/g, ' ');

  switch (reason) {
    case 'scheduled':
      return (
        <ScheduledGate
          name={name}
          title={messageTitle}
          message={message}
          dateConfig={flagData?.date_config}
          flagKey={flagKey}
        />
      );
    case 'pending':
      return (
        <PendingGate
          name={name}
          title={messageTitle}
          message={message}
          dateConfig={flagData?.date_config}
          triggerType={flagData?.trigger_type || ''}
        />
      );
    case 'criteria_not_met':
      return (
        <CriteriaGate
          name={name}
          title={messageTitle}
          message={message}
          criteria={flagData?.criteria || []}
          dateConfig={flagData?.date_config}
        />
      );
    case 'role_restricted':
      return (
        <RoleRestrictedGate
          name={name}
          title={messageTitle}
          message={message}
          allowedRoles={flagData?.allowed_roles}
        />
      );
    case 'plan_restricted':
      return (
        <PlanRestrictedGate
          name={name}
          title={messageTitle}
          message={message}
          planTiers={flagData?.plan_tiers}
        />
      );
    default:
      return (
        <DisabledGate
          name={name}
          title={messageTitle}
          message={message}
        />
      );
  }
}

// ── Shared card wrapper ──
function GateCard({
  stripColor,
  icon,
  name,
  title,
  message,
  children,
}: {
  stripColor: string;
  icon: ReactNode;
  name: string;
  title: string | null;
  message: string | null;
  children?: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 20px' }}>
      <div
        style={{
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {/* Color strip */}
        <div style={{ height: 4, background: stripColor }} />

        <div style={{ padding: '32px 28px' }}>
          {/* Icon */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `${stripColor}14`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            {icon}
          </div>

          {/* Feature name */}
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            {name}
          </div>

          {/* Title */}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 8, lineHeight: 1.3 }}>
            {title || 'This feature is not yet available'}
          </h2>

          {/* Message */}
          {message && (
            <p style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: children ? 24 : 0 }}>
              {message}
            </p>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}

// ── Scheduled gate (fixed_date, time_window) ──
function ScheduledGate({
  name,
  title,
  message,
  dateConfig,
  flagKey,
}: {
  name: string;
  title: string | null;
  message: string | null;
  dateConfig: any;
  flagKey: string;
}) {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  const goLive = dateConfig?.go_live ? new Date(dateConfig.go_live) : null;

  // Countdown timer
  useEffect(() => {
    if (!goLive) return;

    const update = () => {
      const diff = goLive.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Available now — refresh to access');
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const parts: string[] = [];
      if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
      if (hours > 0) parts.push(`${hours} hr${hours !== 1 ? 's' : ''}`);
      if (mins > 0 || parts.length === 0) parts.push(`${mins} min`);
      setCountdown(parts.join(', '));
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [goLive]);

  // Check existing subscription
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('feature_flag_notifications')
      .select('id')
      .eq('flag_key', flagKey)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSubscribed(true);
      });
  }, [flagKey, user?.id]);

  const handleNotify = useCallback(async () => {
    if (!user?.id || subscribed) return;
    setSubLoading(true);
    const { error } = await supabase
      .from('feature_flag_notifications')
      .upsert({ flag_key: flagKey, user_id: user.id }, { onConflict: 'flag_key,user_id' });
    if (!error) setSubscribed(true);
    setSubLoading(false);
  }, [flagKey, user?.id, subscribed]);

  return (
    <GateCard
      stripColor={GOLD}
      icon={<Calendar size={22} color={GOLD} />}
      name={name}
      title={title}
      message={message}
    >
      {/* Countdown */}
      {countdown && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: '#FEF3C7',
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <Clock size={16} color={AMBER} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>
            {countdown}
          </span>
        </div>
      )}

      {/* Notify button */}
      <div>
        <button
          onClick={handleNotify}
          disabled={subscribed || subLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 8,
            border: `1px solid ${subscribed ? GREEN : GOLD}`,
            background: subscribed ? `${GREEN}10` : `${GOLD}10`,
            color: subscribed ? GREEN : GOLD,
            fontSize: 13,
            fontWeight: 600,
            cursor: subscribed ? 'default' : 'pointer',
            opacity: subLoading ? 0.6 : 1,
          }}
        >
          {subscribed ? (
            <>
              <BellOff size={15} />
              Subscribed — we'll notify you
            </>
          ) : (
            <>
              <Bell size={15} />
              {subLoading ? 'Subscribing...' : 'Notify me when live'}
            </>
          )}
        </button>
      </div>
    </GateCard>
  );
}

// ── Pending gate (relative_date, event_delay, rolling_window) ──
function PendingGate({
  name,
  title,
  message,
  dateConfig,
  triggerType,
}: {
  name: string;
  title: string | null;
  message: string | null;
  dateConfig: any;
  triggerType: string;
}) {
  const { profile } = useAuth();

  let progressText = '';
  let progressPct = 0;

  if (triggerType === 'relative_date' && dateConfig?.days) {
    const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
    const daysSince = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
    const required = dateConfig.days;
    progressPct = Math.min(1, daysSince / required);
    progressText = `Account created ${daysSince} days ago — unlocks in ${Math.max(0, required - daysSince)} days`;
  } else if (triggerType === 'event_delay') {
    progressText = dateConfig?.trigger_event
      ? `Complete "${dateConfig.trigger_event}" to start the clock`
      : 'Complete the required action to unlock this feature';
  } else if (triggerType === 'rolling_window') {
    const activeDays = dateConfig?.active_days || 0;
    const requiredDays = dateConfig?.required_days || 30;
    progressPct = Math.min(1, activeDays / requiredDays);
    progressText = `Active ${activeDays} of ${requiredDays} required days`;
  }

  return (
    <GateCard
      stripColor={NAVY}
      icon={<Clock size={22} color={NAVY} />}
      name={name}
      title={title}
      message={message}
    >
      {/* Progress bar */}
      {progressPct > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round(progressPct * 100)}%`,
                background: NAVY,
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {progressText && (
        <p style={{ fontSize: 13, color: MUTED, fontStyle: 'italic' }}>
          {progressText}
        </p>
      )}
    </GateCard>
  );
}

// ── Criteria gate ──
function CriteriaGate({
  name,
  title,
  message,
  criteria,
  dateConfig,
}: {
  name: string;
  title: string | null;
  message: string | null;
  criteria: any[];
  dateConfig: any;
}) {
  const navigate = useNavigate();
  const { items, loading } = useFeatureCriteriaProgress(criteria, dateConfig);

  const metCount = items.filter(i => i.met).length;
  const total = items.length;

  return (
    <GateCard
      stripColor={BLUE}
      icon={<Lock size={22} color={BLUE} />}
      name={name}
      title={title}
      message={message}
    >
      {/* Overall progress */}
      {total > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>Unlock progress</span>
            <span style={{ fontSize: 12, color: MUTED }}>{metCount} of {total} complete</span>
          </div>
          <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: total > 0 ? `${Math.round((metCount / total) * 100)}%` : '0%',
                background: metCount === total ? GREEN : BLUE,
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Criteria rows */}
      {loading ? (
        <div style={{ fontSize: 13, color: MUTED }}>Loading criteria...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, i) => (
            <CriteriaRow key={i} item={item} onAction={(href) => navigate(href)} />
          ))}
        </div>
      )}
    </GateCard>
  );
}

function CriteriaRow({ item, onAction }: { item: CriteriaProgress; onAction: (href: string) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: item.met ? `${GREEN}08` : '#F9FAFB',
        borderRadius: 8,
        border: `1px solid ${item.met ? `${GREEN}30` : '#E5E7EB'}`,
      }}
    >
      {/* Status icon */}
      {item.met ? (
        <CheckCircle size={18} color={GREEN} />
      ) : (
        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${item.progress > 0 ? AMBER : '#D1D5DB'}`, flexShrink: 0 }} />
      )}

      {/* Label + values */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{item.label}</div>
        <div style={{ fontSize: 12, color: MUTED }}>
          {item.current} of {item.required}
        </div>
      </div>

      {/* Progress bar (partial) */}
      {!item.met && item.progress > 0 && (
        <div style={{ width: 60, height: 4, background: '#E5E7EB', borderRadius: 2, flexShrink: 0 }}>
          <div
            style={{
              height: '100%',
              width: `${Math.round(item.progress * 100)}%`,
              background: AMBER,
              borderRadius: 2,
            }}
          />
        </div>
      )}

      {/* Action CTA */}
      {item.actionHref && (
        <button
          onClick={() => onAction(item.actionHref!)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${BLUE}40`,
            background: `${BLUE}08`,
            color: BLUE,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {item.actionLabel} <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

// ── Role restricted gate ──
function RoleRestrictedGate({
  name,
  title,
  message,
  allowedRoles,
}: {
  name: string;
  title: string | null;
  message: string | null;
  allowedRoles: string[] | null;
}) {
  const rolesDisplay = allowedRoles?.length
    ? allowedRoles.map(r => r.replace(/_/g, ' ')).join(', ')
    : 'authorized roles';

  return (
    <GateCard
      stripColor={MUTED}
      icon={<Shield size={22} color={MUTED} />}
      name={name}
      title={title || 'Role access required'}
      message={message || `This feature is available to ${rolesDisplay}.`}
    />
  );
}

// ── Plan restricted gate ──
function PlanRestrictedGate({
  name,
  title,
  message,
  planTiers,
}: {
  name: string;
  title: string | null;
  message: string | null;
  planTiers: string[] | null;
}) {
  const navigate = useNavigate();
  const tierDisplay = planTiers?.length
    ? planTiers.join(' or ')
    : 'a higher plan';

  return (
    <GateCard
      stripColor={PURPLE}
      icon={<Star size={22} color={PURPLE} />}
      name={name}
      title={title || `Requires ${tierDisplay} plan`}
      message={message || `Upgrade your subscription to access this feature.`}
    >
      <button
        onClick={() => navigate('/settings?tab=billing')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 8,
          border: 'none',
          background: PURPLE,
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Star size={15} />
        Upgrade your plan
        <ArrowRight size={15} />
      </button>
    </GateCard>
  );
}

// ── Disabled gate (generic off) ──
function DisabledGate({
  name,
  title,
  message,
}: {
  name: string;
  title: string | null;
  message: string | null;
}) {
  return (
    <GateCard
      stripColor={GRAY}
      icon={<Wrench size={22} color={GRAY} />}
      name={name}
      title={title || 'Feature currently unavailable'}
      message={message || 'This feature is temporarily unavailable. We are working to bring it online.'}
    >
      <p style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>
        Questions? Contact{' '}
        <a
          href="mailto:founders@getevidly.com"
          style={{ color: GOLD, textDecoration: 'underline' }}
        >
          founders@getevidly.com
        </a>
      </p>
    </GateCard>
  );
}
