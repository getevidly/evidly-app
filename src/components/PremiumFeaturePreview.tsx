import { ReactNode } from 'react';
import { Lock, Sparkles, ArrowRight, BarChart3, Shield, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { FeatureDefinition, PlanTier } from '../lib/featureGating';

interface PremiumFeaturePreviewProps {
  feature: FeatureDefinition;
  currentTier: PlanTier;
  children?: ReactNode;
}

function tierLabel(tier: PlanTier): string {
  const labels: Record<PlanTier, string> = {
    trial: 'Trial',
    founder: 'Founder',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };
  return labels[tier];
}

// ─── Blur Preview ────────────────────────────────────────────────────────────

function BlurPreview({ feature, currentTier, children }: PremiumFeaturePreviewProps) {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', minHeight: 260, borderRadius: 12, overflow: 'hidden' }}>
      {/* Blurred content layer */}
      <div style={{ filter: 'blur(8px)', pointerEvents: 'none', userSelect: 'none' }}>
        {children || (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 24 }}>
            <div style={{ height: 100, borderRadius: 8, background: '#eef4f8' }} />
            <div style={{ height: 100, borderRadius: 8, background: '#e2edf4' }} />
            <div style={{ height: 100, borderRadius: 8, background: '#e2edf4' }} />
            <div style={{ height: 100, borderRadius: 8, background: '#eef4f8' }} />
          </div>
        )}
      </div>

      {/* Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.92)',
            borderRadius: 16,
            padding: '32px 40px',
            textAlign: 'center',
            maxWidth: 380,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#d4af37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Lock size={22} color="#fff" />
          </div>
          <h3 style={{ color: '#1e4d6b', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
            {feature.name}
          </h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            {feature.description}
          </p>
          <button
            onClick={() => navigate('/settings?tab=billing')}
            style={{
              background: '#d4af37',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={16} />
            Upgrade to {feature.upgradeLabel} &mdash; {feature.upgradePrice}
          </button>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: '12px 0 0' }}>
            Current plan: {tierLabel(currentTier)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sample Data Preview ─────────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 8, borderRadius: 4, background: '#e2e8f0', flex: 1 }}>
      <div style={{ height: '100%', borderRadius: 4, background: color, width: `${value}%` }} />
    </div>
  );
}

function IndustryBenchmarksSample() {
  const rows: { label: string; value: number; color: string }[] = [
    { label: 'Your Score: 92%', value: 92, color: '#22c55e' },
    { label: 'Industry Average: 78%', value: 78, color: '#94a3b8' },
    { label: 'Top 10%: 95%', value: 95, color: '#d4af37' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#334155', width: 160, flexShrink: 0 }}>{r.label}</span>
          <ProgressBar value={r.value} color={r.color} />
        </div>
      ))}
    </div>
  );
}

function InsuranceRiskScoreSample() {
  const factors = [
    { label: 'Compliance History', value: 82 },
    { label: 'Equipment Maintenance', value: 68 },
    { label: 'Documentation', value: 74 },
  ];
  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          border: '4px solid #d4af37',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 800, color: '#1e4d6b' }}>B+</span>
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#1e4d6b', fontSize: 14 }}>
          Risk Assessment: Medium
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {factors.map((f) => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#475569', width: 160, flexShrink: 0 }}>{f.label}</span>
              <ProgressBar value={f.value} color="#1e4d6b" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DefaultSample() {
  const stats = [
    { label: 'Score', value: '87%' },
    { label: 'Trend', value: '+4.2%' },
    { label: 'Rank', value: '#12' },
  ];
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            flex: 1,
            background: '#eef4f8',
            borderRadius: 8,
            padding: '16px 12px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e4d6b' }}>{s.value}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function SampleDataPreview({ feature, currentTier }: PremiumFeaturePreviewProps) {
  const navigate = useNavigate();

  const sampleContent =
    feature.id === 'industry-benchmarks' ? (
      <IndustryBenchmarksSample />
    ) : feature.id === 'insurance-risk-score' ? (
      <InsuranceRiskScoreSample />
    ) : (
      <DefaultSample />
    );

  return (
    <div
      style={{
        border: '1px solid #b8d4e8',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: 24,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <BarChart3 size={20} color="#1e4d6b" />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e4d6b' }}>{feature.name}</h3>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 600,
            color: '#d4af37',
            border: '1px solid #d4af37',
            borderRadius: 6,
            padding: '2px 8px',
          }}
        >
          Sample Data
        </span>
      </div>

      {/* Sample content */}
      {sampleContent}

      {/* Info banner */}
      <div
        style={{
          marginTop: 20,
          background: '#fdf8e8',
          border: '1px solid #d4af37',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: '#92742a',
        }}
      >
        <Shield size={16} style={{ flexShrink: 0 }} />
        <span>This shows sample data. Upgrade to see your real {feature.name}.</span>
      </div>

      {/* Upgrade button */}
      <button
        onClick={() => navigate('/settings?tab=billing')}
        style={{
          marginTop: 16,
          width: '100%',
          background: '#d4af37',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 0',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Sparkles size={16} />
        Upgrade to {feature.upgradeLabel} &mdash; {feature.upgradePrice}
      </button>
    </div>
  );
}

// ─── Locked Preview ──────────────────────────────────────────────────────────

function LockedPreview({ feature, currentTier }: PremiumFeaturePreviewProps) {
  const navigate = useNavigate();
  const isEnterprise = feature.upgradeTier === 'enterprise';

  return (
    <div
      style={{
        border: '1px solid #b8d4e8',
        background: '#eef4f8',
        borderRadius: 12,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#1e4d6b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Lock size={24} color="#fff" />
      </div>
      <h3 style={{ color: '#1e4d6b', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
        {feature.name}
      </h3>
      <p style={{ color: '#475569', fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
        {feature.description}
      </p>
      <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 20px' }}>
        Available on {feature.upgradeLabel} plan
      </p>
      {isEnterprise ? (
        <a
          href="mailto:founders@getevidly.com"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: '2px solid #1e4d6b',
            color: '#1e4d6b',
            background: 'transparent',
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          Contact Sales <ArrowRight size={16} />
        </a>
      ) : (
        <button
          onClick={() => navigate('/settings?tab=billing')}
          style={{
            background: '#d4af37',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Sparkles size={16} />
          Upgrade to {feature.upgradeLabel}
        </button>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function PremiumFeaturePreview({ feature, currentTier, children }: PremiumFeaturePreviewProps) {
  switch (feature.previewType) {
    case 'blur':
      return <BlurPreview feature={feature} currentTier={currentTier} children={children} />;
    case 'sample':
      return <SampleDataPreview feature={feature} currentTier={currentTier} />;
    case 'locked':
      return <LockedPreview feature={feature} currentTier={currentTier} />;
    default:
      return <LockedPreview feature={feature} currentTier={currentTier} />;
  }
}
