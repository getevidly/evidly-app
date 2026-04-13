import { useState } from 'react';
import {
  ChevronDown, Sparkles, AlertTriangle, CheckCircle,
  Calendar, Building2, User, Award, FileWarning, Clock, Bell,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  type DocumentAiAnalysis,
  type ExpirationAlert,
  buildExpirationAlerts,
  getAnalysisConfidenceLevel,
  getAnalysisConfidenceColor,
} from '../../data/documentAiDemoData';

// ---------------------------------------------------------------------------
// Needs Attention Badge — inline component
// ---------------------------------------------------------------------------

export function NeedsAttentionBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
    >
      <AlertTriangle size={11} />
      Needs Attention
    </span>
  );
}

// ---------------------------------------------------------------------------
// AI Analysis Panel — collapsible detail view
// ---------------------------------------------------------------------------

interface AiAnalysisPanelProps {
  analysis: DocumentAiAnalysis;
  isOpen: boolean;
  onToggle: () => void;
}

export function AiAnalysisPanel({ analysis, isOpen, onToggle }: AiAnalysisPanelProps) {
  const [showAlerts, setShowAlerts] = useState(false);
  const confidenceLevel = getAnalysisConfidenceLevel(analysis.confidence);
  const confidenceColor = getAnalysisConfidenceColor(analysis.confidence);
  const alerts = buildExpirationAlerts(analysis.expiration_date, analysis.analyzed_at);
  const hasFindings = analysis.violations_findings && analysis.violations_findings.length > 0;
  const isNonCompliant = analysis.compliance_status === 'non_compliant';
  const isNeedsReview = analysis.compliance_status === 'needs_review';

  return (
    <div className="border-t border-[#1E2D4D]/5">
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[#FAF7F0] transition-colors"
      >
        <Sparkles size={14} style={{ color: '#A08C5A' }} />
        <span className="text-xs font-medium" style={{ color: '#1E2D4D' }}>
          AI Analysis
        </span>
        <span
          className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${confidenceColor}15`, color: confidenceColor }}
        >
          {confidenceLevel}
        </span>
        <ChevronDown
          size={14}
          className={`ml-auto text-[#1E2D4D]/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {/* Non-compliant banner */}
          {(isNonCompliant || isNeedsReview) && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs"
              style={{
                backgroundColor: isNonCompliant ? '#fef2f2' : '#fffbeb',
                color: isNonCompliant ? '#991b1b' : '#92400e',
                border: `1px solid ${isNonCompliant ? '#fecaca' : '#fde68a'}`,
              }}
            >
              <FileWarning size={14} />
              <span className="font-medium">
                {isNonCompliant
                  ? 'Non-Compliant — immediate action required'
                  : 'Needs Review — manual verification recommended'}
              </span>
            </div>
          )}

          {/* Classification */}
          <div
            className="rounded-md p-3 space-y-2"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: '#1E2D4D' }}>
                Document Classification
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: '#eef4f8', color: '#1E2D4D' }}
              >
                {analysis.document_type_label}
              </span>
            </div>

            {/* Extracted fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analysis.issue_date && (
                <FieldRow icon={Calendar} label="Issue Date" value={formatSafeDate(analysis.issue_date)} />
              )}
              {analysis.expiration_date && (
                <FieldRow icon={Clock} label="Expiration Date" value={formatSafeDate(analysis.expiration_date)} />
              )}
              {analysis.issuing_agency && (
                <FieldRow icon={Building2} label="Issuing Agency" value={analysis.issuing_agency} />
              )}
              {analysis.inspector_name && (
                <FieldRow icon={User} label="Inspector / Technician" value={analysis.inspector_name} />
              )}
              {analysis.score_or_grade && (
                <FieldRow icon={Award} label="Score / Grade" value={analysis.score_or_grade} />
              )}
              <FieldRow
                icon={CheckCircle}
                label="Compliance Status"
                value={
                  analysis.compliance_status === 'compliant' ? 'Compliant'
                    : analysis.compliance_status === 'non_compliant' ? 'Non-Compliant'
                    : analysis.compliance_status === 'needs_review' ? 'Needs Review'
                    : 'Unknown'
                }
                valueColor={
                  analysis.compliance_status === 'compliant' ? '#16a34a'
                    : analysis.compliance_status === 'non_compliant' ? '#dc2626'
                    : '#d97706'
                }
              />
            </div>
          </div>

          {/* Violations & Findings */}
          {hasFindings && (
            <div
              className="rounded-md p-3"
              style={{
                backgroundColor: isNonCompliant ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${isNonCompliant ? '#fecaca' : '#fde68a'}`,
              }}
            >
              <p className="text-xs font-semibold mb-1.5" style={{ color: isNonCompliant ? '#991b1b' : '#92400e' }}>
                Violations & Findings
              </p>
              <ul className="space-y-1">
                {analysis.violations_findings!.map((finding, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#374151' }}>
                    <span className="mt-0.5 flex-shrink-0">
                      {finding.toLowerCase().startsWith('critical') ? '🔴' : '🟡'}
                    </span>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Expiration Alerts */}
          {alerts.length > 0 && (
            <div>
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="flex items-center gap-1.5 text-xs font-medium hover:underline"
                style={{ color: '#1E2D4D' }}
              >
                <Bell size={12} />
                Scheduled Expiration Alerts ({alerts.length})
                <ChevronDown size={12} className={`transition-transform ${showAlerts ? 'rotate-180' : ''}`} />
              </button>
              {showAlerts && (
                <div className="mt-2 space-y-1.5">
                  {alerts.map((alert, i) => (
                    <AlertRow key={i} alert={alert} />
                  ))}
                  <p className="text-xs text-[#1E2D4D]/30 mt-1">
                    Routed to: {alerts[0]?.roles.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confidence + timestamp */}
          <div className="flex items-center justify-between pt-1 border-t border-[#1E2D4D]/5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#1E2D4D]/50">Confidence:</span>
              <span className="text-xs font-semibold" style={{ color: confidenceColor }}>
                {confidenceLevel} ({Math.round(analysis.confidence * 100)}%)
              </span>
            </div>
            <span className="text-xs text-[#1E2D4D]/30">
              Based on analysis performed on {formatSafeDate(analysis.analyzed_at)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

function FieldRow({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-[#1E2D4D]/30 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-[#1E2D4D]/50 leading-tight">{label}</p>
        <p
          className="text-xs font-medium leading-tight truncate"
          style={{ color: valueColor || '#111827' }}
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: ExpirationAlert }) {
  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    sent: { bg: '#dcfce7', text: '#166534', label: 'Sent' },
    scheduled: { bg: '#dbeafe', text: '#1E2D4D', label: 'Scheduled' },
    skipped: { bg: '#f3f4f6', text: '#6b7280', label: 'Skipped' },
  };
  const s = statusStyles[alert.status] || statusStyles.scheduled;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[#1E2D4D]/50 w-28 flex-shrink-0">{alert.label}</span>
      <span className="text-[#1E2D4D]/80">{formatSafeDate(alert.alert_date)}</span>
      <span
        className="ml-auto px-1.5 py-0.5 rounded text-xs font-semibold"
        style={{ backgroundColor: s.bg, color: s.text }}
      >
        {s.label}
      </span>
    </div>
  );
}

function formatSafeDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return format(d, 'MMM d, yyyy');
  } catch {
    return '—';
  }
}
