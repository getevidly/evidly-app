import { useParams } from 'react-router-dom';
import {
  Shield, ShieldCheck, CheckCircle, TrendingUp, Download, Info,
  Flame, UtensilsCrossed, FileCheck, Settings2, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Demo data for public insurer view ─────────────────────────

const DEMO_RISK_DATA = {
  overallScore: 93,
  riskTier: 'Preferred Risk' as const,
  tierColor: '#22c55e',
  tierBg: '#f0fdf4',
  locationName: 'Downtown Kitchen',
  address: '1245 Fulton Street, Fresno, CA 93721',
  industrySegment: 'Casual Dining Restaurant',
  jurisdiction: 'Fresno County, CA',
  orgName: 'Pacific Coast Dining',
  generatedAt: '2026-02-12',
  validUntil: '2026-03-14',
  reportId: 'RSK-2026-0212-001',
  dataPoints: 4847,
  dataPeriod: 'Feb 2025 — Feb 2026',
  trend: 'improving' as const,
  trendDelta: '+11',
  industryPercentile: 92,
  factors: [
    { name: 'Fire Risk', icon: Flame, color: '#ef4444', score: 95, weight: '40%', grade: 'A', detail: 'All fire safety systems current per NFPA 96 (2024). 0 overdue services.', dataPoints: 847 },
    { name: 'Food Safety', icon: UtensilsCrossed, color: '#3b82f6', score: 97, weight: '30%', grade: 'A', detail: '99.4% of 2,016 temperature readings in compliance range. Daily checklists 98% complete.', dataPoints: 2016 },
    { name: 'Documentation', icon: FileCheck, color: '#8b5cf6', score: 92, weight: '20%', grade: 'A-', detail: '94% of required documents current. Photo evidence on 87% of logs.', dataPoints: 324 },
    { name: 'Operational', icon: Settings2, color: '#06b6d4', score: 88, weight: '10%', grade: 'B+', detail: 'Average incident resolution: 2.1 hours. 8 of 9 food handler certs current.', dataPoints: 1660 },
  ],
  trendData: [
    { month: 'Mar', score: 82 }, { month: 'Apr', score: 83 }, { month: 'May', score: 85 },
    { month: 'Jun', score: 84 }, { month: 'Jul', score: 81 }, { month: 'Aug', score: 83 },
    { month: 'Sep', score: 86 }, { month: 'Oct', score: 88 }, { month: 'Nov', score: 90 },
    { month: 'Dec', score: 91 }, { month: 'Jan', score: 92 }, { month: 'Feb', score: 93 },
  ],
};

// ── Component ─────────────────────────────────────────────────

export default function InsuranceRiskShared() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const d = DEMO_RISK_DATA;

  const handleDownloadPDF = async () => {
    try {
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const W = 210;
      const H = 297;
      const M = 14;
      const cW = W - 2 * M;
      let y = 20;

      // Header bar
      pdf.setFillColor(30, 77, 107);
      pdf.rect(0, 0, W, 14, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text('EvidLY — Insurance Risk Assessment Report', M, 9);
      pdf.setTextColor(212, 175, 55);
      pdf.text(d.reportId, W - M, 9, { align: 'right' });

      // Title
      y = 28;
      pdf.setTextColor(30, 77, 107);
      pdf.setFontSize(18);
      pdf.text('Insurance Risk Assessment', M, y);
      y += 8;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Powered by EvidLY Compliance Data', M, y);

      // Location info
      y += 14;
      pdf.setFontSize(10);
      pdf.setTextColor(50, 50, 50);
      pdf.text(`Location: ${d.locationName}`, M, y); y += 6;
      pdf.text(`Address: ${d.address}`, M, y); y += 6;
      pdf.text(`Industry: ${d.industrySegment}`, M, y); y += 6;
      pdf.text(`Jurisdiction: ${d.jurisdiction}`, M, y); y += 6;
      pdf.text(`Organization: ${d.orgName}`, M, y);

      // Score box
      y += 14;
      pdf.setFillColor(240, 253, 244);
      pdf.roundedRect(M, y, cW, 30, 3, 3, 'F');
      pdf.setFontSize(24);
      pdf.setTextColor(34, 197, 94);
      pdf.text(`${d.overallScore}`, M + 15, y + 18);
      pdf.setFontSize(10);
      pdf.text('/ 100', M + 33, y + 18);
      pdf.setFontSize(14);
      pdf.setTextColor(30, 77, 107);
      pdf.text(d.riskTier, M + 60, y + 14);
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${d.industryPercentile}nd Percentile  •  Trend: ${d.trend} (${d.trendDelta} pts)`, M + 60, y + 22);

      // Factor table
      y += 40;
      pdf.setFontSize(12);
      pdf.setTextColor(30, 77, 107);
      pdf.text('Factor Breakdown', M, y);
      y += 8;
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text('Category', M, y);
      pdf.text('Score', M + 60, y);
      pdf.text('Grade', M + 80, y);
      pdf.text('Weight', M + 100, y);
      pdf.text('Data Points', M + 120, y);
      y += 2;
      pdf.setDrawColor(220, 220, 220);
      pdf.line(M, y, W - M, y);
      y += 5;
      pdf.setTextColor(50, 50, 50);
      pdf.setFontSize(9);
      for (const f of d.factors) {
        pdf.text(f.name, M, y);
        pdf.text(`${f.score}`, M + 62, y);
        pdf.text(f.grade, M + 82, y);
        pdf.text(f.weight, M + 102, y);
        pdf.text(`${f.dataPoints.toLocaleString()}`, M + 122, y);
        y += 7;
      }

      // About
      y += 8;
      pdf.setFontSize(12);
      pdf.setTextColor(30, 77, 107);
      pdf.text('About This Score', M, y);
      y += 7;
      pdf.setFontSize(8.5);
      pdf.setTextColor(80, 80, 80);
      const aboutLines = pdf.splitTextToSize(
        `This score is based on ${d.dataPoints.toLocaleString()} verified data points collected over 12 months of continuous compliance monitoring via EvidLY. Data includes temperature readings, daily checklists, incident reports, equipment service records, and document management. Score generated: ${d.generatedAt}. Valid through: ${d.validUntil}.`,
        cW
      );
      pdf.text(aboutLines, M, y);

      // Footer
      pdf.setFontSize(6);
      pdf.setTextColor(160, 160, 160);
      pdf.text(`Report ID: ${d.reportId}`, M, H - 8);
      pdf.text(`Generated ${d.generatedAt}  •  Valid through ${d.validUntil}`, M, H - 4);
      pdf.text('EvidLY  •  evidly.com  •  partnerships@evidly.com', W - M, H - 4, { align: 'right' });

      pdf.save(`EvidLY-Risk-Assessment-${d.reportId}.pdf`);
      toast.success('Risk assessment PDF downloaded');
    } catch {
      toast.error('PDF generation failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-[#1e4d6b] text-white px-4 sm:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7" style={{ color: '#d4af37' }} />
            <div>
              <span className="text-lg font-bold">
                <span className="text-white">Evid</span>
                <span style={{ color: '#d4af37' }}>LY</span>
              </span>
              <p className="text-[10px] text-gray-300 -mt-0.5">Compliance Simplified</p>
            </div>
          </div>
          <span className="text-xs text-gray-300 hidden sm:block">Insurance Risk Assessment</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Risk Assessment</h1>
          <p className="text-sm text-gray-500 mt-1">Powered by EvidLY Compliance Data</p>
        </div>

        {/* Location Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div><span className="text-gray-500">Location:</span> <span className="font-medium text-gray-900">{d.locationName}</span></div>
            <div><span className="text-gray-500">Organization:</span> <span className="font-medium text-gray-900">{d.orgName}</span></div>
            <div><span className="text-gray-500">Address:</span> <span className="font-medium text-gray-900">{d.address}</span></div>
            <div><span className="text-gray-500">Industry:</span> <span className="font-medium text-gray-900">{d.industrySegment}</span></div>
            <div><span className="text-gray-500">Jurisdiction:</span> <span className="font-medium text-gray-900">{d.jurisdiction}</span></div>
            <div><span className="text-gray-500">Data Period:</span> <span className="font-medium text-gray-900">{d.dataPeriod}</span></div>
          </div>
        </div>

        {/* Risk Score Hero */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Risk Score</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center border-4 flex-shrink-0"
              style={{ borderColor: d.tierColor, backgroundColor: d.tierBg }}
            >
              <div className="text-center">
                <div className="text-4xl font-bold" style={{ color: d.tierColor }}>{d.overallScore}</div>
                <div className="text-xs text-gray-500">of 100</div>
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div
                className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-3"
                style={{ backgroundColor: d.tierBg, color: d.tierColor, border: `1px solid ${d.tierColor}` }}
              >
                {d.riskTier}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-gray-50">
                  <div className="text-lg font-bold" style={{ color: '#1e4d6b' }}>{d.industryPercentile}nd</div>
                  <div className="text-[10px] text-gray-500">Percentile</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-50">
                  <div className="text-lg font-bold text-green-600">{d.trendDelta}</div>
                  <div className="text-[10px] text-gray-500">12mo Change</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-50">
                  <div className="text-lg font-bold" style={{ color: '#1e4d6b' }}>{d.dataPoints.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-500">Data Points</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Factor Breakdown</h2>
          <div className="space-y-4">
            {d.factors.map(f => (
              <div key={f.name} className="flex items-start gap-4 p-3 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: f.color + '15' }}>
                  <f.icon className="h-5 w-5" style={{ color: f.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">{f.weight}</span>
                      <span className="text-lg font-bold" style={{ color: f.score >= 90 ? '#22c55e' : f.score >= 75 ? '#eab308' : '#ef4444' }}>{f.score}</span>
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: f.score >= 90 ? '#f0fdf4' : '#fefce8', color: f.score >= 90 ? '#22c55e' : '#eab308' }}>{f.grade}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{f.detail}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{f.dataPoints.toLocaleString()} data points</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 12-Month Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">12-Month Trend</h2>
          <svg viewBox="0 0 600 160" className="w-full" style={{ maxHeight: 180 }}>
            {[60, 70, 80, 90, 100].map((v, i) => {
              const y2 = 140 - ((v - 55) / 50) * 120;
              return (
                <g key={i}>
                  <line x1={40} x2={570} y1={y2} y2={y2} stroke="#f1f5f9" strokeWidth={1} />
                  <text x={32} y={y2 + 4} textAnchor="end" className="text-[10px] fill-gray-400">{v}</text>
                </g>
              );
            })}
            {d.trendData.map((pt, i) => (
              <text key={i} x={40 + (i / 11) * 530} y={155} textAnchor="middle" className="text-[9px] fill-gray-400">{pt.month}</text>
            ))}
            <path
              d={d.trendData.map((pt, i) => `${i === 0 ? 'M' : 'L'}${40 + (i / 11) * 530},${140 - ((pt.score - 55) / 50) * 120}`).join(' ')}
              fill="none" stroke="#1e4d6b" strokeWidth={2.5}
            />
            {d.trendData.map((pt, i) => (
              <circle key={i} cx={40 + (i / 11) * 530} cy={140 - ((pt.score - 55) / 50) * 120} r={3.5} fill="#1e4d6b" stroke="#fff" strokeWidth={1.5} />
            ))}
          </svg>
          <div className="flex items-center justify-center gap-1 mt-2 text-xs text-green-600 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            Improving — {d.trendDelta} points over 12 months
          </div>
        </div>

        {/* About This Score */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">About This Score</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            This score is based on <strong>{d.dataPoints.toLocaleString()}</strong> verified data points collected over 12 months of continuous compliance monitoring via EvidLY.
            Data includes temperature readings, daily checklists, incident reports, equipment service records, and document management.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center text-xs">
            <div className="p-2 rounded-lg bg-gray-50">
              <div className="font-semibold text-gray-900">{d.generatedAt}</div>
              <div className="text-gray-400">Generated</div>
            </div>
            <div className="p-2 rounded-lg bg-gray-50">
              <div className="font-semibold text-gray-900">{d.validUntil}</div>
              <div className="text-gray-400">Valid Until</div>
            </div>
            <div className="p-2 rounded-lg bg-gray-50">
              <div className="font-semibold text-gray-900">{d.reportId}</div>
              <div className="text-gray-400">Report ID</div>
            </div>
            <div className="p-2 rounded-lg bg-gray-50">
              <div className="font-semibold text-gray-900">{d.dataPeriod}</div>
              <div className="text-gray-400">Data Period</div>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 min-h-[44px]"
              style={{ backgroundColor: '#1e4d6b' }}
            >
              <Download className="h-4 w-4" /> Download PDF Report
            </button>
          </div>
        </div>

        {/* For Insurance Professionals */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
          <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: '#1e4d6b' }} />
            For Insurance Professionals
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            Interested in integrating EvidLY risk scores into your underwriting process?
            Our API provides real-time, continuous compliance data to support evidence-based premium decisions.
          </p>
          <a
            href="mailto:partnerships@evidly.com"
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: '#1e4d6b' }}
          >
            partnerships@evidly.com <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4" style={{ color: '#d4af37' }} />
            <span className="text-sm font-bold">
              <span className="text-gray-900">Evid</span>
              <span style={{ color: '#d4af37' }}>LY</span>
            </span>
          </div>
          <p className="text-xs text-gray-400">Compliance Simplified · evidly.com</p>
        </div>
      </div>
    </div>
  );
}
