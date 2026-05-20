import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useOrgSummary } from '../../hooks/useOrgSummary';

function getGreeting(timezone: string): string {
  const hour = new Date().toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false });
  const h = parseInt(hour, 10);
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(timezone: string): string {
  return new Date().toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${pluralForm}`;
}

export function DashboardWelcome() {
  const { user, profile } = useAuth();
  const { isDemoMode, firstName: demoFirstName } = useDemo();
  const { orgName, locationCount, countyCount, timezone, loading } = useOrgSummary();

  const firstName = isDemoMode
    ? (demoFirstName || 'there')
    : (profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there');

  if (loading) {
    return (
      <div className="welcome">
        <p className="welcome-h" style={{ background: 'var(--cream)', color: 'transparent', borderRadius: 6, width: 260, height: 28 }}>&nbsp;</p>
        <span className="welcome-sub" style={{ background: 'var(--cream)', color: 'transparent', borderRadius: 4, width: 340, height: 16, display: 'inline-block', marginTop: 4 }}>&nbsp;</span>
      </div>
    );
  }

  const greeting = getGreeting(timezone);
  const dateStr = formatDate(timezone);

  const parts = [dateStr];
  if (orgName) parts.push(orgName);
  if (locationCount > 0) parts.push(plural(locationCount, 'location', 'locations'));
  if (countyCount > 0) parts.push(plural(countyCount, 'county', 'counties'));

  return (
    <div className="welcome">
      <p className="welcome-h">{greeting}, {firstName}</p>
      <span className="welcome-sub">{parts.join(' · ')}</span>
    </div>
  );
}
