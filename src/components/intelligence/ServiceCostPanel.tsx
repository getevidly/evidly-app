import { useState, useEffect } from 'react';
import { CPP_SERVICES, CPP } from '../../data/serviceCatalog';

export interface ServiceState {
  serviceId: string;
  isActive: boolean;
  currentCost: number;
  frequency: number;
  inputs: Record<string, number | string>;
}

interface Props {
  onStateChange: (states: ServiceState[]) => void;
}

export const ServiceCostPanel: React.FC<Props> = ({ onStateChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [openService, setOpenService] = useState<string | null>(null);
  const [serviceStates, setServiceStates] = useState<ServiceState[]>(
    CPP_SERVICES.map(s => ({
      serviceId: s.id,
      isActive: false,
      currentCost: 0,
      frequency: 4,
      inputs: {},
    }))
  );

  useEffect(() => { onStateChange(serviceStates); }, [serviceStates]);

  const update = (id: string, patch: Partial<ServiceState>) =>
    setServiceStates(prev => prev.map(s => s.serviceId === id ? { ...s, ...patch } : s));

  const updateInput = (id: string, key: string, val: number | string) =>
    setServiceStates(prev => prev.map(s =>
      s.serviceId === id ? { ...s, inputs: { ...s.inputs, [key]: val } } : s
    ));

  const inactiveCount = serviceStates.filter(s => !s.isActive).length;

  return (
    <div style={{
      background: '#FFFFFF',
      border: inactiveCount > 0 ? '1px solid #7f1d1d' : '1px solid #166534',
      borderRadius: '12px', overflow: 'hidden', marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
    }}>
      <button onClick={() => setExpanded(!expanded)} style={{
        width: '100%', background: 'none', border: 'none',
        padding: '16px 20px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>&#x1F525;</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>
              Fire Safety Service Status — Cleaning Pros Plus
            </p>
            <p style={{ color: '#3D5068', fontSize: '11px', margin: '2px 0 0', fontFamily: 'system-ui' }}>
              {4 - inactiveCount} of 4 services active
              {inactiveCount > 0 && ` · ${inactiveCount} not in use — enter your details to see your risk exposure`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {inactiveCount > 0 && (
            <span style={{
              background: '#7f1d1d', border: '1px solid #dc2626',
              borderRadius: '10px', padding: '2px 8px',
              color: '#fca5a5', fontSize: '11px', fontWeight: 700,
            }}>
              {inactiveCount} Not Active
            </span>
          )}
          <span style={{ color: '#3D5068' }}>{expanded ? '\u25B2' : '\u25BC'}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid #D1D9E6' }}>
          {CPP_SERVICES.map(service => {
            const state = serviceStates.find(s => s.serviceId === service.id)!;
            const isOpen = openService === service.id;

            return (
              <div key={service.id} style={{ borderBottom: '1px solid #D1D9E6' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: state.isActive ? '#4ade80' : '#ef4444', flexShrink: 0,
                    }} />
                    <div>
                      <p style={{ color: '#0B1628', fontSize: '13px', fontWeight: 600, margin: 0, fontFamily: 'system-ui' }}>
                        {service.name}
                      </p>
                      <p style={{ color: '#3D5068', fontSize: '11px', margin: '1px 0 0', fontFamily: 'system-ui' }}>
                        {service.nfpaReference}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => update(service.id, { isActive: !state.isActive })}
                      style={{
                        background: state.isActive ? '#14532d' : '#450a0a',
                        border: `1px solid ${state.isActive ? '#166534' : '#991b1b'}`,
                        borderRadius: '20px', padding: '4px 12px',
                        color: state.isActive ? '#4ade80' : '#fca5a5',
                        fontSize: '11px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'system-ui', whiteSpace: 'nowrap',
                      }}
                    >
                      {state.isActive ? '\u2713 Active' : '\u2717 Not Active'}
                    </button>
                    <button
                      onClick={() => setOpenService(isOpen ? null : service.id)}
                      style={{
                        background: 'transparent', border: '1px solid #D1D9E6',
                        borderRadius: '6px', padding: '4px 10px',
                        color: '#3D5068', fontSize: '11px',
                        cursor: 'pointer', fontFamily: 'system-ui',
                      }}
                    >
                      {isOpen ? 'Close' : 'Details + Risk Inputs'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ background: '#EEF1F7', padding: '16px 20px' }}>
                    {/* Business benefit */}
                    <div style={{
                      background: '#14532d20', border: '1px solid #166534',
                      borderRadius: '8px', padding: '12px', marginBottom: '12px',
                    }}>
                      <p style={{ color: '#4ade80', fontSize: '11px', fontWeight: 700, margin: '0 0 4px', fontFamily: 'system-ui' }}>Business Benefit</p>
                      <p style={{ color: '#3D5068', fontSize: '12px', margin: 0, lineHeight: 1.6, fontFamily: 'system-ui' }}>{service.businessBenefit}</p>
                    </div>

                    {/* Operational impact */}
                    <div style={{
                      background: '#D1D9E6', borderLeft: '3px solid #3b82f6',
                      borderRadius: '6px', padding: '10px 12px', marginBottom: '12px',
                    }}>
                      <p style={{ color: '#93c5fd', fontSize: '11px', fontWeight: 700, margin: '0 0 3px', fontFamily: 'system-ui' }}>Operational Impact</p>
                      <p style={{ color: '#3D5068', fontSize: '12px', margin: 0, lineHeight: 1.5, fontFamily: 'system-ui' }}>{service.operationalImpact}</p>
                    </div>

                    {/* Regulatory tags */}
                    <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{
                        background: '#7f1d1d20', border: '1px solid #991b1b',
                        borderRadius: '4px', padding: '3px 8px',
                        fontSize: '11px', color: '#fca5a5', fontWeight: 600, fontFamily: 'system-ui',
                      }}>{service.nfpaReference}</span>
                      {service.additionalRegs.map((r, i) => (
                        <span key={i} style={{
                          background: '#D1D9E6', border: '1px solid #D1D9E6',
                          borderRadius: '4px', padding: '3px 8px',
                          fontSize: '11px', color: '#3D5068', fontFamily: 'system-ui',
                        }}>{r}</span>
                      ))}
                    </div>

                    {/* Risk inputs */}
                    <p style={{ color: '#3D5068', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px', fontFamily: 'system-ui' }}>
                      Your Operation Details — Risk Calculated from Your Numbers
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                      {service.costDrivers.map(driver => (
                        <div key={driver.id}>
                          <label style={{
                            display: 'block', color: '#3D5068', fontSize: '10px',
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                            marginBottom: '3px', fontFamily: 'system-ui',
                          }}>
                            {driver.label} {driver.unit && `(${driver.unit})`}
                          </label>
                          {driver.inputType === 'select' ? (
                            <select
                              value={(state.inputs[driver.id] as string) || ''}
                              onChange={e => updateInput(service.id, driver.id, e.target.value)}
                              style={{
                                width: '100%', background: '#FFFFFF',
                                border: '1px solid #D1D9E6', borderRadius: '6px',
                                padding: '7px 10px', color: '#0B1628',
                                fontSize: '12px', fontFamily: 'system-ui',
                              }}
                            >
                              <option value="">Select...</option>
                              {driver.options?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <div style={{ position: 'relative' }}>
                              {driver.inputType === 'currency' && (
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#3D5068', fontSize: '12px' }}>$</span>
                              )}
                              <input
                                type="number"
                                value={(state.inputs[driver.id] as number) || ''}
                                onChange={e => updateInput(service.id, driver.id, parseFloat(e.target.value) || 0)}
                                placeholder={driver.placeholder}
                                style={{
                                  width: '100%', background: '#FFFFFF',
                                  border: '1px solid #D1D9E6', borderRadius: '6px',
                                  padding: `7px 10px 7px ${driver.inputType === 'currency' ? '20px' : '10px'}`,
                                  color: '#0B1628', fontSize: '12px',
                                  fontFamily: 'system-ui', boxSizing: 'border-box' as const,
                                }}
                              />
                            </div>
                          )}
                          <p style={{ color: '#3D5068', fontSize: '10px', margin: '3px 0 0', fontFamily: 'system-ui' }}>{driver.helpText}</p>
                        </div>
                      ))}
                    </div>

                    {/* If active: current cost inputs */}
                    {state.isActive && (
                      <div style={{
                        background: '#14532d20', border: '1px solid #166534',
                        borderRadius: '8px', padding: '12px',
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px',
                      }}>
                        <div>
                          <label style={{ color: '#4ade80', fontSize: '10px', fontWeight: 700, display: 'block', marginBottom: '3px', fontFamily: 'system-ui', textTransform: 'uppercase' }}>
                            Cost per Service ($)
                          </label>
                          <input
                            type="number"
                            value={state.currentCost || ''}
                            onChange={e => update(service.id, { currentCost: parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. 450"
                            style={{
                              width: '100%', background: '#FFFFFF',
                              border: '1px solid #166534', borderRadius: '6px',
                              padding: '7px 10px', color: '#0B1628',
                              fontSize: '12px', fontFamily: 'system-ui', boxSizing: 'border-box' as const,
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ color: '#4ade80', fontSize: '10px', fontWeight: 700, display: 'block', marginBottom: '3px', fontFamily: 'system-ui', textTransform: 'uppercase' }}>
                            Services per Year
                          </label>
                          <select
                            value={state.frequency}
                            onChange={e => update(service.id, { frequency: parseInt(e.target.value) })}
                            style={{
                              width: '100%', background: '#FFFFFF',
                              border: '1px solid #166534', borderRadius: '6px',
                              padding: '7px 10px', color: '#0B1628',
                              fontSize: '12px', fontFamily: 'system-ui',
                            }}
                          >
                            {[1, 2, 3, 4, 6, 12].map(n => (
                              <option key={n} value={n}>{n}x {n === 1 ? '(Annual)' : n === 2 ? '(Semi-Annual)' : n === 4 ? '(Quarterly)' : n === 12 ? '(Monthly)' : ''}</option>
                            ))}
                          </select>
                        </div>
                        {state.currentCost > 0 && (
                          <p style={{ color: '#4ade80', fontSize: '13px', fontWeight: 700, margin: 0, gridColumn: '1/-1', fontFamily: 'system-ui' }}>
                            Annual spend: ${(state.currentCost * state.frequency).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Not active: CPP CTA */}
                    {!state.isActive && (
                      <div style={{
                        background: 'linear-gradient(135deg, #EEF1F7, #FFFFFF)',
                        border: '1px solid #A08C5A', borderRadius: '8px',
                        padding: '14px 16px',
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
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
