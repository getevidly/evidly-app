/**
 * JurisdictionIntelligence — Standalone admin page
 *
 * Route: /admin/jurisdiction-intelligence
 * Shows jurisdiction-specific food safety and facility safety regulatory changes.
 * Queries jurisdiction_intel_updates table.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';

const NAVY = '#1E2D4D';

interface JurisdictionUpdate {
  id: string;
  jurisdiction_key: string;
  jurisdiction_name: string;
  county: string | null;
  pillar: string;
  update_type: string;
  title: string;
  description: string | null;
  effective_date: string | null;
  risk_revenue: string | null;
  risk_liability: string | null;
  verified: boolean;
  verified_by: string | null;
  published: boolean;
  published_by: string | null;
  created_at: string;
}

const PILLAR_BADGE: Record<string, { bg: string; text: string }> = {
  food_safety: { bg: '#ECFDF5', text: '#065F46' },
  facility_safety: { bg: '#FFF7ED', text: '#9A3412' },
  both: { bg: '#F5F3FF', text: '#5B21B6' },
};

export default function JurisdictionIntelligence() {
  const [updates, setUpdates] = useState<JurisdictionUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCounty, setFilterCounty] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('jurisdiction_intel_updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setUpdates(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const counties = [...new Set(updates.map(u => u.county || u.jurisdiction_name).filter(Boolean))].sort();

  const filtered = updates.filter(u =>
    !filterCounty || u.county === filterCounty || u.jurisdiction_name === filterCounty
  );

  const publishItem = async (id: string) => {
    await supabase
      .from('jurisdiction_intel_updates')
      .update({ published: true, published_at: new Date().toISOString() })
      .eq('id', id);
    setUpdates(prev => prev.map(u => u.id === id ? { ...u, published: true } : u));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8">
      <AdminBreadcrumb crumbs={[{ label: 'Jurisdiction Intelligence' }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E2D4D]">Jurisdiction Intelligence</h1>
        <p className="text-sm text-gray-500 mt-1">
          Inspection methodology changes, scoring updates, and policy shifts across all 62 CA jurisdictions
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <KpiTile label="Total Updates" value={updates.length} />
        <KpiTile label="Pending Publish" value={updates.filter(u => !u.published).length} valueColor="amber" />
        <KpiTile label="Jurisdictions Affected" value={counties.length} />
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-6">
        <select
          value={filterCounty}
          onChange={e => setFilterCounty(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Counties</option>
          {counties.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm font-semibold text-gray-600 mb-2">No jurisdiction updates yet</p>
          <p className="text-xs text-gray-400">
            Crawler monitors all 62 CA jurisdictions for inspection methodology and scoring changes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const pc = PILLAR_BADGE[item.pillar] || PILLAR_BADGE.both;
            return (
              <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                        {item.jurisdiction_name || item.jurisdiction_key}
                      </span>
                      <span style={{ background: pc.bg, color: pc.text }}
                        className="text-xs px-2 py-0.5 rounded-full font-medium">
                        {item.pillar.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {item.update_type.replace(/_/g, ' ')}
                      </span>
                      {item.published && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                          Published
                        </span>
                      )}
                      {item.verified && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm mb-1" style={{ color: NAVY }}>{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>
                    )}
                    <div className="flex gap-4 text-xs text-gray-400">
                      {item.county && <span>{item.county} County</span>}
                      {item.effective_date && <span>Effective: {item.effective_date}</span>}
                      <span>{new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  {!item.published && (
                    <button
                      onClick={() => publishItem(item.id)}
                      className="flex-shrink-0 px-4 py-2 bg-[#1E2D4D] text-white rounded-lg text-xs font-medium hover:bg-[#2a3f6b]"
                    >
                      Publish
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
