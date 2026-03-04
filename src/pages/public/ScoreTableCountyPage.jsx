/**
 * SCORETABLE COUNTY PAGE — MASTER TEMPLATE
 * URL: getevidly.com/scoretable/[county]-county
 * 62 pages generated from this template
 *
 * PURPOSE:
 * SEO traffic driver for operators searching county inspection methodology.
 * Educates on HOW the county grades — scoring method, weights, thresholds,
 * inspector behavior, common violations. Soft EvidLY pitch at the bottom.
 *
 * UNIQUE PER COUNTY (via COUNTY_DATA + county prop):
 * - meta title, description, canonical, keywords
 * - H1, intro, agency, AHJ (fire), method deep-dive
 * - Scoring weights, threshold, grade scale, transparency
 * - Inspector count, facility count, closure count
 * - Top violations with code refs
 * - Violation score simulator (county-specific weights)
 * - How-it-works narrative (different per method type)
 * - Vendor marketplace (CPP statewide, Filta on 6 counties)
 * - 5 county-specific FAQ questions
 * - Schema markup (FAQPage + LocalBusiness)
 *
 * CONSISTENT ACROSS ALL 62:
 * - ScoreTable + EvidLY branding
 * - Contact capture on every CTA (phone required)
 * - Vendor $25/lead quote request (Stripe in production)
 * - Competitor domain blocking
 * - Cross-links to /[county] and /kitchen-check/[county]
 */

import { useState } from "react";
import { useParams } from "react-router-dom";

// ═══ PALETTE ═══
const E={
  navy:"#25396B",navyL:"#344E8A",navyD:"#1A2B52",
  gold:"#B8A06A",goldL:"#CDB882",
  w:"#fff",cream:"#FAF8F4",
  g1:"#F2F2F0",g2:"#E8E6E0",g3:"#d1d5db",
  g4:"#9ca3af",g5:"#6b7280",g6:"#4b5563",g8:"#1f2937",
  grn:"#16a34a",grnBg:"#f0fdf4",
  red:"#dc2626",redBg:"#fef2f2",
  wrn:"#f59e0b",wrnBg:"#fffbeb",
  orn:"#ea580c",bluePale:"#edf0f8"
};
const S={grn:"#1B5E20",grnL:"#4CAF50",charD:"#2E3C47",bg:"#F5F3F0",bd:"#D6CFC5",tx:"#2D2A26",sub:"#6B6560"};
const ff="system-ui,-apple-system,sans-serif";
const CALENDLY="https://calendly.com/evidly/demo";

// ═══ COUNTY DATA ═══
const COUNTY_DATA={
  merced:{
    name:"Merced",slug:"merced-county",landingSlug:"merced-county",kcSlug:"merced-county",
    agency:"Merced County Department of Public Health — Environmental Health",
    agencyShort:"Merced County DPH",agencyPhone:"(209) 381-1100",
    ahj:"Merced County Fire Department / CAL FIRE",
    method:"accumulate",weights:{c:4,m:2,n:2},threshold:14,thresholdLabel:"14+ points = Unsatisfactory",
    grades:[{label:"Good",range:"0–6 points",pass:true},{label:"Satisfactory",range:"7–13 points",pass:true},{label:"Unsatisfactory",range:"14+ points",pass:false}],
    posted:"Results available through county portal",freq:"1–2x per year",
    inspectors:6,facilities:1200,closures:8,transparency:"HIGH",
    methodName:"Point Accumulation",
    methodDesc:"Merced County starts every inspection at zero and adds points for each violation found. Critical violations add 4 points, major violations add 2 points, and minor violations add 2 points. A total of 0–6 points earns a 'Good' rating. 7–13 is 'Satisfactory.' 14 or more points results in an 'Unsatisfactory' rating, which triggers a follow-up inspection.",
    methodNote:"Unlike deduction-based counties, there's no '100-point' ceiling. The score grows with violations rather than shrinking from a perfect start — which means every single violation adds to your total.",
    topViolations:[
      {v:"Temperature logs missing or incomplete",code:"§113996",sev:"major",pts:2},
      {v:"HACCP plan not on file",code:"§114015",sev:"critical",pts:4},
      {v:"Hood cleaning certificate overdue or missing",code:"NFPA 96 §12.4",sev:"critical",pts:4},
      {v:"Food handler cards expired or missing",code:"§113948",sev:"major",pts:2},
      {v:"Improper cooling procedures",code:"§114002",sev:"major",pts:2},
      {v:"No Certified Food Protection Manager on site",code:"§113947.1",sev:"critical",pts:4},
    ],
    inspectorProfile:"Merced County environmental health inspectors conduct unannounced inspections and are known for thorough documentation reviews. HACCP plans, food handler cards, and temperature logs are frequently scrutinized. The department has HIGH transparency — detailed findings are published online.",
    faq:[
      {q:"What is Merced County's restaurant inspection scoring system?",a:"Merced County uses a point accumulation method. Violations add points starting from zero — critical violations add 4 points, major violations add 2 points, and minor violations add 2 points. A score of 0–6 is Good, 7–13 is Satisfactory, and 14 or more points results in an Unsatisfactory rating that triggers a follow-up inspection."},
      {q:"What does a Merced County 'Unsatisfactory' rating mean?",a:"An Unsatisfactory rating (14+ points) means the facility must be re-inspected, typically within 14–30 days. The operator must correct all violations before the follow-up. Continued non-compliance can result in permit suspension."},
      {q:"How transparent is Merced County with inspection results?",a:"Merced County is rated HIGH transparency. Detailed inspection findings are published online through the county portal, including violation descriptions and scores. This is above average for California."},
      {q:"How often does Merced County inspect commercial kitchens?",a:"Most facilities receive 1–2 inspections per year. High-risk facilities, those with prior Unsatisfactory ratings, and locations with complaint history are inspected more frequently."},
      {q:"What violations most often push Merced County kitchens to Unsatisfactory?",a:"Missing or incomplete temperature logs, absent HACCP plans, overdue hood cleaning certificates, expired food handler cards, and improper cooling procedures are the violations that most commonly push facilities to 14+ points."},
    ],
    metaTitle:"Merced County Restaurant Inspection Scoring | ScoreTable by EvidLY",
    metaDesc:"How does Merced County score restaurant inspections? Point accumulation from zero. 14+ points = Unsatisfactory. Full methodology, weights, and what inspectors look for.",
    keywords:"Merced County restaurant inspection score, Merced County health inspection methodology, how Merced County grades restaurants, Merced County DPH food inspection",
    h1:"How Merced County Scores Restaurant Inspections",
    heroSub:"Point accumulation from zero. Every violation adds to your total. 14+ points means a re-inspection. Here's exactly how it works.",
    filta:true,
  },
  fresno:{
    name:"Fresno",slug:"fresno-county",landingSlug:"fresno-county",kcSlug:"fresno-county",
    agency:"Fresno County Department of Public Health — Environmental Health Division",
    agencyShort:"Fresno County DPH",agencyPhone:"(559) 600-3357",
    ahj:"Fresno County Fire Protection District / CAL FIRE",
    method:"reinspect",weights:{c:0,m:0,n:0},threshold:null,thresholdLabel:"Uncorrected major = reinspection required",
    grades:[{label:"Pass",range:"Majors corrected on-site",pass:true},{label:"Reinspection Required",range:"Uncorrected major or critical violations",pass:false}],
    posted:"Not consistently published online (LOW transparency)",freq:"1–2x per year",
    inspectors:22,facilities:5000,closures:58,transparency:"LOW",
    methodName:"Pass/Fail with Reinspection",
    methodDesc:"Fresno County uses a pass/fail model based on California Retail Food Code (CalCode). There is no numeric score and no letter grade. Inspectors evaluate conditions, and if major or critical violations are not corrected on-site, a formal re-inspection is scheduled. The absence of a public numeric score or posted grade is why Fresno County is rated LOW transparency.",
    methodNote:"A 2023–24 Fresno County Grand Jury report specifically cited the lack of consistent online publication of food safety inspection data as a public health transparency concern.",
    topViolations:[
      {v:"Temperature abuse — improper holding temps",code:"§113996",sev:"critical",pts:null},
      {v:"HACCP plan missing or inadequate",code:"§114015",sev:"critical",pts:null},
      {v:"Hood cleaning certificate overdue",code:"NFPA 96 §12.4",sev:"major",pts:null},
      {v:"Food handler cards not on file",code:"§113948",sev:"major",pts:null},
      {v:"Improper cooling — 135→70→41°F",code:"§114002",sev:"critical",pts:null},
      {v:"Employee illness reporting failure",code:"§113949",sev:"critical",pts:null},
    ],
    inspectorProfile:"Fresno County has 22 inspectors covering approximately 5,000 permitted food facilities — a high ratio. Inspectors prioritize temperature control, HACCP documentation, and employee health practices. Despite the volume, the county does not consistently publish detailed findings online.",
    faq:[
      {q:"Does Fresno County give numeric scores or letter grades for restaurant inspections?",a:"No. Fresno County uses a pass/fail system with no numeric score and no letter grade. Inspectors assess conditions against CalCode and either pass the facility or require corrections. There is no public-facing grade card system."},
      {q:"Why is Fresno County rated LOW transparency?",a:"A 2023–24 Fresno County Grand Jury report found that inspection data is not consistently published online. Operators and the public have limited access to detailed inspection findings, unlike higher-transparency counties like Merced or Los Angeles."},
      {q:"What triggers a reinspection in Fresno County?",a:"Any uncorrected major or critical violation at the time of inspection triggers a reinspection, typically scheduled within 14–30 days. If violations persist through reinspection, permit suspension proceedings can begin."},
      {q:"How many inspectors cover Fresno County's food facilities?",a:"Fresno County has approximately 22 environmental health inspectors covering around 5,000 permitted food facilities — one of the higher inspector-to-facility ratios in the Central Valley."},
      {q:"What are the most common violations cited in Fresno County inspections?",a:"Temperature abuse, missing HACCP plans, overdue hood cleaning certificates, missing food handler cards, improper cooling procedures, and employee illness reporting failures are most frequently cited."},
    ],
    metaTitle:"Fresno County Restaurant Inspection Methodology | ScoreTable by EvidLY",
    metaDesc:"Fresno County uses a pass/fail system with no public numeric score. LOW transparency rating from 2023 Grand Jury report. Full methodology and what triggers reinspection.",
    keywords:"Fresno County restaurant inspection, Fresno County health inspection pass fail, how Fresno County grades restaurants, Fresno DPH food inspection transparency",
    h1:"How Fresno County Scores Restaurant Inspections",
    heroSub:"No numeric score. No letter grade. A 2023 Grand Jury called it a transparency problem. Here's exactly how Fresno County conducts and reports food safety inspections.",
    filta:true,
  },
  kern:{
    name:"Kern",slug:"kern-county",landingSlug:"kern-county",kcSlug:"kern-county",
    agency:"Kern County Public Health Services Department",
    agencyShort:"Kern County PHS",agencyPhone:"(661) 321-3000",
    ahj:"Kern County Fire Department",
    method:"deduction",weights:{c:5,m:3,n:1},threshold:75,thresholdLabel:"Below 75 = Closure",
    grades:[{label:"A",range:"90–100",pass:true},{label:"B",range:"80–89",pass:true},{label:"C",range:"75–79",pass:true},{label:"Closure",range:"Below 75",pass:false}],
    posted:"Letter grade displayed at establishment",freq:"1–3x per year",
    inspectors:18,facilities:4000,closures:44,transparency:"MEDIUM",
    methodName:"100-Point Deduction",
    methodDesc:"Kern County starts every inspection at 100 points and deducts for each violation. Critical violations deduct 5 points, major violations deduct 3 points, and minor violations deduct 1 point. A score of 90 or above earns an 'A' grade. 80–89 is a 'B'. 75–79 is a 'C'. Any score below 75 results in immediate closure. This is one of the steeper deduction scales in California — a single critical violation costs 5 points.",
    methodNote:"Kern County's critical violation weight (5 points) is higher than LA County (4 points) and Riverside (4 points). Two uncorrected critical violations alone can drop a facility from a potential A to a B.",
    topViolations:[
      {v:"Temperature violations — holding or cooling",code:"§113996",sev:"critical",pts:5},
      {v:"Food contact surface sanitation failure",code:"§114099",sev:"major",pts:3},
      {v:"Pest evidence — rodent or insect",code:"§114259",sev:"critical",pts:5},
      {v:"Handwashing compliance failure",code:"§113953",sev:"major",pts:3},
      {v:"Food handler card missing or expired",code:"§113948",sev:"major",pts:3},
      {v:"HACCP plan not maintained",code:"§114015",sev:"critical",pts:5},
    ],
    inspectorProfile:"Kern County inspectors follow a strict deduction-based approach. They prioritize temperature control, pest evidence, and sanitation. The higher critical violation weight (5 pts vs. 4 in most counties) means a single food safety failure has more scoring impact than elsewhere in California.",
    faq:[
      {q:"How does Kern County score restaurant inspections?",a:"Kern County starts at 100 points and deducts for each violation. Critical violations cost 5 points, major violations cost 3 points, and minor violations cost 1 point. Scores of 90+ earn an A, 80–89 a B, 75–79 a C, and below 75 results in immediate closure."},
      {q:"What is the minimum passing score in Kern County?",a:"75. Any score below 75 results in immediate closure of the food facility. A score of 75–79 earns a C grade, which is technically passing but indicates significant violations were found."},
      {q:"How is Kern County different from LA County's grading system?",a:"Kern County uses a higher critical violation deduction (5 points vs. LA's 4 points) and closes facilities that score below 75 rather than LA's 70. The practical effect is that critical violations are more costly in Kern, and the closure threshold is higher."},
      {q:"Are Kern County inspection grades posted publicly?",a:"Yes. Kern County requires letter grades to be displayed at the establishment. Inspection reports are available through the Public Health Services department, though online access is more limited than high-transparency counties."},
      {q:"What violations most commonly drop Kern County scores?",a:"Temperature violations, food contact surface sanitation failures, pest evidence, handwashing compliance, expired food handler cards, and HACCP plan deficiencies are the most frequently cited violations that drop scores."},
    ],
    metaTitle:"Kern County Restaurant Inspection Scoring | ScoreTable by EvidLY",
    metaDesc:"Kern County deducts 5 pts for critical violations and closes facilities below 75. Stricter than most California counties. Full methodology, weights, and what inspectors look for.",
    keywords:"Kern County restaurant inspection score, Kern County health inspection grade, how Kern County grades restaurants, Kern County PHS food inspection methodology",
    h1:"How Kern County Scores Restaurant Inspections",
    heroSub:"100-point deduction. Critical violations cost 5 points each. Below 75 means closure. Kern County's grading is stricter than most of California — here's exactly how it works.",
    filta:false,
  },
  "los-angeles":{
    name:"Los Angeles",slug:"los-angeles-county",landingSlug:"los-angeles-county",kcSlug:"los-angeles-county",
    agency:"LA County Department of Public Health — Environmental Health",
    agencyShort:"LA County DPH",agencyPhone:"(888) 700-9995",
    ahj:"LA County Fire Department",
    method:"deduction",weights:{c:4,m:2,n:1},threshold:70,thresholdLabel:"Below 70 = Fail",
    grades:[{label:"A",range:"90–100",pass:true},{label:"B",range:"80–89",pass:true},{label:"C",range:"70–79",pass:true},{label:"Fail",range:"Below 70",pass:false}],
    posted:"Letter grade card must be posted — publicly visible",freq:"1–3x per year",
    inspectors:280,facilities:55000,closures:312,transparency:"HIGH",
    methodName:"100-Point Deduction (Grade Card Required)",
    methodDesc:"LA County is one of the most recognized food safety inspection systems in the country. Inspectors start at 100 points and deduct for violations — critical violations cost 4 points, major violations 2 points, and minor violations 1 point. The resulting letter grade (A, B, C, or Fail) must be posted in a publicly visible location — typically the front window or door. Below 70 is a failing score and results in closure.",
    methodNote:"LA County's grade card requirement creates a direct public accountability mechanism. An 'A' card in the window is a marketing asset. A 'B' card triggers customer questions. A missing or failed card is immediately visible to every person who walks past.",
    topViolations:[
      {v:"Temperature control failure — hot or cold holding",code:"§113996",sev:"critical",pts:4},
      {v:"Employee hygiene — illness or bare-hand contact",code:"§113949",sev:"critical",pts:4},
      {v:"Vermin or pest evidence",code:"§114259",sev:"critical",pts:4},
      {v:"Improper food storage or labeling",code:"§114047",sev:"major",pts:2},
      {v:"Equipment sanitation deficiency",code:"§114099",sev:"major",pts:2},
      {v:"Handwashing station inaccessible or unsupplied",code:"§113953",sev:"major",pts:2},
    ],
    inspectorProfile:"LA County has the largest food inspection program in California — 280 inspectors covering 55,000+ facilities. Inspectors conduct unannounced visits 1–3 times per year based on risk tier. The public grade card requirement means scores are immediately visible and carry real reputational weight.",
    faq:[
      {q:"How does LA County's restaurant grading system work?",a:"LA County starts at 100 points and deducts for violations. Critical violations cost 4 points, major violations 2 points, and minor violations 1 point. The resulting letter grade — A, B, C, or Fail — must be posted in a publicly visible location. Below 70 is a fail and results in closure."},
      {q:"Is LA County's grade card required to be posted?",a:"Yes. LA County requires the most recent grade card to be displayed where it's clearly visible to the public — typically the front window or door. This is a legal requirement, not optional."},
      {q:"What score is needed for an A grade in LA County?",a:"An A grade requires 90 points or above. An 80–89 earns a B, 70–79 earns a C. Any score below 70 is a failing score and results in closure until a passing re-inspection is completed."},
      {q:"How often does LA County inspect restaurants?",a:"LA County inspects restaurants 1–3 times per year based on risk classification. High-risk facilities, those with prior B or C grades, and locations with complaint history are inspected more frequently. All inspections are unannounced."},
      {q:"What are the most common violations in LA County restaurant inspections?",a:"Temperature control failures, employee hygiene violations, vermin or pest evidence, improper food storage, equipment sanitation deficiencies, and handwashing station compliance are the most frequently cited violations across LA County's 55,000+ facilities."},
    ],
    metaTitle:"Los Angeles County Restaurant Inspection Grading | ScoreTable by EvidLY",
    metaDesc:"LA County's 100-point grade card system explained. A/B/C grades must be posted publicly. Below 70 = closure. Full methodology and what 280 inspectors look for.",
    keywords:"Los Angeles County restaurant inspection grade, LA County health inspection A B C score, how LA County grades restaurants, LACDPH food inspection methodology",
    h1:"How Los Angeles County Grades Restaurant Inspections",
    heroSub:"100 points. A/B/C grade cards required in every window. 280 inspectors. 55,000 facilities. Here's exactly how LA County's inspection system works.",
    filta:false,
  },
  riverside:{
    name:"Riverside",slug:"riverside-county",landingSlug:"riverside-county",kcSlug:"riverside-county",
    agency:"Riverside County Department of Environmental Health",
    agencyShort:"Riverside County EH",agencyPhone:"(888) 722-4234",
    ahj:"Riverside County Fire Department",
    method:"deduction",weights:{c:4,m:2,n:1},threshold:90,thresholdLabel:"Below 90 = Fail — only A passes",
    grades:[{label:"A — PASS",range:"90–100",pass:true},{label:"B — FAIL",range:"80–89",pass:false},{label:"C — FAIL",range:"70–79",pass:false},{label:"F — FAIL",range:"Below 70",pass:false}],
    posted:"Letter grade posted at establishment",freq:"1–3x per year",
    inspectors:55,facilities:11000,closures:88,transparency:"HIGH",
    methodName:"100-Point Deduction (Strictest in Southern California)",
    methodDesc:"Riverside County uses the same 100-point deduction scale as LA County — critical violations cost 4 points, major violations 2 points, minor violations 1 point. But the critical difference is the passing threshold: in Riverside County, only an 'A' grade (90 or above) is considered passing. A 'B' grade (80–89) is a failure. This makes Riverside County the strictest grading jurisdiction in Southern California by passing standard.",
    methodNote:"In most California counties, a 'B' means you passed with some violations. In Riverside County, a 'B' means you failed and must re-inspect. This distinction is not well-known — many operators assume their 'B' is equivalent to a B in LA County.",
    topViolations:[
      {v:"Temperature control — holding or cooling failure",code:"§113996",sev:"critical",pts:4},
      {v:"Food handler card missing or expired",code:"§113948",sev:"major",pts:2},
      {v:"Pest control documentation gap",code:"§114259",sev:"critical",pts:4},
      {v:"Sanitation deficiency — equipment or surfaces",code:"§114099",sev:"major",pts:2},
      {v:"HACCP compliance failure",code:"§114015",sev:"critical",pts:4},
      {v:"Employee hygiene violation",code:"§113949",sev:"critical",pts:4},
    ],
    inspectorProfile:"Riverside County's 55 inspectors hold facilities to the strictest passing standard in the region. Because only an 'A' passes, inspectors effectively evaluate whether a facility can maintain 90+ — not just whether it avoids obvious failures. Any 3 uncorrected critical violations will push a facility to a B (failure).",
    faq:[
      {q:"What makes Riverside County's grading system different from other California counties?",a:"Riverside County uses the same 100-point deduction formula as LA County, but only an 'A' grade (90+) is considered passing. A 'B' grade (80–89) is a failure in Riverside County. Most California counties treat B as passing — Riverside does not."},
      {q:"What happens if a Riverside County restaurant gets a B grade?",a:"A B grade in Riverside County is treated as a failure. The establishment must correct all violations and pass a re-inspection to earn an A before it can be considered in compliance."},
      {q:"How many points does a critical violation deduct in Riverside County?",a:"Critical violations deduct 4 points, major violations deduct 2 points, and minor violations deduct 1 point. Because the passing threshold is 90, just three uncorrected critical violations can push a facility from a potential A to a failing B."},
      {q:"How often does Riverside County inspect restaurants?",a:"Riverside County inspects facilities 1–3 times per year. Facilities that receive a B or below, or have complaint history, receive more frequent inspections."},
      {q:"Are Riverside County inspection grades posted publicly?",a:"Yes. Riverside County requires grade cards to be posted at the establishment. Full inspection reports are available through the Environmental Health department."},
    ],
    metaTitle:"Riverside County Restaurant Inspection Scoring | ScoreTable by EvidLY",
    metaDesc:"Only an A passes in Riverside County. B grade = failure. Strictest passing standard in Southern California. Full methodology, weights, and what 55 inspectors look for.",
    keywords:"Riverside County restaurant inspection grade, Riverside County health inspection A only pass, how Riverside County grades restaurants, Riverside DEH food inspection",
    h1:"How Riverside County Grades Restaurant Inspections",
    heroSub:"Only an 'A' passes. A 'B' is a failure. Riverside County holds the strictest passing standard in Southern California — here's exactly how the system works.",
    filta:false,
  },
  sacramento:{
    name:"Sacramento",slug:"sacramento-county",landingSlug:"sacramento-county",kcSlug:"sacramento-county",
    agency:"Sacramento County Environmental Management Department",
    agencyShort:"Sacramento EMD",agencyPhone:"(916) 875-8440",
    ahj:"Sacramento Metro Fire / Sacramento City Fire",
    method:"count",weights:{c:1,m:1,n:0},threshold:4,thresholdLabel:"4+ major violations = Red placard",
    grades:[{label:"Green",range:"0–1 major violations",pass:true},{label:"Yellow",range:"2–3 major violations",pass:true},{label:"Red",range:"4+ major violations",pass:false}],
    posted:"Color placard posted at establishment",freq:"1–3x per year",
    inspectors:38,facilities:8500,closures:62,transparency:"MEDIUM",
    methodName:"Color Placard — Violation Count",
    methodDesc:"Sacramento County uses a color placard system rather than a numeric score. Inspectors count the number of major violations found during inspection. 0–1 major violations earns a Green placard. 2–3 major violations earns a Yellow placard. 4 or more major violations results in a Red placard and immediate closure. Minor violations are noted but do not affect the placard color.",
    methodNote:"Unlike point-based systems, Sacramento's method treats all major violations equally — a temperature failure and a storage order violation carry identical weight. The simplicity makes the system easy for the public to interpret, but means nuance is lost in the color.",
    topViolations:[
      {v:"Major violation accumulation — multiple categories",code:"§113700 et seq.",sev:"major",pts:null},
      {v:"Temperature log gap — equipment or holding",code:"§113996",sev:"major",pts:null},
      {v:"Improper food handling practices",code:"§113947",sev:"major",pts:null},
      {v:"Equipment maintenance failure",code:"§114130",sev:"major",pts:null},
      {v:"Pest prevention documentation gap",code:"§114259",sev:"major",pts:null},
      {v:"Food storage order violation",code:"§114047",sev:"major",pts:null},
    ],
    inspectorProfile:"Sacramento EMD's 38 inspectors evaluate facilities on a violation count basis. The placard system creates clear public accountability — a Yellow or Red placard is visible to every customer. Because the threshold is low (4 major violations = Red), inspectors don't need to find critical failures to trigger closure.",
    faq:[
      {q:"How does Sacramento County's restaurant inspection system work?",a:"Sacramento County uses a color placard system. Inspectors count the number of major violations. 0–1 major violations earns a Green placard (passing), 2–3 earns a Yellow (warning), and 4 or more results in a Red placard and immediate closure."},
      {q:"What is a Red placard in Sacramento County?",a:"A Red placard means the facility had 4 or more major violations during inspection and has been closed. The facility must correct all violations and pass a re-inspection before reopening."},
      {q:"Do minor violations affect the Sacramento County placard color?",a:"No. Minor violations are noted in the inspection report but do not count toward the major violation total that determines placard color. Only major violations affect whether a facility receives a Green, Yellow, or Red placard."},
      {q:"How is Sacramento County's system different from LA County's letter grade system?",a:"LA County uses a 100-point deduction scale with letter grades. Sacramento County counts major violations and assigns a color placard. The Sacramento system doesn't produce a numeric score — it simply classifies facilities as Green, Yellow, or Red based on how many major violations were found."},
      {q:"Are Sacramento County inspection results publicly available?",a:"Yes. Color placard results are posted at the establishment. Detailed inspection reports are available through the Environmental Management Department, though Sacramento is rated MEDIUM transparency compared to higher-disclosure counties."},
    ],
    metaTitle:"Sacramento County Restaurant Inspection Placard System | ScoreTable by EvidLY",
    metaDesc:"Sacramento County uses a Green/Yellow/Red placard system based on violation count. 4+ major violations = Red and closure. Full methodology explained.",
    keywords:"Sacramento County restaurant inspection placard, Sacramento County health inspection green yellow red, how Sacramento County grades restaurants, Sacramento EMD food inspection",
    h1:"How Sacramento County Grades Restaurant Inspections",
    heroSub:"Green, Yellow, or Red — based on how many major violations were found. 4 or more means closure. Here's how Sacramento County's placard system works.",
    filta:false,
  },
  "san-joaquin":{
    name:"San Joaquin",slug:"san-joaquin-county",landingSlug:"san-joaquin-county",kcSlug:"san-joaquin-county",
    agency:"San Joaquin County Public Health Services — Environmental Health",
    agencyShort:"San Joaquin County PH",agencyPhone:"(209) 468-3420",
    ahj:"San Joaquin County Office of Emergency Services / Stockton Fire",
    method:"reinspect",weights:{c:0,m:0,n:0},threshold:null,thresholdLabel:"Uncorrected violations = reinspection",
    grades:[{label:"Pass",range:"Violations corrected on-site",pass:true},{label:"Reinspection Required",range:"Uncorrected major or critical violations",pass:false}],
    posted:"Report available through Public Health Services",freq:"1–2x per year",
    inspectors:12,facilities:3000,closures:18,transparency:"MEDIUM",
    methodName:"CalCode Standard Pass/Fail",
    methodDesc:"San Joaquin County follows the California Retail Food Code standard pass/fail model. There is no numeric score and no letter grade. Inspectors assess conditions, document violations by category (critical, major, minor), and require on-site correction of major and critical violations where possible. Violations not corrected during the inspection trigger a formal re-inspection. San Joaquin County serves the Stockton metropolitan area and surrounding communities.",
    methodNote:"San Joaquin County's system closely mirrors the baseline CalCode standard without the addition of numeric scoring or letter grades seen in higher-profile counties like LA or Riverside.",
    topViolations:[
      {v:"Temperature abuse — improper holding temps",code:"§113996",sev:"critical",pts:null},
      {v:"Receiving log gap — no temp recorded at delivery",code:"§113980",sev:"major",pts:null},
      {v:"HACCP documentation incomplete or absent",code:"§114015",sev:"critical",pts:null},
      {v:"Hood cleaning certificate overdue",code:"NFPA 96 §12.4",sev:"major",pts:null},
      {v:"Food handler card compliance gap",code:"§113948",sev:"major",pts:null},
      {v:"Cooling procedure failure",code:"§114002",sev:"critical",pts:null},
    ],
    inspectorProfile:"San Joaquin County's 12 inspectors cover approximately 3,000 permitted food facilities across the county, with concentration in Stockton. The department follows CalCode standard enforcement without the added transparency mechanisms of higher-disclosure counties.",
    faq:[
      {q:"Does San Joaquin County give numeric scores for restaurant inspections?",a:"No. San Joaquin County uses a CalCode standard pass/fail model with no numeric score and no letter grade. Inspectors document violations by category and require correction of major and critical violations."},
      {q:"How often does San Joaquin County inspect restaurants in Stockton?",a:"Most San Joaquin County facilities are inspected 1–2 times per year. Higher-risk establishments and those with complaint history receive more frequent inspections."},
      {q:"What triggers a reinspection in San Joaquin County?",a:"Any uncorrected major or critical violation at the time of inspection triggers a formal reinspection, typically scheduled within 14–30 days. Failure to correct during reinspection can lead to permit suspension."},
      {q:"How does San Joaquin County compare to Merced County for transparency?",a:"San Joaquin County is rated MEDIUM transparency, compared to Merced's HIGH transparency rating. San Joaquin inspection reports are available through Public Health Services but are not consistently published in an easily searchable online format."},
      {q:"What are the most cited violations in San Joaquin County kitchens?",a:"Temperature abuse, receiving log gaps, incomplete HACCP documentation, overdue hood cleaning certificates, food handler card compliance, and cooling procedure failures are most frequently cited."},
    ],
    metaTitle:"San Joaquin County Restaurant Inspection Methodology | ScoreTable by EvidLY",
    metaDesc:"San Joaquin County uses CalCode standard pass/fail with no numeric score. Serving Stockton and surrounding areas. Full methodology and top violations explained.",
    keywords:"San Joaquin County restaurant inspection, Stockton restaurant health inspection methodology, how San Joaquin County grades restaurants, San Joaquin food safety inspection",
    h1:"How San Joaquin County Scores Restaurant Inspections",
    heroSub:"No numeric score. CalCode standard pass/fail — serving Stockton and surrounding San Joaquin County. Here's exactly what inspectors look for and what triggers reinspection.",
    filta:true,
  },
};

const DEFAULT_COUNTY="merced";
const FILTA_COUNTIES=["merced","fresno","stanislaus","san-joaquin","mariposa","madera"];

// ═══ COMPETITOR BLOCKING ═══
var BD=["jolt.com","joltup.com","safetyculture.com","safetyculture.io","fooddocs.com","fooddocs.io","zenput.com","crunchtime.com","bluecart.com","marketman.com","restaurant365.com","toast.com","toasttab.com"];
var BC=["jolt","safety culture","safetyculture","fooddocs","zenput","crunchtime","bluecart","marketman","toast pos","toasttab"];
function isBl(e,c){var d=(e||"").split("@")[1]||"";d=d.toLowerCase();var l=(c||"").toLowerCase();for(var i=0;i<BD.length;i++)if(d===BD[i]||d.endsWith("."+BD[i]))return 1;for(var i=0;i<BC.length;i++)if(l.indexOf(BC[i])>=0)return 1;return 0;}

var CA_COUNTIES=["Alameda","Alpine","Amador","Butte","Calaveras","Colusa","Contra Costa","Del Norte","El Dorado","Fresno","Glenn","Humboldt","Imperial","Inyo","Kern","Kings","Lake","Lassen","Los Angeles","Madera","Marin","Mariposa","Mendocino","Merced","Modoc","Mono","Monterey","Napa","Nevada","Orange","Placer","Plumas","Riverside","Sacramento","San Benito","San Bernardino","San Diego","San Francisco","San Joaquin","San Luis Obispo","San Mateo","Santa Barbara","Santa Clara","Santa Cruz","Shasta","Sierra","Siskiyou","Solano","Sonoma","Stanislaus","Sutter","Tehama","Trinity","Tulare","Tuolumne","Ventura","Yolo","Yuba"];

// ═══ COMPONENTS ═══
function Logo({s="1.2rem",light=false,tagline=false}){var vc=light?E.w:E.navy;var tc=light?"rgba(255,255,255,0.55)":"rgba(37,57,107,0.6)";return(<span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:2,lineHeight:1}}><span style={{fontWeight:800,fontSize:s,letterSpacing:-0.5,fontFamily:ff,lineHeight:1}}><span style={{color:E.gold}}>E</span><span style={{color:vc}}>vid</span><span style={{color:E.gold}}>LY</span></span>{tagline&&<span style={{fontSize:"calc("+s+" * 0.3)",fontWeight:700,letterSpacing:"0.2em",color:tc,textTransform:"uppercase",lineHeight:1,fontFamily:ff,whiteSpace:"nowrap"}}>Lead with Confidence</span>}</span>);}
function STIcon({sz=30}){return(<div style={{width:sz,height:sz,background:S.grn,borderRadius:sz*0.2,display:"inline-flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:sz*0.34,fontWeight:900,color:E.w,letterSpacing:-0.5,lineHeight:1,marginBottom:sz*0.06}}>ST</span><div style={{display:"flex",gap:1.5,alignItems:"flex-end"}}>{[5,8,11,7,10].map(function(h,i){return <div key={i} style={{width:sz*0.055,height:h*(sz/72),background:"rgba(255,255,255,"+(0.25+i*0.12)+")",borderRadius:1}}/>;})}</div></div>);}
function STLogo({s="1.2rem",light=false}){return <span style={{fontWeight:800,fontSize:s,fontFamily:ff}}><span style={{color:S.grn}}>Score</span><span style={{color:light?E.w:S.charD}}>Table</span></span>;}
function SL({t,c}){return <div style={{fontSize:"0.68rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:c||S.grn,marginBottom:10}}>{t}</div>;}
function TBadge({level}){var m={HIGH:{bg:E.grnBg,bd:E.grn,tx:"#065f46"},MEDIUM:{bg:E.wrnBg,bd:E.wrn,tx:"#92400e"},LOW:{bg:E.redBg,bd:E.red,tx:"#991b1b"}};var co=m[level]||m.MEDIUM;return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:100,fontSize:"0.64rem",fontWeight:700,background:co.bg,border:"1px solid "+co.bd,color:co.tx,marginLeft:8}}>{level} TRANSPARENCY</span>;}
function SevBadge({sev}){var m={critical:{bg:E.redBg,bd:E.red,tx:E.red},major:{bg:E.wrnBg,bd:E.wrn,tx:"#92400e"},minor:{bg:E.bluePale,bd:E.g3,tx:E.g5}};var co=m[sev]||m.minor;return <span style={{display:"inline-block",padding:"1px 7px",borderRadius:100,fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,background:co.bg,border:"1px solid "+co.bd,color:co.tx}}>{sev}</span>;}

function SchemaMarkup({c}){var schema={"@context":"https://schema.org","@graph":[{"@type":"FAQPage","mainEntity":c.faq.map(function(f){return{"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}};})},{"@type":"LocalBusiness","name":"ScoreTable by EvidLY","description":"California restaurant inspection methodology reference for "+c.name+" County","url":"https://getevidly.com/scoretable/"+c.slug},{"@type":"WebPage","name":c.metaTitle,"description":c.metaDesc,"url":"https://getevidly.com/scoretable/"+c.slug}]};return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>;}

// Violation simulator
function calcScore(c,violations){
  if(c.method==="accumulate"){var pt=0;violations.forEach(function(v){pt+=v.sev==="critical"?c.weights.c:v.sev==="major"?c.weights.m:c.weights.n;});return{type:"pts",val:pt};}
  if(c.method==="deduction"){var dd=0;violations.forEach(function(v){dd+=v.sev==="critical"?c.weights.c:v.sev==="major"?c.weights.m:c.weights.n;});return{type:"score",val:Math.max(0,100-dd)};}
  if(c.method==="count"){var mj=violations.filter(function(v){return v.sev==="critical"||v.sev==="major";}).length;return{type:"count",val:mj};}
  var un=violations.filter(function(v){return (v.sev==="critical"||v.sev==="major")&&!v.c;}).length;return{type:"reinspect",val:un};}
function getGrade(c,result){
  if(c.method==="accumulate")return result.val<=6?"Good":result.val<=13?"Satisfactory":"Unsatisfactory";
  if(c.method==="deduction"){if(c.id==="riverside")return result.val>=90?"A — PASS":result.val>=80?"B — FAIL":result.val>=70?"C — FAIL":"F — FAIL";return result.val>=90?"A":result.val>=80?"B":result.val>=70?"C":"F — Closed";}
  if(c.method==="count")return result.val<=1?"Green":result.val<=3?"Yellow":"Red — Closed";
  return result.val===0?"Pass":"Reinspection Required";}
function getGradeColor(c,result){
  if(c.method==="accumulate")return result.val<=6?{bg:E.grnBg,bd:E.grn,tx:"#065f46"}:result.val<=13?{bg:E.wrnBg,bd:E.wrn,tx:"#92400e"}:{bg:E.redBg,bd:E.red,tx:"#991b1b"};
  if(c.method==="deduction"){var pass=c.id==="riverside"?result.val>=90:result.val>=70;return pass?{bg:E.grnBg,bd:E.grn,tx:"#065f46"}:result.val>=80?{bg:E.wrnBg,bd:E.wrn,tx:"#92400e"}:{bg:E.redBg,bd:E.red,tx:"#991b1b"};}
  if(c.method==="count")return result.val<=1?{bg:E.grnBg,bd:E.grn,tx:"#065f46"}:result.val<=3?{bg:E.wrnBg,bd:E.wrn,tx:"#92400e"}:{bg:E.redBg,bd:E.red,tx:"#991b1b"};
  return result.val===0?{bg:E.grnBg,bd:E.grn,tx:"#065f46"}:{bg:E.redBg,bd:E.red,tx:"#991b1b"};}

// ═══ MAIN ═══
export default function ScoreTableCountyPage({county: countyProp}){
  var { slug } = useParams();
  var countyKey = countyProp || (slug ? slug.replace(/-county$/, "") : DEFAULT_COUNTY);
  var c=COUNTY_DATA[countyKey]||COUNTY_DATA[DEFAULT_COUNTY];
  var isFilta=FILTA_COUNTIES.includes(countyKey);

  var [modal,setModal]=useState(null);
  var [mf,setMf]=useState({name:"",email:"",phone:"",biz:"",county:c.name,msg:""});
  var [mDone,setMDone]=useState(false);
  var [faqOpen,setFaqOpen]=useState(null);
  var [simChecked,setSimChecked]=useState({});
  var [simUnlocked,setSimUnlocked]=useState(false);
  var [simName,setSimName]=useState("");
  var [simPhone,setSimPhone]=useState("");
  var [simBiz,setSimBiz]=useState("");
  var [simEmail,setSimEmail]=useState("");
  var simGateReady=simName&&simPhone&&simBiz&&simEmail;
  var [cookie,setCookie]=useState(true);

  // Vendor quote state
  var [vqVendor,setVqVendor]=useState(null);
  var [vqName,setVqName]=useState("");
  var [vqEmail,setVqEmail]=useState("");
  var [vqPhone,setVqPhone]=useState("");
  var [vqBiz,setVqBiz]=useState("");
  var [vqDone,setVqDone]=useState(false);
  var vqReady=vqName&&vqEmail&&vqPhone&&vqBiz;
  var vqBlk=isBl(vqEmail,"");

  // CTA lead
  var [ltName,setLtName]=useState("");
  var [ltEmail,setLtEmail]=useState("");
  var [ltPhone,setLtPhone]=useState("");
  var [ltBiz,setLtBiz]=useState("");
  var [ltDone,setLtDone]=useState(false);
  var ltReady=ltName&&ltEmail&&ltPhone&&ltBiz&&!isBl(ltEmail,"");

  // Simulator
  var simViolations=c.topViolations.filter(function(v,i){return simChecked[i];});
  var simResult=calcScore(c,simViolations);
  var simGrade=getGrade(c,simResult);
  var simColor=getGradeColor(c,simResult);

  var bG={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.gold,color:E.w,fontFamily:ff};
  var bN={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.navy,color:E.w,fontFamily:ff};
  var bST={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:S.grn,color:E.w,fontFamily:ff};
  var dinp={width:"100%",padding:"10px 12px",border:"1px solid "+E.g2,borderRadius:8,fontSize:"0.85rem",boxSizing:"border-box",outline:"none",background:E.w,color:E.g8,fontFamily:ff};

  function openCalendly(){window.open("https://calendly.com/evidly/demo","_blank");}
  function submitLead(name,email,phone,biz,setDone){if(!name||!email||!phone||!biz)return;window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[ScoreTable] Lead - "+biz+" ("+c.name+" County)")+"&body="+encodeURIComponent("Name: "+name+"\nEmail: "+email+"\nPhone: "+phone+"\nBusiness: "+biz+"\nCounty: "+c.name),"_blank");setDone(true);}
  function submitVendorQuote(){if(!vqReady||vqBlk)return;window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[ScoreTable] Vendor Quote - "+vqBiz+" needs "+vqVendor+" ("+c.name+" County)")+"&body="+encodeURIComponent("Name: "+vqName+"\nEmail: "+vqEmail+"\nPhone: "+vqPhone+"\nBusiness: "+vqBiz+"\nCounty: "+c.name+"\nService needed: "+vqVendor+"\n\nNote: $25 lead fee will be charged to vendor upon delivery."),"_blank");setVqDone(true);}

  return(
  <div style={{fontFamily:ff,color:E.g8,lineHeight:1.6,background:E.cream,minHeight:"100vh"}}>
  <style>{`button{all:unset;box-sizing:border-box;cursor:pointer;} button:disabled{cursor:not-allowed;} a.btn{all:unset;box-sizing:border-box;cursor:pointer;display:inline-block;}`}</style>
  {/* NOTE: In Next.js add to <Head>:
    <title>{c.metaTitle}</title>
    <meta name="description" content={c.metaDesc}/>
    <meta name="keywords" content={c.keywords}/>
    <link rel="canonical" href={"https://getevidly.com/scoretable/"+c.slug}/>
    <meta property="og:title" content={c.metaTitle}/>
    <meta property="og:description" content={c.metaDesc}/>
    <meta name="twitter:card" content="summary_large_image"/>
  */}

  {/* COOKIE */}
  {cookie&&<div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:E.w,borderTop:"1px solid "+E.g2,padding:"14px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 -2px 10px rgba(0,0,0,0.06)"}}>
    <p style={{flex:1,fontSize:"0.8rem",color:E.g6,margin:0,minWidth:200}}>We use cookies to enhance your experience. <a href="/privacy" style={{color:E.navy}}>Cookie Policy</a></p>
    <button onClick={function(){setCookie(false);}} style={{padding:"7px 16px",borderRadius:6,border:"1px solid "+E.g2,background:E.w,fontSize:"0.78rem",fontWeight:600,cursor:"pointer",color:E.g6}}>Settings</button>
    <button onClick={function(){setCookie(false);}} style={{padding:"7px 16px",borderRadius:6,border:"none",background:E.navy,color:E.w,fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}>Accept All</button>
  </div>}

  {/* VENDOR QUOTE MODAL */}
  {vqVendor&&!vqDone&&<div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={function(){setVqVendor(null);}}>
    <div style={{background:E.w,borderRadius:16,maxWidth:420,width:"100%",padding:"28px",position:"relative"}} onClick={function(e){e.stopPropagation();}}>
      <button onClick={function(){setVqVendor(null);}} style={{position:"absolute",top:12,right:12,background:"none",border:"none",fontSize:20,cursor:"pointer",color:E.g4}}>&times;</button>
      <div style={{fontSize:"0.68rem",fontWeight:700,color:S.grn,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Request a Quote</div>
      <h3 style={{fontSize:"1rem",fontWeight:700,color:E.navy,marginBottom:4}}>{vqVendor}</h3>
      <p style={{fontSize:"0.78rem",color:E.g5,marginBottom:16}}>{c.name} County · Your contact info is shared with the vendor who will reach out directly.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Your Name *</label><input value={vqName} onChange={function(e){setVqName(e.target.value);}} style={dinp} placeholder="Jane Kim"/></div>
        <div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Phone *</label><input value={vqPhone} onChange={function(e){setVqPhone(e.target.value);}} style={dinp} placeholder="(209) 555-0100"/></div>
      </div>
      <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Business Name *</label><input value={vqBiz} onChange={function(e){setVqBiz(e.target.value);}} style={dinp} placeholder="Pacific Kitchen"/></div>
      <div style={{marginBottom:14}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Email *</label><input value={vqEmail} onChange={function(e){setVqEmail(e.target.value);}} style={dinp} placeholder="jane@restaurant.com"/></div>
      {vqBlk&&<div style={{background:E.redBg,border:"1px solid "+E.red,borderRadius:8,padding:10,marginBottom:10,fontSize:"0.78rem",color:E.red}}>Competitor domains are not eligible.</div>}
      <button disabled={!vqReady||vqBlk} onClick={submitVendorQuote} style={Object.assign({},bST,{width:"100%",opacity:vqReady&&!vqBlk?1:0.4})}>Request Quote →</button>
      <p style={{fontSize:"0.68rem",color:E.g4,textAlign:"center",marginTop:8}}>EvidLY Verified vendors only. No spam.</p>
    </div>
  </div>}
  {vqDone&&<div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={function(){setVqVendor(null);setVqDone(false);}}>
    <div style={{background:E.w,borderRadius:16,maxWidth:380,width:"100%",padding:"40px 28px",textAlign:"center"}}>
      <div style={{fontSize:"2rem",marginBottom:8}}>✅</div>
      <h3 style={{fontWeight:700,color:E.navy,marginBottom:4}}>Request sent.</h3>
      <p style={{fontSize:"0.85rem",color:E.g5}}>The vendor will reach out to <strong>{vqEmail}</strong> within 1 business day.</p>
    </div>
  </div>}

  {/* HEADER */}
  <header style={{background:E.w,borderBottom:"1px solid "+E.g2,padding:"0 24px",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 6px rgba(0,0,0,0.04)"}}>
    <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",height:52}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginRight:28}}>
        <STIcon sz={28}/><STLogo s="1rem"/>
        <span style={{color:E.g3,fontSize:"0.9rem"}}>|</span>
        <a href="/" style={{textDecoration:"none"}}><Logo s="0.9rem"/></a>
      </div>
      <nav style={{display:"flex",gap:18,flex:1}}>
        {[["Methodology","#methodology"],["Violations","#violations"],["Simulator","#simulator"],["Vendors","#vendors"],["FAQ","#faq"]].map(function(x){return <a key={x[0]} href={x[1]} style={{textDecoration:"none",color:E.g5,fontWeight:500,fontSize:"0.8rem"}}>{x[0]}</a>;})}
      </nav>
      <div style={{display:"flex",gap:8}}>
        <a className="btn" href={"/"+c.landingSlug} style={{padding:"7px 14px",fontSize:"0.78rem",fontWeight:700,textDecoration:"none",display:"inline-block",background:E.navy,color:E.w,borderRadius:8,fontFamily:ff,cursor:"pointer"}}>Get EvidLY →</a>
      </div>
    </div>
  </header>

  {/* BREADCRUMB */}
  <div style={{background:E.w,borderBottom:"1px solid "+E.g1,padding:"7px 24px"}}>
    <div style={{maxWidth:1100,margin:"0 auto",fontSize:"0.72rem",color:E.g4}}>
      <a href="/" style={{color:E.g4,textDecoration:"none"}}>EvidLY</a>{" › "}
      <a href="/scoretable" style={{color:E.g4,textDecoration:"none"}}>ScoreTable</a>{" › "}
      <a href="/scoretable/california" style={{color:E.g4,textDecoration:"none"}}>California</a>{" › "}
      <span style={{color:E.navy,fontWeight:600}}>{c.name} County</span>
    </div>
  </div>

  {/* ═══ HERO ═══ */}
  <section style={{padding:"56px 24px 48px",background:"linear-gradient(160deg,#F5F3F0,"+E.cream+")",borderBottom:"1px solid "+E.g2,textAlign:"center"}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:16}}>
        <STIcon sz={32}/><STLogo s="1.1rem"/>
        <span style={{fontSize:"0.7rem",color:E.g4,marginLeft:4}}>The Score Behind Every Table</span>
      </div>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,background:E.w,border:"1px solid "+E.g2,borderRadius:100,padding:"4px 14px",marginBottom:20}}>
        <span style={{fontSize:"0.7rem",fontWeight:700,color:S.grn,textTransform:"uppercase",letterSpacing:1}}>California · {c.name} County</span>
        <TBadge level={c.transparency}/>
      </div>
      <h1 style={{fontSize:"clamp(1.8rem,5vw,2.6rem)",fontWeight:800,lineHeight:1.1,margin:"0 0 14px",color:E.navy}}>{c.h1}</h1>
      <p style={{fontSize:"0.96rem",color:E.g5,maxWidth:540,margin:"0 auto 28px",lineHeight:1.7}}>{c.heroSub}</p>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <a className="btn" href={"#methodology"} style={{padding:"11px 22px",fontSize:"0.85rem",fontWeight:700,textDecoration:"none",display:"inline-block",background:S.grn,color:E.w,borderRadius:8,border:"none",fontFamily:ff,cursor:"pointer"}}>Read the Methodology →</a>
        <a className="btn" href={"/"+c.landingSlug} style={{padding:"11px 22px",fontSize:"0.85rem",fontWeight:700,textDecoration:"none",display:"inline-block",background:E.navy,color:E.w,borderRadius:8,border:"none",fontFamily:ff,cursor:"pointer"}}>Track Your Score with EvidLY →</a>
      </div>
      <p style={{marginTop:14,fontSize:"0.76rem",color:E.g4}}>From <STLogo s="0.76rem"/> · Data sourced from {c.agencyShort} and NFPA 96 · Free to use</p>
    </div>
  </section>

  {/* ═══ AT A GLANCE ═══ */}
  <section style={{padding:"36px 24px",background:E.w,borderBottom:"1px solid "+E.g2}}>
    <div style={{maxWidth:920,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:20}}>
        {[
          {label:"Grading Method",val:c.methodName},
          {label:"Threshold",val:c.thresholdLabel},
          {label:"Grades Posted",val:c.posted},
          {label:"Inspection Freq",val:c.freq},
          ...(c.inspectors?[{label:"Inspectors",val:"~"+c.inspectors}]:[]),
          ...(c.facilities?[{label:"Facilities",val:"~"+c.facilities.toLocaleString()}]:[]),
          ...(c.closures?[{label:"Closures (Last Year)",val:c.closures}]:[]),
        ].map(function(item){return(
          <div key={item.label} style={{background:E.cream,borderRadius:9,padding:"12px",border:"1px solid "+E.g2,textAlign:"center"}}>
            <div style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:3}}>{item.label}</div>
            <div style={{fontSize:"0.8rem",fontWeight:700,color:E.navy,lineHeight:1.3}}>{item.val}</div>
          </div>
        );})}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
        <div style={{background:E.cream,borderRadius:9,padding:"12px 14px",border:"1px solid "+E.g2}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:3}}>Enforcement Agency</div>
          <div style={{fontSize:"0.8rem",fontWeight:700,color:E.navy}}>{c.agency}</div>
          <div style={{fontSize:"0.72rem",color:E.g5,marginTop:2}}>{c.agencyPhone}</div>
        </div>
        <div style={{background:E.cream,borderRadius:9,padding:"12px 14px",border:"1px solid "+E.g2}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:3}}>Fire Safety AHJ</div>
          <div style={{fontSize:"0.8rem",fontWeight:700,color:E.navy}}>{c.ahj}</div>
          <div style={{fontSize:"0.72rem",color:E.g5,marginTop:2}}>Hood cleaning regulated under NFPA 96</div>
        </div>
        <div style={{background:E.cream,borderRadius:9,padding:"12px 14px",border:"1px solid "+E.g2}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:3}}>Transparency Rating</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}><TBadge level={c.transparency}/></div>
          <div style={{fontSize:"0.72rem",color:E.g5,marginTop:4}}>{c.transparency==="HIGH"?"Detailed findings published online":c.transparency==="MEDIUM"?"Results available on request":"Limited public access to findings"}</div>
        </div>
      </div>
    </div>
  </section>

  {/* ═══ METHODOLOGY DEEP-DIVE ═══ */}
  <section id="methodology" style={{padding:"64px 24px",background:E.cream}}>
    <div style={{maxWidth:800,margin:"0 auto"}}>
      <SL t="The Methodology"/>
      <h2 style={{fontSize:"clamp(1.3rem,4vw,1.9rem)",fontWeight:800,color:E.navy,margin:"0 0 6px"}}>{c.methodName}</h2>
      <p style={{fontSize:"0.88rem",color:E.g5,marginBottom:24}}>{c.agencyShort} · {c.freq}</p>
      <div style={{background:E.w,borderRadius:14,padding:"24px",border:"1px solid "+E.g2,marginBottom:20}}>
        <p style={{fontSize:"0.9rem",color:E.g6,lineHeight:1.8,margin:"0 0 16px"}}>{c.methodDesc}</p>
        {c.methodNote&&<div style={{background:E.wrnBg,borderRadius:10,padding:"14px 16px",borderLeft:"3px solid "+E.wrn}}>
          <div style={{fontSize:"0.66rem",fontWeight:700,color:"#92400e",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Note</div>
          <p style={{fontSize:"0.84rem",color:"#78350f",margin:0,lineHeight:1.6}}>{c.methodNote}</p>
        </div>}
      </div>

      {/* Grade scale */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:"0.68rem",fontWeight:700,color:E.g4,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Grade Scale</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {c.grades.map(function(g){return(
            <div key={g.label} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:g.pass?E.grnBg:E.redBg,border:"1px solid "+(g.pass?E.grn:E.red)}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:g.pass?E.grn:E.red,flexShrink:0}}/>
              <div style={{flex:1}}><span style={{fontWeight:700,fontSize:"0.88rem",color:g.pass?"#065f46":"#991b1b"}}>{g.label}</span><span style={{fontSize:"0.8rem",color:g.pass?"#065f46":"#991b1b",marginLeft:10,opacity:0.75}}>{g.range}</span></div>
              <span style={{fontSize:"0.72rem",fontWeight:700,color:g.pass?E.grn:E.red,textTransform:"uppercase"}}>{g.pass?"PASS":"FAIL"}</span>
            </div>
          );})}
        </div>
      </div>

      {/* Inspector profile */}
      <div style={{background:E.w,borderRadius:14,padding:"20px",border:"1px solid "+E.g2}}>
        <div style={{fontSize:"0.66rem",fontWeight:700,color:S.grn,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>What Inspectors Look For in {c.name} County</div>
        <p style={{fontSize:"0.86rem",color:E.g6,lineHeight:1.75,margin:0}}>{c.inspectorProfile}</p>
      </div>
    </div>
  </section>

  {/* ═══ TOP VIOLATIONS ═══ */}
  <section id="violations" style={{padding:"64px 24px",background:E.w}}>
    <div style={{maxWidth:800,margin:"0 auto"}}>
      <SL t="Top Violations"/>
      <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.8rem)",fontWeight:800,color:E.navy,margin:"0 0 6px"}}>Most common violations in {c.name} County kitchens</h2>
      <p style={{fontSize:"0.86rem",color:E.g5,marginBottom:24}}>With CalCode references and {c.method!=="reinspect"&&c.method!=="count"?"point values":"enforcement impact"}.</p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {c.topViolations.map(function(v,i){return(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"16px",borderRadius:12,background:E.cream,border:"1px solid "+E.g2}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:v.sev==="critical"?E.redBg:v.sev==="major"?E.wrnBg:E.bluePale,border:"1px solid "+(v.sev==="critical"?E.red:v.sev==="major"?E.wrn:E.g3),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:"0.75rem",fontWeight:800,color:v.sev==="critical"?E.red:v.sev==="major"?E.wrn:E.g5}}>{i+1}</span></div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:"0.88rem",fontWeight:700,color:E.navy}}>{v.v}</span>
                <SevBadge sev={v.sev}/>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <span style={{fontSize:"0.72rem",color:E.g5,fontFamily:"monospace"}}>{v.code}</span>
                {v.pts!=null&&<span style={{fontSize:"0.72rem",color:c.method==="accumulate"?"#065f46":E.red,fontWeight:700}}>{c.method==="accumulate"?"+"+v.pts+" pts":"-"+v.pts+" pts"}</span>}
              </div>
            </div>
          </div>
        );})}
      </div>
    </div>
  </section>

  {/* ═══ VIOLATION SIMULATOR ═══ */}
  {(c.method==="deduction"||c.method==="accumulate"||c.method==="count")&&(
  <section id="simulator" style={{padding:"64px 24px",background:E.cream}}>
    <div style={{maxWidth:800,margin:"0 auto"}}>
      <SL t="Score Simulator"/>
      <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.8rem)",fontWeight:800,color:E.navy,margin:"0 0 6px"}}>See how violations affect your {c.name} County score</h2>
      <p style={{fontSize:"0.86rem",color:E.g5,marginBottom:24}}>Check the violations that apply. The score updates in real time using {c.agencyShort}'s actual methodology.</p>

      {/* GATE */}
      {!simUnlocked&&(
      <div style={{background:E.w,borderRadius:16,border:"1px solid "+E.g2,overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"20px 24px 10px",borderBottom:"1px solid "+E.g2}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:E.navy,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:"0.75rem",fontWeight:800,color:E.w}}>1</span></div>
            <div><div style={{fontSize:"0.82rem",fontWeight:700,color:E.navy}}>Enter your info to run the simulator</div><div style={{fontSize:"0.72rem",color:E.g5}}>Free. Uses {c.agencyShort}'s actual scoring weights.</div></div>
          </div>
        </div>
        <div style={{padding:"18px 24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Your Name *</label><input value={simName} onChange={function(e){setSimName(e.target.value);}} style={dinp} placeholder="Jane Kim"/></div>
            <div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Phone *</label><input value={simPhone} onChange={function(e){setSimPhone(e.target.value);}} style={dinp} placeholder="(209) 555-0100"/></div>
          </div>
          <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Business Name *</label><input value={simBiz} onChange={function(e){setSimBiz(e.target.value);}} style={dinp} placeholder="Pacific Kitchen"/></div>
          <div style={{marginBottom:16}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Email *</label><input value={simEmail} onChange={function(e){setSimEmail(e.target.value);}} style={dinp} placeholder="jane@restaurant.com"/></div>
          <button disabled={!simGateReady} onClick={function(){setSimUnlocked(true);window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[ScoreTable] Simulator - "+simBiz+" ("+c.name+" County)")+"&body="+encodeURIComponent("Name: "+simName+"\nEmail: "+simEmail+"\nPhone: "+simPhone+"\nBusiness: "+simBiz+"\nCounty: "+c.name),"_blank");}} style={Object.assign({},bN,{width:"100%",opacity:simGateReady?1:0.4,padding:"12px",fontSize:"0.9rem"})}>Run the Simulator →</button>
        </div>
        {/* Blurred preview */}
        <div style={{position:"relative",overflow:"hidden"}}>
          <div style={{padding:"12px 24px 16px",borderTop:"1px solid "+E.g2,filter:"blur(5px)",pointerEvents:"none",userSelect:"none",opacity:0.45}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {c.topViolations.slice(0,4).map(function(v,i){var riskColor=v.sev==="critical"?E.red:v.sev==="major"?E.wrn:E.g3;return(
                <div key={i} style={{padding:"12px 14px",borderRadius:10,border:"2px solid "+E.g2,background:E.w,display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+E.g3,background:"transparent",flexShrink:0,marginTop:1}}/>
                  <div><div style={{fontSize:"0.8rem",fontWeight:600,color:E.navy,lineHeight:1.4,marginBottom:2}}>{v.v}</div><SevBadge sev={v.sev}/></div>
                </div>
              );})}
            </div>
          </div>
          <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(to bottom,rgba(255,255,255,0.1),rgba(250,248,244,0.95))"}}>
            <div style={{textAlign:"center",padding:"12px 20px",background:E.w,borderRadius:12,border:"1px solid "+E.g2,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}><div style={{fontSize:"1.2rem",marginBottom:4}}>🔒</div><p style={{fontSize:"0.8rem",fontWeight:700,color:E.navy,margin:0}}>Enter your info above to unlock</p></div>
          </div>
        </div>
      </div>
      )}

      {/* UNLOCKED SIMULATOR */}
      {simUnlocked&&(
      <div>
        <div style={{background:E.w,borderRadius:12,padding:"10px 16px",border:"1px solid "+E.grn,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:E.grn,fontSize:"0.9rem"}}>✓</span>
          <span style={{fontSize:"0.78rem",color:"#065f46",fontWeight:600}}>Simulator unlocked for {simBiz} · {c.name} County</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          {c.topViolations.map(function(v,i){var checked=!!simChecked[i];var riskColor=v.sev==="critical"?E.red:v.sev==="major"?E.wrn:E.g3;return(
            <button key={i} onClick={function(){setSimChecked(Object.assign({},simChecked,{[i]:!checked}));}} style={{textAlign:"left",padding:"12px 14px",borderRadius:10,border:"2px solid "+(checked?riskColor:E.g2),background:checked?(v.sev==="critical"?E.redBg:v.sev==="major"?E.wrnBg:E.bluePale):E.w,cursor:"pointer",display:"flex",alignItems:"flex-start",gap:10}}>
              <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(checked?riskColor:E.g3),background:checked?riskColor:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{checked&&<span style={{fontSize:"0.7rem",color:E.w,fontWeight:900}}>✓</span>}</div>
              <div><div style={{fontSize:"0.8rem",fontWeight:600,color:E.navy,lineHeight:1.4,marginBottom:2}}>{v.v}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><SevBadge sev={v.sev}/>{v.pts!=null&&<span style={{fontSize:"0.66rem",color:E.g5,fontWeight:700}}>{c.method==="accumulate"?"+"+v.pts+" pts":"-"+v.pts+" pts"}</span>}</div></div>
            </button>
          );})}
        </div>
        <div style={{borderRadius:14,border:"2px solid "+simColor.bd,padding:"20px 24px",background:simColor.bg,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:simColor.tx,marginBottom:4}}>Estimated Outcome — {c.name} County</div>
            <div style={{fontSize:"2rem",fontWeight:800,color:simColor.tx,lineHeight:1}}>{simGrade}</div>
            {c.method==="deduction"&&<div style={{fontSize:"0.82rem",color:simColor.tx,marginTop:4,opacity:0.8}}>Score: {simResult.val} / 100</div>}
            {c.method==="accumulate"&&<div style={{fontSize:"0.82rem",color:simColor.tx,marginTop:4,opacity:0.8}}>Total: {simResult.val} points</div>}
            {c.method==="count"&&<div style={{fontSize:"0.82rem",color:simColor.tx,marginTop:4,opacity:0.8}}>Major violations: {simResult.val}</div>}
          </div>
          <div style={{textAlign:"right"}}>
            {simViolations.length===0
              ?<p style={{fontSize:"0.82rem",color:simColor.tx,opacity:0.65,margin:0}}>Check violations above to see the impact.</p>
              :<div><p style={{fontSize:"0.82rem",color:simColor.tx,margin:"0 0 10px",opacity:0.75}}>{simViolations.length} violation{simViolations.length>1?"s":""} selected</p><a className="btn" href={"/"+c.landingSlug} style={{padding:"9px 18px",fontSize:"0.8rem",fontWeight:700,textDecoration:"none",display:"inline-block",background:E.navy,color:E.w,borderRadius:8,fontFamily:ff}}>Track this with EvidLY →</a></div>}
          </div>
        </div>
        <p style={{textAlign:"center",fontSize:"0.74rem",color:E.g4,marginTop:12}}>Simulator uses {c.agencyShort}'s documented scoring weights. Actual inspection results may vary based on inspector judgment.</p>
      </div>
      )}
    </div>
  </section>
  )}

  {/* ═══ VENDOR MARKETPLACE ═══ */}
  <section id="vendors" style={{padding:"64px 24px",background:E.w}}>
    <div style={{maxWidth:900,margin:"0 auto"}}>
      <SL t="EvidLY Verified Vendors"/>
      <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.8rem)",fontWeight:800,color:E.navy,margin:"0 0 6px"}}>Verified service providers in {c.name} County</h2>
      <p style={{fontSize:"0.86rem",color:E.g5,marginBottom:24}}>EvidLY Verified vendors meet licensing, insurance, and certification requirements. Request a quote — vendors respond within 1 business day.</p>

      {/* CPP — always shown */}
      <div style={{background:"linear-gradient(135deg,"+E.navy+","+E.navyL+")",borderRadius:16,padding:"24px",marginBottom:16,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,background:E.gold,padding:"4px 16px",borderRadius:"0 16px 0 12px",fontSize:"0.66rem",fontWeight:800,color:E.navy,textTransform:"uppercase",letterSpacing:1}}>EvidLY Anchor Vendor</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:20,alignItems:"center",flexWrap:"wrap"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
              <span style={{fontWeight:800,fontSize:"1rem",color:E.w}}>Cleaning Pros Plus</span>
              <span style={{padding:"2px 8px",borderRadius:100,background:E.gold,color:E.navy,fontSize:"0.64rem",fontWeight:800,textTransform:"uppercase",letterSpacing:0.5}}>IKECA Certified</span>
              <span style={{padding:"2px 8px",borderRadius:100,background:"rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.8)",fontSize:"0.64rem",fontWeight:700}}>Veteran Owned</span>
            </div>
            <div style={{fontSize:"0.84rem",color:"rgba(255,255,255,0.7)",marginBottom:8,lineHeight:1.6}}>Commercial kitchen hood cleaning and exhaust cleaning. IKECA Member #76716495. NFPA 96 compliant. Serving {c.name} County and throughout California.</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:"0.78rem",color:"rgba(255,255,255,0.55)"}}>
              <span>🏷 Hood Cleaning</span>
              <span>📋 IKECA CECS/CECT Certified</span>
              <span>📞 (209) 636-6116</span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
            <a className="btn" href="tel:2096366116" style={{padding:"10px 20px",fontSize:"0.82rem",fontWeight:700,textDecoration:"none",display:"inline-block",background:E.gold,color:E.w,borderRadius:8,border:"none",fontFamily:ff,cursor:"pointer"}}>Call Now →</a>
            <button onClick={function(){setVqVendor("Cleaning Pros Plus — Hood Cleaning");}} style={{padding:"8px 20px",borderRadius:8,border:"1px solid rgba(255,255,255,0.25)",background:"transparent",color:"rgba(255,255,255,0.7)",fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}>Request Quote</button>
          </div>
        </div>
      </div>

      {/* Filta — shown on 6 counties */}
      {isFilta&&<div style={{background:E.cream,borderRadius:14,padding:"20px",border:"1px solid "+E.g2,marginBottom:12,position:"relative"}}>
        <div style={{position:"absolute",top:0,right:0,background:E.navy,padding:"3px 12px",borderRadius:"0 14px 0 10px",fontSize:"0.62rem",fontWeight:700,color:E.w,textTransform:"uppercase",letterSpacing:0.5}}>EvidLY Verified</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"center"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
              <span style={{fontWeight:700,fontSize:"0.92rem",color:E.navy}}>Filta Environmental Kitchen Solutions</span>
            </div>
            <div style={{fontSize:"0.82rem",color:E.g6,marginBottom:6,lineHeight:1.6}}>Cooking oil recycling, fryer management, and fryer cleaning. Serving {c.name} County. Regular service schedules — keeps your fryers compliant and your oil fresh.</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:"0.75rem",color:E.g5}}>
              <span>🏷 Cooking Oil Management</span><span>🏷 Fryer Service</span>
              <span>📞 (209) 733-9433</span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
            <a className="btn" href="tel:2097339433" style={{padding:"9px 18px",fontSize:"0.8rem",fontWeight:700,textDecoration:"none",display:"inline-block",background:E.navy,color:E.w,borderRadius:8,border:"none",fontFamily:ff,cursor:"pointer"}}>Call Now →</a>
            <button onClick={function(){setVqVendor("Filta — Cooking Oil Management / Fryer Service");}} style={{padding:"7px 18px",borderRadius:8,border:"1px solid "+E.g2,background:E.w,color:E.g5,fontSize:"0.76rem",fontWeight:600,cursor:"pointer"}}>Request Quote</button>
          </div>
        </div>
      </div>}

      {/* Other vendor slots */}
      {[{cat:"Fire Suppression Service",note:"Semi-annual service required under NFPA 17A"},{cat:"Pest Control",note:"Documentation required under CalCode §114259"},{cat:"Grease Trap / Interceptor Service",note:"Maintenance frequency varies by local ordinance"},{cat:"Equipment Repair & Calibration",note:"Thermometer calibration required for HACCP compliance"}].map(function(slot){return(
        <div key={slot.cat} style={{background:E.cream,borderRadius:12,padding:"16px 18px",border:"1px dashed "+E.g3,marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div>
            <div style={{fontSize:"0.84rem",fontWeight:700,color:E.g5,marginBottom:2}}>{slot.cat}</div>
            <div style={{fontSize:"0.74rem",color:E.g4}}>{slot.note}</div>
          </div>
          <button onClick={function(){setVqVendor(slot.cat+" — "+c.name+" County");}} style={Object.assign({},bST,{padding:"8px 16px",fontSize:"0.78rem",opacity:0.85})}>Request Quote</button>
        </div>
      );})}

      <div style={{marginTop:16,padding:"14px 18px",background:E.bluePale,borderRadius:10,border:"1px solid "+E.g2,fontSize:"0.78rem",color:E.g6}}>
        <strong style={{color:E.navy}}>Are you a vendor?</strong> EvidLY Verified listing is free. Requires valid business license, appropriate trade license, liability insurance, and industry certifications. <a href="mailto:founders@getevidly.com?subject=Vendor Listing Application" style={{color:E.navy,fontWeight:600}}>Apply here →</a>
      </div>
    </div>
  </section>

  {/* ═══ FAQ ═══ */}
  <section id="faq" style={{padding:"64px 24px",background:E.cream}}>
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}><SL t={c.name+" County FAQ"}/><h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.8rem)",fontWeight:800,color:E.navy,margin:0}}>Common questions about {c.name} County inspections</h2></div>
      {c.faq.map(function(item,i){return(
        <div key={i} style={{borderBottom:"1px solid "+E.g2}}>
          <button onClick={function(){setFaqOpen(faqOpen===i?null:i);}} style={{width:"100%",textAlign:"left",background:"none",border:"none",padding:"18px 0",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <span style={{fontSize:"0.9rem",fontWeight:700,color:E.navy,lineHeight:1.4}}>{item.q}</span>
            <span style={{color:S.grn,fontSize:"1.2rem",flexShrink:0,fontWeight:700}}>{faqOpen===i?"−":"+"}</span>
          </button>
          {faqOpen===i&&<p style={{fontSize:"0.85rem",color:E.g6,lineHeight:1.7,paddingBottom:18,margin:0}}>{item.a}</p>}
        </div>
      );})}
    </div>
  </section>

  {/* ═══ EVIDLY SOFT PITCH ═══ */}
  <section style={{padding:"64px 24px",background:E.w,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,"+E.navyD+","+E.navy+")",borderRadius:18,padding:"36px 32px",textAlign:"center"}}>
        <div style={{marginBottom:16}}><Logo s="1.4rem" light tagline/></div>
        <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.7rem)",fontWeight:800,color:E.w,margin:"0 0 10px",lineHeight:1.2}}>Know your {c.name} County score before an inspector does.</h2>
        <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.55)",maxWidth:460,margin:"0 auto 24px",lineHeight:1.7}}>EvidLY applies {c.agencyShort}'s exact methodology to your daily data — so you see your score in real time, not after the fact.</p>
        {!ltDone?(
        <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"20px",border:"1px solid rgba(255,255,255,0.1)",maxWidth:480,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={{fontSize:"0.7rem",fontWeight:600,color:"rgba(255,255,255,0.45)",display:"block",marginBottom:3}}>Your Name *</label><input value={ltName} onChange={function(e){setLtName(e.target.value);}} style={{width:"100%",padding:"9px 11px",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:"0.84rem",boxSizing:"border-box",outline:"none",background:"rgba(255,255,255,0.1)",color:E.w,fontFamily:ff}} placeholder="Jane Kim"/></div>
            <div><label style={{fontSize:"0.7rem",fontWeight:600,color:"rgba(255,255,255,0.45)",display:"block",marginBottom:3}}>Phone *</label><input value={ltPhone} onChange={function(e){setLtPhone(e.target.value);}} style={{width:"100%",padding:"9px 11px",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:"0.84rem",boxSizing:"border-box",outline:"none",background:"rgba(255,255,255,0.1)",color:E.w,fontFamily:ff}} placeholder="(209) 555-0100"/></div>
          </div>
          <div style={{marginBottom:10}}><label style={{fontSize:"0.7rem",fontWeight:600,color:"rgba(255,255,255,0.45)",display:"block",marginBottom:3}}>Business Name *</label><input value={ltBiz} onChange={function(e){setLtBiz(e.target.value);}} style={{width:"100%",padding:"9px 11px",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:"0.84rem",boxSizing:"border-box",outline:"none",background:"rgba(255,255,255,0.1)",color:E.w,fontFamily:ff}} placeholder="Pacific Kitchen"/></div>
          <div style={{marginBottom:14}}><label style={{fontSize:"0.7rem",fontWeight:600,color:"rgba(255,255,255,0.45)",display:"block",marginBottom:3}}>Email *</label><input value={ltEmail} onChange={function(e){setLtEmail(e.target.value);}} style={{width:"100%",padding:"9px 11px",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:"0.84rem",boxSizing:"border-box",outline:"none",background:"rgba(255,255,255,0.1)",color:E.w,fontFamily:ff}} placeholder="jane@restaurant.com"/></div>
          <button disabled={!ltReady} onClick={function(){submitLead(ltName,ltEmail,ltPhone,ltBiz,setLtDone);openCalendly();}} style={Object.assign({},bG,{width:"100%",opacity:ltReady?1:0.4,fontSize:"0.9rem",padding:"12px"})}>Book a Demo — 45 Minutes →</button>
          <p style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.25)",marginTop:8}}>Launching May 5, 2026 · $99/mo founder pricing</p>
        </div>):(
        <div style={{textAlign:"center",paddingTop:8}}>
          <div style={{fontSize:"1.8rem",marginBottom:8}}>✅</div>
          <p style={{color:"rgba(255,255,255,0.7)",fontSize:"0.88rem"}}>We'll be in touch, {ltName}. Check <strong>{ltEmail}</strong> for calendar confirmation.</p>
        </div>)}
      </div>
    </div>
  </section>

  {/* ═══ CROSS-LINKS ═══ */}
  <section style={{padding:"36px 24px",background:E.cream,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:780,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
        {[
          {href:"/"+c.landingSlug,label:"EvidLY for "+c.name+" County",desc:"Track your "+c.name+" County compliance score daily. Food safety + facility safety. Configured for "+c.agencyShort+".",cta:"Learn More →",color:E.navy},
          {href:"/kitchen-check/"+c.kcSlug,label:"Kitchen Self Check",desc:"8 questions. Free. Know your "+c.name+" County gaps right now — no account needed.",cta:"Check My Kitchen →",color:S.grn},
          {href:"/kitchen-to-community",label:"Kitchen to Community",desc:"Every EvidLY subscription funds ~100 meals per location per month through No Kid Hungry.",cta:"Learn More →",color:E.gold},
        ].map(function(link){return(
          <a key={link.href} href={link.href} style={{textDecoration:"none",background:E.w,borderRadius:12,padding:"18px",border:"1px solid "+E.g2,display:"block"}}>
            <div style={{fontSize:"0.62rem",fontWeight:800,textTransform:"uppercase",letterSpacing:1.5,color:link.color,marginBottom:6}}>{link.label}</div>
            <p style={{fontSize:"0.8rem",color:E.g6,lineHeight:1.6,marginBottom:8}}>{link.desc}</p>
            <span style={{fontSize:"0.78rem",fontWeight:700,color:link.color}}>{link.cta}</span>
          </a>
        );})}
      </div>
    </div>
  </section>

  {/* FOOTER */}
  <footer style={{padding:"36px 24px 20px",background:"#2C3E5C"}}>
    <div style={{maxWidth:960,margin:"0 auto",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:24}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><STIcon sz={22}/><STLogo s="0.95rem" light/></div>
        <p style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.4)",lineHeight:1.6,marginBottom:6}}>The Score Behind Every Table.</p>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}><Logo s="0.8rem" light tagline/></div>
        <p style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.3)",marginTop:6,lineHeight:1.5}}>Serving {c.name} County, California.</p>
      </div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>ScoreTable</h4>{["All Counties","Methodology","About"].map(function(l){return <a key={l} href="#" style={{display:"block",fontSize:"0.76rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>{l}</a>;})}</div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>EvidLY</h4>{["Product","Pricing","Kitchen to Community","Book a Demo"].map(function(l){return <a key={l} href="#" style={{display:"block",fontSize:"0.76rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>{l}</a>;})}</div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Contact</h4><a href="mailto:founders@getevidly.com" style={{display:"block",fontSize:"0.76rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>founders@getevidly.com</a><a href="tel:8553843591" style={{display:"block",fontSize:"0.76rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>(855) EVIDLY1</a><a href="tel:2096007675" style={{display:"block",fontSize:"0.76rem",color:"rgba(255,255,255,0.5)",textDecoration:"none"}}>(209) 600-7675</a></div>
    </div>
    <div style={{maxWidth:960,margin:"14px auto 0",paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <span style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.25)"}}>© 2026 EvidLY, LLC. <STLogo s="0.68rem" light/> is a free public resource. Data sourced from {c.agencyShort} and NFPA 96.</span>
      <div style={{display:"flex",gap:14}}>{["Privacy","Terms","Cookies"].map(function(l){return <a key={l} href="#" style={{fontSize:"0.66rem",color:"rgba(255,255,255,0.3)",textDecoration:"none"}}>{l}</a>;})}</div>
    </div>
  </footer>

  </div>);
}
