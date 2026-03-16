import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, FileSignature, Phone, Megaphone, AlertTriangle, Calendar, DollarSign, Target, ArrowRight } from 'lucide-react';
import { usePipelineStats } from '@/hooks/api/useLeads';
import { useAgreementStats } from '@/hooks/api/useAgreements';
import { useCampaignStats } from '@/hooks/api/useMarketing';

export function VendorDashboard() {
  const { data: pipelineStats, loading: pipelineLoading } = usePipelineStats();
  const { data: agreementStats, loading: agreementLoading } = useAgreementStats();
  const { data: campaignStats, loading: campaignLoading } = useCampaignStats();

  const loading = pipelineLoading || agreementLoading || campaignLoading;

  const quickActions = [
    { label: 'Pipeline', path: '/sales/pipeline', icon: TrendingUp, color: 'bg-blue-50 text-blue-700' },
    { label: 'Call List', path: '/sales/calls', icon: Phone, color: 'bg-green-50 text-green-700' },
    { label: 'Campaigns', path: '/marketing/campaigns', icon: Megaphone, color: 'bg-purple-50 text-purple-700' },
    { label: 'Violations', path: '/marketing/violations', icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
    { label: 'Agreements', path: '/agreements', icon: FileSignature, color: 'bg-amber-50 text-amber-700' },
    { label: 'New Quote', path: '/sales/quote', icon: DollarSign, color: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1628]">HoodOps Dashboard</h1>
          <p className="text-[#6B7F96]">Sales & marketing overview</p>
        </div>
        <div className="flex gap-3">
          <Link to="/sales/pipeline" className="px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> View Pipeline
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Pipeline Value</p>
          <p className="text-2xl font-bold text-[#0B1628]">${(pipelineStats?.totalValue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">New Leads</p>
          <p className="text-2xl font-bold text-[#0B1628]">{pipelineStats?.leadsThisMonth || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Active Agreements</p>
          <p className="text-2xl font-bold text-[#0B1628]">{agreementStats?.active || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Active Campaigns</p>
          <p className="text-2xl font-bold text-[#0B1628]">{campaignStats?.active || 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-[#0B1628] mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <Link key={action.path} to={action.path} className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center hover:border-[#1e4d6b] transition-colors group">
                <div className={`inline-flex p-3 rounded-lg ${action.color} mb-2`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-[#0B1628] group-hover:text-[#1e4d6b]">{action.label}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Summary */}
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0B1628]">Pipeline Summary</h3>
            <Link to="/sales/pipeline" className="text-sm text-[#1e4d6b] flex items-center gap-1 hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {pipelineStats && Object.keys(pipelineStats.stageBreakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(pipelineStats.stageBreakdown).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm text-[#3D5068] capitalize">{stage.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-[#0B1628]">{count as number}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-8 w-8 text-[#6B7F96] mx-auto mb-2" />
              <p className="text-sm text-[#6B7F96]">No leads yet. Start building your pipeline!</p>
            </div>
          )}
        </div>

        {/* Agreements Overview */}
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0B1628]">Agreements</h3>
            <Link to="/agreements" className="text-sm text-[#1e4d6b] flex items-center gap-1 hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {agreementStats && (agreementStats.active > 0 || agreementStats.pending > 0) ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#3D5068]">Active</span>
                <span className="text-sm font-medium text-green-600">{agreementStats.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#3D5068]">Pending Signature</span>
                <span className="text-sm font-medium text-yellow-600">{agreementStats.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#3D5068]">Expiring Soon</span>
                <span className="text-sm font-medium text-red-600">{agreementStats.expiringSoon}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#D1D9E6] pt-3">
                <span className="text-sm font-medium text-[#0B1628]">Monthly Recurring</span>
                <span className="text-sm font-bold text-[#0B1628]">${(agreementStats.monthlyValue || 0).toLocaleString()}/mo</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileSignature className="h-8 w-8 text-[#6B7F96] mx-auto mb-2" />
              <p className="text-sm text-[#6B7F96]">No agreements yet. Create your first service agreement!</p>
            </div>
          )}
        </div>
      </div>

      {/* Marketing Summary */}
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#0B1628]">Marketing Performance</h3>
          <Link to="/marketing/analytics" className="text-sm text-[#1e4d6b] flex items-center gap-1 hover:underline">Analytics <ArrowRight className="h-3 w-3" /></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#0B1628]">{campaignStats?.active || 0}</p>
            <p className="text-sm text-[#6B7F96]">Active Campaigns</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#0B1628]">{(campaignStats?.totalSent || 0).toLocaleString()}</p>
            <p className="text-sm text-[#6B7F96]">Messages Sent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#0B1628]">{campaignStats?.avgOpenRate || 0}%</p>
            <p className="text-sm text-[#6B7F96]">Open Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#0B1628]">{campaignStats?.leadsGenerated || 0}</p>
            <p className="text-sm text-[#6B7F96]">Leads Generated</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VendorDashboard;
