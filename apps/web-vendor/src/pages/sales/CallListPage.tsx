import React, { useState } from 'react';
import { Phone, PhoneOff, PhoneMissed, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useCallList, useLogCall, useScheduleFollowup } from '@/hooks/api/useLeads';

type CallOutcome = 'connected' | 'voicemail' | 'no_answer' | 'not_interested' | 'callback';
const OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: 'connected', label: 'Connected' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'callback', label: 'Callback' },
];

export function CallListPage() {
  const { data: calls, isLoading } = useCallList();
  const logCall = useLogCall();
  const scheduleFollowup = useScheduleFollowup();
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callOutcome, setCallOutcome] = useState<CallOutcome>('connected');
  const [callNotes, setCallNotes] = useState('');

  const handleLogCall = (leadId: string) => {
    logCall.mutate({ leadId, outcome: callOutcome, notes: callNotes });
    setActiveCallId(null); setCallNotes('');
  };

  if (!isLoading && (!calls || calls.length === 0)) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0B1628]">Call List</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Phone className="h-12 w-12 text-[#6B7F96] mb-4" />
          <h3 className="text-lg font-semibold text-[#0B1628] mb-2">All Clear!</h3>
          <p className="text-[#6B7F96] max-w-md">No calls scheduled for today. Great job!</p>
        </div>
      </div>
    );
  }

  const hotLeads = (calls ?? []).filter((c: any) => c.priority === 'hot');
  const overdueLeads = (calls ?? []).filter((c: any) => c.priority === 'overdue');
  const newLeads = (calls ?? []).filter((c: any) => c.priority === 'new');

  const renderSection = (title: string, items: any[], icon: React.ReactNode, badgeColor: string) => (
    items.length > 0 ? (<div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
      <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2">{icon} {title}</h2>
      <div className="space-y-3">{items.map((item: any) => (
        <div key={item.id} className="border border-[#D1D9E6] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#0B1628]">{item.businessName}</p>
              <p className="text-xs text-[#6B7F96]">{item.contactName} - {item.phone}</p>
              {item.lastContacted && <p className="text-xs text-[#6B7F96] mt-1">Last: {item.lastContacted}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={"text-xs font-medium px-2 py-1 rounded-full " + badgeColor}>{item.priority}</span>
              <button onClick={() => setActiveCallId(activeCallId === item.id ? null : item.id)} className="p-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52]"><Phone className="h-4 w-4" /></button>
            </div>
          </div>
          {activeCallId === item.id && (<div className="mt-3 pt-3 border-t border-[#D1D9E6] space-y-3">
            <select value={callOutcome} onChange={(e) => setCallOutcome(e.target.value as CallOutcome)} className="w-full border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628]">
              {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <textarea value={callNotes} onChange={(e) => setCallNotes(e.target.value)} placeholder="Call notes..." className="w-full border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628] placeholder:text-[#6B7F96] h-16" />
            <div className="flex gap-2">
              <button onClick={() => handleLogCall(item.id)} className="bg-[#1e4d6b] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#163a52]">Log Call</button>
              <button onClick={() => scheduleFollowup.mutate({ leadId: item.id })} className="border border-[#D1D9E6] text-[#3D5068] px-3 py-1.5 rounded-lg text-sm hover:bg-[#F4F6FA] flex items-center gap-1"><Calendar className="h-3 w-3" /> Schedule Next</button>
            </div>
          </div>)}
        </div>
      ))}</div>
    </div>) : null
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B1628]">Call List</h1>
      </div>
      {renderSection("Hot Leads", hotLeads, <AlertCircle className="h-5 w-5 text-red-500" />, "bg-red-50 text-red-600")}
      {renderSection("Overdue Followups", overdueLeads, <Clock className="h-5 w-5 text-amber-500" />, "bg-amber-50 text-amber-600")}
      {renderSection("New Leads", newLeads, <Phone className="h-5 w-5 text-[#1e4d6b]" />, "bg-blue-50 text-[#1e4d6b]")}
    </div>
  );
}

export default CallListPage;