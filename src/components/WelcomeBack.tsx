import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { needsAttentionItems } from '../data/demoData';

interface Priority {
  icon: string;
  text: string;
}

interface WelcomeBackProps {
  userName: string | null;
  lastLoginAt: string | null;
  isDemoMode: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatLastLogin(lastLoginAt: string | null, isDemoMode: boolean): string {
  if (isDemoMode) return 'This is your demo session';
  if (!lastLoginAt) return '';

  const last = new Date(lastLoginAt);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) return 'Last login: Just recently';
  if (diffHours < 24) return `Last login: ${Math.round(diffHours)} hours ago`;
  if (diffDays < 2) return `Last login: Yesterday at ${last.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  if (diffDays < 7) return `Last login: ${Math.round(diffDays)} days ago`;
  return `Last login: ${last.toLocaleDateString()}`;
}

function getDemoPriorities(): Priority[] {
  // Curate a set of realistic priorities from demo data
  const topItems = needsAttentionItems
    .filter(item => item.color === 'red')
    .slice(0, 3);

  const priorities: Priority[] = topItems.map(item => ({
    icon: item.title.toLowerCase().includes('temperature') || item.title.toLowerCase().includes('temp') ? '🌡️' :
      item.title.toLowerCase().includes('checklist') ? '📋' :
      item.title.toLowerCase().includes('overdue') || item.title.toLowerCase().includes('expired') ? '⚠️' :
      item.title.toLowerCase().includes('fire') || item.title.toLowerCase().includes('suppression') ? '🔧' : '📄',
    text: item.title,
  }));

  // Add a couple more common ones if we have room
  if (priorities.length < 5) {
    priorities.push({ icon: '🌡️', text: '3 temperature readings due today' });
  }
  if (priorities.length < 5) {
    priorities.push({ icon: '🔧', text: 'Walk-in Cooler #2 service due in 5 days' });
  }

  return priorities.slice(0, 5);
}

export function WelcomeBack({ userName, lastLoginAt, isDemoMode }: WelcomeBackProps) {
  const firstName = userName?.split(' ')[0] || 'there';

  const priorities = useMemo(() => {
    // Always use demo priorities for now (real data integration would query Supabase)
    return getDemoPriorities();
  }, []);

  const lastLoginText = formatLastLogin(lastLoginAt, isDemoMode);

  return (
    <div
      className="rounded-xl p-4 sm:p-5 mb-6"
      style={{
        background: 'linear-gradient(135deg, #eef4f8 0%, #e0eef6 100%)',
        border: '1px solid #b8d4e8',
      }}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-lg sm:text-xl font-semibold text-[#1e4d6b]">
          {getGreeting()}, {firstName}!
        </span>
      </div>

      {lastLoginText && (
        <p className="text-[13px] text-gray-500 mt-1">{lastLoginText}</p>
      )}

      {priorities.length > 0 ? (
        <div className="mt-3">
          <p className="text-[13px] font-semibold text-gray-600 mb-1.5">
            Today's priorities:
          </p>
          <div className="space-y-1">
            {priorities.map((p, i) => (
              <div key={i} className="text-[13px] text-gray-700">
                {p.icon} {p.text}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-3 text-[13px] text-[#166534]">
          <CheckCircle2 className="w-4 h-4" />
          <span>All caught up — no urgent items today</span>
        </div>
      )}
    </div>
  );
}
