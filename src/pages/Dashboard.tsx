import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import {
  FileText,
  Clock,
  DollarSign,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  CheckCircle,
  Activity,
  MapPin,
  ClipboardCheck,
  Bell,
  User,
  ChevronDown,
  AlertTriangle,
  Info,
  Thermometer,
  Users,
  FileCheck,
  ArrowLeft,
  Shield,
  QrCode,
  Download,
  Printer,
  Share2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { complianceScores, locationScores, getGrade, locations, vendors, notifications, needsAttentionItems, scoreImpactData, complianceScoresThirtyDaysAgo, locationScoresThirtyDaysAgo, getTrend, getWeights } from '../data/demoData';
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

  console.log('USER ROLE:', userRole);

  if (userRole === 'kitchen') {
    return (
      <Layout title="Dashboard" demoMode={true}>
        <div className="bg-blue-600 text-white px-6 py-3 flex items-center space-x-2 rounded-lg mb-6">
          <Info className="h-5 w-5" />
          <span className="font-medium">Demo Mode — viewing sample data</span>
        </div>
        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1e4d6b' }}>Good morning, Marcus</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>Thursday, February 6, 2026 — Morning Shift</p>

          {/* MY TASKS TODAY */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>My Tasks Today</h3>
              <span style={{ fontSize: '14px', color: '#64748b' }}>5 of 9 complete (56%)</span>
            </div>
            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '16px' }}>
              <div style={{ height: '8px', background: '#eab308', borderRadius: '4px', width: '56%' }}></div>
            </div>
            {[
              { time: '6:00 AM', task: 'Opening Checklist (14 items)', done: true, link: '/checklists' },
              { time: '7:00 AM', task: 'Walk-in Cooler temp check', done: true, link: '/temp-logs' },
              { time: '7:00 AM', task: 'Walk-in Freezer temp check', done: true, link: '/temp-logs' },
              { time: '7:00 AM', task: 'Prep Cooler temp check', done: true, link: '/temp-logs' },
              { time: '10:00 AM', task: 'Hot Hold Cabinet temp check', done: true, link: '/temp-logs' },
              { time: '10:00 AM', task: 'Salad Bar temp check', done: false, overdue: true, link: '/temp-logs' },
              { time: '10:00 AM', task: 'Reach-in Freezer temp check', done: false, overdue: true, link: '/temp-logs' },
              { time: '2:00 PM', task: 'All equipment temp check', done: false, overdue: false, link: '/temp-logs' },
              { time: '6:00 PM', task: 'Closing Checklist (10 items)', done: false, overdue: false, link: '/checklists' }
            ].map((item, i) => (
              <div key={i} onClick={() => { navigate(item.link) }} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0',
                borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                backgroundColor: item.overdue ? '#fef2f2' : 'transparent'
              }}>
                <span style={{ fontSize: '20px' }}>{item.done ? '✅' : item.overdue ? '🔴' : '⬜'}</span>
                <span style={{ fontSize: '13px', color: '#94a3b8', width: '70px' }}>{item.time}</span>
                <span style={{
                  fontSize: '14px',
                  color: item.done ? '#94a3b8' : item.overdue ? '#ef4444' : '#334155',
                  textDecoration: item.done ? 'line-through' : 'none',
                  fontWeight: item.overdue ? '600' : '400',
                  flex: 1
                }}>{item.task}</span>
                {item.overdue && <span style={{ fontSize: '11px', background: '#fecaca', color: '#dc2626', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>OVERDUE</span>}
              </div>
            ))}
          </div>

          {/* MISSED / OVERDUE */}
          <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '20px', border: '1px solid #fecaca', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#dc2626', marginBottom: '12px' }}>⚠ Missed / Overdue</h3>
            {[
              { task: 'Salad Bar temp check', scheduled: '10:00 AM', late: '4 hours late', link: '/temp-logs' },
              { task: 'Reach-in Freezer temp check', scheduled: '10:00 AM', late: '4 hours late', link: '/temp-logs' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #fecaca' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#dc2626' }}>{item.task}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>Scheduled: {item.scheduled} — {item.late}</div>
                </div>
                <button onClick={() => { navigate(item.link) }} style={{
                  background: '#1e4d6b', color: 'white', border: 'none', padding: '8px 16px',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                }}>Do It Now</button>
              </div>
            ))}
          </div>

          {/* QUICK ACTIONS */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Log Temperature', icon: '🌡️', link: '/temp-logs' },
              { label: 'Start Checklist', icon: '📋', link: '/checklists' },
              { label: 'Log Receiving', icon: '🚚', link: '/temp-logs' }
            ].map((item, i) => (
              <div key={i} onClick={() => { navigate(item.link) }} style={{
                flex: 1, background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0',
                textAlign: 'center', cursor: 'pointer', minHeight: '80px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ fontWeight: '600', color: '#1e4d6b' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* REMINDERS */}
          <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '20px', border: '1px solid #fde68a' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#92400e', marginBottom: '12px' }}>Reminders</h3>
            <div style={{ padding: '8px 0', borderBottom: '1px solid #fde68a', fontSize: '14px', color: '#92400e' }}>📋 Your Food Handler Certification expires in 30 days</div>
            <div style={{ padding: '8px 0', borderBottom: '1px solid #fde68a', fontSize: '14px', color: '#92400e' }}>📖 New HACCP plan posted — review required by Friday</div>
            <div style={{ padding: '8px 0', fontSize: '14px', color: '#92400e' }}>👥 Team meeting at 3 PM today</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (userRole === 'facilities') {
    return (
      <Layout title="Dashboard" demoMode={true}>
        <div className="bg-blue-600 text-white px-6 py-3 flex items-center space-x-2 rounded-lg mb-6">
          <Info className="h-5 w-5" />
          <span className="font-medium">Demo Mode — viewing sample data</span>
        </div>
        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1e4d6b' }}>Good morning, Alex</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>Thursday, February 6, 2026</p>

          {/* EQUIPMENT STATUS */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Equipment Status</h3>
            {[
              { name: 'Hood System', vendor: 'ABC Fire Protection', last: 'Jan 15', next: 'Apr 15', status: 'On Track', color: '#22c55e', bg: '#f0fdf4' },
              { name: 'Fire Suppression', vendor: 'Valley Fire Systems', last: 'Aug 10', next: 'Feb 10', status: 'OVERDUE', color: '#ef4444', bg: '#fef2f2', action: 'Schedule Now' },
              { name: 'Fire Extinguishers', vendor: 'Valley Fire Systems', last: 'Nov 1', next: 'May 1', status: 'On Track', color: '#22c55e', bg: '#f0fdf4' },
              { name: 'Grease Trap', vendor: 'Grease Masters', last: 'Sep 20', next: 'Mar 20', status: 'Due Soon', color: '#eab308', bg: '#fffbeb', action: 'Schedule Service' },
              { name: 'HVAC', vendor: 'CleanAir HVAC', last: 'Jan 4', next: 'Apr 4', status: 'On Track', color: '#22c55e', bg: '#f0fdf4' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', marginBottom: '8px', background: item.bg, borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: '600' }}>{item.name}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>{item.vendor} — Last: {item.last}, Next: {item.next}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: item.color, backgroundColor: item.color + '20' }}>{item.status}</span>
                  {item.action && (
                    <button onClick={() => { navigate('/vendors') }} style={{
                      background: '#1e4d6b', color: 'white', border: 'none', padding: '6px 14px',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                    }}>{item.action}</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* VENDOR ACTIONS NEEDED */}
          <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '20px', border: '1px solid #fecaca', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#dc2626', marginBottom: '12px' }}>Vendor Actions Needed</h3>
            {[
              { text: 'Valley Fire Systems — Fire Suppression OVERDUE. Contact vendor to schedule.', link: '/vendors' },
              { text: 'Grease Masters — Service due in 32 days. Confirm appointment.', link: '/vendors' },
              { text: 'ABC Fire Protection — COI expires Mar 15. Request updated certificate.', link: '/vendors' }
            ].map((item, i) => (
              <div key={i} onClick={() => { navigate(item.link) }} style={{
                padding: '10px 0', borderBottom: '1px solid #fecaca', fontSize: '14px', color: '#dc2626', cursor: 'pointer'
              }}>{item.text}</div>
            ))}
          </div>

          {/* DOCUMENTS TO REVIEW */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Documents to Review</h3>
            <div onClick={() => { navigate('/documents') }} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
              <span>Fire Suppression Report</span>
              <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '12px' }}>EXPIRED</span>
            </div>
            <div onClick={() => { navigate('/documents') }} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
              <span>HVAC Maintenance Record</span>
              <span style={{ color: '#22c55e', fontWeight: '600', fontSize: '12px' }}>Current</span>
            </div>
            <div onClick={() => { navigate('/documents') }} style={{ padding: '10px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
              <span>Hood Cleaning Certificate</span>
              <span style={{ color: '#22c55e', fontWeight: '600', fontSize: '12px' }}>Current</span>
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div style={{ display: 'flex', gap: '16px' }}>
            {[
              { label: 'View Vendors', icon: '🔧', link: '/vendors' },
              { label: 'Upload Document', icon: '📄', link: '/documents' },
              { label: 'View Alerts', icon: '🔔', link: '/alerts' }
            ].map((item, i) => (
              <div key={i} onClick={() => { navigate(item.link) }} style={{
                flex: 1, background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0',
                textAlign: 'center', cursor: 'pointer', minHeight: '80px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ fontWeight: '600', color: '#1e4d6b' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }
  const params = new URLSearchParams(window.location.search);
  const locationParam = params.get('location') || 'all';
  const selectedLocation = locationParam;

  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'action' | 'vendors' | 'history' | 'metrics' | 'passport'>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [chartLocation, setChartLocation] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('12weeks');

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [progressTypeFilter, setProgressTypeFilter] = useState<string>('all');
  const [vendorStatusFilter, setVendorStatusFilter] = useState<string>('all');
  const [historyRange, setHistoryRange] = useState<string>('90');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  const selectedLocationObj = locations.find(loc => loc.urlId === selectedLocation);
  const filteredVendors = (selectedLocation === 'all' ? vendors : vendors.filter(v => v.locationId === selectedLocationObj?.id))
    .filter(v => {
      if (vendorStatusFilter === 'all') return true;
      if (vendorStatusFilter === 'overdue') return v.status === 'overdue';
      if (vendorStatusFilter === 'due_soon') return v.status === 'upcoming';
      if (vendorStatusFilter === 'on_track') return v.status === 'current';
      return true;
    })
    .sort((a, b) => {
      const statusOrder = { overdue: 0, upcoming: 1, current: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

  const gaugeData = [
    {
      name: 'Score',
      value: complianceScore,
      fill: scoreInfo.hex,
    },
  ];

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

  const generateHistoryData = (days: number, location: string) => {
    const data = [];
    const today = new Date();
    const startScore = 85 + Math.random() * 10;

    if (days === 30) {
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const variation = (Math.random() - 0.5) * 8;
        const score = Math.max(70, Math.min(95, startScore + variation));
        data.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          score: Math.round(score)
        });
      }
    } else if (days === 90) {
      for (let i = 12; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 7));
        const variation = (Math.random() - 0.5) * 10;
        const score = Math.max(70, Math.min(95, startScore + variation));
        data.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          score: Math.round(score)
        });
      }
    } else if (days === 180) {
      for (let i = 25; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 7));
        const variation = (Math.random() - 0.5) * 12;
        const score = Math.max(70, Math.min(95, startScore + variation));
        data.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          score: Math.round(score)
        });
      }
    } else if (days === 365) {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        const variation = (Math.random() - 0.5) * 15;
        const score = Math.max(70, Math.min(95, startScore + variation));
        data.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          score: Math.round(score)
        });
      }
    }

    return data;
  };

  const getChartData = () => {
    const days = historyRange === 'custom' ? 90 : parseInt(historyRange);

    if (selectedLocation === 'all') {
      const downtownData = generateHistoryData(days, 'downtown');
      const airportData = generateHistoryData(days, 'airport');
      const universityData = generateHistoryData(days, 'university');

      return downtownData.map((item, index) => ({
        date: item.date,
        Downtown: item.score,
        Airport: airportData[index].score,
        University: universityData[index].score,
      }));
    } else {
      return generateHistoryData(days, selectedLocation);
    }
  };

  const chartData = getChartData();

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreHexColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 70) return '#eab308';
    return '#ef4444';
  };

  const demoUrl = `${window.location.origin}/passport/demo`;

  const progressData = {
    downtown: {
      tempChecks: {
        completed: 10,
        total: 12,
        percentage: 83,
        items: [
          { name: 'Walk-in Cooler', done: true, time: '7:00 AM', value: '38°F', status: 'pass' },
          { name: 'Walk-in Freezer', done: true, time: '7:00 AM', value: '-2°F', status: 'pass' },
          { name: 'Prep Cooler', done: true, time: '7:15 AM', value: '40°F', status: 'pass' },
          { name: 'Hot Hold Cabinet', done: true, time: '10:00 AM', value: '145°F', status: 'pass' },
          { name: 'Salad Bar', done: true, time: '10:00 AM', value: '39°F', status: 'pass' },
          { name: 'Reach-in Freezer', done: true, time: '10:15 AM', value: '0°F', status: 'pass' },
          { name: 'Walk-in Cooler', done: true, time: '2:00 PM', value: '37°F', status: 'pass' },
          { name: 'Walk-in Freezer', done: true, time: '2:00 PM', value: '-3°F', status: 'pass' },
          { name: 'Prep Cooler', done: true, time: '2:15 PM', value: '39°F', status: 'pass' },
          { name: 'Hot Hold Cabinet', done: true, time: '2:15 PM', value: '142°F', status: 'pass' },
          { name: 'Salad Bar', done: false, time: 'due 2:30 PM', value: '', status: 'pending' },
          { name: 'Reach-in Freezer', done: false, time: 'due 2:30 PM', value: '', status: 'pending' },
        ]
      },
      checklists: {
        completed: 2,
        total: 3,
        percentage: 67,
        items: [
          { name: 'Opening Checklist', done: true, time: '6:15 AM', user: 'Sarah Chen', status: 'complete' },
          { name: 'Midday Checklist', done: true, time: '12:00 PM', user: 'Marcus Johnson', status: 'complete' },
          { name: 'Closing Checklist', done: false, time: 'due 6:00 PM', user: '', status: 'pending' },
        ]
      }
    },
    airport: {
      tempChecks: {
        completed: 4,
        total: 12,
        percentage: 33,
        items: [
          { name: 'Walk-in Cooler', done: true, time: '7:30 AM', value: '39°F', status: 'pass' },
          { name: 'Walk-in Freezer', done: true, time: '7:30 AM', value: '-1°F', status: 'pass' },
          { name: 'Prep Cooler', done: true, time: '7:45 AM', value: '41°F', status: 'pass' },
          { name: 'Hot Hold Cabinet', done: true, time: '10:30 AM', value: '127°F', status: 'fail' },
          { name: 'Salad Bar', done: false, time: 'due 10:00 AM', value: '', status: 'overdue' },
          { name: 'Reach-in Freezer', done: false, time: 'due 10:00 AM', value: '', status: 'overdue' },
          { name: 'Walk-in Cooler', done: false, time: 'due 2:00 PM', value: '', status: 'pending' },
          { name: 'Walk-in Freezer', done: false, time: 'due 2:00 PM', value: '', status: 'pending' },
          { name: 'Prep Cooler', done: false, time: 'due 2:00 PM', value: '', status: 'pending' },
          { name: 'Hot Hold Cabinet', done: false, time: 'due 2:00 PM', value: '', status: 'pending' },
          { name: 'Salad Bar', done: false, time: 'due 2:00 PM', value: '', status: 'pending' },
          { name: 'Reach-in Freezer', done: false, time: 'due 2:00 PM', value: '', status: 'pending' },
        ]
      },
      checklists: {
        completed: 1,
        total: 3,
        percentage: 33,
        items: [
          { name: 'Opening Checklist', done: true, time: '7:00 AM', user: 'David Park', status: 'late' },
          { name: 'Midday Checklist', done: false, time: 'due 12:00 PM', user: '', status: 'overdue' },
          { name: 'Closing Checklist', done: false, time: 'due 6:00 PM', user: '', status: 'pending' },
        ]
      }
    },
    university: {
      tempChecks: {
        completed: 0,
        total: 12,
        percentage: 0,
        items: [
          { name: 'Walk-in Cooler', done: false, time: 'due 7:00 AM', value: '', status: 'overdue' },
          { name: 'Walk-in Freezer', done: false, time: 'due 7:00 AM', value: '', status: 'overdue' },
          { name: 'Prep Cooler', done: false, time: 'due 7:00 AM', value: '', status: 'overdue' },
          { name: 'Hot Hold Cabinet', done: false, time: 'due 10:00 AM', value: '', status: 'overdue' },
          { name: 'Salad Bar', done: false, time: 'due 10:00 AM', value: '', status: 'overdue' },
          { name: 'Reach-in Freezer', done: false, time: 'due 10:00 AM', value: '', status: 'overdue' },
          { name: 'Walk-in Cooler', done: false, time: 'due 2:00 PM', value: '', status: 'overdue' },
          { name: 'Walk-in Freezer', done: false, time: 'due 2:00 PM', value: '', status: 'overdue' },
          { name: 'Prep Cooler', done: false, time: 'due 2:00 PM', value: '', status: 'overdue' },
          { name: 'Hot Hold Cabinet', done: false, time: 'due 2:00 PM', value: '', status: 'overdue' },
          { name: 'Salad Bar', done: false, time: 'due 2:00 PM', value: '', status: 'overdue' },
          { name: 'Reach-in Freezer', done: false, time: 'due 2:00 PM', value: '', status: 'overdue' },
        ]
      },
      checklists: {
        completed: 0,
        total: 3,
        percentage: 0,
        items: [
          { name: 'Opening Checklist', done: false, time: 'due 6:00 AM', user: '', status: 'overdue' },
          { name: 'Midday Checklist', done: false, time: 'due 12:00 PM', user: '', status: 'overdue' },
          { name: 'Closing Checklist', done: false, time: 'due 6:00 PM', user: '', status: 'pending' },
        ]
      }
    },
    all: {
      tempChecks: {
        completed: 14,
        total: 36,
        percentage: 39
      },
      checklists: {
        completed: 3,
        total: 9,
        percentage: 33
      }
    }
  };

  const currentProgress = progressData[selectedLocation as keyof typeof progressData] || progressData.all;

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

  const locationDropdownOptions = (() => {
    const options = filteredLocationOptions.map(loc => ({ id: loc.urlId, name: loc.name }));
    if (availableLocations.includes('all') && userRole === 'management') {
      return [{ id: 'all', name: 'All Locations' }, ...options];
    }
    return options;
  })();

  const showLocationDropdown = locationDropdownOptions.length > 1;

  return (
    <Layout
      title="Dashboard"
      locations={showLocationDropdown ? locationDropdownOptions : []}
      selectedLocation={selectedLocation === 'all' ? null : selectedLocation}
      onLocationChange={(locationId) => {
        const locId = locationId || 'all';
        if (locId === 'all' || locId === '') {
          navigate('/dashboard');
        } else {
          navigate('/dashboard?location=' + locId);
        }
      }}
      demoMode={true}
    >
      <div className="bg-blue-600 text-white px-6 py-3 flex items-center space-x-2 rounded-lg mb-6">
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
                className="flex items-center space-x-1 mb-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm"
              style={{ backgroundColor: '#1e4d6b' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#163a52'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1e4d6b'}
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

          {selectedLocation !== 'all' && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', marginTop: '24px', width: '100%' }}>
              {pillarScores.map((pillar, index) => (
                <AnimatedPillarBar
                  key={pillar.name}
                  name={`${pillar.name} (${pillar.weight}%)`}
                  score={pillar.score}
                  tooltip={pillar.tooltip}
                  trend={pillar.trend}
                  delay={index * 300}
                  onClick={() => setExpandedPillar(expandedPillar === pillar.name ? null : pillar.name)}
                  isExpanded={expandedPillar === pillar.name}
                />
              ))}
            </div>
          )}

          {expandedPillar && selectedLocation !== 'all' && (() => {
            const selectedLocationObj = locations.find(loc => loc.urlId === selectedLocation);
            const pillarItems = scoreImpactData
              .filter(item => item.locationId === selectedLocationObj?.id && item.pillar === expandedPillar)
              .sort((a, b) => {
                const statusOrder = { overdue: 0, expired: 0, missing: 0, due_soon: 1, current: 2 };
                return statusOrder[a.status] - statusOrder[b.status];
              });

            const getStatusIcon = (status: string) => {
              switch (status) {
                case 'current': return <span style={{ color: '#22c55e', fontSize: '16px' }}>✓</span>;
                case 'overdue': return <span style={{ color: '#ef4444', fontSize: '16px' }}>✗</span>;
                case 'expired': return <span style={{ color: '#ef4444', fontSize: '16px' }}>✗</span>;
                case 'missing': return <span style={{ color: '#ef4444', fontSize: '16px' }}>✗</span>;
                case 'due_soon': return <span style={{ color: '#eab308', fontSize: '16px' }}>⚠</span>;
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
                        {item.action} →
                      </div>
                    ) : (
                      <div style={{ width: '160px', flexShrink: 0 }}></div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', overflowX: 'auto' }}>
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

          {activeTab === 'overview' && selectedLocation === 'all' && (
            <div className="mt-6 space-y-6">
              {/* Onboarding Checklist - shows for new users */}
              <OnboardingChecklist />

              {/* Time Saved Counter */}
              <TimeSavedCounter
                hoursSaved={86}
                moneySaved={3010}
                logsCompleted={312}
                docsStored={47}
              />

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

              {/* Live Activity Feed */}
              <LiveActivityFeed />
            </div>
          )}

          {activeTab === 'overview' && selectedLocation !== 'all' && (
            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>

              <div className="space-y-3">
                {(() => {
                  const allActivities = [
                    { initials: 'MJ', name: 'Marcus J.', action: 'logged Walk-in Cooler: 38°F ✓', time: '15 min ago', url: '/temp-logs', borderColor: 'green', bgColor: 'blue', roles: ['management', 'kitchen'] },
                    { initials: 'SC', name: 'Sarah C.', action: 'completed Opening Checklist', time: '45 min ago', url: '/checklists', borderColor: 'green', bgColor: 'green', roles: ['management', 'kitchen'] },
                    { initials: 'DP', name: 'David P.', action: 'logged Freezer: 15°F ✓', time: '1h ago', url: '/temp-logs', borderColor: 'green', bgColor: 'purple', roles: ['management', 'kitchen'] },
                    { initials: 'ER', name: 'Emma R.', action: 'uploaded Food Handler Cert', time: '2h ago', url: '/documents', borderColor: 'blue', bgColor: 'pink', roles: ['management', 'facilities'] },
                    { initials: 'AT', name: 'Alex T.', action: 'logged Hot Hold: 127°F ✗', time: '3h ago', url: '/temp-logs', borderColor: 'red', bgColor: 'orange', roles: ['management', 'kitchen'] },
                  ];

                  const filteredActivities = allActivities.filter(activity => activity.roles.includes(userRole));

                  const getBorderColor = (color: string) => {
                    const colors: Record<string, string> = { green: '#22c55e', blue: '#3b82f6', red: '#ef4444' };
                    return colors[color] || '#22c55e';
                  };
                  const getBgColor = (color: string) => {
                    const colors: Record<string, string> = { blue: '#3b82f6', green: '#22c55e', purple: '#a855f7', pink: '#ec4899', orange: '#f97316' };
                    return colors[color] || '#3b82f6';
                  };

                  return filteredActivities.map((activity, idx) => (
                    <div
                      key={idx}
                      onClick={() => { navigate(activity.url); }}
                      style={{ cursor: 'pointer', borderLeft: `2px solid ${getBorderColor(activity.borderColor)}` }}
                      className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors pl-3"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                        style={{ backgroundColor: getBgColor(activity.bgColor) }}
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
                  ));
                })()}
              </div>

              <button
                onClick={() => { navigate('/alerts'); }}
                className="mt-4 w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All Activity
              </button>
            </div>
          )}

          {activeTab === 'progress' && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Today's Progress</h3>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600' }}>Temperature Checks</span>
                  <span>{locationParam === 'downtown' ? '10/12' : locationParam === 'airport' ? '4/12' : locationParam === 'university' ? '0/12' : '14/36'}</span>
                </div>
                <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px' }}>
                  <div style={{ height: '10px', borderRadius: '5px', width: locationParam === 'downtown' ? '83%' : locationParam === 'airport' ? '33%' : locationParam === 'university' ? '0%' : '39%', backgroundColor: locationParam === 'downtown' ? '#22c55e' : '#ef4444' }}></div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600' }}>Checklists</span>
                  <span>{locationParam === 'downtown' ? '2/3' : locationParam === 'airport' ? '1/3' : locationParam === 'university' ? '0/3' : '3/9'}</span>
                </div>
                <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px' }}>
                  <div style={{ height: '10px', borderRadius: '5px', width: locationParam === 'downtown' ? '67%' : locationParam === 'airport' ? '33%' : locationParam === 'university' ? '0%' : '33%', backgroundColor: locationParam === 'downtown' ? '#eab308' : '#ef4444' }}></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'action' && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Action Items</h3>
              {[
                { priority: 'red', title: 'Fire Suppression Report Expired', desc: 'Valley Fire Systems — overdue since Feb 10', link: '/vendors' },
                { priority: 'red', title: '3 Temperature Checks Missed', desc: 'Airport Cafe — missing since 10 AM', link: '/temp-logs' },
                { priority: 'yellow', title: 'Health Permit Renewal in 14 Days', desc: 'Downtown Kitchen — expires Feb 20', link: '/documents' },
                { priority: 'yellow', title: 'Food Handler Certs Expiring', desc: '2 team members need renewal by Mar 7', link: '/team' },
                { priority: 'yellow', title: 'Grease Trap Service Due Soon', desc: 'Grease Masters — due Mar 20', link: '/vendors' },
                { priority: 'blue', title: 'Weekly Compliance Digest Ready', desc: 'View your weekly summary', link: '/reports' }
              ].map((item, i) => (
                <div key={i} onClick={() => { navigate(item.link) }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.priority === 'red' ? '#ef4444' : item.priority === 'yellow' ? '#eab308' : '#3b82f6', flexShrink: 0 }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.title}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{item.desc}</div>
                  </div>
                  <span style={{ color: '#94a3b8' }}>›</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'vendors' && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Vendor Services</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>VENDOR</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>SERVICE</th>
                    <th style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>LAST SERVICE</th>
                    <th style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>NEXT DUE</th>
                    <th style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { vendor: 'Valley Fire Systems', service: 'Fire Suppression', last: 'Aug 10', next: 'Feb 10', status: 'Overdue', color: '#ef4444' },
                    { vendor: 'Pacific Pest Control', service: 'Pest Control', last: 'Feb 1', next: 'Mar 1', status: 'Due Soon', color: '#eab308' },
                    { vendor: 'Grease Masters', service: 'Grease Trap', last: 'Sep 20', next: 'Mar 20', status: 'Due Soon', color: '#eab308' },
                    { vendor: 'ABC Fire Protection', service: 'Hood Cleaning', last: 'Jan 15', next: 'Apr 15', status: 'On Track', color: '#22c55e' },
                    { vendor: 'CleanAir HVAC', service: 'HVAC Service', last: 'Dec 5', next: 'Jun 5', status: 'On Track', color: '#22c55e' }
                  ].map((v, i) => (
                    <tr key={i} onClick={() => { navigate('/vendors') }} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '500' }}>{v.vendor}</td>
                      <td style={{ padding: '12px 10px' }}>{v.service}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>{v.last}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>{v.next}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: v.color, border: '1px solid ' + v.color }}>{v.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Score History</h3>
              <p style={{ color: '#64748b' }}>12-week compliance score trend</p>
              <div style={{ height: '300px', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Score history chart renders here
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Key Metrics</h3>
              <TimeSavedCounter
                hoursSaved={86}
                moneySaved={3010}
                logsCompleted={312}
                docsStored={47}
              />
            </div>
          )}

          {activeTab === 'passport' && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>QR Compliance Passport</h3>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[
                  { name: 'Downtown Kitchen', address: '425 Market St, SF', score: 92, color: '#22c55e' },
                  { name: 'Airport Cafe', address: '780 Terminal Dr, SF', score: 74, color: '#eab308' },
                  { name: 'University Dining', address: '1200 Campus Way, Berkeley', score: 58, color: '#ef4444' }
                ].map((loc, i) => (
                  <div key={i} style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>{loc.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>{loc.address}</div>
                    <div style={{ width: '150px', height: '150px', background: '#f1f5f9', margin: '0 auto 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>QR Code</div>
                    <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', color: loc.color, border: '2px solid ' + loc.color }}>{loc.score}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
                      <button style={{ background: '#1e4d6b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Print</button>
                      <button style={{ background: 'white', color: '#1e4d6b', border: '1px solid #1e4d6b', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Download</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
          </>
        )}

        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          documentType="compliance"
        />
      </div>
    </Layout>
  );
}
