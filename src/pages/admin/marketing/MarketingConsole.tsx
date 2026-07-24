/**
 * MarketingConsole — 17-tab marketing dashboard shell.
 *
 * Route wrappers (one per tab) live alongside this file and pass
 * defaultTab to deep-link each route to its tab.
 *
 * Access: salesOnly (SalesGuard)
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminBreadcrumb from '../../../components/admin/AdminBreadcrumb';
import { MARKETING_TABS, tabRoute, type MarketingTabId } from './marketingTabConfig';
import { EV_NAVY, EV_EMBER, EV_MUTED, EV_LINE, DISPLAY, BODY, MARKETING_FONTS_HREF } from './marketingTokens';
import { PlaceholderTab } from './marketingPrimitives';
import ChannelsTab from './ChannelsTab';
import {
  LayoutDashboard, Radio, MapPin, Layers, ClipboardList,
  Calendar, Flame, GitBranch, Users, Mail, Target,
  Search, TrendingUp, Megaphone, FileBarChart,
} from 'lucide-react';
import { KpiTile } from '../../../components/admin/KpiTile';
import { Modal } from '../../../components/ui/Modal';
import {
  useMarketingData,
  AddAccountInput,
  AddInfluencerInput,
  AccountRow,
  InfluencerRow,
  RelationshipTypeRow,
} from '../../../lib/marketing/useMarketingData';
import {
  JURISDICTIONS,
  SEGMENTS,
  STAGES,
  STAGE_LABELS,
  deriveICP,
  priorityBand,
  buyerTypeFromSegment,
} from '../../../lib/marketing/gtmReference';
import { toast } from 'sonner';

// ── Constants ────────────────────────────────────────────────────

interface MarketingConsoleProps {
  defaultTab: MarketingTabId;
}

const JURISDICTION_NAMES = Object.keys(JURISDICTIONS);
const SEGMENT_NAMES = Object.keys(SEGMENTS);

const ENABLEMENT_STAGES = ['Identified', 'Equipped', 'Championing', 'Growing'] as const;

// ── Empty forms ──────────────────────────────────────────────────

const EMPTY_ACCOUNT_FORM: AddAccountInput = {
  name: '',
  contactName: '',
  contactEmail: '',
  role: '',
  segment: '',
  county: '',
  locations: 1,
  mrr: 0,
  stage: 'prospect',
  buyerType: '',
  brokerId: null,
  insurer: '',
  source: '',
  nextAction: '',
  notes: '',
};

const EMPTY_MEMBER_FORM: AddInfluencerInput = {
  name: '',
  org: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  typeId: null,
  stage: null,
  notes: '',
};

// ── Component ────────────────────────────────────────────────────

export default function MarketingConsole({ defaultTab }: MarketingConsoleProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<MarketingTabId>(defaultTab);
  const data = useMarketingData();
  const { accounts, influencers, types, loading, error } = data;

  // Add-account modal
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountForm, setAccountForm] = useState<AddAccountInput>({ ...EMPTY_ACCOUNT_FORM });
  const [savingAccount, setSavingAccount] = useState(false);

  // Tab switching (deep-linked to route)
  const switchTab = (t: MarketingTabId) => {
    setTab(t);
    navigate(tabRoute(t), { replace: true });
  };

  // Resolve active tab label for breadcrumb
  const activeLabel = MARKETING_TABS.find(t => t.id === tab)?.label ?? tab;

  // ── Derived stats ──────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = accounts.length;
    const championed = accounts.filter(a => a.broker_id).length;
    const hot = accounts.filter(a => priorityBand(deriveICP(a)) === 'hot').length;
    const inPipeline = accounts.filter(a =>
      a.stage !== 'won' && a.stage !== 'lost' && a.stage !== 'churned',
    ).length;
    return { total, championed, hot, inPipeline };
  }, [accounts]);

  // ── Influencer lookup (broker_id -> name) ──────────────────────

  const influencerMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const inf of influencers) {
      map[inf.id] = inf.name;
    }
    return map;
  }, [influencers]);

  // ── Hero influencers (for championed-by dropdown) ──────────────

  const heroInfluencers = useMemo(() => {
    const heroTypeIds = new Set(types.filter(t => t.is_hero).map(t => t.id));
    return influencers.filter(inf => inf.type_id && heroTypeIds.has(inf.type_id));
  }, [influencers, types]);

  // ── Live-preview ICP from form ─────────────────────────────────

  const previewICP = deriveICP({
    county: accountForm.county || null,
    segment: accountForm.segment || null,
    location_count: accountForm.locations ?? 1,
    insurer: accountForm.insurer || null,
  });
  const previewBand = priorityBand(previewICP);

  // ── Submit add-account ─────────────────────────────────────────

  const handleAddAccount = async () => {
    if (!accountForm.name.trim()) {
      toast.error('Kitchen name is required');
      return;
    }
    setSavingAccount(true);
    const { error: addErr } = await data.addAccount(accountForm);
    setSavingAccount(false);
    if (addErr) {
      toast.error(`Failed to add account: ${addErr}`);
    } else {
      toast.success('Account added');
      setShowAddAccount(false);
      setAccountForm({ ...EMPTY_ACCOUNT_FORM });
    }
  };

  // ── Auto-default buyer type on segment change ──────────────────

  const onSegmentChange = (seg: string) => {
    setAccountForm(prev => ({
      ...prev,
      segment: seg,
      buyerType: seg ? buyerTypeFromSegment(seg) : prev.buyerType,
    }));
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Google Fonts for Fraunces + Plus Jakarta Sans */}
      <link rel="stylesheet" href={MARKETING_FONTS_HREF} />

      <AdminBreadcrumb crumbs={[{ label: 'Marketing' }, { label: activeLabel }]} />

      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: EV_EMBER, fontFamily: BODY }}>
          52-week campaign · Jul 2026 — Jun 2027
        </div>
        <h1 className="text-[26px] mt-1" style={{ color: EV_NAVY, fontFamily: DISPLAY, fontWeight: 600, letterSpacing: '-0.02em' }}>
          Marketing
        </h1>
        <p className="text-[13px] mt-0.5 font-medium" style={{ color: EV_MUTED, fontFamily: BODY }}>
          Predict what's upcoming · Reduce the lapse · Prove it's done — across 14 channels.
        </p>
      </div>

      {/* Tab bar — scrolls horizontally */}
      <div className="flex items-center gap-0 border-b overflow-x-auto" style={{ borderColor: EV_LINE }}>
        {MARKETING_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className="inline-flex items-center gap-2 px-4 py-3 text-sm transition relative whitespace-nowrap cursor-pointer bg-transparent border-x-0 border-t-0"
            style={{
              color: tab === id ? EV_NAVY : EV_MUTED,
              fontWeight: tab === id ? 700 : 500,
              fontFamily: BODY,
              borderBottom: tab === id ? `3px solid ${EV_EMBER}` : '3px solid transparent',
              marginBottom: '-1px',
            }}
          >
            <Icon size={14} style={{ color: tab === id ? EV_EMBER : EV_MUTED }} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'accounts' ? (
        <AccountsTab
          accounts={accounts}
          influencerMap={influencerMap}
          stats={stats}
          loading={loading}
          error={error}
          onAdd={() => setShowAddAccount(true)}
        />
      ) : tab === 'network' ? (
        <NetworkTab
          accounts={accounts}
          influencers={influencers}
          types={types}
          loading={loading}
          error={error}
          addType={data.addType}
          addInfluencer={data.addInfluencer}
        />
      ) : null}

      {/* Placeholder tabs — shell only, data wiring in later phases */}
      {tab === 'overview'  && <PlaceholderTab title="Overview" note="KPI strip, funnel with PRP mix, forecast vs actual, segment performance, and active alerts." Icon={LayoutDashboard} />}
      {tab === 'calls'     && <PlaceholderTab title="Outbound Calls" note="Daily calling surface — call queue sorted by ICP, outcome tracking, and cost per demo." Icon={Radio} />}
      {tab === 'field'     && <PlaceholderTab title="In Person" note="Field prospecting routes — today's stops, visit logging, and county coverage." Icon={MapPin} />}
      {tab === 'channels'  && <ChannelsTab />}
      {tab === 'survey'    && <PlaceholderTab title="Survey" note="Market research responses — cold funnel, pain correlation, segment breakdown." Icon={ClipboardList} />}
      {tab === 'schedule'  && <PlaceholderTab title="Content Schedule" note="Month calendar with add-post form and an extensible channel list." Icon={Calendar} />}
      {tab === 'founder'   && <PlaceholderTab title="Founder Window" note="Seat counter hero (X of 250), weekly seat momentum, tier mix, and source attribution." Icon={Flame} />}
      {tab === 'funnel'    && <PlaceholderTab title="Funnel" note="Stage-by-stage from first touch to claimed seat, with PRP attribution per transition." Icon={GitBranch} />}
      {tab === 'segments'  && <PlaceholderTab title="Segments" note="Every metric re-cut by kitchen segment and by buyer type — owner/operator vs institutional." Icon={Users} />}
      {tab === 'sequence'  && <PlaceholderTab title="Email Sequence" note="52-week PRP drip heatmap by open rate, two tracks, with the Predict / Reduce / Prove band strip." Icon={Mail} />}
      {tab === 'prp'       && <PlaceholderTab title="PRP Attribution" note="Predict / Reduce / Prove touch mix and seat conversion by layer." Icon={Target} />}
      {tab === 'seo'       && <PlaceholderTab title="SEO" note="Organic impressions, clicks, average position, and queries — connect Search Console to fill." Icon={Search} />}
      {tab === 'serp'      && <PlaceholderTab title="SERP" note="Rankings, share of voice and content gaps across the 169-county programmatic footprint." Icon={TrendingUp} />}
      {tab === 'ads'       && <PlaceholderTab title="Google Ads" note="Spend, clicks, CPC and cost per demo by campaign — connect Google Ads to fill." Icon={Megaphone} />}
      {tab === 'forecast'  && <PlaceholderTab title="Forecast vs Actual" note="Per-week actuals against the seeded campaign forecast." Icon={FileBarChart} />}

      {/* ── Add-account modal ──────────────────────────────────────── */}
      <Modal isOpen={showAddAccount} onClose={() => setShowAddAccount(false)} size="lg">
        <div className="p-6">
          <h2 className="text-[18px] font-bold text-navy mb-4 font-logo">Add Account</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Kitchen name */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Kitchen Name *</label>
              <input
                value={accountForm.name}
                onChange={e => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                placeholder="e.g. Joe's Grill"
              />
            </div>

            {/* Segment */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Segment</label>
              <select
                value={accountForm.segment || ''}
                onChange={e => onSegmentChange(e.target.value)}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              >
                <option value="">Select segment</option>
                {SEGMENT_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* County */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">County</label>
              <select
                value={accountForm.county || ''}
                onChange={e => setAccountForm(prev => ({ ...prev, county: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              >
                <option value="">Select county</option>
                {JURISDICTION_NAMES.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>

            {/* Buyer type toggle */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Buyer Type</label>
              <div className="flex gap-2">
                {(['owner', 'institution'] as const).map(bt => (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setAccountForm(prev => ({ ...prev, buyerType: bt }))}
                    className={`flex-1 py-[7px] text-[12px] font-semibold rounded-md border cursor-pointer transition-colors ${
                      accountForm.buyerType === bt
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-slate_ui border-border_ui-warm hover:border-navy'
                    }`}
                  >
                    {bt === 'owner' ? 'Owner' : 'Institution'}
                  </button>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Locations</label>
              <input
                type="number"
                min={1}
                value={accountForm.locations ?? 1}
                onChange={e => setAccountForm(prev => ({ ...prev, locations: parseInt(e.target.value) || 1 }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Insurer */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Insurer</label>
              <input
                value={accountForm.insurer || ''}
                onChange={e => setAccountForm(prev => ({ ...prev, insurer: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                placeholder="Carrier name"
              />
            </div>

            {/* Contact name */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Contact Name</label>
              <input
                value={accountForm.contactName || ''}
                onChange={e => setAccountForm(prev => ({ ...prev, contactName: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Contact email */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Contact Email</label>
              <input
                type="email"
                value={accountForm.contactEmail || ''}
                onChange={e => setAccountForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Contact title */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Contact Title</label>
              <input
                value={accountForm.role || ''}
                onChange={e => setAccountForm(prev => ({ ...prev, role: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                placeholder="e.g. Owner, GM"
              />
            </div>

            {/* Stage */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Stage</label>
              <select
                value={accountForm.stage || 'prospect'}
                onChange={e => setAccountForm(prev => ({ ...prev, stage: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              >
                {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>

            {/* MRR */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Est. MRR ($)</label>
              <input
                type="number"
                min={0}
                value={accountForm.mrr ?? 0}
                onChange={e => setAccountForm(prev => ({ ...prev, mrr: parseInt(e.target.value) || 0 }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Source */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Source</label>
              <input
                value={accountForm.source || ''}
                onChange={e => setAccountForm(prev => ({ ...prev, source: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                placeholder="e.g. Referral, Cold, Event"
              />
            </div>

            {/* Championed by */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Championed By</label>
              <select
                value={accountForm.brokerId || ''}
                onChange={e => setAccountForm(prev => ({ ...prev, brokerId: e.target.value || null }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              >
                <option value="">— unclaimed —</option>
                {heroInfluencers.map(inf => (
                  <option key={inf.id} value={inf.id}>{inf.name}{inf.org ? ` (${inf.org})` : ''}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Notes</label>
              <textarea
                value={accountForm.notes || ''}
                onChange={e => setAccountForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full resize-y"
              />
            </div>
          </div>

          {/* Live-preview ICP panel */}
          <div className="bg-cream rounded-lg p-4 mb-5 border border-border_ui-warm">
            <p className="text-[10px] font-bold text-slate_ui uppercase tracking-wider mb-2">Auto-derived</p>
            <div className="flex gap-6 items-center flex-wrap">
              <div>
                <span className="text-[11px] text-gray-400 mr-1">ICP Score:</span>
                <span className={`text-[15px] font-extrabold ${
                  previewBand === 'hot' ? 'text-emerald-600' :
                  previewBand === 'warm' ? 'text-amber-500' : 'text-gray-400'
                }`}>
                  {previewICP}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 mr-1">Band:</span>
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                  previewBand === 'hot' ? 'bg-emerald-50 text-emerald-700' :
                  previewBand === 'warm' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {previewBand}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 mr-1">Buyer:</span>
                <span className="text-[12px] font-semibold text-navy">
                  {accountForm.buyerType || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddAccount(false); setAccountForm({ ...EMPTY_ACCOUNT_FORM }); }}
              className="py-2 px-4 text-[13px] font-semibold rounded-md cursor-pointer bg-gray-100 text-slate_ui border-none"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAccount}
              disabled={savingAccount}
              className={`py-2 px-5 text-[13px] font-semibold rounded-md cursor-pointer border-none ${
                savingAccount ? 'bg-gray-200 text-gray-400' : 'bg-navy text-white'
              }`}
            >
              {savingAccount ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// Accounts Tab
// ═════════════════════════════════════════════════════════════════

interface AccountsTabProps {
  accounts: AccountRow[];
  influencerMap: Record<string, string>;
  stats: { total: number; championed: number; hot: number; inPipeline: number };
  loading: boolean;
  error: string | null;
  onAdd: () => void;
}

function AccountsTab({ accounts, influencerMap, stats, loading, error, onAdd }: AccountsTabProps) {
  const [search, setSearch] = useState('');

  const filtered = accounts.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.org_name.toLowerCase().includes(q) ||
      (a.segment || '').toLowerCase().includes(q) ||
      (a.county || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile label="Accounts" value={stats.total} />
        <KpiTile label="Championed" value={stats.championed} valueColor="gold" />
        <KpiTile label="Tier-1 / Hot" value={stats.hot} valueColor="green" />
        <KpiTile label="In Pipeline" value={stats.inPipeline} valueColor="navy" />
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-[280px]"
          placeholder="Search by kitchen, segment, or county..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={onAdd}
          className="py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer bg-navy text-white border-none"
        >
          + Add Account
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="p-10 text-center text-gray-400 text-[13px]">Loading accounts...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-gray-400 mb-3">No accounts yet</p>
          <button
            onClick={onAdd}
            className="py-2 px-5 text-[13px] font-semibold rounded-md cursor-pointer bg-navy text-white border-none"
          >
            + Add Account
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border_ui-warm">
                {['Kitchen', 'Segment', 'County', 'Buyer', 'Stage', 'ICP', 'Championed by'].map(h => (
                  <th
                    key={h}
                    className="py-2 px-3 text-[10px] font-bold text-slate_ui uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const icp = deriveICP(a);
                const band = priorityBand(icp);
                const champion = a.broker_id ? (influencerMap[a.broker_id] || 'Unknown') : 'Unclaimed';
                return (
                  <tr key={a.id} className="border-b border-border_ui-light hover:bg-cream/50">
                    <td className="py-2.5 px-3 text-[13px] font-semibold text-navy">
                      {a.org_name}
                    </td>
                    <td className="py-2.5 px-3 text-[12px] text-slate_ui">
                      {a.segment || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-[12px] text-slate_ui">
                      {a.county || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {a.buyer_type ? (
                        <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full ${
                          a.buyer_type === 'owner'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {a.buyer_type}
                        </span>
                      ) : (
                        <span className="text-[12px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] font-semibold text-navy bg-gray-50 border border-border_ui-warm rounded-md py-0.5 px-2">
                        {STAGE_LABELS[a.stage as keyof typeof STAGE_LABELS] || a.stage}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[12px] font-extrabold ${
                        band === 'hot' ? 'text-emerald-600' :
                        band === 'warm' ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                        {icp}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[12px] text-slate_ui">
                      {champion}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// Network Tab
// ═════════════════════════════════════════════════════════════════

interface NetworkTabProps {
  accounts: AccountRow[];
  influencers: InfluencerRow[];
  types: RelationshipTypeRow[];
  loading: boolean;
  error: string | null;
  addType: (name: string) => Promise<{ error: string | null }>;
  addInfluencer: (form: AddInfluencerInput) => Promise<{ error: string | null }>;
}

function NetworkTab({ accounts, influencers, types, loading, error, addType, addInfluencer }: NetworkTabProps) {
  const [filterTypeId, setFilterTypeId] = useState<string | null>(null);

  // Add-type modal
  const [showAddType, setShowAddType] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [savingType, setSavingType] = useState(false);

  // Add-member modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState<AddInfluencerInput>({ ...EMPTY_MEMBER_FORM });
  const [savingMember, setSavingMember] = useState(false);

  // ── Type map for lookups ───────────────────────────────────────

  const typeMap = useMemo(() => {
    const map: Record<string, RelationshipTypeRow> = {};
    for (const t of types) map[t.id] = t;
    return map;
  }, [types]);

  // ── Type counts ────────────────────────────────────────────────

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inf of influencers) {
      const tid = inf.type_id || '__none';
      counts[tid] = (counts[tid] || 0) + 1;
    }
    return counts;
  }, [influencers]);

  // ── Filtered roster ────────────────────────────────────────────

  const roster = useMemo(() => {
    if (!filterTypeId) return influencers;
    return influencers.filter(inf => inf.type_id === filterTypeId);
  }, [influencers, filterTypeId]);

  // ── Book: accounts championed by a given broker ────────────────

  const bookFor = (brokerId: string): AccountRow[] =>
    accounts.filter(a => a.broker_id === brokerId);

  // ── Determine if selected type in member form is hero ──────────

  const selectedTypeIsHero = memberForm.typeId ? typeMap[memberForm.typeId]?.is_hero ?? false : false;

  // ── Submit add-type ────────────────────────────────────────────

  const handleAddType = async () => {
    if (!typeName.trim()) { toast.error('Type name is required'); return; }
    setSavingType(true);
    const { error: err } = await addType(typeName.trim());
    setSavingType(false);
    if (err) { toast.error(`Failed: ${err}`); }
    else { toast.success('Type added'); setShowAddType(false); setTypeName(''); }
  };

  // ── Submit add-member ──────────────────────────────────────────

  const handleAddMember = async () => {
    if (!memberForm.name.trim()) { toast.error('Name is required'); return; }
    setSavingMember(true);
    const payload: AddInfluencerInput = {
      ...memberForm,
      stage: selectedTypeIsHero ? (memberForm.stage || 'Identified') : null,
    };
    const { error: err } = await addInfluencer(payload);
    setSavingMember(false);
    if (err) { toast.error(`Failed: ${err}`); }
    else { toast.success('Member added'); setShowAddMember(false); setMemberForm({ ...EMPTY_MEMBER_FORM }); }
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Error */}
      {error && (
        <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
          {error}
        </div>
      )}

      {/* Type registry bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* All chip */}
        <button
          onClick={() => setFilterTypeId(null)}
          className={`py-1 px-3 text-[11px] font-semibold rounded-full border cursor-pointer transition-colors ${
            filterTypeId === null
              ? 'bg-navy text-white border-navy'
              : 'bg-white text-slate_ui border-border_ui-warm hover:border-navy'
          }`}
        >
          All ({influencers.length})
        </button>

        {/* Type chips */}
        {types.map(t => (
          <button
            key={t.id}
            onClick={() => setFilterTypeId(filterTypeId === t.id ? null : t.id)}
            className={`py-1 px-3 text-[11px] font-semibold rounded-full border cursor-pointer transition-colors ${
              filterTypeId === t.id
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-slate_ui border-border_ui-warm hover:border-navy'
            }`}
          >
            {t.is_hero ? '\u2605 ' : ''}{t.name} ({typeCounts[t.id] || 0})
          </button>
        ))}

        {/* Add type button */}
        <button
          onClick={() => setShowAddType(true)}
          className="py-1 px-3 text-[11px] font-semibold rounded-full border border-dashed border-border_ui-warm text-slate_ui cursor-pointer hover:border-navy bg-transparent"
        >
          + Add type
        </button>

        {/* Spacer + Add to network */}
        <div className="flex-1" />
        <button
          onClick={() => setShowAddMember(true)}
          className="py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer bg-navy text-white border-none"
        >
          + Add to Network
        </button>
      </div>

      {/* Roster */}
      {loading ? (
        <div className="p-10 text-center text-gray-400 text-[13px]">Loading network...</div>
      ) : roster.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-gray-400 mb-3">Your network is empty</p>
          <button
            onClick={() => setShowAddMember(true)}
            className="py-2 px-5 text-[13px] font-semibold rounded-md cursor-pointer bg-navy text-white border-none"
          >
            + Add to Network
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roster.map(inf => {
            const infType = inf.type_id ? typeMap[inf.type_id] : null;
            const isHero = infType?.is_hero ?? false;
            const book = isHero ? bookFor(inf.id) : [];

            return (
              <div
                key={inf.id}
                className="bg-white border border-border_ui-warm rounded-[10px] p-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[15px] font-bold text-navy">{inf.name}</div>
                    {inf.org && (
                      <div className="text-[12px] text-slate_ui mt-0.5">{inf.org}</div>
                    )}
                  </div>
                  {infType && (
                    <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full ${
                      isHero ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-slate_ui'
                    }`}>
                      {isHero ? '\u2605 ' : ''}{infType.name}
                    </span>
                  )}
                </div>

                {/* Contact line */}
                <div className="text-[11px] text-gray-400 mb-3 space-y-0.5">
                  {inf.contact_name && <div>{inf.contact_name}</div>}
                  {inf.contact_email && <div>{inf.contact_email}</div>}
                  {inf.contact_phone && <div>{inf.contact_phone}</div>}
                </div>

                {/* Enablement arc (hero only) */}
                {isHero && inf.stage && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-slate_ui uppercase tracking-wider mb-1.5">Enablement</p>
                    <div className="flex gap-1">
                      {ENABLEMENT_STAGES.map(s => (
                        <div
                          key={s}
                          className={`flex-1 text-center py-1 text-[10px] font-semibold rounded ${
                            inf.stage === s
                              ? 'bg-gold text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Book (hero only) */}
                {isHero && (
                  <div>
                    <p className="text-[10px] font-bold text-slate_ui uppercase tracking-wider mb-1.5">
                      Book ({book.length})
                    </p>
                    {book.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">No accounts championed yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {book.map(a => (
                          <div key={a.id} className="text-[11px] text-navy flex gap-2">
                            <span className="font-semibold">{a.org_name}</span>
                            {a.county && <span className="text-gray-400">{a.county}</span>}
                            <span className="text-gray-400">
                              {STAGE_LABELS[a.stage as keyof typeof STAGE_LABELS] || a.stage}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes (non-hero) */}
                {!isHero && inf.notes && (
                  <div className="text-[11px] text-gray-400 mt-1">{inf.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add-type modal ─────────────────────────────────────────── */}
      <Modal isOpen={showAddType} onClose={() => setShowAddType(false)} size="sm">
        <div className="p-6">
          <h2 className="text-[18px] font-bold text-navy mb-4 font-logo">Add Relationship Type</h2>
          <div className="mb-4">
            <label className="text-[11px] font-semibold text-slate_ui block mb-1">Type Name *</label>
            <input
              value={typeName}
              onChange={e => setTypeName(e.target.value)}
              className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              placeholder="e.g. Distributor, CPA"
              onKeyDown={e => { if (e.key === 'Enter') handleAddType(); }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddType(false); setTypeName(''); }}
              className="py-2 px-4 text-[13px] font-semibold rounded-md cursor-pointer bg-gray-100 text-slate_ui border-none"
            >
              Cancel
            </button>
            <button
              onClick={handleAddType}
              disabled={savingType}
              className={`py-2 px-5 text-[13px] font-semibold rounded-md cursor-pointer border-none ${
                savingType ? 'bg-gray-200 text-gray-400' : 'bg-navy text-white'
              }`}
            >
              {savingType ? 'Adding...' : 'Add Type'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add-member modal ───────────────────────────────────────── */}
      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} size="lg">
        <div className="p-6">
          <h2 className="text-[18px] font-bold text-navy mb-4 font-logo">Add to Network</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Type */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Type</label>
              <select
                value={memberForm.typeId || ''}
                onChange={e => setMemberForm(prev => ({ ...prev, typeId: e.target.value || null, stage: null }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              >
                <option value="">Select type</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.is_hero ? '\u2605 ' : ''}{t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Name *</label>
              <input
                value={memberForm.name}
                onChange={e => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Org */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Organization</label>
              <input
                value={memberForm.org || ''}
                onChange={e => setMemberForm(prev => ({ ...prev, org: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Contact name */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Contact Name</label>
              <input
                value={memberForm.contactName || ''}
                onChange={e => setMemberForm(prev => ({ ...prev, contactName: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Contact email */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Contact Email</label>
              <input
                type="email"
                value={memberForm.contactEmail || ''}
                onChange={e => setMemberForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Contact phone */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Contact Phone</label>
              <input
                value={memberForm.contactPhone || ''}
                onChange={e => setMemberForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Enablement stage (hero types only) */}
            {selectedTypeIsHero && (
              <div>
                <label className="text-[11px] font-semibold text-slate_ui block mb-1">Enablement Stage</label>
                <select
                  value={memberForm.stage || 'Identified'}
                  onChange={e => setMemberForm(prev => ({ ...prev, stage: e.target.value }))}
                  className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                >
                  {ENABLEMENT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Notes</label>
              <textarea
                value={memberForm.notes || ''}
                onChange={e => setMemberForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full resize-y"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddMember(false); setMemberForm({ ...EMPTY_MEMBER_FORM }); }}
              className="py-2 px-4 text-[13px] font-semibold rounded-md cursor-pointer bg-gray-100 text-slate_ui border-none"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMember}
              disabled={savingMember}
              className={`py-2 px-5 text-[13px] font-semibold rounded-md cursor-pointer border-none ${
                savingMember ? 'bg-gray-200 text-gray-400' : 'bg-navy text-white'
              }`}
            >
              {savingMember ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
