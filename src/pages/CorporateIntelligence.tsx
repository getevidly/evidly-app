import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessIntelligence } from '../hooks/useBusinessIntelligence';
import { ComplianceHeatMap } from '../components/intelligence/ComplianceHeatMap';
import { JurisdictionScoreTable } from '../components/intelligence/JurisdictionScoreTable';
import { CorrelationInsights } from '../components/intelligence/CorrelationInsights';
import { RiskDriversPanel } from '../components/intelligence/RiskDriversPanel';
import { ExecutiveSummaryCard } from '../components/intelligence/ExecutiveSummaryCard';
import { TrendEngine } from '../components/intelligence/TrendEngine';
import { AnomalyDetector } from '../components/intelligence/AnomalyDetector';
import { RegionalBenchmark } from '../components/intelligence/RegionalBenchmark';
import { PredictiveRisk } from '../components/intelligence/PredictiveRisk';
import { ExportReport } from '../components/intelligence/ExportReport';
import { NFPAReminder } from '../components/ui/NFPAReminder';
import { demoIntelligence } from '../data/demoData';
import type { Scenario } from '../components/intelligence/ScenarioEngine';

type ViewMode = 'operations' | 'risk' | 'financial' | 'people';

const viewModes: { id: ViewMode; label: string; icon: string; description: string }[] = [
  { id: 'operations', label: 'Operations', icon: '\u2699\uFE0F', description: 'Compliance health, trends, and operational gaps' },
  { id: 'risk',       label: 'Risk & Legal', icon: '\u2696\uFE0F', description: 'Liability exposure, threats, regulatory changes' },
  { id: 'financial',  label: 'Financial', icon: '\uD83D\uDCB0', description: 'Cost of non-compliance, insurance impact, ROI' },
  { id: 'people',     label: 'People', icon: '\uD83D\uDC65', description: 'Staffing correlation, training gaps, retention impact' },
];

const F = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export function BusinessIntelligence() {
  const navigate = useNavigate();
  const bi = useBusinessIntelligence();
  const [activeView, setActiveView] = useState<ViewMode>('operations');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [scenarioFields, setScenarioFields] = useState<Record<string, string>>({});

  // demoIntelligence is still used for TrendEngine, AnomalyDetector, RegionalBenchmark,
  // PredictiveRisk, ExportReport, and ExecutiveSummaryCard which still consume the legacy shape.
  // These components can be rewired in a future pass.
  const legacyData = demoIntelligence;

  // Fire safety documents expiring within 60 days
  const facilitySafetyDocs = (bi.expiringDocuments || []).filter(d =>
    d.category === 'facility_safety' ||
    d.title.toLowerCase().includes('fire') ||
    d.title.toLowerCase().includes('hood') ||
    d.title.toLowerCase().includes('suppression') ||
    d.title.toLowerCase().includes('nfpa')
  );

  const hasExpiringFireDocs = facilitySafetyDocs.length > 0;

  // Critical risk: any location with overall score < 55
  const criticalLocations = (bi.complianceSnapshots || []).filter(s => s.overallScore < 55);

  if (bi.loading) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#F4F6FA', minHeight: '100vh', fontFamily: F }}>
        <div style={{
          background: '#FFFFFF', border: '1px solid #D1D9E6', borderRadius: '12px',
          padding: '40px', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
        }}>
          <p style={{ color: '#3D5068', fontSize: '14px', fontFamily: F }}>Loading Business Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#F4F6FA', minHeight: '100vh', fontFamily: F }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-secondary, #3D5068)', fontSize: '12px', cursor: 'pointer',
            padding: 0, fontFamily: F,
          }}
        >
          Dashboard
        </button>
        <span style={{ color: '#D1D9E6', fontSize: '12px' }}>{'\u203A'}</span>
        <span style={{ color: 'var(--text-primary, #0B1628)', fontSize: '12px', fontWeight: 600, fontFamily: F }}>
          Business Intelligence
        </span>
      </div>

      {/* NFPA Reminder */}
      <NFPAReminder />

      {/* Page Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{
              color: 'var(--text-primary, #0B1628)', fontSize: '22px', fontWeight: 800,
              margin: 0, fontFamily: F,
            }}>
              Business Intelligence
            </h1>
            <span style={{
              background: '#EEF1F7', border: '1px solid #D1D9E6',
              borderRadius: '20px', padding: '3px 10px',
              color: 'var(--text-secondary, #3D5068)', fontSize: '11px', fontFamily: F,
            }}>
              {'\u2295'} AI-Powered
            </span>
          </div>
          <ExportReport data={legacyData} />
        </div>
        <p style={{ color: 'var(--text-secondary, #3D5068)', fontSize: '12px', margin: '6px 0 0', fontFamily: F }}>
          {bi.orgName} &middot; 90-day analysis &middot; {bi.reportDate}
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
              fontFamily: F,
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

      {/* Scenario Intelligence Engine — correlation insights from canonical data */}
      <CorrelationInsights correlations={bi.correlations} />

      {/* Insurance / Facility Safety Document Banner */}
      {hasExpiringFireDocs ? (
        <div style={{
          background: 'linear-gradient(135deg, #78350f, #92400e)',
          border: '1px solid #f97316',
          borderLeft: '4px solid #f97316',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>{'\uD83D\uDEE1\uFE0F'}</span>
          <div>
            <p style={{ color: '#fdba74', fontWeight: 700, fontSize: '14px', margin: 0, fontFamily: F }}>
              Facility Safety Documentation Expiring
            </p>
            <p style={{ color: '#fde68a', fontSize: '12px', margin: '4px 0 0', lineHeight: 1.5, fontFamily: F }}>
              {facilitySafetyDocs.map(d =>
                `${d.title}${d.locationName ? ` (${d.locationName})` : ''} \u2014 ${d.daysUntilExpiry} day${d.daysUntilExpiry !== 1 ? 's' : ''}`
              ).join(' \u00B7 ')}
            </p>
            <p style={{ color: '#fdba74', fontSize: '11px', margin: '6px 0 0', opacity: 0.8, fontFamily: F }}>
              Expired facility safety documents give carriers grounds to contest claims. Renew immediately.
            </p>
          </div>
        </div>
      ) : !bi.hasFacilitySafetyDocs && bi.complianceSnapshots.length > 0 ? (
        <div style={{
          background: '#EEF1F7', border: '1px solid #D1D9E6',
          borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>{'\uD83D\uDEE1\uFE0F'}</span>
          <div>
            <p style={{ color: '#0B1628', fontWeight: 700, fontSize: '14px', margin: 0, fontFamily: F }}>
              Facility Safety Documentation Not Found
            </p>
            <p style={{ color: '#3D5068', fontSize: '12px', margin: '4px 0 0', lineHeight: 1.5, fontFamily: F }}>
              Upload your facility safety documents to track insurance readiness. Missing documentation
              (hood cleaning certificates, fire suppression inspections, NFPA 96 compliance records)
              may increase your insurance risk score.
            </p>
            <button
              onClick={() => navigate('/documents')}
              style={{
                marginTop: '8px', background: '#1e4d6b', border: 'none', borderRadius: '6px',
                padding: '6px 14px', color: '#FFFFFF', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: F,
              }}
            >
              Upload Documents
            </button>
          </div>
        </div>
      ) : bi.expiringDocuments.length === 0 && bi.complianceSnapshots.length > 0 ? (
        <div style={{
          background: '#14532d20', border: '1px solid #166534',
          borderRadius: '10px', padding: '10px 16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '14px' }}>{'\u2705'}</span>
          <p style={{ color: '#4ade80', fontSize: '12px', fontWeight: 600, margin: 0, fontFamily: F }}>
            All documentation current \u2014 no facility safety documents expiring within 60 days
          </p>
        </div>
      ) : null}

      {/* View-specific content */}
      {activeView === 'operations' && (
        <>
          <JurisdictionScoreTable jurisdictions={bi.jurisdictions} />
          <div style={{ marginTop: '16px' }}>
            <ComplianceHeatMap snapshots={bi.complianceSnapshots} />
          </div>
          <RiskDriversPanel riskAssessments={bi.riskAssessments} dimension="operational" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <TrendEngine data={legacyData} />
            <AnomalyDetector data={legacyData} />
          </div>
          <RegionalBenchmark data={legacyData} />
        </>
      )}

      {activeView === 'risk' && (
        <>
          <RiskDriversPanel riskAssessments={bi.riskAssessments} dimension="liability" />
          <PredictiveRisk data={legacyData} />
        </>
      )}

      {activeView === 'financial' && (
        <>
          <RiskDriversPanel riskAssessments={bi.riskAssessments} dimension="financial" />
        </>
      )}

      {activeView === 'people' && (
        <>
          <RiskDriversPanel riskAssessments={bi.riskAssessments} dimension="people" />
        </>
      )}

      {/* AI Executive Summary */}
      <div style={{ marginTop: '20px' }}>
        <ExecutiveSummaryCard
          data={legacyData}
          viewMode={activeView}
          loading={aiSummaryLoading}
          setLoading={setAiSummaryLoading}
          activeScenario={activeScenario}
          scenarioFields={scenarioFields}
        />
      </div>

      {/* Critical Risk Banner */}
      {criticalLocations.length > 0 && (
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
            <p style={{ color: '#fca5a5', fontWeight: 700, fontSize: '14px', margin: 0, fontFamily: F }}>
              Critical Compliance Risk Detected
            </p>
            <p style={{ color: '#fca5a5', fontSize: '12px', margin: '2px 0 0', opacity: 0.8, fontFamily: F }}>
              {criticalLocations.map(l => l.locationName).join(', ')} requires immediate action.
              {' '}Overall scores below 55 indicate critical non-compliance.
            </p>
          </div>
        </div>
      )}

      {/* Error notice */}
      {bi.error && (
        <div style={{
          background: '#78350f20', border: '1px solid #92400e',
          borderRadius: '8px', padding: '10px 14px', marginTop: '12px',
        }}>
          <p style={{ color: '#fdba74', fontSize: '12px', margin: 0, fontFamily: F }}>
            Data loading notice: {bi.error}. Showing available data.
          </p>
        </div>
      )}
    </div>
  );
}
