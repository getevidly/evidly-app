/**
 * AdminScoreTable — ScoreTable SEO analytics dashboard
 * Route: /admin/scoretable
 * Tracks views, sessions, and conversion signals across all 62 county pages.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E0D8';

interface CountyRow {
  county_slug: string;
  total_views: number;
  unique_sessions: number;
  views_7d: number;
  views_30d: number;
  last_viewed: string | null;
}

const Skeleton = ({ h = 20 }: { h?: number }) => (
  <div style={{ width: '100%', height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700,
  color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.04em',
};
const tdStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 12 };

export default function AdminScoreTable() {
  const [data, setData] = useState<CountyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
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
    } catch {
      // Queries may fail in demo mode
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 4 }}>ScoreTable Analytics</h1>
      <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 16 }}>
        Public ScoreTable pages (/scoretable/[county]-county) drive SEO traffic and convert operators into assessment leads.
        Track views, sessions, and conversion signals across all 62 county pages.
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'stretch', marginBottom: 16 }}>
        {[
          { label: 'Total Pages', value: data.length || 62 },
          { label: 'Total Views', value: data.reduce((s, d) => s + d.total_views, 0) },
          { label: 'Views (7d)', value: data.reduce((s, d) => s + d.views_7d, 0) },
          { label: 'Views (30d)', value: data.reduce((s, d) => s + d.views_30d, 0) },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '16px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', marginBottom: 8 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: '#1E2D4D' }}>
              {loading ? '—' : k.value}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 6 }}>No ScoreTable views yet</div>
          <div style={{ fontSize: 12, color: TEXT_SEC, maxWidth: 360, margin: '0 auto' }}>
            ScoreTable page views will appear here once users visit /scoretable/[county]-county pages. All 62 counties are tracked automatically.
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['County', 'Total Views', 'Unique Sessions', '7-Day', '30-Day', 'Last Viewed'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.county_slug} style={{ borderBottom: `1px solid ${BORDER}` }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...tdStyle, fontWeight: 500, color: NAVY }}>
                    {(d.county_slug || '').replace(/-county$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} County
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: NAVY }}>{d.total_views}</td>
                  <td style={{ ...tdStyle, fontFamily: "'DM Mono', monospace", color: TEXT_SEC }}>{d.unique_sessions}</td>
                  <td style={{ ...tdStyle, fontFamily: "'DM Mono', monospace", color: d.views_7d > 0 ? '#2563EB' : TEXT_MUTED }}>{d.views_7d}</td>
                  <td style={{ ...tdStyle, fontFamily: "'DM Mono', monospace", color: d.views_30d > 0 ? '#059669' : TEXT_MUTED }}>{d.views_30d}</td>
                  <td style={{ ...tdStyle, fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT_MUTED }}>
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
