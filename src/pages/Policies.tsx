import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import {
  useOrgPolicies,
  usePolicyTemplates,
  adoptTemplate,
  type OrgPolicy,
  type PolicyTemplate,
} from '../hooks/usePolicies';

// ── Status pill config ──────────────────────────────────

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

function CategoryPill({ category }: { category: string }) {
  const label = (category || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAF7F0] text-[#1E2D4D]/70 border border-[#E5E0D8]">
      {label}
    </span>
  );
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  return new Date(dateStr).toLocaleDateString();
}

// ── Main component ───────────────────────────────────────

export function Policies() {
  const { user, profile } = useAuth();
  const orgId = profile?.organization_id;
  const navigate = useNavigate();

  const { policies, loading: policiesLoading, refetch } = useOrgPolicies(orgId);
  const { templates, loading: templatesLoading } = usePolicyTemplates();

  const [pillarTab, setPillarTab] = useState<'food_safety' | 'fire_safety'>('food_safety');
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [adopting, setAdopting] = useState<string | null>(null);

  const filteredPolicies = useMemo(
    () => policies.filter(p => p.pillar === pillarTab),
    [policies, pillarTab],
  );

  const foodCount = useMemo(() => policies.filter(p => p.pillar === 'food_safety').length, [policies]);
  const fireCount = useMemo(() => policies.filter(p => p.pillar === 'fire_safety').length, [policies]);

  const adoptedTemplateIds = useMemo(
    () => new Set(policies.filter(p => p.template_id).map(p => p.template_id)),
    [policies],
  );
  const availableTemplates = useMemo(
    () => templates.filter(t => t.pillar === pillarTab),
    [templates, pillarTab],
  );

  const handleAdopt = useCallback(async (templateId: string) => {
    if (!orgId || !user?.id) return;
    setAdopting(templateId);
    try {
      const newPolicy = await adoptTemplate(orgId, user.id, templateId);
      toast.success('Policy adopted as draft');
      setShowAdoptModal(false);
      refetch();
      navigate('/policies/' + newPolicy.id);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to adopt policy');
    } finally {
      setAdopting(null);
    }
  }, [orgId, user?.id, refetch, navigate]);

  if (policiesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-[#1E2D4D]/10 rounded-xl" />
          <div className="h-10 bg-[#1E2D4D]/5 rounded-lg w-64" />
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-lg border border-[#E5E0D8]" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="bg-[#1E2D4D] rounded-xl px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Policies &amp; Procedures</h1>
          <p className="text-white/70 text-sm mt-1">
            Standardized policies your team adopts, customizes, and activates.
          </p>
        </div>
        <button
          onClick={() => setShowAdoptModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-[#1E2D4D] rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          <Plus size={16} />
          Adopt a Policy
        </button>
      </div>

      {/* Pillar tabs */}
      <div className="flex gap-1 border-b border-[#E5E0D8]">
        {([
          { key: 'food_safety' as const, label: 'Food Safety', count: foodCount },
          { key: 'fire_safety' as const, label: 'Fire Safety', count: fireCount },
        ]).map(tab => {
          const active = pillarTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setPillarTab(tab.key)}
              className="relative px-4 py-2.5 text-sm transition-colors"
              style={{
                color: active ? '#1E2D4D' : '#8A93A6',
                fontWeight: active ? 700 : 500,
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-[#1E2D4D]/10 text-[#1E2D4D] px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#A08C5A] rounded-t" />
              )}
            </button>
          );
        })}
      </div>

      {/* Policy list or empty state */}
      {filteredPolicies.length === 0 ? (
        <EmptyState pillar={pillarTab} onAdopt={() => setShowAdoptModal(true)} />
      ) : (
        <div className="space-y-2.5">
          {filteredPolicies.map(policy => (
            <button
              key={policy.id}
              onClick={() => navigate('/policies/' + policy.id)}
              className="w-full text-left bg-white border border-[#E5E0D8] rounded-lg px-5 py-4 hover:border-[#1E2D4D]/30 hover:shadow-sm transition-all flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#1E2D4D] font-semibold text-sm truncate">
                    {policy.title}
                  </span>
                  <CategoryPill category={policy.category} />
                  <StatusPill status={policy.status} />
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#1E2D4D]/50">
                  <span>v{policy.version}</span>
                  {policy.effective_date && (
                    <span>Effective {new Date(policy.effective_date).toLocaleDateString()}</span>
                  )}
                  <span>Updated {relativeTime(policy.updated_at)}</span>
                </div>
              </div>
              <span className="text-[#1E2D4D]/30 text-sm">&rsaquo;</span>
            </button>
          ))}
        </div>
      )}

      {/* Adopt modal */}
      {showAdoptModal && (
        <AdoptModal
          templates={availableTemplates}
          adoptedIds={adoptedTemplateIds}
          adopting={adopting}
          loading={templatesLoading}
          onAdopt={handleAdopt}
          onClose={() => setShowAdoptModal(false)}
          pillarLabel={pillarTab === 'food_safety' ? 'Food Safety' : 'Fire Safety'}
        />
      )}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────

function EmptyState({ pillar, onAdopt }: { pillar: string; onAdopt: () => void }) {
  const pillarLabel = pillar === 'food_safety' ? 'Food Safety' : 'Fire Safety';
  return (
    <div className="bg-white rounded-xl border border-[#E5E0D8] p-8 text-center">
      <div className="mx-auto w-[52px] h-[52px] rounded-full bg-[#E6F1FB] flex items-center justify-center mb-4">
        <BookOpen size={24} className="text-[#185FA5]" />
      </div>
      <h3 className="text-[#1E2D4D] font-bold text-base mb-2">
        No {pillarLabel} policies adopted yet
      </h3>
      <p className="text-[#1E2D4D]/60 text-sm max-w-md mx-auto mb-6">
        Adopt a policy template to give your team standardized procedures
        that align with your jurisdiction&#39;s requirements. Each adopted policy
        can be customized to match your operation.
      </p>

      {/* PRP row */}
      <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-6">
        {[
          { label: 'Predict', color: '#BA7517', desc: 'Identify gaps before inspectors do' },
          { label: 'Reduce', color: '#185FA5', desc: 'Standardize procedures to reduce risk' },
          { label: 'Prove', color: '#0F6E56', desc: 'Show documented compliance on demand' },
        ].map(card => (
          <div
            key={card.label}
            className="bg-[#FAF7F0] rounded-lg p-3 text-left"
            style={{ borderTop: '3px solid ' + card.color }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.color }}>
              {card.label}
            </span>
            <p className="text-[#1E2D4D]/70 text-[11px] mt-1">{card.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onAdopt}
        className="px-5 py-2.5 bg-[#1E2D4D] text-white rounded-lg text-sm font-semibold hover:bg-[#162340] transition-colors"
      >
        Adopt a Policy
      </button>
    </div>
  );
}

// ── Adopt modal ──────────────────────────────────────────

interface AdoptModalProps {
  templates: PolicyTemplate[];
  adoptedIds: Set<string | null>;
  adopting: string | null;
  loading: boolean;
  onAdopt: (id: string) => void;
  onClose: () => void;
  pillarLabel: string;
}

function AdoptModal({ templates, adoptedIds, adopting, loading, onAdopt, onClose, pillarLabel }: AdoptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E0D8]">
          <div>
            <h2 className="text-[#1E2D4D] font-bold text-base">Adopt a Policy</h2>
            <p className="text-[#1E2D4D]/50 text-xs mt-0.5">{pillarLabel} templates</p>
          </div>
          <button onClick={onClose} className="text-[#1E2D4D]/40 hover:text-[#1E2D4D] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3">
          {loading ? (
            <p className="text-center text-sm text-[#1E2D4D]/50 py-8">Loading templates...</p>
          ) : templates.length === 0 ? (
            <p className="text-center text-sm text-[#1E2D4D]/50 py-8">No templates available for this pillar.</p>
          ) : (
            <div className="space-y-2">
              {templates.map(t => {
                const alreadyAdopted = adoptedIds.has(t.id);
                const isAdopting = adopting === t.id;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#E5E0D8] hover:border-[#1E2D4D]/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-[#1E2D4D] block truncate">{t.title}</span>
                      <span className="text-[11px] text-[#1E2D4D]/50">
                        {(t.category || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </div>
                    {alreadyAdopted ? (
                      <span className="flex items-center gap-1 text-[11px] text-[#2E7D32] font-medium">
                        <Check size={14} /> Adopted
                      </span>
                    ) : (
                      <button
                        onClick={() => onAdopt(t.id)}
                        disabled={isAdopting}
                        className="px-3 py-1.5 bg-[#1E2D4D] text-white rounded-md text-xs font-semibold hover:bg-[#162340] transition-colors disabled:opacity-50"
                      >
                        {isAdopting ? 'Adopting...' : 'Adopt'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Policies;
