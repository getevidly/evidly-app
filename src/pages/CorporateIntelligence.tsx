import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExecutiveSummaryCard } from '../components/intelligence/ExecutiveSummaryCard';
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
import { demoIntelligence } from '../data/demoData';

type ViewMode = 'operations' | 'risk' | 'financial' | 'people';

const viewModes: { id: ViewMode; label: string; icon: string; description: string }[] = [
  { id: 'operations', label: 'Operations', icon: '\u2699\uFE0F', description: 'Compliance health, trends, and operational gaps' },
  { id: 'risk',       label: 'Risk & Legal', icon: '\u2696\uFE0F', description: 'Liability exposure, threats, regulatory changes' },
  { id: 'financial',  label: 'Financial', icon: '\uD83D\uDCB0', description: 'Cost of non-compliance, insurance impact, ROI' },
  { id: 'people',     label: 'People', icon: '\uD83D\uDC65', description: 'Staffing correlation, training gaps, retention impact' },
];

export function CorporateIntelligence() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewMode>('operations');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const data = demoIntelligence;

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'transparent', border: 'none',
            color: '#64748b', fontSize: '12px', cursor: 'pointer',
            padding: 0, fontFamily: 'system-ui',
          }}
        >
          Dashboard
        </button>
        <span style={{ color: '#334155', fontSize: '12px' }}>{'\u203A'}</span>
        <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui' }}>
          Corporate Intelligence
        </span>
      </div>

      {/* Page Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 800, margin: 0 }}>
            Corporate Intelligence
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
            {data.orgName} &middot; {data.period} analysis &middot; {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <ExportReport data={data} />
      </div>

      {/* View Mode Selector */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '24px',
        borderBottom: '1px solid #1e293b', paddingBottom: '0',
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
              color: activeView === v.id ? '#A08C5A' : '#64748b',
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

      {/* AI Executive Summary — always visible, content adapts to view */}
      <ExecutiveSummaryCard
        data={data}
        viewMode={activeView}
        loading={aiSummaryLoading}
        setLoading={setAiSummaryLoading}
      />

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

      {/* View-specific content */}
      {activeView === 'operations' && (
        <>
          <ComplianceHeatMap data={data} />
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
          <OpportunityEngine data={data} />
        </>
      )}

      {activeView === 'people' && (
        <>
          <StaffingCorrelation data={data} />
        </>
      )}
    </div>
  );
}
