import { useState, useEffect } from 'react';
import { useMenuItems, type MenuItem } from '../../hooks/api/useMenuItems';
import { useCreateCooldownEvent } from '../../hooks/temperatures/useCooldownMutations';
import { useOrgMembers, type OrgMember } from '../../hooks/useOrgMembers';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { supabase } from '../../lib/supabase';
import { HOLDING_COLD_TYPES, STORAGE_TYPES } from '../../lib/equipmentHelpers';
import { colors } from '../../lib/designSystem';
import { toast } from 'sonner';
import Button from '../ui/Button';
import { Combobox } from '../ui/Combobox';
import { Avatar } from '../ui/Avatar';

// ── Equipment type ──────────────────────────────────────────

interface CoolingEquipment {
  id: string;
  name: string;
  equipment_type: string;
  is_active: boolean;
}

const COOLING_TYPES = [
  ...HOLDING_COLD_TYPES,
  ...STORAGE_TYPES,
  'walk_in', 'reach_in', 'blast_chiller', 'blast_freezer', 'ice_bath',
];

// ── Component ───────────────────────────────────────────────

interface StartCooldownFormProps {
  onClose: () => void;
  onSuccess?: (cooldownLogId: string) => void;
}

export function StartCooldownForm({ onClose, onSuccess }: StartCooldownFormProps) {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const locationIds = getAccessibleLocations().map(l => l.locationId).filter(Boolean);
  const locationId = locationIds[0] ?? '';
  const organizationId = profile?.organization_id ?? '';

  // Form state
  const [foodItemName, setFoodItemName] = useState('');
  const [startingTemp, setStartingTemp] = useState('');
  const [coolingLocation, setCoolingLocation] = useState('');
  const [assignedToId, setAssignedToId] = useState<string | null>(profile?.id ?? null);
  const [assignedToName, setAssignedToName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Data
  const { data: menuItems } = useMenuItems(locationId);
  const { members } = useOrgMembers();
  const { mutate: createCooldownEvent, isLoading } = useCreateCooldownEvent();
  const [equipment, setEquipment] = useState<CoolingEquipment[]>([]);

  // Fetch cooling equipment
  useEffect(() => {
    if (locationIds.length === 0) return;
    supabase
      .from('temperature_equipment')
      .select('id, name, equipment_type, is_active')
      .in('location_id', locationIds)
      .then(({ data }) => {
        if (data) {
          setEquipment(
            (data as CoolingEquipment[]).filter(eq =>
              COOLING_TYPES.includes(eq.equipment_type)
            )
          );
        }
      });
  }, [locationIds.join(',')]);

  // Default "responsible person" to current user
  useEffect(() => {
    if (profile?.id && members.length > 0 && !assignedToName) {
      const me = members.find(m => m.id === profile.id);
      if (me) {
        setAssignedToName(me.full_name || me.email || '');
        setAssignedToId(me.id);
      }
    }
  }, [profile?.id, members]);

  // Validation
  const tempNumeric = parseFloat(startingTemp);
  const tempValid = !isNaN(tempNumeric) && tempNumeric > 0;
  const itemValid = foodItemName.trim().length > 0;
  const tempBelowStart = tempValid && tempNumeric < 135;
  const canSubmit = tempValid && itemValid && assignedToId !== null && !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      const result = await createCooldownEvent({
        organizationId,
        locationId,
        foodItemName: foodItemName.trim(),
        startingTemperature: tempNumeric,
        coolingLocation: coolingLocation.trim() || null,
        createdBy: profile?.id ?? null,
        assignedTo: assignedToId,
      });
      toast.success(`Cooldown started for ${foodItemName.trim()}`);
      onSuccess?.(result.eventId);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start cooldown';
      setSubmitError(message);
    }
  };

  return (
    <div className="p-4 sm:p-5">
      <h3 className="text-2xl font-bold tracking-tight mb-6" style={{ color: colors.textPrimary }}>
        Start a Cooldown
      </h3>

      {/* Guidance */}
      <div
        className="rounded-xl px-4 py-4 mb-5"
        style={{ backgroundColor: colors.cream }}
      >
        <p
          className="text-xs uppercase tracking-wide font-semibold mb-3"
          style={{ color: colors.textSecondary }}
        >
          CalCode §114002 · FDA §3-501.14 · Two-stage cooldown
        </p>

        <div className="space-y-2.5 mb-3">
          <div className="flex items-start gap-2.5">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: `${colors.gold}20`, color: colors.gold }}
            >
              1
            </span>
            <div>
              <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                135°F → 70°F within 2 hours
              </p>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Clock starts at 135°F
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: `${colors.success}15`, color: colors.success }}
            >
              2
            </span>
            <div>
              <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                70°F → 41°F within 4 more hours
              </p>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                6 hours total from 135°F
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            The clock starts when you save this cooldown.
          </p>
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            Use shallow pans, ice baths, or blast chillers to actively cool. Don't rely on refrigeration alone.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Food Item — Combobox */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: `${colors.navy}cc` }}>
            What are you cooling?
          </label>
          <Combobox<MenuItem>
            value={foodItemName}
            onChange={setFoodItemName}
            onSelect={(item) => {
              if (typeof item === 'string') {
                setFoodItemName(item);
              } else {
                setFoodItemName(item.name);
              }
            }}
            items={menuItems ?? []}
            getItemLabel={(item) => item.name}
            getItemMeta={(item) => item.category ?? undefined}
            placeholder="e.g., Rice Pilaf, Chicken Soup"
            helper="Pick from your menu or use any name."
            sections={[{ title: 'From your menu', filter: () => true }]}
            allowFreeText
          />
        </div>

        {/* Starting Temperature */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: `${colors.navy}cc` }}>
            Starting Temperature (°F)
          </label>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={startingTemp}
            onChange={(e) => setStartingTemp(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            style={{
              borderColor: tempBelowStart ? colors.warning : `${colors.navy}26`,
              color: colors.navy,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16,
            }}
            placeholder="e.g., 165"
          />
          {tempBelowStart ? (
            <div
              className="rounded-lg px-3 py-2 mt-2 text-xs"
              style={{ backgroundColor: colors.warningSoft, color: colors.warning }}
            >
              {tempNumeric}°F is below the 135°F clock start. Verify the temp or wait until food drops to 135°F. You can still proceed if you confirm the value.
            </div>
          ) : (
            <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
              Enter the temperature when the food first dropped to 135°F. This starts your 6-hour clock.
            </p>
          )}
        </div>

        {/* Cooling Location — Combobox */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: `${colors.navy}cc` }}>
            Cooling Where?
          </label>
          <Combobox<CoolingEquipment>
            value={coolingLocation}
            onChange={setCoolingLocation}
            onSelect={(item) => {
              if (typeof item === 'string') {
                setCoolingLocation(item);
              } else {
                setCoolingLocation(item.name);
              }
            }}
            items={equipment}
            getItemLabel={(eq) => eq.name}
            getItemMeta={(eq) => eq.is_active ? 'In service' : 'Inactive'}
            placeholder="e.g., Blast Chiller 1, Walk-in cooler"
            helper="Pick a unit or describe where (ice bath, shallow pan in walk-in, etc.)."
            sections={[{ title: 'Registered equipment', filter: () => true }]}
            allowFreeText
          />
        </div>

        {/* Responsible Person — Combobox */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: `${colors.navy}cc` }}>
            Who's responsible?
          </label>
          <Combobox<OrgMember>
            value={assignedToName}
            onChange={(text) => {
              setAssignedToName(text);
              setAssignedToId(null);
            }}
            onSelect={(item) => {
              if (typeof item !== 'string') {
                setAssignedToName(item.full_name || item.email || '');
                setAssignedToId(item.id);
              }
            }}
            items={members}
            getItemLabel={(m) => m.full_name || m.email || 'Unknown'}
            getItemMeta={(m) => m.id === profile?.id ? 'You · default' : m.role ?? undefined}
            getItemPrefix={(m) => <Avatar name={m.full_name || m.email || '?'} userId={m.id} size={22} />}
            placeholder="Select team member"
            helper="Who'll monitor this cooldown? They'll get the deadline alerts."
            sections={[{ title: 'Your team', filter: () => true }]}
            allowFreeText={false}
            emptyMessage="No team members found"
          />
        </div>

        {/* Inline error */}
        {submitError && (
          <div
            className="rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: colors.danger,
              backgroundColor: colors.dangerSoft,
              color: colors.danger,
            }}
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
            Start Cooldown
          </Button>
        </div>
      </div>
    </div>
  );
}
