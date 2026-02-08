import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Plus, Users, Mail, Shield, Clock, X, Smartphone, RotateCw, Search, Filter, Award, Activity, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TeamInviteModal } from '../components/TeamInviteModal';
import { format } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  last_active?: string;
}

interface Invitation {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  invitation_method: 'email' | 'sms' | 'both';
  email_status: string | null;
  sms_status: string | null;
  created_at: string;
  expires_at: string;
  token: string;
}

interface Certification {
  id: string;
  certification_name: string;
  issue_date: string | null;
  expiration_date: string | null;
  status: string;
}

export function Team() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberCertifications, setMemberCertifications] = useState<Certification[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchTeam();
      fetchInvitations();
    }
  }, [profile]);

  const fetchTeam = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, role, avatar_url, created_at')
      .eq('organization_id', profile?.organization_id)
      .order('created_at', { ascending: false });

    if (data) setMembers(data);
  };

  const fetchInvitations = async () => {
    const { data } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) setInvitations(data);
  };

  const fetchMemberCertifications = async (userId: string) => {
    const { data } = await supabase
      .from('employee_certifications')
      .select('*')
      .eq('user_id', userId)
      .order('expiration_date', { ascending: true });

    if (data) setMemberCertifications(data);
  };

  const handleInviteSent = () => {
    fetchInvitations();
  };

  const cancelInvitation = async (invitationId: string) => {
    await supabase
      .from('user_invitations')
      .update({ status: 'expired' })
      .eq('id', invitationId);

    fetchInvitations();
  };

  const resendInvitation = async (invitation: Invitation, method?: 'email' | 'sms') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const inviteUrl = `${window.location.origin}/invite/${invitation.token}`;
      const sendMethod = method || invitation.invitation_method;

      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', profile?.organization_id || '')
        .maybeSingle();

      const organizationName = orgData?.name || 'EvidLY';

      if (sendMethod === 'email' || (sendMethod === 'both' && !method)) {
        if (invitation.email) {
          const { error: emailError } = await supabase.functions.invoke('send-team-invite', {
            body: {
              email: invitation.email,
              inviteUrl,
              role: invitation.role,
              inviterName: user.user_metadata?.full_name || user.email,
            }
          });

          const emailStatus = emailError ? 'failed' : 'sent';
          await supabase
            .from('user_invitations')
            .update({ email_status: emailStatus })
            .eq('id', invitation.id);
        }
      }

      if (sendMethod === 'sms' || (sendMethod === 'both' && !method)) {
        if (invitation.phone) {
          const { error: smsError } = await supabase.functions.invoke('send-sms-invite', {
            body: {
              phone: invitation.phone,
              inviteUrl,
              organizationName,
              role: invitation.role,
            }
          });

          const smsStatus = smsError ? 'failed' : 'sent';
          await supabase
            .from('user_invitations')
            .update({ sms_status: smsStatus })
            .eq('id', invitation.id);
        }
      }

      fetchInvitations();
    } catch (error) {
      console.error('Error resending invitation:', error);
    }
  };

  const viewMemberDetails = async (member: TeamMember) => {
    setSelectedMember(member);
    await fetchMemberCertifications(member.id);
    setShowDetailsModal(true);
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: { label: 'Owner', color: 'bg-[#d4af37] text-[#1e4d6b]' },
      manager: { label: 'Manager', color: 'bg-blue-100 text-blue-800' },
      staff: { label: 'Staff', color: 'bg-gray-100 text-gray-800' },
    };
    const badge = badges[role as keyof typeof badges] || badges.staff;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (member: TeamMember) => {
    return (
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 bg-green-500 rounded-full"></span>
        <span className="text-sm text-gray-600">Active</span>
      </span>
    );
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <Layout title="Team">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Team' }]} />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-gray-600">Manage team members and permissions</p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              <option value="all">All Roles</option>
              <option value="admin">Owner</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] shadow-sm"
            >
              <Plus className="h-5 w-5" />
              <span>Invite Member</span>
            </button>
          </div>
        </div>

        {invitations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Pending Invitations
            </h3>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between bg-white p-4 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex gap-1">
                      {(invitation.invitation_method === 'email' || invitation.invitation_method === 'both') && (
                        <div className={`p-2 rounded ${
                          invitation.email_status === 'sent' ? 'bg-green-100' :
                          invitation.email_status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <Mail className={`w-4 h-4 ${
                            invitation.email_status === 'sent' ? 'text-green-600' :
                            invitation.email_status === 'failed' ? 'text-red-600' : 'text-gray-400'
                          }`} />
                        </div>
                      )}
                      {(invitation.invitation_method === 'sms' || invitation.invitation_method === 'both') && (
                        <div className={`p-2 rounded ${
                          invitation.sms_status === 'sent' ? 'bg-green-100' :
                          invitation.sms_status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <Smartphone className={`w-4 h-4 ${
                            invitation.sms_status === 'sent' ? 'text-green-600' :
                            invitation.sms_status === 'failed' ? 'text-red-600' : 'text-gray-400'
                          }`} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {invitation.email || invitation.phone}
                        {invitation.email && invitation.phone && (
                          <span className="text-sm text-gray-500 ml-2">({invitation.phone})</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {invitation.role} • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        {invitation.email_status === 'failed' && ' • Email failed'}
                        {invitation.sms_status === 'failed' && ' • SMS failed'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(invitation.email_status === 'failed' || invitation.sms_status === 'failed') && (
                      <div className="flex gap-1">
                        {invitation.email_status === 'failed' && invitation.email && (
                          <button
                            onClick={() => resendInvitation(invitation, 'email')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Resend email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {invitation.sms_status === 'failed' && invitation.phone && (
                          <button
                            onClick={() => resendInvitation(invitation, 'sms')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Resend SMS"
                          >
                            <Smartphone className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => resendInvitation(invitation)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                      title="Resend invitation"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => cancelInvitation(invitation.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Revoke invitation"
                    >
                      <X className="w-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Members Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-[#1e4d6b] flex items-center justify-center text-white font-medium flex-shrink-0">
                        {member.full_name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(member.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {member.phone || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(member)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => viewMemberDetails(member)}
                      className="text-[#1e4d6b] hover:text-[#2a6a8f] font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No team members found</p>
            </div>
          )}
        </div>
      </div>

      {/* Member Details Modal */}
      {showDetailsModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-[#1e4d6b] flex items-center justify-center text-white text-2xl font-medium">
                  {selectedMember.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedMember.full_name}</h3>
                  <div className="mt-1">{getRoleBadge(selectedMember.role)}</div>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Contact Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {selectedMember.email}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Phone:</span> {selectedMember.phone || 'Not provided'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Joined:</span> {format(new Date(selectedMember.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Certifications */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#d4af37]" />
                  Certifications
                </h4>
              </div>
              {memberCertifications.length > 0 ? (
                <div className="space-y-3">
                  {memberCertifications.map((cert) => {
                    const daysUntilExpiry = cert.expiration_date
                      ? Math.floor((new Date(cert.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 30;
                    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

                    return (
                      <div key={cert.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{cert.certification_name}</p>
                            {cert.expiration_date && (
                              <p className="text-sm text-gray-600 mt-1">
                                Expires: {format(new Date(cert.expiration_date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            isExpired ? 'bg-red-100 text-red-800' :
                            isExpiring ? 'bg-amber-100 text-amber-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {isExpired ? 'Expired' : isExpiring ? 'Expiring Soon' : 'Active'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No certifications on file</p>
              )}
            </div>

            {/* Activity Log Placeholder */}
            <div>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5 text-gray-600" />
                Recent Activity
              </h4>
              <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg">
                Activity log coming soon
              </div>
            </div>
          </div>
        </div>
      )}

      <TeamInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        organizationId={profile?.organization_id || ''}
        onInviteSent={handleInviteSent}
      />
    </Layout>
  );
}
