import { useState } from 'react';
import { Trophy, Flame, Star, TrendingUp, TrendingDown, Minus, Shield, ChevronDown } from 'lucide-react';

// Hardcoded demo data — zero Supabase calls on this page
const PREVIEW_LOCATIONS = [
  { rank: 1, change: 2,  name: "Main Kitchen",       org: "Pacific Catering Co.",  city: "Fresno",      industry: "Catering",    avatar: "\ud83c\udf7d\ufe0f", level: 24, xp: 820, xpMax: 1000, streak: 42, badges: ["\ud83c\udfc6","\ud83d\udd25","\u26a1","\ud83c\udfaf","\ud83d\udc8e"], fire: "Current",  temp: 98.4, checklist: 97.2, achievements: 12 },
  { rank: 2, change: 0,  name: "Downtown Location",   org: "Aria Hotel",            city: "Los Angeles", industry: "Hospitality", avatar: "\ud83c\udfe8", level: 21, xp: 640, xpMax: 900,  streak: 31, badges: ["\ud83e\udd48","\u26a1","\ud83c\udfaf","\ud83d\udcaa"],     fire: "Current",  temp: 96.1, checklist: 94.8, achievements: 9  },
  { rank: 3, change: -1, name: "Central Campus",      org: "Valley USD",            city: "Merced",      industry: "Education",   avatar: "\ud83c\udf93", level: 19, xp: 510, xpMax: 800,  streak: 28, badges: ["\ud83c\udfaf","\ud83d\udcda","\ud83d\udcaa"],           fire: "Current",  temp: 94.3, checklist: 91.5, achievements: 8  },
  { rank: 4, change: 1,  name: "Patient Services",    org: "Summit Hospital",       city: "Stockton",    industry: "Healthcare",  avatar: "\ud83c\udfe5", level: 17, xp: 380, xpMax: 700,  streak: 19, badges: ["\ud83d\udc89","\ud83d\udcaa"],                fire: "Current",  temp: 92.7, checklist: 88.4, achievements: 6  },
  { rank: 5, change: -1, name: "Lodge Kitchen",       org: "Yosemite Lodge",        city: "Mariposa",    industry: "Hospitality", avatar: "\ud83c\udf32", level: 15, xp: 290, xpMax: 600,  streak: 14, badges: ["\ud83c\udf32"],                     fire: "Due Soon", temp: 88.2, checklist: 85.1, achievements: 5  },
  { rank: 6, change: 3,  name: "Civic Center Caf\u00e9",   org: "Fresno Civic Center",   city: "Fresno",      industry: "Institutional",       avatar: "\ud83c\udfdb\ufe0f", level: 12, xp: 210, xpMax: 500,  streak: 9,  badges: ["\ud83d\udcc8"],                     fire: "Current",  temp: 85.9, checklist: 82.7, achievements: 3  },
  { rank: 7, change: 0,  name: "Senior Dining",       org: "Merced Senior Living",  city: "Merced",      industry: "Institutional",       avatar: "\ud83e\udd0d", level: 11, xp: 170, xpMax: 500,  streak: 7,  badges: ["\u2764\ufe0f"],                     fire: "Current",  temp: 84.1, checklist: 80.3, achievements: 3  },
  { rank: 8, change: -2, name: "Stockton Kitchen",    org: "Stockton Marriott",     city: "Stockton",    industry: "Hospitality", avatar: "\ud83c\udf74", level: 9,  xp: 110, xpMax: 400,  streak: 4,  badges: [],                         fire: "Due Soon", temp: 81.4, checklist: 78.9, achievements: 1  },
];

const INDUSTRIES = ['All', 'Catering', 'Hospitality', 'Education', 'Healthcare', 'Institutional'];

const calcXP = (temp: number, checklist: number, streak: number) =>
  Math.round((temp * 0.4) + (checklist * 0.4) + (streak * 0.2));

function RankChange({ change }: { change: number }) {
  if (change > 0) return <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}><TrendingUp size={14} /> +{change}</span>;
  if (change < 0) return <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}><TrendingDown size={14} /> {change}</span>;
  return <span style={{ color: '#6b7280', fontSize: 12, display: 'flex', alignItems: 'center', gap: 2 }}><Minus size={14} /> -</span>;
}

function XPBar({ xp, xpMax, level }: { xp: number; xpMax: number; level: number }) {
  const pct = Math.round((xp / xpMax) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#A08C5A', minWidth: 38 }}>Lv.{level}</span>
      <div style={{ flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #A08C5A, #d4af37)', borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
      <span style={{ fontSize: 10, color: '#6b7280', minWidth: 50, textAlign: 'right' }}>{xp}/{xpMax} XP</span>
    </div>
  );
}

export function LeaderboardPreview() {
  const [industryFilter, setIndustryFilter] = useState('All');

  const filtered = industryFilter === 'All'
    ? PREVIEW_LOCATIONS
    : PREVIEW_LOCATIONS.filter(l => l.industry === industryFilter);

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4F6FA' }}>
      {/* Sticky CTA Banner */}
      <div style={{
        background: 'linear-gradient(90deg, #1E2D4D, #2E4270)',
        color: 'white', padding: '12px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '3px solid #A08C5A',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{'\ud83d\udc46'} This is a live preview of the EvidLY Compliance Leaderboard</span>
          <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 12 }}>Your kitchen could be ranked here. Opt in from your Settings page.</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="/signup" style={{ background: '#A08C5A', color: 'white', padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
            Start Free Trial {'\u2192'}
          </a>
          <a href="/login" style={{ background: 'transparent', color: 'white', padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 12, border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none' }}>
            Log In
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>{'\ud83c\udfc6'}</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E2D4D', margin: '12px 0 8px' }}>
            EvidLY Compliance Leaderboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 520, margin: '0 auto' }}>
            Real kitchens. Real compliance data. Compete for monthly rewards and the Compliance Champion plaque.
          </p>
        </div>

        {/* Rewards Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1E2D4D 0%, #2E4270 100%)',
          borderRadius: 16, padding: '24px 32px', marginBottom: 28,
          border: '2px solid #A08C5A', color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Star size={24} style={{ color: '#d4af37' }} />
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Monthly Rewards Program</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { icon: '\ud83e\udd47', title: '1st Place', desc: '1 free month of EvidLY + Compliance Champion plaque' },
              { icon: '\ud83e\udd48', title: '2nd Place', desc: '50% off next month + K2C 2x meal multiplier' },
              { icon: '\ud83e\udd49', title: '3rd Place', desc: '25% off next month + K2C 1.5x meal multiplier' },
              { icon: '\ud83c\udf1f', title: 'Top 10', desc: 'Featured badge on your Compliance Passport' },
            ].map(r => (
              <div key={r.title} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28 }}>{r.icon}</div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>{r.title}</h4>
                <p style={{ fontSize: 11, opacity: 0.7, marginTop: 4, lineHeight: 1.5 }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
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
              {ind}
            </button>
          ))}
        </div>

        {/* Podium — Top 3 */}
        {top3.length >= 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28, alignItems: 'end' }}>
            {[top3[1], top3[0], top3[2]].map((loc, idx) => {
              const isFirst = idx === 1;
              const medalEmoji = idx === 0 ? '\ud83e\udd48' : idx === 1 ? '\ud83e\udd47' : '\ud83e\udd49';
              const height = isFirst ? 200 : idx === 0 ? 170 : 150;
              return (
                <div key={loc.rank} style={{
                  background: 'white', borderRadius: 16, padding: '24px 16px', textAlign: 'center',
                  boxShadow: isFirst ? '0 8px 32px rgba(30,77,107,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                  border: isFirst ? '2px solid #d4af37' : '1px solid #e5e7eb',
                  minHeight: height,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                  transform: isFirst ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{medalEmoji}</div>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{loc.avatar}</div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{loc.name}</h4>
                  <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{loc.org}</p>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#A08C5A' }}>
                    {calcXP(loc.temp, loc.checklist, loc.streak)} XP
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
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
        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Full Rankings</h3>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{filtered.length} locations</span>
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '50px 50px 1fr 100px 100px 80px 80px 100px', padding: '10px 24px', borderBottom: '1px solid #f3f4f6', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
            <span>Rank</span>
            <span>{'\u0394'}</span>
            <span>Location</span>
            <span>Temp %</span>
            <span>Checklist %</span>
            <span>Streak</span>
            <span>Badges</span>
            <span style={{ textAlign: 'right' }}>XP</span>
          </div>

          {filtered.map((loc, i) => (
            <div
              key={loc.rank}
              style={{
                display: 'grid', gridTemplateColumns: '50px 50px 1fr 100px 100px 80px 80px 100px',
                padding: '14px 24px', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
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
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#1E2D4D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {loc.avatar}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{loc.org} {'\u00b7'} {loc.city}</div>
                  <XPBar xp={loc.xp} xpMax={loc.xpMax} level={loc.level} />
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: loc.temp >= 95 ? '#22c55e' : loc.temp >= 85 ? '#f59e0b' : '#ef4444' }}>{loc.temp}%</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: loc.checklist >= 95 ? '#22c55e' : loc.checklist >= 85 ? '#f59e0b' : '#ef4444' }}>{loc.checklist}%</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Flame size={14} style={{ color: loc.streak >= 20 ? '#ef4444' : '#f59e0b' }} />
                {loc.streak}d
              </span>
              <div style={{ display: 'flex', gap: 2 }}>
                {loc.badges.slice(0, 3).map((b, i) => <span key={i} style={{ fontSize: 14 }}>{b}</span>)}
                {loc.badges.length > 3 && <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>+{loc.badges.length - 3}</span>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#A08C5A' }}>{calcXP(loc.temp, loc.checklist, loc.streak)}</span>
                <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 2 }}>XP</span>
              </div>
            </div>
          ))}
        </div>

        {/* How XP Works */}
        <div style={{ background: 'white', borderRadius: 16, padding: '24px 32px', marginBottom: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Shield size={20} style={{ color: '#1E2D4D' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>How XP Works</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'Temperature Compliance', weight: '40%', desc: '% of on-time, in-range temp logs over 30 days' },
              { label: 'Checklist Completion', weight: '40%', desc: '% of daily checklists completed over 30 days' },
              { label: 'Consistency Streak', weight: '20%', desc: 'Consecutive days with at least one logged action' },
            ].map(item => (
              <div key={item.label} style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#A08C5A' }}>{item.weight}</span>
                </div>
                <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 16, fontStyle: 'italic' }}>
            XP = (Temp% {'\u00d7'} 0.4) + (Checklist% {'\u00d7'} 0.4) + (Streak {'\u00d7'} 0.2). XP is an engagement metric only and does not represent official compliance standing.
          </p>
        </div>

        {/* Jurisdiction Disclaimer */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 20px', marginBottom: 40, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Shield size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Jurisdiction Disclaimer</p>
            <p style={{ fontSize: 11, color: '#78350f', lineHeight: 1.6 }}>
              Leaderboard rankings reflect self-reported operational data (temperature logs, checklist completions, streaks) tracked within EvidLY.
              Inspection results are shown exactly as reported by the relevant health authority and are never generated, modified, or inferred by EvidLY.
              Rankings do not constitute an official compliance rating and should not be used as a substitute for regulatory inspection results.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ background: '#1E2D4D', padding: '60px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 36 }}>{'\ud83c\udfc6'}</div>
        <h2 style={{ color: 'white', fontSize: 28, fontWeight: 900, margin: '16px 0 8px' }}>
          Is your kitchen ready to compete?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
          Join EvidLY, opt into the leaderboard from your settings,
          and start earning XP, achievements, and real rewards for
          running a compliant kitchen.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/signup" style={{ background: '#A08C5A', color: 'white', padding: '14px 32px', borderRadius: 10, fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
            Start Free {'\u2014'} Founder Pricing {'\u2192'}
          </a>
          <a href="https://getevidly.com" style={{ background: 'transparent', color: 'white', padding: '14px 32px', borderRadius: 10, fontWeight: 600, fontSize: 14, border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none' }}>
            Learn More
          </a>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 20 }}>
          No credit card required {'\u00b7'} Founder pricing available through May 5, 2026
        </p>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
