// Import Templates — CSV column schemas and downloadable template data
// for the bulk import system. Supports 6 importable data types.

export type ImportDataType =
  | 'equipment'
  | 'vendors'
  | 'team'
  | 'temperature_logs'
  | 'documents'
  | 'locations';

export interface ImportColumn {
  header: string;
  field: string;
  required: boolean;
  type: 'string' | 'email' | 'phone' | 'date' | 'number' | 'enum';
  enumValues?: string[];
  description?: string;
}

export interface ImportSchema {
  dataType: ImportDataType;
  label: string;
  description: string;
  icon: string;
  columns: ImportColumn[];
  exampleRows: string[][];
}

const schemas: Record<ImportDataType, ImportSchema> = {
  equipment: {
    dataType: 'equipment',
    label: 'Equipment',
    description: 'Import kitchen equipment, coolers, hoods, and other assets',
    icon: 'Wrench',
    columns: [
      { header: 'Name', field: 'name', required: true, type: 'string', description: 'Equipment name or label' },
      { header: 'Type', field: 'type', required: true, type: 'enum', enumValues: ['walk_in_cooler', 'walk_in_freezer', 'hood', 'fire_suppression', 'grease_trap', 'grease_interceptor', 'backflow_preventer', 'extinguisher', 'prep_cooler', 'hot_holding', 'ice_machine', 'dishwasher', 'fryer', 'oven', 'elevator', 'wood_fired_oven', 'charcoal_grill', 'wood_smoker', 'pellet_smoker', 'other'], description: 'Equipment type' },
      { header: 'Location Area', field: 'location_area', required: false, type: 'string', description: 'Where the equipment is located' },
      { header: 'Manufacturer', field: 'manufacturer', required: false, type: 'string' },
      { header: 'Model', field: 'model', required: false, type: 'string' },
      { header: 'Serial Number', field: 'serial_number', required: false, type: 'string' },
      { header: 'Install Date', field: 'install_date', required: false, type: 'date' },
      { header: 'Last Service Date', field: 'last_service_date', required: false, type: 'date' },
      { header: 'Service Frequency', field: 'service_frequency', required: false, type: 'enum', enumValues: ['monthly', 'quarterly', 'semi_annual', 'annual'] },
      { header: 'Temp Min', field: 'temp_min', required: false, type: 'number', description: 'Minimum acceptable temperature' },
      { header: 'Temp Max', field: 'temp_max', required: false, type: 'number', description: 'Maximum acceptable temperature' },
      { header: 'Notes', field: 'notes', required: false, type: 'string' },
    ],
    exampleRows: [
      ['Walk-in Cooler #1', 'walk_in_cooler', 'Kitchen', 'True Manufacturing', 'TWT-48SD', 'SN-44821', '2022-06-15', '2024-11-01', 'quarterly', '33', '40', 'Primary produce storage'],
      ['Main Hood System', 'hood', 'Cooking Line', 'Captive-Aire', 'A5424', 'SN-88102', '2021-03-10', '2024-09-15', 'semi_annual', '', '', 'Covers fryer and grill stations'],
    ],
  },

  vendors: {
    dataType: 'vendors',
    label: 'Vendors',
    description: 'Import vendor and service provider contacts',
    icon: 'Building2',
    columns: [
      { header: 'Company Name', field: 'company_name', required: true, type: 'string' },
      { header: 'Contact Name', field: 'contact_name', required: false, type: 'string' },
      { header: 'Email', field: 'email', required: false, type: 'email' },
      { header: 'Phone', field: 'phone', required: false, type: 'phone' },
      { header: 'Service Type', field: 'service_type', required: true, type: 'enum', enumValues: ['hood_cleaning', 'fire_suppression', 'pest_control', 'grease_trap', 'equipment_repair', 'food_supply', 'plumbing', 'hvac', 'other'] },
      { header: 'License Number', field: 'license_number', required: false, type: 'string' },
      { header: 'Insurance Expiry', field: 'insurance_expiry', required: false, type: 'date' },
      { header: 'Contract Start', field: 'contract_start', required: false, type: 'date' },
      { header: 'Contract End', field: 'contract_end', required: false, type: 'date' },
      { header: 'Notes', field: 'notes', required: false, type: 'string' },
    ],
    exampleRows: [
      ['CleanAir Hoods LLC', 'Mike Rivera', 'mike@cleanairhoods.com', '(555) 234-5678', 'hood_cleaning', 'HC-2024-1190', '2025-08-15', '2024-01-01', '2025-12-31', 'Quarterly hood cleaning service'],
      ['SafeGuard Fire Systems', 'Dana Chen', 'dana@safeguardfire.com', '555-876-5432', 'fire_suppression', 'FS-1102', '2025-11-30', '2024-06-01', '2026-05-31', 'Annual inspection and recharge'],
    ],
  },

  team: {
    dataType: 'team',
    label: 'Team Members',
    description: 'Import staff, managers, and admin users',
    icon: 'Users',
    columns: [
      { header: 'Full Name', field: 'full_name', required: true, type: 'string' },
      { header: 'Email', field: 'email', required: true, type: 'email' },
      { header: 'Role', field: 'role', required: true, type: 'enum', enumValues: ['admin', 'manager', 'staff'] },
      { header: 'Phone', field: 'phone', required: false, type: 'phone' },
      { header: 'Hire Date', field: 'hire_date', required: false, type: 'date' },
      { header: 'Food Handler Cert Expiry', field: 'food_handler_cert_expiry', required: false, type: 'date' },
      { header: 'Food Manager Cert Expiry', field: 'food_manager_cert_expiry', required: false, type: 'date' },
      { header: 'Position', field: 'position', required: false, type: 'string' },
    ],
    exampleRows: [
      ['Maria Santos', 'maria@example.com', 'manager', '(555) 111-2233', '2021-04-10', '2026-04-10', '2026-04-10', 'Kitchen Manager'],
      ['James Park', 'james@example.com', 'staff', '555-444-5566', '2023-09-01', '2025-09-01', '', 'Line Cook'],
    ],
  },

  temperature_logs: {
    dataType: 'temperature_logs',
    label: 'Temperature Logs',
    description: 'Import historical temperature readings for equipment',
    icon: 'Thermometer',
    columns: [
      { header: 'Equipment Name', field: 'equipment_name', required: true, type: 'string', description: 'Must match an existing equipment name' },
      { header: 'Temperature', field: 'temperature', required: true, type: 'number', description: 'Temperature reading in degrees F' },
      { header: 'Date', field: 'date', required: true, type: 'date' },
      { header: 'Time', field: 'time', required: false, type: 'string', description: 'Time of reading (e.g. 08:00 AM)' },
      { header: 'Recorded By', field: 'recorded_by', required: false, type: 'string' },
      { header: 'Notes', field: 'notes', required: false, type: 'string' },
    ],
    exampleRows: [
      ['Walk-in Cooler #1', '36.5', '2024-12-01', '08:00 AM', 'Maria Santos', 'Morning check'],
      ['Walk-in Cooler #1', '37.2', '2024-12-01', '04:00 PM', 'James Park', 'Afternoon check'],
    ],
  },

  documents: {
    dataType: 'documents',
    label: 'Documents',
    description: 'Import document records such as permits, licenses, and reports',
    icon: 'FileText',
    columns: [
      { header: 'Document Name', field: 'document_name', required: true, type: 'string' },
      { header: 'Type', field: 'type', required: true, type: 'enum', enumValues: ['inspection_report', 'insurance', 'license', 'permit', 'certification', 'cleaning_report', 'training_record', 'other'] },
      { header: 'Issue Date', field: 'issue_date', required: false, type: 'date' },
      { header: 'Expiry Date', field: 'expiry_date', required: false, type: 'date' },
      { header: 'Issuing Authority', field: 'issuing_authority', required: false, type: 'string' },
      { header: 'Related Vendor', field: 'related_vendor', required: false, type: 'string' },
      { header: 'Related Equipment', field: 'related_equipment', required: false, type: 'string' },
      { header: 'Notes', field: 'notes', required: false, type: 'string' },
    ],
    exampleRows: [
      ['Health Permit 2024', 'permit', '2024-01-15', '2025-01-14', 'County Health Dept', '', '', 'Annual health permit renewal'],
      ['Hood Cleaning Report - Dec', 'cleaning_report', '2024-12-10', '', '', 'CleanAir Hoods LLC', 'Main Hood System', 'Quarterly cleaning completed'],
    ],
  },

  locations: {
    dataType: 'locations',
    label: 'Locations',
    description: 'Import restaurant locations and sites',
    icon: 'MapPin',
    columns: [
      { header: 'Name', field: 'name', required: true, type: 'string', description: 'Location name or identifier' },
      { header: 'Address', field: 'address', required: false, type: 'string' },
      { header: 'City', field: 'city', required: false, type: 'string' },
      { header: 'State', field: 'state', required: false, type: 'enum', enumValues: ['CA', 'TX', 'FL', 'NY', 'WA', 'OR', 'AZ', 'OTHER'] },
      { header: 'Zip', field: 'zip', required: false, type: 'string' },
      { header: 'Phone', field: 'phone', required: false, type: 'phone' },
      { header: 'Manager Email', field: 'manager_email', required: false, type: 'email' },
    ],
    exampleRows: [
      ['Downtown Flagship', '123 Main St', 'Los Angeles', 'CA', '90012', '(555) 100-2000', 'manager.downtown@example.com'],
      ['Airport Terminal B', '1 World Way', 'Los Angeles', 'CA', '90045', '(555) 300-4000', 'manager.airport@example.com'],
    ],
  },
};

export function getImportSchema(dataType: ImportDataType): ImportSchema {
  const schema = schemas[dataType];
  if (!schema) {
    throw new Error(`Unknown import data type: ${dataType}`);
  }
  return schema;
}

export function getAllImportSchemas(): ImportSchema[] {
  return Object.values(schemas);
}

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateTemplateCSV(dataType: ImportDataType): string {
  const schema = getImportSchema(dataType);
  const headers = schema.columns.map((col) => escapeCSVField(col.header));
  const lines: string[] = [headers.join(',')];

  for (const row of schema.exampleRows) {
    lines.push(row.map((val) => escapeCSVField(val)).join(','));
  }

  return lines.join('\n');
}
