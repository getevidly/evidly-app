export interface TemperatureEquipment {
  id: string;
  name: string;
  equipment_type: string;
  min_temp: number;
  max_temp: number;
  unit: string;
  location?: string;
  last_check?: {
    temperature_value: number;
    created_at: string;
    is_within_range: boolean;
    recorded_by_name?: string;
  };
}

export interface User {
  id: string;
  full_name: string;
}

export interface Cooldown {
  id: string;
  itemName: string;
  startTemp: number;
  startTime: Date;
  location: string;
  startedBy: string;
  checks: CooldownCheck[];
  status: 'active' | 'completed' | 'failed';
  completedAt?: Date;
}

export interface CooldownCheck {
  temperature: number;
  time: Date;
}

export type ReadingMethod = 'manual_thermometer' | 'infrared_gun' | 'other';

export type CategoryTempConfig = Record<string, { tempRequired: boolean; maxTemp?: number; label: string }>;
