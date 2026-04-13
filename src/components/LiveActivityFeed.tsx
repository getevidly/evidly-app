import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Thermometer, CheckSquare, FileText, Upload, AlertCircle, User } from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';

interface ActivityItem {
  id: string;
  icon: 'temp' | 'checklist' | 'document' | 'upload' | 'alert';
  user: string;
  action: string;
  location: string;
  time: string;
  url: string;
}

const iconMap = {
  temp: { icon: Thermometer, color: '#3b82f6', bg: '#eff6ff' },
  checklist: { icon: CheckSquare, color: '#22c55e', bg: '#f0fdf4' },
  document: { icon: FileText, color: '#8b5cf6', bg: '#f5f3ff' },
  upload: { icon: Upload, color: '#A08C5A', bg: '#fefce8' },
  alert: { icon: AlertCircle, color: '#ef4444', bg: '#fef2f2' },
};

const demoActivities: ActivityItem[] = [
  { id: '1', icon: 'temp', user: 'Marcus R.', action: 'Completed walk-in cooler temp check', location: 'Location 1', time: '2 min ago', url: '/temp-logs' }, // demo
  { id: '2', icon: 'checklist', user: 'Sarah T.', action: 'Finished opening checklist (14/14)', location: 'Location 1', time: '18 min ago', url: '/checklists' }, // demo
  { id: '3', icon: 'upload', user: 'Hood Cleaning Vendor', action: 'Uploaded hood cleaning certificate', location: 'Location 2', time: '1 hour ago', url: '/vendors' }, // demo
  { id: '4', icon: 'alert', user: 'System', action: 'Fire suppression report expired', location: 'Location 2', time: '2 hours ago', url: '/alerts' }, // demo
  { id: '5', icon: 'temp', user: 'James L.', action: 'Logged hot hold cabinet temps', location: 'Location 3', time: '3 hours ago', url: '/temp-logs' }, // demo
  { id: '6', icon: 'document', user: 'Admin', action: 'Health permit renewal uploaded', location: 'Location 1', time: '5 hours ago', url: '/documents' }, // demo
  { id: '7', icon: 'checklist', user: 'Maria G.', action: 'Completed closing checklist (10/10)', location: 'Location 2', time: 'Yesterday', url: '/checklists' }, // demo
];

export function LiveActivityFeed() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [visibleItems, setVisibleItems] = useState<number>(0);
  const [showLiveDot, setShowLiveDot] = useState(true);

  const activities = isDemoMode ? demoActivities : [];

  useEffect(() => {
    // Stagger in items one by one
    const timer = setInterval(() => {
      setVisibleItems((prev) => {
        if (prev >= activities.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [activities.length]);

  return (
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10">
      <div className="flex items-center justify-between p-4 border-b border-[#1E2D4D]/5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">Activity Feed</h3>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-live-dot" />
            <span className="text-xs font-medium text-green-700">Live</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/alerts')}
          className="text-sm font-medium text-[#1E2D4D] hover:text-[#2A3F6B] transition-colors"
        >
          View All →
        </button>
      </div>
      <div className="divide-y divide-[#1E2D4D]/3 max-h-[420px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#1E2D4D]/30">No recent activity</div>
        ) : activities.map((activity, index) => {
          const { icon: Icon, color, bg } = iconMap[activity.icon];
          const isVisible = index < visibleItems;

          return (
            <div
              key={activity.id}
              onClick={() => navigate(activity.url)}
              className={`flex items-start gap-3 p-4 hover:bg-[#FAF7F0] cursor-pointer transition-all duration-300 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
              }`}
              style={{
                transitionDelay: `${index * 80}ms`,
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: bg }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[#1E2D4D]">{activity.user}</span>
                  {index === 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded uppercase">New</span>
                  )}
                </div>
                <p className="text-sm text-[#1E2D4D]/70 mt-0.5">{activity.action}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[#1E2D4D]/30">{activity.location}</span>
                  <span className="text-xs text-[#1E2D4D]/30">•</span>
                  <span className="text-xs text-[#1E2D4D]/30">{activity.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
