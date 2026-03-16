import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Send, MailOpen, UserPlus, Plus, Filter, Search, Calendar, ArrowRight } from 'lucide-react';
import { useCampaigns } from '@/hooks/api/useMarketing';

interface Campaign {
  id: string; name: string;
  type: 'email' | 'sms' | 'direct_mail' | 'social';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  sent: number; opened: number; clicked: number; leads: number;
  scheduledDate?: string; createdAt: string;
}

const TYPE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  email: { label: 'Email', bg: 'bg-blue-50', text: 'text-blue-700' },
  sms: { label: 'SMS', bg: 'bg-purple-50', text: 'text-purple-700' },
  direct_mail: { label: 'Direct Mail', bg: 'bg-amber-50', text: 'text-amber-700' },
  social: { label: 'Social', bg: 'bg-pink-50', text: 'text-pink-700' },
};
const STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600' },
  scheduled: { label: 'Scheduled', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  active: { label: 'Active', bg: 'bg-green-50', text: 'text-green-700' },
  paused: { label: 'Paused', bg: 'bg-orange-50', text: 'text-orange-700' },
  completed: { label: 'Completed', bg: 'bg-[#1e4d6b]/10', text: 'text-[#1e4d6b]' },
};

export function CampaignsPage() {
  const { data, isLoading, error } = useCampaigns();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  if (isLoading) { return (<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" /></div>); }
  if (error) { return (<div className="flex flex-col items-center justify-center py-16 text-center"><Megaphone className="h-12 w-12 text-red-400 mb-4" /><h3 className="text-lg font-semibold text-[#0B1628] mb-2">Failed to load campaigns</h3><p className="text-[#6B7F96] max-w-md">Something went wrong.</p></div>); }
  const campaigns: Campaign[] = data?.campaigns ?? [];
  const stats = data?.stats ?? { active: 0, totalSent: 0, avgOpenRate: 0, leadsGenerated: 0 };
  const filtered = campaigns.filter((c) => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const statCards = [
    { label: 'Active Campaigns', value: stats.active, icon: Megaphone, color: 'text-[#1e4d6b]' },
    { label: 'Total Sent', value: stats.totalSent.toLocaleString(), icon: Send, color: 'text-blue-600' },
    { label: 'Avg Open Rate', value: `${stats.avgOpenRate}%`, icon: MailOpen, color: 'text-green-600' },
    { label: 'Leads Generated', value: stats.leadsGenerated, icon: UserPlus, color: 'text-purple-600' },
  ];
  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div><h1 className="text-2xl font-bold text-[#0B1628]">Campaigns</h1><p className="text-[#6B7F96] mt-1">Manage and track your marketing campaigns</p></div>
        <Link to="/marketing/campaigns/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e4d6b] text-white rounded-lg font-medium hover:bg-[#163a52] transition-colors"><Plus className="h-4 w-4" />Create Campaign</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (<div key={s.label} className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center"><s.icon className={`h-6 w-6 ${s.color} mx-auto mb-2`} /><p className="text-2xl font-bold text-[#0B1628]">{s.value}</p><p className="text-sm text-[#6B7F96] mt-1">{s.label}</p></div>))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7F96]" /><input type="text" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D1D9E6] rounded-lg text-sm text-[#0B1628] placeholder:text-[#6B7F96] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]" /></div>
        <div className="flex gap-3">
          <div className="relative"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7F96]" /><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="pl-10 pr-8 py-2.5 bg-white border border-[#D1D9E6] rounded-lg text-sm text-[#0B1628] appearance-none"><option value="all">All Types</option><option value="email">Email</option><option value="sms">SMS</option><option value="direct_mail">Direct Mail</option><option value="social">Social</option></select></div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-[#D1D9E6] rounded-lg text-sm text-[#0B1628] appearance-none"><option value="all">All Statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="h-12 w-12 text-[#6B7F96] mb-4" />
          <h3 className="text-lg font-semibold text-[#0B1628] mb-2">{campaigns.length === 0 ? 'Create your first marketing campaign' : 'No campaigns match your filters'}</h3>
          <p className="text-[#6B7F96] max-w-md mb-6">{campaigns.length === 0 ? 'Launch email, SMS, or direct mail campaigns to reach potential customers.' : 'Try adjusting your filters.'}</p>
          {campaigns.length === 0 && (<Link to="/marketing/campaigns/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e4d6b] text-white rounded-lg font-medium hover:bg-[#163a52] transition-colors"><Plus className="h-4 w-4" />Create Campaign</Link>)}
        </div>
