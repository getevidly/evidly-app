import { useState, useEffect } from 'react';
import { Plus, Users, Mail, Shield, Clock, X, Smartphone, RotateCw, Search, Award, Activity, MapPin, CheckCircle2, TrendingUp } from 'lucide-react';
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
  location?: string;
  certifications?: DemoCert[];
  training_completed?: number;
  training_total?: number;
  temp_logs_completed?: number;
  checklists_completed?: number;
  compliance_score?: number;
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

interface DemoCert {
  id: string;
  certification_name: string;
  issue_date: string | null;
  expiration_date: string | null;
  status: string;
}

interface Certification {
  id: string;
  certification_name: string;
  issue_date: string | null;
  expiration_date: string | null;
  status: string;
}

const DEMO_MEMBERS: TeamMember[] = [
  {
    id: 'd1', full_name: 'Marcus Johnson', email: 'marcus@pacificcoast.com', phone: '(415) 555-0101',
    role: 'admin', avatar_url: null, created_at: '2024-06-15T08:00:00Z', last_active: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    location: 'All Locations', training_completed: 12, training_total: 12, temp_logs_completed: 186, checklists_completed: 92, compliance_score: 98,
    certifications: [
      { id: 'c1', certification_name: 'ServSafe Manager Certification', issue_date: '2025-03-10', expiration_date: '2027-03-10', status: 'active' },
      { id: 'c2', certification_name: 'Food Handler Certificate', issue_date: '2025-01-15', expiration_date: '2027-01-15', status: 'active' },
      { id: 'c3', certification_name: 'HACCP Certification', issue_date: '2024-09-01', expiration_date: '2026-09-01', status: 'active' },
    ],
  },
  {
    id: 'd2', full_name: 'Sarah Chen', email: 'sarah@pacificcoast.com', phone: '(415) 555-0102',
    role: 'manager', avatar_url: null, created_at: '2024-08-20T08:00:00Z', last_active: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    location: 'Downtown Kitchen', training_completed: 10, training_total: 10, temp_logs_completed: 142, checklists_completed: 68, compliance_score: 95,
    certifications: [
      { id: 'c4', certification_name: 'ServSafe Manager Certification', issue_date: '2024-03-15', expiration_date: '2026-03-15', status: 'active' },
      { id: 'c5', certification_name: 'Food Handler Certificate', issue_date: '2025-06-01', expiration_date: '2027-06-01', status: 'active' },
    ],
  },
  {
    id: 'd3', full_name: 'Maria Garcia', email: 'maria@pacificcoast.com', phone: '(415) 555-0103',
    role: 'manager', avatar_url: null, created_at: '2024-09-10T08:00:00Z', last_active: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    location: 'Airport Cafe', training_completed: 9, training_total: 10, temp_logs_completed: 128, checklists_completed: 72, compliance_score: 88,
    certifications: [
      { id: 'c6', certification_name: 'ServSafe Manager Certification', issue_date: '2025-01-10', expiration_date: '2027-01-10', status: 'active' },
      { id: 'c7', certification_name: 'Food Handler Certificate', issue_date: '2024-11-20', expiration_date: '2026-11-20', status: 'active' },
    ],
  },
  {
    id: 'd4', full_name: 'David Park', email: 'david@pacificcoast.com', phone: '(415) 555-0104',
    role: 'staff', avatar_url: null, created_at: '2024-11-01T08:00:00Z', last_active: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    location: 'University Dining', training_completed: 6, training_total: 8, temp_logs_completed: 64, checklists_completed: 38, compliance_score: 72,
    certifications: [
      { id: 'c8', certification_name: 'Food Handler Certificate', issue_date: '2024-04-15', expiration_date: '2026-04-02', status: 'active' },
    ],
  },
  {
    id: 'd5', full_name: 'Michael Torres', email: 'michael@pacificcoast.com', phone: '(415) 555-0105',
    role: 'staff', avatar_url: null, created_at: '2024-10-15T08:00:00Z', last_active: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Airport Cafe', training_completed: 7, training_total: 8, temp_logs_completed: 96, checklists_completed: 45, compliance_score: 82,
    certifications: [
      { id: 'c9', certification_name: 'Food Handler Certificate', issue_date: '2024-02-26', expiration_date: '2026-02-26', status: 'active' },
    ],
  },
  {
    id: 'd6', full_name: 'Emma Rodriguez', email: 'emma@pacificcoast.com', phone: '(415) 555-0106',
    role: 'staff', avatar_url: null, created_at: '2025-01-05T08:00:00Z', last_active: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    location: 'Downtown Kitchen', training_completed: 8, training_total: 8, temp_logs_completed: 72, checklists_completed: 52, compliance_score: 94,
    certifications: [
      { id: 'c10', certification_name: 'Food Handler Certificate', issue_date: '2025-01-10', expiration_date: '2027-01-10', status: 'active' },
      { id: 'c11', certification_name: 'Allergen Awareness', issue_date: '2025-01-15', expiration_date: '2027-01-15', status: 'active' },
    ],
  },
  {
    id: 'd7', full_name: 'Alex Thompson', email: 'alex@pacificcoast.com', phone: '(415) 555-0107',
    role: 'staff', avatar_url: null, created_at: '2024-12-01T08:00:00Z', last_active: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    location: 'Downtown Kitchen', training_completed: 7, training_total: 8, temp_logs_completed: 88, checklists_completed: 41, compliance_score: 90,
    certifications: [
      { id: 'c12', certification_name: 'Food Handler Certificate', issue_date: '2024-12-10', expiration_date: '2026-12-10', status: 'active' },
    ],
  },
  {
    id: 'd8', full_name: 'Lisa Wang', email: 'lisa@pacificcoast.com', phone: '(415) 555-0108',
    role: 'staff', avatar_url: null, created_at: '2025-01-20T08:00:00Z', last_active: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    location: 'Airport Cafe', training_completed: 5, training_total: 8, temp_logs_completed: 34, checklists_completed: 22, compliance_score: 76,
    certifications: [
      { id: 'c13', certification_name: 'Food Handler Certificate', issue_date: '2025-01-25', expiration_date: '2027-01-25', status: 'active' },
    ],
  },
  {
    id: 'd9', full_name: 'James Wilson', email: 'james@pacificcoast.com', phone: null,
    role: 'staff', avatar_url: null, created_at: '2025-02-01T08:00:00Z', last_active: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'University Dining', training_completed: 3, training_total: 8, temp_logs_completed: 18, checklists_completed: 12, compliance_score: 65,
    certifications: [
      { id: 'c14', certification_name: 'Food Handler Certificate', issue_date: '2025-02-05', expiration_date: '2027-02-05', status: 'active' },
    ],
  },
];

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function Team() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberCertifications, setMemberCertifications] = useState<Certification[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const isDemoMode = !profile?.organization_id;

  useEffect(() => {
    if (profile?.organization_id) {
      fetchTeam();
      fetchInvitations();
    } else {
      setMembers(DEMO_MEMBERS);
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
    if (isDemoMode) return;
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
    if (!profile?.organization_id) {
      setInvitations(prev => prev.filter(i => i.id !== invitationId));
      return;
    }
    await supabase
      .from('user_invitations')
      .update({ status: 'expired' })
      .eq('id', invitationId);

    fetchInvitations();
  };

  const resendInvitation = async (invitation: Invitation, method?: 'email' | 'sms') => {
    if (!profile?.organization_id) {
      window.alert('Invitation resent. (Demo mode — no actual invite sent.)');
      return;
    }
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
    if (isDemoMode) {
      setMemberCertifications(member.certifications || []);
    } else {
      await fetchMemberCertifications(member.id);
    }
    setShowDetailsModal(true);
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: { label: 'Owner', color: 'bg-[#d4af37] text-[#1e4d6b]' },
      manager: { label: 'Manager', color: 'bg-[#eef4f8] text-[#1e4d6b]' },
      staff: { label: 'Staff', color: 'bg-gray-100 text-gray-800' },
    };
    const badge = badges[role as keyof typeof badges] || badges.staff;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const memberLocations = [...new Set(members.map(m => m.location).filter(Boolean))].sort();

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesLocation = locationFilter === 'all' || member.location === locationFilter;
    return matchesSearch && matchesRole && matchesLocation;
  });

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Team' }]} />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage team members and permissions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #1e4d6b' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="h-4 w-4 text-[#1e4d6b]" />
              <span className="text-sm text-gray-500 font-medium">Team Members</span>
            </div>
            <div className="text-3xl font-bold text-[#1e4d6b] text-center">{filteredMembers.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #16a34a' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500 font-medium">Certs Current</span>
            </div>
            <div className="text-3xl font-bold text-green-600 text-center">
              {filteredMembers.filter(m => m.certifications && m.certifications.every(c => {
                if (!c.expiration_date) return true;
                return new Date(c.expiration_date) > new Date();
              })).length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #d4af37' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className="h-4 w-4 text-[#d4af37]" />
              <span className="text-sm text-gray-500 font-medium">Total Certs</span>
            </div>
            <div className="text-3xl font-bold text-[#d4af37] text-center">
              {filteredMembers.reduce((sum, m) => sum + (m.certifications?.length || 0), 0)}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #1e4d6b' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[#1e4d6b]" />
              <span className="text-sm text-gray-500 font-medium">Avg Compliance</span>
            </div>
            <div className="text-3xl font-bold text-[#1e4d6b] text-center">
              {filteredMembers.length > 0 ? Math.round(filteredMembers.reduce((sum, m) => sum + (m.compliance_score || 0), 0) / filteredMembers.length) : 0}%
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3 flex-wrap">
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
            {isDemoMode && (
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              >
                <option value="all">All Locations</option>
                {memberLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] shadow-sm transition-colors duration-150"
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
                            className="p-2 text-[#1e4d6b] hover:bg-gray-100 rounded transition-colors"
                            title="Resend email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {invitation.sms_status === 'failed' && invitation.phone && (
                          <button
                            onClick={() => resendInvitation(invitation, 'sms')}
                            className="p-2 text-[#1e4d6b] hover:bg-gray-100 rounded transition-colors"
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
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Members Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.map((member) => {
                  const certCount = member.certifications?.length || 0;
                  const expiringSoon = member.certifications?.filter(c => {
                    if (!c.expiration_date) return false;
                    const days = Math.floor((new Date(c.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return days >= 0 && days <= 30;
                  }).length || 0;
                  const trainingPct = member.training_total ? Math.round((member.training_completed || 0) / member.training_total * 100) : null;

                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-[#1e4d6b] flex items-center justify-center text-white font-medium flex-shrink-0">
                            {member.full_name.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                            <div className="text-xs text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(member.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {member.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            {member.location}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {certCount > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-900 font-medium">{certCount}</span>
                            {expiringSoon > 0 && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">
                                {expiringSoon} expiring
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {trainingPct !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${trainingPct}%`,
                                  backgroundColor: trainingPct === 100 ? '#16a34a' : trainingPct >= 75 ? '#d4af37' : '#ef4444',
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{trainingPct}%</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {member.last_active ? (
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 bg-green-500 rounded-full" />
                            {getTimeAgo(member.last_active)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => viewMemberDetails(member)}
                          className="text-[#1e4d6b] hover:text-[#163a52] font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(selectedMember.role)}
                    {selectedMember.location && (
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedMember.location}
                      </span>
                    )}
                  </div>
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
              <div className="grid grid-cols-2 gap-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {selectedMember.email}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Phone:</span> {selectedMember.phone || 'Not provided'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Joined:</span> {format(new Date(selectedMember.created_at), 'MMM d, yyyy')}
                </p>
                {selectedMember.last_active && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Last Active:</span> {getTimeAgo(selectedMember.last_active)}
                  </p>
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            {selectedMember.compliance_score !== undefined && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-[#1e4d6b]" />
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: selectedMember.compliance_score >= 90 ? '#16a34a' : selectedMember.compliance_score >= 70 ? '#d4af37' : '#ef4444' }}>
                      {selectedMember.compliance_score}%
                    </div>
                    <div className="text-xs text-gray-500">Compliance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#1e4d6b]">{selectedMember.temp_logs_completed || 0}</div>
                    <div className="text-xs text-gray-500">Temp Logs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#1e4d6b]">{selectedMember.checklists_completed || 0}</div>
                    <div className="text-xs text-gray-500">Checklists</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#1e4d6b]">
                      {selectedMember.training_completed || 0}/{selectedMember.training_total || 0}
                    </div>
                    <div className="text-xs text-gray-500">Training</div>
                  </div>
                </div>
              </div>
            )}

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
                            <div className="flex gap-4 mt-1">
                              {cert.issue_date && (
                                <p className="text-sm text-gray-600">
                                  Issued: {format(new Date(cert.issue_date), 'MMM d, yyyy')}
                                </p>
                              )}
                              {cert.expiration_date && (
                                <p className="text-sm text-gray-600">
                                  Expires: {format(new Date(cert.expiration_date), 'MMM d, yyyy')}
                                  {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                                    <span className="text-gray-400 ml-1">({daysUntilExpiry}d)</span>
                                  )}
                                </p>
                              )}
                            </div>
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

            {/* Activity Log */}
            <div>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5 text-gray-600" />
                Recent Activity
              </h4>
              {isDemoMode && selectedMember.temp_logs_completed ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <span className="text-gray-400 text-xs w-16">Today</span>
                    <span className="text-gray-700">Completed temperature log — Walk-in Cooler</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <span className="text-gray-400 text-xs w-16">Today</span>
                    <span className="text-gray-700">Completed opening checklist</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <span className="text-gray-400 text-xs w-16">Yesterday</span>
                    <span className="text-gray-700">Uploaded vendor certificate</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <span className="text-gray-400 text-xs w-16">2d ago</span>
                    <span className="text-gray-700">Resolved alert: Equipment maintenance</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg">
                  Activity log coming soon
                </div>
              )}
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
    </>
  );
}
