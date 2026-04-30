import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useMenuItems, type MenuItem } from '../../hooks/api/useMenuItems';
import { useStartCooldown } from '../../hooks/api/useCooldownLogs';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { colors } from '../../lib/designSystem';
import { toast } from 'sonner';
import Button from '../ui/Button';

interface StartCooldownFormProps {
  onClose: () => void;
  onSuccess?: (cooldownLogId: string) => void;
}

export function StartCooldownForm({ onClose, onSuccess }: StartCooldownFormProps) {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const locationId = getAccessibleLocations()[0]?.locationId ?? '';
  const organizationId = profile?.organization_id ?? '';

  // Form state
  const [foodItemName, setFoodItemName] = useState('');
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);
  const [startingTemp, setStartingTemp] = useState('');
  const [coolingNotes, setCoolingNotes] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Data
  const { data: menuItems } = useMenuItems(locationId);
  const { mutate: startCooldown, isLoading } = useStartCooldown();

  // Filter menu items as user types
  const filteredItems = useMemo(() => {
    if (!menuItems || !foodItemName.trim()) return [];
    const query = foodItemName.toLowerCase();
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [menuItems, foodItemName]);

  // Validation
  const tempNumeric = parseFloat(startingTemp);
  const tempValid = !isNaN(tempNumeric) && tempNumeric > 0;
  const itemValid = foodItemName.trim().length > 0;
  const canSubmit = tempValid && itemValid && !isLoading;

  const handleSelectItem = (item: MenuItem) => {
    setFoodItemName(item.name);
    setSelectedMenuItemId(item.id);
    setShowSuggestions(false);
  };

  const handleItemInputChange = (value: string) => {
    setFoodItemName(value);
    setSelectedMenuItemId(null);
    setShowSuggestions(value.trim().length > 0);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      const result = await startCooldown({
        organizationId,
        locationId,
        foodItemName: foodItemName.trim(),
        startingTemp: tempNumeric,
        menuItemId: selectedMenuItemId,
        notes: coolingNotes.trim() || null,
      });
      toast.success(`Cooldown started for ${foodItemName.trim()}`);
      onSuccess?.(result.cooldownLogId);
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
        className="rounded-xl px-4 py-3 mb-5 space-y-1.5"
        style={{ backgroundColor: colors.cream }}
      >
        <p className="text-sm" style={{ color: colors.textPrimary }}>
          <span className="font-semibold">FDA + CalCode:</span>{' '}
          cool from 135°F to 70°F in 2 hours, then to 41°F within 4 more hours. 6 hours total.
        </p>
        <p className="text-xs" style={{ color: colors.textSecondary }}>
          The clock starts when you save this cooldown.
        </p>
        <p className="text-xs" style={{ color: colors.textSecondary }}>
          Use shallow pans, ice baths, or blast chillers to actively cool. Don't rely on refrigeration alone.
        </p>
      </div>

      <div className="space-y-5">
        {/* Food Item Name — with menu item search */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: `${colors.navy}cc` }}>
            What are you cooling?
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4" style={{ color: colors.textMuted }} />
            </div>
            <input
              type="text"
              value={foodItemName}
              onChange={(e) => handleItemInputChange(e.target.value)}
              onFocus={() => { if (foodItemName.trim()) setShowSuggestions(true); }}
              onBlur={() => setShowSuggestions(false)}
              className="w-full pl-10 pr-4 py-3 border border-navy/15 rounded-xl text-sm text-navy placeholder:text-navy/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
              placeholder="e.g., Rice Pilaf, Chicken Soup"
            />
            {showSuggestions && filteredItems.length > 0 && (
              <div
                className="absolute z-10 w-full mt-1 rounded-xl border shadow-lg overflow-hidden"
                style={{ backgroundColor: colors.white, borderColor: colors.border }}
              >
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectItem(item)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-cream transition-colors"
                    style={{ color: colors.textPrimary }}
                  >
                    <span className="font-medium">{item.name}</span>
                    {item.category && (
                      <span className="ml-2 text-xs" style={{ color: colors.textMuted }}>
                        {item.category}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedMenuItemId && (
            <p className="text-xs mt-1" style={{ color: colors.success }}>
              Linked to menu item
            </p>
          )}
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
            className="w-full px-4 py-3 border border-navy/15 rounded-xl text-sm text-navy placeholder:text-navy/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            placeholder="e.g., 165"
          />
          <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
            Enter the temperature when the food first dropped to 135°F. This starts your 6-hour clock.
          </p>
        </div>

        {/* Cooling Location Notes */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: `${colors.navy}cc` }}>
            Cooling Where?
          </label>
          <input
            type="text"
            value={coolingNotes}
            onChange={(e) => setCoolingNotes(e.target.value)}
            className="w-full px-4 py-3 border border-navy/15 rounded-xl text-sm text-navy placeholder:text-navy/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            placeholder="e.g., Blast Chiller 1, Walk-in cooler"
          />
          <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
            Optional — describe where the item is cooling
          </p>
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
