import { useState, useMemo } from 'react';
import { X, GraduationCap, Search, CheckCircle2 } from 'lucide-react';
import { trainingCourses } from '../../data/demoData';
import type { TrainingEmployee } from '../../data/trainingRecordsDemoData';
import { CARD_BG, CARD_BORDER, BODY_TEXT, MUTED, TEXT_TERTIARY } from '../dashboard/shared/constants';
import { AIAssistButton, AIGeneratedIndicator } from '../ui/AIAssistButton';

const NAVY = '#1e4d6b';

interface AssignTrainingModalProps {
  open: boolean;
  onClose: () => void;
  employeeId?: string;
  employeeName?: string;
  employees: TrainingEmployee[];
  onAssign: (data: { employeeId: string; employeeName: string; courseId: string; courseTitle: string; dueDate: string; notes: string }) => void;
}

export function AssignTrainingModal({ open, onClose, employeeId, employeeName, employees, onAssign }: AssignTrainingModalProps) {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(employeeId ? [employeeId] : []);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const filteredEmployees = useMemo(() => {
    if (!empSearch) return employees;
    const q = empSearch.toLowerCase();
    return employees.filter(e => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
  }, [employees, empSearch]);

  const activeCourses = trainingCourses.filter(c => c.isActive);

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    setError('');
    if (selectedEmployees.length === 0) { setError('Select at least one employee'); return; }
    if (!selectedCourse) { setError('Select a training course'); return; }
    if (!dueDate) { setError('Set a due date'); return; }

    const course = activeCourses.find(c => c.id === selectedCourse);
    for (const empId of selectedEmployees) {
      const emp = employees.find(e => e.id === empId);
      if (emp && course) {
        onAssign({ employeeId: empId, employeeName: emp.name, courseId: selectedCourse, courseTitle: course.title, dueDate, notes });
      }
    }
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${CARD_BORDER}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={20} color={NAVY} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: BODY_TEXT }}>Assign Training</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
            <X size={20} color={TEXT_TERTIARY} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Employee Selection */}
          {!employeeId && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT, display: 'block', marginBottom: 6 }}>Select Employee(s)</label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Search size={14} color={TEXT_TERTIARY} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 6, border: `1px solid ${CARD_BORDER}`, fontSize: 13, color: BODY_TEXT, outline: 'none' }}
                />
              </div>
              <div style={{ maxHeight: 160, overflowY: 'auto', border: `1px solid ${CARD_BORDER}`, borderRadius: 8 }}>
                {filteredEmployees.map(emp => {
                  const isSelected = selectedEmployees.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleEmployee(emp.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'transparent',
                        borderBottom: `1px solid ${CARD_BORDER}`,
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? NAVY : CARD_BORDER}`,
                        background: isSelected ? NAVY : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <CheckCircle2 size={12} color="#fff" />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: BODY_TEXT }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: TEXT_TERTIARY }}>{emp.role} — {emp.locationName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedEmployees.length > 0 && (
                <p style={{ fontSize: 12, color: NAVY, fontWeight: 600, marginTop: 6 }}>
                  {selectedEmployees.length} employee{selectedEmployees.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {employeeId && employeeName && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT, display: 'block', marginBottom: 6 }}>Employee</label>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f0f4f8', border: `1px solid ${CARD_BORDER}`, fontSize: 13, color: BODY_TEXT, fontWeight: 500 }}>
                {employeeName}
              </div>
            </div>
          )}

          {/* Course Selection */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT, display: 'block', marginBottom: 6 }}>Training Course</label>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, fontSize: 13, color: BODY_TEXT, cursor: 'pointer', background: CARD_BG }}
            >
              <option value="">Select a course...</option>
              {activeCourses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT, display: 'block', marginBottom: 6 }}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, fontSize: 13, color: BODY_TEXT, background: CARD_BG }}
            />
          </div>

          {/* Notes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT }}>Notes / Instructions (optional)</label>
              <AIAssistButton
                fieldLabel="Notes"
                context={{ trainingName: activeCourses.find(c => c.id === selectedCourse)?.title }}
                currentValue={notes}
                onGenerated={(text) => { setNotes(text); setAiFields(prev => new Set(prev).add('notes')); }}
              />
            </div>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('notes'); return n; }); }}
              rows={3}
              placeholder="Any additional instructions for the employee..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, fontSize: 13, color: BODY_TEXT, resize: 'vertical', background: CARD_BG }}
            />
            {aiFields.has('notes') && <AIGeneratedIndicator />}
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: `1px solid ${CARD_BORDER}`, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: 'transparent', fontSize: 13, fontWeight: 600, color: MUTED, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: NAVY, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
