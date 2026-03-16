import React, { useState } from 'react';
import { DoorOpen, MapPin, UserCheck, TrendingUp, Plus } from 'lucide-react';
import { useDoorKnockVisits, useLogDoorKnock, useDoorKnockStats } from '@/hooks/api/useLeads';

type Outcome = 'interested' | 'not_interested' | 'callback' | 'already_has_vendor';
const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'callback', label: 'Callback Requested' },
  { value: 'already_has_vendor', label: 'Already Has Vendor' },
];

export function DoorKnockPage() {
  const { data: visits, isLoading } = useDoorKnockVisits();
  const { data: stats } = useDoorKnockStats();
  const logVisit = useLogDoorKnock();
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [contactMade, setContactMade] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>('interested');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logVisit.mutate({ businessName, address, contactMade, outcome, notes });
    setBusinessName(''); setAddress(''); setContactMade(false); setOutcome('interested'); setNotes('');
  };

  if (!isLoading && (!visits || visits.length === 0) && !stats) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0B1628]">Door Knock Tracker</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <DoorOpen className="h-12 w-12 text-[#6B7F96] mb-4" />
          <h3 className="text-lg font-semibold text-[#0B1628] mb-2">No Visits Today</h3>
          <p className="text-[#6B7F96] max-w-md">No door knock visits logged today. Start knocking!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B1628]">Door Knock Tracker</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Visits Today</p>
          <p className="text-2xl font-bold text-[#0B1628]">{stats?.visitsToday ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Contacts Made</p>
          <p className="text-2xl font-bold text-[#0B1628]">{stats?.contactsMade ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Leads Generated</p>
          <p className="text-2xl font-bold text-[#0B1628]">{stats?.leadsGenerated ?? 0}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-[#1e4d6b]" /> Log Visit</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business Name" required className="border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628] placeholder:text-[#6B7F96]" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628] placeholder:text-[#6B7F96]" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[#3D5068]">
              <input type="checkbox" checked={contactMade} onChange={(e) => setContactMade(e.target.checked)} className="h-4 w-4 rounded border-[#D1D9E6] text-[#1e4d6b]" /> Contact Made
            </label>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)} className="border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628]">
              {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className="w-full border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628] placeholder:text-[#6B7F96] h-16" />
          <button type="submit" className="bg-[#1e4d6b] text-white px-4 py-2 rounded-lg hover:bg-[#163a52]">Log Visit</button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <h2 className="text-lg font-semibold text-[#0B1628] mb-4">Today's Visits</h2>
        {isLoading ? (<p className="text-[#6B7F96]">Loading...</p>) : (
          <div className="space-y-3">{(visits ?? []).map((v: any) => (
            <div key={v.id} className="flex items-center justify-between py-3 border-b border-[#D1D9E6] last:border-0">
              <div><p className="text-sm font-medium text-[#0B1628]">{v.businessName}</p>
                <p className="text-xs text-[#6B7F96]">{v.address}</p></div>
              <div className="text-right">
                <span className={"text-xs font-medium px-2 py-1 rounded-full " + (v.outcome === "interested" ? "bg-green-50 text-green-600" : v.outcome === "callback" ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-500")}>{v.outcome?.replace("_", " ")}</span>
                {v.contactMade && <UserCheck className="h-4 w-4 text-green-500 inline ml-2" />}
              </div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}

export default DoorKnockPage;