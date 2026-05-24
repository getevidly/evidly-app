import { useState, useEffect } from 'react';
import { colors } from '../../lib/designSystem';
import { useLogCooldownCheck } from '../../hooks/temperatures/useCooldownMutations';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import Button from '../ui/Button';
import { Combobox } from '../ui/Combobox';
import { Avatar } from '../ui/Avatar';
import type { OrgMember } from '../../hooks/useOrgMembers';
import type { CooldownEventWithState } from '../../hooks/temperatures/useCooldownEvents';

interface LogCoolingCheckModalProps {
  event: CooldownEventWithState;
  members: OrgMember[];
  onClose: () => void;
  onSuccess: () => void;
}

export function LogCoolingCheckModal({ event, members, onClose, onSuccess }: LogCoolingCheckModalProps) {
  const { profile } = useAuth();
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [checkedById, setCheckedById] = useState<string | null>(profile?.id ?? null);
  const [checkedByName, setCheckedByName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutate: logCheck, isLoading } = useLogCooldownCheck();

  // Default "logged by" to current user
  useEffect(() => {
    if (profile?.id && members.length > 0 && !checkedByName) {
      const me = members.find(m => m.id === profile.id);
      if (me) {
        setCheckedByName(me.full_name || me.email || '');
        setCheckedById(me.id);
      }
    }
  }, [profile?.id, members]);

  const tempNumeric = parseFloat(temperature);
  const tempValid = !isNaN(tempNumeric) && tempNumeric > 0;
  const canSubmit = tempValid && !isLoading;

  const stageLabel = event.activeStage === 1 ? 'Stage 1 — target ≤70°F' : 'Stage 2 — target ≤41°F';
  const deadline = new Date(
    event.activeStage === 1 ? event.stage_1_target_at : event.stage_2_target_at
  ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      const result = await logCheck({
        cooldownEventId: event.id,
        temperature: tempNumeric,
        notes: notes.trim() || null,
        checkedBy: checkedById ?? profile?.id ?? null,
        currentStatus: event.status,
      });

      if (result.newStatus === 'stage_1_complete') {
        toast.success(`${event.food_item_name} — Stage 1 complete! Now cooling to 41°F.`);
      } else if (result.newStatus === 'completed') {
        toast.success(`${event.food_item_name} — Cooldown complete!`);
      } else {
        toast.success(`Check logged: ${tempNumeric}°F`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log check';
      setSubmitError(message);
    }
  };

  return (
    <div className="p-4 sm:p-5">
      <h3 className="text-xl font-bold tracking-tight mb-1" style={{ color: colors.textPrimary }}>
        Log Cooling Check
      </h3>
      <p className="text-sm mb-5" style={{ color: colors.textSecondary }}>
        {event.food_item_name} · {stageLabel} · deadline {deadline}
      </p>

      {/* Help block */}
      <div
        className="rounded-xl px-4 py-3 mb-5"
        style={{ backgroundColor: colors.cream }}
      >
        <p className="text-xs" style={{ color: colors.textSecondary }}>
          <span className="font-semibold" style={{ color: colors.navy }}>CalCode §114002</span>
          <span style={{ color: colors.textMuted }}> · FDA §3-501.14</span>
        </p>
        <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
          {event.activeStage === 1
            ? 'Stage 1: food must reach 70°F within 2 hours of starting the cooldown.'
            : 'Stage 2: food must reach 41°F within 6 hours total from 135°F.'}
        </p>
      </div>

      <div className="space-y-4">
        {/* Temperature input */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: `${colors.navy}cc` }}>
            Current Temperature (°F)
          </label>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="w-full px-4 py-3 border border-navy/15 rounded-xl text-sm text-navy placeholder:text-navy/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            placeholder={event.activeStage === 1 ? 'Target: ≤70' : 'Target: ≤41'}
            autoFocus
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: `${colors.navy}cc` }}>
            Notes <span className="font-normal" style={{ color: colors.textMuted }}>(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-navy/15 rounded-xl text-sm text-navy placeholder:text-navy/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            placeholder="e.g., Moved to ice bath"
          />
        </div>

        {/* Logged by */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: `${colors.navy}cc` }}>
            Logged by
          </label>
          <Combobox<OrgMember>
            value={checkedByName}
            onChange={(text) => {
              setCheckedByName(text);
              setCheckedById(null);
            }}
            onSelect={(item) => {
              if (typeof item !== 'string') {
                setCheckedByName(item.full_name || item.email || '');
                setCheckedById(item.id);
              }
            }}
            items={members}
            getItemLabel={(m) => m.full_name || m.email || 'Unknown'}
            getItemMeta={(m) => m.id === profile?.id ? 'You' : m.role ?? undefined}
            getItemPrefix={(m) => <Avatar name={m.full_name || m.email || '?'} userId={m.id} size={22} />}
            placeholder="Select team member"
            sections={[{ title: 'Your team', filter: () => true }]}
            allowFreeText={false}
            emptyMessage="No team members found"
          />
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
          <Button variant="primary" size="lg" onClick={handleSubmit} isLoading={isLoading} disabled={!canSubmit}>
            Log Check
          </Button>
        </div>
      </div>
    </div>
  );
}
