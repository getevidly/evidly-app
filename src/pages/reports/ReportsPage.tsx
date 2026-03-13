/**
 * ReportsPage — Report library with search, category tabs, and My Reports.
 * Route: /reports
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Clock, Star, CalendarClock } from 'lucide-react';
import { REPORT_DEFINITIONS, CATEGORY_META, type ReportCategory } from '../../constants/reportDefinitions';
import { useReportHistory, useScheduledReports, useFavoriteReports } from '../../hooks/api/useReports';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY, MUTED } from '../../components/dashboard/shared/constants';

const TABS: { key: 'all' | ReportCategory; label: string }[] = [
  { key: 'all', label: 'All Reports' },
  { key: 'operations', label: 'Operations' },
  { key: 'financial', label: 'Financial' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'team', label: 'Team' },
];

export function ReportsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | ReportCategory>('all');
  const [myTab, setMyTab] = useState<'recent' | 'scheduled' | 'favorites'>('recent');

  const { data: history } = useReportHistory();
  const { data: scheduled } = useScheduledReports();
  const { data: favorites } = useFavoriteReports();

  const filteredReports = useMemo(() => {
    let list = REPORT_DEFINITIONS;
    if (activeTab !== 'all') list = list.filter(r => r.category === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    return list;
  }, [activeTab, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Reports</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Generate, schedule, and export reports across your operations.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: TEXT_TERTIARY }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30"
            style={{ background: CARD_BG, borderColor: CARD_BORDER, color: NAVY, width: 260 }}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#F3F4F6', width: 'fit-content' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="px-4 py-1.5 text-xs font-semibold rounded-md transition-all"
            style={{
              background: activeTab === t.key ? CARD_BG : 'transparent',
              color: activeTab === t.key ? NAVY : TEXT_TERTIARY,
              boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Report grid */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
          <p className="text-sm font-medium" style={{ color: NAVY }}>No reports match your search</p>
          <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>Try a different keyword or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredReports.map(report => {
            const cat = CATEGORY_META[report.category];
            const Icon = report.icon;
            const isFav = favorites?.includes(report.slug);
            return (
              <button
                key={report.slug}
                onClick={() => navigate(`/reports/${report.slug}`)}
                className="text-left rounded-xl p-4 transition-all hover:shadow-md group"
                style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: cat.bg }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: cat.color }} />
                  </div>
                  {isFav && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
                </div>
                <p className="text-sm font-semibold mb-1 group-hover:text-[#1e4d6b]" style={{ color: NAVY }}>{report.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: TEXT_TERTIARY }}>{report.description}</p>
                <div className="mt-3">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: cat.color, background: cat.bg }}>
                    {cat.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* My Reports section */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h2 className="text-base font-bold mb-4" style={{ color: NAVY }}>My Reports</h2>

        <div className="flex gap-1 p-1 rounded-lg mb-4" style={{ background: '#F3F4F6', width: 'fit-content' }}>
          {([
            { key: 'recent' as const, label: 'Recent', icon: Clock },
            { key: 'scheduled' as const, label: 'Scheduled', icon: CalendarClock },
            { key: 'favorites' as const, label: 'Favorites', icon: Star },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setMyTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
              style={{
                background: myTab === t.key ? CARD_BG : 'transparent',
                color: myTab === t.key ? NAVY : TEXT_TERTIARY,
                boxShadow: myTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {myTab === 'recent' && (
          !history || history.length === 0 ? (
            <EmptyMyReports icon={<Clock className="w-8 h-8" style={{ color: TEXT_TERTIARY }} />} title="No recent reports" subtitle="Generated reports will appear here." />
          ) : (
            <div className="space-y-2">
              {history.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#F9FAFB', border: `1px solid ${CARD_BORDER}` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: NAVY }}>{r.title}</p>
                    <p className="text-xs" style={{ color: TEXT_TERTIARY }}>{new Date(r.generatedAt).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )
        )}

        {myTab === 'scheduled' && (
          !scheduled || scheduled.length === 0 ? (
            <EmptyMyReports icon={<CalendarClock className="w-8 h-8" style={{ color: TEXT_TERTIARY }} />} title="No scheduled reports" subtitle="Set up automated report delivery." />
          ) : (
            <div className="space-y-2">
              {scheduled.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#F9FAFB', border: `1px solid ${CARD_BORDER}` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: NAVY }}>{s.reportTitle}</p>
                    <p className="text-xs" style={{ color: TEXT_TERTIARY }}>{s.frequency} &middot; {s.format.toUpperCase()}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                    color: s.isActive ? '#059669' : '#DC2626',
                    background: s.isActive ? '#F0FFF4' : '#FEF2F2',
                  }}>
                    {s.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {myTab === 'favorites' && (
          !favorites || favorites.length === 0 ? (
            <EmptyMyReports icon={<Star className="w-8 h-8" style={{ color: TEXT_TERTIARY }} />} title="No favorite reports" subtitle="Star reports to quickly access them here." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {favorites.map(slug => {
                const def = REPORT_DEFINITIONS.find(r => r.slug === slug);
                if (!def) return null;
                const cat = CATEGORY_META[def.category];
                const Icon = def.icon;
                return (
                  <button
                    key={slug}
                    onClick={() => navigate(`/reports/${slug}`)}
                    className="text-left p-3 rounded-lg hover:shadow-sm transition-all"
                    style={{ background: '#F9FAFB', border: `1px solid ${CARD_BORDER}` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" style={{ color: cat.color }} />
                      <span className="text-sm font-medium" style={{ color: NAVY }}>{def.title}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: cat.color, background: cat.bg }}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function EmptyMyReports({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center py-10">
      <div className="mb-3 flex justify-center">{icon}</div>
      <p className="text-sm font-medium" style={{ color: NAVY }}>{title}</p>
      <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isOk = status === 'completed';
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
      color: isOk ? '#059669' : status === 'generating' ? '#d97706' : '#DC2626',
      background: isOk ? '#F0FFF4' : status === 'generating' ? '#FFFBEB' : '#FEF2F2',
    }}>
      {status}
    </span>
  );
}
