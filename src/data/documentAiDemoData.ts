// ---------------------------------------------------------------------------
// Document AI Analysis — Types, demo data, and helpers
// ---------------------------------------------------------------------------

export interface DocumentAiAnalysis {
  document_type_classified: string;
  document_type_label: string;
  issue_date: string | null;
  expiration_date: string | null;
  issuing_agency: string | null;
  inspector_name: string | null;
  score_or_grade: string | null;
  violations_findings: string[] | null;
  compliance_status: 'compliant' | 'non_compliant' | 'needs_review' | null;
  confidence: number;
  analyzed_at: string;
}

export interface ExpirationAlert {
  label: string;
  days_before: number;
  alert_date: string;
  roles: string[];
  status: 'sent' | 'scheduled' | 'skipped';
}

// ---------------------------------------------------------------------------
// Pre-built AI analysis for 3 Destino's Restaurant demo documents
// ---------------------------------------------------------------------------

export const DEMO_AI_ANALYSIS: Record<string, DocumentAiAnalysis> = {
  // Doc ID '8': Health Department Inspection Report - Downtown
  '8': {
    document_type_classified: 'health_permit',
    document_type_label: 'Health Department Inspection Report',
    issue_date: '2026-01-02',
    expiration_date: '2027-01-02',
    issuing_agency: 'Fresno County Department of Public Health',
    inspector_name: 'Angela Morales, REHS',
    score_or_grade: '94 / A',
    violations_findings: [
      'Minor: Sanitizer concentration in 3-compartment sink measured 150 ppm (required 200 ppm). Corrected on-site.',
      'Minor: One employee hair restraint not fully covering hair. Corrected on-site.',
    ],
    compliance_status: 'compliant',
    confidence: 0.96,
    analyzed_at: '2026-01-05T14:23:00Z',
  },

  // Doc ID '13': Ansul System Certification - Airport (EXPIRED — needs attention)
  '13': {
    document_type_classified: 'ansul_cert',
    document_type_label: 'Ansul R-102 Fire Suppression System Certification',
    issue_date: '2025-01-15',
    expiration_date: '2026-01-15',
    issuing_agency: 'Valley Fire Systems, Inc.',
    inspector_name: 'Carlos Rivera, Certified Fire Suppression Technician',
    score_or_grade: null,
    violations_findings: [
      'CRITICAL: Certification expired — semi-annual inspection overdue.',
      'Nozzle #3 requires replacement (grease buildup observed at last service).',
      'Fusible link inspection due — last inspected 7 months ago.',
    ],
    compliance_status: 'non_compliant',
    confidence: 0.93,
    analyzed_at: '2025-01-20T09:45:00Z',
  },

  // Doc ID '23': Hood Cleaning Report Q4 2025 - Downtown
  '23': {
    document_type_classified: 'hood_cleaning_cert',
    document_type_label: 'Kitchen Exhaust Hood Cleaning Certificate',
    issue_date: '2025-12-20',
    expiration_date: '2026-03-20',
    issuing_agency: 'SparkClean Hoods LLC',
    inspector_name: 'David Park, IKECA Certified Technician',
    score_or_grade: null,
    violations_findings: null,
    compliance_status: 'compliant',
    confidence: 0.95,
    analyzed_at: '2025-12-22T16:10:00Z',
  },
};

// ---------------------------------------------------------------------------
// Scheduled expiration alerts for demo documents
// ---------------------------------------------------------------------------

export function buildExpirationAlerts(
  expirationDate: string | null,
  analyzedAt: string,
): ExpirationAlert[] {
  if (!expirationDate) return [];

  const expiry = new Date(expirationDate);
  const now = new Date();
  const roles = ['Compliance Officer', 'Owner/Operator'];

  const alerts: ExpirationAlert[] = [
    { label: '60-day warning', days_before: 60, alert_date: '', roles, status: 'scheduled' },
    { label: '30-day warning', days_before: 30, alert_date: '', roles, status: 'scheduled' },
    { label: '7-day warning', days_before: 7, alert_date: '', roles, status: 'scheduled' },
  ];

  for (const alert of alerts) {
    const alertDate = new Date(expiry);
    alertDate.setDate(alertDate.getDate() - alert.days_before);
    alert.alert_date = alertDate.toISOString().split('T')[0];

    if (alertDate < now) {
      alert.status = alertDate >= new Date(analyzedAt) ? 'sent' : 'skipped';
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Needs-attention detection
// ---------------------------------------------------------------------------

export function documentNeedsAttention(
  analysis: DocumentAiAnalysis | null | undefined,
): boolean {
  if (!analysis) return false;
  if (analysis.compliance_status === 'non_compliant') return true;
  if (analysis.compliance_status === 'needs_review') return true;

  // Check for CRITICAL or FAIL keywords in findings
  if (analysis.violations_findings?.some(v => {
    const lower = v.toLowerCase();
    return lower.includes('critical') || lower.includes('fail');
  })) return true;

  // Score below 70 threshold
  if (analysis.score_or_grade) {
    const numMatch = analysis.score_or_grade.match(/(\d+)/);
    if (numMatch && parseInt(numMatch[1]) < 70) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Confidence level helpers
// ---------------------------------------------------------------------------

export function getAnalysisConfidenceLevel(confidence: number): 'High' | 'Medium' | 'Low' {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

export function getAnalysisConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#16a34a';
  if (confidence >= 0.5) return '#d97706';
  return '#ef4444';
}
