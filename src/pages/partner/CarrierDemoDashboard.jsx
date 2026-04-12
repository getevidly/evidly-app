import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import {
  ShieldCheck, MapPin, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Code, BarChart3, FileJson,
} from 'lucide-react';

const IS_PRODUCTION = import.meta.env.VITE_APP_ENV === 'production';

export default function CarrierDemoDashboard() {
  useDemoGuard();
  if (IS_PRODUCTION) return <Navigate to="/admin" replace />;

  const [demo, setDemo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDemo();
  }, []);

  async function fetchDemo() {
    setLoading(true);
    const { data } = await supabase
      .from('partner_demos')
      .select('*')
      .eq('partner_type', 'carrier')
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setDemo(data);
    setLoading(false);
  }

  const config = demo?.partner_config || {};
  const locations = config.portfolio_locations || [];
  const cicProfiles = config.cic_profiles || [];
  const riskDist = config.risk_distribution || {};
  const pseSummary = config.pse_summary || {};
  const apiFeed = config.api_feed_sample || {};

  const riskColor = (score) => {
    if (score >= 80) return 'text-green-700';
    if (score >= 60) return 'text-[#A08C5A]';
    return 'text-red-700';
  };

  const riskBg = (score) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-[#FAF7F0]';
    return 'bg-red-50';
  };

  const tierLabel = (score) => {
    if (score >= 80) return 'Low Risk';
    if (score >= 60) return 'Moderate';
    return 'High Risk';
  };

  return (
    <div>
      <AdminBreadcrumb items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Partner Demos', path: '/admin/partner-demos' },
        { label: 'Carrier Dashboard' },
      ]} />

      <h1 className="text-2xl font-bold text-[#1E2D4D] mb-1">
        Carrier Partner Dashboard
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {demo?.partner_company || 'Insurance Carrier'} — Portfolio Risk Intelligence
      </p>

      {loading && <p className="text-gray-400 text-sm">Loading carrier demo...</p>}

      {!loading && !demo && (
        <div className="text-center py-12 text-gray-400">
          <ShieldCheck size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No active carrier demo found</p>
          <p className="text-sm mt-1">Create a carrier partner demo first</p>
        </div>
      )}

      {demo && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Portfolio Size', value: locations.length, icon: MapPin, bg: 'bg-blue-50', color: 'text-blue-700' },
              { label: 'Low Risk', value: riskDist.low || 0, icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-700' },
              { label: 'Moderate', value: riskDist.moderate || 0, icon: TrendingUp, bg: 'bg-[#FAF7F0]', color: 'text-[#A08C5A]' },
              { label: 'High Risk', value: riskDist.high || 0, icon: AlertTriangle, bg: 'bg-red-50', color: 'text-red-700' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                <s.icon size={20} className={`${s.color} mb-2`} />
                <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Portfolio Risk Overview — CIC 5-pillar table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1E2D4D] mb-4">Portfolio Risk Overview — CIC 5-Pillar</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase">Location</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 uppercase">P1 Rev</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 uppercase">P2 Liab</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 uppercase">P3 Cost</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 uppercase">P4 Ops</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 uppercase">P5 Work</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 uppercase">Overall</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 uppercase">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {cicProfiles.map((profile, i) => (
                    <tr key={profile.location_id || i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <p className="font-medium text-[#1E2D4D]">{profile.location_name}</p>
                        <p className="text-xs text-gray-400">{profile.county}</p>
                      </td>
                      <td className={`text-center py-2 px-2 font-medium ${riskColor(profile.p1_revenue)}`}>{profile.p1_revenue}</td>
                      <td className={`text-center py-2 px-2 font-medium ${riskColor(profile.p2_liability)}`}>{profile.p2_liability}</td>
                      <td className={`text-center py-2 px-2 font-medium ${riskColor(profile.p3_cost)}`}>{profile.p3_cost}</td>
                      <td className={`text-center py-2 px-2 font-medium ${riskColor(profile.p4_operational)}`}>{profile.p4_operational}</td>
                      <td className={`text-center py-2 px-2 font-medium ${riskColor(profile.p5_workforce)}`}>{profile.p5_workforce}</td>
                      <td className={`text-center py-2 px-2 font-bold ${riskColor(profile.overall)}`}>{profile.overall}</td>
                      <td className="text-center py-2 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskBg(profile.overall)} ${riskColor(profile.overall)}`}>
                          {tierLabel(profile.overall)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PSE Verification Status */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1E2D4D] mb-4">PSE Verification Status</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-700">{pseSummary.fully_verified || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Fully Verified (Vendor)</p>
              </div>
              <div className="bg-[#FAF7F0] rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-[#A08C5A]">{pseSummary.partial || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Partial / Self-Reported</p>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-[#1E2D4D] mb-3">Safeguard Detail by Location</h3>
            <div className="space-y-2">
              {cicProfiles.map((profile, i) => (
                <div key={profile.location_id || i} className="flex items-center gap-3 p-3 bg-[#FAF7F0] rounded-lg">
                  <p className="text-sm font-medium text-[#1E2D4D] flex-1 truncate">{profile.location_name}</p>
                  <div className="flex items-center gap-2">
                    {Object.entries(profile.pse_safeguards || {}).map(([type, verified]) => (
                      <span key={type} title={type.replace(/_/g, ' ')}
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          verified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                        {verified ? <CheckCircle2 size={10} className="mr-0.5" /> : <XCircle size={10} className="mr-0.5" />}
                        {type.split('_').map(w => w[0].toUpperCase()).join('')}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1E2D4D] mb-4">Risk Distribution</h2>
            <div className="h-8 bg-gray-100 rounded-full overflow-hidden flex">
              {riskDist.low > 0 && (
                <div className="h-full bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(riskDist.low / locations.length) * 100}%` }}>
                  {riskDist.low}
                </div>
              )}
              {riskDist.moderate > 0 && (
                <div className="h-full bg-[#A08C5A] flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(riskDist.moderate / locations.length) * 100}%` }}>
                  {riskDist.moderate}
                </div>
              )}
              {riskDist.high > 0 && (
                <div className="h-full bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(riskDist.high / locations.length) * 100}%` }}>
                  {riskDist.high}
                </div>
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Low Risk ({riskDist.low || 0})</span>
              <span>Moderate ({riskDist.moderate || 0})</span>
              <span>High Risk ({riskDist.high || 0})</span>
            </div>
          </div>

          {/* Data Feed Preview */}
          <div className="bg-[#1E2D4D] text-white rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileJson size={20} className="text-[#A08C5A]" />
              <h2 className="text-lg font-semibold">Data Feed Preview</h2>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Endpoint:</span>
                <span className="font-mono text-[#A08C5A]">{apiFeed.endpoint || '/api/v1/carrier/risk-feed'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Format:</span>
                <span className="font-mono">{apiFeed.format || 'JSON'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Frequency:</span>
                <span className="font-mono">{apiFeed.frequency || 'daily'}</span>
              </div>
            </div>
            <div className="bg-black/30 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre">
{JSON.stringify({
  location_id: cicProfiles[0]?.location_id || 'loc-001',
  overall_score: cicProfiles[0]?.overall || 75,
  risk_tier: tierLabel(cicProfiles[0]?.overall || 75).toLowerCase().replace(' ', '_'),
  pse_verified: cicProfiles[0]?.pse_verified ?? true,
  pillars: {
    p1_revenue: cicProfiles[0]?.p1_revenue || 78,
    p2_liability: cicProfiles[0]?.p2_liability || 72,
    p3_cost: cicProfiles[0]?.p3_cost || 68,
    p4_operational: cicProfiles[0]?.p4_operational || 74,
    p5_workforce: cicProfiles[0]?.p5_workforce || 80,
  },
  last_updated: new Date().toISOString().split('T')[0],
}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
