// Import Validator — validation engine for bulk-imported CSV data.
// Checks required fields, formats, enums, duplicates, and auto-assigns pillars.

import { ImportDataType, getImportSchema, ImportColumn } from './importTemplates';

export interface ValidationResult {
  row: number;
  status: 'valid' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
  data: Record<string, string>;
}

export interface ImportSummary {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  results: ValidationResult[];
}

// ---------------------------------------------------------------------------
// Date parsing — accepts YYYY-MM-DD, MM/DD/YYYY, M/D/YYYY, M/D/YY
// ---------------------------------------------------------------------------

export function parseDate(value: string): string | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const month = m.padStart(2, '0');
    const day = d.padStart(2, '0');
    if (isValidDateParts(Number(y), Number(m), Number(d))) {
      return `${y}-${month}-${day}`;
    }
    return null;
  }

  // M/D/YYYY or M/D/YY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    const [, mStr, dStr, yStr] = usMatch;
    let year = Number(yStr);
    if (yStr.length === 2) {
      year = year >= 50 ? 1900 + year : 2000 + year;
    }
    const month = Number(mStr);
    const day = Number(dStr);
    if (isValidDateParts(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  return null;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

// ---------------------------------------------------------------------------
// Enum normalizer — case-insensitive match against allowed values
// ---------------------------------------------------------------------------

export function normalizeEnumValue(value: string, allowed: string[]): string | null {
  if (!value || !value.trim()) return null;
  const lower = value.trim().toLowerCase().replace(/\s+/g, '_');
  for (const option of allowed) {
    if (option.toLowerCase() === lower) {
      return option;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Individual field validators
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(
  column: ImportColumn,
  rawValue: string,
  errors: string[],
  warnings: string[],
  data: Record<string, string>
): void {
  const value = (rawValue ?? '').trim();

  // Required check
  if (column.required && !value) {
    errors.push(`${column.header} is required`);
    return;
  }

  // Nothing more to validate if empty and not required
  if (!value) return;

  switch (column.type) {
    case 'email': {
      if (!EMAIL_REGEX.test(value)) {
        errors.push(`${column.header}: invalid email format`);
      } else {
        data[column.field] = value;
      }
      break;
    }

    case 'phone': {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        warnings.push(`${column.header}: phone number should be 10-11 digits`);
      }
      data[column.field] = value;
      break;
    }

    case 'date': {
      const parsed = parseDate(value);
      if (!parsed) {
        errors.push(`${column.header}: unrecognized date format (use YYYY-MM-DD or MM/DD/YYYY)`);
      } else {
        data[column.field] = parsed;
      }
      break;
    }

    case 'number': {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`${column.header}: must be a number`);
      } else {
        // Temperature range check for temp-related fields
        if (
          column.field === 'temperature' ||
          column.field === 'temp_min' ||
          column.field === 'temp_max'
        ) {
          if (num < -20 || num > 250) {
            errors.push(`${column.header}: temperature must be between -20 and 250`);
          }
        }
        data[column.field] = value;
      }
      break;
    }

    case 'enum': {
      const normalized = normalizeEnumValue(value, column.enumValues ?? []);
      if (!normalized) {
        errors.push(
          `${column.header}: must be one of [${(column.enumValues ?? []).join(', ')}]`
        );
      } else {
        data[column.field] = normalized;
      }
      break;
    }

    case 'string':
    default: {
      data[column.field] = value;
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Equipment pillar auto-assignment
// ---------------------------------------------------------------------------

const FACILITY_SAFETY_TYPES = new Set([
  'hood',
  'fire_suppression',
  'grease_trap',
  'extinguisher',
]);

function assignEquipmentPillar(data: Record<string, string>): void {
  const eqType = (data.type ?? '').toLowerCase();
  data.pillar = FACILITY_SAFETY_TYPES.has(eqType) ? 'facility_safety' : 'food_safety';
}

// ---------------------------------------------------------------------------
// Duplicate detection helpers
// ---------------------------------------------------------------------------

function getDedupeKey(dataType: ImportDataType, data: Record<string, string>): string | null {
  switch (dataType) {
    case 'equipment':
      return data.name?.toLowerCase() ?? null;
    case 'vendors':
      return data.company_name?.toLowerCase() ?? null;
    case 'team':
      return data.email?.toLowerCase() ?? null;
    case 'temperature_logs':
      return null; // no dedup for temp logs
    case 'documents':
      return data.document_name?.toLowerCase() ?? null;
    case 'locations':
      return data.name?.toLowerCase() ?? null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main validation function
// ---------------------------------------------------------------------------

export function validateImportData(
  dataType: ImportDataType,
  rows: Record<string, string>[],
  existingNames?: string[]
): ImportSummary {
  const schema = getImportSchema(dataType);
  const results: ValidationResult[] = [];
  const seenKeys = new Map<string, number>(); // key -> first row number
  const existingSet = new Set(
    (existingNames ?? []).map((n) => n.toLowerCase())
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];
    const warnings: string[] = [];
    const data: Record<string, string> = {};

    // Validate each column
    for (const column of schema.columns) {
      // Match column by header (case-insensitive) or by field name
      const rawValue =
        row[column.header] ??
        row[column.field] ??
        row[column.header.toLowerCase()] ??
        '';
      validateField(column, rawValue, errors, warnings, data);
    }

    // Auto-set pillar for equipment
    if (dataType === 'equipment' && data.type) {
      assignEquipmentPillar(data);
    }

    // Duplicate detection
    const dedupeKey = getDedupeKey(dataType, data);
    if (dedupeKey) {
      const firstRow = seenKeys.get(dedupeKey);
      if (firstRow !== undefined) {
        warnings.push(`Duplicate of row ${firstRow + 1} in this file`);
      } else {
        seenKeys.set(dedupeKey, i);
      }

      if (existingSet.has(dedupeKey)) {
        warnings.push(`"${dedupeKey}" may already exist in your account`);
      }
    }

    // Determine overall status
    let status: ValidationResult['status'] = 'valid';
    if (errors.length > 0) {
      status = 'error';
    } else if (warnings.length > 0) {
      status = 'warning';
    }

    results.push({
      row: i + 1,
      status,
      errors,
      warnings,
      data,
    });
  }

  const valid = results.filter((r) => r.status === 'valid').length;
  const warningCount = results.filter((r) => r.status === 'warning').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return {
    total: results.length,
    valid,
    warnings: warningCount,
    errors: errorCount,
    results,
  };
}
