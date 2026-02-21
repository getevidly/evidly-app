export interface DiagnosisCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface DiagnosisResult {
  id: string;
  title: string;
  severity: 'critical' | 'urgent' | 'warning' | 'info';
  equipment: string;
  description: string;
  likelyCauses: string[];
  immediateSteps: string[];
  preventionSteps: string[];
  whenToCallProfessional: string;
  regulatoryNote?: string;
  estimatedDIYTime: string;
  estimatedRepairCost: string;
  cppService?: string;
}

export interface DiagnosisOption {
  label: string;
  next: DiagnosisResult | { question: string; options: DiagnosisOption[] };
}

export interface DiagnosisNode {
  question: string;
  options: DiagnosisOption[];
}

export const DIAGNOSIS_CATEGORIES: DiagnosisCategory[] = [
  { id: 'hood',             label: 'Hood & Exhaust',      icon: '\uD83D\uDCA8', description: 'Hood not pulling, fan noise, smoke backup, airflow issues' },
  { id: 'fire_suppression', label: 'Fire Suppression',    icon: '\uD83D\uDD25', description: 'Extinguisher, suppression system, alarms, nozzles' },
  { id: 'refrigeration',    label: 'Refrigeration',       icon: '\u2744\uFE0F', description: 'Walk-in, reach-in, freezer, ice machine issues' },
  { id: 'cooking',          label: 'Cooking Equipment',   icon: '\uD83C\uDF73', description: 'Fryer, oven, grill, range, steam table problems' },
  { id: 'grease_drain',     label: 'Grease & Drainage',   icon: '\uD83D\uDEE2\uFE0F', description: 'Grease trap, floor drain, drain backup, grease buildup' },
  { id: 'rooftop',          label: 'Rooftop',             icon: '\uD83C\uDFD7\uFE0F', description: 'Roof leak, grease on roof, fan access, containment' },
  { id: 'hvac',             label: 'HVAC & Ventilation',  icon: '\uD83C\uDF2C\uFE0F', description: 'Air conditioning, heating, make-up air, ventilation issues' },
  { id: 'pest',             label: 'Pest Issues',         icon: '\uD83D\uDC1B', description: 'Sightings, evidence of infestation, entry points' },
  { id: 'plumbing',         label: 'Plumbing',            icon: '\uD83D\uDD27', description: 'Leaks, low pressure, hot water, backups' },
];

export const DIAGNOSIS_PRIORITY_MAP: Record<string, 'critical' | 'high' | 'medium'> = {
  hood: 'critical',
  fire_suppression: 'critical',
  refrigeration: 'critical',
  grease_drain: 'critical',
  plumbing: 'high',
  pest: 'high',
  rooftop: 'high',
  cooking: 'medium',
  hvac: 'medium',
};

export const DECISION_TREE: Record<string, DiagnosisNode> = {
  hood: {
    question: 'What are you observing with the hood and exhaust system?',
    options: [
      { label: 'Exhaust fan not running at all', next: {
        id: 'fan_dead', title: 'Exhaust Fan Complete Failure', severity: 'critical',
        equipment: 'Exhaust Fan',
        description: 'A non-functioning exhaust fan means the hood system cannot capture heat, smoke, or grease-laden vapors. Cooking under a non-functional hood is a fire code violation.',
        likelyCauses: ['Belt snapped or slipped off pulleys', 'Motor failure (bearing seizure or electrical)', 'Circuit breaker tripped', 'Electrical connection failure at disconnect switch'],
        immediateSteps: ['Stop cooking under affected hoods immediately', 'Check circuit breaker panel \u2014 reset if tripped', 'Check fan disconnect switch on roof (if accessible)', 'Do NOT attempt to cook without exhaust \u2014 fire code violation', 'Call vendor for emergency service'],
        preventionSteps: ['Quarterly fan performance inspection including belt and bearing check', 'Annual professional exhaust system service'],
        whenToCallProfessional: 'Immediately. Kitchen cannot operate without exhaust.',
        regulatoryNote: 'NFPA 96 (2024) Chapter 11 requires functional exhaust during cooking operations. Verify specific requirements with your AHJ.',
        estimatedDIYTime: '5 minutes for breaker check',
        estimatedRepairCost: 'Belt replacement: $150\u2013$400. Motor replacement: $800\u2013$3,000. Emergency service premium: $150\u2013$300.',
        cppService: 'Fan Performance Management',
      }},
      { label: 'Fan is running but hood is not pulling smoke', next: {
        id: 'weak_capture', title: 'Weak Hood Capture \u2014 Smoke Not Being Pulled', severity: 'urgent',
        equipment: 'Hood / Exhaust System',
        description: 'The fan is running but smoke, heat, or steam is escaping the hood. This indicates reduced airflow \u2014 the system is not capturing at the required velocity.',
        likelyCauses: ['Heavily soiled filters restricting airflow', 'Belt slipping (fan running but not at full RPM)', 'Ductwork obstruction or grease accumulation', 'Make-up air imbalance creating competing pressure'],
        immediateSteps: ['Check and clean hood filters \u2014 if heavily soiled, this is the most likely cause', 'Reduce cooking intensity on affected section until resolved', 'Check if other fans or HVAC are creating competing airflow', 'Schedule service if filter cleaning does not resolve'],
        preventionSteps: ['Clean hood filters daily or per shift', 'Regular filter exchange service', 'Hood and duct cleaning per NFPA 96 (2024) Table 12.4 schedule'],
        whenToCallProfessional: 'Within 24 hours if filter cleaning does not resolve.',
        regulatoryNote: 'NFPA 96 (2024) Chapter 11 covers air movement requirements. Verify specific requirements with your AHJ.',
        estimatedDIYTime: '15\u201330 minutes for filter cleaning and assessment',
        estimatedRepairCost: 'Filter exchange: $80\u2013$200. Belt service: $150\u2013$400. Duct cleaning: $300\u2013$1,200+.',
        cppService: 'Hood & Duct Cleaning',
      }},
      { label: 'Unusual noise from exhaust fan', next: {
        id: 'fan_noise', title: 'Exhaust Fan Noise \u2014 Bearing or Belt Issue', severity: 'warning',
        equipment: 'Exhaust Fan',
        description: 'Grinding, squealing, or rattling from the exhaust fan indicates a mechanical issue that will progress to failure if not addressed.',
        likelyCauses: ['Grinding: bearing failure (imminent motor seizure)', 'Squealing: belt slipping or wearing thin', 'Rattling: loose fan blade or housing vibration', 'Humming/clicking: electrical issue with motor'],
        immediateSteps: ['Identify the type of noise \u2014 grinding is most urgent', 'If grinding: schedule immediate service to prevent complete failure', 'If squealing: operational but belt will fail soon', 'Document the noise for your vendor (video is helpful)'],
        preventionSteps: ['Quarterly fan performance inspection', 'Belt replacement at first sign of glazing or cracking'],
        whenToCallProfessional: 'Within 48 hours for grinding. Within 1 week for squealing.',
        estimatedDIYTime: '5 minutes for noise assessment',
        estimatedRepairCost: 'Belt service: $150\u2013$400. Bearing replacement: $400\u2013$1,200.',
        cppService: 'Fan Performance Management',
      }},
    ],
  },

  fire_suppression: {
    question: 'What is the issue with the fire suppression system?',
    options: [
      { label: 'System discharged / activated', next: {
        id: 'system_discharged', title: 'Fire Suppression System Discharged', severity: 'critical',
        equipment: 'Fire Suppression System',
        description: 'The fire suppression system has activated. This requires professional cleanup, recharge, and inspection before the kitchen can resume operations.',
        likelyCauses: ['Actual fire event', 'Accidental activation (impact to fusible link or manual pull)', 'System malfunction'],
        immediateSteps: ['1. Ensure all staff are safe and evacuated if needed', '2. Call 911 if there was an actual fire', '3. Do NOT attempt to clean up chemical agent yourself', '4. Call fire suppression vendor for emergency recharge', '5. Document everything \u2014 photos, video, timeline', '6. Notify insurance carrier', '7. File incident in EvidLY'],
        preventionSteps: ['Semi-annual fire suppression inspection', 'Staff training on system operation', 'Protect fusible links from accidental impact'],
        whenToCallProfessional: 'Immediately. Kitchen cannot operate until system is recharged and inspected.',
        regulatoryNote: 'System must be professionally recharged and inspected before kitchen can reopen. AHJ may require sign-off.',
        estimatedDIYTime: 'None \u2014 professional service required',
        estimatedRepairCost: 'Recharge and inspection: $1,500\u2013$5,000. Cleanup: $500\u2013$2,000.',
      }},
      { label: 'Expired inspection tag or missing pin', next: {
        id: 'expired_suppression', title: 'Fire Suppression \u2014 Expired Inspection', severity: 'urgent',
        equipment: 'Fire Suppression System',
        description: 'Fire suppression system inspection is overdue or equipment shows signs of non-compliance (missing pull pin, expired tag, damaged nozzle).',
        likelyCauses: ['Missed semi-annual inspection schedule', 'Vendor cancellation or scheduling lapse', 'Pull pin removed accidentally'],
        immediateSteps: ['Check inspection tag date on the system', 'Verify all nozzles are unobstructed and aimed correctly', 'Verify manual pull station pin is in place', 'Schedule inspection immediately if overdue'],
        preventionSteps: ['Set semi-annual inspection reminders in EvidLY', 'Document all inspections with photos'],
        whenToCallProfessional: 'Within 48 hours. Expired inspection is a fire code violation.',
        regulatoryNote: 'NFPA 96 (2024) Chapter 12 covers fire suppression system requirements. Verify with your AHJ.',
        estimatedDIYTime: '10 minutes for visual check',
        estimatedRepairCost: 'Semi-annual inspection: $200\u2013$500.',
      }},
    ],
  },

  refrigeration: {
    question: 'What is the refrigeration issue?',
    options: [
      { label: 'Walk-in or reach-in not cooling', next: {
        id: 'not_cooling', title: 'Refrigeration Unit Not Cooling \u2014 Food Safety Emergency', severity: 'critical',
        equipment: 'Walk-In / Reach-In Refrigerator',
        description: 'A non-cooling refrigeration unit is a food safety emergency. Product in the danger zone (41\u00b0F\u2013135\u00b0F) for more than 4 hours must be discarded.',
        likelyCauses: ['Compressor failure', 'Refrigerant leak', 'Condenser coils dirty or blocked', 'Thermostat failure', 'Door gasket failure allowing warm air in'],
        immediateSteps: ['1. Check thermostat setting', '2. Check condenser coils \u2014 clean if visibly dirty', '3. Check door gaskets for tears or gaps', '4. Begin temperature monitoring \u2014 log every 30 minutes', '5. Move critical product to working unit if available', '6. Call refrigeration service', '7. Document in EvidLY Temp Logs'],
        preventionSteps: ['Monthly condenser coil cleaning', 'Quarterly gasket inspection', 'Annual refrigeration service'],
        whenToCallProfessional: 'Immediately. Product loss cost exceeds service call cost.',
        regulatoryNote: 'FDA Food Code requires cold holding at 41\u00b0F or below. Product above 41\u00b0F for 4+ hours must be discarded.',
        estimatedDIYTime: '15 minutes for basic checks',
        estimatedRepairCost: 'Coil cleaning: $150\u2013$300. Thermostat: $200\u2013$500. Compressor: $800\u2013$3,000.',
      }},
      { label: 'Ice machine not making ice', next: {
        id: 'ice_machine', title: 'Ice Machine Not Producing', severity: 'warning',
        equipment: 'Ice Machine',
        description: 'Ice machine has stopped producing ice or production is significantly reduced.',
        likelyCauses: ['Water supply shut off or restricted', 'Condenser coils dirty', 'Scale buildup inside machine', 'Ambient temperature too high', 'Compressor or mechanical failure'],
        immediateSteps: ['Check water supply valve is open', 'Check condenser coils \u2014 clean if dirty', 'Check for error codes on display', 'Source bagged ice as temporary solution'],
        preventionSteps: ['Quarterly cleaning and descaling', 'Monthly condenser coil cleaning', 'Annual professional service'],
        whenToCallProfessional: 'Within 24\u201348 hours if basic checks don\u2019t resolve.',
        estimatedDIYTime: '20 minutes for basic checks',
        estimatedRepairCost: 'Cleaning/descaling: $150\u2013$300. Component repair: $300\u2013$1,000.',
      }},
    ],
  },

  cooking: {
    question: 'Which cooking equipment has the issue?',
    options: [
      { label: 'Fryer not heating or temperature unstable', next: {
        id: 'fryer_issue', title: 'Fryer Temperature Issue', severity: 'warning',
        equipment: 'Deep Fryer',
        description: 'Fryer is not reaching target temperature or temperature is fluctuating, affecting food quality and safety.',
        likelyCauses: ['Thermostat failure or miscalibration', 'Heating element failure (electric)', 'Gas valve or pilot issue (gas)', 'High-limit safety tripped'],
        immediateSteps: ['Check if high-limit safety has tripped \u2014 reset button usually on back of unit', 'Check pilot light (gas fryers)', 'Verify temperature with independent thermometer', 'Remove fryer from service if temperature cannot be maintained'],
        preventionSteps: ['Monthly thermostat calibration check', 'Professional fryer service per manufacturer schedule'],
        whenToCallProfessional: 'Within 24 hours if reset does not resolve.',
        estimatedDIYTime: '10 minutes for basic checks',
        estimatedRepairCost: 'Thermostat: $150\u2013$400. Element: $200\u2013$600. Gas valve: $300\u2013$800.',
      }},
      { label: 'Oven not heating evenly or at all', next: {
        id: 'oven_issue', title: 'Oven Not Heating', severity: 'warning',
        equipment: 'Commercial Oven',
        description: 'Oven is not reaching temperature or has significant hot/cold spots affecting product quality.',
        likelyCauses: ['Igniter failure (gas)', 'Element failure (electric)', 'Thermostat miscalibration', 'Door gasket allowing heat escape', 'Fan failure (convection)'],
        immediateSteps: ['Check if unit is receiving power/gas', 'Check door gasket condition', 'Test with oven thermometer at multiple positions', 'Remove from service if not holding safe temperature for product'],
        preventionSteps: ['Quarterly thermostat calibration', 'Annual professional service'],
        whenToCallProfessional: 'Within 24\u201348 hours.',
        estimatedDIYTime: '10 minutes for assessment',
        estimatedRepairCost: 'Igniter: $150\u2013$350. Element: $200\u2013$500. Gasket: $50\u2013$150.',
      }},
    ],
  },

  grease_drain: {
    question: 'What is the grease or drainage issue?',
    options: [
      { label: 'Grease trap backing up or overflowing', next: {
        id: 'grease_trap', title: 'Grease Trap Overflow \u2014 Health Code and Environmental Risk', severity: 'critical',
        equipment: 'Grease Trap / Interceptor',
        description: 'A grease trap backup creates an immediate health code violation, environmental exposure, and slip hazard.',
        likelyCauses: ['Trap is full \u2014 past capacity between pump-outs', 'Inlet or outlet blocked', 'Crossover baffle displaced', 'Heavy grease load from saturated hood filters'],
        immediateSteps: ['1. Stop all water flow to affected drains', '2. Place absorbent material around overflow', '3. Call grease trap pumping service for emergency pump-out', '4. Clean up spill with degreaser \u2014 do NOT push into storm drain', '5. Document in EvidLY Incidents'],
        preventionSteps: ['Schedule pump-outs before trap reaches 25% grease cap', 'Professional filter exchange reduces grease load', 'Monthly visual inspection of trap condition'],
        whenToCallProfessional: 'Immediately for pump-out.',
        regulatoryNote: 'Grease discharge to storm drain is a Clean Water Act violation. Municipal FOG programs enforce pump-out frequency.',
        estimatedDIYTime: '15 minutes for containment',
        estimatedRepairCost: 'Emergency pump-out: $300\u2013$800. Regular pump-out: $200\u2013$450.',
        cppService: 'Filter Exchange Management',
      }},
      { label: 'Floor drain slow or backing up', next: {
        id: 'floor_drain', title: 'Floor Drain Backup', severity: 'urgent',
        equipment: 'Floor Drain',
        description: 'A backed-up floor drain creates slip hazard, sanitation risk, and potential health code violation.',
        likelyCauses: ['Grease and food debris buildup in drain line', 'Main line blockage', 'Root intrusion in older buildings', 'Grease trap full (causes upstream backup)'],
        immediateSteps: ['Check grease trap level first \u2014 a full trap backs up floor drains', 'Clear drain grate of visible debris', 'Pour hot water (not boiling) to attempt to clear minor grease blockage', 'Call plumber if not clearing within 30 minutes'],
        preventionSteps: ['Daily drain cleaning during closing procedures', 'Regular grease trap pump-outs', 'Enzyme drain treatment monthly'],
        whenToCallProfessional: 'Within 4 hours if basic clearing does not work.',
        estimatedDIYTime: '15 minutes for basic clearing attempt',
        estimatedRepairCost: 'Drain clearing: $200\u2013$500. Main line jetting: $400\u2013$1,200.',
      }},
    ],
  },

  rooftop: {
    question: 'What is the rooftop issue?',
    options: [
      { label: 'Grease accumulation on roof surface', next: {
        id: 'roof_grease', title: 'Rooftop Grease Accumulation', severity: 'warning',
        equipment: 'Rooftop / Exhaust Discharge Area',
        description: 'Visible grease accumulation on the roof around exhaust fan discharge points. This causes membrane damage, fire risk, and stormwater liability.',
        likelyCauses: ['No grease containment system installed', 'Containment system full or damaged', 'Fan discharge not properly directed into containment'],
        immediateSteps: ['Document with photos from multiple angles', 'Check if grease containment system exists \u2014 if yes, check if full', 'Schedule rooftop grease containment service', 'Do NOT pressure-wash grease into storm drains'],
        preventionSteps: ['Quarterly rooftop grease containment service', 'Monthly visual inspection if accessible'],
        whenToCallProfessional: 'Within 1\u20132 weeks for containment service.',
        regulatoryNote: 'NFPA 96 (2024) Chapter 11 covers exhaust system rooftop requirements. Verify with your AHJ. Grease runoff into storm drains is a Clean Water Act violation.',
        estimatedDIYTime: '10 minutes for photo documentation',
        estimatedRepairCost: 'Containment system installation: $500\u2013$2,000. Ongoing service: $200\u2013$600/quarter.',
        cppService: 'Rooftop Grease Containment',
      }},
      { label: 'Water leak from roof into kitchen', next: {
        id: 'roof_leak', title: 'Roof Leak \u2014 Water Intrusion Into Kitchen', severity: 'critical',
        equipment: 'Roof / Building Envelope',
        description: 'Water intrusion from the roof into the kitchen creates food safety risk, electrical hazard, and property damage.',
        likelyCauses: ['Grease-damaged roof membrane (long-term grease accumulation)', 'Flashing failure around roof penetrations (exhaust fans, vents)', 'Roof age and wear', 'Storm damage'],
        immediateSteps: ['1. Move food and equipment away from leak area', '2. Place containers to catch water', '3. Check if leak is near any electrical panels or equipment \u2014 shut off power if risk', '4. Call roofing contractor', '5. Document with photos for insurance', '6. Notify landlord if leased space'],
        preventionSteps: ['Rooftop grease containment prevents membrane damage', 'Annual roof inspection', 'Quarterly visual check around fan penetrations'],
        whenToCallProfessional: 'Immediately for active leak.',
        estimatedDIYTime: '15 minutes for containment and documentation',
        estimatedRepairCost: 'Patch repair: $500\u2013$2,000. Section replacement: $2,000\u2013$10,000+.',
        cppService: 'Rooftop Grease Containment',
      }},
    ],
  },

  hvac: {
    question: 'What are you observing with HVAC or ventilation?',
    options: [
      { label: 'Kitchen is too hot \u2014 AC not cooling', next: {
        id: 'hvac_not_cooling', title: 'HVAC Not Cooling \u2014 Kitchen Heat Issue', severity: 'warning',
        equipment: 'HVAC / Air Conditioning',
        description: 'An overheated kitchen affects staff performance, food safety, and equipment operation. Make-up air imbalance can also affect hood capture effectiveness.',
        likelyCauses: ['Refrigerant low or leaked', 'Condenser coils dirty or blocked', 'Thermostat failure', 'Make-up air system imbalance causing negative pressure'],
        immediateSteps: ['Check thermostat setting and mode', 'Check that all HVAC vents are open and unobstructed', 'Check condenser unit outside \u2014 is the fan running?', 'If kitchen is dangerously hot, reduce cooking load and open supplemental ventilation'],
        preventionSteps: ['Quarterly HVAC service including coil cleaning and refrigerant check', 'Annual make-up air balance inspection'],
        whenToCallProfessional: 'Same day if kitchen temperature is affecting food safety or staff safety.',
        estimatedDIYTime: '10 minutes for basic checks',
        estimatedRepairCost: 'Refrigerant recharge: $300\u2013$800. Coil cleaning: $150\u2013$400. Thermostat: $100\u2013$300.',
      }},
      { label: 'Make-up air system not running', next: {
        id: 'makeup_air_failure', title: 'Make-Up Air System Failure', severity: 'urgent',
        equipment: 'Make-Up Air Unit',
        description: 'A failed make-up air system creates negative pressure in the kitchen, dramatically reducing hood capture effectiveness and making the kitchen dangerous to work in.',
        likelyCauses: ['Motor failure', 'Belt failure', 'Control board fault', 'Filter severely blocked'],
        immediateSteps: ['Check circuit breaker for make-up air unit', 'Check filter condition \u2014 severely clogged filters can trigger safety shutoff', 'Reduce cooking intensity \u2014 without make-up air, hood capture is compromised', 'Call HVAC service immediately'],
        preventionSteps: ['Quarterly make-up air unit service including filter change and belt inspection', 'Annual system balance verification'],
        whenToCallProfessional: 'Immediately. Kitchen should not operate at full capacity without make-up air.',
        regulatoryNote: 'Make-up air system performance affects hood capture effectiveness per NFPA 96 (2024) Chapter 11. Verify with your AHJ.',
        estimatedDIYTime: 'Filter check: 10 minutes. All other work: professional only.',
        estimatedRepairCost: 'Filter replacement: $50\u2013$200. Motor/belt service: $200\u2013$600. Emergency service premium: $150\u2013$300.',
        cppService: 'Fan Performance Management',
      }},
    ],
  },

  pest: {
    question: 'What are you observing?',
    options: [
      { label: 'Rodent sighting or droppings', next: {
        id: 'rodent', title: 'Rodent Activity \u2014 Health Code Emergency', severity: 'critical',
        equipment: 'Facility',
        description: 'Rodent activity is an immediate health code violation. Any evidence of rodents requires same-day action \u2014 inspectors finding evidence during a visit will issue immediate closure.',
        likelyCauses: ['Entry points in walls, floors, or around pipes', 'Food storage not secured', 'Grease or food debris accumulation providing food source', 'Dumpster area attracting rodents near building'],
        immediateSteps: ['1. Document all evidence with photos immediately', '2. Secure all food in sealed containers', '3. Call pest control for emergency same-day service', '4. Identify and seal obvious entry points (steel wool in gaps)', '5. Deep clean any affected areas before service', '6. Document in EvidLY Incidents'],
        preventionSteps: ['Monthly pest control service contract', 'Seal all wall and floor penetrations quarterly', 'Secure dumpster lids and maintain distance from building', 'Daily cleaning of grease and food debris'],
        whenToCallProfessional: 'Immediately \u2014 same day.',
        regulatoryNote: 'Rodent evidence is a Major Violation under CalCode. AHJ inspector finding evidence will issue immediate closure notice.',
        estimatedDIYTime: '30 minutes for documentation and food securing',
        estimatedRepairCost: 'Emergency pest service: $300\u2013$800. Follow-up treatments: $100\u2013$300/month.',
      }},
      { label: 'Cockroach sighting', next: {
        id: 'cockroach', title: 'Cockroach Sighting \u2014 Health Code Violation', severity: 'urgent',
        equipment: 'Facility',
        description: 'Any cockroach sighting in a commercial kitchen is a health code violation. A single visible cockroach typically indicates a larger hidden population.',
        likelyCauses: ['Entry through deliveries, cardboard boxes, or drains', 'Harborage in warm moist areas behind equipment', 'Food or grease debris providing food source', 'Gaps around plumbing penetrations'],
        immediateSteps: ['Document sighting location and time', 'Inspect behind and under equipment in the area', 'Call pest control \u2014 do not wait for scheduled service', 'Remove cardboard boxes from kitchen immediately', 'Deep clean the affected area'],
        preventionSteps: ['Monthly pest control service', 'Inspect all deliveries before bringing into kitchen', 'Eliminate cardboard storage in kitchen', 'Seal plumbing penetrations'],
        whenToCallProfessional: 'Within 24 hours.',
        regulatoryNote: 'Cockroach presence is a Major Violation under CalCode.',
        estimatedDIYTime: '20 minutes for documentation and inspection',
        estimatedRepairCost: 'Pest treatment: $150\u2013$400 per visit.',
      }},
    ],
  },

  plumbing: {
    question: 'What are you observing with plumbing?',
    options: [
      { label: 'Active leak \u2014 water on floor or ceiling', next: {
        id: 'active_leak', title: 'Active Water Leak \u2014 Immediate Action', severity: 'critical',
        equipment: 'Plumbing',
        description: 'An active water leak creates slip hazard, potential electrical risk, food safety risk, and property damage. Must be addressed immediately.',
        likelyCauses: ['Pipe joint failure', 'Fixture failure', 'Drain connection leak', 'Roof or ceiling water intrusion (see Rooftop category)'],
        immediateSteps: ['1. Locate and shut off the water supply valve serving the affected area', '2. Move electrical equipment away from water', '3. Place non-slip mats and warning signs', '4. Call plumber for emergency service', '5. Document in EvidLY Incidents', '6. Notify manager and document for insurance if significant'],
        preventionSteps: ['Annual plumbing inspection', 'Check under-sink areas monthly for slow drips', 'Replace aging fixtures proactively'],
        whenToCallProfessional: 'Immediately.',
        estimatedDIYTime: '5 minutes to shut off supply valve',
        estimatedRepairCost: 'Emergency plumbing: $200\u2013$600 service call + parts. Water damage remediation: highly variable.',
      }},
      { label: 'No hot water', next: {
        id: 'no_hot_water', title: 'No Hot Water \u2014 Food Safety and Sanitation Risk', severity: 'urgent',
        equipment: 'Water Heater / Plumbing',
        description: 'No hot water in a commercial kitchen is a health code violation \u2014 handwashing and dish sanitation both require hot water at minimum 100\u00b0F and 120\u00b0F respectively.',
        likelyCauses: ['Water heater pilot light out (gas)', 'Water heater element failure (electric)', 'Thermostat failure', 'Circuit breaker tripped (electric)', 'Gas supply issue (gas)'],
        immediateSteps: ['Check water heater \u2014 is pilot light lit? (gas)', 'Check circuit breaker (electric)', 'Check gas supply valve is open (gas)', 'If no hot water within 30 minutes, notify health department \u2014 operating without hot water may require closure'],
        preventionSteps: ['Annual water heater service', 'Test temperature at handwashing sinks monthly \u2014 log in EvidLY'],
        whenToCallProfessional: 'Same day. Operating without hot water is a health code violation.',
        regulatoryNote: 'CalCode requires hot water at handwashing sinks (100\u00b0F min) and dish sanitizing (120\u00b0F min). No hot water = potential closure.',
        estimatedDIYTime: '15 minutes for pilot light relight or breaker reset',
        estimatedRepairCost: 'Element replacement: $200\u2013$500. Water heater replacement: $800\u2013$2,500.',
      }},
    ],
  },
};
