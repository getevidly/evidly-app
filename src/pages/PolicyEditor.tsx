import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown, Edit3, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { usePolicy, type PolicySection } from '../hooks/usePolicies';

// ── Status config ────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; fg: string }> = {
  draft:    { label: 'Draft',    bg: '#DBEAFE', fg: '#1D4ED8' },
  active:   { label: 'Active',   bg: '#E8F5E9', fg: '#2E7D32' },
  archived: { label: 'Archived', bg: '#F3F4F6', fg: '#6B7280' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.draft;
  return (
    <span
      style={{ backgroundColor: s.bg, color: s.fg }}
      className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
    >
      {s.label}
    </span>
  );
}

// ── Main component ───────────────────────────────────────

export function PolicyEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { policy, loading, error, refetch } = usePolicy(id);

  const [sections, setSections] = useState<PolicySection[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (policy?.body_sections) {
      const s = Array.isArray(policy.body_sections) ? policy.body_sections : [];
      setSections(s);
      setSavedSnapshot(JSON.stringify(s));
    }
  }, [policy]);

  const dirty = JSON.stringify(sections) !== savedSnapshot;

  const handleSectionChange = useCallback((index: number, field: keyof PolicySection, value: string) => {
    setSections(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const handleAddSection = useCallback(() => {
    setSections(prev => [...prev, { heading: '', content: '' }]);
    setExpandedIndex(sections.length);
  }, [sections.length]);

  const handleRemoveSection = useCallback((index: number) => {
    setSections(prev => prev.filter((_, i) => i !== index));
    setExpandedIndex(null);
  }, []);

  const handleMoveSection = useCallback((fromIndex: number, direction: number) => {
    const toIndex = fromIndex + direction;
    setSections(prev => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[fromIndex];
      next[fromIndex] = next[toIndex];
      next[toIndex] = temp;
      return next;
    });
    setExpandedIndex(fromIndex + direction);
  }, []);

  const handleSave = useCallback(async () => {
    if (!id || saving) return;
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('org_policies')
        .update({ body_sections: sections })
        .eq('id', id);
      if (err) throw new Error(err.message);
      setSavedSnapshot(JSON.stringify(sections));
      toast.success('Policy saved');
      refetch();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [id, sections, saving, refetch]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!id) return;
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'active') {
      updates.effective_date = new Date().toISOString().split('T')[0];
    }
    if (newStatus === 'draft') {
      updates.effective_date = null;
    }
    try {
      const { error: err } = await supabase
        .from('org_policies')
        .update(updates)
        .eq('id', id);
      if (err) throw new Error(err.message);
      toast.success('Status updated to ' + newStatus);
      refetch();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to update status');
    }
  }, [id, refetch]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#1E2D4D]/10 rounded w-48" />
          <div className="h-20 bg-[#1E2D4D]/5 rounded-xl" />
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-lg border border-[#E5E0D8]" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/policies')}
          className="flex items-center gap-1.5 text-sm text-[#1E2D4D]/60 hover:text-[#1E2D4D] mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Policies
        </button>
        <div className="bg-white rounded-xl border border-[#E5E0D8] p-8 text-center">
          <p className="text-[#1E2D4D]/60 text-sm">
            {error?.message || 'Policy not found.'}
          </p>
        </div>
      </div>
    );
  }

  const categoryLabel = (policy.category || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const allSectionsEmpty = sections.length > 0 && sections.every(s => !s.content?.trim());

  return (
    <div className="p-6 pb-24 space-y-5">
      {/* Back link */}
      <button
        onClick={() => navigate('/policies')}
        className="flex items-center gap-1.5 text-sm text-[#1E2D4D]/60 hover:text-[#1E2D4D] transition-colors"
      >
        <ArrowLeft size={16} /> Back to Policies
      </button>

      {/* Policy header */}
      <div className="bg-white rounded-xl border border-[#E5E0D8] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[#1E2D4D] text-lg font-bold">{policy.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusPill status={policy.status} />
              <span className="text-[11px] text-[#1E2D4D]/50 bg-[#FAF7F0] px-2 py-0.5 rounded-full border border-[#E5E0D8]">
                {categoryLabel}
              </span>
              <span className="text-[11px] text-[#1E2D4D]/50">v{policy.version}</span>
              {policy.effective_date && (
                <span className="text-[11px] text-[#1E2D4D]/50">
                  Effective {new Date(policy.effective_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(m => m === 'view' ? 'edit' : 'view')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-[#E5E0D8] text-[#1E2D4D] hover:bg-[#FAF7F0] transition-colors"
            >
              {mode === 'view' ? <><Edit3 size={14} /> Edit</> : <><Eye size={14} /> View</>}
            </button>

            {policy.status === 'draft' && (
              <button
                onClick={() => handleStatusChange('active')}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#2E7D32] text-white hover:bg-[#256B29] transition-colors"
              >
                Mark Active
              </button>
            )}
            {policy.status === 'active' && (
              <button
                onClick={() => handleStatusChange('archived')}
                className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[#E5E0D8] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
              >
                Archive
              </button>
            )}
            {policy.status === 'archived' && (
              <button
                onClick={() => handleStatusChange('draft')}
                className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[#E5E0D8] text-[#1D4ED8] hover:bg-[#DBEAFE] transition-colors"
              >
                Reactivate as Draft
              </button>
            )}
          </div>
        </div>
      </div>

      {/* All-empty banner (scaffolding template) */}
      {allSectionsEmpty && (
        <div className="bg-[#FAF7F0] border border-[#E5E0D8] rounded-lg px-4 py-3">
          <p className="text-sm text-[#1E2D4D]/60 italic">
            This is a template outline — section content will be added.
          </p>
        </div>
      )}

      {/* Section list */}
      <div className="space-y-2">
        {sections.length === 0 && (
          <div className="bg-white rounded-xl border border-[#E5E0D8] p-8 text-center">
            <p className="text-[#1E2D4D]/50 text-sm mb-3">No sections in this policy yet.</p>
            {mode === 'edit' && (
              <button
                onClick={handleAddSection}
                className="px-4 py-2 bg-[#1E2D4D] text-white rounded-lg text-sm font-semibold hover:bg-[#162340] transition-colors"
              >
                <Plus size={14} className="inline mr-1" /> Add Section
              </button>
            )}
          </div>
        )}

        {sections.map((section, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <div
              key={index}
              className="bg-white rounded-lg border border-[#E5E0D8] overflow-hidden"
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-[#FAF7F0]/50 transition-colors"
              >
                {isExpanded
                  ? <ChevronDown size={16} className="text-[#1E2D4D]/40 flex-shrink-0" />
                  : <ChevronRight size={16} className="text-[#1E2D4D]/40 flex-shrink-0" />
                }
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-[#1E2D4D] block truncate">
                    {section.heading || '(Untitled section)'}
                  </span>
                  {!isExpanded && section.content && (
                    <span className="text-[11px] text-[#1E2D4D]/40 block truncate mt-0.5">
                      {section.content.slice(0, 100)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#1E2D4D]/30 flex-shrink-0">
                  {index + 1} / {sections.length}
                </span>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 border-t border-[#E5E0D8]">
                  {mode === 'edit' ? (
                    <div className="space-y-3 pt-3">
                      <div>
                        <label className="text-[11px] font-medium text-[#1E2D4D]/60 uppercase tracking-wide block mb-1">
                          Section Heading
                        </label>
                        <input
                          type="text"
                          value={section.heading}
                          onChange={e => handleSectionChange(index, 'heading', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E5E0D8] rounded-md text-sm text-[#1E2D4D] focus:outline-none focus:border-[#A08C5A] transition-colors"
                          placeholder="Section heading"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-[#1E2D4D]/60 uppercase tracking-wide block mb-1">
                          Content
                        </label>
                        <AutoTextarea
                          value={section.content}
                          onChange={val => handleSectionChange(index, 'content', val)}
                          placeholder="Section content... {{tokens}} are displayed as-is."
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleMoveSection(index, -1)}
                          disabled={index === 0}
                          className="p-1.5 rounded text-[#1E2D4D]/40 hover:text-[#1E2D4D] hover:bg-[#FAF7F0] disabled:opacity-30 transition-colors"
                          title="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMoveSection(index, 1)}
                          disabled={index === sections.length - 1}
                          className="p-1.5 rounded text-[#1E2D4D]/40 hover:text-[#1E2D4D] hover:bg-[#FAF7F0] disabled:opacity-30 transition-colors"
                          title="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={() => {
                            if (confirm('Remove this section?')) handleRemoveSection(index);
                          }}
                          className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove section"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3">
                      {section.content ? (
                        <p className="text-sm text-[#1E2D4D]/80 whitespace-pre-wrap leading-relaxed">
                          {section.content}
                        </p>
                      ) : !allSectionsEmpty ? (
                        <p className="text-sm text-[#1E2D4D]/40 italic">
                          Content for this section hasn't been added yet.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {mode === 'edit' && sections.length > 0 && (
          <button
            onClick={handleAddSection}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-[#E5E0D8] text-[#1E2D4D]/40 hover:text-[#1E2D4D]/70 hover:border-[#1E2D4D]/30 text-sm font-medium transition-colors"
          >
            <Plus size={14} /> Add Section
          </button>
        )}
      </div>

      {/* Sticky save footer */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E0D8] px-6 py-3 flex items-center justify-between z-40 shadow-lg">
          <span className="text-sm text-[#1E2D4D]/60">You have unsaved changes</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#1E2D4D] text-white rounded-lg text-sm font-semibold hover:bg-[#162340] transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Auto-height textarea ─────────────────────────────────

function AutoTextarea({ value, onChange, placeholder }: { value: string; onChange: (val: string) => void; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-[#E5E0D8] rounded-md text-sm text-[#1E2D4D] focus:outline-none focus:border-[#A08C5A] transition-colors resize-none overflow-hidden min-h-[80px] leading-relaxed"
      rows={3}
    />
  );
}

export default PolicyEditor;
