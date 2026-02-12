import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertCircle, AlertTriangle, Info, X, Clock, CheckCircle2, FileText, Thermometer, Users, Upload, ChevronDown, ExternalLink, MapPin, Store, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';
import { useRole } from '../contexts/RoleContext';

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

export function Alerts() {
  const navigate = useNavigate();
  const { getAccessibleLocations } = useRole();
  const alertAccessibleLocNames = getAccessibleLocations().map(l => l.locationName);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'upcoming' | 'resolved' | 'snoozed'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [alerts, setAlerts] = useState<Alert[]>([
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
      location: 'Airport Cafe',
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
      location: 'Downtown Kitchen',
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
      location: 'Airport Cafe',
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
      location: 'Airport Cafe',
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
      location: 'Downtown Kitchen',
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
      location: 'Airport Cafe',
      navigate_to: '/team',
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
      location: 'Airport Cafe',
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
      location: 'University Dining',
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
      location: 'University Dining',
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
      location: 'Downtown Kitchen',
      navigate_to: '/team',
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
      location: 'Downtown Kitchen',
      navigate_to: '/vendors',
    },
  ]);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolutionType, setResolutionType] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [openSnoozeDropdown, setOpenSnoozeDropdown] = useState<string | null>(null);
  const [openReassignDropdown, setOpenReassignDropdown] = useState<string | null>(null);
  const [customSnoozeDate, setCustomSnoozeDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const teamMembers = [
    { id: '1', name: 'Marcus Johnson', role: 'Manager' },
    { id: '2', name: 'Sarah Chen', role: 'Manager' },
    { id: '3', name: 'David Park', role: 'Staff' },
    { id: '4', name: 'Emma Rodriguez', role: 'Staff' },
    { id: '5', name: 'Alex Thompson', role: 'Staff' },
  ];

  const alertLocations = [...new Set(alerts.map(a => a.location))].filter(loc => alertAccessibleLocNames.includes(loc)).sort();
  const alertTypes: { value: string; label: string }[] = [
    { value: 'all', label: 'All Types' },
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
      case 'high': return 'Critical';
      case 'medium': return 'Warning';
      default: return 'Info';
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
    setAlerts(alerts.map(a =>
      a.id === alertId ? { ...a, assigned_to: memberName } : a
    ));
    setOpenReassignDropdown(null);
    toast.success(`Reassigned to ${memberName}`);
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
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Alerts' }]} />
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-xl p-6 text-white">
          <div className="flex items-center space-x-3 mb-2">
            <Bell className="h-8 w-8 text-[#d4af37]" />
            <h2 className="text-2xl font-bold">Compliance Alerts</h2>
          </div>
          <p className="text-gray-300">AI-powered predictive alerts and notifications</p>
          <div className="flex items-center space-x-6 mt-4">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bell className="h-4 w-4 text-[#d4af37]" />
                <span className="text-sm text-gray-300 font-medium">Active Alerts</span>
              </div>
              <div className="text-3xl font-bold text-white text-center">{activeCount}</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-gray-300 font-medium">Critical</span>
              </div>
              <div className="text-3xl font-bold text-red-400 text-center">{urgentCount}</div>
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
            All ({activeCount})
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'urgent' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Critical ({urgentCount})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'upcoming' ? 'bg-[#1e4d6b] text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('snoozed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'snoozed' ? 'bg-purple-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Snoozed
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'resolved' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Resolved
          </button>
        </div>

        {/* Advanced Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          >
            <option value="all">All Severities</option>
            <option value="high">Critical</option>
            <option value="medium">Warning</option>
            <option value="low">Info</option>
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          >
            <option value="all">All Locations</option>
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
              Clear filters
            </button>
          )}
        </div>

        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500">
                {filter === 'resolved' ? 'No resolved alerts' : 'No alerts match your filters'}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alertItem) => (
              <div
                key={alertItem.id}
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${getSeverityColor(alertItem.severity)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3 flex-1">
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
                                <span>{alertItem.days_until_due} days remaining</span>
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
                        <p className="text-sm font-medium text-gray-700 mb-1">Recommended Action:</p>
                        <p className="text-sm text-gray-600">{alertItem.recommended_action}</p>
                      </div>
                      {alertItem.assigned_to && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Users className="h-4 w-4" />
                          <span>Assigned to: <strong className="text-gray-700">{alertItem.assigned_to}</strong></span>
                        </div>
                      )}
                      {alertItem.status === 'snoozed' && alertItem.snoozed_until && (
                        <div className="flex items-center space-x-2 text-sm text-purple-600 mt-2">
                          <Clock className="h-4 w-4" />
                          <span>Snoozed until {format(new Date(alertItem.snoozed_until), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {alertItem.status !== 'resolved' && (
                  <div className="flex items-center space-x-2 pt-3 border-t flex-wrap gap-y-2">
                    <button
                      onClick={() => handleResolveClick(alertItem)}
                      className="px-4 py-2 bg-[#1e4d6b] text-white text-sm rounded-lg hover:bg-[#163a52] transition-colors"
                    >
                      Resolve
                    </button>
                    {alertItem.navigate_to && (
                      <button
                        onClick={() => navigate(alertItem.navigate_to!)}
                        className="px-4 py-2 bg-[#d4af37] text-white text-sm rounded-lg hover:bg-[#b8962f] transition-colors flex items-center space-x-1"
                      >
                        <span>Go to {alertItem.navigate_to === '/documents' ? 'Documents' :
                          alertItem.navigate_to === '/temp-logs' ? 'Temp Logs' :
                          alertItem.navigate_to === '/vendors' ? 'Vendors' :
                          alertItem.navigate_to === '/haccp' ? 'HACCP' :
                          alertItem.navigate_to === '/checklists' ? 'Checklists' :
                          alertItem.navigate_to === '/team' ? 'Team' :
                          'Dashboard'}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setOpenSnoozeDropdown(openSnoozeDropdown === alertItem.id ? null : alertItem.id)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                      >
                        <span>Snooze</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {openSnoozeDropdown === alertItem.id && (
                        <div className="absolute left-0 bottom-full mb-2 bg-white shadow-lg rounded-lg border border-gray-200 py-2 z-20 min-w-[150px]">
                          <button
                            onClick={() => handleSnooze(alertItem.id, 7)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Snooze 7 days
                          </button>
                          <button
                            onClick={() => handleSnooze(alertItem.id, 30)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Snooze 30 days
                          </button>
                          <button
                            onClick={() => setShowCustomDatePicker(true)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t"
                          >
                            Custom date
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
                                Set
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setOpenReassignDropdown(openReassignDropdown === alertItem.id ? null : alertItem.id)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                      >
                        <span>Reassign</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {openReassignDropdown === alertItem.id && (
                        <div className="absolute left-0 bottom-full mb-2 bg-white shadow-lg rounded-lg border border-gray-200 py-2 z-20 min-w-[200px]">
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

      {/* Resolve Modal */}
      {showResolveModal && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-2xl font-bold mb-4">Resolve Alert</h3>
            <p className="text-gray-600 mb-6">{selectedAlert.title}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Type <span className="text-red-600">*</span>
                </label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="">Select resolution type...</option>
                  <option value="fixed">Fixed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="not_applicable">Not Applicable</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Taken <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Describe what action was taken to resolve this alert..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolved By
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
                  Supporting Document (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Resolved
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
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveSubmit}
                className="flex-1 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors"
              >
                Submit Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
