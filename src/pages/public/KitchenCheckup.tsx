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
} from '../../lib/checkupScoring';
import type { CheckupScores } from '../../lib/checkupScoring';
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
          findings_json: [],
          risk_drivers_json: {},
          recommendations_json: [],
        });
      } catch (err) {
        console.error('Results insert error:', err);
      }
    }

    // Show analyzing state for 2.5s
    setTimeout(() => setStep('results'), 2500);
  }, [answers, leadId, freeTextValues]);

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
            <ResultsView scores={scores} onRestart={handleCancel} />
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

// ── Results View (Temporary — replaced by Prompt 6B) ─────────────────────────

function ResultsView({
  scores,
  onRestart,
}: {
  scores: CheckupScores;
  onRestart: () => void;
}) {
  const gColor = gradeColor(scores.overallGrade);

  return (
    <div className="animate-fade-in">
      {/* Grade Hero */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-24 h-24 rounded-full text-4xl font-black mb-3"
          style={{
            backgroundColor: `${gColor}15`,
            color: gColor,
            border: `3px solid ${gColor}`,
          }}
        >
          {scores.overallGrade}
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: NAVY }}>
          {scores.gradeLabel}
        </h2>
        <p className="text-sm text-gray-500">
          Here&apos;s a snapshot of where your kitchen stands.
        </p>
      </div>

      {/* Category Scores */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: GOLD }}>
          Category Scores
        </h3>
        <p className="text-xs text-gray-400 mb-3">Higher = more items to look at</p>
        <ScoreBar label="Facility Safety" score={scores.facilitySafety} />
        <ScoreBar label="Food Safety" score={scores.foodSafety} />
        <ScoreBar label="Documentation" score={scores.documentation} />
      </div>

      {/* Impact Area Scores */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: GOLD }}>
          Impact Areas
        </h3>
        <p className="text-xs text-gray-400 mb-3">How these issues could affect your business</p>
        <ScoreBar label="Business Continuity" score={scores.revenueRisk} />
        <ScoreBar label="Exposure" score={scores.liabilityRisk} />
        <ScoreBar label="Avoidable Costs" score={scores.costRisk} />
        <ScoreBar label="Day-to-Day Impact" score={scores.operationalRisk} />
      </div>

      {/* Coming Soon */}
      <div
        className="rounded-xl p-5 mb-6 text-center"
        style={{ backgroundColor: `${NAVY}08`, border: `1px solid ${NAVY}15` }}
      >
        <p className="text-sm font-medium" style={{ color: NAVY }}>
          Full results with business impact analysis coming soon
        </p>
        <button
          disabled
          className="mt-3 px-5 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-400 cursor-not-allowed"
        >
          Download PDF — Coming in next update
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
  );
}

export default KitchenCheckup;
