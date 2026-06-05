import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, AlertTriangle, Clock } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────

interface ReportSection {
  act: 'predict' | 'reduce' | 'prove';
  heading: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ContentJson {
  executive_summary: string;
  sections: ReportSection[];
  generated_at: string;
  org_name?: string;
}

interface ReportData {
  id: string;
  report_type: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  content_json: ContentJson;
  share_expires: string | null;
  org_name: string | null;
  created_at: string;
}

// ── Act badge config ──────────────────────────────────────

const ACT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  predict: { label: 'Predict', color: '#BA7517', bg: '#FEF3C7' },
  reduce:  { label: 'Reduce',  color: '#185FA5', bg: '#DBEAFE' },
  prove:   { label: 'Prove',   color: '#0F6E56', bg: '#D1FAE5' },
};

// ── Main component ────────────────────────────────────────

export function ReportViewer() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setError('No share token provided');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const res = await fetch(
          `${baseUrl}/functions/v1/generate-report?token=${encodeURIComponent(shareToken)}`,
          { method: 'GET' },
        );
        const json = await res.json();

        if (!res.ok) {
          if (res.status === 410) {
            setError('This share link has expired.');
          } else {
            setError(json.error || 'Report not found');
          }
          setLoading(false);
          return;
        }

        setReport(json.report as ReportData);
      } catch {
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [shareToken]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#A08C5A] mx-auto" />
          <p className="mt-4 text-sm text-[#1E2D4D]/60">Loading report...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-[#E5E0D8] p-8 text-center max-w-md w-full">
          <div className="mx-auto w-[52px] h-[52px] rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h2 className="text-[#1E2D4D] font-bold text-base mb-2">
            {error === 'This share link has expired.' ? 'Link Expired' : 'Report Not Found'}
          </h2>
          <p className="text-[#1E2D4D]/60 text-sm">
            {error || 'This report could not be loaded. The link may be invalid or the report may have been removed.'}
          </p>
        </div>
      </div>
    );
  }

  const content = report.content_json;
  const periodLabel = report.period_start && report.period_end
    ? `${new Date(report.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(report.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : null;

  return (
    <div className="min-h-screen bg-[#FAF7F0]">
      {/* Co-branded header */}
      <div className="bg-[#1E2D4D] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#A08C5A] flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <span className="text-white text-sm font-bold">EvidLY</span>
              {report.org_name && (
                <span className="text-white/60 text-sm ml-2">
                  &middot; {report.org_name}
                </span>
              )}
            </div>
          </div>
          {report.share_expires && (
            <div className="flex items-center gap-1.5 text-white/50 text-xs">
              <Clock size={12} />
              <span>
                Expires {new Date(report.share_expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-[#1E2D4D] text-xl font-bold">{report.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-[#1E2D4D]/50">
            {periodLabel && <span>{periodLabel}</span>}
            <span>
              Generated {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Executive Summary */}
        {content?.executive_summary && (
          <div className="bg-white rounded-xl border border-[#E5E0D8] px-6 py-5">
            <h2 className="text-[#1E2D4D] font-bold text-sm uppercase tracking-wide mb-2">
              Executive Summary
            </h2>
            <p className="text-[#1E2D4D]/80 text-sm leading-relaxed">
              {content.executive_summary}
            </p>
          </div>
        )}

        {/* Three-act sections */}
        {content?.sections?.map((section, idx) => {
          const act = ACT_CONFIG[section.act] || ACT_CONFIG.predict;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-[#E5E0D8] overflow-hidden"
              style={{ borderTop: `3px solid ${act.color}` }}
            >
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: act.bg, color: act.color }}
                  >
                    {act.label}
                  </span>
                  <h3 className="text-[#1E2D4D] font-semibold text-sm">
                    {section.heading}
                  </h3>
                </div>
                <p className="text-[#1E2D4D]/70 text-sm leading-relaxed whitespace-pre-wrap">
                  {section.body}
                </p>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-[#1E2D4D]/30 text-xs">
            Generated by EvidLY &middot; {content?.generated_at
              ? new Date(content.generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : ''}
          </p>
          <p className="text-[#1E2D4D]/20 text-[10px] mt-1">
            This report reflects data available at the time of generation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReportViewer;
