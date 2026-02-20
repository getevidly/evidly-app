/**
 * Referral Dashboard — All 5 creative referral mechanics in one view
 * Task #59
 */
import { useState } from 'react';
import {
  Gift, Trophy, Heart, Truck, Share2, Copy, CheckCircle,
  ExternalLink, Star, Award, TrendingUp, Users, ArrowRight, Sparkles,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { useTranslation } from '../contexts/LanguageContext';
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

const TAB_KEYS: Record<Tab, string> = {
  overview: 'referral.tabOverview',
  badges: 'referral.tabBadges',
  network: 'referral.tabNetwork',
  k2c: 'referral.tabK2C',
  stories: 'referral.tabStories',
  vendor: 'referral.tabVendorRipple',
};

const TAB_ICONS: Record<Tab, typeof Gift> = {
  overview: Gift,
  badges: Award,
  network: Users,
  k2c: Heart,
  stories: Star,
  vendor: Truck,
};

const TAB_IDS: Tab[] = ['overview', 'badges', 'network', 'k2c', 'stories', 'vendor'];

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

function BadgeCard({ badge, t }: { badge: ComplianceBadge; t: (key: string) => string }) {
  const config = BADGE_CONFIG[badge.badgeType];
  const levelColors = BADGE_LEVEL_COLORS[badge.badgeLevel];
  const url = getVerifyUrl(badge.referralCode);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => toast.success(t('referral.linkCopied')));
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
        <span>{badge.shareCount} {t('referral.shares')}</span>
        <span>{badge.clickCount} {t('referral.clicks')}</span>
        <span>{badge.conversionCount} {t('referral.signups')}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer"
          style={{ backgroundColor: '#1e4d6b' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
        >
          <Share2 className="h-3 w-3" /> {t('referral.share')}
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <Copy className="h-3 w-3" /> {t('referral.copy')}
        </button>
      </div>
    </div>
  );
}

export function ReferralDashboard() {
  const { isDemoMode } = useDemo();
  const { t } = useTranslation();
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
      toast.success(`${t('referral.referralLinkCopied')} Code: ${code}`)
    );
  };

  return (
    <>
      <Breadcrumb items={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('referral.referralProgram') }]} />
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-8 w-8 text-[#d4af37]" />
            <h2 className="text-2xl font-bold">{t('referral.referralProgram')}</h2>
          </div>
          <p className="text-gray-300 mb-4">{t('referral.headerSubtitle')}</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleGenerateCode('champion_badge')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              style={{ backgroundColor: '#d4af37', color: '#1e4d6b' }}
            >
              <Share2 className="h-4 w-4" /> {t('referral.shareYourBadge')}
            </button>
            <button
              onClick={() => handleGenerateCode('k2c_amplifier')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <Heart className="h-4 w-4" /> {t('referral.k2cReferDonate')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TAB_IDS.map(tabId => {
            const TabIcon = TAB_ICONS[tabId];
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === tabId
                    ? 'bg-[#1e4d6b] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {t(TAB_KEYS[tabId])}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label={t('referral.totalReferrals')} value={stats.totalReferrals} icon={Share2} color="#1e4d6b" sub={`${stats.converted} ${t('referral.converted')}`} />
              <StatCard label={t('referral.rewardsEarned')} value={`$${stats.totalRewardsEarned}`} icon={Gift} color="#d4af37" sub={`${stats.monthsFreeEarned} ${t('referral.monthFree')}`} />
              <StatCard label={t('referral.k2cDonated')} value={`$${stats.k2cTotalDonated}`} icon={Heart} color="#ef4444" sub={`3 ${t('referral.charities')}`} />
              <StatCard label={t('referral.networkRank')} value={`#${stats.networkRank}`} icon={Trophy} color="#22c55e" sub={`${stats.referralPoints} ${t('referral.pts')}`} />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('referral.recentReferralActivity')}</h3>
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
                    champion_badge: t('referral.badgeShare'),
                    network_leaderboard: t('referral.network'),
                    inspection_hero: t('referral.heroStory'),
                    k2c_amplifier: t('referral.tabK2C'),
                    vendor_ripple: t('referral.vendor'),
                  };
                  const statusLabels: Record<string, string> = {
                    converted: t('referral.converted'),
                    signed_up: t('referral.signedUp'),
                    clicked: t('referral.clicked'),
                    pending: t('referral.pending'),
                    expired: t('referral.expired'),
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
                          {statusLabels[ref.status] ?? ref.status.replace('_', ' ')}
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
                title={t('referral.complianceChampion')}
                description={t('referral.complianceChampionDesc')}
                stat={`${badges.length} ${t('referral.badgesEarned')}`}
                color="#d4af37"
                onClick={() => setActiveTab('badges')}
              />
              <MechanicCard
                icon={Users}
                title={t('referral.networkLeaderboard')}
                description={t('referral.networkLeaderboardDesc')}
                stat={`${t('referral.rank')} #${stats.networkRank}`}
                color="#1e4d6b"
                onClick={() => setActiveTab('network')}
              />
              <MechanicCard
                icon={Star}
                title={t('referral.inspectionHero')}
                description={t('referral.inspectionHeroDesc')}
                stat={`${heroStories.length} ${t('referral.storiesShared')}`}
                color="#7c3aed"
                onClick={() => setActiveTab('stories')}
              />
              <MechanicCard
                icon={Heart}
                title={t('referral.k2cAmplifier')}
                description={t('referral.k2cAmplifierDesc')}
                stat={`$${stats.k2cTotalDonated} ${t('referral.donated')}`}
                color="#ef4444"
                onClick={() => setActiveTab('k2c')}
              />
              <MechanicCard
                icon={Truck}
                title={t('referral.vendorRipple')}
                description={t('referral.vendorRippleDesc')}
                stat={`${vendorRipples.length} ${t('referral.ripples')}`}
                color="#0891b2"
                onClick={() => setActiveTab('vendor')}
              />
              <div className="bg-gradient-to-br from-[#eef4f8] to-white rounded-xl border border-[#b8d4e8] p-5 flex flex-col items-center justify-center text-center">
                <Sparkles className="h-8 w-8 mb-2" style={{ color: '#d4af37' }} />
                <p className="text-sm font-medium text-gray-700 mb-1">{t('referral.yourReferralLink')}</p>
                <button
                  onClick={() => handleGenerateCode('champion_badge')}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  style={{ backgroundColor: '#1e4d6b', color: 'white' }}
                >
                  {t('referral.generateAndCopy')}
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
                <h3 className="text-lg font-semibold text-gray-900">{t('referral.yourComplianceBadges')}</h3>
                <span className="text-sm text-gray-400">{badges.length} {t('referral.earned')}</span>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                {t('referral.badgesShareDescription')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map(badge => (
                  <BadgeCard key={badge.id} badge={badge} t={t} />
                ))}
              </div>
            </div>

            {/* Badge levels info */}
            <div className="bg-[#eef4f8] rounded-xl border border-[#b8d4e8] p-5">
              <h4 className="font-semibold mb-3" style={{ color: '#1e4d6b' }}>{t('referral.badgeLevels')}</h4>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('referral.complianceNetworkLeaderboard')}</h3>
              <p className="text-sm text-gray-500">{t('referral.networkLeaderboardSubtitle')}</p>
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
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#1e4d6b', color: 'white' }}>{t('referral.you')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>{org.complianceScore >= 90 ? t('referral.compliant') : org.complianceScore >= 75 ? t('referral.satisfactory') : t('referral.actionRequired')}</span>
                          <span>{org.badgesEarned} {t('referral.badges')}</span>
                          <span>{org.successfulReferrals}/{org.totalReferrals} {t('referral.referrals')}</span>
                          {org.k2cDonations > 0 && <span>${org.k2cDonations} K2C</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: '#d4af37' }}>{org.referralPoints.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">{t('referral.points')}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Points breakdown */}
            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('referral.howPointsWork')}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-green-500" /> {t('referral.referralConverted')}</div>
                <div className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-blue-500" /> {t('referral.referralSignedUp')}</div>
                <div className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-amber-500" /> {t('referral.referralClicked')}</div>
                <div className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-purple-500" /> {t('referral.badgeEarnedPoints')}</div>
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
                  <h3 className="text-lg font-bold text-gray-900">{t('referral.kitchenToCommunity')} (K2C)</h3>
                  <p className="text-sm text-gray-600">{t('referral.k2cSubtitle')}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">${stats.k2cTotalDonated}</div>
                  <div className="text-xs text-gray-500">{t('referral.totalDonated')}</div>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{k2cDonations.length}</div>
                  <div className="text-xs text-gray-500">{t('referral.donations')}</div>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">3</div>
                  <div className="text-xs text-gray-500">{t('referral.charitiesHelped')}</div>
                </div>
              </div>
            </div>

            {/* Donation History */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h4 className="font-semibold text-gray-900 mb-4">{t('referral.donationHistory')}</h4>
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
              <p className="text-gray-600 mb-4">{t('referral.k2cShareCta')}</p>
              <button
                onClick={() => handleGenerateCode('k2c_amplifier')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-colors cursor-pointer"
                style={{ backgroundColor: '#ef4444' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#dc2626')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ef4444')}
              >
                <Heart className="h-4 w-4" /> {t('referral.generateK2CLink')}
              </button>
            </div>
          </>
        )}

        {/* ── STORIES TAB ──────────────────────────── */}
        {activeTab === 'stories' && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('referral.inspectionHeroStories')}</h3>
              <p className="text-sm text-gray-500 mb-6">{t('referral.storiesSubtitle')}</p>
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
                          <span>{t('referral.score')}: {story.score}</span>
                          <span>{new Date(story.inspectionDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-3xl font-bold" style={{ color: '#22c55e' }}>{story.score}</div>
                    </div>
                    <blockquote className="text-sm text-gray-700 italic border-l-3 border-purple-300 pl-3 mb-4" style={{ borderLeftWidth: '3px' }}>
                      "{story.quote}"
                    </blockquote>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{story.shareCount} {t('referral.shares')}</span>
                      <button
                        onClick={() => {
                          const url = getVerifyUrl(story.referralCode);
                          navigator.clipboard.writeText(url);
                          toast.success(t('referral.storyLinkCopied'));
                        }}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        style={{ backgroundColor: '#7c3aed', color: 'white' }}
                      >
                        <Share2 className="h-3 w-3" /> {t('referral.shareStory')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create new story CTA */}
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <Star className="h-10 w-10 mx-auto mb-3 text-yellow-400" />
              <h4 className="font-semibold text-gray-900 mb-1">{t('referral.passedRecentInspection')}</h4>
              <p className="text-sm text-gray-500 mb-4">{t('referral.createStoryDesc')}</p>
              <button
                onClick={() => {
                  toast.success(t('referral.storyCreationNotice'));
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-colors cursor-pointer"
                style={{ backgroundColor: '#7c3aed' }}
              >
                <Sparkles className="h-4 w-4" /> {t('referral.createYourStory')}
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
                  <h3 className="text-lg font-semibold text-gray-900">{t('referral.vendorRipple')}</h3>
                  <p className="text-sm text-gray-500">{t('referral.vendorRippleSubtitle')}</p>
                </div>
              </div>

              <div className="space-y-3">
                {vendorRipples.map(ripple => {
                  const statusConfig: Record<string, { color: string; label: string }> = {
                    pending: { color: '#f59e0b', label: t('referral.vendorStatusPending') },
                    connected: { color: '#3b82f6', label: t('referral.vendorStatusConnected') },
                    onboarded: { color: '#22c55e', label: t('referral.vendorStatusOnboarded') },
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
                            {ripple.referredOrgName ? `${t('referral.referred')}: ${ripple.referredOrgName}` : t('referral.referralLinkShared')}
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
              <h4 className="font-semibold mb-3" style={{ color: '#1e4d6b' }}>{t('referral.howVendorRippleWorks')}</h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold" style={{ color: '#1e4d6b' }}>1</span>
                  <span>{t('referral.vendorStep1')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold" style={{ color: '#1e4d6b' }}>2</span>
                  <span>{t('referral.vendorStep2')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold" style={{ color: '#1e4d6b' }}>3</span>
                  <span>{t('referral.vendorStep3')}</span>
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
