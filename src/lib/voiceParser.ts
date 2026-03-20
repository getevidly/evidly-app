export type VoiceAction =
  | { type: 'LOG_TEMP'; equipment: string; temperature: number; unit: 'F' | 'C' }
  | { type: 'START_CHECKLIST'; checklistType: 'morning' | 'midday' | 'evening' | 'closing' }
  | { type: 'COMPLETE_ITEM'; itemName: string }
  | { type: 'NEXT_TASK' }
  | { type: 'OPEN_CA'; category: string; description: string }
  | { type: 'RESOLVE_CA' }
  | { type: 'SHIFT_HANDOFF' }
  | { type: 'UNKNOWN'; transcript: string };

// Equipment aliases
const EQUIPMENT_MAP: Record<string, string> = {
  'walk in': 'Walk-in Cooler',
  'walk-in': 'Walk-in Cooler',
  'walkin': 'Walk-in Cooler',
  'walk in cooler': 'Walk-in Cooler',
  'reach in': 'Reach-in Cooler',
  'reach-in': 'Reach-in Cooler',
  'freezer': 'Freezer',
  'steam table': 'Steam Table',
  'hot hold': 'Hot Holding Unit',
  'hot holding': 'Hot Holding Unit',
  'prep table': 'Prep Table',
  'cooler': 'Walk-in Cooler',
  'fridge': 'Reach-in Cooler',
  'refrigerator': 'Reach-in Cooler',
};

// Checklist type aliases
const CHECKLIST_MAP: Record<string, 'morning' | 'midday' | 'evening' | 'closing'> = {
  'morning': 'morning',
  'opening': 'morning',
  'breakfast': 'morning',
  'midday': 'midday',
  'lunch': 'midday',
  'afternoon': 'midday',
  'evening': 'evening',
  'dinner': 'evening',
  'night': 'evening',
  'closing': 'closing',
  'close': 'closing',
  'end of day': 'closing',
};

// CA category aliases
const CA_CATEGORY_MAP: Record<string, string> = {
  'cold holding': 'Cold Holding',
  'cold hold': 'Cold Holding',
  'hot holding': 'Hot Holding',
  'hot hold': 'Hot Holding',
  'temperature': 'Temperature Control',
  'temp': 'Temperature Control',
  'receiving': 'Receiving',
  'pest': 'Pest Control',
  'sanitation': 'Sanitation',
  'equipment': 'Equipment',
  'employee': 'Employee Hygiene',
  'hygiene': 'Employee Hygiene',
  'cross contamination': 'Cross-Contamination',
  'cross-contamination': 'Cross-Contamination',
};

export function parseVoiceCommand(transcript: string): VoiceAction {
  const t = transcript.toLowerCase().trim();

  // LOG TEMP patterns:
  // "log temp walk-in 38"
  // "walk-in cooler 38 degrees"
  // "temperature walk-in 38"
  // "38 degrees walk-in"
  const tempMatch =
    t.match(/(?:log\s+)?(?:temp(?:erature)?\s+)?([a-z\s\-]+?)\s+(\d+(?:\.\d+)?)\s*(?:degrees?|°)?(?:\s*[fc])?/) ||
    t.match(/(\d+(?:\.\d+)?)\s*(?:degrees?|°)?\s+([a-z\s\-]+)/);

  if (tempMatch && (t.includes('temp') || t.includes('degree') || t.includes('log') || t.includes('°'))) {
    let equipmentRaw = '';
    let tempValue = 0;

    if (tempMatch[1] && isNaN(Number(tempMatch[1]))) {
      equipmentRaw = tempMatch[1].trim();
      tempValue = parseFloat(tempMatch[2]);
    } else {
      tempValue = parseFloat(tempMatch[1]);
      equipmentRaw = tempMatch[2]?.trim() ?? '';
    }

    const equipment = EQUIPMENT_MAP[equipmentRaw] ?? titleCase(equipmentRaw);
    if (equipment && tempValue > 0) {
      return { type: 'LOG_TEMP', equipment, temperature: tempValue, unit: 'F' };
    }
  }

  // CHECKLIST patterns
  if (t.includes('checklist') || t.includes('check list')) {
    for (const [key, value] of Object.entries(CHECKLIST_MAP)) {
      if (t.includes(key)) {
        return { type: 'START_CHECKLIST', checklistType: value };
      }
    }
    return { type: 'START_CHECKLIST', checklistType: 'morning' };
  }

  // COMPLETE ITEM patterns
  if (t.includes('mark') || t.includes('complete') || t.includes('done') || t.includes('check off')) {
    const itemMatch = t.match(/(?:mark|complete|done|check\s+off)\s+(?:the\s+)?(.+?)(?:\s+(?:complete|done|as done))?$/);
    if (itemMatch) {
      return { type: 'COMPLETE_ITEM', itemName: titleCase(itemMatch[1]) };
    }
  }

  // NEXT TASK patterns
  if (t.includes('next task') || (t.includes('what') && t.includes('next')) || t.includes('what do i need')) {
    return { type: 'NEXT_TASK' };
  }

  // OPEN CORRECTIVE ACTION patterns
  if (t.includes('corrective action') || t.includes('open issue') || t.includes('flag issue') || t.includes('report issue')) {
    let category = 'General';
    let description = '';

    for (const [key, value] of Object.entries(CA_CATEGORY_MAP)) {
      if (t.includes(key)) {
        category = value;
        break;
      }
    }

    const descMatch = t.match(/(?:corrective action|issue|problem)[,\s]+(?:[a-z\s]+[,\s]+)?(.+)$/);
    if (descMatch) {
      description = titleCase(descMatch[1]);
    }

    return { type: 'OPEN_CA', category, description };
  }

  // RESOLVE CA patterns
  if (t.includes('resolve') || (t.includes('close') && t.includes('action'))) {
    return { type: 'RESOLVE_CA' };
  }

  // SHIFT HANDOFF patterns
  if (t.includes('handoff') || t.includes('hand off') || (t.includes('shift') && (t.includes('done') || t.includes('ready') || t.includes('complete')))) {
    return { type: 'SHIFT_HANDOFF' };
  }

  return { type: 'UNKNOWN', transcript };
}

function titleCase(str: string): string {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}
