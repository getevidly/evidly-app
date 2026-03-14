import { useState } from 'react';

interface ReportSystem {
  id: string;
  report_id: string;
  system_number: number;
  location_name: string;
  grease_levels: Record<string, unknown>;
  hood_data: Record<string, unknown>;
  filter_data: Record<string, unknown>;
  duct_data: Record<string, unknown>;
  fan_mechanical: Record<string, unknown>;
  fan_electrical: Record<string, unknown>;
  solid_fuel: Record<string, unknown>;
  post_cleaning: Record<string, unknown>;
}

const DEMO_SYSTEMS: ReportSystem[] = [
  {
    id: 'sys1',
    report_id: 'sr1',
    system_number: 1,
    location_name: 'Main Cook Line Hood',
    grease_levels: {
      hood_interior: 'heavy',
      filters: 'moderate',
      duct_horizontal: 'light',
      duct_vertical: 'heavy',
      fan: 'moderate',
    },
    hood_data: {
      hood_type: 'Type I',
      hood_length: '12 ft',
      hood_material: 'Stainless Steel',
      listed_hood: true,
      condition: 'Good',
    },
    filter_data: {
      filter_type: 'Baffle',
      filter_count: 6,
      condition: 'Fair',
      properly_seated: true,
      damaged: false,
    },
    duct_data: {
      duct_material: 'Carbon Steel',
      access_panels: 3,
      access_panels_functional: 2,
      clearance_adequate: true,
    },
    fan_mechanical: {
      fan_type: 'Upblast',
      hinge_kit: true,
      grease_containment: 'Cup',
      belt_condition: 'Good',
    },
    fan_electrical: {
      disconnect_accessible: true,
      wiring_condition: 'Good',
    },
    solid_fuel: {},
    post_cleaning: {},
  },
  {
    id: 'sys2',
    report_id: 'sr1',
    system_number: 2,
    location_name: 'Pizza Oven Hood',
    grease_levels: {
      hood_interior: 'light',
      filters: 'light',
      duct_horizontal: 'bare_metal',
      duct_vertical: 'light',
      fan: 'light',
    },
    hood_data: {
      hood_type: 'Type I',
      hood_length: '6 ft',
      hood_material: 'Stainless Steel',
      listed_hood: true,
      condition: 'Excellent',
    },
    filter_data: {
      filter_type: 'Baffle',
      filter_count: 3,
      condition: 'Good',
      properly_seated: true,
      damaged: false,
    },
    duct_data: {
      duct_material: 'Carbon Steel',
      access_panels: 2,
      access_panels_functional: 2,
      clearance_adequate: true,
    },
    fan_mechanical: {
      fan_type: 'Upblast',
      hinge_kit: true,
      grease_containment: 'Cup',
      belt_condition: 'Good',
    },
    fan_electrical: {
      disconnect_accessible: true,
      wiring_condition: 'Good',
    },
    solid_fuel: {
      solid_fuel_present: true,
      fuel_type: 'Wood',
      spark_arrestor: true,
      ash_removal: 'Daily',
    },
    post_cleaning: {},
  },
];

export function useReportSystems() {
  const [systems] = useState<ReportSystem[]>(DEMO_SYSTEMS);

  return {
    systems,
    getSystemsByReport: (reportId: string) => systems.filter(s => s.report_id === reportId),
    addSystem: async (_reportId: string, _data: Partial<ReportSystem>) => {
      throw new Error('Not implemented in demo mode');
    },
    updateSystem: async (_id: string, _data: Partial<ReportSystem>) => {
      throw new Error('Not implemented in demo mode');
    },
    updateSectionData: async (_systemId: string, _section: string, _data: Record<string, unknown>) => {
      throw new Error('Not implemented in demo mode');
    },
    removeSystem: async (_id: string) => {
      throw new Error('Not implemented in demo mode');
    },
    loading: false,
  };
}
