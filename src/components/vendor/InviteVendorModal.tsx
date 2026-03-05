import { useState } from 'react';
import { Send, XCircle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────

interface LocationOption {
  locationId: string;
  locationName: string;
}

interface InviteVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: (email: string) => void;
  isDemoMode: boolean;
  organizationId: string | null;
  accessibleLocations: LocationOption[];
}

// ── Component ──────────────────────────────────────────────────────

const PRIMARY = '#1e4d6b';

export function InviteVendorModal({
  isOpen,
  onClose,
  onInviteSent,
  isDemoMode,
  organizationId,
  accessibleLocations,
}: InviteVendorModalProps) {
  const [form, setForm] = useState({
    email: '',
    vendorName: '',
    locationIds: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  function resetForm() {
    setForm({ email: '', vendorName: '', locationIds: [] });
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    if (!form.email.trim()) {
      toast.error('Please enter a vendor email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!form.vendorName.trim()) {
      toast.error('Please enter the vendor name.');
      return;
    }

    const emailLower = form.email.trim().toLowerCase();

    setSubmitting(true);

    try {
      if (!isDemoMode && organizationId) {
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const { error: inviteError } = await supabase
          .from('user_invitations')
          .insert({
            organization_id: organizationId,
            email: emailLower,
            full_name: form.vendorName.trim(),
            role: 'vendor',
            token,
            status: 'pending',
            expires_at: expiresAt,
            invitation_method: 'email',
            email_status: 'pending',
            location_ids: form.locationIds.length > 0 ? form.locationIds : null,
          });

        if (inviteError) {
          toast.error(`Failed to send invite: ${inviteError.message}`);
          setSubmitting(false);
          return;
        }
      }

      onInviteSent(emailLower);
      toast.success(`Invite sent to ${emailLower}`);
      handleClose();
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 w-[95vw] sm:w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#eef4f8] rounded-lg">
                  <Send className="h-5 w-5 text-[#1e4d6b]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Invite Vendor</h3>
                  <p className="text-sm text-gray-500">Send a branded invite to join EvidLY</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Vendor Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="vendor@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              />
            </div>

            {/* Vendor Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.vendorName}
                onChange={(e) => setForm(prev => ({ ...prev, vendorName: e.target.value }))}
                placeholder="e.g., Acme Hood Cleaning"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value="Vendor"
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Vendor role is pre-configured for service providers</p>
            </div>

            {/* Location Assignment */}
            {accessibleLocations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-3.5 w-3.5 inline mr-1" />
                  Location Assignment
                </label>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  {accessibleLocations.map((loc) => (
                    <label key={loc.locationId} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.locationIds.includes(loc.locationId)}
                        onChange={() => {
                          setForm(prev => ({
                            ...prev,
                            locationIds: prev.locationIds.includes(loc.locationId)
                              ? prev.locationIds.filter(id => id !== loc.locationId)
                              : [...prev.locationIds, loc.locationId],
                          }));
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-[#1e4d6b] focus:ring-[#1e4d6b]"
                      />
                      <span className="text-sm text-gray-700">{loc.locationName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="bg-[#eef4f8] rounded-lg p-3 border border-[#b8d4e8]">
              <p className="text-xs text-[#1e4d6b]">
                <strong>What happens next:</strong> The vendor will receive a branded email invitation with a secure link to create their EvidLY account. They will be pre-configured with the Vendor role and associated with the selected location(s).
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-xl">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#163a52'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = PRIMARY; }}
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
