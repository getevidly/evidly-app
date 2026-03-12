import { useState, useCallback } from 'react';

// NOTE: This preview is self-contained — isDemoMode and guardOperation
// are handled by the parent AdminShell context. No Supabase writes occur.
// All navigation uses onNav() callbacks, never window.open.

// ── Color Tokens (production) ─────────────────────────────────────
const NAVY  = '#1E2D4D';
const GOLD  = '#A08C5A';
const SB    = '#07111F';
const MUTED = '#6B7F96';
const PBG   = '#F4F6FA';
const WHITE = '#FFFFFF';
const BORDER = '#D1D9E6';

// ── Roles ─────────────────────────────────────────────────────────
const ROLES = [
  { v: 'owner_operator', l: 'Owner / Operator' },
  { v: 'executive', l: 'Executive' },
  { v: 'compliance_manager', l: 'Compliance' },
  { v: 'facilities_manager', l: 'Facilities' },
  { v: 'chef', l: 'Chef' },
  { v: 'kitchen_manager', l: 'Manager' },
  { v: 'kitchen_staff', l: 'Staff' },
];

// ── Page Definitions ──────────────────────────────────────────────
const PG = {
  dashboard:          { l: 'Dashboard', i: '⊞' },
  calendar:           { l: 'Calendar', i: '📅' },
  checklists:         { l: 'Checklists', i: '✅' },
  temperatures:       { l: 'Temperature Readings', i: '🌡️' },
  'temp-logs':        { l: 'Temp Log Entry', i: '🌡️' },
  haccp:              { l: 'HACCP', i: '🛡️' },
  corrective:         { l: 'Corrective Actions', i: '🔧' },
  incidents:          { l: 'Incidents', i: '⚠️' },
  'facility-safety':  { l: 'Facility Safety', i: '🔥' },
  services:           { l: 'Vendor Services', i: '🛠️' },
  documents:          { l: 'Documents', i: '📋' },
  'self-inspection':  { l: 'Self-Inspection', i: '🔍' },
  training:           { l: 'Training Records', i: '🎓' },
  'ai-insights':      { l: 'AI Insights', i: '🤖' },
  alerts:             { l: 'Alerts', i: '🔔' },
  analytics:          { l: 'Predictive Analytics', i: '📈' },
  intelligence:       { l: 'Compliance Intelligence', i: '🧠' },
  'insurance-risk':   { l: 'Insurance Risk', i: '🛡️' },
  reporting:          { l: 'Reports', i: '📊' },
  'iot-monitoring':   { l: 'IoT Monitoring', i: '📡' },
  benchmarks:         { l: 'Benchmarks', i: '🏆' },
  'jurisdiction-intel': { l: 'Know Your Inspector', i: '⚖️' },
  regulatory:         { l: 'Regulatory Tracking', i: '📅' },
  'inspector-view':   { l: 'Inspector Arrival', i: '🏛️' },
  'photo-evidence':   { l: 'Photo Evidence', i: '📷' },
  marketplace:        { l: 'Vendor Marketplace', i: '🏪' },
  'self-diagnosis':   { l: 'Self-Diagnosis', i: '🔧' },
  locations:          { l: 'Locations', i: '📍' },
  team:               { l: 'Team', i: '👥' },
  equipment:          { l: 'Equipment', i: '⚙️' },
  vendors:            { l: 'Vendors', i: '🤝' },
  roles:              { l: 'Roles & Permissions', i: '🔐' },
  settings:           { l: 'Settings', i: '⚙️' },
};

// ── Allowed pages per role ────────────────────────────────────────
const ALL_PAGES = Object.keys(PG);
const ALLOWED = {
  owner_operator: ALL_PAGES,
  executive: ['dashboard','calendar','documents','training','analytics',
    'intelligence','reporting','benchmarks','inspector-view','locations','settings',
    'ai-insights','insurance-risk','regulatory','services','marketplace'],
  compliance_manager: ['dashboard','calendar','checklists','temperatures',
    'haccp','corrective','incidents','facility-safety','services','documents',
    'self-inspection','training','ai-insights','alerts','analytics',
    'jurisdiction-intel','regulatory','reporting','inspector-view',
    'self-diagnosis','locations','settings','insurance-risk','marketplace'],
  facilities_manager: ['dashboard','calendar','incidents','facility-safety','services',
    'documents','alerts','regulatory','iot-monitoring','marketplace',
    'inspector-view','self-diagnosis','locations','equipment','vendors','settings'],
  chef: ['dashboard','calendar','checklists','temperatures','haccp','corrective',
    'documents','training','ai-insights','self-diagnosis','settings'],
  kitchen_manager: ['dashboard','calendar','checklists','temperatures','haccp',
    'corrective','incidents','services','documents','training','ai-insights',
    'alerts','analytics','reporting','marketplace','photo-evidence',
    'inspector-view','self-diagnosis','locations','team','equipment','settings'],
  kitchen_staff: ['dashboard','temp-logs','checklists','incidents'],
};

// ── Sidebar sections ──────────────────────────────────────────────
const SECTIONS = [
  { id: 'food-safety', label: 'Food Safety', icon: '🍽️',
    pages: ['checklists','temperatures','haccp','corrective','temp-logs'] },
  { id: 'facility-safety', label: 'Facility Safety', icon: '🔥',
    pages: ['facility-safety'] },
  { id: 'compliance', label: 'Compliance', icon: '📋',
    pages: ['documents','incidents','insurance-risk','jurisdiction-intel','regulatory',
      'reporting','self-inspection','services','marketplace','photo-evidence'] },
  { id: 'insights', label: 'Insights', icon: '💡',
    pages: ['ai-insights','analytics','benchmarks','intelligence','iot-monitoring','alerts'] },
  { id: 'tools', label: 'Tools', icon: '🔧',
    pages: ['inspector-view','self-diagnosis'] },
  { id: 'administration', label: 'Administration', icon: '⚙️',
    pages: ['equipment','locations','settings','team','vendors','roles','training'] },
];

// ── Mobile bottom nav ─────────────────────────────────────────────
const MNAV = {
  owner_operator:     [['dashboard','Home','⊞'],['temperatures','Temps','🌡️'],['checklists','Checks','✅'],['incidents','Issues','⚠️'],['settings','More','⋯']],
  executive:          [['dashboard','Home','⊞'],['analytics','Analytics','📊'],['locations','Locations','📍'],['reporting','Reports','📈'],['settings','More','⋯']],
  compliance_manager: [['dashboard','Home','⊞'],['checklists','Checks','✅'],['self-inspection','Inspect','🔍'],['alerts','Alerts','🔔'],['reporting','Reports','📈']],
  facilities_manager: [['dashboard','Home','⊞'],['equipment','Equip','⚙️'],['vendors','Vendors','🏢'],['facility-safety','Fire','🔥'],['incidents','Issues','⚠️']],
  chef:               [['dashboard','Home','⊞'],['temperatures','Temps','🌡️'],['checklists','Checks','✅'],['haccp','HACCP','🔬'],['ai-insights','AI','🤖']],
  kitchen_manager:    [['dashboard','Home','⊞'],['temperatures','Temps','🌡️'],['checklists','Checks','✅'],['incidents','Issues','⚠️'],['settings','More','⋯']],
  kitchen_staff:      [['dashboard','Today','⊞'],['checklists','Checks','✅'],['temp-logs','Temps','🌡️'],['incidents','Report','⚠️']],
};

// ── Action panel mappings ─────────────────────────────────────────
const ACT = {
  'Log Now':       { t:'Log Temperature', f:{l:'Temperature (°F)',type:'number',ph:'38'}, p:'Save Reading' },
  'Log Again':     { t:'Log Temperature', f:{l:'Temperature (°F)',type:'number',ph:'38'}, p:'Save Reading' },
  '+ Log Temp':    { t:'Log Temperature', f:{l:'Equipment',type:'select',ph:'Select...',opts:['Walk-in #1','Walk-in #2','Freezer #1','Prep Line']}, p:'Save Reading' },
  'Schedule':      { t:'Schedule Service', f:{l:'Service Type',type:'select',ph:'Select...',opts:['Hood Cleaning','HVAC','Pest Control','Fire Suppression']}, p:'Schedule' },
  'View':          { t:'Record Details', i:'Full record details and history displayed here.', p:'Close' },
  'Start':         { t:'Start Checklist', i:'This will begin the selected checklist. All items must be completed in order.', p:'Begin' },
  'Report Issue':  { t:'Report Issue', f:{l:'Description',type:'text',ph:'Describe the issue...'}, p:'Submit Report' },
  'Report New':    { t:'Report Issue', f:{l:'Description',type:'text',ph:'Describe the issue...'}, p:'Submit Report' },
  'Get Started':   { t:'Add First Entry', f:{l:'Name',type:'text',ph:'e.g. Downtown Kitchen'}, p:'Create' },
  'Add Location':  { t:'Add Location', f:{l:'Location Name',type:'text',ph:'e.g. Downtown Kitchen'}, p:'Add Location' },
  'Edit':          { t:'Edit Record', f:{l:'Name',type:'text',ph:'Update value...'}, p:'Save Changes' },
  'Upload':        { t:'Upload Document', f:{l:'Document Type',type:'select',ph:'Select...',opts:['Health Permit','Fire Cert','Insurance','Food Handler','Other']}, p:'Upload' },
  'Invite':        { t:'Invite Team Member', f:{l:'Email',type:'email',ph:'team@example.com'}, p:'Send Invite' },
  'Mark All Read': { t:'Confirm Action', i:'Mark all notifications as read?', p:'Confirm' },
  'Download':      { t:'Export Report', f:{l:'Format',type:'select',ph:'Select...',opts:['PDF','CSV','Excel']}, p:'Download' },
  'Export':        { t:'Export Data', f:{l:'Format',type:'select',ph:'Select...',opts:['PDF','CSV','Excel']}, p:'Export' },
  'Generate':      { t:'Generate Report', f:{l:'Report Period',type:'select',ph:'Select...',opts:['This Week','This Month','Last 30 Days','Last 90 Days']}, p:'Generate' },
  'Contact':       { t:'Contact Vendor', f:{l:'Message',type:'text',ph:'Enter message...'}, p:'Send Message' },
  'Checklist':     { t:'Quick Checklist', i:'Select a checklist to start.', f:{l:'Checklist',type:'select',ph:'Select...',opts:['Opening','Mid-day','Closing','Deep Clean']}, p:'Start' },
};

// ── Page sample data ──────────────────────────────────────────────
// c=cards, t=title, a=action label, r=rows
// Row: ["d",icon,primary,secondary,badge,badgeText,cta]
//      ["!",sev,title,location]  ["~",label,pct,color]
//      ["?",item,ok]  ["t",label,status,sub]
const PD = {
  dashboard: { b:'Good morning, Maria', s:[['3','Tasks'],['2','Alerts'],['12','Done']],
    c:[
      {t:"Today's Priorities",a:'View',r:[
        ['t','Opening checklist — Downtown','due','Due 8:00 AM'],
        ['t','Walk-in temp check','overdue','Overdue 45 min'],
        ['t','Receiving log — AM delivery','pending','ETA 10:30 AM']]},
      {t:'Recent Alerts',a:'Mark All Read',r:[
        ['!','high','Walk-in #2 temp 47°F — rising','Downtown'],
        ['!','medium','Hood cleaning overdue 12 days','Airport']]}]},
  checklists: { b:'Checklists',
    c:[
      {t:'Active Checklists',a:'Start',r:[
        ['?','Opening Procedures — Food Safety',false],['?','Mid-day Temperature Sweep',false],
        ['?','Closing Sanitation Checklist',true],['?','Weekly Deep Clean',false]]},
      {t:'Completion Rates',r:[
        ['~','This Week',78,'#22C55E'],['~','This Month',85,'#3B82F6'],
        ['~','Downtown',92,'#22C55E'],['~','Airport',71,'#F59E0B']]}]},
  temperatures: { b:'Temperature Readings', s:[['24','Today'],['2','Out of Range'],['98%','Compliance']],
    c:[
      {t:'Current Readings',a:'Log Now',r:[
        ['d','🌡️','Walk-in Cooler #1','38°F — Normal','ok','OK','Log Again'],
        ['d','🌡️','Walk-in Cooler #2','47°F — HIGH','danger','Alert','Log Now'],
        ['d','🌡️','Freezer #1','-2°F — Normal','ok','OK','Log Again'],
        ['d','🌡️','Prep Line Cooler','40°F — Normal','ok','OK','Log Again']]},
      {t:'Recent Logs',a:'Export',r:[
        ['d','📋','Walk-in #1 — 7:02 AM','38°F by Maria R.','ok','OK','View'],
        ['d','📋','Freezer #1 — 7:05 AM','-2°F by Maria R.','ok','OK','View']]}]},
  'temp-logs': { b:'Temperature Log Entry',
    c:[
      {t:'Quick Log',a:'+ Log Temp',r:[
        ['d','🌡️','Walk-in Cooler #1','Last: 38°F at 7:02 AM','ok','OK','Log Now'],
        ['d','🌡️','Walk-in Cooler #2','Last: 47°F at 6:58 AM','danger','Alert','Log Now'],
        ['d','🌡️','Freezer #1','Last: -2°F at 7:05 AM','ok','OK','Log Now']]},
      {t:'My Recent Entries',r:[
        ['d','✓','Walk-in #1','38°F — 7:02 AM today','completed','Done',''],
        ['d','✓','Freezer #1','-2°F — 7:05 AM today','completed','Done','']]}]},
  haccp: { b:'HACCP Plans',
    c:[
      {t:'Critical Control Points',a:'View',r:[
        ['d','🛡️','CCP-1: Receiving','Temp ≤ 41°F on delivery','ok','Monitored','View'],
        ['d','🛡️','CCP-2: Cold Storage','Maintain ≤ 41°F','ok','Monitored','View'],
        ['d','🛡️','CCP-3: Cooking','Internal temp ≥ 165°F','ok','Monitored','View'],
        ['d','🛡️','CCP-4: Hot Holding','Maintain ≥ 135°F','warn','Check','View']]},
      {t:'Deviation Log',a:'Report Issue',r:[
        ['!','medium','CCP-4 hot holding below 135°F for 15 min','Downtown — 2:30 PM'],
        ['!','low','CCP-1 receiving temp 43°F — corrected','Airport — 9:15 AM']]}]},
  corrective: { b:'Corrective Actions',
    c:[
      {t:'Open Actions',a:'View',r:[
        ['d','🔧','Walk-in #2 compressor repair','Vendor scheduled 3/12','warn','In Progress','View'],
        ['d','🔧','Staff retraining — temp logging','Scheduled 3/15','pending','Pending','View'],
        ['d','🔧','Sanitizer concentration fix','Completed 3/10','completed','Done','View']]},
      {t:'Resolution Rate',r:[
        ['~','Open',2,'#F59E0B'],['~','In Progress',3,'#3B82F6'],['~','Resolved (30d)',8,'#22C55E']]}]},
  incidents: { b:'Incidents',
    c:[
      {t:'Recent Incidents',a:'Report New',r:[
        ['!','high','Slip and fall — kitchen prep area','Downtown — 3/10 2:15 PM'],
        ['!','medium','Cross-contamination risk — cutting board','Airport — 3/9'],
        ['!','low','Minor burn — fryer splash','Downtown — 3/8']]},
      {t:'Incident Summary',r:[
        ['~','Open',2,'#EF4444'],['~','Under Review',1,'#F59E0B'],['~','Resolved',5,'#22C55E']]}]},
  'facility-safety': { b:'Facility Safety',
    c:[
      {t:'Fire Suppression Systems',a:'Schedule',r:[
        ['d','🔥','Hood Suppression — Kitchen A','Serviced 1/15, next 7/15','ok','Current','Schedule'],
        ['d','🔥','Hood Suppression — Kitchen B','Serviced 11/20, next 5/20','warn','Due Soon','Schedule'],
        ['d','🧯','Fire Extinguishers (8)','Annual inspection due 4/1','ok','Current','View']]},
      {t:'Inspection Readiness',r:[
        ['?','Sprinkler system inspection',true],['?','Emergency exit signage',true],
        ['?','Fire extinguisher tags current',true],['?','Hood suppression semi-annual',false]]}]},
  services: { b:'Vendor Services',
    c:[
      {t:'Upcoming Services',a:'Schedule',r:[
        ['d','🛠️','Hood Cleaning — ProClean','Scheduled 3/15','info','Scheduled','View'],
        ['d','🛠️','Pest Control — SafeGuard','Monthly due 3/20','pending','Upcoming','Schedule'],
        ['d','🛠️','HVAC — CoolTech','Quarterly due 4/1','ok','On Track','View']]},
      {t:'Service History',a:'Export',r:[
        ['d','✓','Grease Trap — 2/28','FlowRight Plumbing','completed','Done','View'],
        ['d','✓','Pest Control — 2/20','SafeGuard','completed','Done','View']]}]},
  documents: { b:'Documents',
    c:[
      {t:'Compliance Documents',a:'Upload',r:[
        ['d','📋','Health Permit','Exp. 12/2026','ok','Valid','View'],
        ['d','📋','Food Handler Certs (12)','3 expiring in 60 days','warn','Review','View'],
        ['d','📋','Fire Inspection Report','Last: 1/15/2026','ok','Current','View'],
        ['d','📋','Insurance Certificate','Exp. 6/2026','ok','Valid','View']]},
      {t:'Recent Uploads',r:[
        ['d','📎','Hood cleaning cert — 2/28','Uploaded by Maria R.','completed','','View'],
        ['d','📎','Pest control report — 2/20','Uploaded by James K.','completed','','View']]}]},
  alerts: { b:'Alerts & Notifications',
    c:[
      {t:'Active Alerts',a:'Mark All Read',r:[
        ['!','high','Walk-in #2 temp 47°F','Downtown — Now'],
        ['!','high','Hood cleaning overdue 12 days','Airport — 3/10'],
        ['!','medium','3 food handler certs expiring','All Locations'],
        ['!','low','Checklist completion below 80%','University']]},
      {t:'Alert Settings',a:'Edit',r:[
        ['d','🔔','Temperature Alerts','Push + Email','active','On','Edit'],
        ['d','🔔','Service Reminders','Email only','active','On','Edit']]}]},
  analytics: { b:'Predictive Analytics',
    c:[
      {t:'Performance Trends',r:[
        ['~','Checklist Completion',87,'#22C55E'],['~','Temp Compliance',94,'#22C55E'],
        ['~','Incident Response',72,'#F59E0B'],['~','Document Currency',91,'#22C55E']]},
      {t:'Location Comparison',a:'Export',r:[
        ['d','📍','Downtown','Top performer — all green','ok','A+','View'],
        ['d','📍','Airport','Temp monitoring attention needed','warn','B','View'],
        ['d','📍','University','Below target on checklists','danger','C','View']]}]},
  locations: { b:'Locations',
    c:[
      {t:'Your Locations',a:'Add Location',r:[
        ['d','📍','Downtown Kitchen','123 Main St','ok','Active','Edit'],
        ['d','📍','Airport Terminal B','LAX Terminal B','ok','Active','Edit'],
        ['d','📍','University Dining','Campus Center','ok','Active','Edit']]},
      {t:'Location Health',r:[
        ['~','Downtown',95,'#22C55E'],['~','Airport',78,'#F59E0B'],['~','University',62,'#EF4444']]}]},
  team: { b:'Team',
    c:[
      {t:'Team Members',a:'Invite',r:[
        ['d','👤','Maria Rodriguez','Owner — All locations','ok','Active','Edit'],
        ['d','👤','James Kim','Chef — Downtown, Airport','ok','Active','Edit'],
        ['d','👤','Sarah Chen','Compliance — All locations','ok','Active','Edit'],
        ['d','👤','Carlos Mendez','Staff — Downtown','ok','Active','Edit']]},
      {t:'Certifications',a:'View',r:[
        ['d','🎓','Food Handler (12)','3 expiring in 60 days','warn','Review','View'],
        ['d','🎓','ServSafe Manager (4)','All current','ok','Current','View']]}]},
  equipment: { b:'Equipment',
    c:[
      {t:'Equipment Registry',a:'Edit',r:[
        ['d','⚙️','Walk-in Cooler #1','Turbo Air — 2023','ok','Good','View'],
        ['d','⚙️','Walk-in Cooler #2','True Mfg — Needs repair','danger','Issue','View'],
        ['d','⚙️','Freezer #1','Hoshizaki — Serviced 2/15','ok','Good','View'],
        ['d','⚙️','Fryer Bank (3)','Pitco — Filter change due','pending','Pending','Schedule']]},
      {t:'Maintenance',a:'Schedule',r:[
        ['d','🔧','Walk-in #2 compressor','Repair 3/12','warn','Upcoming','View'],
        ['d','🔧','Fryer filter change','Due 3/18','pending','Scheduled','View']]}]},
  vendors: { b:'Vendors',
    c:[
      {t:'Service Providers',a:'Contact',r:[
        ['d','🤝','ProClean Inc','Hood cleaning — 4.8★','ok','Verified','Contact'],
        ['d','🤝','SafeGuard Pest','Pest control — 4.6★','ok','Verified','Contact'],
        ['d','🤝','CoolTech HVAC','HVAC — 4.9★','ok','Verified','Contact'],
        ['d','🤝','FlowRight Plumbing','Grease trap — 4.5★','ok','Verified','Contact']]},
      {t:'Vendor Performance',r:[
        ['~','On-time Rate',94,'#22C55E'],['~','Response Time',88,'#3B82F6']]}]},
  settings: { b:'Settings',
    c:[
      {t:'Account Settings',a:'Edit',r:[
        ['d','⚙️','Notifications','Push + Email','info','On','Edit'],
        ['d','⚙️','Language','English','info','EN','Edit'],
        ['d','⚙️','Time Zone','Pacific (PT)','info','PT','Edit'],
        ['d','⚙️','Two-Factor Auth','Enabled','ok','On','Edit']]},
      {t:'Organization',a:'Edit',r:[
        ['d','🏢','Company Name','Pacific Coast Dining','info','','Edit'],
        ['d','🏢','Plan','Professional','info','Pro','View']]}]},
  training: { b:'Training Records',
    c:[
      {t:'Certification Status',a:'View',r:[
        ['d','🎓','Food Handler — Maria R.','Valid until 12/2026','ok','Current','View'],
        ['d','🎓','Food Handler — James K.','Expiring 5/2026','warn','Expiring','View'],
        ['d','🎓','ServSafe Manager — Sarah','Valid until 8/2027','ok','Current','View']]},
      {t:'Training Completion',r:[
        ['~','Allergen Awareness',100,'#22C55E'],['~','Fire Safety',83,'#3B82F6'],
        ['~','HACCP Fundamentals',67,'#F59E0B']]}]},
  reporting: { b:'Reports',
    c:[
      {t:'Available Reports',a:'Generate',r:[
        ['d','📊','Executive Summary','Monthly overview','info','Ready','Generate'],
        ['d','📊','Inspection Readiness','Pre-inspection docs','info','Ready','Generate'],
        ['d','📊','Temperature Log','30-day compliance','info','Ready','Download'],
        ['d','📊','Training Report','Staff training status','info','Ready','Generate']]},
      {t:'Recent Exports',r:[
        ['d','📥','Exec Summary — Feb','Generated 3/1','completed','PDF','Download'],
        ['d','📥','Temp Log — Feb','Generated 3/1','completed','CSV','Download']]}]},
  // Additional pages with minimal data
  'self-inspection':  { b:'Self-Inspection', c:[{t:'Inspection Checklist',a:'Start',r:[['?','Food storage temps compliant',true],['?','Handwashing stations stocked',true],['?','Sanitizer concentration verified',false],['?','Cutting boards separated by use',true]]},{t:'Last Inspection',r:[['d','📋','Self-Inspection — 2/28','Score: 42/44 items passed','ok','95%','View']]}]},
  'ai-insights':      { b:'AI Insights', c:[{t:'Recommendations',r:[['d','🤖','Temp monitoring pattern','Walk-in #2 shows gradual rise over 7 days','warn','Insight','View'],['d','🤖','Staffing gap detected','No trained opener on Tuesdays','info','Insight','View']]},{t:'Trend Analysis',r:[['~','Risk Score Trend',22,'#22C55E'],['~','Predicted Issues (7d)',3,'#F59E0B']]}]},
  intelligence:       { b:'Compliance Intelligence', c:[{t:'Latest Signals',r:[['!','medium','LA County updating scoring weights','Effective Q2 2026'],['!','low','New FDA allergen labeling rule','Comment period open']]},{t:'Jurisdiction Updates',r:[['d','⚖️','LA County Health','3 regulatory changes pending','info','Active','View']]}]},
  'insurance-risk':   { b:'Insurance Risk', c:[{t:'Risk Factors',r:[['d','🛡️','Protective Safeguards','Hood suppression, extinguishers, sprinklers','ok','Compliant','View'],['d','🛡️','Claims History','0 claims in 24 months','ok','Clean','View']]},{t:'Documentation',a:'Upload',r:[['d','📋','Insurance Certificate','Valid through 6/2026','ok','Current','View']]}]},
  'iot-monitoring':   { b:'IoT Monitoring', c:[{t:'Connected Sensors',r:[['d','📡','Walk-in #1 Sensor','38°F — Online','ok','Live','View'],['d','📡','Walk-in #2 Sensor','47°F — Alert','danger','Alert','View'],['d','📡','Freezer Sensor','-2°F — Online','ok','Live','View']]},{t:'Sensor Health',r:[['~','Online',3,'#22C55E'],['~','Battery',87,'#3B82F6']]}]},
  benchmarks:         { b:'Benchmarks', c:[{t:'Industry Comparison',r:[['~','Your Performance',87,'#22C55E'],['~','Industry Average',74,'#6B7F96'],['~','Top 10%',95,'#3B82F6']]},{t:'Peer Ranking',r:[['d','🏆','Your Position','Top 15% in your market','ok','Strong','View']]}]},
  'jurisdiction-intel':{ b:'Know Your Inspector', c:[{t:'Jurisdiction Profile',r:[['d','⚖️','LA County Dept of Public Health','Weighted deduction scoring — 100 pt scale','info','Active','View'],['d','⚖️','LACoFD','Fire suppression authority','info','Active','View']]},{t:'Common Violations',r:[['d','📋','#1 Improper cold holding','32% of violations county-wide','warn','Common','View'],['d','📋','#2 Handwashing compliance','18% of violations','warn','Common','View']]}]},
  regulatory:         { b:'Regulatory Tracking', c:[{t:'Upcoming Deadlines',r:[['d','📅','Health Permit Renewal','Due 12/2026','ok','On Track','View'],['d','📅','Fire Inspection Window','Expected Q2 2026','info','Upcoming','View'],['d','📅','Food Handler Renewals (3)','Due within 60 days','warn','Action','View']]},{t:'Compliance Calendar',a:'View',r:[['d','📅','Next Inspection Window','Apr-Jun 2026','info','Estimated','View']]}]},
  'inspector-view':   { b:'Inspector Arrival Mode', c:[{t:'Quick Access Documents',r:[['d','📋','Health Permit','Current — exp 12/2026','ok','Ready','View'],['d','📋','Food Handler Certificates','12 on file','ok','Ready','View'],['d','📋','Last Inspection Report','Grade A — 1/15/2026','ok','Ready','View'],['d','📋','HACCP Plan','4 CCPs documented','ok','Ready','View']]},{t:'Recent Temp Logs',a:'Export',r:[['d','🌡️','Last 24 hours','24 readings — all compliant','ok','Pass','Download']]}]},
  'photo-evidence':   { b:'Photo Evidence', c:[{t:'Recent Photos',a:'Upload',r:[['d','📷','Cleaning verification — 3/10','Kitchen A prep area','completed','','View'],['d','📷','Delivery inspection — 3/9','AM produce delivery','completed','','View']]},{t:'Photo Log',r:[['~','This Week',12,'#3B82F6'],['~','This Month',47,'#22C55E']]}]},
  marketplace:        { b:'Vendor Marketplace', c:[{t:'Featured Vendors',a:'Contact',r:[['d','🏪','ProClean Inc','Hood cleaning — Starting $450/mo','ok','Verified','Contact'],['d','🏪','SafeGuard Pest','Pest control — Starting $180/mo','ok','Verified','Contact']]},{t:'Categories',r:[['d','🔥','Fire Suppression','8 vendors available','info','','View'],['d','🛠️','HVAC Service','12 vendors available','info','','View']]}]},
  'self-diagnosis':   { b:'Self-Diagnosis', c:[{t:'Diagnose Equipment',a:'Start',r:[['d','🔧','Walk-in not cooling','Step-by-step troubleshooting','info','Guide','Start'],['d','🔧','Ice machine low output','Check filters and water line','info','Guide','Start']]},{t:'Recent Diagnoses',r:[['d','✓','Fryer temp inconsistent','Thermostat recalibrated','completed','Resolved','View']]}]},
  calendar:           { b:'Calendar', c:[{t:'This Week',r:[['d','📅','Hood Cleaning','ProClean — 3/15 9:00 AM','info','Scheduled','View'],['d','📅','Pest Control','SafeGuard — 3/20 10:00 AM','pending','Upcoming','View'],['d','📅','Staff Meeting','3/14 2:00 PM','info','','View']]},{t:'Upcoming Deadlines',r:[['d','📅','Food Handler Renewal (3)','Due by 5/15/2026','warn','60 days','View'],['d','📅','Fire Inspection Window','Q2 2026','info','Estimated','View']]}]},
  roles:              { b:'Roles & Permissions', c:[{t:'Role Configuration',a:'Edit',r:[['d','🔐','Owner / Operator','Full access — all features','ok','Admin','View'],['d','🔐','Chef','Kitchen operations + food safety','info','Standard','View'],['d','🔐','Kitchen Staff','Tasks + temp logs only','info','Limited','View']]},{t:'Permission Exceptions',r:[['d','👤','Sarah Chen','Extra: Insurance Risk access','info','Exception','Edit']]}]},
};

const EMPTY_CARD = {t:'No Data Yet',r:[['d','📭','Nothing here yet','Add your first entry to get started','','','Get Started']]};

// ── Badge colors ──────────────────────────────────────────────────
const BC = {
  ok:       {bg:'#DCFCE7',fg:'#166534'}, warn:     {bg:'#FEF9C3',fg:'#854D0E'},
  danger:   {bg:'#FEE2E2',fg:'#991B1B'}, info:     {bg:'#DBEAFE',fg:'#1E40AF'},
  overdue:  {bg:'#FEE2E2',fg:'#991B1B'}, due:      {bg:'#FEF3C7',fg:'#92400E'},
  pending:  {bg:'#F3F4F6',fg:'#4B5563'}, completed:{bg:'#DCFCE7',fg:'#166534'},
  active:   {bg:'#DBEAFE',fg:'#1E40AF'},
};
const sev = {high:'#EF4444',medium:'#F59E0B',low:'#3B82F6'};

// ── Row Renderer ──────────────────────────────────────────────────
function Row({r, onAct, compact}) {
  const h = compact ? 32 : 36;
  const fs = compact ? 11 : 12;
  if (r[0]==='d') {
    const [,icon,pri,sec,badge,badgeTxt,cta] = r;
    const b = BC[badge];
    return <div style={{display:'flex',alignItems:'center',gap:8,padding:`${compact?4:6}px 0`,borderBottom:`1px solid ${BORDER}`,minHeight:h}}>
      <span style={{fontSize:compact?13:15,width:20,textAlign:'center',flexShrink:0}}>{icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:fs,fontWeight:600,color:NAVY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pri}</div>
        <div style={{fontSize:compact?9:10,color:MUTED,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{sec}</div>
      </div>
      {b && badgeTxt && <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:b.bg,color:b.fg,flexShrink:0}}>{badgeTxt}</span>}
      {cta && <button onClick={()=>onAct(cta)} style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:4,border:`1px solid ${GOLD}`,background:'transparent',color:GOLD,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>{cta}</button>}
    </div>;
  }
  if (r[0]==='!') {
    const [,s,title,loc] = r;
    return <div style={{display:'flex',alignItems:'center',gap:8,padding:`${compact?3:5}px 0`,borderBottom:`1px solid ${BORDER}`,minHeight:h}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:sev[s]||sev.low,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:fs,fontWeight:600,color:NAVY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{title}</div>
        <div style={{fontSize:compact?9:10,color:MUTED}}>{loc}</div>
      </div>
    </div>;
  }
  if (r[0]==='~') {
    const [,label,pct,color] = r;
    return <div style={{padding:`${compact?3:5}px 0`,borderBottom:`1px solid ${BORDER}`}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:fs,marginBottom:3}}>
        <span style={{color:NAVY,fontWeight:500}}>{label}</span><span style={{color:MUTED,fontWeight:700}}>{pct}%</span>
      </div>
      <div style={{height:compact?4:6,background:'#E5E7EB',borderRadius:3,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:3,transition:'width 0.5s'}}/>
      </div>
    </div>;
  }
  if (r[0]==='?') {
    const [,item,ok] = r;
    return <div style={{display:'flex',alignItems:'center',gap:8,padding:`${compact?3:5}px 0`,borderBottom:`1px solid ${BORDER}`,fontSize:fs}}>
      <span style={{width:14,height:14,borderRadius:3,border:`2px solid ${ok?'#22C55E':BORDER}`,background:ok?'#DCFCE7':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#166534',flexShrink:0}}>{ok?'✓':''}</span>
      <span style={{color:ok?MUTED:NAVY,textDecoration:ok?'line-through':'none',flex:1}}>{item}</span>
    </div>;
  }
  if (r[0]==='t') {
    const [,label,status,sub] = r;
    const b = BC[status] || BC.pending;
    return <div style={{display:'flex',alignItems:'center',gap:8,padding:`${compact?3:5}px 0`,borderBottom:`1px solid ${BORDER}`,minHeight:h}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:fs,fontWeight:600,color:NAVY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</div>
        <div style={{fontSize:compact?9:10,color:MUTED}}>{sub}</div>
      </div>
      <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:b.bg,color:b.fg,flexShrink:0,textTransform:'capitalize'}}>{status}</span>
    </div>;
  }
  return null;
}

// ── Action Panel (bottom sheet) ───────────────────────────────────
function ActionPanel({pan, onClose, compact}) {
  if (!pan) return null;
  return <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:50,background:'rgba(0,0,0,0.4)',display:'flex',flexDirection:'column',justifyContent:'flex-end',height:'100%'}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:WHITE,borderRadius:'12px 12px 0 0',padding:compact?12:16,boxShadow:'0 -4px 20px rgba(0,0,0,0.15)',maxHeight:'60%',overflow:'auto'}}>
      <div style={{width:32,height:4,background:BORDER,borderRadius:2,margin:'0 auto 12px'}}/>
      <h3 style={{fontSize:compact?13:15,fontWeight:700,color:NAVY,margin:0}}>{pan.t}</h3>
      {pan.i && <p style={{fontSize:compact?11:12,color:MUTED,margin:'8px 0'}}>{pan.i}</p>}
      {pan.f && <div style={{margin:'12px 0'}}>
        <label style={{fontSize:11,fontWeight:600,color:NAVY,display:'block',marginBottom:4}}>{pan.f.l}</label>
        {pan.f.type==='select'
          ? <select style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1px solid ${BORDER}`,fontSize:12,color:NAVY,background:WHITE}}>
              <option>{pan.f.ph}</option>
              {(pan.f.opts||[]).map(o=><option key={o}>{o}</option>)}
            </select>
          : <input type={pan.f.type||'text'} placeholder={pan.f.ph} style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1px solid ${BORDER}`,fontSize:12,color:NAVY,boxSizing:'border-box'}}/>}
      </div>}
      <div style={{display:'flex',gap:8,marginTop:12}}>
        <button onClick={onClose} style={{flex:1,padding:'8px 0',borderRadius:6,border:`1px solid ${BORDER}`,background:WHITE,color:MUTED,fontSize:12,fontWeight:600,cursor:'pointer'}}>Cancel</button>
        <button onClick={onClose} style={{flex:1,padding:'8px 0',borderRadius:6,border:'none',background:GOLD,color:WHITE,fontSize:12,fontWeight:600,cursor:'pointer'}}>{pan.p||'Submit'}</button>
      </div>
    </div>
  </div>;
}

// ── Page Content ──────────────────────────────────────────────────
function PageContent({page, sample, onAct, compact}) {
  const pd = sample ? (PD[page] || {b:PG[page]?.l||page, c:[EMPTY_CARD]}) : {b:PG[page]?.l||page, c:[EMPTY_CARD]};
  return <div style={{padding:compact?8:12}}>
    {/* Banner */}
    <div style={{marginBottom:compact?8:12}}>
      <h2 style={{fontSize:compact?14:17,fontWeight:700,color:NAVY,margin:0}}>{pd.b}</h2>
    </div>
    {/* Stats row */}
    {pd.s && <div style={{display:'flex',gap:compact?6:8,marginBottom:compact?8:12}}>
      {pd.s.map(([v,l],i)=><div key={i} style={{flex:1,background:WHITE,border:`1px solid ${BORDER}`,borderRadius:8,padding:compact?'6px 8px':'8px 12px',textAlign:'center'}}>
        <div style={{fontSize:compact?16:20,fontWeight:700,color:NAVY}}>{v}</div>
        <div style={{fontSize:compact?9:10,color:MUTED}}>{l}</div>
      </div>)}
    </div>}
    {/* Cards */}
    {pd.c.map((card,ci)=><div key={ci} style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:8,padding:compact?8:12,marginBottom:compact?8:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:compact?6:8}}>
        <span style={{fontSize:compact?12:13,fontWeight:700,color:NAVY}}>{card.t}</span>
        {card.a && <button onClick={()=>onAct(card.a)} style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:4,border:'none',background:GOLD,color:WHITE,cursor:'pointer'}}>{card.a}</button>}
      </div>
      {card.r.map((row,ri)=><Row key={ri} r={row} onAct={onAct} compact={compact}/>)}
    </div>)}
  </div>;
}

// ── Simulated Sidebar ─────────────────────────────────────────────
function SidebarNav({role, page, onNav, collapsed, onCollapse}) {
  const allowed = ALLOWED[role] || [];
  return <div style={{width:180,flexShrink:0,background:SB,color:'#CBD5E1',display:'flex',flexDirection:'column',height:'100%',overflow:'auto',fontFamily:'system-ui, -apple-system, sans-serif'}}>
    {/* Logo */}
    <div style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
      <span style={{fontSize:14,fontWeight:800,color:WHITE,letterSpacing:'-0.02em'}}>
        <span style={{color:GOLD}}>Evid</span>LY
      </span>
    </div>
    {/* Dashboard */}
    <button onClick={()=>onNav('dashboard')} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',background:page==='dashboard'?'rgba(164,140,90,0.15)':'transparent',border:'none',borderLeft:page==='dashboard'?`3px solid ${GOLD}`:'3px solid transparent',color:page==='dashboard'?GOLD:'#CBD5E1',cursor:'pointer',fontSize:12,fontWeight:page==='dashboard'?700:500,textAlign:'left',width:'100%'}}>
      ⊞ Dashboard
    </button>
    {/* Calendar (top-level) */}
    {allowed.includes('calendar') && <button onClick={()=>onNav('calendar')} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 14px',background:page==='calendar'?'rgba(164,140,90,0.15)':'transparent',border:'none',borderLeft:page==='calendar'?`3px solid ${GOLD}`:'3px solid transparent',color:page==='calendar'?GOLD:'#CBD5E1',cursor:'pointer',fontSize:11,fontWeight:page==='calendar'?700:500,textAlign:'left',width:'100%'}}>
      📅 Calendar
    </button>}
    {/* Sections */}
    {SECTIONS.map(sec => {
      const visiblePages = sec.pages.filter(p => allowed.includes(p));
      if (visiblePages.length === 0) return null;
      const isOpen = !collapsed[sec.id];
      return <div key={sec.id}>
        <button onClick={()=>onCollapse(sec.id)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'8px 14px',background:'transparent',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',color:'#94A3B8',cursor:'pointer',fontSize:10,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',textAlign:'left'}}>
          <span>{sec.icon} {sec.label}</span>
          <span style={{fontSize:8,transition:'transform 0.2s',transform:isOpen?'rotate(90deg)':'rotate(0)'}}>{isOpen?'▾':'▸'}</span>
        </button>
        {isOpen && visiblePages.map(pid => {
          const pg = PG[pid];
          if (!pg) return null;
          return <button key={pid} onClick={()=>onNav(pid)} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 14px 5px 24px',background:page===pid?'rgba(164,140,90,0.12)':'transparent',border:'none',borderLeft:page===pid?`3px solid ${GOLD}`:'3px solid transparent',color:page===pid?GOLD:'#CBD5E1',cursor:'pointer',fontSize:11,fontWeight:page===pid?600:400,textAlign:'left',width:'100%',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {pg.i} {pg.l}
          </button>;
        })}
      </div>;
    })}
  </div>;
}

// ── Desktop Panel ─────────────────────────────────────────────────
function DesktopPanel({role, page, onNav, sample, pan, setPan}) {
  const isStaff = role === 'kitchen_staff';
  const [collapsed, setCollapsed] = useState({});
  const onCollapse = useCallback(id => setCollapsed(prev => ({...prev,[id]:!prev[id]})), []);
  const act = useCallback(label => { const c = ACT[label]; setPan(c || {t:label,i:`Action: ${label}`,p:'Done'}); }, [setPan]);
  const pgInfo = PG[page] || {l:page,i:'📄'};

  return <div style={{display:'flex',height:'100%',position:'relative',overflow:'hidden',fontFamily:'system-ui, -apple-system, sans-serif'}}>
    {/* Sidebar (hidden for kitchen_staff) */}
    {!isStaff && <SidebarNav role={role} page={page} onNav={onNav} collapsed={collapsed} onCollapse={onCollapse}/>}
    {/* Main area */}
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:PBG}}>
      {/* Header */}
      <div style={{background:WHITE,borderBottom:`1px solid ${BORDER}`,padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {isStaff && <span style={{fontSize:13,fontWeight:800,color:NAVY,marginRight:8}}><span style={{color:GOLD}}>Evid</span>LY</span>}
          <span style={{fontSize:11,color:MUTED}}>Dashboard</span>
          {page!=='dashboard' && <><span style={{fontSize:10,color:BORDER}}>›</span><span style={{fontSize:11,color:NAVY,fontWeight:600}}>{pgInfo.l}</span></>}
        </div>
        {!isStaff && <div style={{display:'flex',gap:6}}>
          <button onClick={()=>act('+ Log Temp')} style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:5,border:'none',background:GOLD,color:WHITE,cursor:'pointer'}}>+ Log Temp</button>
          <button onClick={()=>act('Checklist')} style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:5,border:`1px solid ${BORDER}`,background:WHITE,color:NAVY,cursor:'pointer'}}>Checklist</button>
        </div>}
        {isStaff && <div style={{width:24,height:24,borderRadius:'50%',background:NAVY,display:'flex',alignItems:'center',justifyContent:'center',color:WHITE,fontSize:10,fontWeight:700}}>MR</div>}
      </div>
      {/* Content */}
      <div style={{flex:1,overflow:'auto'}}>
        <PageContent page={page} sample={sample} onAct={act} compact={false}/>
      </div>
    </div>
    {/* Action panel overlay */}
    <ActionPanel pan={pan} onClose={()=>setPan(null)} compact={false}/>
  </div>;
}

// ── Mobile Panel ──────────────────────────────────────────────────
function MobilePanel({role, page, onNav, sample, pan, setPan}) {
  const isStaff = role === 'kitchen_staff';
  const nav = MNAV[role] || MNAV.owner_operator;
  const act = useCallback(label => { const c = ACT[label]; setPan(c || {t:label,i:`Action: ${label}`,p:'Done'}); }, [setPan]);

  return <div style={{display:'flex',flexDirection:'column',height:'100%',position:'relative',overflow:'hidden',background:PBG,fontFamily:'system-ui, -apple-system, sans-serif'}}>
    {/* Mobile header */}
    <div style={{background:WHITE,borderBottom:`1px solid ${BORDER}`,padding:'8px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
      <span style={{fontSize:13,fontWeight:800,color:NAVY}}><span style={{color:GOLD}}>Evid</span>LY</span>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        {!isStaff && <button onClick={()=>act('+ Log Temp')} style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:4,border:'none',background:GOLD,color:WHITE,cursor:'pointer'}}>+ Log Temp</button>}
        <div style={{width:22,height:22,borderRadius:'50%',background:NAVY,display:'flex',alignItems:'center',justifyContent:'center',color:WHITE,fontSize:9,fontWeight:700}}>MR</div>
      </div>
    </div>
    {/* Content */}
    <div style={{flex:1,overflow:'auto'}}>
      <PageContent page={page} sample={sample} onAct={act} compact={true}/>
    </div>
    {/* Bottom nav */}
    <div style={{display:'flex',background:WHITE,borderTop:`1px solid ${BORDER}`,flexShrink:0}}>
      {nav.map(([id,label,icon])=><button key={id} onClick={()=>onNav(id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'6px 0 4px',border:'none',background:'transparent',cursor:'pointer',color:page===id?GOLD:MUTED,fontSize:8,fontWeight:page===id?700:500}}>
        <span style={{fontSize:14}}>{icon}</span>
        <span>{label}</span>
      </button>)}
    </div>
    {/* Action panel overlay */}
    <ActionPanel pan={pan} onClose={()=>setPan(null)} compact={true}/>
  </div>;
}

// ── Main Component ────────────────────────────────────────────────
export default function RolePreview() {
  const [role, setRole] = useState('owner_operator');
  const [dPage, setDPage] = useState('dashboard');
  const [mPage, setMPage] = useState('dashboard');
  const [sample, setSample] = useState(true);
  const [dPan, setDPan] = useState(null);
  const [mPan, setMPan] = useState(null);

  const switchRole = useCallback((r) => {
    setRole(r);
    setDPage('dashboard');
    setMPage('dashboard');
    setDPan(null);
    setMPan(null);
  }, []);

  const onDNav = useCallback((p) => { setDPage(p); setDPan(null); }, []);
  const onMNav = useCallback((p) => { setMPage(p); setMPan(null); }, []);

  const rl = ROLES.find(r2 => r2.v === role);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#F1F3F5',margin:'-36px -44px',width:'calc(100% + 88px)',fontFamily:'system-ui, -apple-system, sans-serif'}}>
      {/* ── Top Bar: Role pills + Sample toggle ── */}
      <div style={{background:NAVY,padding:'10px 20px',display:'flex',alignItems:'center',gap:12,flexShrink:0,borderBottom:`2px solid ${GOLD}`,flexWrap:'wrap'}}>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.08em',color:GOLD,textTransform:'uppercase',marginRight:4}}>Role Preview</span>
        {/* Role pills */}
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {ROLES.map(r2 => (
            <button key={r2.v} onClick={() => switchRole(r2.v)} style={{
              fontSize:11, fontWeight:role===r2.v?700:500, padding:'5px 12px', borderRadius:16,
              border:role===r2.v?`2px solid ${GOLD}`:'1px solid #374151',
              background:role===r2.v?'rgba(164,140,90,0.2)':'transparent',
              color:role===r2.v?GOLD:'#9CA3AF', cursor:'pointer', whiteSpace:'nowrap',
              transition:'all 0.15s',
            }}>{r2.l}</button>
          ))}
        </div>
        <div style={{flex:1}}/>
        {/* Sample data toggle */}
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:10,color:'#9CA3AF',fontWeight:500}}>Sample data</span>
          <button onClick={()=>setSample(!sample)} style={{
            background:sample?GOLD:'#374151', border:'none', borderRadius:12,
            width:36, height:20, cursor:'pointer', position:'relative', transition:'background 0.2s',
          }}>
            <span style={{position:'absolute',top:2,left:sample?18:2,width:16,height:16,background:WHITE,borderRadius:'50%',transition:'left 0.2s'}}/>
          </button>
        </div>
      </div>

      {/* ── Role banner ── */}
      <div style={{background:'#FFF8E7',borderBottom:'1px solid #F3D47A',padding:'6px 20px',fontSize:11,color:'#92400E',flexShrink:0,display:'flex',alignItems:'center',gap:6}}>
        <span style={{fontWeight:700}}>ROLE PREVIEW MODE</span>
        <span style={{color:'#D1A94A'}}>›</span>
        <span>Viewing as <strong>{rl?.l}</strong> — {sample ? 'sample data active' : 'empty states shown'}</span>
      </div>

      {/* ── Panels: Desktop + Mobile side by side ── */}
      <div style={{flex:1,display:'flex',gap:12,padding:12,overflow:'hidden',background:'#E5E7EB'}}>
        {/* Desktop panel */}
        <div style={{flex:1,background:WHITE,borderRadius:8,overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 2px 12px rgba(0,0,0,0.1)'}}>
          <div style={{background:NAVY,color:GOLD,fontSize:10,fontWeight:700,textAlign:'center',padding:'5px',letterSpacing:'0.06em',flexShrink:0}}>
            DESKTOP — {rl?.l.toUpperCase()}
          </div>
          <div style={{flex:1,overflow:'hidden'}}>
            <DesktopPanel role={role} page={dPage} onNav={onDNav} sample={sample} pan={dPan} setPan={setDPan}/>
          </div>
        </div>

        {/* Mobile panel */}
        <div style={{width:360,flexShrink:0,background:WHITE,borderRadius:8,overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 2px 12px rgba(0,0,0,0.1)'}}>
          <div style={{background:NAVY,color:GOLD,fontSize:10,fontWeight:700,textAlign:'center',padding:'5px',letterSpacing:'0.06em',flexShrink:0}}>
            MOBILE — {rl?.l.toUpperCase()}
          </div>
          <div style={{flex:1,overflow:'hidden'}}>
            <MobilePanel role={role} page={mPage} onNav={onMNav} sample={sample} pan={mPan} setPan={setMPan}/>
          </div>
        </div>
      </div>
    </div>
  );
}
