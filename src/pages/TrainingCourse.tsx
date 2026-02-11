import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Clock, CheckCircle2, Circle, Play,
  Lock, ChevronRight, ChevronDown, Award, Brain,
  AlertTriangle, XCircle, RotateCcw, Timer, Send,
  Download, Flame, Shield, Settings2, BookOpenCheck,
  Users, BarChart3, Globe, FileText,
} from 'lucide-react';
import {
  trainingCourses, trainingModules, trainingEnrollments,
  trainingCertificates, trainingQuizAttempts,
  type TrainingCourse as TCourse, type TrainingModule, type TrainingEnrollment,
  type TrainingCategory,
} from '../data/demoData';

type ViewState = 'overview' | 'lesson' | 'quiz' | 'certificate';

const CATEGORY_ICON: Record<TrainingCategory, typeof Shield> = {
  food_safety_handler: Shield,
  food_safety_manager: BookOpenCheck,
  fire_safety: Flame,
  compliance_ops: Settings2,
  custom: Brain,
};

// Demo lesson content for display
const DEMO_LESSONS: Record<string, { title: string; content: string }[]> = {
  'tm-01': [
    { title: 'Why Handwashing Matters', content: 'Handwashing is the single most important practice to prevent foodborne illness. The CDC estimates that proper handwashing could prevent 1 in 3 diarrheal illnesses and 1 in 5 respiratory infections.\n\nIn a food service environment, your hands are constantly in contact with surfaces, equipment, and food. Without proper handwashing, harmful bacteria like E. coli, Salmonella, and Norovirus can easily transfer from your hands to the food you prepare.' },
    { title: 'The 20-Second Technique', content: 'Follow these steps every time you wash your hands:\n\n1. Wet hands with warm running water (at least 100°F / 38°C)\n2. Apply soap and lather vigorously\n3. Scrub all surfaces — backs of hands, between fingers, under nails\n4. Continue scrubbing for at least 20 seconds\n5. Rinse thoroughly under running water\n6. Dry with a single-use paper towel or air dryer\n\nTip: Sing "Happy Birthday" twice to time 20 seconds.' },
    { title: 'When to Wash Your Hands', content: 'You must wash hands:\n\n• Before starting food prep or handling ready-to-eat food\n• After touching raw meat, poultry, or seafood\n• After using the restroom\n• After sneezing, coughing, or touching your face\n• After handling garbage or cleaning chemicals\n• After touching your hair, phone, or money\n• When switching between raw and ready-to-eat foods\n• After eating, drinking, or smoking\n• After handling animals' },
    { title: 'Glove Use & Hand Hygiene', content: 'Important: Gloves are NOT a substitute for handwashing!\n\nAlways wash hands BEFORE putting on gloves and AFTER removing them. Change gloves:\n\n• When switching tasks (raw to ready-to-eat)\n• After touching non-food surfaces\n• Every 4 hours during continuous use\n• When gloves become torn or contaminated\n\nNever wash and reuse disposable gloves.' },
  ],
  'tm-09': [
    { title: 'Understanding Fire Extinguisher Classes', content: 'Kitchen environments face multiple fire risks. Understanding extinguisher classes is critical:\n\n• Class A — Ordinary combustibles (paper, wood, cloth)\n• Class B — Flammable liquids (oils, gasoline, grease)\n• Class C — Electrical equipment fires\n• Class K — Kitchen cooking oils and fats (most important for kitchens!)\n\nClass K extinguishers use wet chemical agents specifically designed for high-temperature cooking oil fires. Every commercial kitchen must have a Class K extinguisher within 30 feet of cooking equipment.' },
    { title: 'The PASS Technique', content: 'Remember PASS when using any fire extinguisher:\n\nP — Pull the pin (twist and pull to break the tamper seal)\nA — Aim the nozzle at the BASE of the fire (not the flames)\nS — Squeeze the handle to discharge the agent\nS — Sweep from side to side at the base of the fire\n\nStand 6-8 feet from the fire. Continue until the fire is completely out or the extinguisher is empty.' },
    { title: 'When to Fight vs. Evacuate', content: 'Only attempt to fight a fire if ALL of these conditions are met:\n\n✓ The fire is small (trash can size or smaller)\n✓ You have the right type of extinguisher\n✓ You have a clear escape route behind you\n✓ The room is not filling with smoke\n✓ You feel confident using the extinguisher\n\nIf ANY condition is not met → EVACUATE IMMEDIATELY.\n\nNever try to fight a fire that:\n• Has spread beyond where it started\n• Could block your exit\n• Involves hazardous materials\n• Is producing thick black smoke' },
    { title: 'Monthly Inspection Requirements', content: 'Fire extinguishers must be inspected monthly. Check:\n\n□ Extinguisher is in its designated location\n□ Access is not blocked or obstructed\n□ Pressure gauge is in the green zone\n□ Pin and tamper seal are intact\n□ No visible damage, corrosion, or leakage\n□ Nozzle is clear of debris\n□ Tag shows last professional inspection date\n\nProfessional inspection required annually. Hydrostatic testing every 5-12 years depending on type.' },
  ],
};

// Demo quiz questions
const DEMO_QUESTIONS = [
  { id: 'q1', text: 'What is the minimum water temperature for handwashing?', options: ['80°F (27°C)', '100°F (38°C)', '120°F (49°C)', '140°F (60°C)'], correct: 1 },
  { id: 'q2', text: 'How long should you scrub your hands with soap?', options: ['5 seconds', '10 seconds', '20 seconds', '30 seconds'], correct: 2 },
  { id: 'q3', text: 'When should you change gloves?', options: ['Every hour', 'When switching from raw to ready-to-eat food', 'Only when they tear', 'At the end of your shift'], correct: 1 },
  { id: 'q4', text: 'Gloves are a substitute for handwashing.', options: ['True', 'False'], correct: 1 },
  { id: 'q5', text: 'After using the restroom, you should:', options: ['Put on gloves immediately', 'Wash hands then put on gloves', 'Use hand sanitizer only', 'Wash hands only if visibly dirty'], correct: 1 },
];

// ── Lesson Viewer ────────────────────────────────────────────────────────────

function LessonViewer({ module, lessonIdx, onNext, onBack }: {
  module: TrainingModule; lessonIdx: number;
  onNext: () => void; onBack: () => void;
}) {
  const lessons = DEMO_LESSONS[module.id] || [
    { title: `${module.title} — Lesson ${lessonIdx + 1}`, content: `This is a placeholder lesson for "${module.title}". In production, rich content would include interactive diagrams, videos, and practice scenarios.\n\nKey topics covered:\n• ${module.description}` },
  ];
  const lesson = lessons[Math.min(lessonIdx, lessons.length - 1)];

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* Lesson Header */}
      <div style={{ background: '#f9fafb', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{module.title} — Lesson {lessonIdx + 1} of {module.lessonCount}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{lesson.title}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6b7280' }}>
          <Timer size={14} /> ~3 min read
        </div>
      </div>
      {/* Content */}
      <div style={{ padding: 24, lineHeight: 1.8, fontSize: 15, color: '#374151' }}>
        {lesson.content.split('\n').map((line, i) => (
          <p key={i} style={{ margin: line.trim() === '' ? '12px 0' : '6px 0', whiteSpace: 'pre-wrap' }}>
            {line.startsWith('•') || line.startsWith('✓') || line.startsWith('□')
              ? <span style={{ display: 'flex', gap: 8 }}><span>{line.charAt(0)}</span><span>{line.slice(2)}</span></span>
              : line}
          </p>
        ))}
      </div>
      {/* Navigation */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          Back
        </button>
        <button onClick={onNext}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          {lessonIdx >= module.lessonCount - 1 ? 'Take Module Quiz' : 'Next Lesson'} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Quiz Engine ──────────────────────────────────────────────────────────────

function QuizEngine({ moduleTitle, questionCount, passingScore, onComplete }: {
  moduleTitle: string; questionCount: number; passingScore: number;
  onComplete: (score: number, passed: boolean) => void;
}) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(DEMO_QUESTIONS.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const questions = DEMO_QUESTIONS.slice(0, Math.min(questionCount, DEMO_QUESTIONS.length));
  const q = questions[currentQ];

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = selected;
    setAnswers(newAnswers);
    setSelected(null);

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      // Calculate score
      const correct = newAnswers.reduce((c, a, i) => c + (a === questions[i]?.correct ? 1 : 0), 0);
      const score = Math.round((correct / questions.length) * 100);
      setSubmitted(true);
      setShowResults(true);
      onComplete(score, score >= passingScore);
    }
  };

  if (showResults) {
    const correct = answers.reduce((c, a, i) => c + (a === questions[i]?.correct ? 1 : 0), 0);
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= passingScore;

    return (
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 32, textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 40, background: passed ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          {passed ? <CheckCircle2 size={40} color="#15803d" /> : <XCircle size={40} color="#dc2626" />}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: passed ? '#15803d' : '#dc2626', margin: '0 0 8px' }}>
          {passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
        </h2>
        <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 20px' }}>
          You scored <strong>{score}%</strong> ({correct}/{questions.length} correct). {passed ? 'Great job!' : `You need ${passingScore}% to pass.`}
        </p>
        <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>{moduleTitle}</div>
        {/* Question Review */}
        <div style={{ textAlign: 'left', marginTop: 24, borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
          {questions.map((qq, i) => (
            <div key={qq.id} style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: answers[i] === qq.correct ? '#f0fdf4' : '#fef2f2' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Q{i + 1}: {qq.text}</div>
              <div style={{ fontSize: 13, color: answers[i] === qq.correct ? '#15803d' : '#dc2626' }}>
                Your answer: {qq.options[answers[i] ?? 0]} {answers[i] === qq.correct ? '✓' : `✗ (Correct: ${qq.options[qq.correct]})`}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* Quiz Header */}
      <div style={{ background: '#f9fafb', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{moduleTitle} — Quiz</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Question {currentQ + 1} of {questions.length}</div>
        </div>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4 }}>
          {questions.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i < currentQ ? '#1e4d6b' : i === currentQ ? '#d4af37' : '#e5e7eb' }} />
          ))}
        </div>
      </div>
      {/* Question */}
      <div style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 20px' }}>{q.text}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => setSelected(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10,
                border: selected === i ? '2px solid #1e4d6b' : '1px solid #d1d5db',
                background: selected === i ? '#eef4f8' : '#fff', cursor: 'pointer', textAlign: 'left',
                fontSize: 15, color: '#374151', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
              }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, border: selected === i ? '6px solid #1e4d6b' : '2px solid #d1d5db',
                flexShrink: 0, transition: 'all 0.15s',
              }} />
              {opt}
            </button>
          ))}
        </div>
      </div>
      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#9ca3af' }}>Passing score: {passingScore}%</span>
        <button onClick={handleNext} disabled={selected === null}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, border: 'none',
            background: selected !== null ? '#1e4d6b' : '#d1d5db', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: selected !== null ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif",
          }}>
          {currentQ < questions.length - 1 ? 'Next' : 'Submit Quiz'} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── AI Study Companion ───────────────────────────────────────────────────────

function AICompanion({ courseTitle }: { courseTitle: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: `Hi! I'm your AI study companion for "${courseTitle}". Ask me anything about the course material — I can explain concepts, quiz you on topics, or help identify areas to review. What would you like to know?` },
  ]);
  const [input, setInput] = useState('');

  const demoResponses: Record<string, string> = {
    'temperature': 'The danger zone for food is between 41°F (5°C) and 135°F (57°C). Bacteria grow rapidly in this range. Key cooking temperatures:\n\n• Poultry: 165°F (74°C)\n• Ground meat: 155°F (68°C)\n• Pork, seafood: 145°F (63°C)\n• Hot holding: 135°F (57°C)\n• Cold holding: 41°F (5°C) or below',
    'handwashing': 'Proper handwashing takes at least 20 seconds with warm water (100°F+) and soap. Remember the key moments: before handling food, after raw meat, after restroom, after touching face/hair/phone, and when switching tasks.',
    'allergen': 'The Big 9 allergens are: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, and sesame. Cross-contact prevention includes separate prep areas, clean utensils, and clear labeling.',
    'pass': 'PASS is the technique for using a fire extinguisher:\nP — Pull the pin\nA — Aim at the base of the fire\nS — Squeeze the handle\nS — Sweep side to side\n\nStand 6-8 feet away and always keep your back to an exit.',
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    // Simple keyword matching for demo
    const lower = userMsg.toLowerCase();
    let response = 'That\'s a great question! In a production environment, I would use the Claude API to provide detailed, contextual answers about the training material. For this demo, try asking about "temperature", "handwashing", "allergens", or "PASS technique".';
    for (const [key, val] of Object.entries(demoResponses)) {
      if (lower.includes(key)) { response = val; break; }
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    }, 500);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 400 }}>
      <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Brain size={18} color="#d4af37" />
        <span style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>AI Study Companion</span>
        <span style={{ fontSize: 12, color: '#92400e', opacity: 0.7 }}>(Powered by Claude)</span>
      </div>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
              background: m.role === 'user' ? '#1e4d6b' : '#f3f4f6',
              color: m.role === 'user' ? '#fff' : '#374151',
              fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question about the material..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }} />
        <button onClick={handleSend}
          style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Certificate View ─────────────────────────────────────────────────────────

function CertificateView({ cert, course }: { cert: TrainingCertificate; course: TCourse }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #d4af37', padding: 40, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ borderBottom: '2px solid #d4af37', paddingBottom: 24, marginBottom: 24 }}>
        <Award size={48} color="#d4af37" />
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1e4d6b', margin: '12px 0 4px' }}>Certificate of Completion</h2>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>EvidLY Training & Certification Platform</p>
      </div>
      <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 8px' }}>This certifies that</p>
      <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{cert.employeeName}</p>
      <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 20px' }}>has successfully completed</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#1e4d6b', margin: '0 0 8px' }}>{course.title}</p>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
        Score: {cert.scorePercent}% &middot; {course.moduleCount} modules &middot; {course.estimatedDurationMin} minutes
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>Certificate Number</div>
          <code style={{ fontSize: 14, fontWeight: 600 }}>{cert.certificateNumber}</code>
        </div>
        <div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>Issued</div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{new Date(cert.issuedAt).toLocaleDateString()}</span>
        </div>
        {cert.expiresAt && (
          <div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>Expires</div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{new Date(cert.expiresAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      <button onClick={() => alert('Download certificate PDF (demo)')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        <Download size={16} /> Download PDF
      </button>
    </div>
  );
}

// ── Main TrainingCourse Component ────────────────────────────────────────────

export function TrainingCourse() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const course = trainingCourses.find(c => c.id === id);
  const modules = trainingModules.filter(m => m.courseId === id);
  const enrollments = trainingEnrollments.filter(e => e.courseId === id);
  const certificates = trainingCertificates.filter(c => c.courseId === id);
  const quizzes = trainingQuizAttempts.filter(q => q.courseId === id || modules.some(m => m.id === q.moduleId));

  // Demo: pick first in-progress enrollment, or first enrollment, or simulate
  const enrollment = enrollments.find(e => e.status === 'in_progress') || enrollments[0] || null;
  const cert = certificates[0] || null;

  const [view, setView] = useState<ViewState>('overview');
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]));
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [showAI, setShowAI] = useState(false);

  const CatIcon = course ? CATEGORY_ICON[course.category] : BookOpen;

  if (!course) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: '#111827' }}>Course Not Found</h2>
        <p style={{ color: '#6b7280' }}>The requested course could not be found.</p>
        <button onClick={() => navigate('/training')}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          Back to Training
        </button>
      </div>
    );
  }

  const toggleModule = (idx: number) => {
    const next = new Set(expandedModules);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setExpandedModules(next);
  };

  const startLesson = (moduleIdx: number, lessonIdx: number) => {
    setActiveModuleIdx(moduleIdx);
    setActiveLessonIdx(lessonIdx);
    setView('lesson');
  };

  const handleQuizComplete = (score: number, passed: boolean) => {
    if (passed) {
      setCompletedModules(prev => new Set(prev).add(activeModuleIdx));
    }
  };

  // Overview
  if (view === 'overview') {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* Header */}
        <button onClick={() => navigate('/training')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
          <ArrowLeft size={16} /> Back to Training
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          {/* Left: Course Info */}
          <div>
            {/* Course Header Card */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ height: 8, background: course.thumbnailColor }} />
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: course.thumbnailColor + '18', color: course.thumbnailColor }}>
                    <CatIcon size={14} /> {course.categoryLabel}
                  </span>
                  {course.language !== 'en' && (
                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#f3f4f6', color: '#6b7280' }}>
                      <Globe size={12} /> {course.language.toUpperCase()}
                    </span>
                  )}
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{course.title}</h1>
                <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>{course.description}</p>
                <div style={{ display: 'flex', gap: 20 }}>
                  {[
                    { icon: BookOpen, label: `${course.moduleCount} Modules` },
                    { icon: Clock, label: `~${course.estimatedDurationMin} min` },
                    { icon: Users, label: `${course.enrolledCount} enrolled` },
                    { icon: BarChart3, label: `Pass: ${course.passingScorePercent}%` },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#6b7280' }}>
                      <s.icon size={16} /> {s.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Module List */}
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Course Modules</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {modules.map((mod, idx) => {
                const isExpanded = expandedModules.has(idx);
                const isComplete = completedModules.has(idx);
                return (
                  <div key={mod.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    {/* Module Header */}
                    <button onClick={() => toggleModule(idx)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 14, background: isComplete ? '#dcfce7' : '#eef4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isComplete ? <CheckCircle2 size={16} color="#15803d" /> : <span style={{ fontSize: 13, fontWeight: 700, color: '#1e4d6b' }}>{idx + 1}</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{mod.title}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                          {mod.lessonCount} lessons &middot; ~{mod.estimatedDurationMin} min &middot; {mod.questionCount} questions
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown size={18} color="#9ca3af" /> : <ChevronRight size={18} color="#9ca3af" />}
                    </button>
                    {/* Expanded Content */}
                    {isExpanded && (
                      <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '10px 0 12px', lineHeight: 1.5 }}>{mod.description}</p>
                        {/* Lesson Links */}
                        {Array.from({ length: mod.lessonCount }, (_, i) => {
                          const demoLesson = (DEMO_LESSONS[mod.id] || [])[i];
                          return (
                            <button key={i} onClick={() => startLesson(idx, i)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', marginBottom: 4, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif" }}>
                              <Play size={14} color="#1e4d6b" />
                              <span style={{ fontSize: 13, color: '#374151' }}>
                                Lesson {i + 1}{demoLesson ? `: ${demoLesson.title}` : ''}
                              </span>
                            </button>
                          );
                        })}
                        <button onClick={() => { setActiveModuleIdx(idx); setView('quiz'); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', marginTop: 4, background: '#eef4f8', border: '1px solid #b8d4e8', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif" }}>
                          <FileText size={14} color="#1e4d6b" />
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e4d6b' }}>Module Quiz ({mod.questionCount} questions)</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar */}
          <div>
            {/* Enrollment Card */}
            {enrollment && (
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Your Progress</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1, height: 10, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${enrollment.progressPercent}%`, height: '100%', background: '#1e4d6b', borderRadius: 5 }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e4d6b' }}>{enrollment.progressPercent}%</span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
                  <div>Status: <span style={{ fontWeight: 600, color: STATUS_BADGE[enrollment.status]?.text }}>{STATUS_BADGE[enrollment.status]?.label}</span></div>
                  {enrollment.expiresAt && <div>Due: {new Date(enrollment.expiresAt).toLocaleDateString()}</div>}
                  {enrollment.scorePercent !== null && <div>Score: {enrollment.scorePercent}%</div>}
                </div>
                {enrollment.status === 'in_progress' && (
                  <button onClick={() => { setActiveModuleIdx(0); setActiveLessonIdx(0); setView('lesson'); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 12, fontFamily: "'DM Sans', sans-serif" }}>
                    <Play size={16} /> Continue Learning
                  </button>
                )}
              </div>
            )}

            {/* Certificate (if exists) */}
            {cert && (
              <div style={{ background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', padding: 20, marginBottom: 16, textAlign: 'center' }}>
                <Award size={32} color="#d4af37" />
                <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14, marginTop: 8, marginBottom: 4 }}>Certificate Earned</div>
                <code style={{ fontSize: 12, color: '#6b7280' }}>{cert.certificateNumber}</code>
                <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>{cert.employeeName} &middot; {cert.scorePercent}%</div>
                <button onClick={() => setView('certificate')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: '1px solid #d4af37', background: '#fff', color: '#92400e', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 10, fontFamily: "'DM Sans', sans-serif" }}>
                  <Eye size={14} /> View
                </button>
              </div>
            )}

            {/* AI Companion Toggle */}
            <button onClick={() => setShowAI(!showAI)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, border: '1px solid #d4af37', background: showAI ? '#fffbeb' : '#fff', color: '#92400e', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>
              <Brain size={16} /> {showAI ? 'Hide' : 'Show'} AI Study Companion
            </button>
            {showAI && <AICompanion courseTitle={course.title} />}

            {/* Recent Quiz Attempts */}
            {quizzes.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 16, marginTop: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>Quiz History</h3>
                {quizzes.slice(0, 5).map(q => (
                  <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{q.moduleTitle || 'Final Assessment'}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{q.employeeName} &middot; Attempt #{q.attemptNumber}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: q.passed ? '#dcfce7' : '#fee2e2', color: q.passed ? '#15803d' : '#dc2626' }}>
                      {q.scorePercent}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Lesson View
  if (view === 'lesson') {
    const mod = modules[activeModuleIdx];
    if (!mod) { setView('overview'); return null; }

    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <button onClick={() => setView('overview')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
          <ArrowLeft size={16} /> Back to Course Overview
        </button>
        <LessonViewer
          module={mod}
          lessonIdx={activeLessonIdx}
          onNext={() => {
            if (activeLessonIdx < mod.lessonCount - 1) {
              setActiveLessonIdx(activeLessonIdx + 1);
            } else {
              setView('quiz');
            }
          }}
          onBack={() => {
            if (activeLessonIdx > 0) {
              setActiveLessonIdx(activeLessonIdx - 1);
            } else {
              setView('overview');
            }
          }}
        />
      </div>
    );
  }

  // Quiz View
  if (view === 'quiz') {
    const mod = modules[activeModuleIdx];
    if (!mod) { setView('overview'); return null; }

    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <button onClick={() => setView('overview')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
          <ArrowLeft size={16} /> Back to Course Overview
        </button>
        <QuizEngine
          moduleTitle={mod.title}
          questionCount={5}
          passingScore={course.passingScorePercent}
          onComplete={handleQuizComplete}
        />
      </div>
    );
  }

  // Certificate View
  if (view === 'certificate' && cert) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <button onClick={() => setView('overview')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
          <ArrowLeft size={16} /> Back to Course Overview
        </button>
        <CertificateView cert={cert} course={course} />
      </div>
    );
  }

  return null;
}
