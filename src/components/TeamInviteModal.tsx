import { useState } from 'react';
import { X, Mail, UserPlus, Phone, Users, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface LocationOption {
  locationId: string;
  locationName: string;
}

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onInviteSent: () => void;
  mode?: 'single' | 'bulk';
  locations?: LocationOption[];
}

const ROLE_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'kitchen_staff', label: 'Kitchen Staff', description: 'Daily operations — checklists, temp logs' },
  { value: 'chef', label: 'Chef', description: 'Kitchen leadership — recipes, training' },
  { value: 'kitchen_manager', label: 'Kitchen Manager', description: 'Full kitchen oversight — compliance, team' },
  { value: 'facilities_manager', label: 'Facilities Manager', description: 'Equipment, vendors, facility safety' },
  { value: 'compliance_manager', label: 'Compliance Officer', description: 'Regulatory compliance, audits, reports' },
  { value: 'executive', label: 'Executive', description: 'Organization-wide access, analytics' },
  { value: 'owner_operator', label: 'Owner / Operator', description: 'Full access including billing & settings' },
];

export function TeamInviteModal({ isOpen, onClose, organizationId, onInviteSent, mode = 'single', locations = [] }: TeamInviteModalProps) {
  // Single mode state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Bulk mode state
  const [bulkEmails, setBulkEmails] = useState('');

  // Shared state
  const [role, setRole] = useState('kitchen_staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parseBulkEmails = (text: string): string[] => {
    return text
      .split(/[,\n]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0)
      .filter((e, i, arr) => arr.indexOf(e) === i); // deduplicate
  };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const toggleLocation = (locId: string) => {
    setSelectedLocations(prev =>
      prev.includes(locId) ? prev.filter(id => id !== locId) : [...prev, locId]
    );
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setBulkEmails('');
    setRole('kitchen_staff');
    setSelectedLocations([]);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emails = parseBulkEmails(bulkEmails);
    if (emails.length === 0) {
      setError('Please enter at least one email address');
      return;
    }

    const invalid = emails.filter(em => !isValidEmail(em));
    if (invalid.length > 0) {
      setError(`Invalid email${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`);
      return;
    }

    setLoading(true);

    // Demo mode
    if (!organizationId) {
      setLoading(false);
      toast.success(`${emails.length} invitation${emails.length > 1 ? 's' : ''} sent (demo)`);
      resetForm();
      onInviteSent();
      onClose();
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let sent = 0;
      let failed = 0;

      for (const addr of emails) {
        try {
          const { data: invitation, error: inviteError } = await supabase
            .from('user_invitations')
            .insert({
              organization_id: organizationId,
              email: addr,
              phone: null,
              role,
              invited_by: user.id,
              invitation_method: 'email' as const,
              email_status: 'pending',
              sms_status: null,
              full_name: null,
              location_ids: selectedLocations.length > 0 ? selectedLocations : null,
            })
            .select()
            .single();

          if (inviteError) {
            failed++;
            continue;
          }

          const inviteUrl = `${window.location.origin}/invite/${invitation.token}`;
          const { error: emailError } = await supabase.functions.invoke('send-team-invite', {
            body: {
              email: addr,
              inviteUrl,
              role,
              inviterName: user.user_metadata?.full_name || user.email,
            }
          });

          await supabase
            .from('user_invitations')
            .update({ email_status: emailError ? 'failed' : 'sent' })
            .eq('id', invitation.id);

          sent++;
        } catch {
          failed++;
        }
      }

      if (failed > 0) {
        toast.success(`${sent} sent, ${failed} failed`);
      } else {
        toast.success(`${sent} invitation${sent > 1 ? 's' : ''} sent`);
      }

      resetForm();
      onInviteSent();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    // Demo mode
    if (!organizationId) {
      setLoading(false);
      const roleLabel = ROLE_OPTIONS.find(r => r.value === role)?.label || role;
      toast.success(`Invitation sent to ${fullName.trim()} (${email.trim()}) as ${roleLabel}`);
      resetForm();
      onInviteSent();
      onClose();
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Duplicate detection: check for existing pending invitation with same email
      const { data: existing } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        setError('An invitation is already pending for this email address. You can resend it from the team page.');
        setLoading(false);
        return;
      }

      const { data: invitation, error: inviteError } = await supabase
        .from('user_invitations')
        .insert({
          organization_id: organizationId,
          email: email.toLowerCase().trim(),
          phone: phone.trim() || null,
          role,
          invited_by: user.id,
          invitation_method: 'email' as const,
          email_status: 'pending',
          sms_status: null,
          full_name: fullName.trim(),
          location_ids: selectedLocations.length > 0 ? selectedLocations : null,
        })
        .select()
        .single();

      if (inviteError) {
        setError(inviteError.message);
        setLoading(false);
        return;
      }

      const inviteUrl = `${window.location.origin}/invite/${invitation.token}`;

      const { error: emailError } = await supabase.functions.invoke('send-team-invite', {
        body: {
          email: email.toLowerCase().trim(),
          inviteUrl,
          role,
          inviterName: user.user_metadata?.full_name || user.email,
        }
      });

      const emailStatus = emailError ? 'failed' : 'sent';
      await supabase
        .from('user_invitations')
        .update({ email_status: emailStatus })
        .eq('id', invitation.id);

      if (emailError) {
        console.error('Error sending invite email:', emailError);
      }

      resetForm();
      onInviteSent();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const bulkEmailCount = parseBulkEmails(bulkEmails).length;
  const isBulk = mode === 'bulk';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 w-full ${isBulk ? 'max-w-lg' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#d4af37]/10 rounded-lg">
              {isBulk ? <Users className="w-6 h-6 text-[#d4af37]" /> : <UserPlus className="w-6 h-6 text-[#d4af37]" />}
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {isBulk ? 'Invite Multiple Members' : 'Invite Team Member'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={isBulk ? handleBulkSubmit : handleSingleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {isBulk ? (
            <>
              <div>
                <label htmlFor="bulkEmails" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Addresses
                </label>
                <textarea
                  id="bulkEmails"
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  placeholder={"john@example.com, jane@example.com\nor one per line"}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent resize-none"
                />
                {bulkEmailCount > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{bulkEmailCount} email{bulkEmailCount !== 1 ? 's' : ''} detected</p>
                )}
              </div>

              {locations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Locations
                  </label>
                  <div className="space-y-2">
                    {locations.map(loc => (
                      <label key={loc.locationId} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLocations.includes(loc.locationId)}
                          onChange={() => toggleLocation(loc.locationId)}
                          className="w-4 h-4 rounded border-gray-300 text-[#1e4d6b] focus:ring-[#1e4d6b]"
                        />
                        <span className="text-sm text-gray-700">{loc.locationName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Maria Garcia"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-gray-400 text-xs font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Locations */}
              {locations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    Assign to Locations
                  </label>
                  <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                    {locations.map(loc => (
                      <label key={loc.locationId} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLocations.includes(loc.locationId)}
                          onChange={() => toggleLocation(loc.locationId)}
                          className="w-4 h-4 rounded border-gray-300 text-[#1e4d6b] focus:ring-[#1e4d6b]"
                        />
                        <span className="text-sm text-gray-700">{loc.locationName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Role — shared between single and bulk */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              {isBulk
                ? `Email invitations will be sent to ${bulkEmailCount || 0} recipient${bulkEmailCount !== 1 ? 's' : ''} with a link to join your organization.`
                : 'An invitation email will be sent with a link to join your organization.'
              }
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border-2 border-[#1e4d6b] text-[#1e4d6b] rounded-xl hover:bg-gray-50 transition-colors bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (isBulk && bulkEmailCount === 0)}
              className="flex-1 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading
                ? 'Sending...'
                : isBulk
                  ? `Send ${bulkEmailCount} Invitation${bulkEmailCount !== 1 ? 's' : ''}`
                  : 'Send Invitation'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
