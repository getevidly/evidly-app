// SUPERPOWERS-APP-01 — SP6: Jurisdiction Signals Page
import { useState, useEffect } from 'react';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { JurisdictionSignalFeed } from '../../components/superpowers/JurisdictionSignalFeed';
import { supabase } from '../../lib/supabase';
import { Radio } from 'lucide-react';

export function JurisdictionSignals() {
  useDemoGuard();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [signals, setSignals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    async function loadSignals() {
      try {
        const orgId = profile?.organization_id;
        if (!orgId) { setLoading(false); return; }

        // Get org's counties from locations
        const { data: locations } = await supabase
          .from('locations')
          .select('county')
          .eq('organization_id', orgId)
          .not('county', 'is', null);

        const counties = [...new Set((locations || []).map(l => l.county).filter(Boolean))];

        if (counties.length === 0) { setSignals([]); setLoading(false); return; }

        // Fetch published signals for matching counties
        const { data } = await supabase
          .from('intelligence_signals')
          .select('id, title, summary, county, category, ai_urgency, source_name, published_at, signal_type')
          .eq('is_published', true)
          .in('county', counties)
          .order('published_at', { ascending: false })
          .limit(50);

        setSignals(data || []);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    loadSignals();
  }, [isDemoMode, profile?.organization_id]);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[#1E2D4D] rounded-xl">
          <Radio className="h-6 w-6 text-[#A08C5A]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0B1628]">Jurisdiction Signals</h1>
          <p className="text-sm text-[#6B7F96]">Real-time regulatory signals for your county</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A08C5A] mx-auto" />
          <p className="mt-3 text-sm text-[#6B7F96]">Loading jurisdiction signals...</p>
        </div>
      ) : (
        <JurisdictionSignalFeed signals={signals} />
      )}
    </div>
  );
}
