/**
 * NewInventoryRequestModal — Modal form to create inventory requests.
 */
import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const NAVY = '#163a5f';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const TEXT_TERTIARY = '#6B7F96';

type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface RequestItem {
  name: string;
  quantity: number;
}

interface NewInventoryRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function NewInventoryRequestModal({ isOpen, onClose }: NewInventoryRequestModalProps) {
  const [priority, setPriority] = useState<Priority>('normal');
  const [items, setItems] = useState<RequestItem[]>([{ name: '', quantity: 1 }]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const updateItem = (index: number, field: keyof RequestItem, value: string | number) => {
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const addItem = () => {
    setItems(prev => [...prev, { name: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Request submitted (not yet implemented)');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
        style={{ background: CARD_BG }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
        >
          <h2 className="text-base font-bold" style={{ color: NAVY }}>
            New Inventory Request
          </h2>
          <button
            onClick={onClose}
            className="p-2.5 -m-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: NAVY }}>
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                  style={{
                    borderColor: priority === p.value ? NAVY : CARD_BORDER,
                    background: priority === p.value ? NAVY : CARD_BG,
                    color: priority === p.value ? '#FFFFFF' : TEXT_TERTIARY,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: NAVY }}>
              Items
            </label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={item.name}
                    onChange={e => updateItem(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#163a5f]/20"
                    style={{ borderColor: CARD_BORDER, color: NAVY }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                    className="w-20 px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#163a5f]/20 text-center"
                    style={{ borderColor: CARD_BORDER, color: NAVY }}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    disabled={items.length <= 1}
                    style={{ opacity: items.length <= 1 ? 0.3 : 1 }}
                  >
                    <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: NAVY }}
            >
              <Plus className="w-3 h-3" /> Add another item
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: NAVY }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#163a5f]/20 resize-none"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>

          {/* Actions */}
          <div
            className="flex items-center justify-end gap-3 pt-4"
            style={{ borderTop: `1px solid ${CARD_BORDER}` }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50 transition-colors"
              style={{ borderColor: CARD_BORDER, color: TEXT_TERTIARY }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors hover:opacity-90"
              style={{ background: NAVY }}
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
