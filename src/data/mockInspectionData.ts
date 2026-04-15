// ═══════════════════════════════════════════════════════════════════
// src/data/mockInspectionData.ts
// Demo question bank for the Mock Inspection feature.
// Questions organized by difficulty: routine / focused / critical.
// Citations align with selfInspectionChecklist.ts code bases.
// ═══════════════════════════════════════════════════════════════════

export type MockDifficulty = 'routine' | 'focused' | 'critical';
export type MockCategory = 'food_safety' | 'facility_safety';

export interface MockInspectorQuestion {
  id: string;
  text: string;
  category: MockCategory;
  difficulty: MockDifficulty;
  citation: string;
  expectedAnswer: string;
  violationType: string;
  severity: 'critical' | 'major' | 'minor';
  followUpOnFail: string;
  followUpOnPass: string;
}

export interface MockInspectorIntro {
  difficulty: MockDifficulty;
  greeting: string;
  context: string;
}

// ---------------------------------------------------------------------------
// Inspector Personas
// ---------------------------------------------------------------------------

export const INSPECTOR_INTROS: MockInspectorIntro[] = [
  {
    difficulty: 'routine',
    greeting: "Good morning. I'm here for your routine health inspection.",
    context: "I'll be walking through the standard checklist — temperature controls, employee hygiene, food storage, equipment condition, and fire safety. This should take about 45 minutes. Let's start in the kitchen.",
  },
  {
    difficulty: 'focused',
    greeting: "Good morning. I'm conducting a focused inspection today based on recent activity in your area.",
    context: "I'll be looking specifically at HACCP procedures, cooling protocols, cross-contamination controls, and allergen management. I may ask for documentation. Let's begin.",
  },
  {
    difficulty: 'critical',
    greeting: "Good morning. I'm here for a follow-up inspection regarding reported concerns.",
    context: "I'll need to verify corrective actions from previous violations. I'll be checking imminent health hazard conditions — temperature abuse, contamination, and suppression systems. Please have your records ready.",
  },
];

// ---------------------------------------------------------------------------
// Question Bank
// ---------------------------------------------------------------------------

export const MOCK_QUESTIONS: MockInspectorQuestion[] = [
  // ── ROUTINE (18 questions) ──────────────────────────────────────────

  {
    id: 'r-01',
    text: "Show me the temperature of your walk-in cooler right now. What's it reading?",
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §113996',
    expectedAnswer: 'Below 41°F',
    violationType: 'Cold holding temperature violation',
    severity: 'critical',
    followUpOnFail: "That's above 41°F. How long has it been at this temperature? I'll need to check the items stored inside for potential TCS violations.",
    followUpOnPass: 'Good, temperature is in compliance. Moving on.',
  },
  {
    id: 'r-02',
    text: "Let's check your hot holding station. What temperature are we reading on the soup?",
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §113996',
    expectedAnswer: 'Above 135°F',
    violationType: 'Hot holding temperature violation',
    severity: 'critical',
    followUpOnFail: "That's below the 135°F minimum. When was this food last temperature-checked? This is a critical violation.",
    followUpOnPass: 'Looks good. Hot holding is compliant.',
  },
  {
    id: 'r-03',
    text: 'I need to see your handwashing stations. Are they accessible and properly stocked?',
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §113953',
    expectedAnswer: 'Soap, paper towels, warm water, signage present',
    violationType: 'Handwashing facility deficiency',
    severity: 'major',
    followUpOnFail: "I'm seeing a missing component. Handwash stations must have soap, single-use towels, and warm water at all times during operation.",
    followUpOnPass: 'Stations are properly supplied. Good.',
  },
  {
    id: 'r-04',
    text: 'Can you show me your food handler cards for all employees on shift today?',
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §113948',
    expectedAnswer: 'All staff have valid food handler cards',
    violationType: 'Missing food handler certification',
    severity: 'major',
    followUpOnFail: "I'll need to note which employees are missing valid cards. They have 30 days from hire to obtain certification.",
    followUpOnPass: 'All cards current. Good record-keeping.',
  },
  {
    id: 'r-05',
    text: "Let's look at your dry storage area. Are items stored at least 6 inches off the floor?",
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §114047',
    expectedAnswer: 'All items on shelving, minimum 6 inches from floor',
    violationType: 'Improper food storage',
    severity: 'minor',
    followUpOnFail: "Items must be stored off the floor to prevent contamination and allow for cleaning. I'll mark this as a minor violation.",
    followUpOnPass: 'Storage looks good. Everything is properly elevated.',
  },
  {
    id: 'r-06',
    text: 'Show me your date marking on opened TCS foods in the walk-in.',
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §114059',
    expectedAnswer: 'All opened TCS items labeled with date opened or use-by date',
    violationType: 'Missing date marking on TCS foods',
    severity: 'major',
    followUpOnFail: "Opened TCS foods must be date-marked and used within 7 days. I see containers without dates — those need to be discarded or labeled immediately.",
    followUpOnPass: 'Date marking is compliant. Nice work.',
  },
  {
    id: 'r-07',
    text: "Let's check your sanitizer concentration. What are you using and what's the reading?",
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §114099',
    expectedAnswer: 'Quat sanitizer at 200+ ppm or chlorine at 50-100 ppm',
    violationType: 'Improper sanitizer concentration',
    severity: 'minor',
    followUpOnFail: "The concentration is outside the acceptable range. Adjust it now and re-test with your test strips.",
    followUpOnPass: 'Concentration is within range. Good.',
  },
  {
    id: 'r-08',
    text: 'Can you show me your current health permit? Is it posted where the public can see it?',
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §114381',
    expectedAnswer: 'Current permit posted in a conspicuous location',
    violationType: 'Health permit not displayed',
    severity: 'minor',
    followUpOnFail: "Your permit must be posted where it's visible to the public at all times.",
    followUpOnPass: 'Permit is current and properly displayed.',
  },
  {
    id: 'r-09',
    text: "I'm going to check your cutting boards. Are they in good repair — no deep scoring or staining?",
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §114130',
    expectedAnswer: 'Cutting boards smooth, cleanable, no deep grooves',
    violationType: 'Equipment in disrepair',
    severity: 'minor',
    followUpOnFail: "Deeply scored cutting boards can harbor bacteria. These need to be replaced.",
    followUpOnPass: 'Cutting boards are in good condition.',
  },
  {
    id: 'r-10',
    text: 'Do you have separate cutting boards or procedures to prevent cross-contamination between raw meat and ready-to-eat foods?',
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §113986',
    expectedAnswer: 'Color-coded boards or documented separation procedures',
    violationType: 'Cross-contamination risk',
    severity: 'critical',
    followUpOnFail: "This is a critical violation. Raw proteins must be completely separated from ready-to-eat foods at all times.",
    followUpOnPass: 'Good separation protocol in place.',
  },
  {
    id: 'r-11',
    text: 'I see you have a hood system. When was your last kitchen exhaust cleaning?',
    category: 'facility_safety',
    difficulty: 'routine',
    citation: 'NFPA 96-2024 Table 12.4',
    expectedAnswer: 'Within the required frequency for cooking volume',
    violationType: 'Hood cleaning overdue',
    severity: 'major',
    followUpOnFail: "Your hood cleaning is overdue per NFPA 96 Table 12.4. This needs to be scheduled immediately.",
    followUpOnPass: 'Hood cleaning is current. Can I see the service certificate?',
  },
  {
    id: 'r-12',
    text: "Let's check your fire suppression system. When was the last service?",
    category: 'facility_safety',
    difficulty: 'routine',
    citation: 'NFPA 96 Chapter 10 / NFPA 17A',
    expectedAnswer: 'Serviced within the last 6 months with valid tag',
    violationType: 'Suppression system service overdue',
    severity: 'major',
    followUpOnFail: "The Ansul system must be inspected semi-annually. An overdue system is a major fire safety violation.",
    followUpOnPass: 'Service tag is current. Good.',
  },
  {
    id: 'r-13',
    text: 'Are your grease filters clean and properly seated in the hood?',
    category: 'facility_safety',
    difficulty: 'routine',
    citation: 'NFPA 96 Chapter 9',
    expectedAnswer: 'Filters clean, properly installed, no gaps',
    violationType: 'Grease filter maintenance deficiency',
    severity: 'minor',
    followUpOnFail: "Filters need to be cleaned or replaced. Gaps allow grease to bypass the filtration system.",
    followUpOnPass: 'Filters look clean and properly installed.',
  },
  {
    id: 'r-14',
    text: 'Any evidence of pest activity — droppings, gnaw marks, nesting, live pests?',
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §114259',
    expectedAnswer: 'No evidence of pest activity',
    violationType: 'Evidence of pest activity',
    severity: 'major',
    followUpOnFail: "I'm seeing signs of pest activity. When was your last pest control service? I'll need to see the reports.",
    followUpOnPass: 'No pest activity observed. Good.',
  },
  {
    id: 'r-15',
    text: 'Are your restrooms clean, stocked with soap and towels, and equipped with self-closing doors?',
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §114250',
    expectedAnswer: 'Clean, stocked, self-closing doors functional',
    violationType: 'Restroom maintenance deficiency',
    severity: 'minor',
    followUpOnFail: "Restrooms must be maintained in good repair with supplies at all times.",
    followUpOnPass: 'Restrooms are clean and properly stocked.',
  },
  {
    id: 'r-16',
    text: "Let's check your thermometer calibration. Can you demonstrate it in an ice bath?",
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §114157',
    expectedAnswer: 'Thermometer reads 32°F ± 2° in ice water slurry',
    violationType: 'Thermometer not calibrated',
    severity: 'major',
    followUpOnFail: "Thermometers must be calibrated to read accurately. This one needs recalibration before use.",
    followUpOnPass: 'Reading is accurate. Calibration confirmed.',
  },
  {
    id: 'r-17',
    text: 'Is there proper ventilation in your cooking area? Any excessive grease buildup on walls or ceiling?',
    category: 'facility_safety',
    difficulty: 'routine',
    citation: 'CalCode §114149',
    expectedAnswer: 'Adequate ventilation, no excessive grease buildup',
    violationType: 'Inadequate ventilation / excessive grease',
    severity: 'minor',
    followUpOnFail: "Grease accumulation on surfaces beyond the hood area indicates ventilation issues. This needs to be addressed.",
    followUpOnPass: 'Ventilation appears adequate. No excessive buildup.',
  },
  {
    id: 'r-18',
    text: 'Show me your employee illness policy. Do staff know to report symptoms of vomiting, diarrhea, or jaundice?',
    category: 'food_safety',
    difficulty: 'routine',
    citation: 'CalCode §113949.5',
    expectedAnswer: 'Written policy available, staff trained on reporting requirements',
    violationType: 'Missing employee health policy',
    severity: 'major',
    followUpOnFail: "You must have a written employee health policy and ensure all staff are trained to report illness symptoms.",
    followUpOnPass: 'Policy is in place. Good.',
  },

  // ── FOCUSED (12 questions) ──────────────────────────────────────────

  {
    id: 'f-01',
    text: "Walk me through your cooling procedure. How do you cool a batch of soup from 135°F? Show me the log.",
    category: 'food_safety',
    difficulty: 'focused',
    citation: 'CalCode §114002',
    expectedAnswer: '135°F → 70°F in 2 hours, then 70°F → 41°F in 4 more hours',
    violationType: 'Improper cooling procedure',
    severity: 'critical',
    followUpOnFail: "Your cooling times exceed the two-stage requirement. This is a critical violation — food held in the danger zone too long supports pathogen growth.",
    followUpOnPass: 'Cooling procedure is compliant. Good documentation.',
  },
  {
    id: 'f-02',
    text: 'I want to see your HACCP plan. Do you have one, and when was it last reviewed?',
    category: 'food_safety',
    difficulty: 'focused',
    citation: 'CalCode §114419',
    expectedAnswer: 'Written HACCP plan, reviewed within last 12 months',
    violationType: 'Missing or outdated HACCP plan',
    severity: 'major',
    followUpOnFail: "A HACCP plan is required for specialized processes. It must be current and accessible.",
    followUpOnPass: 'HACCP plan is current. Let me review the critical control points.',
  },
  {
    id: 'f-03',
    text: "Let's trace your chicken from receiving to plate. What's the receiving temperature requirement, and how do you verify it?",
    category: 'food_safety',
    difficulty: 'focused',
    citation: 'CalCode §113996',
    expectedAnswer: 'Received at 41°F or below, verified with calibrated thermometer, logged',
    violationType: 'Receiving temperature not verified',
    severity: 'critical',
    followUpOnFail: "You must verify receiving temperatures for all TCS foods and reject shipments that arrive above safe temperatures.",
    followUpOnPass: 'Good receiving protocol. Show me today\'s receiving log.',
  },
  {
    id: 'f-04',
    text: 'How do you handle allergen cross-contact during prep? Show me your procedures for the top 9 allergens.',
    category: 'food_safety',
    difficulty: 'focused',
    citation: 'CalCode §114090.5',
    expectedAnswer: 'Separate prep areas or thorough cleaning between allergens, staff trained, allergen matrix posted',
    violationType: 'Inadequate allergen controls',
    severity: 'major',
    followUpOnFail: "Allergen cross-contact can be life-threatening. You need documented procedures and staff training.",
    followUpOnPass: 'Allergen controls look solid. Staff seems well-trained.',
  },
  {
    id: 'f-05',
    text: "Show me your probe thermometer. Let's verify the internal temperature of that chicken breast on the grill.",
    category: 'food_safety',
    difficulty: 'focused',
    citation: 'CalCode §114004',
    expectedAnswer: 'Poultry cooked to minimum 165°F for 15 seconds',
    violationType: 'Inadequate cooking temperature',
    severity: 'critical',
    followUpOnFail: "Poultry must reach 165°F minimum. Undercooked poultry is an imminent health hazard.",
    followUpOnPass: 'Temperature confirms proper cooking. Good.',
  },
  {
    id: 'f-06',
    text: "Let's look at your reheating procedures. If you reheat leftover chili, what temperature must it reach?",
    category: 'food_safety',
    difficulty: 'focused',
    citation: 'CalCode §114016',
    expectedAnswer: 'Reheated to 165°F within 2 hours for hot holding',
    violationType: 'Improper reheating',
    severity: 'critical',
    followUpOnFail: "Food reheated for hot holding must reach 165°F within 2 hours. Slow reheating in a steam table is not acceptable.",
    followUpOnPass: 'Correct. Your staff knows the reheating requirements.',
  },
  {
    id: 'f-07',
    text: 'Do you use the time-as-a-control method for any items? If so, show me your documentation.',
    category: 'food_safety',
    difficulty: 'focused',
    citation: 'CalCode §114002',
    expectedAnswer: 'Written procedures, 4-hour time limit marked, items discarded after limit',
    violationType: 'Time-as-control not properly documented',
    severity: 'major',
    followUpOnFail: "If using TPHC, you must have written procedures, mark the start time, and discard items after 4 hours.",
    followUpOnPass: 'Time-as-control documentation is compliant.',
  },
  {
    id: 'f-08',
    text: 'Walk me through how you clean and sanitize your food contact surfaces between tasks.',
    category: 'food_safety',
    difficulty: 'focused',
    citation: 'CalCode §114099',
    expectedAnswer: 'Wash, rinse, sanitize, air dry — using approved sanitizer at correct concentration',
    violationType: 'Improper cleaning/sanitizing procedure',
    severity: 'major',
    followUpOnFail: "The four-step process is required: wash, rinse, sanitize, air dry. Wiping with a towel is not sufficient.",
    followUpOnPass: 'Good cleaning and sanitizing procedure.',
  },
  {
    id: 'f-09',
    text: "I'm looking at your hood suppression nozzles. Are they clear of grease buildup and properly aimed at the cooking surfaces?",
    category: 'facility_safety',
    difficulty: 'focused',
    citation: 'NFPA 96 Chapter 10',
    expectedAnswer: 'Nozzles clear, properly aimed, blow-off caps in place',
    violationType: 'Suppression nozzle obstruction',
    severity: 'major',
    followUpOnFail: "Obstructed nozzles may prevent the suppression system from functioning in a fire. This needs immediate correction.",
    followUpOnPass: 'Nozzles are clear and properly positioned.',
  },
  {
    id: 'f-10',
    text: "Let's verify your K-class fire extinguisher. Is it charged, accessible, and within the service date?",
    category: 'facility_safety',
    difficulty: 'focused',
    citation: 'NFPA 96 §10.7',
    expectedAnswer: 'K-class extinguisher charged, accessible within 30 feet, annual service current',
    violationType: 'Fire extinguisher deficiency',
    severity: 'major',
    followUpOnFail: "A charged, serviced K-class extinguisher must be within 30 feet of cooking equipment at all times.",
    followUpOnPass: 'Extinguisher is compliant and accessible.',
  },
  {
    id: 'f-11',
    text: 'Show me your Certified Food Protection Manager credential. Is there at least one CFPM on-site during all operating hours?',
    category: 'food_safety',
    difficulty: 'focused',
    citation: 'CalCode §113947',
    expectedAnswer: 'Valid CFPM certificate, CFPM present during all operating hours',
    violationType: 'No CFPM on duty',
    severity: 'major',
    followUpOnFail: "A Certified Food Protection Manager must be present during all hours of operation.",
    followUpOnPass: 'CFPM credential is current. Good.',
  },
  {
    id: 'f-12',
    text: "I want to see your vendor COI — certificate of insurance — for your hood cleaning company. Is it current?",
    category: 'facility_safety',
    difficulty: 'focused',
    citation: 'NFPA 96-2024 Table 12.4',
    expectedAnswer: 'Current COI on file with adequate coverage limits',
    violationType: 'Vendor insurance documentation missing',
    severity: 'minor',
    followUpOnFail: "You should maintain current certificates of insurance for all service vendors. This protects your operation.",
    followUpOnPass: 'Vendor documentation is current.',
  },

  // ── CRITICAL (10 questions) ─────────────────────────────────────────

  {
    id: 'c-01',
    text: "I'm checking your walk-in cooler and I'm reading 52°F. When did you first notice this temperature?",
    category: 'food_safety',
    difficulty: 'critical',
    citation: 'CalCode §113996',
    expectedAnswer: 'Immediately relocate TCS foods, determine how long above 41°F, discard if over 4 hours',
    violationType: 'Imminent health hazard — temperature abuse',
    severity: 'critical',
    followUpOnFail: "This is an imminent health hazard. All TCS food that has been above 41°F for more than 4 hours must be discarded. Show me your corrective action now.",
    followUpOnPass: 'You identified the issue and took appropriate corrective action. Document everything.',
  },
  {
    id: 'c-02',
    text: "I'm observing a line cook who just handled raw chicken and is now touching ready-to-eat lettuce without washing hands. What do you do?",
    category: 'food_safety',
    difficulty: 'critical',
    citation: 'CalCode §113953.3',
    expectedAnswer: 'Stop the employee immediately, discard contaminated food, retrain on handwashing requirements',
    violationType: 'Bare hand contact / cross-contamination — imminent health hazard',
    severity: 'critical',
    followUpOnFail: "This is a critical violation. Contaminated ready-to-eat food must be discarded immediately. The employee must wash hands and change gloves before continuing.",
    followUpOnPass: 'Correct response. Document the incident and the corrective action taken.',
  },
  {
    id: 'c-03',
    text: 'I see evidence of a sewage backup near your prep area. What happened and what have you done?',
    category: 'food_safety',
    difficulty: 'critical',
    citation: 'CalCode §114259.4',
    expectedAnswer: 'Cease operations in affected area, contact plumber, sanitize all surfaces, discard exposed food',
    violationType: 'Sewage / contamination event — imminent health hazard',
    severity: 'critical',
    followUpOnFail: "A sewage event near food prep is an imminent health hazard. Operations in the affected area must cease until the issue is resolved and surfaces are sanitized.",
    followUpOnPass: 'You responded correctly. I need to verify the area is fully remediated before operations resume.',
  },
  {
    id: 'c-04',
    text: "Your Ansul system tag shows it hasn't been serviced in 14 months. This is a fire safety emergency. What's your plan?",
    category: 'facility_safety',
    difficulty: 'critical',
    citation: 'NFPA 96 Chapter 10 / NFPA 17A',
    expectedAnswer: 'Schedule immediate service, document the lapse, consider temporary operational changes',
    violationType: 'Suppression system critically overdue',
    severity: 'critical',
    followUpOnFail: "An overdue suppression system can result in immediate closure. You must get this serviced before I leave, or I may need to restrict cooking operations.",
    followUpOnPass: 'Schedule that service today. I\'ll note the lapse but your awareness helps.',
  },
  {
    id: 'c-05',
    text: "I found a container of an unknown white powder on the prep shelf next to food items. What is it?",
    category: 'food_safety',
    difficulty: 'critical',
    citation: 'CalCode §114254',
    expectedAnswer: 'Identify immediately, remove from food area, all chemicals must be labeled and stored below/away from food',
    violationType: 'Toxic substance improperly stored near food',
    severity: 'critical',
    followUpOnFail: "Chemicals must never be stored above or adjacent to food, equipment, or single-service articles. This is a critical violation.",
    followUpOnPass: 'Good — chemicals must always be properly labeled and stored in designated areas.',
  },
  {
    id: 'c-06',
    text: "An employee just told me they've been vomiting since last night but came in because you're short-staffed. What do you do?",
    category: 'food_safety',
    difficulty: 'critical',
    citation: 'CalCode §113949.5',
    expectedAnswer: 'Immediately exclude the employee from the facility, document the report, sanitize their work area',
    violationType: 'Ill employee working with food — imminent health hazard',
    severity: 'critical',
    followUpOnFail: "An employee with vomiting or diarrhea must be excluded from the food establishment. This is an imminent health hazard.",
    followUpOnPass: 'Correct — the employee must leave immediately and cannot return until symptom-free for 24 hours.',
  },
  {
    id: 'c-07',
    text: "I'm pulling temperature on your steam table chicken and getting 112°F. It's been sitting there since lunch service started 3 hours ago.",
    category: 'food_safety',
    difficulty: 'critical',
    citation: 'CalCode §113996',
    expectedAnswer: 'Discard the food, investigate why steam table failed, verify equipment functionality',
    violationType: 'Hot holding failure — imminent health hazard',
    severity: 'critical',
    followUpOnFail: "Food at 112°F for 3 hours is in the danger zone. This food must be discarded. There's no corrective action that can save it.",
    followUpOnPass: 'Correct — that food cannot be saved. Document the discard and check your steam table calibration.',
  },
  {
    id: 'c-08',
    text: "Your hood system is heavily loaded with grease. I can see visible dripping from the ductwork. How long since the last cleaning?",
    category: 'facility_safety',
    difficulty: 'critical',
    citation: 'NFPA 96-2024 Table 12.4',
    expectedAnswer: 'Schedule emergency cleaning, consider reducing cooking operations until resolved',
    violationType: 'Excessive grease accumulation — fire hazard',
    severity: 'critical',
    followUpOnFail: "Visible grease dripping from ductwork is an extreme fire hazard. I may need to restrict cooking operations until an emergency cleaning is performed.",
    followUpOnPass: 'Schedule the cleaning immediately. This level of accumulation is dangerous.',
  },
  {
    id: 'c-09',
    text: 'I found live cockroaches in your dry storage area near open food containers. What action will you take?',
    category: 'food_safety',
    difficulty: 'critical',
    citation: 'CalCode §114259',
    expectedAnswer: 'Discard exposed food, contact pest control immediately, deep clean the area',
    violationType: 'Active pest infestation — imminent health hazard',
    severity: 'critical',
    followUpOnFail: "An active cockroach infestation near open food is an imminent health hazard. Exposed food must be discarded. Emergency pest control is required.",
    followUpOnPass: 'Correct response. I\'ll need to see the pest control follow-up report within 48 hours.',
  },
  {
    id: 'c-10',
    text: "I'm checking your previous inspection report and you had 3 critical violations that were supposed to be corrected within 72 hours. Show me your documentation of corrections.",
    category: 'food_safety',
    difficulty: 'critical',
    citation: 'CalCode §114390',
    expectedAnswer: 'Documented corrective actions with dates, photos, and verification',
    violationType: 'Failure to correct previous violations',
    severity: 'critical',
    followUpOnFail: "Failure to correct critical violations within the specified timeframe is itself a violation and may result in enforcement action, including potential closure.",
    followUpOnPass: 'Good — all previous violations have been addressed and documented.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get questions for a specific difficulty level */
export function getQuestionsForDifficulty(difficulty: MockDifficulty): MockInspectorQuestion[] {
  return MOCK_QUESTIONS.filter(q => q.difficulty === difficulty);
}

/** Get a shuffled subset of questions for a mock inspection session */
export function selectInspectionQuestions(
  difficulty: MockDifficulty,
  maxQuestions?: number,
): MockInspectorQuestion[] {
  const pool = getQuestionsForDifficulty(difficulty);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return maxQuestions ? shuffled.slice(0, maxQuestions) : shuffled;
}

/** Get the inspector intro for a difficulty level */
export function getInspectorIntro(difficulty: MockDifficulty): MockInspectorIntro {
  return INSPECTOR_INTROS.find(i => i.difficulty === difficulty) || INSPECTOR_INTROS[0];
}

/** Question count per difficulty */
export const DIFFICULTY_COUNTS: Record<MockDifficulty, number> = {
  routine: 18,
  focused: 12,
  critical: 10,
};

/** Difficulty display info */
export const DIFFICULTY_INFO: Record<MockDifficulty, { label: string; description: string; color: string; bgColor: string }> = {
  routine: {
    label: 'Routine',
    description: 'Standard health inspection — covers all major areas.',
    color: '#166534',
    bgColor: '#F0FDF4',
  },
  focused: {
    label: 'Focused',
    description: 'Targeted deep-dive on HACCP, cooling, and cross-contamination.',
    color: '#92400E',
    bgColor: '#FFFBEB',
  },
  critical: {
    label: 'Critical',
    description: 'Follow-up inspection — verifying corrections and imminent hazards.',
    color: '#991B1B',
    bgColor: '#FEF2F2',
  },
};
