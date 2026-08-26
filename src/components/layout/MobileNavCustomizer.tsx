/**
 * MobileNavCustomizer — edits the three middle slots of the mobile bottom nav.
 *
 * Opened from the "Customize tabs" row in MobileNav's More drawer. Labels and
 * icons come from MobileNav's own SLOTS catalog so the editor and the bar can
 * never disagree.
 *
 * Save writes exactly 3 distinct keys; Reset writes null (role default). The
 * database enforces the same rule, so a bad write is refused there too.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, X, RotateCcw } from 'lucide-react';
import { SLOTS } from './MobileNav';
import { ALLOWED_SLOT_KEYS, type SlotKey } from '../../hooks/useMobileNavSlots';

const EMBER = '#B24A2E';
const NAVY = '#1E2D4D';
const MUTED = '#6B7689';
const LINE = 'rgba(30,45,77,0.10)';

interface Props {
  /** The three keys currently in effect (override, or the role default). */
  current: SlotKey[];
  onClose: () => void;
  onSave: (next: SlotKey[] | null) => Promise<{ ok: boolean; error?: string }>;
}

export function MobileNavCustomizer({ current, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<SlotKey[]>(current);
  const [busy, setBusy] = useState(false);

  const swap = (index: number, key: SlotKey) => {
    setDraft(prev => {
      const next = [...prev];
      const existing = next.indexOf(key);
      // Picking a key already in another slot trades the two, which keeps the
      // three distinct without silently dropping the user's other choice.
      if (existing !== -1 && existing !== index) next[existing] = next[index];
      next[index] = key;
      return next;
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target > 2) return;
    setDraft(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const commit = async (value: SlotKey[] | null) => {
    setBusy(true);
    const res = await onSave(value);
    setBusy(false);
    if (res.ok) {
      toast.success(value ? 'Tabs updated' : 'Tabs reset to default');
      onClose();
    } else {
      toast.error(res.error || 'Could not save your tabs');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] lg:hidden flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Customize tabs"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div
        className="relative bg-white rounded-t-3xl"
        style={{ maxHeight: '86vh', boxShadow: '0 -8px 32px rgba(11,22,40,0.16)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: NAVY }}>Customize tabs</h2>
            <p className="text-[12px]" style={{ color: MUTED }}>Home and More are always shown.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 flex items-center justify-center rounded-full active:bg-[#1E2D4D]/5"
          >
            <X className="h-5 w-5" style={{ color: MUTED }} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(86vh - 190px)' }}>
          {draft.map((key, i) => {
            const slot = SLOTS[key];
            const Icon = slot?.icon;
            return (
              <div
                key={i}
                className="mb-3 rounded-xl px-3 py-3"
                style={{ border: `1px solid ${LINE}` }}
                data-testid={`slot-row-${i}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] tracking-[0.15em] font-semibold"
                    style={{ color: MUTED, fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                  >
                    SLOT {i + 2}
                  </span>
                  {Icon && <Icon className="h-4 w-4" style={{ color: EMBER }} />}
                  <span className="text-[14px] font-semibold flex-1" style={{ color: NAVY }}>
                    {slot?.label || key}
                  </span>
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${slot?.label || key} up`}
                    className="w-11 h-11 flex items-center justify-center rounded-lg active:bg-[#1E2D4D]/5 disabled:opacity-25"
                  >
                    <ArrowUp className="h-4 w-4" style={{ color: NAVY }} />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === 2}
                    aria-label={`Move ${slot?.label || key} down`}
                    className="w-11 h-11 flex items-center justify-center rounded-lg active:bg-[#1E2D4D]/5 disabled:opacity-25"
                  >
                    <ArrowDown className="h-4 w-4" style={{ color: NAVY }} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {ALLOWED_SLOT_KEYS.map(k => {
                    const active = draft[i] === k;
                    const usedElsewhere = draft.includes(k) && !active;
                    return (
                      <button
                        key={k}
                        onClick={() => swap(i, k)}
                        aria-pressed={active}
                        data-testid={`pick-${i}-${k}`}
                        className="text-[12.5px] px-3 rounded-full"
                        style={{
                          minHeight: 36,
                          border: `1px solid ${active ? EMBER : LINE}`,
                          backgroundColor: active ? EMBER : '#FFFFFF',
                          color: active ? '#FFFFFF' : usedElsewhere ? MUTED : NAVY,
                          opacity: usedElsewhere ? 0.55 : 1,
                        }}
                      >
                        {SLOTS[k]?.label || k}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderTop: `1px solid ${LINE}`, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <button
            onClick={() => commit(null)}
            disabled={busy}
            data-testid="reset-tabs"
            className="flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium px-3 disabled:opacity-50"
            style={{ minHeight: 44, border: `1px solid ${LINE}`, color: MUTED }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to default
          </button>
          <button
            onClick={() => commit(draft)}
            disabled={busy}
            data-testid="save-tabs"
            className="flex-1 rounded-xl text-white text-[14px] font-semibold disabled:opacity-50"
            style={{ minHeight: 44, backgroundColor: EMBER }}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
