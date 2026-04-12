import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import {
  Truck, MapPin, CheckCircle2, AlertTriangle, Calendar,
  TrendingUp, Star, Users, Clock,
} from 'lucide-react';

const IS_PRODUCTION = import.meta.env.VITE_APP_ENV === 'production';

export default function VendorDemoDashboard() {
  useDemoGuard();
  if (IS_PRODUCTION) return <Navigate to="/admin" replace />;

  const { profile } = useAuth();
  const [demo, setDemo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDemo();
  }, []);

  async function fetchDemo() {
    setLoading(true);
    const { data } = await supabase
      .from('partner_demos')
      .select('*')
      .eq('partner_type', 'vendor')
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setDemo(data);
    setLoading(false);
  }

  const config = demo?.partner_config || {};
  const clients = config.client_locations || [];
  const slots = config.vendor_connect_slots || {};

  return (
    <div>
      <AdminBreadcrumb items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Partner Demos', path: '/admin/partner-demos' },
        { label: 'Vendor Dashboard' },
      ]} />

      <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-1">
        Vendor Partner Dashboard
      </h1>
      <p className="text-sm text-[#1E2D4D]/50 mb-6">
        {config.vendor_company || demo?.partner_company || 'Vendor Partner'} — Service Impact Overview
      </p>

      {loading && <p className="text-[#1E2D4D]/30 text-sm">Loading vendor demo...</p>}

      {!loading && !demo && (
        <div className="text-center py-12 text-[#1E2D4D]/30">
          <Truck size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No active vendor demo found</p>
          <p className="text-sm mt-1">Create a vendor partner demo first</p>
        </div>
      )}

      {demo && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Client Locations', value: clients.length, icon: MapPin, bg: 'bg-blue-50', color: 'text-blue-700' },
              { label: 'Service History', value: `${config.service_history_months || 12} mo`, icon: Calendar, bg: 'bg-green-50', color: 'text-green-700' },
              { label: 'Counties Served', value: Object.keys(slots).length || 3, icon: Star, bg: 'bg-[#FAF7F0]', color: 'text-[#A08C5A]' },
              { label: 'PSE Impact', value: `${clients.length}/5`, icon: TrendingUp, bg: 'bg-orange-50', color: 'text-orange-700' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                <s.icon size={20} className={`${s.color} mb-2`} />
                <p className="text-xs text-[#1E2D4D]/50 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Your Clients */}
          <div className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4">Your Clients</h2>
            <div className="space-y-3">
              {clients.map((client, i) => (
                <div key={client.id || i} className="flex items-center justify-between p-3 bg-[#FAF7F0] rounded-lg">
                  <div>
                    <p className="font-medium text-[#1E2D4D]">{client.name}</p>
                    <p className="text-xs text-[#1E2D4D]/50">{client.county} County</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                      <CheckCircle2 size={12} className="inline mr-1" />
                      PSE Compliant
                    </span>
                  </div>
                </div>
              ))}
              {clients.length === 0 && (
                <p className="text-sm text-[#1E2D4D]/30">No client data generated yet.</p>
              )}
            </div>
          </div>

          {/* Vendor Connect Status */}
          <div className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4">Vendor Connect Status</h2>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(slots).map(([county, data]) => (
                <div key={county} className="border border-[#1E2D4D]/10 rounded-lg p-4">
                  <p className="font-medium text-[#1E2D4D] capitalize">{county} County</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#1E2D4D]/50">Total Slots</span>
                      <span className="font-medium">{data.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#1E2D4D]/50">Filled</span>
                      <span className="font-medium text-green-700">{data.filled}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#1E2D4D]/50">Available</span>
                      <span className="font-medium text-[#A08C5A]">{data.available}</span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-[#1E2D4D]/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1E2D4D] rounded-full"
                      style={{ width: `${(data.filled / data.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Service Dates */}
          <div className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4">Upcoming Service Dates</h2>
            <div className="space-y-2">
              {clients.slice(0, 3).map((client, i) => (
                <div key={client.id || i} className="flex items-center justify-between p-3 bg-[#FAF7F0] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-[#1E2D4D]/30" />
                    <div>
                      <p className="text-sm font-medium text-[#1E2D4D]">{client.name}</p>
                      <p className="text-xs text-[#1E2D4D]/50">Hood Cleaning — NFPA 96</p>
                    </div>
                  </div>
                  <span className="text-sm text-[#A08C5A] font-medium">
                    {new Date(Date.now() + (i + 1) * 15 * 86400000).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Pipeline */}
          <div className="bg-[#FAF7F0] border border-[#A08C5A]/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-2">Lead Pipeline</h2>
            <p className="text-sm text-[#1E2D4D]/50 mb-4">
              Simulated Day 30 outreach — restaurants in your service area who need hood cleaning
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold tracking-tight text-[#1E2D4D]">12</p>
                <p className="text-xs text-[#1E2D4D]/50">Overdue Locations</p>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-[#A08C5A]">5</p>
                <p className="text-xs text-[#1E2D4D]/50">In Your Counties</p>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-green-700">3</p>
                <p className="text-xs text-[#1E2D4D]/50">Ready for Outreach</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
