import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Breadcrumb } from '../components/Breadcrumb';
import { AlertTriangle, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { scoreImpactData, locations, getWeights } from '../data/demoData';

export function Analysis() {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState('all');

  const scoreProjectionData = [
    { week: '12w ago', actual: 65, projected: null },
    { week: '11w ago', actual: 68, projected: null },
    { week: '10w ago', actual: 70, projected: null },
    { week: '9w ago', actual: 69, projected: null },
    { week: '8w ago', actual: 71, projected: null },
    { week: '7w ago', actual: 72, projected: null },
    { week: '6w ago', actual: 73, projected: null },
    { week: '5w ago', actual: 74, projected: null },
    { week: '4w ago', actual: 74, projected: null },
    { week: '3w ago', actual: 75, projected: null },
    { week: '2w ago', actual: 75, projected: null },
    { week: '1w ago', actual: 75, projected: null },
    { week: 'Now', actual: 75, projected: 75 },
    { week: '+1w', actual: null, projected: 77 },
    { week: '+2w', actual: null, projected: 79 },
    { week: '+3w', actual: null, projected: 81 },
    { week: '+4w', actual: null, projected: 82 },
  ];

  const operationalTrend = [
    { week: '12w', score: 72 },
    { week: '11w', score: 74 },
    { week: '10w', score: 76 },
    { week: '9w', score: 75 },
    { week: '8w', score: 77 },
    { week: '7w', score: 78 },
    { week: '6w', score: 79 },
    { week: '5w', score: 80 },
    { week: '4w', score: 81 },
    { week: '3w', score: 82 },
    { week: '2w', score: 83 },
    { week: 'Now', score: 84 },
  ];

  const equipmentTrend = [
    { week: '12w', score: 68 },
    { week: '11w', score: 70 },
    { week: '10w', score: 71 },
    { week: '9w', score: 70 },
    { week: '8w', score: 72 },
    { week: '7w', score: 73 },
    { week: '6w', score: 74 },
    { week: '5w', score: 75 },
    { week: '4w', score: 76 },
    { week: '3w', score: 77 },
    { week: '2w', score: 78 },
    { week: 'Now', score: 79 },
  ];

  const documentationTrend = [
    { week: '12w', score: 55 },
    { week: '11w', score: 58 },
    { week: '10w', score: 60 },
    { week: '9w', score: 61 },
    { week: '8w', score: 63 },
    { week: '7w', score: 64 },
    { week: '6w', score: 65 },
    { week: '5w', score: 66 },
    { week: '4w', score: 65 },
    { week: '3w', score: 66 },
    { week: '2w', score: 67 },
    { week: 'Now', score: 68 },
  ];

  const risks = [
    {
      title: 'Fire Suppression Inspection',
      severity: 'HIGH',
      description: 'Certificate expires in 15 days. If not renewed, Equipment score drops 20 points.',
      action: 'Schedule Inspection',
      href: '/vendors',
    },
    {
      title: 'Food Handler Certifications',
      severity: 'MEDIUM',
      description: '2 staff certs expire within 45 days. Documentation score will drop 15 points.',
      action: 'View Team Certs',
      href: '/team',
    },
    {
      title: 'Temperature Log Gaps',
      severity: 'LOW',
      description: 'Airport Cafe has missed 3 logs in the past week. Trend suggests potential coverage gap on weekends.',
      action: 'View Temp Logs',
      href: '/temp-logs',
    },
  ];

  // Per-location trend data
  const locationTrends = {
    'all': { operational: operationalTrend, equipment: equipmentTrend, documentation: documentationTrend },
    'downtown': {
      operational: operationalTrend.map((d) => ({ ...d, score: Math.min(100, d.score + 10) })),
      equipment: equipmentTrend.map((d) => ({ ...d, score: Math.min(100, d.score + 12) })),
      documentation: documentationTrend.map((d) => ({ ...d, score: Math.min(100, d.score + 20) })),
    },
    'airport': {
      operational: operationalTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 4) })),
      equipment: equipmentTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 8) })),
      documentation: documentationTrend.map((d) => ({ ...d, score: Math.max(0, d.score + 3) })),
    },
    'university': {
      operational: operationalTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 18) })),
      equipment: equipmentTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 22) })),
      documentation: documentationTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 15) })),
    },
  } as Record<string, { operational: typeof operationalTrend; equipment: typeof equipmentTrend; documentation: typeof documentationTrend }>;

  const currentTrends = locationTrends[selectedLocation] || locationTrends['all'];
  const opStart = currentTrends.operational[0].score;
  const opEnd = currentTrends.operational[currentTrends.operational.length - 1].score;
  const eqStart = currentTrends.equipment[0].score;
  const eqEnd = currentTrends.equipment[currentTrends.equipment.length - 1].score;
  const docStart = currentTrends.documentation[0].score;
  const docEnd = currentTrends.documentation[currentTrends.documentation.length - 1].score;

  const locationRisks = { 'all': risks, 'downtown': [risks[0]], 'airport': [risks[1], risks[2]], 'university': risks } as Record<string, typeof risks>;
  const currentRisks = locationRisks[selectedLocation] || risks;

  const actions = [
    { priority: 'HIGH', action: 'Renew fire suppression cert', impact: '+8 points', deadline: 'Feb 20', href: '/vendors' },
    { priority: 'HIGH', action: 'Complete missing temp logs at Airport Cafe', impact: '+5 points', deadline: 'Today', href: '/temp-logs' },
    { priority: 'MEDIUM', action: 'Upload updated COI for Valley Fire', impact: '+4 points', deadline: 'Mar 1', href: '/vendors' },
    { priority: 'MEDIUM', action: 'Renew food handler certs (2 staff)', impact: '+3 points', deadline: 'Mar 7', href: '/team' },
    { priority: 'LOW', action: 'Complete weekend checklists consistently', impact: '+2 points', deadline: 'Ongoing', href: '/checklists' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 border-red-300 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'LOW': return 'bg-green-100 border-green-300 text-green-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH': return <AlertTriangle className="h-6 w-6 text-red-600" />;
      case 'MEDIUM': return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case 'LOW': return <CheckCircle className="h-6 w-6 text-green-600" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 font-semibold';
      case 'MEDIUM': return 'text-yellow-600 font-semibold';
      case 'LOW': return 'text-green-600 font-semibold';
      default: return 'text-gray-600';
    }
  };

  const getPointImpact = (impact: string) => {
    const match = impact.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  const actionsToImproveScore = scoreImpactData
    .filter(item => item.status !== 'current')
    .map(item => ({
      priority: item.status === 'overdue' || item.status === 'expired' || item.status === 'missing' ? 'HIGH' : item.status === 'due_soon' ? 'MEDIUM' : 'LOW',
      action: item.label,
      pillar: item.pillar,
      pointImpact: getPointImpact(item.impact),
      location: locations.find(loc => loc.id === item.locationId)?.name || '',
      link: item.actionLink || '/dashboard'
    }))
    .sort((a, b) => b.pointImpact - a.pointImpact);

  return (
    <Layout title="Analysis">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Analysis' }]} />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Predictive Compliance Analysis</h1>
            <p className="text-gray-600 mt-1">AI-powered insights to prevent compliance issues before they happen</p>
          </div>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
          >
            <option value="all">All Locations (Org Average)</option>
            {locations.map(loc => (
              <option key={loc.urlId} value={loc.urlId}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Forecast (Next 30 Days)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentRisks.map((risk, index) => (
              <div key={index} className={`rounded-lg border-2 p-4 ${getSeverityColor(risk.severity)}`}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-sm">{risk.title}</h3>
                  {getSeverityIcon(risk.severity)}
                </div>
                <p className="text-sm mb-4">{risk.description}</p>
                <button
                  onClick={() => { navigate(risk.href); }}
                  className="flex items-center text-sm font-medium hover:underline"
                >
                  {risk.action}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Score Projection</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scoreProjectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Inspection Ready', position: 'right', fill: '#22c55e', fontSize: 12 }} />
              <ReferenceLine y={70} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Needs Attention', position: 'right', fill: '#eab308', fontSize: 12 }} />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Actual Score" />
              <Line type="monotone" dataKey="projected" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Projected Score" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-600 mt-4">
            <TrendingUp className="inline h-4 w-4 text-green-600 mr-1" />
            Your compliance score is trending upward. Complete recommended actions to reach 82% in 4 weeks.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Actions to Improve Score</h2>
            <p className="text-sm text-gray-600">Complete these actions to increase your compliance score — sorted by point impact</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pillar Impacted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Point Impact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {actionsToImproveScore.map((action, index) => (
                  <tr
                    key={index}
                    onClick={() => { navigate(action.link); }}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getPriorityColor(action.priority)}>{action.priority}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{action.action}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {action.pillar}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">+{action.pointImpact} pts</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{action.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Trends</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Operational ({Math.round(getWeights().operational * 100)}% weight)</h3>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={currentTrends.operational}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className={`text-xs mt-2 flex items-center ${opEnd >= opStart ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {opEnd >= opStart ? '+' : ''}{opEnd - opStart} points over 12 weeks
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Equipment ({Math.round(getWeights().equipment * 100)}% weight)</h3>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={currentTrends.equipment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className={`text-xs mt-2 flex items-center ${eqEnd >= eqStart ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {eqEnd >= eqStart ? '+' : ''}{eqEnd - eqStart} points over 12 weeks
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Documentation ({Math.round(getWeights().documentation * 100)}% weight)</h3>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={currentTrends.documentation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className={`text-xs mt-2 flex items-center ${docEnd >= docStart ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {docEnd >= docStart ? '+' : ''}{docEnd - docStart} points over 12 weeks
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
