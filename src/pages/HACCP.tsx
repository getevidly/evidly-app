import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, Thermometer, Shield, Activity, ChevronRight, XCircle, MapPin, Loader2, ChevronDown, FileText, Plus, Trash2, Save, Download, Wifi, Pencil } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useRole } from '../contexts/RoleContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────

interface HACCPPlan {
  id: string;
  name: string;
  description: string;
  ccps: CriticalControlPoint[];
  lastReviewed: string;
  status: 'active' | 'needs_review';
}

interface CriticalControlPoint {
  id: string;
  ccpNumber: string;
  hazard: string;
  criticalLimit: string;
  monitoringProcedure: string;
  correctiveAction: string;
  verification: string;
  // Roll-up from temp logs / checklists
  lastReading?: string;
  lastReadingValue?: number;
  lastReadingUnit?: string;
  isWithinLimit: boolean;
  lastMonitoredAt: string;
  lastMonitoredBy: string;
  source: 'temp_log' | 'checklist' | 'iot_sensor';
  equipmentName?: string;
  sensorName?: string;
  locationId: string; // '1'=Downtown, '2'=Airport, '3'=University
}

interface CorrectiveActionRecord {
  id: string;
  planName: string;
  ccpNumber: string;
  ccpHazard: string;
  deviation: string;
  criticalLimit: string;
  recordedValue: string;
  actionTaken: string;
  actionBy: string;
  verifiedBy: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  resolvedAt: string | null;
  source: string;
  locationId: string;
}

// ── Helper ─────────────────────────────────────────────────────────

const now = new Date();

const getRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// ── Demo Data (references same equipment/staff from TempLogs) ──────

const HACCP_PLANS: HACCPPlan[] = [
  {
    id: 'cooking',
    name: 'Cooking Process',
    description: 'Cooking of meat, poultry, and seafood to safe internal temperatures',
    lastReviewed: '2026-02-15',
    status: 'active',
    ccps: [
      {
        id: 'cook-1',
        ccpNumber: 'CCP-1',
        hazard: 'Bacterial survival (Salmonella, E. coli)',
        criticalLimit: 'Internal temp: Poultry ≥165°F, Ground meat ≥155°F, Whole meat ≥145°F',
        monitoringProcedure: 'Check internal temperature with calibrated thermometer for each batch',
        correctiveAction: 'Continue cooking until proper temperature reached. Discard if held in danger zone >4 hrs.',
        verification: 'Supervisor review of cooking logs daily. Thermometer calibration weekly.',
        lastReading: '168°F (Chicken breast)',
        lastReadingValue: 168,
        lastReadingUnit: '°F',
        isWithinLimit: true,
        lastMonitoredAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
        lastMonitoredBy: 'Mike Johnson',
        source: 'checklist',
        locationId: '1',
      },
      {
        id: 'cook-2',
        ccpNumber: 'CCP-2',
        hazard: 'Cross-contamination during prep',
        criticalLimit: 'Separate cutting boards/utensils for raw and ready-to-eat foods',
        monitoringProcedure: 'Visual inspection of color-coded equipment use every 2 hours',
        correctiveAction: 'Retrain staff. Sanitize equipment. Discard contaminated food.',
        verification: 'Manager spot checks during service',
        lastReading: 'Pass — color-coded boards in use',
        isWithinLimit: true,
        lastMonitoredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        lastMonitoredBy: 'Sarah Chen',
        source: 'checklist',
        locationId: '2',
      },
    ],
  },
  {
    id: 'cold-storage',
    name: 'Cold Storage Management',
    description: 'Refrigeration and freezer storage temperature control',
    lastReviewed: '2026-02-15',
    status: 'active',
    ccps: [
      {
        id: 'cold-1',
        ccpNumber: 'CCP-3',
        hazard: 'Bacterial growth in refrigerated foods',
        criticalLimit: 'Refrigerator temperature: 32–41°F',
        monitoringProcedure: 'Check and log temperature at opening, mid-shift, and closing',
        correctiveAction: 'Adjust thermostat. Transfer food to working unit. Call for repair.',
        verification: 'Manager reviews temperature logs daily',
        lastReading: '37.2°F',
        lastReadingValue: 37.2,
        lastReadingUnit: '°F',
        isWithinLimit: true,
        lastMonitoredAt: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
        lastMonitoredBy: 'IoT Sensor',
        source: 'iot_sensor',
        equipmentName: 'Walk-in Cooler',
        sensorName: 'TempStick WC-01',
        locationId: '1',
      },
      {
        id: 'cold-2',
        ccpNumber: 'CCP-4',
        hazard: 'Bacterial growth in frozen foods',
        criticalLimit: 'Freezer temperature: -10 to 0°F',
        monitoringProcedure: 'Check and log temperature at opening and closing',
        correctiveAction: 'Adjust thermostat. Transfer food to working freezer. Call for repair.',
        verification: 'Manager reviews temperature logs daily',
        lastReading: '-3.1°F',
        lastReadingValue: -3.1,
        lastReadingUnit: '°F',
        isWithinLimit: true,
        lastMonitoredAt: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
        lastMonitoredBy: 'IoT Sensor',
        source: 'iot_sensor',
        equipmentName: 'Walk-in Freezer',
        sensorName: 'TempStick WF-01',
        locationId: '1',
      },
    ],
  },
  {
    id: 'hot-holding',
    name: 'Hot Holding',
    description: 'Maintaining hot foods at safe temperatures during service',
    lastReviewed: '2026-02-10',
    status: 'needs_review',
    ccps: [
      {
        id: 'hot-1',
        ccpNumber: 'CCP-5',
        hazard: 'Bacterial growth from time-temperature abuse',
        criticalLimit: 'Hot foods held at ≥135°F',
        monitoringProcedure: 'Check holding temperatures every 2 hours with calibrated thermometer',
        correctiveAction: 'Reheat to 165°F if below 135°F for <2 hrs. Discard if >2 hrs in danger zone.',
        verification: 'Review holding logs daily. Spot checks by supervisor.',
        lastReading: '127°F',
        lastReadingValue: 127,
        lastReadingUnit: '°F',
        isWithinLimit: false,
        lastMonitoredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        lastMonitoredBy: 'Sarah Chen',
        source: 'temp_log',
        equipmentName: 'Hot Hold Cabinet',
        locationId: '2',
      },
    ],
  },
  {
    id: 'receiving',
    name: 'Receiving Inspection',
    description: 'Verifying food safety at point of delivery',
    lastReviewed: '2026-02-15',
    status: 'active',
    ccps: [
      {
        id: 'recv-1',
        ccpNumber: 'CCP-6',
        hazard: 'Contaminated or temperature-abused deliveries',
        criticalLimit: 'Refrigerated items ≤41°F, Frozen items ≤0°F at delivery',
        monitoringProcedure: 'Temperature check all TCS items on receipt. Visual inspection of packaging.',
        correctiveAction: 'Reject delivery if temp exceeds limits. Document and notify vendor.',
        verification: 'Manager reviews receiving logs. Cross-check with purchase orders.',
        lastReading: '36°F (Dairy delivery)',
        lastReadingValue: 36,
        lastReadingUnit: '°F',
        isWithinLimit: true,
        lastMonitoredAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        lastMonitoredBy: 'Emma Davis',
        source: 'checklist',
        locationId: '1',
      },
    ],
  },
  {
    id: 'cooling',
    name: 'Cooling Process',
    description: 'Two-stage cooling of cooked foods',
    lastReviewed: '2026-02-12',
    status: 'active',
    ccps: [
      {
        id: 'cool-1',
        ccpNumber: 'CCP-7',
        hazard: 'Bacterial growth during slow cooling',
        criticalLimit: '135°F to 70°F within 2 hours, then 70°F to 41°F within 4 hours',
        monitoringProcedure: 'Log temperature at start, 2-hour mark, and 6-hour mark',
        correctiveAction: 'Use rapid cooling methods (ice bath, blast chiller). Discard if limits not met.',
        verification: 'Review cooling logs daily. Verify cooling equipment function weekly.',
        lastReading: '68°F at 1.5 hrs (Soup batch)',
        lastReadingValue: 68,
        lastReadingUnit: '°F',
        isWithinLimit: true,
        lastMonitoredAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        lastMonitoredBy: 'Mike Johnson',
        source: 'temp_log',
        locationId: '1',
      },
    ],
  },
  {
    id: 'cross-contamination',
    name: 'Cross-Contamination Prevention',
    description: 'Preventing cross-contamination between raw and ready-to-eat foods',
    lastReviewed: '2026-02-15',
    status: 'active',
    ccps: [
      {
        id: 'xc-1',
        ccpNumber: 'CCP-8',
        hazard: 'Pathogen transfer between raw and RTE foods',
        criticalLimit: 'Color-coded equipment enforced. No shared surfaces without sanitizing.',
        monitoringProcedure: 'Visual inspection every 2 hours during prep and service',
        correctiveAction: 'Stop production. Sanitize area. Discard affected RTE foods. Retrain staff.',
        verification: 'Supervisor spot checks. Monthly staff competency assessment.',
        lastReading: 'Pass — all protocols followed',
        isWithinLimit: true,
        lastMonitoredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        lastMonitoredBy: 'Sarah Chen',
        source: 'checklist',
        locationId: '2',
      },
    ],
  },
];

// Location ID mapping: '1'=Downtown, '2'=Airport, '3'=University
const LOCATION_ID_MAP: Record<string, string> = { 'downtown': '1', 'airport': '2', 'university': '3' };

// Auto-generated corrective actions from out-of-range readings
const CORRECTIVE_ACTIONS: CorrectiveActionRecord[] = [
  {
    id: 'ca-1',
    planName: 'Hot Holding',
    ccpNumber: 'CCP-5',
    ccpHazard: 'Bacterial growth from time-temperature abuse',
    deviation: 'Hot Hold Cabinet reading 127°F — below critical limit of 135°F',
    criticalLimit: '≥135°F',
    recordedValue: '127°F',
    actionTaken: 'Food reheated to 165°F within 30 minutes. Hot hold cabinet thermostat adjusted. Maintenance notified for inspection.',
    actionBy: 'Sarah Chen',
    verifiedBy: null,
    status: 'in_progress',
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
    source: 'Temperature Log — Hot Hold Cabinet',
    locationId: '2',
  },
  {
    id: 'ca-2',
    planName: 'Cold Storage Management',
    ccpNumber: 'CCP-3',
    ccpHazard: 'Bacterial growth in refrigerated foods',
    deviation: 'Walk-in Cooler reached 44°F during morning check — above critical limit of 41°F',
    criticalLimit: '32–41°F',
    recordedValue: '44°F',
    actionTaken: 'Thermostat adjusted to lower setting. Door seal inspected — found slight gap, gasket replaced. Temperature returned to 38°F within 45 minutes. All food items inspected and deemed safe (exposure <1 hr).',
    actionBy: 'Mike Johnson',
    verifiedBy: 'Emma Davis (Kitchen Manager)',
    status: 'resolved',
    createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(),
    source: 'Temperature Log — Walk-in Cooler',
    locationId: '1',
  },
  {
    id: 'ca-3',
    planName: 'Cooking Process',
    ccpNumber: 'CCP-1',
    ccpHazard: 'Bacterial survival (Salmonella, E. coli)',
    deviation: 'Grilled chicken breast measured at 158°F — below critical limit of 165°F for poultry',
    criticalLimit: '≥165°F (Poultry)',
    recordedValue: '158°F',
    actionTaken: 'Chicken returned to grill. Continued cooking until 170°F reached. Staff reminded of proper poultry cook temps. No food served below temp.',
    actionBy: 'Mike Johnson',
    verifiedBy: 'Sarah Chen (Supervisor)',
    status: 'resolved',
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    source: 'Cooking Temperature Log',
    locationId: '1',
  },
  {
    id: 'ca-4',
    planName: 'Receiving Inspection',
    ccpNumber: 'CCP-6',
    ccpHazard: 'Contaminated or temperature-abused deliveries',
    deviation: 'Seafood delivery measured at 48°F — above critical limit of 41°F',
    criticalLimit: '≤41°F',
    recordedValue: '48°F',
    actionTaken: 'Delivery rejected and returned to vendor. Incident documented. Vendor notified of non-compliance. Alternative supplier contacted for replacement order.',
    actionBy: 'Emma Davis',
    verifiedBy: 'Mike Johnson (Kitchen Manager)',
    status: 'resolved',
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    source: 'Receiving Inspection Checklist',
    locationId: '1',
  },
];

// ── Component ──────────────────────────────────────────────────────

export function HACCP() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'plans' | 'monitoring' | 'corrective' | 'template') || 'plans';
  const [activeTab, setActiveTab] = useState<'plans' | 'monitoring' | 'corrective' | 'template'>(initialTab);
  const [selectedPlan, setSelectedPlan] = useState<HACCPPlan | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const { getAccessibleLocations, userRole } = useRole();
  const haccpAccessibleLocs = getAccessibleLocations();

  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [loading, setLoading] = useState(false);
  const [livePlans, setLivePlans] = useState<HACCPPlan[]>([]);
  const [liveCorrectiveActions, setLiveCorrectiveActions] = useState<CorrectiveActionRecord[]>([]);

  // ── Template form state ──────────────────────────────────────────
  const [expandedSections, setExpandedSections] = useState<Record<string, any>>({ 1: true });
  const toggleSection = (num: number) => setExpandedSections(prev => ({ ...prev, [num]: !prev[num] }));

  // Section 1: Food Product
  const [tplProductName, setTplProductName] = useState('');
  const [tplProductDesc, setTplProductDesc] = useState('');
  const [tplIntendedUse, setTplIntendedUse] = useState('');
  const [tplDistribution, setTplDistribution] = useState('');
  const [tplTargetConsumer, setTplTargetConsumer] = useState('');

  // Section 2: Ingredients & Materials
  const [tplRawMaterials, setTplRawMaterials] = useState('');
  const [tplProcessingAids, setTplProcessingAids] = useState('');
  const [tplPackagingMaterials, setTplPackagingMaterials] = useState('');

  // Section 3: Intended Use & Consumers
  const [tplUseDescription, setTplUseDescription] = useState('');
  const [tplTargetPopulation, setTplTargetPopulation] = useState('');
  const [tplSpecialConsiderations, setTplSpecialConsiderations] = useState('');

  // Section 4: Flow Diagram steps
  const [tplFlowSteps, setTplFlowSteps] = useState<string[]>(['Receiving', 'Storage', 'Preparation', 'Cooking', 'Cooling', 'Reheating', 'Serving']);
  const addFlowStep = () => setTplFlowSteps(prev => [...prev, '']);
  const removeFlowStep = (idx: number) => setTplFlowSteps(prev => prev.filter((_, i) => i !== idx));
  const updateFlowStep = (idx: number, val: string) => setTplFlowSteps(prev => prev.map((s, i) => i === idx ? val : s));

  // Section 5: Hazard Analysis rows
  const [tplHazards, setTplHazards] = useState<{ type: string; description: string; significance: string; preventive: string }[]>([
    { type: 'Biological', description: '', significance: '', preventive: '' },
    { type: 'Chemical', description: '', significance: '', preventive: '' },
    { type: 'Physical', description: '', significance: '', preventive: '' },
  ]);
  const addHazardRow = () => setTplHazards(prev => [...prev, { type: '', description: '', significance: '', preventive: '' }]);
  const removeHazardRow = (idx: number) => setTplHazards(prev => prev.filter((_, i) => i !== idx));
  const updateHazard = (idx: number, field: string, val: string) =>
    setTplHazards(prev => prev.map((h, i) => i === idx ? { ...h, [field]: val } : h));

  // Section 6: CCP determination rows
  const [tplCCPs, setTplCCPs] = useState<{ ccpNum: string; step: string; hazard: string; criticalLimit: string; monitoring: string; corrective: string; verification: string; records: string }[]>([
    { ccpNum: 'CCP-1', step: '', hazard: '', criticalLimit: '', monitoring: '', corrective: '', verification: '', records: '' },
  ]);
  const addCCPRow = () => setTplCCPs(prev => [...prev, { ccpNum: `CCP-${prev.length + 1}`, step: '', hazard: '', criticalLimit: '', monitoring: '', corrective: '', verification: '', records: '' }]);
  const removeCCPRow = (idx: number) => setTplCCPs(prev => prev.filter((_, i) => i !== idx));
  const updateCCP = (idx: number, field: string, val: string) =>
    setTplCCPs(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));

  // Section 7: Critical Limits rows
  const [tplCriticalLimits, setTplCriticalLimits] = useState<{ ccpNum: string; limitDesc: string }[]>([
    { ccpNum: 'CCP-1', limitDesc: '' },
  ]);
  const addLimitRow = () => setTplCriticalLimits(prev => [...prev, { ccpNum: `CCP-${prev.length + 1}`, limitDesc: '' }]);
  const removeLimitRow = (idx: number) => setTplCriticalLimits(prev => prev.filter((_, i) => i !== idx));
  const updateLimit = (idx: number, field: string, val: string) =>
    setTplCriticalLimits(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));

  const handleTemplateSave = async () => {
    if (!tplProductName.trim()) {
      toast.warning('Product name is required');
      return;
    }
    if (tplCCPs.length === 0) {
      toast.warning('At least one CCP is required');
      return;
    }
    if (isDemoMode) {
      toast.success('Demo mode — HACCP plan saved locally');
      setActiveTab('plans');
      return;
    }
    try {
      const { data: planData, error: planError } = await supabase
        .from('haccp_plans')
        .insert({
          name: tplProductName,
          description: tplProductDesc || null,
          organization_id: profile?.organization_id,
          status: 'active',
        })
        .select()
        .single();
      if (planError || !planData) throw planError;

      const ccpInserts = tplCCPs.map((ccp, idx) => ({
        plan_id: planData.id,
        ccp_number: ccp.ccpNum || `CCP-${idx + 1}`,
        hazard: ccp.hazard || null,
        critical_limit: ccp.criticalLimit || null,
        monitoring_procedure: ccp.monitoring || null,
        corrective_action: ccp.corrective || null,
        verification: ccp.verification || null,
        record_keeping: ccp.records || null,
      }));
      await supabase.from('haccp_critical_control_points').insert(ccpInserts);

      toast.success('HACCP plan created');
      setActiveTab('plans');
    } catch {
      toast.error('Error saving HACCP plan');
    }
  };

  const canExportPackage = ['owner_operator', 'executive', 'kitchen_manager'].includes(userRole);

  const handleExportInspectorPackage = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const m = 20; // margin
    const cw = pageW - m * 2; // content width
    let y = 0;

    const checkPage = (need: number) => {
      if (y + need > pageH - 25) { doc.addPage(); y = 25; }
    };

    // ── Page 1: Cover ──
    y = 55;
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('HACCP Documentation', pageW / 2, y, { align: 'center' });
    y += 12;
    doc.text('Inspector Package', pageW / 2, y, { align: 'center' });
    y += 25;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    const facilityName = selectedLocation === 'all'
      ? 'All Locations'
      : selectedLocation.charAt(0).toUpperCase() + selectedLocation.slice(1);
    doc.text(`Facility: ${facilityName}`, pageW / 2, y, { align: 'center' });
    y += 9;
    doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW / 2, y, { align: 'center' });
    y += 9;
    doc.text('Prepared by: EvidLY Food Safety Platform', pageW / 2, y, { align: 'center' });
    y += 25;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.line(m, y, pageW - m, y);
    y += 15;
    doc.setFontSize(11);
    doc.text('This package contains:', m, y);
    y += 8;
    ['1. HACCP Plans with Critical Control Points',
     '2. CCP Monitoring Log (latest readings)',
     '3. Corrective Action Records',
     '4. Verification Statement',
    ].forEach(line => { doc.text(line, m + 5, y); y += 7; });

    // ── Pages: HACCP Plans + CCPs ──
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('HACCP Plans & Critical Control Points', m, y);
    y += 12;

    filteredPlans.forEach(plan => {
      checkPage(25);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(plan.name, m, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(plan.description, cw);
      doc.text(descLines, m, y);
      y += descLines.length * 4.5 + 3;
      doc.text(
        `Status: ${plan.status === 'active' ? 'Active' : 'Needs Review'}  |  Last Reviewed: ${new Date(plan.lastReviewed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        m, y
      );
      y += 8;

      plan.ccps.forEach(ccp => {
        checkPage(45);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${ccp.ccpNumber}: ${ccp.hazard}`, m + 3, y);
        y += 6;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');

        const fields: [string, string][] = [
          ['Critical Limit', ccp.criticalLimit],
          ['Monitoring', ccp.monitoringProcedure],
          ['Corrective Action', ccp.correctiveAction],
          ['Verification', ccp.verification],
          ['Last Reading', `${ccp.lastReading || 'N/A'} — ${ccp.isWithinLimit ? 'PASS' : 'FAIL'}`],
        ];

        fields.forEach(([label, value]) => {
          checkPage(14);
          doc.setFont('helvetica', 'bold');
          doc.text(`${label}:`, m + 5, y);
          doc.setFont('helvetica', 'normal');
          const valLines = doc.splitTextToSize(value, cw - 45);
          doc.text(valLines, m + 42, y);
          y += Math.max(valLines.length * 4, 5) + 1;
        });
        y += 4;
      });
      y += 4;
    });

    // ── CCP Monitoring Log ──
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CCP Monitoring Log', m, y);
    y += 12;

    // Table header
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    const cols = [m, m + 18, m + 80, m + 115, m + 135];
    doc.text('CCP #', cols[0], y);
    doc.text('Hazard', cols[1], y);
    doc.text('Reading', cols[2], y);
    doc.text('Status', cols[3], y);
    doc.text('Monitored By', cols[4], y);
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(m, y, pageW - m, y);
    y += 5;
    doc.setFont('helvetica', 'normal');

    allCCPs.forEach(ccp => {
      checkPage(10);
      doc.text(ccp.ccpNumber, cols[0], y);
      const hShort = ccp.hazard.length > 28 ? ccp.hazard.substring(0, 28) + '...' : ccp.hazard;
      doc.text(hShort, cols[1], y);
      doc.text(ccp.lastReading || 'N/A', cols[2], y);
      doc.text(ccp.isWithinLimit ? 'PASS' : 'FAIL', cols[3], y);
      doc.text(ccp.lastMonitoredBy, cols[4], y);
      y += 6;
    });

    // ── Checklist Completion Summary ──
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Checklist Completions', m, y);
    y += 12;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporting period: Last ${exportRange === 'all' ? 'all available' : exportRange + ' days'}`, m, y);
    y += 8;

    // Demo checklist completion data
    const demoChecklists = [
      { name: 'Opening Checklist', score: '100%', completedBy: 'Mike Johnson', date: 'Today, 6:15 AM' },
      { name: 'Mid-Shift Check', score: '83%', completedBy: 'Sarah Chen', date: 'Today, 11:30 AM' },
      { name: 'Closing Checklist', score: '100%', completedBy: 'Emma Davis', date: 'Yesterday, 9:45 PM' },
      { name: 'Receiving Checklist', score: '100%', completedBy: 'Mike Johnson', date: 'Yesterday, 7:00 AM' },
      { name: 'Opening Checklist', score: '100%', completedBy: 'Sarah Chen', date: '2 days ago, 6:20 AM' },
    ];
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Checklist', m, y);
    doc.text('Score', m + 70, y);
    doc.text('Completed By', m + 95, y);
    doc.text('Date', m + 135, y);
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(m, y, pageW - m, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    demoChecklists.forEach(cl => {
      checkPage(8);
      doc.text(cl.name, m, y);
      doc.text(cl.score, m + 70, y);
      doc.text(cl.completedBy, m + 95, y);
      doc.text(cl.date, m + 135, y);
      y += 6;
    });

    // ── Temperature Log Summary ──
    y += 10;
    checkPage(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Temperature Log Summary', m, y);
    y += 10;

    const demoTempLogs = [
      { equipment: 'Walk-in Cooler', temp: '38°F', range: '32–41°F', status: 'PASS', time: 'Today, 6:10 AM' },
      { equipment: 'Walk-in Freezer', temp: '-2°F', range: '≤0°F', status: 'PASS', time: 'Today, 6:12 AM' },
      { equipment: 'Hot Hold Cabinet', temp: '142°F', range: '≥135°F', status: 'PASS', time: 'Today, 11:00 AM' },
      { equipment: 'Prep Table', temp: '40°F', range: '32–41°F', status: 'PASS', time: 'Today, 10:30 AM' },
    ];
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipment', m, y);
    doc.text('Temp', m + 50, y);
    doc.text('Range', m + 75, y);
    doc.text('Status', m + 105, y);
    doc.text('Time', m + 125, y);
    y += 2;
    doc.line(m, y, pageW - m, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    demoTempLogs.forEach(tl => {
      checkPage(8);
      doc.text(tl.equipment, m, y);
      doc.text(tl.temp, m + 50, y);
      doc.text(tl.range, m + 75, y);
      doc.text(tl.status, m + 105, y);
      doc.text(tl.time, m + 125, y);
      y += 6;
    });

    // ── Corrective Actions ──
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Corrective Action Records', m, y);
    y += 12;

    if (filteredCorrectiveActions.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('No corrective actions recorded for this period.', m, y);
      y += 10;
    } else {
      filteredCorrectiveActions.forEach(action => {
        checkPage(40);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${action.planName} — ${action.ccpNumber}`, m, y);
        y += 5;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${new Date(action.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}  |  Status: ${action.status.charAt(0).toUpperCase() + action.status.slice(1)}`, m + 3, y);
        y += 5;

        const rows: [string, string][] = [
          ['Deviation', action.deviation],
          ['Critical Limit', action.criticalLimit],
          ['Recorded Value', action.recordedValue],
          ['Action Taken', action.actionTaken],
          ['Action By', action.actionBy],
          ['Verified By', action.verifiedBy || 'Pending'],
        ];

        rows.forEach(([label, value]) => {
          checkPage(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`${label}:`, m + 3, y);
          doc.setFont('helvetica', 'normal');
          const valLines = doc.splitTextToSize(value, cw - 40);
          doc.text(valLines, m + 38, y);
          y += Math.max(valLines.length * 4, 5) + 1;
        });
        y += 6;
      });
    }

    // ── Verification Statement ──
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Verification Statement', m, y);
    y += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const verificationText = [
      'I certify that the information contained in this HACCP Inspector Package is accurate and',
      'complete to the best of my knowledge. All Critical Control Points have been monitored in',
      'accordance with established procedures, and corrective actions have been documented',
      'for all deviations from critical limits.',
      '',
      'This documentation has been generated by the EvidLY Food Safety Platform, which',
      'continuously monitors temperature logs, daily checklists, and equipment status to maintain',
      'HACCP compliance across all facility locations.',
    ];
    verificationText.forEach(line => { doc.text(line, m, y); y += 6; });
    y += 15;
    doc.text('Signature: ___________________________', m, y);
    y += 10;
    doc.text('Name: ___________________________', m, y);
    y += 10;
    doc.text('Title: ___________________________', m, y);
    y += 10;
    doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, m, y);
    y += 30;

    // EvidLY branding
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by EvidLY — Food Safety Compliance Platform', pageW / 2, pageH - 15, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`HACCP-Inspector-Package-${dateStr}.pdf`);
    toast.success('Inspector Package exported');
  };

  // Fetch HACCP data from Supabase in live mode
  useEffect(() => {
    if (isDemoMode || !profile?.organization_id) return;

    async function fetchHACCPData() {
      setLoading(true);

      // Fetch plans with their CCPs
      const { data: plansData, error: plansError } = await supabase
        .from('haccp_plans')
        .select('*, haccp_critical_control_points(*)')
        .eq('organization_id', profile!.organization_id)
        .neq('status', 'archived')
        .order('created_at', { ascending: true });

      if (plansError) {
        console.error('Error fetching HACCP plans:', plansError);
        setLoading(false);
        return;
      }

      // For each CCP, get latest monitoring log
      const ccpIds = (plansData || []).flatMap((p: any) =>
        (p.haccp_critical_control_points || []).map((c: any) => c.id)
      );

      let latestLogs: Record<string, any> = {};
      if (ccpIds.length > 0) {
        const { data: logsData } = await supabase
          .from('haccp_monitoring_logs')
          .select('*')
          .in('ccp_id', ccpIds)
          .order('monitored_at', { ascending: false });

        // Group by ccp_id, keep only latest
        (logsData || []).forEach((log: any) => {
          if (!latestLogs[log.ccp_id]) latestLogs[log.ccp_id] = log;
        });
      }

      // Map to HACCPPlan format
      const mapped: HACCPPlan[] = (plansData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        lastReviewed: p.last_reviewed || p.created_at,
        status: p.status as 'active' | 'needs_review',
        ccps: (p.haccp_critical_control_points || []).map((c: any) => {
          const log = latestLogs[c.id];
          return {
            id: c.id,
            ccpNumber: c.ccp_number,
            hazard: c.hazard,
            criticalLimit: c.critical_limit,
            monitoringProcedure: c.monitoring_procedure,
            correctiveAction: c.corrective_action,
            verification: c.verification,
            lastReading: log?.reading_text || (log?.reading_value != null ? `${log.reading_value}${log.reading_unit || ''}` : undefined),
            lastReadingValue: log?.reading_value != null ? Number(log.reading_value) : undefined,
            lastReadingUnit: log?.reading_unit || undefined,
            isWithinLimit: log ? log.is_within_limit : true,
            lastMonitoredAt: log?.monitored_at || c.created_at,
            lastMonitoredBy: log?.monitored_by_name || 'System',
            source: c.source as 'temp_log' | 'checklist' | 'iot_sensor',
            equipmentName: c.equipment_name || undefined,
            locationId: c.location_id || '',
          };
        }),
      }));

      setLivePlans(mapped);

      // Fetch corrective actions
      const { data: actionsData, error: actionsError } = await supabase
        .from('haccp_corrective_actions')
        .select('*')
        .eq('organization_id', profile!.organization_id)
        .order('created_at', { ascending: false });

      if (!actionsError && actionsData) {
        const mappedActions: CorrectiveActionRecord[] = actionsData.map((a: any) => ({
          id: a.id,
          planName: a.plan_name,
          ccpNumber: a.ccp_number,
          ccpHazard: a.ccp_hazard,
          deviation: a.deviation,
          criticalLimit: a.critical_limit,
          recordedValue: a.recorded_value,
          actionTaken: a.action_taken,
          actionBy: a.action_by,
          verifiedBy: a.verified_by,
          status: a.status as 'open' | 'in_progress' | 'resolved',
          createdAt: a.created_at,
          resolvedAt: a.resolved_at,
          source: a.source || '',
          locationId: a.location_id || '',
        }));
        setLiveCorrectiveActions(mappedActions);
      }

      setLoading(false);
    }

    fetchHACCPData();
  }, [isDemoMode, profile?.organization_id]);

  // Use live data or demo data
  const allPlans = isDemoMode ? HACCP_PLANS : livePlans.length > 0 ? livePlans : HACCP_PLANS;
  const allCorrectiveActions = isDemoMode ? CORRECTIVE_ACTIONS : liveCorrectiveActions.length > 0 ? liveCorrectiveActions : CORRECTIVE_ACTIONS;

  // Aggregate stats — filtered by selected location
  const locId = selectedLocation !== 'all' ? LOCATION_ID_MAP[selectedLocation] : null;
  const allCCPs = allPlans.flatMap((p) => p.ccps).filter(c => !locId || c.locationId === locId);
  const totalCCPs = allCCPs.length;
  const passingCCPs = allCCPs.filter((c) => c.isWithinLimit).length;
  const failingCCPs = totalCCPs - passingCCPs;
  const overallCompliance = totalCCPs > 0 ? Math.round((passingCCPs / totalCCPs) * 100) : 100;
  const filteredCorrectiveActions = allCorrectiveActions.filter(a => !locId || a.locationId === locId);
  const openActions = filteredCorrectiveActions.filter((a) => a.status === 'open' || a.status === 'in_progress').length;

  // Filter plans to only those with CCPs at the selected location
  const filteredPlans = locId
    ? allPlans.map(p => ({ ...p, ccps: p.ccps.filter(c => c.locationId === locId) })).filter(p => p.ccps.length > 0)
    : allPlans;

  const getPlanCompliance = (plan: HACCPPlan) => {
    const total = plan.ccps.length;
    const passing = plan.ccps.filter((c) => c.isWithinLimit).length;
    return total > 0 ? Math.round((passing / total) * 100) : 100;
  };

  const getPlanStatus = (plan: HACCPPlan) => {
    const hasFailures = plan.ccps.some((c) => !c.isWithinLimit);
    if (hasFailures) return 'critical';
    if (plan.status === 'needs_review') return 'review';
    // Auto-detect if review is overdue (>90 days)
    const daysSinceReview = Math.floor((Date.now() - new Date(plan.lastReviewed).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceReview > 90) return 'review';
    return 'good';
  };

  const handleMarkReviewed = (planId: string) => {
    if (isDemoMode) {
      const nowStr = new Date().toISOString();
      if (selectedPlan?.id === planId) {
        setSelectedPlan({ ...selectedPlan, lastReviewed: nowStr, status: 'active' });
      }
      toast.success('Plan marked as reviewed');
    } else {
      supabase.from('haccp_plans').update({ last_reviewed: new Date().toISOString(), status: 'active' }).eq('id', planId)
        .then(() => toast.success('Plan marked as reviewed'));
    }
  };

  const handleVerifyAction = (actionId: string) => {
    if (isDemoMode) {
      setLiveCorrectiveActions(prev => {
        const base = prev.length > 0 ? prev : [...CORRECTIVE_ACTIONS];
        return base.map(a =>
          a.id === actionId ? { ...a, verifiedBy: 'Current User', status: 'resolved' as const, resolvedAt: new Date().toISOString() } : a
        );
      });
      toast.success('Corrective action verified and resolved');
    } else {
      supabase.from('haccp_corrective_actions').update({
        verified_by: profile?.full_name || 'Manager',
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      }).eq('id', actionId).then(() => toast.success('Corrective action verified'));
    }
  };

  // New corrective action form state — auto-open from URL params (e.g. ?tab=corrective&new=true&ccp=CCP-1)
  const urlNewCA = searchParams.get('new') === 'true';
  const urlCCP = searchParams.get('ccp') || '';
  const [showNewCAForm, setShowNewCAForm] = useState(urlNewCA);
  const [newCA, setNewCA] = useState({ planName: '', ccpNumber: urlCCP, deviation: '', criticalLimit: '', recordedValue: '', actionTaken: '' });

  // Inspector Package date range
  const [exportRange, setExportRange] = useState<'7' | '30' | '90' | 'all'>('30');

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'HACCP' }]} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HACCP Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Roll-up view — data pulled from Temperature Logs and Checklists
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {canExportPackage && (<>
              <select
                value={exportRange}
                onChange={(e) => setExportRange(e.target.value as typeof exportRange)}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All data</option>
              </select>
              <button
                onClick={handleExportInspectorPackage}
                className="inline-flex items-center px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ backgroundColor: '#1e4d6b' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Inspector Package
              </button>
            </>)}
            <MapPin className="h-4 w-4 text-gray-500" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              {haccpAccessibleLocs.length > 1 && <option value="all">All Locations</option>}
              {haccpAccessibleLocs.map(loc => (
                <option key={loc.locationUrlId} value={loc.locationUrlId}>{loc.locationName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: '4px solid #1e4d6b' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-[#1e4d6b]" />
              <span className="text-sm text-gray-500 font-medium">Active Plans</span>
            </div>
            <p className="text-xl sm:text-3xl font-bold text-[#1e4d6b] text-center">{filteredPlans.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: `4px solid ${overallCompliance >= 90 ? '#22c55e' : overallCompliance >= 75 ? '#eab308' : overallCompliance >= 60 ? '#f59e0b' : '#ef4444'}` }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="h-4 w-4" style={{ color: overallCompliance >= 90 ? '#22c55e' : overallCompliance >= 75 ? '#eab308' : overallCompliance >= 60 ? '#f59e0b' : '#ef4444' }} />
              <span className="text-sm text-gray-500 font-medium">Overall Compliance</span>
            </div>
            <p className={`text-xl sm:text-3xl font-bold text-center ${overallCompliance >= 90 ? 'text-green-600' : overallCompliance >= 75 ? 'text-yellow-600' : overallCompliance >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {overallCompliance}%
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: '4px solid #16a34a' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500 font-medium">CCPs in Compliance</span>
            </div>
            <p className="text-xl sm:text-3xl font-bold text-green-600 text-center">{passingCCPs}/{totalCCPs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: `4px solid ${openActions > 0 ? '#ef4444' : '#16a34a'}` }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" style={{ color: openActions > 0 ? '#ef4444' : '#16a34a' }} />
              <span className="text-sm text-gray-500 font-medium">Open Actions</span>
            </div>
            <p className={`text-xl sm:text-3xl font-bold text-center ${openActions > 0 ? 'text-red-600' : 'text-green-600'}`}>{openActions}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('plans'); setSelectedPlan(null); }}
            className={`px-6 py-3 font-medium whitespace-nowrap ${
              activeTab === 'plans'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Plans ({filteredPlans.length})
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-6 py-3 font-medium whitespace-nowrap ${
              activeTab === 'monitoring'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monitoring ({totalCCPs} CCPs)
          </button>
          <button
            onClick={() => setActiveTab('corrective')}
            className={`px-6 py-3 font-medium flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'corrective'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Corrective Actions</span>
            {openActions > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{openActions}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`px-6 py-3 font-medium flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'template'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Template</span>
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e4d6b]" />
            <span className="ml-3 text-gray-600">Loading HACCP data...</span>
          </div>
        )}

        {/* ── Plans Tab ─────────────────────────────────────── */}
        {!loading && activeTab === 'plans' && !selectedPlan && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPlans.map((plan) => {
              const compliance = getPlanCompliance(plan);
              const planStatus = getPlanStatus(plan);
              const lastMonitored = plan.ccps.reduce((latest, ccp) => {
                const t = new Date(ccp.lastMonitoredAt).getTime();
                return t > latest ? t : latest;
              }, 0);

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className="bg-white rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer border-l-4"
                  style={{
                    borderLeftColor: planStatus === 'critical' ? '#dc2626' : planStatus === 'review' ? '#d97706' : '#16a34a',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-sm text-gray-600 mt-0.5">{plan.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 text-center">CCPs</p>
                      <p className="text-lg font-bold text-[#1e4d6b] text-center">{plan.ccps.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 text-center">Compliance</p>
                      <p className={`text-lg font-bold text-center ${compliance >= 90 ? 'text-green-600' : compliance >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {compliance}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 text-center">Last Check</p>
                      <p className="text-sm font-medium text-gray-700 text-center">{getRelativeTime(new Date(lastMonitored).toISOString())}</p>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center space-x-2">
                      {planStatus === 'critical' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          CCP Out of Limit
                        </span>
                      )}
                      {planStatus === 'review' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Needs Review
                        </span>
                      )}
                      {planStatus === 'good' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          All CCPs Passing
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Reviewed {new Date(plan.lastReviewed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {planStatus === 'critical' && (
                      <p className="text-xs text-red-600">
                        {plan.ccps.filter(c => !c.isWithinLimit).map(c =>
                          `${c.equipmentName || c.ccpNumber}: ${c.lastReading} (limit: ${c.criticalLimit})`
                        ).join('; ')}
                      </p>
                    )}
                    {planStatus === 'review' && ['owner_operator', 'executive'].includes(userRole) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkReviewed(plan.id); }}
                        className="mt-2 text-xs font-medium text-[#1e4d6b] hover:text-[#2a6a8f] underline"
                      >
                        Mark as Reviewed
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Plan Detail View ──────────────────────────────── */}
        {!loading && activeTab === 'plans' && selectedPlan && (
          <div>
            {/* Breadcrumb navigation */}
            <div className="flex items-center space-x-2 text-sm mb-4">
              <span
                onClick={() => setSelectedPlan(null)}
                className="text-[#1e4d6b] hover:text-[#163a52] cursor-pointer font-medium"
              >
                HACCP Plans
              </span>
              <span className="text-gray-400">›</span>
              <span className="text-gray-600">{selectedPlan.name}</span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPlan.name}</h2>
                  <p className="text-gray-600 mt-1">{selectedPlan.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Last reviewed: {new Date(selectedPlan.lastReviewed).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="text-center">
                  <p className={`text-xl sm:text-3xl font-bold text-center ${getPlanCompliance(selectedPlan) === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                    {getPlanCompliance(selectedPlan)}%
                  </p>
                  <p className="text-xs text-gray-500 text-center">Compliance</p>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical Control Points</h3>
            <div className="space-y-4">
              {selectedPlan.ccps.map((ccp) => (
                <div
                  key={ccp.id}
                  className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 border-l-4 ${ccp.isWithinLimit ? 'border-l-green-500' : 'border-l-red-500'}`}
                >
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${ccp.isWithinLimit ? 'bg-green-600' : 'bg-red-600'}`}>
                        {ccp.isWithinLimit ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{ccp.ccpNumber}: {ccp.hazard}</h4>
                        {ccp.equipmentName && (
                          <p className="text-sm text-gray-500">Source: {ccp.equipmentName} (Temperature Log)</p>
                        )}
                        {!ccp.equipmentName && (
                          <p className="text-sm text-gray-500">Source: {ccp.source === 'checklist' ? 'Checklist' : 'Temperature Log'}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {ccp.isWithinLimit ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" /> Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Fail
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Critical Limit</p>
                      <p className="text-gray-600">{ccp.criticalLimit}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Last Reading</p>
                      <p className={`font-semibold ${ccp.isWithinLimit ? 'text-green-700' : 'text-red-700'}`}>
                        {ccp.lastReading || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">{ccp.lastMonitoredBy} · {getRelativeTime(ccp.lastMonitoredAt)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Monitoring Procedure</p>
                      <p className="text-gray-600">{ccp.monitoringProcedure}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Corrective Action (if limit exceeded)</p>
                      <p className="text-gray-600">{ccp.correctiveAction}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Verification:</span> {ccp.verification}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Monitoring Tab (Real-time CCP Grid) ───────────── */}
        {!loading && activeTab === 'monitoring' && (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Real-time status of all Critical Control Points across HACCP plans. Readings pulled from Temperature Logs and Checklists.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPlans.flatMap((plan) =>
                plan.ccps.map((ccp) => (
                  <div
                    key={ccp.id}
                    className={`bg-white rounded-xl shadow-sm p-4 border-t-4 ${ccp.isWithinLimit ? 'border-t-green-500' : 'border-t-red-500'}`}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{plan.name}</p>
                        <h4 className="text-sm font-bold text-gray-900 mt-0.5">{ccp.ccpNumber}: {ccp.hazard}</h4>
                      </div>
                      {ccp.isWithinLimit ? (
                        <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
                      )}
                    </div>

                    {/* Reading */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Last Reading</p>
                          <p className={`text-lg font-bold ${ccp.isWithinLimit ? 'text-green-700' : 'text-red-700'}`}>
                            {ccp.lastReading || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Status</p>
                          {ccp.isWithinLimit ? (
                            <span className="text-sm font-semibold text-green-700">PASS</span>
                          ) : (
                            <span className="text-sm font-semibold text-red-700">FAIL</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Critical Limit</span>
                        <span className="text-gray-700 font-medium text-right" style={{ maxWidth: '60%' }}>{ccp.criticalLimit}</span>
                      </div>
                      {ccp.equipmentName && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Equipment</span>
                          <span className="text-gray-700 font-medium">{ccp.equipmentName}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Source</span>
                        <span className="text-gray-700 font-medium inline-flex items-center gap-1">
                          {ccp.source === 'iot_sensor' ? (
                            <><Wifi className="h-3 w-3 text-green-600" /> IoT Auto-Logged</>
                          ) : ccp.source === 'temp_log' ? (
                            <><Pencil className="h-3 w-3 text-gray-500" /> Temperature Log</>
                          ) : (
                            <>Checklist</>
                          )}
                        </span>
                      </div>
                      {ccp.source === 'iot_sensor' && ccp.sensorName && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Sensor</span>
                          <span className="text-gray-700 font-medium">{ccp.sensorName}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Monitored By</span>
                        <span className="text-gray-700 font-medium">{ccp.lastMonitoredBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Checked</span>
                        <span className="text-gray-700 font-medium">{getRelativeTime(ccp.lastMonitoredAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Corrective Actions Tab ────────────────────────── */}
        {!loading && activeTab === 'corrective' && (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Auto-generated when critical limits are exceeded. Actions are linked to the source monitoring data.
              </p>
            </div>

            {/* Open Actions First */}
            {filteredCorrectiveActions.filter((a) => a.status === 'open' || a.status === 'in_progress').length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-3">
                  Open Actions ({filteredCorrectiveActions.filter((a) => a.status === 'open' || a.status === 'in_progress').length})
                </h3>
                <div className="space-y-4">
                  {filteredCorrectiveActions.filter((a) => a.status === 'open' || a.status === 'in_progress').map((action) => {
                    const workflowSteps = ['Identified', 'Assigned', 'In Progress', 'Resolved'];
                    const currentStep = action.status === 'open' ? 0 : action.status === 'in_progress' ? 2 : 3;
                    return (
                    <div key={action.id} className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border-l-4 border-l-red-500">
                      <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-gray-900">{action.planName} — {action.ccpNumber}</h4>
                            <p className="text-sm text-gray-600">{action.ccpHazard}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{getRelativeTime(action.createdAt)} · Source: {action.source}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${action.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                          {action.status === 'open' ? 'Open' : 'In Progress'}
                        </span>
                      </div>

                      {/* Workflow Progress */}
                      <div className="mb-4 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                        <div className="flex items-center justify-between min-w-[320px]">
                          {workflowSteps.map((step, i) => (
                            <div key={step} className="flex items-center" style={{ flex: i < workflowSteps.length - 1 ? 1 : 'none' }}>
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                    i < currentStep ? 'bg-green-500 text-white' :
                                    i === currentStep ? 'bg-[#1e4d6b] text-white' :
                                    'bg-gray-300 text-gray-500'
                                  }`}
                                >
                                  {i < currentStep ? '✓' : i + 1}
                                </div>
                                <span className={`text-xs mt-1 ${i <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{step}</span>
                              </div>
                              {i < workflowSteps.length - 1 && (
                                <div className={`h-0.5 flex-1 mx-2 mt-[-14px] ${i < currentStep ? 'bg-green-500' : 'bg-gray-300'}`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                        <div className="bg-red-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-red-700">Deviation</p>
                          <p className="text-red-900 mt-1">{action.deviation}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-600">Critical Limit</p>
                          <p className="text-gray-900 mt-1">{action.criticalLimit}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-600">Recorded Value</p>
                          <p className="text-red-700 font-semibold mt-1">{action.recordedValue}</p>
                        </div>
                      </div>

                      <div className="text-sm">
                        <p className="font-medium text-gray-700 mb-1">Action Taken:</p>
                        <p className="text-gray-900">{action.actionTaken}</p>
                        <p className="text-xs text-gray-500 mt-1">By: {action.actionBy}</p>
                      </div>
                      {!action.verifiedBy && ['owner_operator', 'executive', 'kitchen_manager'].includes(userRole) && (
                        <button
                          onClick={() => handleVerifyAction(action.id)}
                          className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                          style={{ backgroundColor: '#1e4d6b' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Mark Verified
                        </button>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New Corrective Action Button + Form */}
            {['owner_operator', 'executive'].includes(userRole) && (
              <div className="mb-4">
                {!showNewCAForm ? (
                  <button
                    onClick={() => setShowNewCAForm(true)}
                    className="inline-flex items-center px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                    style={{ backgroundColor: '#1e4d6b' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
                  >
                    <Plus className="h-4 w-4 mr-2" /> New Corrective Action
                  </button>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">New Corrective Action</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Plan Name</label>
                        <select value={newCA.planName} onChange={(e) => setNewCA({ ...newCA, planName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                          <option value="">Select plan...</option>
                          {filteredPlans.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">CCP Number</label>
                        <input type="text" value={newCA.ccpNumber} onChange={(e) => setNewCA({ ...newCA, ccpNumber: e.target.value })} placeholder="CCP-1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Critical Limit</label>
                        <input type="text" value={newCA.criticalLimit} onChange={(e) => setNewCA({ ...newCA, criticalLimit: e.target.value })} placeholder="e.g., ≤41°F" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Recorded Value</label>
                        <input type="text" value={newCA.recordedValue} onChange={(e) => setNewCA({ ...newCA, recordedValue: e.target.value })} placeholder="e.g., 44°F" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Deviation Description</label>
                      <textarea value={newCA.deviation} onChange={(e) => setNewCA({ ...newCA, deviation: e.target.value })} rows={2} placeholder="Describe the deviation from the critical limit..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Action Taken</label>
                      <textarea value={newCA.actionTaken} onChange={(e) => setNewCA({ ...newCA, actionTaken: e.target.value })} rows={2} placeholder="Describe the corrective action taken..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          if (!newCA.planName || !newCA.ccpNumber || !newCA.deviation || !newCA.actionTaken) {
                            toast.warning('Please fill all required fields');
                            return;
                          }
                          const record: CorrectiveActionRecord = {
                            id: `ca-manual-${Date.now()}`,
                            planName: newCA.planName,
                            ccpNumber: newCA.ccpNumber,
                            ccpHazard: newCA.deviation,
                            deviation: newCA.deviation,
                            criticalLimit: newCA.criticalLimit,
                            recordedValue: newCA.recordedValue,
                            actionTaken: newCA.actionTaken,
                            actionBy: profile?.full_name || 'Current User',
                            verifiedBy: null,
                            status: 'open',
                            createdAt: new Date().toISOString(),
                            resolvedAt: null,
                            source: 'Manual Entry',
                            locationId: LOCATION_ID_MAP[selectedLocation] || '1',
                          };
                          setLiveCorrectiveActions(prev => [record, ...prev]);
                          setNewCA({ planName: '', ccpNumber: '', deviation: '', criticalLimit: '', recordedValue: '', actionTaken: '' });
                          setShowNewCAForm(false);
                          toast.success('Corrective action created');
                        }}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                        style={{ backgroundColor: '#1e4d6b' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
                      >
                        Save
                      </button>
                      <button onClick={() => setShowNewCAForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resolved Actions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Resolved ({filteredCorrectiveActions.filter((a) => a.status === 'resolved').length})
              </h3>
              <div className="space-y-4">
                {filteredCorrectiveActions.filter((a) => a.status === 'resolved').map((action) => (
                  <div key={action.id} className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border-l-4 border-l-green-500">
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-gray-900">{action.planName} — {action.ccpNumber}</h4>
                          <p className="text-sm text-gray-600">{action.ccpHazard}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{getRelativeTime(action.createdAt)} · Source: {action.source}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex-shrink-0">
                        Resolved
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-600">Deviation</p>
                        <p className="text-gray-900 mt-1">{action.deviation}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-600">Critical Limit</p>
                        <p className="text-gray-900 mt-1">{action.criticalLimit}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-600">Recorded Value</p>
                        <p className="text-gray-900 mt-1">{action.recordedValue}</p>
                      </div>
                    </div>

                    <div className="text-sm">
                      <p className="font-medium text-gray-700 mb-1">Action Taken:</p>
                      <p className="text-gray-900">{action.actionTaken}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 flex-wrap gap-y-1">
                        <span>By: {action.actionBy}</span>
                        {action.verifiedBy && <span>Verified by: {action.verifiedBy}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Template Tab (HACCP Plan Builder Wizard) ──────── */}
        {!loading && activeTab === 'template' && (() => {
          const WIZARD_STEPS = [
            { id: 1, label: 'Product Info' },
            { id: 2, label: 'Ingredients' },
            { id: 3, label: 'Intended Use' },
            { id: 4, label: 'Flow Diagram' },
            { id: 5, label: 'Hazard Analysis' },
            { id: 6, label: 'CCPs' },
            { id: 7, label: 'Review & Save' },
          ];
          const wizardStepNum = expandedSections.__wizardStep ?? 1;
          const setWizardStep = (n: number) => setExpandedSections(prev => ({ ...prev, __wizardStep: n }));
          const canNext = () => {
            if (wizardStepNum === 1 && !tplProductName.trim()) return false;
            if (wizardStepNum === 6 && tplCCPs.length === 0) return false;
            return true;
          };
          return (
          <div>
            {/* Auto-Generate Option */}
            <div className="mb-4 flex items-start justify-between flex-wrap gap-2">
              <p className="text-sm text-gray-600">
                Build a HACCP plan step by step, or auto-generate from your checklist templates.
              </p>
              <button
                onClick={async () => {
                  if (isDemoMode) {
                    setTplProductName('Auto-Generated Plan');
                    setTplProductDesc('Generated from existing checklist templates with CCP-tagged items.');
                    toast.success('Demo: HACCP plan pre-populated from checklists');
                    return;
                  }
                  try {
                    const { data, error } = await supabase.functions.invoke('generate-haccp-from-checklists', {
                      body: { facility_id: profile?.organization_id },
                    });
                    if (error) throw error;
                    if (data?.plan_name) setTplProductName(data.plan_name);
                    if (data?.ccps?.length) {
                      setTplCCPs(data.ccps.map((c: any, i: number) => ({
                        ccpNum: c.ccp_number || `CCP-${i + 1}`,
                        step: c.process_step || '',
                        hazard: c.hazard || '',
                        criticalLimit: c.critical_limit || '',
                        monitoring: c.monitoring_procedure || '',
                        corrective: c.corrective_action || '',
                        verification: c.verification || '',
                        records: c.record_keeping || '',
                      })));
                    }
                    toast.success('HACCP plan pre-populated from checklists');
                  } catch {
                    toast.error('Failed to auto-generate — please fill manually');
                  }
                }}
                className="inline-flex items-center px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors"
                style={{ borderColor: '#1e4d6b', color: '#1e4d6b' }}
              >
                <Activity className="h-4 w-4 mr-2" />
                Auto-Generate from Checklists
              </button>
            </div>

            {/* Wizard Step Indicator */}
            <div className="mb-6 overflow-x-auto">
              <div className="flex items-center justify-between min-w-[600px]">
                {WIZARD_STEPS.map((step, i) => (
                  <div key={step.id} className="flex items-center" style={{ flex: i < WIZARD_STEPS.length - 1 ? 1 : 'none' }}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-colors ${
                          step.id < wizardStepNum ? 'bg-green-500 text-white' :
                          step.id === wizardStepNum ? 'text-white' :
                          'bg-gray-300 text-gray-500'
                        }`}
                        style={step.id === wizardStepNum ? { backgroundColor: '#1e4d6b' } : undefined}
                        onClick={() => setWizardStep(step.id)}
                      >
                        {step.id < wizardStepNum ? '✓' : step.id}
                      </div>
                      <span className={`text-xs mt-1 whitespace-nowrap ${step.id <= wizardStepNum ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{step.label}</span>
                    </div>
                    {i < WIZARD_STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-2 mt-[-14px] ${step.id < wizardStepNum ? 'bg-green-500' : 'bg-gray-300'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">

              {/* Step 1: Product Info */}
              {wizardStepNum === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Describe the Food Product</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                    <input type="text" value={tplProductName} onChange={(e) => setTplProductName(e.target.value)} placeholder="e.g., Grilled Chicken Sandwich" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Description</label>
                    <textarea value={tplProductDesc} onChange={(e) => setTplProductDesc(e.target.value)} placeholder="Describe the food product, including how it is processed, stored, and served..." rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intended Use</label>
                    <input type="text" value={tplIntendedUse} onChange={(e) => setTplIntendedUse(e.target.value)} placeholder="e.g., Ready-to-eat, served hot" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Distribution Method</label>
                    <input type="text" value={tplDistribution} onChange={(e) => setTplDistribution(e.target.value)} placeholder="e.g., On-site consumption, catering delivery, retail" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Consumer</label>
                    <input type="text" value={tplTargetConsumer} onChange={(e) => setTplTargetConsumer(e.target.value)} placeholder="e.g., General public, including children and elderly" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                </div>
              )}

              {/* Step 2: Ingredients */}
              {wizardStepNum === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Ingredients and Materials</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Raw Materials</label>
                    <textarea value={tplRawMaterials} onChange={(e) => setTplRawMaterials(e.target.value)} placeholder="List all raw materials and ingredients (one per line)" rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Processing Aids</label>
                    <textarea value={tplProcessingAids} onChange={(e) => setTplProcessingAids(e.target.value)} placeholder="List any processing aids used" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Packaging Materials</label>
                    <textarea value={tplPackagingMaterials} onChange={(e) => setTplPackagingMaterials(e.target.value)} placeholder="List packaging materials" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                </div>
              )}

              {/* Step 3: Intended Use */}
              {wizardStepNum === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Intended Use and Consumers</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intended Use</label>
                    <textarea value={tplUseDescription} onChange={(e) => setTplUseDescription(e.target.value)} placeholder="Describe how the product is intended to be used by the end consumer" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Population</label>
                    <textarea value={tplTargetPopulation} onChange={(e) => setTplTargetPopulation(e.target.value)} placeholder="Identify the target population" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Considerations</label>
                    <textarea value={tplSpecialConsiderations} onChange={(e) => setTplSpecialConsiderations(e.target.value)} placeholder="Note any special considerations (allergens, vulnerable populations)" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                </div>
              )}

              {/* Step 4: Flow Diagram */}
              {wizardStepNum === 4 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Process Flow Diagram</h3>
                  <p className="text-sm text-gray-600 mb-4">Define the process steps from receiving raw materials through to serving the final product.</p>
                  <div className="space-y-2">
                    {tplFlowSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#d4af37' }}>{idx + 1}</div>
                        <input type="text" value={step} onChange={(e) => updateFlowStep(idx, e.target.value)} placeholder={`Step ${idx + 1}`} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                        {tplFlowSteps.length > 1 && (
                          <button onClick={() => removeFlowStep(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={addFlowStep} className="mt-3 inline-flex items-center text-sm font-medium" style={{ color: '#1e4d6b' }}>
                    <Plus className="h-4 w-4 mr-1" /> Add Step
                  </button>
                </div>
              )}

              {/* Step 5: Hazard Analysis */}
              {wizardStepNum === 5 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Hazard Analysis</h3>
                  <p className="text-sm text-gray-600 mb-4">Identify all potential biological, chemical, and physical hazards.</p>
                  <div className="space-y-4">
                    {tplHazards.map((hazard, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-700">Hazard #{idx + 1}</span>
                          {tplHazards.length > 1 && (
                            <button onClick={() => removeHazardRow(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Hazard Type</label>
                            <select value={hazard.type} onChange={(e) => updateHazard(idx, 'type', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                              <option value="">Select type...</option>
                              <option value="Biological">Biological</option>
                              <option value="Chemical">Chemical</option>
                              <option value="Physical">Physical</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Significance</label>
                            <select value={hazard.significance} onChange={(e) => updateHazard(idx, 'significance', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                              <option value="">Select...</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                            <textarea value={hazard.description} onChange={(e) => updateHazard(idx, 'description', e.target.value)} placeholder="Describe the specific hazard" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Preventive Measures</label>
                            <textarea value={hazard.preventive} onChange={(e) => updateHazard(idx, 'preventive', e.target.value)} placeholder="Describe preventive measures" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={addHazardRow} className="mt-3 inline-flex items-center text-sm font-medium" style={{ color: '#1e4d6b' }}>
                    <Plus className="h-4 w-4 mr-1" /> Add Hazard
                  </button>
                </div>
              )}

              {/* Step 6: CCPs */}
              {wizardStepNum === 6 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Critical Control Points *</h3>
                  <p className="text-sm text-gray-600 mb-4">At least one CCP is required. Define monitoring, limits, and corrective actions for each.</p>
                  <div className="space-y-4">
                    {tplCCPs.map((ccp, idx) => (
                      <div key={idx} className="rounded-lg border-2 border-[#1e4d6b]/20 overflow-hidden">
                        <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#eef4f8' }}>
                          <span className="text-sm font-bold" style={{ color: '#1e4d6b' }}>{ccp.ccpNum || `CCP-${idx + 1}`}</span>
                          {tplCCPs.length > 1 && (
                            <button onClick={() => removeCCPRow(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">CCP Number</label>
                              <input type="text" value={ccp.ccpNum} onChange={(e) => updateCCP(idx, 'ccpNum', e.target.value)} placeholder="CCP-1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Process Step</label>
                              <input type="text" value={ccp.step} onChange={(e) => updateCCP(idx, 'step', e.target.value)} placeholder="e.g., Cooking" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Hazard</label>
                            <input type="text" value={ccp.hazard} onChange={(e) => updateCCP(idx, 'hazard', e.target.value)} placeholder="e.g., Survival of bacterial pathogens" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Critical Limit</label>
                            <input type="text" value={ccp.criticalLimit} onChange={(e) => updateCCP(idx, 'criticalLimit', e.target.value)} placeholder="e.g., >= 165F for poultry" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Monitoring Procedure</label>
                            <textarea value={ccp.monitoring} onChange={(e) => updateCCP(idx, 'monitoring', e.target.value)} placeholder="What, how, frequency, who" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Corrective Action</label>
                            <textarea value={ccp.corrective} onChange={(e) => updateCCP(idx, 'corrective', e.target.value)} placeholder="Actions when limit not met" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Verification</label>
                            <textarea value={ccp.verification} onChange={(e) => updateCCP(idx, 'verification', e.target.value)} placeholder="Verification activities" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Records</label>
                            <input type="text" value={ccp.records} onChange={(e) => updateCCP(idx, 'records', e.target.value)} placeholder="e.g., Cooking temperature log" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={addCCPRow} className="mt-3 inline-flex items-center text-sm font-medium" style={{ color: '#1e4d6b' }}>
                    <Plus className="h-4 w-4 mr-1" /> Add Critical Control Point
                  </button>
                </div>
              )}

              {/* Step 7: Review & Save */}
              {wizardStepNum === 7 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Review & Save</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-700">Product</p>
                      <p className="text-gray-900">{tplProductName || '(not set)'}</p>
                      {tplProductDesc && <p className="text-gray-600 mt-1">{tplProductDesc}</p>}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-700">Flow Diagram</p>
                      <p className="text-gray-900">{tplFlowSteps.filter(s => s.trim()).join(' → ') || '(not set)'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-700">Hazards</p>
                      <p className="text-gray-900">{tplHazards.filter(h => h.type).length} hazard(s) identified</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-700">Critical Control Points</p>
                      <p className="text-gray-900">{tplCCPs.length} CCP(s): {tplCCPs.map(c => c.ccpNum).join(', ')}</p>
                    </div>
                    {tplCriticalLimits.filter(l => l.limitDesc.trim()).length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="font-semibold text-gray-700">Critical Limits</p>
                        {tplCriticalLimits.filter(l => l.limitDesc.trim()).map((l, i) => (
                          <p key={i} className="text-gray-900">{l.ccpNum}: {l.limitDesc}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => wizardStepNum > 1 && setWizardStep(wizardStepNum - 1)}
                disabled={wizardStepNum === 1}
                className="px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors disabled:opacity-40"
                style={{ borderColor: '#1e4d6b', color: '#1e4d6b' }}
              >
                Previous
              </button>
              {wizardStepNum < 7 ? (
                <button
                  onClick={() => {
                    if (!canNext()) {
                      toast.warning(wizardStepNum === 1 ? 'Product name is required' : 'At least one CCP is required');
                      return;
                    }
                    setWizardStep(wizardStepNum + 1);
                  }}
                  className="px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#1e4d6b' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleTemplateSave}
                  className="inline-flex items-center px-6 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#1e4d6b' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save HACCP Plan
                </button>
              )}
            </div>
          </div>
          );
        })()}
      </div>

    </>
  );
}
