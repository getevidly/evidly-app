import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, DollarSign, Clock, AlertTriangle, CheckCircle2, Search, Eye } from 'lucide-react';
import { useAgreements, useAgreementStats } from '@/hooks/api/useAgreements';

type TabKey = 'all' | 'draft' | 'pending' | 'active' | 'expiring' | 'expired';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-yellow-100 text-yellow-700', signed: 'bg-green-100 text-green-700',
  active: 'bg-emerald-100 text-emerald-700', expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600', renewed: 'bg-purple-100 text-purple-700',
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending' }, { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring' }, { key: 'expired', label: 'Expired' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export function AgreementsPage() {
  const { data: agreements, isLoading } = useAgreements();
  const { data: stats } = useAgreementStats();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');

  const filteredAgreements = (agreements || []).filter((a: any) => {
    if (activeTab !== 'all') {
      if (activeTab === 'pending' && !['sent', 'viewed'].includes(a.status)) return false;
      if (activeTab === 'expiring' && a.status !== 'expiring') return false;
      if (activeTab !== 'pending' && activeTab !== 'expiring' && a.status !== activeTab) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return a.agreement_number?.toLowerCase().includes(q) || a.customer_name?.toLowerCase().includes(q);
    }
    return true;
  });

  if (isLoading) return (<div className="flex items-center justify-center py-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" /></div>);

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1628]">Service Agreements</h1>
            <p className="text-[#6B7F96] mt-1">Manage customer agreements and contracts</p>
          </div>
          <Link to="/agreements/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium"><Plus className="w-4 h-4" />New Agreement</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center"><div className="flex items-center justify-center mb-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><p className="text-2xl font-bold text-[#0B1628]">{stats?.active_count ?? 0}</p><p className="text-sm text-[#6B7F96]">Active Agreements</p></div>
          <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center"><div className="flex items-center justify-center mb-2"><Clock className="w-5 h-5 text-blue-600" /></div><p className="text-2xl font-bold text-[#0B1628]">{stats?.pending_signature_count ?? 0}</p><p className="text-sm text-[#6B7F96]">Pending Signature</p></div>
          <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center"><div className="flex items-center justify-center mb-2"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div><p className="text-2xl font-bold text-[#0B1628]">{stats?.expiring_soon_count ?? 0}</p><p className="text-sm text-[#6B7F96]">Expiring Soon</p></div>
          <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center"><div className="flex items-center justify-center mb-2"><DollarSign className="w-5 h-5 text-[#1e4d6b]" /></div><p className="text-2xl font-bold text-[#0B1628]">{formatCurrency(stats?.monthly_recurring_value ?? 0)}</p><p className="text-sm text-[#6B7F96]">Monthly Recurring Value</p></div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-1 bg-white rounded-lg border border-[#D1D9E6] p-1">
            {TABS.map((tab) => (<button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-[#1e4d6b] text-white' : 'text-[#6B7F96] hover:text-[#0B1628]'}`}>{tab.label}</button>))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7F96]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agreements..." className="pl-9 pr-4 py-2 rounded-lg border border-[#D1D9E6] text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b] w-64" />
          </div>
        </div>
        {filteredAgreements.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F4F6FA] border border-[#D1D9E6] flex items-center justify-center mb-4"><FileText className="w-8 h-8 text-[#6B7F96]" /></div>
            <h3 className="text-lg font-semibold text-[#0B1628] mb-2">No service agreements yet</h3>
            <p className="text-[#6B7F96] max-w-md">Create your first agreement to start managing customer contracts.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#D1D9E6] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#D1D9E6] bg-[#F4F6FA]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Agreement #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Term</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Monthly Value</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-[#D1D9E6]">
                  {filteredAgreements.map((agreement: any) => (
                    <tr key={agreement.id} className="hover:bg-[#F4F6FA]/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#1e4d6b]"><Link to={`/agreements/${agreement.id}`} className="hover:underline">{agreement.agreement_number}</Link></td>
                      <td className="px-4 py-3 text-sm text-[#0B1628]">{agreement.customer_name}</td>
                      <td className="px-4 py-3 text-sm text-[#6B7F96]">{agreement.term_start} &ndash; {agreement.term_end}</td>
                      <td className="px-4 py-3 text-sm text-[#0B1628] text-right font-medium">{formatCurrency(agreement.monthly_value || 0)}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[agreement.status] || 'bg-gray-100 text-gray-700'}`}>{agreement.status}</span></td>
                      <td className="px-4 py-3 text-right"><Link to={`/agreements/${agreement.id}`} className="inline-flex items-center gap-1 text-sm text-[#1e4d6b] hover:text-[#163a52] font-medium"><Eye className="w-3.5 h-3.5" />View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgreementsPage;
