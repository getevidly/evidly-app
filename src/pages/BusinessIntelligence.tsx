/**
 * BusinessIntelligence — 4-format intelligence view with Risk Register
 *
 * Route: /insights/intelligence
 * Access: owner_operator, executive, compliance_manager, platform_admin
 *
 * Replaces ClientIntelligenceFeed. Shows intelligence signals in 4 formats:
 * Executive Summary, Formal Document, PDF/Print Ready, Risk Register.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { AlertTriangle, BarChart3, FileText, Printer, TableProperties } from 'lucide-react';
import { NAVY, GOLD, CARD_BORDER, TEXT_TERTIARY } from '../components/dashboard/shared/constants';
import {
  SIGNAL_TYPE_LABELS,
  SIGNAL_TYPE_COLORS,
  getSignalRenderType,
  type SignalType,
} from '../constants/signalTypes';
import {
  ExecFormat, FormalFormat, PrintFormat, RegisterFormat,
  DEMO_SIGNALS,
} from '../components/shared/intelligence-formats';
import type { BISignal, RiskPlan, FormatTab } from '../components/shared/intelligence-formats';

const TABS: { key: FormatTab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'executive', label: 'Executive Summary', icon: BarChart3 },
  { key: 'formal',    label: 'Formal Document',   icon: FileText },
  { key: 'print',     label: 'PDF / Print Ready',  icon: Printer },
  { key: 'register',  label: 'Risk Register',      icon: TableProperties },
];

const LOCATIONS = [
  { value: 'all', label: 'All Locations' },
  { value: 'downtown', label: 'Downtown' },
  { value: 'airport', label: 'Airport' },
  { value: 'university', label: 'University' },
];

export function BusinessIntelligence() {
  const { isDemoMode } = useDemo();
  const { user, profile } = useAuth();
  const { guardAction, showUpgrade, upgradeAction, upgradeFeature, setShowUpgrade } = useDemoGuard();

  const [searchParams, setSearchParams] = useSearchParams();
  const location = searchParams.get('location') || 'all';

  const [signals, setSignals] = useState<BISignal[]>([]);
  const [riskPlans, setRiskPlans] = useState<Map<string, RiskPlan>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FormatTab>('executive');
  const [signalTypeFilter, setSignalTypeFilter] = useState<string>('all');

  const orgName = isDemoMode ? 'Pacific Coast Dining' : (profile?.organization_name || 'Your Organization');
  const jurisdiction = isDemoMode ? 'Central California' : 'Your Jurisdiction';

  // Load signals
  const loadSignals = useCallback(async () => {
    setLoading(true);
    if (isDemoMode) {
      setSignals(DEMO_SIGNALS);
      setLoading(false);
      return;
    }
    // Production: query published signals for the user's org
    const orgId = profile?.organization_id;
    if (!orgId) { setLoading(false); return; }

    const { data } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_published', true)
      .eq('is_sample', false)
      .order('published_at', { ascending: false })
      .limit(50);

    if (data) {
      setSignals(data.map((row: any) => ({
        id: row.id,
        title: row.title || '',
        summary: row.summary || row.ai_summary || '',
        category: row.category || 'regulatory',
        signal_type: row.signal_type || '',
        source_name: row.source_name || null,
        priority: row.ai_urgency || 'low',
        county: row.county || 'Statewide',
        published_at: row.published_at || row.discovered_at || row.created_at,
        risk_revenue: row.risk_revenue === 'none' ? null : row.risk_revenue,
        risk_liability: row.risk_liability === 'none' ? null : row.risk_liability,
        risk_cost: row.risk_cost === 'none' ? null : row.risk_cost,
        risk_operational: row.risk_operational === 'none' ? null : row.risk_operational,
        workforce_risk_level: row.workforce_risk_level || null,
        client_impact_revenue: row.client_impact_revenue || null,
        client_impact_liability: row.client_impact_liability || null,
        client_impact_cost: row.client_impact_cost || null,
        client_impact_operational: row.client_impact_operational || null,
        client_impact_workforce: row.client_impact_workforce || null,
        recommended_action: row.recommended_action || null,
        action_deadline: row.action_deadline || null,
        relevance_reason: row.relevance_reason || null,
        feed_type: row.feed_type || 'jurisdiction',
      })));
    }
    setLoading(false);
  }, [isDemoMode, profile?.organization_id]);

  // Load risk plans
  const loadRiskPlans = useCallback(async () => {
    if (isDemoMode) return;
    const orgId = profile?.organization_id;
    if (!orgId) return;
    const { data } = await supabase
      .from('risk_plans')
      .select('*')
      .eq('org_id', orgId);
    if (data) {
      const map = new Map<string, RiskPlan>();
      for (const row of data) {
        map.set(row.signal_id, {
          id: row.id,
          signal_id: row.signal_id,
          status: row.status,
          owner_name: row.owner_name || '',
          due_date: row.due_date || '',
          mitigation_steps: row.mitigation_steps || '',
          accepted_reason: row.accepted_reason || '',
          notes: row.notes || '',
        });
      }
      setRiskPlans(map);
    }
  }, [isDemoMode, profile?.organization_id]);

  useEffect(() => { loadSignals(); loadRiskPlans(); }, [loadSignals, loadRiskPlans]);

  // Filter by location + signal type
  const filteredSignals = useMemo(() => {
    let result = signals;
    if (location !== 'all') {
      result = result.filter(s => {
        const lower = s.summary.toLowerCase() + ' ' + (s.relevance_reason || '').toLowerCase();
        return lower.includes(location);
      });
    }
    if (signalTypeFilter !== 'all') {
      result = result.filter(s => getSignalRenderType(s.signal_type) === signalTypeFilter);
    }
    return result;
  }, [signals, location, signalTypeFilter]);

  // Available signal type filters (only types that have at least one signal)
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    signals.forEach(s => typeSet.add(getSignalRenderType(s.signal_type)));
    return Array.from(typeSet);
  }, [signals]);

  // Save risk plan
  const handleSaveRiskPlan = useCallback(async (plan: RiskPlan) => {
    if (isDemoMode) {
      setRiskPlans(prev => new Map(prev).set(plan.signal_id, plan));
      return;
    }
    const orgId = profile?.organization_id;
    if (!orgId) return;
    await supabase.from('risk_plans').upsert({
      org_id: orgId,
      signal_id: plan.signal_id,
      status: plan.status,
      owner_name: plan.owner_name || null,
      due_date: plan.due_date || null,
      mitigation_steps: plan.mitigation_steps || null,
      accepted_reason: plan.accepted_reason || null,
      notes: plan.notes || null,
      created_by: user?.id,
    }, { onConflict: 'org_id,signal_id' });
    // Refresh
    await loadRiskPlans();
  }, [isDemoMode, profile?.organization_id, user?.id, loadRiskPlans]);

  const setLocation = (loc: string) => {
    const params = new URLSearchParams(searchParams);
    if (loc === 'all') params.delete('location');
    else params.set('location', loc);
    setSearchParams(params, { replace: true });
  };

  // Empty state — production, no signals
  if (!loading && signals.length === 0 && !isDemoMode) {
    return (
      <div style={{ maxWidth: 640, margin: '80px auto', textAlign: 'center', padding: '0 16px' }}>
        <BarChart3 style={{ width: 48, height: 48, color: CARD_BORDER, margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 8 }}>
          No active intelligence signals
        </h2>
        <p style={{ fontSize: 14, color: TEXT_TERTIARY, lineHeight: 1.6 }}>
          Your feed will populate as EvidLY publishes signals relevant to your jurisdiction.
          Intelligence is sourced from 80+ regulatory, legislative, and industry monitoring feeds.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>
          Business Intelligence
        </h1>
        <p style={{ fontSize: 13, color: TEXT_TERTIARY, margin: '4px 0 0' }}>
          Intelligence signals for {orgName} · {jurisdiction}
        </p>
      </div>

      {/* Guided Tour amber banner */}
      {isDemoMode && (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
          padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle style={{ width: 16, height: 16, color: '#D97706', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
            <strong>Sample Data</strong> — You are viewing sample intelligence data.
            In production, signals are generated from 80+ regulatory sources specific to your jurisdictions.
          </span>
        </div>
      )}

      {/* Signal type filter bar */}
      {availableTypes.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSignalTypeFilter('all')}
            style={{
              fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 20,
              border: `1px solid ${signalTypeFilter === 'all' ? NAVY : CARD_BORDER}`,
              background: signalTypeFilter === 'all' ? NAVY : '#fff',
              color: signalTypeFilter === 'all' ? '#fff' : TEXT_TERTIARY,
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {availableTypes.map(type => {
            const active = signalTypeFilter === type;
            const color = SIGNAL_TYPE_COLORS[type] || NAVY;
            return (
              <button
                key={type}
                onClick={() => setSignalTypeFilter(type)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 20,
                  border: `1px solid ${active ? color : CARD_BORDER}`,
                  background: active ? color : '#fff',
                  color: active ? '#fff' : color,
                  cursor: 'pointer',
                }}
              >
                {SIGNAL_TYPE_LABELS[type] || type}
              </button>
            );
          })}
        </div>
      )}

      {/* Controls row: location selector + format tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        {/* Location selector */}
        <select
          value={location}
          onChange={e => setLocation(e.target.value)}
          style={{
            fontSize: 12, fontWeight: 500, padding: '7px 12px', borderRadius: 8,
            border: `1px solid ${CARD_BORDER}`, background: '#fff', color: NAVY,
            cursor: 'pointer',
          }}
        >
          {LOCATIONS.map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        {/* Format tabs */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: active ? NAVY : '#fff',
                  color: active ? '#fff' : TEXT_TERTIARY,
                  border: `1px solid ${active ? NAVY : CARD_BORDER}`,
                  borderRadius: 8,
                  borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
                }}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: TEXT_TERTIARY, fontSize: 14 }}>
          Loading intelligence signals...
        </div>
      )}

      {/* Active format */}
      {!loading && activeTab === 'executive' && (
        <ExecFormat signals={filteredSignals} riskPlans={riskPlans} isDemoMode={isDemoMode} />
      )}
      {!loading && activeTab === 'formal' && (
        <FormalFormat signals={filteredSignals} orgName={orgName} jurisdiction={jurisdiction} />
      )}
      {!loading && activeTab === 'print' && (
        <PrintFormat signals={filteredSignals} orgName={orgName} jurisdiction={jurisdiction} />
      )}
      {!loading && activeTab === 'register' && (
        <RegisterFormat
          signals={filteredSignals}
          riskPlans={riskPlans}
          onSaveRiskPlan={handleSaveRiskPlan}
          isDemoMode={isDemoMode}
        />
      )}

      {/* Demo Upgrade Prompt */}
      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
