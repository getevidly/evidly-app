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
// File validation — Layer 1: Client-side pre-screening
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MIN_FILE_SIZE = 5 * 1024;          // 5 KB

/** Allowlisted file types: extension → expected MIME types */
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  '.pdf':  ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.jpg':  ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png':  ['image/png'],
  '.csv':  ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
};

/** Types that can be sent to AI classification (images + PDF) */
const CLASSIFIABLE_TYPES = [
  'image/jpeg', 'image/png', 'application/pdf',
];

/**
 * Extract the file extension from a filename.
 * Returns lowercase extension including the dot, or empty string.
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Detect double extensions (e.g., .pdf.exe, .jpg.scr).
 * Returns true if the filename has more than one extension-like segment.
 */
function hasDoubleExtension(filename: string): boolean {
  // Strip leading path separators
  const base = filename.split(/[/\\]/).pop() || filename;
  // Count segments that look like extensions (dot followed by 1-5 alphanumeric chars)
  const parts = base.split('.');
  if (parts.length <= 2) return false; // name.ext is fine
  // Check if multiple trailing parts look like extensions
  const extensionLikeParts = parts.slice(1).filter(p => /^[a-zA-Z0-9]{1,5}$/.test(p));
  return extensionLikeParts.length >= 2;
}

export interface FileValidationResult {
  ok: boolean;
  reason?: string;
  /** Whether the file can be sent to AI classification (images/PDF only) */
  classifiable?: boolean;
}

/**
 * Validate a file for upload — Layer 1 client-side pre-screening.
 * Checks: allowlisted types, extension-MIME match, size, no double extension.
 */
export function validateFileForUpload(file: File): FileValidationResult {
  const filename = file.name;
  const ext = getFileExtension(filename);

  // Reject files with no extension
  if (!ext) {
    return { ok: false, reason: 'File has no extension. Accepted types: PDF, DOCX, XLSX, JPG, PNG, CSV.' };
  }

  // Reject double extensions (e.g., report.pdf.exe)
  if (hasDoubleExtension(filename)) {
    return { ok: false, reason: `Suspicious filename "${filename}" — double extensions are not allowed.` };
  }

  // Check extension is in allowlist
  const allowedMimes = ALLOWED_FILE_TYPES[ext];
  if (!allowedMimes) {
    return { ok: false, reason: `File type "${ext}" is not allowed. Accepted types: PDF, DOCX, XLSX, JPG, PNG, CSV.` };
  }

  // Validate MIME type matches extension
  if (!allowedMimes.includes(file.type) && file.type !== '') {
    return {
      ok: false,
      reason: `File extension "${ext}" does not match the file content type "${file.type}". This may indicate a renamed file.`,
    };
  }

  // Enforce 10 MB maximum
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, reason: 'File too large. Maximum file size is 10 MB.' };
  }

  // Enforce minimum size
  if (file.size < MIN_FILE_SIZE) {
    return { ok: false, reason: 'File too small (minimum 5 KB).' };
  }

  const classifiable = CLASSIFIABLE_TYPES.includes(file.type);
  return { ok: true, classifiable };
}

/**
 * Legacy compatibility wrapper — used by SmartUploadModal classification flow.
 * Now delegates to validateFileForUpload with classifiable check.
 */
export function canClassify(file: File): { ok: boolean; reason?: string } {
  const result = validateFileForUpload(file);
  if (!result.ok) return { ok: false, reason: result.reason };
  if (!result.classifiable) {
    return { ok: false, reason: 'This file type cannot be AI-classified. It will be uploaded without classification.' };
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
    pillar: 'facility_safety',
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
    pillar: 'facility_safety',
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
    pillar: 'facility_safety',
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
    vendorName: 'Fire Suppression Vendor',
    serviceDate: '2026-01-01',
    expiryDate: '2027-01-01',
    confidence: 0.93,
    summary: 'Certificate of insurance for fire suppression vendor. General liability $1M/$2M aggregate.',
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
  fog_manifest: {
    documentType: 'grease_trap_pumping_receipt',
    documentLabel: 'FOG Pumping Manifest',
    pillar: 'facility_safety',
    vendorName: 'Central Valley Grease Services',
    serviceDate: '2026-01-25',
    expiryDate: '2026-02-25',
    confidence: 0.90,
    summary: 'FOG pumping manifest — 200 gallons collected from 500-gal trap. Disposed at Valley Rendering, manifest #CVG-2026-0125.',
    suggestedFields: { gallons_collected: '200', manifest_number: 'CVG-2026-0125' },
  },
  backflow: {
    documentType: 'backflow_preventer_certification',
    documentLabel: 'Backflow Preventer Certification',
    pillar: 'facility_safety',
    vendorName: 'Valley Backflow Testing',
    serviceDate: '2026-01-10',
    expiryDate: '2027-01-10',
    confidence: 0.91,
    summary: 'Annual backflow preventer test report — RPZ valve passed. Results filed with water district.',
    suggestedFields: { device_type: 'RPZ valve', result: 'pass' },
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
  if (lower.includes('fog') || lower.includes('manifest') || (lower.includes('grease') && lower.includes('manifest')))
    return DEMO_CLASSIFICATIONS.fog_manifest;
  if (lower.includes('grease') || lower.includes('trap') || lower.includes('interceptor'))
    return DEMO_CLASSIFICATIONS.grease_trap;
  if (lower.includes('backflow') || lower.includes('rpz') || lower.includes('cross_connection'))
    return DEMO_CLASSIFICATIONS.backflow;

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
  { value: 'facility_safety', label: 'Facility Safety', icon: '🔥' },
  { value: 'food_safety', label: 'Food Safety', icon: '🍽️' },
  { value: 'vendor', label: 'Vendor', icon: '🤝' },
  { value: 'facility', label: 'Facility & General', icon: '🏢' },
] as const;

export const DOCUMENT_TYPE_OPTIONS = [
  // Facility Safety
  { value: 'hood_cleaning_cert', label: 'Hood Cleaning Certificate', pillar: 'facility_safety' },
  { value: 'fire_suppression_report', label: 'Fire Suppression Report', pillar: 'facility_safety' },
  { value: 'fire_extinguisher_tag', label: 'Fire Extinguisher Tag', pillar: 'facility_safety' },
  { value: 'ansul_cert', label: 'Ansul Certification', pillar: 'facility_safety' },
  { value: 'exhaust_fan_service', label: 'Exhaust Fan Service', pillar: 'facility_safety' },
  { value: 'building_fire_inspection', label: 'Fire Department Inspection', pillar: 'facility_safety' },
  { value: 'elevator_inspection_cert', label: 'Elevator Inspection Certificate', pillar: 'facility_safety' },
  { value: 'elevator_maintenance_record', label: 'Elevator Maintenance Record', pillar: 'facility_safety' },
  { value: 'elevator_permit', label: 'Elevator Operating Permit', pillar: 'facility_safety' },
  { value: 'pest_control_contract', label: 'Pest Control Contract', pillar: 'facility_safety' },
  { value: 'pest_activity_log', label: 'Pest Activity Log', pillar: 'facility_safety' },
  { value: 'grease_trap_pumping_receipt', label: 'Grease Trap Pumping Manifest', pillar: 'facility_safety' },
  { value: 'grease_trap_inspection_report', label: 'Grease Trap Inspection Report', pillar: 'facility_safety' },
  { value: 'grease_interceptor_maintenance_log', label: 'Grease Interceptor Maintenance Log', pillar: 'facility_safety' },
  { value: 'fog_compliance_report', label: 'FOG Compliance Report', pillar: 'facility_safety' },
  { value: 'backflow_preventer_certification', label: 'Backflow Preventer Certification', pillar: 'facility_safety' },
  { value: 'backflow_compliance_letter', label: 'Backflow Compliance Letter', pillar: 'facility_safety' },
  // PSE-Relevant Documents
  { value: 'suppression_inspection_report', label: 'Suppression System Inspection Report', pillar: 'facility_safety' },
  { value: 'fire_alarm_inspection_cert', label: 'Fire Alarm Inspection Certificate', pillar: 'facility_safety' },
  { value: 'sprinkler_inspection_report', label: 'Sprinkler Inspection Report', pillar: 'facility_safety' },
  { value: 'hood_cleaning_service_record', label: 'Hood Cleaning Service Record (NFPA 96)', pillar: 'facility_safety' },
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
