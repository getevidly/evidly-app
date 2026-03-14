/**
 * Checklist template seed data for all HoodOps service types.
 *
 * Each template contains a list of items that a technician must complete
 * during the corresponding phase (pre-inspection or post-inspection).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  id: string;
  label: string;
  type: 'pass_fail' | 'yes_no' | 'rating' | 'text' | 'photo_required' | 'measurement';
  required: boolean;
  photo_required?: boolean;
  min_photos?: number;
  help_text?: string;
  fail_creates_deficiency?: boolean;
  deficiency_severity?: 'critical' | 'major' | 'minor';
  options?: string[];
}

export interface ChecklistTemplate {
  id: string;
  service_type: string;
  phase: 'pre_inspection' | 'post_inspection';
  label: string;
  description: string;
  items: ChecklistItem[];
}

// ---------------------------------------------------------------------------
// KEC (Kitchen Exhaust Cleaning) Templates
// ---------------------------------------------------------------------------

const KEC_PRE_INSPECTION: ChecklistTemplate = {
  id: 'kec-pre-inspection',
  service_type: 'KEC',
  phase: 'pre_inspection',
  label: 'KEC Pre-Inspection',
  description: 'Pre-inspection checklist for Kitchen Exhaust Cleaning service.',
  items: [
    {
      id: 'kec-pre-001',
      label: 'Access to all hoods and equipment confirmed',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'kec-pre-002',
      label: 'Fire suppression system in service',
      type: 'yes_no',
      required: true,
      fail_creates_deficiency: true,
      deficiency_severity: 'critical',
    },
    {
      id: 'kec-pre-003',
      label: 'Kitchen equipment turned off and cool',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'kec-pre-004',
      label: 'BEFORE photos of all hoods',
      type: 'photo_required',
      required: true,
      min_photos: 1,
    },
    {
      id: 'kec-pre-005',
      label: 'BEFORE photos of all filters',
      type: 'photo_required',
      required: true,
    },
    {
      id: 'kec-pre-006',
      label: 'BEFORE photos of exhaust fan(s)',
      type: 'photo_required',
      required: true,
    },
    {
      id: 'kec-pre-007',
      label: 'Document existing damage or issues',
      type: 'text',
      required: false,
      help_text: 'Note any pre-existing damage, wear, or issues observed before work begins.',
    },
    {
      id: 'kec-pre-008',
      label: 'Grease buildup level assessment',
      type: 'rating',
      required: true,
      options: ['Light', 'Moderate', 'Heavy', 'Excessive'],
    },
  ],
};

const KEC_POST_INSPECTION: ChecklistTemplate = {
  id: 'kec-post-inspection',
  service_type: 'KEC',
  phase: 'post_inspection',
  label: 'KEC Post-Inspection',
  description: 'Post-inspection checklist for Kitchen Exhaust Cleaning service.',
  items: [
    {
      id: 'kec-post-001',
      label: 'Hood surfaces cleaned and free of grease',
      type: 'pass_fail',
      required: true,
      photo_required: true,
      fail_creates_deficiency: true,
      deficiency_severity: 'major',
    },
    {
      id: 'kec-post-002',
      label: 'Filters cleaned/replaced',
      type: 'pass_fail',
      required: true,
      photo_required: true,
    },
    {
      id: 'kec-post-003',
      label: 'Ductwork cleaned accessible sections',
      type: 'pass_fail',
      required: true,
    },
    {
      id: 'kec-post-004',
      label: 'Exhaust fan cleaned',
      type: 'pass_fail',
      required: true,
      photo_required: true,
    },
    {
      id: 'kec-post-005',
      label: 'Fire suppression nozzles unobstructed',
      type: 'pass_fail',
      required: true,
      fail_creates_deficiency: true,
      deficiency_severity: 'critical',
    },
    {
      id: 'kec-post-006',
      label: 'Access panels replaced and secured',
      type: 'pass_fail',
      required: true,
    },
    {
      id: 'kec-post-007',
      label: 'AFTER photos of all hoods',
      type: 'photo_required',
      required: true,
    },
    {
      id: 'kec-post-008',
      label: 'AFTER photos of all filters',
      type: 'photo_required',
      required: true,
    },
    {
      id: 'kec-post-009',
      label: 'AFTER photos of exhaust fan(s)',
      type: 'photo_required',
      required: true,
    },
    {
      id: 'kec-post-010',
      label: 'Area cleaned and equipment repositioned',
      type: 'pass_fail',
      required: true,
    },
    {
      id: 'kec-post-011',
      label: 'Service sticker applied with next due date',
      type: 'yes_no',
      required: true,
      photo_required: true,
    },
    {
      id: 'kec-post-012',
      label: 'Customer walkthrough completed',
      type: 'yes_no',
      required: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// FSI (Fire Suppression Inspection) Templates
// ---------------------------------------------------------------------------

const FSI_PRE_INSPECTION: ChecklistTemplate = {
  id: 'fsi-pre-inspection',
  service_type: 'FSI',
  phase: 'pre_inspection',
  label: 'FSI Pre-Inspection',
  description: 'Pre-inspection checklist for Fire Suppression Inspection service.',
  items: [
    {
      id: 'fsi-pre-001',
      label: 'Fire suppression system accessible',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'fsi-pre-002',
      label: 'BEFORE photos of system components',
      type: 'photo_required',
      required: true,
    },
    {
      id: 'fsi-pre-003',
      label: 'Last inspection date documented',
      type: 'text',
      required: true,
      help_text: 'Record the date shown on the most recent inspection tag.',
    },
    {
      id: 'fsi-pre-004',
      label: 'System pressure gauge reading',
      type: 'measurement',
      required: true,
      help_text: 'Record current PSI',
    },
    {
      id: 'fsi-pre-005',
      label: 'Nozzle caps present and intact',
      type: 'yes_no',
      required: true,
      fail_creates_deficiency: true,
      deficiency_severity: 'major',
    },
    {
      id: 'fsi-pre-006',
      label: 'Pull station accessible and unobstructed',
      type: 'yes_no',
      required: true,
      fail_creates_deficiency: true,
      deficiency_severity: 'critical',
    },
  ],
};

const FSI_POST_INSPECTION: ChecklistTemplate = {
  id: 'fsi-post-inspection',
  service_type: 'FSI',
  phase: 'post_inspection',
  label: 'FSI Post-Inspection',
  description: 'Post-inspection checklist for Fire Suppression Inspection service.',
  items: [
    {
      id: 'fsi-post-001',
      label: 'System fully recharged',
      type: 'pass_fail',
      required: true,
      fail_creates_deficiency: true,
      deficiency_severity: 'critical',
    },
    {
      id: 'fsi-post-002',
      label: 'All nozzles inspected and clear',
      type: 'pass_fail',
      required: true,
      photo_required: true,
    },
    {
      id: 'fsi-post-003',
      label: 'Fusible links inspected/replaced',
      type: 'pass_fail',
      required: true,
    },
    {
      id: 'fsi-post-004',
      label: 'Detection line tested',
      type: 'pass_fail',
      required: true,
      fail_creates_deficiency: true,
      deficiency_severity: 'critical',
    },
    {
      id: 'fsi-post-005',
      label: 'Gas valve shutoff verified',
      type: 'pass_fail',
      required: true,
      fail_creates_deficiency: true,
      deficiency_severity: 'critical',
    },
    {
      id: 'fsi-post-006',
      label: 'AFTER photos of system',
      type: 'photo_required',
      required: true,
    },
    {
      id: 'fsi-post-007',
      label: 'New inspection tag applied',
      type: 'yes_no',
      required: true,
      photo_required: true,
    },
    {
      id: 'fsi-post-008',
      label: 'System armed and operational',
      type: 'pass_fail',
      required: true,
      fail_creates_deficiency: true,
      deficiency_severity: 'critical',
    },
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const CHECKLIST_TEMPLATES: Record<string, ChecklistTemplate[]> = {
  KEC: [KEC_PRE_INSPECTION, KEC_POST_INSPECTION],
  FSI: [FSI_PRE_INSPECTION, FSI_POST_INSPECTION],
};
