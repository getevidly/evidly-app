import { useState } from 'react';
import { Bell, AlertCircle, AlertTriangle, Info, X, Clock, CheckCircle2, FileText, Thermometer, Users, Calendar, Upload, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';

interface Alert {
  id: string;
  alert_type: string;
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
}

export function Alerts() {
  const [filter, setFilter] = useState<'all' | 'urgent' | 'upcoming' | 'resolved' | 'snoozed'>('all');
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
    },
    {
      id: '2',
      alert_type: 'document_expiring',
      severity: 'high',
      title: 'Health Permit renewal due in 14 days',
      description: 'Your health department operating permit is due for renewal. Failure to renew on time may result in fines or closure.',
      recommended_action: 'Submit renewal application and payment to San Francisco Health Department.',
      status: 'active',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_to: 'John Smith',
      days_until_due: 14,
    },
    {
      id: '3',
      alert_type: 'missed_log',
      severity: 'medium',
      title: 'Temperature logs missing for 2 days',
      description: 'No temperature logs were recorded on February 3rd and 4th. Complete temperature monitoring is required for health inspections.',
      recommended_action: 'Add missing temperature logs or document reason for gap.',
      status: 'active',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_to: 'Sarah Lee',
    },
    {
      id: '4',
      alert_type: 'vendor_overdue',
      severity: 'medium',
      title: 'Fire Suppression Inspection Overdue',
      description: 'Semi-annual fire suppression inspection was due January 15th. System is now overdue for required maintenance.',
      recommended_action: 'Schedule inspection with SafeGuard Fire Systems immediately.',
      status: 'active',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      alert_type: 'staff_certification',
      severity: 'medium',
      title: 'Food Handler Certificate expiring in 21 days',
      description: 'Food handler certification for employee Michael Torres expires on February 26, 2026.',
      recommended_action: 'Register employee for food handler renewal course.',
      status: 'active',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      days_until_due: 21,
    },
    {
      id: '6',
      alert_type: 'checklist_incomplete',
      severity: 'low',
      title: 'Opening Checklist not completed today',
      description: 'The opening checklist for February 5th has not been completed.',
      recommended_action: 'Complete opening checklist or assign to opening manager.',
      status: 'active',
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '7',
      alert_type: 'predictive',
      severity: 'low',
      title: 'Predicted compliance score drop',
      description: 'Based on recent patterns, your compliance score may drop below 90% next week if current issues are not addressed.',
      recommended_action: 'Address pending alerts and complete all scheduled tasks.',
      status: 'active',
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '8',
      alert_type: 'document_expiring',
      severity: 'low',
      title: 'Pest Control Service due in 30 days',
      description: 'Monthly pest control service from Pest Control Pro is scheduled for March 5, 2026.',
      recommended_action: 'Confirm appointment with Pest Control Pro.',
      status: 'active',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      days_until_due: 30,
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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'document_expiring':
        return <FileText className="h-5 w-5" />;
      case 'missed_log':
        return <Thermometer className="h-5 w-5" />;
      case 'staff_certification':
        return <Users className="h-5 w-5" />;
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
      alert('Please provide resolution type and action taken');
      return;
    }

    if (selectedAlert) {
      setAlerts(alerts.map(alert =>
        alert.id === selectedAlert.id
          ? {
              ...alert,
              status: 'resolved' as const,
              resolution_type: resolutionType,
              resolution_notes: resolutionNotes,
              resolved_by: 'Current User',
              resolved_at: new Date().toISOString(),
            }
          : alert
      ));
      setShowResolveModal(false);
      setSelectedAlert(null);
    }
  };

  const handleSnooze = (alertId: string, days: number) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + days);

    setAlerts(alerts.map(alert =>
      alert.id === alertId
        ? {
            ...alert,
            status: 'snoozed' as const,
            snoozed_until: snoozeDate.toISOString(),
          }
        : alert
    ));
    setOpenSnoozeDropdown(null);
  };

  const handleCustomSnooze = (alertId: string) => {
    if (!customSnoozeDate) return;

    setAlerts(alerts.map(alert =>
      alert.id === alertId
        ? {
            ...alert,
            status: 'snoozed' as const,
            snoozed_until: new Date(customSnoozeDate).toISOString(),
          }
        : alert
    ));
    setOpenSnoozeDropdown(null);
    setShowCustomDatePicker(false);
    setCustomSnoozeDate('');
  };

  const handleReassign = (alertId: string, memberName: string) => {
    setAlerts(alerts.map(alert =>
      alert.id === alertId ? { ...alert, assigned_to: memberName } : alert
    ));
    setOpenReassignDropdown(null);
    alert(`Reassigned to ${memberName}`);
  };

  const handleDismiss = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return alert.status === 'active';
    if (filter === 'urgent') return alert.status === 'active' && alert.severity === 'high';
    if (filter === 'upcoming') return alert.status === 'active' && alert.days_until_due && alert.days_until_due > 7;
    if (filter === 'resolved') return alert.status === 'resolved';
    if (filter === 'snoozed') return alert.status === 'snoozed';
    return true;
  });

  const urgentCount = alerts.filter(a => a.status === 'active' && a.severity === 'high').length;
  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Alerts' }]} />
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-lg p-6 text-white">
          <div className="flex items-center space-x-3 mb-2">
            <Bell className="h-8 w-8 text-[#d4af37]" />
            <h2 className="text-2xl font-bold">Compliance Alerts</h2>
          </div>
          <p className="text-gray-200">AI-powered predictive alerts and notifications</p>
          <div className="flex items-center space-x-6 mt-4">
            <div>
              <div className="text-3xl font-bold">{activeCount}</div>
              <div className="text-sm text-gray-300">Active Alerts</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-400">{urgentCount}</div>
              <div className="text-sm text-gray-300">Urgent</div>
            </div>
          </div>
        </div>

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
            Urgent ({urgentCount})
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

        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500">
                {filter === 'resolved' ? 'No resolved alerts' : 'No alerts to display'}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      alert.severity === 'high' ? 'bg-red-100' :
                      alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            {getSeverityIcon(alert.severity)}
                            <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{format(new Date(alert.created_at), 'MMM d, h:mm a')}</span>
                            {alert.days_until_due && (
                              <span className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{alert.days_until_due} days remaining</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{alert.description}</p>
                      <div className="bg-white rounded-md p-3 border border-gray-200 mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Recommended Action:</p>
                        <p className="text-sm text-gray-600">{alert.recommended_action}</p>
                      </div>
                      {alert.assigned_to && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Users className="h-4 w-4" />
                          <span>Assigned to: <strong className="text-gray-700">{alert.assigned_to}</strong></span>
                        </div>
                      )}
                      {alert.status === 'snoozed' && alert.snoozed_until && (
                        <div className="flex items-center space-x-2 text-sm text-purple-600 mt-2">
                          <Clock className="h-4 w-4" />
                          <span>Snoozed until {format(new Date(alert.snoozed_until), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {alert.status !== 'resolved' && (
                  <div className="flex items-center space-x-2 pt-3 border-t">
                    <button
                      onClick={() => handleResolveClick(alert)}
                      className="px-4 py-2 bg-[#1e4d6b] text-white text-sm rounded-lg hover:bg-[#2a6a8f] transition-colors"
                    >
                      Resolve
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setOpenSnoozeDropdown(openSnoozeDropdown === alert.id ? null : alert.id)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                      >
                        <span>Snooze</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {openSnoozeDropdown === alert.id && (
                        <div className="absolute left-0 bottom-full mb-2 bg-white shadow-lg rounded-lg border border-gray-200 py-2 z-20 min-w-[150px]">
                          <button
                            onClick={() => handleSnooze(alert.id, 7)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Snooze 7 days
                          </button>
                          <button
                            onClick={() => handleSnooze(alert.id, 30)}
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
                                onClick={() => handleCustomSnooze(alert.id)}
                                className="w-full mt-2 px-2 py-1 bg-[#1e4d6b] text-white text-xs rounded hover:bg-[#2a6a8f]"
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
                        onClick={() => setOpenReassignDropdown(openReassignDropdown === alert.id ? null : alert.id)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                      >
                        <span>Reassign</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {openReassignDropdown === alert.id && (
                        <div className="absolute left-0 bottom-full mb-2 bg-white shadow-lg rounded-lg border border-gray-200 py-2 z-20 min-w-[200px]">
                          {teamMembers.map((member) => (
                            <button
                              key={member.id}
                              onClick={() => handleReassign(alert.id, member.name)}
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
                className="flex-1 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] transition-colors"
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
