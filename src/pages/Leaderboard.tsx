import { useState, useEffect } from 'react';
import { Trophy, Flame, Star, TrendingUp, TrendingDown, Minus, Shield, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Breadcrumb } from '../components/Breadcrumb';

interface LeaderboardEntry {
  id: string;
  name: string;
  city: string;
  state: string;
  organization_id: string;
  organization_name: string;
  industry_type: string;
  temp_compliance_pct: number | null;
  checklist_completion_pct: number | null;
  streak_days: number;
  created_at: string;
}

const INDUSTRIES = ['All', 'casual_dining', 'quick_service', 'fine_dining', 'hotel', 'education_k12', 'education_university', 'healthcare', 'corporate_dining', 'catering'];
const INDUSTRY_LABELS: Record<string, string> = {
  All: 'All',
  casual_dining: 'Casual Dining',
  quick_service: 'Quick Service',
  fine_dining: 'Fine Dining',
  hotel: 'Hospitality',
  education_k12: 'K-12',
  education_university: 'University',
  healthcare: 'Healthcare',
  corporate_dining: 'Corporate',
  catering: 'Catering',
};

const calcXP = (temp: number, checklist: number, streak: number) =>
  Math.round((temp * 0.4) + (checklist * 0.4) + (streak * 0.2));

function getBadges(entry: LeaderboardEntry): string[] {
  const badges: string[] = [];
  const temp = entry.temp_compliance_pct ?? 0;
  const checklist = entry.checklist_completion_pct ?? 0;
  const streak = entry.streak_days;

  if (temp >= 98 && checklist >= 98) badges.push('🏆');
  if (streak >= 30) badges.push('🔥');
  if (temp >= 95) badges.push('⚡');
  if (checklist >= 95) badges.push('🎯');
  if (streak >= 14) badges.push('💪');
  return badges;
}

function getLevel(xp: number): number {
  return Math.floor(xp / 40) + 1;
}

function RankChange({ change }: { change: number }) {
  if (change > 0) return <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}><TrendingUp size={14} /> +{change}</span>;
  if (change < 0) return <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}><TrendingDown size={14} /> {change}</span>;
  return <span style={{ color: '#6b7280', fontSize: 12, display: 'flex', alignItems: 'center', gap: 2 }}><Minus size={14} /> -</span>;
}

function XPBar({ xp, level }: { xp: number; level: number }) {
  const xpInLevel = xp % 40;
  const pct = Math.round((xpInLevel / 40) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#A08C5A', minWidth: 38 }}>Lv.{level}</span>
      <div style={{ flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #A08C5A, #d4af37)', borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
      <span style={{ fontSize: 10, color: '#6b7280', minWidth: 30, textAlign: 'right' }}>{xp} XP</span>
    </div>
  );
}

export function Leaderboard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [industryFilter, setIndustryFilter] = useState('All');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('v_location_leaderboard')
      .select('*')
      .order('temp_compliance_pct', { ascending: false, nullsFirst: false });

    if (data && data.length > 0) {
      setEntries(data);
    } else {
      setEntries([]);
    }
    setLoading(false);
  };

  const filtered = industryFilter === 'All'
    ? entries
    : entries.filter(e => e.industry_type === industryFilter);

  const ranked = filtered.map((e, i) => ({
    ...e,
    rank: i + 1,
    change: 0, // rank change requires historical data — placeholder
    xp: calcXP(e.temp_compliance_pct ?? 0, e.checklist_completion_pct ?? 0, e.streak_days),
    badges: getBadges(e),
  }));

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  // Empty state
  if (!loading && entries.length === 0) {
    return (
      <>
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Leaderboard' }]} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{'🏆'}</div>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: '#1E2D4D', marginBottom: 8 }}>The Leaderboard is warming up.</h3>
          <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 440, lineHeight: 1.7, marginBottom: 28 }}>
            Be the first kitchen to compete. Opt in from your Settings page
            to claim your spot and compete for monthly rewards.
          </p>
          <button
            onClick={() => navigate('/settings')}
            style={{
              background: '#1E2D4D', color: 'white', padding: '14px 28px', borderRadius: 10,
              fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', marginBottom: 12,
            }}
          >
            Join the Leaderboard {'→'}
          </button>
          <a
            href="/leaderboard-preview"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#A08C5A', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            Preview what it looks like {'→'}
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Leaderboard' }]} />
      <div className="space-y-6">
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1E2D4D 0%, #2E4270 100%)',
          borderRadius: 16, padding: '28px 32px', color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Trophy size={28} style={{ color: '#d4af37' }} />
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>EvidLY Compliance Leaderboard</h2>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            Real kitchens competing on operational excellence. Rankings update daily.
          </p>
        </div>

        {/* Rewards Banner */}
        <div style={{
          background: 'white', borderRadius: 16, padding: '20px 28px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Star size={20} style={{ color: '#d4af37' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Monthly Rewards</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { icon: '🥇', title: '1st Place', desc: '1 free month + Champion plaque' },
              { icon: '🥈', title: '2nd Place', desc: '50% off + K2C 2x multiplier' },
              { icon: '🥉', title: '3rd Place', desc: '25% off + K2C 1.5x multiplier' },
              { icon: '🌟', title: 'Top 10', desc: 'Featured Passport badge' },
            ].map(r => (
              <div key={r.title} style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 24 }}>{r.icon}</div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 6 }}>{r.title}</h4>
                <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {INDUSTRIES.map(ind => (
            <button
              key={ind}
              onClick={() => setIndustryFilter(ind)}
              style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                backgroundColor: industryFilter === ind ? '#1E2D4D' : '#e5e7eb',
                color: industryFilter === ind ? 'white' : '#374151',
              }}
            >
              {INDUSTRY_LABELS[ind] || ind}
            </button>
          ))}
        </div>

        {/* Podium — Top 3 */}
        {top3.length >= 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
            {[top3[1], top3[0], top3[2]].map((loc, idx) => {
              const isFirst = idx === 1;
              const medalEmoji = idx === 0 ? '🥈' : idx === 1 ? '🥇' : '🥉';
              const height = isFirst ? 200 : idx === 0 ? 170 : 150;
              return (
                <div key={loc.id} style={{
                  background: 'white', borderRadius: 16, padding: '24px 16px', textAlign: 'center',
                  boxShadow: isFirst ? '0 8px 32px rgba(30,77,107,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                  border: isFirst ? '2px solid #d4af37' : '1px solid #e5e7eb',
                  minHeight: height,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                  transform: isFirst ? 'scale(1.05)' : 'scale(1)',
                }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{medalEmoji}</div>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#1E2D4D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                    {loc.name.charAt(0)}
                  </div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{loc.name}</h4>
                  <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{loc.organization_name}</p>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#A08C5A' }}>
                    {loc.xp} XP
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center' }}>
                    {loc.badges.slice(0, 4).map((b, i) => (
                      <span key={i} style={{ fontSize: 16 }}>{b}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rankings Table */}
        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Full Rankings</h3>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{ranked.length} opted-in locations</span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>Loading leaderboard...</div>
          ) : ranked.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Trophy size={40} style={{ color: '#9ca3af', margin: '0 auto 12px' }} />
              <p style={{ color: '#6b7280' }}>No locations match this filter</p>
            </div>
          ) : (
            ranked.map((loc, i) => {
              const temp = loc.temp_compliance_pct ?? 0;
              const checklist = loc.checklist_completion_pct ?? 0;
              const level = getLevel(loc.xp);
              return (
                <div
                  key={loc.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '50px 50px 1fr 90px 90px 70px 70px 90px',
                    padding: '14px 24px', alignItems: 'center',
                    borderBottom: i < ranked.length - 1 ? '1px solid #f3f4f6' : 'none',
                    transition: 'background 0.15s, transform 0.15s',
                    cursor: 'default',
                    animation: `fadeUp 0.4s ease ${i * 0.06}s both`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span style={{ fontSize: 16, fontWeight: 800, color: loc.rank <= 3 ? '#A08C5A' : '#374151' }}>#{loc.rank}</span>
                  <RankChange change={loc.change} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#1E2D4D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                      {loc.name.charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{loc.organization_name} {'·'} {loc.city}</div>
                      <XPBar xp={loc.xp} level={level} />
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: temp >= 95 ? '#22c55e' : temp >= 85 ? '#f59e0b' : '#ef4444' }}>{temp > 0 ? `${temp}%` : '--'}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: checklist >= 95 ? '#22c55e' : checklist >= 85 ? '#f59e0b' : '#ef4444' }}>{checklist > 0 ? `${checklist}%` : '--'}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Flame size={14} style={{ color: loc.streak_days >= 20 ? '#ef4444' : '#f59e0b' }} />
                    {loc.streak_days}d
                  </span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {loc.badges.slice(0, 3).map((b, bi) => <span key={bi} style={{ fontSize: 14 }}>{b}</span>)}
                    {loc.badges.length > 3 && <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>+{loc.badges.length - 3}</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#A08C5A' }}>{loc.xp}</span>
                    <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 2 }}>XP</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Achievement Badges */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Achievement Badges</h3>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            Earn badges by maintaining excellent compliance
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Flame className="h-7 w-7" style={{ color: '#d4af37' }} />, title: 'Perfect Week', desc: '100% compliance for 7 consecutive days', earned: true },
              { icon: <Target className="h-7 w-7" style={{ color: '#d4af37' }} />, title: '100% Temp Logs', desc: 'All temperature logs current for 30 days', earned: true },
              { icon: <Zap className="h-7 w-7" style={{ color: '#9ca3af' }} />, title: 'Zero Overdue Docs', desc: 'All vendor documents current and valid', earned: false },
              { icon: <Star className="h-7 w-7" style={{ color: '#9ca3af' }} />, title: 'Gold Standard', desc: 'Top ranking maintained for 90 days', earned: false },
            ].map(badge => (
              <div key={badge.title} style={{
                background: badge.earned ? 'linear-gradient(135deg, #f0f7fc 0%, #e1eef6 100%)' : '#f9fafb',
                border: badge.earned ? '2px solid #1e4d6b' : '2px solid #e5e7eb',
                borderRadius: 12, padding: 24, textAlign: 'center',
                opacity: badge.earned ? 1 : 0.6,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: badge.earned ? '#1e4d6b' : '#d1d5db',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                }}>
                  {badge.icon}
                </div>
                <h4 style={{ fontWeight: 700, color: badge.earned ? '#111827' : '#6b7280', marginBottom: 4 }}>{badge.title}</h4>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{badge.desc}</p>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
                  color: badge.earned ? '#1e4d6b' : '#6b7280',
                  backgroundColor: badge.earned ? '#dbeafe' : '#e5e7eb',
                }}>
                  {badge.earned ? 'EARNED' : 'LOCKED'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* How XP Works */}
        <div style={{ background: 'white', borderRadius: 16, padding: '20px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Shield size={18} style={{ color: '#1E2D4D' }} />
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>How XP Works</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Temperature Compliance', weight: '40%', desc: '% of on-time, in-range temp logs (30d)' },
              { label: 'Checklist Completion', weight: '40%', desc: '% of checklists completed (30d)' },
              { label: 'Consistency Streak', weight: '20%', desc: 'Consecutive days with logged actions' },
            ].map(item => (
              <div key={item.label} style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{item.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#A08C5A' }}>{item.weight}</span>
                </div>
                <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12, fontStyle: 'italic' }}>
            XP is an engagement metric only and does not represent official compliance standing.
          </p>
        </div>

        {/* Jurisdiction Disclaimer */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Shield size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 11, color: '#78350f', lineHeight: 1.6 }}>
            <strong>Jurisdiction Disclaimer:</strong> Leaderboard rankings reflect self-reported operational data tracked within EvidLY.
            Inspection results are shown as reported by the relevant health authority and are never generated or modified by EvidLY.
            Rankings do not constitute an official compliance rating.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
