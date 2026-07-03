/**
 * MarketingConsole — Prospecting console shell with Accounts | Network tabs
 *
 * Route wrappers:
 *   /admin/marketing/accounts  -> defaultTab="accounts"
 *   /admin/marketing/network   -> defaultTab="network"
 *
 * Access: salesOnly (SalesGuard)
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminBreadcrumb from '../../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../../components/admin/KpiTile';
import { Modal } from '../../../components/ui/Modal';
import { useMarketingData, AddAccountInput } from '../../../lib/marketing/useMarketingData';
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

// ── Types ────────────────────────────────────────────────────────

interface MarketingConsoleProps {
  defaultTab: 'accounts' | 'network';
}

const JURISDICTION_NAMES = Object.keys(JURISDICTIONS);
const SEGMENT_NAMES = Object.keys(SEGMENTS);

// ── Empty add-account form ───────────────────────────────────────

const EMPTY_FORM: AddAccountInput = {
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

// ── Component ────────────────────────────────────────────────────

export default function MarketingConsole({ defaultTab }: MarketingConsoleProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'accounts' | 'network'>(defaultTab);
  const { accounts, influencers, loading, error, addAccount } = useMarketingData();

  // Add-account modal
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddAccountInput>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Tab switching (deep-linked to route)
  const switchTab = (t: 'accounts' | 'network') => {
    setTab(t);
    navigate(t === 'accounts' ? '/admin/marketing/accounts' : '/admin/marketing/network', { replace: true });
  };

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

  // ── Live-preview ICP from form ─────────────────────────────────

  const previewICP = deriveICP({
    county: form.county || null,
    segment: form.segment || null,
    location_count: form.locations ?? 1,
    insurer: form.insurer || null,
  });
  const previewBand = priorityBand(previewICP);

  // ── Submit add-account ─────────────────────────────────────────

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error('Kitchen name is required');
      return;
    }
    setSaving(true);
    const { error: addErr } = await addAccount(form);
    setSaving(false);
    if (addErr) {
      toast.error(`Failed to add account: ${addErr}`);
    } else {
      toast.success('Account added');
      setShowAdd(false);
      setForm({ ...EMPTY_FORM });
    }
  };

  // ── Auto-default buyer type on segment change ──────────────────

  const onSegmentChange = (seg: string) => {
    setForm(prev => ({
      ...prev,
      segment: seg,
      buyerType: seg ? buyerTypeFromSegment(seg) : prev.buyerType,
    }));
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Marketing' }, { label: tab === 'accounts' ? 'Accounts' : 'Network' }]} />

      <div>
        <h1 className="text-[22px] font-extrabold text-navy font-logo">Prospecting</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Manage prospecting accounts, network, and outreach
        </p>
      </div>

      {/* Tab switch */}
      <div className="flex gap-0 border-b border-border_ui-warm">
        {(['accounts', 'network'] as const).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer bg-transparent border-x-0 border-t-0 ${
              tab === t
                ? 'text-navy border-gold font-bold'
                : 'text-gray-400 border-transparent hover:text-navy'
            }`}
          >
            {t === 'accounts' ? 'Accounts' : 'Network'}
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
          onAdd={() => setShowAdd(true)}
        />
      ) : (
        <div className="p-10 text-center text-gray-400 text-[13px]">
          Network roster coming in 3b.
        </div>
      )}

      {/* Add-account modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="lg">
        <div className="p-6">
          <h2 className="text-[18px] font-bold text-navy mb-4 font-logo">Add Account</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Kitchen name */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Kitchen Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                placeholder="e.g. Joe's Grill"
              />
            </div>

            {/* Segment */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Segment</label>
              <select
                value={form.segment || ''}
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
                value={form.county || ''}
                onChange={e => setForm(prev => ({ ...prev, county: e.target.value }))}
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
                    onClick={() => setForm(prev => ({ ...prev, buyerType: bt }))}
                    className={`flex-1 py-[7px] text-[12px] font-semibold rounded-md border cursor-pointer transition-colors ${
                      form.buyerType === bt
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
                value={form.locations ?? 1}
                onChange={e => setForm(prev => ({ ...prev, locations: parseInt(e.target.value) || 1 }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Insurer */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Insurer</label>
              <input
                value={form.insurer || ''}
                onChange={e => setForm(prev => ({ ...prev, insurer: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                placeholder="Carrier name"
              />
            </div>

            {/* Contact name */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Contact Name</label>
              <input
                value={form.contactName || ''}
                onChange={e => setForm(prev => ({ ...prev, contactName: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Contact email */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Contact Email</label>
              <input
                type="email"
                value={form.contactEmail || ''}
                onChange={e => setForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Contact title */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Contact Title</label>
              <input
                value={form.role || ''}
                onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                placeholder="e.g. Owner, GM"
              />
            </div>

            {/* Stage */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Stage</label>
              <select
                value={form.stage || 'prospect'}
                onChange={e => setForm(prev => ({ ...prev, stage: e.target.value }))}
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
                value={form.mrr ?? 0}
                onChange={e => setForm(prev => ({ ...prev, mrr: parseInt(e.target.value) || 0 }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
              />
            </div>

            {/* Source */}
            <div>
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Source</label>
              <input
                value={form.source || ''}
                onChange={e => setForm(prev => ({ ...prev, source: e.target.value }))}
                className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                placeholder="e.g. Referral, Cold, Event"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate_ui block mb-1">Notes</label>
              <textarea
                value={form.notes || ''}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
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
                  {form.buyerType || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAdd(false); setForm({ ...EMPTY_FORM }); }}
              className="py-2 px-4 text-[13px] font-semibold rounded-md cursor-pointer bg-gray-100 text-slate_ui border-none"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className={`py-2 px-5 text-[13px] font-semibold rounded-md cursor-pointer border-none ${
                saving ? 'bg-gray-200 text-gray-400' : 'bg-navy text-white'
              }`}
            >
              {saving ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Accounts Tab ─────────────────────────────────────────────────

interface AccountsTabProps {
  accounts: ReturnType<typeof useMarketingData>['accounts'];
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
