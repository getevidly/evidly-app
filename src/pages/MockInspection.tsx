/**
 * MockInspection.tsx — INSPECTION-TOOLS-01
 *
 * AI-simulated inspection using the operator's actual jurisdiction
 * inspector criteria. Feature-gated to founder+ plan tier.
 * Three phases: Setup → Walkthrough → Results.
 */
import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Target, Shield, AlertTriangle, CheckCircle2, XCircle,
  ChevronRight, ChevronLeft, Play, RotateCcw, Download,
  ListChecks, MessageSquare, User, Clock,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { useJurisdiction } from '../hooks/useJurisdiction';
import { useDemo } from '../contexts/DemoContext';
import { DEMO_JURISDICTIONS } from '../data/demoJurisdictions';
import { getJurisdictionScoringConfig, type JurisdictionScoringConfig } from '../data/selfInspectionJurisdictionMap';
import { JurisdictionProfileHeader } from '../components/self-inspection/JurisdictionProfileHeader';
import {
  computeJurisdictionScore,
  gradeInspection,
  getScoringMethodLabel,
  type CompletedItem,
} from '../lib/selfInspectionScoring';
import {
  selectInspectionQuestions,
  getInspectorIntro,
  DIFFICULTY_INFO,
  type MockDifficulty,
  type MockInspectorQuestion,
} from '../data/mockInspectionData';
import { hasAccess, type PlanTier } from '../lib/featureGating';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'setup' | 'walkthrough' | 'results';
type AnswerStatus = 'pass' | 'fail' | null;

interface QuestionAnswer {
  question: MockInspectorQuestion;
  answer: AnswerStatus;
  notes: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAVY = '#1e4d6b';
const GOLD = '#d4af37';

function getScoreColor(s: number) {
  if (s >= 90) return '#16a34a';
  if (s >= 75) return '#d97706';
  return '#dc2626';
}

function getScoreBg(s: number) {
  if (s >= 90) return 'bg-green-500';
  if (s >= 75) return 'bg-yellow-500';
  return 'bg-red-500';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MockInspection() {
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDemoMode } = useDemo();

  // Jurisdiction
  const locationParam = searchParams.get('location') || 'downtown';
  const jieLocKey = `demo-loc-${locationParam}`;
  const locationJurisdiction = useJurisdiction(jieLocKey, isDemoMode);
  const locationName = locationParam.charAt(0).toUpperCase() + locationParam.slice(1);

  const demoJurisdiction = useMemo(() => {
    if (!locationJurisdiction) return DEMO_JURISDICTIONS[0];
    return DEMO_JURISDICTIONS.find(j => j.county === locationJurisdiction.county) || DEMO_JURISDICTIONS[0];
  }, [locationJurisdiction]);

  const scoringConfig = useMemo<JurisdictionScoringConfig>(() => {
    if (!locationJurisdiction) return getJurisdictionScoringConfig('Fresno');
    return getJurisdictionScoringConfig(locationJurisdiction.county);
  }, [locationJurisdiction]);

  // Plan tier check (demo mode = founder for testing)
  const userTier: PlanTier = isDemoMode ? 'founder' : 'trial';
  const hasFeatureAccess = hasAccess(userTier, 'founder', 'mock-inspection');

  // Phase state
  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<MockDifficulty>('routine');
  const [questions, setQuestions] = useState<QuestionAnswer[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const startInspection = () => {
    const selected = selectInspectionQuestions(difficulty);
    setQuestions(selected.map(q => ({ question: q, answer: null, notes: '' })));
    setCurrentIdx(0);
    setStartedAt(new Date().toISOString());
    setPhase('walkthrough');
  };

  const resetInspection = () => {
    setPhase('setup');
    setQuestions([]);
    setCurrentIdx(0);
    setStartedAt(null);
  };

  const setAnswer = (idx: number, answer: AnswerStatus) => {
    setQuestions(prev => prev.map((qa, i) => i === idx ? { ...qa, answer } : qa));
  };

  const setNotes = (idx: number, notes: string) => {
    setQuestions(prev => prev.map((qa, i) => i === idx ? { ...qa, notes } : qa));
  };

  const finishInspection = () => {
    const unanswered = questions.filter(q => q.answer === null).length;
    if (unanswered > 0) {
      toast.error(`${unanswered} question${unanswered > 1 ? 's' : ''} still unanswered.`);
      return;
    }
    setPhase('results');
  };

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const answered = questions.filter(q => q.answer !== null).length;
  const violations = questions.filter(q => q.answer === 'fail');
  const passes = questions.filter(q => q.answer === 'pass');

  const score = useMemo(() => {
    if (questions.length === 0) return 0;
    const items: CompletedItem[] = questions.map(qa => ({
      id: qa.question.id,
      status: qa.answer,
      severity: qa.question.severity,
    }));
    return computeJurisdictionScore(items, scoringConfig).rawScore;
  }, [questions, scoringConfig]);

  const jurisdictionGrade = useMemo(() => {
    if (!demoJurisdiction || questions.length === 0) return null;
    return gradeInspection(score, demoJurisdiction);
  }, [score, demoJurisdiction, questions.length]);

  const intro = getInspectorIntro(difficulty);
  const current = questions[currentIdx];

  // ---------------------------------------------------------------------------
  // Feature gate check
  // ---------------------------------------------------------------------------

  if (!hasFeatureAccess) {
    return (
      <div className="min-h-screen bg-[#eef4f8]">
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Mock Inspection' },
        ]} />
        <div className="px-4 sm:px-6 py-12 max-w-2xl mx-auto text-center">
          <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h1 className="text-2xl font-bold mb-2" style={{ color: NAVY }}>Mock Inspection</h1>
          <p className="text-gray-500 mb-6">
            Practice with an AI-simulated inspector using your jurisdiction's criteria.
            Available on Founder plan and above.
          </p>
          <DemoUpgradePrompt
            action="mock-inspection"
            featureName="Mock Inspection"
            onClose={() => navigate('/self-inspection')}
          />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Setup Phase
  // ---------------------------------------------------------------------------

  const renderSetup = () => (
    <div className="space-y-6">
      <JurisdictionProfileHeader config={scoringConfig} />

      <div className="bg-white rounded-xl border border-[#b8d4e8] p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-2">
          <Target className="h-6 w-6" style={{ color: NAVY }} />
          <h2 className="text-xl font-bold" style={{ color: NAVY }}>Mock Inspection</h2>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          Practice answering questions from a simulated <span className="font-medium">{scoringConfig.agencyName}</span> inspector.
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Scoring: {getScoringMethodLabel(scoringConfig.scoringType)}
        </p>

        <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Difficulty</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {(['routine', 'focused', 'critical'] as MockDifficulty[]).map(d => {
            const info = DIFFICULTY_INFO[d];
            const isSelected = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected ? 'shadow-md' : 'hover:shadow-sm'
                }`}
                style={{
                  borderColor: isSelected ? info.color : '#e5e7eb',
                  backgroundColor: isSelected ? info.bgColor : '#fff',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: info.color }}
                  />
                  <span className="text-sm font-semibold" style={{ color: info.color }}>
                    {info.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{info.description}</p>
              </button>
            );
          })}
        </div>

        <button
          onClick={startInspection}
          className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          style={{ backgroundColor: GOLD, color: NAVY }}
        >
          <Play className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Begin Mock Inspection
        </button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render: Walkthrough Phase
  // ---------------------------------------------------------------------------

  const renderWalkthrough = () => {
    if (!current) return null;
    const q = current.question;
    const pct = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;
    const violationCount = questions.filter(qa => qa.answer === 'fail').length;

    return (
      <div className="space-y-4">
        {/* Progress */}
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentIdx + 1} of {questions.length} — {pct}% complete
            </span>
            {violationCount > 0 && (
              <span className="text-xs font-semibold text-red-600">
                {violationCount} violation{violationCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: GOLD }}
            />
          </div>
        </div>

        {/* Inspector intro (first question only) */}
        {currentIdx === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800 mb-1">{intro.greeting}</p>
                <p className="text-xs text-blue-700">{intro.context}</p>
              </div>
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className={`bg-white rounded-xl border p-5 ${
          current.answer === 'pass' ? 'border-green-300 bg-green-50/30' :
          current.answer === 'fail' ? 'border-red-300 bg-red-50/30' :
          'border-[#b8d4e8]'
        }`}>
          {/* Inspector question */}
          <div className="flex items-start gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">{q.text}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">{q.citation}</span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: q.category === 'food_safety' ? '#f0fdf4' : '#fef2f2',
                    color: q.category === 'food_safety' ? '#166534' : '#991b1b',
                  }}
                >
                  {q.category === 'food_safety' ? 'Food Safety' : 'Facility Safety'}
                </span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{
                    color: q.severity === 'critical' ? '#991b1b' : q.severity === 'major' ? '#92400e' : '#6b7280',
                    backgroundColor: q.severity === 'critical' ? '#fef2f2' : q.severity === 'major' ? '#fffbeb' : '#f3f4f6',
                    borderColor: q.severity === 'critical' ? '#fecaca' : q.severity === 'major' ? '#fde68a' : '#e5e7eb',
                  }}
                >
                  {q.severity.charAt(0).toUpperCase() + q.severity.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Answer buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setAnswer(currentIdx, 'pass')}
              className={`flex items-center justify-center gap-1.5 rounded-lg font-semibold text-xs transition-colors ${
                current.answer === 'pass'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}
              style={{ minWidth: 100, minHeight: 44 }}
            >
              <CheckCircle2 className="h-4 w-4" />
              In Compliance
            </button>
            <button
              onClick={() => setAnswer(currentIdx, 'fail')}
              className={`flex items-center justify-center gap-1.5 rounded-lg font-semibold text-xs transition-colors ${
                current.answer === 'fail'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
              style={{ minWidth: 100, minHeight: 44 }}
            >
              <XCircle className="h-4 w-4" />
              Violation
            </button>
          </div>

          {/* Follow-up text from inspector */}
          {current.answer && (
            <div className={`rounded-lg p-3 mt-2 ${
              current.answer === 'pass' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className="text-xs font-medium mb-1" style={{ color: current.answer === 'pass' ? '#166534' : '#991b1b' }}>
                Inspector:
              </p>
              <p className="text-xs" style={{ color: current.answer === 'pass' ? '#166534' : '#991b1b' }}>
                {current.answer === 'pass' ? q.followUpOnPass : q.followUpOnFail}
              </p>
            </div>
          )}

          {/* Notes (optional) */}
          {current.answer === 'fail' && (
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-700 mb-1 block">Your Notes</label>
              <textarea
                value={current.notes}
                onChange={e => setNotes(currentIdx, e.target.value)}
                placeholder="Document the issue..."
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b] resize-none"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-[#b8d4e8] p-4">
          <button
            onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
            disabled={currentIdx === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-[#1e4d6b] bg-[#eef4f8] hover:bg-[#d9e8f0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ minHeight: 44 }}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          {currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx(p => Math.min(questions.length - 1, p + 1))}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: NAVY, minHeight: 44 }}
            >
              Next Question
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={finishInspection}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors"
              style={{ backgroundColor: GOLD, color: NAVY, minHeight: 44 }}
            >
              Finish Inspection
            </button>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Results Phase
  // ---------------------------------------------------------------------------

  const renderResults = () => {
    const circleSize = 140;
    const strokeWidth = 10;
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const scoreColor = getScoreColor(score);

    return (
      <div className="space-y-6">
        <JurisdictionProfileHeader config={scoringConfig} />

        {/* Score */}
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-4 sm:p-5 text-center">
          <h2 className="text-lg font-bold mb-4" style={{ color: NAVY }}>Mock Inspection Results</h2>

          {jurisdictionGrade && jurisdictionGrade.passFail !== 'no_grade' && (
            <div className="mb-3">
              <span className={`inline-block text-2xl font-extrabold px-4 py-1 rounded-lg ${
                jurisdictionGrade.passFail === 'pass' ? 'bg-green-100 text-green-700' :
                jurisdictionGrade.passFail === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {jurisdictionGrade.display}
              </span>
            </div>
          )}

          <div className="flex justify-center mb-4">
            <svg width={circleSize} height={circleSize} className="-rotate-90">
              <circle
                cx={circleSize / 2} cy={circleSize / 2} r={radius}
                fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}
              />
              <circle
                cx={circleSize / 2} cy={circleSize / 2} r={radius}
                fill="none" stroke={scoreColor} strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="absolute flex items-center justify-center" style={{ width: circleSize, height: circleSize }}>
              <span className="text-3xl font-bold" style={{ color: scoreColor }}>{score}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-1">
            {getScoringMethodLabel(scoringConfig.scoringType)} — {scoringConfig.agencyName}
          </p>
          <p className="text-sm text-gray-600">
            {violations.length} violation{violations.length !== 1 ? 's' : ''} found out of {questions.length} questions
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {DIFFICULTY_INFO[difficulty].label} inspection</span>
          </div>
        </div>

        {/* Violations */}
        {violations.length > 0 && (
          <div className="bg-white rounded-xl border border-[#b8d4e8] p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              What the Inspector Found ({violations.length})
            </h3>
            <div className="space-y-3">
              {violations.map(v => {
                const q = v.question;
                const sevColors = {
                  critical: 'border-l-red-500',
                  major: 'border-l-orange-500',
                  minor: 'border-l-yellow-500',
                };
                return (
                  <div key={q.id} className={`border-l-4 ${sevColors[q.severity]} bg-gray-50 rounded-r-lg p-3`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{q.violationType}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{q.citation}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        q.severity === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                        q.severity === 'major' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {q.severity.charAt(0).toUpperCase() + q.severity.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-red-700 mt-2 italic">{q.followUpOnFail}</p>
                    {v.notes && <p className="text-xs text-gray-600 mt-1">Notes: {v.notes}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Passes */}
        {passes.length > 0 && (
          <div className="bg-white rounded-xl border border-[#b8d4e8] p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              What You Passed ({passes.length})
            </h3>
            <div className="grid gap-2">
              {passes.map(p => (
                <div key={p.question.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="text-gray-700">{p.question.text.length > 80 ? p.question.text.slice(0, 80) + '…' : p.question.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {violations.length > 0 && (
            <button
              onClick={() => {
                const caItems = violations.map(v => ({
                  title: v.question.violationType,
                  description: v.question.followUpOnFail,
                  severity: v.question.severity,
                  section: v.question.category === 'food_safety' ? 'Food Safety' : 'Facility Safety',
                  citation: v.question.citation,
                  notes: v.notes,
                }));
                sessionStorage.setItem('inspection_ca_items', JSON.stringify(caItems));
                navigate('/corrective-actions?from=self-inspection');
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: NAVY, minHeight: 44 }}
            >
              <ListChecks className="h-4 w-4" />
              Create Corrective Actions ({violations.length})
            </button>
          )}
          <button
            onClick={resetInspection}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors"
            style={{ backgroundColor: GOLD, color: NAVY, minHeight: 44 }}
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#eef4f8]">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/' },
        { label: 'Compliance', href: '/compliance' },
        { label: 'Mock Inspection' },
      ]} />

      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        {phase === 'setup' && renderSetup()}
        {phase === 'walkthrough' && renderWalkthrough()}
        {phase === 'results' && renderResults()}
      </div>

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
