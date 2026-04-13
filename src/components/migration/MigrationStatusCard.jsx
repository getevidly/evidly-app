import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, TrendingUp, ChevronRight, X } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const PRIMARY = '#1E2D4D';

/**
 * MigrationStatusCard — shows on dashboard for 30 days after a data import.
 * Checks for any temperature_logs with input_method='imported'.
 */
export function MigrationStatusCard() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [migrationData, setMigrationData] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check localStorage for dismissal
    const dismissKey = `evidly_migration_card_dismissed_${profile?.organization_id || 'demo'}`;
    if (localStorage.getItem(dismissKey) === 'true') {
      setDismissed(true);
      return;
    }

    if (isDemoMode) {
      // Don't show in demo mode unless they've actually used the migration wizard
      const demoMigration = sessionStorage.getItem('evidly_demo_migration');
      if (demoMigration) {
        try {
          setMigrationData(JSON.parse(demoMigration));
        } catch { /* ignore */ }
      }
      return;
    }

    if (!profile?.organization_id) return;

    // Check for imported records
    (async () => {
      try {
        const { data, count } = await supabase
          .from('temperature_logs')
          .select('migrated_from, reading_time', { count: 'exact' })
          .eq('organization_id', profile.organization_id)
          .eq('input_method', 'imported')
          .order('created_at', { ascending: true })
          .limit(1);

        if (count && count > 0 && data && data.length > 0) {
          const importDate = new Date(data[0].reading_time);
          const daysSinceImport = Math.floor((Date.now() - importDate.getTime()) / (1000 * 60 * 60 * 24));

          // Only show for 30 days
          if (daysSinceImport <= 30) {
            setMigrationData({
              count,
              platform: data[0].migrated_from || 'previous platform',
              date: importDate.toLocaleDateString(),
              daysAnalyzing: daysSinceImport,
            });
          }
        }
      } catch { /* silent */ }
    })();
  }, [isDemoMode, profile?.organization_id]);

  function handleDismiss() {
    const dismissKey = `evidly_migration_card_dismissed_${profile?.organization_id || 'demo'}`;
    localStorage.setItem(dismissKey, 'true');
    setDismissed(true);
  }

  if (!migrationData || dismissed) return null;

  return (
    <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-4 relative" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-[#1E2D4D]/5 text-[#1E2D4D]/30"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ecfdf5' }}>
          <Upload className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#1E2D4D]">
            {migrationData.count.toLocaleString()} records imported from {migrationData.platform}
          </div>
          <div className="text-xs text-[#1E2D4D]/50 mt-0.5">
            Imported on {migrationData.date}. Your AI has been analyzing your history for {migrationData.daysAnalyzing} day{migrationData.daysAnalyzing !== 1 ? 's' : ''}.
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => navigate('/temp-logs')}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: PRIMARY }}
            >
              View Temperature History <ChevronRight className="h-3 w-3" />
            </button>
            <button
              onClick={() => navigate('/insights')}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: PRIMARY }}
            >
              View AI Insights <TrendingUp className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
