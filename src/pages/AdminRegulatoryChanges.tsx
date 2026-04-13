import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import AdminBreadcrumb from '../components/admin/AdminBreadcrumb';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';
import {
  Scale,
  Plus,
  CheckCircle2,
  XCircle,
  Send,
  Pencil,
  Eye,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Clock,
  MapPin,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { MONITORED_SOURCES } from '../lib/regulatoryMonitor';
import { useRegulatoryChanges, type AdminRegChange } from '../hooks/useRegulatoryChanges';

// ── Component ───────────────────────────────────────────

export function AdminRegulatoryChanges() {
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const isAdmin = isEvidlyAdmin || isDemoMode;

  const {
    adminChanges,
    sources: dbSources,
    analyzeWithAI,
    publishChange,
    unpublishChange,
    rejectChange,
    updateSummary,
    loading,
  } = useRegulatoryChanges();

  // Demo mode: pre-populated sample records with varied pillars
  const DEMO_SEED: AdminRegChange[] = [
    {
      id: 'demo-rc-1',
      sourceId: '',
      sourceShort: 'CDPH',
      sourceName: 'CA Dept of Public Health',
      changeType: 'amendment',
      title: 'CDPH — Updated HACCP Plan Requirements for Retail Food',
      summary: 'California Department of Public Health updated HACCP plan documentation requirements for retail food facilities with specialized processes.',
      impactDescription: 'Review your HACCP plan and ensure temperature logs, supplier documentation, and corrective action records are current.',
      impactLevel: 'moderate',
      affectedPillars: ['food_safety'],
      affectedStates: ['CA'],
      effectiveDate: '2026-04-01',
      sourceUrl: '',
      rawInputText: null,
      aiGenerated: true,
      published: true,
      publishedAt: '2026-02-20T10:00:00Z',
      affectedLocationCount: 3,
      createdAt: '2026-02-18T08:00:00Z',
    },
    {
      id: 'demo-rc-2',
      sourceId: '',
      sourceShort: 'NFPA',
      sourceName: 'NFPA 96 — Ventilation Control',
      changeType: 'new_edition',
      title: 'NFPA 96-2026 — Hood Cleaning Frequency Table Update',
      summary: 'NFPA 96 Table 12.4 updated cleaning frequency requirements for Type I hoods based on cooking volume and grease-laden vapors.',
      impactDescription: 'Verify your hood cleaning schedule meets the updated frequency table. High-volume operations may require monthly cleaning.',
      impactLevel: 'critical',
      affectedPillars: ['facility_safety'],
      affectedStates: null,
      effectiveDate: '2026-06-01',
      sourceUrl: '',
      rawInputText: null,
      aiGenerated: true,
      published: false,
      publishedAt: null,
      affectedLocationCount: 0,
      createdAt: '2026-03-01T14:00:00Z',
    },
    {
      id: 'demo-rc-3',
      sourceId: '',
      sourceShort: 'CAL FIRE',
      sourceName: 'CAL FIRE / OSFM',
      changeType: 'enforcement_change',
      title: 'CAL FIRE — Kitchen Fire Suppression & Food Safety Cross-Inspection Pilot',
      summary: 'CAL FIRE announced a cross-inspection pilot with county EHDs that will evaluate fire suppression system maintenance during routine food safety inspections.',
      impactDescription: 'Ensure fire suppression service records and food safety documentation are co-located and current. Inspectors may request both during a single visit.',
      impactLevel: 'moderate',
      affectedPillars: ['food_safety', 'facility_safety'],
      affectedStates: ['CA'],
      effectiveDate: '2026-07-01',
      sourceUrl: '',
      rawInputText: null,
      aiGenerated: true,
      published: false,
      publishedAt: null,
      affectedLocationCount: 0,
      createdAt: '2026-03-03T09:00:00Z',
    },
  ];

  const [demoChanges, setDemoChanges] = useState<AdminRegChange[] | null>(isDemoMode ? DEMO_SEED : null);

  // Use demo local state if in demo mode, otherwise hook data
  const changes = isDemoMode
    ? (demoChanges ?? adminChanges)
    : adminChanges;

  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState('');
  const [editImpact, setEditImpact] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // Add form state
  const [newSource, setNewSource] = useState('');
  const [newChangeType, setNewChangeType] = useState('amendment');
  const [newRawText, setNewRawText] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

  // Access control
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const pendingCount = changes.filter(c => !c.published).length;
  const publishedCount = changes.filter(c => c.published).length;

  const impactColors: Record<string, { dot: string; bg: string; border: string; label: string }> = {
    critical: { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Critical' },
    moderate: { dot: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Moderate' },
    informational: { dot: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Informational' },
  };

  async function handleAnalyze() {
    if (!newSource || !newRawText.trim()) {
      toast.error('Please select a source and paste the regulatory text');
      return;
    }

    setAnalyzing(true);

    if (isDemoMode) {
      // Demo mode: simulate AI analysis with local state
      setTimeout(() => {
        const source = MONITORED_SOURCES.find(s => s.abbreviation === newSource);
        const newChange: AdminRegChange = {
          id: `rc-${Date.now()}`,
          sourceId: '',
          sourceShort: newSource,
          sourceName: source?.name || newSource,
          changeType: newChangeType,
          title: `${source?.abbreviation || newSource} — AI-analyzed regulatory change`,
          summary: 'This is an AI-generated summary of the regulatory change. In production, Claude would analyze the raw text and generate a plain-English summary for kitchen operators.',
          impactDescription: 'Review the change details and determine if any operational changes are needed at your locations. Contact your compliance team for specific guidance.',
          impactLevel: 'moderate',
          affectedPillars: ['food_safety'],
          affectedStates: source?.type === 'state' ? ['CA'] : null,
          effectiveDate: null,
          sourceUrl: newSourceUrl || source?.url || '',
          rawInputText: newRawText,
          aiGenerated: true,
          published: false,
          publishedAt: null,
          affectedLocationCount: 0,
          createdAt: new Date().toISOString(),
        };

        setDemoChanges(prev => [newChange, ...(prev ?? adminChanges)]);
        setShowAddForm(false);
        setNewSource('');
        setNewChangeType('amendment');
        setNewRawText('');
        setNewSourceUrl('');
        setAnalyzing(false);
        toast.success('AI analysis complete — review before publishing');
      }, 2000);
    } else {
      // Live mode: call edge function
      try {
        await analyzeWithAI(newSource, newRawText, newChangeType, newSourceUrl);
        setShowAddForm(false);
        setNewSource('');
        setNewChangeType('amendment');
        setNewRawText('');
        setNewSourceUrl('');
      } catch {
        // Error already toasted inside hook
      } finally {
        setAnalyzing(false);
      }
    }
  }

  async function handlePublish(id: string) {
    if (isDemoMode) {
      setDemoChanges(prev =>
        (prev ?? adminChanges).map(c =>
          c.id === id
            ? { ...c, published: true, publishedAt: new Date().toISOString(), affectedLocationCount: 3 }
            : c
        )
      );
      toast.success('Change published — copilot insights created for affected locations');
      return;
    }
    await publishChange(id);
  }

  async function handleUnpublish(id: string) {
    if (isDemoMode) {
      setDemoChanges(prev =>
        (prev ?? adminChanges).map(c =>
          c.id === id
            ? { ...c, published: false, publishedAt: null, affectedLocationCount: 0 }
            : c
        )
      );
      toast('Change unpublished');
      return;
    }
    await unpublishChange(id);
  }

  async function handleReject(id: string) {
    if (isDemoMode) {
      setDemoChanges(prev => (prev ?? adminChanges).filter(c => c.id !== id));
      toast('Change rejected and removed');
      return;
    }
    await rejectChange(id);
  }

  async function handleSaveEdit(id: string) {
    if (isDemoMode) {
      setDemoChanges(prev =>
        (prev ?? adminChanges).map(c =>
          c.id === id
            ? { ...c, summary: editSummary || c.summary, impactDescription: editImpact || c.impactDescription }
            : c
        )
      );
      setEditingId(null);
      toast.success('Summary updated');
      return;
    }
    await updateSummary(id, editSummary, editImpact);
    setEditingId(null);
  }

  function startEdit(change: AdminRegChange) {
    setEditingId(change.id);
    setEditSummary(change.summary);
    setEditImpact(change.impactDescription);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <AdminBreadcrumb crumbs={[{ label: 'Regulatory Changes' }]} />
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fdf8e8' }}>
            <Scale className="h-5 w-5" style={{ color: '#A08C5A' }} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2D4D]">Regulatory Change Management</h1>
            <p className="text-sm text-[#1E2D4D]/50">Admin — Add, review, and publish regulatory changes for customers</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#1E2D4D' }}
          onMouseOver={e => (e.currentTarget.style.backgroundColor = '#141E33')}
          onMouseOut={e => (e.currentTarget.style.backgroundColor = '#1E2D4D')}
        >
          <Plus className="h-4 w-4" />
          Add New Change
        </button>
      </div>

      {/* Loading */}
      {!isDemoMode && loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-[#1E2D4D]/15 border-t-[#A08C5A] rounded-full animate-spin" />
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-sm">
          <span className="font-semibold text-yellow-700">{pendingCount}</span>
          <span className="text-yellow-600 ml-1">Pending Review</span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm">
          <span className="font-semibold text-green-700">{publishedCount}</span>
          <span className="text-green-600 ml-1">Published</span>
        </div>
      </div>

      {/* Add New Change Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 mb-6">
          <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4">Add Regulatory Change</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Regulatory Source</label>
              <select
                value={newSource}
                onChange={e => setNewSource(e.target.value)}
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
              >
                <option value="">Select source...</option>
                {isDemoMode ? (
                  MONITORED_SOURCES.map(s => (
                    <option key={s.abbreviation} value={s.abbreviation}>{s.name}</option>
                  ))
                ) : (
                  dbSources.map(s => (
                    <option key={s.id} value={s.id}>{s.code_name}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Change Type</label>
              <select
                value={newChangeType}
                onChange={e => setNewChangeType(e.target.value)}
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
              >
                <option value="amendment">Amendment</option>
                <option value="new_edition">New Edition</option>
                <option value="guidance">Guidance Document</option>
                <option value="enforcement_change">Enforcement Change</option>
                <option value="effective_date">Effective Date Update</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-[#1E2D4D]/80">
                Raw Regulatory Text / Description
              </label>
              <AIAssistButton
                fieldLabel="Regulatory Text"
                context={{ jurisdiction: newSource }}
                currentValue={newRawText}
                onGenerated={(text) => { setNewRawText(text); setAiFields(prev => new Set(prev).add('newRawText')); }}
              />
            </div>
            <textarea
              value={newRawText}
              onChange={e => { setNewRawText(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('newRawText'); return n; }); }}
              placeholder="Paste the regulatory text here. Claude will generate a plain-English summary for customers."
              rows={6}
              className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] resize-y"
            />
            {aiFields.has('newRawText') && <AIGeneratedIndicator />}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Source URL (optional)</label>
            <input
              type="url"
              value={newSourceUrl}
              onChange={e => setNewSourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#A08C5A' }}
            >
              {analyzing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze with AI
                </>
              )}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm text-[#1E2D4D]/70 hover:text-[#1E2D4D]/90 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Changes List */}
      <div className="space-y-6">
        {/* Pending Review */}
        {changes.filter(c => !c.published).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[#1E2D4D]/30 uppercase tracking-wider mb-3 px-1">Pending Review</h3>
            <div className="space-y-3">
              {changes.filter(c => !c.published).map(change => {
                const impact = impactColors[change.impactLevel];
                const isExpanded = expandedId === change.id;
                const isEditing = editingId === change.id;

                return (
                  <div key={change.id} className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          <AlertTriangle className="h-4.5 w-4.5" style={{ color: impact.dot }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-[#1E2D4D]">{change.title}</span>
                            <span
                              className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: impact.bg, color: impact.dot, border: `1px solid ${impact.border}` }}
                            >
                              {impact.label}
                            </span>
                            {change.aiGenerated && (
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200">
                                AI Generated
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#1E2D4D]/50 mb-2">
                            <span>{change.sourceName}</span>
                            {change.effectiveDate && (
                              <>
                                <span className="text-[#1E2D4D]/30">|</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Effective {new Date(change.effectiveDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </>
                            )}
                            {change.affectedStates && (
                              <>
                                <span className="text-[#1E2D4D]/30">|</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {change.affectedStates.join(', ')}
                                </span>
                              </>
                            )}
                            {!change.affectedStates && (
                              <>
                                <span className="text-[#1E2D4D]/30">|</span>
                                <span>All states (federal/industry)</span>
                              </>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-3 mb-3">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs font-medium text-[#1E2D4D]/70">Summary</label>
                                  <AIAssistButton
                                    fieldLabel="Summary"
                                    context={{ title: change.title }}
                                    currentValue={editSummary}
                                    onGenerated={(text) => { setEditSummary(text); setAiFields(prev => new Set(prev).add('editSummary')); }}
                                  />
                                </div>
                                <textarea
                                  value={editSummary}
                                  onChange={e => { setEditSummary(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('editSummary'); return n; }); }}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] resize-y"
                                />
                                {aiFields.has('editSummary') && <AIGeneratedIndicator />}
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs font-medium text-[#1E2D4D]/70">What operators need to do</label>
                                  <AIAssistButton
                                    fieldLabel="Operator Impact"
                                    context={{ title: change.title, summary: editSummary }}
                                    currentValue={editImpact}
                                    onGenerated={(text) => { setEditImpact(text); setAiFields(prev => new Set(prev).add('editImpact')); }}
                                  />
                                </div>
                                <textarea
                                  value={editImpact}
                                  onChange={e => { setEditImpact(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('editImpact'); return n; }); }}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] resize-y"
                                />
                                {aiFields.has('editImpact') && <AIGeneratedIndicator />}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveEdit(change.id)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
                                  style={{ backgroundColor: '#1E2D4D' }}
                                >
                                  Save Changes
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1.5 text-xs text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-[#1E2D4D]/80 mb-2">{change.summary}</p>
                              <p className="text-sm text-[#1E2D4D]/70 mb-3">
                                <span className="font-medium">What operators need to do: </span>
                                {change.impactDescription}
                              </p>
                            </>
                          )}

                          {/* Pillars */}
                          {change.affectedPillars.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {change.affectedPillars.map(p => (
                                <span key={p} className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#1E2D4D]/5 text-[#1E2D4D]/70">
                                  {p.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => handlePublish(change.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                              style={{ backgroundColor: '#22c55e' }}
                            >
                              <Send className="h-3 w-3" />
                              Approve & Publish
                            </button>
                            <button
                              onClick={() => startEdit(change)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1E2D4D]/70 border border-[#1E2D4D]/10 hover:bg-[#FAF7F0] transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit Summary
                            </button>
                            <button
                              onClick={() => handleReject(change.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </button>
                            {change.sourceUrl && (
                              <a
                                href={change.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70 transition-colors ml-auto"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Source
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Published */}
        {changes.filter(c => c.published).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[#1E2D4D]/30 uppercase tracking-wider mb-3 px-1">Published</h3>
            <div className="space-y-3">
              {changes.filter(c => c.published).map(change => {
                const impact = impactColors[change.impactLevel];
                const isExpanded = expandedId === change.id;

                return (
                  <div key={change.id} className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
                    <div
                      className="p-4 cursor-pointer hover:bg-[#FAF7F0] transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : change.id)}
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-4.5 w-4.5 mt-0.5 flex-shrink-0 text-green-500" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-[#1E2D4D]">{change.title}</span>
                            <span
                              className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: impact.bg, color: impact.dot, border: `1px solid ${impact.border}` }}
                            >
                              {impact.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#1E2D4D]/50">
                            <span>
                              Published {change.publishedAt
                                ? new Date(change.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : ''}
                            </span>
                            <span className="text-[#1E2D4D]/30">|</span>
                            <span>Sent to {change.affectedLocationCount} location{change.affectedLocationCount !== 1 ? 's' : ''}</span>
                            {isExpanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                          </div>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-[#1E2D4D]/5 p-4 bg-[#FAF7F0]">
                        <p className="text-sm text-[#1E2D4D]/80 mb-2">{change.summary}</p>
                        <p className="text-sm text-[#1E2D4D]/70 mb-3">
                          <span className="font-medium">Operator action: </span>
                          {change.impactDescription}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); handleUnpublish(change.id); }}
                            className="text-xs text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70 transition-colors"
                          >
                            Unpublish
                          </button>
                          {change.sourceUrl && (
                            <a
                              href={change.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70 transition-colors ml-auto"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Source
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {changes.length === 0 && (
          <div className="text-center py-16">
            <Scale className="h-12 w-12 mx-auto text-[#1E2D4D]/30 mb-3" />
            <p className="text-[#1E2D4D]/50 font-medium">No regulatory changes yet</p>
            <p className="text-[#1E2D4D]/30 text-sm mt-1">Click "Add New Change" to analyze regulatory text with AI</p>
          </div>
        )}
      </div>
    </div>
  );
}
