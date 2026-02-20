// ---------------------------------------------------------------------------
// Document AI Classification — client-side helpers
// ---------------------------------------------------------------------------

export interface ClassificationResult {
  documentType: string;
  documentLabel: string;
  pillar: string;
  vendorName: string | null;
  serviceDate: string | null;
  expiryDate: string | null;
  confidence: number;
  summary: string;
  suggestedFields: Record<string, string>;
}

export interface ClassificationResponse {
  success: boolean;
  classification: ClassificationResult;
  error?: string;
}

// ---------------------------------------------------------------------------
// File validation
// ---------------------------------------------------------------------------

const CLASSIFIABLE_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
];
const MIN_FILE_SIZE = 5 * 1024;       // 5 KB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function canClassify(file: File): { ok: boolean; reason?: string } {
  if (!CLASSIFIABLE_TYPES.includes(file.type)) {
    return { ok: false, reason: 'Unsupported file type. Use JPEG, PNG, WebP, or PDF.' };
  }
  if (file.size < MIN_FILE_SIZE) {
    return { ok: false, reason: 'File too small (min 5 KB).' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, reason: 'File too large (max 10 MB).' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Convert file to base64
// ---------------------------------------------------------------------------

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Real classification via edge function
// ---------------------------------------------------------------------------

export async function classifyDocument(
  file: File,
  supabaseInvoke: (name: string, options: { body: unknown }) => Promise<{ data: any; error: any }>,
): Promise<ClassificationResponse> {
  try {
    const base64 = await fileToBase64(file);

    const { data, error } = await supabaseInvoke('classify-document', {
      body: {
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type,
      },
    });

    if (error) throw error;

    return data as ClassificationResponse;
  } catch (err) {
    console.error('Classification failed:', err);
    return {
      success: false,
      classification: {
        documentType: 'unknown',
        documentLabel: file.name,
        pillar: 'unknown',
        vendorName: null,
        serviceDate: null,
        expiryDate: null,
        confidence: 0,
        summary: 'Classification failed — please classify manually',
        suggestedFields: {},
      },
      error: String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Demo mode — simulated classification
// ---------------------------------------------------------------------------

const DEMO_CLASSIFICATIONS: Record<string, ClassificationResult> = {
  hood_cleaning: {
    documentType: 'hood_cleaning_cert',
    documentLabel: 'Hood Cleaning Certificate',
    pillar: 'fire_safety',
    vendorName: 'Cleaning Pros Plus',
    serviceDate: '2026-02-08',
    expiryDate: '2026-05-08',
    confidence: 0.95,
    summary: 'Hood cleaning certificate for main kitchen exhaust system. Quarterly cleaning performed by Cleaning Pros Plus.',
    suggestedFields: { frequency: 'quarterly' },
  },
  fire_suppression: {
    documentType: 'fire_suppression_report',
    documentLabel: 'Fire Suppression Inspection Report',
    pillar: 'fire_safety',
    vendorName: 'Fire Systems Inc',
    serviceDate: '2026-01-15',
    expiryDate: '2026-07-15',
    confidence: 0.92,
    summary: 'Semi-annual fire suppression system inspection — all systems passed.',
    suggestedFields: { result: 'pass' },
  },
  fire_extinguisher: {
    documentType: 'fire_extinguisher_tag',
    documentLabel: 'Fire Extinguisher Inspection Tag',
    pillar: 'fire_safety',
    vendorName: 'Cintas',
    serviceDate: '2026-02-03',
    expiryDate: '2027-02-03',
    confidence: 0.88,
    summary: 'Annual fire extinguisher inspection tag from Cintas. Unit #4, 10lb ABC dry chemical.',
    suggestedFields: { unit: '#4', type: '10lb ABC' },
  },
  health_permit: {
    documentType: 'health_permit',
    documentLabel: 'Health Department Permit',
    pillar: 'food_safety',
    vendorName: null,
    serviceDate: '2026-01-01',
    expiryDate: '2026-12-31',
    confidence: 0.97,
    summary: 'Annual health department operating permit for food service establishment.',
    suggestedFields: { permit_number: 'HP-2026-04821' },
  },
  food_handler: {
    documentType: 'food_handler_cert',
    documentLabel: 'Food Handler Certification',
    pillar: 'food_safety',
    vendorName: null,
    serviceDate: '2025-09-15',
    expiryDate: '2028-09-15',
    confidence: 0.91,
    summary: 'Food handler certification card — California-approved program, valid 3 years.',
    suggestedFields: { state: 'CA', employee: 'Maria Rodriguez' },
  },
  pest_control: {
    documentType: 'pest_control_report',
    documentLabel: 'Pest Control Service Report',
    pillar: 'food_safety',
    vendorName: 'Orkin Commercial',
    serviceDate: '2026-02-01',
    expiryDate: '2026-03-01',
    confidence: 0.89,
    summary: 'Monthly pest control service report. No evidence of pest activity. Bait stations inspected and serviced.',
    suggestedFields: { frequency: 'monthly' },
  },
  vendor_coi: {
    documentType: 'vendor_coi',
    documentLabel: 'Vendor Certificate of Insurance',
    pillar: 'vendor',
    vendorName: 'Valley Fire Systems',
    serviceDate: '2026-01-01',
    expiryDate: '2027-01-01',
    confidence: 0.93,
    summary: 'Certificate of insurance for Valley Fire Systems. General liability $1M/$2M aggregate.',
    suggestedFields: { coverage: '$1M/$2M' },
  },
  business_license: {
    documentType: 'business_license',
    documentLabel: 'Business License',
    pillar: 'facility',
    vendorName: null,
    serviceDate: '2026-01-01',
    expiryDate: '2026-12-31',
    confidence: 0.94,
    summary: 'City of Fresno business license for food service establishment.',
    suggestedFields: { license_number: 'BL-2026-7742' },
  },
  grease_trap: {
    documentType: 'grease_trap_records',
    documentLabel: 'Grease Trap Pumping Record',
    pillar: 'facility',
    vendorName: 'Valley Grease Services',
    serviceDate: '2026-01-20',
    expiryDate: '2026-04-20',
    confidence: 0.86,
    summary: 'Grease trap pumping service record. 500-gallon interior trap cleaned and pumped.',
    suggestedFields: { capacity: '500 gal' },
  },
  unknown: {
    documentType: 'unknown',
    documentLabel: 'Unknown Document',
    pillar: 'unknown',
    vendorName: null,
    serviceDate: null,
    expiryDate: null,
    confidence: 0.23,
    summary: 'Unable to determine document type — please classify manually.',
    suggestedFields: {},
  },
};

/** Pick a demo classification based on filename heuristics */
function pickDemoClassification(fileName: string): ClassificationResult {
  const lower = fileName.toLowerCase();
  if (lower.includes('hood') || lower.includes('exhaust') || lower.includes('duct'))
    return DEMO_CLASSIFICATIONS.hood_cleaning;
  if (lower.includes('suppression') || lower.includes('ansul') || lower.includes('amerex'))
    return DEMO_CLASSIFICATIONS.fire_suppression;
  if (lower.includes('extinguisher') || lower.includes('fire_ext'))
    return DEMO_CLASSIFICATIONS.fire_extinguisher;
  if (lower.includes('health') && lower.includes('permit'))
    return DEMO_CLASSIFICATIONS.health_permit;
  if (lower.includes('food_handler') || lower.includes('handler'))
    return DEMO_CLASSIFICATIONS.food_handler;
  if (lower.includes('pest') || lower.includes('orkin') || lower.includes('terminix'))
    return DEMO_CLASSIFICATIONS.pest_control;
  if (lower.includes('coi') || lower.includes('insurance') || lower.includes('certificate_of'))
    return DEMO_CLASSIFICATIONS.vendor_coi;
  if (lower.includes('business') && lower.includes('license'))
    return DEMO_CLASSIFICATIONS.business_license;
  if (lower.includes('grease') || lower.includes('trap'))
    return DEMO_CLASSIFICATIONS.grease_trap;

  // For images default to fire extinguisher, PDFs default to hood cleaning
  const isImage = fileName.match(/\.(jpg|jpeg|png|webp)$/i);
  if (isImage) return DEMO_CLASSIFICATIONS.fire_extinguisher;
  if (fileName.match(/\.pdf$/i)) return DEMO_CLASSIFICATIONS.hood_cleaning;

  return DEMO_CLASSIFICATIONS.unknown;
}

/** Simulate AI classification with a realistic delay */
export async function classifyDocumentDemo(file: File): Promise<ClassificationResponse> {
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  const classification = pickDemoClassification(file.name);
  return { success: true, classification };
}

// ---------------------------------------------------------------------------
// Confidence helpers
// ---------------------------------------------------------------------------

export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#16a34a';
  if (confidence >= 0.5) return '#d97706';
  return '#ef4444';
}

export function getConfidenceIcon(confidence: number): string {
  if (confidence >= 0.8) return '✅';
  if (confidence >= 0.5) return '⚠️';
  return '❌';
}

// ---------------------------------------------------------------------------
// Pillar metadata
// ---------------------------------------------------------------------------

export const PILLAR_OPTIONS = [
  { value: 'fire_safety', label: 'Fire Safety', icon: '🔥' },
  { value: 'food_safety', label: 'Food Safety', icon: '🍽️' },
  { value: 'vendor', label: 'Vendor', icon: '🤝' },
  { value: 'facility', label: 'Facility & General', icon: '🏢' },
] as const;

export const DOCUMENT_TYPE_OPTIONS = [
  // Fire Safety
  { value: 'hood_cleaning_cert', label: 'Hood Cleaning Certificate', pillar: 'fire_safety' },
  { value: 'fire_suppression_report', label: 'Fire Suppression Report', pillar: 'fire_safety' },
  { value: 'fire_extinguisher_tag', label: 'Fire Extinguisher Tag', pillar: 'fire_safety' },
  { value: 'ansul_cert', label: 'Ansul Certification', pillar: 'fire_safety' },
  { value: 'exhaust_fan_service', label: 'Exhaust Fan Service', pillar: 'fire_safety' },
  { value: 'building_fire_inspection', label: 'Fire Department Inspection', pillar: 'fire_safety' },
  // Food Safety
  { value: 'health_permit', label: 'Health Department Permit', pillar: 'food_safety' },
  { value: 'food_handler_cert', label: 'Food Handler Certification', pillar: 'food_safety' },
  { value: 'food_manager_cert', label: 'Food Manager Certification', pillar: 'food_safety' },
  { value: 'haccp_plan', label: 'HACCP Plan', pillar: 'food_safety' },
  { value: 'allergen_training', label: 'Allergen Training', pillar: 'food_safety' },
  { value: 'pest_control_report', label: 'Pest Control Report', pillar: 'food_safety' },
  // Vendor
  { value: 'vendor_coi', label: 'Certificate of Insurance', pillar: 'vendor' },
  { value: 'vendor_licenses', label: 'Vendor License', pillar: 'vendor' },
  { value: 'service_agreements', label: 'Service Agreement', pillar: 'vendor' },
  // Facility
  { value: 'business_license', label: 'Business License', pillar: 'facility' },
  { value: 'certificate_occupancy', label: 'Certificate of Occupancy', pillar: 'facility' },
  { value: 'grease_trap_records', label: 'Grease Trap Record', pillar: 'facility' },
  { value: 'backflow_test', label: 'Backflow Test Report', pillar: 'facility' },
  // Unknown
  { value: 'unknown', label: 'Other / Unknown', pillar: 'unknown' },
] as const;

export function getPillarForDocType(docType: string): string {
  const opt = DOCUMENT_TYPE_OPTIONS.find(o => o.value === docType);
  return opt?.pillar ?? 'unknown';
}

export function getLabelForDocType(docType: string): string {
  const opt = DOCUMENT_TYPE_OPTIONS.find(o => o.value === docType);
  return opt?.label ?? 'Unknown';
}
