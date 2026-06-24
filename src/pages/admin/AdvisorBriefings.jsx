/**
 * AdvisorBriefings — Admin cross-org readiness portfolio
 * Route: /admin/advisor-briefings
 *
 * Shows latest advisor briefing posture per location across ALL orgs.
 * Sorted worst-first (alarm → watch → solid). Filter by org + posture.
 * Food and Fire readiness are ALWAYS separate — never merged.
 *
 * §1731 verbs: reads/identifies/flags. Posture states, not scores.
 *
 * REUSABLE: PostureBadge component is shared with future client-facing view.
 * This page supplies cross-org data; PostureBadge renders the briefing.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import PostureBadge from '../../components/advisor/PostureBadge';

function postureRank(p) {
  if (p === 'alarm') return 0;
  if (p === 'watch') return 1;
  return 2;
}

function worstPosture(food, fire) {
  const postures = [food, fire].filter(Boolean);
  if (postures.includes('alarm')) return 'alarm';
  if (postures.includes('watch')) return 'watch';
  return postures.length > 0 ? 'solid' : null;
}

function relativeTime(dateStr) {
  if (!dateStr) return '—';
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdvisorBriefings() {
  useDemoGuard();
  const [briefings, setBriefings] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orgFilter, setOrgFilter] = useState('');
  const [postureFilter, setPostureFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const [bRes, oRes, lRes] = await Promise.all([
        supabase
          .from('advisor_briefings')
          .select('id, org_id, location_id, advisor_type, posture, open_items, generated_at, valid_until')
          .not('location_id', 'is', null)
          .in('advisor_type', ['food_safety', 'fire_safety'])
          .gt('valid_until', now)
          .order('generated_at', { ascending: false }),
        supabase
          .from('organizations')
          .select('id, name')
          .order('name'),
        supabase
          .from('locations')
          .select('id, name, organization_id')
          .eq('active', true)
          .order('name'),
      ]);

      if (bRes.error) throw bRes.error;
      setBriefings(bRes.data || []);
      setOrgs(oRes.data || []);
      setLocations(lRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load briefing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Dedupe to latest per (location_id, advisor_type), pivot to one row per location
  const rows = useMemo(() => {
    const latest = new Map();
    for (const b of briefings) {
      const key = `${b.location_id}:${b.advisor_type}`;
      if (!latest.has(key)) latest.set(key, b);
    }

    const byLocation = new Map();
    for (const b of latest.values()) {
      if (!byLocation.has(b.location_id)) {
        byLocation.set(b.location_id, { food: null, fire: null });
      }
      const entry = byLocation.get(b.location_id);
      if (b.advisor_type === 'food_safety') entry.food = b;
      if (b.advisor_type === 'fire_safety') entry.fire = b;
    }

    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));
    const locMap = new Map(locations.map((l) => [l.id, { name: l.name, orgId: l.organization_id }]));

    const result = [];
    for (const [locId, { food, fire }] of byLocation) {
      const loc = locMap.get(locId);
      const orgId = loc?.orgId || food?.org_id || fire?.org_id;
      const foodItems = Array.isArray(food?.open_items) ? food.open_items : [];
      const fireItems = Array.isArray(fire?.open_items) ? fire.open_items : [];

      result.push({
        locationId: locId,
        locationName: loc?.name || 'Unknown Location',
        orgId,
        orgName: orgMap.get(orgId) || 'Unknown Org',
        food,
        fire,
        foodItems: foodItems.length,
        fireItems: fireItems.length,
        worst: worstPosture(food?.posture, fire?.posture),
        lastComputed: [food?.generated_at, fire?.generated_at].filter(Boolean).sort().pop() || null,
      });
    }

    result.sort((a, b) => postureRank(a.worst) - postureRank(b.worst));
    return result;
  }, [briefings, orgs, locations]);

  const filteredRows = useMemo(() => {
    let r = rows;
    if (orgFilter) r = r.filter((row) => row.orgId === orgFilter);
    if (postureFilter) r = r.filter((row) =>
      row.food?.posture === postureFilter || row.fire?.posture === postureFilter
    );
    return r;
  }, [rows, orgFilter, postureFilter]);

  const orgOptions = useMemo(() => {
    const ids = new Set(rows.map((r) => r.orgId));
    return orgs.filter((o) => ids.has(o.id));
  }, [rows, orgs]);

  const stats = useMemo(() => {
    const alarm = rows.filter((r) => r.worst === 'alarm').length;
    const watch = rows.filter((r) => r.worst === 'watch').length;
    const solid = rows.filter((r) => r.worst === 'solid').length;
    return { alarm, watch, solid, total: rows.length };
  }, [rows]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-[#1E2D4D] mb-4">Advisor Briefings</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
          <button onClick={load} className="ml-4 underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E2D4D]">Advisor Briefings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cross-org readiness posture — {stats.total} location{stats.total !== 1 ? 's' : ''} across {orgOptions.length} org{orgOptions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Summary strip */}
      <div className="flex gap-4 mb-6">
        {stats.alarm > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm font-semibold text-red-700">{stats.alarm} Alarm</span>
          </div>
        )}
        {stats.watch > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{stats.watch} Watch</span>
          </div>
        )}
        {stats.solid > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">{stats.solid} Solid</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">All Organizations</option>
          {orgOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select
          value={postureFilter}
          onChange={(e) => setPostureFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">All Postures</option>
          <option value="alarm">Alarm</option>
          <option value="watch">Watch</option>
          <option value="solid">Solid</option>
        </select>
        {(orgFilter || postureFilter) && (
          <button
            onClick={() => { setOrgFilter(''); setPostureFilter(''); }}
            className="text-sm text-[#A08C5A] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {rows.length === 0
            ? 'No advisor briefings computed yet.'
            : 'No locations match the current filters.'}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Organization</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Food Readiness</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Fire Readiness</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Open Items</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Last Computed</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.locationId} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-[#1E2D4D]">{row.orgName}</td>
                  <td className="px-4 py-3 text-gray-700">{row.locationName}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <PostureBadge posture={row.food?.posture} size="sm" />
                      {row.foodItems > 0 && (
                        <span className="text-xs text-gray-500">{row.foodItems} item{row.foodItems !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <PostureBadge posture={row.fire?.posture} size="sm" />
                      {row.fireItems > 0 && (
                        <span className="text-xs text-gray-500">{row.fireItems} item{row.fireItems !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(row.foodItems + row.fireItems) > 0 ? (
                      <span className="font-semibold text-[#1E2D4D]">{row.foodItems + row.fireItems}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {relativeTime(row.lastComputed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
