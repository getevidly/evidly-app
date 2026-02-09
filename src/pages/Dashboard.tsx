import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Info,
  Share2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { complianceScores, locationScores, getGrade, locations, scoreImpactData, complianceScoresThirtyDaysAgo, locationScoresThirtyDaysAgo, getTrend, getWeights, needsAttentionItems, vendors as demoVendors } from '../data/demoData';
import { useRole } from '../contexts/RoleContext';
import { QRCodeSVG } from 'qrcode.react';
import { ShareModal } from '../components/ShareModal';
import { AnimatedComplianceScore } from '../components/AnimatedComplianceScore';
import { AnimatedPillarBar } from '../components/AnimatedPillarBar';
import { TimeSavedCounter } from '../components/TimeSavedCounter';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { KitchenDashboard } from './KitchenDashboard';
import { FacilitiesDashboard } from './FacilitiesDashboard';

export function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { userRole } = useRole();

  const params = new URLSearchParams(window.location.search);
  const locationParam = params.get('location') || 'all';
  const selectedLocation = locationParam;
  const tabParam = params.get('tab');
  const validTabs = ['overview', 'progress', 'action', 'vendors', 'history', 'metrics', 'passport'];

  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'action' | 'vendors' | 'history' | 'metrics' | 'passport'>(
    tabParam && validTabs.includes(tabParam) ? tabParam as any : 'overview'
  );
  const [showShareModal, setShowShareModal] = useState(false);
  const [pillarFilter, setPillarFilter] = useState<string | null>(null);

  const currentScores = selectedLocation === 'all' ? complianceScores : locationScores[selectedLocation] || complianceScores;
  const currentScoresThirtyDaysAgo = selectedLocation === 'all' ? complianceScoresThirtyDaysAgo : locationScoresThirtyDaysAgo[selectedLocation] || complianceScoresThirtyDaysAgo;
  const complianceScore = currentScores.overall;
  const operationalScore = currentScores.operational;
  const equipmentScore = currentScores.equipment;
  const documentationScore = currentScores.documentation;

  const overallTrend = getTrend(currentScores.overall, currentScoresThirtyDaysAgo.overall);
  const operationalTrend = getTrend(currentScores.operational, currentScoresThirtyDaysAgo.operational);
  const equipmentTrend = getTrend(currentScores.equipment, currentScoresThirtyDaysAgo.equipment);
  const documentationTrend = getTrend(currentScores.documentation, currentScoresThirtyDaysAgo.documentation);

  const weights = getWeights();
  const pillarScores = [
    { name: 'Operational', weight: Math.round(weights.operational * 100), score: operationalScore, tooltip: 'Temperature logs, checklists, corrective actions, receiving logs, HACCP tasks', trend: operationalTrend },
    { name: 'Equipment', weight: Math.round(weights.equipment * 100), score: equipmentScore, tooltip: 'Hood cleaning, fire suppression, fire extinguishers, grease trap, HVAC service', trend: equipmentTrend },
    { name: 'Documentation', weight: Math.round(weights.documentation * 100), score: documentationScore, tooltip: 'Health permit, business license, vendor certificates, food handler certs, insurance', trend: documentationTrend },
  ].sort((a, b) => b.score - a.score);

  const scoreInfo = getGrade(complianceScore);

  const roleLocations: Record<string, string[]> = {
    management: ['all', 'downtown', 'airport', 'university'],
    kitchen: ['downtown'],
    facilities: ['downtown', 'airport']
  };

  const availableLocations = roleLocations[userRole] || ['all'];
  const filteredLocationOptions = locations.filter(loc => availableLocations.includes(loc.urlId));

  const getScoreHexColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 70) return '#eab308';
    return '#ef4444';
  };

  const historicalData = {
    downtown: [
      { week: 'Week 1', score: 85, date: '12/1' },
      { week: 'Week 2', score: 87, date: '12/8' },
      { week: 'Week 3', score: 86, date: '12/15' },
      { week: 'Week 4', score: 88, date: '12/22' },
      { week: 'Week 5', score: 89, date: '12/29' },
      { week: 'Week 6', score: 90, date: '1/5' },
      { week: 'Week 7', score: 89, date: '1/12' },
      { week: 'Week 8', score: 91, date: '1/19' },
      { week: 'Week 9', score: 90, date: '1/26' },
      { week: 'Week 10', score: 92, date: '2/2' },
      { week: 'Week 11', score: 91, date: '2/9' },
      { week: 'Week 12', score: 92, date: '2/16' },
    ],
    airport: [
      { week: 'Week 1', score: 68, date: '12/1' },
      { week: 'Week 2', score: 69, date: '12/8' },
      { week: 'Week 3', score: 70, date: '12/15' },
      { week: 'Week 4', score: 71, date: '12/22' },
      { week: 'Week 5', score: 70, date: '12/29' },
      { week: 'Week 6', score: 72, date: '1/5' },
      { week: 'Week 7', score: 73, date: '1/12' },
      { week: 'Week 8', score: 71, date: '1/19' },
      { week: 'Week 9', score: 72, date: '1/26' },
      { week: 'Week 10', score: 74, date: '2/2' },
      { week: 'Week 11', score: 73, date: '2/9' },
      { week: 'Week 12', score: 74, date: '2/16' },
    ],
    university: [
      { week: 'Week 1', score: 45, date: '12/1' },
      { week: 'Week 2', score: 48, date: '12/8' },
      { week: 'Week 3', score: 50, date: '12/15' },
      { week: 'Week 4', score: 52, date: '12/22' },
      { week: 'Week 5', score: 51, date: '12/29' },
      { week: 'Week 6', score: 53, date: '1/5' },
      { week: 'Week 7', score: 55, date: '1/12' },
      { week: 'Week 8', score: 54, date: '1/19' },
      { week: 'Week 9', score: 56, date: '1/26' },
      { week: 'Week 10', score: 57, date: '2/2' },
      { week: 'Week 11', score: 56, date: '2/9' },
      { week: 'Week 12', score: 58, date: '2/16' },
    ],
  };

  const locationDropdownOptions = filteredLocationOptions.map(loc => ({ id: loc.urlId, name: loc.name }));
  const showLocationDropdown = locationDropdownOptions.length > 1;

  useEffect(() => {
    const loadMap = () => {
      const L = (window as any).L;
      const mapContainer = document.getElementById('dashboard-map');

      if (L && mapContainer && !mapContainer.classList.contains('leaflet-container')) {
        try {
          const map = L.map('dashboard-map').setView([37.7749, -122.4194], 10);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
          }).addTo(map);

          (window as any).dashboardMap = map;

          locations.forEach((loc) => {
            const color = loc.score >= 90 ? 'green' : loc.score >= 70 ? 'orange' : 'red';
            const icon = L.divIcon({
              className: 'custom-marker',
              html: `<div style="background: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer;"></div>`,
            });

            const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
            marker.bindTooltip(`<strong>${loc.name}</strong><br/>Score: ${loc.score}<br/>Status: ${loc.status}<br/>Action Items: ${loc.actionItems}`, {
              permanent: false,
              direction: 'top',
            });

            marker.on('click', () => {
              navigate(`/dashboard?location=${loc.urlId}`);
            });
          });
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      }
    };

    if (locations.length > 1) {
      setTimeout(loadMap, 100);
    }
  }, []);

  useEffect(() => {
    const map = (window as any).dashboardMap;
    if (map) {
      if (selectedLocation === 'all') {
        map.setView([37.7749, -122.4194], 10);
      } else {
        const location = locations.find(loc => loc.urlId === selectedLocation);
        if (location) {
          map.setView([location.lat, location.lng], 13);
        }
      }
    }
  }, [selectedLocation]);

  if (userRole === 'kitchen') return <KitchenDashboard />;
  if (userRole === 'facilities') return <FacilitiesDashboard />;

  return (
    <>
      <div className="bg-[#1e4d6b] text-white px-6 py-3 flex items-center space-x-2 rounded-lg mb-6">
        <Info className="h-5 w-5" />
        <span className="font-medium">Demo Mode — viewing sample data</span>
      </div>

      <div className="space-y-6">
        {selectedLocation !== 'all' && (() => {
          const locationMap: Record<string, { name: string; address: string }> = {
            'downtown': { name: 'Downtown Kitchen', address: '425 Market Street, San Francisco, CA 94105' },
            'airport': { name: 'Airport Cafe', address: '780 Airport Blvd, San Francisco, CA 94128' },
            'university': { name: 'University Dining', address: '2199 Addison Street, Berkeley, CA 94704' },
          };
          const locationInfo = locationMap[selectedLocation] || { name: 'Location', address: '' };
          return (
            <div className="mb-6">
              <button
                onClick={() => { navigate('/dashboard'); }}
                className="flex items-center space-x-1 mb-3 text-sm font-medium text-[#1e4d6b] hover:text-[#163a52] transition-colors duration-150"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to All Locations</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {locationInfo.name}
              </h1>
              <p className="text-gray-600">
                {locationInfo.address}
              </p>
            </div>
          );
        })()}

        {userRole === 'management' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Compliance Overview</h2>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Compliance Score</h3>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150 text-sm"
            >
              <Share2 className="h-4 w-4" />
              Share Report
            </button>
          </div>

          <AnimatedComplianceScore
            score={complianceScore}
            label={scoreInfo.label}
            color={scoreInfo.color}
            trend={overallTrend}
          />

          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', marginTop: '24px', width: '100%' }}>
              {pillarScores.map((pillar, index) => (
                <AnimatedPillarBar
                  key={pillar.name}
                  name={`${pillar.name} (${pillar.weight}%)`}
                  score={pillar.score}
                  tooltip={pillar.tooltip}
                  trend={pillar.trend}
                  delay={index * 300}
                  onClick={() => {
                    if (selectedLocation !== 'all') {
                      setExpandedPillar(expandedPillar === pillar.name ? null : pillar.name);
                    }
                    setPillarFilter(pillar.name);
                    setActiveTab('action');
                  }}
                  isExpanded={selectedLocation !== 'all' && expandedPillar === pillar.name}
                />
              ))}
            </div>

          {expandedPillar && selectedLocation !== 'all' && (() => {
            const selectedLocationObj = locations.find(loc => loc.urlId === selectedLocation);
            const pillarItems = scoreImpactData
              .filter(item => item.locationId === selectedLocationObj?.id && item.pillar === expandedPillar)
              .sort((a, b) => {
                const statusOrder: Record<string, number> = { overdue: 0, expired: 0, missing: 0, due_soon: 1, current: 2 };
                return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
              });

            const getStatusIcon = (status: string) => {
              switch (status) {
                case 'current': return <span style={{ color: '#22c55e', fontSize: '16px' }}>&#10003;</span>;
                case 'overdue':
                case 'expired':
                case 'missing': return <span style={{ color: '#ef4444', fontSize: '16px' }}>&#10007;</span>;
                case 'due_soon': return <span style={{ color: '#d4af37', fontSize: '16px' }}>&#9888;</span>;
                default: return null;
              }
            };

            return (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                {pillarItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: idx < pillarItems.length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      {getStatusIcon(item.status)}
                      <span style={{
                        fontSize: '14px',
                        color: item.status !== 'current' ? '#ef4444' : '#334155',
                        fontWeight: item.status !== 'current' ? '600' : '400'
                      }}>
                        {item.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', width: '100px', textAlign: 'center', flexShrink: 0 }}>
                      {item.impact}
                    </div>
                    {item.action && item.actionLink ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(item.actionLink);
                        }}
                        style={{
                          fontSize: '13px',
                          color: '#1e4d6b',
                          cursor: 'pointer',
                          fontWeight: '600',
                          width: '160px',
                          textAlign: 'right',
                          flexShrink: 0
                        }}
                      >
                        {item.action} &rarr;
                      </div>
                    ) : (
                      <div style={{ width: '160px', flexShrink: 0 }}></div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

        </div>
        {/* End of static top section (Compliance Score + Pillars) */}

        {/* Tab Navigation + Location Filter — stays in fixed position */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 mt-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', overflowX: 'auto', flex: 1 }}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'progress', label: "Today's Progress" },
                { id: 'action', label: 'Action Center' },
                { id: 'history', label: 'Score History' },
                { id: 'vendors', label: 'Vendor Services' },
                { id: 'metrics', label: 'Key Metrics' },
                { id: 'passport', label: 'QR Passport' }
              ].map(tab => (
                <div key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? '2px solid #1e4d6b' : '2px solid transparent',
                  color: activeTab === tab.id ? '#1e4d6b' : '#64748b',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  fontSize: '14px',
                  whiteSpace: 'nowrap'
                }}>
                  {tab.label}
                </div>
              ))}
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => {
                const val = e.target.value;
                navigate(val === 'all' ? '/dashboard' : `/dashboard?location=${val}`);
              }}
              style={{
                padding: '8px 32px 8px 12px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#1e4d6b',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
                appearance: 'auto',
                marginLeft: '16px',
                flexShrink: 0,
              }}
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.urlId}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Content — only this section changes when switching tabs */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mt-4" style={{ minHeight: '300px' }}>

          {/* Overview — All Locations */}
          {activeTab === 'overview' && selectedLocation === 'all' && (
            <div className="mt-6 space-y-6">
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Overview</h3>
              <OnboardingChecklist />

              <h3 className="text-md font-semibold text-gray-900 mb-3">Locations</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'left' }}>Location</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center' }}>Overall</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center' }}>Operational</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center' }}>Equipment</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center' }}>Documentation</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center' }}>Trend</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center', minWidth: '150px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {locations.map((loc) => {
                      const locScores = locationScores[loc.urlId];
                      const locScoresThirtyDaysAgo = locationScoresThirtyDaysAgo[loc.urlId];
                      const locTrend = getTrend(locScores.overall, locScoresThirtyDaysAgo.overall);
                      const grade = getGrade(locScores.overall);
                      return (
                        <tr
                          key={loc.id}
                          onClick={() => { navigate(`/dashboard?location=${loc.urlId}`); }}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style={{ textAlign: 'left' }}>{loc.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <span className="text-sm font-bold" style={{ color: grade.hex }}>{locScores.overall}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <span className="text-sm font-bold" style={{ color: getScoreHexColor(locScores.operational) }}>{locScores.operational}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <span className="text-sm font-bold" style={{ color: getScoreHexColor(locScores.equipment) }}>{locScores.equipment}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <span className="text-sm font-bold" style={{ color: getScoreHexColor(locScores.documentation) }}>{locScores.documentation}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <span className="text-sm font-semibold" style={{ color: locTrend.color }}>{locTrend.icon} {locTrend.diff}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              grade.color === 'green' ? 'bg-green-100 text-green-800' : grade.color === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {grade.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <LiveActivityFeed />
            </div>
          )}

          {/* Overview — Specific Location */}
          {activeTab === 'overview' && selectedLocation !== 'all' && (
            <div className="mt-6">
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Overview</h3>
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>

              <div className="space-y-3">
                {[
                  { initials: 'MJ', name: 'Marcus J.', action: 'logged Walk-in Cooler: 38\u00b0F \u2713', time: '15 min ago', url: '/temp-logs?id=walk-in-cooler-downtown', borderColor: '#22c55e' },
                  { initials: 'SC', name: 'Sarah C.', action: 'completed Opening Checklist', time: '45 min ago', url: '/checklists?id=opening-checklist', borderColor: '#22c55e' },
                  { initials: 'DP', name: 'David P.', action: 'logged Freezer: 15\u00b0F \u2713', time: '1h ago', url: '/temp-logs?id=freezer-downtown', borderColor: '#22c55e' },
                  { initials: 'ER', name: 'Emma R.', action: 'uploaded Food Handler Cert', time: '2h ago', url: '/documents?id=food-handler-cert', borderColor: '#1e4d6b' },
                  { initials: 'AT', name: 'Alex T.', action: 'logged Hot Hold: 127\u00b0F \u2717', time: '3h ago', url: '/temp-logs?id=hot-hold-airport', borderColor: '#ef4444' },
                ].map((activity, idx) => (
                  <div
                    key={idx}
                    onClick={() => { navigate(activity.url); }}
                    style={{ cursor: 'pointer', borderLeft: `2px solid ${activity.borderColor}` }}
                    className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors pl-3"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: '#1e4d6b' }}
                    >
                      {activity.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.name}</span> {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { navigate('/alerts'); }}
                className="mt-4 w-full text-sm font-medium text-[#1e4d6b] hover:text-[#163a52] transition-colors duration-150"
              >
                View All Activity
              </button>
            </div>
          )}

          {/* Today's Progress */}
          {activeTab === 'progress' && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Today's Progress</h3>
              <div onClick={() => navigate('/temp-logs')} style={{ marginBottom: '20px', cursor: 'pointer', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} className="hover:bg-gray-50 transition-colors">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>Temperature Checks</span>
                  <span style={{ fontWeight: '500', color: '#475569' }}>{locationParam === 'downtown' ? '10/12' : locationParam === 'airport' ? '4/12' : locationParam === 'university' ? '0/12' : '14/36'}</span>
                </div>
                <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '10px', borderRadius: '5px', width: locationParam === 'downtown' ? '83%' : locationParam === 'airport' ? '33%' : locationParam === 'university' ? '0%' : '39%', backgroundColor: locationParam === 'downtown' ? '#22c55e' : locationParam === 'airport' ? '#d4af37' : locationParam === 'university' ? '#ef4444' : '#d4af37', transition: 'width 0.5s ease' }}></div>
                </div>
              </div>
              <div onClick={() => navigate('/checklists')} style={{ marginBottom: '20px', cursor: 'pointer', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} className="hover:bg-gray-50 transition-colors">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>Checklists</span>
                  <span style={{ fontWeight: '500', color: '#475569' }}>{locationParam === 'downtown' ? '2/3' : locationParam === 'airport' ? '1/3' : locationParam === 'university' ? '0/3' : '3/9'}</span>
                </div>
                <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '10px', borderRadius: '5px', width: locationParam === 'downtown' ? '67%' : locationParam === 'airport' ? '33%' : locationParam === 'university' ? '0%' : '33%', backgroundColor: locationParam === 'downtown' ? '#d4af37' : locationParam === 'airport' ? '#d4af37' : locationParam === 'university' ? '#ef4444' : '#ef4444', transition: 'width 0.5s ease' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Action Center */}
          {activeTab === 'action' && (() => {
            const selectedLocationObj = locations.find(loc => loc.urlId === selectedLocation);
            const locationFilteredItems = selectedLocation === 'all'
              ? needsAttentionItems
              : needsAttentionItems.filter(item => item.locationId === selectedLocationObj?.id);
            const allActionItems = locationFilteredItems.map(item => ({
              priority: item.color === 'red' ? 'high' as const : item.color === 'amber' ? 'medium' as const : 'low' as const,
              pillar: (() => {
                if (item.url === '/temp-logs' || item.url === '/checklists' || item.url === '/haccp') return 'Operational';
                if (item.url === '/vendors') return 'Equipment';
                return 'Documentation';
              })(),
              title: item.title,
              desc: item.detail,
              link: item.url,
            }));
            const filteredItems = pillarFilter ? allActionItems.filter(item => item.pillar === pillarFilter) : allActionItems;
            const pillarCounts = { Operational: 0, Equipment: 0, Documentation: 0 };
            allActionItems.forEach(item => { pillarCounts[item.pillar as keyof typeof pillarCounts]++; });

            return (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Action Items</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {[
                    { key: null, label: 'All', count: allActionItems.length },
                    { key: 'Operational', label: 'Operational', count: pillarCounts.Operational },
                    { key: 'Equipment', label: 'Equipment', count: pillarCounts.Equipment },
                    { key: 'Documentation', label: 'Documentation', count: pillarCounts.Documentation },
                  ].map(chip => (
                    <button
                      key={chip.label}
                      onClick={() => setPillarFilter(chip.key)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: pillarFilter === chip.key ? '2px solid #1e4d6b' : '1px solid #d1d5db',
                        backgroundColor: pillarFilter === chip.key ? '#1e4d6b' : 'white',
                        color: pillarFilter === chip.key ? 'white' : '#475569',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {chip.label} ({chip.count})
                    </button>
                  ))}
                </div>
                {filteredItems.map((item, i) => {
                  const priorityStyles = {
                    high: { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Urgent' },
                    medium: { dot: '#d4af37', bg: '#fffbeb', border: '#fef3c7', label: 'Soon' },
                    low: { dot: '#1e4d6b', bg: '#eff6ff', border: '#dbeafe', label: 'Info' },
                  };
                  const ps = priorityStyles[item.priority];
                  return (
                    <div key={i} onClick={() => { navigate(item.link) }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', borderRadius: '8px' }} className="hover:bg-gray-50 transition-colors">
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: ps.dot, flexShrink: 0 }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{item.title}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>{item.desc}</div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', marginRight: '4px' }}>{item.pillar}</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', backgroundColor: ps.bg, color: ps.dot, border: `1px solid ${ps.border}` }}>{ps.label}</span>
                      <span style={{ color: '#94a3b8', fontSize: '18px' }}>&rsaquo;</span>
                    </div>
                  );
                })}
                {filteredItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No action items for this category.</div>
                )}
              </div>
            );
          })()}

          {/* Vendor Services */}
          {activeTab === 'vendors' && (() => {
            const selectedLocationObj = locations.find(loc => loc.urlId === selectedLocation);
            const filteredVendors = selectedLocation === 'all'
              ? demoVendors
              : demoVendors.filter(v => v.locationId === selectedLocationObj?.id);
            const locationMap: Record<string, string> = {};
            locations.forEach(l => { locationMap[l.id] = l.name; });
            const statusColor = (s: string) => s === 'overdue' ? '#ef4444' : s === 'upcoming' ? '#d4af37' : '#22c55e';
            const statusLabel = (s: string) => s === 'overdue' ? 'Overdue' : s === 'upcoming' ? 'Due Soon' : 'On Track';
            const formatDate = (d: string) => { const dt = new Date(d); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
            return (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Vendor Services</h3>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendor</th>
                      <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service</th>
                      {selectedLocation === 'all' && <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>}
                      <th style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Service</th>
                      <th style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Due</th>
                      <th style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((v) => (
                      <tr key={v.id} onClick={() => { navigate('/vendors') }} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} className="hover:bg-gray-50 transition-colors">
                        <td style={{ padding: '12px 10px', fontWeight: '500', color: '#1e293b' }}>{v.companyName}</td>
                        <td style={{ padding: '12px 10px', color: '#475569' }}>{v.serviceType}</td>
                        {selectedLocation === 'all' && <td style={{ padding: '12px 10px', color: '#475569', fontSize: '13px' }}>{locationMap[v.locationId] || ''}</td>}
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#475569' }}>{formatDate(v.lastService)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#475569' }}>{formatDate(v.nextDue)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: statusColor(v.status), border: '1px solid ' + statusColor(v.status) }}>{statusLabel(v.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })()}

          {/* Score History */}
          {activeTab === 'history' && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Score History</h3>
              <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>12-week compliance score trend</p>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  {selectedLocation === 'all' ? (
                    <LineChart data={historicalData.downtown.map((item, i) => ({
                      date: item.date,
                      Average: Math.round((item.score + historicalData.airport[i].score + historicalData.university[i].score) / 3),
                      Downtown: item.score,
                      Airport: historicalData.airport[i].score,
                      University: historicalData.university[i].score,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'A', position: 'right', fontSize: 11 }} />
                      <ReferenceLine y={70} stroke="#d4af37" strokeDasharray="3 3" label={{ value: 'B', position: 'right', fontSize: 11 }} />
                      <Line type="monotone" dataKey="Average" stroke="#1e4d6b" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Downtown" stroke="#22c55e" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="Airport" stroke="#d4af37" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="University" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
                    </LineChart>
                  ) : (
                    <LineChart data={historicalData[selectedLocation as keyof typeof historicalData] || historicalData.downtown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip />
                      <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'A', position: 'right', fontSize: 11 }} />
                      <ReferenceLine y={70} stroke="#d4af37" strokeDasharray="3 3" label={{ value: 'B', position: 'right', fontSize: 11 }} />
                      <Line type="monotone" dataKey="score" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 3 }} name="Compliance Score" />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          {activeTab === 'metrics' && (() => {
            const metricsPerLocation: Record<string, { hoursSaved: number; moneySaved: number; logsCompleted: number; docsStored: number }> = {
              downtown: { hoursSaved: 38, moneySaved: 1330, logsCompleted: 144, docsStored: 21 },
              airport: { hoursSaved: 28, moneySaved: 980, logsCompleted: 102, docsStored: 15 },
              university: { hoursSaved: 20, moneySaved: 700, logsCompleted: 66, docsStored: 11 },
            };
            // All = sum: 38+28+20=86, 1330+980+700=3010, 144+102+66=312, 21+15+11=47
            const m = selectedLocation === 'all'
              ? { hoursSaved: 86, moneySaved: 3010, logsCompleted: 312, docsStored: 47 }
              : metricsPerLocation[selectedLocation] || { hoursSaved: 86, moneySaved: 3010, logsCompleted: 312, docsStored: 47 };
            return (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Key Metrics</h3>
              <TimeSavedCounter
                hoursSaved={m.hoursSaved}
                moneySaved={m.moneySaved}
                logsCompleted={m.logsCompleted}
                docsStored={m.docsStored}
              />
            </div>
            );
          })()}

          {/* QR Passport */}
          {activeTab === 'passport' && (() => {
            const allQrLocations = [
              { id: 'downtown', name: 'Downtown Kitchen', address: '425 Market St, SF', score: locationScores['downtown'].overall, color: getGrade(locationScores['downtown'].overall).hex },
              { id: 'airport', name: 'Airport Cafe', address: '780 Terminal Dr, SF', score: locationScores['airport'].overall, color: getGrade(locationScores['airport'].overall).hex },
              { id: 'university', name: 'University Dining', address: '1200 Campus Way, Berkeley', score: locationScores['university'].overall, color: getGrade(locationScores['university'].overall).hex }
            ];
            const qrLocations = selectedLocation === 'all' ? allQrLocations : allQrLocations.filter(l => l.id === selectedLocation);
            return (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>QR Compliance Passport</h3>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {qrLocations.map((loc, i) => (
                  <div key={i} style={{ flex: '1 1 280px', background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px', color: '#1e293b' }}>{loc.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>{loc.address}</div>
                    <div style={{ margin: '0 auto 16px', display: 'flex', justifyContent: 'center' }}>
                      <QRCodeSVG value={`https://evidly-app.vercel.app/passport/${loc.id}`} size={150} level="M" />
                    </div>
                    <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', color: loc.color, border: '2px solid ' + loc.color }}>{loc.score}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
                      <button onClick={() => window.print()} className="bg-[#1e4d6b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#163a52] transition-colors duration-150">Print</button>
                      <button onClick={() => navigate(`/passport/${loc.id}`)} className="bg-white text-[#1e4d6b] border border-[#1e4d6b] px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors duration-150">View Passport</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            );
          })()}
        </div>
          </>
        )}

        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          documentType="compliance"
        />
      </div>
    </>
  );
}
