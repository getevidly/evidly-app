// src/pages/SetupFoodSafetyEntry.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';

const PRIMARY = '#1E2D4D';
const TEXT_MUTED = '#5F5E5A';
const TEXT_SUBTLE = '#888780';
const CREAM = '#F8F4ED';
const BORDER_SUBTLE = 'rgba(0,0,0,0.08)';
const ROW_BORDER = '#E5E2D5';
const SET_UP_BG = '#FBFAF6';

const STATUS_STYLES = {
  not_started: { bg: '#FAEEDA', text: '#854F0B', label: 'Not started' },
  in_progress: { bg: '#E6F1FB', text: '#0C447C', label: 'In progress' },
  set_up:      { bg: '#E1F5EE', text: '#085041', label: 'Set up' },
} as const;

type Status = keyof typeof STATUS_STYLES;

interface LocationRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  jurisdictionLabel: string | null;
  status: Status;
  profileUpdatedAt: string | null;
  wizardCompletedAt: string | null;
}

function deriveStatus(hasProfile: boolean, completedAt: string | null): Status {
  if (!hasProfile) return 'not_started';
  if (!completedAt) return 'in_progress';
  return 'set_up';
}

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return 'updated today';
  if (days === 1) return 'updated yesterday';
  if (days < 30) return `updated ${days} days ago`;
  return `updated ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function formatCompletedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SetupFoodSafetyEntry() {
  usePageTitle('Set up food safety records');
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [locations, setLocations] = useState<LocationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) return;
    let cancelled = false;

    const load = async () => {
      try {
        const { data: locs, error: locErr } = await supabase
          .from('locations')
          .select(`
            id, name, city, state,
            location_food_safety_profile (
              id, wizard_completed_at, updated_at
            ),
            jurisdictions ( agency_name, county )
          `)
          .eq('organization_id', profile.organization_id)
          .eq('status', 'active')
          .order('name', { ascending: true });

        if (locErr) throw locErr;
        if (cancelled) return;

        const rows: LocationRow[] = (locs || []).map((loc: any) => {
          const profileRow = Array.isArray(loc.location_food_safety_profile)
            ? loc.location_food_safety_profile[0]
            : loc.location_food_safety_profile;
          const j = (loc as any).jurisdictions;
          const jurisdictions = j ? [j.county || j.agency_name].filter(Boolean) : [];
          return {
            id: loc.id,
            name: loc.name,
            city: loc.city,
            state: loc.state,
            jurisdictionLabel: jurisdictions.length > 0 ? jurisdictions.join(' · ') : null,
            status: deriveStatus(!!profileRow, profileRow?.wizard_completed_at || null),
            profileUpdatedAt: profileRow?.updated_at || null,
            wizardCompletedAt: profileRow?.wizard_completed_at || null,
          };
        });

        setLocations(rows);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load locations');
      }
    };

    load();
    return () => { cancelled = true; };
  }, [profile?.organization_id]);

  if (!profile?.organization_id) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: CREAM, fontFamily: "'DM Sans', sans-serif" }}>
        <div className="max-w-md text-center">
          <AlertCircle size={32} style={{ color: TEXT_MUTED, margin: '0 auto 12px' }} />
          <p style={{ color: PRIMARY, fontSize: 16, fontWeight: 500 }}>Couldn't load your locations</p>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 8 }}>{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-sm underline" style={{ color: PRIMARY }}>Try again</button>
        </div>
      </div>
    );
  }

  if (locations === null) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: CREAM }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#A08C5A' }} />
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: CREAM, fontFamily: "'DM Sans', sans-serif" }}>
        <div className="max-w-md text-center">
          <p style={{ color: PRIMARY, fontSize: 16, fontWeight: 500 }}>No locations found</p>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 8 }}>
            Ask your administrator to add a location, or visit the dashboard.
          </p>
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-sm underline" style={{ color: PRIMARY }}>
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (locations.length === 1) {
    return <Navigate to={`/setup/food-safety/${locations[0].id}`} replace />;
  }

  const groups: Array<{ status: Status; label: string; rows: LocationRow[] }> = [
    { status: 'not_started', label: 'Needs setup', rows: locations.filter(l => l.status === 'not_started') },
    { status: 'in_progress', label: 'In progress', rows: locations.filter(l => l.status === 'in_progress') },
    { status: 'set_up',      label: 'Set up',      rows: locations.filter(l => l.status === 'set_up') },
  ].filter(g => g.rows.length > 0);

  return (
    <div className="min-h-screen w-full" style={{ background: CREAM, fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-2xl bg-white px-5 sm:px-7 py-6 sm:py-7" style={{ border: `0.5px solid ${BORDER_SUBTLE}` }}>
          <header className="flex items-start justify-between gap-4 mb-1">
            <div>
              <div className="text-xs font-medium uppercase mb-1.5" style={{ color: TEXT_MUTED, letterSpacing: '0.04em' }}>Food safety profile</div>
              <h1 className="text-lg sm:text-xl font-medium" style={{ color: PRIMARY }}>Choose a location to set up</h1>
            </div>
            <div className="text-sm whitespace-nowrap" style={{ color: TEXT_MUTED }}>{locations.length} locations</div>
          </header>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
            Each location has its own food safety profile. Pick one to start or pick up where you left off.
          </p>

          {groups.map(group => (
            <section key={group.status} className="mt-6">
              <div className="text-xs font-medium uppercase mb-2" style={{ color: TEXT_SUBTLE, letterSpacing: '0.04em' }}>
                {group.label} &middot; {group.rows.length}
              </div>
              <div className="flex flex-col gap-2">
                {group.rows.map(row => {
                  const styles = STATUS_STYLES[row.status];
                  const subtitle = [row.city && row.state ? `${row.city}, ${row.state}` : row.state, row.jurisdictionLabel].filter(Boolean).join(' · ');
                  const hint = row.status === 'in_progress' && row.profileUpdatedAt
                    ? formatRelative(row.profileUpdatedAt)
                    : row.status === 'set_up' && row.wizardCompletedAt
                    ? `Set up ${formatCompletedDate(row.wizardCompletedAt)} · tap to review or update`
                    : null;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => navigate(`/setup/food-safety/${row.id}`)}
                      className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left w-full"
                      style={{ border: `1px solid ${ROW_BORDER}`, background: row.status === 'set_up' ? SET_UP_BG : '#ffffff' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base font-medium" style={{ color: PRIMARY }}>{row.name}</div>
                        {subtitle && <div className="text-xs sm:text-sm mt-0.5" style={{ color: TEXT_MUTED }}>{subtitle}</div>}
                        {hint && <div className="text-xs mt-1" style={{ color: TEXT_SUBTLE }}>{hint}</div>}
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0" style={{ background: styles.bg, color: styles.text }}>
                        {styles.label}
                      </span>
                      <ChevronRight size={16} style={{ color: TEXT_SUBTLE, flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="mt-6 pt-4 text-sm" style={{ borderTop: `0.5px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED }}>
            Don't see your location? Ask your administrator.
          </div>
        </div>
      </div>
    </div>
  );
}
