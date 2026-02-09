import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, TrendingUp, Flame, Target, Zap, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Breadcrumb } from '../components/Breadcrumb';

interface LocationLeaderboard {
  location_id: string;
  location_name: string;
  total_temp_logs: number;
  total_checklists: number;
  total_documents: number;
  compliance_score: number;
  total_points: number;
}

const DEMO_LEADERBOARD: LocationLeaderboard[] = [
  { location_id: '1', location_name: 'Downtown Kitchen', total_temp_logs: 186, total_checklists: 92, total_documents: 24, compliance_score: 92, total_points: 4520 },
  { location_id: '2', location_name: 'Airport Cafe', total_temp_logs: 142, total_checklists: 78, total_documents: 18, compliance_score: 74, total_points: 3640 },
  { location_id: '3', location_name: 'University Dining', total_temp_logs: 98, total_checklists: 45, total_documents: 12, compliance_score: 57, total_points: 2285 },
];

function HorizontalBar({ label, value, max, color, suffix }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>{value}{suffix || ''}</span>
      </div>
      <div style={{ height: '10px', backgroundColor: '#e5e7eb', borderRadius: '5px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '5px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export function Leaderboard() {
  const { profile } = useAuth();
  const [locations, setLocations] = useState<LocationLeaderboard[]>([]);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchLeaderboard();
    } else {
      setLocations(DEMO_LEADERBOARD);
    }
  }, [profile]);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('v_location_leaderboard')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .order('total_points', { ascending: false });

    if (data && data.length > 0) {
      setLocations(data);
    } else {
      setLocations(DEMO_LEADERBOARD);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6" style={{ color: '#d4af37' }} />;
      case 1:
        return <Medal className="h-6 w-6" style={{ color: '#9ca3af' }} />;
      case 2:
        return <Award className="h-6 w-6" style={{ color: '#92400e' }} />;
      default:
        return <span className="text-lg font-semibold text-gray-500">#{index + 1}</span>;
    }
  };

  const maxPoints = Math.max(...locations.map(l => l.total_points), 1);

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Leaderboard' }]} />
      <div className="space-y-6">
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e4d6b 0%, #2c5f7f 100%)', borderRadius: '12px', padding: '24px', color: 'white' }}>
          <div className="flex items-center space-x-3 mb-2">
            <Trophy className="h-8 w-8" style={{ color: '#d4af37' }} />
            <h2 className="text-2xl font-bold">Location Leaderboard</h2>
          </div>
          <p style={{ color: '#cbd5e1' }}>Track performance across all your locations</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #1e4d6b' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[#1e4d6b]" />
              <span className="text-sm text-gray-500 font-medium">Avg Compliance</span>
            </div>
            <div className="text-3xl font-bold text-[#1e4d6b] text-center">
              {locations.length > 0 ? Math.round(locations.reduce((sum, l) => sum + l.compliance_score, 0) / locations.length) : 0}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #d4af37' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-[#d4af37]" />
              <span className="text-sm text-gray-500 font-medium">Active Locations</span>
            </div>
            <div className="text-3xl font-bold text-[#1e4d6b] text-center">{locations.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #d4af37' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className="h-4 w-4 text-[#d4af37]" />
              <span className="text-sm text-gray-500 font-medium">Total Points</span>
            </div>
            <div className="text-3xl font-bold text-[#d4af37] text-center">{locations.reduce((sum, l) => sum + l.total_points, 0).toLocaleString()}</div>
          </div>
        </div>

        {/* Rankings Table */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Rankings</h3>
          </div>
          <div>
            {locations.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <Trophy className="h-12 w-12 mx-auto mb-4" style={{ color: '#9ca3af' }} />
                <p style={{ color: '#6b7280' }}>No locations yet</p>
              </div>
            ) : (
              locations.map((location, index) => (
                <div
                  key={location.location_id}
                  style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: index < locations.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                  className="hover:bg-gray-50"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{ width: '48px', display: 'flex', justifyContent: 'center' }}>{getRankIcon(index)}</div>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1e4d6b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 500, flexShrink: 0 }}>
                      {location.location_name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{location.location_name}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {location.total_temp_logs} logs · {location.total_checklists} checklists · {location.compliance_score}% compliance
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#d4af37' }}>{location.total_points.toLocaleString()}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>points</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Two side-by-side charts */}
        {locations.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Compliance Scores Chart */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>Compliance Score</h3>
              {locations.map((loc) => (
                <HorizontalBar
                  key={loc.location_id}
                  label={loc.location_name}
                  value={loc.compliance_score}
                  max={100}
                  color={loc.compliance_score >= 90 ? '#1e4d6b' : loc.compliance_score >= 70 ? '#d4af37' : '#9ca3af'}
                  suffix="%"
                />
              ))}
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '11px', color: '#6b7280' }}>
                <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#1e4d6b', marginRight: '4px' }} />90+</span>
                <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#d4af37', marginRight: '4px' }} />70-89</span>
                <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#9ca3af', marginRight: '4px' }} />&lt;70</span>
              </div>
            </div>

            {/* Total Points Chart */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>Total Points</h3>
              {locations.map((loc) => (
                <HorizontalBar
                  key={loc.location_id}
                  label={loc.location_name}
                  value={loc.total_points}
                  max={maxPoints}
                  color="#1e4d6b"
                />
              ))}
            </div>
          </div>
        )}

        {/* Achievement Badges */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>Achievement Badges</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            Earn badges by maintaining excellent compliance across your locations
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Perfect Week - EARNED */}
            <div style={{ background: 'linear-gradient(135deg, #f0f7fc 0%, #e1eef6 100%)', border: '2px solid #1e4d6b', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1e4d6b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Flame className="h-8 w-8" style={{ color: '#d4af37' }} />
              </div>
              <h4 style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Perfect Week</h4>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>100% compliance for 7 consecutive days</p>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#1e4d6b', backgroundColor: '#dbeafe', padding: '3px 10px', borderRadius: '4px' }}>EARNED</span>
            </div>

            {/* 100% Temp Logs - EARNED */}
            <div style={{ background: 'linear-gradient(135deg, #f0f7fc 0%, #e1eef6 100%)', border: '2px solid #1e4d6b', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1e4d6b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Target className="h-8 w-8" style={{ color: '#d4af37' }} />
              </div>
              <h4 style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>100% Temp Logs</h4>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>All temperature logs current for 30 days</p>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#1e4d6b', backgroundColor: '#dbeafe', padding: '3px 10px', borderRadius: '4px' }}>EARNED</span>
            </div>

            {/* Zero Overdue Docs - LOCKED */}
            <div style={{ background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '24px', textAlign: 'center', opacity: 0.7 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Zap className="h-8 w-8" style={{ color: '#9ca3af' }} />
              </div>
              <h4 style={{ fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>Zero Overdue Docs</h4>
              <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>All vendor documents current and valid</p>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', backgroundColor: '#e5e7eb', padding: '3px 10px', borderRadius: '4px' }}>LOCKED</span>
            </div>

            {/* Gold Standard - LOCKED (grayed out) */}
            <div style={{ background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: '12px', padding: '24px', textAlign: 'center', opacity: 0.5 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Star className="h-8 w-8" style={{ color: '#9ca3af' }} />
              </div>
              <h4 style={{ fontWeight: 700, color: '#9ca3af', marginBottom: '4px' }}>Gold Standard</h4>
              <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>90%+ compliance score for 90 days</p>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', backgroundColor: '#e5e7eb', padding: '3px 10px', borderRadius: '4px' }}>LOCKED</span>
            </div>
          </div>
        </div>

        {/* How to earn points */}
        <div style={{ background: '#f0f7fc', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontWeight: 600, color: '#1e4d6b', marginBottom: '8px' }}>How to earn points:</h4>
          <ul style={{ fontSize: '14px', color: '#1e4d6b', listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '4px' }}>· Complete temperature logs: 10 points</li>
            <li style={{ marginBottom: '4px' }}>· Finish checklists: 25 points</li>
            <li style={{ marginBottom: '4px' }}>· Upload documents: 15 points</li>
            <li style={{ marginBottom: '4px' }}>· Resolve alerts: 20 points</li>
            <li>· Perfect week streak: 100 bonus points</li>
          </ul>
        </div>
      </div>
    </>
  );
}
