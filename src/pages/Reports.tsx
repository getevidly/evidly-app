import { useState, useMemo } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { Printer, Download, TrendingUp, ShieldX, Activity, Thermometer, FileText } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRole } from '../contexts/RoleContext';

import { complianceScores, locationScores, locations as demoLocations, getWeights } from '../data/demoData';

type TabType = 'executive' | 'operational' | 'equipment' | 'documentation' | 'team';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    'Inspection Ready': { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    'Good Standing': { bg: '#eff6ff', text: '#1e4d6b', border: '#bfdbfe' },
    'Needs Attention': { bg: '#fffbeb', text: '#92400e', border: '#fef3c7' },
    'At Risk': { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
    'Critical': { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    'Current': { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    'Compliant': { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    'On Track': { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    'Pass': { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    'Resolved': { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    'Expiring Soon': { bg: '#fffbeb', text: '#92400e', border: '#fef3c7' },
    'In Progress': { bg: '#fffbeb', text: '#92400e', border: '#fef3c7' },
    'Expired': { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    'Non-Compliant': { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    'Overdue': { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    'Missing': { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    'Open': { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    'Fail': { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  };
  const s = styles[status] || { bg: '#f9fafb', text: '#374151', border: '#e5e7eb' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: s.bg,
      color: s.text,
      border: `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    'HIGH': { bg: '#fef2f2', text: '#ef4444', border: '#fecaca' },
    'MEDIUM': { bg: '#fffbeb', text: '#d4af37', border: '#fef3c7' },
    'LOW': { bg: '#eff6ff', text: '#1e4d6b', border: '#dbeafe' },
  };
  const s = styles[priority] || { bg: '#f9fafb', text: '#374151', border: '#e5e7eb' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: s.bg,
      color: s.text,
      border: `1px solid ${s.border}`,
    }}>
      {priority}
    </span>
  );
}

function ProgressBar({ value, color = '#1e4d6b' }: { value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, backgroundColor: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', minWidth: '36px', textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 95) return '#22c55e';
  if (score >= 90) return '#1e4d6b';
  if (score >= 80) return '#d4af37';
  return '#ef4444';
}

export function Reports() {
  const { userRole, getAccessibleLocations: getReportLocations, showAllLocationsOption: showAllLocs } = useRole();
  const reportAccessibleLocs = getReportLocations();
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [dateRange, setDateRange] = useState('this-month');
  const [selectedLocation, setSelectedLocation] = useState('all');

  if (!['executive', 'management'].includes(userRole)) {
    return (
      <div className="p-6">
        <Breadcrumb items={[{ label: 'Reporting' }]} />
        <div className="mt-8 flex flex-col items-center justify-center py-12">
          <ShieldX className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 text-center max-w-md">
            You don't have access to this page. Contact your organization admin.
          </p>
        </div>
      </div>
    );
  }

  const selectedLocName = selectedLocation !== 'all'
    ? demoLocations.find(l => l.urlId === selectedLocation)?.name || ''
    : '';

  const scoreDataLocations = {
    'downtown': [
      { week: 'Wk 1', score: 82 }, { week: 'Wk 2', score: 83 }, { week: 'Wk 3', score: 84 },
      { week: 'Wk 4', score: 83 }, { week: 'Wk 5', score: 85 }, { week: 'Wk 6', score: 86 },
      { week: 'Wk 7', score: 87 }, { week: 'Wk 8', score: 88 }, { week: 'Wk 9', score: 87 },
      { week: 'Wk 10', score: 89 }, { week: 'Wk 11', score: 88 }, { week: 'Wk 12', score: 90 },
    ],
    'airport': [
      { week: 'Wk 1', score: 65 }, { week: 'Wk 2', score: 64 }, { week: 'Wk 3', score: 66 },
      { week: 'Wk 4', score: 65 }, { week: 'Wk 5', score: 67 }, { week: 'Wk 6', score: 66 },
      { week: 'Wk 7', score: 68 }, { week: 'Wk 8', score: 69 }, { week: 'Wk 9', score: 68 },
      { week: 'Wk 10', score: 70 }, { week: 'Wk 11', score: 69 }, { week: 'Wk 12', score: 71 },
    ],
    'university': [
      { week: 'Wk 1', score: 52 }, { week: 'Wk 2', score: 51 }, { week: 'Wk 3', score: 53 },
      { week: 'Wk 4', score: 54 }, { week: 'Wk 5', score: 55 }, { week: 'Wk 6', score: 54 },
      { week: 'Wk 7', score: 56 }, { week: 'Wk 8', score: 57 }, { week: 'Wk 9', score: 56 },
      { week: 'Wk 10', score: 58 }, { week: 'Wk 11', score: 57 }, { week: 'Wk 12', score: 59 },
    ],
  };
  // All = average of 3 locations (e.g. Wk1: (82+65+52)/3 = 66)
  const scoreDataByLocation: Record<string, { week: string; score: number }[]> = {
    ...scoreDataLocations,
    'all': scoreDataLocations.downtown.map((item, i) => ({
      week: item.week,
      score: Math.round((item.score + scoreDataLocations.airport[i].score + scoreDataLocations.university[i].score) / 3),
    })),
  };
  const scoreData = scoreDataByLocation[selectedLocation] || scoreDataByLocation['all'];

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

  const tempComplianceLocations = {
    'downtown': [
      { week: 'Wk 1', compliance: 94 }, { week: 'Wk 2', compliance: 96 }, { week: 'Wk 3', compliance: 95 },
      { week: 'Wk 4', compliance: 97 }, { week: 'Wk 5', compliance: 98 }, { week: 'Wk 6', compliance: 97 },
      { week: 'Wk 7', compliance: 99 }, { week: 'Wk 8', compliance: 98 }, { week: 'Wk 9', compliance: 100 },
      { week: 'Wk 10', compliance: 97 }, { week: 'Wk 11', compliance: 100 }, { week: 'Wk 12', compliance: 98 },
    ],
    'airport': [
      { week: 'Wk 1', compliance: 82 }, { week: 'Wk 2', compliance: 84 }, { week: 'Wk 3', compliance: 83 },
      { week: 'Wk 4', compliance: 85 }, { week: 'Wk 5', compliance: 87 }, { week: 'Wk 6', compliance: 86 },
      { week: 'Wk 7', compliance: 88 }, { week: 'Wk 8', compliance: 87 }, { week: 'Wk 9', compliance: 89 },
      { week: 'Wk 10', compliance: 86 }, { week: 'Wk 11', compliance: 91 }, { week: 'Wk 12', compliance: 88 },
    ],
    'university': [
      { week: 'Wk 1', compliance: 75 }, { week: 'Wk 2', compliance: 77 }, { week: 'Wk 3', compliance: 76 },
      { week: 'Wk 4', compliance: 78 }, { week: 'Wk 5', compliance: 80 }, { week: 'Wk 6', compliance: 79 },
      { week: 'Wk 7', compliance: 81 }, { week: 'Wk 8', compliance: 80 }, { week: 'Wk 9', compliance: 82 },
      { week: 'Wk 10', compliance: 79 }, { week: 'Wk 11', compliance: 84 }, { week: 'Wk 12', compliance: 81 },
    ],
  };
  // All = average of 3 locations (e.g. Wk1: (94+82+75)/3 = 84)
  const tempComplianceByLocation: Record<string, { week: string; compliance: number }[]> = {
    ...tempComplianceLocations,
    'all': tempComplianceLocations.downtown.map((item, i) => ({
      week: item.week,
      compliance: Math.round((item.compliance + tempComplianceLocations.airport[i].compliance + tempComplianceLocations.university[i].compliance) / 3),
    })),
  };
  const tempComplianceData = tempComplianceByLocation[selectedLocation] || tempComplianceByLocation['all'];

  const checklistCompletionLocations = {
    'downtown': [
      { template: 'Opening Checklist', rate: 100, completed: 10, missed: 0 },
      { template: 'Closing Checklist', rate: 95, completed: 9, missed: 1 },
      { template: 'Daily Cleaning', rate: 100, completed: 10, missed: 0 },
      { template: 'Equipment Check', rate: 90, completed: 9, missed: 1 },
      { template: 'Weekly Deep Clean', rate: 100, completed: 1, missed: 0 },
    ],
    'airport': [
      { template: 'Opening Checklist', rate: 90, completed: 9, missed: 1 },
      { template: 'Closing Checklist', rate: 80, completed: 8, missed: 2 },
      { template: 'Daily Cleaning', rate: 85, completed: 8, missed: 2 },
      { template: 'Equipment Check', rate: 80, completed: 8, missed: 2 },
      { template: 'Weekly Deep Clean', rate: 75, completed: 1, missed: 0 },
    ],
    'university': [
      { template: 'Opening Checklist', rate: 80, completed: 8, missed: 2 },
      { template: 'Closing Checklist', rate: 70, completed: 7, missed: 3 },
      { template: 'Daily Cleaning', rate: 75, completed: 7, missed: 3 },
      { template: 'Equipment Check', rate: 65, completed: 6, missed: 4 },
      { template: 'Weekly Deep Clean', rate: 50, completed: 1, missed: 1 },
    ],
  };
  // All = sum completed/missed across locations, rate = completed/(completed+missed)
  const checklistCompletionByLocation: Record<string, { template: string; rate: number; completed: number; missed: number }[]> = {
    ...checklistCompletionLocations,
    'all': checklistCompletionLocations.downtown.map((item, i) => {
      const completed = item.completed + checklistCompletionLocations.airport[i].completed + checklistCompletionLocations.university[i].completed;
      const missed = item.missed + checklistCompletionLocations.airport[i].missed + checklistCompletionLocations.university[i].missed;
      const total = completed + missed;
      return { template: item.template, completed, missed, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }),
  };
  const checklistCompletion = checklistCompletionByLocation[selectedLocation] || checklistCompletionByLocation['all'];

  const allMissedTasks = [
    { date: '2026-02-04', task: 'Closing Checklist', location: 'Airport Cafe', responsible: 'Unassigned' },
    { date: '2026-02-03', task: 'Temperature Log - Walk-in Cooler', location: 'Downtown Kitchen', responsible: 'John Smith' },
    { date: '2026-02-02', task: 'Equipment Check', location: 'University Dining', responsible: 'Sarah Johnson' },
    { date: '2026-02-01', task: 'Opening Checklist', location: 'Airport Cafe', responsible: 'Mike Davis' },
  ];
  const missedTasks = selectedLocName ? allMissedTasks.filter(t => t.location === selectedLocName) : allMissedTasks;

  const allCorrectiveActions = [
    { action: 'Replace walk-in cooler thermometer', status: 'Open', daysOpen: 2, location: 'Downtown Kitchen' },
    { action: 'Retrain staff on temp log procedures', status: 'In Progress', daysOpen: 5, location: 'Airport Cafe' },
    { action: 'Schedule fire suppression inspection', status: 'Resolved', daysOpen: 0, location: 'University Dining' },
  ];
  const correctiveActions = selectedLocName ? allCorrectiveActions.filter(a => a.location === selectedLocName) : allCorrectiveActions;

  const allHaccpCompliance = [
    { location: 'Downtown Kitchen', monitoring: 98, records: 100, corrective: 95 },
    { location: 'Airport Cafe', monitoring: 92, records: 95, corrective: 90 },
    { location: 'University Dining', monitoring: 88, records: 92, corrective: 85 },
  ];
  const haccpCompliance = selectedLocName ? allHaccpCompliance.filter(h => h.location === selectedLocName) : allHaccpCompliance;

  const allVendorServices = [
    { vendor: 'A1 Fire Protection', service: 'Fire Suppression Inspection', date: '2026-01-15', result: 'Pass', location: 'Downtown Kitchen' },
    { vendor: 'Valley Fire Equipment', service: 'Fire Extinguisher Service', date: '2026-01-20', result: 'Pass', location: 'Airport Cafe' },
    { vendor: 'CoolTech HVAC', service: 'Hood Cleaning', date: '2026-01-25', result: 'Pass', location: 'University Dining' },
    { vendor: 'A1 Fire Protection', service: 'Fire Alarm Inspection', date: '2026-02-01', result: 'Pass', location: 'Downtown Kitchen' },
  ];
  const vendorServices = selectedLocName ? allVendorServices.filter(v => v.location === selectedLocName) : allVendorServices;

  const allEquipmentCertifications = [
    { equipment: 'Fire Suppression System', location: 'Downtown Kitchen', status: 'Current', expires: '2026-07-15' },
    { equipment: 'Fire Suppression System', location: 'Airport Cafe', status: 'Expiring Soon', expires: '2026-02-20' },
    { equipment: 'Hood System', location: 'University Dining', status: 'Current', expires: '2026-05-10' },
    { equipment: 'Fire Alarm', location: 'Downtown Kitchen', status: 'Current', expires: '2026-08-01' },
  ];
  const equipmentCertifications = selectedLocName ? allEquipmentCertifications.filter(e => e.location === selectedLocName) : allEquipmentCertifications;

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

  const documentInventoryByLocation: Record<string, { type: string; total: number; current: number; expiring: number; expired: number }[]> = {
    'all': [
      { type: 'Insurance COI', total: 15, current: 12, expiring: 2, expired: 1 },
      { type: 'Vendor Certificates', total: 22, current: 18, expiring: 3, expired: 1 },
      { type: 'Food Handler Certs', total: 18, current: 14, expiring: 3, expired: 1 },
      { type: 'Business Licenses', total: 3, current: 3, expiring: 0, expired: 0 },
    ],
    'downtown': [
      { type: 'Insurance COI', total: 5, current: 5, expiring: 0, expired: 0 },
      { type: 'Vendor Certificates', total: 8, current: 7, expiring: 1, expired: 0 },
      { type: 'Food Handler Certs', total: 7, current: 6, expiring: 1, expired: 0 },
      { type: 'Business Licenses', total: 1, current: 1, expiring: 0, expired: 0 },
    ],
    'airport': [
      { type: 'Insurance COI', total: 5, current: 4, expiring: 1, expired: 0 },
      { type: 'Vendor Certificates', total: 7, current: 5, expiring: 1, expired: 1 },
      { type: 'Food Handler Certs', total: 6, current: 4, expiring: 1, expired: 1 },
      { type: 'Business Licenses', total: 1, current: 1, expiring: 0, expired: 0 },
    ],
    'university': [
      { type: 'Insurance COI', total: 5, current: 3, expiring: 1, expired: 1 },
      { type: 'Vendor Certificates', total: 7, current: 6, expiring: 1, expired: 0 },
      { type: 'Food Handler Certs', total: 5, current: 4, expiring: 1, expired: 0 },
      { type: 'Business Licenses', total: 1, current: 1, expiring: 0, expired: 0 },
    ],
  };
  const documentInventory = documentInventoryByLocation[selectedLocation] || documentInventoryByLocation['all'];

  const allExpirationTimeline = [
    { document: 'Valley Fire - COI', type: 'Insurance', expires: '2026-02-15', daysLeft: 9, location: 'Downtown Kitchen' },
    { document: 'Sarah Johnson - Food Handler', type: 'Certification', expires: '2026-02-20', daysLeft: 14, location: 'Airport Cafe' },
    { document: 'A1 Fire - Workers Comp', type: 'Insurance', expires: '2026-03-01', daysLeft: 23, location: 'All Locations' },
    { document: 'Mike Davis - Food Handler', type: 'Certification', expires: '2026-03-10', daysLeft: 32, location: 'University Dining' },
  ];
  const expirationTimeline = selectedLocName
    ? allExpirationTimeline.filter(e => e.location === selectedLocName || e.location === 'All Locations')
    : allExpirationTimeline;

  const allMissingDocs = [
    { document: 'Pest Control COI', location: 'Airport Cafe', category: 'Insurance', daysOverdue: 5 },
    { document: 'Hood Cleaning Certificate', location: 'University Dining', category: 'Service', daysOverdue: 2 },
    { document: 'Fire Alarm Inspection', location: 'Downtown Kitchen', category: 'Certification', daysOverdue: 0 },
  ];
  const missingDocs = selectedLocName ? allMissingDocs.filter(d => d.location === selectedLocName) : allMissingDocs;

  const vendorDocCompliance = [
    { vendor: 'A1 Fire Protection', coi: 'Current', certs: 'Current', insurance: 'Current', status: 'Compliant' },
    { vendor: 'Valley Fire Equipment', coi: 'Expiring Soon', certs: 'Current', insurance: 'Current', status: 'At Risk' },
    { vendor: 'CoolTech HVAC', coi: 'Expired', certs: 'Current', insurance: 'Current', status: 'Non-Compliant' },
    { vendor: 'Pest Solutions', coi: 'Missing', certs: 'Current', insurance: 'Missing', status: 'Non-Compliant' },
  ];

  const allStaffCertifications = [
    { name: 'John Smith', location: 'Downtown Kitchen', status: 'Current', expires: '2026-08-15', daysLeft: 190 },
    { name: 'Sarah Johnson', location: 'Airport Cafe', status: 'Expiring Soon', expires: '2026-02-20', daysLeft: 14 },
    { name: 'Mike Davis', location: 'University Dining', status: 'Expiring Soon', expires: '2026-03-10', daysLeft: 32 },
    { name: 'Emily Chen', location: 'Downtown Kitchen', status: 'Expired', expires: '2026-01-30', daysLeft: -7 },
  ];
  const staffCertifications = selectedLocName ? allStaffCertifications.filter(s => s.location === selectedLocName) : allStaffCertifications;

  const allTaskCompletionByEmployee = [
    { employee: 'John Smith', completed: 145, missed: 5, rate: 97, location: 'Downtown Kitchen' },
    { employee: 'Sarah Johnson', completed: 132, missed: 8, rate: 94, location: 'Airport Cafe' },
    { employee: 'Mike Davis', completed: 128, missed: 12, rate: 91, location: 'University Dining' },
    { employee: 'Emily Chen', completed: 115, missed: 15, rate: 88, location: 'Downtown Kitchen' },
    { employee: 'Tom Wilson', completed: 98, missed: 22, rate: 82, location: 'Airport Cafe' },
  ];
  const taskCompletionByEmployee = selectedLocName
    ? allTaskCompletionByEmployee.filter(e => e.location === selectedLocName)
    : allTaskCompletionByEmployee;

  const trainingRecordsByLocation: Record<string, { training: string; completed: number; pending: number; rate: number }[]> = {
    'all': [
      { training: 'Food Handler Certification', completed: 15, pending: 3, rate: 83 },
      { training: 'Allergen Awareness', completed: 12, pending: 6, rate: 67 },
      { training: 'Temperature Logging', completed: 18, pending: 0, rate: 100 },
      { training: 'Cleaning Procedures', completed: 14, pending: 4, rate: 78 },
    ],
    'downtown': [
      { training: 'Food Handler Certification', completed: 6, pending: 0, rate: 100 },
      { training: 'Allergen Awareness', completed: 5, pending: 1, rate: 83 },
      { training: 'Temperature Logging', completed: 6, pending: 0, rate: 100 },
      { training: 'Cleaning Procedures', completed: 6, pending: 0, rate: 100 },
    ],
    'airport': [
      { training: 'Food Handler Certification', completed: 5, pending: 1, rate: 83 },
      { training: 'Allergen Awareness', completed: 4, pending: 2, rate: 67 },
      { training: 'Temperature Logging', completed: 6, pending: 0, rate: 100 },
      { training: 'Cleaning Procedures', completed: 4, pending: 2, rate: 67 },
    ],
    'university': [
      { training: 'Food Handler Certification', completed: 4, pending: 2, rate: 67 },
      { training: 'Allergen Awareness', completed: 3, pending: 3, rate: 50 },
      { training: 'Temperature Logging', completed: 6, pending: 0, rate: 100 },
      { training: 'Cleaning Procedures', completed: 4, pending: 2, rate: 67 },
    ],
  };
  const trainingRecords = trainingRecordsByLocation[selectedLocation] || trainingRecordsByLocation['all'];

  const allLoginActivity = [
    { employee: 'John Smith', lastLogin: '2026-02-06', logins: 28, avgPerWeek: 6.5, location: 'Downtown Kitchen' },
    { employee: 'Sarah Johnson', lastLogin: '2026-02-05', logins: 22, avgPerWeek: 5.2, location: 'Airport Cafe' },
    { employee: 'Mike Davis', lastLogin: '2026-02-04', logins: 18, avgPerWeek: 4.1, location: 'University Dining' },
    { employee: 'Emily Chen', lastLogin: '2026-01-28', logins: 8, avgPerWeek: 1.8, location: 'Downtown Kitchen' },
  ];
  const loginActivity = selectedLocName
    ? allLoginActivity.filter(a => a.location === selectedLocName)
    : allLoginActivity;

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

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reporting' }]} />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporting</h1>
            <p className="text-sm text-gray-600 mt-1">Comprehensive insights and analytics</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              {showAllLocs() && <option value="all">All Locations</option>}
              {reportAccessibleLocs.map(loc => (
                <option key={loc.locationUrlId} value={loc.locationUrlId}>{loc.locationName}</option>
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
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Printer className="h-5 w-5" />
              Print
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150"
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Overall Compliance Score{selectedLocName ? ` — ${selectedLocName}` : ''}
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl font-bold text-center" style={{ color: '#1e4d6b' }}>
                  {selectedLocation !== 'all' && locationScores[selectedLocation]
                    ? locationScores[selectedLocation].overall
                    : complianceScores.overall}%
                </div>
                <div className="flex items-center text-green-600">
                  <TrendingUp className="h-5 w-5 mr-1" />
                  <span className="font-medium">+{selectedLocation === 'downtown' ? '12' : selectedLocation === 'airport' ? '6' : selectedLocation === 'university' ? '3' : '8'}% from last month</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg shadow-sm p-3" style={{ borderLeft: '4px solid #1e4d6b' }}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Activity className="h-3.5 w-3.5 text-[#1e4d6b]" />
                    <span className="text-xs text-gray-500 font-medium">Operational ({Math.round(getWeights().operational * 100)}%)</span>
                  </div>
                  <p className="text-xl font-bold text-center" style={{ color: '#1e4d6b' }}>
                    {selectedLocation !== 'all' && locationScores[selectedLocation]
                      ? locationScores[selectedLocation].operational
                      : complianceScores.operational}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-3" style={{ borderLeft: '4px solid #16a34a' }}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Thermometer className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs text-gray-500 font-medium">Equipment ({Math.round(getWeights().equipment * 100)}%)</span>
                  </div>
                  <p className="text-xl font-bold text-center text-green-700">
                    {selectedLocation !== 'all' && locationScores[selectedLocation]
                      ? locationScores[selectedLocation].equipment
                      : complianceScores.equipment}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-3" style={{ borderLeft: '4px solid #d4af37' }}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <FileText className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span className="text-xs text-gray-500 font-medium">Documentation ({Math.round(getWeights().documentation * 100)}%)</span>
                  </div>
                  <p className="text-xl font-bold text-center" style={{ color: '#92400e' }}>
                    {selectedLocation !== 'all' && locationScores[selectedLocation]
                      ? locationScores[selectedLocation].documentation
                      : complianceScores.documentation}
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 3 }} />
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#1e4d6b' }}>{loc.operational}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-medium">{loc.equipment}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#92400e' }}>{loc.documentation}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <StatusBadge status={loc.status} />
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
                    <PriorityBadge priority={issue.priority} />
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
                  <Bar dataKey="compliance" fill="#1e4d6b" radius={[4, 4, 0, 0]} />
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '200px' }}>Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Missed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {checklistCompletion.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.template}</td>
                        <td className="px-6 py-4 text-sm">
                          <ProgressBar value={item.rate} color={item.rate >= 90 ? '#22c55e' : item.rate >= 80 ? '#d4af37' : '#ef4444'} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{item.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{item.missed}</td>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {task.responsible === 'Unassigned'
                            ? <span style={{ color: '#ef4444', fontWeight: '600' }}>Unassigned</span>
                            : <span className="text-gray-600">{task.responsible}</span>
                          }
                        </td>
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
                          <StatusBadge status={action.status} />
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: getScoreColor(item.monitoring) }}>{item.monitoring}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: getScoreColor(item.records) }}>{item.records}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: getScoreColor(item.corrective) }}>{item.corrective}%</td>
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
                          <StatusBadge status={service.result} />
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
                          <StatusBadge status={cert.status} />
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
                          <StatusBadge status={item.adherence} />
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: '#1e4d6b' }}>{item.amount}</td>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '160px' }}>Health</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documentInventory.map((item, idx) => {
                      const healthPct = Math.round((item.current / item.total) * 100);
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{item.total}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{item.current}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#d4af37' }}>{item.expiring || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{item.expired || '-'}</td>
                          <td className="px-6 py-4 text-sm">
                            <ProgressBar value={healthPct} color={healthPct >= 90 ? '#22c55e' : healthPct >= 75 ? '#d4af37' : '#ef4444'} />
                          </td>
                        </tr>
                      );
                    })}
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
                          <span style={{
                            fontWeight: '600',
                            color: item.daysLeft <= 14 ? '#ef4444' : item.daysLeft <= 30 ? '#d4af37' : '#22c55e'
                          }}>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">{doc.daysOverdue > 0 ? doc.daysOverdue : 'Due today'}</td>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={vendor.coi} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={vendor.certs} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={vendor.insurance} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={vendor.status} /></td>
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
                          <StatusBadge status={staff.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{staff.expires}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span style={{
                            fontWeight: '600',
                            color: staff.daysLeft < 0 ? '#ef4444' : staff.daysLeft <= 30 ? '#d4af37' : '#22c55e'
                          }}>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '180px' }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taskCompletionByEmployee.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.employee}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{emp.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{emp.missed}</td>
                        <td className="px-6 py-4 text-sm">
                          <ProgressBar value={emp.rate} color={emp.rate >= 95 ? '#22c55e' : emp.rate >= 90 ? '#1e4d6b' : emp.rate >= 85 ? '#d4af37' : '#ef4444'} />
                        </td>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '180px' }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trainingRecords.map((training, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{training.training}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{training.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: training.pending > 0 ? '#d4af37' : '#22c55e' }}>{training.pending}</td>
                        <td className="px-6 py-4 text-sm">
                          <ProgressBar value={training.rate} color={training.rate >= 90 ? '#22c55e' : training.rate >= 75 ? '#d4af37' : '#ef4444'} />
                        </td>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span style={{
                            fontWeight: '600',
                            color: activity.avgPerWeek >= 5 ? '#22c55e' : activity.avgPerWeek >= 3 ? '#d4af37' : '#ef4444'
                          }}>
                            {activity.avgPerWeek}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
