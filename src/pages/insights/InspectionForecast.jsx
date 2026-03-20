// SUPERPOWERS-APP-01 — SP1: Inspection Forecast Page
import { useState, useEffect } from 'react';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { InspectionForecastCard } from '../../components/superpowers/InspectionForecastCard';
import { computeInspectionForecast } from '../../lib/inspectionForecast';
import { supabase } from '../../lib/supabase';
import { Calendar } from 'lucide-react';

export function InspectionForecast() {
  useDemoGuard();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    async function loadForecast() {
      try {
        const orgId = profile?.organization_id;
        if (!orgId) { setLoading(false); return; }

        // Get most recent inspection
        const { data: inspections } = await supabase
          .from('external_inspections')
          .select('inspection_date, facility_id')
          .eq('organization_id', orgId)
          .order('inspection_date', { ascending: false })
          .limit(1);

        if (!inspections?.length) { setLoading(false); return; }

        // Get location's jurisdiction
        const { data: location } = await supabase
          .from('locations')
          .select('county, jurisdiction_id')
          .eq('organization_id', orgId)
          .limit(1)
          .maybeSingle();

        let gradingConfig = null;
        if (location?.jurisdiction_id) {
          const { data: jur } = await supabase
            .from('jurisdictions')
            .select('grading_config')
            .eq('id', location.jurisdiction_id)
            .maybeSingle();
          gradingConfig = jur?.grading_config;
        }

        const result = computeInspectionForecast(
          new Date(inspections[0].inspection_date),
          location?.county || null,
          gradingConfig,
        );
        setForecast(result);
      } catch {
        // Silent fail — advisory feature
      } finally {
        setLoading(false);
      }
    }

    loadForecast();
  }, [isDemoMode, profile?.organization_id]);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[#1E2D4D] rounded-xl">
          <Calendar className="h-6 w-6 text-[#A08C5A]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0B1628]">Inspection Forecast</h1>
          <p className="text-sm text-[#6B7F96]">Estimated next inspection window based on county patterns</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A08C5A] mx-auto" />
          <p className="mt-3 text-sm text-[#6B7F96]">Analyzing inspection patterns...</p>
        </div>
      ) : (
        <InspectionForecastCard forecast={forecast} />
      )}
    </div>
  );
}
