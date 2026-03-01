// ============================================================================
// Kitchen Checkup — CHECKUP-1
// Public page at /checkup — no auth required, mobile-first
// Step 1: Lead Capture → Step 2: Questionnaire → Step 3: Results
// ============================================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  CHECKUP_QUESTIONS,
  getVisibleQuestions,
  computeCheckupScores,
  gradeColor,
  scoreBarColor,
  formatDollars,
} from '../../lib/checkupScoring';
import type { CheckupScores, CheckupFinding } from '../../lib/checkupScoring';
import { generateCheckupPdf } from '../../lib/checkupPdf';
import { supabase } from '../../lib/supabase';
import {
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Loader2,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Hash,
  Megaphone,
  Download,
  ArrowRight,
  Wrench,
  BarChart3,
} from 'lucide-react';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const BRAND = '#1e4d6b';

// ── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total, label }: { current: number; total: number; label: string }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: NAVY }}>{label}</span>
        <span className="text-xs font-medium" style={{ color: GOLD }}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: GOLD }}
        />
      </div>
    </div>
  );
}

// ── Score Bar (results) ──────────────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = scoreBarColor(score);
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium" style={{ color: NAVY }}>{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${Math.max(2, score)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── How-Heard Dropdown Options ───────────────────────────────────────────────

const HOW_HEARD_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'google', label: 'Google' },
  { value: 'referral', label: 'Referral' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'trade_show', label: 'Trade show' },
  { value: 'social_media', label: 'Social media' },
  { value: 'other', label: 'Other' },
];

// ── Main Component ───────────────────────────────────────────────────────────

type Step = 'landing' | 'lead' | 'questions' | 'analyzing' | 'results';

interface LeadData {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  zip_code: string;
  referral_source: string;
}

export function KitchenCheckup() {
  const [searchParams] = useSearchParams();
  const utmRef = searchParams.get('ref') || '';

  const [step, setStep] = useState<Step>('landing');
  const [lead, setLead] = useState<LeadData>({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    city: '',
    zip_code: '',
    referral_source: '',
  });
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadError, setLeadError] = useState('');
  const [leadSubmitting, setLeadSubmitting] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [freeTextValues, setFreeTextValues] = useState<Record<string, string>>({});
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const [scores, setScores] = useState<CheckupScores | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Visible questions based on current answers
  const visibleQuestions = useMemo(
    () => getVisibleQuestions(answers, lead.zip_code),
    [answers, lead.zip_code],
  );

  const currentQuestion = visibleQuestions[currentQIdx] || null;
  const totalSteps = 3; // lead, questions, results

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, currentQIdx]);

  // ── Lead Form ──────────────────────────────────────────────────────────────

  const handleLeadChange = useCallback((field: keyof LeadData, value: string) => {
    setLead((prev) => ({ ...prev, [field]: value }));
    setLeadError('');
  }, []);

  const submitLead = useCallback(async () => {
    // Validate
    if (!lead.business_name.trim()) return setLeadError('Business name is required');
    if (!lead.contact_name.trim()) return setLeadError('Contact name is required');
    if (!lead.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email))
      return setLeadError('Valid email is required');
    if (!lead.city.trim()) return setLeadError('City is required');
    if (!lead.zip_code.trim() || !/^\d{5}(-\d{4})?$/.test(lead.zip_code))
      return setLeadError('Valid zip code is required');

    setLeadSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('assessment_leads')
        .insert({
          business_name: lead.business_name.trim(),
          contact_name: lead.contact_name.trim(),
          email: lead.email.trim().toLowerCase(),
          phone: lead.phone.trim() || null,
          city: lead.city.trim(),
          zip_code: lead.zip_code.trim(),
          state: 'CA',
          referral_source: lead.referral_source || null,
          utm_ref: utmRef || null,
        })
        .select('id')
        .single();

      if (error) throw error;
      setLeadId(data.id);
      setStep('questions');
    } catch (err) {
      console.error('Lead insert error:', err);
      // Continue anyway — don't block the user experience
      setLeadId(null);
      setStep('questions');
    } finally {
      setLeadSubmitting(false);
    }
  }, [lead, utmRef]);

  // ── Question Navigation ────────────────────────────────────────────────────

  const selectAnswer = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));

      // Auto-advance after 300ms
      setTimeout(() => {
        if (currentQIdx < visibleQuestions.length - 1) {
          setDirection('forward');
          setCurrentQIdx((i) => Math.min(i + 1, visibleQuestions.length - 1));
        } else {
          // Last question — go to analyzing
          finishQuestionnaire();
        }
      }, 300);
    },
    [currentQIdx, visibleQuestions.length],
  );

  const goBack = useCallback(() => {
    if (currentQIdx > 0) {
      setDirection('back');
      setCurrentQIdx((i) => i - 1);
    } else {
      setStep('lead');
    }
  }, [currentQIdx]);

  const goForward = useCallback(() => {
    if (!currentQuestion) return;
    const val = answers[currentQuestion.id];
    if (!val) return; // must select an answer
    if (currentQIdx < visibleQuestions.length - 1) {
      setDirection('forward');
      setCurrentQIdx((i) => i + 1);
    } else {
      finishQuestionnaire();
    }
  }, [currentQIdx, visibleQuestions.length, answers, currentQuestion]);

  // ── Finish & Score ─────────────────────────────────────────────────────────

  const finishQuestionnaire = useCallback(async () => {
    setStep('analyzing');

    // Save responses
    if (leadId) {
      try {
        const rows = Object.entries(answers).map(([qId, val]) => ({
          lead_id: leadId,
          question_id: qId,
          answer_value: val,
          answer_text: freeTextValues[qId] || null,
        }));
        await supabase.from('assessment_responses').insert(rows);
      } catch (err) {
        console.error('Response insert error:', err);
      }
    }

    // Compute scores
    const computed = computeCheckupScores(answers);
    setScores(computed);

    // Save results
    if (leadId) {
      try {
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
          estimated_revenue_risk_dollars: computed.estimates.revenueRiskHigh,
          estimated_liability_risk_dollars: computed.estimates.liabilityRiskHigh,
          estimated_cost_risk_dollars: computed.estimates.avoidableCostsHigh,
          estimated_operational_risk_days: computed.estimates.operationalDays,
          total_estimated_exposure_low: computed.estimates.totalLow,
          total_estimated_exposure_high: computed.estimates.totalHigh,
          recommendations_json: [],
        });
      } catch (err) {
        console.error('Results insert error:', err);
      }

      // Fire-and-forget email notification
      supabase.functions.invoke('checkup-notify', {
        body: {
          leadId,
          lead: {
            businessName: lead.business_name,
            contactName: lead.contact_name,
            email: lead.email,
            phone: lead.phone,
            city: lead.city,
            zipCode: lead.zip_code,
            referralSource: lead.referral_source,
            utmRef,
          },
          scores: {
            overallGrade: computed.overallGrade,
            gradeLabel: computed.gradeLabel,
            facilitySafety: computed.facilitySafety,
            foodSafety: computed.foodSafety,
            documentation: computed.documentation,
            revenueRisk: computed.revenueRisk,
            liabilityRisk: computed.liabilityRisk,
            costRisk: computed.costRisk,
            operationalRisk: computed.operationalRisk,
            totalLow: computed.estimates.totalLow,
            totalHigh: computed.estimates.totalHigh,
            topFindings: computed.findings.filter(f => !f.isPositive).slice(0, 3).map(f => f.description),
          },
        },
      }).catch(() => {}); // silent fail
    }

    // Show analyzing state for 2.5s
    setTimeout(() => setStep('results'), 2500);
  }, [answers, leadId, freeTextValues, lead, utmRef]);

  // ── Cancel ─────────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    setStep('landing');
    setAnswers({});
    setFreeTextValues({});
    setCurrentQIdx(0);
    setScores(null);
    setLeadId(null);
    setLeadError('');
    setLead({
      business_name: '',
      contact_name: '',
      email: '',
      phone: '',
      city: '',
      zip_code: '',
      referral_source: '',
    });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
        <title>Kitchen Checkup | EvidLY</title>
        <meta
          name="description"
          content="Find out where your kitchen stands in 5 minutes. Free, no-obligation kitchen checkup from EvidLY."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://evidly.com/checkup" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link to="/" className="text-lg font-bold tracking-tight">
              <span style={{ color: GOLD }}>Evid</span>
              <span style={{ color: NAVY }}>LY</span>
            </Link>
            {step !== 'landing' && step !== 'results' && (
              <button
                onClick={handleCancel}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            )}
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10" ref={contentRef}>
          {/* ── Landing ─────────────────────────────────────────────────────── */}
          {step === 'landing' && <LandingView onStart={() => setStep('lead')} />}

          {/* ── Lead Capture ────────────────────────────────────────────────── */}
          {step === 'lead' && (
            <LeadForm
              lead={lead}
              onChange={handleLeadChange}
              error={leadError}
              submitting={leadSubmitting}
              onSubmit={submitLead}
              onCancel={handleCancel}
            />
          )}

          {/* ── Questionnaire ───────────────────────────────────────────────── */}
          {step === 'questions' && currentQuestion && (
            <QuestionView
              question={currentQuestion}
              questionIndex={currentQIdx}
              totalQuestions={visibleQuestions.length}
              answer={answers[currentQuestion.id] || ''}
              freeText={freeTextValues[currentQuestion.id] || ''}
              direction={direction}
              onSelect={(val) => selectAnswer(currentQuestion.id, val)}
              onFreeTextChange={(val) =>
                setFreeTextValues((p) => ({ ...p, [currentQuestion.id]: val }))
              }
              onBack={goBack}
              onForward={goForward}
              onCancel={handleCancel}
            />
          )}

          {/* ── Analyzing ───────────────────────────────────────────────────── */}
          {step === 'analyzing' && <AnalyzingView />}

          {/* ── Results ─────────────────────────────────────────────────────── */}
          {step === 'results' && scores && (
            <ResultsView scores={scores} lead={lead} onRestart={handleCancel} />
          )}
        </div>

        {/* Footer */}
        {step === 'landing' && (
          <footer className="border-t border-gray-200 mt-12">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 text-center">
              <p className="text-xs text-gray-400">
                &copy; {new Date().getFullYear()} EvidLY. Your answers are confidential.
              </p>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}

// ── Landing View ─────────────────────────────────────────────────────────────

function LandingView({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center py-8 sm:py-16">
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
        style={{ backgroundColor: `${GOLD}15`, color: GOLD }}
      >
        Free &middot; 5 minutes &middot; No obligation
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: NAVY }}>
        Kitchen Checkup
      </h1>
      <p className="text-lg text-gray-600 mb-2 max-w-md mx-auto">
        Find out where things stand — straight answers, no runaround.
      </p>
      <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
        Answer a few questions about your kitchen and we&apos;ll show you
        what&apos;s looking good and what might need attention.
      </p>

      <button
        onClick={onStart}
        className="px-8 py-3.5 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-base"
        style={{ backgroundColor: BRAND }}
      >
        Start Your Checkup
      </button>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-lg sm:max-w-none mx-auto">
        {[
          { title: 'Quick & Easy', desc: 'Answer questions about your kitchen in about 5 minutes.' },
          { title: 'Straight Answers', desc: 'See where things look good and where they might need a closer look.' },
          { title: 'Confidential', desc: 'Your information stays private. No strings attached.' },
        ].map((item) => (
          <div key={item.title} className="bg-white rounded-xl p-5 border border-gray-200">
            <h3 className="font-semibold mb-1" style={{ color: NAVY }}>{item.title}</h3>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lead Capture Form ────────────────────────────────────────────────────────

function LeadForm({
  lead,
  onChange,
  error,
  submitting,
  onSubmit,
  onCancel,
}: {
  lead: LeadData;
  onChange: (field: keyof LeadData, value: string) => void;
  error: string;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="animate-fade-in">
      <ProgressBar current={1} total={totalStepCount} label="Step 1 of 4 — About You" />

      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: NAVY }}>
        Tell us a bit about your business
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        We&apos;ll use this to tailor your checkup results.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <FormInput
          icon={<Building2 className="w-4 h-4" />}
          label="Business name"
          required
          value={lead.business_name}
          onChange={(v) => onChange('business_name', v)}
          placeholder="e.g. Main Street Grill"
        />
        <FormInput
          icon={<User className="w-4 h-4" />}
          label="Contact name"
          required
          value={lead.contact_name}
          onChange={(v) => onChange('contact_name', v)}
          placeholder="Your name"
        />
        <FormInput
          icon={<Mail className="w-4 h-4" />}
          label="Email"
          required
          type="email"
          value={lead.email}
          onChange={(v) => onChange('email', v)}
          placeholder="you@example.com"
        />
        <FormInput
          icon={<Phone className="w-4 h-4" />}
          label="Phone"
          type="tel"
          value={lead.phone}
          onChange={(v) => onChange('phone', v)}
          placeholder="(optional)"
        />
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            icon={<MapPin className="w-4 h-4" />}
            label="City"
            required
            value={lead.city}
            onChange={(v) => onChange('city', v)}
            placeholder="e.g. Sacramento"
          />
          <FormInput
            icon={<Hash className="w-4 h-4" />}
            label="Zip code"
            required
            value={lead.zip_code}
            onChange={(v) => onChange('zip_code', v)}
            placeholder="e.g. 95814"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: NAVY }}>
            <Megaphone className="w-4 h-4 inline mr-1.5 opacity-50" />
            How did you hear about us?
          </label>
          <select
            value={lead.referral_source}
            onChange={(e) => onChange('referral_source', e.target.value)}
            className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
          >
            {HOW_HEARD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 px-5 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
          style={{ backgroundColor: BRAND }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
}

const totalStepCount = 4; // lead, profile, equipment, operations

// ── Form Input ───────────────────────────────────────────────────────────────

function FormInput({
  icon,
  label,
  required,
  type = 'text',
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: NAVY }}>
        <span className="inline mr-1.5 opacity-50">{icon}</span>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
        style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
      />
    </div>
  );
}

// ── Question View ────────────────────────────────────────────────────────────

function QuestionView({
  question,
  questionIndex,
  totalQuestions,
  answer,
  freeText,
  direction,
  onSelect,
  onFreeTextChange,
  onBack,
  onForward,
  onCancel,
}: {
  question: (typeof CHECKUP_QUESTIONS)[number];
  questionIndex: number;
  totalQuestions: number;
  answer: string;
  freeText: string;
  direction: 'forward' | 'back';
  onSelect: (value: string) => void;
  onFreeTextChange: (value: string) => void;
  onBack: () => void;
  onForward: () => void;
  onCancel: () => void;
}) {
  // Determine which top-level step we're on (2 = profile, 3 = equipment, 4 = operations)
  const sectionStepMap: Record<string, number> = { profile: 2, equipment: 3, operations: 4 };
  const currentStep = sectionStepMap[question.section] || 2;

  return (
    <div
      key={question.id}
      className="animate-fade-in"
    >
      <ProgressBar
        current={questionIndex + 1}
        total={totalQuestions}
        label={`Step ${currentStep} of ${totalStepCount} — ${question.sectionLabel}`}
      />

      {/* Section badge */}
      <div
        className="inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-4"
        style={{ backgroundColor: `${GOLD}15`, color: GOLD }}
      >
        {question.sectionLabel}
      </div>

      <h2
        className="text-lg sm:text-xl font-bold mb-6 leading-snug"
        style={{ color: NAVY }}
      >
        {question.label}
      </h2>

      {/* Options */}
      <div className="space-y-2.5">
        {question.options.map((opt) => {
          const selected = answer === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                selected
                  ? 'border-[var(--sel-border)] bg-[var(--sel-bg)]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
              style={
                selected
                  ? ({
                      '--sel-border': GOLD,
                      '--sel-bg': `${GOLD}10`,
                      color: NAVY,
                      borderColor: GOLD,
                      backgroundColor: `${GOLD}10`,
                    } as React.CSSProperties)
                  : { color: NAVY }
              }
            >
              <span className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected ? '' : 'border-gray-300'
                  }`}
                  style={selected ? { borderColor: GOLD, backgroundColor: GOLD } : {}}
                >
                  {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </span>
                <span>{opt.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Free text input (for "Other" / "which software") */}
      {question.freeText && answer === 'other' && (
        <div className="mt-3">
          <input
            type="text"
            value={freeText}
            onChange={(e) => onFreeTextChange(e.target.value)}
            placeholder="Please specify..."
            className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
            autoFocus
          />
        </div>
      )}
      {question.freeText && answer === 'software' && (
        <div className="mt-3">
          <input
            type="text"
            value={freeText}
            onChange={(e) => onFreeTextChange(e.target.value)}
            placeholder="Which software do you use?"
            className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
            autoFocus
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <span className="text-xs text-gray-400">
          {questionIndex + 1} of {totalQuestions}
        </span>

        {answer ? (
          <button
            onClick={onForward}
            className="flex items-center gap-1 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all"
            style={{ backgroundColor: BRAND }}
          >
            {questionIndex === totalQuestions - 1 ? 'Finish' : 'Next'}{' '}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-20" /> /* spacer */
        )}
      </div>
    </div>
  );
}

// ── Analyzing View ───────────────────────────────────────────────────────────

function AnalyzingView() {
  return (
    <div className="text-center py-20 animate-fade-in">
      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: GOLD }} />
      <h2 className="text-xl font-bold mb-2" style={{ color: NAVY }}>
        Analyzing your answers...
      </h2>
      <p className="text-sm text-gray-500">This will just take a moment.</p>
    </div>
  );
}

// ── Results View — Full Two-Page Tabbed Display ──────────────────────────────

type ResultsTab = 'stand' | 'impact' | 'recs';

function ResultsView({
  scores,
  lead,
  onRestart,
}: {
  scores: CheckupScores;
  lead: LeadData;
  onRestart: () => void;
}) {
  const [tab, setTab] = useState<ResultsTab>('stand');
  const gColor = gradeColor(scores.overallGrade);

  const gapFindings = scores.findings.filter((f) => !f.isPositive);
  const positiveFindings = scores.findings.filter((f) => f.isPositive);
  const hasFacilityGaps = scores.facilitySafety > 20;
  const hasOpsGaps = scores.foodSafety > 20 || scores.documentation > 20;

  const handleDownloadPdf = () => {
    const doc = generateCheckupPdf(
      {
        businessName: lead.business_name,
        contactName: lead.contact_name,
        email: lead.email,
        city: lead.city,
        zipCode: lead.zip_code,
        jurisdiction: `Your kitchen is in ${lead.city || 'California'}. California kitchens follow the California Retail Food Code (CalCode), enforced by your county's Environmental Health Department.`,
      },
      scores,
    );
    doc.save(`${lead.business_name.replace(/[^a-zA-Z0-9]/g, '-')}-Kitchen-Checkup.pdf`);
  };

  const tabs: { key: ResultsTab; label: string }[] = [
    { key: 'stand', label: 'Where You Stand' },
    { key: 'impact', label: 'Business Impact' },
    { key: 'recs', label: 'Recommendations' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Grade Hero */}
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-black mb-2"
          style={{ backgroundColor: `${gColor}15`, color: gColor, border: `3px solid ${gColor}` }}
        >
          {scores.overallGrade}
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: NAVY }}>
          {scores.gradeLabel}
        </h2>
        <p className="text-sm text-gray-500">
          Here&apos;s where your kitchen stands.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-current'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
            style={tab === t.key ? { color: GOLD, borderColor: GOLD } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Where You Stand ──────────────────────────────────────────── */}
      {tab === 'stand' && (
        <div className="animate-fade-in">
          {/* Category Scores */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: GOLD }}>
              Category Summary
            </h3>
            <p className="text-xs text-gray-400 mb-3">Higher = more items to look at</p>
            <ScoreBar label="Your Kitchen & Equipment" score={scores.facilitySafety} />
            <ScoreBar label="Day-to-Day Operations" score={scores.foodSafety} />
            <ScoreBar label="Paperwork & Records" score={scores.documentation} />
          </div>

          {/* Findings */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: GOLD }}>
              Here&apos;s What We Found
            </h3>

            {gapFindings.length > 0 && (
              <div className="space-y-3 mb-4">
                {gapFindings.map((f) => (
                  <FindingRow key={f.id} finding={f} />
                ))}
              </div>
            )}

            {positiveFindings.length > 0 && (
              <>
                <div className="border-t border-gray-100 my-3" />
                <div className="space-y-3">
                  {positiveFindings.map((f) => (
                    <FindingRow key={f.id} finding={f} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Jurisdiction Context */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-5">
            <p className="text-sm" style={{ color: NAVY }}>
              <strong>Your kitchen is in {lead.city || 'California'}.</strong>{' '}
              California kitchens follow the California Retail Food Code (CalCode),
              enforced by your county&apos;s Environmental Health Department.
            </p>
          </div>

          {/* Next button */}
          <button
            onClick={() => setTab('impact')}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:shadow"
            style={{ backgroundColor: BRAND }}
          >
            See What This Means for Your Business <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── TAB 2: Business Impact ──────────────────────────────────────────── */}
      {tab === 'impact' && (
        <div className="animate-fade-in">
          <p className="text-sm text-gray-500 mb-5">
            How these things connect to your bottom line. These are the same four areas
            your EvidLY dashboard covers — so you always know where you stand.
          </p>

          {/* 4 Impact Areas */}
          {[
            {
              label: 'Business Continuity',
              score: scores.revenueRisk,
              estimate: `${formatDollars(scores.estimates.revenueRiskLow)} – ${formatDollars(scores.estimates.revenueRiskHigh)}/yr`,
              drivers: scores.riskDrivers.revenue || [],
            },
            {
              label: 'Exposure',
              score: scores.liabilityRisk,
              estimate: `${formatDollars(scores.estimates.liabilityRiskLow)} – ${formatDollars(scores.estimates.liabilityRiskHigh)} potential`,
              drivers: scores.riskDrivers.liability || [],
            },
            {
              label: 'Avoidable Costs',
              score: scores.costRisk,
              estimate: `${formatDollars(scores.estimates.avoidableCosts)} – ${formatDollars(scores.estimates.avoidableCostsHigh)}/yr`,
              drivers: scores.riskDrivers.cost || [],
            },
            {
              label: 'Day-to-Day Impact',
              score: scores.operationalRisk,
              estimate: `~${scores.estimates.operationalDays} days disruption/yr`,
              drivers: scores.riskDrivers.operational || [],
            },
          ].map((area) => (
            <ImpactAreaCard key={area.label} {...area} />
          ))}

          {/* Total Estimated Impact */}
          <div
            className="rounded-xl p-5 mb-5 border"
            style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: NAVY }}>
              Total Estimated Annual Impact
            </p>
            <p className="text-xl font-bold" style={{ color: '#92400e' }}>
              {formatDollars(scores.estimates.totalLow)} – {formatDollars(scores.estimates.totalHigh)}
            </p>
            <p className="text-xs mt-1" style={{ color: GRAY }}>
              Estimated — these are directional, not exact
            </p>
          </div>

          {/* Dashboard callout */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
            <p className="text-sm" style={{ color: NAVY }}>
              These are the same four areas your EvidLY dashboard covers. Your checkup
              is your starting point — the dashboard shows where things stand as you address them.
            </p>
          </div>

          <button
            onClick={() => setTab('recs')}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:shadow"
            style={{ backgroundColor: BRAND }}
          >
            See Recommendations <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── TAB 3: Recommendations ──────────────────────────────────────────── */}
      {tab === 'recs' && (
        <div className="animate-fade-in">
          {hasFacilityGaps && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4" style={{ color: GOLD }} />
                <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
                  Cleaning Pros Plus can help with
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: GOLD }} />
                  Hood cleaning service (scheduled per your cooking type)
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: GOLD }} />
                  Fire suppression inspection
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: GOLD }} />
                  Fire extinguisher inspection/recharging
                </li>
              </ul>
              <a
                href="mailto:arthur@cleaningprosplus.com?subject=Hood%20Inspection%20Request%20from%20Kitchen%20Checkup"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:shadow"
                style={{ backgroundColor: BRAND }}
              >
                Schedule a Free Hood Inspection
              </a>
              <a
                href="tel:+12096366116"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 ml-2"
              >
                (209) 636-6116
              </a>
            </div>
          )}

          {hasOpsGaps && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4" style={{ color: GOLD }} />
                <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
                  EvidLY can help with
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: GOLD }} />
                  A dashboard that shows where everything stands, updated as things happen
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: GOLD }} />
                  Reminders before things come due
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: GOLD }} />
                  All your vendor documents in one place
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: GOLD }} />
                  Grease trap records with disposal receipts
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: GOLD }} />
                  Knows what your local agency expects
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: GOLD }} />
                  Documentation your insurance carrier looks for
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: GOLD }} />
                  Digital temperature logging and HACCP management
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:shadow"
                  style={{ backgroundColor: BRAND }}
                >
                  Start Your Free Trial — $99/month
                </Link>
                <Link
                  to="/demo"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  See the Platform in Action
                </Link>
              </div>
            </div>
          )}

          {!hasFacilityGaps && !hasOpsGaps && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 text-center">
              <p className="text-sm" style={{ color: NAVY }}>
                Your kitchen is looking good across the board. Keep doing what you&apos;re doing.
              </p>
            </div>
          )}

          {/* PDF Download */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <button
              onClick={handleDownloadPdf}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl border-2 transition-all hover:shadow"
              style={{ borderColor: GOLD, color: NAVY }}
            >
              <Download className="w-4 h-4" style={{ color: GOLD }} />
              Download Your Kitchen Checkup Report (PDF)
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onRestart}
              className="flex-1 px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Start Over
            </button>
            <Link
              to="/demo"
              className="flex-1 px-5 py-2.5 text-sm font-semibold text-white rounded-lg text-center shadow-sm transition-all hover:shadow"
              style={{ backgroundColor: BRAND }}
            >
              Try EvidLY Free
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Finding Row ──────────────────────────────────────────────────────────────

function FindingRow({ finding }: { finding: CheckupFinding }) {
  const severityColors: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8', positive: '#22c55e',
  };
  const color = severityColors[finding.severity] || '#94a3b8';

  return (
    <div className="flex items-start gap-2.5">
      <span
        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <p className="text-sm" style={{ color: finding.isPositive ? '#22c55e' : NAVY }}>
        {finding.description}
      </p>
    </div>
  );
}

// ── Impact Area Card ─────────────────────────────────────────────────────────

const GRAY = '#6B7F96';

function ImpactAreaCard({
  label,
  score,
  estimate,
  drivers,
}: {
  label: string;
  score: number;
  estimate: string;
  drivers: { title: string; description: string }[];
}) {
  const color = scoreBarColor(score);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold" style={{ color: NAVY }}>{label}</h4>
        <span className="text-sm font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${Math.max(2, score)}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs font-medium mb-2" style={{ color: GOLD }}>{estimate}</p>
      {drivers.length > 0 && (
        <ul className="space-y-1">
          {drivers.map((d, i) => (
            <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: GRAY }}>
              <span className="mt-0.5">-</span>
              <span><strong>{d.title}</strong> — {d.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default KitchenCheckup;
