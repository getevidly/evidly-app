import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertCircle, AlertTriangle, Info, X, Clock, CheckCircle2, FileText, Thermometer, Users, Upload, ChevronDown, ExternalLink, MapPin, Store, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';
import { useTranslation } from '../contexts/LanguageContext';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';

interface Alert {
  id: string;
  alert_type: 'document_expiring' | 'missed_log' | 'vendor_overdue' | 'staff_certification' | 'checklist_incomplete' | 'haccp_failure' | 'predictive';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommended_action: string;
  status: 'active' | 'resolved' | 'snoozed';
  created_at: string;
  assigned_to?: string;
  days_until_due?: number;
  snoozed_until?: string;
  resolution_type?: string;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  location: string;
  navigate_to?: string;
}

const DEMO_ALERTS: Alert[] = [
    {
      id: '1',
      alert_type: 'document_expiring',
      severity: 'high',
      title: 'Hood Cleaning Certificate expires in 7 days',
      description: 'Your hood cleaning certificate from CleanVent Services is expiring soon. Operating without a valid certificate violates health code regulations.',
      recommended_action: 'Contact CleanVent Services to schedule maintenance or upload new certificate if already completed.',
      status: 'active',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_to: 'Maria Garcia',
      days_until_due: 7,
      location: 'Airport Cafe', // demo
      navigate_to: '/documents',
    },
    {
      id: '2',
      alert_type: 'document_expiring',
      severity: 'high',
      title: 'Health Permit renewal due in 14 days',
      description: 'Your health department operating permit is due for renewal. Failure to renew on time may result in fines or closure.',
      recommended_action: 'Submit renewal application and payment to Fresno County Health Department.',
      status: 'active',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_to: 'John Smith',
      days_until_due: 14,
      location: 'Downtown Kitchen', // demo
      navigate_to: '/documents',
    },
    {
      id: '3',
      alert_type: 'missed_log',
      severity: 'high',
      title: 'Temperature logs missing for 2 days',
      description: 'No temperature logs were recorded on February 3rd and 4th for Walk-in Cooler #2. Complete temperature monitoring is required for health inspections.',
      recommended_action: 'Add missing temperature logs or document reason for gap.',
      status: 'active',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_to: 'Sarah Lee',
      location: 'Airport Cafe', // demo
      navigate_to: '/temp-logs',
    },
    {
      id: '4',
      alert_type: 'haccp_failure',
      severity: 'high',
      title: 'HACCP CCP Failure: Walk-in Cooler above 41°F',
      description: 'Walk-in Cooler #2 recorded 44°F at 2:15 PM — exceeding the critical limit of 41°F. This is a Critical Control Point violation requiring immediate corrective action.',
      recommended_action: 'Inspect cooler unit, check door seals, verify compressor operation. Move perishable items to backup cooler if temp cannot be corrected within 1 hour.',
      status: 'active',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      assigned_to: 'Maria Garcia',
      location: 'Airport Cafe', // demo
      navigate_to: '/haccp',
    },
    {
      id: '5',
      alert_type: 'vendor_overdue',
      severity: 'medium',
      title: 'Fire Suppression Inspection Overdue',
      description: 'Semi-annual fire suppression inspection was due January 15th. System is now overdue for required maintenance.',
      recommended_action: 'Schedule inspection with SafeGuard Fire Systems immediately.',
      status: 'active',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Downtown Kitchen', // demo
      navigate_to: '/vendors',
    },
    {
      id: '6',
      alert_type: 'staff_certification',
      severity: 'medium',
      title: 'Food Handler Certificate expiring in 21 days',
      description: 'Food handler certification for employee Michael Torres expires on February 26, 2026.',
      recommended_action: 'Register employee for food handler renewal course.',
      status: 'active',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      days_until_due: 21,
      location: 'Airport Cafe', // demo
      navigate_to: '/training',
    },
    {
      id: '7',
      alert_type: 'document_expiring',
      severity: 'medium',
      title: 'Certificate of Insurance expires in 10 days',
      description: 'Valley Fire Systems Certificate of Insurance is expiring. Vendor compliance requires current insurance documentation.',
      recommended_action: 'Request updated Certificate of Insurance from Valley Fire Systems.',
      status: 'active',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      days_until_due: 10,
      location: 'Airport Cafe', // demo
      navigate_to: '/vendors',
    },
    {
      id: '8',
      alert_type: 'checklist_incomplete',
      severity: 'medium',
      title: 'Opening Checklist not completed today',
      description: 'The opening checklist for February 5th has not been completed.',
      recommended_action: 'Complete opening checklist or assign to opening manager.',
      status: 'active',
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      location: 'University Dining', // demo
      navigate_to: '/checklists',
    },
    {
      id: '9',
      alert_type: 'missed_log',
      severity: 'medium',
      title: '3 temperature logs missed this week',
      description: 'Weekend temperature logs were not recorded for Saturday AM, Sunday AM, and Sunday PM shifts.',
      recommended_action: 'Assign weekend temp log duties and set up shift reminders.',
      status: 'active',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'University Dining', // demo
      navigate_to: '/temp-logs',
    },
    {
      id: '10',
      alert_type: 'staff_certification',
      severity: 'medium',
      title: 'ServSafe Manager cert expiring in 36 days',
      description: 'Sarah Chen\'s ServSafe Manager Certification expires on March 15, 2026. At least one certified manager is required per shift.',
      recommended_action: 'Schedule ServSafe exam retake before expiration.',
      status: 'active',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      days_until_due: 36,
      location: 'Downtown Kitchen', // demo
      navigate_to: '/training',
    },
    {
      id: '11',
      alert_type: 'predictive',
      severity: 'low',
      title: 'Predicted compliance score drop',
      description: 'Based on recent patterns, your compliance score may drop below 90% next week if current issues are not addressed.',
      recommended_action: 'Address pending alerts and complete all scheduled tasks.',
      status: 'active',
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      location: 'All Locations',
      navigate_to: '/dashboard',
    },
    {
      id: '12',
      alert_type: 'document_expiring',
      severity: 'low',
      title: 'Pest Control Service due in 30 days',
      description: 'Monthly pest control service from Pest Control Pro is scheduled for March 5, 2026.',
      recommended_action: 'Confirm appointment with Pest Control Pro.',
      status: 'active',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      days_until_due: 30,
      location: 'Downtown Kitchen', // demo
      navigate_to: '/vendors',
    },
    {
      id: '13',
      alert_type: 'staff_certification',
      severity: 'high',
      title: 'No CFPM on staff at Airport Cafe', // demo
      description: 'Airport Cafe currently has no Certified Food Protection Manager on staff. California Health & Safety Code §113947.1 requires at least one CFPM per food establishment during all operating hours.', // demo
      recommended_action: 'Enroll Maria Garcia or another manager in ServSafe Manager certification immediately.',
      status: 'active',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Airport Cafe', // demo
      navigate_to: '/training',
    },
    {
      id: '14',
      alert_type: 'staff_certification',
      severity: 'high',
      title: 'New hire food handler deadline in 12 days',
      description: 'Tyler Brooks (hired Feb 5, 2026) must obtain a California Food Handler Card within 30 days of hire per SB 476. Deadline: March 7, 2026.',
      recommended_action: 'Ensure employee completes food handler training course before deadline.',
      status: 'active',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      days_until_due: 12,
      location: 'Downtown Kitchen', // demo
      navigate_to: '/training',
    },
    {
      id: '15',
      alert_type: 'staff_certification',
      severity: 'medium',
      title: 'Facility safety training overdue for 3 staff',
      description: 'Annual fire extinguisher training (OSHA 29 CFR 1910.157 / NFPA 10) is overdue for David Park, Alex Thompson, and Lisa Wang. All kitchen and facilities staff require annual training.',
      recommended_action: 'Schedule fire extinguisher training session for untrained staff.',
      status: 'active',
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'All Locations',
      navigate_to: '/training',
    },
    {
      id: '16',
      alert_type: 'temperature',
      severity: 'critical',
      title: 'Walk-in cooler at Airport Cafe reading 47°F — IoT sensor alert', // demo
      description: 'IoT sensor "SensorPush AP-01" detected walk-in cooler temperature at 47°F, exceeding the 41°F CalCode §113996 limit. Temperature has been out of range for 22 minutes. Immediate corrective action required.',
      recommended_action: 'Check thermostat settings and door seal. Transfer perishable items to backup cooler if temperature does not drop within 30 minutes.',
      status: 'active',
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      location: 'Airport Cafe', // demo
      navigate_to: '/iot-sensors',
    },
    {
      id: '17',
      alert_type: 'equipment',
      severity: 'medium',
      title: '3 equipment items at University Hub have no QR labels',
      description: 'Walk-in Cooler #2, Prep Fridge, and Hot Holding Unit at University Hub do not have QR temperature labels. Staff cannot use QR scan workflow for quick temp logging on these units.',
      recommended_action: 'Generate and print QR labels from Equipment Detail page for each unit.',
      status: 'active',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'University Hub',
      navigate_to: '/equipment',
    },
  ];

export function Alerts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getAccessibleLocations } = useRole();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const alertAccessibleLocNames = getAccessibleLocations().map(l => l.locationName);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'upcoming' | 'resolved' | 'snoozed'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [alerts, setAlerts] = useState<Alert[]>(isDemoMode ? DEMO_ALERTS : []);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolutionType, setResolutionType] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [openSnoozeDropdown, setOpenSnoozeDropdown] = useState<string | null>(null);
  const [openReassignDropdown, setOpenReassignDropdown] = useState<string | null>(null);
  const [customSnoozeDate, setCustomSnoozeDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

  const teamMembers = [
    { id: '1', name: 'Marcus Johnson', role: 'Manager' },
    { id: '2', name: 'Sarah Chen', role: 'Manager' },
    { id: '3', name: 'David Park', role: 'Staff' },
    { id: '4', name: 'Emma Rodriguez', role: 'Staff' },
    { id: '5', name: 'Alex Thompson', role: 'Staff' },
  ];

  const alertLocations = [...new Set(alerts.map(a => a.location))].filter(loc => alertAccessibleLocNames.includes(loc)).sort();
  const alertTypes: { value: string; label: string }[] = [
    { value: 'all', label: t('pages.calendar.allTypes') },
    { value: 'document_expiring', label: 'Document Expiring' },
    { value: 'missed_log', label: 'Missed Temp Logs' },
    { value: 'vendor_overdue', label: 'Vendor Overdue' },
    { value: 'staff_certification', label: 'Staff Certification' },
    { value: 'checklist_incomplete', label: 'Checklist Incomplete' },
    { value: 'haccp_failure', label: 'HACCP Failure' },
    { value: 'predictive', label: 'Predictive' },
  ];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-[#1e4d6b]" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return t('status.critical');
      case 'medium': return t('status.warning');
      default: return t('status.info');
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'document_expiring':
        return <FileText className="h-5 w-5" />;
      case 'missed_log':
        return <Thermometer className="h-5 w-5" />;
      case 'staff_certification':
        return <Users className="h-5 w-5" />;
      case 'vendor_overdue':
        return <Store className="h-5 w-5" />;
      case 'haccp_failure':
        return <ShieldAlert className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const handleResolveClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setShowResolveModal(true);
    setResolutionType('');
    setResolutionNotes('');
  };

  const handleResolveSubmit = () => {
    if (!resolutionNotes.trim() || !resolutionType) {
      toast.warning('Please provide resolution type and action taken');
      return;
    }

    guardAction('resolve', 'Alert Management', () => {
      if (selectedAlert) {
        setAlerts(alerts.map(a =>
          a.id === selectedAlert.id
            ? {
                ...a,
                status: 'resolved' as const,
                resolution_type: resolutionType,
                resolution_notes: resolutionNotes,
                resolved_by: 'Current User',
                resolved_at: new Date().toISOString(),
              }
            : a
        ));
        setShowResolveModal(false);
        setSelectedAlert(null);
      }
    });
  };

  const handleSnooze = (alertId: string, days: number) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + days);

    setAlerts(alerts.map(a =>
      a.id === alertId
        ? { ...a, status: 'snoozed' as const, snoozed_until: snoozeDate.toISOString() }
        : a
    ));
    setOpenSnoozeDropdown(null);
  };

  const handleCustomSnooze = (alertId: string) => {
    if (!customSnoozeDate) return;

    setAlerts(alerts.map(a =>
      a.id === alertId
        ? { ...a, status: 'snoozed' as const, snoozed_until: new Date(customSnoozeDate).toISOString() }
        : a
    ));
    setOpenSnoozeDropdown(null);
    setShowCustomDatePicker(false);
    setCustomSnoozeDate('');
  };

  const handleReassign = (alertId: string, memberName: string) => {
    guardAction('reassign', 'Alert Management', () => {
      setAlerts(alerts.map(a =>
        a.id === alertId ? { ...a, assigned_to: memberName } : a
      ));
      setOpenReassignDropdown(null);
      toast.success(`Reassigned to ${memberName}`);
    });
  };

  const handleDismiss = (alertId: string) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  const filteredAlerts = alerts.filter(a => {
    // Role-based location access filter
    if (!alertAccessibleLocNames.includes(a.location)) return false;

    // Status filter
    if (filter === 'all' && a.status !== 'active') return false;
    if (filter === 'urgent' && !(a.status === 'active' && a.severity === 'high')) return false;
    if (filter === 'upcoming' && !(a.status === 'active' && a.days_until_due && a.days_until_due > 7)) return false;
    if (filter === 'resolved' && a.status !== 'resolved') return false;
    if (filter === 'snoozed' && a.status !== 'snoozed') return false;

    // Severity filter
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;

    // Location filter
    if (locationFilter !== 'all' && a.location !== locationFilter) return false;

    // Type filter
    if (typeFilter !== 'all' && a.alert_type !== typeFilter) return false;

    return true;
  });

  const urgentCount = alerts.filter(a => a.status === 'active' && a.severity === 'high').length;
  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <>
      <Breadcrumb items={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('pages.alerts.title') }]} />
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-xl p-4 sm:p-6 text-white">
          <div className="flex items-center space-x-3 mb-2">
            <Bell className="h-8 w-8 text-[#d4af37]" />
            <h2 className="text-xl sm:text-2xl font-bold">{t('pages.alerts.complianceAlerts')}</h2>
          </div>
          <p className="text-gray-300">{t('pages.alerts.subtitle')}</p>
          <div className="flex items-center space-x-6 mt-4 flex-wrap gap-y-2">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bell className="h-4 w-4 text-[#d4af37]" />
                <span className="text-sm text-gray-300 font-medium">{t('pages.alerts.activeAlerts')}</span>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-white text-center">{activeCount}</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-gray-300 font-medium">{t('pages.alerts.critical')}</span>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-red-400 text-center">{urgentCount}</div>
            </div>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-[#1e4d6b] text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t('pages.alerts.all')} ({activeCount})
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'urgent' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t('pages.alerts.critical')} ({urgentCount})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'upcoming' ? 'bg-[#1e4d6b] text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t('pages.alerts.upcoming')}
          </button>
          <button
            onClick={() => setFilter('snoozed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'snoozed' ? 'bg-purple-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t('pages.alerts.snoozed')}
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'resolved' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t('pages.alerts.resolved')}
          </button>
        </div>

        {/* Advanced Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          >
            <option value="all">{t('pages.alerts.allSeverities')}</option>
            <option value="high">{t('status.critical')}</option>
            <option value="medium">{t('status.warning')}</option>
            <option value="low">{t('status.info')}</option>
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          >
            <option value="all">{t('pages.alerts.allLocations')}</option>
            {alertLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          >
            {alertTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {(severityFilter !== 'all' || locationFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => { setSeverityFilter('all'); setLocationFilter('all'); setTypeFilter('all'); }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              {t('pages.alerts.clearFilters')}
            </button>
          )}
        </div>

        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500">
                {filter === 'resolved' ? t('pages.alerts.noResolvedAlerts') : t('pages.alerts.noMatchingAlerts')}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alertItem) => (
              <div
                key={alertItem.id}
                className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 ${getSeverityColor(alertItem.severity)}`}
              >
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${
                      alertItem.severity === 'high' ? 'bg-red-100' :
                      alertItem.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      {getAlertIcon(alertItem.alert_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            {getSeverityIcon(alertItem.severity)}
                            <h3 className="text-lg font-semibold text-gray-900">{alertItem.title}</h3>
                          </div>
                          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                            <span>{format(new Date(alertItem.created_at), 'MMM d, h:mm a')}</span>
                            <span className="flex items-center space-x-1">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{alertItem.location}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              alertItem.severity === 'high' ? 'bg-red-100 text-red-700' :
                              alertItem.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {getSeverityLabel(alertItem.severity)}
                            </span>
                            {alertItem.days_until_due && (
                              <span className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{alertItem.days_until_due} {t('pages.alerts.daysRemaining')}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDismiss(alertItem.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{alertItem.description}</p>
                      <div className="bg-white rounded-md p-3 border border-gray-200 mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">{t('pages.alerts.recommendedAction')}:</p>
                        <p className="text-sm text-gray-600">{alertItem.recommended_action}</p>
                      </div>
                      {alertItem.assigned_to && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Users className="h-4 w-4" />
                          <span>{t('pages.alerts.assignedTo')}: <strong className="text-gray-700">{alertItem.assigned_to}</strong></span>
                        </div>
                      )}
                      {alertItem.status === 'snoozed' && alertItem.snoozed_until && (
                        <div className="flex items-center space-x-2 text-sm text-purple-600 mt-2">
                          <Clock className="h-4 w-4" />
                          <span>{t('pages.alerts.snoozedUntil')} {format(new Date(alertItem.snoozed_until), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {alertItem.status !== 'resolved' && (
                  <div className="flex items-center space-x-2 pt-3 border-t flex-wrap gap-y-2">
                    <button
                      onClick={() => handleResolveClick(alertItem)}
                      className="px-4 py-2 min-h-[44px] bg-[#1e4d6b] text-white text-sm rounded-lg hover:bg-[#163a52] transition-colors"
                    >
                      {t('pages.alerts.resolve')}
                    </button>
                    {alertItem.navigate_to && (
                      <button
                        onClick={() => navigate(alertItem.navigate_to!)}
                        className="px-4 py-2 min-h-[44px] bg-[#d4af37] text-white text-sm rounded-lg hover:bg-[#b8962f] transition-colors flex items-center space-x-1"
                      >
                        <span>{t('pages.alerts.goTo')} {alertItem.navigate_to === '/documents' ? t('cards.documents') :
                          alertItem.navigate_to === '/temp-logs' ? t('cards.temperatures') :
                          alertItem.navigate_to === '/vendors' ? t('cards.vendors') :
                          alertItem.navigate_to === '/haccp' ? 'HACCP' :
                          alertItem.navigate_to === '/checklists' ? t('cards.checklists') :
                          alertItem.navigate_to === '/team' ? t('nav.team') :
                          t('nav.dashboard')}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {alertItem.alert_type === 'haccp_failure' && alertItem.status === 'active' && (
                      <button
                        onClick={() => navigate('/haccp?tab=corrective&new=true&ccp=CCP-1')}
                        className="px-4 py-2 min-h-[44px] bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-1"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        <span>{t('pages.alerts.createCorrectiveAction')}</span>
                      </button>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setOpenSnoozeDropdown(openSnoozeDropdown === alertItem.id ? null : alertItem.id)}
                        className="px-4 py-2 min-h-[44px] bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                      >
                        <span>{t('pages.alerts.snooze')}</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {openSnoozeDropdown === alertItem.id && (
                        <div className="absolute left-0 bottom-full mb-2 bg-white shadow-sm rounded-xl border border-gray-200 py-2 z-20 min-w-[150px]">
                          <button
                            onClick={() => handleSnooze(alertItem.id, 7)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {t('pages.alerts.snooze7Days')}
                          </button>
                          <button
                            onClick={() => handleSnooze(alertItem.id, 30)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {t('pages.alerts.snooze30Days')}
                          </button>
                          <button
                            onClick={() => setShowCustomDatePicker(true)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t"
                          >
                            {t('pages.alerts.customDate')}
                          </button>
                          {showCustomDatePicker && (
                            <div className="px-4 py-2 border-t">
                              <input
                                type="date"
                                value={customSnoozeDate}
                                onChange={(e) => setCustomSnoozeDate(e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm"
                                min={new Date().toISOString().split('T')[0]}
                              />
                              <button
                                onClick={() => handleCustomSnooze(alertItem.id)}
                                className="w-full mt-2 px-2 py-1 bg-[#1e4d6b] text-white text-xs rounded hover:bg-[#163a52]"
                              >
                                {t('pages.alerts.set')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setOpenReassignDropdown(openReassignDropdown === alertItem.id ? null : alertItem.id)}
                        className="px-4 py-2 min-h-[44px] bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                      >
                        <span>{t('pages.alerts.reassign')}</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {openReassignDropdown === alertItem.id && (
                        <div className="absolute left-0 bottom-full mb-2 bg-white shadow-sm rounded-xl border border-gray-200 py-2 z-20 min-w-[200px]">
                          {teamMembers.map((member) => (
                            <button
                              key={member.id}
                              onClick={() => handleReassign(alertItem.id, member.name)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <div className="font-medium">{member.name}</div>
                              <div className="text-xs text-gray-500">{member.role}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 max-w-lg w-[95vw] sm:w-full">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">{t('pages.alerts.resolveAlert')}</h3>
            <p className="text-gray-600 mb-6">{selectedAlert.title}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('pages.alerts.resolutionType')} <span className="text-red-600">*</span>
                </label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="">{t('pages.alerts.selectResolutionType')}</option>
                  <option value="fixed">{t('pages.alerts.fixed')}</option>
                  <option value="scheduled">{t('pages.alerts.scheduled')}</option>
                  <option value="not_applicable">{t('pages.alerts.notApplicable')}</option>
                  <option value="escalated">{t('pages.alerts.escalated')}</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t('pages.alerts.actionTaken')} <span className="text-red-600">*</span>
                  </label>
                  <AIAssistButton
                    fieldLabel="Action Taken"
                    context={{ title: selectedAlert.title, severity: selectedAlert?.severity }}
                    currentValue={resolutionNotes}
                    onGenerated={(text) => { setResolutionNotes(text); setAiFields(prev => new Set(prev).add('resolutionNotes')); }}
                  />
                </div>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => { setResolutionNotes(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('resolutionNotes'); return n; }); }}
                  rows={4}
                  placeholder={t('pages.alerts.actionTakenPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
                {aiFields.has('resolutionNotes') && <AIGeneratedIndicator />}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('pages.alerts.resolvedBy')}
                </label>
                <input
                  type="text"
                  value="Current User"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('pages.alerts.supportingDocument')}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">{t('pages.alerts.clickToUpload')}</p>
                  <p className="text-xs text-gray-500 mt-1">{t('pages.alerts.fileTypes')}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('pages.alerts.dateResolved')}
                </label>
                <input
                  type="text"
                  value={format(new Date(), 'MMM d, yyyy')}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowResolveModal(false)}
                className="flex-1 px-4 py-2 min-h-[44px] border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleResolveSubmit}
                className="flex-1 px-4 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors"
              >
                {t('pages.alerts.submitResolution')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
