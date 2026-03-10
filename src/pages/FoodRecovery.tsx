import { useState, useEffect } from 'react';
import { Recycle, Plus, MapPin, Building2, FileText, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

interface FoodRecoveryLocation {
  id: string;
  name: string;
  city: string;
  tier: number;
  recovery: number;
  organic: number;
  partner: string | null;
  partnerContact: string | null;
  plan: boolean;
  lastInspection: string | null;
  result: string | null;
}

const SB1383_DEMO_DATA: FoodRecoveryLocation[] = [
  { id: 'demo-1', name: 'Main Kitchen', city: 'Fresno', tier: 1, recovery: 310, organic: 2100, partner: 'Fresno Food Bank', partnerContact: 'Maria Lopez · (559) 221-1611', plan: true, lastInspection: 'Feb 1, 2026', result: 'Compliant' },
  { id: 'demo-2', name: 'Catering Hub', city: 'Modesto', tier: 2, recovery: 120, organic: 940, partner: null, partnerContact: null, plan: false, lastInspection: null, result: null },
  { id: 'demo-3', name: 'Central Kitchen', city: 'Merced', tier: 1, recovery: 240, organic: 1800, partner: 'Merced County Food Bank', partnerContact: 'James Ortega · (209) 385-7460', plan: true, lastInspection: 'Jan 15, 2026', result: 'Compliant' },
];

export function FoodRecovery() {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [locations, setLocations] = useState<FoodRecoveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  useEffect(() => {
    if (isDemoMode) {
      setLocations(SB1383_DEMO_DATA);
      setLoading(false);
      return;
    }

    // Production: query real data
    async function fetchRecoveryData() {
      const { data } = await supabase
        .from('food_recovery_records')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        // Map to display format
        setLocations(data.map((r: any) => ({
          id: r.id,
          name: r.location_name || 'Unknown',
          city: r.city || '',
          tier: r.tier || 2,
          recovery: r.recovery_lbs || 0,
          organic: r.organic_waste_lbs || 0,
          partner: r.recovery_partner || null,
          partnerContact: r.partner_contact || null,
          plan: r.has_recovery_plan || false,
          lastInspection: r.last_inspection_date || null,
          result: r.last_inspection_result || null,
        })));
      } else {
        setLocations([]);
      }
      setLoading(false);
    }

    fetchRecoveryData();
  }, [isDemoMode, profile]);

  const totalRecovery = locations.reduce((sum, l) => sum + l.recovery, 0);
  const totalOrganic = locations.reduce((sum, l) => sum + l.organic, 0);
  const diversionRate = totalOrganic > 0 ? Math.round((totalRecovery / totalOrganic) * 100) : 0;
  const locationsWithPlan = locations.filter(l => l.plan).length;

  // Empty state
  if (!loading && locations.length === 0 && !isDemoMode) {
    return (
      <>
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Food Recovery (SB 1383)' }]} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{'♻️'}</div>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: '#1E2D4D', marginBottom: 8 }}>No compliance entries yet</h3>
          <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 440, lineHeight: 1.7, marginBottom: 28 }}>
            Log your first SB 1383 compliance entry to start tracking organic waste diversion.
          </p>
          <button
            onClick={() => guardAction('food_recovery', 'SB 1383 entry', () => alert('Log entry form — coming soon'))}
            style={{
              background: '#1E2D4D', color: 'white', padding: '14px 28px', borderRadius: 10,
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
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Food Recovery (SB 1383)' }]} />
      <div className="space-y-6">
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
          borderRadius: 16, padding: '28px 32px', color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Recycle size={28} style={{ color: '#95D5B2' }} />
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>SB 1383 Compliance</h2>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            California organic waste diversion tracking, food recovery agreements, and CalRecycle compliance.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #40916C' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Diversion Rate</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: diversionRate >= 20 ? '#40916C' : '#ef4444' }}>{diversionRate}%</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>SB 1383 target: 20%</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #2D6A4F' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Food Recovered</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1E2D4D' }}>{totalRecovery.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>lbs (last 30 days)</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #52B788' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Recovery Plans</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1E2D4D' }}>{locationsWithPlan}/{locations.length}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>locations with plans</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #95D5B2' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Active Partners</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1E2D4D' }}>{locations.filter(l => l.partner).length}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>food recovery organizations</div>
          </div>
        </div>

        {/* Location Table */}
        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Locations</h3>
            <button
              onClick={() => guardAction('food_recovery', 'SB 1383 entry', () => alert('Log entry form — coming soon'))}
              style={{
                background: '#40916C', color: 'white', padding: '8px 16px', borderRadius: 8,
                fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Plus size={16} /> Log Entry
            </button>
          </div>

          {locations.map((loc, i) => (
            <div
              key={loc.id}
              style={{
                padding: '16px 24px',
                borderBottom: i < locations.length - 1 ? '1px solid #f3f4f6' : 'none',
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Building2 size={16} style={{ color: '#40916C' }} />
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{loc.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: loc.tier === 1 ? '#D8F3DC' : '#e5e7eb',
                    color: loc.tier === 1 ? '#1B4332' : '#374151',
                  }}>
                    Tier {loc.tier}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
                  <MapPin size={12} /> {loc.city}
                </div>
              </div>

              <div style={{ flex: '0 0 120px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#40916C' }}>{loc.recovery} lbs</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>recovered</div>
              </div>

              <div style={{ flex: '0 0 120px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1E2D4D' }}>{loc.organic} lbs</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>organic waste</div>
              </div>

              <div style={{ flex: '0 0 160px' }}>
                {loc.partner ? (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{loc.partner}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{loc.partnerContact}</div>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={14} /> No partner
                  </span>
                )}
              </div>

              <div style={{ flex: '0 0 80px', textAlign: 'center' }}>
                {loc.plan ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#40916C', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Plan
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                    <AlertTriangle size={14} /> Missing
                  </span>
                )}
              </div>

              <div style={{ flex: '0 0 100px', textAlign: 'right' }}>
                {loc.lastInspection ? (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: loc.result === 'Compliant' ? '#40916C' : '#ef4444' }}>{loc.result}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{loc.lastInspection}</div>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>No inspection</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CalRecycle Info */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <FileText size={18} style={{ color: '#15803d', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#15803d', marginBottom: 4 }}>About SB 1383</p>
            <p style={{ fontSize: 11, color: '#166534', lineHeight: 1.6 }}>
              California Senate Bill 1383 requires a 75% reduction in organic waste disposal by 2025.
              Commercial food generators must arrange for organic waste collection and maintain edible food recovery agreements.
              Enforcement is managed by CalRecycle and local jurisdictions.
            </p>
            <a href="https://calrecycle.ca.gov/organics/slcp/" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, textDecoration: 'none' }}>
              CalRecycle SB 1383 Resources <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
      {showUpgrade && <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />}
    </>
  );
}
