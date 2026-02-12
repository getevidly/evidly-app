import { useState } from 'react';
import { X, Mail, UserPlus, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onInviteSent: () => void;
}

export function TeamInviteModal({ isOpen, onClose, organizationId, onInviteSent }: TeamInviteModalProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Staff');
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms' | 'both'>('sms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate at least one contact method
    const hasEmail = email.trim() !== '';
    const hasPhone = phone.trim() !== '';

    if (!hasEmail && !hasPhone) {
      setError('Please provide at least an email or phone number');
      return;
    }

    // Validate method matches provided info
    if (inviteMethod === 'email' && !hasEmail) {
      setError('Email is required for email invitations');
      return;
    }
    if (inviteMethod === 'sms' && !hasPhone) {
      setError('Phone number is required for SMS invitations');
      return;
    }
    if (inviteMethod === 'both' && (!hasEmail || !hasPhone)) {
      setError('Both email and phone number are required for dual invitations');
      return;
    }

    setLoading(true);

    // Demo mode: no org ID means we're in demo
    if (!organizationId) {
      setLoading(false);
      toast.success(`Invitation sent to ${email || phone} as ${role}`);
      setEmail('');
      setPhone('');
      setRole('Staff');
      setInviteMethod('sms');
      onClose();
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get organization name for SMS
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .maybeSingle();

      const organizationName = orgData?.name || 'EvidLY';

      const { data: invitation, error: inviteError } = await supabase
        .from('user_invitations')
        .insert({
          organization_id: organizationId,
          email: hasEmail ? email.toLowerCase().trim() : null,
          phone: hasPhone ? phone.trim() : null,
          role,
          invited_by: user.id,
          invitation_method: inviteMethod,
          email_status: (inviteMethod === 'email' || inviteMethod === 'both') ? 'pending' : null,
          sms_status: (inviteMethod === 'sms' || inviteMethod === 'both') ? 'pending' : null,
        })
        .select()
        .single();

      if (inviteError) {
        setError(inviteError.message);
        setLoading(false);
        return;
      }

      const inviteUrl = `${window.location.origin}/invite/${invitation.token}`;

      // Send email if needed
      if (inviteMethod === 'email' || inviteMethod === 'both') {
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
      }

      // Send SMS if needed
      if (inviteMethod === 'sms' || inviteMethod === 'both') {
        const { error: smsError } = await supabase.functions.invoke('send-sms-invite', {
          body: {
            phone: phone.trim(),
            inviteUrl,
            organizationName,
            role,
          }
        });

        const smsStatus = smsError ? 'failed' : 'sent';
        await supabase
          .from('user_invitations')
          .update({ sms_status: smsStatus })
          .eq('id', invitation.id);

        if (smsError) {
          console.error('Error sending SMS invite:', smsError);
        }
      }

      setEmail('');
      setPhone('');
      setRole('Staff');
      setInviteMethod('sms');
      onInviteSent();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#d4af37]/10 rounded-lg">
              <UserPlus className="w-6 h-6 text-[#d4af37]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Invite Team Member</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email (optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone (optional)
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send invite via
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setInviteMethod('sms')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  inviteMethod === 'sms'
                    ? 'bg-[#1e4d6b] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Smartphone className="w-4 h-4 inline mr-1" />
                SMS
              </button>
              <button
                type="button"
                onClick={() => setInviteMethod('email')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  inviteMethod === 'email'
                    ? 'bg-[#1e4d6b] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setInviteMethod('both')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  inviteMethod === 'both'
                    ? 'bg-[#1e4d6b] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Both
              </button>
            </div>
          </div>

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
              <option value="Admin">Admin - Full access including settings</option>
              <option value="Manager">Manager - Manage operations and team</option>
              <option value="Staff">Staff - Daily operations access</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              {inviteMethod === 'email' && 'An invitation email will be sent with a link to join your organization.'}
              {inviteMethod === 'sms' && 'An SMS text message will be sent with a link to join your organization. Recommended for kitchen staff.'}
              {inviteMethod === 'both' && 'Both email and SMS invitations will be sent for maximum delivery success.'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border-2 border-[#1e4d6b] text-[#1e4d6b] rounded-lg hover:bg-gray-50 transition-colors bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
