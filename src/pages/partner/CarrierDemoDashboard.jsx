// P0-PURGE: No insurance score display — jurisdiction grade + PSE status + operational facts only
// Per CA Ins. Code §1731: EvidLY reads/identifies/flags — never rates/evaluates/advises
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import {
  ShieldCheck, MapPin, AlertTriangle,
  CheckCircle2, XCircle, FileJson,
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
  const pseSummary = config.pse_summary || {};
  const apiFeed = config.api_feed_sample || {};

  return (
    <div>
      <AdminBreadcrumb items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Partner Demos', path: '/admin/partner-demos' },
        { label: 'Carrier Dashboard' },
      ]} />

      <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-1">
        Carrier Partner Dashboard
      </h1>
      <p className="text-sm text-[#1E2D4D]/50 mb-6">
        {demo?.partner_company || 'Insurance Carrier'} — Portfolio Operational Status
      </p>

      {loading && <p className="text-[#1E2D4D]/30 text-sm">Loading carrier demo...</p>}

      {!loading && !demo && (
        <div className="text-center py-12 text-[#1E2D4D]/30">
          <ShieldCheck size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No active carrier demo found</p>
          <p className="text-sm mt-1">Create a carrier partner demo first</p>
        </div>
      )}

      {demo && (
        <div className="space-y-6">
          {/* Summary cards — counts only, no scores */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Portfolio Size', value: locations.length, icon: MapPin, bg: 'bg-blue-50', color: 'text-blue-700' },
              { label: 'PSE Verified', value: pseSummary.fully_verified || 0, icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-700' },
              { label: 'PSE Partial / Missing', value: pseSummary.partial || 0, icon: AlertTriangle, bg: 'bg-[#FAF7F0]', color: 'text-[#A08C5A]' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                <s.icon size={20} className={`${s.color} mb-2`} />
                <p className="text-xs text-[#1E2D4D]/50 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* §1731 Disclosure */}
          <div className="bg-[#FAF7F0] border border-[#A08C5A]/20 rounded-xl p-4">
            <p className="text-xs text-[#1E2D4D]/70">
              <span className="font-semibold">Per CA Ins. Code §1731:</span> EvidLY reads jurisdiction grades, identifies operational deficiencies, and flags missing documentation.
              EvidLY does not rate, evaluate, score, or advise on insurance risk. All grades shown are jurisdiction-native (health department letter grades or pass/fail).
            </p>
          </div>

          {/* Portfolio Status — Jurisdiction Grade + Operational Facts */}
          <div className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4">Portfolio Status — Jurisdiction Grade & Operational Facts</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E2D4D]/10">
                    <th className="text-left py-2 px-3 text-xs text-[#1E2D4D]/50 uppercase">Location</th>
                    <th className="text-center py-2 px-2 text-xs text-[#1E2D4D]/50 uppercase">Jurisdiction Grade</th>
                    <th className="text-center py-2 px-2 text-xs text-[#1E2D4D]/50 uppercase">Pass/Fail</th>
                    <th className="text-center py-2 px-2 text-xs text-[#1E2D4D]/50 uppercase">Open Violations</th>
                    <th className="text-center py-2 px-2 text-xs text-[#1E2D4D]/50 uppercase">PSE Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {cicProfiles.map((profile, i) => {
                    const grade = profile.jurisdiction_grade || profile.county_grade || '—';
                    const passFail = profile.pass_fail || '—';
                    const violations = profile.open_violations ?? 0;
                    const pseVerified = profile.pse_verified ?? false;
                    return (
                      <tr key={profile.location_id || i} className="border-b border-[#1E2D4D]/5 hover:bg-[#FAF7F0]">
                        <td className="py-2 px-3">
                          <p className="font-medium text-[#1E2D4D]">{profile.location_name}</p>
                          <p className="text-xs text-[#1E2D4D]/30">{profile.county}</p>
                        </td>
                        <td className="text-center py-2 px-2 font-bold text-[#1E2D4D]">{grade}</td>
                        <td className="text-center py-2 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            passFail === 'Pass' ? 'bg-green-50 text-green-700' : passFail === 'Fail' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'
                          }`}>
                            {passFail}
                          </span>
                        </td>
                        <td className={`text-center py-2 px-2 font-medium ${violations > 0 ? 'text-red-700' : 'text-green-700'}`}>
                          {violations}
                        </td>
                        <td className="text-center py-2 px-2">
                          {pseVerified
                            ? <CheckCircle2 size={16} className="mx-auto text-green-600" />
                            : <XCircle size={16} className="mx-auto text-red-600" />
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PSE Verification Status */}
          <div className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4">PSE Verification Status</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold tracking-tight text-green-700">{pseSummary.fully_verified || 0}</p>
                <p className="text-xs text-[#1E2D4D]/50 mt-1">Fully Verified (Vendor)</p>
              </div>
              <div className="bg-[#FAF7F0] rounded-xl p-4 text-center">
                <p className="text-3xl font-bold tracking-tight text-[#1E2D4D]">{pseSummary.partial || 0}</p>
                <p className="text-xs text-[#1E2D4D]/50 mt-1">Partial / Self-Reported</p>
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
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
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

          {/* Data Feed Preview — operational facts, no scores */}
          <div className="bg-[#1E2D4D] text-white rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileJson size={20} className="text-[#A08C5A]" />
              <h2 className="text-lg font-semibold tracking-tight">Data Feed Preview</h2>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-[#1E2D4D]/30">Endpoint:</span>
                <span className="font-mono text-[#A08C5A]">{apiFeed.endpoint || '/api/v1/carrier/status-feed'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#1E2D4D]/30">Format:</span>
                <span className="font-mono">{apiFeed.format || 'JSON'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#1E2D4D]/30">Frequency:</span>
                <span className="font-mono">{apiFeed.frequency || 'daily'}</span>
              </div>
            </div>
            <div className="bg-black/30 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre">
{JSON.stringify({
  location_id: cicProfiles[0]?.location_id || 'loc-001',
  jurisdiction_grade: cicProfiles[0]?.jurisdiction_grade || cicProfiles[0]?.county_grade || 'A',
  pass_fail: cicProfiles[0]?.pass_fail || 'Pass',
  open_violations: cicProfiles[0]?.open_violations ?? 0,
  pse_verified: cicProfiles[0]?.pse_verified ?? true,
  pse_safeguards: cicProfiles[0]?.pse_safeguards || {},
  last_updated: new Date().toISOString().split('T')[0],
  note: 'EvidLY reads/identifies/flags per CA Ins. Code §1731 — does not rate or evaluate',
}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
