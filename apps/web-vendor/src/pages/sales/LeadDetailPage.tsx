import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, Phone, Mail, MapPin, Calendar, MessageSquare, CheckCircle, XCircle, ChevronRight, Plus } from 'lucide-react';
import { useLeadDetail, useLeadActivities, useUpdateLeadStage, useLogActivity } from '@/hooks/api/useLeads';

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiating', 'Won', 'Lost'] as const;

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: lead, isLoading } = useLeadDetail(id!);
  const { data: activities, isLoading: activitiesLoading } = useLeadActivities(id!);
  const updateStage = useUpdateLeadStage();
  const logActivity = useLogActivity();
  const [showActionMenu, setShowActionMenu] = useState(false);

  if (isLoading) {
    return <div className="p-6"><p className="text-[#6B7F96]">Loading lead details...</p></div>;
  }

  if (!lead) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-[#6B7F96] mb-4" />
          <h3 className="text-lg font-semibold text-[#0B1628] mb-2">Lead Not Found</h3>
          <p className="text-[#6B7F96] max-w-md">This lead could not be found or has been removed.</p>
        </div>
      </div>
    );
  }

  const handleAction = (action: string) => {
    setShowActionMenu(false);
    logActivity.mutate({ leadId: id!, type: action, notes: '' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B1628]">{lead.businessName}</h1>
        <div className="relative">
          <button onClick={() => setShowActionMenu(!showActionMenu)} className="flex items-center gap-2 bg-[#1e4d6b] text-white px-4 py-2 rounded-lg hover:bg-[#163a52]">
            <Plus className="h-4 w-4" /> Quick Action
          </button>
          {showActionMenu && (<div className="absolute right-0 top-12 bg-white rounded-xl border border-[#D1D9E6] shadow-lg py-2 w-48 z-10">
            <button onClick={() => handleAction("call")} className="w-full text-left px-4 py-2 text-sm text-[#3D5068] hover:bg-[#F4F6FA] flex items-center gap-2"><Phone className="h-4 w-4" /> Log Call</button>
            <button onClick={() => handleAction("email")} className="w-full text-left px-4 py-2 text-sm text-[#3D5068] hover:bg-[#F4F6FA] flex items-center gap-2"><Mail className="h-4 w-4" /> Send Email</button>
            <button onClick={() => handleAction("meeting")} className="w-full text-left px-4 py-2 text-sm text-[#3D5068] hover:bg-[#F4F6FA] flex items-center gap-2"><Calendar className="h-4 w-4" /> Schedule Meeting</button>
            <hr className="my-1 border-[#D1D9E6]" />
            <button onClick={() => handleAction("convert")} className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-[#F4F6FA] flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Convert to Customer</button>
            <button onClick={() => handleAction("lost")} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[#F4F6FA] flex items-center gap-2"><XCircle className="h-4 w-4" /> Mark as Lost</button>
          </div>)}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <h2 className="text-lg font-semibold text-[#0B1628] mb-4">Lead Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-[#6B7F96]" /><div><p className="text-xs text-[#6B7F96]">Business</p><p className="text-sm font-medium text-[#0B1628]">{lead.businessName}</p></div></div>
          <div className="flex items-center gap-3"><Phone className="h-5 w-5 text-[#6B7F96]" /><div><p className="text-xs text-[#6B7F96]">Contact</p><p className="text-sm font-medium text-[#0B1628]">{lead.contactName} - {lead.phone}</p></div></div>
          <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-[#6B7F96]" /><div><p className="text-xs text-[#6B7F96]">Address</p><p className="text-sm font-medium text-[#0B1628]">{lead.address || "No address"}</p></div></div>
          <div className="flex items-center gap-3"><MessageSquare className="h-5 w-5 text-[#6B7F96]" /><div><p className="text-xs text-[#6B7F96]">Classification</p><p className="text-sm font-medium text-[#0B1628]">{lead.classification || "Unclassified"}</p></div></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <h2 className="text-lg font-semibold text-[#0B1628] mb-4">Pipeline Stage</h2>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => (
            <button key={stage} onClick={() => updateStage.mutate({ leadId: id!, stage })} className={"flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors " + (lead.stage === stage ? "bg-[#1e4d6b] text-white" : "bg-[#F4F6FA] text-[#3D5068] hover:bg-[#D1D9E6]")}>
              <span className="whitespace-nowrap">{stage}</span>
              {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 text-[#6B7F96] ml-1" />}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <h2 className="text-lg font-semibold text-[#0B1628] mb-4">Activity Timeline</h2>
        {activitiesLoading ? (<p className="text-[#6B7F96]">Loading...</p>) : (!activities || activities.length === 0) ? (
          <p className="text-[#6B7F96] text-sm">No activity recorded yet.</p>
        ) : (
          <div className="space-y-4">{activities.map((act: { id: string; type: string; notes: string; timestamp: string; user: string }) => (
            <div key={act.id} className="flex gap-3 pb-4 border-b border-[#D1D9E6] last:border-0">
              <div className="w-8 h-8 rounded-full bg-[#1e4d6b]/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-[#1e4d6b]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0B1628]">{act.type}</p>
                {act.notes && <p className="text-sm text-[#3D5068] mt-1">{act.notes}</p>}
                <p className="text-xs text-[#6B7F96] mt-1">{act.user} - {act.timestamp}</p>
              </div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}

export default LeadDetailPage;