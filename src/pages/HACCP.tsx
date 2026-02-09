import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Thermometer, Shield, Activity, ChevronRight, XCircle, MapPin } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';

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
  source: 'temp_log' | 'checklist';
  equipmentName?: string;
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
        lastReading: '38°F',
        lastReadingValue: 38,
        lastReadingUnit: '°F',
        isWithinLimit: true,
        lastMonitoredAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        lastMonitoredBy: 'Mike Johnson',
        source: 'temp_log',
        equipmentName: 'Walk-in Cooler',
      },
      {
        id: 'cold-2',
        ccpNumber: 'CCP-4',
        hazard: 'Bacterial growth in frozen foods',
        criticalLimit: 'Freezer temperature: -10 to 0°F',
        monitoringProcedure: 'Check and log temperature at opening and closing',
        correctiveAction: 'Adjust thermostat. Transfer food to working freezer. Call for repair.',
        verification: 'Manager reviews temperature logs daily',
        lastReading: '-2°F',
        lastReadingValue: -2,
        lastReadingUnit: '°F',
        isWithinLimit: true,
        lastMonitoredAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        lastMonitoredBy: 'Mike Johnson',
        source: 'temp_log',
        equipmentName: 'Walk-in Freezer',
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
      },
    ],
  },
];

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
  },
];

// ── Component ──────────────────────────────────────────────────────

export function HACCP() {
  const [activeTab, setActiveTab] = useState<'plans' | 'monitoring' | 'corrective'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<HACCPPlan | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Aggregate stats
  const allCCPs = HACCP_PLANS.flatMap((p) => p.ccps);
  const totalCCPs = allCCPs.length;
  const passingCCPs = allCCPs.filter((c) => c.isWithinLimit).length;
  const failingCCPs = totalCCPs - passingCCPs;
  const overallCompliance = totalCCPs > 0 ? Math.round((passingCCPs / totalCCPs) * 100) : 100;
  const openActions = CORRECTIVE_ACTIONS.filter((a) => a.status === 'open' || a.status === 'in_progress').length;

  const getPlanCompliance = (plan: HACCPPlan) => {
    const total = plan.ccps.length;
    const passing = plan.ccps.filter((c) => c.isWithinLimit).length;
    return total > 0 ? Math.round((passing / total) * 100) : 100;
  };

  const getPlanStatus = (plan: HACCPPlan) => {
    const hasFailures = plan.ccps.some((c) => !c.isWithinLimit);
    if (hasFailures) return 'critical';
    if (plan.status === 'needs_review') return 'review';
    return 'good';
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'HACCP' }]} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HACCP Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Roll-up view — data pulled from Temperature Logs and Checklists
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              <option value="all">All Locations</option>
              <option value="downtown">Downtown</option>
              <option value="airport">Airport Terminal</option>
              <option value="university">University District</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Shield className="h-5 w-5 text-[#1e4d6b]" />
              <span className="text-sm text-gray-600">Active Plans</span>
            </div>
            <p className="text-2xl font-bold text-[#1e4d6b]">{HACCP_PLANS.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Activity className="h-5 w-5 text-[#1e4d6b]" />
              <span className="text-sm text-gray-600">Overall Compliance</span>
            </div>
            <p className={`text-2xl font-bold ${overallCompliance === 100 ? 'text-green-600' : overallCompliance >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
              {overallCompliance}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-600">CCPs in Compliance</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{passingCCPs}/{totalCCPs}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-gray-600">Open Actions</span>
            </div>
            <p className={`text-2xl font-bold ${openActions > 0 ? 'text-red-600' : 'text-green-600'}`}>{openActions}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('plans'); setSelectedPlan(null); }}
            className={`px-6 py-3 font-medium ${
              activeTab === 'plans'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Plans ({HACCP_PLANS.length})
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'monitoring'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monitoring ({totalCCPs} CCPs)
          </button>
          <button
            onClick={() => setActiveTab('corrective')}
            className={`px-6 py-3 font-medium flex items-center space-x-2 ${
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
        </div>

        {/* ── Plans Tab ─────────────────────────────────────── */}
        {activeTab === 'plans' && !selectedPlan && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {HACCP_PLANS.map((plan) => {
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
                  className="bg-white rounded-lg shadow p-5 hover:shadow-lg transition-shadow cursor-pointer border-l-4"
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
                      <p className="text-xs text-gray-500">CCPs</p>
                      <p className="text-lg font-bold text-[#1e4d6b]">{plan.ccps.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Compliance</p>
                      <p className={`text-lg font-bold ${compliance === 100 ? 'text-green-600' : compliance >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                        {compliance}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Check</p>
                      <p className="text-sm font-medium text-gray-700">{getRelativeTime(new Date(lastMonitored).toISOString())}</p>
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
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Plan Detail View ──────────────────────────────── */}
        {activeTab === 'plans' && selectedPlan && (
          <div>
            {/* Breadcrumb navigation */}
            <div className="flex items-center space-x-2 text-sm mb-4">
              <span
                onClick={() => setSelectedPlan(null)}
                className="text-[#1e4d6b] hover:text-[#2a6a8f] cursor-pointer font-medium"
              >
                HACCP Plans
              </span>
              <span className="text-gray-400">›</span>
              <span className="text-gray-600">{selectedPlan.name}</span>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPlan.name}</h2>
                  <p className="text-gray-600 mt-1">{selectedPlan.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Last reviewed: {new Date(selectedPlan.lastReviewed).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold ${getPlanCompliance(selectedPlan) === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                    {getPlanCompliance(selectedPlan)}%
                  </p>
                  <p className="text-xs text-gray-500">Compliance</p>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical Control Points</h3>
            <div className="space-y-4">
              {selectedPlan.ccps.map((ccp) => (
                <div
                  key={ccp.id}
                  className={`bg-white rounded-lg shadow p-5 border-l-4 ${ccp.isWithinLimit ? 'border-l-green-500' : 'border-l-red-500'}`}
                >
                  <div className="flex items-start justify-between mb-4">
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
        {activeTab === 'monitoring' && (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Real-time status of all Critical Control Points across HACCP plans. Readings pulled from Temperature Logs and Checklists.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {HACCP_PLANS.flatMap((plan) =>
                plan.ccps.map((ccp) => (
                  <div
                    key={ccp.id}
                    className={`bg-white rounded-lg shadow p-4 border-t-4 ${ccp.isWithinLimit ? 'border-t-green-500' : 'border-t-red-500'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
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
                      <div className="flex justify-between">
                        <span className="text-gray-500">Source</span>
                        <span className="text-gray-700 font-medium">{ccp.source === 'temp_log' ? 'Temperature Log' : 'Checklist'}</span>
                      </div>
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
        {activeTab === 'corrective' && (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Auto-generated when critical limits are exceeded. Actions are linked to the source monitoring data.
              </p>
            </div>

            {/* Open Actions First */}
            {CORRECTIVE_ACTIONS.filter((a) => a.status === 'open' || a.status === 'in_progress').length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-3">
                  Open Actions ({CORRECTIVE_ACTIONS.filter((a) => a.status === 'open' || a.status === 'in_progress').length})
                </h3>
                <div className="space-y-4">
                  {CORRECTIVE_ACTIONS.filter((a) => a.status === 'open' || a.status === 'in_progress').map((action) => {
                    const workflowSteps = ['Identified', 'Assigned', 'In Progress', 'Resolved'];
                    const currentStep = action.status === 'open' ? 0 : action.status === 'in_progress' ? 2 : 3;
                    return (
                    <div key={action.id} className="bg-white rounded-lg shadow p-5 border-l-4 border-l-red-500">
                      <div className="flex items-start justify-between mb-3">
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
                      <div className="mb-4 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
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
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resolved Actions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Resolved ({CORRECTIVE_ACTIONS.filter((a) => a.status === 'resolved').length})
              </h3>
              <div className="space-y-4">
                {CORRECTIVE_ACTIONS.filter((a) => a.status === 'resolved').map((action) => (
                  <div key={action.id} className="bg-white rounded-lg shadow p-5 border-l-4 border-l-green-500">
                    <div className="flex items-start justify-between mb-3">
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
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
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
      </div>
    </>
  );
}
