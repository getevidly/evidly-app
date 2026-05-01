// ── Equipment Classification Helpers ─────────────────────────
// Centralised type predicates for temperature_equipment rows.

export const STORAGE_TYPES = ['storage_cold', 'storage_frozen', 'cooler', 'freezer'];
export const HOLDING_COLD_TYPES = ['holding_cold', 'cold_holding', 'salad_bar', 'sandwich_station'];
export const HOLDING_HOT_TYPES = ['holding_hot', 'hot_hold', 'hot_holding', 'steam_table', 'soup_well', 'salamander'];
export const HOLDING_TYPES = [...HOLDING_COLD_TYPES, ...HOLDING_HOT_TYPES];

export const isStorageEquipment = (type: string) => STORAGE_TYPES.includes(type);
export const isHoldingEquipment = (type: string) => HOLDING_TYPES.includes(type);
export const isHoldingCold = (type: string) => HOLDING_COLD_TYPES.includes(type);
export const isHoldingHot = (type: string) => HOLDING_HOT_TYPES.includes(type);
export const isFreezerType = (type: string) => type === 'storage_frozen' || type === 'freezer';
