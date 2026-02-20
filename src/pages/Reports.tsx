import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { Printer, Download, TrendingUp, ShieldX, Activity, Thermometer, FileText, ClipboardCheck } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRole } from '../contexts/RoleContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { useTranslation } from '../contexts/LanguageContext';

import { complianceScores, locationScores, locations as demoLocations, getWeights } from '../data/demoData';

type TabType = 'executive' | 'operational' | 'equipment' | 'team';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    'Inspection Ready': { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    'Needs Attention': { bg: '#fffbeb', text: '#92400e', border: '#fef3c7' },
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
      fontSize: '13px',
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
      fontSize: '13px',
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
      <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151', minWidth: '36px', textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#eab308';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

export function Reports() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userRole, getAccessibleLocations: getReportLocations, showAllLocationsOption: showAllLocs } = useRole();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const reportAccessibleLocs = getReportLocations();
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [dateRange, setDateRange] = useState('this-month');
  const [selectedLocation, setSelectedLocation] = useState('all');

  if (!['executive', 'owner_operator'].includes(userRole)) {
    return (
      <div className="p-6">
        <Breadcrumb items={[{ label: t('pages.reports.reporting') }]} />
        <div className="mt-8 flex flex-col items-center justify-center py-12">
          <ShieldX className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('pages.reports.accessRestricted')}</h2>
          <p className="text-gray-600 text-center max-w-md">
            {t('pages.reports.accessRestrictedDescription')}
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
      { week: 'Wk 1', score: 85 }, { week: 'Wk 2', score: 87 }, { week: 'Wk 3', score: 86 },
      { week: 'Wk 4', score: 88 }, { week: 'Wk 5', score: 89 }, { week: 'Wk 6', score: 90 },
      { week: 'Wk 7', score: 89 }, { week: 'Wk 8', score: 91 }, { week: 'Wk 9', score: 90 },
      { week: 'Wk 10', score: 92 }, { week: 'Wk 11', score: 91 }, { week: 'Wk 12', score: 92 },
    ],
    'airport': [
      { week: 'Wk 1', score: 64 }, { week: 'Wk 2', score: 65 }, { week: 'Wk 3', score: 66 },
      { week: 'Wk 4', score: 67 }, { week: 'Wk 5', score: 66 }, { week: 'Wk 6', score: 68 },
      { week: 'Wk 7', score: 69 }, { week: 'Wk 8', score: 68 }, { week: 'Wk 9', score: 69 },
      { week: 'Wk 10', score: 71 }, { week: 'Wk 11', score: 70 }, { week: 'Wk 12', score: 70 },
    ],
    'university': [
      { week: 'Wk 1', score: 42 }, { week: 'Wk 2', score: 44 }, { week: 'Wk 3', score: 46 },
      { week: 'Wk 4', score: 48 }, { week: 'Wk 5', score: 47 }, { week: 'Wk 6', score: 49 },
      { week: 'Wk 7', score: 51 }, { week: 'Wk 8', score: 50 }, { week: 'Wk 9', score: 52 },
      { week: 'Wk 10', score: 53 }, { week: 'Wk 11', score: 53 }, { week: 'Wk 12', score: 54 },
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
      foodSafety: scores?.foodSafety || 0,
      fireSafety: scores?.fireSafety || 0,
      change: '+5%',
      status: scores?.overall >= 90 ? 'Inspection Ready' : scores?.overall >= 70 ? 'Needs Attention' : 'Critical',
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
    { vendor: 'Valley Fire Equipment', coi: 'Expiring Soon', certs: 'Current', insurance: 'Current', status: 'Needs Attention' },
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
    guardAction('print', 'compliance reports', () => {
      window.print();
    });
  };

  const handleExportCSV = () => {
    guardAction('export', 'compliance reports', () => {
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
    });
  };

  return (
    <>
      <Breadcrumb items={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('pages.reports.reporting') }]} />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('pages.reports.reporting')}</h1>
            <p className="text-sm text-gray-600 mt-1">{t('pages.reports.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              {showAllLocs() && <option value="all">{t('common.allLocations')}</option>}
              {reportAccessibleLocs.map(loc => (
                <option key={loc.locationUrlId} value={loc.locationUrlId}>{loc.locationName}</option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="this-week">{t('pages.reports.thisWeek')}</option>
              <option value="this-month">{t('pages.reports.thisMonth')}</option>
              <option value="this-quarter">{t('pages.reports.thisQuarter')}</option>
              <option value="custom">{t('pages.reports.customRange')}</option>
            </select>
            <button
              onClick={() => navigate('/health-dept-report')}
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-[#d4af37] text-white rounded-lg hover:bg-[#b8962f] transition-colors duration-150"
            >
              <ClipboardCheck className="h-5 w-5" />
              <span className="hidden sm:inline">{t('pages.reports.healthDeptReport')}</span>
              <span className="sm:hidden">{t('pages.reports.healthDeptShort')}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Printer className="h-5 w-5" />
              {t('actions.print')}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150"
            >
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">{t('pages.reports.exportCsv')}</span>
              <span className="sm:hidden">{t('pages.reports.csvShort')}</span>
            </button>
          </div>
        </div>

        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'executive', label: t('pages.reports.executiveSummary') },
            { id: 'operational', label: t('pages.reports.foodSafety') },
            { id: 'equipment', label: t('pages.reports.fireSafety') },
            { id: 'team', label: t('pages.reports.team') },
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('pages.reports.overallComplianceScore')}{selectedLocName ? ` — ${selectedLocName}` : ''}
              </h3>
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                {(() => {
                  const overallScore = selectedLocation !== 'all' && locationScores[selectedLocation]
                    ? locationScores[selectedLocation].overall
                    : complianceScores.overall;
                  const overallColor = getScoreColor(overallScore);
                  return (
                    <div className="text-3xl sm:text-5xl font-bold text-center" style={{ color: overallColor }}>
                      {overallScore}
                    </div>
                  );
                })()}
                <div className="flex items-center text-green-600">
                  <TrendingUp className="h-5 w-5 mr-1" />
                  <span className="font-medium">+{selectedLocation === 'downtown' ? '12' : selectedLocation === 'airport' ? '6' : selectedLocation === 'university' ? '3' : '8'}% {t('pages.reports.fromLastMonth')}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {(() => {
                  const opScore = selectedLocation !== 'all' && locationScores[selectedLocation]
                    ? locationScores[selectedLocation].foodSafety : complianceScores.foodSafety;
                  const eqScore = selectedLocation !== 'all' && locationScores[selectedLocation]
                    ? locationScores[selectedLocation].fireSafety : complianceScores.fireSafety;
                  const opColor = getScoreColor(opScore);
                  const eqColor = getScoreColor(eqScore);
                  return (
                    <>
                      <div className="bg-white rounded-xl shadow-sm p-3" style={{ borderLeft: `4px solid ${opColor}` }}>
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Activity className="h-3.5 w-3.5" style={{ color: opColor }} />
                          <span className="text-sm text-gray-500 font-medium">{t('pages.reports.foodSafety')} ({Math.round(getWeights().foodSafety * 100)}%)</span>
                        </div>
                        <p className="text-xl font-bold text-center" style={{ color: opColor }}>{opScore}</p>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm p-3" style={{ borderLeft: `4px solid ${eqColor}` }}>
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Thermometer className="h-3.5 w-3.5" style={{ color: eqColor }} />
                          <span className="text-sm text-gray-500 font-medium">{t('pages.reports.fireSafety')} ({Math.round(getWeights().fireSafety * 100)}%)</span>
                        </div>
                        <p className="text-xl font-bold text-center" style={{ color: eqColor }}>{eqScore}</p>
                      </div>
                    </>
                  );
                })()}
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.locationComparison')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.location')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.overall')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.foodSafety')} ({Math.round(getWeights().foodSafety * 100)}%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.fireSafety')} ({Math.round(getWeights().fireSafety * 100)}%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {locationComparison.map((loc, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loc.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold" style={{ color: getScoreColor(loc.score) }}>{loc.score}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium hidden sm:table-cell" style={{ color: getScoreColor(loc.foodSafety) }}>{loc.foodSafety}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium hidden sm:table-cell" style={{ color: getScoreColor(loc.fireSafety) }}>{loc.fireSafety}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <StatusBadge status={loc.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.reports.topIssues')}</h3>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.reports.temperatureComplianceRate')}</h3>
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.checklistCompletionRates')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.template')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '160px' }}>{t('pages.reports.rate')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.completed')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.missed')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {checklistCompletion.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.template}</td>
                        <td className="px-6 py-4 text-sm">
                          <ProgressBar value={item.rate} color={item.rate >= 90 ? '#22c55e' : item.rate >= 75 ? '#eab308' : item.rate >= 60 ? '#f59e0b' : '#ef4444'} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium hidden sm:table-cell">{item.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium hidden sm:table-cell">{item.missed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.missedTasksSummary')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.date')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.task')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.location')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.responsible')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {missedTasks.map((task, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{task.task}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">{task.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm hidden sm:table-cell">
                          {task.responsible === 'Unassigned'
                            ? <span style={{ color: '#ef4444', fontWeight: '600' }}>{t('pages.reports.unassigned')}</span>
                            : <span className="text-gray-600">{task.responsible}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.correctiveActions')}</h3>
                <p className="text-sm text-gray-600">{t('pages.reports.avgResolutionTime')}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.action')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.daysOpen')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.location')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {correctiveActions.map((action, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{action.action}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <StatusBadge status={action.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">{action.daysOpen || t('pages.reports.closed')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">{action.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.haccpMonitoringCompliance')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.location')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.monitoring')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.records')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.correctiveActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {haccpCompliance.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: getScoreColor(item.monitoring) }}>{item.monitoring}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold hidden sm:table-cell" style={{ color: getScoreColor(item.records) }}>{item.records}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold hidden sm:table-cell" style={{ color: getScoreColor(item.corrective) }}>{item.corrective}%</td>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.vendorServiceHistory')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.vendor')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.service')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.date')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.result')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.location')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorServices.map((service, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{service.vendor}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 hidden sm:table-cell">{service.service}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{service.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <StatusBadge status={service.result} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">{service.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.equipmentCertificationStatus')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.equipment')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.location')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.expires')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {equipmentCertifications.map((cert, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{cert.equipment}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">{cert.location}</td>
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.maintenanceScheduleAdherence')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.equipment')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.dueDate')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.lastServiceDate')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.adherence')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {maintenanceSchedule.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.equipment}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.dueDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">{item.lastService}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <StatusBadge status={item.adherence} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.costTracking')}</h3>
                <p className="text-sm text-gray-600">{t('pages.reports.totalSpend')}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.category')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.amount')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.services')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorSpend.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: '#1e4d6b' }}>{item.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">{item.services}</td>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.staffCertificationStatus')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.name')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.location')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.expires')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.daysLeft')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffCertifications.map((staff, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{staff.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">{staff.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <StatusBadge status={staff.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">{staff.expires}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span style={{
                            fontWeight: '600',
                            color: staff.daysLeft < 0 ? '#ef4444' : staff.daysLeft <= 30 ? '#d4af37' : '#22c55e'
                          }}>
                            {staff.daysLeft < 0 ? t('pages.reports.daysAgo').replace('{{count}}', String(Math.abs(staff.daysLeft))) : t('pages.reports.nDays').replace('{{count}}', String(staff.daysLeft))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.taskCompletionByEmployee')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.employee')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.completed')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.missed')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '140px' }}>{t('pages.reports.rate')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taskCompletionByEmployee.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.employee}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium hidden sm:table-cell">{emp.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium hidden sm:table-cell">{emp.missed}</td>
                        <td className="px-6 py-4 text-sm">
                          <ProgressBar value={emp.rate} color={emp.rate >= 90 ? '#22c55e' : emp.rate >= 75 ? '#eab308' : emp.rate >= 60 ? '#f59e0b' : '#ef4444'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.trainingRecordsSummary')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.training')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.completed')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.pending')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '140px' }}>{t('pages.reports.rate')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trainingRecords.map((training, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{training.training}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium hidden sm:table-cell">{training.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium hidden sm:table-cell" style={{ color: training.pending > 0 ? '#d4af37' : '#22c55e' }}>{training.pending}</td>
                        <td className="px-6 py-4 text-sm">
                          <ProgressBar value={training.rate} color={training.rate >= 90 ? '#22c55e' : training.rate >= 75 ? '#eab308' : training.rate >= 60 ? '#f59e0b' : '#ef4444'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.reports.loginActivity')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.employee')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.lastLogin')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('pages.reports.totalLogins')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.avgPerWeek')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loginActivity.map((activity, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{activity.employee}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{activity.lastLogin}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">{activity.logins}</td>
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
      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}
