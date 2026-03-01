// ============================================================================
// Public Compliance Assessment Tool — ASSESS-TOOL-1
// Standalone public page (no auth): Lead capture → Questionnaire → Results
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ASSESSMENT_QUESTIONS,
  getVisibleQuestions,
  computeAssessmentScores,
  gradeColor,
  scoreColor,
  formatDollars,
} from '../../lib/assessmentScoring';
import type { AssessmentScores, LeadData, Finding } from '../../lib/assessmentScoring';
import { generateAssessmentPdf } from '../../lib/assessmentPdf';
import { supabase } from '../../lib/supabase';

const NAVY = '#0B1628';
const GOLD = '#A08C5A';
const BRAND = '#1e4d6b';

// ── Gauge Component ───────────────────────────────────────────────────────────

function ScoreGauge({ score, label, size = 100 }: { score: number; label: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score, 100) / 100;
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize="20" fontWeight="700" fill={color}>
          {score}
        </text>
      </svg>
      <span className="text-xs font-medium text-gray-600 text-center">{label}</span>
    </div>
  );
}

// ── Risk Bar ──────────────────────────────────────────────────────────────────

function RiskBar({ label, score, estimate }: { label: string; score: number; estimate: string }) {
  const color = scoreColor(score);
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold" style={{ color: NAVY }}>{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${Math.max(2, score)}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs mt-0.5" style={{ color: GOLD }}>{estimate}</p>
    </div>
  );
}

// ── Severity Badge ────────────────────────────────────────────────────────────

function SeverityDot({ severity }: { severity: Finding['severity'] }) {
  const colors: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8', positive: '#22c55e',
  };
  return <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 mt-0.5 flex-shrink-0" style={{ backgroundColor: colors[severity] || '#94a3b8' }} />;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AssessmentTool() {
  const [searchParams] = useSearchParams();
  const utmRef = searchParams.get('ref') || '';

  // ── State ─────────────────────────────────────────────────
  const [phase, setPhase] = useState<'lead' | 'questions' | 'results'>('lead');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [leadData, setLeadData] = useState<LeadData>({
    businessName: '', contactName: '', email: '', phone: '',
    city: '', zipCode: '', referralSource: '', utmRef,
  });
  const [scores, setScores] = useState<AssessmentScores | null>(null);
  const [resultsTab, setResultsTab] = useState<'diagnosis' | 'prognosis' | 'recommendations'>('diagnosis');
  const [leadErrors, setLeadErrors] = useState<Record<string, string>>({});

  // ── Visible questions ─────────────────────────────────────
  const visibleQuestions = useMemo(
    () => getVisibleQuestions(answers, leadData.zipCode),
    [answers, leadData.zipCode],
  );

  const currentQuestion = visibleQuestions[currentIdx];
  const progressPct = visibleQuestions.length > 0 ? Math.round(((currentIdx) / visibleQuestions.length) * 100) : 0;

  // ── Lead form validation ──────────────────────────────────
  const validateLead = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!leadData.businessName.trim()) errs.businessName = 'Required';
    if (!leadData.contactName.trim()) errs.contactName = 'Required';
    if (!leadData.email.trim()) errs.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) errs.email = 'Invalid email';
    if (!leadData.city.trim()) errs.city = 'Required';
    if (!leadData.zipCode.trim()) errs.zipCode = 'Required';
    else if (!/^\d{5}(-\d{4})?$/.test(leadData.zipCode)) errs.zipCode = 'Invalid zip code';
    setLeadErrors(errs);
    return Object.keys(errs).length === 0;
  }, [leadData]);

  // ── Submit lead ───────────────────────────────────────────
  const handleLeadSubmit = useCallback(async () => {
    if (!validateLead()) return;
    // Insert lead to Supabase (silent fail)
    try {
      await supabase.from('assessment_leads').insert({
        business_name: leadData.businessName,
        contact_name: leadData.contactName,
        email: leadData.email,
        phone: leadData.phone || null,
        city: leadData.city,
        zip_code: leadData.zipCode,
        referral_source: leadData.referralSource || null,
        utm_ref: leadData.utmRef || null,
      });
    } catch { /* silent */ }
    setPhase('questions');
  }, [leadData, validateLead]);

  // ── Answer a question ─────────────────────────────────────
  const handleAnswer = useCallback((value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  }, [currentQuestion]);

  // ── Next / Back ───────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (currentIdx >= visibleQuestions.length - 1) {
      // Compute results
      const computed = computeAssessmentScores(answers, leadData.zipCode);
      setScores(computed);
      setPhase('results');

      // Save responses + results to Supabase (fire-and-forget)
      (async () => {
        try {
          // Find lead ID from the lead we inserted
          const { data: leads } = await supabase.from('assessment_leads')
            .select('id').eq('email', leadData.email)
            .order('created_at', { ascending: false }).limit(1);
          const leadId = leads?.[0]?.id;
          if (!leadId) return;

          // Insert responses
          const responses = Object.entries(answers).map(([qId, val]) => ({
            lead_id: leadId,
            question_id: qId,
            answer_value: val,
            answer_text: ASSESSMENT_QUESTIONS.find(q => q.id === qId)?.options.find(o => o.value === val)?.label || val,
          }));
          await supabase.from('assessment_responses').insert(responses);

          // Insert results
          await supabase.from('assessment_results').insert({
            lead_id: leadId,
            overall_grade: computed.overallGrade,
            facility_safety_score: computed.facilitySafety,
            food_safety_score: computed.foodSafety,
            documentation_score: computed.documentation,
            revenue_risk: computed.revenueRisk,
            liability_risk: computed.liabilityRisk,
            cost_risk: computed.costRisk,
            operational_risk: computed.operationalRisk,
            findings_json: computed.findings,
            risk_drivers_json: computed.riskDrivers,
            estimated_revenue_risk_dollars: (computed.estimates.revenueRiskLow + computed.estimates.revenueRiskHigh) / 2,
            estimated_liability_risk_dollars: (computed.estimates.liabilityRiskLow + computed.estimates.liabilityRiskHigh) / 2,
            estimated_cost_risk_dollars: (computed.estimates.costRiskLow + computed.estimates.costRiskHigh) / 2,
            estimated_operational_risk_days: computed.estimates.operationalDays,
            total_estimated_exposure_low: computed.estimates.totalLow,
            total_estimated_exposure_high: computed.estimates.totalHigh,
          });

          // Notify edge function (fire-and-forget)
          try {
            await supabase.functions.invoke('assessment-notify', {
              body: { leadId, lead: leadData, scores: computed },
            });
          } catch { /* silent */ }
        } catch { /* silent */ }
      })();

      return;
    }
    // Find next visible question
    setCurrentIdx(prev => prev + 1);
  }, [currentIdx, visibleQuestions, answers, leadData]);

  const handleBack = useCallback(() => {
    if (currentIdx > 0) setCurrentIdx(prev => prev - 1);
  }, [currentIdx]);

  // ── Download PDF ──────────────────────────────────────────
  const handleDownloadPdf = useCallback(() => {
    if (!scores) return;
    const doc = generateAssessmentPdf(leadData, scores);
    doc.save(`${leadData.businessName.replace(/\s+/g, '-')}-Compliance-Assessment.pdf`);
  }, [leadData, scores]);

  // ── Section transition label ──────────────────────────────
  const currentSection = currentQuestion?.sectionLabel;
  const prevSection = currentIdx > 0 ? visibleQuestions[currentIdx - 1]?.sectionLabel : null;
  const showSectionHeader = currentSection !== prevSection;

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 text-xl font-bold tracking-tight" style={{ color: NAVY }}>
            <span style={{ color: GOLD }}>E</span>vid<span style={{ color: GOLD }}>LY</span>
          </Link>
          <span className="text-sm text-gray-500">Free Compliance Assessment</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* ── PHASE: LEAD CAPTURE ──────────────────────────────── */}
        {phase === 'lead' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: NAVY }}>
                Free Compliance Risk Assessment
              </h1>
              <p className="text-gray-600 max-w-lg mx-auto">
                Answer a few questions about your operation and get a personalized compliance gap report
                with risk scores and estimated business impact — in under 5 minutes.
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text" value={leadData.businessName} data-demo-allow
                  onChange={e => setLeadData(p => ({ ...p, businessName: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${leadErrors.businessName ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="e.g. Joe's Kitchen"
                />
                {leadErrors.businessName && <p className="text-xs text-red-500 mt-1">{leadErrors.businessName}</p>}
              </div>

              {/* Contact Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                <input
                  type="text" value={leadData.contactName} data-demo-allow
                  onChange={e => setLeadData(p => ({ ...p, contactName: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${leadErrors.contactName ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Your full name"
                />
                {leadErrors.contactName && <p className="text-xs text-red-500 mt-1">{leadErrors.contactName}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email" value={leadData.email} data-demo-allow
                  onChange={e => setLeadData(p => ({ ...p, email: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${leadErrors.email ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="you@company.com"
                />
                {leadErrors.email && <p className="text-xs text-red-500 mt-1">{leadErrors.email}</p>}
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400">(optional)</span></label>
                <input
                  type="tel" value={leadData.phone} data-demo-allow
                  onChange={e => setLeadData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 555-5555"
                />
              </div>

              {/* City + Zip */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text" value={leadData.city} data-demo-allow
                    onChange={e => setLeadData(p => ({ ...p, city: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${leadErrors.city ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="City"
                  />
                  {leadErrors.city && <p className="text-xs text-red-500 mt-1">{leadErrors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                  <input
                    type="text" value={leadData.zipCode} data-demo-allow
                    onChange={e => setLeadData(p => ({ ...p, zipCode: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${leadErrors.zipCode ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="90210"
                  />
                  {leadErrors.zipCode && <p className="text-xs text-red-500 mt-1">{leadErrors.zipCode}</p>}
                </div>
              </div>

              {/* Referral Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">How did you hear about us?</label>
                <select
                  value={leadData.referralSource} data-demo-allow
                  onChange={e => setLeadData(p => ({ ...p, referralSource: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select...</option>
                  <option value="google">Google search</option>
                  <option value="referral">Referral</option>
                  <option value="flyer">Flyer / door hanger</option>
                  <option value="trade_show">Trade show / event</option>
                  <option value="social_media">Social media</option>
                  <option value="cleaning_pros">Cleaning Pros Plus</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button
                onClick={handleLeadSubmit} data-demo-allow
                className="w-full py-3 text-white font-semibold rounded-lg transition-colors"
                style={{ backgroundColor: BRAND }}
                onMouseOver={e => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
                onMouseOut={e => (e.currentTarget.style.backgroundColor = BRAND)}
              >
                Start Assessment
              </button>

              <p className="text-xs text-gray-400 text-center">
                Takes about 3–5 minutes. Your data is kept confidential.
              </p>
            </div>
          </div>
        )}

        {/* ── PHASE: QUESTIONS ─────────────────────────────────── */}
        {phase === 'questions' && currentQuestion && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Question {currentIdx + 1} of {visibleQuestions.length}</span>
                <span>{progressPct}% complete</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%`, backgroundColor: BRAND }}
                />
              </div>
            </div>

            {/* Section header */}
            {showSectionHeader && (
              <div className="mb-4 pb-3 border-b border-gray-100">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: GOLD }}>
                  Section: {currentSection}
                </span>
              </div>
            )}

            {/* Question */}
            <h2 className="text-lg font-semibold mb-5" style={{ color: NAVY }}>
              {currentQuestion.label}
            </h2>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map(opt => {
                const selected = answers[currentQuestion.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    data-demo-allow
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {selected && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                      </div>
                      <span className={`text-sm ${selected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                        {opt.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={currentIdx === 0}
                data-demo-allow
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!answers[currentQuestion.id]}
                data-demo-allow
                className="px-6 py-2 text-sm text-white font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: answers[currentQuestion.id] ? BRAND : '#94a3b8' }}
              >
                {currentIdx >= visibleQuestions.length - 1 ? 'See My Results' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* ── PHASE: RESULTS ───────────────────────────────────── */}
        {phase === 'results' && scores && (
          <div>
            {/* Tab bar */}
            <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              {(['diagnosis', 'prognosis', 'recommendations'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setResultsTab(tab)}
                  data-demo-allow
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    resultsTab === tab
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  style={resultsTab === tab ? { backgroundColor: NAVY } : {}}
                >
                  {tab === 'diagnosis' ? 'The Diagnosis' : tab === 'prognosis' ? 'The Prognosis' : 'Recommendations'}
                </button>
              ))}
            </div>

            {/* ── TAB: DIAGNOSIS ─────────────────────────────── */}
            {resultsTab === 'diagnosis' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <h2 className="text-xl font-bold mb-1" style={{ color: NAVY }}>Compliance Assessment Results</h2>
                <p className="text-sm text-gray-500 mb-6">Prepared for {leadData.businessName}</p>

                {/* Overall Grade */}
                <div className="flex items-center gap-5 mb-8 p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <div
                    className="w-20 h-20 rounded-xl flex items-center justify-center text-white text-3xl font-bold shadow-sm"
                    style={{ backgroundColor: gradeColor(scores.overallGrade) }}
                  >
                    {scores.overallGrade}
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: gradeColor(scores.overallGrade) }}>
                      {scores.overallGrade === 'A' ? 'Low Risk' :
                       scores.overallGrade === 'B' ? 'Moderate Risk' :
                       scores.overallGrade === 'C' ? 'Elevated Risk' :
                       scores.overallGrade === 'D' ? 'High Risk' : 'Critical Risk'}
                    </p>
                    <p className="text-xs text-gray-500">Based on average of Revenue, Liability, Cost, and Operational risk scores</p>
                  </div>
                </div>

                {/* Category Gauges */}
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: NAVY }}>Category Risk Scores</h3>
                <div className="flex justify-around mb-8">
                  <ScoreGauge score={scores.facilitySafety} label="Facility Safety" />
                  <ScoreGauge score={scores.foodSafety} label="Food Safety" />
                  <ScoreGauge score={scores.documentation} label="Documentation" />
                </div>

                {/* Key Findings */}
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: NAVY }}>Key Findings</h3>
                <div className="space-y-2.5 mb-4">
                  {scores.findings.filter(f => !f.isPositive).map(f => (
                    <div key={f.id} className="flex items-start text-sm">
                      <SeverityDot severity={f.severity} />
                      <div>
                        <span className="font-medium" style={{ color: NAVY }}>{f.title}</span>
                        <span className="text-gray-500"> — {f.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {scores.findings.some(f => f.isPositive) && (
                  <>
                    <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 mt-4">What You're Doing Right</h4>
                    <div className="space-y-2">
                      {scores.findings.filter(f => f.isPositive).map(f => (
                        <div key={f.id} className="flex items-start text-sm text-green-700">
                          <SeverityDot severity="positive" />
                          <span>{f.description}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TAB: PROGNOSIS ─────────────────────────────── */}
            {resultsTab === 'prognosis' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <h2 className="text-xl font-bold mb-1" style={{ color: NAVY }}>How These Gaps Impact Your Business</h2>
                <p className="text-sm text-gray-500 mb-6">Four risk dimensions scored 0–100 (higher = more risk)</p>

                {/* 4 Risk Bars */}
                <RiskBar label="Revenue Risk" score={scores.revenueRisk}
                  estimate={`Estimated: ${formatDollars(scores.estimates.revenueRiskLow)} – ${formatDollars(scores.estimates.revenueRiskHigh)}/yr`} />
                <RiskBar label="Liability Risk" score={scores.liabilityRisk}
                  estimate={`Estimated: ${formatDollars(scores.estimates.liabilityRiskLow)} – ${formatDollars(scores.estimates.liabilityRiskHigh)} exposure`} />
                <RiskBar label="Cost Risk" score={scores.costRisk}
                  estimate={`Estimated: ${formatDollars(scores.estimates.costRiskLow)} – ${formatDollars(scores.estimates.costRiskHigh)}/yr`} />
                <RiskBar label="Operational Risk" score={scores.operationalRisk}
                  estimate={`Estimated: ~${scores.estimates.operationalDays} days downtime risk`} />

                {/* Risk Drivers */}
                {(['revenue', 'liability', 'cost', 'operational'] as const).map(dim => {
                  const drivers = scores.riskDrivers[dim];
                  if (!drivers || drivers.length === 0) return null;
                  return (
                    <div key={dim} className="mt-3 mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        Top {dim} risk drivers
                      </p>
                      {drivers.slice(0, 3).map((d, i) => (
                        <p key={i} className="text-xs text-gray-500 pl-3">• {d.description}</p>
                      ))}
                    </div>
                  );
                })}

                {/* Total Exposure */}
                <div className="mt-6 p-4 rounded-xl border-2 border-amber-300 bg-amber-50">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: NAVY }}>
                    Total Estimated Annual Risk Exposure
                  </p>
                  <p className="text-xl font-bold" style={{ color: '#92400e' }}>
                    {formatDollars(scores.estimates.totalLow)} – {formatDollars(scores.estimates.totalHigh)}
                  </p>
                </div>

                <p className="text-xs text-gray-400 mt-4 italic">
                  When you become an EvidLY customer, these four scores appear on your dashboard and update in real-time.
                </p>
              </div>
            )}

            {/* ── TAB: RECOMMENDATIONS ───────────────────────── */}
            {resultsTab === 'recommendations' && (
              <div className="space-y-6">
                {scores.facilitySafety > 20 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold mb-3" style={{ color: NAVY }}>Cleaning Pros Plus Can Help</h3>
                    <ul className="space-y-2 text-sm text-gray-600 mb-4">
                      <li>• Hood cleaning service (scheduled per NFPA 96)</li>
                      <li>• Fire suppression system inspection</li>
                      <li>• Fire extinguisher inspection & recharging</li>
                      <li>• Grease trap pumping & manifests</li>
                      <li>• Backflow preventer testing</li>
                    </ul>
                    <a
                      href="https://cleaningprosplus.com" target="_blank" rel="noopener noreferrer"
                      className="inline-block px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
                      style={{ backgroundColor: BRAND }}
                    >
                      Schedule a Free Inspection
                    </a>
                  </div>
                )}

                {(scores.foodSafety > 20 || scores.documentation > 20) && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold mb-3" style={{ color: NAVY }}>EvidLY Can Help</h3>
                    <ul className="space-y-2 text-sm text-gray-600 mb-4">
                      <li>• Real-time compliance dashboard with 4 risk scores</li>
                      <li>• Automated alerts before things expire</li>
                      <li>• Vendor document management & tracking</li>
                      <li>• Digital temperature logging & HACCP management</li>
                      <li>• Inspector arrival mode for surprise visits</li>
                    </ul>
                    <div className="flex gap-3">
                      <Link
                        to="/signup"
                        className="inline-block px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
                        style={{ backgroundColor: BRAND }}
                      >
                        Start Free Trial
                      </Link>
                      <Link
                        to="/demo"
                        className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors"
                        style={{ borderColor: BRAND, color: BRAND }}
                      >
                        See the Platform
                      </Link>
                    </div>
                  </div>
                )}

                {/* PDF Download */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                  <h3 className="text-lg font-bold mb-2" style={{ color: NAVY }}>Download Your Report</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Get a branded 2-page PDF with your Diagnosis and Business Impact Analysis.
                  </p>
                  <button
                    onClick={handleDownloadPdf}
                    data-demo-allow
                    className="px-6 py-3 text-white font-semibold rounded-lg transition-colors"
                    style={{ backgroundColor: GOLD }}
                  >
                    Download Compliance Assessment Report (PDF)
                  </button>
                </div>

                {/* Contact */}
                <div className="text-center text-sm text-gray-500">
                  <p className="font-medium" style={{ color: NAVY }}>Contact: Arthur Haggerty | Cleaning Pros Plus / EvidLY</p>
                  <p>arthur@getevidly.com | getevidly.com</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          <p>This assessment is for informational purposes only and does not constitute legal, insurance, or regulatory advice.</p>
          <p className="mt-1">Powered by EvidLY — Lead with Confidence</p>
        </div>
      </footer>
    </div>
  );
}

export default AssessmentTool;
