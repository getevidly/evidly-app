import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Calendar, AlertTriangle, CheckCircle2, Clock, Eye } from 'lucide-react';
import { useExpiringAgreements, useRenewAgreement } from '@/hooks/api/useAgreements';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export function AgreementRenewalsPage() {
  const { data: expiring30, isLoading: loading30 } = useExpiringAgreements(30);
  const { data: expiring60, isLoading: loading60 } = useExpiringAgreements(60);
  const renewMutation = useRenewAgreement();
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const isLoading = loading30 || loading60;
  const autoRenewCount = (expiring60 || []).filter((a: any) => a.auto_renew).length;
  const allExpiring = expiring60 || [];

  const handleRenew = (id: string) => {
    setRenewingId(id);
    renewMutation.mutate(id, { onSettled: () => setRenewingId(null) });
  };

  if (isLoading) return (<div className="flex items-center justify-center py-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" /></div>);

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0B1628]">Agreement Renewals</h1>
          <p className="text-[#6B7F96] mt-1">Track and manage upcoming agreement renewals</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center"><div className="flex items-center justify-center mb-2"><AlertTriangle className="w-5 h-5 text-red-500" /></div><p className="text-2xl font-bold text-[#0B1628]">{expiring30?.length ?? 0}</p><p className="text-sm text-[#6B7F96]">Expiring in 30 Days</p></div>
          <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center"><div className="flex items-center justify-center mb-2"><Clock className="w-5 h-5 text-yellow-500" /></div><p className="text-2xl font-bold text-[#0B1628]">{expiring60?.length ?? 0}</p><p className="text-sm text-[#6B7F96]">Expiring in 60 Days</p></div>
          <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center"><div className="flex items-center justify-center mb-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div><p className="text-2xl font-bold text-[#0B1628]">{autoRenewCount}</p><p className="text-sm text-[#6B7F96]">Auto-Renew Enabled</p></div>
        </div>
        {allExpiring.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F4F6FA] border border-[#D1D9E6] flex items-center justify-center mb-4"><Calendar className="w-8 h-8 text-[#6B7F96]" /></div>
            <h3 className="text-lg font-semibold text-[#0B1628] mb-2">No agreements expiring soon</h3>
            <p className="text-[#6B7F96] max-w-md">All your agreements are current. Check back later for upcoming renewals.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#D1D9E6] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#D1D9E6] bg-[#F4F6FA]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Agreement #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Expires</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Monthly Value</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Auto-Renew</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B7F96] uppercase tracking-wider">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-[#D1D9E6]">
                  {allExpiring.map((agreement: any) => (
                    <tr key={agreement.id} className="hover:bg-[#F4F6FA]/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#1e4d6b]"><Link to={`/agreements/${agreement.id}`} className="hover:underline">{agreement.agreement_number}</Link></td>
                      <td className="px-4 py-3 text-sm text-[#0B1628]">{agreement.customer_name}</td>
                      <td className="px-4 py-3 text-sm text-[#6B7F96]">{agreement.term_end}</td>
                      <td className="px-4 py-3 text-sm text-[#0B1628] text-right font-medium">{formatCurrency(agreement.monthly_value || 0)}</td>
                      <td className="px-4 py-3 text-center">{agreement.auto_renew ? (<span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" />Yes</span>) : (<span className="text-xs text-[#6B7F96]">No</span>)}</td>
                      <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-2"><Link to={`/agreements/${agreement.id}`} className="inline-flex items-center gap-1 text-sm text-[#6B7F96] hover:text-[#0B1628]"><Eye className="w-3.5 h-3.5" /></Link><button onClick={() => handleRenew(agreement.id)} disabled={renewingId === agreement.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${renewingId === agreement.id ? 'animate-spin' : ''}`} />Renew</button></div></td>
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

export default AgreementRenewalsPage;
