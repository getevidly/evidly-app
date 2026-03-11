import { useState } from 'react';
import { X, FileText, Copy, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function HACCPDeviationReport({ violation, onClose }) {
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-text-assist', {
        body: {
          type: 'haccp_deviation_narrative',
          context: {
            equipment_name: violation.equipment_name,
            log_type: violation.log_type || 'equipment_check',
            temperature: violation.temperature_value,
            required_min: violation.required_min ?? null,
            required_max: violation.required_max ?? null,
            reading_time: violation.created_at,
            logged_by_name: violation.recorded_by_name || 'Staff',
            corrective_action: violation.corrective_action || 'None recorded',
            ccp: violation.ccp_number || null,
          },
        },
      });
      if (fnError) throw fnError;
      setNarrative(data?.text || data?.result || 'Unable to generate narrative.');
    } catch (err) {
      setError('Failed to generate HACCP report. Try again.');
      console.error('[HACCPDeviationReport]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>HACCP Deviation Report</title>
      <style>body { font-family: system-ui, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; line-height: 1.6; font-size: 14px; }
      h1 { font-size: 18px; border-bottom: 2px solid #1E2D4D; padding-bottom: 8px; color: #1E2D4D; }
      .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
      .content { white-space: pre-wrap; }
      @media print { body { margin: 20px; } }</style></head>
      <body><h1>HACCP Critical Control Point Deviation Report</h1>
      <div class="meta">Equipment: ${violation.equipment_name} · Date: ${new Date(violation.created_at).toLocaleString()} · Generated: ${new Date().toLocaleString()}</div>
      <div class="content">${narrative}</div></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600,
        maxHeight: '90vh', overflow: 'auto', position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="#1E2D4D" />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1E2D4D' }}>HACCP Deviation Report</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="#6B7280" />
          </button>
        </div>

        {/* Meta */}
        <div style={{ padding: '12px 20px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 12, color: '#6B7280', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <span><strong>Equipment:</strong> {violation.equipment_name}</span>
            <span><strong>Temperature:</strong> {violation.temperature_value}°F</span>
            <span><strong>CCP:</strong> {violation.ccp_number || 'N/A'}</span>
            <span><strong>Date:</strong> {new Date(violation.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {!narrative && !loading && !error && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                Generate an inspector-ready HACCP deviation report using AI.
              </p>
              <button
                onClick={generate}
                style={{
                  padding: '10px 24px', fontSize: 14, fontWeight: 600,
                  backgroundColor: '#1e4d6b', color: '#fff', border: 'none',
                  borderRadius: 8, cursor: 'pointer',
                }}
              >
                Generate Report
              </button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#6B7280', fontSize: 13 }}>
              Generating HACCP deviation narrative...
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{error}</p>
              <button onClick={generate} style={{
                padding: '8px 16px', fontSize: 13, backgroundColor: '#1e4d6b',
                color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
              }}>
                Retry
              </button>
            </div>
          )}

          {narrative && (
            <>
              <div style={{
                whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7,
                color: '#1F2937', padding: 16, background: '#FAFBFC',
                border: '1px solid #E5E7EB', borderRadius: 8,
              }}>
                {narrative}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={handleCopy} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 0', fontSize: 13, fontWeight: 600, border: '1px solid #D1D5DB',
                  borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#374151',
                }}>
                  <Copy size={14} />
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
                <button onClick={handlePrint} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 0', fontSize: 13, fontWeight: 600, border: 'none',
                  borderRadius: 8, background: '#1e4d6b', cursor: 'pointer', color: '#fff',
                }}>
                  <Printer size={14} />
                  Print / PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
