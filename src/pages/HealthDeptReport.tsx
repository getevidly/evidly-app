// P0-PURGE: No blended "overall" compliance score — pillars are independent
import { useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  FileText, Download, Eye, AlertTriangle, CheckCircle, XCircle,
  Clock, Share2, Lock, ChevronDown, ChevronUp, ClipboardCheck,
  TrendingUp, TrendingDown, Building2, Users, Flame,
  Package, AlertCircle, History, Mail, Link2, Send, Loader2,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { locations as demoLocations, locationScores } from '../data/demoData';
import {
  generateHealthDeptReport,
  COUNTY_TEMPLATES,
  getDemoReportHistory,
  templateFromJurisdiction,
  type ReportConfig,
  type CountyTemplate,
  type CountyTemplateConfig,
  type HealthDeptReport as ReportType,
  type LiveScoreData,
  type JurisdictionTemplateData,
  type SelfAuditItem,
  type MissingDocAlert,
  type ReportHistory,
} from '../lib/reportGenerator';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

// ── Helpers ────────────────────────────────────────────────

function StatusDot({ color }: { color: string }) {
  return <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />;
}

function SectionToggle({ label, enabled, onChange, locked }: { label: string; enabled: boolean; onChange: (v: boolean) => void; locked?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.5 : 1 }}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={e => !locked && onChange(e.target.checked)}
        disabled={locked}
        style={{ width: 16, height: 16, accentColor: '#1E2D4D' }}
      />
      <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
      {locked && <Lock className="h-3.5 w-3.5 text-[#1E2D4D]/30" />}
    </label>
  );
}

function CollapsibleSection({ title, icon, children, defaultOpen = false, badge }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[#FAF7F0] transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-[#1E2D4D]">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-[#1E2D4D]/30" /> : <ChevronDown className="h-5 w-5 text-[#1E2D4D]/30" />}
      </button>
      {open && <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-[#1E2D4D]/5">{children}</div>}
    </div>
  );
}

function CountBadge({ count, color }: { count: number; color: string }) {
  if (count === 0) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 20, height: 20, borderRadius: 10, fontSize: 11, fontWeight: 700,
      backgroundColor: color === 'red' ? '#fef2f2' : color === 'amber' ? '#fffbeb' : '#f0fdf4',
      color: color === 'red' ? '#ef4444' : color === 'amber' ? '#A08C5A' : '#22c55e',
      border: `1px solid ${color === 'red' ? '#fecaca' : color === 'amber' ? '#fef3c7' : '#bbf7d0'}`,
      padding: '0 6px',
    }}>
      {count}
    </span>
  );
}

// ── Main Page Component ────────────────────────────────────

export function HealthDeptReport() {
  const { isDemoMode } = useDemo();
  const locations = isDemoMode ? demoLocations : [];
  const [activeView, setActiveView] = useState<'generate' | 'preview' | 'history' | 'self-audit'>('generate');
  const [selectedLocation, setSelectedLocation] = useState(locations[0]?.urlId || 'downtown');
  const [countyTemplate, setCountyTemplate] = useState<CountyTemplate>('generic');
  const [dateRange, setDateRange] = useState<'30' | '60' | '90' | 'custom'>('30');
  const [isPaidTier, setIsPaidTier] = useState(true);
  const [generatedReport, setGeneratedReport] = useState<ReportType | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const [sections, setSections] = useState({
    facilityInfo: true,
    foodSafety: true,
    employeeCerts: true,
    facilitySafety: true,
    vendorDocs: true,
    correctiveActions: true,
    complianceScore: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const template = COUNTY_TEMPLATES[countyTemplate];
  const scores = locationScores[selectedLocation] || locationScores['downtown'];
  const reportHistory = useMemo(() => getDemoReportHistory(), []);

  // Missing docs pre-check
  const preCheckReport = useMemo(() => {
    return generateHealthDeptReport({
      locationId: selectedLocation,
      countyTemplate,
      dateRange,
      sections,
      isPaidTier,
    });
  }, [selectedLocation, countyTemplate, dateRange]);

  const missingDocs = preCheckReport.missingDocs;
  const hasCriticalMissing = missingDocs.some(d => d.severity === 'critical');

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let liveScores: LiveScoreData | null = null;
      let jurisdictionTemplate: CountyTemplateConfig | null = null;

      // Phase 4: Fetch live data from Supabase when not in demo mode
      if (!isDemoMode) {
        const loc = locations.find(l => l.urlId === selectedLocation);
        const locationId = loc?.id;
        if (locationId) {
          // Fetch latest compliance score snapshot
          const { data: snapshot } = await supabase
            .from('compliance_score_snapshots')
            .select('id, overall_score, food_safety_score, facility_safety_score, vendor_score, score_date')
            .eq('location_id', locationId)
            .order('score_date', { ascending: false })
            .limit(1)
            .single();

          if (snapshot) {
            liveScores = {
              foodSafety: snapshot.food_safety_score ?? 0,
              facilitySafety: snapshot.facility_safety_score ?? 0,
              vendorScore: snapshot.vendor_score ?? undefined,
              snapshotId: snapshot.id,
              snapshotDate: snapshot.score_date,
            };
          }

          // Fetch jurisdiction data for the location
          const { data: jData } = await supabase
            .from('location_jurisdictions')
            .select('jurisdictions(county, agency_name, grading_type, grading_config, pass_threshold)')
            .eq('location_id', locationId)
            .eq('jurisdiction_layer', 'food_safety')
            .limit(1)
            .single();

          if (jData?.jurisdictions) {
            const j = jData.jurisdictions as any;
            jurisdictionTemplate = templateFromJurisdiction({
              county: j.county,
              agencyName: j.agency_name,
              gradingType: j.grading_type,
              gradingConfig: j.grading_config,
              passThreshold: j.pass_threshold,
            });
          }
        }
      }

      const report = generateHealthDeptReport(
        { locationId: selectedLocation, countyTemplate, dateRange, sections, isPaidTier },
        liveScores,
        jurisdictionTemplate,
      );
      setGeneratedReport(report);
      setActiveView('preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    guardAction('download', 'health department reports', async () => {
      if (!reportRef.current) {
        toast.error('No report to download. Generate a report first.');
        return;
      }
      setPdfLoading(true);
      try {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDFModule = await import('jspdf');
        const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;

        const canvas = await html2canvas(reportRef.current, {
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

        // Brand every page with header, footer, page numbers
        const total = pdf.getNumberOfPages();
        const generatedAt = new Date().toLocaleString();
        const reportTitle = `Health Dept Report — ${generatedReport?.facilityInfo.name || selectedLocation}`;
        for (let i = 1; i <= total; i++) {
          pdf.setPage(i);
          // White-out header/footer zones
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pageW, hdrH, 'F');
          pdf.rect(0, pageH - ftrH, pageW, ftrH, 'F');
          // Header bar (EvidLY brand blue)
          pdf.setFillColor(30, 77, 107);
          pdf.rect(0, 0, pageW, hdrH, 'F');
          pdf.setFontSize(7);
          pdf.setTextColor(255, 255, 255);
          pdf.text('EvidLY — Answers before you ask', margin, 6.5);
          pdf.setTextColor(212, 175, 55); // Gold
          pdf.text(reportTitle, pageW - margin, 6.5, { align: 'right' });
          // Footer
          pdf.setFontSize(6);
          pdf.setTextColor(160, 160, 160);
          pdf.text(generatedAt, margin, pageH - 3);
          pdf.text(`Page ${i} of ${total}`, pageW - margin, pageH - 3, { align: 'right' });
        }

        pdf.save(`EvidLY-HealthDept-Report-${selectedLocation}.pdf`);
        toast.success('PDF downloaded');
      } catch {
        toast.error('PDF generation failed. Try the Print button.');
      } finally {
        setPdfLoading(false);
      }
    });
  };

  const handleShare = (method: string) => {
    guardAction('export', 'health department reports', () => {
      setShowShareModal(false);
      if (method === 'link') {
        toast.success('Shareable link created (expires in 7 days)');
      } else if (method === 'email-health-dept') {
        toast.success('Report emailed to Health Department');
      } else if (method === 'email-insurance') {
        toast.success('Report emailed to insurance broker');
      } else if (method === 'email-corporate') {
        toast.success('Report shared with corporate/franchisor');
      }
    });
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reporting', href: '/reports' }, { label: 'Health Department Report' }]} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D]">Health Department Report Generator</h1>
            <p className="text-sm text-[#1E2D4D]/70 mt-1">Generate inspection-ready compliance reports with county-specific formatting</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-[#1E2D4D]/10 overflow-x-auto">
          {[
            { id: 'generate', label: 'Generate Report', icon: <FileText className="h-4 w-4" /> },
            { id: 'preview', label: 'Report Preview', icon: <Eye className="h-4 w-4" /> },
            { id: 'self-audit', label: 'Self-Inspection Checklist', icon: <ClipboardCheck className="h-4 w-4" /> },
            { id: 'history', label: 'Report History', icon: <History className="h-4 w-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 min-h-[44px] font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeView === tab.id
                  ? 'border-[#A08C5A] text-[#1E2D4D]'
                  : 'border-transparent text-[#1E2D4D]/70 hover:text-[#1E2D4D] hover:border-[#1E2D4D]/15'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Generate Report Tab ─────────────────────── */}
        {activeView === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Config */}
            <div className="lg:col-span-2 space-y-6">
              {/* Location & Template */}
              <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold text-[#1E2D4D]">Report Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Location</label>
                    <select
                      value={selectedLocation}
                      onChange={e => setSelectedLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm"
                    >
                      {locations.map(loc => (
                        <option key={loc.urlId} value={loc.urlId}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">County Template</label>
                    <select
                      value={countyTemplate}
                      onChange={e => setCountyTemplate(e.target.value as CountyTemplate)}
                      className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm"
                    >
                      {Object.entries(COUNTY_TEMPLATES).map(([key, tmpl]) => (
                        <option key={key} value={key}>{tmpl.name} — {tmpl.gradingSystem}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Date Range</label>
                    <select
                      value={dateRange}
                      onChange={e => setDateRange(e.target.value as any)}
                      className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm"
                    >
                      <option value="30">Last 30 Days</option>
                      <option value="60">Last 60 Days</option>
                      <option value="90">Last 90 Days</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Template Preview</label>
                    <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{template.gradingSystem}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{template.gradingDescription}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Toggles */}
              <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold text-[#1E2D4D]">Report Sections</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SectionToggle label="Facility Information" enabled={sections.facilityInfo} onChange={() => toggleSection('facilityInfo')} />
                  <SectionToggle label="Food Safety Summary" enabled={sections.foodSafety} onChange={() => toggleSection('foodSafety')} locked={!isPaidTier} />
                  <SectionToggle label="Employee Certifications" enabled={sections.employeeCerts} onChange={() => toggleSection('employeeCerts')} locked={!isPaidTier} />
                  <SectionToggle label="Facility Safety & Equipment" enabled={sections.facilitySafety} onChange={() => toggleSection('facilitySafety')} locked={!isPaidTier} />
                  <SectionToggle label="Vendor Documentation" enabled={sections.vendorDocs} onChange={() => toggleSection('vendorDocs')} locked={!isPaidTier} />
                  <SectionToggle label="Corrective Actions" enabled={sections.correctiveActions} onChange={() => toggleSection('correctiveActions')} locked={!isPaidTier} />
                  <SectionToggle label="Compliance Score & Trends" enabled={sections.complianceScore} onChange={() => toggleSection('complianceScore')} />
                </div>

                {!isPaidTier && (
                  <div style={{ padding: '12px 16px', backgroundColor: '#fffbeb', borderRadius: 8, border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Lock className="h-5 w-5 text-[#A08C5A]" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>Free Tier — Limited Report</div>
                      <div style={{ fontSize: 13, color: '#92400e' }}>Upgrade to unlock Food Safety, Employee Certs, Facility Safety, Vendor Docs, and Corrective Actions sections.</div>
                    </div>
                    <button
                      onClick={() => setIsPaidTier(true)}
                      style={{ marginLeft: 'auto', padding: '6px 16px', backgroundColor: '#A08C5A', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Upgrade Now
                    </button>
                  </div>
                )}
              </div>

              {/* Missing Document Alerts */}
              {missingDocs.length > 0 && (
                <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-[#A08C5A]" />
                    <h3 className="font-semibold text-[#1E2D4D]">Missing Documentation Alerts</h3>
                    <CountBadge count={missingDocs.filter(d => d.severity === 'critical').length} color="red" />
                    <CountBadge count={missingDocs.filter(d => d.severity === 'warning').length} color="amber" />
                  </div>
                  <div className="space-y-2">
                    {missingDocs.map((doc, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 8,
                        backgroundColor: doc.severity === 'critical' ? '#fef2f2' : '#fffbeb',
                        border: `1px solid ${doc.severity === 'critical' ? '#fecaca' : '#fef3c7'}`,
                      }}>
                        {doc.severity === 'critical'
                          ? <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                          : <AlertCircle className="h-5 w-5 text-[#A08C5A] flex-shrink-0 mt-0.5" />
                        }
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: doc.severity === 'critical' ? '#991b1b' : '#92400e' }}>{doc.document}</div>
                          <div style={{ fontSize: 13, color: doc.severity === 'critical' ? '#991b1b' : '#92400e' }}>{doc.message}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Required by: {doc.requiredBy}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasCriticalMissing && (
                    <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
                      Critical documents missing. You can still generate the report, but it will flag these gaps.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Preview Card + Actions */}
            <div className="space-y-6">
              {/* Score Preview — per-pillar with correct frameworks */}
              <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6 space-y-4">
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', textAlign: 'center' }}>Compliance Score</div>
                {[
                  { label: 'Food Safety', framework: template.name, score: scores.foodSafety },
                  { label: 'Facility Safety', framework: 'NFPA 96 / CA Fire Code', score: scores.facilitySafety },
                ].map(p => {
                  const statusLabel = p.score >= 90 ? 'Compliant' : p.score >= 70 ? 'Needs Attention' : 'Critical';
                  const statusColor = p.score >= 90 ? '#22c55e' : p.score >= 70 ? '#eab308' : '#ef4444';
                  return (
                    <div key={p.label} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{p.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: statusColor }}>{p.score}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.framework}</div>
                        <div style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                          color: statusColor, border: `1.5px solid ${statusColor}`,
                        }}>
                          {statusLabel}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] font-semibold disabled:opacity-60"
              >
                {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                {generating ? 'Generating...' : 'Generate Report'}
              </button>

              {/* Tier Toggle (for demo) */}
              <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPaidTier}
                    onChange={e => setIsPaidTier(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#A08C5A' }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                      {isPaidTier ? 'Pro Tier (Full Report)' : 'Free Tier (Basic Report)'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      Toggle to preview free vs paid report content
                    </div>
                  </div>
                </label>
              </div>

              {/* Auto Schedule Info */}
              <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#1E2D4D]" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Auto-Scheduled Reports</span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  Monthly reports auto-generate on the 1st. Quarterly and annual summaries also available.
                </div>
                <div className="space-y-1">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#374151' }}>Next Monthly Report</span>
                    <span style={{ fontWeight: 600, color: '#1E2D4D' }}>Mar 1, 2026</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#374151' }}>Next Quarterly Summary</span>
                    <span style={{ fontWeight: 600, color: '#1E2D4D' }}>Apr 1, 2026</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#374151' }}>Delivery Method</span>
                    <span style={{ fontWeight: 600, color: '#1E2D4D' }}>Email (Resend)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Report Preview Tab ──────────────────────── */}
        {activeView === 'preview' && (
          <>
            {!generatedReport ? (
              <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 sm:p-12 text-center">
                <FileText className="h-16 w-16 text-[#1E2D4D]/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-2">No Report Generated</h3>
                <p className="text-[#1E2D4D]/70 mb-4">Generate a report from the configuration tab first.</p>
                <button
                  onClick={() => setActiveView('generate')}
                  className="px-6 py-2 bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] text-sm font-medium"
                >
                  Go to Configuration
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Action Bar */}
                <div className="flex items-center justify-between flex-wrap gap-2 bg-white rounded-xl border border-[#1E2D4D]/10 px-4 sm:px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 14, color: '#6b7280' }}>
                      Generated {new Date(generatedReport.generatedAt).toLocaleString()} for{' '}
                      <span style={{ fontWeight: 600, color: '#374151' }}>{generatedReport.facilityInfo.name}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleDownloadPDF} disabled={pdfLoading} className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] text-sm font-medium disabled:opacity-60">
                      {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
                    </button>
                    <button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-white text-[#1E2D4D] border border-[#1E2D4D] rounded-xl hover:bg-[#FAF7F0] transition-colors text-sm font-medium">
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-[#1E2D4D]/5 text-[#1E2D4D]/80 rounded-lg hover:bg-[#1E2D4D]/10 transition-colors text-sm font-medium">
                      Print
                    </button>
                  </div>
                </div>

                {/* Phase 4: Wrap report content for PDF capture */}
                <div ref={reportRef}>
                {/* Report Header */}
                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 text-center" style={{ borderTop: `4px solid ${template.getGradeColor(generatedReport.complianceScore.foodSafety)}` }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1E2D4D', marginBottom: 4 }}>Health Department Inspection Compliance Report</div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>{template.name} — {template.gradingSystem}</div>
                  <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 16, padding: '12px 24px', borderRadius: 12, backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: template.getGradeColor(generatedReport.complianceScore.foodSafety), lineHeight: 1 }}>
                        {generatedReport.complianceScore.foodSafety}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Food Safety</div>
                    </div>
                    <div style={{ width: 1, height: 50, backgroundColor: '#e5e7eb' }} />
                    <div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: template.getGradeColor(generatedReport.complianceScore.facilitySafety), lineHeight: 1 }}>
                        {generatedReport.complianceScore.facilitySafety}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Facility Safety</div>
                    </div>
                    <div style={{ width: 1, height: 50, backgroundColor: '#e5e7eb' }} />
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: template.getGradeColor(generatedReport.complianceScore.foodSafety) }}>
                        {generatedReport.complianceScore.countyGrade}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Grade</div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Facility Info */}
                {generatedReport.config.sections.facilityInfo && (
                  <CollapsibleSection title="Facility Information" icon={<Building2 className="h-5 w-5 text-[#1E2D4D]" />} defaultOpen>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {[
                        { label: 'Facility Name', value: generatedReport.facilityInfo.name },
                        { label: 'Address', value: generatedReport.facilityInfo.address },
                        { label: 'Permit Number', value: generatedReport.facilityInfo.permitNumber },
                        { label: 'Owner/Operator', value: generatedReport.facilityInfo.ownerOperator },
                        { label: 'Phone', value: generatedReport.facilityInfo.phone },
                        { label: 'County', value: generatedReport.facilityInfo.county },
                        { label: 'Last Inspection', value: generatedReport.facilityInfo.lastInspection },
                        { label: 'Next Inspection', value: generatedReport.facilityInfo.nextInspection },
                        { label: 'Seat Capacity', value: String(generatedReport.facilityInfo.seatCapacity) },
                      ].map(field => (
                        <div key={field.label}>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{field.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{field.value}</div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

                {/* Section 2: Food Safety */}
                {generatedReport.config.sections.foodSafety && (
                  <CollapsibleSection
                    title="Food Safety Summary"
                    icon={<EvidlyIcon size={20} />}
                    badge={<CountBadge count={generatedReport.foodSafety.filter(i => i.status === 'non-compliant').length} color="red" />}
                    defaultOpen
                  >
                    <div className="overflow-x-auto mt-4">
                      <table className="min-w-full divide-y divide-[#1E2D4D]/10">
                        <thead className="bg-[#FAF7F0]">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Category</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Item</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Details</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2D4D]/10">
                          {generatedReport.foodSafety.map((item, i) => (
                            <tr key={i} className="hover:bg-[#FAF7F0]">
                              <td className="px-4 py-3 text-sm text-[#1E2D4D]/70 hidden sm:table-cell">{item.category}</td>
                              <td className="px-4 py-3 text-sm font-medium text-[#1E2D4D]">{item.item}</td>
                              <td className="px-4 py-3 text-center">
                                {item.status === 'compliant' && <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />}
                                {item.status === 'needs-attention' && <AlertCircle className="h-5 w-5 text-[#A08C5A] mx-auto" />}
                                {item.status === 'non-compliant' && <XCircle className="h-5 w-5 text-red-500 mx-auto" />}
                              </td>
                              <td className="px-4 py-3 text-sm text-[#1E2D4D]/70 hidden sm:table-cell">{item.details}</td>
                              <td className="px-4 py-3 text-center text-sm font-semibold" style={{ color: item.pointDeduction > 0 ? '#ef4444' : '#22c55e' }}>
                                {item.pointDeduction > 0 ? `-${item.pointDeduction}` : '0'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
                      Total Deductions: <span style={{ fontWeight: 700, color: '#ef4444' }}>
                        -{generatedReport.foodSafety.reduce((sum, i) => sum + i.pointDeduction, 0)} points
                      </span>
                    </div>
                  </CollapsibleSection>
                )}

                {/* Section 3: Employee Certs */}
                {generatedReport.config.sections.employeeCerts && (
                  <CollapsibleSection
                    title="Employee Certifications"
                    icon={<Users className="h-5 w-5 text-[#1E2D4D]" />}
                    badge={<CountBadge count={generatedReport.employeeCerts.filter(c => c.status === 'expired').length} color="red" />}
                  >
                    <div className="overflow-x-auto mt-4">
                      <table className="min-w-full divide-y divide-[#1E2D4D]/10">
                        <thead className="bg-[#FAF7F0]">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Role</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Certification</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Cert #</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase">Expires</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2D4D]/10">
                          {generatedReport.employeeCerts.map((cert, i) => (
                            <tr key={i} className="hover:bg-[#FAF7F0]">
                              <td className="px-4 py-3 text-sm font-medium text-[#1E2D4D]">{cert.name}</td>
                              <td className="px-4 py-3 text-sm text-[#1E2D4D]/70 hidden sm:table-cell">{cert.role}</td>
                              <td className="px-4 py-3 text-sm text-[#1E2D4D]/70">{cert.certType}</td>
                              <td className="px-4 py-3 text-sm text-[#1E2D4D]/50 font-mono hidden sm:table-cell">{cert.certNumber}</td>
                              <td className="px-4 py-3 text-center text-sm text-[#1E2D4D]/70">{cert.expiryDate}</td>
                              <td className="px-4 py-3 text-center">
                                <span style={{
                                  padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                  backgroundColor: cert.status === 'current' ? '#f0fdf4' : cert.status === 'expiring' ? '#fffbeb' : '#fef2f2',
                                  color: cert.status === 'current' ? '#166534' : cert.status === 'expiring' ? '#92400e' : '#991b1b',
                                  border: `1px solid ${cert.status === 'current' ? '#bbf7d0' : cert.status === 'expiring' ? '#fef3c7' : '#fecaca'}`,
                                }}>
                                  {cert.status === 'current' ? 'Current' : cert.status === 'expiring' ? `Expiring (${cert.daysUntilExpiry}d)` : 'EXPIRED'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleSection>
                )}

                {/* Section 4: Facility Safety */}
                {generatedReport.config.sections.facilitySafety && (
                  <CollapsibleSection
                    title="Facility Safety & Equipment"
                    icon={<Flame className="h-5 w-5 text-[#1E2D4D]" />}
                    badge={<CountBadge count={generatedReport.facilitySafety.filter(f => f.status === 'overdue').length} color="red" />}
                  >
                    <div className="overflow-x-auto mt-4">
                      <table className="min-w-full divide-y divide-[#1E2D4D]/10">
                        <thead className="bg-[#FAF7F0]">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Equipment</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Location</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase">Last Inspection</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase">Next Due</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Inspector</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2D4D]/10">
                          {generatedReport.facilitySafety.map((item, i) => (
                            <tr key={i} className="hover:bg-[#FAF7F0]">
                              <td className="px-4 py-3 text-sm font-medium text-[#1E2D4D]">{item.equipment}</td>
                              <td className="px-4 py-3 text-sm text-[#1E2D4D]/70 hidden sm:table-cell">{item.location}</td>
                              <td className="px-4 py-3 text-center text-sm text-[#1E2D4D]/70">{item.lastInspection}</td>
                              <td className="px-4 py-3 text-center text-sm text-[#1E2D4D]/70">{item.nextDue}</td>
                              <td className="px-4 py-3 text-sm text-[#1E2D4D]/70 hidden sm:table-cell">{item.inspector}</td>
                              <td className="px-4 py-3 text-center">
                                <span style={{
                                  padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                  backgroundColor: item.status === 'current' ? '#f0fdf4' : item.status === 'due-soon' ? '#fffbeb' : '#fef2f2',
                                  color: item.status === 'current' ? '#166534' : item.status === 'due-soon' ? '#92400e' : '#991b1b',
                                  border: `1px solid ${item.status === 'current' ? '#bbf7d0' : item.status === 'due-soon' ? '#fef3c7' : '#fecaca'}`,
                                }}>
                                  {item.status === 'current' ? 'Current' : item.status === 'due-soon' ? 'Due Soon' : 'OVERDUE'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleSection>
                )}

                {/* Section 5: Vendor Docs */}
                {generatedReport.config.sections.vendorDocs && (
                  <CollapsibleSection
                    title="Vendor Documentation"
                    icon={<Package className="h-5 w-5 text-[#1E2D4D]" />}
                    badge={<CountBadge count={generatedReport.vendorDocs.filter(v => v.status === 'expired' || v.status === 'missing').length} color="red" />}
                  >
                    <div className="overflow-x-auto mt-4">
                      <table className="min-w-full divide-y divide-[#1E2D4D]/10">
                        <thead className="bg-[#FAF7F0]">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Vendor</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Document</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Expiry</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Days Left</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2D4D]/10">
                          {generatedReport.vendorDocs.map((doc, i) => (
                            <tr key={i} className="hover:bg-[#FAF7F0]">
                              <td className="px-4 py-3 text-sm font-medium text-[#1E2D4D]">{doc.vendor}</td>
                              <td className="px-4 py-3 text-sm text-[#1E2D4D]/70">{doc.docType}</td>
                              <td className="px-4 py-3 text-center text-sm text-[#1E2D4D]/70 hidden sm:table-cell">{doc.expiryDate}</td>
                              <td className="px-4 py-3 text-center text-sm font-semibold hidden sm:table-cell" style={{
                                color: doc.daysUntilExpiry < 0 ? '#ef4444' : doc.daysUntilExpiry <= 30 ? '#A08C5A' : '#22c55e'
                              }}>
                                {doc.daysUntilExpiry < 0 ? `${Math.abs(doc.daysUntilExpiry)} overdue` : `${doc.daysUntilExpiry} days`}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span style={{
                                  padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                  backgroundColor: doc.status === 'current' ? '#f0fdf4' : doc.status === 'expiring' ? '#fffbeb' : '#fef2f2',
                                  color: doc.status === 'current' ? '#166534' : doc.status === 'expiring' ? '#92400e' : '#991b1b',
                                  border: `1px solid ${doc.status === 'current' ? '#bbf7d0' : doc.status === 'expiring' ? '#fef3c7' : '#fecaca'}`,
                                }}>
                                  {doc.status === 'current' ? 'Current' : doc.status === 'expiring' ? 'Expiring' : doc.status === 'missing' ? 'MISSING' : 'EXPIRED'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleSection>
                )}

                {/* Section 6: Corrective Actions */}
                {generatedReport.config.sections.correctiveActions && (
                  <CollapsibleSection
                    title="Corrective Actions"
                    icon={<AlertTriangle className="h-5 w-5 text-[#1E2D4D]" />}
                    badge={<CountBadge count={generatedReport.correctiveActions.filter(a => a.status === 'open').length} color="red" />}
                  >
                    <div className="space-y-3 mt-4">
                      {generatedReport.correctiveActions.map((action) => (
                        <div key={action.id} style={{
                          padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                          borderLeft: `4px solid ${action.priority === 'critical' ? '#ef4444' : action.priority === 'high' ? '#f97316' : action.priority === 'medium' ? '#A08C5A' : '#1E2D4D'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>{action.id}</span>
                              <span style={{
                                padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                                backgroundColor: action.priority === 'critical' ? '#fef2f2' : action.priority === 'high' ? '#fff7ed' : action.priority === 'medium' ? '#fffbeb' : '#eff6ff',
                                color: action.priority === 'critical' ? '#ef4444' : action.priority === 'high' ? '#f97316' : action.priority === 'medium' ? '#A08C5A' : '#1E2D4D',
                              }}>
                                {action.priority}
                              </span>
                              <span style={{
                                padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                                backgroundColor: action.status === 'resolved' ? '#f0fdf4' : action.status === 'in-progress' ? '#fffbeb' : '#fef2f2',
                                color: action.status === 'resolved' ? '#166534' : action.status === 'in-progress' ? '#92400e' : '#991b1b',
                              }}>
                                {action.status}
                              </span>
                            </div>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>Due: {action.dueDate}</span>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{action.issue}</div>
                          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Action: {action.action}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Assigned to: {action.assignee} | Identified: {action.dateIdentified}</div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

                {/* Section 7: Compliance Score & Trends */}
                {generatedReport.config.sections.complianceScore && (
                  <CollapsibleSection title="Compliance Score & Trend Analytics" icon={<TrendingUp className="h-5 w-5 text-[#1E2D4D]" />} defaultOpen>
                    <div className="mt-4 space-y-6">
                      {/* Score Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { label: 'Food Safety', value: generatedReport.complianceScore.foodSafety },
                          { label: 'Facility Safety', value: generatedReport.complianceScore.facilitySafety },
                        ].map(p => (
                          <div key={p.label} style={{ textAlign: 'center', padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: p.value >= 90 ? '#22c55e' : p.value >= 75 ? '#eab308' : p.value >= 60 ? '#f59e0b' : '#ef4444' }}>
                              {p.value}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{p.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Trend Chart */}
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>12-Week Trend</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={generatedReport.trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" fontSize={12} />
                            <YAxis domain={[0, 100]} fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="tempCompliance" name="Temp Compliance" stroke="#22c55e" strokeWidth={1.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="checklistCompletion" name="Checklist Completion" stroke="#A08C5A" strokeWidth={1.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Trend Numbers */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { label: '30-Day Trend', value: generatedReport.complianceScore.trend30Day },
                          { label: '60-Day Trend', value: generatedReport.complianceScore.trend60Day },
                          { label: '90-Day Trend', value: generatedReport.complianceScore.trend90Day },
                        ].map(t => (
                          <div key={t.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
                            {t.value >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: t.value >= 0 ? '#22c55e' : '#ef4444' }}>
                                {t.value >= 0 ? '+' : ''}{t.value} pts
                              </div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>{t.label}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Days Since Last Critical Violation */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', backgroundColor: selectedLocation === 'downtown' ? '#f0fdf4' : '#fef2f2', borderRadius: 8, border: `1px solid ${selectedLocation === 'downtown' ? '#bbf7d0' : '#fecaca'}` }}>
                        <EvidlyIcon size={20} />
                        <div>
                          <span style={{ fontWeight: 600, color: '#374151' }}>Days Since Last Critical Violation: </span>
                          <span style={{ fontWeight: 700, color: selectedLocation === 'downtown' ? '#22c55e' : '#ef4444' }}>
                            {selectedLocation === 'downtown' ? '127 days' : selectedLocation === 'airport' ? '12 days' : '0 days (active)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleSection>
                )}

                {/* County-Specific Requirements */}
                <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6">
                  <h3 className="font-semibold text-[#1E2D4D] mb-3">County-Specific Requirements — {template.name}</h3>
                  <ul className="space-y-2">
                    {template.specialRequirements.map((req, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151' }}>
                        <StatusDot color="#1E2D4D" />
                        <span style={{ paddingTop: 1 }}>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                </div>{/* Close Phase 4 reportRef wrapper */}
              </div>
            )}
          </>
        )}

        {/* ── Self-Audit Checklist Tab ────────────────── */}
        {activeView === 'self-audit' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div>
                  <h3 className="font-semibold text-[#1E2D4D]">Pre-Inspection Self-Inspection Checklist</h3>
                  <p className="text-sm text-[#1E2D4D]/70 mt-1">Mock inspection based on county scoring — flags potential point deductions</p>
                </div>
                <select
                  value={selectedLocation}
                  onChange={e => setSelectedLocation(e.target.value)}
                  className="px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm"
                >
                  {locations.map(loc => (
                    <option key={loc.urlId} value={loc.urlId}>{loc.name}</option>
                  ))}
                </select>
              </div>

              {/* Summary Cards */}
              {(() => {
                const audit = preCheckReport.selfAudit;
                const passCount = audit.filter(i => i.status === 'pass').length;
                const failCount = audit.filter(i => i.status === 'fail').length;
                const reviewCount = audit.filter(i => i.status === 'needs-review').length;
                const totalPoints = audit.reduce((s, i) => s + i.pointValue, 0);
                const lostPoints = audit.filter(i => i.status === 'fail').reduce((s, i) => s + i.pointValue, 0);
                const atRiskPoints = audit.filter(i => i.status === 'needs-review').reduce((s, i) => s + i.pointValue, 0);

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{passCount}</div>
                      <div style={{ fontSize: 12, color: '#166534' }}>Passing</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{failCount}</div>
                      <div style={{ fontSize: 12, color: '#991b1b' }}>Failing</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fffbeb', borderRadius: 8, border: '1px solid #fef3c7' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#A08C5A' }}>{reviewCount}</div>
                      <div style={{ fontSize: 12, color: '#92400e' }}>Needs Review</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>-{lostPoints}</div>
                      <div style={{ fontSize: 12, color: '#991b1b' }}>Points Lost</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fffbeb', borderRadius: 8, border: '1px solid #fef3c7' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#A08C5A' }}>-{atRiskPoints}</div>
                      <div style={{ fontSize: 12, color: '#92400e' }}>At Risk</div>
                    </div>
                  </div>
                );
              })()}

              {/* Checklist Grouped by Section */}
              {(() => {
                const audit = preCheckReport.selfAudit;
                const grouped: Record<string, SelfAuditItem[]> = {};
                audit.forEach(item => {
                  if (!grouped[item.section]) grouped[item.section] = [];
                  grouped[item.section].push(item);
                });

                return Object.entries(grouped).map(([section, items]) => (
                  <div key={section} style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1E2D4D', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #e5e7eb' }}>
                      {section}
                    </h4>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8,
                          backgroundColor: item.status === 'fail' ? '#fef2f2' : item.status === 'needs-review' ? '#fffbeb' : '#f9fafb',
                          border: `1px solid ${item.status === 'fail' ? '#fecaca' : item.status === 'needs-review' ? '#fef3c7' : '#e5e7eb'}`,
                        }}>
                          {item.status === 'pass' && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
                          {item.status === 'fail' && <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                          {item.status === 'needs-review' && <AlertCircle className="h-5 w-5 text-[#A08C5A] flex-shrink-0" />}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{item.item}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{item.requirement}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: item.status === 'fail' ? '#ef4444' : '#6b7280', minWidth: 50, textAlign: 'right' }}>
                            {item.status === 'fail' ? `-${item.pointValue} pts` : `${item.pointValue} pts`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* ── Report History Tab ──────────────────────── */}
        {activeView === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="font-semibold text-[#1E2D4D]">Report History</h3>
                <p className="text-sm text-[#1E2D4D]/70 mt-1">Previously generated reports and their status</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#1E2D4D]/10">
                  <thead className="bg-[#FAF7F0]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Report</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Generated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Generated By</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Sections</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-[#1E2D4D]/50 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2D4D]/10">
                    {reportHistory.map(report => (
                      <tr key={report.id} className="hover:bg-[#FAF7F0]">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-[#1E2D4D]">{report.reportType}</div>
                          <div className="text-xs text-[#1E2D4D]/50">{report.dateRange}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#1E2D4D]/70">{report.locationName}</td>
                        <td className="px-6 py-4 text-sm text-[#1E2D4D]/70 hidden sm:table-cell">
                          {new Date(report.generatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#1E2D4D]/70 hidden sm:table-cell">{report.generatedBy}</td>
                        <td className="px-6 py-4 text-center hidden sm:table-cell">
                          <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                            backgroundColor: '#eef4f8', color: '#1E2D4D',
                          }}>
                            {report.sections.length} sections
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => toast.success(`Downloading report ${report.id}`)}
                              className="text-[#1E2D4D] hover:text-[#141E33]"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toast.success(`Sharing report ${report.id}`)}
                              className="text-[#1E2D4D] hover:text-[#141E33]"
                              title="Share"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div className="w-[95vw] sm:w-auto" style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, maxWidth: 440 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 16 }}>Share Report</h3>
              <div className="space-y-3">
                <button onClick={() => handleShare('link')} className="w-full flex items-center gap-3 p-3 min-h-[44px] rounded-xl border border-[#1E2D4D]/10 hover:bg-[#FAF7F0] transition-colors text-left">
                  <Link2 className="h-5 w-5 text-[#1E2D4D]" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Create Shareable Link</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Link expires in 7 days</div>
                  </div>
                </button>
                <button onClick={() => handleShare('email-health-dept')} className="w-full flex items-center gap-3 p-3 min-h-[44px] rounded-xl border border-[#1E2D4D]/10 hover:bg-[#FAF7F0] transition-colors text-left">
                  <Mail className="h-5 w-5 text-[#1E2D4D]" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Email to Health Department</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Send directly to county health dept</div>
                  </div>
                </button>
                <button onClick={() => handleShare('email-insurance')} className="w-full flex items-center gap-3 p-3 min-h-[44px] rounded-xl border border-[#1E2D4D]/10 hover:bg-[#FAF7F0] transition-colors text-left">
                  <Send className="h-5 w-5 text-[#1E2D4D]" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Share with Insurance Broker</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Send compliance proof to insurer</div>
                  </div>
                </button>
                <button onClick={() => handleShare('email-corporate')} className="w-full flex items-center gap-3 p-3 min-h-[44px] rounded-xl border border-[#1E2D4D]/10 hover:bg-[#FAF7F0] transition-colors text-left">
                  <Building2 className="h-5 w-5 text-[#1E2D4D]" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Share with Corporate/Franchisor</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Send to franchise headquarters</div>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full mt-4 px-4 py-2 text-[#1E2D4D]/70 border border-[#1E2D4D]/10 rounded-xl hover:bg-[#FAF7F0] transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}
