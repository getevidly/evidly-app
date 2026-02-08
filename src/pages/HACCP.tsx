import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { ClipboardList, Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';

interface HACCPPlan {
  id: string;
  name: string;
  product_process: string;
  ccp_count: number;
  last_reviewed: string;
  status: 'active' | 'needs_review' | 'draft';
}

interface CCP {
  id: string;
  ccp_number: number;
  hazard: string;
  critical_limits: string;
  monitoring_procedure: string;
  corrective_action: string;
  verification: string;
}

interface MonitoringRecord {
  id: string;
  plan_name: string;
  ccp_number: number;
  ccp_hazard: string;
  result: 'pass' | 'fail';
  recorded_value: string;
  corrective_action: string | null;
  monitored_by: string;
  monitored_at: string;
}

interface CorrectiveActionRecord {
  id: string;
  plan_name: string;
  ccp_number: number;
  deviation: string;
  action_taken: string;
  verified_by: string | null;
  status: 'open' | 'resolved';
  created_at: string;
}

const demoPlans: HACCPPlan[] = [
  {
    id: '1',
    name: 'Cooking Process',
    product_process: 'Cooking of meat, poultry, and seafood',
    ccp_count: 3,
    last_reviewed: '2025-01-15',
    status: 'active',
  },
  {
    id: '2',
    name: 'Cold Storage Management',
    product_process: 'Refrigeration and freezer storage',
    ccp_count: 2,
    last_reviewed: '2025-01-15',
    status: 'active',
  },
];

const cookingCCPs: CCP[] = [
  {
    id: '1',
    ccp_number: 1,
    hazard: 'Bacterial survival (Salmonella, E. coli)',
    critical_limits: 'Internal temp: Poultry 165°F, Ground meat 155°F, Whole meat 145°F',
    monitoring_procedure: 'Check internal temperature with calibrated thermometer',
    corrective_action: 'Continue cooking until proper temperature reached. Discard if unsafe.',
    verification: 'Supervisor review of logs daily. Thermometer calibration weekly.',
  },
  {
    id: '2',
    ccp_number: 2,
    hazard: 'Cross-contamination during prep',
    critical_limits: 'Separate cutting boards and utensils for raw and cooked foods',
    monitoring_procedure: 'Visual inspection of color-coded equipment use',
    corrective_action: 'Retrain staff. Sanitize equipment. Discard contaminated food.',
    verification: 'Manager spot checks during service',
  },
  {
    id: '3',
    ccp_number: 3,
    hazard: 'Time-temperature abuse during holding',
    critical_limits: 'Hot foods held at 135°F or above',
    monitoring_procedure: 'Check holding temperatures every 2 hours',
    corrective_action: 'Reheat to 165°F if below 135°F for less than 2 hours. Discard if longer.',
    verification: 'Review holding logs daily',
  },
];

const coldStorageCCPs: CCP[] = [
  {
    id: '4',
    ccp_number: 1,
    hazard: 'Bacterial growth in refrigerated foods',
    critical_limits: 'Refrigerator temperature: 32-41°F',
    monitoring_procedure: 'Check and log temperature at opening, mid-shift, and closing',
    corrective_action: 'Adjust thermostat. Transfer food to working unit. Call for repair.',
    verification: 'Manager reviews temperature logs daily',
  },
  {
    id: '5',
    ccp_number: 2,
    hazard: 'Bacterial growth in frozen foods',
    critical_limits: 'Freezer temperature: -10 to 0°F',
    monitoring_procedure: 'Check and log temperature at opening and closing',
    corrective_action: 'Adjust thermostat. Transfer food to working freezer. Call for repair.',
    verification: 'Manager reviews temperature logs daily',
  },
];

const demoMonitoring: MonitoringRecord[] = [
  {
    id: '1',
    plan_name: 'Cooking Process',
    ccp_number: 1,
    ccp_hazard: 'Bacterial survival',
    result: 'pass',
    recorded_value: '167°F (Chicken breast)',
    corrective_action: null,
    monitored_by: 'John Smith',
    monitored_at: new Date().toISOString(),
  },
  {
    id: '2',
    plan_name: 'Cold Storage Management',
    ccp_number: 1,
    ccp_hazard: 'Bacterial growth in refrigerated foods',
    result: 'fail',
    recorded_value: '45°F (Walk-in cooler)',
    corrective_action: 'Adjusted thermostat to lower setting. Called repair technician.',
    monitored_by: 'Sarah Johnson',
    monitored_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

const demoCorrectiveActions: CorrectiveActionRecord[] = [
  {
    id: '1',
    plan_name: 'Cold Storage Management',
    ccp_number: 1,
    deviation: 'Walk-in cooler temperature at 45°F (Critical limit: 32-41°F)',
    action_taken: 'Adjusted thermostat to lower setting. HVAC technician called and scheduled for repair. Temperature returned to 38°F within 1 hour. All food items inspected and deemed safe.',
    verified_by: 'Mike Davis (Kitchen Manager)',
    status: 'resolved',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    plan_name: 'Cooking Process',
    ccp_number: 2,
    deviation: 'Raw chicken observed on cutting board designated for vegetables',
    action_taken: 'Cutting board and area sanitized immediately. Staff member retrained on color-coded equipment system. Contaminated vegetables discarded.',
    verified_by: 'Sarah Johnson (Supervisor)',
    status: 'resolved',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function HACCP() {
  const [activeTab, setActiveTab] = useState<'plans' | 'monitoring' | 'corrective'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<HACCPPlan | null>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'needs_review':
        return 'bg-amber-100 text-amber-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewPlan = (plan: HACCPPlan) => {
    setSelectedPlan(plan);
    setShowPlanDetails(true);
  };

  const getCurrentCCPs = () => {
    if (!selectedPlan) return [];
    return selectedPlan.id === '1' ? cookingCCPs : coldStorageCCPs;
  };

  return (
    <Layout title="HACCP">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'HACCP' }]} />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HACCP Management</h1>
            <p className="text-sm text-gray-600 mt-1">Hazard Analysis and Critical Control Points</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] transition-colors shadow-sm">
            <Plus className="h-5 w-5" />
            <span>Create New Plan</span>
          </button>
        </div>

        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'plans'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Plans
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'monitoring'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monitoring
          </button>
          <button
            onClick={() => setActiveTab('corrective')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'corrective'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Corrective Actions
          </button>
        </div>

        {activeTab === 'plans' && !showPlanDetails && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {demoPlans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{plan.product_process}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(plan.status)}`}>
                    {plan.status === 'active' ? 'Active' : plan.status === 'needs_review' ? 'Needs Review' : 'Draft'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Critical Control Points</p>
                    <p className="text-2xl font-bold text-[#1e4d6b]">{plan.ccp_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Reviewed</p>
                    <p className="text-sm font-medium text-gray-900">{format(new Date(plan.last_reviewed), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleViewPlan(plan)}
                  className="w-full px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] transition-colors font-medium"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'plans' && showPlanDetails && selectedPlan && (
          <div>
            <button
              onClick={() => setShowPlanDetails(false)}
              className="mb-4 text-[#1e4d6b] hover:text-[#2a6a8f] font-medium"
            >
              ← Back to Plans
            </button>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPlan.name}</h2>
                  <p className="text-gray-600 mt-1">{selectedPlan.product_process}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPlan.status)}`}>
                  {selectedPlan.status === 'active' ? 'Active' : 'Needs Review'}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Flow Diagram</h3>
                <p className="text-gray-700">
                  {selectedPlan.id === '1'
                    ? 'Receiving → Cold Storage → Prep → Cooking → Holding/Service → Cooling (if applicable) → Reheating (if applicable)'
                    : 'Receiving → Temperature Check → Cold Storage → Temperature Monitoring → Service Prep'}
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Hazard Analysis Summary</h3>
                <p className="text-gray-700">
                  {selectedPlan.id === '1'
                    ? 'Primary biological hazards: Salmonella, E. coli, Listeria. Chemical hazards: Cleaning agents. Physical hazards: Foreign objects.'
                    : 'Primary biological hazards: Bacterial growth due to temperature abuse. Time-temperature relationship critical for safety.'}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical Control Points</h3>
                <div className="space-y-4">
                  {getCurrentCCPs().map((ccp) => (
                    <div key={ccp.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-[#1e4d6b] text-white rounded-full flex items-center justify-center font-bold mr-3">
                          {ccp.ccp_number}
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">{ccp.hazard}</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Critical Limits</p>
                          <p className="text-gray-600">{ccp.critical_limits}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Monitoring Procedure</p>
                          <p className="text-gray-600">{ccp.monitoring_procedure}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Corrective Action</p>
                          <p className="text-gray-600">{ccp.corrective_action}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Verification</p>
                          <p className="text-gray-600">{ccp.verification}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Daily CCP Monitoring</h2>
              <p className="text-sm text-gray-600">Record monitoring data for Critical Control Points</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700">Date/Time</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700">Plan</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700">CCP</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700">Recorded Value</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700">Result</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700">Monitored By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {demoMonitoring.map((record) => (
                    <tr key={record.id} className={record.result === 'fail' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="py-3 px-6 text-sm text-gray-900">
                        {format(new Date(record.monitored_at), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-900">{record.plan_name}</td>
                      <td className="py-3 px-6 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">CCP {record.ccp_number}</p>
                          <p className="text-xs">{record.ccp_hazard}</p>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-900">{record.recorded_value}</td>
                      <td className="py-3 px-6">
                        {record.result === 'pass' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Pass
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Fail
                            </span>
                            {record.corrective_action && (
                              <p className="text-xs text-gray-600 mt-1">{record.corrective_action}</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-900">{record.monitored_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'corrective' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Corrective Action Log</h2>
              <p className="text-sm text-gray-600">All corrective actions taken across HACCP monitoring</p>
            </div>

            <div className="p-6 space-y-4">
              {demoCorrectiveActions.map((action) => (
                <div key={action.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-6 w-6 text-amber-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{action.plan_name} - CCP {action.ccp_number}</h3>
                        <p className="text-sm text-gray-600">{format(new Date(action.created_at), 'MMM d, yyyy h:mm a')}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        action.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {action.status === 'resolved' ? 'Resolved' : 'Open'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Deviation:</p>
                      <p className="text-sm text-gray-900">{action.deviation}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Action Taken:</p>
                      <p className="text-sm text-gray-900">{action.action_taken}</p>
                    </div>
                    {action.verified_by && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Verified By:</p>
                        <p className="text-sm text-gray-900">{action.verified_by}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
