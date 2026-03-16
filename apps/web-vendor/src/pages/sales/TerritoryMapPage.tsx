import React, { useState } from 'react';
import { Map, MapPin, Filter, Building2, AlertTriangle, Users } from 'lucide-react';
import { useTerritoryData, useTerritoryList } from '@/hooks/api/useLeads';

const PIN_LEGEND = [
  { color: 'bg-green-500', label: 'Current Customers' },
  { color: 'bg-yellow-400', label: 'Leads' },
  { color: 'bg-red-500', label: 'Violations' },
  { color: 'bg-gray-400', label: 'Competitors' },
];

export function TerritoryMapPage() {
  const { data: mapData, isLoading } = useTerritoryData();
  const { data: territories } = useTerritoryList();
  const [statusFilter, setStatusFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [valueRange, setValueRange] = useState('');

  if (!isLoading && (!mapData || mapData.length === 0)) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0B1628]">Territory Map</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Map className="h-12 w-12 text-[#6B7F96] mb-4" />
          <h3 className="text-lg font-semibold text-[#0B1628] mb-2">No Territory Data</h3>
          <p className="text-[#6B7F96] max-w-md">Add leads with addresses to see them on the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B1628]">Territory Map</h1>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <Filter className="h-4 w-4 text-[#6B7F96]" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-[#D1D9E6] rounded-lg px-3 py-1.5 text-sm text-[#3D5068]">
          <option value="">All Statuses</option>
          <option value="customer">Customers</option>
          <option value="lead">Leads</option>
          <option value="violation">Violations</option>
          <option value="competitor">Competitors</option>
        </select>
        <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} className="border border-[#D1D9E6] rounded-lg px-3 py-1.5 text-sm text-[#3D5068]">
          <option value="">All Industries</option>
          <option value="restaurant">Restaurant</option>
          <option value="hotel">Hotel</option>
          <option value="hospital">Hospital</option>
          <option value="school">School</option>
        </select>
        <select value={valueRange} onChange={(e) => setValueRange(e.target.value)} className="border border-[#D1D9E6] rounded-lg px-3 py-1.5 text-sm text-[#3D5068]">
          <option value="">Any Value</option>
          <option value="0-500">/usr/bin/bash - 00</option>
          <option value="500-2000">00 - ,000</option>
          <option value="2000+">,000+</option>
        </select>
      </div>
      <div className="bg-white rounded-xl border border-[#D1D9E6] overflow-hidden">
        <div className="h-96 bg-[#F4F6FA] flex items-center justify-center relative">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-[#6B7F96] mx-auto mb-2" />
            <p className="text-sm text-[#6B7F96]">Interactive map will render here</p>
            <p className="text-xs text-[#6B7F96] mt-1">Connect a mapping provider (Google Maps, Mapbox) to enable</p>
          </div>
        </div>
        <div className="p-4 border-t border-[#D1D9E6] flex items-center gap-6">
          {PIN_LEGEND.map((pin) => (
            <div key={pin.label} className="flex items-center gap-2">
              <div className={"w-3 h-3 rounded-full " + pin.color} />
              <span className="text-xs text-[#6B7F96]">{pin.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><Building2 className="h-5 w-5 text-[#1e4d6b]" /> Territory List</h2>
        {isLoading ? (<p className="text-[#6B7F96]">Loading...</p>) : (
          <div className="space-y-3">{(territories ?? []).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between py-3 border-b border-[#D1D9E6] last:border-0">
              <div>
                <p className="text-sm font-medium text-[#0B1628]">{t.name}</p>
                <p className="text-xs text-[#6B7F96]">{t.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={"text-xs font-medium px-2 py-1 rounded-full " + (t.type === "customer" ? "bg-green-50 text-green-600" : t.type === "lead" ? "bg-yellow-50 text-yellow-600" : t.type === "violation" ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500")}>{t.type}</span>
              </div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}

export default TerritoryMapPage;