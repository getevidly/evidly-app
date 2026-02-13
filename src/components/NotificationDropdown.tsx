import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText, CheckCircle, Clock, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../contexts/NotificationContext';

interface Notification {
  id: string;
  icon: 'alert' | 'document' | 'success' | 'clock';
  message: string;
  time: Date;
  read: boolean;
  link?: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  demoMode?: boolean;
}

export function NotificationDropdown({ isOpen, onClose, demoMode = false }: NotificationDropdownProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (demoMode) {
      const saved = sessionStorage.getItem('evidly_notifications');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { markAsRead } = useNotifications();

  useEffect(() => {
    if (isOpen) {
      if (demoMode) {
        loadDemoNotifications();
      } else if (profile?.organization_id) {
        fetchNotifications();
      }
    }
  }, [isOpen, profile, demoMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const loadDemoNotifications = () => {
    const saved = sessionStorage.getItem('evidly_notifications');
    if (saved) {
      setNotifications(JSON.parse(saved));
      return;
    }

    const demoNotifs: Notification[] = [
      {
        id: 'demo-1',
        icon: 'alert',
        message: 'Health Permit Renewal Due — 14 days',
        time: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: false,
        link: '/documents',
      },
      {
        id: 'demo-2',
        icon: 'alert',
        message: '3 temperature checks missed — Airport Cafe',
        time: new Date(Date.now() - 4 * 60 * 60 * 1000),
        read: false,
        link: '/temp-logs',
      },
      {
        id: 'demo-3',
        icon: 'alert',
        message: 'Food Handler certs expiring — 2 team members',
        time: new Date(Date.now() - 6 * 60 * 60 * 1000),
        read: false,
        link: '/team',
      },
      {
        id: 'demo-4',
        icon: 'document',
        message: 'Weekly compliance digest ready',
        time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        read: false,
        link: '/reports',
      },
      {
        id: 'demo-5',
        icon: 'success',
        message: 'Vendor upload received — ABC Fire Protection',
        time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        read: false,
        link: '/vendors',
      },
    ];
    sessionStorage.setItem('evidly_notifications', JSON.stringify(demoNotifs));
    setNotifications(demoNotifs);
  };

  const fetchNotifications = async () => {
    const orgId = profile?.organization_id;
    const notifs: Notification[] = [];

    const { data: expiringDocs } = await supabase
      .from('vendor_upload_requests')
      .select('*, vendor_contacts(company_name)')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    if (expiringDocs) {
      expiringDocs.forEach((doc) => {
        notifs.push({
          id: `doc-${doc.id}`,
          icon: 'alert',
          message: `Pending document from ${(doc as any).vendor_contacts?.company_name || 'vendor'}`,
          time: new Date(doc.created_at),
          read: false,
          link: '/vendors',
        });
      });
    }

    const { data: todayLogs } = await supabase
      .from('temp_check_completions')
      .select('*')
      .eq('organization_id', orgId)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .order('created_at', { ascending: false })
      .limit(3);

    if (todayLogs && todayLogs.length < 4) {
      notifs.push({
        id: 'temp-logs-behind',
        icon: 'clock',
        message: 'Temperature logs behind schedule today',
        time: new Date(),
        read: false,
        link: '/temp-logs',
      });
    }

    const { data: recentCompletions } = await supabase
      .from('temp_check_completions')
      .select('*, user_profiles(full_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(2);

    if (recentCompletions) {
      recentCompletions.forEach((completion) => {
        notifs.push({
          id: `completion-${completion.id}`,
          icon: 'success',
          message: `${(completion as any).user_profiles?.full_name || 'Team member'} completed temperature check`,
          time: new Date(completion.created_at),
          read: false,
        });
      });
    }

    notifs.sort((a, b) => b.time.getTime() - a.time.getTime());
    setNotifications(notifs.slice(0, 10));
  };

  const getIcon = (type: Notification['icon'], message?: string) => {
    if (type === 'alert') {
      if (message?.includes('missed') || message?.includes('Behind')) {
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      }
      return <AlertCircle className="w-5 h-5 text-amber-500" />;
    }
    switch (type) {
      case 'document':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'clock':
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    const updated = notifications.map(n => n.id === notification.id ? { ...n, read: true } : n);

    if (demoMode) {
      sessionStorage.setItem('evidly_notifications', JSON.stringify(updated));
      markAsRead(notification.id);
    }

    setNotifications(updated);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));

    if (demoMode) {
      sessionStorage.setItem('evidly_notifications', JSON.stringify(updated));
      notifications.forEach(n => markAsRead(n.id));
    }

    setNotifications(updated);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-sm border border-gray-200 z-50 animate-slide-down"
    >
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  notification.link ? 'cursor-pointer' : ''
                } ${!notification.read ? 'bg-blue-50' : ''} animate-fade-in`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{getIcon(notification.icon, notification.message)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(notification.time, { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 space-y-2">
          <button
            onClick={handleMarkAllAsRead}
            className="w-full text-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Mark All as Read
          </button>
          <button
            onClick={() => {
              navigate('/alerts');
            }}
            className="w-full text-center text-sm font-medium text-[#1e4d6b] hover:text-[#2a6a8f] transition-colors"
          >
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
}
