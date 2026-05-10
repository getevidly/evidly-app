/**
 * JurisdictionIntelligence — User-facing page
 *
 * Route: /jurisdiction-intelligence
 * Read-only view of the user's org's jurisdictions and published
 * regulatory updates. No CRUD — admin version handles publish/verify.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Building2, Calendar, ChevronRight, Flame, MapPin, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { usePageTitle } from '../hooks/usePageTitle';

interface JurisdictionInfo {
  id: string;
  county: string;
  city: string | null;
  agency_name: string;
  agency_type: string;
  jurisdiction_type: string;
  scoring_type: string;
  grading_type: string;
  fire_ahj_name: string | null;
  fire_code_edition: string | null;
  hood_cleaning_default: string | null;
}

interface JurisdictionUpdate {
  id: string;
  jurisdiction_key: string;
  jurisdiction_name: string;
  county: string | null;
  pillar: string;
  update_type: string;
  title: string;
  description: string | null;
  effective_date: string | null;
  created_at: string;
}

const PILLAR_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  food_safety: { bg: '#ECFDF5', text: '#065F46', label: 'Food Safety' },
  facility_safety: { bg: '#FFF7ED', text: '#9A3412', label: 'Fire Safety' },
  both: { bg: '#F5F3FF', text: '#5B21B6', label: 'Both' },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function JurisdictionIntelligence() {
  useDemoGuard();
  usePageTitle('Jurisdiction Intelligence');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();

  const [jurisdictions, setJurisdictions] = useState<JurisdictionInfo[]>([]);
  const [updates, setUpdates] = useState<JurisdictionUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;

    const load = async () => {
      // 1. Get the user's org's locations → counties
      const { data: locations } = await supabase
        .from('locations')
        .select('id, county, city')
        .eq('organization_id', profile.organization_id);

      const locationIds = (locations || []).map(l => l.id);
      const counties = [...new Set((locations || []).map(l => l.county).filter(Boolean))];

      if (locationIds.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Get jurisdiction configs linked to these locations
      const { data: links } = await supabase
        .from('location_jurisdictions')
        .select('jurisdiction_id')
        .in('location_id', locationIds);

      const jurisdictionIds = [...new Set((links || []).map(l => l.jurisdiction_id))];

      // 3. Fetch jurisdiction metadata
      let jurisdictionData: JurisdictionInfo[] = [];
      if (jurisdictionIds.length > 0) {
        const { data } = await supabase
          .from('jurisdictions')
          .select('id, county, city, agency_name, agency_type, jurisdiction_type, scoring_type, grading_type, fire_ahj_name, fire_code_edition, hood_cleaning_default')
          .in('id', jurisdictionIds);
        jurisdictionData = data || [];
      }

      // Fallback: if no location_jurisdictions links exist, try matching by county
      if (jurisdictionData.length === 0 && counties.length > 0) {
        const { data } = await supabase
          .from('jurisdictions')
          .select('id, county, city, agency_name, agency_type, jurisdiction_type, scoring_type, grading_type, fire_ahj_name, fire_code_edition, hood_cleaning_default')
          .in('county', counties);
        jurisdictionData = data || [];
      }

      setJurisdictions(jurisdictionData);

      // 4. Fetch published updates for relevant counties
      const relevantCounties = [...new Set(jurisdictionData.map(j => j.county).filter(Boolean))];
      if (relevantCounties.length === 0 && counties.length > 0) {
        relevantCounties.push(...counties);
      }

      if (relevantCounties.length > 0) {
        const { data: updatesData } = await supabase
          .from('jurisdiction_intel_updates')
          .select('id, jurisdiction_key, jurisdiction_name, county, pillar, update_type, title, description, effective_date, created_at')
          .eq('published', true)
          .in('county', relevantCounties)
          .order('created_at', { ascending: false })
          .limit(50);
        setUpdates(updatesData || []);
      }

      setLoading(false);
    };

    load();
  }, [profile?.organization_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#1E4D6B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group jurisdictions by type
  const foodJurisdictions = jurisdictions.filter(j => j.jurisdiction_type === 'food_safety' || j.agency_type === 'county_health');
  const fireJurisdictions = jurisdictions.filter(j => j.jurisdiction_type === 'fire_safety' || j.agency_type === 'fire_marshal' || j.fire_ahj_name);

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D]">Jurisdiction Intelligence</h1>
        <p className="text-sm text-[#1E2D4D]/50 mt-1">
          Your applicable food and fire safety authorities, inspection requirements, and recent regulatory changes.
        </p>
      </div>

      {/* Jurisdiction Cards */}
      {jurisdictions.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8 text-center mb-8">
          <MapPin className="w-8 h-8 text-[#1E2D4D]/20 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1E2D4D]/70 mb-1">No jurisdictions configured</p>
          <p className="text-xs text-[#1E2D4D]/40">
            Jurisdictions are automatically detected from your location addresses. Add a location to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Food Safety Authorities */}
          {foodJurisdictions.map(j => (
            <div key={j.id} className="bg-white rounded-xl border border-[#1E2D4D]/10 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Food Safety — EHD</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-[#1E2D4D] mb-2">{j.agency_name}</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#1E2D4D]/60">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span>{j.county} County{j.city ? `, ${j.city}` : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#1E2D4D]/60">
                  <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                  <span>Scoring: {(j.scoring_type || 'unknown').replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#1E2D4D]/60">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  <span>Grading: {(j.grading_type || 'unknown').replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Fire Safety Authorities */}
          {fireJurisdictions.map(j => (
            <div key={`fire-${j.id}`} className="bg-white rounded-xl border border-[#1E2D4D]/10 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-orange-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Fire Safety — AHJ</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-[#1E2D4D] mb-2">
                {j.fire_ahj_name || j.agency_name}
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#1E2D4D]/60">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span>{j.county} County{j.city ? `, ${j.city}` : ''}</span>
                </div>
                {j.fire_code_edition && (
                  <div className="flex items-center gap-2 text-xs text-[#1E2D4D]/60">
                    <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                    <span>Code: {j.fire_code_edition}</span>
                  </div>
                )}
                {j.hood_cleaning_default && (
                  <div className="flex items-center gap-2 text-xs text-[#1E2D4D]/60">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>Hood cleaning: {j.hood_cleaning_default}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Show deduplicated cards if a jurisdiction covers both pillars and wasn't split */}
          {jurisdictions
            .filter(j => !foodJurisdictions.includes(j) && !fireJurisdictions.includes(j))
            .map(j => (
              <div key={`other-${j.id}`} className="bg-white rounded-xl border border-[#1E2D4D]/10 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                  </div>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                    {(j.jurisdiction_type || 'regulatory').replace(/_/g, ' ')}
                  </p>
                </div>
                <p className="text-sm font-semibold text-[#1E2D4D] mb-2">{j.agency_name}</p>
                <div className="flex items-center gap-2 text-xs text-[#1E2D4D]/60">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span>{j.county} County{j.city ? `, ${j.city}` : ''}</span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Recent Regulatory Updates */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1E2D4D]">Recent Regulatory Updates</h2>
        <button
          onClick={() => navigate('/regulatory-alerts')}
          className="flex items-center gap-1 text-xs font-semibold text-[#1E4D6B] hover:underline cursor-pointer"
        >
          View all updates <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {updates.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8 text-center">
          <Bell className="w-8 h-8 text-[#1E2D4D]/20 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1E2D4D]/70 mb-1">No regulatory updates</p>
          <p className="text-xs text-[#1E2D4D]/40">
            Published regulatory changes for your jurisdictions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map(item => {
            const pc = PILLAR_BADGE[item.pillar] || PILLAR_BADGE.both;
            return (
              <div key={item.id} className="bg-white rounded-xl border border-[#1E2D4D]/10 p-5">
                <div className="flex gap-2 mb-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {item.jurisdiction_name || item.jurisdiction_key}
                  </span>
                  <span
                    style={{ background: pc.bg, color: pc.text }}
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                  >
                    {pc.label}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-[#1E2D4D]/5 text-[#1E2D4D]/70 rounded-full">
                    {item.update_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="font-semibold text-sm mb-1 text-[#1E2D4D]">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-[#1E2D4D]/50 line-clamp-2 mb-2">{item.description}</p>
                )}
                <div className="flex gap-4 text-xs text-[#1E2D4D]/30">
                  {item.county && <span>{item.county} County</span>}
                  {item.effective_date && <span>Effective: {formatDate(item.effective_date)}</span>}
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
