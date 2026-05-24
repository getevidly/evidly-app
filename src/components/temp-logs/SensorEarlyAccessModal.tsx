import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../lib/designSystem';
import { Modal } from '../ui/Modal';
import { Combobox } from '../ui/Combobox';
import Button from '../ui/Button';

// ── Vendor options ───────────────────────────────────────────

interface VendorOption {
  label: string;
}

const VENDOR_OPTIONS: VendorOption[] = [
  { label: 'SensorPush' },
  { label: 'Temp Stick' },
  { label: 'Monnit' },
  { label: 'Testo' },
  { label: 'ComplianceMate' },
  { label: "Don't have one yet" },
];

// ── Component ────────────────────────────────────────────────

interface SensorEarlyAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SensorEarlyAccessModal({ isOpen, onClose }: SensorEarlyAccessModalProps) {
  const { profile } = useAuth();

  const [email, setEmail] = useState(profile?.email ?? '');
  const [vendorText, setVendorText] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const vendor = selectedVendor ?? (vendorText.trim() || null);
      const isKnownVendor = VENDOR_OPTIONS.some(v => v.label === vendor);

      const { error } = await supabase
        .from('sensor_integration_interest')
        .insert({
          organization_id: profile?.organization_id ?? null,
          user_id: profile?.id ?? null,
          email: email.trim(),
          vendor: isKnownVendor ? vendor : null,
          vendor_free_text: !isKnownVendor && vendor ? vendor : null,
        });

      if (error) throw new Error(error.message);
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after close animation
    setTimeout(() => {
      setSuccess(false);
      setSubmitError(null);
      setVendorText('');
      setSelectedVendor(null);
      setEmail(profile?.email ?? '');
    }, 200);
  };

  const vendorLabel = selectedVendor ?? (vendorText.trim() || 'your sensor');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="p-5 sm:p-6">
        {success ? (
          /* ── Success state ──────────────────────────────── */
          <div className="flex flex-col items-center text-center py-8">
            <CheckCircle
              className="h-12 w-12 mb-4"
              style={{ color: colors.success }}
            />
            <h3
              className="text-lg font-bold mb-2"
              style={{ color: colors.textPrimary }}
            >
              You're on the list
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: colors.textSecondary, maxWidth: 360, lineHeight: 1.5 }}
            >
              We'll email you when {vendorLabel} integration ships.
            </p>
            <Button variant="secondary" size="lg" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          /* ── Form state ─────────────────────────────────── */
          <>
            {/* Eyebrow */}
            <p
              className="text-[10px] uppercase font-semibold tracking-wide mb-1"
              style={{ color: colors.gold, letterSpacing: '0.12em' }}
            >
              Coming Soon
            </p>

            {/* Title */}
            <h3
              className="text-xl font-bold tracking-tight mb-4"
              style={{ color: colors.textPrimary }}
            >
              Sensor integration &middot; Early access
            </h3>

            {/* Body */}
            <p
              className="text-sm mb-5"
              style={{ color: colors.textSecondary, lineHeight: 1.55 }}
            >
              We're building integrations with SensorPush, Temp Stick,
              Monnit, Testo, and ComplianceMate. Add your email and pick
              your vendor to get notified when your integration ships.
            </p>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: `${colors.navy}cc` }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                  style={{
                    borderColor: colors.border,
                    color: colors.navy,
                  }}
                  placeholder="you@company.com"
                />
              </div>

              {/* Vendor combobox */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: `${colors.navy}cc` }}
                >
                  Which sensor do you use?
                </label>
                <Combobox<VendorOption>
                  value={vendorText}
                  onChange={text => {
                    setVendorText(text);
                    setSelectedVendor(null);
                  }}
                  onSelect={item => {
                    if (typeof item === 'string') {
                      setVendorText(item);
                      setSelectedVendor(item);
                    } else {
                      setVendorText(item.label);
                      setSelectedVendor(item.label);
                    }
                  }}
                  items={VENDOR_OPTIONS}
                  getItemLabel={v => v.label}
                  placeholder="Select or type a vendor"
                  sections={[{ title: 'Supported vendors', filter: () => true }]}
                  allowFreeText
                  freeTextLabel={text => `Other: "${text}"`}
                  emptyMessage="No matches"
                />
              </div>

              {/* Error */}
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

              {/* Primary CTA */}
              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                disabled={!canSubmit}
                className="w-full"
              >
                Join Early Access
              </Button>

              {/* Dismiss link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm"
                  style={{ color: colors.textMuted }}
                >
                  Maybe later
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
