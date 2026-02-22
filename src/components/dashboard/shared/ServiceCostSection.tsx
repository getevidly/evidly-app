/**
 * Service Cost & Risk Calculator Section
 *
 * Visible to: Owner, Facilities
 * NOT visible to: Everyone else
 */

import { useState } from 'react';
import { ServiceCostPanel, type ServiceState } from '../../intelligence/ServiceCostPanel';
import { CostOfInactionEngine } from '../../intelligence/CostOfInactionEngine';

export function ServiceCostSection() {
  const [serviceStates, setServiceStates] = useState<ServiceState[]>([]);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: '16px',
      }}>
        <div>
          <p style={{
            color: 'var(--text-primary)', fontSize: '14px', fontWeight: 800,
            margin: 0, fontFamily: 'system-ui',
          }}>
            {'\u26A1'} Service Cost & Risk Calculator
          </p>
          <p style={{
            color: 'var(--text-secondary)', fontSize: '11px', margin: '3px 0 0',
            fontFamily: 'system-ui',
          }}>
            Enter your operation details to calculate your actual dollar exposure
          </p>
        </div>
        <span style={{
          background: '#A08C5A20', border: '1px solid #A08C5A60',
          borderRadius: '6px', padding: '3px 10px',
          color: '#A08C5A', fontSize: '10px', fontWeight: 700,
          fontFamily: 'system-ui',
        }}>
          CPP Partner
        </span>
      </div>
      <ServiceCostPanel onStateChange={setServiceStates} />
      <CostOfInactionEngine serviceStates={serviceStates} />
    </div>
  );
}
