import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

interface Priority {
  icon: string;
  text: string;
}

interface WelcomeBackProps {
  userName: string | null;
  lastLoginAt: string | null;
  isDemoMode: boolean;
}

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'hero.goodMorning';
  if (hour < 17) return 'hero.goodAfternoon';
  return 'hero.goodEvening';
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

export function WelcomeBack({ userName, lastLoginAt, isDemoMode }: WelcomeBackProps) {
  const { t } = useTranslation();
  const firstName = userName?.split(' ')[0] || 'there';

  // No fake priorities — real data will come from Supabase
  const priorities: Priority[] = [];

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
        <span className="text-lg sm:text-xl font-semibold text-[#1E2D4D]">
          {t(getGreetingKey())}, {firstName}!
        </span>
      </div>

      {lastLoginText && (
        <p className="text-sm text-[#1E2D4D]/50 mt-1">{lastLoginText}</p>
      )}

      {priorities.length > 0 ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-[#1E2D4D]/70 mb-1.5">
            {t('hero.todaysPriorities')}
          </p>
          <div className="space-y-1">
            {priorities.map((p, i) => (
              <div key={i} className="text-sm text-[#1E2D4D]/80">
                {p.icon} {p.text}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-3 text-sm text-[#166534]">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t('hero.allCaughtUp')}</span>
        </div>
      )}
    </div>
  );
}
