import { useState, useMemo } from 'react';
import {
  Search, BookOpen, ShieldCheck, Building2, RefreshCw,
  Plus, Layers, Lock, X, GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import {
  getDemoCatalog, getCatalogCategories,
  type TrainingCatalogItem,
} from '../data/trainingRecordsDemoData';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, TEXT_TERTIARY } from '../components/dashboard/shared/constants';

const NAVY = '#1e4d6b';
const F: React.CSSProperties = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  food_safety: { bg: '#dcfce7', text: '#15803d' },
  facility_safety: { bg: '#fee2e2', text: '#dc2626' },
  workplace_safety: { bg: '#fef3c7', text: '#92400e' },
  compliance: { bg: '#dbeafe', text: '#1e40af' },
  onboarding: { bg: '#f3e8ff', text: '#7c3aed' },
};

const RENEWAL_OPTIONS = [
  { value: '', label: 'Select renewal period' },
  { value: '0', label: 'One-time (no renewal)' },
  { value: '12', label: 'Annually' },
  { value: '24', label: 'Every 2 years' },
  { value: '36', label: 'Every 3 years' },
  { value: '60', label: 'Every 5 years' },
];

const ROLE_OPTIONS = [
  { value: 'all', label: 'All roles' },
  { value: 'owner_operator', label: 'Owner' },
  { value: 'executive', label: 'Executive' },
  { value: 'kitchen_manager', label: 'Manager' },
  { value: 'chef', label: 'Chef' },
  { value: 'facilities_manager', label: 'Facility Manager' },
  { value: 'kitchen_staff', label: 'Staff' },
];

const SUGGESTED_ITEMS = [
  'ServSafe Food Handler Certification',
  'ServSafe Manager Certification',
  'Allergen Awareness Training',
  'Fire Extinguisher Training (NFPA 10)',
  'HAZCOM / Chemical Safety (OSHA)',
  'Sexual Harassment Prevention (CA SB 1343)',
  'Workplace Safety Orientation',
];

function categoryLabel(value: string): string {
  const cats = getCatalogCategories();
  return cats.find(c => c.value === value)?.label ?? value;
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
      {totalItems > 0 && (
        <p style={{ fontSize: 13, color: TEXT_TERTIARY, margin: '0 0 12px' }}>
          Showing {filtered.length} of {totalItems} items
        </p>
      )}

      {/* Card grid */}
      {totalItems === 0 ? (
        /* ── Production empty state ── */
        <div style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${CARD_BORDER}`, padding: '48px 32px', textAlign: 'center', boxShadow: CARD_SHADOW }}>
          <GraduationCap size={40} color="#D1D9E6" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: BODY_TEXT, margin: '0 0 8px' }}>No training items yet</h3>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 24px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Set up your team's training requirements and track certifications, renewals, and compliance.
          </p>
          <div style={{ textAlign: 'left', maxWidth: 360, margin: '0 auto 24px', padding: '16px 20px', background: PANEL_BG, borderRadius: 8, border: `1px solid ${CARD_BORDER}` }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT, margin: '0 0 10px' }}>Common training items to add:</p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: MUTED, lineHeight: 2 }}>
              {SUGGESTED_ITEMS.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <button
            onClick={handleOpenAddModal}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
              background: NAVY, color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Add Your First Training Item
          </button>
        </div>
      ) : filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filtered.map(item => {
            const catColor = CATEGORY_COLORS[item.category] || { bg: '#f1f5f9', text: '#475569' };
            return (
              <div
                key={item.id}
                style={{
                  background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10,
                  padding: 18, boxShadow: CARD_SHADOW, cursor: 'pointer',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.boxShadow = '0 2px 8px rgba(30,77,107,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = CARD_BORDER; e.currentTarget.style.boxShadow = CARD_SHADOW; }}
                onClick={() => guardAction('edit', 'Training Catalog', () => {
                  setAddForm({
                    name: item.name,
                    category: item.category,
                    type: item.isRequired ? 'required' : 'optional',
                    source: item.isSystem ? 'system' : 'org',
                    renewalMonths: item.renewalPeriodMonths?.toString() || '0',
                    appliesTo: ['all'],
                    description: item.description,
                  });
                  setShowAddModal(true);
                })}
              >
                {/* Top row: category + badges */}
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
                  {!item.isSystem && (
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
                }}>
                  {item.description}
                </p>

                {/* Footer: renewal + authority */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={13} color={TEXT_TERTIARY} />
                    <span style={{ fontSize: 12, color: TEXT_TERTIARY }}>
                      {item.renewalPeriodMonths ? `Every ${item.renewalPeriodMonths} mo` : 'No renewal'}
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

      {/* ── Add Training Modal ── */}
      {showAddModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowAddModal(false)}
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
              <h2 style={{ fontSize: 18, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>
                {addForm.name && addForm === EMPTY_FORM ? 'Add Training Item' : 'Add Training Item'}
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
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
                value={addForm.name}
                onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
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
                value={addForm.category}
                onChange={e => setAddForm(prev => ({ ...prev, category: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`,
                  fontSize: 13, color: BODY_TEXT, boxSizing: 'border-box', background: '#fff',
                }}
              >
                <option value="">Select category</option>
                <option value="food_safety">Food Safety</option>
                <option value="facility_safety">Facility Safety</option>
                <option value="workplace_safety">Workplace Safety</option>
                <option value="compliance">Compliance / Regulatory</option>
                <option value="onboarding">HR / General</option>
              </select>
            </div>

            {/* Type + Source row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 6 }}>
                  Type <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={addForm.type}
                  onChange={e => setAddForm(prev => ({ ...prev, type: e.target.value as 'required' | 'recommended' | 'optional' }))}
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
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 6 }}>
                  Source <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={addForm.source}
                  onChange={e => setAddForm(prev => ({ ...prev, source: e.target.value as 'system' | 'org' }))}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`,
                    fontSize: 13, color: BODY_TEXT, boxSizing: 'border-box', background: '#fff',
                  }}
                >
                  <option value="org">Org-Specific</option>
                  <option value="system">System (EvidLY default)</option>
                </select>
              </div>
            </div>

            {/* Renewal Period */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 6 }}>Renewal Period</label>
              <select
                value={addForm.renewalMonths}
                onChange={e => setAddForm(prev => ({ ...prev, renewalMonths: e.target.value }))}
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

            {/* Applies To */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 6 }}>
                Applies To <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ROLE_OPTIONS.map(r => {
                  const checked = addForm.appliesTo.includes(r.value);
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
                        onChange={() => handleToggleRole(r.value)}
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
                value={addForm.description}
                onChange={e => setAddForm(prev => ({ ...prev, description: e.target.value }))}
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
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`,
                  background: '#fff', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTraining}
                disabled={!addForm.name || !addForm.category}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: !addForm.name || !addForm.category ? '#9CA3AF' : NAVY,
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: !addForm.name || !addForm.category ? 'not-allowed' : 'pointer',
                }}
              >
                Save Training
              </button>
            </div>
          </div>
        </div>
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
