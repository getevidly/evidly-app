import { useState } from 'react';
import { Wrench, Plus, Pencil, Trash2 } from 'lucide-react';
import { useServiceTypes, useDeleteServiceType, type ServiceType } from '../../hooks/api/useSettings';
import { ServiceTypeFormModal } from '../../components/settings/ServiceTypeFormModal';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, TEXT_TERTIARY, NAVY, FONT,
} from '../../components/dashboard/shared/constants';

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 12,
  boxShadow: CARD_SHADOW,
  padding: 24,
};

export function ServiceTypesPage() {
  const { data: serverTypes, isLoading } = useServiceTypes();
  const { mutate: deleteType } = useDeleteServiceType();

  const [localTypes, setLocalTypes] = useState<ServiceType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editType, setEditType] = useState<ServiceType | null>(null);

  // Merge server + local
  const allTypes = [...(serverTypes || []), ...localTypes];

  const handleAdd = () => {
    setEditType(null);
    setShowModal(true);
  };

  const handleEdit = (st: ServiceType) => {
    setEditType(st);
    setShowModal(true);
  };

  const handleSaved = (st: ServiceType) => {
    if (editType) {
      setLocalTypes(prev => prev.map(t => t.id === st.id ? st : t));
    } else {
      setLocalTypes(prev => [...prev, st]);
    }
  };

  const handleDelete = async (st: ServiceType) => {
    if (!confirm(`Delete "${st.name}"? This cannot be undone.`)) return;
    try {
      await deleteType(st.id);
      setLocalTypes(prev => prev.filter(t => t.id !== st.id));
    } catch {
      alert('Failed to delete service type');
    }
  };

  const handleToggleActive = (st: ServiceType) => {
    const updated = { ...st, isActive: !st.isActive };
    setLocalTypes(prev => {
      const exists = prev.find(t => t.id === st.id);
      if (exists) return prev.map(t => t.id === st.id ? updated : t);
      return [...prev, updated];
    });
  };

  if (isLoading) {
    return (
      <div style={{ ...FONT }}>
        <div style={{ ...cardStyle, height: 200 }}>
          <div style={{ background: PANEL_BG, borderRadius: 8, height: 20, width: 200, marginBottom: 16 }} />
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: PANEL_BG, borderRadius: 8, height: 14, width: '70%', marginBottom: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>
          <Wrench size={18} color={NAVY} /> Service Types
        </h2>
        <button
          onClick={handleAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: NAVY,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Add Service Type
        </button>
      </div>

      {allTypes.length === 0 ? (
        /* Empty state */
        <div style={{
          background: PANEL_BG,
          border: `1px dashed ${CARD_BORDER}`,
          borderRadius: 12,
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <Wrench size={40} style={{ color: TEXT_TERTIARY, margin: '0 auto 12px' }} />
          <h3 style={{ color: BODY_TEXT, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            No service types yet
          </h3>
          <p style={{ color: MUTED, fontSize: 14, margin: '0 0 16px' }}>
            Add your first service type to get started.
          </p>
          <button
            onClick={handleAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: NAVY,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add Service Type
          </button>
        </div>
      ) : (
        /* Service type list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allTypes.map(st => (
            <div
              key={st.id}
              style={{
                ...cardStyle,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                opacity: st.isActive ? 1 : 0.6,
              }}
            >
              {/* Color dot */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: st.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Wrench size={18} color="#fff" />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: BODY_TEXT }}>{st.name}</span>
                  <span style={{ fontSize: 11, color: TEXT_TERTIARY, fontFamily: 'monospace' }}>{st.code}</span>
                  {!st.isActive && (
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: '#f3f4f6', color: '#6b7280', fontWeight: 600 }}>
                      Inactive
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: MUTED, marginTop: 2 }}>
                  <span>{st.durationMinutes} min</span>
                  <span>${st.basePrice.toFixed(2)}</span>
                  {st.complianceCodes.length > 0 && <span>{st.complianceCodes.join(', ')}</span>}
                </div>
              </div>

              {/* Active toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={st.isActive}
                  onChange={() => handleToggleActive(st)}
                  style={{ width: 16, height: 16, accentColor: NAVY, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: MUTED }}>Active</span>
              </label>

              {/* Actions */}
              <button
                onClick={() => handleEdit(st)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
                title="Edit"
              >
                <Pencil size={16} color={MUTED} />
              </button>
              <button
                onClick={() => handleDelete(st)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
                title="Delete"
              >
                <Trash2 size={16} color="#dc2626" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ServiceTypeFormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditType(null); }}
        serviceType={editType}
        onSaved={handleSaved}
      />
    </div>
  );
}
