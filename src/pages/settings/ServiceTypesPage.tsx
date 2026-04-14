import { useState } from 'react';
import { Wrench, Plus, Pencil, Trash2 } from 'lucide-react';
import { useServiceTypes, useDeleteServiceType, type ServiceType } from '../../hooks/api/useSettings';
import { ServiceTypeFormModal } from '../../components/settings/ServiceTypeFormModal';
import Button from '../../components/ui/Button';

export function ServiceTypesPage() {
  const { data: serverTypes, isLoading } = useServiceTypes();
  const { mutate: deleteType } = useDeleteServiceType();

  const [localTypes, setLocalTypes] = useState<ServiceType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editType, setEditType] = useState<ServiceType | null>(null);

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
      <div className="bg-white border border-navy/10 rounded-xl p-6 animate-pulse">
        <div className="bg-navy/5 rounded-lg h-5 w-48 mb-4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-navy/5 rounded-lg h-3.5 w-[70%] mb-2.5" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-navy">
          <Wrench className="h-[18px] w-[18px] text-navy" /> Service Types
        </h2>
        <Button variant="primary" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4" /> Add Service Type
        </Button>
      </div>

      {allTypes.length === 0 ? (
        /* Empty state */
        <div className="bg-navy/[0.03] border border-dashed border-navy/15 rounded-xl py-12 px-6 text-center">
          <Wrench className="h-10 w-10 text-gold mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-navy mb-1">
            No service types configured
          </h3>
          <p className="text-sm text-navy/50 mb-4 max-w-md mx-auto">
            Add your first service type to get started.
          </p>
          <Button variant="primary" size="sm" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" /> Add Service Type
          </Button>
        </div>
      ) : (
        /* Service type list */
        <div className="flex flex-col gap-2.5">
          {allTypes.map(st => (
            <div
              key={st.id}
              className={`bg-white border border-navy/10 rounded-xl p-4 flex items-center gap-3.5 ${
                st.isActive ? '' : 'opacity-60'
              }`}
            >
              {/* Color dot */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: st.color }}
              >
                <Wrench className="h-[18px] w-[18px] text-white" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-navy">{st.name}</span>
                  <span className="text-[11px] text-navy/30 font-mono">{st.code}</span>
                  {!st.isActive && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-navy/5 text-navy/40 font-semibold">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-xs text-navy/50 mt-0.5">
                  <span>{st.durationMinutes} min</span>
                  <span>${st.basePrice.toFixed(2)}</span>
                  {st.complianceCodes.length > 0 && <span>{st.complianceCodes.join(', ')}</span>}
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={st.isActive}
                  onChange={() => handleToggleActive(st)}
                  className="w-4 h-4 accent-navy cursor-pointer"
                />
                <span className="text-xs text-navy/50">Active</span>
              </label>

              {/* Actions */}
              <button
                onClick={() => handleEdit(st)}
                className="p-1.5 text-navy/30 hover:text-navy transition-colors"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(st)}
                className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
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
