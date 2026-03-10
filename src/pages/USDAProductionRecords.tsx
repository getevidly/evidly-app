import { useState, useEffect } from 'react';
import { School, Plus, MapPin, Users, FileText, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

interface K12Location {
  id: string;
  name: string;
  district: string;
  nslp: boolean;
  usda: boolean;
  meals: number;
  haccpStaff: number;
  foodSafetyPlan: boolean;
  allergenPolicy: boolean;
  lastUsda: string | null;
  lastState: string | null;
}

const K12_DEMO_DATA: K12Location[] = [
  { id: 'demo-1', name: 'Lincoln Elementary', district: 'Fresno USD', nslp: true, usda: true, meals: 480, haccpStaff: 3, foodSafetyPlan: true, allergenPolicy: true, lastUsda: '2025-11-12', lastState: '2026-01-08' },
  { id: 'demo-2', name: 'Roosevelt Middle School', district: 'Fresno USD', nslp: true, usda: false, meals: 620, haccpStaff: 2, foodSafetyPlan: true, allergenPolicy: false, lastUsda: null, lastState: '2025-12-15' },
  { id: 'demo-3', name: 'Kennedy High School', district: 'Fresno USD', nslp: true, usda: true, meals: 890, haccpStaff: 4, foodSafetyPlan: false, allergenPolicy: true, lastUsda: '2026-01-20', lastState: '2026-02-01' },
];

function formatDate(d: string | null): string {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function USDAProductionRecords() {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [locations, setLocations] = useState<K12Location[]>([]);
  const [loading, setLoading] = useState(true);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  useEffect(() => {
    if (isDemoMode) {
      setLocations(K12_DEMO_DATA);
      setLoading(false);
      return;
    }

    async function fetchK12Data() {
      const { data } = await supabase
        .from('k12_school_records')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .order('name', { ascending: true });

      if (data && data.length > 0) {
        setLocations(data.map((r: any) => ({
          id: r.id,
          name: r.name || 'Unknown',
          district: r.district || '',
          nslp: r.nslp_enrolled || false,
          usda: r.usda_compliant || false,
          meals: r.daily_meals || 0,
          haccpStaff: r.haccp_staff_count || 0,
          foodSafetyPlan: r.has_food_safety_plan || false,
          allergenPolicy: r.has_allergen_policy || false,
          lastUsda: r.last_usda_review || null,
          lastState: r.last_state_review || null,
        })));
      } else {
        setLocations([]);
      }
      setLoading(false);
    }

    fetchK12Data();
  }, [isDemoMode, profile]);

  const totalMeals = locations.reduce((sum, l) => sum + l.meals, 0);
  const totalStaff = locations.reduce((sum, l) => sum + l.haccpStaff, 0);
  const withFoodSafetyPlan = locations.filter(l => l.foodSafetyPlan).length;
  const usdaCompliant = locations.filter(l => l.usda).length;

  // Empty state
  if (!loading && locations.length === 0 && !isDemoMode) {
    return (
      <>
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'USDA K-12 Records' }]} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{'🏫'}</div>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: '#1E2D4D', marginBottom: 8 }}>No K-12 records yet</h3>
          <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 440, lineHeight: 1.7, marginBottom: 28 }}>
            Add your school details to start tracking food safety compliance and USDA meal program records.
          </p>
          <button
            onClick={() => guardAction('k12_records', 'K-12 record', () => alert('Add school form — coming soon'))}
            style={{
              background: '#1E2D4D', color: 'white', padding: '14px 28px', borderRadius: 10,
              fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Plus size={18} /> Add School Details
          </button>
        </div>
        {showUpgrade && <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'USDA K-12 Records' }]} />
      <div className="space-y-6">
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1E2D4D 0%, #2E4270 100%)',
          borderRadius: 16, padding: '28px 32px', color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <School size={28} style={{ color: '#93C5FD' }} />
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>USDA K-12 Meal Program</h2>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            USDA Child Nutrition Program production records, meal pattern compliance, and CN label tracking.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #1E2D4D' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Total Daily Meals</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1E2D4D' }}>{totalMeals.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>across {locations.length} schools</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #2563EB' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>HACCP Staff</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1E2D4D' }}>{totalStaff}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>certified personnel</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #40916C' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Food Safety Plans</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: withFoodSafetyPlan === locations.length ? '#40916C' : '#f59e0b' }}>{withFoodSafetyPlan}/{locations.length}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>schools with plans</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #A08C5A' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>USDA Compliant</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: usdaCompliant === locations.length ? '#40916C' : '#f59e0b' }}>{usdaCompliant}/{locations.length}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>schools passing USDA</div>
          </div>
        </div>

        {/* Schools Table */}
        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Schools</h3>
            <button
              onClick={() => guardAction('k12_records', 'K-12 record', () => alert('Add school form — coming soon'))}
              style={{
                background: '#1E2D4D', color: 'white', padding: '8px 16px', borderRadius: 8,
                fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Plus size={16} /> Add School
            </button>
          </div>

          {locations.map((loc, i) => (
            <div
              key={loc.id}
              style={{
                padding: '16px 24px',
                borderBottom: i < locations.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <School size={16} style={{ color: '#2563EB' }} />
                    <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>{loc.name}</span>
                    {loc.nslp && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#DBEAFE', color: '#1E40AF' }}>
                        NSLP
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
                    <span>{loc.district}</span>
                    <span>{'·'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {loc.haccpStaff} HACCP staff</span>
                    <span>{'·'}</span>
                    <span>{loc.meals} meals/day</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: loc.usda ? '#40916C' : '#ef4444' }}>
                    {loc.usda ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    USDA {loc.usda ? 'Compliant' : 'Non-Compliant'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: loc.foodSafetyPlan ? '#40916C' : '#ef4444' }}>
                    {loc.foodSafetyPlan ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    Food Safety Plan
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: loc.allergenPolicy ? '#40916C' : '#f59e0b' }}>
                    {loc.allergenPolicy ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    Allergen Policy
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, fontSize: 11, color: '#6b7280' }}>
                <span>Last USDA Review: <strong style={{ color: '#374151' }}>{formatDate(loc.lastUsda)}</strong></span>
                <span>Last State Review: <strong style={{ color: '#374151' }}>{formatDate(loc.lastState)}</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* USDA Info */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <ShieldCheck size={18} style={{ color: '#2563EB', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', marginBottom: 4 }}>USDA Child Nutrition Programs</p>
            <p style={{ fontSize: 11, color: '#1e3a5f', lineHeight: 1.6 }}>
              Schools participating in the National School Lunch Program (NSLP) must meet USDA meal pattern requirements,
              maintain food safety plans, and ensure all food service staff hold current food handler certifications.
              EvidLY tracks production records, meal component compliance, and CN label documentation.
            </p>
            <a href="https://www.fns.usda.gov/cn" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#2563EB', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, textDecoration: 'none' }}>
              USDA Child Nutrition Resources <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
      {showUpgrade && <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />}
    </>
  );
}
