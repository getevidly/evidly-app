// SUPERPOWERS-APP-01 — SP2: Violation Risk Radar Page
import { useState, useEffect } from 'react';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { ViolationRadarCard } from '../../components/superpowers/ViolationRadarCard';
import { computeViolationRisks } from '../../lib/violationRadar';
import { supabase } from '../../lib/supabase';
import { Target } from 'lucide-react';

export function ViolationRadar() {
  useDemoGuard();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [risks, setRisks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    async function loadRadar() {
      try {
        const orgId = profile?.organization_id;
        if (!orgId) { setLoading(false); return; }

        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const today = new Date().toISOString().split('T')[0];

        // Parallel queries
        const [caRes, tempRes, docRes, serviceRes] = await Promise.all([
          supabase.from('corrective_actions').select('status, due_date').eq('organization_id', orgId).in('status', ['open', 'in_progress']),
          supabase.from('temperature_logs').select('temp_pass, reading_time').eq('organization_id', orgId).gte('reading_time', sevenDaysAgo),
          supabase.from('documents').select('expiration_date').eq('organization_id', orgId).lt('expiration_date', today).is('archived_at', null),
          supabase.from('vendor_service_records').select('next_due_date').eq('organization_id', orgId).lt('next_due_date', today),
        ]);

        const openCA = caRes.data?.length || 0;
        const overdueCA = caRes.data?.filter(ca => ca.due_date && new Date(ca.due_date) < new Date()).length || 0;
        const tempFailures = tempRes.data?.filter(t => !t.temp_pass).length || 0;

        // Days without temp log
        const latestTemp = tempRes.data?.sort((a, b) => new Date(b.reading_time).getTime() - new Date(a.reading_time).getTime())[0];
        const daysWithoutTemp = latestTemp ? Math.floor((Date.now() - new Date(latestTemp.reading_time).getTime()) / 86400000) : 7;

        const result = computeViolationRisks({
          openCorrectiveActions: openCA,
          overdueCorrectiveActions: overdueCA,
          tempFailuresLast7Days: tempFailures,
          expiredDocuments: docRes.data?.length || 0,
          overdueServiceRecords: serviceRes.data?.length || 0,
          daysWithoutTempLog: daysWithoutTemp,
        });
        setRisks(result);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    loadRadar();
  }, [isDemoMode, profile?.organization_id]);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[#1E2D4D] rounded-xl">
          <Target className="h-6 w-6 text-[#A08C5A]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0B1628]">Violation Risk Radar</h1>
          <p className="text-sm text-[#6B7F96]">What an inspector may flag right now — advisory analysis</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A08C5A] mx-auto" />
          <p className="mt-3 text-sm text-[#6B7F96]">Analyzing operational risks...</p>
        </div>
      ) : (
        <ViolationRadarCard risks={risks} />
      )}
    </div>
  );
}
