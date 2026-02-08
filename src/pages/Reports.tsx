import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Breadcrumb } from '../components/Breadcrumb';
import { Calendar, Printer, Download, Share2, TrendingUp, TrendingDown, ArrowUp, ArrowDown, ShieldX } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRole } from '../contexts/RoleContext';

import { complianceScores, locationScores, locations as demoLocations, PILLAR_WEIGHTS, getWeights } from '../data/demoData';

type TabType = 'executive' | 'operational' | 'equipment' | 'documentation' | 'team';

export function Reports() {
  const { userRole } = useRole();
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [dateRange, setDateRange] = useState('this-month');
  const [selectedLocation, setSelectedLocation] = useState('all');

  if (userRole !== 'management') {
    return (
      <Layout>
        <div className="p-6">
          <Breadcrumb items={[{ label: 'Reports', path: '/reports' }]} />
          <div className="mt-8 flex flex-col items-center justify-center py-12">
            <ShieldX className="h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 text-center max-w-md">
              You don't have access to this page. Contact your organization admin.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const scoreData = [
    { week: 'Wk 1', score: 68 },
    { week: 'Wk 2', score: 67 },
    { week: 'Wk 3', score: 69 },
    { week: 'Wk 4', score: 68 },
    { week: 'Wk 5', score: 70 },
    { week: 'Wk 6', score: 69 },
    { week: 'Wk 7', score: 71 },
    { week: 'Wk 8', score: 72 },
    { week: 'Wk 9', score: 71 },
    { week: 'Wk 10', score: 73 },
    { week: 'Wk 11', score: 72 },
    { week: 'Wk 12', score: 74 },
  ];

  const locationComparison = demoLocations.map(loc => {
    const scores = locationScores[loc.urlId];
    return {
      location: loc.name,
      score: scores?.overall || 0,
      operational: scores?.operational || 0,
      equipment: scores?.equipment || 0,
      documentation: scores?.documentation || 0,
      change: '+5%',
      status: scores?.overall >= 90 ? 'Inspection Ready' : scores?.overall >= 80 ? 'Good Standing' : scores?.overall >= 70 ? 'Needs Attention' : scores?.overall >= 60 ? 'At Risk' : 'Critical',
    };
  });

  const topIssues = [
    { issue: 'Food handler certifications expiring', priority: 'HIGH', affected: '3 locations' },
    { issue: 'Missing temperature logs on weekends', priority: 'MEDIUM', affected: '2 locations' },
    { issue: 'Fire suppression inspection due', priority: 'HIGH', affected: '1 location' },
    { issue: 'Incomplete closing checklists', priority: 'MEDIUM', affected: '2 locations' },
    { issue: 'Vendor COI documents expiring', priority: 'LOW', affected: '2 vendors' },
  ];

  const tempComplianceData = [
    { week: 'Wk 1', compliance: 88 },
    { week: 'Wk 2', compliance: 90 },
    { week: 'Wk 3', compliance: 89 },
    { week: 'Wk 4', compliance: 91 },
    { week: 'Wk 5', compliance: 93 },
    { week: 'Wk 6', compliance: 92 },
    { week: 'Wk 7', compliance: 94 },
    { week: 'Wk 8', compliance: 93 },
    { week: 'Wk 9', compliance: 95 },
    { week: 'Wk 10', compliance: 92 },
    { week: 'Wk 11', compliance: 97 },
    { week: 'Wk 12', compliance: 94 },
  ];

  const checklistCompletion = [
    { template: 'Opening Checklist', rate: 96, completed: 28, missed: 2 },
    { template: 'Closing Checklist', rate: 89, completed: 26, missed: 4 },
    { template: 'Daily Cleaning', rate: 92, completed: 27, missed: 3 },
    { template: 'Equipment Check', rate: 85, completed: 25, missed: 5 },
    { template: 'Weekly Deep Clean', rate: 75, completed: 3, missed: 1 },
  ];

  const missedTasks = [
    { date: '2026-02-04', task: 'Closing Checklist', location: 'Airport Cafe', responsible: 'Unassigned' },
    { date: '2026-02-03', task: 'Temperature Log - Walk-in Cooler', location: 'Downtown', responsible: 'John Smith' },
    { date: '2026-02-02', task: 'Equipment Check', location: 'Mall Location', responsible: 'Sarah Johnson' },
    { date: '2026-02-01', task: 'Opening Checklist', location: 'Airport Cafe', responsible: 'Mike Davis' },
  ];

  const correctiveActions = [
    { action: 'Replace walk-in cooler thermometer', status: 'Open', daysOpen: 2, location: 'Downtown' },
    { action: 'Retrain staff on temp log procedures', status: 'In Progress', daysOpen: 5, location: 'Airport Cafe' },
    { action: 'Schedule fire suppression inspection', status: 'Resolved', daysOpen: 0, location: 'Mall Location' },
  ];

  const haccpCompliance = [
    { location: 'Downtown Restaurant', monitoring: 98, records: 100, corrective: 95 },
    { location: 'Airport Cafe', monitoring: 92, records: 95, corrective: 90 },
    { location: 'Mall Location', monitoring: 88, records: 92, corrective: 85 },
  ];

  const vendorServices = [
    { vendor: 'A1 Fire Protection', service: 'Fire Suppression Inspection', date: '2026-01-15', result: 'Pass', location: 'Downtown' },
    { vendor: 'Valley Fire Equipment', service: 'Fire Extinguisher Service', date: '2026-01-20', result: 'Pass', location: 'Airport Cafe' },
    { vendor: 'CoolTech HVAC', service: 'Hood Cleaning', date: '2026-01-25', result: 'Pass', location: 'Mall Location' },
    { vendor: 'A1 Fire Protection', service: 'Fire Alarm Inspection', date: '2026-02-01', result: 'Pass', location: 'Downtown' },
  ];

  const equipmentCertifications = [
    { equipment: 'Fire Suppression System', location: 'Downtown', status: 'Current', expires: '2026-07-15' },
    { equipment: 'Fire Suppression System', location: 'Airport Cafe', status: 'Expiring Soon', expires: '2026-02-20' },
    { equipment: 'Hood System', location: 'Mall Location', status: 'Current', expires: '2026-05-10' },
    { equipment: 'Fire Alarm', location: 'Downtown', status: 'Current', expires: '2026-08-01' },
  ];

  const maintenanceSchedule = [
    { equipment: 'Hood Cleaning', dueDate: '2026-02-15', lastService: '2026-01-15', adherence: 'On Track' },
    { equipment: 'Fire Extinguisher Inspection', dueDate: '2026-02-20', lastService: '2026-01-20', adherence: 'On Track' },
    { equipment: 'HVAC Filter Change', dueDate: '2026-02-10', lastService: '2025-12-10', adherence: 'Overdue' },
    { equipment: 'Grease Trap Service', dueDate: '2026-02-25', lastService: '2026-01-25', adherence: 'On Track' },
  ];

  const vendorSpend = [
    { category: 'Fire Protection', amount: '$850', services: 3 },
    { category: 'HVAC/Hood', amount: '$650', services: 2 },
    { category: 'Pest Control', amount: '$400', services: 3 },
    { category: 'Grease Trap', amount: '$300', services: 1 },
  ];

  const documentInventory = [
    { type: 'Insurance COI', total: 15, current: 12, expiring: 2, expired: 1 },
    { type: 'Vendor Certificates', total: 22, current: 18, expiring: 3, expired: 1 },
    { type: 'Food Handler Certs', total: 18, current: 14, expiring: 3, expired: 1 },
    { type: 'Business Licenses', total: 3, current: 3, expiring: 0, expired: 0 },
  ];

  const expirationTimeline = [
    { document: 'Valley Fire - COI', type: 'Insurance', expires: '2026-02-15', daysLeft: 9, location: 'Downtown' },
    { document: 'Sarah Johnson - Food Handler', type: 'Certification', expires: '2026-02-20', daysLeft: 14, location: 'Airport Cafe' },
    { document: 'A1 Fire - Workers Comp', type: 'Insurance', expires: '2026-03-01', daysLeft: 23, location: 'All' },
    { document: 'Mike Davis - Food Handler', type: 'Certification', expires: '2026-03-10', daysLeft: 32, location: 'Mall Location' },
  ];

  const missingDocs = [
    { document: 'Pest Control COI', location: 'Airport Cafe', category: 'Insurance', daysOverdue: 5 },
    { document: 'Hood Cleaning Certificate', location: 'Mall Location', category: 'Service', daysOverdue: 2 },
    { document: 'Fire Alarm Inspection', location: 'Downtown', category: 'Certification', daysOverdue: 0 },
  ];

  const vendorDocCompliance = [
    { vendor: 'A1 Fire Protection', coi: 'Current', certs: 'Current', insurance: 'Current', status: 'Compliant' },
    { vendor: 'Valley Fire Equipment', coi: 'Expiring Soon', certs: 'Current', insurance: 'Current', status: 'At Risk' },
    { vendor: 'CoolTech HVAC', coi: 'Expired', certs: 'Current', insurance: 'Current', status: 'Non-Compliant' },
    { vendor: 'Pest Solutions', coi: 'Missing', certs: 'Current', insurance: 'Missing', status: 'Non-Compliant' },
  ];

  const staffCertifications = [
    { name: 'John Smith', location: 'Downtown', status: 'Current', expires: '2026-08-15', daysLeft: 190 },
    { name: 'Sarah Johnson', location: 'Airport Cafe', status: 'Expiring Soon', expires: '2026-02-20', daysLeft: 14 },
    { name: 'Mike Davis', location: 'Mall Location', status: 'Expiring Soon', expires: '2026-03-10', daysLeft: 32 },
    { name: 'Emily Chen', location: 'Downtown', status: 'Expired', expires: '2026-01-30', daysLeft: -7 },
  ];

  const taskCompletionByEmployee = [
    { employee: 'John Smith', completed: 145, missed: 5, rate: 97 },
    { employee: 'Sarah Johnson', completed: 132, missed: 8, rate: 94 },
    { employee: 'Mike Davis', completed: 128, missed: 12, rate: 91 },
    { employee: 'Emily Chen', completed: 115, missed: 15, rate: 88 },
    { employee: 'Tom Wilson', completed: 98, missed: 22, rate: 82 },
  ];

  const trainingRecords = [
    { training: 'Food Handler Certification', completed: 15, pending: 3, rate: 83 },
    { training: 'Allergen Awareness', completed: 12, pending: 6, rate: 67 },
    { training: 'Temperature Logging', completed: 18, pending: 0, rate: 100 },
    { training: 'Cleaning Procedures', completed: 14, pending: 4, rate: 78 },
  ];

  const loginActivity = [
    { employee: 'John Smith', lastLogin: '2026-02-06', logins: 28, avgPerWeek: 6.5 },
    { employee: 'Sarah Johnson', lastLogin: '2026-02-05', logins: 22, avgPerWeek: 5.2 },
    { employee: 'Mike Davis', lastLogin: '2026-02-04', logins: 18, avgPerWeek: 4.1 },
    { employee: 'Emily Chen', lastLogin: '2026-01-28', logins: 8, avgPerWeek: 1.8 },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = '';
    let filename = '';

    if (activeTab === 'executive') {
      csvContent = 'Location,Score,Change,Status\n';
      locationComparison.forEach(r => {
        csvContent += `"${r.location}",${r.score},"${r.change}","${r.status}"\n`;
      });
      csvContent += '\nTop Issues\nIssue,Priority,Affected\n';
      topIssues.forEach(r => {
        csvContent += `"${r.issue}","${r.priority}","${r.affected}"\n`;
      });
      filename = `evidly-executive-summary-${dateRange}.csv`;
    } else if (activeTab === 'operational') {
      csvContent = 'Template,Completion Rate,Completed,Missed\n';
      checklistCompletion.forEach(r => {
        csvContent += `"${r.template}",${r.rate}%,${r.completed},${r.missed}\n`;
      });
      csvContent += '\nMissed Tasks\nDate,Task,Location,Responsible\n';
      missedTasks.forEach(r => {
        csvContent += `"${r.date}","${r.task}","${r.location}","${r.responsible}"\n`;
      });
      filename = `evidly-operational-report-${dateRange}.csv`;
    } else if (activeTab === 'equipment') {
      csvContent = 'Equipment,Location,Status,Expires\n';
      equipmentCertifications.forEach(r => {
        csvContent += `"${r.equipment}","${r.location}","${r.status}","${r.expires}"\n`;
      });
      filename = `evidly-equipment-report-${dateRange}.csv`;
    } else if (activeTab === 'documentation') {
      csvContent = 'Type,Total,Current,Expiring,Expired\n';
      documentInventory.forEach(r => {
        csvContent += `"${r.type}",${r.total},${r.current},${r.expiring},${r.expired}\n`;
      });
      filename = `evidly-documentation-report-${dateRange}.csv`;
    } else {
      csvContent = 'Employee,Completed,Missed,Rate\n';
      taskCompletionByEmployee.forEach(r => {
        csvContent += `"${r.employee}",${r.completed},${r.missed},${r.rate}%\n`;
      });
      filename = `evidly-team-report-${dateRange}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 font-semibold';
      case 'MEDIUM': return 'text-yellow-600 font-semibold';
      case 'LOW': return 'text-green-600 font-semibold';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('Inspection Ready') || status.includes('Current') || status.includes('Compliant')) return 'text-green-600';
    if (status.includes('Good Standing') || status.includes('Needs Attention') || status.includes('Expiring') || status.includes('At Risk')) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout title="Reports">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports' }]} />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Management Reports</h1>
            <p className="text-gray-600 mt-1">Comprehensive insights and analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Locations</option>
              {demoLocations.map(loc => (
                <option key={loc.urlId} value={loc.urlId}>{loc.name}</option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="this-quarter">This Quarter</option>
              <option value="custom">Custom Range</option>
            </select>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Printer className="h-5 w-5" />
              Print
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f]"
            >
              <Download className="h-5 w-5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'executive', label: 'Executive Summary' },
            { id: 'operational', label: 'Operational' },
            { id: 'equipment', label: 'Equipment' },
            { id: 'documentation', label: 'Documentation' },
            { id: 'team', label: 'Team' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#d4af37] text-[#1e4d6b]'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'executive' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Compliance Score</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl font-bold text-[#1e4d6b]">{complianceScores.overall}%</div>
                <div className="flex items-center text-green-600">
                  <TrendingUp className="h-5 w-5 mr-1" />
                  <span className="font-medium">+8% from last month</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Operational ({Math.round(getWeights().operational * 100)}%)</p>
                  <p className="text-xl font-bold text-blue-700">{complianceScores.operational}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Equipment ({Math.round(getWeights().equipment * 100)}%)</p>
                  <p className="text-xl font-bold text-green-700">{complianceScores.equipment}</p>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#fdf6e3' }}>
                  <p className="text-xs mb-1" style={{ color: '#78716c' }}>Documentation ({Math.round(getWeights().documentation * 100)}%)</p>
                  <p className="text-xl font-bold" style={{ color: '#92400e' }}>{complianceScores.documentation}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#1e4d6b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Location Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operational ({Math.round(getWeights().operational * 100)}%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment ({Math.round(getWeights().equipment * 100)}%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documentation ({Math.round(getWeights().documentation * 100)}%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {locationComparison.map((loc, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loc.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{loc.score}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-medium">{loc.operational}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-medium">{loc.equipment}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#92400e' }}>{loc.documentation}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-semibold ${getStatusColor(loc.status)}`}>{loc.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Issues Requiring Attention</h3>
              <div className="space-y-3">
                {topIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{issue.issue}</div>
                      <div className="text-sm text-gray-600">{issue.affected}</div>
                    </div>
                    <span className={getPriorityColor(issue.priority)}>{issue.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'operational' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Temperature Compliance Rate</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tempComplianceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="compliance" fill="#1e4d6b" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Checklist Completion Rates</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Missed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {checklistCompletion.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.template}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item.rate}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{item.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{item.missed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Missed Tasks Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsible</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {missedTasks.map((task, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{task.task}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task.responsible}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Corrective Actions</h3>
                <p className="text-sm text-gray-600">Average resolution time: 4.5 days</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Open</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {correctiveActions.map((action, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{action.action}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            action.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                            action.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {action.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{action.daysOpen || 'Closed'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{action.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">HACCP Monitoring Compliance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monitoring</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Corrective Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {haccpCompliance.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.monitoring}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.records}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.corrective}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Vendor Service History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorServices.map((service, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{service.vendor}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{service.service}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{service.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={service.result === 'Pass' ? 'text-green-600' : 'text-red-600'}>
                            {service.result}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{service.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Equipment Certification Status</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {equipmentCertifications.map((cert, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{cert.equipment}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{cert.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getStatusColor(cert.status)}>{cert.status}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cert.expires}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Maintenance Schedule Adherence</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adherence</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {maintenanceSchedule.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.equipment}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.dueDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.lastService}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={item.adherence === 'On Track' ? 'text-green-600' : 'text-red-600'}>
                            {item.adherence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Cost Tracking: Vendor Spend by Category</h3>
                <p className="text-sm text-gray-600">Total spend this month: $2,200</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorSpend.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.services}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documentation' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Document Inventory</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiring</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expired</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documentInventory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.total}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{item.current}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{item.expiring}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{item.expired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Expiration Timeline</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Left</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expirationTimeline.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.document}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.expires}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={item.daysLeft <= 14 ? 'text-red-600' : item.daysLeft <= 30 ? 'text-yellow-600' : 'text-green-600'}>
                            {item.daysLeft} days
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Missing Required Documents</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {missingDocs.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.document}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{doc.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{doc.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{doc.daysOverdue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Vendor Document Compliance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COI</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certifications</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorDocCompliance.map((vendor, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{vendor.vendor}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getStatusColor(vendor.coi)}>{vendor.coi}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getStatusColor(vendor.certs)}>{vendor.certs}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getStatusColor(vendor.insurance)}>{vendor.insurance}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getStatusColor(vendor.status)}>{vendor.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Staff Certification Status</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Left</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffCertifications.map((staff, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{staff.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{staff.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getStatusColor(staff.status)}>{staff.status}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{staff.expires}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={staff.daysLeft < 0 ? 'text-red-600' : staff.daysLeft <= 30 ? 'text-yellow-600' : 'text-green-600'}>
                            {staff.daysLeft < 0 ? `${Math.abs(staff.daysLeft)} days ago` : `${staff.daysLeft} days`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Task Completion by Employee</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Missed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taskCompletionByEmployee.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.employee}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{emp.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{emp.missed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{emp.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Training Records Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trainingRecords.map((training, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{training.training}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{training.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{training.pending}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{training.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Login Activity</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Logins</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Per Week</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loginActivity.map((activity, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{activity.employee}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{activity.lastLogin}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{activity.logins}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{activity.avgPerWeek}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
