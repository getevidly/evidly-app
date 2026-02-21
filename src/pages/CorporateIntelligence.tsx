import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExecutiveSummaryCard } from '../components/intelligence/ExecutiveSummaryCard';
import { ScenarioEngine, type Scenario } from '../components/intelligence/ScenarioEngine';
import { ComplianceHeatMap } from '../components/intelligence/ComplianceHeatMap';
import { RiskRadar } from '../components/intelligence/RiskRadar';
import { TrendEngine } from '../components/intelligence/TrendEngine';
import { BusinessImpactPanel } from '../components/intelligence/BusinessImpactPanel';
import { ThreatIntelligence } from '../components/intelligence/ThreatIntelligence';
import { OpportunityEngine } from '../components/intelligence/OpportunityEngine';
import { StaffingCorrelation } from '../components/intelligence/StaffingCorrelation';
import { PredictiveRisk } from '../components/intelligence/PredictiveRisk';
import { RegionalBenchmark } from '../components/intelligence/RegionalBenchmark';
import { AnomalyDetector } from '../components/intelligence/AnomalyDetector';
import { ExportReport } from '../components/intelligence/ExportReport';
import { ServiceCostPanel, type ServiceState } from '../components/intelligence/ServiceCostPanel';
import { CostOfInactionEngine } from '../components/intelligence/CostOfInactionEngine';
import { JurisdictionScoreTable } from '../components/intelligence/JurisdictionScoreTable';
import { NFPAReminder } from '../components/ui/NFPAReminder';
import type { UserJurisdiction } from '../data/jurisdictionData';
import { demoIntelligence } from '../data/demoData';

type ViewMode = 'operations' | 'risk' | 'financial' | 'people';

const viewModes: { id: ViewMode; label: string; icon: string; description: string }[] = [
  { id: 'operations', label: 'Operations', icon: '\u2699\uFE0F', description: 'Compliance health, trends, and operational gaps' },
  { id: 'risk',       label: 'Risk & Legal', icon: '\u2696\uFE0F', description: 'Liability exposure, threats, regulatory changes' },
  { id: 'financial',  label: 'Financial', icon: '\uD83D\uDCB0', description: 'Cost of non-compliance, insurance impact, ROI' },
  { id: 'people',     label: 'People', icon: '\uD83D\uDC65', description: 'Staffing correlation, training gaps, retention impact' },
];

export function BusinessIntelligence() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewMode>('operations');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [scenarioFields, setScenarioFields] = useState<Record<string, string>>({});
  const [userJurisdictions, setUserJurisdictions] = useState<UserJurisdiction[]>([]);
  const [serviceStates, setServiceStates] = useState<ServiceState[]>([]);
  const data = demoIntelligence;

  const handleScenarioChange = (scenario: Scenario | null, fields: Record<string, string>) => {
    setActiveScenario(scenario);
    setScenarioFields(fields);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#F4F6FA', minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-secondary, #3D5068)', fontSize: '12px', cursor: 'pointer',
            padding: 0, fontFamily: 'system-ui',
          }}
        >
          Dashboard
        </button>
        <span style={{ color: '#D1D9E6', fontSize: '12px' }}>{'\u203A'}</span>
        <span style={{ color: 'var(--text-primary, #0B1628)', fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui' }}>
          Business Intelligence
        </span>
      </div>

      {/* NFPA Reminder — always visible */}
      <NFPAReminder />

      {/* Page Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{
              color: 'var(--text-primary, #0B1628)', fontSize: '22px', fontWeight: 800,
              margin: 0, fontFamily: 'system-ui',
            }}>
              Business Intelligence
            </h1>
            <span style={{
              background: '#EEF1F7', border: '1px solid #D1D9E6',
              borderRadius: '20px', padding: '3px 10px',
              color: 'var(--text-secondary, #3D5068)', fontSize: '11px', fontFamily: 'system-ui',
            }}>
              {'\u2295'} AI-Powered
            </span>
          </div>
          <ExportReport data={data} />
        </div>
        <p style={{ color: 'var(--text-secondary, #3D5068)', fontSize: '12px', margin: '6px 0 0', fontFamily: 'system-ui' }}>
          {data.orgName} &middot; {data.analysisPeriod} analysis &middot; {data.reportDate}
        </p>
      </div>

      {/* View Mode Selector */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '24px',
        borderBottom: '1px solid #D1D9E6', paddingBottom: '0',
        overflowX: 'auto',
      }}>
        {viewModes.map(v => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeView === v.id ? '2px solid #A08C5A' : '2px solid transparent',
              color: activeView === v.id ? '#A08C5A' : 'var(--text-secondary, #3D5068)',
              fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
              fontSize: '13px',
              fontWeight: activeView === v.id ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginBottom: '-1px',
            }}
          >
            <span>{v.icon}</span> {v.label}
          </button>
        ))}
      </div>

      {/* Scenario Intelligence Engine — always visible, all tabs */}
      <ScenarioEngine onScenarioChange={handleScenarioChange} />

      {/* View-specific content */}
      {activeView === 'operations' && (
        <>
          <JurisdictionScoreTable userJurisdictions={userJurisdictions} onChange={setUserJurisdictions} />
          <div style={{ marginTop: '16px' }}>
            <ComplianceHeatMap data={data} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <TrendEngine data={data} />
            <AnomalyDetector data={data} />
          </div>
          <RegionalBenchmark data={data} />
        </>
      )}

      {activeView === 'risk' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <ThreatIntelligence data={data} />
            <RiskRadar data={data} />
          </div>
          <PredictiveRisk data={data} />
        </>
      )}

      {activeView === 'financial' && (
        <>
          <BusinessImpactPanel data={data} />
          <ServiceCostPanel onStateChange={setServiceStates} />
          <CostOfInactionEngine serviceStates={serviceStates} />
          <OpportunityEngine data={data} />
        </>
      )}

      {activeView === 'people' && (
        <>
          <StaffingCorrelation data={data} />
        </>
      )}

      {/* AI Executive Summary — always visible, bottom of page, all tabs */}
      <div style={{ marginTop: '20px' }}>
        <ExecutiveSummaryCard
          data={data}
          viewMode={activeView}
          loading={aiSummaryLoading}
          setLoading={setAiSummaryLoading}
          activeScenario={activeScenario}
          scenarioFields={scenarioFields}
        />
      </div>

      {/* Risk Banner — always visible if critical issues exist */}
      {data.complianceMatrix.some(l => l.riskLevel === 'critical') && (
        <div style={{
          background: 'linear-gradient(135deg, #450a0a, #7f1d1d)',
          border: '1px solid #dc2626',
          borderLeft: '4px solid #dc2626',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '20px' }}>{'\uD83D\uDEA8'}</span>
          <div>
            <p style={{ color: '#fca5a5', fontWeight: 700, fontSize: '14px', margin: 0 }}>
              Critical Compliance Risk Detected
            </p>
            <p style={{ color: '#fca5a5', fontSize: '12px', margin: '2px 0 0', opacity: 0.8 }}>
              {data.complianceMatrix.filter(l => l.riskLevel === 'critical').map(l => l.locationName).join(', ')} requires immediate action.
              {' '}Estimated risk exposure: ${data.complianceMatrix.filter(l => l.riskLevel === 'critical').reduce((s, l) => s + l.estimatedRiskExposure, 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
