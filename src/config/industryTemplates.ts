export interface TemplateItem {
  name: string;
  enabled: boolean;
  required: boolean;
  category: 'temperature_logs' | 'checklists' | 'vendor_services' | 'documents';
}

export interface IndustryTemplate {
  name: string;
  items: TemplateItem[];
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  'restaurant-full': {
    name: 'Restaurant (Full-Service)',
    items: [
      { name: 'Walk-in Cooler (32-41°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Walk-in Freezer (-10-0°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Prep Cooler (32-41°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Hot Holding (135°F+)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Opening Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Closing Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Receiving Temp Log', enabled: true, required: true, category: 'checklists' },
      { name: 'Hood Cleaning (90-day cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Fire Suppression (6-month cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Grease Trap/Interceptor (90-day cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Health Permit', enabled: true, required: true, category: 'documents' },
      { name: 'Business License', enabled: true, required: true, category: 'documents' },
      { name: 'Food Handler Certifications', enabled: true, required: true, category: 'documents' },
      { name: 'COI (Certificate of Insurance)', enabled: true, required: true, category: 'documents' },
      { name: 'Liquor License (if applicable)', enabled: false, required: false, category: 'documents' },
      { name: 'Certificate of Occupancy (if applicable)', enabled: false, required: false, category: 'documents' },
    ]
  },
  'restaurant-quick': {
    name: 'Restaurant (Quick-Service)',
    items: [
      { name: 'Walk-in Cooler (32-41°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Walk-in Freezer (-10-0°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Prep Cooler (32-41°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Opening Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Closing Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Receiving Temp Log', enabled: true, required: true, category: 'checklists' },
      { name: 'Hood Cleaning (90-day cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Fire Suppression (6-month cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Health Permit', enabled: true, required: true, category: 'documents' },
      { name: 'Business License', enabled: true, required: true, category: 'documents' },
      { name: 'Food Handler Certifications', enabled: true, required: true, category: 'documents' },
      { name: 'COI (Certificate of Insurance)', enabled: true, required: true, category: 'documents' },
      { name: 'Grease Trap/Interceptor (if applicable)', enabled: false, required: false, category: 'vendor_services' },
      { name: 'Liquor License (if applicable)', enabled: false, required: false, category: 'documents' },
      { name: 'Certificate of Occupancy (if applicable)', enabled: false, required: false, category: 'documents' },
    ]
  },
  'hotel': {
    name: 'Hotel',
    items: [
      { name: 'Walk-in Cooler (32-41°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Walk-in Freezer (-10-0°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Prep Cooler (32-41°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Hot Holding (135°F+)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Banquet Hot Boxes', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Room Service Hot Boxes', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Opening Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Closing Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Receiving Temp Log', enabled: true, required: true, category: 'checklists' },
      { name: 'Banquet Event Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Hood Cleaning (90-day cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Fire Suppression (6-month cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Grease Trap/Interceptor (90-day cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Health Permit', enabled: true, required: true, category: 'documents' },
      { name: 'Business License', enabled: true, required: true, category: 'documents' },
      { name: 'Food Handler Certifications', enabled: true, required: true, category: 'documents' },
      { name: 'COI (Certificate of Insurance)', enabled: true, required: true, category: 'documents' },
      { name: 'Pool/Spa Health Permit (if applicable)', enabled: false, required: false, category: 'documents' },
      { name: 'Liquor License (if applicable)', enabled: false, required: false, category: 'documents' },
    ]
  },
  'healthcare': {
    name: 'Healthcare / Senior Living',
    items: [
      { name: 'Walk-in Cooler (32-41°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Walk-in Freezer (-10-0°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Prep Cooler (32-41°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Hot Holding (135°F+)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Patient Meal Temperature Log', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Opening Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Closing Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Receiving Temp Log', enabled: true, required: true, category: 'checklists' },
      { name: 'Dietary Restriction Tracking', enabled: true, required: true, category: 'checklists' },
      { name: 'Allergen Documentation', enabled: true, required: true, category: 'checklists' },
      { name: 'Therapeutic Diet Compliance', enabled: true, required: true, category: 'checklists' },
      { name: 'Hood Cleaning (90-day cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Fire Suppression (6-month cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Grease Trap/Interceptor (90-day cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Health Permit', enabled: true, required: true, category: 'documents' },
      { name: 'Business License', enabled: true, required: true, category: 'documents' },
      { name: 'Food Handler Certifications', enabled: true, required: true, category: 'documents' },
      { name: 'COI (Certificate of Insurance)', enabled: true, required: true, category: 'documents' },
      { name: 'Pharmacy Refrigerator Logs (if applicable)', enabled: false, required: false, category: 'temperature_logs' },
      { name: 'Liquor License (if applicable)', enabled: false, required: false, category: 'documents' },
    ]
  },
  'education': {
    name: 'Education (K-12)',
    items: [
      { name: 'Walk-in Cooler (32-41°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Walk-in Freezer (-10-0°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Prep Cooler (32-41°F)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Hot Holding (135°F+)', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Opening Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Closing Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Receiving Temp Log', enabled: true, required: true, category: 'checklists' },
      { name: 'USDA Compliance Documentation', enabled: true, required: true, category: 'checklists' },
      { name: 'Hood Cleaning (90-day cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Fire Suppression (6-month cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Grease Trap/Interceptor (90-day cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Health Permit', enabled: true, required: true, category: 'documents' },
      { name: 'Business License', enabled: true, required: true, category: 'documents' },
      { name: 'Food Handler Certifications', enabled: true, required: true, category: 'documents' },
      { name: 'COI (Certificate of Insurance)', enabled: true, required: true, category: 'documents' },
      { name: 'Free/Reduced Meal Program Tracking (if applicable)', enabled: false, required: false, category: 'checklists' },
      { name: 'Farm to School Documentation (if applicable)', enabled: false, required: false, category: 'documents' },
    ]
  },
  'catering': {
    name: 'Catering',
    items: [
      { name: 'Transport Coolers', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Hot Boxes', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Off-site Temperature Logs', enabled: true, required: true, category: 'temperature_logs' },
      { name: 'Opening Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Closing Checklist', enabled: true, required: true, category: 'checklists' },
      { name: 'Event Checklists', enabled: true, required: true, category: 'checklists' },
      { name: 'Hood Cleaning (90-day cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Fire Suppression (6-month cycle)', enabled: true, required: true, category: 'vendor_services' },
      { name: 'Health Permit', enabled: true, required: true, category: 'documents' },
      { name: 'Business License', enabled: true, required: true, category: 'documents' },
      { name: 'Food Handler Certifications', enabled: true, required: true, category: 'documents' },
      { name: 'COI (Certificate of Insurance)', enabled: true, required: true, category: 'documents' },
      { name: 'Commissary Kitchen Permit (if applicable)', enabled: false, required: false, category: 'documents' },
      { name: 'Liquor License (if applicable)', enabled: false, required: false, category: 'documents' },
    ]
  },
};

export const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    temperature_logs: 'Temperature Monitoring',
    checklists: 'Daily Operations',
    vendor_services: 'Vendor Services',
    documents: 'Documentation',
  };
  return labels[category] || category;
};
