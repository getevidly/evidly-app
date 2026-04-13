import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronDown, ChevronUp, ExternalLink, Upload, Share2,
  CheckCircle2, Square, Calendar, AlertTriangle,
  Filter, Clock, MapPin, Bell, X
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  DEMO_ALERTS,
  type RegulatoryAlert, type RegulatorySource, type ImpactLevel, type AlertStatus
} from '../lib/regulatoryMonitor';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { useDemo } from '../contexts/DemoContext';
import { useRegulatoryChanges } from '../hooks/useRegulatoryChanges';

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function RegulatoryAlerts() {
  // TODO: i18n

  const navigate = useNavigate();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const { isDemoMode } = useDemo();
  const { alerts: liveAlerts, alertStatuses, markAsRead, jurisdictions, monitoringSources, loading, error } = useRegulatoryChanges();

  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [overriddenStatuses, setOverriddenStatuses] = useState<Record<string, AlertStatus>>({});

  const getAlertStatus = (alert: RegulatoryAlert): AlertStatus => {
    if (isDemoMode) {
      return overriddenStatuses[alert.id] || alert.status;
    }
    return alertStatuses[alert.id] || alert.status;
  };

  const sourceAlerts = isDemoMode ? DEMO_ALERTS : liveAlerts;

  // Filter logic
  const filteredAlerts = sourceAlerts
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
      case 'FDA': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'California': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'County': return 'bg-emerald-50 text-emerald-700 border-green-200';
      case 'NFPA': return 'bg-red-50 text-red-700 border-red-200';
      case 'OSHA': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-[#1E2D4D]/5 text-[#1E2D4D]/80 border-[#1E2D4D]/10';
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
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-red-50 text-red-700 border-red-200">Action Required</span>;
      case 'awareness':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-amber-100 text-amber-700 border-amber-200">Awareness</span>;
      case 'informational':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">Informational</span>;
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
            <span className="text-xs text-[#1E2D4D]/50">
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
      case 'federal': return 'bg-blue-50 text-blue-700';
      case 'state': return 'bg-amber-100 text-amber-700';
      case 'county': return 'bg-emerald-50 text-emerald-700';
      case 'industry': return 'bg-red-50 text-red-700';
      default: return 'bg-[#1E2D4D]/5 text-[#1E2D4D]/70';
    }
  };

  // Upcoming effective dates (future only)
  const upcomingDates = sourceAlerts
    .filter(a => new Date(a.effectiveDate + 'T00:00:00') > new Date())
    .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

  return (
    <>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Regulatory Alerts' },
      ]} />

      {!isDemoMode && loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-[#1E2D4D]/15 border-t-[#1E2D4D] rounded-full animate-spin" />
        </div>
      )}
      {!isDemoMode && error && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 mb-4">
          Unable to connect to regulatory monitoring service. Showing cached data if available.
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D]">Regulatory Change Alerts</h1>
          <p className="text-sm text-[#1E2D4D]/70 mt-1">Stay ahead of compliance changes — we monitor so you don't have to</p>

          {/* Filter dropdowns */}
          <div data-demo-allow className="flex flex-wrap gap-3 mt-4">
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
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
              className="px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
            >
              <option value="all">All Impact Levels</option>
              <option value="action_required">Action Required</option>
              <option value="awareness">Awareness</option>
              <option value="informational">Informational</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="action_taken">Action Taken</option>
            </select>

            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
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
          <div className="bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-xl p-4 mt-4 flex items-center justify-between flex-wrap gap-2">
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
                className="bg-white text-red-600 font-semibold px-4 py-2 rounded-lg hover:bg-[#FAF7F0] text-sm min-h-[44px]"
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
              <div className="bg-white rounded-xl border border-[#1E2D4D]/5 p-4 sm:p-5 text-center">
                <Filter className="w-8 h-8 text-[#1E2D4D]/30 mx-auto mb-3" />
                <p className="text-sm text-[#1E2D4D]/50">
                  {sourceAlerts.length === 0
                    ? 'No regulatory alerts at this time. We’ll notify you when updates affect your jurisdictions.'
                    : 'No alerts match your current filters.'}
                </p>
              </div>
            )}

            {filteredAlerts.map(alert => {
              const status = getAlertStatus(alert);
              const isExpanded = expandedId === alert.id;

              return (
                <div key={alert.id} className="bg-white rounded-xl border border-[#1E2D4D]/5 p-4 sm:p-6 space-y-4">
                  {/* Top row: badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getSourceBadgeClasses(alert.source)}`}>
                      {getSourceLabel(alert)}
                    </span>
                    {getImpactBadge(alert.impactLevel)}
                    {getStatusIndicator(alert)}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mt-1">{alert.title}</h3>

                  {/* Dates row */}
                  <div className="flex gap-4 text-sm text-[#1E2D4D]/50">
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
                  <div className="bg-[#eef4f8] rounded-xl p-4 border border-[#b8d4e8]">
                    <div className="flex items-center gap-1.5">
                      <EvidlyIcon size={16} />
                      <span className="text-sm font-semibold text-[#1E2D4D]">AI Summary</span>
                    </div>
                    <p className="text-sm text-[#1E2D4D]/80 mt-2">{alert.summary}</p>
                  </div>

                  {/* What You Need to Do */}
                  {alert.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-[#1E2D4D] mb-2">What You Need to Do</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {alert.actionItems.map((item, i) => (
                          <li key={i} className="text-sm text-[#1E2D4D]/80">{item}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Affected Areas */}
                  {alert.affectedAreas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {alert.affectedAreas.map(area => (
                        <span key={area} className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#1E2D4D]/5 text-[#1E2D4D]/80">
                          {area}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Affected Locations */}
                  {alert.affectedLocations.length > 0 && (
                    <div className="flex items-center flex-wrap gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#1E2D4D]/30 flex-shrink-0" />
                      {alert.affectedLocations.map(loc => (
                        <span key={loc} className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#eef4f8] text-[#1E2D4D]">
                          {loc}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* EvidLY Auto-Actions */}
                  {alert.autoActions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-[#1E2D4D] mb-2">EvidLY Auto-Actions</h4>
                      <div className="space-y-2">
                        {alert.autoActions.map((action, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {action.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-[#1E2D4D]/30 flex-shrink-0" />
                            )}
                            <span className={action.completed ? 'text-[#1E2D4D]/50' : 'text-[#1E2D4D]/80'}>{action.text}</span>
                            {!action.completed && action.actionType === 'upload' && (
                              <button
                                onClick={() => guardAction('upload', 'Regulatory Alerts', () => toast.info('File Upload'))}
                                className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1E2D4D] border border-[#b8d4e8] rounded-xl hover:bg-[#eef4f8]"
                              >
                                <Upload className="w-3 h-3" />
                                Upload
                              </button>
                            )}
                            {!action.completed && action.actionType === 'link' && action.linkTo && (
                              <button
                                onClick={() => navigate(action.linkTo!)}
                                className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1E2D4D] border border-[#b8d4e8] rounded-xl hover:bg-[#eef4f8]"
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
                  <div className="flex items-center gap-3 pt-3 border-t border-[#1E2D4D]/5 flex-wrap">
                    {status === 'new' && (
                      <button
                        onClick={() => {
                          if (isDemoMode) {
                            setOverriddenStatuses(prev => ({ ...prev, [alert.id]: 'reviewed' }));
                          } else {
                            markAsRead(alert.id);
                          }
                        }}
                        className="px-4 py-2 bg-[#1E2D4D] text-white text-sm font-medium rounded-lg hover:bg-[#162340] min-h-[44px]"
                      >
                        Mark as Reviewed
                      </button>
                    )}
                    {/* TODO: Wire to Resend for team share emails */}
                    <button
                      onClick={() => guardAction('notify', 'Regulatory Alerts', () => toast.success('Team notification sent'))}
                      className="px-4 py-2 border border-[#1E2D4D]/15 text-[#1E2D4D]/80 text-sm font-medium rounded-lg hover:bg-[#FAF7F0] flex items-center gap-1.5 min-h-[44px]"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share with Team
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                      className="px-4 py-2 text-[#1E2D4D]/50 text-sm font-medium rounded-lg hover:bg-[#FAF7F0] flex items-center gap-1.5 ml-auto"
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
                      <div className="bg-[#FAF7F0] rounded-xl p-4 text-sm text-[#1E2D4D]/70 font-mono">
                        {alert.fullRegulatoryText}
                      </div>
                      <a
                        href={alert.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-[#1E2D4D] hover:text-[#2A3F6B] text-sm font-medium"
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
            <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#1E2D4D]/5">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1E2D4D]" />
                <h3 className="font-semibold text-[#1E2D4D]">Your Jurisdictions</h3>
              </div>
              <p className="text-xs text-[#1E2D4D]/50 mt-1">Monitoring based on your location addresses</p>
              <div className="mt-3">
                {jurisdictions.length === 0 ? (
                  <p className="text-xs text-[#1E2D4D]/30 py-2">Add a location to see your jurisdictions.</p>
                ) : (
                  jurisdictions.map((j, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[#1E2D4D]/3 last:border-0">
                      <span className="text-sm text-[#1E2D4D]/80">{j.name}, {j.state}</span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-[#1E2D4D]/5 text-[#1E2D4D]/70">{j.type}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Monitoring Sources */}
            <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#1E2D4D]/5 mt-4">
              <div className="flex items-center gap-2">
                <EvidlyIcon size={16} />
                <h3 className="font-semibold text-[#1E2D4D]">Monitoring Sources</h3>
              </div>
              <div className="mt-3 space-y-3">
                {monitoringSources.length === 0 ? (
                  <p className="text-xs text-[#1E2D4D]/30 py-2">No monitoring sources configured.</p>
                ) : (
                  monitoringSources.map((src, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#1E2D4D]/80">{src.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getSourceTypeBadge(src.type)}`}>{src.type}</span>
                      </div>
                      <p className="text-xs text-[#1E2D4D]/30 mt-0.5">Last checked: {formatDate(src.lastChecked)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Compliance Calendar mini card */}
            <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#1E2D4D]/5 mt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1E2D4D]" />
                <h3 className="font-semibold text-[#1E2D4D]">Upcoming Effective Dates</h3>
              </div>
              <div className="mt-3">
                {upcomingDates.length === 0 && (
                  <p className="text-xs text-[#1E2D4D]/30">No upcoming effective dates.</p>
                )}
                {upcomingDates.map((alert) => (
                  <div key={alert.id} className="text-sm py-2 border-b border-[#1E2D4D]/3 last:border-0">
                    <p className="text-xs font-semibold text-[#1E2D4D]">{formatDate(alert.effectiveDate)}</p>
                    <p className="text-xs text-[#1E2D4D]/70 mt-0.5">
                      {alert.title.length > 50 ? alert.title.slice(0, 50) + '...' : alert.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alert Preferences link */}
            <button
              onClick={() => navigate('/settings')}
              className="mt-4 w-full text-center px-4 py-2 border border-[#1E2D4D]/15 text-[#1E2D4D]/80 text-sm rounded-lg hover:bg-[#FAF7F0] flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Alert Preferences
            </button>
          </div>
        </div>
      </div>

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}
