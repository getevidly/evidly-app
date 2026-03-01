import { useState, useCallback } from 'react';
import { ClipboardCheck, ShieldCheck, Flame, ChevronLeft, ChevronRight, X, RotateCcw, ArrowRight } from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';
import {
  KITCHEN_CHECKUP_QUESTIONS,
  computeKitchenCheckupScore,
  gradeColor as getGradeColor,
  gradeLabel as getGradeLabel,
  type Answer,
  type Grade,
  type CheckupResult,
} from '../lib/kitchenCheckupScoring';
import { DEMO_CHECKUP_RESULT } from '../data/kitchenCheckupDemoData';

// ── Constants ───────────────────────────────────────────────────────
const GOLD = '#A08C5A';
const NAVY = '#1E2D4D';
const ANSWER_OPTIONS: { value: Answer; label: string; shortLabel: string }[] = [
  { value: 'yes', label: 'Yes', shortLabel: 'Yes' },
  { value: 'mostly', label: 'Mostly', shortLabel: 'Mostly' },
  { value: 'no', label: 'No', shortLabel: 'No' },
  { value: 'na', label: 'N/A', shortLabel: 'N/A' },
];

const PILLAR_META = {
  food_safety: { label: 'Food Safety', icon: ShieldCheck, color: '#22C55E' },
  facility_safety: { label: 'Facility Safety', icon: Flame, color: '#F97316' },
} as const;

type Phase = 'landing' | 'questionnaire' | 'results';

// ── Component ───────────────────────────────────────────────────────
export function KitchenCheckup() {
  const { isDemoMode } = useDemo();
  const [phase, setPhase] = useState<Phase>('landing');
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<CheckupResult | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const totalQuestions = KITCHEN_CHECKUP_QUESTIONS.length;
  const currentQ = KITCHEN_CHECKUP_QUESTIONS[currentIndex];
  const progressPct = Math.round((currentIndex / totalQuestions) * 100);

  // Previous checkup for landing page (demo seed or null)
  const previousCheckup = isDemoMode ? DEMO_CHECKUP_RESULT : null;

  const handleStart = useCallback(() => {
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setPhase('questionnaire');
  }, []);

  const handleAnswer = useCallback((value: Answer) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: value }));
    // Auto-advance after 300ms
    setTimeout(() => {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        // Last question — compute results
        const finalAnswers = { ...answers, [currentQ.id]: value };
        const computed = computeKitchenCheckupScore(finalAnswers);
        setResult(computed);
        setPhase('results');
        // Fire-and-forget DB save (in production)
        saveCheckup(finalAnswers, computed);
      }
    }, 300);
  }, [currentIndex, totalQuestions, answers, currentQ]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  const handleCancel = useCallback(() => {
    setShowCancelConfirm(true);
  }, []);

  const confirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    setPhase('landing');
    setAnswers({});
    setCurrentIndex(0);
  }, []);

  // ── DB Save (fire-and-forget) ─────────────────────────────────────
  const saveCheckup = async (finalAnswers: Record<string, Answer>, res: CheckupResult) => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: checkup } = await supabase.from('kitchen_checkups').insert({
        user_id: user.id,
        food_safety_score: res.foodSafetyScore,
        facility_safety_score: res.facilitySafetyScore,
        overall_score: res.overallScore,
        grade: res.grade,
      }).select('id').single();

      if (!checkup?.id) return;

      const responses = KITCHEN_CHECKUP_QUESTIONS.map(q => {
        const a = finalAnswers[q.id] as Answer | undefined;
        const pts = a === 'yes' ? 10 : a === 'mostly' ? 6 : a === 'no' ? 0 : null;
        return {
          checkup_id: checkup.id,
          question_id: q.id,
          pillar: q.pillar,
          answer: a || 'na',
          points_earned: pts,
          points_possible: a && a !== 'na' ? 10 : null,
        };
      });
      await supabase.from('kitchen_checkup_responses').insert(responses);
    } catch {
      // Silent fail — supabaseGuard blocks in demo mode anyway
    }
  };

  // ── LANDING PHASE ─────────────────────────────────────────────────
  if (phase === 'landing') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: `${GOLD}15` }}>
            <ClipboardCheck className="w-8 h-8" style={{ color: GOLD }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: NAVY }}>
            Lead with Confidence
          </h1>
          <p className="text-lg font-medium mb-1" style={{ color: GOLD }}>
            Know Where You Stand
          </p>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto">
            Take a 5-minute self-assessment to evaluate your kitchen's compliance readiness across Food Safety and Facility Safety.
          </p>
        </div>

        {/* Previous checkup card */}
        {previousCheckup ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                Your Last Checkup
              </h2>
              <span className="text-xs text-[var(--text-tertiary)]">
                {new Date(previousCheckup.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-6">
              {/* Grade badge */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${getGradeColor(previousCheckup.grade)}15` }}
              >
                <span
                  className="text-3xl font-bold"
                  style={{ color: getGradeColor(previousCheckup.grade) }}
                >
                  {previousCheckup.grade}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold" style={{ color: NAVY }}>
                  {previousCheckup.overallScore}%
                </div>
                <div className="text-sm text-[var(--text-secondary)] mb-2">
                  {getGradeLabel(previousCheckup.grade)}
                </div>
                <div className="flex gap-4 text-xs text-[var(--text-tertiary)]">
                  <span>Food Safety: <strong className="text-[var(--text-primary)]">{previousCheckup.foodSafetyScore}%</strong></span>
                  <span>Facility Safety: <strong className="text-[var(--text-primary)]">{previousCheckup.facilitySafetyScore}%</strong></span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 mb-6 shadow-sm text-center">
            <p className="text-[var(--text-secondary)]">
              You haven't completed a Kitchen Checkup yet. Start your first assessment to see where you stand.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-sm"
            style={{ backgroundColor: GOLD }}
          >
            {previousCheckup ? (
              <>
                <RotateCcw className="w-5 h-5" />
                Retake Kitchen Checkup
              </>
            ) : (
              <>
                <ClipboardCheck className="w-5 h-5" />
                Start Kitchen Checkup
              </>
            )}
          </button>
          <p className="text-xs text-[var(--text-tertiary)] mt-3">
            20 questions &middot; About 5 minutes
          </p>
        </div>
      </div>
    );
  }

  // ── QUESTIONNAIRE PHASE ───────────────────────────────────────────
  if (phase === 'questionnaire' && currentQ) {
    const pillar = PILLAR_META[currentQ.pillar];
    const PillarIcon = pillar.icon;
    const selectedAnswer = answers[currentQ.id];

    return (
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Top bar: progress + cancel */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-[var(--bg-panel)] rounded-full mb-8 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%`, backgroundColor: GOLD }}
          />
        </div>

        {/* Pillar badge */}
        <div className="flex items-center gap-2 mb-4">
          <PillarIcon className="w-4 h-4" style={{ color: pillar.color }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: pillar.color }}>
            {pillar.label}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">&middot; {currentQ.category}</span>
        </div>

        {/* Question */}
        <h2 className="text-xl sm:text-2xl font-bold mb-8" style={{ color: NAVY }}>
          {currentQ.question}
        </h2>

        {/* Answer buttons */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
          {ANSWER_OPTIONS.map(opt => {
            const isSelected = selectedAnswer === opt.value;
            const bgColor = isSelected
              ? opt.value === 'yes' ? '#22C55E' : opt.value === 'mostly' ? '#3B82F6' : opt.value === 'no' ? '#EF4444' : '#6B7280'
              : undefined;
            return (
              <button
                key={opt.value}
                onClick={() => handleAnswer(opt.value)}
                className={`relative py-4 px-3 rounded-xl border-2 font-semibold text-base transition-all ${
                  isSelected
                    ? 'text-white border-transparent shadow-md scale-[1.02]'
                    : 'text-[var(--text-primary)] border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-2)] hover:shadow-sm'
                }`}
                style={isSelected ? { backgroundColor: bgColor, borderColor: bgColor } : undefined}
              >
                {opt.label}
                {opt.value === 'yes' && <span className="block text-xs font-normal mt-0.5 opacity-80">Fully compliant</span>}
                {opt.value === 'mostly' && <span className="block text-xs font-normal mt-0.5 opacity-80">Minor gaps</span>}
                {opt.value === 'no' && <span className="block text-xs font-normal mt-0.5 opacity-80">Not compliant</span>}
                {opt.value === 'na' && <span className="block text-xs font-normal mt-0.5 opacity-80">Not applicable</span>}
              </button>
            );
          })}
        </div>

        {/* Back button */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-xs text-[var(--text-tertiary)]">
            {Math.round(((currentIndex + 1) / totalQuestions) * 100)}% complete
          </span>
        </div>

        {/* Cancel confirmation modal */}
        {showCancelConfirm && (
          <>
            <div className="fixed inset-0 bg-black/40 z-[80]" onClick={() => setShowCancelConfirm(false)} />
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <div className="bg-[var(--bg-card)] rounded-xl shadow-lg max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-2" style={{ color: NAVY }}>Cancel Checkup?</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                  Are you sure? Your progress will be lost.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-2.5 px-4 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-panel)] transition-colors"
                  >
                    Continue Checkup
                  </button>
                  <button
                    onClick={confirmCancel}
                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: '#EF4444' }}
                  >
                    Yes, Cancel
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── RESULTS PHASE ─────────────────────────────────────────────────
  if (phase === 'results' && result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: NAVY }}>
            Your Kitchen Checkup Results
          </h1>
          <p className="text-[var(--text-secondary)]">
            Here's where your kitchen stands across Food Safety and Facility Safety.
          </p>
        </div>

        {/* Overall score card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 mb-6 shadow-sm text-center">
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-4"
            style={{ backgroundColor: `${result.gradeColor}15` }}
          >
            <span className="text-5xl font-bold" style={{ color: result.gradeColor }}>
              {result.grade}
            </span>
          </div>
          <div className="text-4xl font-bold mb-1" style={{ color: NAVY }}>
            {result.overallScore}%
          </div>
          <div className="text-sm font-medium" style={{ color: result.gradeColor }}>
            {result.gradeLabel}
          </div>
        </div>

        {/* Pillar breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Food Safety */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Food Safety</span>
            </div>
            <div className="text-2xl font-bold mb-2" style={{ color: NAVY }}>
              {result.foodSafetyScore}%
            </div>
            <div className="w-full h-2.5 bg-[var(--bg-panel)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${result.foodSafetyScore}%`,
                  backgroundColor: result.foodSafetyScore >= 80 ? '#22C55E' : result.foodSafetyScore >= 60 ? '#EAB308' : '#EF4444',
                }}
              />
            </div>
          </div>

          {/* Facility Safety */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Facility Safety</span>
            </div>
            <div className="text-2xl font-bold mb-2" style={{ color: NAVY }}>
              {result.facilitySafetyScore}%
            </div>
            <div className="w-full h-2.5 bg-[var(--bg-panel)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${result.facilitySafetyScore}%`,
                  backgroundColor: result.facilitySafetyScore >= 80 ? '#22C55E' : result.facilitySafetyScore >= 60 ? '#EAB308' : '#EF4444',
                }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleStart}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            View Full Results
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleStart}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border-2 transition-all hover:shadow-sm"
            style={{ color: NAVY, borderColor: NAVY }}
          >
            <RotateCcw className="w-4 h-4" />
            Retake Checkup
          </button>
        </div>
      </div>
    );
  }

  return null;
}
