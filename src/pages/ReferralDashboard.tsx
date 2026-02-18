/**
 * Referral Dashboard — All 5 creative referral mechanics in one view
 * Task #59
 */
import { useState } from 'react';
import {
  Gift, Trophy, Shield, Heart, Truck, Share2, Copy, CheckCircle,
  ExternalLink, Star, Award, TrendingUp, Users, ArrowRight, Sparkles,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { toast } from 'sonner';
import {
  demoReferrals,
  demoBadges,
  demoNetworkScores,
  demoK2CDonations,
  demoVendorRipples,
  demoHeroStories,
  demoReferralStats,
} from '../data/referralDemoData';
import {
  BADGE_CONFIG,
  BADGE_LEVEL_COLORS,
  getVerifyUrl,
  generateReferralCode,
  type ReferralMechanic,
  type ComplianceBadge,
} from '../lib/referralSystem';

type Tab = 'overview' | 'badges' | 'network' | 'k2c' | 'stories' | 'vendor';

const TABS: { id: Tab; label: string; icon: typeof Gift }[] = [
  { id: 'overview', label: 'Overview', icon: Gift },
  { id: 'badges', label: 'Badges', icon: Award },
  { id: 'network', label: 'Network', icon: Users },
  { id: 'k2c', label: 'K2C', icon: Heart },
  { id: 'stories', label: 'Stories', icon: Star },
  { id: 'vendor', label: 'Vendor Ripple', icon: Truck },
];

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: typeof Gift; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function BadgeCard({ badge }: { badge: ComplianceBadge }) {
  const config = BADGE_CONFIG[badge.badgeType];
  const levelColors = BADGE_LEVEL_COLORS[badge.badgeLevel];
  const url = getVerifyUrl(badge.referralCode);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `${config.label} Badge`, text: config.description, url });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 p-5" style={{ borderColor: levelColors.border }}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl">{config.icon}</div>
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ backgroundColor: levelColors.bg, color: levelColors.text }}>
          {badge.badgeLevel}
        </span>
      </div>
      <h4 className="font-bold text-gray-900 mb-1">{config.label}</h4>
      <p className="text-xs text-gray-500 mb-1">{badge.locationName}</p>
      <p className="text-xs text-gray-400 mb-3">{config.description}</p>

      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
        <span>{badge.shareCount} shares</span>
        <span>{badge.clickCount} clicks</span>
        <span>{badge.conversionCount} signups</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer"
          style={{ backgroundColor: '#1e4d6b' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
        >
          <Share2 className="h-3 w-3" /> Share
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
    </div>
  );
}

export function ReferralDashboard() {
  const { isDemoMode } = useDemo();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const stats = demoReferralStats;
  const referrals = demoReferrals;
  const badges = demoBadges;
  const network = demoNetworkScores;
  const k2cDonations = demoK2CDonations;
  const vendorRipples = demoVendorRipples;
  const heroStories = demoHeroStories;

  const handleGenerateCode = (mechanic: ReferralMechanic) => {
    const code = generateReferralCode('arthur', mechanic);
    const url = getVerifyUrl(code);
    navigator.clipboard.writeText(url).then(() =>
      toast.success(`Referral link copied! Code: ${code}`)
    );
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Referral Program' }]} />
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-8 w-8 text-[#d4af37]" />
            <h2 className="text-2xl font-bold">Referral Program</h2>
          </div>
          <p className="text-gray-300 mb-4">Grow the compliance network. Earn rewards. Give back to your community.</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleGenerateCode('champion_badge')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              style={{ backgroundColor: '#d4af37', color: '#1e4d6b' }}
            >
              <Share2 className="h-4 w-4" /> Share Your Badge
            </button>
            <button
              onClick={() => handleGenerateCode('k2c_amplifier')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <Heart className="h-4 w-4" /> K2C Refer &amp; Donate
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#1e4d6b] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Referrals" value={stats.totalReferrals} icon={Share2} color="#1e4d6b" sub={`${stats.converted} converted`} />
              <StatCard label="Rewards Earned" value={`$${stats.totalRewardsEarned}`} icon={Gift} color="#d4af37" sub={`${stats.monthsFreeEarned} month free`} />
              <StatCard label="K2C Donated" value={`$${stats.k2cTotalDonated}`} icon={Heart} color="#ef4444" sub="3 charities" />
              <StatCard label="Network Rank" value={`#${stats.networkRank}`} icon={Trophy} color="#22c55e" sub={`${stats.referralPoints} pts`} />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Referral Activity</h3>
              <div className="space-y-3">
                {referrals.slice(0, 5).map(ref => {
                  const statusColors: Record<string, string> = {
                    converted: '#22c55e',
                    signed_up: '#3b82f6',
                    clicked: '#f59e0b',
                    pending: '#9ca3af',
                    expired: '#ef4444',
                  };
                  const mechanicLabels: Record<string, string> = {
                    champion_badge: 'Badge Share',
                    network_leaderboard: 'Network',
                    inspection_hero: 'Hero Story',
                    k2c_amplifier: 'K2C',
                    vendor_ripple: 'Vendor',
                  };
                  return (
                    <div key={ref.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[ref.status] }} />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{mechanicLabels[ref.mechanic]}</span>
                          {ref.referredEmail && (
                            <span className="text-xs text-gray-400 ml-2">{ref.referredEmail}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${statusColors[ref.status]}15`, color: statusColors[ref.status] }}>
                          {ref.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(ref.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5 Mechanics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MechanicCard
                icon={Award}
                title="Compliance Champion"
                description="Share your badge when you hit 90%+ compliance. Each signup earns you a free month."
                stat={`${badges.length} badges earned`}
                color="#d4af37"
                onClick={() => setActiveTab('badges')}
              />
              <MechanicCard
                icon={Users}
                title="Network Leaderboard"
                description="Compete across organizations. Referral bonuses boost your ranking."
                stat={`Rank #${stats.networkRank}`}
                color="#1e4d6b"
                onClick={() => setActiveTab('network')}
              />
              <MechanicCard
                icon={Star}
                title="Inspection Hero"
                description="Share your inspection success story. Inspire other kitchens to level up."
                stat={`${heroStories.length} stories shared`}
                color="#7c3aed"
                onClick={() => setActiveTab('stories')}
              />
              <MechanicCard
                icon={Heart}
                title="K2C Amplifier"
                description="Every referral triggers a donation to a food charity. Compliance that gives back."
                stat={`$${stats.k2cTotalDonated} donated`}
                color="#ef4444"
                onClick={() => setActiveTab('k2c')}
              />
              <MechanicCard
                icon={Truck}
                title="Vendor Ripple"
                description="Your vendors refer their other restaurant clients. Grow the network organically."
                stat={`${vendorRipples.length} ripples`}
                color="#0891b2"
                onClick={() => setActiveTab('vendor')}
              />
              <div className="bg-gradient-to-br from-[#eef4f8] to-white rounded-xl border border-[#b8d4e8] p-5 flex flex-col items-center justify-center text-center">
                <Sparkles className="h-8 w-8 mb-2" style={{ color: '#d4af37' }} />
                <p className="text-sm font-medium text-gray-700 mb-1">Your referral link</p>
                <button
                  onClick={() => handleGenerateCode('champion_badge')}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  style={{ backgroundColor: '#1e4d6b', color: 'white' }}
                >
                  Generate &amp; Copy
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── BADGES TAB ───────────────────────────── */}
        {activeTab === 'badges' && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Your Compliance Badges</h3>
                <span className="text-sm text-gray-400">{badges.length} earned</span>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Share your badges on social media or directly with peers. Every click is tracked — every signup earns you a free month of EvidLY.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map(badge => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </div>

            {/* Badge levels info */}
            <div className="bg-[#eef4f8] rounded-xl border border-[#b8d4e8] p-5">
              <h4 className="font-semibold mb-3" style={{ color: '#1e4d6b' }}>Badge Levels</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['bronze', 'silver', 'gold', 'platinum'] as const).map(level => {
                  const colors = BADGE_LEVEL_COLORS[level];
                  return (
                    <div key={level} className="flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: colors.border, backgroundColor: colors.bg }} />
                      <span className="font-medium capitalize" style={{ color: colors.text }}>{level}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── NETWORK TAB ──────────────────────────── */}
        {activeTab === 'network' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Compliance Network Leaderboard</h3>
              <p className="text-sm text-gray-500">Compete with other organizations. Referrals earn bonus points!</p>
            </div>
            <div>
              {network.map((org, index) => {
                const isTop3 = index < 3;
                const rankColors = ['#d4af37', '#9ca3af', '#92400e'];
                return (
                  <div
                    key={org.id}
                    className={`flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-0 ${org.isCurrentOrg ? 'bg-[#eef4f8]' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center">
                        {isTop3 ? (
                          <Trophy className="h-5 w-5 mx-auto" style={{ color: rankColors[index] }} />
                        ) : (
                          <span className="text-sm font-semibold text-gray-400">#{org.networkRank}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{org.displayName}</span>
                          {org.isCurrentOrg && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#1e4d6b', color: 'white' }}>YOU</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>{org.complianceScore}% compliance</span>
                          <span>{org.badgesEarned} badges</span>
                          <span>{org.successfulReferrals}/{org.totalReferrals} referrals</span>
                          {org.k2cDonations > 0 && <span>${org.k2cDonations} K2C</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: '#d4af37' }}>{org.referralPoints.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">points</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Points breakdown */}
            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">How Points Work</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-green-500" /> Referral converted: +500 pts</div>
                <div className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-blue-500" /> Referral signed up: +200 pts</div>
                <div className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-amber-500" /> Referral clicked: +50 pts</div>
                <div className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-purple-500" /> Badge earned: +100 pts</div>
              </div>
            </div>
          </div>
        )}

        {/* ── K2C TAB ──────────────────────────────── */}
        {activeTab === 'k2c' && (
          <>
            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Heart className="h-8 w-8 text-red-500" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Kitchen to Community (K2C)</h3>
                  <p className="text-sm text-gray-600">Every referral triggers a $25 donation to a food charity</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">${stats.k2cTotalDonated}</div>
                  <div className="text-xs text-gray-500">Total Donated</div>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{k2cDonations.length}</div>
                  <div className="text-xs text-gray-500">Donations</div>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">3</div>
                  <div className="text-xs text-gray-500">Charities Helped</div>
                </div>
              </div>
            </div>

            {/* Donation History */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Donation History</h4>
              <div className="space-y-3">
                {k2cDonations.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                        <Heart className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{d.charityName}</div>
                        {d.publicMessage && (
                          <div className="text-xs text-gray-400 italic mt-0.5">"{d.publicMessage}"</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">${d.amount}</div>
                      <div className="text-xs text-gray-400">{new Date(d.donatedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <p className="text-gray-600 mb-4">Share your K2C referral link and trigger another donation!</p>
              <button
                onClick={() => handleGenerateCode('k2c_amplifier')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-colors cursor-pointer"
                style={{ backgroundColor: '#ef4444' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#dc2626')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ef4444')}
              >
                <Heart className="h-4 w-4" /> Generate K2C Link
              </button>
            </div>
          </>
        )}

        {/* ── STORIES TAB ──────────────────────────── */}
        {activeTab === 'stories' && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Inspection Hero Stories</h3>
              <p className="text-sm text-gray-500 mb-6">Share your inspection success to inspire other kitchens — and earn referral credit.</p>
              <div className="space-y-4">
                {heroStories.map(story => (
                  <div key={story.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="h-5 w-5 text-yellow-500" />
                          <h4 className="font-bold text-gray-900">{story.headline}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{story.locationName}</span>
                          <span>Score: {story.score}</span>
                          <span>{new Date(story.inspectionDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-3xl font-bold" style={{ color: '#22c55e' }}>{story.score}</div>
                    </div>
                    <blockquote className="text-sm text-gray-700 italic border-l-3 border-purple-300 pl-3 mb-4" style={{ borderLeftWidth: '3px' }}>
                      "{story.quote}"
                    </blockquote>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{story.shareCount} shares</span>
                      <button
                        onClick={() => {
                          const url = getVerifyUrl(story.referralCode);
                          navigator.clipboard.writeText(url);
                          toast.success('Story link copied!');
                        }}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        style={{ backgroundColor: '#7c3aed', color: 'white' }}
                      >
                        <Share2 className="h-3 w-3" /> Share Story
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create new story CTA */}
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <Star className="h-10 w-10 mx-auto mb-3 text-yellow-400" />
              <h4 className="font-semibold text-gray-900 mb-1">Passed a recent inspection?</h4>
              <p className="text-sm text-gray-500 mb-4">Create an Inspection Hero story and share it with your network.</p>
              <button
                onClick={() => {
                  toast.success('Story creation will be available after your next inspection!');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-colors cursor-pointer"
                style={{ backgroundColor: '#7c3aed' }}
              >
                <Sparkles className="h-4 w-4" /> Create Your Story
              </button>
            </div>
          </>
        )}

        {/* ── VENDOR RIPPLE TAB ────────────────────── */}
        {activeTab === 'vendor' && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="h-6 w-6" style={{ color: '#0891b2' }} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Vendor Ripple</h3>
                  <p className="text-sm text-gray-500">Your vendors refer their other restaurant clients to EvidLY</p>
                </div>
              </div>

              <div className="space-y-3">
                {vendorRipples.map(ripple => {
                  const statusConfig: Record<string, { color: string; label: string }> = {
                    pending: { color: '#f59e0b', label: 'Pending' },
                    connected: { color: '#3b82f6', label: 'Connected' },
                    onboarded: { color: '#22c55e', label: 'Onboarded' },
                  };
                  const sc = statusConfig[ripple.status];
                  return (
                    <div key={ripple.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e0f2fe' }}>
                          <Truck className="h-5 w-5" style={{ color: '#0891b2' }} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{ripple.vendorName}</div>
                          <div className="text-xs text-gray-400">
                            {ripple.referredOrgName ? `Referred: ${ripple.referredOrgName}` : 'Referral link shared'}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${sc.color}15`, color: sc.color }}>
                        {sc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* How it works */}
            <div className="bg-[#eef4f8] rounded-xl border border-[#b8d4e8] p-5">
              <h4 className="font-semibold mb-3" style={{ color: '#1e4d6b' }}>How Vendor Ripple Works</h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold" style={{ color: '#1e4d6b' }}>1</span>
                  <span>Your vendor (e.g., ABC Fire Protection) serves multiple restaurants</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold" style={{ color: '#1e4d6b' }}>2</span>
                  <span>They share EvidLY with their other clients using a unique vendor link</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold" style={{ color: '#1e4d6b' }}>3</span>
                  <span>Both you and the vendor earn credits when a new restaurant signs up</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function MechanicCard({ icon: Icon, title, description, stat, color, onClick }: {
  icon: typeof Gift;
  title: string;
  description: string;
  stat: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm p-5 text-left hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5" style={{ color }} />
        <h4 className="font-semibold text-gray-900">{title}</h4>
      </div>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color }}>{stat}</span>
        <ArrowRight className="h-4 w-4 text-gray-300" />
      </div>
    </button>
  );
}
