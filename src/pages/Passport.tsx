import { useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, Download, Loader2, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useParams, useNavigate } from 'react-router-dom';
import { useDemo } from '../contexts/DemoContext';
import { locations, locationScores, LOCATION_JURISDICTION_STATUS } from '../data/demoData';
import { FACILITY_INFO } from '../lib/reportGenerator';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

// Static jurisdiction metadata keyed by county
const JURISDICTION_META: Record<string, {
  name: string;
  authority: string;
  gradingMethodology: string;
  inspectionFrequency: string;
}> = {
  Fresno: {
    name: 'Fresno County',
    authority: 'Fresno County Dept. of Public Health',
    gradingMethodology: 'Violation-based scoring (CalCode §113700 et seq.)',
    inspectionFrequency: 'Routine: 1-3x per year based on risk tier',
  },
  Merced: {
    name: 'Merced County',
    authority: 'Merced County Dept. of Public Health',
    gradingMethodology: 'Three-tier point system (Major/Minor/Good Practice)',
    inspectionFrequency: 'Routine: 2x per year; increased for high-risk',
  },
  Stanislaus: {
    name: 'Stanislaus County',
    authority: 'Stanislaus County Dept. of Environmental Resources',
    gradingMethodology: 'Violation-based scoring (CalCode §113700 et seq.)',
    inspectionFrequency: 'Routine: 1-2x per year; monthly for critical violations',
  },
};

export default function Passport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const passportRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // ── Live-mode empty state: no hardcoded demo data ──
  if (!isDemoMode) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-[#1e4d6b] text-white py-6 px-6">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <EvidlyIcon size={40} />
            <div>
              <h1 className="font-['Outfit'] text-2xl font-bold">Compliance Passport</h1>
              <p className="text-sm text-gray-300">Live Compliance Status</p>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Your compliance passport is not yet available.</p>
          <p className="text-gray-400 text-sm mt-1">Complete your location setup to generate a compliance passport.</p>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Resolve location data from demo data using URL param
  const urlId = id || 'downtown';
  const loc = locations.find(l => l.urlId === urlId) || locations[0];
  const scores = locationScores[urlId] || locationScores['downtown'];
  const facility = FACILITY_INFO[urlId] || FACILITY_INFO['downtown'];
  const jurisdictionStatus = LOCATION_JURISDICTION_STATUS[urlId] || LOCATION_JURISDICTION_STATUS['downtown'];
  const jurisdictionMeta = JURISDICTION_META[facility.county] || JURISDICTION_META['Fresno'];

  const passportUrl = `${window.location.origin}/passport/${urlId}`;

  const locationData = {
    name: loc.name,
    address: loc.address,
    overall: null as number | null, // DEPRECATED — no composite score
    foodSafety: scores.foodSafety,
    facilitySafety: scores.facilitySafety,
  };

  // Build activity items from real jurisdiction status
  const recentActivity: { icon: typeof CheckCircle2; text: string; status: string }[] = [];

  if (jurisdictionStatus.foodSafety.status === 'passing') {
    recentActivity.push({ icon: CheckCircle2, text: `Food Safety: ${jurisdictionStatus.foodSafety.gradeDisplay} (${jurisdictionStatus.foodSafety.authority})`, status: 'success' });
  } else {
    recentActivity.push({ icon: AlertCircle, text: `Food Safety: ${jurisdictionStatus.foodSafety.gradeDisplay} (${jurisdictionStatus.foodSafety.authority})`, status: 'warning' });
  }

  if (jurisdictionStatus.facilitySafety.status === 'passing') {
    recentActivity.push({ icon: CheckCircle2, text: `Facility Safety: ${jurisdictionStatus.facilitySafety.gradeDisplay} (${jurisdictionStatus.facilitySafety.authority})`, status: 'success' });
  } else {
    recentActivity.push({ icon: AlertCircle, text: `Facility Safety: ${jurisdictionStatus.facilitySafety.gradeDisplay} (${jurisdictionStatus.facilitySafety.authority})`, status: 'warning' });
  }

  // Static activity items per location
  if (urlId === 'downtown') {
    recentActivity.push(
      { icon: CheckCircle2, text: 'Temperature logs current (312 logs this month)', status: 'success' },
      { icon: CheckCircle2, text: 'Hood cleaning certificate valid through Aug 2026', status: 'success' },
      { icon: CheckCircle2, text: 'All food handler certifications current', status: 'success' },
    );
  } else if (urlId === 'airport') {
    recentActivity.push(
      { icon: AlertCircle, text: 'Walk-in cooler at 42°F — calibration needed', status: 'warning' },
      { icon: AlertCircle, text: 'Food handler cert expiring in 10 days (Sarah Johnson)', status: 'warning' },
      { icon: CheckCircle2, text: 'Fire extinguishers inspected Jan 2026', status: 'success' },
    );
  } else {
    recentActivity.push(
      { icon: AlertCircle, text: 'Reach-in cooler exceeding 41°F max', status: 'warning' },
      { icon: AlertCircle, text: 'Fire suppression system 4 months overdue', status: 'warning' },
      { icon: AlertCircle, text: '2 food handler certificates expired', status: 'warning' },
    );
  }

  const getScoreColor = (s: number) =>
    s >= 90 ? '#22c55e' : s >= 75 ? '#eab308' : s >= 60 ? '#f59e0b' : '#ef4444';

  const doDownloadPDF = async () => {
    if (!passportRef.current) return;
    setPdfLoading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;

      const canvas = await html2canvas(passportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      const margin = 8;
      const hdrH = 10;
      const ftrH = 8;
      const usableH = pageH - hdrH - ftrH;
      const imgW = pageW - 2 * margin;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let pageIdx = 0;

      while (heightLeft > 0 || pageIdx === 0) {
        if (pageIdx > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, hdrH - pageIdx * usableH, imgW, imgH);
        heightLeft -= usableH;
        pageIdx++;
      }

      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageW, hdrH, 'F');
        pdf.rect(0, pageH - ftrH, pageW, ftrH, 'F');
        pdf.setFillColor(30, 77, 107);
        pdf.rect(0, 0, pageW, hdrH, 'F');
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        pdf.text('EvidLY — Compliance Passport', margin, 6.5);
        pdf.setTextColor(212, 175, 55);
        pdf.text(locationData.name, pageW - margin, 6.5, { align: 'right' });
        pdf.setFontSize(6);
        pdf.setTextColor(160, 160, 160);
        pdf.text(`Generated: ${today}`, margin, pageH - 3);
        pdf.text(`Page ${i} of ${total}`, pageW - margin, pageH - 3, { align: 'right' });
      }

      pdf.save(`EvidLY-Passport-${loc.urlId}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      // PDF generation failed — no-op in guarded context
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    guardAction('download', 'Vendor Passport', () => { doDownloadPDF(); });
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#1e4d6b] text-white py-6 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EvidlyIcon size={40} />
            <div>
              <h1 className="font-['Outfit'] text-2xl font-bold">EvidLY Compliance Passport</h1>
              <p className="text-sm text-gray-300">Live Compliance Status</p>
            </div>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{ background: '#A08C5A', color: '#ffffff' }}
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {pdfLoading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </header>

      <div style={{ padding: '12px 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
        <span onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer', color: '#1e4d6b' }}>Dashboard</span>
        <span style={{ color: '#6B7F96' }}>&rsaquo;</span>
        <span onClick={() => navigate('/dashboard?tab=passport')} style={{ cursor: 'pointer', color: '#1e4d6b' }}>QR Passport</span>
        <span style={{ color: '#6B7F96' }}>&rsaquo;</span>
        <span style={{ color: '#6B7F96' }}>{locationData.name}</span>
      </div>

      {/* Ref wrapper for PDF capture */}
      <div ref={passportRef}>
        <main className="max-w-4xl mx-auto px-6 py-12">
          <div className="mb-12">
            <h2 className="font-['Outfit'] text-3xl font-bold text-[#1e4d6b] mb-2">
              {locationData.name}
            </h2>
            <p className="text-gray-600 text-lg mb-1">{locationData.address}</p>
            <p className="text-sm text-gray-500">Last updated: {today}</p>
          </div>

          {/* Pillar Score Rings */}
          <div className="mb-16">
            <div className="flex items-center justify-center gap-8 mb-8">
              {/* Food Safety Ring */}
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="68" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                    <circle
                      cx="80" cy="80" r="68"
                      stroke={getScoreColor(locationData.foodSafety)}
                      strokeWidth="12" fill="none"
                      strokeDasharray={`${2 * Math.PI * 68}`}
                      strokeDashoffset={`${2 * Math.PI * 68 * (1 - locationData.foodSafety / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-4xl font-bold" style={{ color: getScoreColor(locationData.foodSafety) }}>{locationData.foodSafety}</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-600 mt-2">Food Safety</div>
              </div>
              {/* Facility Safety Ring */}
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="68" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                    <circle
                      cx="80" cy="80" r="68"
                      stroke={getScoreColor(locationData.facilitySafety)}
                      strokeWidth="12" fill="none"
                      strokeDasharray={`${2 * Math.PI * 68}`}
                      strokeDashoffset={`${2 * Math.PI * 68 * (1 - locationData.facilitySafety / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-4xl font-bold" style={{ color: getScoreColor(locationData.facilitySafety) }}>{locationData.facilitySafety}</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-600 mt-2">Facility Safety</div>
              </div>
            </div>
          </div>

          {/* Compliance Breakdown */}
          <div className="mb-12">
            <h3 className="font-['Outfit'] text-2xl font-bold text-[#1e4d6b] mb-6">
              Compliance Breakdown
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-700">Food Safety</span>
                  <span className="font-bold" style={{ color: getScoreColor(locationData.foodSafety) }}>{locationData.foodSafety}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="h-3 rounded-full transition-all" style={{ width: `${locationData.foodSafety}%`, backgroundColor: getScoreColor(locationData.foodSafety) }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-700">Facility Safety</span>
                  <span className="font-bold" style={{ color: getScoreColor(locationData.facilitySafety) }}>{locationData.facilitySafety}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="h-3 rounded-full transition-all" style={{ width: `${locationData.facilitySafety}%`, backgroundColor: getScoreColor(locationData.facilitySafety) }} />
                </div>
              </div>
            </div>
          </div>

          {/* Jurisdiction & Inspection Methodology */}
          <div className="mb-12">
            <h3 className="font-['Outfit'] text-2xl font-bold text-[#1e4d6b] mb-6">
              Jurisdiction & Inspection Methodology
            </h3>
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-200">
                <div className="bg-white p-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Jurisdiction</div>
                  <div className="text-sm font-semibold text-gray-900">{jurisdictionMeta.name}</div>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Authority</div>
                  <div className="text-sm font-semibold text-gray-900">{jurisdictionMeta.authority}</div>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Grading Methodology</div>
                  <div className="text-sm font-semibold text-gray-900">{jurisdictionMeta.gradingMethodology}</div>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Inspection Frequency</div>
                  <div className="text-sm font-semibold text-gray-900">{jurisdictionMeta.inspectionFrequency}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Compliance Activity */}
          <div className="mb-12">
            <h3 className="font-['Outfit'] text-2xl font-bold text-[#1e4d6b] mb-6">
              Recent Compliance Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-4 p-4 rounded-lg ${
                    item.status === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <item.icon
                    className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                      item.status === 'success' ? 'text-green-600' : 'text-yellow-600'
                    }`}
                    strokeWidth={2}
                  />
                  <span className="text-gray-800 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QR Code Section */}
          <div className="mb-12 flex flex-col items-center">
            <h3 className="font-['Outfit'] text-2xl font-bold text-[#1e4d6b] mb-6 self-start">
              QR Passport Code
            </h3>
            <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
              <QRCodeSVG value={passportUrl} size={160} level="M" fgColor="#1E2D4D" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Scan to view this passport anytime</p>
          </div>
        </main>
      </div>

      <footer className="bg-gray-50 border-t border-gray-200 py-8 px-6 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600 font-medium mb-2">
            Powered by EvidLY — Compliance Simplified
          </p>
          <a
            href="https://getevidly.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1e4d6b] hover:text-[#1e4d6b] font-semibold transition-colors"
          >
            Learn more at getevidly.com
          </a>
        </div>
      </footer>

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
