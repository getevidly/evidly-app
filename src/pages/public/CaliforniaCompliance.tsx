import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MapPin, Shield, Flame, Building2, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Jurisdiction {
  id: string;
  county: string;
  city: string | null;
  agency_name: string;
  grading_type: string;
  scoring_type: string;
  facility_count: number | null;
  fire_ahj_name: string | null;
  data_source_tier: number | null;
  population_rank: number | null;
}

const TIER_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: 'Tier 1', description: 'Open Data APIs' },
  2: { label: 'Tier 2', description: 'Portal with Bulk Access' },
  3: { label: 'Tier 3', description: 'PDF / Manual Collection' },
  4: { label: 'Tier 4', description: 'Inferred from State Framework' },
};

const GRADING_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  letter_grade: { label: 'Letter Grade', color: '#1e4d6b', bg: '#e8f4fd' },
  letter_grade_strict: { label: 'Letter Grade (Strict)', color: '#92400e', bg: '#fef3c7' },
  color_placard: { label: 'Color Placard', color: '#166534', bg: '#dcfce7' },
  score_100: { label: 'Score (0-100)', color: '#6b21a8', bg: '#f3e8ff' },
  score_negative: { label: 'Negative Scale', color: '#9f1239', bg: '#ffe4e6' },
  pass_reinspect: { label: 'Pass / Reinspect', color: '#0e7490', bg: '#cffafe' },
  three_tier_rating: { label: 'Three-Tier Rating', color: '#a16207', bg: '#fef9c3' },
  pass_fail: { label: 'Pass / Fail', color: '#374151', bg: '#f3f4f6' },
  report_only: { label: 'Report Only', color: '#6b7280', bg: '#f3f4f6' },
  score_only: { label: 'Score Only', color: '#6b21a8', bg: '#f3e8ff' },
};

function toSlug(county: string): string {
  return county.toLowerCase().replace(/\s+/g, '-');
}

export function CaliforniaCompliance() {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data, error: fetchError } = await supabase
        .from('jurisdictions')
        .select('id, county, city, agency_name, grading_type, scoring_type, facility_count, fire_ahj_name, data_source_tier, population_rank')
        .eq('state', 'CA')
        .eq('is_active', true)
        .order('population_rank', { ascending: true, nullsLast: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setJurisdictions(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Group by tier
  const grouped = jurisdictions.reduce<Record<number, Jurisdiction[]>>((acc, j) => {
    const tier = j.data_source_tier || 4;
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(j);
    return acc;
  }, {});

  const totalFacilities = jurisdictions.reduce((sum, j) => sum + (j.facility_count || 0), 0);

  return (
    <>
      <Helmet>
        <title>California Food Safety Compliance by County | EvidLY</title>
        <meta name="description" content="Food safety inspection requirements for all 58 California counties and 4 independent cities. Grading systems, scoring methods, facility safety AHJ data." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://evidly.com/compliance/california" />
        <meta property="og:title" content="California Food Safety Compliance by County | EvidLY" />
        <meta property="og:description" content="Food safety inspection requirements for all 58 California counties. Grading systems, scoring methods, and facility safety authority data." />
        <meta property="og:url" content="https://evidly.com/compliance/california" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/" className="text-sm font-semibold tracking-wide" style={{ color: '#1e4d6b' }}>
              EvidLY
            </Link>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1">
            <Link to="/" className="hover:text-gray-700">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900 font-medium">California</span>
          </nav>

          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              California Food Safety Compliance by County
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl">
              Every county in California has its own food safety enforcement agency, grading system, and inspection methodology.
              Understanding your local requirements is the first step to passing inspections.
            </p>
            {!loading && (
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {jurisdictions.length} jurisdictions
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {totalFacilities.toLocaleString()} food facilities
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
              <p className="font-medium">Unable to load jurisdiction data</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : (
            <div className="space-y-10">
              {[1, 2, 3, 4].map(tier => {
                const items = grouped[tier];
                if (!items || items.length === 0) return null;
                const tierInfo = TIER_LABELS[tier];
                return (
                  <section key={tier}>
                    <div className="flex items-baseline gap-3 mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">{tierInfo.label}</h2>
                      <span className="text-sm text-gray-500">{tierInfo.description}</span>
                      <span className="text-sm text-gray-400">({items.length})</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map(j => {
                        const badge = GRADING_BADGES[j.grading_type] || GRADING_BADGES.report_only;
                        return (
                          <Link
                            key={j.id}
                            to={`/compliance/california/${toSlug(j.county)}`}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-gray-900 group-hover:text-[#1e4d6b] transition-colors">
                                {j.county} County
                                {j.city && <span className="text-sm font-normal text-gray-500 ml-1">({j.city})</span>}
                              </h3>
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1e4d6b] mt-0.5 flex-shrink-0" />
                            </div>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-1">{j.agency_name}</p>
                            <div className="flex flex-wrap gap-2">
                              <span
                                className="text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{ color: badge.color, backgroundColor: badge.bg }}
                              >
                                {badge.label}
                              </span>
                              {j.facility_count && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {j.facility_count.toLocaleString()}
                                </span>
                              )}
                            </div>
                            {j.fire_ahj_name && (
                              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                <Flame className="w-3 h-3" />
                                {j.fire_ahj_name}
                              </p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* CTA section */}
          <div className="mt-16 rounded-xl p-8 text-center" style={{ backgroundColor: '#1e4d6b' }}>
            <Shield className="w-10 h-10 mx-auto mb-3 text-white/80" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Get compliance monitoring for your kitchen
            </h2>
            <p className="text-white/70 mb-6 max-w-lg mx-auto">
              EvidLY automates food safety checklists, temperature logging, facility safety documentation,
              and vendor compliance — tailored to your county's specific requirements.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                to="/demo"
                className="px-6 py-2.5 rounded-lg font-medium text-sm text-white"
                style={{ backgroundColor: '#d4af37' }}
              >
                Try Free Demo
              </Link>
              <Link
                to="/signup"
                className="px-6 py-2.5 rounded-lg font-medium text-sm bg-white"
                style={{ color: '#1e4d6b' }}
              >
                Start Free Trial
              </Link>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500 pb-8">
            <p>Data sourced from California Department of Public Health and county enforcement agencies.</p>
            <div className="flex justify-center gap-4 mt-3">
              <Link to="/terms" className="hover:text-gray-700">Terms</Link>
              <Link to="/privacy" className="hover:text-gray-700">Privacy</Link>
              <Link to="/" className="hover:text-gray-700">EvidLY.com</Link>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
