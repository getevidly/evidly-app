import { useState, useMemo } from 'react';
import {
  Search, BookOpen, ShieldCheck, Building2, RefreshCw,
  Plus, Layers, Lock,
} from 'lucide-react';
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

function categoryLabel(value: string): string {
  const cats = getCatalogCategories();
  return cats.find(c => c.value === value)?.label ?? value;
}

export function TrainingCatalog() {
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [requiredFilter, setRequiredFilter] = useState('all');

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
          onClick={() => guardAction('create', 'Training Catalog', () => alert('Create training item (demo)'))}
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

      {/* Card grid */}
      {filtered.length > 0 ? (
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
                onClick={() => guardAction('edit', 'Training Catalog', () => alert(`Edit "${item.name}" (demo)`))}
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
