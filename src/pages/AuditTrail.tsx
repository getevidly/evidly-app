import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Download, Share2, Printer, FileText, Thermometer, CheckSquare,
  AlertTriangle, Truck, ChevronDown, ChevronRight, ClipboardList,
  Wrench, Loader2, Hash, Clock, Link2, Copy, History,
  Lock, Eye, CheckCircle, XCircle, Camera, GraduationCap, BarChart3,
  Calendar, Users, ArrowRight, ExternalLink, Trash2, RefreshCw,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { format, subDays } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';
import { getScoreColor } from '../lib/complianceScoring';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

// ── Types ──────────────────────────────────────────────────────────

type DateRange = '7' | '30' | '90' | 'custom';

interface ModuleConfig {
  id: string;
  label: string;
  icon: typeof FileText;
  enabled: boolean;
  description: string;
}

interface ReportHistoryEntry {
  id: string;
  reportNumber: string;
  generatedAt: string;
  hash: string;
  location: string;
  dateRange: string;
  modules: string[];
  status: 'completed' | 'shared' | 'expired';
  shareToken?: string;
  shareExpiry?: string;
}

interface CustodyEntry {
  timestamp: string;
  action: string;
  actor: string;
  detail: string;
  hash?: string;
}

// ── Constants ──────────────────────────────────────────────────────

const LOCATIONS = ['Downtown Kitchen', 'Airport Cafe', 'University Dining'];
const USERS = ['Sarah Chen', 'Maria Garcia', 'John Smith', 'Emily Rogers', 'David Kim', 'Michael Torres'];
const HISTORY_KEY = 'evidly_audit_trail_history';

const EQUIPMENT = [
  { name: 'Walk-in Cooler #1', type: 'Cooler', min: 34, max: 41 },
  { name: 'Walk-in Freezer', type: 'Freezer', min: -10, max: 0 },
  { name: 'Prep Cooler', type: 'Cooler', min: 34, max: 41 },
  { name: 'Hot Hold Unit #1', type: 'Hot Hold', min: 135, max: 165 },
  { name: 'Hot Hold Unit #2', type: 'Hot Hold', min: 135, max: 165 },
  { name: 'Salad Bar Cooler', type: 'Cooler', min: 34, max: 41 },
  { name: 'Blast Chiller', type: 'Chiller', min: 28, max: 38 },
];

const VENDOR_SERVICES = [
  { vendor: 'CleanVent Services', service: 'Hood Cleaning', cert: 'Hood Cleaning Certificate' },
  { vendor: 'Valley Fire Protection', service: 'Fire Suppression', cert: 'Fire Suppression Cert' },
  { vendor: 'ProTrap Solutions', service: 'Grease Trap', cert: 'Grease Trap Service Record' },
  { vendor: 'PestShield Inc', service: 'Pest Control', cert: 'Pest Control Log' },
  { vendor: 'FireSafe Equipment', service: 'Fire Extinguisher', cert: 'Fire Extinguisher Inspection' },
];

const now = Date.now();
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ── SHA-256 hash ──────────────────────────────────────────────────

async function computeSHA256(data: unknown): Promise<string> {
  const json = JSON.stringify(data, null, 0);
  const buffer = new TextEncoder().encode(json);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Report history (localStorage) ─────────────────────────────────

function loadHistory(): ReportHistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* noop */ }
  return [];
}

function saveHistory(entries: ReportHistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); } catch { /* noop */ }
}

function generateReportNumber(): string {
  const ts = new Date();
  const y = ts.getFullYear();
  const m = String(ts.getMonth() + 1).padStart(2, '0');
  const d = String(ts.getDate()).padStart(2, '0');
  const seq = String(rnd(1, 999)).padStart(3, '0');
  return `AT-${y}${m}${d}-${seq}`;
}

// ── Demo data generators ──────────────────────────────────────────

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
        if (Math.random() < 0.05) temp = eq.type === 'Hot Hold' ? eq.min - rnd(5, 15) : eq.max + rnd(2, 8);
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
          correctiveAction: !inRange ? pick(['Adjusted thermostat', 'Called vendor', 'Moved items to backup unit', 'Discarded affected product']) : null,
        });
      }
    }
  }
  return logs.sort((a, b) => b.timestamp - a.timestamp);
}

function generateChecklists(days: number, location: string | null) {
  const names = ['Opening Checklist', 'Closing Checklist', 'Mid-Day Food Safety Check', 'Receiving Inspection'];
  const checklists: any[] = [];
  const locs = location ? [location] : LOCATIONS;
  for (let d = 0; d < days; d++) {
    for (const loc of locs) {
      const count = rnd(2, 3);
      for (let c = 0; c < count; c++) {
        const totalItems = rnd(8, 14);
        const passed = totalItems - rnd(0, 2);
        const ts = new Date(now - d * 86400000 - rnd(0, 86400000));
        checklists.push({
          id: `CL-${checklists.length + 1}`,
          name: pick(names),
          date: format(ts, 'MMM d, yyyy'),
          time: format(ts, 'h:mm a'),
          timestamp: ts.getTime(),
          completedBy: pick(USERS),
          totalItems,
          passed,
          failed: totalItems - passed,
          score: Math.round((passed / totalItems) * 100),
          location: loc,
        });
      }
    }
  }
  return checklists.sort((a, b) => b.timestamp - a.timestamp);
}

function generateIncidents(location: string | null) {
  const types = ['Temperature Violation', 'Checklist Failure', 'Equipment Failure', 'Pest Sighting', 'Customer Complaint'];
  const severities: ('Critical' | 'Major' | 'Minor')[] = ['Critical', 'Major', 'Minor'];
  const statuses = ['Verified', 'Resolved', 'In Progress', 'Assigned'];
  const locs = location ? [location] : LOCATIONS;
  const incidents: any[] = [];
  for (let i = 0; i < rnd(5, 8); i++) {
    const status = pick(statuses);
    const created = new Date(now - rnd(1, 28) * 86400000);
    const resolved = ['Verified', 'Resolved'].includes(status) ? new Date(created.getTime() + rnd(1, 48) * 3600000) : null;
    incidents.push({
      id: `INC-${String(i + 1).padStart(3, '0')}`,
      type: pick(types),
      severity: pick(severities),
      title: pick(['Walk-in cooler at 47°F', 'Closing checklist — floor drains', 'Hot hold not reaching 135°F', 'Prep cooler door seal worn']),
      location: pick(locs),
      status,
      assignedTo: pick(USERS),
      reportedBy: pick(USERS),
      createdAt: format(created, 'MMM d, yyyy h:mm a'),
      resolvedAt: resolved ? format(resolved, 'MMM d, yyyy h:mm a') : '—',
      resolutionTime: resolved ? `${Math.round((resolved.getTime() - created.getTime()) / 3600000)}h` : '—',
    });
  }
  return incidents;
}

function generateEquipmentRecords(location: string | null) {
  const locs = location ? [location] : LOCATIONS;
  const items: any[] = [];
  for (const loc of locs) {
    for (const eq of EQUIPMENT) {
      if (Math.random() > 0.6) continue;
      const lastService = new Date(now - rnd(10, 180) * 86400000);
      items.push({
        id: `EQ-${items.length + 1}`,
        name: eq.name,
        type: eq.type,
        location: loc,
        lastService: format(lastService, 'MMM d, yyyy'),
        condition: pick(['Good', 'Good', 'Good', 'Fair', 'Needs Attention']),
        warrantyStatus: pick(['Active', 'Active', 'Expired', 'Expiring']),
      });
    }
  }
  return items;
}

function generateVendorRecords(location: string | null) {
  const locs = location ? [location] : LOCATIONS;
  const records: any[] = [];
  for (const vs of VENDOR_SERVICES) {
    for (const loc of locs) {
      if (Math.random() > 0.7) continue;
      const lastService = new Date(now - rnd(5, 60) * 86400000);
      const certExpiry = new Date(now + rnd(-30, 365) * 86400000);
      const certStatus = certExpiry.getTime() < now ? 'Expired' : certExpiry.getTime() < now + 30 * 86400000 ? 'Expiring' : 'Current';
      records.push({
        id: `VS-${records.length + 1}`,
        vendor: vs.vendor,
        serviceType: vs.service,
        location: loc,
        lastService: format(lastService, 'MMM d, yyyy'),
        certName: vs.cert,
        certExpiry: format(certExpiry, 'MMM d, yyyy'),
        certStatus,
      });
    }
  }
  return records;
}

function generateDocuments(location: string | null) {
  const names = [
    'Food Service License', 'Health Permit', 'Fire Safety Certificate', 'General Liability Insurance',
    'Food Handler Certificate — Sarah Chen', 'Hood Cleaning Certificate', 'Fire Suppression Inspection',
    'Pest Control Service Log', 'Building Safety Inspection', 'ServSafe Manager Cert',
  ];
  const cats = ['License', 'Permit', 'Certification', 'Insurance', 'Training'];
  const locs = location ? [location] : LOCATIONS;
  const docs: any[] = [];
  for (const name of names) {
    const expiry = new Date(now + rnd(-60, 400) * 86400000);
    const status = expiry.getTime() < now ? 'Expired' : expiry.getTime() < now + 30 * 86400000 ? 'Expiring' : 'Current';
    docs.push({
      id: `DOC-${docs.length + 1}`,
      name,
      category: pick(cats),
      location: pick(locs),
      expirationDate: format(expiry, 'MMM d, yyyy'),
      status,
      uploadedBy: pick(USERS),
    });
  }
  return docs;
}

function generateComplianceScores(location: string | null) {
  const locs = location ? [location] : LOCATIONS;
  return locs.map(loc => ({
    location: loc,
    overall: rnd(72, 96),
    foodSafety: rnd(75, 98),
    fireSafety: rnd(68, 95),
    trend: pick(['up', 'stable', 'down'] as const),
    lastUpdated: format(new Date(now - rnd(0, 3) * 86400000), 'MMM d, yyyy'),
  }));
}

function generateAuditActivity(days: number) {
  const actions = [
    'Logged temperature reading', 'Completed checklist', 'Uploaded document',
    'Resolved incident', 'Generated report', 'Updated equipment record',
    'Added corrective action', 'Exported data', 'Modified role assignment',
  ];
  const devices = ['Chrome / Windows 11', 'Safari / iPhone 15', 'Chrome / Android', 'Firefox / macOS'];
  const entries: any[] = [];
  for (let i = 0; i < days * 6; i++) {
    const ts = new Date(now - rnd(0, days * 86400000));
    entries.push({
      id: `AA-${i + 1}`,
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

function generateCustodyChain(reportNumber: string, hash: string): CustodyEntry[] {
  const ts = new Date();
  return [
    {
      timestamp: format(new Date(ts.getTime() - 60000), 'MMM d, yyyy h:mm:ss a'),
      action: 'Data Collection',
      actor: 'System',
      detail: 'Compliance data aggregated from all enabled modules',
    },
    {
      timestamp: format(new Date(ts.getTime() - 30000), 'MMM d, yyyy h:mm:ss a'),
      action: 'Report Generation',
      actor: 'System',
      detail: `Report ${reportNumber} compiled with SHA-256 integrity hash`,
      hash: hash.substring(0, 16) + '...',
    },
    {
      timestamp: format(ts, 'MMM d, yyyy h:mm:ss a'),
      action: 'Report Certified',
      actor: 'Sarah Chen (Admin)',
      detail: 'Report certified and sealed for distribution',
      hash,
    },
  ];
}

// ── Color helpers ─────────────────────────────────────────────────

const sevColor = (s: string) => s === 'Critical' ? '#dc2626' : s === 'Major' ? '#d97706' : '#2563eb';
const sevBg = (s: string) => s === 'Critical' ? '#fef2f2' : s === 'Major' ? '#fffbeb' : '#eff6ff';
const statusColor = (s: string) => {
  if (['Current', 'Good', 'Verified', 'Resolved', 'Active'].includes(s)) return '#16a34a';
  if (['Expiring', 'Expiring Soon', 'Fair', 'In Progress', 'Assigned'].includes(s)) return '#d97706';
  if (['Expired', 'Needs Attention', 'Reported'].includes(s)) return '#dc2626';
  return '#16a34a';
};
const statusBg = (s: string) => {
  if (['Current', 'Good', 'Verified', 'Resolved', 'Active'].includes(s)) return '#f0fdf4';
  if (['Expiring', 'Expiring Soon', 'Fair', 'In Progress', 'Assigned'].includes(s)) return '#fffbeb';
  if (['Expired', 'Needs Attention', 'Reported'].includes(s)) return '#fef2f2';
  return '#f0fdf4';
};

// ── Component ─────────────────────────────────────────────────────

export function AuditTrail() {
  const reportRef = useRef<HTMLDivElement>(null);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  // Config state
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [generated, setGenerated] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [reportHash, setReportHash] = useState('');
  const [reportNumber, setReportNumber] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ReportHistoryEntry[]>(loadHistory);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<'match' | 'mismatch' | null>(null);

  // Module toggles
  const [modules, setModules] = useState<ModuleConfig[]>([
    { id: 'temp_logs', label: 'Temperature Logs', icon: Thermometer, enabled: true, description: 'All temperature readings with pass/fail status' },
    { id: 'checklists', label: 'Checklists', icon: CheckSquare, enabled: true, description: 'Daily checklist completions and scores' },
    { id: 'incidents', label: 'Incidents & CAPA', icon: AlertTriangle, enabled: true, description: 'Corrective actions, incidents, root causes' },
    { id: 'equipment', label: 'Equipment', icon: Wrench, enabled: true, description: 'Equipment condition, warranty, service history' },
    { id: 'vendors', label: 'Vendor Services', icon: Truck, enabled: true, description: 'Service records and certifications' },
    { id: 'documents', label: 'Documents', icon: FileText, enabled: true, description: 'Licenses, permits, certifications' },
    { id: 'compliance', label: 'Compliance Scores', icon: EvidlyIcon as any, enabled: true, description: 'Food safety and fire safety scores' },
    { id: 'audit_activity', label: 'Inspection Activity', icon: ClipboardList, enabled: true, description: 'User actions with timestamps and devices' },
    { id: 'photos', label: 'Photo Evidence', icon: Camera, enabled: false, description: 'Photographic documentation' },
    { id: 'training', label: 'Training Records', icon: GraduationCap, enabled: false, description: 'Staff certifications and course completions' },
  ]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const toggleExpand = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const days = dateRange === 'custom' ? 30 : parseInt(dateRange);
  const loc = locationFilter === 'all' ? null : locationFilter;
  const enabledModules = modules.filter(m => m.enabled).map(m => m.id);

  // Generate report data
  const reportData = useMemo(() => {
    if (!generated) return null;
    return {
      tempLogs: enabledModules.includes('temp_logs') ? generateTempLogs(days, loc) : [],
      checklists: enabledModules.includes('checklists') ? generateChecklists(days, loc) : [],
      incidents: enabledModules.includes('incidents') ? generateIncidents(loc) : [],
      equipment: enabledModules.includes('equipment') ? generateEquipmentRecords(loc) : [],
      vendors: enabledModules.includes('vendors') ? generateVendorRecords(loc) : [],
      documents: enabledModules.includes('documents') ? generateDocuments(loc) : [],
      complianceScores: enabledModules.includes('compliance') ? generateComplianceScores(loc) : [],
      auditActivity: enabledModules.includes('audit_activity') ? generateAuditActivity(days) : [],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated]);

  // Compute hash when report generates
  useEffect(() => {
    if (!reportData || !generated) return;
    const num = generateReportNumber();
    setReportNumber(num);
    computeSHA256(reportData).then(hash => {
      setReportHash(hash);
      // Save to history
      const entry: ReportHistoryEntry = {
        id: crypto.randomUUID(),
        reportNumber: num,
        generatedAt: new Date().toISOString(),
        hash,
        location: locationFilter,
        dateRange,
        modules: enabledModules,
        status: 'completed',
      };
      const updated = [entry, ...history].slice(0, 20);
      setHistory(updated);
      saveHistory(updated);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, reportData]);

  // Summary stats
  const summary = useMemo(() => {
    if (!reportData) return null;
    const totalTemps = reportData.tempLogs.length;
    const passTemps = reportData.tempLogs.filter((t: any) => t.pass).length;
    const totalChecklists = reportData.checklists.length;
    const avgScore = totalChecklists > 0
      ? Math.round(reportData.checklists.reduce((s: number, c: any) => s + c.score, 0) / totalChecklists) : 0;
    const openIncidents = reportData.incidents.filter((i: any) => !['Verified', 'Resolved'].includes(i.status)).length;
    const resolvedIncidents = reportData.incidents.filter((i: any) => ['Verified', 'Resolved'].includes(i.status)).length;
    const currentDocs = reportData.documents.filter((d: any) => d.status === 'Current').length;
    const expiringDocs = reportData.documents.filter((d: any) => d.status === 'Expiring').length;
    const expiredDocs = reportData.documents.filter((d: any) => d.status === 'Expired').length;
    const complianceScore = totalTemps > 0
      ? Math.round((passTemps / totalTemps) * 55 + (avgScore / 100) * 45)
      : 85;
    return {
      complianceScore,
      totalTemps, passTemps, tempPassRate: totalTemps > 0 ? Math.round((passTemps / totalTemps) * 100) : 0,
      totalChecklists, avgScore,
      openIncidents, resolvedIncidents, totalIncidents: reportData.incidents.length,
      currentDocs, expiringDocs, expiredDocs, totalDocs: reportData.documents.length,
      totalEquipment: reportData.equipment.length,
      totalVendors: reportData.vendors.length,
      totalAuditEntries: reportData.auditActivity.length,
    };
  }, [reportData]);

  const generatedAt = format(new Date(), 'MMMM d, yyyy \'at\' h:mm a');
  const dateRangeLabel = `${format(subDays(new Date(), days), 'MMM d, yyyy')} — ${format(new Date(), 'MMM d, yyyy')}`;

  // Chain of custody entries
  const custodyChain = useMemo(() => {
    if (!generated || !reportHash) return [];
    return generateCustodyChain(reportNumber, reportHash);
  }, [generated, reportHash, reportNumber]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleGenerate = () => {
    if (enabledModules.length === 0) {
      toast.error('Select at least one module');
      return;
    }
    setGenerated(true);
    setVerifyResult(null);
    // Expand all enabled sections
    const expanded: Record<string, boolean> = {};
    enabledModules.forEach(m => { expanded[m] = true; });
    expanded['chain_of_custody'] = true;
    setExpandedSections(expanded);
  };

  const handleBack = () => {
    setGenerated(false);
    setReportHash('');
    setReportNumber('');
    setVerifyResult(null);
  };

  const handleDownloadPDF = async () => {
    guardAction('download', 'audit trail reports', async () => {
      if (!reportRef.current) return;
      setPdfLoading(true);
      try {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDFModule = await import('jspdf');
        const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;

        const canvas = await html2canvas(reportRef.current, {
          scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
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
          pdf.text('EvidLY — Chain of Custody Inspection Trail', margin, 6.5);
          pdf.setTextColor(212, 175, 55);
          pdf.text(reportNumber, pageW - margin, 6.5, { align: 'right' });
          pdf.setFontSize(6);
          pdf.setTextColor(160, 160, 160);
          pdf.text(`SHA-256: ${reportHash.substring(0, 24)}...`, margin, pageH - 3);
          pdf.text(`Page ${i} of ${total}`, pageW - margin, pageH - 3, { align: 'right' });
        }

        pdf.save(`EvidLY-AuditTrail-${reportNumber}.pdf`);
        toast.success('PDF downloaded successfully');
      } catch {
        toast.error('PDF generation failed');
      } finally {
        setPdfLoading(false);
      }
    });
  };

  const handleShareLink = useCallback(() => {
    guardAction('share', 'audit trail reports', () => {
      const token = crypto.randomUUID();
      const expiry = new Date(Date.now() + 72 * 3600000);
      const link = `${window.location.origin}/audit-trail/shared/${token}`;

      // Update history entry
      setHistory(prev => {
        const updated = prev.map(h =>
          h.reportNumber === reportNumber
            ? { ...h, status: 'shared' as const, shareToken: token, shareExpiry: expiry.toISOString() }
            : h
        );
        saveHistory(updated);
        return updated;
      });

      navigator.clipboard.writeText(link).then(() => {
        toast.success(`Share link copied — expires ${format(expiry, 'MMM d, yyyy h:mm a')}`);
      });
    });
  }, [guardAction, reportNumber]);

  const handleVerifyHash = useCallback(async () => {
    if (!reportData) return;
    setVerifying(true);
    await new Promise(r => setTimeout(r, 1500));
    const freshHash = await computeSHA256(reportData);
    setVerifyResult(freshHash === reportHash ? 'match' : 'mismatch');
    setVerifying(false);
    toast.success(freshHash === reportHash ? 'Integrity verified — report is untampered' : 'Hash mismatch — report may have been modified');
  }, [reportData, reportHash]);

  const handlePrint = () => {
    guardAction('print', 'audit trail reports', () => { window.print(); });
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      saveHistory(updated);
      return updated;
    });
    toast.success('Report removed from history');
  };

  // ── Table styles ───────────────────────────────────────────────

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

  const moduleEnabled = (id: string) => enabledModules.includes(id);

  // ── Section renderer helper ────────────────────────────────────

  const SectionHeader = ({ id, icon: Icon, title, count }: { id: string; icon: typeof FileText; title: string; count?: number }) => (
    <button
      onClick={() => toggleExpand(id)}
      className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: '#1e4d6b' }} />
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">{count}</span>
        )}
      </div>
      {expandedSections[id] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────

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
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      <div className="no-print">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reporting', href: '/reports' }, { label: 'Inspection Trail' }]} />
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inspection Trail & Chain of Custody</h1>
            <p className="text-sm text-gray-600 mt-1">Generate tamper-evident compliance reports with full evidence chain</p>
          </div>
          {!generated && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <History className="h-4 w-4" />
              Report History ({history.length})
            </button>
          )}
        </div>

        {/* Report History Panel */}
        {showHistory && !generated && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 no-print">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <History className="h-5 w-5" style={{ color: '#1e4d6b' }} />
              Report History
            </h2>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No reports generated yet</p>
            ) : (
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold" style={{ color: '#1e4d6b' }}>{h.reportNumber}</span>
                        <span style={badge(
                          h.status === 'shared' ? 'Shared' : h.status === 'expired' ? 'Expired' : 'Completed',
                          h.status === 'shared' ? '#2563eb' : h.status === 'expired' ? '#dc2626' : '#16a34a',
                          h.status === 'shared' ? '#eff6ff' : h.status === 'expired' ? '#fef2f2' : '#f0fdf4',
                        )}>{h.status === 'shared' ? 'Shared' : h.status === 'expired' ? 'Expired' : 'Completed'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(h.generatedAt), 'MMM d, yyyy h:mm a')}</span>
                        <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{h.hash.substring(0, 12)}...</span>
                        <span>{h.modules.length} modules</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {h.shareToken && h.shareExpiry && new Date(h.shareExpiry) > new Date() && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/audit-trail/shared/${h.shareToken}`);
                            toast.success('Link copied');
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                          title="Copy share link"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteHistory(h.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Configuration Panel */}
        {!generated && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-6 no-print">
            <h2 className="text-lg font-bold text-gray-900">Report Configuration</h2>

            {/* Date + Location row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Module selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modules to Include</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {modules.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleModule(m.id)}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        m.enabled ? 'border-[#1e4d6b] bg-blue-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${m.enabled ? 'text-[#1e4d6b]' : 'text-gray-400'}`} />
                      <div>
                        <span className={`text-sm font-medium ${m.enabled ? 'text-[#1e4d6b]' : 'text-gray-400'}`}>{m.label}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tamper-evident info */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
              <Lock className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#1e4d6b' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#1e4d6b' }}>Tamper-Evident Report</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Each report receives a SHA-256 cryptographic hash computed from all included data.
                  Any modification to the report content will produce a different hash, ensuring integrity.
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              className="w-full md:w-auto px-8 py-3 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg font-bold text-lg hover:bg-[#163a52] shadow-sm transition-colors"
            >
              Generate Inspection Trail Report
            </button>
          </div>
        )}

        {/* Generated Report */}
        {generated && reportData && summary && (
          <>
            {/* Action bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-center justify-between no-print">
              <button onClick={handleBack} className="flex items-center gap-1 text-sm text-[#1e4d6b] hover:underline font-medium">
                ← Back to Configuration
              </button>
              <div className="flex gap-2 flex-wrap">
                <button onClick={handleVerifyHash} disabled={verifying} className="flex items-center gap-2 px-4 py-2 min-h-[44px] border-2 border-green-600 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 disabled:opacity-60">
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <EvidlyIcon size={16} />}
                  {verifying ? 'Verifying...' : 'Verify Integrity'}
                </button>
                <button onClick={handleDownloadPDF} disabled={pdfLoading} className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium disabled:opacity-60">
                  {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {pdfLoading ? 'Generating...' : 'Download PDF'}
                </button>
                <button onClick={handleShareLink} className="flex items-center gap-2 px-4 py-2 min-h-[44px] border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Share2 className="h-4 w-4" /> Share (72h)
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 min-h-[44px] border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>

            {/* Verify result banner */}
            {verifyResult && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl no-print ${verifyResult === 'match' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {verifyResult === 'match' ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${verifyResult === 'match' ? 'text-green-800' : 'text-red-800'}`}>
                    {verifyResult === 'match' ? 'Integrity Verified' : 'Integrity Check Failed'}
                  </p>
                  <p className={`text-xs ${verifyResult === 'match' ? 'text-green-600' : 'text-red-600'}`}>
                    {verifyResult === 'match'
                      ? 'SHA-256 hash matches — this report has not been tampered with.'
                      : 'SHA-256 hash does not match — this report may have been modified.'}
                  </p>
                </div>
              </div>
            )}

            {/* Printable Report */}
            <div ref={reportRef} className="print-report space-y-6">
              {/* Report Header */}
              <div className="bg-[#1e4d6b] rounded-xl p-4 sm:p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <EvidlyIcon size={32} />
                  <div>
                    <h2 className="text-xl font-bold">Chain of Custody Inspection Trail</h2>
                    <p className="text-blue-200 text-sm">Demo Restaurant Group — EvidLY Compliance Platform</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-blue-200 uppercase tracking-wide">Report ID</p>
                    <p className="font-mono font-bold text-sm">{reportNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-200 uppercase tracking-wide">Generated</p>
                    <p className="text-sm font-medium">{generatedAt}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-200 uppercase tracking-wide">Period</p>
                    <p className="text-sm font-medium">{dateRangeLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-200 uppercase tracking-wide">Location</p>
                    <p className="text-sm font-medium">{locationFilter === 'all' ? 'All Locations' : locationFilter}</p>
                  </div>
                </div>

                {/* Hash badge */}
                <div className="mt-4 px-3 py-2 rounded-lg bg-white/10 border border-white/20">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-[#d4af37]" />
                    <span className="text-xs text-blue-200 uppercase tracking-wide">SHA-256 Integrity Hash</span>
                  </div>
                  <p className="font-mono text-xs mt-1 break-all text-blue-100">{reportHash || 'Computing...'}</p>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 report-section">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                  Executive Summary
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {summary.totalTemps > 0 && (
                    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#eef4f8' }}>
                      <p className="text-2xl font-bold" style={{ color: summary.tempPassRate >= 95 ? '#16a34a' : summary.tempPassRate >= 85 ? '#d97706' : '#dc2626' }}>
                        {summary.tempPassRate}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Temp Pass Rate</p>
                      <p className="text-xs text-gray-400">{summary.totalTemps} readings</p>
                    </div>
                  )}
                  {summary.totalChecklists > 0 && (
                    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#eef4f8' }}>
                      <p className="text-2xl font-bold" style={{ color: summary.avgScore >= 90 ? '#16a34a' : summary.avgScore >= 75 ? '#d97706' : '#dc2626' }}>
                        {summary.avgScore}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Checklist Avg</p>
                      <p className="text-xs text-gray-400">{summary.totalChecklists} completed</p>
                    </div>
                  )}
                  {summary.totalIncidents > 0 && (
                    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#eef4f8' }}>
                      <p className="text-2xl font-bold" style={{ color: summary.openIncidents === 0 ? '#16a34a' : '#d97706' }}>
                        {summary.resolvedIncidents}/{summary.totalIncidents}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Resolved</p>
                      <p className="text-xs text-gray-400">{summary.openIncidents} open</p>
                    </div>
                  )}
                  {summary.totalDocs > 0 && (
                    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#eef4f8' }}>
                      <p className="text-2xl font-bold" style={{ color: summary.expiredDocs === 0 ? '#16a34a' : '#dc2626' }}>
                        {summary.currentDocs}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Docs Current</p>
                      <p className="text-xs text-gray-400">{summary.expiredDocs} expired</p>
                    </div>
                  )}
                  {summary.totalEquipment > 0 && (
                    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#eef4f8' }}>
                      <p className="text-2xl font-bold" style={{ color: '#1e4d6b' }}>{summary.totalEquipment}</p>
                      <p className="text-xs text-gray-500 mt-1">Equipment</p>
                      <p className="text-xs text-gray-400">tracked</p>
                    </div>
                  )}
                  {summary.totalVendors > 0 && (
                    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#eef4f8' }}>
                      <p className="text-2xl font-bold" style={{ color: '#1e4d6b' }}>{summary.totalVendors}</p>
                      <p className="text-xs text-gray-500 mt-1">Vendor Records</p>
                      <p className="text-xs text-gray-400">in period</p>
                    </div>
                  )}
                </div>

                {/* Compliance scores */}
                {reportData.complianceScores.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {reportData.complianceScores.map((cs: any) => (
                      <div key={cs.location} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: getScoreColor(cs.overall) }}>
                          {cs.overall}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{cs.location}</p>
                          <div className="flex gap-2 text-xs text-gray-500">
                            <span>Food: {cs.foodSafety}</span>
                            <span>Fire: {cs.fireSafety}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Temperature Logs */}
              {moduleEnabled('temp_logs') && reportData.tempLogs.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden report-section">
                  <SectionHeader id="temp_logs" icon={Thermometer} title="Temperature Logs" count={reportData.tempLogs.length} />
                  {expandedSections['temp_logs'] && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Date/Time</th>
                            <th style={thStyle}>Location</th>
                            <th style={thStyle}>Equipment</th>
                            <th style={thStyle}>Reading</th>
                            <th style={thStyle}>Range</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Recorded By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.tempLogs.slice(0, 50).map((t: any) => (
                            <tr key={t.id}>
                              <td style={tdStyle} className="font-mono text-xs">{t.id}</td>
                              <td style={tdStyle}>{t.date} {t.time}</td>
                              <td style={tdStyle}>{t.location}</td>
                              <td style={tdStyle}>{t.equipment}</td>
                              <td style={tdStyle} className="font-mono font-medium">{t.reading}°F</td>
                              <td style={tdStyle} className="text-xs text-gray-500">{t.range}</td>
                              <td style={tdStyle}>
                                <span style={badge(t.pass ? 'Pass' : 'Fail', t.pass ? '#16a34a' : '#dc2626', t.pass ? '#f0fdf4' : '#fef2f2')}>
                                  {t.pass ? 'Pass' : 'Fail'}
                                </span>
                              </td>
                              <td style={tdStyle}>{t.user}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {reportData.tempLogs.length > 50 && (
                        <p className="text-xs text-gray-400 text-center py-2">Showing 50 of {reportData.tempLogs.length} records</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Checklists */}
              {moduleEnabled('checklists') && reportData.checklists.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden report-section">
                  <SectionHeader id="checklists" icon={CheckSquare} title="Checklist Completions" count={reportData.checklists.length} />
                  {expandedSections['checklists'] && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Date/Time</th>
                            <th style={thStyle}>Location</th>
                            <th style={thStyle}>Checklist</th>
                            <th style={thStyle}>Items</th>
                            <th style={thStyle}>Score</th>
                            <th style={thStyle}>Completed By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.checklists.slice(0, 50).map((c: any) => (
                            <tr key={c.id}>
                              <td style={tdStyle} className="font-mono text-xs">{c.id}</td>
                              <td style={tdStyle}>{c.date} {c.time}</td>
                              <td style={tdStyle}>{c.location}</td>
                              <td style={tdStyle}>{c.name}</td>
                              <td style={tdStyle}>{c.passed}/{c.totalItems}</td>
                              <td style={tdStyle}>
                                <span style={badge(`${c.score}%`, c.score >= 90 ? '#16a34a' : c.score >= 75 ? '#d97706' : '#dc2626', c.score >= 90 ? '#f0fdf4' : c.score >= 75 ? '#fffbeb' : '#fef2f2')}>
                                  {c.score}%
                                </span>
                              </td>
                              <td style={tdStyle}>{c.completedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {reportData.checklists.length > 50 && (
                        <p className="text-xs text-gray-400 text-center py-2">Showing 50 of {reportData.checklists.length} records</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Incidents */}
              {moduleEnabled('incidents') && reportData.incidents.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden report-section">
                  <SectionHeader id="incidents" icon={AlertTriangle} title="Incidents & Corrective Actions" count={reportData.incidents.length} />
                  {expandedSections['incidents'] && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Severity</th>
                            <th style={thStyle}>Type</th>
                            <th style={thStyle}>Description</th>
                            <th style={thStyle}>Location</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Created</th>
                            <th style={thStyle}>Resolution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.incidents.map((inc: any) => (
                            <tr key={inc.id}>
                              <td style={tdStyle} className="font-mono text-xs">{inc.id}</td>
                              <td style={tdStyle}><span style={badge(inc.severity, sevColor(inc.severity), sevBg(inc.severity))}>{inc.severity}</span></td>
                              <td style={tdStyle}>{inc.type}</td>
                              <td style={tdStyle} className="max-w-[200px] truncate">{inc.title}</td>
                              <td style={tdStyle}>{inc.location}</td>
                              <td style={tdStyle}><span style={badge(inc.status, statusColor(inc.status), statusBg(inc.status))}>{inc.status}</span></td>
                              <td style={tdStyle}>{inc.createdAt}</td>
                              <td style={tdStyle}>{inc.resolutionTime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Equipment */}
              {moduleEnabled('equipment') && reportData.equipment.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden report-section">
                  <SectionHeader id="equipment" icon={Wrench} title="Equipment Status" count={reportData.equipment.length} />
                  {expandedSections['equipment'] && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Equipment</th>
                            <th style={thStyle}>Type</th>
                            <th style={thStyle}>Location</th>
                            <th style={thStyle}>Condition</th>
                            <th style={thStyle}>Warranty</th>
                            <th style={thStyle}>Last Service</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.equipment.map((eq: any) => (
                            <tr key={eq.id}>
                              <td style={tdStyle} className="font-mono text-xs">{eq.id}</td>
                              <td style={tdStyle}>{eq.name}</td>
                              <td style={tdStyle}>{eq.type}</td>
                              <td style={tdStyle}>{eq.location}</td>
                              <td style={tdStyle}><span style={badge(eq.condition, statusColor(eq.condition), statusBg(eq.condition))}>{eq.condition}</span></td>
                              <td style={tdStyle}><span style={badge(eq.warrantyStatus, statusColor(eq.warrantyStatus), statusBg(eq.warrantyStatus))}>{eq.warrantyStatus}</span></td>
                              <td style={tdStyle}>{eq.lastService}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Vendor Services */}
              {moduleEnabled('vendors') && reportData.vendors.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden report-section">
                  <SectionHeader id="vendors" icon={Truck} title="Vendor Service Records" count={reportData.vendors.length} />
                  {expandedSections['vendors'] && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Vendor</th>
                            <th style={thStyle}>Service</th>
                            <th style={thStyle}>Location</th>
                            <th style={thStyle}>Last Service</th>
                            <th style={thStyle}>Cert Status</th>
                            <th style={thStyle}>Cert Expiry</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.vendors.map((v: any) => (
                            <tr key={v.id}>
                              <td style={tdStyle} className="font-mono text-xs">{v.id}</td>
                              <td style={tdStyle}>{v.vendor}</td>
                              <td style={tdStyle}>{v.serviceType}</td>
                              <td style={tdStyle}>{v.location}</td>
                              <td style={tdStyle}>{v.lastService}</td>
                              <td style={tdStyle}><span style={badge(v.certStatus, statusColor(v.certStatus), statusBg(v.certStatus))}>{v.certStatus}</span></td>
                              <td style={tdStyle}>{v.certExpiry}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Documents */}
              {moduleEnabled('documents') && reportData.documents.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden report-section">
                  <SectionHeader id="documents" icon={FileText} title="Document Registry" count={reportData.documents.length} />
                  {expandedSections['documents'] && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Document</th>
                            <th style={thStyle}>Category</th>
                            <th style={thStyle}>Location</th>
                            <th style={thStyle}>Expiration</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Uploaded By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.documents.map((d: any) => (
                            <tr key={d.id}>
                              <td style={tdStyle} className="font-mono text-xs">{d.id}</td>
                              <td style={tdStyle}>{d.name}</td>
                              <td style={tdStyle}>{d.category}</td>
                              <td style={tdStyle}>{d.location}</td>
                              <td style={tdStyle}>{d.expirationDate}</td>
                              <td style={tdStyle}><span style={badge(d.status, statusColor(d.status), statusBg(d.status))}>{d.status}</span></td>
                              <td style={tdStyle}>{d.uploadedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Compliance Scores */}
              {moduleEnabled('compliance') && reportData.complianceScores.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden report-section">
                  <SectionHeader id="compliance" icon={EvidlyIcon as any} title="Compliance Scores" count={reportData.complianceScores.length} />
                  {expandedSections['compliance'] && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={thStyle}>Location</th>
                            <th style={thStyle}>Overall</th>
                            <th style={thStyle}>Food Safety</th>
                            <th style={thStyle}>Fire Safety</th>
                            <th style={thStyle}>Trend</th>
                            <th style={thStyle}>Last Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.complianceScores.map((cs: any) => (
                            <tr key={cs.location}>
                              <td style={tdStyle} className="font-semibold">{cs.location}</td>
                              <td style={tdStyle}>
                                <span className="font-bold" style={{ color: getScoreColor(cs.overall) }}>{cs.overall}</span>
                              </td>
                              <td style={tdStyle}><span className="font-medium" style={{ color: getScoreColor(cs.foodSafety) }}>{cs.foodSafety}</span></td>
                              <td style={tdStyle}><span className="font-medium" style={{ color: getScoreColor(cs.fireSafety) }}>{cs.fireSafety}</span></td>
                              <td style={tdStyle}>
                                <span style={badge(
                                  cs.trend === 'up' ? '↑ Up' : cs.trend === 'down' ? '↓ Down' : '→ Stable',
                                  cs.trend === 'up' ? '#16a34a' : cs.trend === 'down' ? '#dc2626' : '#d97706',
                                  cs.trend === 'up' ? '#f0fdf4' : cs.trend === 'down' ? '#fef2f2' : '#fffbeb',
                                )}>
                                  {cs.trend === 'up' ? '↑ Up' : cs.trend === 'down' ? '↓ Down' : '→ Stable'}
                                </span>
                              </td>
                              <td style={tdStyle}>{cs.lastUpdated}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Audit Activity */}
              {moduleEnabled('audit_activity') && reportData.auditActivity.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden report-section">
                  <SectionHeader id="audit_activity" icon={ClipboardList} title="Inspection Activity Log" count={reportData.auditActivity.length} />
                  {expandedSections['audit_activity'] && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Timestamp</th>
                            <th style={thStyle}>User</th>
                            <th style={thStyle}>Action</th>
                            <th style={thStyle}>Device</th>
                            <th style={thStyle}>IP Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.auditActivity.slice(0, 50).map((a: any) => (
                            <tr key={a.id}>
                              <td style={tdStyle} className="font-mono text-xs">{a.id}</td>
                              <td style={tdStyle}>{a.timestamp}</td>
                              <td style={tdStyle}>{a.user}</td>
                              <td style={tdStyle}>{a.action}</td>
                              <td style={tdStyle} className="text-xs">{a.device}</td>
                              <td style={tdStyle} className="font-mono text-xs">{a.ip}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {reportData.auditActivity.length > 50 && (
                        <p className="text-xs text-gray-400 text-center py-2">Showing 50 of {reportData.auditActivity.length} entries</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Chain of Custody Certification */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden report-section">
                <SectionHeader id="chain_of_custody" icon={Lock} title="Chain of Custody Certification" />
                {expandedSections['chain_of_custody'] && (
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Timeline */}
                    <div className="relative">
                      {custodyChain.map((entry, i) => (
                        <div key={i} className="flex gap-4 pb-6 last:pb-0">
                          {/* Timeline line */}
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-[#1e4d6b] flex-shrink-0 mt-1.5" />
                            {i < custodyChain.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{entry.action}</span>
                              <span className="text-xs text-gray-400">{entry.timestamp}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">{entry.detail}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Actor: {entry.actor}</p>
                            {entry.hash && (
                              <p className="font-mono text-xs text-gray-400 mt-1 break-all">Hash: {entry.hash}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Certification statement */}
                    <div className="mt-6 p-4 rounded-lg border-2 border-[#1e4d6b] bg-[#eef4f8]">
                      <div className="flex items-start gap-3">
                        <EvidlyIcon size={24} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold" style={{ color: '#1e4d6b' }}>Chain of Custody Certification</h4>
                          <p className="text-sm text-gray-700 mt-1">
                            I hereby certify that this report ({reportNumber}) accurately represents the compliance data
                            collected by the EvidLY platform during the period {dateRangeLabel}. All data points were
                            automatically logged at the time of occurrence. The SHA-256 hash below serves as a
                            tamper-evident seal — any modification to the report content will produce a different hash.
                          </p>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Certifying Officer</p>
                              <p className="text-sm font-medium text-gray-900">Sarah Chen, Operations Manager</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Date & Time</p>
                              <p className="text-sm font-medium text-gray-900">{generatedAt}</p>
                            </div>
                          </div>
                          <div className="mt-3 p-2 rounded bg-white border border-gray-200">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">SHA-256 Integrity Hash</p>
                            <p className="font-mono text-xs text-gray-700 break-all">{reportHash}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-xs text-gray-400 italic">
                      This report is generated for compliance documentation purposes. It is not a substitute for
                      professional legal advice. Data accuracy depends on timely and accurate input by authorized users.
                      Report integrity can be verified by re-computing the SHA-256 hash of the report data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <DemoUpgradePrompt
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        action={upgradeAction}
        feature={upgradeFeature}
      />
    </>
  );
}
