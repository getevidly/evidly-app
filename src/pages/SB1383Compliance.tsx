import { useState, useEffect } from 'react';
import {
  Recycle, Plus, MapPin, Building2, FileText, CheckCircle2, AlertTriangle,
  ExternalLink, Calendar, Truck, Scale, Users, X, ChevronDown, ChevronUp,
  Download, Clock, AlertCircle, ClipboardList,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { locations as demoLocations } from '../data/demoData';

// ── Types ──────────────────────────────────────────────────────
interface SB1383Entry {
  id: string;
  location_id: string;
  location_name: string;
  reporting_period: string;
  edible_food_recovery_lbs: number;
  organic_waste_diverted_lbs: number;
  food_recovery_partner: string | null;
  food_recovery_partner_contact: string | null;
  food_recovery_agreement_on_file: boolean;
  hauler_name: string | null;
  hauler_service_frequency: string | null;
  hauler_provides_organics: boolean;
  weight_tickets_on_file: boolean;
  generator_tier: number | null;
  recovery_plan_on_file: boolean;
  last_inspection_date: string | null;
  inspection_notes: string | null;
  notes: string | null;
  created_at: string;
}

// ── Demo Data ──────────────────────────────────────────────────
const DEMO_ENTRIES: SB1383Entry[] = [
  {
    id: 'sb-d1', location_id: '1', location_name: 'Location 1 — Downtown',
    reporting_period: 'Q1 2026', edible_food_recovery_lbs: 310,
    organic_waste_diverted_lbs: 2100,
    food_recovery_partner: 'Fresno Community Food Bank',
    food_recovery_partner_contact: 'Maria Lopez · (559) 221-1611',
    food_recovery_agreement_on_file: true,
    hauler_name: 'Valley Waste Services', hauler_service_frequency: 'Weekly',
    hauler_provides_organics: true, weight_tickets_on_file: true,
    generator_tier: 1, recovery_plan_on_file: true,
    last_inspection_date: '2026-02-01', inspection_notes: 'Passed — records complete',
    notes: null, created_at: '2026-02-05T10:30:00Z',
  },
  {
    id: 'sb-d2', location_id: '2', location_name: 'Location 2 — Airport',
    reporting_period: 'Q1 2026', edible_food_recovery_lbs: 120,
    organic_waste_diverted_lbs: 940,
    food_recovery_partner: null, food_recovery_partner_contact: null,
    food_recovery_agreement_on_file: false,
    hauler_name: 'CalWaste Inc.', hauler_service_frequency: 'Bi-weekly',
    hauler_provides_organics: true, weight_tickets_on_file: false,
    generator_tier: 2, recovery_plan_on_file: false,
    last_inspection_date: null, inspection_notes: null,
    notes: 'Need to establish food recovery partner', created_at: '2026-02-10T14:00:00Z',
  },
  {
    id: 'sb-d3', location_id: '3', location_name: 'Location 3 — University',
    reporting_period: 'Q1 2026', edible_food_recovery_lbs: 240,
    organic_waste_diverted_lbs: 1800,
    food_recovery_partner: 'Central Valley Food Alliance',
    food_recovery_partner_contact: 'James Ortega · (209) 385-7460',
    food_recovery_agreement_on_file: true,
    hauler_name: 'GreenWaste Solutions', hauler_service_frequency: 'Weekly',
    hauler_provides_organics: true, weight_tickets_on_file: true,
    generator_tier: 1, recovery_plan_on_file: true,
    last_inspection_date: '2026-01-15', inspection_notes: 'Compliant — all agreements current',
    notes: null, created_at: '2026-01-20T09:15:00Z',
  },
];

const PERIODS = ['Q1 2026', 'Q4 2025', 'Q3 2025', 'Q2 2025', 'Q1 2025'];
const FREQUENCIES = ['Daily', 'Twice a week', 'Weekly', 'Bi-weekly', 'Monthly'];

// ── Helpers ────────────────────────────────────────────────────
function formatDate(d: string | null): string {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysUntilApril1(): number {
  const now = new Date();
  const thisYear = now.getFullYear();
  let apr1 = new Date(thisYear, 3, 1); // April 1 this year
  if (now > apr1) apr1 = new Date(thisYear + 1, 3, 1);
  return Math.ceil((apr1.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Component ──────────────────────────────────────────────────
export function SB1383Compliance() {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [entries, setEntries] = useState<SB1383Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  // Form state
  const [formData, setFormData] = useState({
    location_id: '',
    reporting_period: PERIODS[0],
    edible_food_recovery_lbs: '',
    organic_waste_diverted_lbs: '',
    food_recovery_partner: '',
    food_recovery_partner_contact: '',
    food_recovery_agreement_on_file: false,
    hauler_name: '',
    hauler_service_frequency: 'Weekly',
    hauler_provides_organics: false,
    weight_tickets_on_file: false,
    generator_tier: '1',
    recovery_plan_on_file: false,
    last_inspection_date: '',
    inspection_notes: '',
    notes: '',
  });

  useEffect(() => {
    if (isDemoMode) {
      setEntries(DEMO_ENTRIES);
      setLoading(false);
      return;
    }

    async function fetchEntries() {
      const { data } = await supabase
        .from('sb1383_compliance')
        .select('*, locations(name)')
        .eq('organization_id', profile?.organization_id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setEntries(data.map((r: any) => ({
          id: r.id,
          location_id: r.location_id,
          location_name: r.locations?.name || 'Unknown',
          reporting_period: r.reporting_period,
          edible_food_recovery_lbs: r.edible_food_recovery_lbs || 0,
          organic_waste_diverted_lbs: r.organic_waste_diverted_lbs || 0,
          food_recovery_partner: r.food_recovery_partner,
          food_recovery_partner_contact: r.food_recovery_partner_contact,
          food_recovery_agreement_on_file: r.food_recovery_agreement_on_file || false,
          hauler_name: r.hauler_name,
          hauler_service_frequency: r.hauler_service_frequency,
          hauler_provides_organics: r.hauler_provides_organics || false,
          weight_tickets_on_file: r.weight_tickets_on_file || false,
          generator_tier: r.generator_tier,
          recovery_plan_on_file: r.recovery_plan_on_file || false,
          last_inspection_date: r.last_inspection_date,
          inspection_notes: r.inspection_notes,
          notes: r.notes,
          created_at: r.created_at,
        })));
      } else {
        setEntries([]);
      }
      setLoading(false);
    }

    fetchEntries();
  }, [isDemoMode, profile]);

  // ── Computed KPIs ────────────────────────────────────────────
  const totalRecovery = entries.reduce((sum, e) => sum + e.edible_food_recovery_lbs, 0);
  const totalOrganic = entries.reduce((sum, e) => sum + e.organic_waste_diverted_lbs, 0);
  const diversionRate = totalOrganic > 0 ? Math.round((totalRecovery / totalOrganic) * 100) : 0;
  const withAgreement = entries.filter(e => e.food_recovery_agreement_on_file).length;
  const withWeightTickets = entries.filter(e => e.weight_tickets_on_file).length;
  const withRecoveryPlan = entries.filter(e => e.recovery_plan_on_file).length;
  const daysUntilApril1 = getDaysUntilApril1();

  // Group entries by location
  const locationMap = new Map<string, SB1383Entry[]>();
  entries.forEach(e => {
    const existing = locationMap.get(e.location_id) || [];
    existing.push(e);
    locationMap.set(e.location_id, existing);
  });

  // ── Form Submit ──────────────────────────────────────────────
  async function handleSubmit() {
    guardAction('sb1383_log', 'SB 1383 log entry', async () => {
      const locName = isDemoMode
        ? demoLocations.find(l => l.id === formData.location_id)?.name || 'Unknown'
        : 'New Entry';

      if (isDemoMode) {
        const newEntry: SB1383Entry = {
          id: `sb-new-${Date.now()}`,
          location_id: formData.location_id,
          location_name: locName,
          reporting_period: formData.reporting_period,
          edible_food_recovery_lbs: Number(formData.edible_food_recovery_lbs) || 0,
          organic_waste_diverted_lbs: Number(formData.organic_waste_diverted_lbs) || 0,
          food_recovery_partner: formData.food_recovery_partner || null,
          food_recovery_partner_contact: formData.food_recovery_partner_contact || null,
          food_recovery_agreement_on_file: formData.food_recovery_agreement_on_file,
          hauler_name: formData.hauler_name || null,
          hauler_service_frequency: formData.hauler_service_frequency || null,
          hauler_provides_organics: formData.hauler_provides_organics,
          weight_tickets_on_file: formData.weight_tickets_on_file,
          generator_tier: Number(formData.generator_tier) || null,
          recovery_plan_on_file: formData.recovery_plan_on_file,
          last_inspection_date: formData.last_inspection_date || null,
          inspection_notes: formData.inspection_notes || null,
          notes: formData.notes || null,
          created_at: new Date().toISOString(),
        };
        setEntries(prev => [newEntry, ...prev]);
        setShowForm(false);
        alert('Entry logged (demo mode — data not saved to server)');
        return;
      }

      const { error } = await supabase.from('sb1383_compliance').insert({
        organization_id: profile?.organization_id,
        location_id: formData.location_id || null,
        reporting_period: formData.reporting_period,
        edible_food_recovery_lbs: Number(formData.edible_food_recovery_lbs) || 0,
        organic_waste_diverted_lbs: Number(formData.organic_waste_diverted_lbs) || 0,
        food_recovery_partner: formData.food_recovery_partner || null,
        food_recovery_partner_contact: formData.food_recovery_partner_contact || null,
        food_recovery_agreement_on_file: formData.food_recovery_agreement_on_file,
        hauler_name: formData.hauler_name || null,
        hauler_service_frequency: formData.hauler_service_frequency || null,
        hauler_provides_organics: formData.hauler_provides_organics,
        weight_tickets_on_file: formData.weight_tickets_on_file,
        generator_tier: Number(formData.generator_tier) || null,
        recovery_plan_on_file: formData.recovery_plan_on_file,
        last_inspection_date: formData.last_inspection_date || null,
        inspection_notes: formData.inspection_notes || null,
        notes: formData.notes || null,
        created_by: profile?.id,
      });

      if (!error) {
        setShowForm(false);
        window.location.reload();
      } else {
        alert('Error saving entry: ' + error.message);
      }
    });
  }

  // ── Empty State ──────────────────────────────────────────────
  if (!loading && entries.length === 0 && !isDemoMode) {
    return (
      <>
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'SB 1383 Compliance' }]} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{'♻️'}</div>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: '#1E2D4D', marginBottom: 8 }}>No SB 1383 records yet</h3>
          <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 480, lineHeight: 1.7, marginBottom: 28 }}>
            Start tracking organic waste diversion and food recovery for your California locations.
            EvidLY documents your records — your jurisdiction determines compliance.
          </p>
          <button
            onClick={() => guardAction('sb1383_log', 'SB 1383 log entry', () => setShowForm(true))}
            style={{
              background: '#1B4332', color: 'white', padding: '14px 28px', borderRadius: 10,
              fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Plus size={18} /> Log First Entry
          </button>
        </div>
        {showUpgrade && <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'SB 1383 Compliance' }]} />
      <div className="space-y-6">

        {/* ── Header Banner ─────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
          borderRadius: 16, padding: '28px 32px', color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Recycle size={28} style={{ color: '#95D5B2' }} />
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>SB 1383 Organic Waste Reduction</h2>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            Track organic waste diversion, food recovery partnerships, hauler records, and inspection notes.
            EvidLY documents what happened — your jurisdiction determines compliance.
          </p>
        </div>

        {/* ── April 1 Deadline Alert ────────────────────────── */}
        {daysUntilApril1 <= 90 && (
          <div style={{
            background: daysUntilApril1 <= 30 ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${daysUntilApril1 <= 30 ? '#fecaca' : '#fde68a'}`,
            borderRadius: 12, padding: '16px 20px',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <AlertCircle size={20} style={{ color: daysUntilApril1 <= 30 ? '#dc2626' : '#d97706', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: daysUntilApril1 <= 30 ? '#991b1b' : '#92400e', marginBottom: 4 }}>
                Annual Report Deadline: April 1 — {daysUntilApril1} days remaining
              </p>
              <p style={{ fontSize: 12, color: daysUntilApril1 <= 30 ? '#b91c1c' : '#a16207', lineHeight: 1.6 }}>
                CalRecycle requires Tier 1 and Tier 2 commercial edible food generators to submit annual reports
                documenting organic waste diversion and food recovery activities. Ensure all location records are complete.
              </p>
              <button
                onClick={() => guardAction('sb1383_report', 'annual report', () => setShowReportModal(true))}
                style={{
                  marginTop: 8, background: daysUntilApril1 <= 30 ? '#dc2626' : '#d97706',
                  color: 'white', padding: '6px 16px', borderRadius: 8,
                  fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <FileText size={14} /> Generate Annual Report
              </button>
            </div>
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #40916C' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Edible Food Recovered</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1B4332' }}>{totalRecovery.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>lbs this period</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #2D6A4F' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Organic Waste Diverted</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1E2D4D' }}>{totalOrganic.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>lbs this period</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #52B788' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Recovery Rate</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: diversionRate >= 20 ? '#40916C' : '#f59e0b' }}>{diversionRate}%</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>edible food / organic waste</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #95D5B2' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Documentation</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1E2D4D' }}>{withAgreement}/{entries.length}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>agreements on file</div>
          </div>
        </div>

        {/* ── Actions Bar ───────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => guardAction('sb1383_log', 'SB 1383 log entry', () => setShowForm(true))}
            style={{
              background: '#1B4332', color: 'white', padding: '10px 20px', borderRadius: 10,
              fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Plus size={16} /> Log Entry
          </button>
          <button
            onClick={() => guardAction('sb1383_report', 'annual report', () => setShowReportModal(true))}
            style={{
              background: 'white', color: '#1B4332', padding: '10px 20px', borderRadius: 10,
              fontWeight: 700, fontSize: 14, border: '1px solid #d1d5db', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Download size={16} /> Annual Report
          </button>
        </div>

        {/* ── Per-Location Cards ─────────────────────────────── */}
        {Array.from(locationMap.entries()).map(([locId, locEntries]) => {
          const latest = locEntries[0];
          const isExpanded = expandedLocation === locId;
          const locRecovery = locEntries.reduce((s, e) => s + e.edible_food_recovery_lbs, 0);
          const locOrganic = locEntries.reduce((s, e) => s + e.organic_waste_diverted_lbs, 0);
          const locRate = locOrganic > 0 ? Math.round((locRecovery / locOrganic) * 100) : 0;

          // Readiness checks
          const checks = [
            { label: 'Recovery agreement', ok: latest.food_recovery_agreement_on_file },
            { label: 'Weight tickets', ok: latest.weight_tickets_on_file },
            { label: 'Recovery plan', ok: latest.recovery_plan_on_file },
            { label: 'Organics hauler', ok: latest.hauler_provides_organics },
          ];
          const readyCount = checks.filter(c => c.ok).length;

          return (
            <div key={locId} style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              {/* Location Header */}
              <button
                onClick={() => setExpandedLocation(isExpanded ? null : locId)}
                style={{
                  width: '100%', padding: '16px 24px', border: 'none', background: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Building2 size={16} style={{ color: '#40916C' }} />
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{latest.location_name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: latest.generator_tier === 1 ? '#D8F3DC' : '#e5e7eb',
                      color: latest.generator_tier === 1 ? '#1B4332' : '#374151',
                    }}>
                      Tier {latest.generator_tier || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#6b7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Scale size={12} /> {locRecovery.toLocaleString()} lbs recovered</span>
                    <span>·</span>
                    <span>Rate: <strong style={{ color: locRate >= 20 ? '#40916C' : '#f59e0b' }}>{locRate}%</strong></span>
                    <span>·</span>
                    <span>{readyCount}/4 ready</span>
                  </div>
                </div>

                {/* Readiness dots */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {checks.map((c, i) => (
                    <div key={i} title={c.label} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: c.ok ? '#40916C' : '#e5e7eb',
                    }} />
                  ))}
                </div>

                {isExpanded ? <ChevronUp size={18} style={{ color: '#9ca3af' }} /> : <ChevronDown size={18} style={{ color: '#9ca3af' }} />}
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 24px' }}>
                  {/* Latest entry details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>FOOD RECOVERY PARTNER</div>
                      {latest.food_recovery_partner ? (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{latest.food_recovery_partner}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{latest.food_recovery_partner_contact}</div>
                        </>
                      ) : (
                        <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={14} /> Not established
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>HAULER</div>
                      {latest.hauler_name ? (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{latest.hauler_name}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            {latest.hauler_service_frequency} · {latest.hauler_provides_organics ? 'Organics service' : 'No organics'}
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: 13, color: '#9ca3af' }}>No hauler recorded</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>LAST INSPECTION</div>
                      {latest.last_inspection_date ? (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{formatDate(latest.last_inspection_date)}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{latest.inspection_notes || 'No notes'}</div>
                        </>
                      ) : (
                        <span style={{ fontSize: 13, color: '#9ca3af' }}>No inspection on record</span>
                      )}
                    </div>
                  </div>

                  {/* Readiness checklist */}
                  <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ClipboardList size={14} /> Documentation Readiness
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {checks.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          {c.ok ? (
                            <CheckCircle2 size={14} style={{ color: '#40916C' }} />
                          ) : (
                            <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                          )}
                          <span style={{ color: c.ok ? '#374151' : '#92400e', fontWeight: 500 }}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* History table for this location */}
                  {locEntries.length > 1 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Entry History</div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Period</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>Recovered</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>Diverted</th>
                              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Logged</th>
                            </tr>
                          </thead>
                          <tbody>
                            {locEntries.map(e => (
                              <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '6px 8px', fontWeight: 500, color: '#111827' }}>{e.reporting_period}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#40916C', fontWeight: 600 }}>{e.edible_food_recovery_lbs.toLocaleString()} lbs</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#374151' }}>{e.organic_waste_diverted_lbs.toLocaleString()} lbs</td>
                                <td style={{ padding: '6px 8px', color: '#9ca3af' }}>{formatDate(e.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── All Entries History Table ──────────────────────── */}
        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>All Entries</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Location</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Period</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Recovered</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Diverted</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Agreement</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Tickets</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Logged</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: i < entries.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#111827' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building2 size={14} style={{ color: '#6b7280' }} />
                        {e.location_name}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#374151' }}>{e.reporting_period}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#40916C', fontWeight: 600 }}>{e.edible_food_recovery_lbs.toLocaleString()} lbs</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#374151' }}>{e.organic_waste_diverted_lbs.toLocaleString()} lbs</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      {e.food_recovery_agreement_on_file ? (
                        <CheckCircle2 size={16} style={{ color: '#40916C', margin: '0 auto' }} />
                      ) : (
                        <AlertTriangle size={16} style={{ color: '#f59e0b', margin: '0 auto' }} />
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      {e.weight_tickets_on_file ? (
                        <CheckCircle2 size={16} style={{ color: '#40916C', margin: '0 auto' }} />
                      ) : (
                        <AlertTriangle size={16} style={{ color: '#f59e0b', margin: '0 auto' }} />
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: 12 }}>{formatDate(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── CalRecycle Info Banner ─────────────────────────── */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Recycle size={18} style={{ color: '#15803d', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#15803d', marginBottom: 4 }}>About SB 1383</p>
            <p style={{ fontSize: 11, color: '#166534', lineHeight: 1.6 }}>
              California Senate Bill 1383 (Short-Lived Climate Pollutants Act) requires a 75% reduction in organic waste
              disposal by 2025. Tier 1 and Tier 2 commercial edible food generators must arrange for organic waste collection,
              maintain edible food recovery agreements, and submit annual reports by April 1. EvidLY helps you document
              your compliance activities — your local jurisdiction and CalRecycle determine compliance status.
            </p>
            <a href="https://calrecycle.ca.gov/organics/slcp/" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, textDecoration: 'none' }}>
              CalRecycle SB 1383 Resources <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* ── Log Entry Form Modal ──────────────────────────────── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setShowForm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, maxWidth: 640, width: '100%',
              maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Log SB 1383 Entry</h3>
                <p style={{ fontSize: 12, color: '#6b7280' }}>Document organic waste diversion and food recovery activity</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} style={{ color: '#9ca3af' }} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }} className="space-y-5">
              {/* Location + Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />Location
                  </label>
                  <select
                    value={formData.location_id}
                    onChange={e => setFormData(p => ({ ...p, location_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                  >
                    <option value="">Select location...</option>
                    {(isDemoMode ? demoLocations : []).map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />Reporting Period
                  </label>
                  <select
                    value={formData.reporting_period}
                    onChange={e => setFormData(p => ({ ...p, reporting_period: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                  >
                    {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Weight Tracking */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Scale size={14} /> Weight Tracking
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Edible Food Recovered (lbs)</label>
                    <input
                      type="number" min="0" placeholder="0"
                      value={formData.edible_food_recovery_lbs}
                      onChange={e => setFormData(p => ({ ...p, edible_food_recovery_lbs: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Organic Waste Diverted (lbs)</label>
                    <input
                      type="number" min="0" placeholder="0"
                      value={formData.organic_waste_diverted_lbs}
                      onChange={e => setFormData(p => ({ ...p, organic_waste_diverted_lbs: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>

              {/* Food Recovery Partner */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} /> Food Recovery Partner
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Partner Name</label>
                    <input
                      type="text" placeholder="e.g., Fresno Food Bank"
                      value={formData.food_recovery_partner}
                      onChange={e => setFormData(p => ({ ...p, food_recovery_partner: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Contact</label>
                    <input
                      type="text" placeholder="e.g., Maria Lopez · (559) 221-1611"
                      value={formData.food_recovery_partner_contact}
                      onChange={e => setFormData(p => ({ ...p, food_recovery_partner_contact: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                    />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={formData.food_recovery_agreement_on_file}
                    onChange={e => setFormData(p => ({ ...p, food_recovery_agreement_on_file: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: '#40916C' }}
                  />
                  Food recovery agreement on file
                </label>
              </div>

              {/* Hauler Info */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Truck size={14} /> Hauler Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Hauler Name</label>
                    <input
                      type="text" placeholder="e.g., Valley Waste Services"
                      value={formData.hauler_name}
                      onChange={e => setFormData(p => ({ ...p, hauler_name: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Service Frequency</label>
                    <select
                      value={formData.hauler_service_frequency}
                      onChange={e => setFormData(p => ({ ...p, hauler_service_frequency: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                    >
                      {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 mt-3">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={formData.hauler_provides_organics}
                      onChange={e => setFormData(p => ({ ...p, hauler_provides_organics: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: '#40916C' }}
                    />
                    Hauler provides organics collection
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={formData.weight_tickets_on_file}
                      onChange={e => setFormData(p => ({ ...p, weight_tickets_on_file: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: '#40916C' }}
                    />
                    Weight tickets on file
                  </label>
                </div>
              </div>

              {/* Generator Tier + Recovery Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Generator Tier</label>
                  <select
                    value={formData.generator_tier}
                    onChange={e => setFormData(p => ({ ...p, generator_tier: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                  >
                    <option value="1">Tier 1 — Large food generators</option>
                    <option value="2">Tier 2 — Restaurants, hotels, health facilities</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={formData.recovery_plan_on_file}
                      onChange={e => setFormData(p => ({ ...p, recovery_plan_on_file: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: '#40916C' }}
                    />
                    Recovery plan on file
                  </label>
                </div>
              </div>

              {/* Inspection */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} /> Inspection Record
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Last Inspection Date</label>
                    <input
                      type="date"
                      value={formData.last_inspection_date}
                      onChange={e => setFormData(p => ({ ...p, last_inspection_date: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Inspection Notes</label>
                    <input
                      type="text" placeholder="e.g., Passed — records complete"
                      value={formData.inspection_notes}
                      onChange={e => setFormData(p => ({ ...p, inspection_notes: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Additional Notes</label>
                <textarea
                  rows={2} placeholder="Optional notes..."
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Form Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #e5e7eb',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <p style={{ fontSize: 11, color: '#9ca3af', maxWidth: 300 }}>
                EvidLY documents your records. Your jurisdiction determines compliance.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1B4332', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Annual Report Modal ───────────────────────────────── */}
      {showReportModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setShowReportModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, maxWidth: 520, width: '100%',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Annual Report Summary</h3>
                <p style={{ fontSize: 12, color: '#6b7280' }}>CalRecycle annual reporting period summary</p>
              </div>
              <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} style={{ color: '#9ca3af' }} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#1B4332' }}>{totalRecovery.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>lbs food recovered</div>
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#2D6A4F' }}>{totalOrganic.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>lbs waste diverted</div>
                </div>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Readiness Summary</div>
                <div className="space-y-2">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}>Locations with entries</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{locationMap.size}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}>Agreements on file</span>
                    <span style={{ fontWeight: 600, color: withAgreement === entries.length ? '#40916C' : '#f59e0b' }}>{withAgreement}/{entries.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}>Weight tickets on file</span>
                    <span style={{ fontWeight: 600, color: withWeightTickets === entries.length ? '#40916C' : '#f59e0b' }}>{withWeightTickets}/{entries.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}>Recovery plans on file</span>
                    <span style={{ fontWeight: 600, color: withRecoveryPlan === entries.length ? '#40916C' : '#f59e0b' }}>{withRecoveryPlan}/{entries.length}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', fontSize: 11, color: '#92400e', lineHeight: 1.6 }}>
                <strong>Note:</strong> This is a summary of records documented in EvidLY. Your local jurisdiction and CalRecycle
                determine compliance status. Submit your official report through your jurisdiction's designated portal.
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setShowReportModal(false)}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert('Report export — coming soon. Use your jurisdiction\'s designated portal for official submission.');
                  setShowReportModal(false);
                }}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1B4332', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} /> Export Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgrade && <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />}
    </>
  );
}
