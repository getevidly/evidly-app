import { useState, useMemo } from 'react';
import {
  Search, BookOpen, ShieldCheck, Building2, RefreshCw,
  Plus, Layers, Lock, X, Users, ChevronRight, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import {
  getDemoCatalog, getCatalogCategories, TRAINING_EMPLOYEES,
  type TrainingCatalogItem,
} from '../data/trainingRecordsDemoData';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, TEXT_TERTIARY } from '../components/dashboard/shared/constants';

const NAVY = '#1e4d6b';
const F: React.CSSProperties = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  food_safety: { bg: '#dcfce7', text: '#15803d' },
  facility_safety: { bg: '#fee2e2', text: '#dc2626' },
  workplace_safety: { bg: '#fef3c7', text: '#92400e' },
};

const CATEGORY_ORDER = ['food_safety', 'facility_safety', 'workplace_safety'];

const RENEWAL_OPTIONS = [
  { value: '', label: 'Select renewal period' },
  { value: '0', label: 'One-time (no renewal)' },
  { value: '12', label: 'Annually' },
  { value: '24', label: 'Every 2 years' },
  { value: '36', label: 'Every 3 years' },
  { value: '60', label: 'Every 5 years' },
];

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'owner_operator', label: 'Owner' },
  { value: 'executive', label: 'Executive' },
  { value: 'kitchen_manager', label: 'Manager' },
  { value: 'chef', label: 'Chef' },
  { value: 'facilities_manager', label: 'Facility Manager' },
  { value: 'kitchen_staff', label: 'Staff' },
];

const ROLE_LABELS: Record<string, string> = {
  all: 'All Roles',
  owner_operator: 'Owner',
  executive: 'Executive',
  kitchen_manager: 'Manager',
  chef: 'Chef',
  facilities_manager: 'Facility Mgr',
  kitchen_staff: 'Staff',
};

function categoryLabel(value: string): string {
  const cats = getCatalogCategories();
  return cats.find(c => c.value === value)?.label ?? value;
}

function renewalLabel(months: number | null): string {
  if (months === null) return 'One-time';
  if (months === 12) return 'Annual';
  if (months === 24) return 'Every 2 years';
  if (months === 36) return 'Every 3 years';
  if (months === 60) return 'Every 5 years';
  return `Every ${months} mo`;
}

function appliesToLabels(roles: string[]): string[] {
  if (roles.includes('all')) return ['All Roles'];
  return roles.map(r => ROLE_LABELS[r] || r);
}

interface AddTrainingForm {
  name: string;
  category: string;
  type: 'required' | 'recommended' | 'optional';
  source: 'system' | 'org';
  renewalMonths: string;
  appliesTo: string[];
  description: string;
}

const EMPTY_FORM: AddTrainingForm = {
  name: '',
  category: '',
  type: 'required',
  source: 'org',
  renewalMonths: '12',
  appliesTo: ['all'],
  description: '',
};

export function TrainingCatalog() {
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [requiredFilter, setRequiredFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddTrainingForm>(EMPTY_FORM);
  const [selectedItem, setSelectedItem] = useState<TrainingCatalogItem | null>(null);

  const catalog: TrainingCatalogItem[] = isDemoMode ? getDemoCatalog() : [];

  const filtered = useMemo(() => {
    let items = catalog;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') items = items.filter(i => i.category === categoryFilter);
    if (typeFilter === 'system') items = items.filter(i => i.isSystem);
    if (typeFilter === 'org') items = items.filter(i => !i.isSystem);
    if (requiredFilter === 'required') items = items.filter(i => i.isRequired);
    if (requiredFilter === 'optional') items = items.filter(i => !i.isRequired);
    return items;
  }, [catalog, search, categoryFilter, typeFilter, requiredFilter]);

  // Group filtered items by category
  const grouped = useMemo(() => {
    const groups: Record<string, TrainingCatalogItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return CATEGORY_ORDER
      .filter(cat => groups[cat]?.length)
      .map(cat => ({ category: cat, items: groups[cat] }));
  }, [filtered]);

  // Stats
  const totalItems = catalog.length;
  const requiredCount = catalog.filter(i => i.isRequired).length;
  const systemCount = catalog.filter(i => i.isSystem).length;
  const orgCount = catalog.filter(i => !i.isSystem).length;

  const stats = [
    { label: 'Total Items', value: totalItems, icon: Layers, color: NAVY },
    { label: 'Required', value: requiredCount, icon: ShieldCheck, color: '#16a34a' },
    { label: 'System', value: systemCount, icon: Lock, color: '#6366f1' },
    { label: 'Org-Specific', value: orgCount, icon: Building2, color: '#d97706' },
  ];

  const handleOpenAddModal = () => {
    guardAction('create', 'Training Catalog', () => {
      setAddForm(EMPTY_FORM);
      setShowAddModal(true);
    });
  };

  const handleSaveTraining = () => {
    guardAction('create', 'Training Catalog', () => {
      setShowAddModal(false);
      setAddForm(EMPTY_FORM);
      toast.success('Training item saved');
    });
  };

  const handleToggleRole = (role: string) => {
    setAddForm(prev => {
      if (role === 'all') return { ...prev, appliesTo: ['all'] };
      const without = prev.appliesTo.filter(r => r !== 'all');
      const has = without.includes(role);
      const next = has ? without.filter(r => r !== role) : [...without, role];
      return { ...prev, appliesTo: next.length === 0 ? ['all'] : next };
    });
  };

  return (
    <div style={F}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>Training Catalog</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: MUTED }}>
            Browse required and recommended training courses, certifications, and renewal schedules.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
            background: NAVY, color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Add Training
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: 16, boxShadow: CARD_SHADOW }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <s.icon size={18} color={s.color} />
              <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_TERTIARY, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</span>
            </div>
            <span style={{ fontSize: 26, fontWeight: 700, color: BODY_TEXT }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <Search size={16} color={TEXT_TERTIARY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by name or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CARD_BG, fontSize: 13, color: BODY_TEXT }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CARD_BG, fontSize: 13, color: BODY_TEXT }}
        >
          <option value="all">All Categories</option>
          {getCatalogCategories().map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CARD_BG, fontSize: 13, color: BODY_TEXT }}
        >
          <option value="all">All Types</option>
          <option value="system">System</option>
          <option value="org">Org-Specific</option>
        </select>
        <select
          value={requiredFilter}
          onChange={e => setRequiredFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CARD_BG, fontSize: 13, color: BODY_TEXT }}
        >
          <option value="all">Required & Optional</option>
          <option value="required">Required Only</option>
          <option value="optional">Optional Only</option>
        </select>
      </div>

      {/* Results count */}
      <p style={{ fontSize: 13, color: TEXT_TERTIARY, margin: '0 0 12px' }}>
        Showing {filtered.length} of {totalItems} items
      </p>

      {/* Grouped card grid */}
      {grouped.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {grouped.map(group => {
            const catColor = CATEGORY_COLORS[group.category] || { bg: '#f1f5f9', text: '#475569' };
            return (
              <div key={group.category}>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>
                    {categoryLabel(group.category)}
                  </h2>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 99,
                    background: catColor.bg, color: catColor.text,
                  }}>
                    {group.items.length}
                  </span>
                </div>

                {/* Cards grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                  {group.items.map(item => (
                    <TrainingCard
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: PANEL_BG, borderRadius: 10, border: `1px solid ${CARD_BORDER}`, padding: 48, textAlign: 'center' }}>
          <BookOpen size={32} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>No training items match your filters</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          isDemoMode={isDemoMode}
        />
      )}

      {/* Add Training Modal */}
      {showAddModal && (
        <AddTrainingModal
          form={addForm}
          setForm={setAddForm}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveTraining}
          onToggleRole={handleToggleRole}
        />
      )}

      {/* Demo upgrade prompt */}
      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          feature={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}

/* ── Training Card ── */

function TrainingCard({ item, onClick }: { item: TrainingCatalogItem; onClick: () => void }) {
  const catColor = CATEGORY_COLORS[item.category] || { bg: '#f1f5f9', text: '#475569' };
  const roles = appliesToLabels(item.appliesTo);

  return (
    <div
      style={{
        background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10,
        padding: 18, boxShadow: CARD_SHADOW, cursor: 'pointer',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.boxShadow = '0 2px 8px rgba(30,77,107,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = CARD_BORDER; e.currentTarget.style.boxShadow = CARD_SHADOW; }}
      onClick={onClick}
    >
      {/* Top row: badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
          background: catColor.bg, color: catColor.text,
        }}>
          {categoryLabel(item.category)}
        </span>
        {item.isRequired && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
            background: '#dcfce7', color: '#15803d',
          }}>
            Required
          </span>
        )}
        {!item.isRequired && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
            background: '#f1f5f9', color: '#64748b',
          }}>
            Recommended
          </span>
        )}
        {item.isSystem ? (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
            background: '#eef2ff', color: '#6366f1',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Lock size={10} /> System
          </span>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
            background: '#fef3c7', color: '#92400e',
          }}>
            Org-Specific
          </span>
        )}
      </div>

      {/* Name */}
      <h3 style={{ fontSize: 15, fontWeight: 700, color: BODY_TEXT, margin: '0 0 6px' }}>{item.name}</h3>

      {/* Description (2-line clamp) */}
      <p style={{
        fontSize: 13, color: MUTED, margin: '0 0 12px', lineHeight: 1.5,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        flex: 1,
      }}>
        {item.description}
      </p>

      {/* Applies to */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        <Users size={13} color={TEXT_TERTIARY} style={{ marginTop: 2 }} />
        {roles.map(r => (
          <span key={r} style={{
            fontSize: 11, padding: '2px 7px', borderRadius: 4,
            background: '#f1f5f9', color: '#475569', fontWeight: 500,
          }}>
            {r}
          </span>
        ))}
      </div>

      {/* Footer: renewal + regulation */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={13} color={TEXT_TERTIARY} />
          <span style={{ fontSize: 12, color: TEXT_TERTIARY }}>
            {renewalLabel(item.renewalPeriodMonths)}
          </span>
        </div>
        {item.requiredBy && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <BookOpen size={13} color={TEXT_TERTIARY} />
            <span style={{ fontSize: 12, color: TEXT_TERTIARY, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.requiredBy}
            </span>
          </div>
        )}
        <ChevronRight size={14} color={TEXT_TERTIARY} style={{ marginLeft: 'auto' }} />
      </div>
    </div>
  );
}

/* ── Detail Modal ── */

function DetailModal({ item, onClose, isDemoMode }: { item: TrainingCatalogItem; onClose: () => void; isDemoMode: boolean }) {
  const catColor = CATEGORY_COLORS[item.category] || { bg: '#f1f5f9', text: '#475569' };
  const roles = appliesToLabels(item.appliesTo);

  // Cross-reference with TRAINING_EMPLOYEES to find who has relevant certs/training
  const teamStatus = useMemo(() => {
    if (!isDemoMode) return [];
    const nameLC = item.name.toLowerCase();
    return TRAINING_EMPLOYEES.map(emp => {
      const hasCert = emp.certifications.some(c => c.name.toLowerCase().includes(nameLC) || nameLC.includes(c.name.toLowerCase()));
      const hasTraining = emp.internalTraining.some(t => {
        const titleLC = t.courseTitle.toLowerCase();
        return titleLC.includes(nameLC) || nameLC.includes(titleLC);
      });
      const completed = hasCert || (hasTraining && emp.internalTraining.some(t => {
        const titleLC = t.courseTitle.toLowerCase();
        return (titleLC.includes(nameLC) || nameLC.includes(titleLC)) && t.status === 'completed';
      }));
      return { id: emp.id, name: emp.name, role: emp.role, location: emp.locationName, completed };
    });
  }, [item, isDemoMode]);

  const completedCount = teamStatus.filter(t => t.completed).length;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
          background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '28px 28px 24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
                background: catColor.bg, color: catColor.text,
              }}>
                {categoryLabel(item.category)}
              </span>
              {item.isRequired && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: '#dcfce7', color: '#15803d' }}>
                  Required
                </span>
              )}
              {!item.isRequired && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: '#f1f5f9', color: '#64748b' }}>
                  Recommended
                </span>
              )}
              {item.isSystem ? (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
                  background: '#eef2ff', color: '#6366f1',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <Lock size={10} /> System
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: '#fef3c7', color: '#92400e' }}>
                  Org-Specific
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>{item.name}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: 12 }}>
            <X size={20} color={MUTED} />
          </button>
        </div>

        {/* Description */}
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 20px' }}>
          {item.description}
        </p>

        {/* Details grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
          padding: 16, background: PANEL_BG, borderRadius: 10, border: `1px solid ${CARD_BORDER}`,
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_TERTIARY, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
              Renewal Period
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: BODY_TEXT }}>
              <RefreshCw size={14} color={NAVY} />
              {renewalLabel(item.renewalPeriodMonths)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_TERTIARY, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
              Source
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: BODY_TEXT }}>
              {item.isSystem ? 'System Default' : 'Organization Custom'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_TERTIARY, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
              Applies To
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {roles.map(r => (
                <span key={r} style={{
                  fontSize: 12, padding: '3px 8px', borderRadius: 5,
                  background: '#e0e7ff', color: '#3730a3', fontWeight: 500,
                }}>
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_TERTIARY, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
              Regulation
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: BODY_TEXT }}>
              {item.requiredBy || '—'}
            </div>
          </div>
        </div>

        {/* Team Completion */}
        {isDemoMode && teamStatus.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>Team Completion</h3>
              <span style={{ fontSize: 12, color: TEXT_TERTIARY }}>
                {completedCount} of {teamStatus.length} completed
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {teamStatus.map(ts => (
                <div key={ts.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8,
                  background: ts.completed ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${ts.completed ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT }}>{ts.name}</span>
                    <span style={{ fontSize: 12, color: TEXT_TERTIARY, marginLeft: 8 }}>{ts.role} — {ts.location}</span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                    background: ts.completed ? '#dcfce7' : '#fee2e2',
                    color: ts.completed ? '#15803d' : '#dc2626',
                  }}>
                    {ts.completed ? 'Completed' : 'Not Completed'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {item.isSystem ? (
            <button
              onClick={() => toast.info('System items can only be deactivated in production mode')}
              style={{
                padding: '9px 18px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`,
                background: '#fff', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <EyeOff size={14} /> Deactivate
            </button>
          ) : (
            <>
              <button
                onClick={() => toast.info('Editing is available in production mode')}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`,
                  background: '#fff', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Edit
              </button>
              <button
                onClick={() => toast.info('Deleting is available in production mode')}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: '#fee2e2', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: NAVY, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add Training Modal ── */

function AddTrainingModal({
  form, setForm, onClose, onSave, onToggleRole,
}: {
  form: AddTrainingForm;
  setForm: React.Dispatch<React.SetStateAction<AddTrainingForm>>;
  onClose: () => void;
  onSave: () => void;
  onToggleRole: (role: string) => void;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
          background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '28px 28px 24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>Add Training Item</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color={MUTED} />
          </button>
        </div>

        {/* Training Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 6 }}>
            Training Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., ServSafe Manager"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`,
              fontSize: 13, color: BODY_TEXT, boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 6 }}>
            Category <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={form.category}
            onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`,
              fontSize: 13, color: BODY_TEXT, boxSizing: 'border-box', background: '#fff',
            }}
          >
            <option value="">Select category</option>
            <option value="food_safety">Food Safety</option>
            <option value="facility_safety">Facility Safety</option>
            <option value="workplace_safety">Workplace Safety</option>
          </select>
        </div>

        {/* Type + Renewal row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 6 }}>
              Type <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value as 'required' | 'recommended' | 'optional' }))}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`,
                fontSize: 13, color: BODY_TEXT, boxSizing: 'border-box', background: '#fff',
              }}
            >
              <option value="required">Required</option>
              <option value="recommended">Recommended</option>
              <option value="optional">Optional</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 6 }}>Renewal Period</label>
            <select
              value={form.renewalMonths}
              onChange={e => setForm(prev => ({ ...prev, renewalMonths: e.target.value }))}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`,
                fontSize: 13, color: BODY_TEXT, boxSizing: 'border-box', background: '#fff',
              }}
            >
              {RENEWAL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Applies To */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 6 }}>
            Applies To <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ROLE_OPTIONS.map(r => {
              const checked = form.appliesTo.includes(r.value);
              return (
                <label
                  key={r.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BODY_TEXT,
                    cursor: 'pointer', padding: '4px 0',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleRole(r.value)}
                    style={{ accentColor: NAVY }}
                  />
                  {r.label}
                </label>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 6 }}>Description</label>
          <textarea
            placeholder="Brief description of the training requirement..."
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`,
              fontSize: 13, color: BODY_TEXT, boxSizing: 'border-box', resize: 'vertical',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`,
              background: '#fff', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!form.name || !form.category}
            style={{
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: !form.name || !form.category ? '#9CA3AF' : NAVY,
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: !form.name || !form.category ? 'not-allowed' : 'pointer',
            }}
          >
            Save Training
          </button>
        </div>
      </div>
    </div>
  );
}
