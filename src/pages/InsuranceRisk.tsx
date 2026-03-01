import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Flame,
  UtensilsCrossed,
  FileCheck,
  Settings2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Code,
  ExternalLink,
  Info,
  Lock,
  ShieldAlert,
  TrendingUp,
  Share2,
  Copy,
  Mail,
  Link2,
  X,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
import { AiUpgradePrompt } from '../components/AiUpgradePrompt';
import { FeatureGate } from '../components/FeatureGate';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { getAiTier, isFeatureAvailable } from '../lib/aiTier';
import { locations, locationScores, vendors, needsAttentionItems } from '../data/demoData';
import {
  calculateInsuranceRiskScore,
  calculateOrgInsuranceRiskScore,
  getInsuranceRiskTier,
  type InsuranceRiskCategory,
  type InsuranceRiskFactor,
  type InsuranceActionItem,
  type InsuranceRiskResult,
} from '../lib/insuranceRiskScore';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const CATEGORY_ICONS: Record<string, typeof Flame> = {
  fire: Flame,
  foodSafety: UtensilsCrossed,
  documentation: FileCheck,
  operational: Settings2,
};

const CATEGORY_COLORS: Record<string, string> = {
  fire: '#ef4444',
  foodSafety: '#3b82f6',
  documentation: '#8b5cf6',
  operational: '#06b6d4',
};

function StatusIcon({ status }: { status: InsuranceRiskFactor['status'] }) {
  switch (status) {
    case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Info className="h-4 w-4 text-gray-400" />;
  }
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(2, score)}%`, backgroundColor: color }} />
    </div>
  );
}

function PriorityBadge({ priority }: { priority: InsuranceActionItem['priority'] }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    high: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
    medium: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    low: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  };
  const s = styles[priority];
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, textTransform: 'uppercase' }}>
      {priority}
    </span>
  );
}

// --------------- PDF Generator ---------------

async function generateInsuranceReportPDF(result: InsuranceRiskResult, locationLabel: string) {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = 210;
  const H = 297;
  const M = 14; // margin
  const contentW = W - 2 * M;
  const tierInfo = getInsuranceRiskTier(result.overall);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Colors
  const BLUE = [30, 77, 107] as const;
  const GOLD = [212, 175, 55] as const;
  const GRAY = [107, 114, 128] as const;
  const LGRAY = [156, 163, 175] as const;
  const BLACK = [17, 24, 39] as const;
  const WHITE = [255, 255, 255] as const;

  function tierColor(score: number): readonly [number, number, number] {
    if (score >= 90) return [34, 197, 94];
    if (score >= 75) return [234, 179, 8];
    if (score >= 60) return [245, 158, 11];
    return [239, 68, 68];
  }

  // --- Header/Footer helpers ---
  function drawHeader(pageNum: number, totalPages: number) {
    pdf.setFillColor(...BLUE);
    pdf.rect(0, 0, W, 14, 'F');
    pdf.setFontSize(7);
    pdf.setTextColor(...WHITE);
    pdf.text('EvidLY — Verified Kitchen Risk Profile', M, 9);
    pdf.setTextColor(...GOLD);
    pdf.text(`Page ${pageNum} of ${totalPages}`, W - M, 9, { align: 'right' });
  }

  function drawFooter() {
    pdf.setFontSize(5.5);
    pdf.setTextColor(...LGRAY);
    pdf.text(
      'This report documents compliance activities tracked through the EvidLY platform. Premium decisions are made solely by insurance carriers based on their underwriting criteria.',
      M, H - 8, { maxWidth: contentW }
    );
    pdf.text(`Generated ${dateStr}`, M, H - 4);
    pdf.text('EvidLY — Lead with Confidence', W - M, H - 4, { align: 'right' });
  }

  let y = 20; // start after header

  function checkPage(needed: number) {
    if (y + needed > H - 16) {
      pdf.addPage();
      y = 20;
    }
  }

  function sectionTitle(title: string) {
    checkPage(12);
    pdf.setFontSize(11);
    pdf.setTextColor(...BLUE);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, M, y);
    y += 2;
    pdf.setDrawColor(...GOLD);
    pdf.setLineWidth(0.5);
    pdf.line(M, y, M + contentW, y);
    y += 6;
  }

  function bodyText(text: string, opts?: { bold?: boolean; size?: number; color?: readonly [number, number, number]; indent?: number }) {
    const size = opts?.size || 8;
    const color = opts?.color || BLACK;
    checkPage(size * 0.6);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    pdf.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    const x = M + (opts?.indent || 0);
    const lines = pdf.splitTextToSize(text, contentW - (opts?.indent || 0));
    pdf.text(lines, x, y);
    y += lines.length * (size * 0.45) + 1.5;
  }

  // ============================================
  // PAGE 1: Title + Overall Score + Categories
  // ============================================

  // Title block
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 0, W, 50, 'F');
  pdf.setFontSize(18);
  pdf.setTextColor(...WHITE);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EvidLY Verified Kitchen Risk Profile', M, 28);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...GOLD);
  pdf.text(`${locationLabel}  •  Demo Restaurant Group  •  ${dateStr}`, M, 38);
  pdf.text('Confidential — Prepared for Insurance Carrier Review', M, 44);

  y = 58;

  // Overall score box
  const scoreBoxW = 50;
  const scoreBoxH = 40;
  const tc = tierColor(result.overall);
  pdf.setFillColor(tc[0], tc[1], tc[2]);
  pdf.roundedRect(M, y, scoreBoxW, scoreBoxH, 3, 3, 'F');
  pdf.setFontSize(28);
  pdf.setTextColor(...WHITE);
  pdf.setFont('helvetica', 'bold');
  pdf.text(String(result.overall), M + scoreBoxW / 2, y + 20, { align: 'center' });
  pdf.setFontSize(8);
  pdf.text('of 100', M + scoreBoxW / 2, y + 28, { align: 'center' });
  pdf.setFontSize(7);
  pdf.text(result.tier, M + scoreBoxW / 2, y + 35, { align: 'center' });

  // Category summary beside score
  const catX = M + scoreBoxW + 10;
  let catY = y + 2;
  pdf.setFontSize(10);
  pdf.setTextColor(...BLACK);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Risk Category Breakdown', catX, catY);
  catY += 6;

  for (const cat of result.categories) {
    const ctc = tierColor(cat.score);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...BLACK);
    pdf.text(`${cat.name} (${Math.round(cat.weight * 100)}%)`, catX, catY);
    // Score bar
    const barX = catX + 70;
    const barW = 50;
    pdf.setFillColor(230, 230, 230);
    pdf.roundedRect(barX, catY - 3, barW, 4, 1, 1, 'F');
    pdf.setFillColor(ctc[0], ctc[1], ctc[2]);
    pdf.roundedRect(barX, catY - 3, barW * cat.score / 100, 4, 1, 1, 'F');
    // Score number
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(ctc[0], ctc[1], ctc[2]);
    pdf.text(String(cat.score), barX + barW + 4, catY);
    catY += 8;
  }

  y += scoreBoxH + 8;
  bodyText(`${result.factorsEvaluated} individual factors evaluated across 4 categories. Higher scores indicate lower risk.`, { size: 7, color: GRAY });
  y += 2;

  // ============================================
  // FACILITY SAFETY COMPLIANCE SUMMARY
  // ============================================
  sectionTitle('Facility Safety Compliance Summary');

  const fireCat = result.categories.find(c => c.key === 'fire');
  if (fireCat) {
    bodyText(`Category Score: ${fireCat.score}/100 — Weight: 40% of total score`, { bold: true, size: 8 });
    y += 1;

    // Vendor service dates
    const locId = locationLabel.toLowerCase().replace(/\s+kitchen$/i, '');
    const locObj = locations.find(l => l.name.toLowerCase().includes(locId)) || locations[0];
    const vendorLocId = locObj?.id || '1';
    const fireVendors = vendors.filter(v => v.locationId === vendorLocId && ['Hood Cleaning', 'Fire Suppression', 'Grease Trap'].includes(v.serviceType));
    if (fireVendors.length > 0) {
      bodyText('Service History:', { bold: true, size: 7.5 });
      for (const v of fireVendors) {
        const statusLabel = v.status === 'overdue' ? 'OVERDUE' : v.status === 'upcoming' ? 'UPCOMING' : 'CURRENT';
        bodyText(`• ${v.serviceType} (${v.company}) — Last: ${v.lastService} | Next: ${v.nextDue} | Status: ${statusLabel}`, { size: 7, indent: 3 });
      }
      y += 1;
    }

    // Factor table
    bodyText('Factor Details:', { bold: true, size: 7.5 });
    for (const f of fireCat.factors) {
      const statusEmoji = f.status === 'pass' ? '✓' : f.status === 'warning' ? '⚠' : '✗';
      bodyText(`${statusEmoji} ${f.name} — Score: ${f.score}/100 (${f.reference})`, { size: 7, indent: 3 });
      bodyText(`  ${f.detail}`, { size: 6.5, color: GRAY, indent: 6 });
    }
  }

  // ============================================
  // FOOD SAFETY COMPLIANCE METRICS
  // ============================================
  sectionTitle('Food Safety Compliance Metrics');

  const foodCat = result.categories.find(c => c.key === 'foodSafety');
  if (foodCat) {
    bodyText(`Category Score: ${foodCat.score}/100 — Weight: 30% of total score`, { bold: true, size: 8 });
    y += 1;
    bodyText('Factor Details:', { bold: true, size: 7.5 });
    for (const f of foodCat.factors) {
      const statusEmoji = f.status === 'pass' ? '✓' : f.status === 'warning' ? '⚠' : '✗';
      bodyText(`${statusEmoji} ${f.name} — Score: ${f.score}/100 (${f.reference})`, { size: 7, indent: 3 });
      bodyText(`  ${f.detail}`, { size: 6.5, color: GRAY, indent: 6 });
    }
  }

  // ============================================
  // DOCUMENTATION COMPLETENESS
  // ============================================
  sectionTitle('Documentation Completeness');

  const docCat = result.categories.find(c => c.key === 'documentation');
  if (docCat) {
    bodyText(`Category Score: ${docCat.score}/100 — Weight: 20% of total score`, { bold: true, size: 8 });
    y += 1;
    bodyText('Factor Details:', { bold: true, size: 7.5 });
    for (const f of docCat.factors) {
      const statusEmoji = f.status === 'pass' ? '✓' : f.status === 'warning' ? '⚠' : '✗';
      bodyText(`${statusEmoji} ${f.name} — Score: ${f.score}/100 (${f.reference})`, { size: 7, indent: 3 });
      bodyText(`  ${f.detail}`, { size: 6.5, color: GRAY, indent: 6 });
    }
  }

  // ============================================
  // OPERATIONAL RISK
  // ============================================
  sectionTitle('Operational Risk Assessment');

  const opCat = result.categories.find(c => c.key === 'operational');
  if (opCat) {
    bodyText(`Category Score: ${opCat.score}/100 — Weight: 10% of total score`, { bold: true, size: 8 });
    y += 1;
    bodyText('Factor Details:', { bold: true, size: 7.5 });
    for (const f of opCat.factors) {
      const statusEmoji = f.status === 'pass' ? '✓' : f.status === 'warning' ? '⚠' : '✗';
      bodyText(`${statusEmoji} ${f.name} — Score: ${f.score}/100 (${f.reference})`, { size: 7, indent: 3 });
      bodyText(`  ${f.detail}`, { size: 6.5, color: GRAY, indent: 6 });
    }
  }

  // ============================================
  // 12-MONTH INCIDENT HISTORY
  // ============================================
  sectionTitle('12-Month Incident History');

  const locObj2 = locations.find(l => l.name.toLowerCase().includes(locationLabel.toLowerCase().replace(/\s+kitchen$/i, ''))) || locations[0];
  const vendorLocId2 = locObj2?.id || '1';
  const locIncidents = needsAttentionItems.filter(i => i.locationId === vendorLocId2);
  const redCount = locIncidents.filter(i => i.color === 'red').length;
  const amberCount = locIncidents.filter(i => i.color === 'amber').length;
  const blueCount = locIncidents.filter(i => i.color === 'blue').length;

  bodyText(`Total flagged items: ${locIncidents.length} (Critical: ${redCount} | Warning: ${amberCount} | Informational: ${blueCount})`, { size: 8 });
  y += 1;
  if (locIncidents.length > 0) {
    for (const inc of locIncidents.slice(0, 8)) {
      const sevLabel = inc.color === 'red' ? 'CRITICAL' : inc.color === 'amber' ? 'WARNING' : 'INFO';
      bodyText(`[${sevLabel}] ${inc.label} — ${inc.sublabel}`, { size: 7, indent: 3 });
    }
    if (locIncidents.length > 8) {
      bodyText(`... and ${locIncidents.length - 8} additional items`, { size: 6.5, color: GRAY, indent: 3 });
    }
  } else {
    bodyText('No critical incidents recorded in the past 12 months.', { size: 7, color: GRAY });
  }

  // ============================================
  // PROTECTIVE SAFEGUARD COMPLIANCE
  // ============================================
  sectionTitle('Protective Safeguard Compliance Verification');

  bodyText('Protective Safeguard Endorsements (PSEs) are standard in commercial kitchen policies. If declared safety systems are not maintained, carriers can deny claims. This section verifies compliance status.', { size: 7, color: GRAY });
  y += 2;

  const pseItems = [
    { label: 'ANSUL/UL 300 Wet Chemical System', ref: 'NFPA 17A-2025', factor: fireCat?.factors.find(f => f.name.includes('Fire suppression')) },
    { label: 'Hood & Duct Cleaning Schedule', ref: 'NFPA 96-2024', factor: fireCat?.factors.find(f => f.name.includes('Hood cleaning')) },
    { label: 'Fire Extinguisher Inspection', ref: 'NFPA 10-2025', factor: fireCat?.factors.find(f => f.name.includes('Fire extinguisher')) },
    { label: 'Fire Alarm System', ref: 'NFPA 72-2025', factor: fireCat?.factors.find(f => f.name.includes('Fire alarm')) },
    { label: 'Automatic Shutoff Systems', ref: 'NFPA 96 (2024) Chapter 10', factor: fireCat?.factors.find(f => f.name.includes('shutoff')) },
  ];

  for (const pse of pseItems) {
    const score = pse.factor?.score || 0;
    const status = score >= 90 ? 'COMPLIANT' : score >= 60 ? 'NEEDS ATTENTION' : 'NON-COMPLIANT';
    bodyText(`${status === 'COMPLIANT' ? '✓' : status === 'NEEDS ATTENTION' ? '⚠' : '✗'} ${pse.label} (${pse.ref}) — ${status} (${score}/100)`, { size: 7, indent: 3 });
  }

  // ============================================
  // ACTION ITEMS
  // ============================================
  if (result.actionItems.length > 0) {
    sectionTitle('Priority Action Items');
    bodyText('Items ranked by potential impact on overall risk score:', { size: 7, color: GRAY });
    y += 1;
    for (const item of result.actionItems.slice(0, 6)) {
      bodyText(`• [${item.priority.toUpperCase()}] ${item.title} — +${item.potentialGain} pts potential gain`, { size: 7, indent: 3 });
      bodyText(`  ${item.action}`, { size: 6.5, color: GRAY, indent: 6 });
    }
  }

  // ============================================
  // Apply headers/footers to all pages
  // ============================================
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    if (i > 1) drawHeader(i, total);
    drawFooter();
  }

  // Save
  const locSlug = locationLabel.replace(/\s+/g, '-');
  pdf.save(`EvidLY-Risk-Profile-${locSlug}-${now.toISOString().split('T')[0]}.pdf`);
}

export function InsuranceRisk() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { isDemoMode, presenterMode } = useDemo();
  const aiTier = getAiTier(isDemoMode, presenterMode);

  const params = new URLSearchParams(window.location.search);
  const locationParam = params.get('location') || 'all';

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareGenerated, setShareGenerated] = useState(false);
  const [shareRecipient, setShareRecipient] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareExpiry, setShareExpiry] = useState<'7' | '30' | '90'>('30');
  const [shareScope, setShareScope] = useState({ overall: true, factors: true, trend: true, percentile: true, incidents: false, equipment: false });
  const [shareToken] = useState(() => crypto.randomUUID().replace(/-/g, '').slice(0, 24));

  // Calculate scores (only meaningful in demo mode)
  const riskResult: InsuranceRiskResult = locationParam === 'all'
    ? calculateOrgInsuranceRiskScore()
    : calculateInsuranceRiskScore(locationParam);

  const tierInfo = getInsuranceRiskTier(riskResult.overall);

  // Demo 12-month score trend
  const SCORE_TREND = isDemoMode ? [
    { month: 'Mar', score: 82 }, { month: 'Apr', score: 83 }, { month: 'May', score: 85 },
    { month: 'Jun', score: 84 }, { month: 'Jul', score: 81 }, { month: 'Aug', score: 83 },
    { month: 'Sep', score: 86 }, { month: 'Oct', score: 88 }, { month: 'Nov', score: 90 },
    { month: 'Dec', score: 91 }, { month: 'Jan', score: 92 }, { month: 'Feb', score: riskResult.overall },
  ] : [];

  const handleLocationChange = (locId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('location', locId);
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
    navigate(`/insurance-risk?location=${locId}`, { replace: true });
  };

  return (
    <div className="max-w-6xl mx-auto" style={F}>
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Insurance Risk Score' }]} />

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <EvidlyIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Insurance Risk Score</h1>
            <p className="text-sm text-gray-500">Kitchen risk assessment designed to support insurance conversations</p>
          </div>
        </div>
      </div>

      {/* Empty state for live mode */}
      {!isDemoMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ShieldAlert className="h-12 w-12 mx-auto mb-4" style={{ color: '#9ca3af' }} />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Risk Data Available</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Add your equipment and documents to see your risk profile.
          </p>
        </div>
      )}

      {isDemoMode && (<>
      {/* Location Selector */}
      <div className="flex gap-2 mb-6 flex-wrap overflow-x-auto">
        <button
          onClick={() => handleLocationChange('all')}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px]"
          style={locationParam === 'all'
            ? { backgroundColor: '#1e4d6b', color: 'white' }
            : { backgroundColor: '#f3f4f6', color: '#374151' }}
        >
          All Locations
        </button>
        {locations.map(loc => (
          <button
            key={loc.urlId}
            onClick={() => handleLocationChange(loc.urlId)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px]"
            style={locationParam === loc.urlId
              ? { backgroundColor: '#1e4d6b', color: 'white' }
              : { backgroundColor: '#f3f4f6', color: '#374151' }}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Overall Score Hero */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Score Circle */}
          <div className="flex-shrink-0 text-center">
            <div
              className="w-36 h-36 rounded-full flex items-center justify-center border-4"
              style={{ borderColor: tierInfo.color, backgroundColor: tierInfo.bg }}
            >
              <div>
                <div className="text-2xl sm:text-4xl font-bold" style={{ color: tierInfo.color }}>{riskResult.overall}</div>
                <div className="text-xs text-gray-500 font-medium">of 100</div>
              </div>
            </div>
            <div
              className="mt-3 inline-block px-4 py-1.5 rounded-full text-sm font-bold"
              style={{ backgroundColor: tierInfo.bg, color: tierInfo.color, border: `1px solid ${tierInfo.color}` }}
            >
              {riskResult.tier}
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {riskResult.overall >= 90
                ? 'Strong Risk Profile'
                : riskResult.overall >= 75
                ? 'Solid Risk Profile'
                : riskResult.overall >= 60
                ? 'Where You Stand'
                : 'Significant Risk Factors Identified'}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {riskResult.overall >= 90
                ? 'This risk profile positions your operation favorably for insurance conversations. Continuous documentation through EvidLY is designed to support Protective Safeguard Endorsement compliance.'
                : riskResult.overall >= 75
                ? 'A solid foundation with some areas for improvement. Addressing the action items below is designed to strengthen your position for carrier conversations.'
                : riskResult.overall >= 60
                ? 'Several risk factors need attention. Prioritizing the critical items below can meaningfully improve your risk profile for insurance purposes.'
                : 'Multiple high-risk factors identified. Immediate action on facility safety and documentation gaps is essential for maintaining adequate coverage.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {riskResult.categories.map(cat => {
                const catTier = getInsuranceRiskTier(cat.score);
                return (
                  <div key={cat.key} className="text-center p-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                    <div className="text-xl font-bold" style={{ color: catTier.color }}>{cat.score}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{cat.name}</div>
                    <div className="text-[10px] text-gray-400">{Math.round(cat.weight * 100)}% weight</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-gray-400">
              <Info className="h-3 w-3" />
              <span>{riskResult.factorsEvaluated} factors evaluated across {riskResult.categories.length} categories</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {riskResult.categories.map(cat => {
          const Icon = CATEGORY_ICONS[cat.key] || Flame;
          const catColor = CATEGORY_COLORS[cat.key] || '#6b7280';
          const catTier = getInsuranceRiskTier(cat.score);
          const isExpanded = expandedCategory === cat.key;
          const passCount = cat.factors.filter(f => f.status === 'pass').length;
          const failCount = cat.factors.filter(f => f.status === 'fail').length;

          return (
            <div key={cat.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Card Header */}
              <div
                className="p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: catColor + '15' }}>
                      <Icon className="h-5 w-5" style={{ color: catColor }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{cat.name}</div>
                      <div className="text-[11px] text-gray-400">{Math.round(cat.weight * 100)}% of total score</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xl font-bold" style={{ color: catTier.color }}>{cat.score}</div>
                    </div>
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-gray-400" />
                      : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
                <ScoreBar score={cat.score} color={catTier.color} />
                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> {passCount} passing</span>
                  {failCount > 0 && <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> {failCount} failing</span>}
                  <span>{cat.factors.length} factors</span>
                </div>
              </div>

              {/* Expanded Sub-factors */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-3 sm:px-5 py-3 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                        <th className="text-left py-1.5 font-semibold">Factor</th>
                        <th className="text-center py-1.5 font-semibold w-12">Status</th>
                        <th className="text-right py-1.5 font-semibold w-14">Score</th>
                        <th className="text-right py-1.5 font-semibold w-16 hidden sm:table-cell">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.factors.map((factor, fi) => (
                        <tr key={fi} className="border-t border-gray-50">
                          <td className="py-2.5">
                            <div className="text-xs font-medium text-gray-800">{factor.name}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">{factor.detail}</div>
                            <div className="text-[10px] text-gray-300 mt-0.5">Ref: {factor.reference}</div>
                          </td>
                          <td className="text-center py-2.5"><StatusIcon status={factor.status} /></td>
                          <td className="text-right py-2.5">
                            <span className="text-xs font-bold" style={{ color: getInsuranceRiskTier(factor.score).color }}>{factor.score}</span>
                          </td>
                          <td className="text-right py-2.5 hidden sm:table-cell">
                            <span className="text-[11px] text-gray-400">{Math.round(factor.weight * 100)}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Location Comparison Table (when All selected) */}
      {locationParam === 'all' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Risk Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left py-2 font-semibold">Location</th>
                  <th className="text-center py-2 font-semibold">Overall</th>
                  <th className="text-center py-2 font-semibold">Facility Safety</th>
                  <th className="text-center py-2 font-semibold">Food Safety</th>
                  <th className="text-center py-2 font-semibold hidden sm:table-cell">Documentation</th>
                  <th className="text-center py-2 font-semibold hidden sm:table-cell">Operational</th>
                  <th className="text-center py-2 font-semibold">Tier</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => {
                  const locResult = calculateInsuranceRiskScore(loc.urlId);
                  const locTier = getInsuranceRiskTier(locResult.overall);
                  return (
                    <tr key={loc.urlId} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => handleLocationChange(loc.urlId)}>
                      <td className="py-3">
                        <div className="text-sm font-medium text-gray-900">{loc.name}</div>
                        <div className="text-[11px] text-gray-400">Compliance: {locationScores[loc.urlId]?.overall || 0}</div>
                      </td>
                      <td className="text-center py-3">
                        <span className="text-sm font-bold" style={{ color: locTier.color }}>{locResult.overall}</span>
                      </td>
                      {locResult.categories.map(cat => {
                        const ct = getInsuranceRiskTier(cat.score);
                        return (
                          <td key={cat.key} className="text-center py-3">
                            <span className="text-sm font-medium" style={{ color: ct.color }}>{cat.score}</span>
                          </td>
                        );
                      })}
                      <td className="text-center py-3">
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{ backgroundColor: locTier.bg, color: locTier.color, border: `1px solid ${locTier.color}` }}
                        >
                          {locResult.tier}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* What Carriers See */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <ShieldAlert className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">What Insurance Carriers Evaluate</h3>
            <p className="text-xs text-gray-500">Understanding how your operations map to underwriting factors</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-gray-900">Property Insurance (Fire)</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">Fire is the #1 underwriting concern for commercial kitchens. Carriers evaluate:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" /> ANSUL/UL 300 wet chemical systems installed and inspected</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" /> Hood and duct cleaning per NFPA 96 (2024) schedule</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" /> Fire suppression semi-annual inspection (NFPA 17A, 2025 Edition)</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" /> Fire extinguisher annual inspection (NFPA 10, 2025 Edition)</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div className="flex items-center gap-2 mb-2">
              <EvidlyIcon size={16} />
              <span className="text-sm font-semibold text-gray-900">General Liability</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">Carriers assess foodborne illness and premises liability risk:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" /> Food safety compliance and training documentation</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" /> Health department inspection scores and history</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" /> Claims history (frequency and severity)</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" /> Safety training programs documented</li>
            </ul>
          </div>
        </div>

        {/* PSE Explanation */}
        <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#fdf8e8', border: '1px solid #d4af37' }}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4" style={{ color: '#d4af37' }} />
            <span className="text-sm font-semibold text-gray-900">Protective Safeguard Endorsement (PSE)</span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            Most commercial kitchen policies include a Protective Safeguard Endorsement. This means: if you declared you have fire suppression, hood cleaning compliance, or other safety systems, and you fail to maintain them, the carrier <strong>can deny your claim</strong>. EvidLY's continuous documentation is designed to protect operators from this scenario by providing timestamped, verifiable records of system maintenance and compliance.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50">
          <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <strong>Important:</strong> This risk score is an internal assessment tool designed to support conversations with insurance carriers. It does not guarantee premium reductions, carrier acceptance, or specific underwriting outcomes. Insurance pricing decisions are made solely by carriers based on their proprietary models. EvidLY does not act as an insurance broker, agent, or advisor.
          </p>
        </div>
      </div>

      {/* Action Items */}
      {riskResult.actionItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Actions to Improve Your Score</h3>
              <p className="text-xs text-gray-500">Ranked by potential impact on your insurance risk score</p>
            </div>
            <button
              onClick={() => navigate(`/improve-score?location=${locationParam}`)}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors min-h-[44px]"
              style={{ color: '#1e4d6b', border: '1px solid #b8d4e8' }}
            >
              <TrendingUp className="h-4 w-4" /> View Full Improvement Plan <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {riskResult.actionItems.slice(0, 8).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(item.actionLink)}
              >
                <div className="flex-shrink-0">
                  <PriorityBadge priority={item.priority} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                  <div className="text-[11px] text-gray-400">{item.category} — {item.action}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-green-600">+{item.potentialGain} pts</div>
                  <div className="text-[10px] text-gray-400">potential gain</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Access (Premium Gated) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <Code className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Carrier API Access</h3>
            <p className="text-xs text-gray-500">Provide insurance carriers direct access to your risk score data</p>
          </div>
        </div>

        <FeatureGate featureId="ai-predictive-insights">
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50 font-mono text-xs">
              <div className="text-gray-500 mb-2">// API Endpoint</div>
              <div className="text-gray-900">GET /api/v1/risk-score</div>
              <div className="text-gray-500 mt-3 mb-1">// Authentication</div>
              <div className="text-gray-900">Header: X-API-Key: &lt;carrier_api_key&gt;</div>
              <div className="text-gray-500 mt-3 mb-1">// Sample Response</div>
              <pre className="text-gray-700 whitespace-pre-wrap">{JSON.stringify({
                organization_id: "org_abc123",
                scores: [{
                  location_id: "loc_001",
                  overall_score: riskResult.overall,
                  tier: riskResult.tier,
                  categories: {
                    fire_risk: riskResult.categories[0]?.score || 0,
                    food_safety: riskResult.categories[1]?.score || 0,
                    documentation: riskResult.categories[2]?.score || 0,
                    operational: riskResult.categories[3]?.score || 0,
                  },
                  factors_evaluated: riskResult.factorsEvaluated,
                  data_freshness: new Date().toISOString().split('T')[0],
                }],
                api_version: "1.0",
              }, null, 2)}</pre>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="h-3.5 w-3.5" />
              <span>Rate limits: 60 requests/minute, 1,000 requests/day per API key</span>
            </div>
          </div>
        </FeatureGate>
      </div>

      {/* Carrier Report & Share */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
              <Download className="h-5 w-5" style={{ color: '#1e4d6b' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Share & Export</h3>
              <p className="text-xs text-gray-500">Share your risk score with insurers or download a carrier-ready PDF</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 min-h-[44px] border"
            style={{ borderColor: '#1e4d6b', color: '#1e4d6b' }}
          >
            <Share2 className="h-4 w-4" /> Share with Insurer
          </button>
          <button
            onClick={async () => {
              if (!isFeatureAvailable(aiTier, 'predictiveAlerts')) {
                setShowUpgradeModal(true);
                return;
              }
              setPdfLoading(true);
              try {
                const locLabel = locationParam === 'all'
                  ? 'All Locations'
                  : locations.find(l => l.urlId === locationParam)?.name || locationParam;
                await generateInsuranceReportPDF(riskResult, locLabel);
              } catch {
                toast.error("PDF generation failed. Please try again");
              } finally {
                setPdfLoading(false);
              }
            }}
            disabled={pdfLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
            style={{ backgroundColor: '#1e4d6b' }}
          >
            {pdfLoading ? (
              <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Generating...</>
            ) : (
              <><Download className="h-4 w-4" /> Download PDF</>
            )}
          </button>
          </div>
        </div>
      </div>

      {/* 12-Month Score Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <TrendingUp className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">12-Month Score Trend</h3>
            <p className="text-xs text-gray-500">Risk score trajectory over the last 12 months</p>
          </div>
        </div>
        <div className="mb-4">
          <svg viewBox="0 0 600 180" className="w-full" style={{ maxHeight: 200 }}>
            {/* Grid */}
            {[60, 70, 80, 90, 100].map((v, i) => {
              const y = 160 - ((v - 55) / 50) * 140;
              return (
                <g key={i}>
                  <line x1={40} x2={570} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                  <text x={32} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400">{v}</text>
                </g>
              );
            })}
            {/* Month labels */}
            {SCORE_TREND.map((d, i) => (
              <text key={i} x={40 + (i / 11) * 530} y={175} textAnchor="middle" className="text-[9px] fill-gray-400">{d.month}</text>
            ))}
            {/* Line */}
            <path
              d={SCORE_TREND.map((d, i) => `${i === 0 ? 'M' : 'L'}${40 + (i / 11) * 530},${160 - ((d.score - 55) / 50) * 140}`).join(' ')}
              fill="none" stroke="#1e4d6b" strokeWidth={2.5}
            />
            {/* Dots */}
            {SCORE_TREND.map((d, i) => (
              <circle key={i} cx={40 + (i / 11) * 530} cy={160 - ((d.score - 55) / 50) * 140} r={3.5} fill="#1e4d6b" stroke="#fff" strokeWidth={1.5} />
            ))}
          </svg>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-gray-50 text-center">
            <div className="text-lg font-bold text-green-600">+{riskResult.overall - 82}</div>
            <div className="text-xs text-gray-500">12-month change</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 text-center">
            <div className="text-sm font-semibold" style={{ color: '#1e4d6b' }}>↑ Improving</div>
            <div className="text-xs text-gray-500">Score trend</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 text-center">
            <div className="text-lg font-bold" style={{ color: '#1e4d6b' }}>{riskResult.factorsEvaluated * 12}</div>
            <div className="text-xs text-gray-500">Data points analyzed</div>
          </div>
        </div>
      </div>

      {/* How to Use This Score */}
      <div className="rounded-xl p-4 sm:p-6 mb-6" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Info className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          How to Use This Score
        </h3>
        <div className="space-y-3 text-sm text-gray-700">
          <p>Share your risk score with your insurance agent to negotiate lower premiums. Kitchens with EvidLY risk scores above 85 have documented <strong>15-25% lower claim rates</strong> than unmonitored kitchens.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs font-bold text-gray-900 mb-1">1. Share Your Score</div>
              <p className="text-xs text-gray-500">Generate a secure, time-limited link and send it to your insurance agent.</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs font-bold text-gray-900 mb-1">2. Discuss at Renewal</div>
              <p className="text-xs text-gray-500">Present your risk profile during premium renewal conversations.</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs font-bold text-gray-900 mb-1">3. Lower Premiums</div>
              <p className="text-xs text-gray-500">Data-backed compliance evidence supports negotiating reduced rates.</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 min-h-[44px]"
            style={{ backgroundColor: '#1e4d6b' }}
          >
            <Share2 className="h-4 w-4" /> Share with Insurance Agent
          </button>
        </div>
      </div>

      {/* Score Methodology */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Score Methodology</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Facility Safety', weight: '40%', desc: '9 factors mapped to NFPA standards (2025 Edition)', color: '#ef4444' },
            { label: 'Food Safety', weight: '30%', desc: '9 factors mapped to FDA Food Code', color: '#3b82f6' },
            { label: 'Documentation', weight: '20%', desc: '7 factors covering permits & certs', color: '#8b5cf6' },
            { label: 'Operational', weight: '10%', desc: '5 factors measuring consistency', color: '#06b6d4' },
          ].map(m => (
            <div key={m.label} className="p-3 rounded-lg bg-gray-50 text-center">
              <div className="text-lg font-bold" style={{ color: m.color }}>{m.weight}</div>
              <div className="text-xs font-semibold text-gray-900 mt-0.5">{m.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{m.desc}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          Higher scores indicate lower risk. Fire risk is weighted most heavily at 40% because fire is the #1 underwriting concern for commercial kitchens. All factors are derived from data EvidLY already collects through daily operations.
        </p>
      </div>

      {/* Share with Insurer Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Share2 className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                  {shareGenerated ? 'Share Link Created' : 'Share Risk Score'}
                </h2>
                <button onClick={() => { setShowShareModal(false); setShareGenerated(false); setShareRecipient(''); setShareEmail(''); }} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {!shareGenerated ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Create a secure, time-limited link your insurance agent can access.</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient name</label>
                    <input
                      type="text"
                      value={shareRecipient}
                      onChange={(e) => setShareRecipient(e.target.value)}
                      placeholder="State Farm — Agent John Smith"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient email (optional)</label>
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="agent@statefarm.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Link expires in</label>
                    <div className="flex gap-2">
                      {(['7', '30', '90'] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => setShareExpiry(d)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${shareExpiry === d ? 'border-[#1e4d6b] bg-[#eef4f8] text-[#1e4d6b]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {d} days
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">What's shared</label>
                    <div className="space-y-2">
                      {[
                        { key: 'overall' as const, label: 'Overall risk score and tier', locked: true },
                        { key: 'factors' as const, label: 'Factor breakdown', locked: false },
                        { key: 'trend' as const, label: '12-month trend', locked: false },
                        { key: 'percentile' as const, label: 'Industry percentile', locked: false },
                        { key: 'incidents' as const, label: 'Detailed incident history', locked: false },
                        { key: 'equipment' as const, label: 'Equipment service records', locked: false },
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={shareScope[item.key]}
                            onChange={() => !item.locked && setShareScope(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                            disabled={item.locked}
                            className="rounded border-gray-300"
                          />
                          <span className={item.locked ? 'text-gray-400' : 'text-gray-700'}>{item.label}</span>
                          {item.locked && <Lock className="h-3 w-3 text-gray-300" />}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => { setShowShareModal(false); }}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!shareRecipient.trim()) { toast.error('Please enter a recipient name'); return; }
                        setShareGenerated(true);
                        toast.success('Share link generated');
                      }}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white min-h-[44px] flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#1e4d6b' }}
                    >
                      Generate Link <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-800">Share link created successfully</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Secure Link</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-700 truncate">
                        {window.location.origin}/risk/{shareToken}
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/risk/${shareToken}`); toast.success('Link copied to clipboard'); }}
                        className="p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2"><Link2 className="h-3.5 w-3.5 text-gray-400" /> Expires: {new Date(Date.now() + parseInt(shareExpiry) * 86400000).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2"><EvidlyIcon size={14} /> Shared with: {shareRecipient}</div>
                  </div>

                  {shareEmail && (
                    <button
                      onClick={() => toast.success(`Email sent to ${shareEmail}`)}
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 min-h-[44px] border border-gray-300 hover:bg-gray-50"
                    >
                      <Mail className="h-4 w-4" /> Send to {shareEmail}
                    </button>
                  )}

                  <p className="text-xs text-gray-400">You'll be notified when the link is accessed.</p>

                  <button
                    onClick={() => { setShowShareModal(false); setShareGenerated(false); setShareRecipient(''); setShareEmail(''); }}
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white min-h-[44px]"
                    style={{ backgroundColor: '#1e4d6b' }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </>)}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <AiUpgradePrompt
          feature="Carrier-Ready Risk Report"
          description="Generate a formatted PDF risk report designed for sharing with your insurance carrier during renewal conversations."
          variant="modal"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}
