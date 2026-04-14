/**
 * AdminScoreTable — ScoreTable SEO analytics dashboard
 * Route: /admin/scoretable
 * Tracks views, sessions, and conversion signals across all 62 county pages.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useDemoGuard } from '../../hooks/useDemoGuard';

interface CountyRow {
  county_slug: string;
  total_views: number;
  unique_sessions: number;
  views_7d: number;
  views_30d: number;
  last_viewed: string | null;
}

const Skeleton = ({ h = 20 }: { h?: number }) => (
  <div className="w-full rounded-md animate-pulse bg-[#E5E7EB]" style={{ height: h }} />
);

export default function AdminScoreTable() {
  useDemoGuard();
  const [data, setData] = useState<CountyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rows } = await supabase
        .from('scoretable_views')
        .select('county_slug, viewed_at, session_id')
        .order('viewed_at', { ascending: false })
        .limit(5000);

      if (rows && rows.length > 0) {
        const now = Date.now();
        const d7 = 7 * 86400000;
        const d30 = 30 * 86400000;
        const byCounty: Record<string, { total: number; sessions: Set<string>; v7: number; v30: number; last: string }> = {};
        for (const row of rows) {
          const slug = row.county_slug;
          if (!byCounty[slug]) byCounty[slug] = { total: 0, sessions: new Set(), v7: 0, v30: 0, last: '' };
          byCounty[slug].total++;
          if (row.session_id) byCounty[slug].sessions.add(row.session_id);
          const age = now - new Date(row.viewed_at).getTime();
          if (age < d7) byCounty[slug].v7++;
          if (age < d30) byCounty[slug].v30++;
          if (!byCounty[slug].last || row.viewed_at > byCounty[slug].last) byCounty[slug].last = row.viewed_at;
        }
        setData(Object.entries(byCounty).map(([slug, d]) => ({
          county_slug: slug,
          total_views: d.total,
          unique_sessions: d.sessions.size,
          views_7d: d.v7,
          views_30d: d.v30,
          last_viewed: d.last,
        })).sort((a, b) => b.total_views - a.total_views));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Failed to load data</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2.5 bg-navy text-white rounded-lg text-sm font-medium hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] min-h-[44px]">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[22px] font-extrabold text-navy mb-1">ScoreTable Analytics</h1>
      <div className="text-xs text-[#6B7F96] leading-relaxed mb-4">
        Public ScoreTable pages (/scoretable/[county]-county) drive SEO traffic and convert operators into assessment leads.
        Track views, sessions, and conversion signals across all 62 county pages.
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 items-stretch mb-4">
        {[
          { label: 'Total Pages', value: data.length || 62 },
          { label: 'Total Views', value: data.reduce((s, d) => s + d.total_views, 0) },
          { label: 'Views (7d)', value: data.reduce((s, d) => s + d.views_7d, 0) },
          { label: 'Views (30d)', value: data.reduce((s, d) => s + d.views_30d, 0) },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 text-center flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#6B7280] mb-2">
              {k.label}
            </div>
            <div className="text-[28px] font-extrabold leading-none text-navy">
              {loading ? '—' : k.value}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-[32px] mb-3">📊</div>
          <div className="text-[15px] font-bold text-navy mb-1.5">No ScoreTable views yet</div>
          <div className="text-xs text-[#6B7F96] max-w-[360px] mx-auto">
            ScoreTable page views will appear here once users visit /scoretable/[county]-county pages. All 62 counties are tracked automatically.
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E0D8] overflow-hidden">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E5E0D8]">
                {['County', 'Total Views', 'Unique Sessions', '7-Day', '30-Day', 'Last Viewed'].map(h => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.04em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.county_slug} className="border-b border-[#E5E0D8] hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-3.5 py-2.5 text-xs font-medium text-navy">
                    {(d.county_slug || '').replace(/-county$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} County
                  </td>
                  <td className="px-3.5 py-2.5 text-xs font-['DM_Mono',monospace] font-semibold text-navy">{d.total_views}</td>
                  <td className="px-3.5 py-2.5 text-xs font-['DM_Mono',monospace] text-[#6B7F96]">{d.unique_sessions}</td>
                  <td className={`px-3.5 py-2.5 text-xs font-['DM_Mono',monospace] ${d.views_7d > 0 ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`}>{d.views_7d}</td>
                  <td className={`px-3.5 py-2.5 text-xs font-['DM_Mono',monospace] ${d.views_30d > 0 ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>{d.views_30d}</td>
                  <td className="px-3.5 py-2.5 text-[11px] font-['DM_Mono',monospace] text-[#9CA3AF]">
                    {d.last_viewed ? new Date(d.last_viewed).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
