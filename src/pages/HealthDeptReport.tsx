import { useState, useMemo } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  FileText, Download, Eye, AlertTriangle, CheckCircle, XCircle,
  Clock, Share2, Lock, ChevronDown, ChevronUp, ClipboardCheck,
  TrendingUp, TrendingDown, Building2, Shield, Users, Flame,
  Package, AlertCircle, History, Mail, Link2, Send,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { locations, locationScores } from '../data/demoData';
import {
  generateHealthDeptReport,
  COUNTY_TEMPLATES,
  getDemoReportHistory,
  type ReportConfig,
  type CountyTemplate,
  type HealthDeptReport as ReportType,
  type SelfAuditItem,
  type MissingDocAlert,
  type ReportHistory,
} from '../lib/reportGenerator';

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
        style={{ width: 16, height: 16, accentColor: '#1e4d6b' }}
      />
      <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
      {locked && <Lock className="h-3.5 w-3.5 text-gray-400" />}
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
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
      </button>
      {open && <div className="px-6 pb-6 border-t border-gray-100">{children}</div>}
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
      color: color === 'red' ? '#ef4444' : color === 'amber' ? '#d4af37' : '#22c55e',
      border: `1px solid ${color === 'red' ? '#fecaca' : color === 'amber' ? '#fef3c7' : '#bbf7d0'}`,
      padding: '0 6px',
    }}>
      {count}
    </span>
  );
}

// ── Main Page Component ────────────────────────────────────

export function HealthDeptReport() {
  const [activeView, setActiveView] = useState<'generate' | 'preview' | 'history' | 'self-audit'>('generate');
  const [selectedLocation, setSelectedLocation] = useState(locations[0]?.urlId || 'downtown');
  const [countyTemplate, setCountyTemplate] = useState<CountyTemplate>('generic');
  const [dateRange, setDateRange] = useState<'30' | '60' | '90' | 'custom'>('30');
  const [isPaidTier, setIsPaidTier] = useState(true);
  const [generatedReport, setGeneratedReport] = useState<ReportType | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const [sections, setSections] = useState({
    facilityInfo: true,
    foodSafety: true,
    employeeCerts: true,
    fireSafety: true,
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

  const handleGenerate = () => {
    const report = generateHealthDeptReport({
      locationId: selectedLocation,
      countyTemplate,
      dateRange,
      sections,
      isPaidTier,
    });
    setGeneratedReport(report);
    setActiveView('preview');
  };

  const handleDownloadPDF = () => {
    alert('PDF download initiated! In production, this generates a formatted PDF using jsPDF with the county-specific template applied.');
  };

  const handleShare = (method: string) => {
    setShowShareModal(false);
    if (method === 'link') {
      alert('Shareable link created! Link expires in 7 days.\nhttps://evidly-app.vercel.app/shared/' + (generatedReport?.id || 'RPT-DEMO'));
    } else if (method === 'email-health-dept') {
      alert('Report emailed to Fresno County Health Department at envhealth@co.fresno.ca.us');
    } else if (method === 'email-insurance') {
      alert('Report emailed to insurance broker.');
    } else if (method === 'email-corporate') {
      alert('Report shared with corporate/franchisor.');
    }
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reporting', href: '/reports' }, { label: 'Health Department Report' }]} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Health Department Report Generator</h1>
            <p className="text-sm text-gray-600 mt-1">Generate inspection-ready compliance reports with county-specific formatting</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'generate', label: 'Generate Report', icon: <FileText className="h-4 w-4" /> },
            { id: 'preview', label: 'Report Preview', icon: <Eye className="h-4 w-4" /> },
            { id: 'self-audit', label: 'Self-Audit Checklist', icon: <ClipboardCheck className="h-4 w-4" /> },
            { id: 'history', label: 'Report History', icon: <History className="h-4 w-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeView === tab.id
                  ? 'border-[#d4af37] text-[#1e4d6b]'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Generate Report Tab ─────────────────────── */}
        {activeView === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Config */}
            <div className="lg:col-span-2 space-y-6">
              {/* Location & Template */}
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Report Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <select
                      value={selectedLocation}
                      onChange={e => setSelectedLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {locations.map(loc => (
                        <option key={loc.urlId} value={loc.urlId}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">County Template</label>
                    <select
                      value={countyTemplate}
                      onChange={e => setCountyTemplate(e.target.value as CountyTemplate)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {Object.entries(COUNTY_TEMPLATES).map(([key, tmpl]) => (
                        <option key={key} value={key}>{tmpl.name} — {tmpl.gradingSystem}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <select
                      value={dateRange}
                      onChange={e => setDateRange(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="30">Last 30 Days</option>
                      <option value="60">Last 60 Days</option>
                      <option value="90">Last 90 Days</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Preview</label>
                    <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{template.gradingSystem}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{template.gradingDescription}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Toggles */}
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Report Sections</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SectionToggle label="Facility Information" enabled={sections.facilityInfo} onChange={() => toggleSection('facilityInfo')} />
                  <SectionToggle label="Food Safety Summary" enabled={sections.foodSafety} onChange={() => toggleSection('foodSafety')} locked={!isPaidTier} />
                  <SectionToggle label="Employee Certifications" enabled={sections.employeeCerts} onChange={() => toggleSection('employeeCerts')} locked={!isPaidTier} />
                  <SectionToggle label="Fire Safety & Equipment" enabled={sections.fireSafety} onChange={() => toggleSection('fireSafety')} locked={!isPaidTier} />
                  <SectionToggle label="Vendor Documentation" enabled={sections.vendorDocs} onChange={() => toggleSection('vendorDocs')} locked={!isPaidTier} />
                  <SectionToggle label="Corrective Actions" enabled={sections.correctiveActions} onChange={() => toggleSection('correctiveActions')} locked={!isPaidTier} />
                  <SectionToggle label="Compliance Score & Trends" enabled={sections.complianceScore} onChange={() => toggleSection('complianceScore')} />
                </div>

                {!isPaidTier && (
                  <div style={{ padding: '12px 16px', backgroundColor: '#fffbeb', borderRadius: 8, border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Lock className="h-5 w-5 text-[#d4af37]" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>Free Tier — Limited Report</div>
                      <div style={{ fontSize: 13, color: '#92400e' }}>Upgrade to unlock Food Safety, Employee Certs, Fire Safety, Vendor Docs, and Corrective Actions sections.</div>
                    </div>
                    <button
                      onClick={() => setIsPaidTier(true)}
                      style={{ marginLeft: 'auto', padding: '6px 16px', backgroundColor: '#d4af37', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Upgrade Now
                    </button>
                  </div>
                )}
              </div>

              {/* Missing Document Alerts */}
              {missingDocs.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-[#d4af37]" />
                    <h3 className="font-semibold text-gray-900">Missing Documentation Alerts</h3>
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
                          : <AlertCircle className="h-5 w-5 text-[#d4af37] flex-shrink-0 mt-0.5" />
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
              {/* Score Preview */}
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Current Score — {template.name}</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: template.getGradeColor(scores.overall), lineHeight: 1 }}>
                  {scores.overall}
                </div>
                <div style={{
                  display: 'inline-block', marginTop: 8, padding: '4px 16px', borderRadius: 20, fontSize: 14, fontWeight: 700,
                  color: template.getGradeColor(scores.overall),
                  border: `2px solid ${template.getGradeColor(scores.overall)}`,
                }}>
                  {template.getGrade(scores.overall)}
                </div>
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Food Safety', score: scores.foodSafety },
                    { label: 'Fire Safety', score: scores.fireSafety },
                    { label: 'Vendor Compliance', score: scores.vendorCompliance },
                  ].map(p => (
                    <div key={p.label} style={{ padding: '8px 4px', backgroundColor: '#f9fafb', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{p.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: p.score >= 90 ? '#22c55e' : p.score >= 75 ? '#eab308' : p.score >= 60 ? '#f59e0b' : '#ef4444' }}>{p.score}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-semibold"
              >
                <FileText className="h-5 w-5" />
                Generate Report
              </button>

              {/* Tier Toggle (for demo) */}
              <div className="bg-white rounded-lg shadow p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPaidTier}
                    onChange={e => setIsPaidTier(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#d4af37' }}
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
              <div className="bg-white rounded-lg shadow p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#1e4d6b]" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Auto-Scheduled Reports</span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  Monthly reports auto-generate on the 1st. Quarterly and annual summaries also available.
                </div>
                <div className="space-y-1">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#374151' }}>Next Monthly Report</span>
                    <span style={{ fontWeight: 600, color: '#1e4d6b' }}>Mar 1, 2026</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#374151' }}>Next Quarterly Summary</span>
                    <span style={{ fontWeight: 600, color: '#1e4d6b' }}>Apr 1, 2026</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#374151' }}>Delivery Method</span>
                    <span style={{ fontWeight: 600, color: '#1e4d6b' }}>Email (Resend)</span>
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
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Generated</h3>
                <p className="text-gray-600 mb-4">Generate a report from the configuration tab first.</p>
                <button
                  onClick={() => setActiveView('generate')}
                  className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors text-sm font-medium"
                >
                  Go to Configuration
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Action Bar */}
                <div className="flex items-center justify-between bg-white rounded-lg shadow px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 14, color: '#6b7280' }}>
                      Generated {new Date(generatedReport.generatedAt).toLocaleString()} for{' '}
                      <span style={{ fontWeight: 600, color: '#374151' }}>{generatedReport.facilityInfo.name}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors text-sm font-medium">
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                    <button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1e4d6b] border border-[#1e4d6b] rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                      Print
                    </button>
                  </div>
                </div>

                {/* Report Header */}
                <div className="bg-white rounded-lg shadow p-6 text-center" style={{ borderTop: `4px solid ${template.getGradeColor(generatedReport.complianceScore.overall)}` }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1e4d6b', marginBottom: 4 }}>Health Department Inspection Compliance Report</div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>{template.name} — {template.gradingSystem}</div>
                  <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 16, padding: '12px 24px', borderRadius: 12, backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <div>
                      <div style={{ fontSize: 40, fontWeight: 800, color: template.getGradeColor(generatedReport.complianceScore.overall), lineHeight: 1 }}>
                        {generatedReport.complianceScore.overall}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Score</div>
                    </div>
                    <div style={{ width: 1, height: 50, backgroundColor: '#e5e7eb' }} />
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: template.getGradeColor(generatedReport.complianceScore.overall) }}>
                        {generatedReport.complianceScore.countyGrade}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Grade</div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Facility Info */}
                {generatedReport.config.sections.facilityInfo && (
                  <CollapsibleSection title="Facility Information" icon={<Building2 className="h-5 w-5 text-[#1e4d6b]" />} defaultOpen>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
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
                    icon={<Shield className="h-5 w-5 text-[#1e4d6b]" />}
                    badge={<CountBadge count={generatedReport.foodSafety.filter(i => i.status === 'non-compliant').length} color="red" />}
                    defaultOpen
                  >
                    <div className="overflow-x-auto mt-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {generatedReport.foodSafety.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.item}</td>
                              <td className="px-4 py-3 text-center">
                                {item.status === 'compliant' && <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />}
                                {item.status === 'needs-attention' && <AlertCircle className="h-5 w-5 text-[#d4af37] mx-auto" />}
                                {item.status === 'non-compliant' && <XCircle className="h-5 w-5 text-red-500 mx-auto" />}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.details}</td>
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
                    icon={<Users className="h-5 w-5 text-[#1e4d6b]" />}
                    badge={<CountBadge count={generatedReport.employeeCerts.filter(c => c.status === 'expired').length} color="red" />}
                  >
                    <div className="overflow-x-auto mt-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Certification</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cert #</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Expires</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {generatedReport.employeeCerts.map((cert, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{cert.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{cert.role}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{cert.certType}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 font-mono">{cert.certNumber}</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600">{cert.expiryDate}</td>
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

                {/* Section 4: Fire Safety */}
                {generatedReport.config.sections.fireSafety && (
                  <CollapsibleSection
                    title="Fire Safety & Equipment"
                    icon={<Flame className="h-5 w-5 text-[#1e4d6b]" />}
                    badge={<CountBadge count={generatedReport.fireSafety.filter(f => f.status === 'overdue').length} color="red" />}
                  >
                    <div className="overflow-x-auto mt-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Last Inspection</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Next Due</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Inspector</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {generatedReport.fireSafety.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.equipment}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.location}</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600">{item.lastInspection}</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600">{item.nextDue}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.inspector}</td>
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
                    icon={<Package className="h-5 w-5 text-[#1e4d6b]" />}
                    badge={<CountBadge count={generatedReport.vendorDocs.filter(v => v.status === 'expired' || v.status === 'missing').length} color="red" />}
                  >
                    <div className="overflow-x-auto mt-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Expiry</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Days Left</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {generatedReport.vendorDocs.map((doc, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{doc.vendor}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{doc.docType}</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600">{doc.expiryDate}</td>
                              <td className="px-4 py-3 text-center text-sm font-semibold" style={{
                                color: doc.daysUntilExpiry < 0 ? '#ef4444' : doc.daysUntilExpiry <= 30 ? '#d4af37' : '#22c55e'
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
                    icon={<AlertTriangle className="h-5 w-5 text-[#1e4d6b]" />}
                    badge={<CountBadge count={generatedReport.correctiveActions.filter(a => a.status === 'open').length} color="red" />}
                  >
                    <div className="space-y-3 mt-4">
                      {generatedReport.correctiveActions.map((action) => (
                        <div key={action.id} style={{
                          padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                          borderLeft: `4px solid ${action.priority === 'critical' ? '#ef4444' : action.priority === 'high' ? '#f97316' : action.priority === 'medium' ? '#d4af37' : '#1e4d6b'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>{action.id}</span>
                              <span style={{
                                padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                                backgroundColor: action.priority === 'critical' ? '#fef2f2' : action.priority === 'high' ? '#fff7ed' : action.priority === 'medium' ? '#fffbeb' : '#eff6ff',
                                color: action.priority === 'critical' ? '#ef4444' : action.priority === 'high' ? '#f97316' : action.priority === 'medium' ? '#d4af37' : '#1e4d6b',
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
                  <CollapsibleSection title="Compliance Score & Trend Analytics" icon={<TrendingUp className="h-5 w-5 text-[#1e4d6b]" />} defaultOpen>
                    <div className="mt-4 space-y-6">
                      {/* Score Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
                          <div style={{ fontSize: 32, fontWeight: 800, color: template.getGradeColor(generatedReport.complianceScore.overall) }}>
                            {generatedReport.complianceScore.overall}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>Overall</div>
                        </div>
                        {[
                          { label: 'Food Safety', value: generatedReport.complianceScore.foodSafety },
                          { label: 'Fire Safety', value: generatedReport.complianceScore.fireSafety },
                          { label: 'Vendor Compliance', value: generatedReport.complianceScore.vendorCompliance },
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
                            <Line type="monotone" dataKey="overallScore" name="Overall Score" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="tempCompliance" name="Temp Compliance" stroke="#22c55e" strokeWidth={1.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="checklistCompletion" name="Checklist Completion" stroke="#d4af37" strokeWidth={1.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Trend Numbers */}
                      <div className="grid grid-cols-3 gap-4">
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
                        <Shield className="h-5 w-5" style={{ color: selectedLocation === 'downtown' ? '#22c55e' : '#ef4444' }} />
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
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">County-Specific Requirements — {template.name}</h3>
                  <ul className="space-y-2">
                    {template.specialRequirements.map((req, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151' }}>
                        <StatusDot color="#1e4d6b" />
                        <span style={{ paddingTop: 1 }}>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Self-Audit Checklist Tab ────────────────── */}
        {activeView === 'self-audit' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Pre-Inspection Self-Audit Checklist</h3>
                  <p className="text-sm text-gray-600 mt-1">Mock inspection based on county scoring — flags potential point deductions</p>
                </div>
                <select
                  value={selectedLocation}
                  onChange={e => setSelectedLocation(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{passCount}</div>
                      <div style={{ fontSize: 12, color: '#166534' }}>Passing</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{failCount}</div>
                      <div style={{ fontSize: 12, color: '#991b1b' }}>Failing</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fffbeb', borderRadius: 8, border: '1px solid #fef3c7' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#d4af37' }}>{reviewCount}</div>
                      <div style={{ fontSize: 12, color: '#92400e' }}>Needs Review</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>-{lostPoints}</div>
                      <div style={{ fontSize: 12, color: '#991b1b' }}>Points Lost</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fffbeb', borderRadius: 8, border: '1px solid #fef3c7' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#d4af37' }}>-{atRiskPoints}</div>
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
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1e4d6b', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #e5e7eb' }}>
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
                          {item.status === 'needs-review' && <AlertCircle className="h-5 w-5 text-[#d4af37] flex-shrink-0" />}
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="font-semibold text-gray-900">Report History</h3>
                <p className="text-sm text-gray-600 mt-1">Previously generated reports and their status</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated By</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sections</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportHistory.map(report => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{report.reportType}</div>
                          <div className="text-xs text-gray-500">{report.dateRange}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{report.locationName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(report.generatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{report.generatedBy}</td>
                        <td className="px-6 py-4 text-center">
                          <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                            backgroundColor: '#eef4f8', color: '#1e4d6b',
                          }}>
                            {report.sections.length} sections
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => alert(`Downloading report ${report.id}...`)}
                              className="text-[#1e4d6b] hover:text-[#163a52]"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => alert(`Sharing report ${report.id}...`)}
                              className="text-[#1e4d6b] hover:text-[#163a52]"
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
            <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 440 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 16 }}>Share Report</h3>
              <div className="space-y-3">
                <button onClick={() => handleShare('link')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left">
                  <Link2 className="h-5 w-5 text-[#1e4d6b]" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Create Shareable Link</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Link expires in 7 days</div>
                  </div>
                </button>
                <button onClick={() => handleShare('email-health-dept')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left">
                  <Mail className="h-5 w-5 text-[#1e4d6b]" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Email to Health Department</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Send directly to county health dept</div>
                  </div>
                </button>
                <button onClick={() => handleShare('email-insurance')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left">
                  <Send className="h-5 w-5 text-[#1e4d6b]" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Share with Insurance Broker</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Send compliance proof to insurer</div>
                  </div>
                </button>
                <button onClick={() => handleShare('email-corporate')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left">
                  <Building2 className="h-5 w-5 text-[#1e4d6b]" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Share with Corporate/Franchisor</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Send to franchise headquarters</div>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full mt-4 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
