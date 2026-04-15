import { useState } from 'react';
import { CPP_SERVICES, CPP } from '../../data/serviceCatalog';
import type { ServiceState } from './ServiceCostPanel';

interface Props { serviceStates: ServiceState[]; }

const probabilityColors: Record<string, string> = {
  High: '#ef4444', Medium: '#fbbf24', Low: '#4ade80',
};

export const CostOfInactionEngine: React.FC<Props> = ({ serviceStates }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const inactive = CPP_SERVICES.filter(s =>
    !serviceStates.find(ss => ss.serviceId === s.id)?.isActive
  );

  if (inactive.length === 0) return (
    <div style={{
      background: '#14532d20', border: '1px solid #166534',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
    }}>
      <p style={{ color: '#4ade80', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>
        All CPP services active — fire safety service coverage complete.
      </p>
    </div>
  );

  const toNumericInputs = (inputs: Record<string, number | string>) => {
    const result: Record<string, number> = {};
    Object.entries(inputs).forEach(([k, v]) => {
      result[k] = typeof v === 'number' ? v : parseFloat(v as string) || 0;
    });
    return result;
  };

  let totalLow = 0;
  let totalHigh = 0;
  inactive.forEach(s => {
    const state = serviceStates.find(ss => ss.serviceId === s.id);
    const nums = toNumericInputs(state?.inputs || {});
    s.riskCalculations.forEach(r => {
      const res = r.calculate(nums);
      totalLow += res.low;
      totalHigh += res.high;
    });
  });

  const hasAnyInputs = serviceStates.some(s =>
    Object.values(s.inputs).some(v => v && parseFloat(v as string) > 0)
  );

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #D1D9E6',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
    }}>
      <h2 style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: '0 0 4px', fontFamily: 'system-ui' }}>
        Cost of Inaction — Calculated from Your Numbers
      </h2>
      <p style={{ color: '#3D5068', fontSize: '12px', margin: '0 0 20px', fontFamily: 'system-ui' }}>
        Not industry averages. Your kitchen, your revenue, your roof, your exposure.
      </p>

      {/* Total banner */}
      <div style={{
        background: 'linear-gradient(135deg, #450a0a, #7f1d1d)',
        border: '1px solid #dc2626', borderRadius: '10px',
        padding: '16px 20px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <p style={{ color: '#fca5a5', fontSize: '12px', fontWeight: 700, margin: '0 0 2px', fontFamily: 'system-ui' }}>
            {inactive.length} Unmanaged Service{inactive.length > 1 ? 's' : ''} · Total Estimated Exposure
          </p>
          <p style={{ color: '#fca5a5', fontSize: '11px', margin: 0, opacity: 0.75, fontFamily: 'system-ui' }}>
            {!hasAnyInputs ? 'Enter your operation details above to calculate your specific numbers' : 'Based on your inputs — exposure realized only if risk event occurs'}
          </p>
        </div>
        {hasAnyInputs && totalHigh > 0 && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#ef4444', fontSize: '11px', margin: '0 0 2px', fontFamily: 'system-ui' }}>Your Range</p>
            <p style={{ color: '#ef4444', fontSize: '22px', fontWeight: 800, margin: 0, fontFamily: 'monospace' }}>
              ${totalLow.toLocaleString()} &ndash; ${totalHigh.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Per-service cards */}
      {inactive.map(service => {
        const state = serviceStates.find(ss => ss.serviceId === service.id);
        const nums = toNumericInputs(state?.inputs || {});
        const hasInputs = Object.values(nums).some(v => v > 0);
        const isExpanded = expandedId === service.id;

        let low = 0, high = 0;
        service.riskCalculations.forEach(r => {
          const res = r.calculate(nums);
          low += res.low;
          high += res.high;
        });

        return (
          <div key={service.id} style={{
            background: '#EEF1F7', border: '1px solid #7f1d1d',
            borderRadius: '10px', marginBottom: '10px', overflow: 'hidden',
          }}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : service.id)}
              style={{
                width: '100%', background: 'none', border: 'none',
                padding: '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: '#0B1628', fontSize: '13px', fontWeight: 600, margin: 0, fontFamily: 'system-ui' }}>
                    {service.name} — Not Active
                  </p>
                  <p style={{ color: '#3D5068', fontSize: '11px', margin: '1px 0 0', fontFamily: 'system-ui' }}>
                    {service.nfpaReference}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginLeft: '12px', flexShrink: 0 }}>
                {hasInputs && high > 0 ? (
                  <>
                    <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>
                      ${low.toLocaleString()} &ndash; ${high.toLocaleString()}
                    </p>
                    <p style={{ color: '#3D5068', fontSize: '10px', margin: '1px 0 0', fontFamily: 'system-ui' }}>your exposure</p>
                  </>
                ) : (
                  <p style={{ color: '#3D5068', fontSize: '11px', margin: 0, fontFamily: 'system-ui' }}>Enter details to calculate</p>
                )}
              </div>
            </button>

            {isExpanded && (
              <div style={{ borderTop: '1px solid #D1D9E6', padding: '14px 16px' }}>
                {/* Rebuttal */}
                <div style={{
                  background: '#14532d20', border: '1px solid #166534',
                  borderRadius: '6px', padding: '10px', marginBottom: '12px',
                }}>
                  <p style={{ color: '#4ade80', fontSize: '11px', fontWeight: 700, margin: '0 0 3px', fontFamily: 'system-ui' }}>The Real Cost</p>
                  <p style={{ color: '#3D5068', fontSize: '12px', margin: 0, lineHeight: 1.6, fontFamily: 'system-ui' }}>{service.rebuttal}</p>
                </div>

                {/* Risk rows */}
                {service.riskCalculations.map((risk, i) => {
                  const res = risk.calculate(nums);
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid #D1D9E6', gap: '12px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#0B1628', fontSize: '12px', fontWeight: 600, margin: '0 0 2px', fontFamily: 'system-ui' }}>
                          {risk.riskLabel}
                        </p>
                        <p style={{ color: '#3D5068', fontSize: '11px', margin: '0 0 2px', fontFamily: 'system-ui' }}>
                          Likelihood: <span style={{ color: probabilityColors[risk.probability], fontWeight: 600 }}>{risk.probability}</span>
                        </p>
                        <p style={{ color: '#3D5068', fontSize: '10px', margin: 0, fontFamily: 'system-ui' }}>{risk.regulatoryBasis}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {hasInputs && res.high > 0 ? (
                          <>
                            <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>
                              ${res.low.toLocaleString()} &ndash; ${res.high.toLocaleString()}
                            </p>
                            <p style={{ color: '#3D5068', fontSize: '10px', margin: '1px 0 0', fontFamily: 'system-ui' }}>your numbers</p>
                          </>
                        ) : (
                          <p style={{ color: '#3D5068', fontSize: '11px', margin: 0, fontFamily: 'system-ui' }}>Needs input</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* CPP CTA */}
                <div style={{
                  background: 'linear-gradient(135deg, #EEF1F7, #FFFFFF)',
                  border: '1px solid #A08C5A', borderRadius: '8px',
                  padding: '14px 16px', marginTop: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ color: '#0B1628', fontSize: '12px', fontWeight: 700, margin: '0 0 2px', fontFamily: 'system-ui' }}>{CPP.name}</p>
                    <p style={{ color: '#3D5068', fontSize: '11px', margin: 0, fontFamily: 'system-ui' }}>
                      {CPP.serviceArea} · {CPP.phone} · {CPP.tagline}
                    </p>
                  </div>
                  <a
                    href={`tel:${CPP.phone.replace(/\D/g, '')}`}
                    style={{
                      background: '#A08C5A', border: 'none',
                      borderRadius: '6px', padding: '8px 16px',
                      color: '#ffffff', fontSize: '12px', fontWeight: 700,
                      textDecoration: 'none', fontFamily: 'system-ui', whiteSpace: 'nowrap',
                    }}
                  >
                    Get Quote &rarr;
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
