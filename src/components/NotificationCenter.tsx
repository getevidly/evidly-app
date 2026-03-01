import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Clock, AlertTriangle, Info, ShieldAlert, ChevronRight, CheckCheck, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../contexts/DemoContext';
import { DEMO_VENDOR_DOC_NOTIFICATIONS } from '../data/vendorDocumentsDemoData';

// ── Types ──────────────────────────────────────────────────────
type NotificationSeverity = 'urgent' | 'advisory' | 'info';
type NotificationStatus = 'unread' | 'read' | 'snoozed' | 'dismissed';

interface Notification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  link: string;
  status: NotificationStatus;
  snoozed_until?: string;
  created_at: string;
  category?: 'vendor_document';
}

// ── Demo data ──────────────────────────────────────────────────
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-1',
    severity: 'urgent',
    title: 'Hood Cleaning Overdue — Airport Cafe', // demo
    body: '95 days since last hood cleaning. 90-day cycle exceeded by 5 days.',
    link: '/vendors',
    status: 'unread',
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 'n-2',
    severity: 'urgent',
    title: 'Walk-in Cooler Temp Trending Up',
    body: '3 readings above 38°F this week at University Dining.', // demo
    link: '/temp-logs',
    status: 'unread',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'n-3',
    severity: 'urgent',
    title: 'Health Permit Expires in 14 Days',
    body: 'Downtown Kitchen permit expires Feb 23. Renewal not started.', // demo
    link: '/documents',
    status: 'unread',
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: 'n-4',
    severity: 'urgent',
    title: 'Fire Suppression Inspection Overdue',
    body: 'University Dining — 4 months overdue. Insurance compliance at risk.', // demo
    link: '/vendors',
    status: 'unread',
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'n-5',
    severity: 'advisory',
    title: 'Checklist Completion Dropped 12%',
    body: 'University Dining weekly rate fell from 89% to 78%.', // demo
    link: '/checklists',
    status: 'unread',
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: 'n-6',
    severity: 'advisory',
    title: 'Food Handler Cert Expiring — Emma Davis',
    body: 'Expires March 11 at Airport Cafe. Renewal course: 8 hours.', // demo
    link: '/team',
    status: 'unread',
    created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
  },
  {
    id: 'n-7',
    severity: 'advisory',
    title: 'Grease Trap Service 5 Days Overdue',
    body: 'Downtown Kitchen quarterly pumping is 5 days past due.', // demo
    link: '/vendors',
    status: 'unread',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'n-8',
    severity: 'advisory',
    title: 'Vendor COI Expired — Valley Fire Protection',
    body: 'Liability insurance expired 3 days ago. Affects Airport Cafe.', // demo
    link: '/vendors',
    status: 'unread',
    created_at: new Date(Date.now() - 30 * 3600000).toISOString(),
  },
  {
    id: 'n-9',
    severity: 'info',
    title: 'Weekly Compliance Digest Ready',
    body: 'Your weekly summary for Feb 3–9 is available.',
    link: '/weekly-digest',
    status: 'unread',
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: 'n-10',
    severity: 'info',
    title: 'AI Insight: Freezer Temp Variance Increasing',
    body: 'Downtown Kitchen variance up from ±1°F to ±2.5°F.', // demo
    link: '/temp-logs',
    status: 'unread',
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
  {
    id: 'n-11',
    severity: 'info',
    title: 'Opening Checklist Slowdown — Airport Cafe', // demo
    body: 'Average completion time increased from 18 to 25 minutes.',
    link: '/checklists',
    status: 'read',
    created_at: new Date(Date.now() - 96 * 3600000).toISOString(),
  },
];

// Map vendor doc notifications to the Notification shape
const VENDOR_DOC_SEVERITY_MAP: Record<string, NotificationSeverity> = {
  new_upload: 'info',
  updated: 'info',
  review_completed: 'info',
  review_required: 'advisory',
  expiring_90: 'info',
  expiring_60: 'info',
  expiring_30: 'advisory',
  expiring_14: 'urgent',
  expired: 'urgent',
  flagged: 'urgent',
};

const DEMO_VENDOR_NOTIFICATIONS: Notification[] = DEMO_VENDOR_DOC_NOTIFICATIONS.map(n => ({
  id: n.id,
  severity: VENDOR_DOC_SEVERITY_MAP[n.notification_type] || 'info',
  title: n.title,
  body: n.body || '',
  link: n.action_url || '/vendors',
  status: (n.read_at ? 'read' : 'unread') as NotificationStatus,
  created_at: n.created_at,
  category: 'vendor_document' as const,
}));

const ALL_DEMO_NOTIFICATIONS = [...DEMO_NOTIFICATIONS, ...DEMO_VENDOR_NOTIFICATIONS];

// ── Helpers ────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<NotificationSeverity, { label: string; color: string; bg: string; border: string; icon: typeof AlertTriangle }> = {
  urgent: { label: 'Urgent', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: ShieldAlert },
  advisory: { label: 'Advisory', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: AlertTriangle },
  info: { label: 'Info', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: Info },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Component ──────────────────────────────────────────────────
export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { isDemoMode } = useDemo();
  const [notifications, setNotifications] = useState<Notification[]>(isDemoMode ? ALL_DEMO_NOTIFICATIONS : []);
  const [filter, setFilter] = useState<'all' | NotificationSeverity | 'vendor'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => n.status === 'unread').length;
  const urgentUnread = notifications.filter(n => n.status === 'unread' && n.severity === 'urgent').length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const filtered = notifications.filter(n => {
    if (n.status === 'dismissed') return false;
    if (filter === 'vendor') return n.category === 'vendor_document';
    if (filter !== 'all' && n.severity !== filter) return false;
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' as NotificationStatus } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => n.status === 'unread' ? { ...n, status: 'read' as NotificationStatus } : n));
  };

  const snooze = (id: string) => {
    const until = new Date(Date.now() + 24 * 3600000).toISOString();
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'snoozed' as NotificationStatus, snoozed_until: until } : n));
  };

  const dismiss = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'dismissed' as NotificationStatus } : n));
  };

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    setIsOpen(false);
    navigate(n.link);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md hover:bg-gray-100 transition-colors duration-150"
        title="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center"
            style={{
              backgroundColor: urgentUnread > 0 ? '#dc2626' : '#d97706',
              color: 'white',
              fontSize: '10px',
              fontWeight: 700,
              width: '18px',
              height: '18px',
              borderRadius: '9999px',
              lineHeight: '18px',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 bg-white rounded-xl shadow-sm border border-gray-200 z-50 overflow-hidden"
          style={{ width: '400px', maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#faf8f3' }}>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#1e4d6b', color: 'white' }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium flex items-center gap-1 hover:underline"
                  style={{ color: '#1e4d6b' }}
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-gray-100 px-2" style={{ backgroundColor: '#faf8f3' }}>
            {([
              { key: 'all' as const, label: 'All' },
              { key: 'urgent' as const, label: 'Urgent' },
              { key: 'advisory' as const, label: 'Advisory' },
              { key: 'info' as const, label: 'Info' },
              { key: 'vendor' as const, label: 'Vendor' },
            ]).map(tab => {
              const count = tab.key === 'all'
                ? notifications.filter(n => n.status !== 'dismissed').length
                : tab.key === 'vendor'
                  ? notifications.filter(n => n.category === 'vendor_document' && n.status !== 'dismissed').length
                  : notifications.filter(n => n.severity === tab.key && n.status !== 'dismissed').length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className="px-3 py-2 text-xs font-medium transition-colors"
                  style={{
                    color: filter === tab.key ? '#1e4d6b' : '#6b7280',
                    borderBottom: filter === tab.key ? '2px solid #1e4d6b' : '2px solid transparent',
                  }}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">No notifications</div>
            ) : (
              filtered.map(n => {
                const sev = SEVERITY_CONFIG[n.severity];
                const SevIcon = sev.icon;
                const isUnread = n.status === 'unread';
                return (
                  <div
                    key={n.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    style={{ backgroundColor: isUnread ? '#fafbff' : 'white' }}
                  >
                    <div className="px-4 py-3 flex gap-3" onClick={() => handleClick(n)}>
                      {/* Icon */}
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                        style={{ backgroundColor: sev.bg }}
                      >
                        {n.category === 'vendor_document'
                          ? <FileText className="h-4 w-4" style={{ color: sev.color }} />
                          : <SevIcon className="h-4 w-4" style={{ color: sev.color }} />
                        }
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sev.color }} />
                            )}
                            <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {n.title}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                        {/* Severity badge + action buttons */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className="text-xs font-semibold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: sev.bg, color: sev.color, fontSize: '10px' }}
                          >
                            {sev.label}
                          </span>
                          <div className="flex gap-1 ml-auto" onClick={e => e.stopPropagation()}>
                            {isUnread && (
                              <button
                                onClick={() => markAsRead(n.id)}
                                className="p-1 rounded hover:bg-gray-200 transition-colors"
                                title="Mark as read"
                              >
                                <Check className="h-3 w-3 text-gray-400" />
                              </button>
                            )}
                            <button
                              onClick={() => snooze(n.id)}
                              className="p-1 rounded hover:bg-gray-200 transition-colors"
                              title="Snooze 24h"
                            >
                              <Clock className="h-3 w-3 text-gray-400" />
                            </button>
                            <button
                              onClick={() => dismiss(n.id)}
                              className="p-1 rounded hover:bg-gray-200 transition-colors"
                              title="Dismiss"
                            >
                              <X className="h-3 w-3 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => { setIsOpen(false); navigate('/analysis'); }}
              className="w-full text-center text-xs font-semibold flex items-center justify-center gap-1 hover:underline"
              style={{ color: '#1e4d6b' }}
            >
              View All Predictive Alerts <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
