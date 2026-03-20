// SUPERPOWERS-APP-01 — SP3: Compliance Trajectory Page
import { useState, useEffect } from 'react';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { ComplianceTrajectoryCard } from '../../components/superpowers/ComplianceTrajectoryCard';
import { supabase } from '../../lib/supabase';
import { BarChart3 } from 'lucide-react';

export function ComplianceTrajectory() {
  useDemoGuard();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [snapshots, setSnapshots] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    async function loadSnapshots() {
      try {
        const orgId = profile?.organization_id;
        if (!orgId) { setLoading(false); return; }

        const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];

        const { data } = await supabase
          .from('readiness_snapshots')
          .select('snapshot_date, overall_score, food_safety_score, facility_safety_score')
          .eq('org_id', orgId)
          .gte('snapshot_date', ninetyDaysAgo)
          .order('snapshot_date', { ascending: true });

        setSnapshots(data || []);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    loadSnapshots();
  }, [isDemoMode, profile?.organization_id]);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[#1E2D4D] rounded-xl">
          <BarChart3 className="h-6 w-6 text-[#A08C5A]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0B1628]">Compliance Trajectory</h1>
          <p className="text-sm text-[#6B7F96]">30/60/90 day readiness trend with projected trajectory</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A08C5A] mx-auto" />
          <p className="mt-3 text-sm text-[#6B7F96]">Loading trajectory data...</p>
        </div>
      ) : (
        <ComplianceTrajectoryCard snapshots={snapshots} />
      )}
    </div>
  );
}
