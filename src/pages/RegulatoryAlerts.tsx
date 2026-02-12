import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronDown, ChevronUp, ExternalLink, Upload, Share2,
  CheckCircle2, Square, Calendar, Shield, AlertTriangle,
  Filter, Clock, MapPin, Bell, X
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  DEMO_ALERTS, MONITORED_SOURCES, CUSTOMER_JURISDICTIONS,
  type RegulatoryAlert, type RegulatorySource, type ImpactLevel, type AlertStatus
} from '../lib/regulatoryMonitor';

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RegulatoryAlerts() {
  // TODO: i18n

  const navigate = useNavigate();

  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [overriddenStatuses, setOverriddenStatuses] = useState<Record<string, AlertStatus>>({});

  const markReviewed = (id: string) => {
    setOverriddenStatuses(prev => ({ ...prev, [id]: 'reviewed' }));
  };

  const getAlertStatus = (alert: RegulatoryAlert): AlertStatus => {
    return overriddenStatuses[alert.id] || alert.status;
  };

  // Filter logic
  const filteredAlerts = DEMO_ALERTS
    .filter(alert => {
      if (sourceFilter !== 'all' && alert.source !== sourceFilter) return false;
      if (impactFilter !== 'all' && alert.impactLevel !== impactFilter) return false;
      const effectiveStatus = getAlertStatus(alert);
      if (statusFilter !== 'all' && effectiveStatus !== statusFilter) return false;
      if (dateFilter !== 'all') {
        const now = new Date();
        const posted = new Date(alert.postedDate + 'T00:00:00');
        const daysAgo = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));
        if (dateFilter === '7' && daysAgo > 7) return false;
        if (dateFilter === '30' && daysAgo > 30) return false;
        if (dateFilter === '90' && daysAgo > 90) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());

  // Count unreviewed action-required alerts from filtered data
  const actionRequiredCount = filteredAlerts.filter(
    a => a.impactLevel === 'action_required' && getAlertStatus(a) === 'new'
  ).length;

  // Source badge colors
  const getSourceBadgeClasses = (source: RegulatorySource): string => {
    switch (source) {
      case 'FDA': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'California': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'County': return 'bg-green-100 text-green-700 border-green-200';
      case 'NFPA': return 'bg-red-100 text-red-700 border-red-200';
      case 'OSHA': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSourceLabel = (alert: RegulatoryAlert): string => {
    switch (alert.source) {
      case 'FDA': return 'FDA';
      case 'California': return 'California State';
      case 'County': return alert.sourceDetail.split(' ')[0] + ' ' + alert.sourceDetail.split(' ')[1];
      case 'NFPA': return 'NFPA';
      case 'OSHA': return 'OSHA';
      default: return alert.source;
    }
  };

  const getImpactBadge = (level: ImpactLevel) => {
    switch (level) {
      case 'action_required':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-red-100 text-red-700 border-red-200">Action Required</span>;
      case 'awareness':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-amber-100 text-amber-700 border-amber-200">Awareness</span>;
      case 'informational':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-blue-100 text-blue-700 border-blue-200">Informational</span>;
    }
  };

  const getStatusIndicator = (alert: RegulatoryAlert) => {
    const status = getAlertStatus(alert);
    switch (status) {
      case 'new':
        return (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-green-700">New</span>
          </div>
        );
      case 'reviewed':
        return (
          <div className="flex items-center gap-1.5 ml-auto">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">
              Reviewed{alert.reviewedBy ? ` by ${alert.reviewedBy}` : ''}{alert.reviewedAt ? ` on ${formatDate(alert.reviewedAt.split('T')[0])}` : ''}
            </span>
          </div>
        );
      case 'action_taken':
        return (
          <div className="flex items-center gap-1.5 ml-auto">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-blue-700 font-medium">Action Taken</span>
          </div>
        );
    }
  };

  // Monitoring source type badge colors
  const getSourceTypeBadge = (type: string) => {
    switch (type) {
      case 'federal': return 'bg-blue-100 text-blue-700';
      case 'state': return 'bg-amber-100 text-amber-700';
      case 'county': return 'bg-green-100 text-green-700';
      case 'industry': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Upcoming effective dates (future only)
  const upcomingDates = DEMO_ALERTS
    .filter(a => new Date(a.effectiveDate + 'T00:00:00') > new Date())
    .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

  return (
    <>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Regulatory Alerts' },
      ]} />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regulatory Change Alerts</h1>
          <p className="text-sm text-gray-600 mt-1">Stay ahead of compliance changes — we monitor so you don't have to</p>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap gap-3 mt-4">
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              <option value="all">All Sources</option>
              <option value="FDA">FDA</option>
              <option value="California">California State</option>
              <option value="County">County</option>
              <option value="NFPA">NFPA</option>
              <option value="OSHA">OSHA</option>
            </select>

            <select
              value={impactFilter}
              onChange={e => setImpactFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              <option value="all">All Impact Levels</option>
              <option value="action_required">Action Required</option>
              <option value="awareness">Awareness</option>
              <option value="informational">Informational</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="action_taken">Action Taken</option>
            </select>

            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Alert Banner */}
        {actionRequiredCount > 0 && !dismissedBanner && (
          <div className="bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-lg p-4 mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{actionRequiredCount} regulatory change{actionRequiredCount !== 1 ? 's' : ''} require{actionRequiredCount === 1 ? 's' : ''} your action</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setImpactFilter('action_required');
                  setStatusFilter('new');
                }}
                className="bg-white text-red-600 font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                Review Now
              </button>
              <button onClick={() => setDismissedBanner(true)} className="ml-1 hover:bg-white/20 rounded p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6 mt-6">
          {/* Left: Alert Feed */}
          <div className="flex-1 space-y-4">
            {filteredAlerts.length === 0 && (
              <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center">
                <Filter className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No alerts match your current filters.</p>
              </div>
            )}

            {filteredAlerts.map(alert => {
              const status = getAlertStatus(alert);
              const isExpanded = expandedId === alert.id;

              return (
                <div key={alert.id} className="bg-white rounded-lg shadow border border-gray-100 p-6 space-y-4">
                  {/* Top row: badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getSourceBadgeClasses(alert.source)}`}>
                      {getSourceLabel(alert)}
                    </span>
                    {getImpactBadge(alert.impactLevel)}
                    {getStatusIndicator(alert)}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mt-1">{alert.title}</h3>

                  {/* Dates row */}
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Effective: {formatDate(alert.effectiveDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Posted: {formatDate(alert.postedDate)}
                    </span>
                  </div>

                  {/* AI Summary */}
                  {/* TODO: Wire to /api/regulatory-alert-summary edge function for AI summaries */}
                  <div className="bg-[#eef4f8] rounded-lg p-4 border border-[#b8d4e8]">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#1e4d6b]" />
                      <span className="text-sm font-semibold text-[#1e4d6b]">AI Summary</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">{alert.summary}</p>
                  </div>

                  {/* What You Need to Do */}
                  {alert.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">What You Need to Do</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {alert.actionItems.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700">{item}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Affected Areas */}
                  {alert.affectedAreas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {alert.affectedAreas.map(area => (
                        <span key={area} className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {area}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Affected Locations */}
                  {alert.affectedLocations.length > 0 && (
                    <div className="flex items-center flex-wrap gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {alert.affectedLocations.map(loc => (
                        <span key={loc} className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#eef4f8] text-[#1e4d6b]">
                          {loc}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* EvidLY Auto-Actions */}
                  {alert.autoActions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">EvidLY Auto-Actions</h4>
                      <div className="space-y-2">
                        {alert.autoActions.map((action, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {action.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <span className={action.completed ? 'text-gray-500' : 'text-gray-700'}>{action.text}</span>
                            {!action.completed && action.actionType === 'upload' && (
                              <button
                                onClick={() => toast.info("File upload coming soon")}
                                className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e4d6b] border border-[#b8d4e8] rounded-lg hover:bg-[#eef4f8]"
                              >
                                <Upload className="w-3 h-3" />
                                Upload
                              </button>
                            )}
                            {!action.completed && action.actionType === 'link' && action.linkTo && (
                              <button
                                onClick={() => navigate(action.linkTo!)}
                                className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e4d6b] border border-[#b8d4e8] rounded-lg hover:bg-[#eef4f8]"
                              >
                                Schedule
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Button row */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                    {status === 'new' && (
                      <button
                        onClick={() => markReviewed(alert.id)}
                        className="px-4 py-2 bg-[#1e4d6b] text-white text-sm font-medium rounded-lg hover:bg-[#163a52]"
                      >
                        Mark as Reviewed
                      </button>
                    )}
                    {/* TODO: Wire to Resend for team share emails */}
                    <button
                      onClick={() => toast.success("Team notification sent")}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share with Team
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                      className="px-4 py-2 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50 flex items-center gap-1.5 ml-auto"
                    >
                      {isExpanded ? (
                        <>
                          Hide Full Regulatory Text
                          <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          View Full Regulatory Text
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expanded section */}
                  {isExpanded && (
                    <div className="mt-3">
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 font-mono">
                        {alert.fullRegulatoryText}
                      </div>
                      <a
                        href={alert.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-[#1e4d6b] hover:text-[#2a6a8f] text-sm font-medium"
                      >
                        View Source
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[280px] flex-shrink-0">
            {/* Your Jurisdictions */}
            <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1e4d6b]" />
                <h3 className="font-semibold text-gray-900">Your Jurisdictions</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">Monitoring based on your location addresses</p>
              <div className="mt-3">
                {CUSTOMER_JURISDICTIONS.map((j, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{j.name}, {j.state}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{j.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monitoring Sources */}
            <div className="bg-white rounded-lg shadow p-5 border border-gray-100 mt-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#1e4d6b]" />
                <h3 className="font-semibold text-gray-900">Monitoring Sources</h3>
              </div>
              <div className="mt-3 space-y-3">
                {MONITORED_SOURCES.map((src, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{src.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getSourceTypeBadge(src.type)}`}>{src.type}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Last checked: {formatDate(src.lastChecked)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Calendar mini card */}
            <div className="bg-white rounded-lg shadow p-5 border border-gray-100 mt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1e4d6b]" />
                <h3 className="font-semibold text-gray-900">Upcoming Effective Dates</h3>
              </div>
              <div className="mt-3">
                {upcomingDates.length === 0 && (
                  <p className="text-xs text-gray-400">No upcoming effective dates.</p>
                )}
                {upcomingDates.map((alert) => (
                  <div key={alert.id} className="text-sm py-2 border-b border-gray-50 last:border-0">
                    <p className="text-xs font-semibold text-[#1e4d6b]">{formatDate(alert.effectiveDate)}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {alert.title.length > 50 ? alert.title.slice(0, 50) + '...' : alert.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alert Preferences link */}
            <button
              onClick={() => navigate('/settings')}
              className="mt-4 w-full text-center px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Alert Preferences
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
