import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import {
  Users, MapPin, Heart, TrendingUp, CheckCircle2,
  Building2, ArrowRight,
} from 'lucide-react';

const IS_PRODUCTION = import.meta.env.VITE_APP_ENV === 'production';

export default function AssociationDemoDashboard() {
  useDemoGuard();
  if (IS_PRODUCTION) return <Navigate to="/admin" replace />;

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
      .eq('partner_type', 'association')
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setDemo(data);
    setLoading(false);
  }

  const config = demo?.partner_config || {};
  const members = config.member_locations || [];
  const countyCoverage = config.county_coverage || {};
  const pipeline = config.adoption_pipeline || {};

  return (
    <div>
      <AdminBreadcrumb items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Partner Demos', path: '/admin/partner-demos' },
        { label: 'Association Dashboard' },
      ]} />

      <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-1">
        Association Partner Dashboard
      </h1>
      <p className="text-sm text-[#1E2D4D]/50 mb-6">
        {demo?.partner_company || 'Association Partner'} — Member Compliance & Community Impact
      </p>

      {loading && <p className="text-[#1E2D4D]/30 text-sm">Loading association demo...</p>}

      {!loading && !demo && (
        <div className="text-center py-12 text-[#1E2D4D]/30">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No active association demo found</p>
          <p className="text-sm mt-1">Create an association partner demo first</p>
        </div>
      )}

      {demo && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Members', value: config.member_count || members.length, icon: Users, bg: 'bg-blue-50', color: 'text-blue-700' },
              { label: 'Counties Covered', value: Object.keys(countyCoverage).length, icon: MapPin, bg: 'bg-green-50', color: 'text-green-700' },
              { label: 'K2C Monthly', value: `$${config.k2c_monthly || 0}`, icon: Heart, bg: 'bg-red-50', color: 'text-red-700' },
              { label: 'K2C Meals/mo', value: config.k2c_meals_per_month || 0, icon: TrendingUp, bg: 'bg-[#FAF7F0]', color: 'text-[#A08C5A]' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                <s.icon size={20} className={`${s.color} mb-2`} />
                <p className="text-xs text-[#1E2D4D]/50 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Member Coverage */}
          <div className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4">Member Coverage by County</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(countyCoverage).map(([county, memberNames]) => (
                <div key={county} className="border border-[#1E2D4D]/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-[#A08C5A]" />
                    <p className="font-medium text-[#1E2D4D]">{county} County</p>
                    <span className="ml-auto text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {memberNames.length} member{memberNames.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {memberNames.map((name, i) => (
                      <p key={i} className="text-sm text-[#1E2D4D]/70 pl-6">{name}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Member Adoption Pipeline */}
          <div className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4">Member Adoption Pipeline</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Onboarded', value: pipeline.onboarded || 0, color: 'text-green-700', bg: 'bg-green-50' },
                { label: 'In Progress', value: pipeline.in_progress || 0, color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'Invited', value: pipeline.invited || 0, color: 'text-[#A08C5A]', bg: 'bg-[#FAF7F0]' },
              ].map(stage => (
                <div key={stage.label} className={`${stage.bg} rounded-xl p-4 text-center`}>
                  <p className={`text-3xl font-bold tracking-tight ${stage.color}`}>{stage.value}</p>
                  <p className="text-xs text-[#1E2D4D]/50 mt-1">{stage.label}</p>
                </div>
              ))}
            </div>
            {/* Pipeline bar */}
            <div className="mt-4 h-3 bg-[#1E2D4D]/5 rounded-full overflow-hidden flex">
              <div className="h-full bg-green-500" style={{ width: `${(pipeline.onboarded / (config.member_count || 10)) * 100}%` }} />
              <div className="h-full bg-blue-400" style={{ width: `${(pipeline.in_progress / (config.member_count || 10)) * 100}%` }} />
              <div className="h-full bg-[#A08C5A]" style={{ width: `${(pipeline.invited / (config.member_count || 10)) * 100}%` }} />
            </div>
          </div>

          {/* K2C Community Impact */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Heart size={20} className="text-red-700" />
              <h2 className="text-lg font-semibold tracking-tight text-red-900">Kitchen to Community Impact</h2>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold tracking-tight text-red-800">${config.k2c_monthly || 0}</p>
                <p className="text-xs text-red-600 mt-1">Monthly Donation</p>
                <p className="text-xs text-[#1E2D4D]/50 mt-0.5">{config.member_count || 0} members x $10/mo</p>
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight text-red-800">${config.k2c_annual || 0}</p>
                <p className="text-xs text-red-600 mt-1">Annual Impact</p>
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight text-red-800">{config.k2c_meals_per_month || 0}</p>
                <p className="text-xs text-red-600 mt-1">Meals/Month</p>
                <p className="text-xs text-[#1E2D4D]/50 mt-0.5">via No Kid Hungry</p>
              </div>
            </div>
          </div>

          {/* Member Compliance Distribution */}
          <div className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4">Member Compliance Distribution</h2>
            <div className="space-y-3">
              {members.map((member, i) => {
                const score = 55 + Math.floor((i * 37 + 13) % 40);
                return (
                  <div key={member.id || i} className="flex items-center gap-4 p-3 bg-[#FAF7F0] rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#1E2D4D]">{member.name}</p>
                      <p className="text-xs text-[#1E2D4D]/50">{member.county} County</p>
                    </div>
                    <div className="w-32 h-2 bg-[#1E2D4D]/8 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-[#A08C5A]' : 'bg-red-500'}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium w-8 text-right ${score >= 80 ? 'text-green-700' : score >= 60 ? 'text-[#A08C5A]' : 'text-red-700'}`}>
                      {score}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Endorsed Partner Resources placeholder */}
          <div className="bg-[#FAF7F0] border border-[#A08C5A]/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-2">Endorsed Partner Resources</h2>
            <p className="text-sm text-[#1E2D4D]/50 mb-4">
              Co-branded materials and resources for your association members
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                'Member Compliance Guide (PDF)',
                'Association Co-branded Flyer',
                'Member Onboarding Playbook',
                'K2C Impact Report Template',
              ].map(item => (
                <div key={item} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[#A08C5A]/10">
                  <Building2 size={16} className="text-[#A08C5A]" />
                  <span className="text-sm text-[#1E2D4D]">{item}</span>
                  <ArrowRight size={14} className="ml-auto text-[#1E2D4D]/30" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
