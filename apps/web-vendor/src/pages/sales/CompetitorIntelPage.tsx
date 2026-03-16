import React, { useState } from 'react';
import { Shield, Plus, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useCompetitors, useAddCompetitor, useCompetitorStats } from '@/hooks/api/useLeads';

export function CompetitorIntelPage() {
  const { data: competitors, isLoading } = useCompetitors();
  const { data: stats } = useCompetitorStats();
  const addCompetitor = useAddCompetitor();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [pricing, setPricing] = useState('');
  const [quality, setQuality] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addCompetitor.mutate({ name, pricing, quality, strengths, weaknesses });
    setShowForm(false); setName(''); setPricing(''); setQuality(''); setStrengths(''); setWeaknesses('');
  };

  if (!isLoading && (!competitors || competitors.length === 0)) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0B1628]">Competitor Intelligence</h1>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#1e4d6b] text-white px-4 py-2 rounded-lg hover:bg-[#163a52]"><Plus className="h-4 w-4" /> Add Competitor</button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield className="h-12 w-12 text-[#6B7F96] mb-4" />
          <h3 className="text-lg font-semibold text-[#0B1628] mb-2">No Competitor Intel</h3>
          <p className="text-[#6B7F96] max-w-md">No competitor intel yet. Add your first competitor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B1628]">Competitor Intelligence</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-[#1e4d6b] text-white px-4 py-2 rounded-lg hover:bg-[#163a52]"><Plus className="h-4 w-4" /> Add Competitor</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Won from Competitors</p>
          <p className="text-2xl font-bold text-green-600">{stats?.wonFromCompetitors ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Lost to Competitors</p>
          <p className="text-2xl font-bold text-red-500">{stats?.lostToCompetitors ?? 0}</p>
        </div>
      </div>
      {showForm && (<div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <h2 className="text-lg font-semibold text-[#0B1628] mb-4">Add Competitor</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Competitor Name" required className="w-full border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628] placeholder:text-[#6B7F96]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder="Pricing Info" className="border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628] placeholder:text-[#6B7F96]" />
            <input value={quality} onChange={(e) => setQuality(e.target.value)} placeholder="Service Quality" className="border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628] placeholder:text-[#6B7F96]" />
          </div>
          <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="Strengths" className="w-full border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628] placeholder:text-[#6B7F96] h-16" />
          <textarea value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} placeholder="Weaknesses" className="w-full border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628] placeholder:text-[#6B7F96] h-16" />
          <button type="submit" className="bg-[#1e4d6b] text-white px-4 py-2 rounded-lg hover:bg-[#163a52]">Save</button>
        </form>
      </div>)}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(competitors ?? []).map((comp: any) => (
          <div key={comp.id} className="bg-white rounded-xl border border-[#D1D9E6] p-6">
            <h3 className="text-lg font-semibold text-[#0B1628] mb-3">{comp.name}</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm text-[#6B7F96]">Pricing</span><span className="text-sm text-[#0B1628]">{comp.pricing || "--"}</span></div>
              <div className="flex justify-between"><span className="text-sm text-[#6B7F96]">Service Quality</span><span className="text-sm text-[#0B1628]">{comp.quality || "--"}</span></div>
              {comp.strengths && <div><p className="text-xs font-medium text-green-600 mb-1">Strengths</p><p className="text-sm text-[#3D5068]">{comp.strengths}</p></div>}
              {comp.weaknesses && <div><p className="text-xs font-medium text-red-500 mb-1">Weaknesses</p><p className="text-sm text-[#3D5068]">{comp.weaknesses}</p></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CompetitorIntelPage;