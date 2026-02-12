import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, BookOpen, Plus, Trash2, GripVertical,
  CheckCircle2, Clock, Settings2, Users, Save, Eye,
  ChevronRight, AlertCircle, Globe, Shield, Flame, Brain,
  BookOpenCheck, FileText,
} from 'lucide-react';
import { trainingCourses, type TrainingCategory } from '../data/demoData';

type Step = 'basics' | 'modules' | 'lessons' | 'questions' | 'config' | 'assign';

const STEPS: { id: Step; label: string; number: number }[] = [
  { id: 'basics', label: 'Course Basics', number: 1 },
  { id: 'modules', label: 'Modules', number: 2 },
  { id: 'lessons', label: 'Lessons', number: 3 },
  { id: 'questions', label: 'Quiz Questions', number: 4 },
  { id: 'config', label: 'Configuration', number: 5 },
  { id: 'assign', label: 'Assign & Publish', number: 6 },
];

const CATEGORIES: { value: TrainingCategory; label: string; icon: typeof Shield }[] = [
  { value: 'food_safety_handler', label: 'Food Safety – Handler', icon: Shield },
  { value: 'food_safety_manager', label: 'Food Safety – Manager', icon: BookOpenCheck },
  { value: 'fire_safety', label: 'Fire Safety', icon: Flame },
  { value: 'compliance_ops', label: 'Compliance Ops', icon: Settings2 },
  { value: 'custom', label: 'Custom', icon: Brain },
];

interface ModuleDraft {
  id: string;
  title: string;
  description: string;
  lessons: { title: string; content: string; type: 'text' | 'video' | 'interactive' }[];
  questions: { text: string; options: string[]; correctIndex: number; explanation: string }[];
}

export function CourseBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('basics');

  // Step 1: Basics
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TrainingCategory>('custom');
  const [language, setLanguage] = useState('en');
  const [thumbnailColor, setThumbnailColor] = useState('#7c3aed');

  // Step 2: Modules
  const [modules, setModules] = useState<ModuleDraft[]>([
    { id: 'mod-1', title: '', description: '', lessons: [{ title: '', content: '', type: 'text' }], questions: [] },
  ]);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);

  // Step 5: Config
  const [passingScore, setPassingScore] = useState(70);
  const [estimatedMin, setEstimatedMin] = useState(30);
  const [allowRetakes, setAllowRetakes] = useState(true);
  const [certExpYears, setCertExpYears] = useState(3);

  // Step 6: Assign
  const [assignLocations, setAssignLocations] = useState<Set<string>>(new Set());
  const [autoEnroll, setAutoEnroll] = useState(false);

  const stepIdx = STEPS.findIndex(s => s.id === step);
  const canNext = () => {
    if (step === 'basics') return title.trim().length > 0 && description.trim().length > 0;
    return true;
  };
  const goNext = () => { if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1].id); };
  const goBack = () => { if (stepIdx > 0) setStep(STEPS[stepIdx - 1].id); };

  const addModule = () => {
    setModules([...modules, { id: `mod-${modules.length + 1}`, title: '', description: '', lessons: [{ title: '', content: '', type: 'text' }], questions: [] }]);
    setActiveModuleIdx(modules.length);
  };

  const updateModule = (idx: number, update: Partial<ModuleDraft>) => {
    const next = [...modules];
    next[idx] = { ...next[idx], ...update };
    setModules(next);
  };

  const removeModule = (idx: number) => {
    if (modules.length <= 1) return;
    setModules(modules.filter((_, i) => i !== idx));
    if (activeModuleIdx >= idx && activeModuleIdx > 0) setActiveModuleIdx(activeModuleIdx - 1);
  };

  const addLesson = (modIdx: number) => {
    const mod = modules[modIdx];
    updateModule(modIdx, { lessons: [...mod.lessons, { title: '', content: '', type: 'text' }] });
  };

  const addQuestion = (modIdx: number) => {
    const mod = modules[modIdx];
    updateModule(modIdx, { questions: [...mod.questions, { text: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }] });
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: "'DM Sans', sans-serif" } as const;
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 } as const;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <button onClick={() => navigate('/training')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
        <ArrowLeft size={16} /> Back to Training
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Course Builder</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Create a custom training course with modules, lessons, and assessments</p>
        </div>
        <button onClick={() => toast.success('Draft saved')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          <Save size={14} /> Save Draft
        </button>
      </div>

      {/* Step Progress */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, overflowX: 'auto' }}>
        {STEPS.map((s, i) => {
          const isCurrent = s.id === step;
          const isDone = i < stepIdx;
          return (
            <button key={s.id} onClick={() => setStep(s.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', minHeight: 48,
                borderRadius: 8, border: isCurrent ? '2px solid #1e4d6b' : '1px solid #e5e7eb',
                background: isDone ? '#eef4f8' : isCurrent ? '#fff' : '#f9fafb',
                color: isCurrent ? '#1e4d6b' : isDone ? '#1e4d6b' : '#9ca3af',
                fontSize: 13, fontWeight: isCurrent ? 700 : 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? '#1e4d6b' : isCurrent ? '#1e4d6b' : '#e5e7eb',
                color: isDone || isCurrent ? '#fff' : '#9ca3af', fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {isDone ? '✓' : s.number}
              </span>
              <span style={{ display: 'none' }}>{s.label}</span>
              <span className="builder-step-label">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, marginBottom: 20 }}>
        {/* Step 1: Basics */}
        {step === 'basics' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Course Basics</h2>
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={labelStyle}>Course Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Advanced Food Safety for Line Cooks"
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  placeholder="Brief description of what employees will learn..."
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value as TrainingCategory)} style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)} style={inputStyle}>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Color Theme</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['#15803d', '#1e4d6b', '#dc2626', '#7c3aed', '#d4af37', '#0369a1'].map(c => (
                    <button key={c} onClick={() => setThumbnailColor(c)}
                      style={{ width: 36, height: 36, borderRadius: 8, background: c, border: thumbnailColor === c ? '3px solid #111827' : '2px solid #e5e7eb', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Modules */}
        {step === 'modules' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Course Modules ({modules.length})</h2>
              <button onClick={addModule}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
                <Plus size={14} /> Add Module
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {modules.map((mod, idx) => (
                <div key={mod.id} style={{ padding: 16, borderRadius: 10, border: activeModuleIdx === idx ? '2px solid #1e4d6b' : '1px solid #e5e7eb',
                  background: activeModuleIdx === idx ? '#fafbfc' : '#fff', cursor: 'pointer' }}
                  onClick={() => setActiveModuleIdx(idx)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <GripVertical size={16} color="#9ca3af" />
                    <span style={{ width: 24, height: 24, borderRadius: 12, background: '#eef4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#1e4d6b', flexShrink: 0 }}>{idx + 1}</span>
                    <div style={{ flex: 1 }}>
                      <input value={mod.title} onChange={e => updateModule(idx, { title: e.target.value })}
                        placeholder={`Module ${idx + 1} title`}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }} />
                      <input value={mod.description} onChange={e => updateModule(idx, { description: e.target.value })}
                        placeholder="Module description"
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, marginTop: 6, fontFamily: "'DM Sans', sans-serif" }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#6b7280' }}>
                      <span>{mod.lessons.length} lessons</span>
                      <span>{mod.questions.length} questions</span>
                    </div>
                    {modules.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); removeModule(idx); }}
                        style={{ padding: 6, borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', cursor: 'pointer' }}>
                        <Trash2 size={14} color="#dc2626" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Lessons */}
        {step === 'lessons' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Lesson Content</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
              Module: <strong>{modules[activeModuleIdx]?.title || `Module ${activeModuleIdx + 1}`}</strong>
              {modules.length > 1 && (
                <select value={activeModuleIdx} onChange={e => setActiveModuleIdx(Number(e.target.value))}
                  style={{ marginLeft: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                  {modules.map((m, i) => <option key={m.id} value={i}>{m.title || `Module ${i + 1}`}</option>)}
                </select>
              )}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {modules[activeModuleIdx]?.lessons.map((lesson, lIdx) => (
                <div key={lIdx} style={{ padding: 16, borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e4d6b', background: '#eef4f8', padding: '2px 8px', borderRadius: 10 }}>Lesson {lIdx + 1}</span>
                    <select value={lesson.type} onChange={e => {
                      const next = [...modules[activeModuleIdx].lessons];
                      next[lIdx] = { ...next[lIdx], type: e.target.value as 'text' | 'video' | 'interactive' };
                      updateModule(activeModuleIdx, { lessons: next });
                    }}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                      <option value="text">Text Content</option>
                      <option value="video">Video</option>
                      <option value="interactive">Interactive</option>
                    </select>
                    {modules[activeModuleIdx].lessons.length > 1 && (
                      <button onClick={() => {
                        const next = modules[activeModuleIdx].lessons.filter((_, i) => i !== lIdx);
                        updateModule(activeModuleIdx, { lessons: next });
                      }}
                        style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', cursor: 'pointer' }}>
                        <Trash2 size={12} color="#dc2626" />
                      </button>
                    )}
                  </div>
                  <input value={lesson.title} onChange={e => {
                    const next = [...modules[activeModuleIdx].lessons];
                    next[lIdx] = { ...next[lIdx], title: e.target.value };
                    updateModule(activeModuleIdx, { lessons: next });
                  }}
                    placeholder="Lesson title"
                    style={{ ...inputStyle, marginBottom: 8 }} />
                  <textarea value={lesson.content} onChange={e => {
                    const next = [...modules[activeModuleIdx].lessons];
                    next[lIdx] = { ...next[lIdx], content: e.target.value };
                    updateModule(activeModuleIdx, { lessons: next });
                  }}
                    rows={4} placeholder="Lesson content — use bullet points (•), numbered lists, and clear headings..."
                    style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              ))}
              <button onClick={() => addLesson(activeModuleIdx)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 16px', borderRadius: 8, border: '2px dashed #d1d5db', background: '#f9fafb', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
                <Plus size={16} /> Add Lesson
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Quiz Questions */}
        {step === 'questions' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Quiz Questions</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
              Module: <strong>{modules[activeModuleIdx]?.title || `Module ${activeModuleIdx + 1}`}</strong>
              {modules.length > 1 && (
                <select value={activeModuleIdx} onChange={e => setActiveModuleIdx(Number(e.target.value))}
                  style={{ marginLeft: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                  {modules.map((m, i) => <option key={m.id} value={i}>{m.title || `Module ${i + 1}`}</option>)}
                </select>
              )}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {modules[activeModuleIdx]?.questions.map((q, qIdx) => (
                <div key={qIdx} style={{ padding: 16, borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e4d6b' }}>Question {qIdx + 1}</span>
                    <button onClick={() => {
                      const next = modules[activeModuleIdx].questions.filter((_, i) => i !== qIdx);
                      updateModule(activeModuleIdx, { questions: next });
                    }}
                      style={{ padding: 4, borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', cursor: 'pointer' }}>
                      <Trash2 size={12} color="#dc2626" />
                    </button>
                  </div>
                  <input value={q.text} onChange={e => {
                    const next = [...modules[activeModuleIdx].questions];
                    next[qIdx] = { ...next[qIdx], text: e.target.value };
                    updateModule(activeModuleIdx, { questions: next });
                  }}
                    placeholder="Question text"
                    style={{ ...inputStyle, marginBottom: 10 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 10 }}>
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="radio" name={`q-${qIdx}-correct`} checked={q.correctIndex === oIdx}
                          onChange={() => {
                            const next = [...modules[activeModuleIdx].questions];
                            next[qIdx] = { ...next[qIdx], correctIndex: oIdx };
                            updateModule(activeModuleIdx, { questions: next });
                          }} />
                        <input value={opt} onChange={e => {
                          const next = [...modules[activeModuleIdx].questions];
                          const opts = [...next[qIdx].options];
                          opts[oIdx] = e.target.value;
                          next[qIdx] = { ...next[qIdx], options: opts };
                          updateModule(activeModuleIdx, { questions: next });
                        }}
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                          style={{ ...inputStyle, padding: '6px 10px' }} />
                      </div>
                    ))}
                  </div>
                  <input value={q.explanation} onChange={e => {
                    const next = [...modules[activeModuleIdx].questions];
                    next[qIdx] = { ...next[qIdx], explanation: e.target.value };
                    updateModule(activeModuleIdx, { questions: next });
                  }}
                    placeholder="Explanation (shown after answering)"
                    style={{ ...inputStyle, fontSize: 13 }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => addQuestion(activeModuleIdx)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: '2px dashed #d1d5db', background: '#f9fafb', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
                  <Plus size={16} /> Add Question
                </button>
                <button onClick={() => toast.info('AI question generation coming soon')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: '1px solid #d4af37', background: '#fffbeb', color: '#92400e', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
                  <Brain size={16} /> AI Generate Questions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Configuration */}
        {step === 'config' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Course Configuration</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              <div>
                <label style={labelStyle}>Passing Score (%)</label>
                <input type="number" value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} min={50} max={100}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Estimated Duration (min)</label>
                <input type="number" value={estimatedMin} onChange={e => setEstimatedMin(Number(e.target.value))} min={5}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Certificate Expiry (years)</label>
                <input type="number" value={certExpYears} onChange={e => setCertExpYears(Number(e.target.value))} min={1} max={10}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Retakes</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                  <button onClick={() => setAllowRetakes(!allowRetakes)}
                    style={{ width: 44, height: 24, borderRadius: 12, background: allowRetakes ? '#1e4d6b' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 3, left: allowRetakes ? 23 : 3, transition: 'left 0.2s' }} />
                  </button>
                  <span style={{ fontSize: 14, color: '#374151' }}>Allow unlimited retakes</span>
                </div>
              </div>
            </div>
            {/* Summary */}
            <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: '#eef4f8', border: '1px solid #b8d4e8' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e4d6b', marginBottom: 8 }}>Course Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, fontSize: 13, color: '#374151' }}>
                <div><strong>{modules.length}</strong> modules</div>
                <div><strong>{modules.reduce((s, m) => s + m.lessons.length, 0)}</strong> lessons</div>
                <div><strong>{modules.reduce((s, m) => s + m.questions.length, 0)}</strong> quiz questions</div>
                <div>Pass: <strong>{passingScore}%</strong></div>
                <div>Duration: <strong>~{estimatedMin} min</strong></div>
                <div>Cert expires: <strong>{certExpYears} years</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Assign & Publish */}
        {step === 'assign' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Assign & Publish</h2>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Assign to Locations</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['loc-downtown', 'loc-airport', 'loc-university'].map(locId => {
                  const names: Record<string, string> = { 'loc-downtown': 'Downtown Kitchen', 'loc-airport': 'Airport Terminal', 'loc-university': 'University Campus' };
                  return (
                    <label key={locId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', minHeight: 48 }}>
                      <input type="checkbox" checked={assignLocations.has(locId)}
                        onChange={() => {
                          const next = new Set(assignLocations);
                          next.has(locId) ? next.delete(locId) : next.add(locId);
                          setAssignLocations(next);
                        }} />
                      <span style={{ fontSize: 14, color: '#374151' }}>{names[locId]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={autoEnroll} onChange={e => setAutoEnroll(e.target.checked)} />
                Auto-enroll new hires at selected locations
              </label>
            </div>
            {/* Preview Card */}
            <div style={{ padding: 16, borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', marginBottom: 20 }}>
              <div style={{ height: 6, background: thumbnailColor, borderRadius: 3, marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{title || 'Untitled Course'}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{description || 'No description'}</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#9ca3af' }}>
                <span>{modules.length} modules</span>
                <span>~{estimatedMin} min</span>
                <span>Pass: {passingScore}%</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => toast.success(`Course published to ${assignLocations.size} location(s)`)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 24px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
                <CheckCircle2 size={16} /> Publish Course
              </button>
              <button onClick={() => toast.info('Student preview coming soon')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 24px', borderRadius: 8, border: '1px solid #1e4d6b', background: '#fff', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
                <Eye size={16} /> Preview as Student
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={goBack} disabled={stepIdx === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db',
            background: '#fff', color: stepIdx === 0 ? '#d1d5db' : '#374151', fontSize: 14, fontWeight: 600,
            cursor: stepIdx === 0 ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
          <ArrowLeft size={14} /> Previous
        </button>
        {stepIdx < STEPS.length - 1 && (
          <button onClick={goNext} disabled={!canNext()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none',
              background: canNext() ? '#1e4d6b' : '#d1d5db', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
            Next Step <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
