import { useState, useEffect, useMemo } from 'react';
import {
  School, CheckCircle2, AlertTriangle, AlertCircle, ExternalLink,
  ClipboardList, Thermometer, FileText, Users, Building2,
  TrendingUp, Plus, X, Calendar, ShieldCheck,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

// ── Types ──────────────────────────────────────────────────────
interface K12Location {
  id: string;
  name: string;
  school_name: string | null;
  district_name: string | null;
  nslp_enrolled: boolean;
  usda_commodities: boolean;
  usda_review_date: string | null;
  meal_count_daily: number | null;
}

interface ReadinessItem {
  label: string;
  status: 'ready' | 'gap' | 'missing';
  source: string;
  authority: 'usda' | 'county' | 'haccp' | 'nslp';
  detail: string;
}

interface ClaimPeriod {
  id: string;
  location_id: string;
  claim_period: string;
  meal_count_total: number | null;
  meal_count_daily_avg: number | null;
  claim_submitted: boolean;
  claim_submitted_at: string | null;
  notes: string | null;
}

// ── Demo Data ──────────────────────────────────────────────────
const K12_DEMO_LOCATIONS: K12Location[] = [
  { id: 'demo-1', name: 'Lincoln Elementary', school_name: 'Lincoln Elementary', district_name: 'Fresno USD', nslp_enrolled: true, usda_commodities: true, usda_review_date: '2026-06-15', meal_count_daily: 480 },
  { id: 'demo-2', name: 'Roosevelt Middle', school_name: 'Roosevelt Middle School', district_name: 'Fresno USD', nslp_enrolled: true, usda_commodities: false, usda_review_date: null, meal_count_daily: 620 },
  { id: 'demo-3', name: 'Kennedy High', school_name: 'Kennedy High School', district_name: 'Fresno USD', nslp_enrolled: true, usda_commodities: true, usda_review_date: '2026-05-20', meal_count_daily: 890 },
];

const K12_DEMO_CLAIMS: ClaimPeriod[] = [
  { id: 'c1', location_id: 'demo-1', claim_period: '2026-02', meal_count_total: 9120, meal_count_daily_avg: 456, claim_submitted: true, claim_submitted_at: '2026-03-01T10:00:00Z', notes: null },
  { id: 'c2', location_id: 'demo-2', claim_period: '2026-02', meal_count_total: 11780, meal_count_daily_avg: 589, claim_submitted: false, claim_submitted_at: null, notes: 'Awaiting cafeteria manager sign-off' },
  { id: 'c3', location_id: 'demo-3', claim_period: '2026-02', meal_count_total: 16910, meal_count_daily_avg: 846, claim_submitted: true, claim_submitted_at: '2026-03-02T14:30:00Z', notes: null },
  { id: 'c4', location_id: 'demo-1', claim_period: '2026-01', meal_count_total: 8640, meal_count_daily_avg: 432, claim_submitted: true, claim_submitted_at: '2026-02-01T09:00:00Z', notes: null },
  { id: 'c5', location_id: 'demo-3', claim_period: '2026-01', meal_count_total: 15820, meal_count_daily_avg: 791, claim_submitted: true, claim_submitted_at: '2026-02-02T11:00:00Z', notes: null },
];

// Demo readiness per location
function getDemoReadiness(locId: string): ReadinessItem[] {
  const configs: Record<string, ReadinessItem[]> = {
    'demo-1': [
      { label: 'Temperature logs — last 30 days', status: 'ready', source: 'Core: Temp Logs', authority: 'haccp', detail: '97.2% on time' },
      { label: 'Daily checklists complete', status: 'ready', source: 'Core: Checklists', authority: 'usda', detail: '94.1% completion rate' },
      { label: 'Food safety plan on file', status: 'ready', source: 'Core: Documents', authority: 'usda', detail: 'Uploaded Jan 15, 2026' },
      { label: 'Allergen policy on file', status: 'ready', source: 'Core: Documents', authority: 'usda', detail: 'Uploaded Jan 15, 2026' },
      { label: 'HACCP-trained staff certified', status: 'ready', source: 'Core: Certifications', authority: 'haccp', detail: '3 current · 0 expired' },
      { label: 'Last county inspection on file', status: 'ready', source: 'Core: Inspections', authority: 'county', detail: 'Jan 8, 2026' },
      { label: 'USDA review date on file', status: 'ready', source: 'K-12 Field', authority: 'usda', detail: 'Jun 15, 2026' },
      { label: 'NSLP meal count logged — current period', status: 'ready', source: 'K-12 Input', authority: 'nslp', detail: '480 avg/day' },
    ],
    'demo-2': [
      { label: 'Temperature logs — last 30 days', status: 'gap', source: 'Core: Temp Logs', authority: 'haccp', detail: '78.3% on time' },
      { label: 'Daily checklists complete', status: 'gap', source: 'Core: Checklists', authority: 'usda', detail: '72.5% completion rate' },
      { label: 'Food safety plan on file', status: 'ready', source: 'Core: Documents', authority: 'usda', detail: 'Uploaded Dec 10, 2025' },
      { label: 'Allergen policy on file', status: 'missing', source: 'Core: Documents', authority: 'usda', detail: 'Required for NSLP review' },
      { label: 'HACCP-trained staff certified', status: 'gap', source: 'Core: Certifications', authority: 'haccp', detail: '1 current · 1 expired' },
      { label: 'Last county inspection on file', status: 'ready', source: 'Core: Inspections', authority: 'county', detail: 'Dec 15, 2025' },
      { label: 'USDA review date on file', status: 'missing', source: 'K-12 Field', authority: 'usda', detail: 'Set in location settings' },
      { label: 'NSLP meal count logged — current period', status: 'ready', source: 'K-12 Input', authority: 'nslp', detail: '620 avg/day' },
    ],
    'demo-3': [
      { label: 'Temperature logs — last 30 days', status: 'ready', source: 'Core: Temp Logs', authority: 'haccp', detail: '91.8% on time' },
      { label: 'Daily checklists complete', status: 'ready', source: 'Core: Checklists', authority: 'usda', detail: '88.7% completion rate' },
      { label: 'Food safety plan on file', status: 'missing', source: 'Core: Documents', authority: 'usda', detail: 'Required — upload in Documents' },
      { label: 'Allergen policy on file', status: 'ready', source: 'Core: Documents', authority: 'usda', detail: 'Uploaded Feb 1, 2026' },
      { label: 'HACCP-trained staff certified', status: 'ready', source: 'Core: Certifications', authority: 'haccp', detail: '4 current · 0 expired' },
      { label: 'Last county inspection on file', status: 'ready', source: 'Core: Inspections', authority: 'county', detail: 'Feb 1, 2026' },
      { label: 'USDA review date on file', status: 'ready', source: 'K-12 Field', authority: 'usda', detail: 'May 20, 2026' },
      { label: 'NSLP meal count logged — current period', status: 'ready', source: 'K-12 Input', authority: 'nslp', detail: '890 avg/day' },
    ],
  };
  return configs[locId] || [];
}

// ── Dual Authority Requirements ────────────────────────────────
const DUAL_AUTHORITY_ROWS = [
  { requirement: 'Temperature monitoring logs', county: 'Required — daily CCP logs', usda: 'Required — HACCP-based monitoring' },
  { requirement: 'Food safety plan', county: 'Retail Food Code', usda: 'Required for NSLP participation' },
  { requirement: 'Allergen management', county: 'Menu labeling required', usda: 'Written policy + staff training' },
  { requirement: 'Staff certifications', county: 'Food handler card', usda: 'HACCP certification for managers' },
  { requirement: 'Inspection records', county: 'Routine EH inspections', usda: 'Administrative review (every 3 years)' },
  { requirement: 'Production records', county: 'Not typically required', usda: 'Daily production records for CN' },
  { requirement: 'Meal pattern compliance', county: 'N/A', usda: 'Meets USDA meal component requirements' },
  { requirement: 'Equipment maintenance', county: 'Equipment permits', usda: 'Commercial kitchen standards' },
  { requirement: 'Pest control', county: 'IPM required', usda: 'IPM plan + records' },
  { requirement: 'Waste management', county: 'Grease trap / hauler records', usda: 'SB 1383 if applicable' },
];

// ── Helpers ────────────────────────────────────────────────────
function formatDate(d: string | null): string {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_COLORS = {
  ready: { bg: '#D1FAE5', text: '#065F46', icon: '#40916C' },
  gap: { bg: '#FEF3C7', text: '#92400E', icon: '#D97706' },
  missing: { bg: '#FEE2E2', text: '#991B1B', icon: '#EF4444' },
};

const AUTHORITY_LABELS: Record<string, { label: string; color: string }> = {
  usda: { label: 'USDA', color: '#1D4ED8' },
  county: { label: 'County EH', color: '#7C3AED' },
  haccp: { label: 'HACCP', color: '#0891B2' },
  nslp: { label: 'NSLP', color: '#059669' },
};

// ── Component ──────────────────────────────────────────────────
export function K12Compliance() {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [locations, setLocations] = useState<K12Location[]>([]);
  const [claims, setClaims] = useState<ClaimPeriod[]>([]);
  const [readinessMap, setReadinessMap] = useState<Record<string, ReadinessItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'readiness' | 'authority' | 'meals' | 'claims'>('readiness');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [showClaimForm, setShowClaimForm] = useState(false);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  // Claim form state
  const [claimForm, setClaimForm] = useState({
    location_id: '',
    claim_period: '',
    meal_count_total: '',
    meal_count_daily_avg: '',
    notes: '',
  });

  useEffect(() => {
    if (isDemoMode) {
      setLocations(K12_DEMO_LOCATIONS);
      setClaims(K12_DEMO_CLAIMS);
      const rMap: Record<string, ReadinessItem[]> = {};
      K12_DEMO_LOCATIONS.forEach(l => { rMap[l.id] = getDemoReadiness(l.id); });
      setReadinessMap(rMap);
      setSelectedLocation(K12_DEMO_LOCATIONS[0].id);
      setLoading(false);
      return;
    }

    async function fetchK12Data() {
      // Fetch K-12 locations
      const { data: locs } = await supabase
        .from('locations')
        .select('id, name, nslp_enrolled, usda_commodities, usda_review_date, meal_count_daily, school_name, district_name')
        .eq('organization_id', profile?.organization_id);

      const k12Locs: K12Location[] = (locs || []).map((l: any) => ({
        id: l.id, name: l.school_name || l.name,
        school_name: l.school_name, district_name: l.district_name,
        nslp_enrolled: l.nslp_enrolled || false,
        usda_commodities: l.usda_commodities || false,
        usda_review_date: l.usda_review_date,
        meal_count_daily: l.meal_count_daily,
      }));
      setLocations(k12Locs);
      if (k12Locs.length > 0) setSelectedLocation(k12Locs[0].id);

      // Fetch NSLP claims
      const { data: claimData } = await supabase
        .from('nslp_claim_periods')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .order('created_at', { ascending: false });
      setClaims((claimData || []).map((c: any) => ({
        id: c.id, location_id: c.location_id, claim_period: c.claim_period,
        meal_count_total: c.meal_count_total, meal_count_daily_avg: c.meal_count_daily_avg,
        claim_submitted: c.claim_submitted || false, claim_submitted_at: c.claim_submitted_at,
        notes: c.notes,
      })));

      // Build readiness from core data for each location
      const rMap: Record<string, ReadinessItem[]> = {};
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      for (const loc of k12Locs) {
        const [tempRes, checkRes, docRes, certRes, inspRes] = await Promise.all([
          supabase.from('temperature_logs').select('id, temp_pass').eq('location_id', loc.id).gte('reading_time', thirtyDaysAgo),
          supabase.from('checklist_completions').select('id, status').eq('location_id', loc.id).gte('created_at', thirtyDaysAgo),
          supabase.from('documents').select('id, name, category, created_at').eq('location_id', loc.id).in('category', ['food_safety_plan', 'allergen_policy', 'haccp_plan']),
          supabase.from('employee_certifications').select('id, expiry_date').eq('location_id', loc.id),
          supabase.from('inspections').select('id, inspection_date, notes').eq('location_id', loc.id).order('inspection_date', { ascending: false }).limit(1),
        ]);

        const temps = tempRes.data || [];
        const checks = checkRes.data || [];
        const docs = docRes.data || [];
        const certs = certRes.data || [];
        const lastInsp = (inspRes.data || [])[0];

        const tempRate = temps.length ? (temps.filter((t: any) => t.temp_pass === true).length / temps.length) * 100 : null;
        const checkRate = checks.length ? (checks.filter((c: any) => c.status === 'completed' || c.status === 'complete').length / checks.length) * 100 : null;
        const foodSafetyPlan = docs.find((d: any) => d.category === 'food_safety_plan');
        const allergenPolicy = docs.find((d: any) => d.category === 'allergen_policy');
        const certsCurrent = certs.filter((c: any) => c.expiry_date && new Date(c.expiry_date) > new Date());

        rMap[loc.id] = [
          { label: 'Temperature logs — last 30 days', status: tempRate === null ? 'missing' : tempRate >= 85 ? 'ready' : 'gap', source: 'Core: Temp Logs', authority: 'haccp', detail: tempRate !== null ? `${tempRate.toFixed(1)}% on time` : 'No logs found' },
          { label: 'Daily checklists complete', status: checkRate === null ? 'missing' : checkRate >= 85 ? 'ready' : 'gap', source: 'Core: Checklists', authority: 'usda', detail: checkRate !== null ? `${checkRate.toFixed(1)}% completion rate` : 'No checklists found' },
          { label: 'Food safety plan on file', status: foodSafetyPlan ? 'ready' : 'missing', source: 'Core: Documents', authority: 'usda', detail: foodSafetyPlan ? `Uploaded ${formatDate(foodSafetyPlan.created_at)}` : 'Required — upload in Documents' },
          { label: 'Allergen policy on file', status: allergenPolicy ? 'ready' : 'missing', source: 'Core: Documents', authority: 'usda', detail: allergenPolicy ? `Uploaded ${formatDate(allergenPolicy.created_at)}` : 'Required for NSLP review' },
          { label: 'HACCP-trained staff certified', status: certsCurrent.length > 0 ? 'ready' : 'missing', source: 'Core: Certifications', authority: 'haccp', detail: `${certsCurrent.length} current · ${certs.length - certsCurrent.length} expired` },
          { label: 'Last county inspection on file', status: lastInsp ? 'ready' : 'missing', source: 'Core: Inspections', authority: 'county', detail: lastInsp ? formatDate(lastInsp.inspection_date) : 'No inspection on record' },
          { label: 'USDA review date on file', status: loc.usda_review_date ? 'ready' : 'missing', source: 'K-12 Field', authority: 'usda', detail: loc.usda_review_date ? formatDate(loc.usda_review_date) : 'Set in location settings' },
          { label: 'NSLP meal count logged — current period', status: loc.meal_count_daily ? 'ready' : 'missing', source: 'K-12 Input', authority: 'nslp', detail: loc.meal_count_daily ? `${loc.meal_count_daily} avg/day` : 'Log daily meal count' },
        ];
      }
      setReadinessMap(rMap);
      setLoading(false);
    }

    fetchK12Data();
  }, [isDemoMode, profile]);

  // ── Computed ─────────────────────────────────────────────────
  const selectedReadiness = readinessMap[selectedLocation] || [];
  const readyCount = selectedReadiness.filter(r => r.status === 'ready').length;
  const readinessPercent = selectedReadiness.length > 0 ? Math.round((readyCount / selectedReadiness.length) * 100) : 0;
  const selectedLoc = locations.find(l => l.id === selectedLocation);
  const totalDailyMeals = locations.reduce((s, l) => s + (l.meal_count_daily || 0), 0);

  // Claims for current selected location
  const locationClaims = useMemo(() => claims.filter(c => c.location_id === selectedLocation), [claims, selectedLocation]);

  // Claim submit handler
  async function handleClaimSubmit() {
    guardAction('nslp_claim', 'NSLP claim', async () => {
      if (isDemoMode) {
        const newClaim: ClaimPeriod = {
          id: `c-new-${Date.now()}`,
          location_id: claimForm.location_id,
          claim_period: claimForm.claim_period,
          meal_count_total: Number(claimForm.meal_count_total) || null,
          meal_count_daily_avg: Number(claimForm.meal_count_daily_avg) || null,
          claim_submitted: false,
          claim_submitted_at: null,
          notes: claimForm.notes || null,
        };
        setClaims(prev => [newClaim, ...prev]);
        setShowClaimForm(false);
        alert('Claim period logged (demo mode — data not saved to server)');
        return;
      }

      const { error } = await supabase.from('nslp_claim_periods').insert({
        organization_id: profile?.organization_id,
        location_id: claimForm.location_id || null,
        claim_period: claimForm.claim_period,
        meal_count_total: Number(claimForm.meal_count_total) || null,
        meal_count_daily_avg: Number(claimForm.meal_count_daily_avg) || null,
        notes: claimForm.notes || null,
        created_by: profile?.id,
      });

      if (!error) {
        setShowClaimForm(false);
        window.location.reload();
      } else {
        alert('Error saving claim: ' + error.message);
      }
    });
  }

  // ── Empty State ──────────────────────────────────────────────
  if (!loading && locations.length === 0 && !isDemoMode) {
    return (
      <>
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'K-12 Food Safety' }]} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{'🏫'}</div>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: '#1E2D4D', marginBottom: 8 }}>No K-12 locations configured</h3>
          <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 480, lineHeight: 1.7, marginBottom: 28 }}>
            Add school details to your locations to start organizing records for USDA and county health department reviews.
            EvidLY organizes your records — USDA and your jurisdiction determine outcomes.
          </p>
          <button
            onClick={() => guardAction('k12_setup', 'K-12 setup', () => alert('Configure K-12 fields in Settings → Organization'))}
            style={{
              background: '#1E2D4D', color: 'white', padding: '14px 28px', borderRadius: 10,
              fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Plus size={18} /> Configure Schools
          </button>
        </div>
        {showUpgrade && <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  const TABS = [
    { id: 'readiness' as const, label: 'Audit Readiness', icon: ShieldCheck },
    { id: 'authority' as const, label: 'Dual Authority', icon: Building2 },
    { id: 'meals' as const, label: 'Meal Metrics', icon: TrendingUp },
    { id: 'claims' as const, label: 'NSLP Claims', icon: ClipboardList },
  ];

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'K-12 Food Safety' }]} />
      <div className="space-y-6">

        {/* ── Header Banner ─────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #1E2D4D 0%, #2E4270 100%)',
          borderRadius: 16, padding: '28px 32px', color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <School size={28} style={{ color: '#93C5FD' }} />
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>K-12 Food Safety</h2>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            Lead with confidence — your records are organized for USDA and county health department reviews.
          </p>
        </div>

        {/* ── Tab Navigation ────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 12, padding: 4, overflowX: 'auto' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: '1 1 0', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isActive ? 'white' : 'transparent',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#111827' : '#6b7280',
                  fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════
            TAB 1: AUDIT READINESS
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'readiness' && (
          <div className="space-y-6">
            {/* School Selector */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid',
                    borderColor: selectedLocation === loc.id ? '#1D4ED8' : '#d1d5db',
                    background: selectedLocation === loc.id ? '#EFF6FF' : 'white',
                    color: selectedLocation === loc.id ? '#1D4ED8' : '#374151',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <School size={14} /> {loc.name}
                </button>
              ))}
            </div>

            {selectedLoc && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Readiness Circle */}
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 16px' }}>
                    <svg viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="70" cy="70" r="60" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                      <circle cx="70" cy="70" r="60" fill="none"
                        stroke={readinessPercent >= 85 ? '#40916C' : readinessPercent >= 60 ? '#D97706' : '#EF4444'}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${(readinessPercent / 100) * 377} 377`} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 32, fontWeight: 800, color: '#111827' }}>{readinessPercent}%</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>records ready</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{selectedLoc.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{selectedLoc.district_name}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, fontSize: 11 }}>
                    <span style={{ color: '#40916C' }}>{readyCount} ready</span>
                    <span style={{ color: '#D97706' }}>{selectedReadiness.filter(r => r.status === 'gap').length} gaps</span>
                    <span style={{ color: '#EF4444' }}>{selectedReadiness.filter(r => r.status === 'missing').length} missing</span>
                  </div>
                </div>

                {/* Readiness Items */}
                <div className="lg:col-span-2" style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Documentation Readiness</h3>
                    <p style={{ fontSize: 12, color: '#9ca3af' }}>Sourced from your existing EvidLY records</p>
                  </div>
                  {selectedReadiness.map((item, i) => {
                    const colors = STATUS_COLORS[item.status];
                    const auth = AUTHORITY_LABELS[item.authority];
                    return (
                      <div key={i} style={{
                        padding: '12px 20px', borderBottom: i < selectedReadiness.length - 1 ? '1px solid #f3f4f6' : 'none',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        {item.status === 'ready' ? (
                          <CheckCircle2 size={16} style={{ color: colors.icon, flexShrink: 0 }} />
                        ) : item.status === 'gap' ? (
                          <AlertTriangle size={16} style={{ color: colors.icon, flexShrink: 0 }} />
                        ) : (
                          <AlertCircle size={16} style={{ color: colors.icon, flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{item.detail}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: `${auth.color}15`, color: auth.color }}>{auth.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: colors.bg, color: colors.text }}>
                          {item.status === 'ready' ? 'On File' : item.status === 'gap' ? 'Gap' : 'Missing'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Next Reviews + Data Sources */}
            {selectedLoc && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} /> Upcoming Reviews
                  </div>
                  <div className="space-y-3">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#6b7280' }}>USDA Administrative Review</span>
                      <span style={{ fontWeight: 600, color: selectedLoc.usda_review_date ? '#1D4ED8' : '#9ca3af' }}>
                        {selectedLoc.usda_review_date ? formatDate(selectedLoc.usda_review_date) : 'Not scheduled'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#6b7280' }}>County EH Routine Inspection</span>
                      <span style={{ fontWeight: 600, color: '#9ca3af' }}>Per jurisdiction schedule</span>
                    </div>
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} /> Data Sources
                  </div>
                  <div className="space-y-2" style={{ fontSize: 12, color: '#6b7280' }}>
                    <div>Core: Temp Logs, Checklists, Documents</div>
                    <div>Core: Employee Certifications, Inspections</div>
                    <div>K-12 Fields: USDA review date, NSLP enrollment</div>
                    <div>K-12 Input: Daily meal counts</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 2: DUAL AUTHORITY
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'authority' && (
          <div className="space-y-6">
            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>County EH vs USDA Requirements</h3>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Same kitchen, two authorities — one view</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 700, color: '#111827', fontSize: 12 }}>Requirement</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 700, fontSize: 12 }}>
                        <span style={{ color: '#7C3AED' }}>County Environmental Health</span>
                      </th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 700, fontSize: 12 }}>
                        <span style={{ color: '#1D4ED8' }}>USDA / Child Nutrition</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {DUAL_AUTHORITY_ROWS.map((row, i) => (
                      <tr key={i} style={{ borderBottom: i < DUAL_AUTHORITY_ROWS.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '12px 20px', fontWeight: 600, color: '#111827' }}>{row.requirement}</td>
                        <td style={{ padding: '12px 20px', color: '#374151' }}>{row.county}</td>
                        <td style={{ padding: '12px 20px', color: '#374151' }}>{row.usda}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Authority Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Building2 size={16} style={{ color: '#7C3AED' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#5B21B6' }}>County Environmental Health</span>
                </div>
                <p style={{ fontSize: 12, color: '#6D28D9', lineHeight: 1.6 }}>
                  Routine unannounced inspections per California Retail Food Code. Frequency based on risk category.
                  Inspectors verify food temperatures, sanitation, pest control, and food handler certifications.
                </p>
              </div>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <ShieldCheck size={16} style={{ color: '#1D4ED8' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1E2D4D' }}>USDA Child Nutrition Programs</span>
                </div>
                <p style={{ fontSize: 12, color: '#1E3A5F', lineHeight: 1.6 }}>
                  Administrative reviews every 3 years for NSLP schools. Reviewers assess meal pattern compliance,
                  production records, CN label documentation, and food safety program implementation.
                </p>
                <a href="https://www.fns.usda.gov/cn" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, textDecoration: 'none' }}>
                  USDA Child Nutrition Resources <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 3: MEAL METRICS
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'meals' && (
          <div className="space-y-6">
            {/* District Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #1D4ED8' }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>District Total — Daily</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1E2D4D' }}>{totalDailyMeals.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>meals/day across {locations.length} schools</div>
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #059669' }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>NSLP Enrolled</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1E2D4D' }}>{locations.filter(l => l.nslp_enrolled).length}/{locations.length}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>schools in NSLP</div>
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #7C3AED' }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>USDA Commodities</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1E2D4D' }}>{locations.filter(l => l.usda_commodities).length}/{locations.length}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>schools receiving commodities</div>
              </div>
            </div>

            {/* Per-School Cards */}
            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Per-School Meal Summary</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>School</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>District</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Avg/Day</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>NSLP</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Commodities</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Next USDA Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc, i) => (
                      <tr key={loc.id} style={{ borderBottom: i < locations.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '10px 20px', fontWeight: 600, color: '#111827' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <School size={14} style={{ color: '#1D4ED8' }} /> {loc.name}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#6b7280' }}>{loc.district_name || '--'}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#1E2D4D' }}>
                          {loc.meal_count_daily?.toLocaleString() || '--'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          {loc.nslp_enrolled ? <CheckCircle2 size={16} style={{ color: '#40916C', margin: '0 auto' }} /> : <span style={{ color: '#9ca3af' }}>--</span>}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          {loc.usda_commodities ? <CheckCircle2 size={16} style={{ color: '#40916C', margin: '0 auto' }} /> : <span style={{ color: '#9ca3af' }}>--</span>}
                        </td>
                        <td style={{ padding: '10px 16px', color: loc.usda_review_date ? '#1D4ED8' : '#9ca3af', fontWeight: 500 }}>
                          {formatDate(loc.usda_review_date)}
                        </td>
                      </tr>
                    ))}
                    {/* District Total Row */}
                    <tr style={{ background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                      <td style={{ padding: '10px 20px', fontWeight: 700, color: '#111827' }}>District Total</td>
                      <td style={{ padding: '10px 16px', color: '#6b7280' }}>{locations[0]?.district_name || '--'}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#1E2D4D' }}>{totalDailyMeals.toLocaleString()}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>
                        {locations.filter(l => l.nslp_enrolled).length}/{locations.length}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>
                        {locations.filter(l => l.usda_commodities).length}/{locations.length}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 4: NSLP CLAIMS
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'claims' && (
          <div className="space-y-6">
            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>NSLP Claim Periods</h3>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Track meal count documentation completeness per claim period</p>
              </div>
              <button
                onClick={() => {
                  setClaimForm({ location_id: locations[0]?.id || '', claim_period: '', meal_count_total: '', meal_count_daily_avg: '', notes: '' });
                  guardAction('nslp_claim', 'NSLP claim', () => setShowClaimForm(true));
                }}
                style={{
                  background: '#1E2D4D', color: 'white', padding: '10px 20px', borderRadius: 10,
                  fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <Plus size={16} /> Log Claim Period
              </button>
            </div>

            {/* School Selector */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid',
                    borderColor: selectedLocation === loc.id ? '#1D4ED8' : '#d1d5db',
                    background: selectedLocation === loc.id ? '#EFF6FF' : 'white',
                    color: selectedLocation === loc.id ? '#1D4ED8' : '#374151',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <School size={14} /> {loc.name}
                </button>
              ))}
            </div>

            {/* Claims Table */}
            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Claim Period</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Total Meals</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Avg/Day</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Submitted</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationClaims.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af' }}>
                          No claim periods logged for this school yet.
                        </td>
                      </tr>
                    ) : locationClaims.map((claim, i) => (
                      <tr key={claim.id} style={{ borderBottom: i < locationClaims.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '10px 20px', fontWeight: 600, color: '#111827' }}>{claim.claim_period}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#1E2D4D' }}>
                          {claim.meal_count_total?.toLocaleString() || '--'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#374151' }}>
                          {claim.meal_count_daily_avg ? Math.round(claim.meal_count_daily_avg).toLocaleString() : '--'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          {claim.claim_submitted ? (
                            <div>
                              <CheckCircle2 size={16} style={{ color: '#40916C', margin: '0 auto' }} />
                              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{formatDate(claim.claim_submitted_at)}</div>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12 }}>{claim.notes || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* NSLP Info */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <ShieldCheck size={18} style={{ color: '#1D4ED8', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#1E2D4D', marginBottom: 4 }}>NSLP Claim Documentation</p>
                <p style={{ fontSize: 11, color: '#1e3a5f', lineHeight: 1.6 }}>
                  EvidLY organizes your meal count records and supporting documentation for NSLP claim periods.
                  Submit your official claims through your state agency's designated system.
                  Documentation completeness is based on your existing EvidLY records (temp logs, checklists, documents).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Messaging Standard Footer ─────────────────────── */}
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, color: '#9ca3af' }}>
          EvidLY organizes your records — USDA and your jurisdiction determine outcomes.
        </div>
      </div>

      {/* ── NSLP Claim Form Modal ─────────────────────────────── */}
      {showClaimForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setShowClaimForm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, maxWidth: 480, width: '100%',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Log Claim Period</h3>
                <p style={{ fontSize: 12, color: '#6b7280' }}>Record meal counts for an NSLP claim period</p>
              </div>
              <button onClick={() => setShowClaimForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} style={{ color: '#9ca3af' }} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }} className="space-y-4">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>School</label>
                <select
                  value={claimForm.location_id}
                  onChange={e => setClaimForm(p => ({ ...p, location_id: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                >
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Claim Period (e.g., 2026-03)</label>
                <input
                  type="text" placeholder="2026-03"
                  value={claimForm.claim_period}
                  onChange={e => setClaimForm(p => ({ ...p, claim_period: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Total Meals</label>
                  <input
                    type="number" min="0" placeholder="0"
                    value={claimForm.meal_count_total}
                    onChange={e => setClaimForm(p => ({ ...p, meal_count_total: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Avg/Day</label>
                  <input
                    type="number" min="0" placeholder="0"
                    value={claimForm.meal_count_daily_avg}
                    onChange={e => setClaimForm(p => ({ ...p, meal_count_daily_avg: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Notes</label>
                <textarea
                  rows={2} placeholder="Optional notes..."
                  value={claimForm.notes}
                  onChange={e => setClaimForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 11, color: '#9ca3af' }}>Submit official claims through your state agency.</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowClaimForm(false)}
                  style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClaimSubmit}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1E2D4D', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpgrade && <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />}
    </>
  );
}
