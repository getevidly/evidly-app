import { useState } from 'react';
import { colors } from '../../lib/designSystem';
import { useLogCooldownDisposition } from '../../hooks/temperatures/useCooldownMutations';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { toast } from 'sonner';
import Button from '../ui/Button';
import { Combobox } from '../ui/Combobox';
import { Avatar } from '../ui/Avatar';
import { getMemberName, type OrgMember } from '../../hooks/useOrgMembers';
import type { CooldownEventWithState } from '../../hooks/temperatures/useCooldownEvents';

// ── Types ───────────────────────────────────────────────────

type DispositionChoice = 'discarded' | 'reheated_recooled' | 'other';

// ── Component ───────────────────────────────────────────────

interface LogDispositionModalProps {
  event: CooldownEventWithState;
  members: OrgMember[];
  onClose: () => void;
  onSuccess: () => void;
}

export function LogDispositionModal({ event, members, onClose, onSuccess }: LogDispositionModalProps) {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const orgId = profile?.organization_id ?? '';

  const [disposition, setDisposition] = useState<DispositionChoice | null>(null);
  const [notes, setNotes] = useState('');
  const [witnessId, setWitnessId] = useState<string | null>(null);
  const [witnessName, setWitnessName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutate: logDisposition, isLoading } = useLogCooldownDisposition();

  const operatorName = getMemberName(members, profile?.id);
  const witnessSameAsOperator = witnessId !== null && witnessId === profile?.id;
  const canSubmit = disposition !== null && notes.trim().length > 0 && !isLoading && !witnessSameAsOperator;

  const locationId = getAccessibleLocations()[0]?.locationId ?? '';

  const handleSubmit = async () => {
    if (!canSubmit || !disposition) return;
    setSubmitError(null);
    try {
      // Prepend dual-signature line to notes for the corrective action description
      const witnessLabel = witnessId ? getMemberName(members, witnessId) : 'None';
      const sigLine = `Operator: ${operatorName}. Witness: ${witnessLabel}.`;
      const fullNotes = `${sigLine} ${notes.trim()}`;

      await logDisposition({
        cooldownEventId: event.id,
        disposition,
        dispositionNotes: fullNotes,
        witnessedBy: witnessId,
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

        {/* Dual Signature Block */}
        <div
          className="rounded-xl px-4 py-4"
          style={{ backgroundColor: colors.cream, border: `1px solid ${colors.border}` }}
        >
          <p
            className="text-[9px] uppercase font-semibold tracking-wide mb-3"
            style={{ color: colors.textMuted }}
          >
            Signatures Required
          </p>

          {/* Operator — auto-attached */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={operatorName} userId={profile?.id} size={28} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                {operatorName}
              </p>
              <p className="text-[10px]" style={{ color: colors.textMuted }}>
                OPERATOR · auto-attached
              </p>
            </div>
          </div>

          {/* Witness — combobox or display */}
          <div className="border-t pt-3" style={{ borderColor: colors.borderLight }}>
            {witnessId && !witnessSameAsOperator ? (
              <div className="flex items-center gap-3">
                <Avatar name={getMemberName(members, witnessId)} userId={witnessId} size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                    {getMemberName(members, witnessId)}
                  </p>
                  <p className="text-[10px]" style={{ color: colors.textMuted }}>WITNESS</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setWitnessId(null); setWitnessName(''); }}
                  className="text-[10px] font-semibold"
                  style={{ color: colors.gold }}
                >
                  change
                </button>
              </div>
            ) : (
              <div>
                <p className="text-[10px] uppercase font-semibold mb-2" style={{ color: colors.textMuted }}>
                  Witness
                </p>
                <Combobox<OrgMember>
                  value={witnessName}
                  onChange={(text) => {
                    setWitnessName(text);
                    setWitnessId(null);
                  }}
                  onSelect={(item) => {
                    if (typeof item !== 'string') {
                      setWitnessName(item.full_name || item.email || '');
                      setWitnessId(item.id);
                    }
                  }}
                  items={members}
                  getItemLabel={(m) => m.full_name || m.email || 'Unknown'}
                  getItemMeta={(m) => m.id === profile?.id ? 'You' : m.role ?? undefined}
                  getItemPrefix={(m) => <Avatar name={m.full_name || m.email || '?'} userId={m.id} size={22} />}
                  placeholder="Select witness"
                  sections={[{ title: 'Your team', filter: () => true }]}
                  allowFreeText={false}
                  emptyMessage="No team members found"
                />
              </div>
            )}
          </div>

          {/* Witness = operator error */}
          {witnessSameAsOperator && (
            <div
              className="rounded-lg px-3 py-2 mt-3 text-xs"
              style={{ backgroundColor: colors.dangerSoft, color: colors.danger }}
            >
              Witness must be a different person than the operator.
            </div>
          )}
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
