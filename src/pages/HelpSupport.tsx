import { useState } from 'react';
import { toast } from 'sonner';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { Breadcrumb } from '../components/Breadcrumb';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';

// ── Styles ───────────────────────────────────────────────────────
const F = { fontFamily: "'DM Sans', sans-serif" };
const cardStyle = { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', ...F };
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
  fontSize: '14px', color: '#374151', outline: 'none', ...F, boxSizing: 'border-box' as const,
};
const labelStyle = { fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block', ...F };
const btnPrimary = {
  padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#1b4965',
  color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer', ...F,
};

// ── Knowledge Base Data ──────────────────────────────────────────
interface Article { id: string; title: string; views: number; helpful: number; body: string; }
interface FaqCategory { id: string; name: string; icon: string; articles: Article[]; }

const FAQ_CATEGORIES: FaqCategory[] = [
  // ── Category 1: Getting Started ──
  { id: 'getting-started', name: 'Getting Started', icon: '\u{1F680}', articles: [
    { id: 'gs-1', title: 'Welcome to EvidLY', views: 1842, helpful: 94, body: `EvidLY is a compliance management platform built for commercial kitchens. It covers two pillars — Food Safety and Facility Safety — giving you a single place to manage inspections, temperature readings, checklists, vendor services, documents, and compliance scores. When you first log in, you’ll land on the Dashboard, which shows your tasks for today, any overdue items, and upcoming deadlines. Start by adding your first location under Administration → Locations. Once your location is set up, EvidLY automatically configures jurisdiction-specific compliance requirements based on your county and state. From there, you can assign roles to your team, set up daily checklists, and begin logging temperature readings.` },
    { id: 'gs-2', title: 'Adding Your First Location', views: 1256, helpful: 91, body: `Go to Administration → Locations → Add Location. Enter the kitchen name, address, city, state, and zip code. EvidLY uses your address to identify your local health authority and fire jurisdiction, then auto-configures the compliance requirements specific to that jurisdiction. For example, a kitchen in Fresno County will see CalCode requirements and Fresno County inspection standards, while a kitchen in a National Park like Yosemite will see both FDA Food Code 2022 and county requirements. After adding the location, go to Jurisdiction Settings to verify the auto-configured requirements are correct.` },
    { id: 'gs-3', title: 'Inviting Team Members', views: 987, helpful: 88, body: `Go to Administration → Team → Invite Member. Enter their email and assign a role. EvidLY has seven roles, each with a tailored view: Owner/Operator (full access to all locations), Executive (high-level analytics and reports), Compliance Officer (regulatory and documentation focus), Facilities Manager (equipment and vendor management), Chef (food safety and temperature monitoring), Kitchen Manager (day-to-day operations and staff), and Kitchen Staff (assigned checklists and temperature readings). Each role sees only what’s relevant to their job, so a line cook isn’t overwhelmed with vendor contracts, and a facilities manager isn’t buried in food handler certifications.` },
    { id: 'gs-4', title: 'Understanding the Dashboard', views: 1534, helpful: 93, body: `The Dashboard has two tabs: Overview and Today. The Overview tab shows your compliance scores across all locations, recent activity, and trend data. The Today tab is your daily action center — it shows tasks due today, overdue items, and upcoming deadlines. The three stat cards at the top (Tasks Today, Overdue, Upcoming) give you an instant read on where things stand. Below that, Today’s Tasks lists everything that needs attention, sorted by priority. The quick links at the bottom — Calendar, Temperature Readings, and Checklists — take you to the most commonly used features.` },
    { id: 'gs-5', title: 'Navigating the Sidebar', views: 762, helpful: 90, body: `The sidebar is your main navigation. It’s organized into sections: Dashboard, Calendar, Food Safety (temperature readings, checklists, HACCP), Facility Safety (equipment, vendor services, facility checklists), Compliance (scores, documents, self-inspections, jurisdiction settings), Insights (reports, analytics, trends), Tools (incident reporting, corrective actions), and Administration (team, locations, settings, billing). Use the search bar at the top of the sidebar to quickly jump to any page.` },
    { id: 'gs-6', title: 'Setting Up Notifications', views: 654, helpful: 89, body: `Go to Administration → Settings → Notifications to configure how and when EvidLY alerts you. You can set up notifications for overdue tasks, upcoming inspections, expiring documents, vendor service deadlines, temperature excursions, and compliance score changes. Notifications can be delivered via email or in-app alerts. We recommend turning on critical alerts for temperature excursions and upcoming health department inspections at minimum.` },
    { id: 'gs-7', title: 'Quick Start Checklist', views: 1124, helpful: 92, body: `Here’s what to do in your first 10 minutes: (1) Add your location, (2) Verify jurisdiction settings, (3) Invite at least one team member, (4) Set up your first daily checklist, (5) Log your first temperature reading, (6) Upload one compliance document (like your health permit), (7) Review your initial compliance score. Once these seven steps are done, EvidLY is working for you.` },
  ]},

  // ── Category 2: Temperature Readings ──
  { id: 'temp-readings', name: 'Temperature Readings', icon: '\u{1F321}️', articles: [
    { id: 'tr-1', title: 'Logging a Temperature Reading', views: 2341, helpful: 96, body: `Go to Food Safety → Temperature Readings → Log Reading. Select the equipment (walk-in cooler, freezer, hot hold station, etc.), enter the temperature, and confirm the reading. EvidLY validates the reading against the safe threshold — 41°F or below for cold holding, 135°F or above for hot holding. If the reading is out of range, EvidLY flags it immediately and prompts you to take corrective action. Readings are timestamped and tied to the logged-in user, creating an auditable chain of custody. You can log readings manually, via QR code on mobile devices, or automatically through IoT sensor integrations.` },
    { id: 'tr-2', title: 'Temperature Thresholds and Danger Zones', views: 1876, helpful: 93, body: `The Temperature Danger Zone is 41°F to 135°F — this is where bacteria multiply fastest. Cold holding must stay at or below 41°F. Hot holding must stay at or above 135°F. Cooking temperatures vary by protein: 165°F for poultry, 155°F for ground meat, and 145°F for whole cuts of meat, fish, and eggs. These thresholds come from the FDA Food Code and CalCode. EvidLY enforces them automatically when you log readings — if a walk-in cooler reads 45°F, you’ll see a red alert immediately.` },
    { id: 'tr-3', title: 'Setting Up Temperature Equipment', views: 1124, helpful: 89, body: `Go to Food Safety → Temperature Readings → Equipment Setup. Add each piece of equipment that requires temperature monitoring: walk-in coolers, walk-in freezers, reach-in refrigerators, prep coolers, hot hold stations, and any other TCS (Time/Temperature Control for Safety) food storage. For each piece of equipment, set the name, location area (e.g., "Kitchen," "Prep Area," "Walk-in"), the type (cold or hot), and the monitoring schedule (how often readings should be taken). EvidLY uses this to generate your daily temperature reading tasks.` },
    { id: 'tr-4', title: 'Cooling Logs', views: 987, helpful: 91, body: `Cooling is one of the most critical food safety steps. The current CalCode standard requires food to cool from 135°F to 70°F within 2 hours, then from 70°F to 41°F within 4 additional hours (6 hours total). Starting April 1, 2026, California’s Stage 1 rule changes this — the clock starts at the actual cooked temperature, not 135°F, making the first stage stricter. EvidLY tracks both stages automatically. When you start a cooling log, enter the food item and starting temperature. EvidLY will prompt you at timed intervals to record progress and will alert you if the cooling rate is too slow.` },
    { id: 'tr-5', title: 'Receiving Temperature Inspections', views: 876, helpful: 90, body: `When deliveries arrive, you must verify that cold items are at 41°F or below and hot items are at 135°F or above. Go to Food Safety → Temperature Readings → Receiving. Log the vendor, delivery items, and temperatures. If anything is out of range, EvidLY flags it for rejection or corrective action. This protects you during health inspections — inspectors look for receiving logs as proof that you’re verifying food safety at the point of delivery.` },
    { id: 'tr-6', title: 'Temperature Reading Reports', views: 1432, helpful: 92, body: `Go to Insights → Reports → Temperature to see trends over time. Reports show daily, weekly, and monthly averages by equipment, highlight out-of-range readings, and identify patterns (like a cooler that consistently trends high). These reports are useful for health inspector requests, internal audits, and preventive maintenance — if a cooler’s average temperature is creeping up over weeks, it may need service before it fails.` },
  ]},

  // ── Category 3: Checklists & Tasks ──
  { id: 'checklists', name: 'Checklists & Tasks', icon: '✅', articles: [
    { id: 'cl-1', title: 'Using Checklist Templates', views: 1654, helpful: 91, body: `EvidLY comes with pre-built checklist templates for common kitchen operations — opening checklists, closing checklists, food safety walkthroughs, and equipment maintenance routines. Go to Food Safety → Checklists to see available templates. Click "Use Template" to add one to your active checklists, then "Start Checklist" to begin checking off items. Each completed checklist is timestamped and tied to the user who completed it, creating documentation for inspections and audits.` },
    { id: 'cl-2', title: 'Creating Custom Checklists', views: 1203, helpful: 87, body: `Go to Food Safety → Checklists → Create Template. Give it a name, assign a role (who should complete it), set the estimated time, and add your checklist items. You can create checklists for anything — daily cleaning routines, weekly equipment checks, monthly deep cleans, or event-specific prep lists. Once created, the template is available to use and assign to team members. Use the "Modify Template" button to edit a template after creating it.` },
    { id: 'cl-3', title: 'HACCP Checklists and Critical Control Points', views: 945, helpful: 90, body: `HACCP (Hazard Analysis Critical Control Points) checklists are specialized food safety checklists that monitor Critical Control Points (CCPs). EvidLY includes four HACCP checklists: Cooking Temperature Log (CCP: Cooking — verifies proteins reach safe internal temps), Cooling Log (CCP: Cooling — tracks the two-stage cooling process), Hot Holding Monitoring (CCP: Hot Holding — ensures TCS food stays at 135°F or above), and Cold Holding Monitoring (CCP: Cold Holding — ensures TCS food stays at 41°F or below). Each checklist displays the CCP badge, critical limit, and required corrective action if the limit is exceeded.` },
    { id: 'cl-4', title: 'Assigning Checklists to Team Members', views: 1098, helpful: 89, body: `Go to the checklist template and click "Assign." Select the team member(s) and set the frequency — daily, weekly, monthly, or custom. Assigned checklists appear in the team member’s daily task list on their Dashboard. Kitchen Staff see only their assigned checklists, keeping their view simple and focused. Managers can track completion status across the team.` },
    { id: 'cl-5', title: 'Equipment Maintenance Checklists', views: 876, helpful: 88, body: `Under Facility Safety → Checklists, you’ll find equipment maintenance templates: Ice Machine Weekly Cleaning, Ice Machine Monthly Service, Exhaust Fan Monthly Inspection (NFPA 96), Exhaust Fan Quarterly Service (NFPA 96 Table 12.4), and Equipment Weekly Inspection. These are critical for fire safety compliance and equipment longevity. The exhaust fan checklists reference NFPA 96 (2024 edition) standards directly, so your maintenance documentation aligns with what fire inspectors expect.` },
    { id: 'cl-6', title: 'Viewing Checklist History', views: 762, helpful: 91, body: `Every completed checklist is saved with the date, time, user, and individual item responses. Go to Food Safety → Checklists → History to see past completions. You can filter by template, user, location, and date range. This history is your documentation trail — if a health inspector asks to see your last 30 days of opening checklists, you can pull them up instantly. Export to PDF for inspector packages.` },
  ]},

  // ── Category 4: Facility Safety ──
  { id: 'facility-safety', name: 'Facility Safety', icon: '\u{1F525}', articles: [
    { id: 'fs-1', title: 'Facility Safety Overview', views: 1198, helpful: 92, body: `Facility Safety is EvidLY’s second pillar, covering everything related to the physical building and equipment — hood cleaning, fire suppression systems, fire extinguishers, pest control, grease traps, elevators, and backflow prevention. These are the seven vendor service categories EvidLY tracks. Go to Facility Safety to see your facility safety checklist, equipment status, and vendor service schedules. Keeping these current is critical — fire code violations can shut a kitchen down faster than food safety violations.` },
    { id: 'fs-2', title: 'NFPA 96 and Hood Cleaning', views: 987, helpful: 90, body: `NFPA 96 is the national standard for commercial kitchen exhaust systems. It covers hood cleaning frequency, exhaust fan maintenance, fire suppression inspection, and duct cleaning. Cleaning frequency is determined by NFPA 96 Table 12.4 based on cooking volume and type — high-volume operations like 24-hour kitchens may need monthly cleaning, while moderate-volume operations may need quarterly. EvidLY tracks your cleaning schedule based on your operation type and alerts you when service is due. Always use an IKECA-certified contractor for hood cleaning.` },
    { id: 'fs-3', title: 'Fire Safety Equipment Tracking', views: 876, helpful: 88, body: `Go to Facility Safety → Equipment to see all fire safety equipment for your location. This includes fire extinguishers (annual inspection, 6-year maintenance, 12-year hydrostatic test), Ansul fire suppression systems (semi-annual inspection), and hood cleaning records. Each piece of equipment has a status, last service date, and next service due date. EvidLY sends alerts when maintenance is approaching so nothing expires.` },
    { id: 'fs-4', title: 'Vendor Service Scheduling', views: 1054, helpful: 91, body: `EvidLY tracks seven vendor service categories: Hood Cleaning, Fire Suppression, Fire Extinguisher, Pest Control, Grease Trap, Elevator Inspection, and Backflow Prevention. Go to Facility Safety → Vendor Services to see upcoming and overdue services. You can add your vendors, set service frequencies, and upload completion certificates. When a vendor completes service, log it in EvidLY to keep your compliance documentation current.` },
    { id: 'fs-5', title: 'Facility Safety Checklists', views: 654, helpful: 87, body: `Facility safety checklists cover the physical inspection of your kitchen’s safety equipment and building systems. These include daily walkthroughs (fire exits clear, extinguishers accessible, hood system operating), weekly checks (grease filter condition, exhaust fan operation), and monthly inspections (fire suppression system visual check, emergency lighting test). Assign these to your Facilities Manager role for consistent tracking.` },
  ]},

  // ── Category 5: Compliance & Inspections ──
  { id: 'compliance', name: 'Compliance & Inspections', icon: '\u{1F6E1}️', articles: [
    { id: 'co-1', title: 'Understanding Your Compliance Score', views: 2156, helpful: 95, body: `Your compliance score is calculated based on two pillars — Food Safety and Facility Safety — weighted according to your jurisdiction’s methodology. Each pillar has two components: Operations (day-to-day activities like temperature readings and checklists) and Documentation (permits, certificates, and records). The weights for each component come from your jurisdiction’s configuration — EvidLY never uses a one-size-fits-all formula. Your score updates in real time as you complete tasks, upload documents, and log activities.` },
    { id: 'co-2', title: 'Jurisdiction Intelligence Engine (JIE)', views: 1789, helpful: 93, body: `EvidLY’s Jurisdiction Intelligence Engine identifies your local health authority and fire authority based on your kitchen’s address, then configures compliance requirements specific to that jurisdiction. California has 62 local enforcement agencies, each with different inspection methodologies, scoring systems, and emphasis areas. The JIE knows the differences — for example, Fresno County has low transparency (inspection reports are hard to find online), while Merced County has high transparency. Locations in Yosemite National Park have dual jurisdiction: NPS uses FDA Food Code 2022 and Mariposa County uses CalCode, requiring two separate inspections.` },
    { id: 'co-3', title: 'Self-Inspections', views: 1432, helpful: 92, body: `Go to Compliance → Self-Inspection to conduct a pre-inspection walkthrough using the same criteria your health inspector uses. EvidLY generates self-inspection checklists specific to your jurisdiction — not generic templates. This means the items you check are the same items your inspector will check. Complete a self-inspection before your health department visit to identify and fix issues before they become violations. Self-inspection results are saved for your records but are internal — they’re not shared with inspectors.` },
    { id: 'co-4', title: 'Document Management', views: 1654, helpful: 94, body: `Go to Compliance → Documents to upload and manage all compliance documents. This includes health permits, business licenses, food handler certifications, fire inspection certificates, hood cleaning certificates, pest control reports, insurance documents, and more. EvidLY tracks expiration dates and alerts you when documents are approaching renewal. During an inspection, you can pull up any document instantly instead of digging through filing cabinets.` },
    { id: 'co-5', title: 'Preparing for Health Inspections', views: 2087, helpful: 97, body: `Go to Compliance → Inspection Prep to see a checklist of everything to have ready before your inspector arrives. This includes ensuring all staff food handler certs are current, temperature logs are up to date, cleaning schedules are documented, self-inspection was recently completed, and all permits are posted. EvidLY’s Export Inspector Package feature bundles your compliance documentation into a downloadable PDF you can hand to your inspector.` },
    { id: 'co-6', title: 'Corrective Actions (CAPA)', views: 1203, helpful: 91, body: `When a violation is found — during a self-inspection, health department visit, or a temperature excursion — EvidLY helps you create a Corrective Action Plan (CAPA). Go to Tools → Corrective Actions → New. Document what happened, what was done to fix it, what will prevent it from happening again, who is responsible, and the deadline. Corrective actions are tracked to completion and become part of your compliance history, demonstrating to inspectors that you take violations seriously.` },
    { id: 'co-7', title: 'Compliance Reports and Export', views: 945, helpful: 89, body: `Go to Insights → Reports → Compliance for a comprehensive view of your compliance posture over time. Reports show score trends, completed tasks, open corrective actions, document status, and inspection history. You can export reports as PDF for board presentations, insurance submissions, or franchise reporting. The Export Inspector Package on the HACCP Status page bundles all relevant compliance documentation for a specific location.` },
  ]},

  // ── Category 6: Vendor Services ──
  { id: 'vendors', name: 'Vendor Services', icon: '\u{1F91D}', articles: [
    { id: 'vs-1', title: 'Managing Vendors', views: 1098, helpful: 90, body: `Go to Tools → Vendor Management to add and manage your service providers. For each vendor, enter their company name, contact information, service type, and contract details. EvidLY supports seven vendor service categories: Hood Cleaning, Fire Suppression, Fire Extinguisher, Pest Control, Grease Trap, Elevator Inspection, and Backflow Prevention. Having vendors in the system lets you track service schedules, upload certificates, and get alerts when contracts are expiring.` },
    { id: 'vs-2', title: 'Tracking Service Schedules', views: 876, helpful: 88, body: `Each vendor service has a required frequency — hood cleaning may be monthly or quarterly depending on cooking volume (NFPA 96 Table 12.4), fire extinguishers need annual inspection, pest control is typically monthly, and grease traps need quarterly pumping. EvidLY tracks these schedules and shows upcoming and overdue services on your Dashboard and in the Facility Safety section. When a service is completed, log the date and upload the certificate to keep your records current.` },
    { id: 'vs-3', title: 'Uploading Service Certificates', views: 654, helpful: 86, body: `After a vendor completes service, go to the vendor service record and click "Upload Certificate." Attach the completion certificate, inspection report, or service receipt. This documentation is critical — fire inspectors will ask for your hood cleaning certificate, and health inspectors may ask for pest control reports. Having them in EvidLY means you can pull them up instantly during an inspection.` },
    { id: 'vs-4', title: 'Vendor Contract Renewals', views: 762, helpful: 87, body: `EvidLY alerts you when vendor contracts are approaching expiration. Go to Tools → Vendor Management to see contract end dates across all vendors. We recommend starting the renewal process at least 30 days before expiration so there’s no gap in coverage. A lapsed pest control contract or expired fire suppression inspection can result in violations during inspections.` },
    { id: 'vs-5', title: 'Choosing Qualified Vendors', views: 543, helpful: 91, body: `For hood cleaning, always use an IKECA-certified contractor who follows NFPA 96 standards. For fire suppression (Ansul systems), use a contractor licensed by the State Fire Marshal. For fire extinguishers, use a contractor with state fire extinguisher service license. For pest control, use a licensed Pest Control Operator (PCO). EvidLY helps you verify vendor qualifications by tracking certifications and license numbers in the vendor profile.` },
  ]},

  // ── Category 7: Insights & Reports ──
  { id: 'insights', name: 'Insights & Reports', icon: '\u{1F4CA}', articles: [
    { id: 'ir-1', title: 'Dashboard Analytics', views: 1376, helpful: 92, body: `The Overview tab on your Dashboard provides high-level analytics — compliance scores across locations, trend lines showing improvement or decline, task completion rates, and alert summaries. For multi-location operators, this is your command center. Executives and Owners see all locations at a glance. Drill down into any metric by clicking on it.` },
    { id: 'ir-2', title: 'Generating Reports', views: 1098, helpful: 90, body: `Go to Insights → Reports to generate compliance, temperature, checklist, and vendor service reports. Select the report type, date range, and location(s). Reports can be viewed in-app or exported as PDF. Monthly compliance reports are useful for franchise reporting, insurance reviews, and internal accountability. Set up report subscriptions to receive scheduled reports via email.` },
    { id: 'ir-3', title: 'Trend Analysis', views: 876, helpful: 88, body: `Go to Insights → Trends to see how your compliance metrics change over time. This includes compliance score trends, temperature reading averages, checklist completion rates, incident frequency, and corrective action closure times. Trend data helps you identify systemic issues — for example, if cold holding temperatures consistently creep up on Fridays, that might indicate end-of-week equipment strain or staffing gaps.` },
    { id: 'ir-4', title: 'Export Inspector Package', views: 1432, helpful: 93, body: `The Inspector Package is a bundled PDF of all compliance documentation for a specific location. It includes your compliance score, recent self-inspection results, temperature logs, checklist completions, vendor service certificates, staff certifications, and HACCP documentation. Go to HACCP Status and click "Export Inspector Package" or generate one from Insights → Reports. This is your go-to document when an inspector walks in.` },
  ]},

  // ── Category 8: Calendar & Scheduling ──
  { id: 'calendar', name: 'Calendar & Scheduling', icon: '\u{1F4C5}', articles: [
    { id: 'cs-1', title: 'Using the Compliance Calendar', views: 987, helpful: 93, body: `The Calendar shows all compliance events, inspections, vendor services, and deadlines in one place. You can view by day, week, or month. Events are color-coded by type: Temperature Readings (red), Checklists (blue), Vendor Services (purple), Inspections (orange), Corrective Actions (pink), Certifications (yellow), and Meetings (light blue). Click any event to see details. Use the filters (All Types, All Locations, All Categories) to narrow your view.` },
    { id: 'cs-2', title: 'Adding Calendar Events', views: 762, helpful: 90, body: `Click "+ Add Event" to create a new calendar entry. Enter the title, category, vendor (if applicable), date, start/end time, location, description, and recurrence (one-time, daily, weekly, monthly, or custom). Calendar events can be used for scheduling inspections, vendor service appointments, training sessions, staff meetings, or any compliance-related deadline.` },
    { id: 'cs-3', title: 'Calendar Notifications', views: 654, helpful: 88, body: `EvidLY sends reminders for upcoming calendar events based on your notification settings. By default, you’ll get a reminder 24 hours before an event and again 1 hour before. For critical events like health department inspections, we recommend setting reminders starting 7 days out so your team has time to prepare. Customize notification timing in Administration → Settings → Notifications.` },
  ]},

  // ── Category 9: Roles & Permissions ──
  { id: 'roles', name: 'Roles & Permissions', icon: '\u{1F510}', articles: [
    { id: 'rp-1', title: 'Understanding Roles', views: 876, helpful: 91, body: `EvidLY has seven roles, each designed for a specific job function: Owner/Operator sees everything across all locations. Executive sees high-level analytics and reports. Compliance Officer focuses on regulatory compliance, documents, and inspections. Facilities Manager handles equipment, vendors, and building systems. Chef manages food safety operations, temperature readings, and kitchen staff certifications. Kitchen Manager handles daily operations, checklists, and staff scheduling. Kitchen Staff sees only their assigned tasks — checklists and temperature readings. Every page, button, and data point is filtered by role so each team member sees exactly what they need.` },
    { id: 'rp-2', title: 'Assigning and Changing Roles', views: 654, helpful: 89, body: `Go to Administration → Team to see all team members and their current roles. Click on a team member to change their role. Role changes take effect immediately — the team member’s view updates the next time they load the app. A team member can only have one role at a time. If someone needs access to features outside their role, upgrade them to the next level up in the hierarchy.` },
    { id: 'rp-3', title: 'Role Hierarchy and Access Levels', views: 543, helpful: 87, body: `The role hierarchy from most access to least: Owner/Operator → Executive → Compliance Officer → Facilities Manager → Chef → Kitchen Manager → Kitchen Staff. Higher roles can see everything lower roles see, plus additional features. For example, a Kitchen Manager can see everything Kitchen Staff sees plus staff management and delegation tools. An Owner can see everything across all roles and all locations. Use the principle of least privilege — give each team member the minimum role they need to do their job.` },
  ]},

  // ── Category 10: Account & Billing ──
  { id: 'billing', name: 'Account & Billing', icon: '\u{1F4B3}', articles: [
    { id: 'ab-1', title: 'Subscription Plans', views: 1543, helpful: 89, body: `EvidLY offers three tiers: Founder Plan ($99/month base + $49 per location for 1-10 locations), Standard Plan ($199/month base + $99 per location), and Enterprise (custom pricing for 11+ locations). The Founder Plan includes early adopter benefits and is available to the first 1,000 customers. Annual billing gives you 2 months free (pay for 10 months, get 12). All plans include full access to both Food Safety and Facility Safety pillars, the Jurisdiction Intelligence Engine, and all compliance features.` },
    { id: 'ab-2', title: 'Adding and Removing Locations', views: 1201, helpful: 87, body: `Go to Administration → Locations to add or remove locations. Each location added increases your monthly per-location fee. When you remove a location, the billing adjustment takes effect at the start of your next billing cycle. Location data is retained for 90 days after removal in case you need to restore it.` },
    { id: 'ab-3', title: 'Managing Your Subscription', views: 876, helpful: 93, body: `Go to Administration → Billing to view your current plan, payment method, billing history, and upcoming charges. You can upgrade, downgrade, or cancel your subscription at any time. Upgrades take effect immediately. Downgrades and cancellations take effect at the end of your current billing period. If you have questions about billing, email founders@getevidly.com.` },
    { id: 'ab-4', title: 'Data Export and Ownership', views: 654, helpful: 90, body: `Your data belongs to you. You can export all of your compliance data, temperature logs, checklists, documents, and reports at any time from Administration → Settings → Data Export. Exports are delivered as CSV files for structured data and a ZIP archive for documents. If you cancel your subscription, you have 90 days to export your data before it’s permanently deleted.` },
    { id: 'ab-5', title: 'Security and Privacy', views: 987, helpful: 92, body: `EvidLY uses Supabase with Row-Level Security (RLS) to ensure your data is only accessible to authorized users in your organization. All data is encrypted in transit (HTTPS) and at rest. We do not share your data with third parties. Your compliance scores, temperature logs, and inspection data are private to your organization unless you explicitly share them (such as exporting an Inspector Package or sharing an insurance risk score).` },
  ]},

  // ── Category 11: HACCP ──
  { id: 'haccp', name: 'HACCP', icon: '\u{1F6E1}️', articles: [
    { id: 'hc-1', title: 'What is HACCP?', views: 876, helpful: 92, body: `HACCP (Hazard Analysis Critical Control Points) is a systematic approach to food safety that identifies, evaluates, and controls physical, chemical, and biological hazards. Rather than testing finished products, HACCP focuses on preventing hazards at specific points in the food handling process. EvidLY’s HACCP module tracks four Critical Control Points: Cooking (ensuring food reaches safe internal temperatures), Cooling (ensuring food cools through the danger zone quickly enough), Hot Holding (ensuring hot food stays at 135°F or above), and Cold Holding (ensuring cold food stays at 41°F or below).` },
    { id: 'hc-2', title: 'Critical Control Points Explained', views: 762, helpful: 90, body: `A Critical Control Point (CCP) is a step in the food handling process where a hazard can be prevented, eliminated, or reduced to a safe level. Each CCP has three elements: a critical limit (the measurable boundary that must not be exceeded), a monitoring procedure (how and when to check), and a corrective action (what to do if the limit is exceeded). For example, the Cooking CCP has critical limits of 165°F for poultry, 155°F for ground meat, and 145°F for whole cuts. If food doesn’t reach the required temperature, the corrective action is to continue cooking or discard.` },
    { id: 'hc-3', title: 'HACCP Monitoring and Logging', views: 654, helpful: 88, body: `EvidLY’s HACCP checklists are designed for real-time monitoring. When a Kitchen Staff or Chef completes a HACCP checklist, they record actual measurements at each CCP. EvidLY validates these measurements against the critical limits and flags any deviations immediately. If a hot hold station reads 128°F (below the 135°F limit), EvidLY triggers a corrective action prompt. All HACCP logs are timestamped, tied to a specific user, and stored permanently for audit and inspection purposes.` },
    { id: 'hc-4', title: 'HACCP Documentation for Inspectors', views: 543, helpful: 86, body: `Health inspectors frequently ask to see HACCP documentation — particularly cooling logs and cooking temperature records. EvidLY maintains a complete audit trail of every HACCP checklist completion, including who completed it, when, what temperatures were recorded, and whether any corrective actions were taken. Use the Export Inspector Package to bundle HACCP documentation into a presentation-ready PDF. Having organized, digital HACCP records demonstrates a proactive food safety culture to inspectors.` },
  ]},

  // ── Category 12: Multi-Location Management ──
  { id: 'multi-location', name: 'Multi-Location Management', icon: '\u{1F3E2}', articles: [
    { id: 'ml-1', title: 'Managing Multiple Locations', views: 762, helpful: 93, body: `For operators with more than one kitchen, EvidLY provides a unified view across all locations. The Dashboard Overview shows compliance scores and alerts for every location side by side. You can switch between locations using the location selector in the header, or view all locations at once. Each location has its own jurisdiction configuration, compliance score, team assignments, and checklist schedules — because a kitchen in Fresno operates under different rules than a kitchen in Los Angeles.` },
    { id: 'ml-2', title: 'Location-Level vs Organization-Level Data', views: 543, helpful: 90, body: `Some data in EvidLY is location-specific (temperature readings, checklists, compliance scores, vendor services) and some is organization-wide (team member list, billing, report subscriptions). When you’re viewing location-specific data, make sure you have the correct location selected. Compliance scores are always calculated per-location because each location has its own jurisdiction and compliance requirements.` },
    { id: 'ml-3', title: 'Enterprise Accounts', views: 432, helpful: 88, body: `For organizations with 11 or more locations, EvidLY offers Enterprise pricing with custom configurations, dedicated support, and multi-year contract options. Enterprise accounts include additional features like custom compliance reporting, API access for integration with existing systems, and priority support. Contact founders@getevidly.com to discuss Enterprise pricing.` },
  ]},
];

const QUICK_HELP = [
  { id: 'qh-1', title: 'Quick Start Guide', icon: '\u{1F680}', desc: 'Get up and running in under 10 minutes', color: '#1b4965' },
  { id: 'qh-2', title: 'Daily Temperature Readings', icon: '\u{1F321}️', desc: 'Step-by-step temperature logging walkthrough', color: '#dc2626' },
  { id: 'qh-3', title: 'Understanding Scores', icon: '\u{1F6E1}️', desc: 'How your compliance score is calculated', color: '#16a34a' },
];

// ── Demo Tickets ─────────────────────────────────────────────────
interface Ticket { id: string; subject: string; category: string; status: 'open' | 'awaiting' | 'solved'; priority: 'low' | 'normal' | 'high' | 'urgent'; created: string; }

const DEMO_TICKETS: Ticket[] = [
  { id: 'TKT-4821', subject: 'Temperature sensor showing incorrect readings', category: 'Technical Support', status: 'open', priority: 'high', created: '2026-02-07' },
  { id: 'TKT-4756', subject: 'How to export compliance report as PDF', category: 'Feature Request', status: 'awaiting', priority: 'normal', created: '2026-02-03' },
  { id: 'TKT-4698', subject: 'Add second location to our account', category: 'Account Access', status: 'solved', priority: 'normal', created: '2026-01-28' },
  { id: 'TKT-4612', subject: 'Billing question about annual plan discount', category: 'Billing Question', status: 'solved', priority: 'low', created: '2026-01-15' },
];

const CATEGORIES = ['Bug Report', 'Feature Request', 'Billing Question', 'Account Access', 'Compliance Question', 'Technical Support', 'Other'];
const PRIORITIES: { id: string; label: string; color: string; desc: string }[] = [
  { id: 'low', label: 'Low', color: '#6b7280', desc: 'General question, no rush' },
  { id: 'normal', label: 'Normal', color: '#2563eb', desc: 'Standard request' },
  { id: 'high', label: 'High', color: '#d97706', desc: 'Impacting daily operations' },
  { id: 'urgent', label: 'Urgent', color: '#dc2626', desc: 'Critical — blocking compliance' },
];

// ── Component ────────────────────────────────────────────────────
export function HelpSupport() {
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [activeTab, setActiveTab] = useState<'kb' | 'ticket' | 'my-tickets' | 'contact'>('kb');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Ticket form
  const [ticketCat, setTicketCat] = useState('');
  const [ticketPriority, setTicketPriority] = useState('normal');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  const tabs = [
    { id: 'kb' as const, label: 'Knowledge Base', icon: '\u{1F4DA}' },
    { id: 'ticket' as const, label: 'Submit Ticket', icon: '\u{1F3AB}' },
    { id: 'my-tickets' as const, label: 'My Tickets', icon: '\u{1F4CB}' },
    { id: 'contact' as const, label: 'Contact Us', icon: '\u{1F4DE}' },
  ];

  // Search filter
  const allArticles = FAQ_CATEGORIES.flatMap(c => c.articles.map(a => ({ ...a, category: c.name })));
  const searchResults = searchQuery.trim().length > 1
    ? allArticles.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.body.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleSubmitTicket = async () => {
    if (!ticketCat || !ticketSubject.trim() || !ticketDesc.trim()) {
      toast.warning('Please fill in all required fields');
      return;
    }
    const num = `TKT-${5000 + Math.floor(Math.random() * 999)}`;
    try {
      await fetch('/api/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: ticketCat, priority: ticketPriority, subject: ticketSubject, description: ticketDesc }),
      });
    } catch { /* silent in demo */ }
    setTicketNumber(num);
    setTicketSubmitted(true);
  };

  const resetTicketForm = () => {
    setTicketCat('');
    setTicketPriority('normal');
    setTicketSubject('');
    setTicketDesc('');
    setTicketSubmitted(false);
    setTicketNumber('');
  };

  const statusBadge = (status: Ticket['status']) => {
    const map = { open: { bg: '#dbeafe', color: '#1d4ed8', label: 'Open' }, awaiting: { bg: '#fef3c7', color: '#92400e', label: 'Awaiting Reply' }, solved: { bg: '#dcfce7', color: '#166534', label: 'Solved' } };
    const s = map[status];
    return <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', backgroundColor: s.bg, color: s.color, ...F }}>{s.label}</span>;
  };

  const priorityDot = (p: string) => {
    const colors: Record<string, string> = { low: '#6b7280', normal: '#2563eb', high: '#d97706', urgent: '#dc2626' };
    return <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors[p] || '#6b7280' }} />;
  };

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Help & Support' }]} />

      <div className="p-4 sm:p-6" style={{ maxWidth: '1200px', margin: '0 auto', ...F }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1b4965', margin: '0 0 4px 0', ...F }}>Help & Support</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, ...F }}>Find answers, submit tickets, and get in touch with our team</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '24px', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedArticle(null); }}
              style={{
                padding: '12px 20px', fontSize: '14px', fontWeight: 600, border: 'none',
                backgroundColor: 'transparent', cursor: 'pointer', ...F, whiteSpace: 'nowrap', minHeight: '44px',
                color: activeTab === tab.id ? '#1b4965' : '#6b7280',
                borderBottom: activeTab === tab.id ? '2px solid #d4af37' : '2px solid transparent',
                marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'kb' && renderKnowledgeBase()}
        {activeTab === 'ticket' && renderSubmitTicket()}
        {activeTab === 'my-tickets' && renderMyTickets()}
        {activeTab === 'contact' && renderContact()}

        {/* AI Advisor teaser */}
        <div style={{ marginTop: '32px', padding: '16px 20px', backgroundColor: '#f5f3ff', border: '1px solid #e0d4fc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{'\u{1F916}'}</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#4c1d95', ...F }}>AI Advisor</div>
              <div style={{ fontSize: '12px', color: '#6b7280', ...F }}>Get instant AI-powered answers to your food safety and compliance questions</div>
            </div>
          </div>
          <a href="/ai-advisor" style={{ fontSize: '13px', fontWeight: 700, color: '#fff', backgroundColor: '#6366f1', padding: '8px 20px', borderRadius: '8px', textDecoration: 'none', letterSpacing: '0.3px' }}>Try AI Advisor →</a>
        </div>
      </div>

      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );

  // ── Knowledge Base ─────────────────────────────────────────────
  function renderKnowledgeBase() {
    if (selectedArticle) {
      return (
        <div>
          <button onClick={() => setSelectedArticle(null)} style={{ fontSize: '13px', color: '#1b4965', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', marginBottom: '16px', ...F, display: 'flex', alignItems: 'center', gap: '4px' }}>
            ← Back to Knowledge Base
          </button>
          <div style={cardStyle}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1b4965', margin: '0 0 8px 0', ...F }}>{selectedArticle.title}</h2>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', ...F }}>{selectedArticle.views.toLocaleString()} views</span>
              <span style={{ fontSize: '12px', color: '#16a34a', ...F }}>{selectedArticle.helpful}% found helpful</span>
            </div>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, margin: 0, ...F }}>{selectedArticle.body}</p>
            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', ...F }}>Was this article helpful?</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => guardAction('submit', 'Feedback', () => toast.success('Thanks for your feedback'))} style={{ padding: '6px 20px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '13px', cursor: 'pointer', ...F, minHeight: '44px' }}>{'\u{1F44D}'} Yes</button>
                <button onClick={() => { setActiveTab('ticket'); setSelectedArticle(null); }} style={{ padding: '6px 20px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '13px', cursor: 'pointer', ...F, minHeight: '44px' }}>{'\u{1F44E}'} No — Contact Support</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search help articles..."
            style={{ ...inputStyle, padding: '14px 14px 14px 42px', fontSize: '15px', border: '2px solid #e5e7eb', borderRadius: '12px' }}
          />
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>{'\u{1F50D}'}</span>
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 10, marginTop: '4px', maxHeight: '300px', overflowY: 'auto' }}>
              {searchResults.map(a => (
                <div key={a.id} onClick={() => { setSelectedArticle(a); setSearchQuery(''); }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '13px', color: '#374151', ...F }}>
                  <div style={{ fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{a.category} · {a.views} views</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Help */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {QUICK_HELP.map(qh => (
            <div key={qh.id} onClick={() => {
              const article = allArticles.find(a => a.title.toLowerCase().includes(qh.title.toLowerCase().split(' ')[0]));
              if (article) setSelectedArticle(article);
            }} style={{ ...cardStyle, cursor: 'pointer', borderLeft: `4px solid ${qh.color}`, transition: 'box-shadow 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>{qh.icon}</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1b4965', ...F }}>{qh.title}</div>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', ...F }}>{qh.desc}</div>
            </div>
          ))}
        </div>

        {/* FAQ Categories */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1b4965', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0', ...F }}>FAQ Categories</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FAQ_CATEGORIES.map(cat => (
              <div key={cat.id} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', ...F }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1b4965' }}>{cat.name}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>{cat.articles.length} articles</span>
                  </div>
                  <span style={{ fontSize: '16px', color: '#6b7280', transform: expandedCat === cat.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>{'▼'}</span>
                </div>
                {expandedCat === cat.id && (
                  <div style={{ borderTop: '1px solid #f3f4f6' }}>
                    {cat.articles.map(article => (
                      <div
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 12px 48px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', ...F }}
                      >
                        <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{article.title}</div>
                        <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{article.views.toLocaleString()} views</span>
                          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>{article.helpful}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Submit Ticket ──────────────────────────────────────────────
  function renderSubmitTicket() {
    if (ticketSubmitted) {
      return (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>{'✅'}</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1b4965', margin: '0 0 8px 0', ...F }}>Ticket Submitted!</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0', ...F }}>Your ticket number is</p>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d4af37', marginBottom: '24px', ...F }}>{ticketNumber}</div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px', ...F }}>We typically respond within 4 business hours. Check the "My Tickets" tab for updates.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={resetTicketForm} style={{ ...btnPrimary, minHeight: '44px' }}>Submit Another</button>
            <button onClick={() => setActiveTab('my-tickets')} style={{ ...btnPrimary, backgroundColor: 'white', color: '#1b4965', border: '2px solid #e5e7eb', minHeight: '44px' }}>View My Tickets</button>
          </div>
        </div>
      );
    }

    return (
      <div style={cardStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1b4965', margin: '0 0 20px 0', ...F }}>Submit a Support Ticket</h2>

        {/* Category */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Category *</label>
          <select value={ticketCat} onChange={e => setTicketCat(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' as const }}>
            <option value="">Select a category...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Priority</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            {PRIORITIES.map(p => (
              <div
                key={p.id}
                onClick={() => setTicketPriority(p.id)}
                style={{
                  padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                  border: ticketPriority === p.id ? `2px solid ${p.color}` : '2px solid #e5e7eb',
                  backgroundColor: ticketPriority === p.id ? `${p.color}08` : 'white',
                  ...F,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: p.color }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: ticketPriority === p.id ? p.color : '#374151' }}>{p.label}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', paddingLeft: '18px' }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Subject *</label>
          <input type="text" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="Brief summary of your issue" style={inputStyle} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Description *</label>
            <AIAssistButton
              fieldLabel="Description"
              context={{ feature: ticketCat }}
              currentValue={ticketDesc}
              onGenerated={(text) => { setTicketDesc(text); setAiFields(prev => new Set(prev).add('ticketDesc')); }}
            />
          </div>
          <textarea value={ticketDesc} onChange={e => { setTicketDesc(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('ticketDesc'); return n; }); }} placeholder="Describe your issue in detail. Include steps to reproduce if applicable..." rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
          {aiFields.has('ticketDesc') && <AIGeneratedIndicator />}
        </div>

        {/* File upload */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Attachments (optional)</label>
          <div style={{ border: '2px dashed #e5e7eb', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer' }} onClick={() => guardAction('upload', 'Support Tickets', () => toast.info('File upload available in production'))}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{'\u{1F4CE}'}</div>
            <div style={{ fontSize: '13px', color: '#6b7280', ...F }}>Click to attach screenshots or files</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', ...F }}>PNG, JPG, PDF up to 10MB</div>
          </div>
        </div>

        <button onClick={() => guardAction('submit', 'Support Tickets', handleSubmitTicket)} style={{ ...btnPrimary, width: '100%', padding: '12px', minHeight: '44px' }}>Submit Ticket</button>
      </div>
    );
  }

  // ── My Tickets ─────────────────────────────────────────────────
  function renderMyTickets() {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1b4965', margin: 0, ...F }}>My Support Tickets</h2>
          <button onClick={() => { setActiveTab('ticket'); resetTicketForm(); }} style={{ ...btnPrimary, minHeight: '44px' }}>+ New Ticket</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', minWidth: '600px', ...F }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Ticket ID', 'Subject', 'Category', 'Status', 'Priority', 'Created'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_TICKETS.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700, color: '#1b4965', ...F }}>{t.id}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', color: '#374151', ...F }}>{t.subject}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280', ...F }}>{t.category}</td>
                  <td style={{ padding: '12px 14px' }}>{statusBadge(t.status)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {priorityDot(t.priority)}
                      <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize', ...F }}>{t.priority}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280', ...F }}>{t.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Contact Us ─────────────────────────────────────────────────
  function renderContact() {
    const openChat = () => {
      try { (window as any).zE?.('messenger', 'open'); } catch { toast.info('Live Chat (Demo)'); }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Live Chat */}
          <div style={cardStyle}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>{'\u{1F4AC}'}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1b4965', marginBottom: '4px', ...F }}>Live Chat</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', ...F }}>Chat with our support team in real-time during business hours.</div>
            <button onClick={() => guardAction('chat', 'Live Support', openChat)} style={{ ...btnPrimary, width: '100%', minHeight: '44px' }}>Start Chat</button>
          </div>

          {/* Email */}
          <div style={cardStyle}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>{'\u{1F4E7}'}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1b4965', marginBottom: '4px', ...F }}>Email Support</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', ...F }}>Send us an email and we will respond within 4 business hours.</div>
            <a href="mailto:support@getevidly.com" style={{ ...btnPrimary, display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', boxSizing: 'border-box', minHeight: '44px' }}>support@getevidly.com</a>
          </div>

          {/* Phone */}
          <div style={cardStyle}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>{'\u{1F4DE}'}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1b4965', marginBottom: '4px', ...F }}>Phone Support</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px', ...F }}>(559) 555-0142</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px', ...F }}>Mon — Fri, 9:00 AM — 5:00 PM PST</div>
            <a href="tel:+15595550142" style={{ ...btnPrimary, display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', boxSizing: 'border-box', minHeight: '44px' }}>Call Now</a>
          </div>

          {/* Schedule */}
          <div style={cardStyle}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>{'\u{1F4C5}'}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1b4965', marginBottom: '4px', ...F }}>Schedule a Call</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', ...F }}>Book a 15-minute call with our support team at your convenience.</div>
            <button onClick={() => guardAction('schedule', 'Support', () => toast.info('Book Time (Demo)'))} style={{ ...btnPrimary, width: '100%', minHeight: '44px' }}>Book Time</button>
          </div>
        </div>

        {/* Emergency */}
        <div style={{ padding: '16px 20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{'\u{1F6A8}'}</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b', ...F }}>Food Safety Emergency?</div>
              <div style={{ fontSize: '12px', color: '#b91c1c', ...F }}>If you have an active food safety emergency requiring immediate assistance, call our emergency line now.</div>
            </div>
          </div>
          <a href="tel:+15595550142" style={{ ...btnPrimary, backgroundColor: '#dc2626', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}>{'\u{1F4DE}'} Call Now</a>
        </div>
      </div>
    );
  }
}

export default HelpSupport;
