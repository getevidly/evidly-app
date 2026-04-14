/**
 * RFP-INTEL-1 — RFP Intelligence Monitor
 *
 * Admin-only dashboard for discovering, classifying, and tracking
 * government procurement opportunities relevant to EvidLY.
 * Route: /admin/rfp-intelligence
 * Access: isEvidlyAdmin || isDemoMode
 */

import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useRfpIntelligence, type RfpTab, type RfpViewMode } from '../../hooks/useRfpIntelligence';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import type {
  RfpListingWithDetails,
  RfpSource,
  RfpDashboardStats,
  RfpFilterState,
  RfpRelevanceTier,
  RfpEntityType,
  RfpSourceType,
  RfpSetAsideType,
  RfpActionType,
} from '../../types/rfp';
import { EMPTY_FILTERS, US_STATES, MODULE_LABELS, EVIDLY_NAICS_CODES } from '../../types/rfp';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import {
  FileSearch,
  Target,
  MapPin,
  Calendar,
  DollarSign,
  Shield,
  BarChart3,
  Database,
  Play,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Search,
  LayoutGrid,
  List,
  ExternalLink,
  Trophy,
  AlertTriangle,
  Clock,
  Filter,
  TrendingUp,
  Cpu,
  Coins,
} from 'lucide-react';
import { StatCardRow } from '../../components/admin/StatCardRow';
import { AIAssistButton, AIGeneratedIndicator } from '../../components/ui/AIAssistButton';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';

// ── Constants ────────────────────────────────────────────────

const TIER_COLORS: Record<RfpRelevanceTier, { bg: string; text: string; dot: string; label: string }> = {
  high:       { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e', label: 'High' },
  medium:     { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b', label: 'Medium' },
  low:        { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8', label: 'Low' },
  irrelevant: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Irrelevant' },
};

const ENTITY_LABELS: Record<RfpEntityType, string> = {
  federal: 'Federal',
  state: 'State',
  county: 'County',
  city: 'City',
  school_district: 'K-12',
  healthcare_system: 'Healthcare',
  enterprise: 'Enterprise',
};

const SET_ASIDE_LABELS: Record<string, { label: string; icon: string }> = {
  veteran: { label: 'Veteran', icon: '🎖️' },
  sdvosb: { label: 'SDVOSB', icon: '🎖️' },
  '8a': { label: '8(a)', icon: '🏢' },
  hubzone: { label: 'HUBZone', icon: '📍' },
  small_business: { label: 'Small Business', icon: '🏢' },
  wosb: { label: 'WOSB', icon: '👩' },
};

const PIE_COLORS = ['#22c55e', '#f59e0b', '#94a3b8', '#ef4444'];

// ── Helpers ──────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function formatCurrency(val: number | null): string {
  if (val == null) return '—';
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

// ── Stat Card (uses shared StatCardRow) ──────────────────────

// ── Filter Bar ───────────────────────────────────────────────

function FilterBar({ filters, setFilters, resetFilters }: {
  filters: RfpFilterState;
  setFilters: React.Dispatch<React.SetStateAction<RfpFilterState>>;
  resetFilters: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters = filters.search || filters.relevance_tier.length > 0 ||
    filters.source_type.length > 0 || filters.state.length > 0 ||
    filters.entity_type.length > 0 || filters.matched_module.length > 0 ||
    filters.naics_code || filters.set_aside_type.length > 0 ||
    filters.status.length > 0 || filters.date_from || filters.date_to;

  const activeCount = [
    filters.relevance_tier.length > 0,
    filters.source_type.length > 0,
    filters.state.length > 0,
    filters.entity_type.length > 0,
    filters.matched_module.length > 0,
    !!filters.naics_code,
    filters.set_aside_type.length > 0,
    filters.status.length > 0,
    !!filters.date_from || !!filters.date_to,
  ].filter(Boolean).length;

  function toggleArray<T extends string>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
  }

  return (
    <div className="rounded-xl border border-[#D1D9E6] bg-white">
      {/* Search + toggle row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7F96]" />
          <input
            type="text"
            placeholder="Search RFPs by title, entity, keywords…"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[#D1D9E6] text-[#0B1628] bg-[#F4F6FA] focus-visible:outline-none focus-visible:ring-2"
          />
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
            hasActiveFilters
              ? 'border-gold text-gold bg-gold/[0.06]'
              : 'border-[#D1D9E6] text-[#3D5068] bg-transparent'
          }`}
        >
          <Filter size={14} />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-gold/[0.12] text-gold">
              {activeCount}
            </span>
          )}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs px-2 py-1 rounded text-[#6B7F96] hover:bg-navy/5 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 border-t border-[#D1D9E6] pt-3">
          {/* Relevance Tier */}
          <FilterGroup label="Relevance">
            {(['high', 'medium', 'low'] as RfpRelevanceTier[]).map(tier => (
              <FilterChip
                key={tier}
                label={TIER_COLORS[tier].label}
                active={filters.relevance_tier.includes(tier)}
                onClick={() => setFilters(f => ({ ...f, relevance_tier: toggleArray(f.relevance_tier, tier) }))}
                dotColor={TIER_COLORS[tier].dot}
              />
            ))}
          </FilterGroup>

          {/* Entity Type */}
          <FilterGroup label="Entity Type">
            {(['federal', 'state', 'school_district', 'healthcare_system', 'enterprise'] as RfpEntityType[]).map(et => (
              <FilterChip
                key={et}
                label={ENTITY_LABELS[et]}
                active={filters.entity_type.includes(et)}
                onClick={() => setFilters(f => ({ ...f, entity_type: toggleArray(f.entity_type, et) }))}
              />
            ))}
          </FilterGroup>

          {/* Source Type */}
          <FilterGroup label="Source Type">
            {(['government', 'k12', 'healthcare', 'enterprise'] as RfpSourceType[]).map(st => (
              <FilterChip
                key={st}
                label={st.charAt(0).toUpperCase() + st.slice(1)}
                active={filters.source_type.includes(st)}
                onClick={() => setFilters(f => ({ ...f, source_type: toggleArray(f.source_type, st) }))}
              />
            ))}
          </FilterGroup>

          {/* Set-Aside */}
          <FilterGroup label="Set-Aside">
            {(['veteran', 'sdvosb', 'small_business', '8a', 'hubzone'] as RfpSetAsideType[]).map(sa => (
              <FilterChip
                key={sa}
                label={SET_ASIDE_LABELS[sa]?.label ?? sa}
                active={filters.set_aside_type.includes(sa)}
                onClick={() => setFilters(f => ({ ...f, set_aside_type: toggleArray(f.set_aside_type, sa) }))}
              />
            ))}
          </FilterGroup>

          {/* State */}
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs font-medium mb-1 block text-[#6B7F96]">State</label>
            <select
              className="w-full text-sm px-3 py-1.5 rounded-xl border border-[#D1D9E6] text-[#0B1628] focus:outline-none"
              value={filters.state[0] ?? ''}
              onChange={e => setFilters(f => ({ ...f, state: e.target.value ? [e.target.value] : [] }))}
            >
              <option value="">All States</option>
              {Object.entries(US_STATES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          {/* Module */}
          <FilterGroup label="EvidLY Module">
            {Object.entries(MODULE_LABELS).slice(0, 6).map(([key, label]) => (
              <FilterChip
                key={key}
                label={label}
                active={filters.matched_module.includes(key)}
                onClick={() => setFilters(f => ({ ...f, matched_module: toggleArray(f.matched_module, key) }))}
              />
            ))}
          </FilterGroup>

          {/* NAICS Code */}
          <div>
            <label className="text-xs font-medium mb-1 block text-[#6B7F96]">NAICS Code</label>
            <select
              className="w-full text-sm px-3 py-1.5 rounded-xl border border-[#D1D9E6] text-[#0B1628] focus:outline-none"
              value={filters.naics_code}
              onChange={e => setFilters(f => ({ ...f, naics_code: e.target.value }))}
            >
              <option value="">All NAICS</option>
              {Object.entries(EVIDLY_NAICS_CODES).map(([code, label]) => (
                <option key={code} value={code}>{code} — {label}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-xs font-medium mb-1 block text-[#6B7F96]">Due Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 text-xs px-2 py-1.5 rounded-xl border border-[#D1D9E6] text-[#0B1628] focus:outline-none"
                value={filters.date_from ?? ''}
                onChange={e => setFilters(f => ({ ...f, date_from: e.target.value || null }))}
              />
              <input
                type="date"
                className="flex-1 text-xs px-2 py-1.5 rounded-xl border border-[#D1D9E6] text-[#0B1628] focus:outline-none"
                value={filters.date_to ?? ''}
                onChange={e => setFilters(f => ({ ...f, date_to: e.target.value || null }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block text-[#6B7F96]">{label}</label>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick, dotColor }: {
  label: string;
  active: boolean;
  onClick: () => void;
  dotColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded-full border transition-all ${
        active
          ? 'border-navy bg-navy/[0.07] text-navy'
          : 'border-[#D1D9E6] bg-transparent text-[#3D5068]'
      }`}
    >
      {dotColor && (
        <span
          className="inline-block w-2 h-2 rounded-full mr-1"
          style={{ background: dotColor }}
        />
      )}
      {label}
    </button>
  );
}

// ── RFP Card ─────────────────────────────────────────────────

function RfpCard({ item, onSelect, onAction }: {
  item: RfpListingWithDetails;
  onSelect: () => void;
  onAction: (action: RfpActionType) => void;
}) {
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const cls = item.classification;
  const tier = cls ? TIER_COLORS[cls.relevance_tier] : null;
  const days = daysUntil(item.due_date);
  const isUrgent = days !== null && days >= 0 && days <= 7;
  const setAside = item.set_aside_type ? SET_ASIDE_LABELS[item.set_aside_type] : null;
  const isVeteran = item.set_aside_type === 'veteran' || item.set_aside_type === 'sdvosb';
  const lastAction = item.actions?.[0];

  return (
    <div
      className={`rounded-xl border p-4 transition-shadow hover:shadow-md cursor-pointer bg-white ${
        isVeteran ? 'border-gold' : 'border-[#D1D9E6]'
      }`}
      onClick={onSelect}
    >
      {/* Top row: score + title */}
      <div className="flex items-start gap-3 mb-2">
        {cls && tier && (
          <div
            className="flex-shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center"
            style={{ background: tier.bg }}
          >
            <span className="text-lg font-bold leading-none" style={{ color: tier.text }}>
              {cls.relevance_score}
            </span>
            <span className="text-xs" style={{ color: tier.text }}>{tier.label}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-tight mb-1 text-[#0B1628]">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap text-xs text-[#3D5068]">
            <span>{item.issuing_entity}</span>
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-navy/[0.07] text-navy">
              {ENTITY_LABELS[item.entity_type] ?? item.entity_type}
            </span>
            {item.state && (
              <span className="flex items-center gap-0.5">
                <MapPin size={10} />
                {US_STATES[item.state] ?? item.state}
                {item.city && `, ${item.city}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Module pills */}
      {cls && cls.matched_modules.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {cls.matched_modules.map(mod => (
            <span
              key={mod}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-gold/[0.09] text-gold"
            >
              {MODULE_LABELS[mod] ?? mod}
            </span>
          ))}
        </div>
      )}

      {/* Meta row: set-aside, due date, value */}
      <div className="flex items-center gap-3 flex-wrap text-xs mb-2 text-[#3D5068]">
        {setAside && (
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
              isVeteran ? 'bg-gold/[0.09] text-gold' : 'bg-navy/[0.07] text-navy'
            }`}
          >
            {setAside.icon} {setAside.label}
          </span>
        )}
        {days !== null && (
          <span
            className={`flex items-center gap-1 ${isUrgent ? 'text-[#dc2626]' : 'text-[#3D5068]'}`}
          >
            <Calendar size={12} />
            {days < 0 ? 'Expired' : days === 0 ? 'Due today' : `${days}d left`}
            {isUrgent && days > 0 && ' ⚡'}
          </span>
        )}
        {item.estimated_value != null && (
          <span className="flex items-center gap-1">
            <DollarSign size={12} />
            {formatCurrency(item.estimated_value)}
          </span>
        )}
        {item.naics_code && (
          <span className="opacity-60">NAICS {item.naics_code}</span>
        )}
        {lastAction && (
          <span
            className="px-2 py-0.5 rounded-full font-medium"
            style={{
              background: lastAction.action === 'pursuing' ? '#dbeafe' :
                lastAction.action === 'won' ? '#dcfce7' :
                lastAction.action === 'lost' ? '#fef2f2' : '#f1f5f9',
              color: lastAction.action === 'pursuing' ? '#2563eb' :
                lastAction.action === 'won' ? '#16a34a' :
                lastAction.action === 'lost' ? '#dc2626' : '#64748b',
            }}
          >
            {lastAction.action}
          </span>
        )}
      </div>

      {/* AI Reasoning (truncated) */}
      {cls?.ai_reasoning && (
        <div className="mb-3">
          <p className="text-xs leading-relaxed text-[#6B7F96]">
            {reasoningExpanded ? cls.ai_reasoning : truncate(cls.ai_reasoning, 160)}
          </p>
          {cls.ai_reasoning.length > 160 && (
            <button
              onClick={e => { e.stopPropagation(); setReasoningExpanded(!reasoningExpanded); }}
              className="text-xs mt-0.5 hover:underline text-navy"
            >
              {reasoningExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t border-[#D1D9E6] pt-3">
        <button
          onClick={e => { e.stopPropagation(); onAction('pursuing'); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors bg-navy hover:bg-navy-light"
        >
          <CheckCircle2 size={12} /> Pursue
        </button>
        <button
          onClick={e => { e.stopPropagation(); onAction('watching'); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D1D9E6] text-[#3D5068] transition-colors hover:bg-cream"
        >
          <Eye size={12} /> Watch
        </button>
        <button
          onClick={e => { e.stopPropagation(); onAction('declined'); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D1D9E6] text-[#6B7F96] transition-colors hover:bg-cream"
        >
          <XCircle size={12} /> Skip
        </button>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="ml-auto flex items-center gap-1 text-xs hover:underline text-navy"
          >
            <ExternalLink size={12} /> View RFP
          </a>
        )}
      </div>
    </div>
  );
}

// ── RFP Table View ───────────────────────────────────────────

function RfpTableView({ items, onSelect, onAction }: {
  items: RfpListingWithDetails[];
  onSelect: (id: string) => void;
  onAction: (rfpId: string, action: RfpActionType) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#D1D9E6]">
      <table className="w-full text-sm bg-white">
        <thead>
          <tr className="bg-[#F4F6FA]">
            <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Score</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Title</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Entity</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">State</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Modules</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Due</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Value</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Set-Aside</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const cls = item.classification;
            const tier = cls ? TIER_COLORS[cls.relevance_tier] : null;
            const days = daysUntil(item.due_date);
            const isUrgent = days !== null && days >= 0 && days <= 7;
            const setAside = item.set_aside_type ? SET_ASIDE_LABELS[item.set_aside_type] : null;

            return (
              <tr
                key={item.id}
                className="border-t border-[#D1D9E6] cursor-pointer hover:bg-cream transition-colors"
                onClick={() => onSelect(item.id)}
              >
                <td className="px-4 py-3">
                  {cls && tier && (
                    <span
                      className="inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold"
                      style={{ background: tier.bg, color: tier.text }}
                    >
                      {cls.relevance_score}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-[240px]">
                  <span className="font-medium block truncate text-[#0B1628]">{item.title}</span>
                </td>
                <td className="px-4 py-3 text-xs text-[#3D5068]">
                  <span className="block truncate max-w-[140px]">{item.issuing_entity}</span>
                  <span className="inline-block px-1.5 py-0.5 rounded text-xs mt-0.5 bg-navy/[0.07] text-navy">
                    {ENTITY_LABELS[item.entity_type] ?? item.entity_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[#3D5068]">
                  {item.state ? (US_STATES[item.state] ?? item.state) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-[160px]">
                    {(cls?.matched_modules ?? []).slice(0, 3).map(mod => (
                      <span key={mod} className="px-1.5 py-0.5 rounded text-xs bg-gold/[0.09] text-gold">
                        {MODULE_LABELS[mod] ?? mod}
                      </span>
                    ))}
                    {(cls?.matched_modules?.length ?? 0) > 3 && (
                      <span className="text-xs text-[#6B7F96]">+{cls!.matched_modules.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-3 text-xs whitespace-nowrap ${isUrgent ? 'text-[#dc2626]' : 'text-[#3D5068]'}`}>
                  {days != null ? (days < 0 ? 'Expired' : `${days}d`) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-[#3D5068]">
                  {formatCurrency(item.estimated_value)}
                </td>
                <td className="px-4 py-3 text-xs">
                  {setAside ? (
                    <span>{setAside.icon} {setAside.label}</span>
                  ) : (
                    <span className="text-[#6B7F96]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onAction(item.id, 'pursuing')}
                      className="p-1.5 rounded hover:bg-green-50 text-[#16a34a]"
                      title="Pursue"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                    <button
                      onClick={() => onAction(item.id, 'watching')}
                      className="p-1.5 rounded hover:bg-blue-50 text-[#2563eb]"
                      title="Watch"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => onAction(item.id, 'declined')}
                      className="p-1.5 rounded hover:bg-red-50 text-[#dc2626]"
                      title="Skip"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-12 text-center text-sm text-[#6B7F96]">
                No RFPs match your filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Detail Panel ─────────────────────────────────────────────

function DetailPanel({ item, onClose, onAction }: {
  item: RfpListingWithDetails;
  onClose: () => void;
  onAction: (action: RfpActionType, notes?: string) => void;
}) {
  const [notes, setNotes] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const cls = item.classification;
  const tier = cls ? TIER_COLORS[cls.relevance_tier] : null;
  const days = daysUntil(item.due_date);
  const setAside = item.set_aside_type ? SET_ASIDE_LABELS[item.set_aside_type] : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-lg h-full overflow-y-auto shadow-xl border-l border-[#D1D9E6] bg-white">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-navy bg-[#0B1628]">
          <h2 className="text-sm font-semibold text-white truncate pr-4">{item.title}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Score + tier */}
          {cls && tier && (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center" style={{ background: tier.bg }}>
                <span className="text-2xl font-bold tracking-tight leading-none" style={{ color: tier.text }}>{cls.relevance_score}</span>
                <span className="text-xs" style={{ color: tier.text }}>{tier.label}</span>
              </div>
              <div>
                <div className="text-sm font-medium text-[#0B1628]">{item.issuing_entity}</div>
                <div className="text-xs flex items-center gap-2 text-[#3D5068]">
                  <span className="px-1.5 py-0.5 rounded bg-navy/[0.07] text-navy">
                    {ENTITY_LABELS[item.entity_type]}
                  </span>
                  {item.state && <span><MapPin size={10} className="inline" /> {US_STATES[item.state] ?? item.state}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs text-[#3D5068]">
            <div>
              <span className="block font-medium text-[#6B7F96]">Posted</span>
              {formatDate(item.posted_date)}
            </div>
            <div>
              <span className="block font-medium text-[#6B7F96]">Due Date</span>
              <span className={days !== null && days <= 7 && days >= 0 ? 'text-[#dc2626]' : 'text-[#3D5068]'}>
                {formatDate(item.due_date)}
                {days !== null && ` (${days < 0 ? 'expired' : `${days}d`})`}
              </span>
            </div>
            <div>
              <span className="block font-medium text-[#6B7F96]">Estimated Value</span>
              {formatCurrency(item.estimated_value)}
            </div>
            <div>
              <span className="block font-medium text-[#6B7F96]">NAICS Code</span>
              {item.naics_code ? `${item.naics_code} — ${EVIDLY_NAICS_CODES[item.naics_code] ?? ''}` : '—'}
            </div>
            {setAside && (
              <div className="col-span-2">
                <span className="block font-medium text-[#6B7F96]">Set-Aside</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full mt-0.5 bg-gold/[0.09] text-gold">
                  {setAside.icon} {setAside.label}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <h4 className="text-xs font-semibold mb-1 text-[#0B1628]">Description</h4>
              <p className="text-xs leading-relaxed text-[#3D5068]">{item.description}</p>
            </div>
          )}

          {/* Modules */}
          {cls && cls.matched_modules.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-1 text-[#0B1628]">Matched EvidLY Modules</h4>
              <div className="flex flex-wrap gap-1">
                {cls.matched_modules.map(mod => (
                  <span key={mod} className="px-2 py-1 rounded-full text-xs bg-gold/[0.09] text-gold">
                    {MODULE_LABELS[mod] ?? mod}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {cls && cls.matched_keywords.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-1 text-[#0B1628]">Matched Keywords</h4>
              <div className="flex flex-wrap gap-1">
                {cls.matched_keywords.map(kw => (
                  <span key={kw} className="px-2 py-0.5 rounded text-xs border border-[#D1D9E6] text-[#3D5068]">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Reasoning */}
          {cls?.ai_reasoning && (
            <div>
              <h4 className="text-xs font-semibold mb-1 text-[#0B1628]">AI Analysis</h4>
              <p className="text-xs leading-relaxed p-3 rounded-lg bg-[#F4F6FA] text-[#3D5068]">
                {cls.ai_reasoning}
              </p>
            </div>
          )}

          {/* Competition Notes */}
          {cls?.competition_notes && (
            <div>
              <h4 className="text-xs font-semibold mb-1 text-[#0B1628]">Competitive Landscape</h4>
              <p className="text-xs leading-relaxed text-[#3D5068]">{cls.competition_notes}</p>
            </div>
          )}

          {/* Action History */}
          {item.actions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-2 text-[#0B1628]">Action History</h4>
              <div className="space-y-2">
                {item.actions.map(act => (
                  <div key={act.id} className="flex items-start gap-2 text-xs">
                    <span className="w-2 h-2 mt-1 rounded-full flex-shrink-0 bg-navy" />
                    <div>
                      <span className="font-medium capitalize text-[#0B1628]">{act.action}</span>
                      {act.notes && <span className="text-[#3D5068]"> — {act.notes}</span>}
                      <span className="block text-xs text-[#6B7F96]">
                        {formatDateShort(act.created_at)} by {act.created_by ?? 'admin'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes + Actions */}
          <div className="border-t border-[#D1D9E6] pt-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#6B7F96]">Notes</label>
              <AIAssistButton
                fieldLabel="Notes"
                context={{ rfpTitle: item.title }}
                currentValue={notes}
                onGenerated={(text) => { setNotes(text); setAiFields(prev => new Set(prev).add('notes')); }}
              />
            </div>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('notes'); return n; }); }}
              placeholder="Add notes about this RFP…"
              className="w-full text-sm p-3 rounded-xl border border-[#D1D9E6] text-[#0B1628] mb-1 resize-none"
              rows={3}
            />
            {aiFields.has('notes') && <AIGeneratedIndicator />}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { onAction('pursuing', notes); setNotes(''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-navy"
              >
                <CheckCircle2 size={14} /> Pursue
              </button>
              <button
                onClick={() => { onAction('watching', notes); setNotes(''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-[#D1D9E6] text-[#3D5068]"
              >
                <Eye size={14} /> Watch
              </button>
              <button
                onClick={() => { onAction('won', notes); setNotes(''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-[#bbf7d0] text-[#16a34a] bg-[#f0fdf4]"
              >
                <Trophy size={14} /> Won
              </button>
              <button
                onClick={() => { onAction('lost', notes); setNotes(''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-[#fecaca] text-[#dc2626] bg-[#fef2f2]"
              >
                <XCircle size={14} /> Lost
              </button>
              <button
                onClick={() => { onAction('declined', notes); setNotes(''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-[#D1D9E6] text-[#6B7F96]"
              >
                Skip
              </button>
            </div>
          </div>

          {/* External link */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm hover:underline text-navy"
            >
              <ExternalLink size={14} /> View Original RFP
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Analytics Tab ────────────────────────────────────────────

function AnalyticsTab({ listings }: { listings: RfpListingWithDetails[] }) {
  // Tier distribution
  const tierData = useMemo(() => {
    const counts: Record<string, number> = { high: 0, medium: 0, low: 0, irrelevant: 0 };
    for (const item of listings) {
      const tier = item.classification?.relevance_tier;
      if (tier && counts[tier] !== undefined) counts[tier]++;
    }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: TIER_COLORS[name as RfpRelevanceTier].label, value }));
  }, [listings]);

  // By state (top 10)
  const stateData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of listings) {
      if (item.state) counts[item.state] = (counts[item.state] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([state, count]) => ({ state, count }));
  }, [listings]);

  // By entity type
  const entityData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of listings) {
      const label = ENTITY_LABELS[item.entity_type] ?? item.entity_type;
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [listings]);

  // By module
  const moduleData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of listings) {
      for (const mod of item.classification?.matched_modules ?? []) {
        const label = MODULE_LABELS[mod] ?? mod;
        counts[label] = (counts[label] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
  }, [listings]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Relevance Distribution */}
      <div className="rounded-xl border border-[#D1D9E6] p-4 bg-white">
        <h3 className="text-sm font-semibold mb-3 text-[#0B1628]">Relevance Distribution</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={tierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {tierData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* By State */}
      <div className="rounded-xl border border-[#D1D9E6] p-4 bg-white">
        <h3 className="text-sm font-semibold mb-3 text-[#0B1628]">RFPs by State (Top 10)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stateData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7F96' }} />
            <YAxis dataKey="state" type="category" width={30} tick={{ fontSize: 11, fill: '#3D5068' }} />
            <Tooltip />
            <Bar dataKey="count" fill="#1E2D4D" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By Entity Type */}
      <div className="rounded-xl border border-[#D1D9E6] p-4 bg-white">
        <h3 className="text-sm font-semibold mb-3 text-[#0B1628]">RFPs by Entity Type</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={entityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#3D5068' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7F96' }} />
            <Tooltip />
            <Bar dataKey="count" fill="#A08C5A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By Module */}
      <div className="rounded-xl border border-[#D1D9E6] p-4 bg-white">
        <h3 className="text-sm font-semibold mb-3 text-[#0B1628]">RFPs by EvidLY Module</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={moduleData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7F96' }} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#3D5068' }} />
            <Tooltip />
            <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Keywords cloud */}
      <div className="rounded-xl border border-[#D1D9E6] p-4 lg:col-span-2 bg-white">
        <h3 className="text-sm font-semibold mb-3 text-[#0B1628]">Trending Keywords</h3>
        <KeywordCloud listings={listings} />
      </div>
    </div>
  );
}

function KeywordCloud({ listings }: { listings: RfpListingWithDetails[] }) {
  const keywords = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of listings) {
      for (const kw of item.classification?.matched_keywords ?? []) {
        const lower = kw.toLowerCase();
        counts[lower] = (counts[lower] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30)
      .map(([word, count]) => ({ word, count }));
  }, [listings]);

  const maxCount = Math.max(...keywords.map(k => k.count), 1);

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map(({ word, count }) => {
        const ratio = count / maxCount;
        const size = 11 + ratio * 5;
        const opacity = 0.5 + ratio * 0.5;
        return (
          <span
            key={word}
            className="px-2 py-1 rounded-full border border-[#D1D9E6] text-[#3D5068]"
            style={{ fontSize: `${size}px`, opacity }}
          >
            {word}
            <span className="ml-1 text-xs text-[#6B7F96]">{count}</span>
          </span>
        );
      })}
      {keywords.length === 0 && (
        <span className="text-sm text-[#6B7F96]">No keyword data available</span>
      )}
    </div>
  );
}

// ── Sources Tab ──────────────────────────────────────────────

function SourcesTab({ sources }: { sources: RfpSource[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return sources;
    const q = search.toLowerCase();
    return sources.filter(
      s => s.name.toLowerCase().includes(q) ||
           s.url.toLowerCase().includes(q) ||
           (s.states_covered ?? []).some(st => st.toLowerCase().includes(q)),
    );
  }, [sources, search]);

  const statusDot = (status: string) => {
    const colors: Record<string, string> = { active: '#22c55e', paused: '#f59e0b', error: '#ef4444' };
    return colors[status] ?? '#94a3b8';
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7F96]" />
        <input
          type="text"
          placeholder="Search sources…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[#D1D9E6] text-[#0B1628] bg-white focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D1D9E6]">
        <table className="w-full text-sm bg-white">
          <thead>
            <tr className="bg-[#F4F6FA]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Source</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Coverage</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Frequency</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7F96]">Last Crawled</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(src => (
              <tr key={src.id} className="border-t border-[#D1D9E6]">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: statusDot(src.status) }} />
                    <span className="capitalize">{src.status}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium block text-[#0B1628]">{src.name}</span>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline text-navy">
                    {src.url}
                  </a>
                </td>
                <td className="px-4 py-3 text-xs capitalize text-[#3D5068]">{src.source_type}</td>
                <td className="px-4 py-3 text-xs text-[#3D5068]">
                  {src.coverage === 'national' ? 'National' : (src.states_covered ?? []).join(', ')}
                </td>
                <td className="px-4 py-3 text-xs capitalize text-[#3D5068]">{src.crawl_frequency}</td>
                <td className="px-4 py-3 text-xs text-[#6B7F96]">
                  {src.last_crawled_at ? formatDateShort(src.last_crawled_at) : 'Never'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#6B7F96]">
                  No sources match your search
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-right text-[#6B7F96]">
        {sources.filter(s => s.status === 'active').length} active / {sources.length} total sources
      </div>
    </div>
  );
}

// ── Cost Tab ─────────────────────────────────────────────────

function CostTab({ stats }: { stats: RfpDashboardStats }) {
  const budgetPct = Math.min(100, (stats.estimated_cost_this_month / 100) * 100);

  return (
    <div className="space-y-4">
      <StatCardRow cards={[
        { label: 'CLASSIFICATIONS THIS MONTH', value: stats.classifications_this_month },
        { label: 'TOKENS USED', value: stats.tokens_this_month.toLocaleString() },
        { label: 'ESTIMATED COST', value: `$${stats.estimated_cost_this_month.toFixed(2)}`, valueColor: 'gold' },
        { label: 'BUDGET REMAINING', value: `$${stats.budget_remaining.toFixed(2)}`, valueColor: 'green' },
      ]} />

      {/* Budget bar */}
      <div className="rounded-xl border border-[#D1D9E6] p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[#0B1628]">Monthly Budget ($100.00)</h3>
          <span className="text-xs text-[#6B7F96]">{budgetPct.toFixed(1)}% used</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden bg-[#F4F6FA]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${budgetPct}%`,
              background: budgetPct > 80 ? '#dc2626' : budgetPct > 50 ? '#d97706' : '#22c55e',
            }}
          />
        </div>
        <p className="text-xs mt-2 text-[#6B7F96]">
          Classification pauses automatically when the monthly budget is reached.
          Cost is estimated at Sonnet pricing (~$3/$15 per MTok input/output).
        </p>
      </div>

      {/* Cost breakdown */}
      <div className="rounded-xl border border-[#D1D9E6] p-4 bg-white">
        <h3 className="text-sm font-semibold mb-2 text-[#0B1628]">Cost Management</h3>
        <ul className="space-y-2 text-xs text-[#3D5068]">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0 bg-navy" />
            Pre-filter with NAICS codes and keywords before sending to AI
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0 bg-navy" />
            Rate limit: max 10 classifications per minute
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0 bg-navy" />
            Only store classifications with relevance score &ge; 25
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0 bg-navy" />
            Budget cap: $100/month — classifications pause when reached
          </li>
        </ul>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function RfpIntelligence() {
  useDemoGuard();
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();

  const {
    listings,
    filteredListings,
    stats,
    sources,
    filters,
    setFilters,
    resetFilters,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    selectedRfpId,
    setSelectedRfpId,
    loading,
    handleAction,
    runCrawl,
    runClassify,
  } = useRfpIntelligence();

  const selectedRfp = useMemo(
    () => listings.find(l => l.id === selectedRfpId) ?? null,
    [listings, selectedRfpId],
  );

  // Access guard
  if (!isEvidlyAdmin && !isDemoMode) {
    return <Navigate to="/dashboard" replace />;
  }

  const tabs: { key: RfpTab; label: string; icon: React.ElementType }[] = [
    { key: 'feed', label: 'Feed', icon: FileSearch },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'sources', label: 'Sources', icon: Database },
    { key: 'cost', label: 'Cost', icon: Coins },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <AdminBreadcrumb crumbs={[{ label: 'RFP Monitor' }]} />
      </div>
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-[#0B1628]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gold/[0.12]">
              <FileSearch size={20} className="text-gold" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">RFP Intelligence Monitor</h1>
              <p className="text-xs text-white/50">Government procurement opportunity discovery &amp; AI classification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runCrawl}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white border border-white/20 hover:bg-white/10 transition-colors"
            >
              <Play size={14} /> Run Crawl
            </button>
            <button
              onClick={runClassify}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white border border-white/20 hover:bg-white/10 transition-colors"
            >
              <Cpu size={14} /> Classify
            </button>
          </div>
        </div>
      </div>

      {/* Demo banner */}
      {isDemoMode && (
        <div className="px-4 sm:px-6 py-2 text-xs text-center bg-gold/[0.09] text-gold">
          Demo Mode — Showing sample RFP data. Crawl and classification are simulated.
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Summary tiles */}
        <StatCardRow cards={[
          { label: 'TOTAL ACTIVE', value: stats.total_active },
          { label: 'HIGH RELEVANCE', value: stats.high_relevance, valueColor: 'green' },
          { label: 'PURSUING', value: stats.pursuing },
          { label: 'DUE THIS WEEK', value: stats.due_this_week, valueColor: 'warning' },
          { label: 'WON / LOST', value: `${stats.won_count} / ${stats.lost_count}`, valueColor: 'green' },
          { label: 'VETERAN SET-ASIDES', value: stats.veteran_set_asides, valueColor: 'gold' },
        ]} />

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-[#D1D9E6]">
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active ? 'border-navy text-navy' : 'border-transparent text-[#6B7F96]'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-[#6B7F96]" />
            <span className="ml-2 text-sm text-[#6B7F96]">Loading RFP data…</span>
          </div>
        )}

        {/* Tab content */}
        {!loading && activeTab === 'feed' && (
          <div className="space-y-4">
            {/* Filter bar */}
            <FilterBar filters={filters} setFilters={setFilters} resetFilters={resetFilters} />

            {/* View toggle + count */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#3D5068]">
                {filteredListings.length} RFP{filteredListings.length !== 1 ? 's' : ''}
                {filters.search || filters.relevance_tier.length > 0 ? ' (filtered)' : ''}
              </span>
              <div className="flex items-center gap-1 border border-[#D1D9E6] rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'cards' ? 'bg-navy/[0.07] text-navy' : 'bg-transparent text-[#6B7F96]'
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'table' ? 'bg-navy/[0.07] text-navy' : 'bg-transparent text-[#6B7F96]'
                  }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Card or table view */}
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredListings.map(item => (
                  <RfpCard
                    key={item.id}
                    item={item}
                    onSelect={() => setSelectedRfpId(item.id)}
                    onAction={action => handleAction(item.id, action)}
                  />
                ))}
                {filteredListings.length === 0 && (
                  <div className="col-span-2 text-center py-12">
                    <FileSearch size={32} className="mx-auto mb-3 text-[#6B7F96]" />
                    <p className="text-sm text-[#6B7F96]">No RFPs match your current filters</p>
                    <button onClick={resetFilters} className="mt-2 text-sm hover:underline text-navy">
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <RfpTableView
                items={filteredListings}
                onSelect={id => setSelectedRfpId(id)}
                onAction={(rfpId, action) => handleAction(rfpId, action)}
              />
            )}
          </div>
        )}

        {!loading && activeTab === 'analytics' && (
          <AnalyticsTab listings={listings} />
        )}

        {!loading && activeTab === 'sources' && (
          <SourcesTab sources={sources} />
        )}

        {!loading && activeTab === 'cost' && (
          <CostTab stats={stats} />
        )}
      </div>

      {/* Detail panel */}
      {selectedRfp && (
        <DetailPanel
          item={selectedRfp}
          onClose={() => setSelectedRfpId(null)}
          onAction={(action, notes) => {
            handleAction(selectedRfp.id, action, notes);
            setSelectedRfpId(null);
          }}
        />
      )}
    </div>
  );
}
