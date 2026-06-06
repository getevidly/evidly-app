import { useState, useCallback } from 'react';
import { FileText, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────

interface ReportCard {
  type: string;
  title: string;
  description: string;
  cornerstone: boolean;
  section: 'food_safety' | 'fire_safety' | 'operations' | 'business';
}

// ── Report definitions ────────────────────────────────────

const REPORT_CARDS: ReportCard[] = [
  // Food Safety
  {
    type: 'client_compliance',
    title: 'Food Safety Compliance Summary',
    description: 'Inspection results, corrective action progress, and documentation evidence for your food safety posture.',
    cornerstone: true,
    section: 'food_safety',
  },
  {
    type: 'client_regulatory',
    title: 'HACCP Plan & Active Managerial Control',
    description: 'HACCP plan status, monitoring evidence from temperature logs, checklists, and CCP checks.',
    cornerstone: true,
    section: 'food_safety',
  },
  {
    type: 'client_temp_log',
    title: 'Temperature Log Summary',
    description: 'Every reading by equipment against its required range — in-range rates, out-of-range corrections, and weekly totals.',
    cornerstone: false,
    section: 'food_safety',
  },
  {
    type: 'client_corrective_action',
    title: 'Corrective Action Record',
    description: 'Every deviation: what was found, what was done, who closed it — with category patterns and closure trail.',
    cornerstone: false,
    section: 'food_safety',
  },
  {
    type: 'client_checklist',
    title: 'Checklist Completion Record',
    description: 'Opening, closing, and food safety checklists — completion rates, most-failed items, and sign-off record.',
    cornerstone: false,
    section: 'food_safety',
  },
  {
    type: 'client_inspection_history',
    title: 'County Inspection History',
    description: 'Every county evaluation on record, displayed exactly as the county produced it — no restating, no rescoring.',
    cornerstone: false,
    section: 'food_safety',
  },
  {
    type: 'client_training',
    title: 'Training & Certification Record',
    description: 'Food handler cards, manager certification, and policy training — expiring credentials and current roster.',
    cornerstone: false,
    section: 'food_safety',
  },
  // Fire Safety
  {
    type: 'client_insurance',
    title: 'PSE Compliance Summary',
    description: 'Protective safeguard evaluation — hood cleaning, fire suppression, alarm, and sprinkler service records.',
    cornerstone: true,
    section: 'fire_safety',
  },
  {
    type: 'client_exhaust_history',
    title: 'Exhaust System Service History',
    description: 'Hood, duct, and fan cleanings against the required interval — certification trail and conditions noted.',
    cornerstone: false,
    section: 'fire_safety',
  },
  {
    type: 'client_suppression',
    title: 'Suppression & Extinguisher Record',
    description: 'Semiannual suppression service and extinguisher maintenance — service horizon, findings, and tag record.',
    cornerstone: false,
    section: 'fire_safety',
  },
  {
    type: 'client_fire_schedule',
    title: 'Fire Safeguard Schedule',
    description: 'Every required fire service, its interval, and who performs it — twelve-month calendar and on-time history.',
    cornerstone: false,
    section: 'fire_safety',
  },
  {
    type: 'client_fire_documentation',
    title: 'Fire Documentation Status',
    description: 'Certificates, tags, and reports the fire authority can ask for — expiration tracking and document inventory.',
    cornerstone: false,
    section: 'fire_safety',
  },
  {
    type: 'client_vendor',
    title: 'Vendor Performance Report',
    description: 'Vendor service history, response cadence, and service record completeness.',
    cornerstone: false,
    section: 'fire_safety',
  },
  // Operations
  {
    type: 'ops_incident',
    title: 'Incident & Corrective Action Summary',
    description: 'Incident log trends, corrective action resolution rates, and open item aging.',
    cornerstone: false,
    section: 'operations',
  },
  // Business
  {
    type: 'client_executive',
    title: 'Insurance Package',
    description: 'Composed package of inspection results, HACCP plans, and safeguard records for carrier evaluation.',
    cornerstone: true,
    section: 'business',
  },
];

const SECTIONS: { key: string; label: string; note?: string }[] = [
  { key: 'food_safety', label: 'Food Safety', note: 'County health department inspection readiness and food safety documentation.' },
  { key: 'fire_safety', label: 'Fire Safety', note: 'Evidence as your fire authority requires it. Never combined with food safety.' },
  { key: 'operations', label: 'Operations' },
  { key: 'business', label: 'Business' },
];

const WAVE1_TYPES = new Set([
  'client_compliance', 'client_regulatory', 'client_insurance', 'client_executive',
  'client_temp_log', 'client_corrective_action', 'client_checklist', 'client_inspection_history', 'client_training',
  'client_exhaust_history', 'client_suppression', 'client_fire_schedule', 'client_fire_documentation',
]);

// ── Main component ────────────────────────────────────────

export function Reports() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const orgId = profile?.organization_id;

  const [generating, setGenerating] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<Record<string, { share_token: string; title: string }>>({});

  const handleGenerate = useCallback(async (reportType: string) => {
    if (!orgId || !user?.id || generating) return;
    setGenerating(reportType);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ report_type: reportType }),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');

      if (json.report?.share_token) {
        setRecentReports(prev => ({
          ...prev,
          [reportType]: { share_token: json.report.share_token, title: json.report.title },
        }));
        toast.success('Report generated');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  }, [orgId, user?.id, generating]);

  const handleView = useCallback((shareToken: string) => {
    navigate(`/reports/view/${shareToken}`);
  }, [navigate]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-[#1E2D4D] rounded-xl px-6 py-5">
        <h1 className="text-white text-xl font-bold">Reports</h1>
        <p className="text-white/70 text-sm mt-1">
          Generate and share compliance reports for your organization.
        </p>
      </div>

      {/* Sections */}
      {SECTIONS.map(section => {
        const cards = REPORT_CARDS.filter(c => c.section === section.key);
        if (cards.length === 0) return null;

        return (
          <div key={section.key}>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-[#1E2D4D] font-bold text-sm uppercase tracking-wide">
                {section.label}
              </h2>
              <div className="flex-1 h-px bg-[#E5E0D8]" />
            </div>
            {section.note && (
              <p className="text-[#1E2D4D]/50 text-xs italic mb-3">{section.note}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {cards.map(card => {
                const isWave1 = WAVE1_TYPES.has(card.type);
                const recent = recentReports[card.type];
                const isGenerating = generating === card.type;

                return (
                  <div
                    key={card.type}
                    className="bg-white rounded-lg border border-[#E5E0D8] overflow-hidden"
                    style={card.cornerstone ? { borderTop: '3px solid #A08C5A' } : undefined}
                  >
                    <div className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[#1E2D4D] font-semibold text-sm">
                            {card.title}
                          </h3>
                          <p className="text-[#1E2D4D]/50 text-xs mt-1 leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {isWave1 ? (
                          <>
                            {recent && (
                              <button
                                onClick={() => handleView(recent.share_token)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-[#E5E0D8] text-[#1E2D4D] hover:bg-[#FAF7F0] transition-colors"
                              >
                                <ExternalLink size={12} /> View
                              </button>
                            )}
                            <button
                              onClick={() => handleGenerate(card.type)}
                              disabled={isGenerating}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1E2D4D] text-white hover:bg-[#162340] transition-colors disabled:opacity-50"
                            >
                              {isGenerating ? (
                                <><Loader2 size={12} className="animate-spin" /> Generating...</>
                              ) : (
                                <><FileText size={12} /> Generate</>
                              )}
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-medium text-[#1E2D4D]/30 uppercase tracking-wide">
                            Coming soon
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Empty state hint when no org */}
      {!orgId && (
        <div className="bg-white rounded-xl border border-[#E5E0D8] p-8 text-center">
          <div className="mx-auto w-[52px] h-[52px] rounded-full bg-[#E6F1FB] flex items-center justify-center mb-4">
            <FileText size={24} className="text-[#185FA5]" />
          </div>
          <h3 className="text-[#1E2D4D] font-bold text-base mb-2">
            Reports require an organization
          </h3>
          <p className="text-[#1E2D4D]/60 text-sm max-w-md mx-auto">
            Complete your organization setup to generate compliance reports.
          </p>
        </div>
      )}
    </div>
  );
}

export default Reports;
