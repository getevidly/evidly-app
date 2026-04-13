import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function TempPatternInsights() {
  const { profile } = useAuth();
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) { setLoading(false); return; }
    analyzePatterns();
  }, [profile?.organization_id]);

  const analyzePatterns = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: readings } = await supabase
        .from('temperature_logs')
        .select('equipment_id, temperature, temp_pass, reading_time, log_type, shift')
        .gte('reading_time', thirtyDaysAgo)
        .order('reading_time', { ascending: true })
        .limit(2000);

      if (!readings || readings.length < 20) {
        setInsights('Insufficient data for pattern analysis. At least 20 readings over 30 days are needed.');
        setLoading(false);
        return;
      }

      const violations = readings.filter(r => !r.temp_pass);

      // Group violations by hour
      const byHour = {};
      violations.forEach(r => {
        const h = new Date(r.reading_time).getHours();
        byHour[h] = (byHour[h] || 0) + 1;
      });

      // Group violations by day of week
      const byDay = {};
      violations.forEach(r => {
        const d = new Date(r.reading_time).getDay();
        byDay[d] = (byDay[d] || 0) + 1;
      });

      const { data: aiResult } = await supabase.functions.invoke('ai-text-assist', {
        body: {
          type: 'temp_pattern_analysis',
          context: {
            total_readings: readings.length,
            total_violations: violations.length,
            violation_rate: Math.round((violations.length / readings.length) * 100),
            violations_by_hour: byHour,
            violations_by_day_of_week: byDay,
            shift_breakdown: {
              morning: violations.filter(r => r.shift === 'morning').length,
              afternoon: violations.filter(r => r.shift === 'afternoon').length,
              evening: violations.filter(r => r.shift === 'evening').length,
            },
          },
        },
      });

      setInsights(aiResult?.text || aiResult?.result || 'Pattern analysis complete.');
    } catch {
      setInsights('Pattern analysis unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
      padding: 20, marginTop: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="text-base">📊</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1E2D4D' }}>AI Pattern Insights — 30 Days</span>
      </div>
      {loading ? (
        <p style={{ fontSize: 13, color: '#6B7280' }}>Analyzing temperature patterns...</p>
      ) : (
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {insights}
        </p>
      )}
    </div>
  );
}
