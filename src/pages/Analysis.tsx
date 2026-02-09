import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle, ArrowRight, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { scoreImpactData, locations, getWeights } from '../data/demoData';

export function Analysis() {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [actionLocationFilter, setActionLocationFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Two-scenario projection: No Action (decline) vs Recommended Actions (improve)
  const scoreProjectionData = [
    { week: '12w ago', actual: 65, noAction: null, recommended: null },
    { week: '11w ago', actual: 68, noAction: null, recommended: null },
    { week: '10w ago', actual: 70, noAction: null, recommended: null },
    { week: '9w ago', actual: 69, noAction: null, recommended: null },
    { week: '8w ago', actual: 71, noAction: null, recommended: null },
    { week: '7w ago', actual: 72, noAction: null, recommended: null },
    { week: '6w ago', actual: 73, noAction: null, recommended: null },
    { week: '5w ago', actual: 74, noAction: null, recommended: null },
    { week: '4w ago', actual: 74, noAction: null, recommended: null },
    { week: '3w ago', actual: 75, noAction: null, recommended: null },
    { week: '2w ago', actual: 74, noAction: null, recommended: null },
    { week: '1w ago', actual: 74, noAction: null, recommended: null },
    { week: 'Now', actual: 74, noAction: 74, recommended: 74 },
    { week: '+1w', actual: null, noAction: 72, recommended: 76 },
    { week: '+2w', actual: null, noAction: 70, recommended: 78 },
    { week: '+3w', actual: null, noAction: 67, recommended: 80 },
    { week: '+4w', actual: null, noAction: 65, recommended: 82 },
  ];

  const operationalTrend = [
    { week: '12w', score: 72 }, { week: '11w', score: 74 }, { week: '10w', score: 76 },
    { week: '9w', score: 75 }, { week: '8w', score: 77 }, { week: '7w', score: 78 },
    { week: '6w', score: 79 }, { week: '5w', score: 80 }, { week: '4w', score: 81 },
    { week: '3w', score: 82 }, { week: '2w', score: 83 }, { week: 'Now', score: 84 },
  ];

  const equipmentTrend = [
    { week: '12w', score: 68 }, { week: '11w', score: 70 }, { week: '10w', score: 71 },
    { week: '9w', score: 70 }, { week: '8w', score: 72 }, { week: '7w', score: 73 },
    { week: '6w', score: 74 }, { week: '5w', score: 75 }, { week: '4w', score: 76 },
    { week: '3w', score: 77 }, { week: '2w', score: 78 }, { week: 'Now', score: 79 },
  ];

  const documentationTrend = [
    { week: '12w', score: 55 }, { week: '11w', score: 58 }, { week: '10w', score: 60 },
    { week: '9w', score: 61 }, { week: '8w', score: 63 }, { week: '7w', score: 64 },
    { week: '6w', score: 65 }, { week: '5w', score: 66 }, { week: '4w', score: 65 },
    { week: '3w', score: 66 }, { week: '2w', score: 67 }, { week: 'Now', score: 68 },
  ];

  const risks: { title: string; severity: 'critical' | 'warning' | 'info'; description: string; action: string; href: string }[] = [
    {
      title: 'Fire Suppression Inspection',
      severity: 'critical',
      description: 'Certificate expires in 15 days. If not renewed, Equipment score drops 20 points.',
      action: 'Schedule Inspection',
      href: '/vendors',
    },
    {
      title: 'Food Handler Certifications',
      severity: 'warning',
      description: '2 staff certs expire within 45 days. Documentation score will drop 15 points.',
      action: 'View Team Certs',
      href: '/team',
    },
    {
      title: 'Temperature Log Gaps',
      severity: 'info',
      description: 'Airport Cafe has missed 3 logs in the past week. Trend suggests potential coverage gap on weekends.',
      action: 'View Temp Logs',
      href: '/temp-logs',
    },
  ];

  const downtownTrends = {
    operational: operationalTrend.map((d) => ({ ...d, score: Math.min(100, d.score + 10) })),
    equipment: equipmentTrend.map((d) => ({ ...d, score: Math.min(100, d.score + 12) })),
    documentation: documentationTrend.map((d) => ({ ...d, score: Math.min(100, d.score + 20) })),
  };
  const airportTrends = {
    operational: operationalTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 4) })),
    equipment: equipmentTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 8) })),
    documentation: documentationTrend.map((d) => ({ ...d, score: Math.max(0, d.score + 3) })),
  };
  const universityTrends = {
    operational: operationalTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 18) })),
    equipment: equipmentTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 22) })),
    documentation: documentationTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 15) })),
  };
  // All = average of 3 locations
  const allTrends = {
    operational: operationalTrend.map((d, i) => ({ ...d, score: Math.round((downtownTrends.operational[i].score + airportTrends.operational[i].score + universityTrends.operational[i].score) / 3) })),
    equipment: equipmentTrend.map((d, i) => ({ ...d, score: Math.round((downtownTrends.equipment[i].score + airportTrends.equipment[i].score + universityTrends.equipment[i].score) / 3) })),
    documentation: documentationTrend.map((d, i) => ({ ...d, score: Math.round((downtownTrends.documentation[i].score + airportTrends.documentation[i].score + universityTrends.documentation[i].score) / 3) })),
  };
  const locationTrends = {
    'all': allTrends,
    'downtown': downtownTrends,
    'airport': airportTrends,
    'university': universityTrends,
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

  // Parse "X of Y" impact strings → recoverable points = Y - X
  const getRecoverablePoints = (impact: string): number => {
    const match = impact.match(/(\d+)\s*of\s*(\d+)/);
    if (match) return parseInt(match[2]) - parseInt(match[1]);
    // Handle plain negative like "-12"
    const neg = impact.match(/^-(\d+)$/);
    if (neg) return parseInt(neg[1]);
    return 0;
  };

  const allActionsToImproveScore = scoreImpactData
    .filter(item => item.status !== 'current')
    .map(item => ({
      priority: item.status === 'overdue' || item.status === 'expired' || item.status === 'missing' ? 'HIGH' : item.status === 'due_soon' ? 'MEDIUM' : 'LOW',
      action: item.label,
      pillar: item.pillar,
      pointImpact: getRecoverablePoints(item.impact),
      location: locations.find(loc => loc.id === item.locationId)?.name || '',
      locationId: locations.find(loc => loc.id === item.locationId)?.urlId || '',
      link: item.actionLink || '/dashboard',
      actionLabel: item.action || 'View'
    }))
    .sort((a, b) => {
      const prioOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const prioDiff = (prioOrder[a.priority] ?? 3) - (prioOrder[b.priority] ?? 3);
      if (prioDiff !== 0) return prioDiff;
      return b.pointImpact - a.pointImpact;
    });

  const actionsToImproveScore = allActionsToImproveScore.filter(a => {
    if (actionLocationFilter !== 'all' && a.locationId !== actionLocationFilter) return false;
    if (severityFilter !== 'all' && a.priority !== severityFilter) return false;
    return true;
  });

  const getRiskStyles = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical': return { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', iconColor: '#dc2626' };
      case 'warning': return { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', iconColor: '#d97706' };
      case 'info': return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', iconColor: '#2563eb' };
    }
  };

  const getRiskIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-6 w-6" style={{ color: '#dc2626' }} />;
      case 'warning': return <AlertTriangle className="h-6 w-6" style={{ color: '#d97706' }} />;
      case 'info': return <Info className="h-6 w-6" style={{ color: '#2563eb' }} />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      HIGH: { bg: '#fee2e2', text: '#991b1b' },
      MEDIUM: { bg: '#fef9c3', text: '#854d0e' },
      LOW: { bg: '#dcfce7', text: '#166534' },
    };
    const s = styles[priority] || { bg: '#f3f4f6', text: '#374151' };
    return (
      <span style={{ backgroundColor: s.bg, color: s.text, padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>
        {priority}
      </span>
    );
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Analysis' }]} />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Predictive Compliance Analysis</h1>
            <p className="text-sm text-gray-600 mt-1">AI-powered insights to prevent compliance issues before they happen</p>
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

        {/* Risk Forecast */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Forecast (Next 30 Days)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentRisks.map((risk, index) => {
              const s = getRiskStyles(risk.severity);
              return (
                <div key={index} style={{ backgroundColor: s.bg, border: `2px solid ${s.border}`, borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '14px', color: s.text }}>{risk.title}</h3>
                    {getRiskIcon(risk.severity)}
                  </div>
                  <p style={{ fontSize: '13px', color: s.text, marginBottom: '16px', opacity: 0.85 }}>{risk.description}</p>
                  <button
                    onClick={() => navigate(risk.href)}
                    style={{ backgroundColor: s.border, color: 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {risk.action}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Score Projection with two scenario lines */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Score Projection</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scoreProjectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis domain={[50, 100]} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Inspection Ready', position: 'right', fill: '#22c55e', fontSize: 11 }} />
              <ReferenceLine y={70} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Needs Attention', position: 'right', fill: '#eab308', fontSize: 11 }} />
              <Line type="monotone" dataKey="actual" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 3 }} name="Actual Score" connectNulls={false} />
              <Line type="monotone" dataKey="noAction" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} name="No Action" connectNulls={false} />
              <Line type="monotone" dataKey="recommended" stroke="#22c55e" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} name="Recommended Actions" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingDown className="h-4 w-4" style={{ color: '#ef4444' }} />
              <span style={{ color: '#991b1b' }}>No action: score drops to ~65 in 4 weeks</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp className="h-4 w-4" style={{ color: '#22c55e' }} />
              <span style={{ color: '#166534' }}>Complete actions: score reaches ~82 in 4 weeks</span>
            </div>
          </div>
        </div>

        {/* Actions to Improve Score */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Actions to Improve Score</h2>
                <p className="text-sm text-gray-600">Complete these actions to increase your compliance score — sorted by priority then point impact</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={actionLocationFilter}
                  onChange={(e) => setActionLocationFilter(e.target.value)}
                  style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', backgroundColor: 'white', cursor: 'pointer' }}
                >
                  <option value="all">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc.urlId} value={loc.urlId}>{loc.name}</option>
                  ))}
                </select>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', backgroundColor: 'white', cursor: 'pointer' }}
                >
                  <option value="all">All Severities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pillar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Point Impact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {actionsToImproveScore.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                      No actions match the selected filters. Try adjusting the location or severity filter.
                    </td>
                  </tr>
                ) : actionsToImproveScore.map((action, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(action.priority)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{action.action}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span style={{ padding: '2px 10px', fontSize: '12px', fontWeight: 500, borderRadius: '9999px', backgroundColor: action.pillar === 'Operational' ? '#dbeafe' : action.pillar === 'Equipment' ? '#dcfce7' : '#fef3c7', color: action.pillar === 'Operational' ? '#1e4d6b' : action.pillar === 'Equipment' ? '#166534' : '#92400e' }}>
                        {action.pillar}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: '#1e4d6b' }}>+{action.pointImpact} pts</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{action.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(action.link)}
                        className="bg-[#1e4d6b] text-white text-xs font-medium px-3 py-1 rounded-lg hover:bg-[#163a52] transition-colors duration-150 flex items-center gap-1"
                      >
                        Take Action
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance Trends */}
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
                  <Line type="monotone" dataKey="score" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 2 }} />
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
                  <Line type="monotone" dataKey="score" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 2 }} />
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
                  <Line type="monotone" dataKey="score" stroke="#d4af37" strokeWidth={2} dot={{ r: 2 }} />
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
    </>
  );
}
