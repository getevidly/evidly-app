/**
 * ReportGeneratorPage — Dynamic parameter form + generate/export.
 * Route: /reports/:slug
 */
import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, Download, FileSpreadsheet, Printer, Calendar } from 'lucide-react';
import { getReportBySlug, CATEGORY_META } from '../../constants/reportDefinitions';
import { useGenerateReport, type ReportParams } from '../../hooks/api/useReports';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY, MUTED } from '../../components/dashboard/shared/constants';

export function ReportGeneratorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const report = useMemo(() => getReportBySlug(slug || ''), [slug]);
  const { mutate: generate, loading: generating } = useGenerateReport();

  const [params, setParams] = useState<ReportParams>({});
  const [generated, setGenerated] = useState(false);

  if (!report) {
    return (
      <div className="text-center py-20">
        <p className="text-sm font-medium" style={{ color: NAVY }}>Report not found</p>
        <button onClick={() => navigate('/reports')} className="mt-3 text-sm text-[#1E2D4D] hover:underline">Back to Reports</button>
      </div>
    );
  }

  const cat = CATEGORY_META[report.category];
  const Icon = report.icon;

  const updateParam = (key: string, value: unknown) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    try {
      await generate({ slug: report.slug, params });
      setGenerated(true);
    } catch { /* mutation hook handles error */ }
  };

  const handleExportPdf = () => alert('PDF export — requires live data');
  const handleExportExcel = () => alert('Excel export — requires live data');
  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_TERTIARY }}>
        <Link to="/reports" className="hover:text-[#1E2D4D] flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Reports
        </Link>
        <span>/</span>
        <span style={{ color: NAVY, fontWeight: 600 }}>{report.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: cat.bg }}>
          <Icon className="w-6 h-6" style={{ color: cat.color }} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>{report.title}</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>{report.description}</p>
          <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: cat.color, background: cat.bg }}>
            {cat.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameters form */}
        <div className="lg:col-span-2 rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <h2 className="text-sm font-bold mb-4" style={{ color: NAVY }}>Report Parameters</h2>

          {report.parameters.length === 0 ? (
            <p className="text-xs" style={{ color: TEXT_TERTIARY }}>This report has no configurable parameters.</p>
          ) : (
            <div className="space-y-4">
              {report.parameters.map(p => (
                <div key={p.key}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: MUTED }}>
                    {p.label} {p.required && <span className="text-red-500">*</span>}
                  </label>

                  {p.type === 'dateRange' && (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
                        <input
                          type="date"
                          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/30"
                          style={{ borderColor: CARD_BORDER, color: NAVY }}
                          onChange={e => updateParam(p.key, { ...(params[p.key] as Record<string, string> || {}), start: e.target.value })}
                        />
                      </div>
                      <span className="text-xs" style={{ color: TEXT_TERTIARY }}>to</span>
                      <div className="relative flex-1">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
                        <input
                          type="date"
                          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/30"
                          style={{ borderColor: CARD_BORDER, color: NAVY }}
                          onChange={e => updateParam(p.key, { ...(params[p.key] as Record<string, string> || {}), end: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {p.type === 'select' && (
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/30"
                      style={{ borderColor: CARD_BORDER, color: NAVY }}
                      onChange={e => updateParam(p.key, e.target.value)}
                    >
                      {p.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )}

                  {(p.type === 'multiSelect' || p.type === 'status') && (
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/30"
                      style={{ borderColor: CARD_BORDER, color: NAVY }}
                      onChange={e => updateParam(p.key, [e.target.value])}
                    >
                      {p.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: generating ? '#9CA3AF' : '#1E2D4D' }}
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {generating ? 'Generating...' : 'Generate Report'}
            </button>

            {generated && (
              <>
                <button onClick={handleExportPdf} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors" style={{ borderColor: CARD_BORDER, color: NAVY }}>
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors" style={{ borderColor: CARD_BORDER, color: NAVY }}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </button>
                <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors" style={{ borderColor: CARD_BORDER, color: NAVY }}>
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
            <h3 className="text-xs font-bold uppercase mb-3" style={{ color: TEXT_TERTIARY }}>Report Info</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: TEXT_TERTIARY }}>Category</dt>
                <dd style={{ color: cat.color, fontWeight: 600 }}>{cat.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: TEXT_TERTIARY }}>Parameters</dt>
                <dd style={{ color: NAVY }}>{report.parameters.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: TEXT_TERTIARY }}>Export Formats</dt>
                <dd style={{ color: NAVY }}>PDF, Excel, CSV</dd>
              </div>
            </dl>
          </div>

          {generated && (
            <div className="rounded-xl p-4" style={{ background: '#F0FFF4', border: '1px solid #BBF7D0' }}>
              <p className="text-sm font-semibold text-green-800">Report Generated</p>
              <p className="text-xs text-green-700 mt-1">Your report is ready. Use the export buttons to download.</p>
            </div>
          )}

          {!generated && (
            <div className="rounded-xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p className="text-sm font-semibold text-amber-800">No Data Yet</p>
              <p className="text-xs text-amber-700 mt-1">Configure parameters and click Generate to create this report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
