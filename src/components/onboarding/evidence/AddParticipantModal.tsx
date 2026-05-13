import { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  existingParticipantIds: string[];
  onAdd: (userId: string) => Promise<void>;
}

export function AddParticipantModal({
  isOpen,
  onClose,
  orgId,
  existingParticipantIds,
  onAdd,
}: AddParticipantModalProps) {
  const [users, setUsers] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    async function loadUsers() {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .eq('organization_id', orgId);
      setUsers((data || []).filter(u => !existingParticipantIds.includes(u.id)));
    }
    loadUsers();
  }, [isOpen, orgId, existingParticipantIds]);

  const handleAdd = async (userId: string) => {
    setAdding(userId);
    try {
      await onAdd(userId);
      onClose();
    } finally {
      setAdding(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-[320px] max-h-[400px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2DDD4]">
          <span className="text-sm font-medium text-[#1E2D4D]">Add to thread</span>
          <button type="button" onClick={onClose} className="text-[#8A93A6] hover:text-[#1E2D4D]">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[300px]">
          {users.length === 0 && (
            <p className="text-xs text-[#8A93A6] text-center py-6">
              No other team members to add
            </p>
          )}
          {users.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleAdd(u.id)}
              disabled={adding === u.id}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F5EE] text-left border-b border-[#E2DDD4]/40"
            >
              <UserPlus size={14} className="text-[#8A93A6] flex-shrink-0" />
              <div>
                <div className="text-xs font-medium text-[#1E2D4D]">
                  {u.full_name || 'Unnamed'}
                </div>
                <div className="text-[10px] text-[#8A93A6]">{u.role}</div>
              </div>
              {adding === u.id && (
                <div className="ml-auto w-3 h-3 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
