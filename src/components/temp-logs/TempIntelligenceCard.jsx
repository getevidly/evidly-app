import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function TempIntelligenceCard() {
  const { profile } = useAuth();
  const [digestText, setDigestText] = useState('');
  const [digestOpen, setDigestOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) { setLoading(false); return; }
    generateDigest();
  }, [profile?.organization_id]);

  const generateDigest = async () => {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: readings } = await supabase
        .from('temp_check_completions')
        .select('equipment_id, temperature, temp_pass, reading_time, corrective_action, log_type')
        .gte('reading_time', yesterday)
        .order('reading_time', { ascending: false })
        .limit(500);

      if (!readings || readings.length === 0) {
        setDigestText('No temperature readings recorded in the last 24 hours.');
        setLoading(false);
        return;
      }

      const total = readings.length;
      const passing = readings.filter(r => r.temp_pass).length;
      const failing = readings.filter(r => !r.temp_pass).length;
      const uncorrected = readings.filter(r => !r.temp_pass && !r.corrective_action).length;

      const { data: aiResult } = await supabase.functions.invoke('ai-text-assist', {
        body: {
          type: 'temp_daily_digest',
          context: {
            date: new Date().toLocaleDateString(),
            total_readings: total,
            passing,
            failing,
            pass_rate: total > 0 ? Math.round((passing / total) * 100) : 0,
            uncorrected_violations: uncorrected,
          },
        },
      });

      setDigestText(aiResult?.text || aiResult?.result || `${total} readings today. ${passing} passed, ${failing} failed. ${uncorrected} uncorrected.`);
    } catch {
      setDigestText('Temperature intelligence unavailable.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{
      marginBottom: 16, borderRadius: 10,
      border: '1px solid #DBEAFE', backgroundColor: '#EFF6FF', padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🧠</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>Temperature Intelligence — Today</span>
        </div>
        <button
          onClick={() => setDigestOpen(!digestOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#2563EB', fontSize: 12 }}
        >
          {digestOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {digestOpen && (
        <p style={{ marginTop: 8, fontSize: 13, color: '#1E2D4D', lineHeight: 1.6 }}>
          {digestText}
        </p>
      )}
    </div>
  );
}
