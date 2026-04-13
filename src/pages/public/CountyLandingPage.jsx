/**
 * EVIDLY COUNTY LANDING PAGE — MASTER TEMPLATE
 * URL: getevidly.com/[county]-county
 * 62 pages generated from this template
 *
 * UNIQUE PER COUNTY (via COUNTY_DATA + county prop):
 * - meta title, description, canonical URL, keywords
 * - H1, hero subheading, county name throughout
 * - Agency name/short, grading method, weights, threshold
 * - Inspection freq, inspectors, facilities, closures, transparency
 * - Top violations, 5 FAQ questions
 * - Vendor listings (CPP statewide, Filta on 6 counties)
 * - County pre-filled in all contact forms
 * - Schema markup (FAQPage + SoftwareApplication + LocalBusiness)
 *
 * CONSISTENT ACROSS ALL 62:
 * - What's Covered, Your County slider, Kitchen Self Check
 * - Day Walkthrough (6 steps), Schedule Demo, ScoreTable lookup
 * - Who We Are, Pricing, Cross-links, Final CTA, Footer
 * - Modal system, competitor blocking, phone required on all forms
 */

import { useState } from "react";
import { useParams } from "react-router-dom";

// ═══ PALETTE (lightened production version) ═══
const E={
  navy:"#25396B",navyL:"#344E8A",navyD:"#1A2B52",
  gold:"#B8A06A",goldL:"#CDB882",goldD:"#9C8452",
  w:"#fff",cream:"#FAF8F4",
  g1:"#F2F2F0",g2:"#E8E6E0",g3:"#d1d5db",
  g4:"#9ca3af",g5:"#6b7280",g6:"#4b5563",g8:"#1f2937",
  grn:"#16a34a",grnBg:"#f0fdf4",
  red:"#dc2626",redBg:"#fef2f2",
  wrn:"#f59e0b",wrnBg:"#fffbeb",
  orn:"#ea580c",bluePale:"#edf0f8"
};
const S={grn:"#1B5E20",grnL:"#4CAF50",charD:"#2E3C47",char:"#445562",bg:"#F5F3F0",bd:"#D6CFC5",tx:"#2D2A26",sub:"#6B6560"};
const ff="system-ui,-apple-system,sans-serif";
const CALENDLY="https://calendly.com/founders-getevidly/60min";

// ═══ COUNTY DATA ═══
const COUNTY_DATA={
  merced:{name:"Merced",slug:"merced-county",agency:"Merced County Department of Public Health — Environmental Health",agencyShort:"Merced County DPH",phone:"(209) 381-1100",method:"accumulate",weights:{c:4,m:2,n:2},threshold:"14+ points = Unsatisfactory",grade:"Good / Satisfactory / Unsatisfactory",freq:"1–2x per year",inspectors:6,facilities:1200,closures:8,transparency:"HIGH",topViolations:["Temperature logs missing","HACCP documentation","Hood cleaning records","Food handler cards","Cooling procedures"],faq:[{q:"How does Merced County score restaurant inspections?",a:"Merced County uses a point accumulation system starting at zero. Critical violations = 4 points, major = 2 points, minor = 2 points. 0–6 is Good, 7–13 is Satisfactory, 14+ is Unsatisfactory."},{q:"What makes Merced County a HIGH transparency jurisdiction?",a:"Merced County publishes detailed inspection findings online with explanations alongside scores, making it easier for operators and the public to understand results."},{q:"How often does Merced County inspect commercial kitchens?",a:"Most Merced County commercial kitchens receive 1–2 inspections per year. Risk tier and complaint history influence frequency."},{q:"What score triggers a re-inspection in Merced County?",a:"A score of 14 or more points — rated Unsatisfactory — triggers a follow-up inspection. Uncorrected critical violations accelerate that timeline."},{q:"What violations are most common in Merced County kitchens?",a:"Missing temperature logs, incomplete HACCP documentation, overdue hood cleaning records, expired food handler cards, and improper cooling procedures are most frequently cited."}],metaTitle:"Merced County Restaurant Compliance | EvidLY",metaDesc:"Merced County uses a point-based system with high transparency. EvidLY was built in Merced and knows your county's inspection methodology inside out.",keywords:"Merced County restaurant inspection, Merced County health inspection score, commercial kitchen compliance Merced County California",h1:"Merced County Commercial Kitchen Compliance",heroSub:"Merced County is one of California's most transparent jurisdictions. EvidLY was built here — and knows exactly how your kitchen is scored.",filta:true},
  fresno:{name:"Fresno",slug:"fresno-county",agency:"Fresno County Department of Public Health — Environmental Health Division",agencyShort:"Fresno County DPH",phone:"(559) 600-3357",method:"reinspect",weights:{c:0,m:0,n:0},threshold:"Uncorrected major = Reinspection",grade:"Report-based pass/fail — no public numeric score",freq:"1–2x per year",inspectors:22,facilities:5000,closures:58,transparency:"LOW",topViolations:["Temperature abuse","HACCP plan missing","Hood cleaning overdue","No food handler cards","Improper cooling"],faq:[{q:"How does Fresno County score restaurant inspections?",a:"Fresno County uses a report-based pass/fail system rather than a numeric score. Major violations must be corrected on-site or a reinspection is triggered. There is no posted letter grade."},{q:"Why is Fresno County rated LOW transparency?",a:"A 2023–24 Grand Jury report found Fresno County's food safety inspection data is not consistently published online, making it harder for operators and the public to access records."},{q:"How often does Fresno County inspect commercial kitchens?",a:"Most Fresno County commercial kitchens are inspected 1–2 times per year. High-risk facilities or those with complaint histories may be inspected more frequently."},{q:"What happens if a major violation isn't corrected during inspection?",a:"In Fresno County, uncorrected major violations trigger a reinspection, typically within 14–30 days. Continued non-compliance can result in permit suspension."},{q:"What are the most cited violations in Fresno County kitchens?",a:"Temperature abuse, missing HACCP plans, overdue hood cleaning certificates, missing food handler cards, and improper cooling procedures are among the most common findings."}],metaTitle:"Fresno County Restaurant Compliance | EvidLY",metaDesc:"Fresno County uses a pass/fail inspection system with low public transparency. See what inspectors look for and how EvidLY keeps your Fresno kitchen ready.",keywords:"Fresno County restaurant inspection, Fresno County health inspection, commercial kitchen compliance Fresno County California",h1:"Fresno County Commercial Kitchen Compliance",heroSub:"Fresno County's inspection system has low public transparency. EvidLY gives you the clarity your county doesn't.",filta:true},
  kern:{name:"Kern",slug:"kern-county",agency:"Kern County Public Health Services Department",agencyShort:"Kern County PHS",phone:"(661) 321-3000",method:"deduction",weights:{c:5,m:3,n:1},threshold:"Below 75 = Closure",grade:"Letter grade A / B / C — A requires 90+",freq:"1–3x per year",inspectors:18,facilities:4000,closures:44,transparency:"MEDIUM",topViolations:["Temperature violations","Food contact sanitation","Pest evidence","Handwashing compliance","Food handler cards"],faq:[{q:"How does Kern County grade restaurant inspections?",a:"Kern County uses a 100-point deduction system. Critical violations = 5 points, major = 3 points, minor = 1 point. An 'A' grade requires 90 or above. Below 75 results in closure."},{q:"What is the passing score for a Kern County restaurant inspection?",a:"Kern County requires a score of 75 or higher to remain open. An 'A' grade requires 90+, 'B' is 80–89, and 'C' is 75–79. Below 75 results in immediate closure."},{q:"Are Kern County inspection grades posted publicly?",a:"Yes. Kern County letter grades must be displayed at the establishment and inspection reports are available through the county health department."},{q:"How often does Kern County inspect restaurants?",a:"Kern County inspects restaurants 1–3 times per year based on risk category. Prior violations and complaint history increase inspection frequency."},{q:"What violations most commonly lower Kern County inspection scores?",a:"Temperature violations, food contact surface sanitation failures, pest evidence, handwashing compliance gaps, and missing food handler cards are the most cited issues."}],metaTitle:"Kern County Restaurant Compliance | EvidLY",metaDesc:"Kern County closes kitchens scoring below 75. Understand the grading system and keep your Kern County restaurant inspection-ready with EvidLY.",keywords:"Kern County restaurant inspection, Kern County health inspection grade, commercial kitchen compliance Kern County California",h1:"Kern County Commercial Kitchen Compliance",heroSub:"Kern County closes kitchens that score below 75. Know your number before it's posted.",filta:false},
  "los-angeles":{name:"Los Angeles",slug:"los-angeles-county",agency:"LA County Department of Public Health — Environmental Health",agencyShort:"LA County DPH",phone:"(888) 700-9995",method:"deduction",weights:{c:4,m:2,n:1},threshold:"Below 70 = Fail",grade:"Letter grade A / B / C — required to be posted",freq:"1–3x per year",inspectors:280,facilities:55000,closures:312,transparency:"HIGH",topViolations:["Temperature control","Employee hygiene","Vermin/pest","Food storage","Equipment sanitation"],faq:[{q:"How does LA County score restaurant inspections?",a:"LA County starts at 100 points and deducts for violations. Critical violations deduct 4 points, major violations 2 points, minor violations 1 point. Below 70 is a failing grade."},{q:"Does LA County require grade cards to be posted?",a:"Yes. LA County requires the most recent letter grade card to be posted in a location clearly visible to the public, typically the front window or door."},{q:"How often does LA County inspect restaurants?",a:"LA County inspects restaurants 1–3 times per year. High-risk establishments and those with prior violations receive more frequent visits. Unannounced inspections are standard."},{q:"What triggers a closure in LA County?",a:"A score below 70, an imminent health hazard, or uncorrected critical violations can result in immediate closure. Re-opening requires a passing re-inspection."},{q:"What are the most common LA County inspection violations?",a:"Temperature control failures, employee hygiene, vermin and pest evidence, improper food storage, and equipment sanitation are the most frequently cited violations across LA County."}],metaTitle:"Los Angeles County Restaurant Compliance | EvidLY",metaDesc:"55,000+ food facilities in LA County. Understand LA's letter grade system and keep your kitchen inspection-ready with EvidLY's compliance platform.",keywords:"Los Angeles County restaurant inspection, LA County health inspection grade, commercial kitchen compliance Los Angeles California",h1:"Los Angeles County Commercial Kitchen Compliance",heroSub:"55,000 food facilities. 280 inspectors. LA County's grade card system means your score is public. Know it before they post it.",filta:false},
  riverside:{name:"Riverside",slug:"riverside-county",agency:"Riverside County Department of Environmental Health",agencyShort:"Riverside County EH",phone:"(888) 722-4234",method:"deduction",weights:{c:4,m:2,n:1},threshold:"Below 90 = Fail — only A passes",grade:"Letter grade — A only passes (90+)",freq:"1–3x per year",inspectors:55,facilities:11000,closures:88,transparency:"HIGH",topViolations:["Temperature control","Food handler cards","Pest control","Sanitation","HACCP compliance"],faq:[{q:"How does Riverside County grade restaurant inspections?",a:"Riverside County uses a strict letter grade system where only an 'A' (90+) is considered passing. A 'B' or lower is treated as a failing grade — stricter than most California counties."},{q:"What happens if a Riverside County restaurant gets a B grade?",a:"In Riverside County, a 'B' grade (80–89) is treated as a failure. The establishment must improve to an 'A' on re-inspection or face further enforcement action."},{q:"Are Riverside County inspection grades posted publicly?",a:"Yes. Riverside County requires grade cards to be displayed prominently and publishes inspection reports online."},{q:"How often does Riverside County inspect restaurants?",a:"Riverside County inspects restaurants 1–3 times per year. High-risk facilities and those with prior grades below 'A' are prioritized for more frequent inspections."},{q:"What violations most commonly fail Riverside County inspections?",a:"Temperature control failures, missing food handler cards, pest control gaps, sanitation deficiencies, and HACCP compliance issues are most frequently cited."}],metaTitle:"Riverside County Restaurant Compliance | EvidLY",metaDesc:"Only an 'A' passes in Riverside County. Understand the strictest grading standard in Southern California and stay inspection-ready with EvidLY.",keywords:"Riverside County restaurant inspection, Riverside County health inspection grade, commercial kitchen compliance Riverside County California",h1:"Riverside County Commercial Kitchen Compliance",heroSub:"Riverside County only accepts an 'A'. Anything lower is a failure. Know where you stand every single day.",filta:false},
  sacramento:{name:"Sacramento",slug:"sacramento-county",agency:"Sacramento County Environmental Management Department",agencyShort:"Sacramento EMD",phone:"(916) 875-8440",method:"count",weights:{c:1,m:1,n:0},threshold:"4+ majors = Red placard",grade:"Color placard — Green / Yellow / Red",freq:"1–3x per year",inspectors:38,facilities:8500,closures:62,transparency:"MEDIUM",topViolations:["Major violation accumulation","Temperature logs","Food handling","Equipment maintenance","Pest prevention"],faq:[{q:"How does Sacramento County grade restaurant inspections?",a:"Sacramento County uses a color placard system. Green means passed, Yellow means violations found but not closure-level, Red means 4 or more major violations — the facility is closed."},{q:"What triggers a Red placard in Sacramento County?",a:"Four or more major violations during a single inspection results in a Red placard and immediate closure until a re-inspection is passed."},{q:"Are Sacramento County inspection results posted publicly?",a:"Sacramento County placard results are posted at the establishment. Detailed reports are available through the Environmental Management Department."},{q:"How often does Sacramento County inspect commercial kitchens?",a:"Sacramento County inspects restaurants 1–3 times per year based on risk classification. Prior Yellow or Red placards increase frequency."},{q:"What violations most commonly result in Yellow or Red placards?",a:"Accumulation of major violations, temperature log gaps, improper food handling, equipment maintenance failures, and pest prevention deficiencies are most frequently cited."}],metaTitle:"Sacramento County Restaurant Compliance | EvidLY",metaDesc:"Sacramento County's color placard system is visible to every customer. Understand Green, Yellow, and Red — and keep your kitchen in the Green with EvidLY.",keywords:"Sacramento County restaurant inspection, Sacramento County health inspection placard, commercial kitchen compliance Sacramento California",h1:"Sacramento County Commercial Kitchen Compliance",heroSub:"Sacramento County's Green, Yellow, and Red placards are visible to every customer who walks in. Stay Green.",filta:false},
  "san-joaquin":{name:"San Joaquin",slug:"san-joaquin-county",agency:"San Joaquin County Public Health Services — Environmental Health",agencyShort:"San Joaquin County PH",phone:"(209) 468-3420",method:"reinspect",weights:{c:0,m:0,n:0},threshold:"Uncorrected = Reinspection",grade:"CalCode standard — report based",freq:"1–2x per year",inspectors:12,facilities:3000,closures:18,transparency:"MEDIUM",topViolations:["Temperature abuse","Receiving log gaps","HACCP documentation","Hood cleaning currency","Food handler compliance"],faq:[{q:"How does San Joaquin County conduct restaurant inspections?",a:"San Joaquin County follows the CalCode standard pass/fail model. Uncorrected violations trigger a reinspection. There is no public numeric score — results are report-based."},{q:"How often does San Joaquin County inspect restaurants?",a:"Most San Joaquin County commercial kitchens are inspected 1–2 times per year. Risk tier and complaint history influence frequency in Stockton and surrounding cities."},{q:"What happens after a San Joaquin County reinspection is triggered?",a:"A reinspection is typically scheduled within 14–30 days of the original inspection. Failure to correct violations during reinspection can lead to permit suspension."},{q:"Does San Joaquin County publish inspection reports online?",a:"San Joaquin County maintains inspection records through the Public Health Services department. Transparency is rated medium compared to higher-disclosure counties like Merced."},{q:"What are the most common violations in San Joaquin County kitchens?",a:"Temperature abuse, missing receiving logs, incomplete HACCP documentation, overdue hood cleaning certificates, and food handler card compliance gaps are most frequently cited."}],metaTitle:"San Joaquin County Restaurant Compliance | EvidLY",metaDesc:"San Joaquin County follows CalCode standard enforcement. Understand what Stockton-area inspectors look for and stay compliant with EvidLY.",keywords:"San Joaquin County restaurant inspection, Stockton restaurant health inspection, commercial kitchen compliance San Joaquin County California",h1:"San Joaquin County Commercial Kitchen Compliance",heroSub:"San Joaquin County follows CalCode standard enforcement. Know exactly what inspectors are looking for in Stockton and across the county.",filta:true},
  "san-diego":{name:"San Diego",slug:"san-diego-county",agency:"San Diego County Department of Environmental Health — Food and Housing Division",agencyShort:"San Diego County DEH",phone:"(858) 694-2711",method:"deduction",weights:{c:4,m:2,n:1},threshold:"Below 70 = Fail",grade:"Letter grade A / B / C posted publicly",freq:"1–3x per year",inspectors:65,facilities:14000,closures:97,transparency:"HIGH",topViolations:["Temperature control","Food handler compliance","Pest evidence","Sanitation practices","HACCP gaps"],faq:[{q:"How does San Diego County grade restaurant inspections?",a:"San Diego County uses a 100-point deduction system with letter grades. Critical violations deduct 4 points, major 2 points, minor 1 point. Scores below 70 result in closure."},{q:"Are San Diego County inspection grades posted publicly?",a:"Yes. San Diego County requires letter grades to be displayed prominently and publishes full inspection reports online through the county health department."},{q:"How often does San Diego County inspect restaurants?",a:"San Diego County inspects restaurants 1–3 times per year based on risk classification. Facilities with prior violations or complaints receive more frequent inspections."},{q:"What triggers a re-inspection in San Diego County?",a:"Any score below 70, uncorrected critical violations, or a complaint investigation triggers a follow-up inspection, typically within 14–30 days."},{q:"What violations are most common in San Diego County kitchens?",a:"Temperature control failures, food handler card compliance gaps, pest evidence, sanitation deficiencies, and HACCP documentation gaps are most frequently cited."}],metaTitle:"San Diego County Restaurant Compliance | EvidLY",metaDesc:"Understand how San Diego County grades 14,000+ food facilities. Keep your kitchen inspection-ready with EvidLY's county-specific compliance platform.",keywords:"San Diego County restaurant inspection, San Diego health inspection grade, commercial kitchen compliance San Diego California",h1:"San Diego County Commercial Kitchen Compliance",heroSub:"San Diego County publishes every grade publicly. Know your score before 14,000 other kitchens see theirs posted.",filta:false},
};

const DEFAULT_COUNTY="merced";
const FILTA_COUNTIES=["merced","fresno","stanislaus","san-joaquin","mariposa","madera"];

// ═══ VIOLATIONS + JURISDICTIONS (slider) ═══
var ALL_V=[{id:1,t:"Hair restraint",sv:"minor",c:1},{id:2,t:"Goods on floor",sv:"minor",c:1},{id:3,t:"Sanitizer low",sv:"minor",c:1},{id:4,t:"Ceiling damaged",sv:"minor",c:0},{id:5,t:"Wiping cloths",sv:"minor",c:0},{id:6,t:"Gap under door",sv:"minor",c:0},{id:7,t:"Grease on hoods",sv:"minor",c:0},{id:8,t:"Restroom supplies",sv:"minor",c:0},{id:9,t:"Cross-contamination",sv:"major",c:1},{id:10,t:"Walk-in 46°F",sv:"major",c:0},{id:11,t:"Freezer log gap",sv:"major",c:0},{id:12,t:"Storage order",sv:"major",c:0},{id:13,t:"Receiving missing",sv:"major",c:0},{id:14,t:"Cooling violation",sv:"major",c:0},{id:15,t:"Hot hold <135°F",sv:"critical",c:0},{id:16,t:"No handwashing",sv:"critical",c:0},{id:17,t:"Ill employee",sv:"critical",c:0},{id:18,t:"No HACCP plan",sv:"critical",c:0},{id:19,t:"CCP not monitored",sv:"critical",c:0},{id:20,t:"No checklists",sv:"critical",c:0}];
var JR=[{id:"fresno",co:"Fresno",ag:"Fresno County DPH",m:"reinspect",w:{c:0,m:0,n:0},h:"No points. Majors corrected on-site?",f:"Uncorrected major = Reinspection"},{id:"kern",co:"Kern",ag:"Kern County PHS",m:"deduction",w:{c:5,m:3,n:1},h:"100-point deduction. Criticals=5, majors=3.",f:"Below 75 = Closure"},{id:"la",co:"Los Angeles",ag:"LA County DPH",m:"deduction",w:{c:4,m:2,n:1},h:"Start at 100. Subtract per violation.",f:"Below 70 = Fail"},{id:"merced",co:"Merced",ag:"Merced County DPH",m:"accumulate",w:{c:4,m:2,n:2},h:"Points from zero. Minors=2.",f:"14+ = Unsatisfactory"},{id:"riverside",co:"Riverside",ag:"Riverside County EH",m:"deduction",w:{c:4,m:2,n:1},h:"Same as LA. Only A passes.",f:"Below 90 = Fail"},{id:"sacramento",co:"Sacramento",ag:"Sacramento EMD",m:"count",w:{c:1,m:1,n:0},h:"Counts majors. Color placard.",f:"4+ majors = Red"},{id:"sanjoaquin",co:"San Joaquin",ag:"San Joaquin PH",m:"reinspect",w:{c:0,m:0,n:0},h:"CalCode standard. Stockton.",f:"Uncorrected = Reinspection"},{id:"yosemite",co:"Yosemite (NPS)",ag:"NPS + Mariposa",m:"reinspect",w:{c:0,m:0,n:0},h:"DUAL: NPS FDA 2022 + Mariposa.",f:"Reinspection from BOTH"}];
function grd(j,sc,mj,pt,un){if(j.m==="reinspect")return un===0?{d:mj>0?"Pass ("+mj+" corrected)":"Pass",p:"pass"}:{d:"Reinspection Required",p:"fail"};if(j.m==="count")return mj<=1?{d:"Green",p:"pass"}:mj<=3?{d:"Yellow",p:"warn"}:{d:"Red",p:"fail"};if(j.m==="accumulate")return pt<=6?{d:"Good - "+pt+" pts",p:"pass"}:pt<=13?{d:"Satisfactory - "+pt+" pts",p:"warn"}:{d:"Unsatisfactory - "+pt+" pts",p:"fail"};if(j.id==="kern")return sc<75?{d:"CLOSED",p:"fail"}:{d:(sc>=90?"A":sc>=80?"B":"C")+" - "+sc,p:sc>=90?"pass":"warn"};if(j.id==="riverside")return{d:sc>=90?"A - PASS":(sc>=80?"B":sc>=70?"C":"F")+" - FAIL",p:sc>=90?"pass":"fail"};var g=sc>=90?"A":sc>=80?"B":sc>=70?"C":"F";return{d:g+" - "+sc,p:sc>=70?"pass":"fail"};}
function calc(j,vs){var dd=0,pt=0,mj=0,un=0;for(var i=0;i<vs.length;i++){var v=vs[i],p=v.sv==="critical"?j.w.c:v.sv==="major"?j.w.m:j.w.n;if(j.m==="accumulate")pt+=p;else if(j.m!=="reinspect"&&j.m!=="count")dd+=p;if(v.sv==="critical"||v.sv==="major"){mj++;if(!v.c)un++;}}var sc=(j.m==="reinspect"||j.m==="count")?null:Math.max(0,100-dd);var g=grd(j,sc,mj,pt,un);return{d:g.d,p:g.p};}
var STS={pass:{bg:E.grnBg,bd:E.grn,tx:"#065f46",lb:"PASS"},fail:{bg:E.redBg,bd:E.red,tx:"#991b1b",lb:"FAIL"},warn:{bg:E.wrnBg,bd:E.wrn,tx:"#92400e",lb:"WARNING"}};

// ═══ KITCHEN SELF CHECK ═══
var KC_ITEMS=[{q:"Do you have a written HACCP plan on file?",risk:"critical",why:"§114015 requires it. Most kitchens don't have one."},{q:"Are your food handler cards current for all staff?",risk:"high",why:"§113948. Within 30 days of hire, renewed every 3 years."},{q:"Is your last hood cleaning certificate posted or on file?",risk:"critical",why:"NFPA 96 Table 12.4. Frequency depends on cooking volume."},{q:"Do you have a Certified Food Protection Manager on staff?",risk:"critical",why:"§113947.1. At least one CFPM required at all times."},{q:"Are you logging temperatures at least twice per shift?",risk:"high",why:"§113996. Walk-in, hot holding, cold holding — all required."},{q:"Is your fire suppression system current on semi-annual service?",risk:"critical",why:"NFPA 17A. Semi-annual inspection and service required."},{q:"Are receiving temperatures being logged at delivery?",risk:"high",why:"§113980. Required for poultry, beef, seafood, dairy."},{q:"Do you have documentation of the last pest control visit?",risk:"medium",why:"§114259. Effective pest prevention documentation required."}];

// ═══ DAY WALKTHROUGH ═══
var WK=[{ic:"🌅",t:"Opening Checklist",su:"Start the day with the full picture",tx:"Sanitizer concentration, handwashing stations, employee health, pest evidence, prep surfaces — each maps to a CalCode condition. Two minutes and you know everything's good.",n:"CalCode doesn't require a checklist. It requires these conditions to be met. Your morning check confirms they are.",a:"§113953, §113967, §113980"},{ic:"📦",t:"Receiving Temperatures",su:"Know what came in and whether it's right",tx:"Poultry ≤41°F, frozen ≤0°F. Out-of-range? Reject, document, and track that vendor's history over time.",n:"Three missed receiving logs is one of the most common issues found. EvidLY lets you know when a delivery hasn't been logged.",a:"§113980"},{ic:"🌡️",t:"Temperature Monitoring",su:"Equipment, holding, cooling — clear picture",tx:"Walk-in coolers, freezers, hot holding, cold holding, cooling events. Cooling tracked 135→70→41°F with timestamps.",n:"A walk-in at 46°F with no readings since 6am? You'll know right away — not when someone else finds it.",a:"§113996, §114002"},{ic:"🌙",t:"Closing Checklist",su:"End the day with everything accounted for",tx:"Final cooler/freezer logs, storage order, cooling completed to 41°F, surfaces sanitized, drains cleared, doors sealed.",n:"The 3-day weekend gap starts with a Friday close that didn't get done. This makes sure it does.",a:"§113996, §114002, §114049"},{ic:"📋",t:"HACCP Documentation",su:"Auto-built from everything above",tx:"CalCode §114015–114016 requires written HACCP plans and CCP monitoring logs. Most kitchens don't have them.",n:"Every temp logged in Steps 1–4 already populated your CCP logs. Receiving→CCP-04. Equipment→CCP-01&02. Cooling→CCP-03. It's already done.",a:"§114015, §114016"},{ic:"🎓",t:"Training & Certificates",su:"Food Handler Cards, ServSafe, all tracked",tx:"CalCode requires a Food Handler Card within 30 days of hire (§113948) and at least one Certified Food Protection Manager (§113947.1).",n:"Someone asks 'show me your food handler cards.' One tap. Every cert, expiration, and training history.",a:"§113947.1, §113948"}];

// ═══ COMPETITOR BLOCKING ═══
var BD=["jolt.com","joltup.com","safetyculture.com","safetyculture.io","fooddocs.com","fooddocs.io","zenput.com","crunchtime.com","bluecart.com","marketman.com","restaurant365.com","toast.com","toasttab.com"];
var BC=["jolt","safety culture","safetyculture","fooddocs","zenput","crunchtime","bluecart","marketman","toast pos","toasttab"];
function isBl(e,c){var d=(e||"").split("@")[1]||"";d=d.toLowerCase();var l=(c||"").toLowerCase();for(var i=0;i<BD.length;i++)if(d===BD[i]||d.endsWith("."+BD[i]))return 1;for(var i=0;i<BC.length;i++)if(l.indexOf(BC[i])>=0)return 1;return 0;}

var CA_COUNTIES=["Alameda","Alpine","Amador","Butte","Calaveras","Colusa","Contra Costa","Del Norte","El Dorado","Fresno","Glenn","Humboldt","Imperial","Inyo","Kern","Kings","Lake","Lassen","Los Angeles","Madera","Marin","Mariposa","Mendocino","Merced","Modoc","Mono","Monterey","Napa","Nevada","Orange","Placer","Plumas","Riverside","Sacramento","San Benito","San Bernardino","San Diego","San Francisco","San Joaquin","San Luis Obispo","San Mateo","Santa Barbara","Santa Clara","Santa Cruz","Shasta","Sierra","Siskiyou","Solano","Sonoma","Stanislaus","Sutter","Tehama","Trinity","Tulare","Tuolumne","Ventura","Yolo","Yuba"];

var MD={signup:{ic:"🚀",t:"Get Started with EvidLY",s:"Lock in your Founder spot at $99/mo — yours forever.",b:"Reserve My Spot →",c:"gold",subj:"Founder Signup"},schedule:{ic:"📅",t:"Request an Overview",s:"45 min. We'll answer your questions. No pressure.",b:"Pick a Time →",c:"gold",subj:"Overview Request"},sales:{ic:"🏢",t:"Multi-Location Inquiry",s:"11+ locations. Let's build something custom.",b:"Start the Conversation →",c:"navy",subj:"Enterprise Inquiry",msg:1},chat:{ic:"💬",t:"Send a Message",s:"We'll get back to you within a few hours.",b:"Send →",c:"gold",subj:"Chat Message",msg:1},signin:{ic:"🔑",t:"Sign In",s:"EvidLY launches May 5, 2026.",si:1}};

// ═══ COMPONENTS ═══
function Logo({s="1.2rem",light=false,tagline=false}){var vc=light?E.w:E.navy;var tc=light?"rgba(255,255,255,0.55)":"rgba(37,57,107,0.6)";return(<span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:2,lineHeight:1}}><span style={{fontWeight:800,fontSize:s,letterSpacing:-0.5,fontFamily:ff,lineHeight:1}}><span style={{color:E.gold}}>E</span><span style={{color:vc}}>vid</span><span style={{color:E.gold}}>LY</span></span>{tagline&&<span style={{fontSize:"calc("+s+" * 0.3)",fontWeight:700,letterSpacing:"0.2em",color:tc,textTransform:"uppercase",lineHeight:1,fontFamily:ff,whiteSpace:"nowrap"}}>Lead with Confidence</span>}</span>);}
function STIcon({sz=30}){return(<div style={{width:sz,height:sz,background:S.grn,borderRadius:sz*0.2,display:"inline-flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:sz*0.34,fontWeight:900,color:E.w,letterSpacing:-0.5,lineHeight:1,marginBottom:sz*0.06}}>ST</span><div style={{display:"flex",gap:1.5,alignItems:"flex-end"}}>{[5,8,11,7,10].map(function(h,i){return <div key={i} style={{width:sz*0.055,height:h*(sz/72),background:"rgba(255,255,255,"+(0.25+i*0.12)+")",borderRadius:1}}/>;})}</div></div>);}
function STLogo({s="1.2rem",light=false}){return <span style={{fontWeight:800,fontSize:s,fontFamily:ff}}><span style={{color:S.grn}}>Score</span><span style={{color:light?E.w:S.charD}}>Table</span></span>;}
function SL({t,c}){return <div style={{fontSize:"0.68rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:c||E.gold,marginBottom:10}}>{t}</div>;}
function TBadge({level}){var m={HIGH:{bg:E.grnBg,bd:E.grn,tx:"#065f46"},MEDIUM:{bg:E.wrnBg,bd:E.wrn,tx:"#92400e"},LOW:{bg:E.redBg,bd:E.red,tx:"#991b1b"}};var co=m[level]||m.MEDIUM;return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:100,fontSize:"0.64rem",fontWeight:700,background:co.bg,border:"1px solid "+co.bd,color:co.tx,marginLeft:8}}>{level} TRANSPARENCY</span>;}

function SchemaMarkup({c,cityName,citySlug}){var areaName=cityName?cityName+", "+c.name+" County, California":c.name+" County, California";var pageUrl=citySlug?"https://getevidly.com/city/"+citySlug:"https://getevidly.com/"+c.slug;var schema={"@context":"https://schema.org","@graph":[{"@type":"SoftwareApplication","name":"EvidLY","applicationCategory":"BusinessApplication","operatingSystem":"Web","description":"Commercial kitchen compliance platform for "+areaName,"url":pageUrl,"offers":{"@type":"Offer","price":"99","priceCurrency":"USD"}},{"@type":"FAQPage","mainEntity":c.faq.map(function(f){return{"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}};})},{"@type":"LocalBusiness","name":"EvidLY","description":"Commercial kitchen compliance software","url":"https://getevidly.com","telephone":"(855) 384-3591","areaServed":{"@type":"State","name":"California"}}]};return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>; // Safe: static JSON-LD
}

// ═══ MAIN ═══
export default function CountyLandingPage({county: countyProp, cityName: _cn, citySlug: _cs}){
  var { slug } = useParams();
  // URL is /merced-county → slug="merced-county" → key="merced"
  var countyKey = countyProp || (slug ? slug.replace(/-county$/, "") : DEFAULT_COUNTY);
  var c=COUNTY_DATA[countyKey]||COUNTY_DATA[DEFAULT_COUNTY];

  var [modal,setModal]=useState(null);
  var [mf,setMf]=useState({first:"",last:"",email:"",phone:"",company:"",locations:"1",msg:""});
  var [mDone,setMDone]=useState(false);
  var [step,setStep]=useState(0);
  var [lead,setLead]=useState({name:"",email:"",phone:"",company:"",county:c.name});
  var [slider,setSlider]=useState(8);
  var [stName,setStName]=useState("");
  var [stEmail,setStEmail]=useState("");
  var [stPhone,setStPhone]=useState("");
  var [stBiz,setStBiz]=useState("");
  var [stCounty,setStCounty]=useState(c.name);
  var [stDone,setStDone]=useState(false);
  var [cookie,setCookie]=useState(true);
  var [kcAnswers,setKcAnswers]=useState({});
  var [kcDone,setKcDone]=useState(false);
  var [kcUnlocked,setKcUnlocked]=useState(false);
  var [kcName,setKcName]=useState("");
  var [kcPhone,setKcPhone]=useState("");
  var [kcBiz,setKcBiz]=useState("");
  var [kcEmail,setKcEmail]=useState("");
  var [faqOpen,setFaqOpen]=useState(null);

  var av=ALL_V.slice(0,slider);
  var res=JR.map(function(j){return Object.assign({j:j},calc(j,av));});
  var blk=isBl(lead.email,lead.company);
  var lok=lead.name&&lead.email&&lead.phone&&lead.company&&!blk;
  var stReady=stName&&stEmail&&stPhone&&stBiz&&stCounty;
  var cur=WK[step];
  var kcGateReady=kcName&&kcPhone&&kcBiz&&kcEmail;
  var kcAnswered=Object.keys(kcAnswers).length;
  var kcCritical=KC_ITEMS.filter(function(item,i){return kcAnswers[i]==="no"&&item.risk==="critical";}).length;
  var kcHigh=KC_ITEMS.filter(function(item,i){return kcAnswers[i]==="no"&&item.risk==="high";}).length;
  var kcAllAnswered=kcAnswered===KC_ITEMS.length;

  var heroGrad="linear-gradient(160deg,"+E.navyL+","+E.navyD+")";
  var goldLine={position:"absolute",bottom:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,"+E.gold+",transparent)"};
  var bG={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.gold,color:E.w,fontFamily:ff};
  var bN={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.navy,color:E.w,fontFamily:ff};
  var bO={padding:"11px 22px",border:"2px solid rgba(255,255,255,0.25)",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:"transparent",color:E.w,fontFamily:ff};
  var dinp={width:"100%",padding:"10px 12px",border:"1px solid "+E.g2,borderRadius:8,fontSize:"0.85rem",boxSizing:"border-box",outline:"none",background:E.w,color:E.g8,fontFamily:ff};
  var ginp={width:"100%",padding:"9px 11px",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:"0.85rem",boxSizing:"border-box",outline:"none",background:"rgba(255,255,255,0.1)",color:E.w,fontFamily:ff};
  var lbl={fontSize:"0.72rem",fontWeight:600,color:"rgba(255,255,255,0.45)"};

  function openCalendly(){window.open(CALENDLY,"_blank");}
  function openM(m){if(m==="demo"||m==="schedule"){openCalendly();return;}setModal(m);setMDone(false);setMf({first:"",last:"",email:"",phone:"",company:"",locations:"1",msg:""});}
  function submitM(){if(!mf.first||!mf.email||!mf.phone)return;var m=MD[modal];window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[EvidLY] "+m.subj+" - "+(mf.company||mf.first)+" ("+c.name+" County)")+"&body="+encodeURIComponent("Name: "+mf.first+" "+mf.last+"\nEmail: "+mf.email+"\nPhone: "+mf.phone+"\nCompany: "+mf.company+"\nLocations: "+mf.locations+"\nCounty: "+c.name+(mf.msg?"\nMessage: "+mf.msg:"")),"_blank");setMDone(true);}
  function submitLead(){if(!lok)return;window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[EvidLY] Demo - "+lead.company+" ("+c.name+" County)")+"&body="+encodeURIComponent("Name: "+lead.name+"\nEmail: "+lead.email+"\nPhone: "+lead.phone+"\nCompany: "+lead.company+"\nCounty: "+lead.county),"_blank");openCalendly();}
  function submitKC(){var gaps=KC_ITEMS.filter(function(item,i){return kcAnswers[i]==="no";}).map(function(item){return "❌ "+item.q+" ("+item.risk+")";}).join("\n");var all=KC_ITEMS.filter(function(item,i){return kcAnswers[i]==="yes";}).map(function(item){return "✅ "+item.q;}).join("\n");window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[EvidLY] Kitchen Self Check - "+kcBiz+" ("+c.name+" County)")+"&body="+encodeURIComponent("Name: "+kcName+"\nEmail: "+kcEmail+"\nPhone: "+kcPhone+"\nBusiness: "+kcBiz+"\nCounty: "+c.name+"\n\nGaps:\n"+gaps+"\n\nPassing:\n"+all),"_blank");setKcDone(true);}
  function submitScoreTable(){if(!stReady)return;window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[ScoreTable] County Inquiry - "+stBiz+" ("+stCounty+")")+"&body="+encodeURIComponent("Name: "+stName+"\nEmail: "+stEmail+"\nPhone: "+stPhone+"\nBusiness: "+stBiz+"\nCounty: "+stCounty),"_blank");setStDone(true);}

  return(
  <div style={{fontFamily:ff,color:E.g8,lineHeight:1.6,background:E.cream,minHeight:"100vh"}}>
  <style>{`button{all:unset;box-sizing:border-box;cursor:pointer;} button:disabled{cursor:not-allowed;}`}</style>
  {/* NOTE: In Next.js add to <Head>:
    <title>{c.metaTitle}</title>
    <meta name="description" content={c.metaDesc}/>
    <meta name="keywords" content={c.keywords}/>
    <link rel="canonical" href={"https://getevidly.com/"+c.slug}/>
    <meta property="og:title" content={c.metaTitle}/>
    <meta property="og:description" content={c.metaDesc}/>
    <meta property="og:url" content={"https://getevidly.com/"+c.slug}/>
    <meta property="og:type" content="website"/>
    <meta name="twitter:card" content="summary_large_image"/>
  */}

  {/* COOKIE */}
  {cookie&&<div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:E.w,borderTop:"1px solid "+E.g2,padding:"14px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 -2px 10px rgba(0,0,0,0.06)"}}>
    <p style={{flex:1,fontSize:"0.8rem",color:E.g6,margin:0,minWidth:200}}>We use cookies to enhance your experience. <a href="/privacy" style={{color:E.navy}}>Cookie Policy</a></p>
    <button onClick={function(){setCookie(false);}} style={{padding:"7px 16px",borderRadius:6,border:"1px solid "+E.g2,background:E.w,fontSize:"0.78rem",fontWeight:600,cursor:"pointer",color:E.g6}}>Settings</button>
    <button onClick={function(){setCookie(false);}} style={{padding:"7px 16px",borderRadius:6,border:"none",background:E.navy,color:E.w,fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}>Accept All</button>
  </div>}

  {/* MODAL */}
  {modal&&<div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={function(){setModal(null);}}>
    <div style={{background:E.w,borderRadius:16,maxWidth:440,width:"100%",position:"relative",maxHeight:"90vh",overflow:"auto"}} onClick={function(e){e.stopPropagation();}}>
      <button onClick={function(){setModal(null);}} style={{position:"absolute",top:12,right:12,background:"none",border:"none",fontSize:20,cursor:"pointer",color:E.g4,zIndex:1}}>&times;</button>
      {mDone?(<div style={{padding:"48px 28px",textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:8}}>✅</div><h3 style={{fontSize:"1.1rem",fontWeight:700,color:E.navy,marginBottom:6}}>You're all set!</h3><p style={{fontSize:"0.85rem",color:E.g5}}>Email client opened with your details. Or reach us at founders@getevidly.com.</p></div>)
      :MD[modal].si?(<div style={{padding:"32px 28px",textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:8}}>{MD[modal].ic}</div><h3 style={{fontWeight:700,color:E.navy,marginBottom:4}}>{MD[modal].t}</h3><p style={{fontSize:"0.85rem",color:E.g5,marginBottom:16}}>{MD[modal].s}</p><div style={{background:E.cream,borderRadius:10,padding:16,marginBottom:16,border:"1px solid "+E.g2}}><p style={{fontSize:"0.85rem",color:E.g6,margin:0}}>Launching May 5, 2026. Reserve your <strong>Founder spot</strong> now.</p></div><button onClick={function(){openM("signup");}} style={Object.assign({},bG,{width:"100%"})}>Reserve My Spot →</button></div>)
      :(<div style={{padding:"28px"}}><div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:"2.2rem",marginBottom:6}}>{MD[modal].ic}</div><h3 style={{fontWeight:700,color:E.navy,marginBottom:4}}>{MD[modal].t}</h3><p style={{fontSize:"0.82rem",color:E.g5}}>{MD[modal].s}</p></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}><div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>First Name *</label><input value={mf.first} onChange={function(e){setMf(Object.assign({},mf,{first:e.target.value}));}} style={dinp} placeholder="Jane"/></div><div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>Last Name</label><input value={mf.last} onChange={function(e){setMf(Object.assign({},mf,{last:e.target.value}));}} style={dinp} placeholder="Kim"/></div></div>
        <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>Email *</label><input value={mf.email} onChange={function(e){setMf(Object.assign({},mf,{email:e.target.value}));}} style={dinp} placeholder="jane@restaurant.com"/></div>
        <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>Phone *</label><input value={mf.phone} onChange={function(e){setMf(Object.assign({},mf,{phone:e.target.value}));}} style={dinp} placeholder="(209) 555-0100"/></div>
        <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>Company</label><input value={mf.company} onChange={function(e){setMf(Object.assign({},mf,{company:e.target.value}));}} style={dinp} placeholder="Pacific Kitchen Group"/></div>
        <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>Locations</label><select value={mf.locations} onChange={function(e){setMf(Object.assign({},mf,{locations:e.target.value}));}} style={dinp}><option>1</option><option>2-5</option><option>6-10</option><option>11+</option></select></div>
        {MD[modal].msg&&<div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>Message</label><textarea value={mf.msg} onChange={function(e){setMf(Object.assign({},mf,{msg:e.target.value}));}} style={Object.assign({},dinp,{minHeight:60,resize:"vertical",fontFamily:"inherit"})} placeholder="Tell us more..."/></div>}
        <button onClick={submitM} style={Object.assign({},MD[modal].c==="navy"?bN:bG,{width:"100%",marginTop:4})}>{MD[modal].b}</button>
        <p style={{fontSize:"0.72rem",color:E.g4,textAlign:"center",marginTop:8}}>Or <a href="mailto:founders@getevidly.com" style={{color:E.gold}}>founders@getevidly.com</a></p>
      </div>)}
    </div>
  </div>}

  {/* CHAT */}
  <div style={{position:"fixed",bottom:cookie?72:24,right:24,zIndex:150}}>
    <button onClick={function(){openM("chat");}} style={{width:52,height:52,borderRadius:"50%",background:E.navy,border:"none",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
  </div>

  {/* HEADER */}
  <header style={{background:E.w,borderBottom:"1px solid "+E.g2,padding:"0 24px",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 6px rgba(0,0,0,0.04)"}}>
    <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",height:56}}>
      <a href="/" style={{textDecoration:"none",marginRight:28}}><Logo s="1.1rem" tagline/></a>
      <nav style={{display:"flex",gap:18,flex:1}}>
        {[["What's Covered","#what-covered"],["Your County","#your-county"],["Kitchen Self Check","#kitchen-self-check"],["Pricing","#pricing"]].map(function(x){return <a key={x[0]} href={x[1]} style={{textDecoration:"none",color:E.g5,fontWeight:500,fontSize:"0.82rem"}}>{x[0]}</a>;})}
      </nav>
      <div style={{display:"flex",gap:8}}>
        <button onClick={openCalendly} style={Object.assign({},bG,{padding:"7px 14px",fontSize:"0.78rem"})}>Book a Demo</button>
        <button onClick={function(){openM("signin");}} style={{padding:"7px 14px",border:"1px solid "+E.g2,borderRadius:8,fontSize:"0.78rem",fontWeight:600,cursor:"pointer",background:E.w,color:E.g6,fontFamily:ff}}>Sign In</button>
        <button onClick={function(){openM("signup");}} style={Object.assign({},bN,{padding:"7px 14px",fontSize:"0.78rem"})}>Get Started</button>
      </div>
    </div>
  </header>

  {/* BREADCRUMB */}
  <div style={{background:E.w,borderBottom:"1px solid "+E.g1,padding:"7px 24px"}}>
    <div style={{maxWidth:1100,margin:"0 auto",fontSize:"0.72rem",color:E.g4}}>
      <a href="/" style={{color:E.g4,textDecoration:"none"}}>EvidLY</a>{" › "}<a href="/california" style={{color:E.g4,textDecoration:"none"}}>California</a>{" › "}{_cn?<><a href={"/"+c.slug} style={{color:E.g4,textDecoration:"none"}}>{c.name} County</a>{" › "}<span style={{color:E.navy,fontWeight:600}}>{_cn}</span></>:<span style={{color:E.navy,fontWeight:600}}>{c.name} County</span>}
    </div>
  </div>

  {/* ═══ HERO ═══ */}
  <section style={{padding:"72px 24px 60px",background:heroGrad,textAlign:"center",position:"relative"}}>
    <div style={goldLine}/>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(184,160,106,0.12)",border:"1px solid rgba(184,160,106,0.25)",borderRadius:100,padding:"5px 14px",marginBottom:20}}>
        <span style={{fontSize:"0.7rem",fontWeight:700,color:E.goldL,textTransform:"uppercase",letterSpacing:1}}>California · {c.name} County{_cn?" · "+_cn:""}</span>
      </div>
      <h1 style={{fontSize:"clamp(1.8rem,5vw,2.8rem)",fontWeight:800,lineHeight:1.1,margin:"0 0 16px",color:E.w}}>{_cn?<>{_cn} <span style={{color:E.gold}}>Kitchen Compliance</span></>:<>Lead with Confidence. <span style={{color:E.gold}}>Know Where You Stand.</span></>}</h1>
      <p style={{fontSize:"1rem",color:"rgba(255,255,255,0.55)",maxWidth:520,margin:"0 auto 8px",lineHeight:1.7}}>{_cn?_cn+" is served by "+c.agencyShort+". "+c.heroSub:c.heroSub}</p>
      <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.4)",maxWidth:520,margin:"0 auto 28px",lineHeight:1.7}}>Food safety and facility safety. One clear picture. Updated every day.</p>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button onClick={openCalendly} style={Object.assign({},bG,{padding:"14px 30px",fontSize:"0.95rem"})}>Book a Demo →</button>
        <button onClick={function(){document.getElementById("kitchen-self-check").scrollIntoView({behavior:"smooth"});}} style={Object.assign({},bO,{padding:"14px 30px",fontSize:"0.95rem"})}>Check My Kitchen Free →</button>
      </div>
      <p style={{marginTop:16,fontSize:"0.78rem",color:"rgba(255,255,255,0.3)"}}>Launching May 5, 2026 · $99/mo founder pricing · Configured for {_cn?_cn+", ":""}{c.name} County</p>
    </div>
  </section>

  {/* ═══ COUNTY SNAPSHOT ═══ */}
  <section style={{padding:"44px 24px",background:E.w,borderBottom:"1px solid "+E.g2}}>
    <div style={{maxWidth:920,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <SL t={c.name+" County Inspection Profile"}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",flexWrap:"wrap",gap:6}}>
          <h2 style={{fontSize:"clamp(0.95rem,2.5vw,1.2rem)",fontWeight:800,color:E.navy,margin:0}}>{c.agency}</h2>
          <TBadge level={c.transparency}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10,marginBottom:16}}>
        {[{label:"Grading Method",val:{deduction:"Point Deduction",accumulate:"Point Accumulation",reinspect:"Pass/Fail + Reinspect",count:"Violation Count"}[c.method]},{label:"Threshold",val:c.threshold},{label:"Grade Posted As",val:c.grade},{label:"Inspection Freq",val:c.freq},...(c.inspectors?[{label:"Inspectors",val:"~"+c.inspectors}]:[]),...(c.facilities?[{label:"Facilities",val:"~"+c.facilities.toLocaleString()}]:[]),...(c.closures?[{label:"Closures Last Year",val:c.closures}]:[])].map(function(item){return(<div key={item.label} style={{background:E.cream,borderRadius:9,padding:"12px",border:"1px solid "+E.g2,textAlign:"center"}}><div style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:3}}>{item.label}</div><div style={{fontSize:"0.82rem",fontWeight:700,color:E.navy,lineHeight:1.3}}>{item.val}</div></div>);})}</div>
      <div style={{background:E.cream,borderRadius:10,padding:"14px 16px",border:"1px solid "+E.g2,marginBottom:10}}>
        <div style={{fontSize:"0.66rem",fontWeight:700,color:E.gold,textTransform:"uppercase",letterSpacing:1,marginBottom:7}}>Top Violations in {c.name} County</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{c.topViolations.map(function(v){return <span key={v} style={{padding:"3px 9px",borderRadius:100,fontSize:"0.72rem",fontWeight:600,background:E.redBg,border:"1px solid "+E.red+"30",color:E.red}}>{v}</span>;})}</div>
      </div>
      <p style={{textAlign:"center",fontSize:"0.78rem",color:E.g5,margin:0}}><a href={"/scoretable/"+c.slug} style={{color:E.navy,fontWeight:600,textDecoration:"none"}}>See full {c.name} County scoring methodology on ScoreTable →</a></p>
    </div>
  </section>

  {/* ═══ WHAT'S COVERED ═══ */}
  <section id="what-covered" style={{padding:"72px 24px",background:E.w}}>
    <div style={{maxWidth:780,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <SL t="What's Covered"/>
        <h2 style={{fontSize:"clamp(1.3rem,4vw,2rem)",fontWeight:800,color:E.navy,margin:"0 0 8px"}}>Food safety and facility safety. One place.</h2>
        <p style={{fontSize:"0.88rem",color:E.g5,maxWidth:520,margin:"0 auto"}}>Most platforms cover one or the other. EvidLY covers both — scored against {c.agencyShort}'s actual methodology.</p>
      </div>
      <div style={{background:E.cream,borderRadius:16,padding:"28px 24px",border:"1px solid "+E.g2}}>
        {["Every temperature accounted for — receiving, holding, cooling, all in one place","Cooling events tracked from start to finish so nothing gets missed","HACCP documentation that builds itself from what you already do every day","Certifications and training records always current, always accessible","Your county's actual grading method applied to your data — so you see what an inspector would see","Run a self-inspection anytime and know exactly where you stand before anyone else walks in","Facility safety records — hoods, suppression, equipment, extinguishers — organized with the right frequencies","Vendor documentation stored, tracked, and flagged before anything expires","One dashboard for everything — no more binders, spreadsheets, or guessing"].map(function(f){return <div key={f} style={{display:"flex",gap:8,fontSize:"0.84rem",color:E.g6,marginBottom:8}}><span style={{color:E.gold,fontWeight:700,flexShrink:0}}>✓</span>{f}</div>;})}
      </div>
    </div>
  </section>

  {/* ═══ YOUR COUNTY SLIDER ═══ */}
  <section id="your-county" style={{padding:"72px 24px",background:E.cream}}>
    <div style={{maxWidth:920,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <SL t="Your County"/>
        <h2 style={{fontSize:"clamp(1.3rem,4vw,2rem)",fontWeight:800,color:E.navy,margin:"0 0 6px"}}>Same kitchen. Different counties. Different answers.</h2>
        <p style={{fontSize:"0.88rem",color:E.g5,maxWidth:560,margin:"0 auto"}}>Drag the slider and see how 8 California jurisdictions evaluate the same set of conditions.</p>
      </div>
      <div style={{marginBottom:24,textAlign:"center"}}>
        <label style={{fontSize:"0.82rem",fontWeight:700,color:E.navy}}>Violations found: {slider} of 20</label>
        <p style={{fontSize:"0.76rem",color:E.g5,margin:"2px 0 8px"}}>{slider===0?"Clean inspection — no violations":(function(){var mn=Math.min(slider,8),mj=Math.min(Math.max(slider-8,0),6),cr=Math.max(slider-14,0);var parts=[];if(mn>0)parts.push(mn+" minor");if(mj>0)parts.push(mj+" major");if(cr>0)parts.push(cr+" critical");return parts.join(", ")+" — watch how each county scores it differently";})()}</p>
        <div style={{maxWidth:400,margin:"0 auto"}}><input type="range" min="0" max="20" value={slider} onChange={function(e){setSlider(+e.target.value);}} style={{width:"100%",accentColor:E.gold}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",maxWidth:400,margin:"4px auto 0",fontSize:"0.68rem",color:E.g4}}><span>Clean</span><span>Minor</span><span style={{color:E.wrn}}>Major</span><span style={{color:E.red}}>Critical</span></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
        {res.map(function(r){var st=STS[r.p];return(<div key={r.j.id} style={{borderRadius:12,border:"2px solid "+st.bd,overflow:"hidden",background:E.w}}><div style={{padding:"10px 14px",background:st.bg}}><span style={{fontWeight:800,fontSize:"0.82rem",color:st.tx}}>{r.j.co}</span><span style={{float:"right",fontSize:"0.68rem",fontWeight:700,color:st.tx,textTransform:"uppercase"}}>{st.lb}</span></div><div style={{padding:"12px 14px"}}><div style={{fontSize:"1.1rem",fontWeight:800,color:E.navy,marginBottom:4}}>{r.d}</div><div style={{fontSize:"0.72rem",color:E.g5}}>{r.j.ag}</div><div style={{fontSize:"0.72rem",color:E.g4,marginTop:4,fontStyle:"italic"}}>{r.j.h}</div></div></div>);})}
      </div>
      <p style={{textAlign:"center",fontSize:"0.82rem",color:E.g5,marginTop:20}}>This is why county matters. EvidLY knows the difference.</p>
    </div>
  </section>

  {/* ═══ KITCHEN SELF CHECK ═══ */}
  <section id="kitchen-self-check" style={{padding:"72px 24px",background:E.w}}>
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <SL t="Kitchen Self Check"/>
        <h2 style={{fontSize:"clamp(1.3rem,4vw,2rem)",fontWeight:800,color:E.navy,margin:"0 0 8px"}}>8 questions. Know where you stand right now.</h2>
        <p style={{fontSize:"0.88rem",color:E.g5,maxWidth:500,margin:"0 auto"}}>Free. Calibrated for {c.name} County inspection standards. Results sent to your inbox.</p>
      </div>

      {/* STEP 1: GATE — contact info before checklist unlocks */}
      {!kcUnlocked&&!kcDone&&(
      <div style={{background:E.cream,borderRadius:16,border:"1px solid "+E.g2,overflow:"hidden"}}>
        <div style={{padding:"24px 24px 8px",borderBottom:"1px solid "+E.g2,background:E.w}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:E.navy,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:"0.75rem",fontWeight:800,color:E.w}}>1</span></div>
            <div><div style={{fontSize:"0.82rem",fontWeight:700,color:E.navy}}>Where should we send your results?</div><div style={{fontSize:"0.72rem",color:E.g5}}>We'll email you a full breakdown with code references for every gap we find.</div></div>
          </div>
        </div>
        <div style={{padding:"20px 24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Your Name *</label><input value={kcName} onChange={function(e){setKcName(e.target.value);}} style={dinp} placeholder="Jane Kim"/></div>
            <div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Phone *</label><input value={kcPhone} onChange={function(e){setKcPhone(e.target.value);}} style={dinp} placeholder="(209) 555-0100"/></div>
          </div>
          <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Business Name *</label><input value={kcBiz} onChange={function(e){setKcBiz(e.target.value);}} style={dinp} placeholder="Pacific Kitchen"/></div>
          <div style={{marginBottom:16}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Email *</label><input value={kcEmail} onChange={function(e){setKcEmail(e.target.value);}} style={dinp} placeholder="jane@restaurant.com"/></div>
          {/* Preview of what's coming */}
          <div style={{background:E.cream,borderRadius:10,padding:"12px 14px",border:"1px solid "+E.g2,marginBottom:16}}>
            <div style={{fontSize:"0.68rem",fontWeight:700,color:E.gold,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>You'll answer 8 questions about</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {["HACCP Plan","Food Handler Cards","Hood Cleaning Certificate","CFPM on Staff","Temp Logging","Fire Suppression","Receiving Temps","Pest Control"].map(function(tag){return <span key={tag} style={{padding:"2px 8px",borderRadius:100,fontSize:"0.7rem",fontWeight:600,background:E.bluePale,color:E.navy}}>{tag}</span>;})}
            </div>
          </div>
          <button disabled={!kcGateReady} onClick={function(){setKcUnlocked(true);}} style={Object.assign({},bN,{width:"100%",opacity:kcGateReady?1:0.4,fontSize:"0.9rem",padding:"12px"})}>Start My Check →</button>
          <p style={{textAlign:"center",fontSize:"0.72rem",color:E.g4,marginTop:8}}>Takes 2 minutes. Results sent to {kcEmail||"your inbox"}.</p>
        </div>
        {/* Blurred preview of checklist behind gate */}
        <div style={{position:"relative",overflow:"hidden"}}>
          <div style={{padding:"16px 24px 8px",borderTop:"1px solid "+E.g2,filter:"blur(4px)",pointerEvents:"none",userSelect:"none",opacity:0.5}}>
            {KC_ITEMS.slice(0,3).map(function(item,i){var riskColor=item.risk==="critical"?E.red:item.risk==="high"?E.orn:E.wrn;return(<div key={i} style={{marginBottom:10,padding:"12px 14px",borderRadius:10,border:"1px solid "+E.g2,background:E.w,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div style={{flex:1}}><span style={{fontSize:"0.82rem",fontWeight:600,color:E.g8}}>{item.q}</span><span style={{display:"inline-block",marginLeft:8,padding:"1px 7px",borderRadius:100,background:riskColor+"20",color:riskColor,fontSize:"0.63rem",fontWeight:700,textTransform:"uppercase"}}>{item.risk}</span></div><div style={{display:"flex",gap:6}}><span style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+E.g2,background:E.w,color:E.g5,fontWeight:700,fontSize:"0.75rem"}}>Yes</span><span style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+E.g2,background:E.w,color:E.g5,fontWeight:700,fontSize:"0.75rem"}}>No</span></div></div>);})}
          </div>
          <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(250,248,244,0.95))"}}><div style={{textAlign:"center",padding:"12px 20px",background:E.w,borderRadius:12,border:"1px solid "+E.g2,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}><div style={{fontSize:"1.2rem",marginBottom:4}}>🔒</div><p style={{fontSize:"0.8rem",fontWeight:700,color:E.navy,margin:0}}>Enter your info above to unlock</p></div></div>
        </div>
      </div>
      )}

      {/* STEP 2: CHECKLIST — unlocked after gate */}
      {kcUnlocked&&!kcDone&&(
      <div style={{background:E.cream,borderRadius:16,border:"1px solid "+E.g2,overflow:"hidden"}}>
        <div style={{padding:"14px 24px",borderBottom:"1px solid "+E.g2,background:E.w,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:E.gold,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:"0.75rem",fontWeight:800,color:E.w}}>2</span></div>
            <div><div style={{fontSize:"0.82rem",fontWeight:700,color:E.navy}}>Answer 8 questions honestly</div><div style={{fontSize:"0.72rem",color:E.g5}}>Calibrated for {c.name} County · Results go to {kcEmail}</div></div>
          </div>
          <div style={{fontSize:"0.72rem",fontWeight:700,color:E.g5}}>{kcAnswered}/8 answered</div>
        </div>
        {/* Progress bar */}
        <div style={{height:3,background:E.g2}}><div style={{height:"100%",background:E.gold,width:(kcAnswered/KC_ITEMS.length*100)+"%",transition:"width 0.3s"}}/></div>
        <div style={{padding:"16px 24px"}}>
          {KC_ITEMS.map(function(item,i){var ans=kcAnswers[i];var riskColor=item.risk==="critical"?E.red:item.risk==="high"?E.orn:E.wrn;return(<div key={i} style={{marginBottom:10,padding:"14px 16px",borderRadius:10,border:"1px solid "+(ans==="no"?riskColor:ans==="yes"?E.grn:E.g2),background:ans==="no"?E.redBg:ans==="yes"?E.grnBg:E.w,transition:"all 0.2s"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:ans==="no"?6:0}}><div style={{flex:1}}><span style={{fontSize:"0.82rem",fontWeight:600,color:E.g8,lineHeight:1.5}}>{item.q}</span><span style={{display:"inline-block",marginLeft:8,padding:"1px 7px",borderRadius:100,background:riskColor+"20",color:riskColor,fontSize:"0.63rem",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,verticalAlign:"middle"}}>{item.risk}</span></div><div style={{display:"flex",gap:6,flexShrink:0}}><button onClick={function(){setKcAnswers(Object.assign({},kcAnswers,{[i]:"yes"}));}} style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+(ans==="yes"?E.grn:E.g2),background:ans==="yes"?E.grn:E.w,color:ans==="yes"?E.w:E.g5,fontWeight:700,fontSize:"0.75rem",cursor:"pointer"}}>Yes</button><button onClick={function(){setKcAnswers(Object.assign({},kcAnswers,{[i]:"no"}));}} style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+(ans==="no"?E.red:E.g2),background:ans==="no"?E.red:E.w,color:ans==="no"?E.w:E.g5,fontWeight:700,fontSize:"0.75rem",cursor:"pointer"}}>No</button></div></div>{ans==="no"&&<div style={{fontSize:"0.75rem",color:riskColor,fontStyle:"italic"}}>{item.why}</div>}</div>);})}
          {/* Running score */}
          {kcAnswered>=4&&<div style={{background:kcCritical>0?E.redBg:kcHigh>0?E.wrnBg:E.grnBg,border:"1px solid "+(kcCritical>0?E.red:kcHigh>0?E.wrn:E.grn),borderRadius:12,padding:"12px 14px",marginBottom:12,textAlign:"center"}}>
            <div style={{fontSize:"1rem",fontWeight:800,color:kcCritical>0?E.red:kcHigh>0?"#92400e":S.grn,marginBottom:2}}>{kcCritical>0?kcCritical+" Critical Gap"+(kcCritical>1?"s":"")+" Found":kcHigh>0?kcHigh+" High-Risk Gap"+(kcHigh>1?"s":"")+" Found":"Looking Good So Far"}</div>
            <div style={{fontSize:"0.76rem",color:E.g5}}>{kcCritical>0?"These are inspection failure risks in "+c.name+" County.":kcHigh>0?"Should be corrected before your next inspection.":"Keep going."}</div>
          </div>}
          {/* Submit once all answered */}
          {kcAllAnswered&&<div style={{borderTop:"1px solid "+E.g2,paddingTop:16,marginTop:4,textAlign:"center"}}>
            <p style={{fontSize:"0.84rem",color:E.g6,marginBottom:12}}>All done. We'll send your full results with CalCode references to <strong>{kcEmail}</strong>.</p>
            <button onClick={submitKC} style={Object.assign({},bN,{padding:"12px 28px",fontSize:"0.9rem"})}>Send My Results →</button>
          </div>}
        </div>
      </div>
      )}

      {/* STEP 3: DONE */}
      {kcDone&&(
        <div style={{background:E.grnBg,border:"1px solid "+E.grn,borderRadius:16,padding:"40px 24px",textAlign:"center"}}>
          <div style={{fontSize:"2rem",marginBottom:8}}>✅</div>
          <h3 style={{fontWeight:700,color:S.grn,marginBottom:4}}>Results on the way, {kcName}.</h3>
          <p style={{fontSize:"0.86rem",color:E.g5,marginBottom:8}}>Check <strong>{kcEmail}</strong> for a breakdown of your {c.name} County gaps and what to fix first.</p>
          <p style={{fontSize:"0.82rem",color:E.g5,marginBottom:20}}>{kcCritical>0?"You have "+kcCritical+" critical gap"+(kcCritical>1?"s":"")+" that need attention before your next inspection.":"Good baseline — a demo will show you how EvidLY keeps it that way."}</p>
          <button onClick={openCalendly} style={Object.assign({},bN,{padding:"12px 24px"})}>Book a 45-Min Demo →</button>
        </div>
      )}
    </div>
  </section>

  {/* ═══ SCHEDULE A DEMO ═══ */}
  <section id="schedule" style={{padding:"64px 24px",background:"linear-gradient(160deg,"+E.navyL+","+E.navy+")"}}>
    <div style={{maxWidth:720,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,alignItems:"center"}}>
      <div>
        <SL t="Book a Demo" c={E.goldL}/>
        <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.8rem)",fontWeight:800,color:E.w,margin:"0 0 12px",lineHeight:1.2}}>45 minutes. Your county, your kitchen, your numbers.</h2>
        <p style={{fontSize:"0.86rem",color:"rgba(255,255,255,0.55)",lineHeight:1.7,marginBottom:20}}>We walk through exactly how EvidLY scores your {c.name} County location — live, using {c.agencyShort}'s real methodology. No slides. No sales pitch.</p>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
          {["How "+c.name+" County scores your kitchen specifically","What your live dashboard would look like","Your gaps identified before your next inspection","Every question answered — no pressure"].map(function(item){return <div key={item} style={{display:"flex",gap:8,fontSize:"0.82rem",color:"rgba(255,255,255,0.6)"}}><span style={{color:E.gold,flexShrink:0}}>✓</span>{item}</div>;})}
        </div>
        <button onClick={openCalendly} style={Object.assign({},bG,{padding:"13px 28px",fontSize:"0.9rem"})}>Pick a Time on Calendly →</button>
        <p style={{marginTop:10,fontSize:"0.74rem",color:"rgba(255,255,255,0.28)"}}>Or: founders@getevidly.com</p>
      </div>
      <div style={{background:"rgba(255,255,255,0.06)",borderRadius:16,border:"1px solid rgba(255,255,255,0.1)",padding:"26px 22px"}}>
        <div style={{fontSize:"0.7rem",fontWeight:700,color:E.goldL,textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>What to expect</div>
        {[["0:00","Introductions + your operation","2 min"],["0:02",c.name+" County grading — live","10 min"],["0:12","Your EvidLY dashboard walkthrough","15 min"],["0:27","Gap assessment for your location","10 min"],["0:37","Q&A — anything","8 min"]].map(function(row){return(<div key={row[0]} style={{display:"flex",gap:12,marginBottom:10,paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.07)"}}><span style={{fontSize:"0.7rem",fontWeight:700,color:E.gold,minWidth:30,paddingTop:1}}>{row[0]}</span><div style={{flex:1}}><div style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.75)",fontWeight:600}}>{row[1]}</div><div style={{fontSize:"0.66rem",color:"rgba(255,255,255,0.3)"}}>{row[2]}</div></div></div>);})}
        <div style={{paddingTop:4,fontSize:"0.7rem",color:"rgba(255,255,255,0.25)",textAlign:"center"}}>45 minutes · No commitment</div>
      </div>
    </div>
  </section>

  {/* ═══ DAY WALKTHROUGH ═══ */}
  <section style={{padding:"64px 24px 80px",background:"linear-gradient(160deg,#2a3f6b,"+E.navy+")"}}>
    <div style={{maxWidth:660,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <SL t="A Day With EvidLY" c={E.goldL}/>
        <h2 style={{fontSize:"clamp(1.3rem,3.5vw,1.8rem)",fontWeight:800,color:E.w,margin:"0 0 6px"}}>What a day looks like in <Logo s="clamp(1.1rem,3vw,1.5rem)" light/></h2>
        <p style={{fontSize:"0.84rem",color:"rgba(255,255,255,0.45)"}}>6 steps. Every CalCode reference included.</p>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:20}}>{WK.map(function(w,i){return <div key={i} onClick={function(){setStep(i);}} style={{flex:1,height:4,borderRadius:2,background:i<=step?E.gold:"rgba(255,255,255,0.12)",cursor:"pointer",transition:"background 0.2s"}}/>;})}</div>
      <div style={{background:"rgba(255,255,255,0.05)",borderRadius:16,border:"1px solid rgba(255,255,255,0.1)",overflow:"hidden"}}>
        <div style={{padding:"22px 24px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:"1.5rem"}}>{cur.ic}</div>
          <div><div style={{fontSize:"0.68rem",color:E.goldL,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Step {step+1} of {WK.length}</div><h3 style={{fontSize:"1.05rem",fontWeight:700,color:E.w,margin:0}}>{cur.t}</h3><div style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.45)"}}>{cur.su}</div></div>
        </div>
        <div style={{padding:"20px 24px"}}><p style={{fontSize:"0.86rem",color:"rgba(255,255,255,0.65)",lineHeight:1.7,margin:"0 0 14px"}}>{cur.tx}</p>
          <div style={{background:"rgba(184,160,106,0.1)",borderRadius:10,padding:"14px 16px",borderLeft:"3px solid "+E.gold,marginBottom:14}}><div style={{fontSize:"0.68rem",fontWeight:700,color:E.goldL,marginBottom:4}}>Why this matters</div><p style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.55)",margin:0,lineHeight:1.6}}>{cur.n}</p></div>
          <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.28)"}}>CalCode: {cur.a}</div>
        </div>
        <div style={{padding:"14px 24px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",gap:10}}>
          {step>0&&<button onClick={function(){setStep(step-1);}} style={Object.assign({},bO,{padding:"8px 18px",fontSize:"0.8rem"})}>Back</button>}
          {step<WK.length-1?<button onClick={function(){setStep(step+1);}} style={Object.assign({},bG,{padding:"8px 18px",fontSize:"0.8rem",marginLeft:"auto"})}>Next: {WK[step+1].t} →</button>:<button onClick={openCalendly} style={Object.assign({},bG,{padding:"8px 18px",fontSize:"0.8rem",marginLeft:"auto"})}>Book a Demo →</button>}
        </div>
      </div>
      {step===WK.length-1&&<div style={{marginTop:24,background:"rgba(255,255,255,0.05)",borderRadius:14,border:"1px solid rgba(255,255,255,0.1)",padding:24}}>
        <h3 style={{fontSize:"1rem",fontWeight:700,color:E.w,marginBottom:4}}>Want to see this for {c.name} County?</h3>
        <p style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.45)",marginBottom:16}}>Enter your details and we'll walk you through how it works for your specific location.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={lbl}>Name *</label><input value={lead.name} onChange={function(e){setLead(Object.assign({},lead,{name:e.target.value}));}} style={ginp} placeholder="Jane Kim"/></div>
          <div><label style={lbl}>Phone *</label><input value={lead.phone} onChange={function(e){setLead(Object.assign({},lead,{phone:e.target.value}));}} style={ginp} placeholder="(209) 555-0100"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={lbl}>Email *</label><input value={lead.email} onChange={function(e){setLead(Object.assign({},lead,{email:e.target.value}));}} style={ginp} placeholder="jane@restaurant.com"/></div>
          <div><label style={lbl}>Company *</label><input value={lead.company} onChange={function(e){setLead(Object.assign({},lead,{company:e.target.value}));}} style={ginp} placeholder="Pacific Kitchen"/></div>
        </div>
        <div style={{marginBottom:10}}><label style={lbl}>County</label><input value={lead.county} readOnly style={Object.assign({},ginp,{opacity:0.55})}/></div>
        {blk&&<div style={{background:E.redBg,border:"1px solid "+E.red,borderRadius:8,padding:10,marginBottom:10,fontSize:"0.78rem",color:E.red}}>Competitor domains are not eligible for demo access.</div>}
        <button disabled={!lok} onClick={submitLead} style={Object.assign({},bG,{width:"100%",opacity:lok?1:0.4})}>Book My Demo →</button>
      </div>}
    </div>
  </section>

  {/* ═══ SCORETABLE ═══ */}
  <section style={{background:"linear-gradient(160deg,#E8E4DD 0%,#F0EDE7 100%)",padding:"56px 24px 64px",textAlign:"center",position:"relative",borderTop:"1px solid "+E.g2,borderBottom:"1px solid "+E.g2}}>
    <div style={{maxWidth:620,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16}}><STIcon sz={44}/><STLogo s="1.5rem"/></div>
      <div style={{display:"inline-block",padding:"6px 16px",background:E.w,border:"1px solid "+E.g2,borderRadius:100,fontSize:"0.72rem",fontWeight:700,color:E.g5,letterSpacing:1,textTransform:"uppercase",marginBottom:20}}>Free from <STLogo s="0.72rem"/> · No Account Required</div>
      <h2 style={{fontSize:"clamp(1.4rem,4vw,2.2rem)",fontWeight:800,color:E.navy,lineHeight:1.15,margin:"0 0 10px"}}>How does {c.name} County grade kitchens?</h2>
      <p style={{fontSize:"0.92rem",color:E.g5,maxWidth:480,margin:"0 auto 28px"}}>62 agencies in California. Different methods. Different thresholds. Look up yours.</p>
      <div style={{background:S.bg,borderRadius:14,padding:24,border:"1px solid "+S.bd,textAlign:"left"}}>
        {!stDone?(<div>
          <div style={{marginBottom:14}}><label style={{fontSize:"0.72rem",fontWeight:600,color:S.sub,display:"block",marginBottom:3}}>County</label><select value={stCounty} onChange={function(e){setStCounty(e.target.value);}} style={dinp}><option value="">Select your county...</option>{CA_COUNTIES.map(function(co){return <option key={co} value={co}>{co} County</option>;})}</select></div>
          {stCounty&&<div style={{background:E.w,borderRadius:10,padding:16,border:"1px solid "+S.bd,marginBottom:14}}><p style={{fontSize:"0.86rem",color:S.tx,fontWeight:700,marginBottom:4}}>{stCounty} County</p><p style={{fontSize:"0.82rem",color:S.sub,margin:0}}>Enter your info to see {stCounty} County's full grading method, passing threshold, and what the numbers mean.</p></div>}
          {stCounty&&<div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><label style={{fontSize:"0.72rem",fontWeight:600,color:S.sub}}>Name *</label><input value={stName} onChange={function(e){setStName(e.target.value);}} style={dinp} placeholder="Jane Kim"/></div>
              <div><label style={{fontSize:"0.72rem",fontWeight:600,color:S.sub}}>Phone *</label><input value={stPhone} onChange={function(e){setStPhone(e.target.value);}} style={dinp} placeholder="(555) 123-4567"/></div>
            </div>
            <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:S.sub}}>Email *</label><input value={stEmail} onChange={function(e){setStEmail(e.target.value);}} style={dinp} placeholder="jane@restaurant.com"/></div>
            <div style={{marginBottom:14}}><label style={{fontSize:"0.72rem",fontWeight:600,color:S.sub}}>Business Name *</label><input value={stBiz} onChange={function(e){setStBiz(e.target.value);}} style={dinp} placeholder="Pacific Kitchen"/></div>
            <button disabled={!stReady} onClick={submitScoreTable} style={Object.assign({},bN,{width:"100%",opacity:stReady?1:0.4})}>See {stCounty} County →</button>
          </div>}
        </div>):(<div style={{textAlign:"center"}}><div style={{fontSize:"1.5rem",marginBottom:8}}>✅</div><p style={{fontSize:"0.9rem",fontWeight:700,color:S.tx,marginBottom:4}}>Thanks, {stName}!</p><p style={{fontSize:"0.84rem",color:S.sub,marginBottom:14}}>Full {stCounty} County details launching with <STLogo s="0.84rem"/> on May 5, 2026. We'll be in touch.</p><a href={"/scoretable/"+stCounty.toLowerCase().replace(/\s+/g,"-")+"-county"} style={{padding:"9px 20px",fontSize:"0.82rem",fontWeight:700,textDecoration:"none",display:"inline-block",background:E.navy,color:E.w,borderRadius:8,border:"none",fontFamily:ff,cursor:"pointer"}}>View on ScoreTable →</a></div>)}
      </div>
    </div>
  </section>

  {/* ═══ WHO WE ARE ═══ */}
  <section style={{padding:"72px 24px",background:E.w,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:920,margin:"0 auto",textAlign:"center"}}>
      <SL t="Who We Are"/>
      <h2 style={{fontSize:"clamp(1.3rem,4vw,2rem)",fontWeight:800,color:E.navy,margin:"0 0 28px"}}>Built by people who know what these kitchens actually deal with.</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20,textAlign:"left"}}>
        <div style={{background:E.cream,borderRadius:14,padding:"26px 22px",border:"1px solid "+E.g2,borderTop:"4px solid "+E.navy}}><h3 style={{fontSize:"1rem",fontWeight:700,color:E.navy,marginBottom:10}}>300+ kitchens a year. On the ground.</h3><p style={{fontSize:"0.86rem",color:E.g6,lineHeight:1.7,margin:0}}>We're not consultants who studied the regulations. We're in over <strong>300 commercial kitchens every year</strong> — including Aramark's seven locations at Yosemite National Park — and we see firsthand what operators are up against. EvidLY was built from that experience.</p></div>
        <div style={{background:E.cream,borderRadius:14,padding:"26px 22px",border:"1px solid "+E.g2,borderTop:"4px solid "+E.gold}}><h3 style={{fontSize:"1rem",fontWeight:700,color:E.navy,marginBottom:10}}>The compliance frameworks that protect the biggest names in the world.</h3><p style={{fontSize:"0.86rem",color:E.g6,lineHeight:1.7,margin:0}}>Our experience with compliance frameworks and standards comes from consulting for organizations that can't afford to get it wrong — Blue Cross, Chase, Kaiser, Little Caesar's, Netflix, the NFL, Optum, Quicken, Redbox, the State of Tennessee, United Health, and Warner Bros. That's the standard we built EvidLY to.</p></div>
      </div>
    </div>
  </section>

  {/* ═══ FAQ ═══ */}
  <section style={{padding:"64px 24px",background:E.cream}}>
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}><SL t={c.name+" County FAQ"}/><h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.8rem)",fontWeight:800,color:E.navy,margin:0}}>Common questions about {c.name} County inspections</h2></div>
      {c.faq.map(function(item,i){return(<div key={i} style={{borderBottom:"1px solid "+E.g2}}><button onClick={function(){setFaqOpen(faqOpen===i?null:i);}} style={{width:"100%",textAlign:"left",background:"none",border:"none",padding:"18px 0",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><span style={{fontSize:"0.9rem",fontWeight:700,color:E.navy,lineHeight:1.4}}>{item.q}</span><span style={{color:E.gold,fontSize:"1.2rem",flexShrink:0,fontWeight:700}}>{faqOpen===i?"−":"+"}</span></button>{faqOpen===i&&<p style={{fontSize:"0.85rem",color:E.g6,lineHeight:1.7,paddingBottom:18,margin:0}}>{item.a}</p>}</div>);})}
    </div>
  </section>

  {/* ═══ PRICING ═══ */}
  <section id="pricing" style={{padding:"72px 24px",background:E.w}}>
    <div style={{maxWidth:800,margin:"0 auto",textAlign:"center"}}>
      <SL t="Pricing"/>
      <h2 style={{fontSize:"clamp(1.3rem,4vw,2rem)",fontWeight:800,color:E.navy,margin:"0 0 32px"}}>Simple. Fair. Locked.</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20}}>
        <div style={{background:E.cream,borderRadius:16,padding:"32px 24px",border:"2px solid "+E.gold,position:"relative"}}>
          <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:E.gold,color:E.w,fontWeight:700,fontSize:"0.7rem",padding:"4px 14px",borderRadius:100,textTransform:"uppercase",letterSpacing:1}}>Founder</div>
          <div style={{fontSize:"0.75rem",fontWeight:700,textTransform:"uppercase",color:E.gold,marginBottom:8,marginTop:4}}>For 1–10 Locations</div>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:4,marginBottom:6}}><span style={{fontSize:"2.8rem",fontWeight:800,color:E.navy}}>$99</span><span style={{fontSize:"1rem",color:E.g4}}>/mo</span></div>
          <p style={{fontSize:"0.82rem",color:E.g6,marginBottom:4}}>+ $49/mo per additional location</p>
          <div style={{display:"inline-block",background:E.grnBg,color:E.grn,fontWeight:700,fontSize:"0.76rem",padding:"5px 12px",borderRadius:8,marginBottom:16}}>This price is yours forever</div>
          <div style={{display:"flex",flexDirection:"column",gap:7,textAlign:"left",maxWidth:280,margin:"0 auto 16px"}}>
            {["Scored against "+c.name+" County — not a generic checklist","Know where you stand before an inspector walks in","Every temp, checklist, and record in one place","Covers food safety and facility safety together","Your whole team, no extra cost","If it's not right in 45 days, you pay nothing"].map(function(f){return <div key={f} style={{display:"flex",gap:7,fontSize:"0.82rem",color:E.g6}}><span style={{color:E.gold,fontWeight:700}}>✓</span>{f}</div>;})}
          </div>
          <button onClick={function(){openM("signup");}} style={Object.assign({},bN,{padding:"12px 32px",fontSize:"0.9rem"})}>Reserve My Spot →</button>
          <p style={{marginTop:10,fontSize:"0.76rem",color:E.g4}}>Founder pricing available through July 4, 2026</p>
        </div>
        <div style={{background:E.cream,borderRadius:16,padding:"32px 24px",border:"1px solid "+E.g2}}>
          <div style={{fontSize:"0.75rem",fontWeight:700,textTransform:"uppercase",color:E.navy,marginBottom:8,marginTop:4}}>11+ Locations</div>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:4,marginBottom:6}}><span style={{fontSize:"2.4rem",fontWeight:800,color:E.navy}}>Custom</span></div>
          <p style={{fontSize:"0.82rem",color:E.g6,marginBottom:16}}>For operators running multiple locations who need one clear picture across all of them.</p>
          <div style={{display:"flex",flexDirection:"column",gap:7,textAlign:"left",maxWidth:280,margin:"0 auto 16px"}}>
            {["Everything in every location, visible in one place","Every location scored against its own jurisdiction","One login for your whole operation","Scales with you — no per-seat limits","Your brand, your platform if needed","Plug into your existing systems via API","A dedicated person who knows your account"].map(function(f){return <div key={f} style={{display:"flex",gap:7,fontSize:"0.82rem",color:E.g6}}><span style={{color:E.navy,fontWeight:700}}>✓</span>{f}</div>;})}
          </div>
          <button onClick={function(){openM("sales");}} style={Object.assign({},bG,{padding:"12px 32px",fontSize:"0.9rem"})}>Let's Talk →</button>
          <p style={{marginTop:10,fontSize:"0.76rem",color:E.g4}}>founders@getevidly.com | (855) EVIDLY1</p>
        </div>
      </div>
    </div>
  </section>

  {/* ═══ CROSS-LINKS ═══ */}
  <section style={{padding:"40px 24px",background:E.cream,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:780,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
        {[{href:"/scoretable/"+c.slug,label:"ScoreTable",desc:"Full "+c.name+" County inspection methodology — scoring weights, grading scale, and what the numbers mean.",cta:"View on ScoreTable →"},{href:"/kitchen-check/"+c.slug,label:"Kitchen Self Check",desc:"8 questions. Free. Know your "+c.name+" County compliance gaps right now — no account needed.",cta:"Check My Kitchen →"},{href:"/kitchen-to-community",label:"Kitchen to Community",desc:"Every EvidLY subscription funds ~100 meals per location per month through No Kid Hungry.",cta:"Learn More →"}].map(function(link){return(<a key={link.href} href={link.href} style={{textDecoration:"none",background:E.w,borderRadius:12,padding:"20px",border:"1px solid "+E.g2,display:"block"}}><div style={{fontSize:"0.66rem",fontWeight:800,textTransform:"uppercase",letterSpacing:1.5,color:E.gold,marginBottom:6}}>{link.label}</div><p style={{fontSize:"0.82rem",color:E.g6,lineHeight:1.6,marginBottom:10}}>{link.desc}</p><span style={{fontSize:"0.8rem",fontWeight:700,color:E.navy}}>{link.cta}</span></a>);})}
      </div>
    </div>
  </section>

  {/* ═══ FINAL CTA ═══ */}
  <section style={{padding:"64px 24px",background:heroGrad,textAlign:"center",position:"relative"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,"+E.gold+",transparent)"}}/>
    <h2 style={{fontSize:"clamp(1.4rem,4vw,2rem)",fontWeight:800,color:E.w,marginBottom:10}}>Lead with Confidence. Know Where You Stand.</h2>
    <p style={{fontSize:"0.92rem",color:"rgba(255,255,255,0.4)",marginBottom:22,maxWidth:460,margin:"0 auto 22px"}}>45 minutes. {c.name} County. Your dashboard. Every question answered.</p>
    <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
      <button onClick={openCalendly} style={Object.assign({},bG,{padding:"12px 26px",fontSize:"0.9rem"})}>Book a Demo →</button>
      <button onClick={function(){openM("signup");}} style={Object.assign({},bO,{padding:"12px 26px",fontSize:"0.9rem"})}>Reserve My Spot →</button>
    </div>
  </section>

  {/* ═══ QUIET CREDIBILITY ═══ */}
  <section style={{padding:"28px 24px",background:E.cream,borderTop:"1px solid "+E.g2}}>
    <p style={{maxWidth:600,margin:"0 auto",textAlign:"center",fontSize:"0.82rem",color:E.g4,lineHeight:1.7,fontStyle:"italic"}}>Built to bring together the standards, records, and processes you already rely on — in one dependable place.</p>
  </section>

  {/* FOOTER */}
  <footer style={{padding:"40px 24px 20px",background:"#2C3E5C"}}>
    <div style={{maxWidth:960,margin:"0 auto",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:24}}>
      <div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Logo s="0.95rem" light tagline/></div><div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}><STIcon sz={18}/><span style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.45)"}}><STLogo s="0.72rem" light/></span></div><p style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.35)",marginTop:8,lineHeight:1.6}}>Serving {_cn?_cn+", ":""}{c.name} County, California.</p></div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Product</h4>{[{t:"Food Safety",h:"#"},{t:"Facility Safety",h:"#"},{t:"Kitchen Self Check",h:"/kitchen-check/"+c.slug},{t:"ScoreTable",h:"/scoretable/"+c.slug},{t:"Pricing",h:"#"}].map(function(l){return <a key={l.t} href={l.h} style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:6}}>{l.t}</a>;})}</div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Company</h4>{["About Us","Kitchen to Community","Careers","Blog"].map(function(l){return <a key={l} href="#" style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:6}}>{l}</a>;})}</div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Legal</h4>{["Privacy Policy","Terms of Service","Cookie Policy","Security"].map(function(l){return <a key={l} href="#" style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:6}}>{l}</a>;})}</div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Contact</h4><a href="mailto:founders@getevidly.com" style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:6}}>founders@getevidly.com</a><a href="mailto:support@getevidly.com" style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:6}}>support@getevidly.com</a><a href="tel:8553843591" style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:6}}>(855) EVIDLY1</a><a href="tel:2096007675" style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.5)",textDecoration:"none"}}>(209) 600-7675</a></div>
    </div>
    <div style={{maxWidth:960,margin:"16px auto 0",paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <span style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.3)"}}>© 2026 <Logo s="0.7rem" light/>, LLC. All rights reserved. Serving {_cn?_cn+", ":""}{c.name} County, California.</span>
      <div style={{display:"flex",gap:16}}>{["Privacy Policy","Terms of Service","Cookie Policy","Do Not Sell My Info"].map(function(l){return <a key={l} href="#" style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.3)",textDecoration:"none"}}>{l}</a>;})}</div>
    </div>
  </footer>

  </div>);
}
