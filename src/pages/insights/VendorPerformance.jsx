// SUPERPOWERS-APP-01 — SP4: Vendor Performance Page
import { useState, useEffect } from 'react';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { VendorPerformanceCard } from '../../components/superpowers/VendorPerformanceCard';
import { computeVendorScores } from '../../lib/vendorPerformance';
import { supabase } from '../../lib/supabase';
import { Trophy } from 'lucide-react';

export function VendorPerformance() {
  useDemoGuard();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    async function loadScores() {
      try {
        const orgId = profile?.organization_id;
        if (!orgId) { setLoading(false); return; }

        const [serviceRes, docRes] = await Promise.all([
          supabase
            .from('vendor_service_records')
            .select('vendor_id, vendor_name, service_date, next_due_date, safeguard_type')
            .eq('organization_id', orgId)
            .order('service_date', { ascending: false }),
          supabase
            .from('documents')
            .select('vendor_id, expiration_date, document_type')
            .eq('organization_id', orgId)
            .not('vendor_id', 'is', null),
        ]);

        const result = computeVendorScores(
          serviceRes.data || [],
          docRes.data || [],
        );
        setScores(result);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    loadScores();
  }, [isDemoMode, profile?.organization_id]);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[#1E2D4D] rounded-xl">
          <Trophy className="h-6 w-6 text-[#A08C5A]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0B1628]">Vendor Performance</h1>
          <p className="text-sm text-[#6B7F96]">Grade your vendors A-F on timeliness, certs, and reliability</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A08C5A] mx-auto" />
          <p className="mt-3 text-sm text-[#6B7F96]">Analyzing vendor performance...</p>
        </div>
      ) : (
        <VendorPerformanceCard scores={scores} />
      )}
    </div>
  );
}
