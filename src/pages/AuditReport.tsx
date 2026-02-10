import { useState, useMemo, useRef } from 'react';
import {
  Download, Mail, Share2, Printer, FileText, Thermometer, CheckSquare,
  AlertTriangle, Truck, Shield, Clock, MapPin, User, ChevronDown,
  ChevronRight, Camera, ClipboardList, Wrench, Eye, EyeOff, ShieldCheck,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';

// ── Types ──────────────────────────────────────────────────────────

type DateRange = '7' | '30' | '90' | 'custom';
type ReportType = 'full' | 'food_safety' | 'fire_safety' | 'vendor_docs' | 'custom';

interface ReportSection {
  id: string;
  label: string;
  icon: typeof FileText;
  enabled: boolean;
}

// ── Demo data generators ───────────────────────────────────────────

const LOCATIONS = ['Downtown Kitchen', 'Airport Cafe', 'University Dining'];
const EQUIPMENT = [
  { name: 'Walk-in Cooler #1', type: 'Cooler', min: 34, max: 41 },
  { name: 'Walk-in Freezer', type: 'Freezer', min: -10, max: 0 },
  { name: 'Prep Cooler', type: 'Cooler', min: 34, max: 41 },
  { name: 'Hot Hold Unit #1', type: 'Hot Hold', min: 135, max: 165 },
  { name: 'Hot Hold Unit #2', type: 'Hot Hold', min: 135, max: 165 },
  { name: 'Salad Bar Cooler', type: 'Cooler', min: 34, max: 41 },
  { name: 'Dessert Cooler', type: 'Cooler', min: 34, max: 41 },
  { name: 'Blast Chiller', type: 'Chiller', min: 28, max: 38 },
];

const USERS = ['Sarah Chen', 'Maria Garcia', 'John Smith', 'Emily Rogers', 'David Kim', 'Michael Torres'];

const CHECKLIST_NAMES = ['Opening Checklist', 'Closing Checklist', 'Mid-Day Food Safety Check', 'Receiving Inspection', 'Restroom Sanitation'];

const VENDOR_SERVICES = [
  { vendor: 'CleanVent Services', service: 'Hood Cleaning', cert: 'Hood Cleaning Certificate' },
  { vendor: 'Valley Fire Protection', service: 'Fire Suppression', cert: 'Fire Suppression Cert' },
  { vendor: 'ProTrap Solutions', service: 'Grease Trap', cert: 'Grease Trap Service Record' },
  { vendor: 'AirFlow HVAC', service: 'HVAC Maintenance', cert: 'HVAC Maintenance Agreement' },
  { vendor: 'PestShield Inc', service: 'Pest Control', cert: 'Pest Control Log' },
  { vendor: 'FireSafe Equipment', service: 'Fire Extinguisher', cert: 'Fire Extinguisher Inspection' },
];

const DOC_CATEGORIES = ['License', 'Permit', 'Certification', 'Insurance', 'Training', 'Inspection'];

const now = Date.now();
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function generateTempLogs(days: number, location: string | null) {
  const logs: any[] = [];
  const locs = location ? [location] : LOCATIONS;
  for (let d = 0; d < days; d++) {
    for (const loc of locs) {
      const checksPerDay = rnd(6, 8);
      for (let c = 0; c < checksPerDay; c++) {
        const eq = pick(EQUIPMENT);
        const baseTemp = (eq.min + eq.max) / 2;
        const variance = (eq.max - eq.min) * 0.6;
        let temp = Math.round((baseTemp + (Math.random() - 0.5) * variance) * 10) / 10;
        // ~5% out of range
        const forceOOR = Math.random() < 0.05;
        if (forceOOR) temp = eq.type === 'Hot Hold' ? eq.min - rnd(5, 15) : eq.max + rnd(2, 8);
        const inRange = temp >= eq.min && temp <= eq.max;
        const ts = new Date(now - d * 86400000 - rnd(0, 86400000));
        logs.push({
          id: `TL-${logs.length + 1}`,
          date: format(ts, 'MMM d, yyyy'),
          time: format(ts, 'h:mm a'),
          timestamp: ts.getTime(),
          equipment: eq.name,
          equipmentType: eq.type,
          reading: temp,
          range: `${eq.min}°F – ${eq.max}°F`,
          pass: inRange,
          user: pick(USERS),
          location: loc,
          correctiveAction: !inRange ? pick(['Adjusted thermostat', 'Called vendor for repair', 'Moved items to backup unit', 'Discarded affected product', 'Re-calibrated thermometer']) : null,
        });
      }
    }
  }
  return logs.sort((a, b) => b.timestamp - a.timestamp);
}

function generateChecklists(days: number, location: string | null) {
  const checklists: any[] = [];
  const locs = location ? [location] : LOCATIONS;
  for (let d = 0; d < days; d++) {
    for (const loc of locs) {
      const count = rnd(2, 3);
      for (let c = 0; c < count; c++) {
        const name = pick(CHECKLIST_NAMES);
        const totalItems = rnd(8, 14);
        const passed = totalItems - rnd(0, 2);
        const ts = new Date(now - d * 86400000 - rnd(0, 86400000));
        checklists.push({
          id: `CL-${checklists.length + 1}`,
          name,
          date: format(ts, 'MMM d, yyyy'),
          time: format(ts, 'h:mm a'),
          timestamp: ts.getTime(),
          completedBy: pick(USERS),
          totalItems,
          passed,
          failed: totalItems - passed,
          score: Math.round((passed / totalItems) * 100),
          location: loc,
          correctiveActions: totalItems - passed > 0 ? [`${pick(['Floor drains cleaned', 'Sanitizer concentration adjusted', 'Handwash station restocked', 'Date labels updated', 'FIFO rotation corrected'])}`] : [],
        });
      }
    }
  }
  return checklists.sort((a, b) => b.timestamp - a.timestamp);
}

function generateIncidents(location: string | null) {
  const types = ['Temperature Violation', 'Checklist Failure', 'Health Citation', 'Equipment Failure', 'Pest Sighting', 'Customer Complaint', 'Staff Safety'];
  const severities: ('Critical' | 'Major' | 'Minor')[] = ['Critical', 'Major', 'Minor'];
  const statuses = ['Verified', 'Resolved', 'In Progress', 'Assigned', 'Reported'];
  const rootCauses = ['Equipment', 'Training', 'Process', 'Vendor', 'External'];
  const locs = location ? [location] : LOCATIONS;
  const incidents: any[] = [];
  const count = rnd(5, 8);
  for (let i = 0; i < count; i++) {
    const status = pick(statuses);
    const createdTs = new Date(now - rnd(1, 28) * 86400000);
    const resolvedTs = ['Verified', 'Resolved'].includes(status) ? new Date(createdTs.getTime() + rnd(1, 48) * 3600000) : null;
    incidents.push({
      id: `INC-${String(i + 1).padStart(3, '0')}`,
      type: pick(types),
      severity: pick(severities),
      title: pick([
        'Walk-in cooler temperature at 47°F',
        'Closing checklist — floor drains not cleaned',
        'Health inspector citation — improper food storage',
        'Hot holding unit not reaching 135°F',
        'Rodent droppings found in dry storage',
        'Customer reported lukewarm soup',
        'Wet floor near dishwash station',
        'Prep cooler door seal worn',
      ]),
      location: pick(locs),
      status,
      assignedTo: pick(USERS),
      reportedBy: pick(USERS),
      createdAt: format(createdTs, 'MMM d, yyyy h:mm a'),
      resolvedAt: resolvedTs ? format(resolvedTs, 'MMM d, yyyy h:mm a') : '—',
      resolutionTime: resolvedTs ? `${Math.round((resolvedTs.getTime() - createdTs.getTime()) / 3600000)}h` : '—',
      rootCause: resolvedTs ? pick(rootCauses) : '—',
      verifiedBy: status === 'Verified' ? pick(USERS) : '—',
    });
  }
  return incidents;
}

function generateVendorRecords(location: string | null) {
  const locs = location ? [location] : LOCATIONS;
  const records: any[] = [];
  for (const vs of VENDOR_SERVICES) {
    for (const loc of locs) {
      if (Math.random() > 0.7) continue;
      const lastService = new Date(now - rnd(5, 60) * 86400000);
      const nextDue = new Date(lastService.getTime() + rnd(30, 180) * 86400000);
      const certExpiry = new Date(now + rnd(-30, 365) * 86400000);
      const certStatus = certExpiry.getTime() < now ? 'Expired' : certExpiry.getTime() < now + 30 * 86400000 ? 'Expiring Soon' : 'Current';
      records.push({
        id: `VS-${records.length + 1}`,
        vendor: vs.vendor,
        serviceType: vs.service,
        location: loc,
        lastService: format(lastService, 'MMM d, yyyy'),
        nextDue: format(nextDue, 'MMM d, yyyy'),
        certName: vs.cert,
        certExpiry: format(certExpiry, 'MMM d, yyyy'),
        certStatus,
      });
    }
  }
  return records;
}

function generateDocuments(location: string | null) {
  const docNames = [
    'Food Service License', 'Business License', 'Health Permit', 'Fire Safety Certificate',
    'Liquor License', 'General Liability Insurance', 'Workers Comp Insurance',
    'Food Handler Certificate — Sarah Chen', 'Food Handler Certificate — Maria Garcia',
    'Food Handler Certificate — John Smith', 'ServSafe Manager Cert — Emily Rogers',
    'Hood Cleaning Certificate', 'Fire Suppression Inspection', 'Grease Trap Service Record',
    'HVAC Maintenance Agreement', 'Pest Control Service Log', 'Elevator Inspection',
    'ADA Compliance Certificate', 'Backflow Prevention Test', 'Building Safety Inspection',
  ];
  const locs = location ? [location] : LOCATIONS;
  const docs: any[] = [];
  for (const name of docNames) {
    const loc = pick(locs);
    const uploaded = new Date(now - rnd(30, 365) * 86400000);
    const expiry = new Date(now + rnd(-60, 400) * 86400000);
    const status = expiry.getTime() < now ? 'Expired' : expiry.getTime() < now + 30 * 86400000 ? 'Expiring' : 'Current';
    docs.push({
      id: `DOC-${docs.length + 1}`,
      name,
      category: pick(DOC_CATEGORIES),
      location: loc,
      uploadDate: format(uploaded, 'MMM d, yyyy'),
      expirationDate: format(expiry, 'MMM d, yyyy'),
      status,
      uploadedBy: pick(USERS),
    });
  }
  return docs;
}

function generateEquipmentList() {
  const items: any[] = [];
  for (const loc of LOCATIONS) {
    for (const eq of EQUIPMENT) {
      if (Math.random() > 0.6) continue;
      const lastService = new Date(now - rnd(10, 180) * 86400000);
      const nextDue = new Date(lastService.getTime() + rnd(60, 365) * 86400000);
      items.push({
        id: `EQ-${items.length + 1}`,
        name: eq.name,
        type: eq.type,
        location: loc,
        lastService: format(lastService, 'MMM d, yyyy'),
        nextDue: format(nextDue, 'MMM d, yyyy'),
        condition: pick(['Good', 'Good', 'Good', 'Fair', 'Needs Attention']),
      });
    }
  }
  return items;
}

function generateAuditLog(days: number) {
  const actions = [
    'Logged temperature reading', 'Completed opening checklist', 'Completed closing checklist',
    'Uploaded document', 'Resolved incident INC-003', 'Verified incident INC-002',
    'Requested vendor document', 'Updated equipment record', 'Generated compliance report',
    'Assigned incident to team member', 'Added corrective action', 'Snoozed alert',
    'Exported temperature data', 'Modified checklist template', 'Updated vendor contact',
    'Viewed compliance dashboard', 'Changed role assignment', 'Approved corrective action',
  ];
  const devices = ['Chrome / Windows 11', 'Safari / iPhone 15', 'Chrome / Android', 'Safari / iPad', 'Firefox / macOS'];
  const entries: any[] = [];
  for (let i = 0; i < days * 8; i++) {
    const ts = new Date(now - rnd(0, days * 86400000));
    entries.push({
      id: `AL-${i + 1}`,
      timestamp: format(ts, 'MMM d, yyyy h:mm a'),
      sortTs: ts.getTime(),
      user: pick(USERS),
      action: pick(actions),
      device: pick(devices),
      ip: `192.168.${rnd(1, 10)}.${rnd(1, 254)}`,
    });
  }
  return entries.sort((a, b) => b.sortTs - a.sortTs);
}

// ── Severity/status color helpers ──────────────────────────────────

const sevColor = (s: string) => s === 'Critical' ? '#dc2626' : s === 'Major' ? '#d97706' : '#2563eb';
const sevBg = (s: string) => s === 'Critical' ? '#fef2f2' : s === 'Major' ? '#fffbeb' : '#eff6ff';
const statusColor = (s: string) => {
  if (s === 'Current' || s === 'Good' || s === 'Verified') return '#16a34a';
  if (s === 'Expiring' || s === 'Expiring Soon' || s === 'Fair' || s === 'In Progress' || s === 'Assigned') return '#d97706';
  if (s === 'Expired' || s === 'Needs Attention' || s === 'Reported') return '#dc2626';
  return '#16a34a';
};
const statusBg = (s: string) => {
  if (s === 'Current' || s === 'Good' || s === 'Verified' || s === 'Resolved') return '#f0fdf4';
  if (s === 'Expiring' || s === 'Expiring Soon' || s === 'Fair' || s === 'In Progress' || s === 'Assigned') return '#fffbeb';
  if (s === 'Expired' || s === 'Needs Attention' || s === 'Reported') return '#fef2f2';
  return '#f0fdf4';
};

// ── Component ──────────────────────────────────────────────────────

export function AuditReport() {
  const reportRef = useRef<HTMLDivElement>(null);

  // Config state
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [reportType, setReportType] = useState<ReportType>('full');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [generated, setGenerated] = useState(false);

  // Section toggles
  const [sections, setSections] = useState<ReportSection[]>([
    { id: 'summary', label: 'Executive Summary', icon: Shield, enabled: true },
    { id: 'temp_logs', label: 'Temperature Logs', icon: Thermometer, enabled: true },
    { id: 'checklists', label: 'Checklist Completions', icon: CheckSquare, enabled: true },
    { id: 'incidents', label: 'Corrective Actions / Incidents', icon: AlertTriangle, enabled: true },
    { id: 'vendors', label: 'Vendor Services', icon: Truck, enabled: true },
    { id: 'documents', label: 'Documents', icon: FileText, enabled: true },
    { id: 'equipment', label: 'Equipment Status', icon: Wrench, enabled: true },
    { id: 'audit_log', label: 'Chain of Custody', icon: ClipboardList, enabled: true },
  ]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true, temp_logs: true, checklists: true, incidents: true,
    vendors: true, documents: true, equipment: true, audit_log: true,
  });

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const toggleExpand = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Apply report type presets
  const applyReportType = (type: ReportType) => {
    setReportType(type);
    const presets: Record<ReportType, string[]> = {
      full: ['summary', 'temp_logs', 'checklists', 'incidents', 'vendors', 'documents', 'equipment', 'audit_log'],
      food_safety: ['summary', 'temp_logs', 'checklists', 'incidents'],
      fire_safety: ['summary', 'vendors', 'equipment', 'documents'],
      vendor_docs: ['summary', 'vendors', 'documents'],
      custom: sections.filter(s => s.enabled).map(s => s.id),
    };
    if (type !== 'custom') {
      const enabled = presets[type];
      setSections(prev => prev.map(s => ({ ...s, enabled: enabled.includes(s.id) })));
    }
  };

  const days = dateRange === 'custom' ? 30 : parseInt(dateRange);
  const loc = locationFilter === 'all' ? null : locationFilter;

  // Generate demo data
  const reportData = useMemo(() => {
    if (!generated) return null;
    return {
      tempLogs: generateTempLogs(days, loc),
      checklists: generateChecklists(days, loc),
      incidents: generateIncidents(loc),
      vendors: generateVendorRecords(loc),
      documents: generateDocuments(loc),
      equipment: generateEquipmentList(),
      auditLog: generateAuditLog(days),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, days, loc]);

  // Summary stats
  const summary = useMemo(() => {
    if (!reportData) return null;
    const totalTemps = reportData.tempLogs.length;
    const passTemps = reportData.tempLogs.filter((t: any) => t.pass).length;
    const totalChecklists = reportData.checklists.length;
    const avgScore = totalChecklists > 0
      ? Math.round(reportData.checklists.reduce((s: number, c: any) => s + c.score, 0) / totalChecklists)
      : 0;
    const openIncidents = reportData.incidents.filter((i: any) => !['Verified', 'Resolved'].includes(i.status)).length;
    const resolvedIncidents = reportData.incidents.filter((i: any) => ['Verified', 'Resolved'].includes(i.status)).length;
    const currentDocs = reportData.documents.filter((d: any) => d.status === 'Current').length;
    const expiringDocs = reportData.documents.filter((d: any) => d.status === 'Expiring').length;
    const expiredDocs = reportData.documents.filter((d: any) => d.status === 'Expired').length;
    const complianceScore = Math.round(
      (passTemps / Math.max(totalTemps, 1)) * 45 +
      (avgScore / 100) * 30 +
      (currentDocs / Math.max(reportData.documents.length, 1)) * 25
    );
    return {
      complianceScore,
      totalTemps, passTemps, tempPassRate: totalTemps > 0 ? Math.round((passTemps / totalTemps) * 100) : 0,
      totalChecklists, avgScore,
      openIncidents, resolvedIncidents, totalIncidents: reportData.incidents.length,
      currentDocs, expiringDocs, expiredDocs, totalDocs: reportData.documents.length,
      totalEquipment: reportData.equipment.length,
      totalAuditEntries: reportData.auditLog.length,
    };
  }, [reportData]);

  const reportTitle = reportType === 'full' ? 'Full Compliance Report'
    : reportType === 'food_safety' ? 'Food Safety Report'
    : reportType === 'fire_safety' ? 'Fire Safety Report'
    : reportType === 'vendor_docs' ? 'Vendor Documentation Report'
    : 'Custom Audit Report';

  const generatedAt = format(new Date(), 'MMMM d, yyyy \'at\' h:mm a');
  const dateRangeLabel = `${format(subDays(new Date(), days), 'MMM d, yyyy')} — ${format(new Date(), 'MMM d, yyyy')}`;

  // ── Handlers ─────────────────────────────────────────────────────

  // TODO: Production PDF — install jsPDF + html2canvas for server-side PDF generation
  // import jsPDF from 'jspdf';
  // import html2canvas from 'html2canvas';
  // const generatePDF = async () => {
  //   const canvas = await html2canvas(reportRef.current!);
  //   const pdf = new jsPDF('p', 'mm', 'a4');
  //   const imgData = canvas.toDataURL('image/png');
  //   pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
  //   pdf.save(`EvidLY-Audit-Report-${locationFilter}-${dateRange}d.pdf`);
  // };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleEmail = () => {
    // TODO: Production — POST to Resend API endpoint to email PDF
    // await fetch('/api/send-report', { method: 'POST', body: JSON.stringify({ to: email, reportHtml }) });
    alert('Report emailed to management@company.com (demo). In production, this sends via Resend API.');
  };

  const handleShareLink = () => {
    // TODO: Production — generate signed URL via Supabase Storage
    // const { data } = await supabase.storage.from('reports').createSignedUrl(path, 86400);
    alert('Secure share link generated (expires in 24 hours). Link copied to clipboard. (demo)');
  };

  const handlePrint = () => {
    window.print();
  };

  const sectionEnabled = (id: string) => sections.find(s => s.id === id)?.enabled ?? false;

  // ── Table style helpers ──────────────────────────────────────────
  const thStyle: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
    color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: '13px', color: '#374151',
    borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap',
  };
  const badge = (text: string, color: string, bg: string): React.CSSProperties => ({
    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
    color, backgroundColor: bg, display: 'inline-block',
  });

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @media print {
          nav, .sidebar, .topbar, .no-print, [data-tour], .mobile-tab-bar,
          header, footer { display: none !important; }
          body { background: white !important; }
          .print-report { padding: 0 !important; margin: 0 !important; }
          .print-report * { break-inside: avoid-page; }
          .report-section { page-break-inside: avoid; }
          .page-break { page-break-before: always; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      <div className="no-print">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Audit Report' }]} />
      </div>

      <div className="space-y-6">
        {/* Header — no-print on config panel */}
        <div className="no-print">
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail Report</h1>
          <p className="text-sm text-gray-600 mt-1">One-click compliance documentation for inspectors and auditors</p>
        </div>

        {/* Configuration Panel */}
        {!generated && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 no-print">
            <h2 className="text-lg font-bold text-gray-900">Report Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={dateRange}
                  onChange={e => setDateRange(e.target.value as DateRange)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="custom">Custom range</option>
                </select>
                {dateRange === 'custom' && (
                  <div className="flex gap-2 mt-2">
                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" />
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" />
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={locationFilter}
                  onChange={e => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="all">All Locations</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={e => applyReportType(e.target.value as ReportType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="full">Full Compliance Report</option>
                  <option value="food_safety">Food Safety Report</option>
                  <option value="fire_safety">Fire Safety Report</option>
                  <option value="vendor_docs">Vendor Documentation Report</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Include Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Include Photos</label>
                <button
                  onClick={() => setIncludePhotos(!includePhotos)}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    includePhotos ? 'border-[#1e4d6b] bg-blue-50 text-[#1e4d6b]' : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {includePhotos ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {includePhotos ? 'Photos Included' : 'No Photos'}
                </button>
              </div>
            </div>

            {/* Section toggles for custom */}
            {reportType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sections to Include</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {sections.map(s => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSection(s.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          s.enabled ? 'border-[#1e4d6b] bg-blue-50 text-[#1e4d6b]' : 'border-gray-200 text-gray-400 bg-gray-50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setGenerated(true)}
              className="w-full md:w-auto px-8 py-3 bg-[#1e4d6b] text-white rounded-lg font-bold text-lg hover:bg-[#163a52] shadow-sm transition-colors"
            >
              Generate Report
            </button>
          </div>
        )}

        {/* Generated Report */}
        {generated && reportData && summary && (
          <>
            {/* Action bar */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center justify-between no-print">
              <button
                onClick={() => setGenerated(false)}
                className="flex items-center gap-1 text-sm text-[#1e4d6b] hover:underline font-medium"
              >
                ← Back to Configuration
              </button>
              <div className="flex gap-2 flex-wrap">
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium">
                  <Download className="h-4 w-4" /> Download PDF
                </button>
                <button onClick={handleEmail} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Mail className="h-4 w-4" /> Email Report
                </button>
                <button onClick={handleShareLink} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Share2 className="h-4 w-4" /> Share Link
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>

            {/* Printable Report */}
            <div ref={reportRef} className="print-report space-y-6">
              {/* Report Header */}
              <div className="bg-[#1e4d6b] rounded-xl p-6 text-white" style={{ pageBreakAfter: 'avoid' }}>
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="h-8 w-8 text-[#d4af37]" />
                  <span className="text-2xl font-bold">
                    <span className="text-white">Evid</span>
                    <span className="text-[#d4af37]">LY</span>
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-1">{reportTitle}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm opacity-90">
                  <div>
                    <span className="block text-white/60 text-xs uppercase">Organization</span>
                    <span className="font-medium">Demo Restaurant Group</span>
                  </div>
                  <div>
                    <span className="block text-white/60 text-xs uppercase">Location(s)</span>
                    <span className="font-medium">{locationFilter === 'all' ? 'All Locations' : locationFilter}</span>
                  </div>
                  <div>
                    <span className="block text-white/60 text-xs uppercase">Date Range</span>
                    <span className="font-medium">{dateRangeLabel}</span>
                  </div>
                  <div>
                    <span className="block text-white/60 text-xs uppercase">Generated</span>
                    <span className="font-medium">{generatedAt}</span>
                  </div>
                </div>
              </div>

              {/* Table of Contents */}
              <div className="bg-white rounded-xl shadow-sm p-5 no-print">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Table of Contents</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {sections.filter(s => s.enabled).map((s, idx) => {
                    const Icon = s.icon;
                    return (
                      <a
                        key={s.id}
                        href={`#section-${s.id}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 font-medium"
                      >
                        <span className="text-xs text-gray-400 font-mono w-4">{idx + 1}.</span>
                        <Icon className="h-4 w-4 text-[#1e4d6b]" />
                        {s.label}
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* ─── Section: Executive Summary ────────────────────────────── */}
              {sectionEnabled('summary') && (
                <div id="section-summary" className="bg-white rounded-xl shadow-sm p-5 report-section">
                  <button onClick={() => toggleExpand('summary')} className="flex items-center gap-2 w-full text-left no-print">
                    {expandedSections.summary ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    <Shield className="h-5 w-5 text-[#1e4d6b]" />
                    <h3 className="text-lg font-bold text-gray-900 flex-1">Executive Summary</h3>
                  </button>
                  {expandedSections.summary && (
                    <div className="mt-4">
                      {/* Compliance Score */}
                      <div className="flex items-center gap-6 mb-6 p-4 rounded-lg" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
                        <div className="relative w-24 h-24 flex-shrink-0">
                          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke={summary.complianceScore >= 80 ? '#16a34a' : summary.complianceScore >= 60 ? '#d97706' : '#dc2626'} strokeWidth="8" strokeDasharray={`${summary.complianceScore * 2.64} 264`} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold text-gray-900">{summary.complianceScore}</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-gray-900">Overall Compliance Score</h4>
                          <p className="text-sm text-gray-600">Weighted: Temperature (45%) + Checklists (30%) + Documents (25%)</p>
                        </div>
                      </div>

                      {/* KPI grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg border border-gray-200">
                          <div className="text-2xl font-bold text-[#1e4d6b]">{summary.totalTemps.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Temperature Readings</div>
                          <div className="text-xs font-semibold text-green-600 mt-1">{summary.tempPassRate}% pass rate</div>
                        </div>
                        <div className="p-3 rounded-lg border border-gray-200">
                          <div className="text-2xl font-bold text-[#1e4d6b]">{summary.totalChecklists}</div>
                          <div className="text-xs text-gray-500">Checklists Completed</div>
                          <div className="text-xs font-semibold text-green-600 mt-1">{summary.avgScore}% avg score</div>
                        </div>
                        <div className="p-3 rounded-lg border border-gray-200">
                          <div className="text-2xl font-bold text-[#1e4d6b]">{summary.totalIncidents}</div>
                          <div className="text-xs text-gray-500">Incidents Logged</div>
                          <div className="text-xs font-semibold mt-1" style={{ color: summary.openIncidents > 0 ? '#d97706' : '#16a34a' }}>
                            {summary.resolvedIncidents} resolved, {summary.openIncidents} open
                          </div>
                        </div>
                        <div className="p-3 rounded-lg border border-gray-200">
                          <div className="text-2xl font-bold text-[#1e4d6b]">{summary.totalDocs}</div>
                          <div className="text-xs text-gray-500">Documents on File</div>
                          <div className="text-xs font-semibold mt-1" style={{ color: summary.expiredDocs > 0 ? '#dc2626' : '#16a34a' }}>
                            {summary.currentDocs} current, {summary.expiredDocs} expired
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Section: Temperature Logs ─────────────────────────────── */}
              {sectionEnabled('temp_logs') && (
                <div id="section-temp_logs" className="bg-white rounded-xl shadow-sm p-5 report-section">
                  <button onClick={() => toggleExpand('temp_logs')} className="flex items-center gap-2 w-full text-left no-print">
                    {expandedSections.temp_logs ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    <Thermometer className="h-5 w-5 text-[#1e4d6b]" />
                    <h3 className="text-lg font-bold text-gray-900 flex-1">Temperature Logs</h3>
                    <span className="text-sm text-gray-400">{reportData.tempLogs.length} records</span>
                  </button>
                  {expandedSections.temp_logs && (
                    <div className="mt-4">
                      <div className="flex gap-4 mb-4 text-sm">
                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded font-medium">{summary.passTemps} Pass</span>
                        <span className="px-2 py-1 bg-red-50 text-red-700 rounded font-medium">{summary.totalTemps - summary.passTemps} Fail</span>
                        <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded font-medium">{summary.tempPassRate}% pass rate</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead><tr>
                            <th style={thStyle}>Date</th><th style={thStyle}>Time</th><th style={thStyle}>Equipment</th>
                            <th style={thStyle}>Reading</th><th style={thStyle}>Range</th><th style={thStyle}>Result</th>
                            <th style={thStyle}>User</th><th style={thStyle}>Location</th><th style={thStyle}>Corrective Action</th>
                          </tr></thead>
                          <tbody>
                            {reportData.tempLogs.slice(0, 100).map((log: any) => (
                              <tr key={log.id}>
                                <td style={tdStyle}>{log.date}</td>
                                <td style={tdStyle}>{log.time}</td>
                                <td style={tdStyle}>{log.equipment}</td>
                                <td style={{ ...tdStyle, fontWeight: 600 }}>{log.reading}°F</td>
                                <td style={tdStyle}>{log.range}</td>
                                <td style={tdStyle}>
                                  <span style={badge(log.pass ? 'Pass' : 'Fail', log.pass ? '#16a34a' : '#dc2626', log.pass ? '#f0fdf4' : '#fef2f2')}>
                                    {log.pass ? 'Pass' : 'Fail'}
                                  </span>
                                </td>
                                <td style={tdStyle}>{log.user}</td>
                                <td style={tdStyle}>{log.location}</td>
                                <td style={{ ...tdStyle, fontSize: '12px', color: '#6b7280', maxWidth: '200px', whiteSpace: 'normal' }}>{log.correctiveAction || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {reportData.tempLogs.length > 100 && (
                          <p className="text-xs text-gray-400 mt-2 text-center">Showing first 100 of {reportData.tempLogs.length} records</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Section: Checklists ────────────────────────────────────── */}
              {sectionEnabled('checklists') && (
                <div id="section-checklists" className="bg-white rounded-xl shadow-sm p-5 report-section">
                  <button onClick={() => toggleExpand('checklists')} className="flex items-center gap-2 w-full text-left no-print">
                    {expandedSections.checklists ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    <CheckSquare className="h-5 w-5 text-[#1e4d6b]" />
                    <h3 className="text-lg font-bold text-gray-900 flex-1">Checklist Completions</h3>
                    <span className="text-sm text-gray-400">{reportData.checklists.length} records</span>
                  </button>
                  {expandedSections.checklists && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full">
                        <thead><tr>
                          <th style={thStyle}>Date</th><th style={thStyle}>Checklist</th><th style={thStyle}>Completed By</th>
                          <th style={thStyle}>Items</th><th style={thStyle}>Passed</th><th style={thStyle}>Failed</th>
                          <th style={thStyle}>Score</th><th style={thStyle}>Location</th><th style={thStyle}>Corrective Actions</th>
                        </tr></thead>
                        <tbody>
                          {reportData.checklists.map((cl: any) => (
                            <tr key={cl.id}>
                              <td style={tdStyle}>{cl.date}</td>
                              <td style={{ ...tdStyle, fontWeight: 500 }}>{cl.name}</td>
                              <td style={tdStyle}>{cl.completedBy}</td>
                              <td style={tdStyle}>{cl.totalItems}</td>
                              <td style={{ ...tdStyle, color: '#16a34a', fontWeight: 600 }}>{cl.passed}</td>
                              <td style={{ ...tdStyle, color: cl.failed > 0 ? '#dc2626' : '#6b7280', fontWeight: 600 }}>{cl.failed}</td>
                              <td style={tdStyle}>
                                <span style={badge(`${cl.score}%`, cl.score >= 90 ? '#16a34a' : cl.score >= 70 ? '#d97706' : '#dc2626', cl.score >= 90 ? '#f0fdf4' : cl.score >= 70 ? '#fffbeb' : '#fef2f2')}>
                                  {cl.score}%
                                </span>
                              </td>
                              <td style={tdStyle}>{cl.location}</td>
                              <td style={{ ...tdStyle, fontSize: '12px', color: '#6b7280', maxWidth: '200px', whiteSpace: 'normal' }}>
                                {cl.correctiveActions.length > 0 ? cl.correctiveActions.join('; ') : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Section: Incidents ──────────────────────────────────────── */}
              {sectionEnabled('incidents') && (
                <div id="section-incidents" className="bg-white rounded-xl shadow-sm p-5 report-section">
                  <button onClick={() => toggleExpand('incidents')} className="flex items-center gap-2 w-full text-left no-print">
                    {expandedSections.incidents ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    <AlertTriangle className="h-5 w-5 text-[#1e4d6b]" />
                    <h3 className="text-lg font-bold text-gray-900 flex-1">Corrective Actions / Incidents</h3>
                    <span className="text-sm text-gray-400">{reportData.incidents.length} records</span>
                  </button>
                  {expandedSections.incidents && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full">
                        <thead><tr>
                          <th style={thStyle}>ID</th><th style={thStyle}>Type</th><th style={thStyle}>Severity</th>
                          <th style={thStyle}>Title</th><th style={thStyle}>Status</th><th style={thStyle}>Location</th>
                          <th style={thStyle}>Assigned To</th><th style={thStyle}>Reported</th><th style={thStyle}>Resolved</th>
                          <th style={thStyle}>Resolution Time</th><th style={thStyle}>Root Cause</th><th style={thStyle}>Verified By</th>
                        </tr></thead>
                        <tbody>
                          {reportData.incidents.map((inc: any) => (
                            <tr key={inc.id}>
                              <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px' }}>{inc.id}</td>
                              <td style={tdStyle}>{inc.type}</td>
                              <td style={tdStyle}><span style={badge(inc.severity, sevColor(inc.severity), sevBg(inc.severity))}>{inc.severity}</span></td>
                              <td style={{ ...tdStyle, maxWidth: '200px', whiteSpace: 'normal' }}>{inc.title}</td>
                              <td style={tdStyle}><span style={badge(inc.status, statusColor(inc.status), statusBg(inc.status))}>{inc.status}</span></td>
                              <td style={tdStyle}>{inc.location}</td>
                              <td style={tdStyle}>{inc.assignedTo}</td>
                              <td style={tdStyle}>{inc.createdAt}</td>
                              <td style={tdStyle}>{inc.resolvedAt}</td>
                              <td style={tdStyle}>{inc.resolutionTime}</td>
                              <td style={tdStyle}>{inc.rootCause}</td>
                              <td style={tdStyle}>{inc.verifiedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Section: Vendor Services ───────────────────────────────── */}
              {sectionEnabled('vendors') && (
                <div id="section-vendors" className="bg-white rounded-xl shadow-sm p-5 report-section">
                  <button onClick={() => toggleExpand('vendors')} className="flex items-center gap-2 w-full text-left no-print">
                    {expandedSections.vendors ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    <Truck className="h-5 w-5 text-[#1e4d6b]" />
                    <h3 className="text-lg font-bold text-gray-900 flex-1">Vendor Services</h3>
                    <span className="text-sm text-gray-400">{reportData.vendors.length} records</span>
                  </button>
                  {expandedSections.vendors && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full">
                        <thead><tr>
                          <th style={thStyle}>Vendor</th><th style={thStyle}>Service Type</th><th style={thStyle}>Location</th>
                          <th style={thStyle}>Last Service</th><th style={thStyle}>Next Due</th>
                          <th style={thStyle}>Certificate</th><th style={thStyle}>Cert Expiry</th><th style={thStyle}>Cert Status</th>
                        </tr></thead>
                        <tbody>
                          {reportData.vendors.map((v: any) => (
                            <tr key={v.id}>
                              <td style={{ ...tdStyle, fontWeight: 500 }}>{v.vendor}</td>
                              <td style={tdStyle}>{v.serviceType}</td>
                              <td style={tdStyle}>{v.location}</td>
                              <td style={tdStyle}>{v.lastService}</td>
                              <td style={tdStyle}>{v.nextDue}</td>
                              <td style={tdStyle}>{v.certName}</td>
                              <td style={tdStyle}>{v.certExpiry}</td>
                              <td style={tdStyle}><span style={badge(v.certStatus, statusColor(v.certStatus), statusBg(v.certStatus))}>{v.certStatus}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Section: Documents ──────────────────────────────────────── */}
              {sectionEnabled('documents') && (
                <div id="section-documents" className="bg-white rounded-xl shadow-sm p-5 report-section">
                  <button onClick={() => toggleExpand('documents')} className="flex items-center gap-2 w-full text-left no-print">
                    {expandedSections.documents ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    <FileText className="h-5 w-5 text-[#1e4d6b]" />
                    <h3 className="text-lg font-bold text-gray-900 flex-1">Documents</h3>
                    <span className="text-sm text-gray-400">{reportData.documents.length} records</span>
                  </button>
                  {expandedSections.documents && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full">
                        <thead><tr>
                          <th style={thStyle}>Document</th><th style={thStyle}>Category</th><th style={thStyle}>Location</th>
                          <th style={thStyle}>Uploaded</th><th style={thStyle}>Expiration</th><th style={thStyle}>Status</th><th style={thStyle}>Uploaded By</th>
                        </tr></thead>
                        <tbody>
                          {reportData.documents.map((doc: any) => (
                            <tr key={doc.id}>
                              <td style={{ ...tdStyle, fontWeight: 500 }}>{doc.name}</td>
                              <td style={tdStyle}>{doc.category}</td>
                              <td style={tdStyle}>{doc.location}</td>
                              <td style={tdStyle}>{doc.uploadDate}</td>
                              <td style={tdStyle}>{doc.expirationDate}</td>
                              <td style={tdStyle}><span style={badge(doc.status, statusColor(doc.status), statusBg(doc.status))}>{doc.status}</span></td>
                              <td style={tdStyle}>{doc.uploadedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Section: Equipment Status ──────────────────────────────── */}
              {sectionEnabled('equipment') && (
                <div id="section-equipment" className="bg-white rounded-xl shadow-sm p-5 report-section">
                  <button onClick={() => toggleExpand('equipment')} className="flex items-center gap-2 w-full text-left no-print">
                    {expandedSections.equipment ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    <Wrench className="h-5 w-5 text-[#1e4d6b]" />
                    <h3 className="text-lg font-bold text-gray-900 flex-1">Equipment Status</h3>
                    <span className="text-sm text-gray-400">{reportData.equipment.length} items</span>
                  </button>
                  {expandedSections.equipment && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full">
                        <thead><tr>
                          <th style={thStyle}>Equipment</th><th style={thStyle}>Type</th><th style={thStyle}>Location</th>
                          <th style={thStyle}>Last Service</th><th style={thStyle}>Next Due</th><th style={thStyle}>Condition</th>
                        </tr></thead>
                        <tbody>
                          {reportData.equipment.map((eq: any) => (
                            <tr key={eq.id}>
                              <td style={{ ...tdStyle, fontWeight: 500 }}>{eq.name}</td>
                              <td style={tdStyle}>{eq.type}</td>
                              <td style={tdStyle}>{eq.location}</td>
                              <td style={tdStyle}>{eq.lastService}</td>
                              <td style={tdStyle}>{eq.nextDue}</td>
                              <td style={tdStyle}><span style={badge(eq.condition, statusColor(eq.condition), statusBg(eq.condition))}>{eq.condition}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Section: Chain of Custody / Audit Log ──────────────────── */}
              {sectionEnabled('audit_log') && (
                <div id="section-audit_log" className="bg-white rounded-xl shadow-sm p-5 report-section">
                  <button onClick={() => toggleExpand('audit_log')} className="flex items-center gap-2 w-full text-left no-print">
                    {expandedSections.audit_log ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    <ClipboardList className="h-5 w-5 text-[#1e4d6b]" />
                    <h3 className="text-lg font-bold text-gray-900 flex-1">Chain of Custody — Audit Log</h3>
                    <span className="text-sm text-gray-400">{reportData.auditLog.length} entries</span>
                  </button>
                  {expandedSections.audit_log && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full">
                        <thead><tr>
                          <th style={thStyle}>Timestamp</th><th style={thStyle}>User</th><th style={thStyle}>Action</th>
                          <th style={thStyle}>Device</th><th style={thStyle}>IP Address</th>
                        </tr></thead>
                        <tbody>
                          {reportData.auditLog.slice(0, 100).map((entry: any) => (
                            <tr key={entry.id}>
                              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{entry.timestamp}</td>
                              <td style={tdStyle}>{entry.user}</td>
                              <td style={{ ...tdStyle, maxWidth: '300px', whiteSpace: 'normal' }}>{entry.action}</td>
                              <td style={{ ...tdStyle, fontSize: '12px' }}>{entry.device}</td>
                              <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px' }}>{entry.ip}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {reportData.auditLog.length > 100 && (
                        <p className="text-xs text-gray-400 mt-2 text-center">Showing first 100 of {reportData.auditLog.length} entries</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Report Footer */}
              <div className="bg-gray-50 rounded-xl p-4 text-center text-xs text-gray-400 border border-gray-200">
                <p>This report was generated by <strong>EvidLY</strong> — Compliance Management Platform</p>
                <p className="mt-1">Report ID: RPT-{Date.now().toString(36).toUpperCase()} • Generated: {generatedAt}</p>
                <p className="mt-1">This document is an accurate representation of compliance data as of the generation date.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
