import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, Shield, Flame, Building2, Calendar, Database, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface JurisdictionDetail {
  id: string;
  county: string;
  city: string | null;
  agency_name: string;
  grading_type: string;
  grading_config: Record<string, any>;
  scoring_type: string;
  scoring_methodology: string | null;
  pass_threshold: number | null;
  warning_threshold: number | null;
  critical_threshold: number | null;
  fire_ahj_name: string | null;
  fire_ahj_type: string | null;
  fire_code_edition: string | null;
  nfpa96_edition: string | null;
  hood_cleaning_default: string | null;
  has_local_amendments: boolean;
  local_amendment_notes: string | null;
  facility_count: number | null;
  data_source_tier: number | null;
  data_source_url: string | null;
  data_version: number | null;
  last_crawled_at: string | null;
  population_rank: number | null;
  notes: string | null;
}

function fromSlug(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function toSlug(county: string): string {
  return county.toLowerCase().replace(/\s+/g, '-');
}

const GRADING_TYPE_LABELS: Record<string, string> = {
  letter_grade: 'Letter Grade (A / B / C)',
  letter_grade_strict: 'Letter Grade — Strict (Only A passes)',
  color_placard: 'Color Placard (Green / Yellow / Red)',
  score_100: 'Numeric Score (0-100)',
  score_negative: 'Negative Scale (deductions from 0)',
  pass_reinspect: 'Pass / Reinspection Required',
  three_tier_rating: 'Three-Tier Rating',
  pass_fail: 'Pass / Fail',
  report_only: 'Report Only (no public grade)',
  score_only: 'Score Only',
  letter_grade_abc: 'Letter Grade (A/B/C)',
  green_yellow_red: 'Color Placard (Green/Yellow/Red)',
  numeric_score_no_letter: 'Numeric Score',
  point_accumulation_tiered: 'Point Accumulation (Tiered)',
  green_yellow_red_numeric: 'Color Placard with Numeric Score',
  inspection_report: 'Inspection Report',
};

const SCORING_TYPE_LABELS: Record<string, string> = {
  weighted_deduction: 'Weighted Deduction',
  heavy_weighted: 'Heavy-Weighted Deduction',
  major_violation_count: 'Major Violation Count',
  negative_scale: 'Negative Scale',
  major_minor_reinspect: 'Major/Minor with Reinspection',
  violation_point_accumulation: 'Violation Point Accumulation',
  pass_fail: 'Pass / Fail',
  report_only: 'Report Only',
  numeric_score: 'Numeric Score',
  violation_report: 'Violation Report',
  color_placard: 'Color Placard',
  color_placard_and_numeric: 'Color Placard & Numeric Score',
  inspection_report: 'Inspection Report',
  point_accumulation: 'Point Accumulation',
};

const FIRE_AHJ_TYPE_LABELS: Record<string, string> = {
  municipal_fire: 'Municipal Fire Department',
  county_fire: 'County Fire Department',
  fire_district: 'Fire Protection District',
  cal_fire_contract: 'CAL FIRE (Contract)',
  state_fire_marshal: 'State Fire Marshal',
  mixed: 'Mixed (Multiple AHJs)',
  tribal_fire: 'Tribal Fire Department',
};

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 — Open Data API',
  2: 'Tier 2 — Portal with Bulk Access',
  3: 'Tier 3 — PDF / Manual Collection',
  4: 'Tier 4 — Inferred from State Framework',
};

function renderGradingConfig(config: Record<string, any>, gradingType: string) {
  // Letter grade: {"A": [90,100], "B": [80,89], ...}
  const letterKeys = ['A', 'B', 'C', 'D', 'F'];
  const hasLetterGrades = letterKeys.some(k => Array.isArray(config[k]));

  if (hasLetterGrades) {
    return (
      <table className="w-full text-sm mt-2">
        <thead>
          <tr className="text-left text-[#1E2D4D]/50 border-b hover:bg-[#1E2D4D]/[0.02] transition-colors">
            <th className="pb-2 font-medium">Grade</th>
            <th className="pb-2 font-medium">Score Range</th>
          </tr>
        </thead>
        <tbody>
          {letterKeys.filter(k => config[k]).map(k => (
            <tr key={k} className="border-b border-gray-100">
              <td className="py-1.5 font-semibold">{k}</td>
              <td className="py-1.5">{config[k][0]} &ndash; {config[k][1]}</td>
            </tr>
          ))}
          {config.fail_below != null && (
            <tr className="text-red-600">
              <td className="py-1.5 font-semibold">Fail</td>
              <td className="py-1.5">Below {config.fail_below}</td>
            </tr>
          )}
          {config.pass_requires && (
            <tr className="text-amber-700">
              <td colSpan={2} className="py-1.5 text-xs">
                Only grade {config.pass_requires} is considered passing
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  // Color placard: {"green": {...}, "yellow": {...}, "red": {...}}
  if (config.green || config.yellow || config.red) {
    const colors = ['green', 'yellow', 'red'].filter(c => config[c]);
    return (
      <div className="space-y-2 mt-2">
        {colors.map(color => {
          const data = config[color];
          const desc = typeof data === 'object'
            ? Object.entries(data).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(', ')
            : String(data);
          return (
            <div key={color} className="flex items-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${
                color === 'green' ? 'bg-green-500' :
                color === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
              }`} />
              <span className="capitalize font-medium">{color}</span>
              <span className="text-[#1E2D4D]/50">{desc}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Negative scale or other
  if (config.perfect != null || config.warning != null) {
    return (
      <div className="text-sm mt-2 space-y-1">
        {config.perfect != null && <p>Perfect score: {config.perfect}</p>}
        {config.warning != null && <p>Warning threshold: {config.warning}</p>}
        {config.critical != null && <p>Critical threshold: {config.critical}</p>}
      </div>
    );
  }

  // Crawl-sourced grading_config with description
  if (config.description) {
    return (
      <div className="text-sm mt-2 space-y-1">
        <p className="text-[#1E2D4D]/70">{config.description}</p>
        {config.letter_grades && (
          <div className="mt-2">
            {Object.entries(config.letter_grades).map(([grade, range]: [string, any]) => (
              <p key={grade} className="text-[#1E2D4D]/80">
                <span className="font-semibold">{grade}</span>: {typeof range === 'string' ? range : JSON.stringify(range)}
              </p>
            ))}
          </div>
        )}
        {config.grade_thresholds && (
          <div className="mt-2">
            {Object.entries(config.grade_thresholds).map(([grade, threshold]: [string, any]) => (
              <p key={grade} className="text-[#1E2D4D]/80">
                <span className="font-semibold">{grade}</span>: {typeof threshold === 'number' ? `${threshold}+` : String(threshold)}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback: show raw config
  if (Object.keys(config).length > 0) {
    return (
      <pre className="text-xs text-[#1E2D4D]/50 mt-2 bg-[#FAF7F0] p-2 rounded overflow-x-auto">
        {JSON.stringify(config, null, 2)}
      </pre>
    );
  }

  return <p className="text-sm text-[#1E2D4D]/50 mt-2">No grading configuration available.</p>;
}

export function CountyCompliance() {
  const { countySlug } = useParams<{ countySlug: string }>();
  const [jurisdiction, setJurisdiction] = useState<JurisdictionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const countyName = countySlug ? fromSlug(countySlug) : '';

  useEffect(() => {
    if (!countyName) return;

    async function fetchData() {
      const { data, error } = await supabase
        .from('jurisdictions')
        .select('*')
        .eq('state', 'CA')
        .eq('is_active', true)
        .ilike('county', countyName)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setJurisdiction(data as JurisdictionDetail);
      }
      setLoading(false);
    }
    fetchData();
  }, [countyName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E2D4D]/30" />
      </div>
    );
  }

  if (notFound) {
    return (
      <>
        <Helmet>
          <title>{countyName} County Food Safety — Not Yet Available | EvidLY</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="min-h-screen bg-[#FAF7F0]">
          <header className="bg-white border-b border-[#1E2D4D]/10">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <Link to="/" className="text-sm font-semibold tracking-wide" style={{ color: '#1E2D4D' }}>EvidLY</Link>
            </div>
          </header>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-2">
              {countyName} County isn't covered yet
            </h1>
            <p className="text-[#1E2D4D]/70 mb-6 max-w-md mx-auto">
              We're expanding our jurisdiction coverage across California. Sign up to be notified when {countyName} County data becomes available.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/compliance/california" className="px-5 py-2 rounded-lg text-sm font-medium border border-[#1E2D4D]/15 text-[#1E2D4D]/80 hover:bg-gray-50">
                Browse All Counties
              </Link>
              <Link to="/signup" className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1E2D4D' }}>
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const j = jurisdiction!;
  const slug = toSlug(j.county);

  return (
    <>
      <Helmet>
        <title>{j.county} County Food Safety Requirements | EvidLY</title>
        <meta name="description" content={`Food safety inspection grading, scoring methodology, and facility safety AHJ for ${j.county} County, California. ${j.agency_name}.`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://evidly.com/compliance/california/${slug}`} />
        <meta property="og:title" content={`${j.county} County Food Safety Requirements | EvidLY`} />
        <meta property="og:description" content={`Grading system, scoring methodology, and facility safety authority for ${j.county} County, CA.`} />
        <meta property="og:url" content={`https://evidly.com/compliance/california/${slug}`} />
      </Helmet>

      <div className="min-h-screen bg-[#FAF7F0]">
        {/* Header */}
        <header className="bg-white border-b border-[#1E2D4D]/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/" className="text-sm font-semibold tracking-wide" style={{ color: '#1E2D4D' }}>EvidLY</Link>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-[#1E2D4D]/50 mb-6 flex items-center gap-1 flex-wrap">
            <Link to="/" className="hover:text-gray-700">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/compliance/california" className="hover:text-gray-700">California</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900 font-medium">{j.county} County</span>
          </nav>

          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#1E2D4D]">
                  {j.county} County
                  {j.city && <span className="text-xl font-normal text-[#1E2D4D]/50 ml-2">({j.city})</span>}
                </h1>
                <p className="text-lg text-[#1E2D4D]/70 mt-1">{j.agency_name}</p>
              </div>
              {j.data_source_tier && (
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-[#1E2D4D]/70">
                  {TIER_LABELS[j.data_source_tier]}
                </span>
              )}
            </div>
            {j.facility_count && (
              <p className="text-sm text-[#1E2D4D]/50 mt-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {j.facility_count.toLocaleString()} food facilities
              </p>
            )}
          </div>

          <div className="space-y-6">
            {/* Grading System */}
            <section className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5" style={{ color: '#1E2D4D' }} />
                Grading System
              </h2>
              <p className="text-sm text-[#1E2D4D]/80 font-medium">
                {GRADING_TYPE_LABELS[j.grading_type] || j.grading_type}
              </p>
              {renderGradingConfig(j.grading_config || {}, j.grading_type)}
            </section>

            {/* Scoring Methodology */}
            <section className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-3">Scoring Methodology</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#1E2D4D]/50">Method</p>
                  <p className="font-medium text-gray-900">{SCORING_TYPE_LABELS[j.scoring_type] || j.scoring_type}</p>
                </div>
                {j.pass_threshold != null && (
                  <div>
                    <p className="text-[#1E2D4D]/50">Pass Threshold</p>
                    <p className="font-medium text-gray-900">{j.pass_threshold}</p>
                  </div>
                )}
                {j.warning_threshold != null && (
                  <div>
                    <p className="text-[#1E2D4D]/50">Warning Threshold</p>
                    <p className="font-medium text-amber-700">{j.warning_threshold}</p>
                  </div>
                )}
                {j.critical_threshold != null && (
                  <div>
                    <p className="text-[#1E2D4D]/50">Critical Threshold</p>
                    <p className="font-medium text-red-700">{j.critical_threshold}</p>
                  </div>
                )}
              </div>
              {j.scoring_methodology && (
                <p className="text-sm text-[#1E2D4D]/70 mt-4 leading-relaxed">{j.scoring_methodology}</p>
              )}
            </section>

            {/* Facility Safety AHJ */}
            {j.fire_ahj_name && (
              <section className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] flex items-center gap-2 mb-3">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Facility Safety Authority (AHJ)
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#1E2D4D]/50">Authority Having Jurisdiction</p>
                    <p className="font-medium text-gray-900">{j.fire_ahj_name}</p>
                  </div>
                  {j.fire_ahj_type && (
                    <div>
                      <p className="text-[#1E2D4D]/50">Type</p>
                      <p className="font-medium text-gray-900">{FIRE_AHJ_TYPE_LABELS[j.fire_ahj_type] || j.fire_ahj_type}</p>
                    </div>
                  )}
                  {j.fire_code_edition && (
                    <div>
                      <p className="text-[#1E2D4D]/50">Fire Code Edition</p>
                      <p className="font-medium text-gray-900">{j.fire_code_edition}</p>
                    </div>
                  )}
                  {j.nfpa96_edition && (
                    <div>
                      <p className="text-[#1E2D4D]/50">NFPA 96 Edition</p>
                      <p className="font-medium text-gray-900">{j.nfpa96_edition}</p>
                    </div>
                  )}
                  {j.hood_cleaning_default && (
                    <div>
                      <p className="text-[#1E2D4D]/50">Default Hood Cleaning</p>
                      <p className="font-medium text-gray-900 capitalize">{j.hood_cleaning_default}</p>
                    </div>
                  )}
                </div>
                {j.has_local_amendments && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                    <p className="font-medium text-amber-800">Has Local Fire Code Amendments</p>
                    {j.local_amendment_notes && (
                      <p className="text-amber-700 mt-1">{j.local_amendment_notes}</p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Data Freshness */}
            <section className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-[#1E2D4D]/50" />
                Data Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {j.data_source_tier && (
                  <div>
                    <p className="text-[#1E2D4D]/50">Data Source</p>
                    <p className="font-medium text-gray-900">{TIER_LABELS[j.data_source_tier]}</p>
                  </div>
                )}
                {j.data_version != null && (
                  <div>
                    <p className="text-[#1E2D4D]/50">Data Version</p>
                    <p className="font-medium text-gray-900">v{j.data_version}</p>
                  </div>
                )}
                {j.last_crawled_at && (
                  <div>
                    <p className="text-[#1E2D4D]/50">Last Updated</p>
                    <p className="font-medium text-gray-900 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(j.last_crawled_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {j.data_source_url && (
                  <div>
                    <p className="text-[#1E2D4D]/50">Source URL</p>
                    <a
                      href={j.data_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline text-xs break-all"
                    >
                      {j.data_source_url}
                    </a>
                  </div>
                )}
              </div>
              {j.notes && (
                <p className="text-xs text-[#1E2D4D]/50 mt-4 leading-relaxed">{j.notes}</p>
              )}
            </section>
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-xl p-8 text-center" style={{ backgroundColor: '#1E2D4D' }}>
            <Shield className="w-10 h-10 mx-auto mb-3 text-white/80" />
            <h2 className="text-xl font-bold text-white mb-2">
              Stay compliant in {j.county} County
            </h2>
            <p className="text-white/70 mb-6 max-w-lg mx-auto text-sm">
              EvidLY automatically applies {j.county} County's {GRADING_TYPE_LABELS[j.grading_type] || j.grading_type} system
              to your daily operations — checklists, temp logs, and facility safety docs.
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
                style={{ color: '#1E2D4D' }}
              >
                Start Free Trial
              </Link>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-[#1E2D4D]/10 text-center text-sm text-[#1E2D4D]/50 pb-8">
            <p>Data sourced from {j.agency_name} and California Department of Public Health.</p>
            <div className="flex justify-center gap-4 mt-3">
              <Link to="/compliance/california" className="hover:text-gray-700">All CA Counties</Link>
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
