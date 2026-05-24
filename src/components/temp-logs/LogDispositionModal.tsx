import { useState, useCallback, useEffect } from 'react';
import { colors } from '../../lib/designSystem';
import { useLogCooldownDisposition } from '../../hooks/temperatures/useCooldownMutations';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import Button from '../ui/Button';
import type { CooldownEventWithState } from '../../hooks/temperatures/useCooldownEvents';

// ── Types ───────────────────────────────────────────────────

type DispositionChoice = 'discarded' | 'reheated_recooled' | 'other';

interface UserOption {
  id: string;
  full_name: string;
}

// ── Component ───────────────────────────────────────────────

interface LogDispositionModalProps {
  event: CooldownEventWithState;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogDispositionModal({ event, onClose, onSuccess }: LogDispositionModalProps) {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const orgId = profile?.organization_id ?? '';

  const [disposition, setDisposition] = useState<DispositionChoice | null>(null);
  const [notes, setNotes] = useState('');
  const [witnessedBy, setWitnessedBy] = useState<string | null>(null);
  const [employees, setEmployees] = useState<UserOption[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutate: logDisposition, isLoading } = useLogCooldownDisposition();

  const canSubmit = disposition !== null && notes.trim().length > 0 && !isLoading;

  // Load employees for witness dropdown
  useEffect(() => {
    if (!orgId) return;
    supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('organization_id', orgId)
      .order('full_name')
      .then(({ data }) => {
        if (data) {
          setEmployees(
            (data as UserOption[]).filter(u => u.id !== profile?.id)
          );
        }
      });
  }, [orgId, profile?.id]);

  const locationId = getAccessibleLocations()[0]?.locationId ?? '';

  const handleSubmit = async () => {
    if (!canSubmit || !disposition) return;
    setSubmitError(null);
    try {
      await logDisposition({
        cooldownEventId: event.id,
        disposition,
        dispositionNotes: notes.trim(),
        witnessedBy,
        organizationId: orgId,
        locationId,
        foodItemName: event.food_item_name,
        failedStage: event.failed_stage,
      });
      toast.success(`Disposition logged for ${event.food_item_name}. Corrective action created.`);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log disposition';
      setSubmitError(message);
    }
  };

  const radioOptions: { value: DispositionChoice; label: string; desc: string }[] = [
    { value: 'discarded', label: 'Discarded', desc: 'Food was discarded and not served.' },
    { value: 'reheated_recooled', label: 'Reheated & Recooled', desc: 'Reheated to 165°F and recooled under monitoring.' },
    { value: 'other', label: 'Other', desc: 'Document the corrective action taken in notes.' },
  ];

  return (
    <div className="p-4 sm:p-5">
      <h3 className="text-xl font-bold tracking-tight mb-1" style={{ color: colors.textPrimary }}>
        Log Disposition
      </h3>
      <p className="text-sm mb-5" style={{ color: colors.textSecondary }}>
        {event.food_item_name} · Stage {event.failed_stage ?? '?'} failure
      </p>

      {/* Help block — CalCode first */}
      <div
        className="rounded-xl px-4 py-3 mb-5"
        style={{ backgroundColor: colors.cream }}
      >
        <p className="text-xs" style={{ color: colors.textSecondary }}>
          <span className="font-semibold" style={{ color: colors.navy }}>CalCode §114002</span>
          <span style={{ color: colors.textMuted }}> · FDA §3-501.14</span>
        </p>
        <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
          When a cooldown fails to meet the time/temperature requirements, the food must be discarded,
          reheated to 165°F for recooling, or another approved corrective action must be documented.
        </p>
      </div>

      <div className="space-y-4">
        {/* Disposition radio group */}
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: `${colors.navy}cc` }}>
            What was done with the food?
          </label>
          <div className="space-y-2">
            {radioOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDisposition(opt.value)}
                className="w-full text-left rounded-xl border px-4 py-3 transition-all"
                style={{
                  borderColor: disposition === opt.value ? colors.navy : colors.border,
                  backgroundColor: disposition === opt.value ? `${colors.navy}06` : colors.white,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: disposition === opt.value ? colors.navy : colors.textMuted,
                    }}
                  >
                    {disposition === opt.value && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: colors.navy }}
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                      {opt.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                      {opt.desc}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: `${colors.navy}cc` }}>
            Describe what happened
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-navy/15 rounded-xl text-sm text-navy placeholder:text-navy/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 resize-none"
            placeholder="e.g., Rice cooled too slowly in large pot. Transferred to shallow pans too late. Discarded 12 lbs."
          />
        </div>

        {/* Witnessed by */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: `${colors.navy}cc` }}>
            Witnessed by <span className="font-normal" style={{ color: colors.textMuted }}>(optional)</span>
          </label>
          <select
            value={witnessedBy ?? ''}
            onChange={(e) => setWitnessedBy(e.target.value || null)}
            className="w-full px-4 py-3 border border-navy/15 rounded-xl text-sm text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            <option value="">Select employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {submitError && (
          <div
            className="rounded-xl border px-4 py-3 text-sm"
            style={{ borderColor: colors.danger, backgroundColor: colors.dangerSoft, color: colors.danger }}
          >
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Button variant="secondary" size="lg" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{
              backgroundColor: '#b3261e',
              color: 'white',
              minHeight: '44px',
            }}
          >
            {isLoading ? 'Saving…' : 'Log Disposition & Create CA'}
          </button>
        </div>
      </div>
    </div>
  );
}
