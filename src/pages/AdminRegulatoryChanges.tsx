import { useState } from 'react';
import { Navigate } from 'react-router-dom';
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

// ── Types ───────────────────────────────────────────────

interface RegChange {
  id: string;
  sourceShort: string;
  sourceName: string;
  changeType: string;
  title: string;
  summary: string;
  impactDescription: string;
  impactLevel: 'critical' | 'moderate' | 'informational';
  affectedPillars: string[];
  affectedStates: string[] | null;
  effectiveDate: string | null;
  sourceUrl: string;
  aiGenerated: boolean;
  published: boolean;
  publishedAt: string | null;
  affectedLocationCount: number;
  createdAt: string;
}

// ── Demo Data ───────────────────────────────────────────

const DEMO_CHANGES: RegChange[] = [
  {
    id: 'rc-001',
    sourceShort: 'calcode',
    sourceName: 'California Retail Food Code (CalCode)',
    changeType: 'amendment',
    title: 'CalCode §114099.7 — Grease trap sizing requirements updated',
    summary: 'California has updated minimum grease trap sizing for commercial kitchens producing over 200 meals per day. Minimum capacity increased from 30 to 50 gallons for high-volume operations.',
    impactDescription: 'Verify your grease trap meets the new 50-gallon minimum. If undersized, schedule replacement before July 1. Contact your plumbing vendor for assessment.',
    impactLevel: 'moderate',
    affectedPillars: ['fire_safety', 'vendor_compliance'],
    affectedStates: ['CA'],
    effectiveDate: '2026-07-01',
    sourceUrl: 'https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx',
    aiGenerated: true,
    published: false,
    publishedAt: null,
    affectedLocationCount: 0,
    createdAt: '2026-02-10T09:00:00Z',
  },
  {
    id: 'rc-002',
    sourceShort: 'fda_food_code',
    sourceName: 'FDA Food Code',
    changeType: 'guidance',
    title: 'FDA Guidance — Updated cold holding best practices',
    summary: 'The FDA has released updated guidance on cold holding procedures for ready-to-eat foods. The guidance recommends monitoring cold holding temperatures every 2 hours instead of every 4 hours for high-risk items.',
    impactDescription: 'Review your cold holding monitoring frequency. Consider increasing temperature checks to every 2 hours for high-risk items like cut leafy greens, sliced deli meats, and prepared salads.',
    impactLevel: 'informational',
    affectedPillars: ['food_safety'],
    affectedStates: null,
    effectiveDate: null,
    sourceUrl: 'https://www.fda.gov/food/retail-food-protection/fda-food-code',
    aiGenerated: true,
    published: false,
    publishedAt: null,
    affectedLocationCount: 0,
    createdAt: '2026-02-08T14:00:00Z',
  },
  {
    id: 'rc-003',
    sourceShort: 'nfpa_96',
    sourceName: 'NFPA 96 (Ventilation & Fire Protection)',
    changeType: 'amendment',
    title: 'NFPA 96 §11.4 — Exhaust fan inspection frequency clarified',
    summary: 'NFPA 96 has clarified that exhaust fan inspection must occur at the same frequency as hood exhaust system cleaning. Fan bearing lubrication must be documented separately from cleaning.',
    impactDescription: 'Ensure your exhaust fan inspections are scheduled at the same frequency as hood cleaning. Ask your vendor to separately document fan bearing lubrication on each service report.',
    impactLevel: 'moderate',
    affectedPillars: ['fire_safety'],
    affectedStates: null,
    effectiveDate: '2026-07-01',
    sourceUrl: 'https://www.nfpa.org/codes-and-standards/nfpa-96-standard-development/96',
    aiGenerated: true,
    published: true,
    publishedAt: '2026-02-10T16:00:00Z',
    affectedLocationCount: 47,
    createdAt: '2026-02-06T10:00:00Z',
  },
];

// ── Component ───────────────────────────────────────────

export function AdminRegulatoryChanges() {
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const isAdmin = isEvidlyAdmin || isDemoMode;

  // Access control
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const [changes, setChanges] = useState<RegChange[]>(DEMO_CHANGES);
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

  const pendingCount = changes.filter(c => !c.published).length;
  const publishedCount = changes.filter(c => c.published).length;

  const impactColors: Record<string, { dot: string; bg: string; border: string; label: string }> = {
    critical: { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Critical' },
    moderate: { dot: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Moderate' },
    informational: { dot: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Informational' },
  };

  function handleAnalyze() {
    if (!newSource || !newRawText.trim()) {
      toast.error('Please select a source and paste the regulatory text');
      return;
    }

    setAnalyzing(true);

    // Demo mode: simulate AI analysis
    setTimeout(() => {
      const source = MONITORED_SOURCES.find(s => s.abbreviation === newSource);
      const newChange: RegChange = {
        id: `rc-${Date.now()}`,
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
        aiGenerated: true,
        published: false,
        publishedAt: null,
        affectedLocationCount: 0,
        createdAt: new Date().toISOString(),
      };

      setChanges(prev => [newChange, ...prev]);
      setShowAddForm(false);
      setNewSource('');
      setNewChangeType('amendment');
      setNewRawText('');
      setNewSourceUrl('');
      setAnalyzing(false);
      toast.success('AI analysis complete — review before publishing');
    }, 2000);
  }

  function handlePublish(id: string) {
    setChanges(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, published: true, publishedAt: new Date().toISOString(), affectedLocationCount: 3 }
          : c
      )
    );
    toast.success('Change published — copilot insights created for affected locations');
  }

  function handleUnpublish(id: string) {
    setChanges(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, published: false, publishedAt: null, affectedLocationCount: 0 }
          : c
      )
    );
    toast('Change unpublished');
  }

  function handleReject(id: string) {
    setChanges(prev => prev.filter(c => c.id !== id));
    toast('Change rejected and removed');
  }

  function handleSaveEdit(id: string) {
    setChanges(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, summary: editSummary || c.summary, impactDescription: editImpact || c.impactDescription }
          : c
      )
    );
    setEditingId(null);
    toast.success('Summary updated');
  }

  function startEdit(change: RegChange) {
    setEditingId(change.id);
    setEditSummary(change.summary);
    setEditImpact(change.impactDescription);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fdf8e8' }}>
            <Scale className="h-5 w-5" style={{ color: '#d4af37' }} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Regulatory Change Management</h1>
            <p className="text-sm text-gray-500">Admin — Add, review, and publish regulatory changes for customers</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#1e4d6b' }}
          onMouseOver={e => (e.currentTarget.style.backgroundColor = '#163a52')}
          onMouseOut={e => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
        >
          <Plus className="h-4 w-4" />
          Add New Change
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm">
          <span className="font-semibold text-yellow-700">{pendingCount}</span>
          <span className="text-yellow-600 ml-1">Pending Review</span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
          <span className="font-semibold text-green-700">{publishedCount}</span>
          <span className="text-green-600 ml-1">Published</span>
        </div>
      </div>

      {/* Add New Change Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Regulatory Change</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regulatory Source</label>
              <select
                value={newSource}
                onChange={e => setNewSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              >
                <option value="">Select source...</option>
                {MONITORED_SOURCES.map(s => (
                  <option key={s.abbreviation} value={s.abbreviation}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Change Type</label>
              <select
                value={newChangeType}
                onChange={e => setNewChangeType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raw Regulatory Text / Description
            </label>
            <textarea
              value={newRawText}
              onChange={e => setNewRawText(e.target.value)}
              placeholder="Paste the regulatory text here. Claude will generate a plain-English summary for customers."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] resize-y"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Source URL (optional)</label>
            <input
              type="url"
              value={newSourceUrl}
              onChange={e => setNewSourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#d4af37' }}
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
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
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
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Pending Review</h3>
            <div className="space-y-3">
              {changes.filter(c => !c.published).map(change => {
                const impact = impactColors[change.impactLevel];
                const isExpanded = expandedId === change.id;
                const isEditing = editingId === change.id;

                return (
                  <div key={change.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          <AlertTriangle className="h-4.5 w-4.5" style={{ color: impact.dot }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">{change.title}</span>
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: impact.bg, color: impact.dot, border: `1px solid ${impact.border}` }}
                            >
                              {impact.label}
                            </span>
                            {change.aiGenerated && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200">
                                AI Generated
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
                            <span>{change.sourceName}</span>
                            {change.effectiveDate && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Effective {new Date(change.effectiveDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </>
                            )}
                            {change.affectedStates && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {change.affectedStates.join(', ')}
                                </span>
                              </>
                            )}
                            {!change.affectedStates && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span>All states (federal/industry)</span>
                              </>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-3 mb-3">
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Summary</label>
                                <textarea
                                  value={editSummary}
                                  onChange={e => setEditSummary(e.target.value)}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] resize-y"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">What operators need to do</label>
                                <textarea
                                  value={editImpact}
                                  onChange={e => setEditImpact(e.target.value)}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] resize-y"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveEdit(change.id)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
                                  style={{ backgroundColor: '#1e4d6b' }}
                                >
                                  Save Changes
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-700 mb-2">{change.summary}</p>
                              <p className="text-sm text-gray-600 mb-3">
                                <span className="font-medium">What operators need to do: </span>
                                {change.impactDescription}
                              </p>
                            </>
                          )}

                          {/* Pillars */}
                          {change.affectedPillars.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {change.affectedPillars.map(p => (
                                <span key={p} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
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
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
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
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
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
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Published</h3>
            <div className="space-y-3">
              {changes.filter(c => c.published).map(change => {
                const impact = impactColors[change.impactLevel];
                const isExpanded = expandedId === change.id;

                return (
                  <div key={change.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : change.id)}
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-4.5 w-4.5 mt-0.5 flex-shrink-0 text-green-500" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">{change.title}</span>
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: impact.bg, color: impact.dot, border: `1px solid ${impact.border}` }}
                            >
                              {impact.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span>
                              Published {change.publishedAt
                                ? new Date(change.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : ''}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span>Sent to {change.affectedLocationCount} location{change.affectedLocationCount !== 1 ? 's' : ''}</span>
                            {isExpanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                          </div>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <p className="text-sm text-gray-700 mb-2">{change.summary}</p>
                        <p className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">Operator action: </span>
                          {change.impactDescription}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); handleUnpublish(change.id); }}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            Unpublish
                          </button>
                          {change.sourceUrl && (
                            <a
                              href={change.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
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
            <Scale className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No regulatory changes yet</p>
            <p className="text-gray-400 text-sm mt-1">Click "Add New Change" to analyze regulatory text with AI</p>
          </div>
        )}
      </div>
    </div>
  );
}
