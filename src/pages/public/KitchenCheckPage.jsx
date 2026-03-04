/**
 * KITCHEN CHECK COUNTY PAGE — MASTER TEMPLATE
 * URL: getevidly.com/kitchen-check/[county]-county
 * 62 pages generated from this template
 *
 * PURPOSE:
 * SEO traffic driver for operators searching compliance checklists.
 * Delivers a free, gated 12-question self-assessment calibrated to
 * the county's actual inspection methodology. Every gap is mapped
 * to a CalCode section and a severity level. Results emailed.
 * Soft EvidLY pitch after completion.
 *
 * GATE PATTERN:
 * Step 1 — Contact form (name, phone, business, email)
 * Step 2 — 12-question checklist unlocks
 * Step 3 — Results + gaps + CalCode refs + EvidLY CTA
 *
 * UNIQUE PER COUNTY:
 * - H1, intro copy, county badge
 * - 12 questions calibrated to county method + top violations
 * - Scoring uses county weights (accumulate/deduction/count/reinspect)
 * - FAQ (5 questions)
 * - Vendor cards (CPP statewide, Filta on 6 counties)
 * - Schema markup
 *
 * CONSISTENT ACROSS ALL 62:
 * - Gate pattern (phone required)
 * - Gap report format with CalCode refs
 * - Competitor blocking
 * - Cross-links to /[county] and /scoretable/[county]
 * - Footer / header
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

// ═══ CHECKLIST ITEMS ═══
// Base 12 items — same across all counties, severity/scoring calibrated per county
const BASE_ITEMS=[
  {id:"haccp",     q:"Do you have a written HACCP plan on file?",                        code:"§114015",  risk:"critical", why:"HACCP plan is required for facilities handling potentially hazardous food. Missing = immediate major or critical violation in most counties."},
  {id:"cfpm",      q:"Is a Certified Food Protection Manager (CFPM) on staff?",          code:"§113947.1",risk:"critical", why:"California requires at least one CFPM at each food facility. Must be reachable and on-site or available during operating hours."},
  {id:"fhc",       q:"Are food handler cards current for all staff?",                    code:"§113948",  risk:"high",     why:"All food handlers must complete an accredited food handler course within 30 days of hire. Cards expire every 3 years."},
  {id:"templogrec",q:"Are receiving temperatures being logged at every delivery?",       code:"§113980",  risk:"high",     why:"Receiving logs demonstrate due diligence for temperature-sensitive deliveries. Frequently cited in inspections."},
  {id:"templogop", q:"Are you logging temperatures at least twice per shift?",           code:"§113996",  risk:"high",     why:"Holding temperature records are the primary evidence of temperature control requirements. Must cover hot hold (135°F+) and cold hold (41°F or below)."},
  {id:"cooling",   q:"Do you have a documented cooling procedure (135→70→41°F)?",        code:"§114002",  risk:"critical", why:"Improper cooling is one of the leading causes of foodborne illness. The two-stage cooling rule (135→70°F in 2 hrs, →41°F in 4 more hrs) must be documented and followed."},
  {id:"hood",      q:"Is your hood cleaning certificate posted or on file?",             code:"NFPA 96 §12.4",risk:"critical",why:"NFPA 96 requires documentation of hood cleaning at the frequency in Table 12.4. Missing or overdue certificates are cited as critical violations by fire inspectors and EH."},
  {id:"firesup",   q:"Is your fire suppression system current on semi-annual service?",  code:"NFPA 17A §7.3",risk:"critical",why:"Ansul/Kidde wet chemical systems require semi-annual inspection by a licensed contractor. Expired service tags are an immediate critical violation."},
  {id:"extinguish",q:"Are all fire extinguishers current on annual inspection?",         code:"NFPA 10 §7.3",risk:"high",  why:"Fire extinguishers must be inspected annually by a licensed fire protection contractor and monthly by staff."},
  {id:"pest",      q:"Do you have documentation of your last pest control visit?",       code:"§114259",  risk:"medium",   why:"Pest control documentation is frequently requested during inspections. No documentation = no documentation = presumed gap."},
  {id:"grease",    q:"Is your grease trap or interceptor on a regular service schedule?",code:"Local ordinance",risk:"medium",why:"Grease trap frequency varies by local ordinance. Overflow or missed service can result in violation. Service records required."},
  {id:"equip",     q:"Is thermometer calibration current on all temperature equipment?", code:"§114157",  risk:"medium",   why:"Thermometers used for food safety monitoring must be accurate to ±2°F. Calibration records should be maintained."},
];

// Per-county overrides — adjust risk levels based on county enforcement emphasis
const COUNTY_OVERRIDES={
  merced:{},
  fresno:{hood:{risk:"critical"},firesup:{risk:"critical"}},
  kern:{cooling:{risk:"critical"},pest:{risk:"critical"}},
  "los-angeles":{pest:{risk:"critical"},fhc:{risk:"critical"}},
  riverside:{cooling:{risk:"critical"},cfpm:{risk:"critical"}},
  sacramento:{templogrec:{risk:"critical"},templogop:{risk:"critical"}},
  "san-joaquin":{},
};

function getItems(county){
  var overrides=COUNTY_OVERRIDES[county]||{};
  return BASE_ITEMS.map(function(item){
    return overrides[item.id]?Object.assign({},item,overrides[item.id]):item;
  });
}

// ═══ COUNTY DATA ═══
const COUNTY_DATA={
  merced:{
    name:"Merced",slug:"merced-county",landingSlug:"merced-county",stSlug:"merced-county",
    agency:"Merced County Department of Public Health",agencyShort:"Merced County DPH",
    method:"accumulate",transparency:"HIGH",
    h1:"Merced County Kitchen Inspection Check",
    heroSub:"12 questions. Free. Calibrated for Merced County DPH's point accumulation method. Know where you stand before anyone else walks in.",
    intro:"Merced County accumulates points starting from zero — 4 pts for critical violations, 2 pts for major, 2 pts for minor. This checklist maps your kitchen against the items that most frequently push Merced County facilities to Unsatisfactory (14+ points).",
    metaTitle:"Merced County Kitchen Inspection Check | Free | EvidLY",
    metaDesc:"Free 12-question inspection check calibrated for Merced County DPH. Know where you stand before an inspector walks in. Results emailed instantly.",
    keywords:"Merced County kitchen compliance checklist, Merced County restaurant inspection prep, CalCode compliance Merced, free kitchen safety checklist Merced",
    faq:[
      {q:"What does this Merced County checklist cover?",a:"12 items covering the violations most frequently cited in Merced County DPH inspections — HACCP plans, food handler cards, temperature logging, hood cleaning, fire suppression, and more. Each item is mapped to the relevant CalCode section."},
      {q:"Is this checklist free?",a:"Yes. No account needed. Enter your contact info, complete the 12 questions, and your results — including gaps with CalCode references — are emailed to you immediately."},
      {q:"How does this checklist relate to Merced County's scoring system?",a:"Merced County uses a point accumulation method. Critical violations add 4 points, major violations add 2 points. This checklist flags the items that carry the most point risk in Merced County inspections."},
      {q:"What happens if I have multiple 'No' answers?",a:"Your results will show each gap with the relevant CalCode section and an explanation of the risk. Critical gaps carry the most inspection risk in Merced County. EvidLY can help you track these continuously."},
      {q:"How is this different from EvidLY?",a:"This is a one-time snapshot. EvidLY tracks everything continuously — logging temperatures, tracking certifications, documenting hood cleaning and fire safety records, and showing your live Merced County score every day."},
    ],
    filta:true,
  },
  fresno:{
    name:"Fresno",slug:"fresno-county",landingSlug:"fresno-county",stSlug:"fresno-county",
    agency:"Fresno County Department of Public Health",agencyShort:"Fresno County DPH",
    method:"reinspect",transparency:"LOW",
    h1:"Fresno County Kitchen Inspection Check",
    heroSub:"12 questions. Free. Calibrated for Fresno County's pass/fail inspection model. Know where you stand before an inspector shows up.",
    intro:"Fresno County uses a pass/fail model — no numeric score, no letter grade. Any uncorrected major or critical violation triggers a reinspection. This checklist targets the violations most frequently cited in Fresno County DPH inspections, including items highlighted in the 2023–24 Grand Jury transparency report.",
    metaTitle:"Fresno County Kitchen Inspection Check | Free | EvidLY",
    metaDesc:"Free kitchen inspection check for Fresno County restaurants. Know where you stand and what triggers a reinspection. Results with CalCode refs emailed instantly.",
    keywords:"Fresno County kitchen compliance checklist, Fresno County restaurant inspection prep, CalCode compliance Fresno, free kitchen safety checklist Fresno County",
    faq:[
      {q:"What does this Fresno County checklist cover?",a:"12 items covering the violations most frequently cited in Fresno County DPH inspections — HACCP plans, temperature control, hood cleaning, fire suppression, and more. Each item maps to the relevant CalCode or NFPA section."},
      {q:"Does Fresno County use a pass/fail or numeric scoring system?",a:"Pass/fail only. There is no numeric score and no letter grade in Fresno County. A 2023–24 Grand Jury report cited this lack of transparency as a public health concern."},
      {q:"What triggers a reinspection in Fresno County?",a:"Any uncorrected major or critical violation at the time of inspection. Reinspections are typically scheduled within 14–30 days. This checklist flags all items that would trigger a reinspection."},
      {q:"Is this checklist free?",a:"Yes. Enter your contact info, answer 12 questions, and your results with CalCode references are emailed immediately. No account needed."},
      {q:"How is this different from EvidLY?",a:"This checklist is a one-time snapshot. EvidLY continuously tracks temperatures, certifications, hood cleaning records, and fire safety documentation — and shows your Fresno County score daily."},
    ],
    filta:true,
  },
  kern:{
    name:"Kern",slug:"kern-county",landingSlug:"kern-county",stSlug:"kern-county",
    agency:"Kern County Public Health Services",agencyShort:"Kern County PHS",
    method:"deduction",transparency:"MEDIUM",
    h1:"Kern County Kitchen Inspection Check",
    heroSub:"12 questions. Free. Calibrated for Kern County's 100-point deduction system. Critical violations cost 5 points each — the highest in California.",
    intro:"Kern County deducts points from 100 — critical violations cost 5 points (higher than most California counties), major violations cost 3 points, minor violations cost 1 point. Below 75 means immediate closure. This checklist targets the highest-risk items in Kern County inspections.",
    metaTitle:"Kern County Kitchen Inspection Check | Free | EvidLY",
    metaDesc:"Free kitchen inspection check for Kern County restaurants. 100-point deduction system. Critical violations cost 5 pts each. Know your score before an inspector does.",
    keywords:"Kern County kitchen compliance checklist, Kern County restaurant inspection prep, CalCode compliance Kern, free kitchen safety checklist Kern County",
    faq:[
      {q:"What does this Kern County checklist cover?",a:"12 items covering the violations that carry the most scoring risk in Kern County's 100-point deduction system. Critical violations cost 5 points — higher than most California counties."},
      {q:"How does Kern County's scoring make critical violations more expensive?",a:"Kern County deducts 5 points for critical violations versus 4 points in LA County. Two uncorrected critical violations can take a potential A score to a B before any minor violations are counted."},
      {q:"What score causes closure in Kern County?",a:"Below 75 points results in immediate closure. This checklist flags all items that could contribute to dropping below the closure threshold."},
      {q:"Is this checklist free?",a:"Yes. Enter your contact info, answer 12 questions, and your results with CalCode references are emailed immediately. No account needed."},
      {q:"How is this different from EvidLY?",a:"This checklist is a one-time snapshot. EvidLY continuously monitors your Kern County score, tracks all documentation, and alerts you before gaps become inspection failures."},
    ],
    filta:false,
  },
  "los-angeles":{
    name:"Los Angeles",slug:"los-angeles-county",landingSlug:"los-angeles-county",stSlug:"los-angeles-county",
    agency:"LA County Department of Public Health",agencyShort:"LA County DPH",
    method:"deduction",transparency:"HIGH",
    h1:"Los Angeles County Kitchen Inspection Check",
    heroSub:"12 questions. Free. Calibrated for LA County's A/B/C grade card system. 280 inspectors. 55,000 facilities. Know your grade before it's posted in your window.",
    intro:"LA County uses a 100-point deduction system with mandatory grade card posting. Critical violations cost 4 points, major violations 2 points, minor violations 1 point. Below 70 is a fail. A 'B' in your window costs you customers. This checklist covers what LA County inspectors look for most.",
    metaTitle:"Los Angeles County Kitchen Inspection Check | Free | EvidLY",
    metaDesc:"Free kitchen inspection check for LA County restaurants. A/B/C grade card system. Know your grade before it gets posted in your window.",
    keywords:"Los Angeles County kitchen compliance checklist, LA County restaurant inspection prep, LACDPH food safety checklist, free kitchen safety checklist Los Angeles",
    faq:[
      {q:"What does this LA County checklist cover?",a:"12 items covering the violations most frequently cited by LA County's 280 inspectors — temperature control, employee hygiene, pest prevention, HACCP, hood cleaning, and fire suppression documentation."},
      {q:"Does LA County require grade cards to be posted?",a:"Yes. LA County law requires the most recent inspection grade card to be posted in a publicly visible location. An A requires 90+ points. B is 80–89. C is 70–79. Below 70 is a fail and results in closure."},
      {q:"How often does LA County inspect restaurants?",a:"1–3 times per year based on risk classification. High-risk facilities and those with prior B or C grades are inspected more frequently. All inspections are unannounced."},
      {q:"Is this checklist free?",a:"Yes. Enter your contact info, answer 12 questions, and your results with CalCode references are emailed immediately. No account needed."},
      {q:"How is this different from EvidLY?",a:"This checklist is a one-time snapshot. EvidLY continuously monitors your LA County score and keeps all documentation organized so your grade card stays where it belongs — in the A column."},
    ],
    filta:false,
  },
  riverside:{
    name:"Riverside",slug:"riverside-county",landingSlug:"riverside-county",stSlug:"riverside-county",
    agency:"Riverside County Department of Environmental Health",agencyShort:"Riverside County EH",
    method:"deduction",transparency:"HIGH",
    h1:"Riverside County Kitchen Inspection Check",
    heroSub:"12 questions. Free. In Riverside County, only an 'A' passes. A 'B' is a failure. Know if you're holding a passing score right now.",
    intro:"Riverside County uses the same 100-point deduction formula as LA County, but with a critical difference: only a score of 90 or above (an 'A') is considered passing. A 'B' grade (80–89) is a failure in Riverside County. This checklist is calibrated to that stricter standard.",
    metaTitle:"Riverside County Kitchen Inspection Check | Free | EvidLY",
    metaDesc:"Free kitchen inspection check for Riverside County restaurants. Only an A passes — a B is a failure. Know your score before your next inspection.",
    keywords:"Riverside County kitchen compliance checklist, Riverside County restaurant inspection prep, Riverside DEH food safety checklist, free kitchen compliance Riverside",
    faq:[
      {q:"Why does this checklist say only an 'A' passes in Riverside County?",a:"Riverside County's passing threshold is 90 points or above. A score of 80–89 earns a 'B' grade — but in Riverside County, a B is a failing score that requires reinspection. Most California counties treat B as passing."},
      {q:"What does this Riverside County checklist cover?",a:"12 items targeting the violations that most commonly drop Riverside County facilities from A to B or below — temperature control, cooling documentation, CFPM on staff, hood and fire suppression records, and pest control."},
      {q:"How many critical violations push a Riverside County kitchen to a B?",a:"Critical violations cost 4 points each. Just three uncorrected critical violations drop a facility from a potential 100 to 88 — a failing B. This checklist flags all critical items."},
      {q:"Is this checklist free?",a:"Yes. Enter your contact info, answer 12 questions, and your results with CalCode references are emailed immediately. No account needed."},
      {q:"How is this different from EvidLY?",a:"This checklist is a one-time snapshot. EvidLY continuously monitors your Riverside County score, keeping you at the A threshold with daily documentation tracking."},
    ],
    filta:false,
  },
  sacramento:{
    name:"Sacramento",slug:"sacramento-county",landingSlug:"sacramento-county",stSlug:"sacramento-county",
    agency:"Sacramento County Environmental Management Department",agencyShort:"Sacramento EMD",
    method:"count",transparency:"MEDIUM",
    h1:"Sacramento County Kitchen Inspection Check",
    heroSub:"12 questions. Free. Sacramento County closes kitchens at 4 major violations. Know your placard color before it's posted.",
    intro:"Sacramento County uses a Green/Yellow/Red placard system based on the count of major violations. 0–1 major violations = Green, 2–3 = Yellow, 4 or more = Red and immediate closure. This checklist targets the major violations most commonly cited by Sacramento EMD inspectors.",
    metaTitle:"Sacramento County Kitchen Inspection Check | Free | EvidLY",
    metaDesc:"Free kitchen inspection check for Sacramento County restaurants. Green/Yellow/Red placard system. 4 major violations = closure. Know your color before inspection.",
    keywords:"Sacramento County kitchen compliance checklist, Sacramento restaurant inspection prep, Sacramento EMD food safety checklist, free kitchen compliance Sacramento",
    faq:[
      {q:"What does this Sacramento County checklist cover?",a:"12 items targeting the major violations most frequently cited by Sacramento EMD inspectors. Because Sacramento uses a violation count (not point deduction), every major violation counts equally toward your placard color."},
      {q:"What is the Sacramento County placard system?",a:"Sacramento County posts Green, Yellow, or Red placards based on the number of major violations. 0–1 major violations earns Green, 2–3 earns Yellow, and 4 or more results in a Red placard and immediate closure."},
      {q:"Do minor violations affect the Sacramento placard?",a:"No. Minor violations are noted in the inspection report but do not affect the placard color. Only major violations count toward the Green/Yellow/Red determination."},
      {q:"Is this checklist free?",a:"Yes. Enter your contact info, answer 12 questions, and your results with CalCode references are emailed immediately. No account needed."},
      {q:"How is this different from EvidLY?",a:"This checklist is a one-time snapshot. EvidLY continuously tracks major violation risks and keeps your Sacramento County documentation current so you stay in the Green."},
    ],
    filta:false,
  },
  "san-joaquin":{
    name:"San Joaquin",slug:"san-joaquin-county",landingSlug:"san-joaquin-county",stSlug:"san-joaquin-county",
    agency:"San Joaquin County Public Health Services",agencyShort:"San Joaquin County PH",
    method:"reinspect",transparency:"MEDIUM",
    h1:"San Joaquin County Kitchen Inspection Check",
    heroSub:"12 questions. Free. Calibrated for San Joaquin County's CalCode enforcement. Know what triggers a reinspection in Stockton and surrounding areas.",
    intro:"San Joaquin County follows the CalCode standard pass/fail model — no numeric score, no letter grade. Uncorrected major or critical violations trigger a reinspection. This checklist covers the items most frequently cited by San Joaquin County Public Health Services inspectors.",
    metaTitle:"San Joaquin County Kitchen Inspection Check | Free | EvidLY",
    metaDesc:"Free kitchen inspection check for San Joaquin County and Stockton restaurants. CalCode standard enforcement. Know what triggers a reinspection.",
    keywords:"San Joaquin County kitchen compliance checklist, Stockton restaurant inspection prep, San Joaquin County food safety checklist, free kitchen compliance checklist Stockton",
    faq:[
      {q:"What does this San Joaquin County checklist cover?",a:"12 items targeting violations most frequently cited by San Joaquin County Public Health Services inspectors — including temperature logging, HACCP documentation, hood cleaning, food handler cards, and fire safety records."},
      {q:"Does San Joaquin County use a numeric score?",a:"No. San Joaquin County follows the CalCode standard pass/fail model with no numeric score and no letter grade. Uncorrected major or critical violations trigger a formal reinspection."},
      {q:"What areas does San Joaquin County cover?",a:"San Joaquin County covers Stockton, Lodi, Tracy, Manteca, and surrounding communities. Approximately 3,000 permitted food facilities are covered by 12 environmental health inspectors."},
      {q:"Is this checklist free?",a:"Yes. Enter your contact info, answer 12 questions, and your results with CalCode references are emailed immediately. No account needed."},
      {q:"How is this different from EvidLY?",a:"This checklist is a one-time snapshot. EvidLY continuously tracks your San Joaquin County documentation and score — so you know where you stand every day and gaps never catch you off guard."},
    ],
    filta:true,
  },
};

const DEFAULT_COUNTY="merced";
const FILTA_COUNTIES=["merced","fresno","stanislaus","san-joaquin","mariposa","madera"];
var BD=["jolt.com","joltup.com","safetyculture.com","safetyculture.io","fooddocs.com","fooddocs.io","zenput.com","crunchtime.com","bluecart.com","marketman.com","restaurant365.com","toast.com","toasttab.com"];
var BC=["jolt","safety culture","safetyculture","fooddocs","zenput","crunchtime","bluecart","marketman","toast pos","toasttab"];
function isBl(e,co){var d=(e||"").split("@")[1]||"";d=d.toLowerCase();var l=(co||"").toLowerCase();for(var i=0;i<BD.length;i++)if(d===BD[i]||d.endsWith("."+BD[i]))return 1;for(var i=0;i<BC.length;i++)if(l.indexOf(BC[i])>=0)return 1;return 0;}

// ═══ COMPONENTS ═══
function Logo({s="1.2rem",light=false,tagline=false}){var vc=light?E.w:E.navy;var tc=light?"rgba(255,255,255,0.55)":"rgba(37,57,107,0.6)";return(<span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:2,lineHeight:1}}><span style={{fontWeight:800,fontSize:s,letterSpacing:-0.5,fontFamily:ff,lineHeight:1}}><span style={{color:E.gold}}>E</span><span style={{color:vc}}>vid</span><span style={{color:E.gold}}>LY</span></span>{tagline&&<span style={{fontSize:"calc("+s+" * 0.3)",fontWeight:700,letterSpacing:"0.2em",color:tc,textTransform:"uppercase",lineHeight:1,fontFamily:ff,whiteSpace:"nowrap"}}>Lead with Confidence</span>}</span>);}
function STIcon({sz=30}){return(<div style={{width:sz,height:sz,background:S.grn,borderRadius:sz*0.2,display:"inline-flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:sz*0.34,fontWeight:900,color:E.w,letterSpacing:-0.5,lineHeight:1,marginBottom:sz*0.06}}>ST</span><div style={{display:"flex",gap:1.5,alignItems:"flex-end"}}>{[5,8,11,7,10].map(function(h,i){return <div key={i} style={{width:sz*0.055,height:h*(sz/72),background:"rgba(255,255,255,"+(0.25+i*0.12)+")",borderRadius:1}}/>;})}</div></div>);}
function STLogo({s="1.2rem",light=false}){return <span style={{fontWeight:800,fontSize:s,fontFamily:ff}}><span style={{color:S.grn}}>Score</span><span style={{color:light?E.w:S.charD}}>Table</span></span>;}
function SL({t,c}){return <div style={{fontSize:"0.68rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:c||S.grn,marginBottom:10}}>{t}</div>;}
function TBadge({level}){var m={HIGH:{bg:E.grnBg,bd:E.grn,tx:"#065f46"},MEDIUM:{bg:E.wrnBg,bd:E.wrn,tx:"#92400e"},LOW:{bg:E.redBg,bd:E.red,tx:"#991b1b"}};var co=m[level]||m.MEDIUM;return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:100,fontSize:"0.64rem",fontWeight:700,background:co.bg,border:"1px solid "+co.bd,color:co.tx,marginLeft:8}}>{level} TRANSPARENCY</span>;}
function RiskBadge({risk}){var m={critical:{bg:E.redBg,bd:E.red,tx:E.red},high:{bg:E.wrnBg,bd:E.wrn,tx:"#92400e"},medium:{bg:E.bluePale,bd:E.g3,tx:E.g5}};var co=m[risk]||m.medium;return <span style={{display:"inline-block",padding:"1px 7px",borderRadius:100,fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,background:co.bg,border:"1px solid "+co.bd,color:co.tx}}>{risk}</span>;}

function SchemaMarkup({c}){var schema={"@context":"https://schema.org","@graph":[{"@type":"FAQPage","mainEntity":c.faq.map(function(f){return{"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}};})},{"@type":"WebPage","name":c.metaTitle,"description":c.metaDesc,"url":"https://getevidly.com/kitchen-check/"+c.slug}]};return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>;}

// Score estimate based on county method
function estimateOutcome(c,items,answers){
  var gaps=items.filter(function(item,i){return answers[i]==="no";});
  if(c.method==="accumulate"){var pts=gaps.reduce(function(acc,item){return acc+(item.risk==="critical"?4:item.risk==="high"?2:2);},0);return{type:"pts",val:pts,pass:pts<14,label:pts<=6?"Good":pts<=13?"Satisfactory":"Unsatisfactory — Reinspection Triggered"};}
  if(c.method==="deduction"){var dd=gaps.reduce(function(acc,item){return acc+(item.risk==="critical"?4:item.risk==="high"?2:1);},0);var sc=Math.max(0,100-dd);var pass=c.name==="Riverside"?sc>=90:sc>=70;var lbl=sc>=90?"A":sc>=80?"B":sc>=70?"C":"F — Closure Risk";if(c.name==="Riverside")lbl=sc>=90?"A — Pass":sc>=80?"B — Fail (Riverside)":sc>=70?"C — Fail":"F — Closure Risk";return{type:"score",val:sc,pass:pass,label:lbl};}
  if(c.method==="count"){var mj=gaps.filter(function(item){return item.risk==="critical"||item.risk==="high";}).length;return{type:"count",val:mj,pass:mj<4,label:mj<=1?"Green Placard":mj<=3?"Yellow Placard":"Red Placard — Closure Risk"};}
  var un=gaps.filter(function(item){return item.risk==="critical"||item.risk==="high";}).length;return{type:"reinspect",val:un,pass:un===0,label:un===0?"Pass":"Reinspection Required — "+un+" gap"+(un>1?"s":"")};}

// ═══ MAIN ═══
export default function KitchenCheckPage({county: countyProp}){
  var { slug } = useParams();
  var countyKey = countyProp || (slug ? slug.replace(/-county$/, "") : DEFAULT_COUNTY);
  var c=COUNTY_DATA[countyKey]||COUNTY_DATA[DEFAULT_COUNTY];
  var items=getItems(countyKey);
  var isFilta=FILTA_COUNTIES.includes(countyKey);

  // Gate state
  var [gName,setGName]=useState("");
  var [gPhone,setGPhone]=useState("");
  var [gBiz,setGBiz]=useState("");
  var [gEmail,setGEmail]=useState("");
  var [unlocked,setUnlocked]=useState(false);
  var gateReady=gName&&gPhone&&gBiz&&gEmail&&!isBl(gEmail,gBiz);
  var gateBlocked=gEmail&&gBiz&&isBl(gEmail,gBiz);

  // Checklist state
  var [answers,setAnswers]=useState({});
  var [done,setDone]=useState(false);
  var [faqOpen,setFaqOpen]=useState(null);
  var [cookie,setCookie]=useState(true);

  var answered=Object.keys(answers).length;
  var allAnswered=answered===items.length;
  var gaps=items.filter(function(item,i){return answers[i]==="no";});
  var critGaps=gaps.filter(function(item){return item.risk==="critical";});
  var highGaps=gaps.filter(function(item){return item.risk==="high";});
  var outcome=allAnswered?estimateOutcome(c,items,answers):null;

  var dinp={width:"100%",padding:"10px 12px",border:"1px solid "+E.g2,borderRadius:8,fontSize:"0.85rem",boxSizing:"border-box",outline:"none",background:E.w,color:E.g8,fontFamily:ff};
  var bN={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.navy,color:E.w,fontFamily:ff};
  var bG={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.gold,color:E.w,fontFamily:ff};

  function openCalendly(){window.open(CALENDLY,"_blank");}
  function handleGate(){if(!gateReady)return;window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[EvidLY] Kitchen Check - "+gBiz+" ("+c.name+" County)")+"&body="+encodeURIComponent("Name: "+gName+"\nEmail: "+gEmail+"\nPhone: "+gPhone+"\nBusiness: "+gBiz+"\nCounty: "+c.name),"_blank");setUnlocked(true);}
  function submitResults(){if(!allAnswered)return;var gapList=gaps.map(function(item){return "❌ "+item.q+" ("+item.risk+" · "+item.code+")";}).join("\n");var passList=items.filter(function(item,i){return answers[i]==="yes";}).map(function(item){return "✓ "+item.q;}).join("\n");window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[EvidLY] Kitchen Check Results - "+gBiz+" ("+c.name+" County)")+"&body="+encodeURIComponent("Name: "+gName+"\nEmail: "+gEmail+"\nPhone: "+gPhone+"\nBusiness: "+gBiz+"\nCounty: "+c.name+"\n\nGAPS:\n"+gapList+"\n\nPASSING:\n"+passList),"_blank");setDone(true);}

  return(
  <div style={{fontFamily:ff,color:E.g8,lineHeight:1.6,background:E.cream,minHeight:"100vh"}}>
  <style>{`button{all:unset;box-sizing:border-box;cursor:pointer;} button:disabled{cursor:not-allowed;} a.btn{all:unset;box-sizing:border-box;cursor:pointer;display:inline-block;}`}</style>
  <SchemaMarkup c={c}/>

  {/* COOKIE */}
  {cookie&&<div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:E.w,borderTop:"1px solid "+E.g2,padding:"12px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 -2px 10px rgba(0,0,0,0.06)"}}>
    <p style={{flex:1,fontSize:"0.8rem",color:E.g6,margin:0,minWidth:200}}>We use cookies to enhance your experience. <a href="/privacy" style={{color:E.navy}}>Cookie Policy</a></p>
    <button onClick={function(){setCookie(false);}} style={{padding:"7px 16px",borderRadius:6,border:"1px solid "+E.g2,background:E.w,fontSize:"0.78rem",fontWeight:600,color:E.g6}}>Settings</button>
    <button onClick={function(){setCookie(false);}} style={{padding:"7px 16px",borderRadius:6,background:E.navy,color:E.w,fontSize:"0.78rem",fontWeight:600}}>Accept All</button>
  </div>}

  {/* HEADER */}
  <header style={{background:E.w,borderBottom:"1px solid "+E.g2,padding:"0 24px",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 6px rgba(0,0,0,0.04)"}}>
    <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",height:52}}>
      <a href="/" style={{textDecoration:"none",marginRight:24}}><Logo s="1rem" tagline/></a>
      <nav style={{display:"flex",gap:18,flex:1}}>
        {[["Know Where You Stand","#checklist"],["Results","#results"],["Vendors","#vendors"],["FAQ","#faq"]].map(function(x){return <a key={x[0]} href={x[1]} style={{textDecoration:"none",color:E.g5,fontWeight:500,fontSize:"0.8rem"}}>{x[0]}</a>;})}
      </nav>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <a className="btn" href={"/scoretable/"+c.stSlug} style={{fontSize:"0.78rem",fontWeight:600,color:E.g5,textDecoration:"none",padding:"7px 12px"}}>ScoreTable →</a>
        <button onClick={openCalendly} style={{padding:"7px 14px",fontSize:"0.78rem",fontWeight:700,background:E.navy,color:E.w,borderRadius:8}}>Book a Demo</button>
      </div>
    </div>
  </header>

  {/* BREADCRUMB */}
  <div style={{background:E.w,borderBottom:"1px solid "+E.g1,padding:"7px 24px"}}>
    <div style={{maxWidth:1100,margin:"0 auto",fontSize:"0.72rem",color:E.g4}}>
      <a href="/" style={{color:E.g4,textDecoration:"none"}}>EvidLY</a>{" › "}
      <a href="/kitchen-check" style={{color:E.g4,textDecoration:"none"}}>Kitchen Check</a>{" › "}
      <a href="/kitchen-check/california" style={{color:E.g4,textDecoration:"none"}}>California</a>{" › "}
      <span style={{color:E.navy,fontWeight:600}}>{c.name} County</span>
    </div>
  </div>

  {/* ═══ HERO ═══ */}
  <section style={{padding:"52px 24px 40px",background:E.w,borderBottom:"1px solid "+E.g2,textAlign:"center"}}>
    <div style={{maxWidth:680,margin:"0 auto"}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,background:E.cream,border:"1px solid "+E.g2,borderRadius:100,padding:"4px 14px",marginBottom:20}}>
        <span style={{fontSize:"0.7rem",fontWeight:700,color:S.grn,textTransform:"uppercase",letterSpacing:1}}>Free · {c.name} County</span>
        <TBadge level={c.transparency}/>
      </div>
      <h1 style={{fontSize:"clamp(1.8rem,5vw,2.6rem)",fontWeight:800,lineHeight:1.1,margin:"0 0 14px",color:E.navy}}>{c.h1}</h1>
      <p style={{fontSize:"0.96rem",color:E.g5,maxWidth:520,margin:"0 auto 20px",lineHeight:1.7}}>{c.heroSub}</p>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}>
        <a className="btn" href="#checklist" style={{padding:"11px 22px",fontSize:"0.85rem",fontWeight:700,background:E.navy,color:E.w,borderRadius:8,textDecoration:"none"}}>Know Where You Stand →</a>
        <a className="btn" href={"/"+c.landingSlug} style={{padding:"11px 22px",fontSize:"0.85rem",fontWeight:700,background:"transparent",color:E.navy,borderRadius:8,border:"1px solid "+E.g2,textDecoration:"none"}}>Learn About EvidLY →</a>
      </div>
      {/* Stats row */}
      <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
        {[{v:"12",l:"Questions"},{v:"Free",l:"No Account"},{v:"CalCode",l:"Referenced"},{v:"2 min",l:"To Complete"}].map(function(s){return(
          <div key={s.l} style={{textAlign:"center",padding:"8px 16px",background:E.cream,borderRadius:8,border:"1px solid "+E.g2}}>
            <div style={{fontSize:"0.92rem",fontWeight:800,color:E.navy}}>{s.v}</div>
            <div style={{fontSize:"0.66rem",color:E.g4,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{s.l}</div>
          </div>
        );})}
      </div>
    </div>
  </section>

  {/* ═══ COUNTY CONTEXT ═══ */}
  <section style={{padding:"32px 24px",background:E.cream,borderBottom:"1px solid "+E.g2}}>
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <div style={{background:E.w,borderRadius:12,padding:"18px 20px",border:"1px solid "+E.g2}}>
        <div style={{fontSize:"0.66rem",fontWeight:700,color:E.gold,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>About This Checklist — {c.name} County</div>
        <p style={{fontSize:"0.86rem",color:E.g6,lineHeight:1.75,margin:"0 0 10px"}}>{c.intro}</p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:"0.76rem",color:E.g5}}>
          <span>🏛 {c.agencyShort}</span>
          <span>📋 {c.method==="accumulate"?"Point Accumulation":c.method==="deduction"?"100-Point Deduction":c.method==="count"?"Violation Count Placard":"Pass/Fail + Reinspection"}</span>
          <a href={"/scoretable/"+c.stSlug} style={{color:E.navy,fontWeight:600,textDecoration:"none"}}>Full methodology on ScoreTable →</a>
        </div>
      </div>
    </div>
  </section>

  {/* ═══ CHECKLIST ═══ */}
  <section id="checklist" style={{padding:"64px 24px",background:E.w}}>
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <SL t="Kitchen Self Check"/>
      <h2 style={{fontSize:"clamp(1.3rem,4vw,1.9rem)",fontWeight:800,color:E.navy,margin:"0 0 6px"}}>Know where you stand. Right now.</h2>
      <p style={{fontSize:"0.88rem",color:E.g5,marginBottom:28}}>Calibrated for {c.agencyShort}. Answer honestly. Results sent to your inbox.</p>

      {/* STEP 1 — GATE */}
      {!unlocked&&!done&&(
      <div style={{background:E.cream,borderRadius:16,border:"1px solid "+E.g2,overflow:"hidden"}}>
        <div style={{padding:"20px 24px 12px",borderBottom:"1px solid "+E.g2,background:E.w}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:E.navy,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:"0.75rem",fontWeight:800,color:E.w}}>1</span></div>
            <div>
              <div style={{fontSize:"0.84rem",fontWeight:700,color:E.navy}}>Where should we send your results?</div>
              <div style={{fontSize:"0.72rem",color:E.g5}}>We'll email your full gap report with CalCode references for every item you flag.</div>
            </div>
          </div>
        </div>
        <div style={{padding:"20px 24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Your Name *</label><input value={gName} onChange={function(e){setGName(e.target.value);}} style={dinp} placeholder="Jane Kim"/></div>
            <div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Phone *</label><input value={gPhone} onChange={function(e){setGPhone(e.target.value);}} style={dinp} placeholder="(209) 555-0100"/></div>
          </div>
          <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Business Name *</label><input value={gBiz} onChange={function(e){setGBiz(e.target.value);}} style={dinp} placeholder="Pacific Kitchen"/></div>
          <div style={{marginBottom:14}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5,display:"block",marginBottom:3}}>Email *</label><input value={gEmail} onChange={function(e){setGEmail(e.target.value);}} style={dinp} placeholder="jane@restaurant.com"/></div>
          {gateBlocked&&<div style={{background:E.redBg,border:"1px solid "+E.red,borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:"0.78rem",color:E.red}}>Competitor domains are not eligible for this tool.</div>}
          {/* Preview tags */}
          <div style={{background:E.w,borderRadius:10,padding:"12px 14px",border:"1px solid "+E.g2,marginBottom:14}}>
            <div style={{fontSize:"0.66rem",fontWeight:700,color:E.gold,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>You'll answer 12 questions covering</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["HACCP Plan","CFPM on Staff","Food Handler Cards","Receiving Temps","Temp Logging","Cooling Procedure","Hood Certificate","Fire Suppression","Extinguishers","Pest Control","Grease Trap","Thermometer Calibration"].map(function(tag){return <span key={tag} style={{padding:"2px 8px",borderRadius:100,fontSize:"0.68rem",fontWeight:600,background:E.bluePale,color:E.navy}}>{tag}</span>;})}</div>
          </div>
          <button disabled={!gateReady||gateBlocked} onClick={handleGate} style={Object.assign({},bN,{width:"100%",opacity:gateReady&&!gateBlocked?1:0.4,padding:"12px",fontSize:"0.9rem"})}>Know Where I Stand →</button>
          <p style={{textAlign:"center",fontSize:"0.72rem",color:E.g4,marginTop:8}}>Takes 2 minutes. Results sent to {gEmail||"your inbox"}.</p>
        </div>
        {/* Blurred preview */}
        <div style={{position:"relative",overflow:"hidden"}}>
          <div style={{padding:"14px 24px 18px",borderTop:"1px solid "+E.g2,filter:"blur(5px)",pointerEvents:"none",userSelect:"none",opacity:0.45}}>
            {items.slice(0,4).map(function(item,i){var rc=item.risk==="critical"?E.red:item.risk==="high"?E.wrn:E.g3;return(
              <div key={i} style={{marginBottom:10,padding:"12px 14px",borderRadius:10,border:"1px solid "+E.g2,background:E.w,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                <div style={{flex:1}}><span style={{fontSize:"0.82rem",fontWeight:600,color:E.g8}}>{item.q}</span><span style={{display:"inline-block",marginLeft:8,padding:"1px 7px",borderRadius:100,background:rc+"20",color:rc,fontSize:"0.63rem",fontWeight:700,textTransform:"uppercase"}}>{item.risk}</span></div>
                <div style={{display:"flex",gap:6}}><span style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+E.g2,fontSize:"0.75rem",color:E.g5,fontWeight:700}}>Yes</span><span style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+E.g2,fontSize:"0.75rem",color:E.g5,fontWeight:700}}>No</span></div>
              </div>
            );})}
          </div>
          <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(to bottom,rgba(255,255,255,0.1),rgba(250,248,244,0.95))"}}>
            <div style={{textAlign:"center",padding:"12px 20px",background:E.w,borderRadius:12,border:"1px solid "+E.g2,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}><div style={{fontSize:"1.2rem",marginBottom:4}}>🔒</div><p style={{fontSize:"0.8rem",fontWeight:700,color:E.navy,margin:0}}>Enter your info above to unlock</p></div>
          </div>
        </div>
      </div>
      )}

      {/* STEP 2 — CHECKLIST UNLOCKED */}
      {unlocked&&!done&&(
      <div style={{background:E.cream,borderRadius:16,border:"1px solid "+E.g2,overflow:"hidden"}}>
        <div style={{padding:"14px 24px",borderBottom:"1px solid "+E.g2,background:E.w,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:E.gold,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:"0.75rem",fontWeight:800,color:E.w}}>2</span></div>
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:E.navy}}>Answer honestly — this is your kitchen</div>
              <div style={{fontSize:"0.72rem",color:E.g5}}>Calibrated for {c.agencyShort} · Results go to {gEmail}</div>
            </div>
          </div>
          <div style={{fontSize:"0.72rem",fontWeight:700,color:E.g5}}>{answered}/12</div>
        </div>
        {/* Progress */}
        <div style={{height:3,background:E.g2}}><div style={{height:"100%",background:E.gold,width:(answered/items.length*100)+"%",transition:"width 0.3s"}}/></div>
        <div style={{padding:"16px 24px"}}>
          {items.map(function(item,i){var ans=answers[i];var rc=item.risk==="critical"?E.red:item.risk==="high"?E.wrn:E.g4;return(
            <div key={i} style={{marginBottom:10,padding:"14px 16px",borderRadius:10,border:"1px solid "+(ans==="no"?rc:ans==="yes"?E.grn:E.g2),background:ans==="no"?E.redBg:ans==="yes"?E.grnBg:E.w,transition:"all 0.2s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}>
                  <span style={{fontSize:"0.84rem",fontWeight:600,color:E.g8,lineHeight:1.5}}>{item.q}</span>
                  <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                    <RiskBadge risk={item.risk}/>
                    <span style={{fontSize:"0.68rem",color:E.g4,fontFamily:"monospace"}}>{item.code}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={function(){setAnswers(Object.assign({},answers,{[i]:"yes"}));}} style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+(ans==="yes"?E.grn:E.g2),background:ans==="yes"?E.grn:"transparent",color:ans==="yes"?E.w:E.g5,fontWeight:700,fontSize:"0.75rem"}}>Yes</button>
                  <button onClick={function(){setAnswers(Object.assign({},answers,{[i]:"no"}));}} style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+(ans==="no"?E.red:E.g2),background:ans==="no"?E.red:"transparent",color:ans==="no"?E.w:E.g5,fontWeight:700,fontSize:"0.75rem"}}>No</button>
                </div>
              </div>
              {ans==="no"&&<div style={{fontSize:"0.75rem",color:rc,fontStyle:"italic",marginTop:6,lineHeight:1.5}}>{item.why}</div>}
            </div>
          );})}

          {/* Running risk summary */}
          {answered>=6&&(
          <div style={{background:critGaps.length>0?E.redBg:highGaps.length>0?E.wrnBg:E.grnBg,border:"1px solid "+(critGaps.length>0?E.red:highGaps.length>0?E.wrn:E.grn),borderRadius:12,padding:"12px 14px",marginBottom:12,textAlign:"center"}}>
            <div style={{fontSize:"1rem",fontWeight:800,color:critGaps.length>0?E.red:highGaps.length>0?"#92400e":"#065f46",marginBottom:2}}>
              {critGaps.length>0?critGaps.length+" Critical Gap"+(critGaps.length>1?"s":"")+" Found":highGaps.length>0?highGaps.length+" High-Risk Gap"+(highGaps.length>1?"s":"")+" Found":gaps.length===0?"Looking Good":"Minor Gaps Only"}
            </div>
            <div style={{fontSize:"0.76rem",color:E.g5}}>{critGaps.length>0?"These are inspection failure risks in "+c.name+" County.":highGaps.length>0?"Address before your next inspection.":"Keep going."}</div>
          </div>
          )}

          {/* Submit */}
          {allAnswered&&(
          <div style={{borderTop:"1px solid "+E.g2,paddingTop:16,marginTop:4,textAlign:"center"}}>
            <p style={{fontSize:"0.84rem",color:E.g6,marginBottom:12}}>All 12 done. We'll send your full results with CalCode references to <strong>{gEmail}</strong>.</p>
            <button onClick={submitResults} style={Object.assign({},bN,{padding:"12px 28px",fontSize:"0.9rem"})}>Send My Results →</button>
          </div>
          )}
        </div>
      </div>
      )}

      {/* STEP 3 — RESULTS */}
      {done&&outcome&&(
      <div id="results">
        {/* Outcome banner */}
        <div style={{borderRadius:16,border:"2px solid "+(outcome.pass?E.grn:E.red),padding:"24px",background:outcome.pass?E.grnBg:E.redBg,marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:outcome.pass?"#065f46":"#991b1b",marginBottom:6}}>Estimated Outcome — {c.name} County</div>
          <div style={{fontSize:"2rem",fontWeight:800,color:outcome.pass?"#065f46":"#991b1b",lineHeight:1,marginBottom:6}}>{outcome.label}</div>
          {outcome.type==="pts"&&<div style={{fontSize:"0.84rem",color:outcome.pass?"#065f46":"#991b1b",opacity:0.8}}>Point exposure: {outcome.val} pts</div>}
          {outcome.type==="score"&&<div style={{fontSize:"0.84rem",color:outcome.pass?"#065f46":"#991b1b",opacity:0.8}}>Estimated score: {outcome.val} / 100</div>}
          {outcome.type==="count"&&<div style={{fontSize:"0.84rem",color:outcome.pass?"#065f46":"#991b1b",opacity:0.8}}>Major violation exposure: {outcome.val}</div>}
          {outcome.type==="reinspect"&&<div style={{fontSize:"0.84rem",color:outcome.pass?"#065f46":"#991b1b",opacity:0.8}}>{outcome.val===0?"No reinspection triggers found":outcome.val+" reinspection trigger"+(outcome.val>1?"s":"")+" found"}</div>}
          <p style={{fontSize:"0.78rem",color:E.g5,marginTop:10,marginBottom:0}}>Full results with CalCode references sent to <strong>{gEmail}</strong></p>
        </div>

        {/* Gap breakdown */}
        {gaps.length>0&&(
        <div style={{background:E.w,borderRadius:14,border:"1px solid "+E.g2,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid "+E.g2,background:E.redBg}}>
            <div style={{fontSize:"0.68rem",fontWeight:700,color:E.red,textTransform:"uppercase",letterSpacing:1}}>{gaps.length} Gap{gaps.length>1?"s":""} Found — {c.name} County</div>
          </div>
          <div style={{padding:"12px 18px"}}>
            {gaps.map(function(item,i){var rc=item.risk==="critical"?E.red:item.risk==="high"?E.wrn:E.g4;return(
              <div key={i} style={{padding:"12px 0",borderBottom:i<gaps.length-1?"1px solid "+E.g2:"none"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <span style={{fontSize:"0.9rem",marginTop:1,flexShrink:0}}>❌</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.84rem",fontWeight:700,color:E.navy,marginBottom:4}}>{item.q}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:4,alignItems:"center"}}>
                      <RiskBadge risk={item.risk}/>
                      <span style={{fontSize:"0.7rem",color:E.g4,fontFamily:"monospace"}}>{item.code}</span>
                    </div>
                    <div style={{fontSize:"0.78rem",color:rc,lineHeight:1.6}}>{item.why}</div>
                  </div>
                </div>
              </div>
            );})}
          </div>
        </div>
        )}

        {/* Passing items */}
        {gaps.length<items.length&&(
        <div style={{background:E.w,borderRadius:12,border:"1px solid "+E.g2,overflow:"hidden",marginBottom:20}}>
          <div style={{padding:"12px 18px",borderBottom:"1px solid "+E.g2,background:E.grnBg}}>
            <div style={{fontSize:"0.68rem",fontWeight:700,color:"#065f46",textTransform:"uppercase",letterSpacing:1}}>{items.length-gaps.length} Item{items.length-gaps.length>1?"s":""} Passing</div>
          </div>
          <div style={{padding:"10px 18px"}}>
            {items.filter(function(item,i){return answers[i]==="yes";}).map(function(item,i){return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid "+E.g1}}>
                <span style={{color:E.grn,fontSize:"0.85rem",flexShrink:0}}>✓</span>
                <span style={{fontSize:"0.82rem",color:E.g6}}>{item.q}</span>
                <span style={{fontSize:"0.68rem",color:E.g4,fontFamily:"monospace",marginLeft:"auto"}}>{item.code}</span>
              </div>
            );})}
          </div>
        </div>
        )}

        {/* CTA */}
        <div style={{background:"linear-gradient(135deg,"+E.navyD+","+E.navy+")",borderRadius:16,padding:"28px 24px",textAlign:"center"}}>
          <Logo s="1.2rem" light tagline/>
          <h3 style={{fontSize:"1.1rem",fontWeight:800,color:E.w,margin:"12px 0 8px",lineHeight:1.3}}>{gaps.length>0?"Fix these gaps — then track them daily.":"Keep it this way — automatically."}</h3>
          <p style={{fontSize:"0.84rem",color:"rgba(255,255,255,0.55)",maxWidth:420,margin:"0 auto 20px",lineHeight:1.6}}>{gaps.length>0?"EvidLY tracks every item on this check in real time — so you know where you stand every day, not just when an inspector shows up.":"EvidLY keeps your "+c.name+" County documentation current every day — temperatures, certs, hood records, fire safety, all of it."}</p>
          <button onClick={openCalendly} style={Object.assign({},bG,{padding:"12px 28px",fontSize:"0.9rem"})}>Book a 45-Min Demo →</button>
          <p style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.25)",marginTop:10}}>$99/mo founder pricing · Launching May 5, 2026</p>
        </div>
      </div>
      )}
    </div>
  </section>

  {/* ═══ VENDORS ═══ */}
  <section id="vendors" style={{padding:"56px 24px",background:E.cream,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <SL t="Need Help Closing Gaps?"/>
      <h2 style={{fontSize:"clamp(1.1rem,3vw,1.6rem)",fontWeight:800,color:E.navy,margin:"0 0 6px"}}>EvidLY Verified vendors in {c.name} County</h2>
      <p style={{fontSize:"0.84rem",color:E.g5,marginBottom:20}}>Vendors meet licensing, insurance, and certification requirements. Request a quote — response within 1 business day.</p>

      {/* CPP */}
      <div style={{background:"linear-gradient(135deg,"+E.navy+","+E.navyL+")",borderRadius:14,padding:"20px",marginBottom:12,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,background:E.gold,padding:"3px 14px",borderRadius:"0 14px 0 10px",fontSize:"0.62rem",fontWeight:800,color:E.navy,textTransform:"uppercase",letterSpacing:0.5}}>EvidLY Anchor Vendor</div>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
              <span style={{fontWeight:800,fontSize:"0.92rem",color:E.w}}>Cleaning Pros Plus</span>
              <span style={{padding:"2px 7px",borderRadius:100,background:E.gold,color:E.navy,fontSize:"0.62rem",fontWeight:800,textTransform:"uppercase"}}>IKECA Certified</span>
              <span style={{padding:"2px 7px",borderRadius:100,background:"rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.8)",fontSize:"0.62rem",fontWeight:700}}>Veteran Owned</span>
            </div>
            <div style={{fontSize:"0.8rem",color:"rgba(255,255,255,0.65)",marginBottom:6,lineHeight:1.6}}>Hood cleaning · Exhaust cleaning · IKECA Member #76716495 · NFPA 96 compliant · Serving {c.name} County</div>
            <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.5)"}}>📞 (209) 636-6116</div>
          </div>
          <a className="btn" href="tel:2096366116" style={{padding:"9px 18px",fontSize:"0.8rem",fontWeight:700,background:E.gold,color:E.navy,borderRadius:8,textDecoration:"none",whiteSpace:"nowrap",alignSelf:"center"}}>Call Now →</a>
        </div>
      </div>

      {/* Filta */}
      {isFilta&&(
      <div style={{background:E.w,borderRadius:12,padding:"18px",border:"1px solid "+E.g2,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap",position:"relative"}}>
        <div style={{position:"absolute",top:0,right:0,background:E.navy,padding:"3px 10px",borderRadius:"0 12px 0 8px",fontSize:"0.6rem",fontWeight:700,color:E.w,textTransform:"uppercase"}}>EvidLY Verified</div>
        <div>
          <div style={{fontWeight:700,fontSize:"0.88rem",color:E.navy,marginBottom:4}}>Filta — Cooking Oil &amp; Fryer Service</div>
          <div style={{fontSize:"0.78rem",color:E.g6,marginBottom:4}}>Oil recycling · Fryer management · Regular service schedules · {c.name} County</div>
          <div style={{fontSize:"0.72rem",color:E.g5}}>📞 (209) 733-9433</div>
        </div>
        <a className="btn" href="tel:2097339433" style={{padding:"8px 16px",fontSize:"0.78rem",fontWeight:700,background:E.navy,color:E.w,borderRadius:8,textDecoration:"none",whiteSpace:"nowrap"}}>Call Now →</a>
      </div>
      )}

      {/* Open slots */}
      {[{cat:"Fire Suppression Service",note:"Semi-annual NFPA 17A service required"},{cat:"Pest Control",note:"Documentation required under §114259"},{cat:"Equipment Repair & Calibration",note:"Thermometer calibration required under §114157"}].map(function(slot){return(
        <div key={slot.cat} style={{background:E.w,borderRadius:10,padding:"14px 16px",border:"1px dashed "+E.g3,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div>
            <div style={{fontSize:"0.82rem",fontWeight:700,color:E.g5,marginBottom:1}}>{slot.cat}</div>
            <div style={{fontSize:"0.72rem",color:E.g4}}>{slot.note}</div>
          </div>
          <a className="btn" href={"mailto:founders@getevidly.com?subject="+encodeURIComponent("Vendor Referral: "+slot.cat+" — "+c.name+" County")} style={{padding:"7px 14px",fontSize:"0.76rem",fontWeight:700,background:S.grn,color:E.w,borderRadius:8,textDecoration:"none",whiteSpace:"nowrap"}}>Get Referral →</a>
        </div>
      );})}
    </div>
  </section>

  {/* ═══ FAQ ═══ */}
  <section id="faq" style={{padding:"56px 24px",background:E.w,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:680,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:28}}><SL t={c.name+" County FAQ"}/><h2 style={{fontSize:"clamp(1.1rem,3vw,1.6rem)",fontWeight:800,color:E.navy,margin:0}}>Common questions about this checklist</h2></div>
      {c.faq.map(function(item,i){return(
        <div key={i} style={{borderBottom:"1px solid "+E.g2}}>
          <button onClick={function(){setFaqOpen(faqOpen===i?null:i);}} style={{width:"100%",textAlign:"left",background:"none",padding:"16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <span style={{fontSize:"0.88rem",fontWeight:700,color:E.navy,lineHeight:1.4}}>{item.q}</span>
            <span style={{color:S.grn,fontSize:"1.1rem",flexShrink:0,fontWeight:700}}>{faqOpen===i?"−":"+"}</span>
          </button>
          {faqOpen===i&&<p style={{fontSize:"0.84rem",color:E.g6,lineHeight:1.7,paddingBottom:16,margin:0}}>{item.a}</p>}
        </div>
      );})}
    </div>
  </section>

  {/* ═══ CROSS-LINKS ═══ */}
  <section style={{padding:"32px 24px",background:E.cream,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:680,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
        {[
          {href:"/"+c.landingSlug,label:"EvidLY for "+c.name+" County",desc:"Track your score daily. Food safety + facility safety. Configured for "+c.agencyShort+".",cta:"Learn More →",color:E.navy},
          {href:"/scoretable/"+c.stSlug,label:"ScoreTable — "+c.name+" County",desc:"Full "+c.agencyShort+" inspection methodology — scoring weights, thresholds, and what the numbers mean.",cta:"View Methodology →",color:S.grn},
          {href:"/kitchen-to-community",label:"Kitchen to Community",desc:"Every EvidLY subscription funds ~100 meals per location per month.",cta:"Learn More →",color:E.gold},
        ].map(function(link){return(
          <a key={link.href} href={link.href} className="btn" style={{textDecoration:"none",background:E.w,borderRadius:12,padding:"16px",border:"1px solid "+E.g2,display:"block"}}>
            <div style={{fontSize:"0.6rem",fontWeight:800,textTransform:"uppercase",letterSpacing:1.5,color:link.color,marginBottom:6}}>{link.label}</div>
            <p style={{fontSize:"0.78rem",color:E.g6,lineHeight:1.6,marginBottom:8}}>{link.desc}</p>
            <span style={{fontSize:"0.76rem",fontWeight:700,color:link.color}}>{link.cta}</span>
          </a>
        );})}
      </div>
    </div>
  </section>

  {/* FOOTER */}
  <footer style={{padding:"36px 24px 20px",background:"#2C3E5C"}}>
    <div style={{maxWidth:960,margin:"0 auto",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:24}}>
      <div>
        <div style={{marginBottom:8}}><Logo s="0.95rem" light tagline/></div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}><STIcon sz={16}/><STLogo s="0.78rem" light/></div>
        <p style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.35)",marginTop:6,lineHeight:1.5}}>Serving {c.name} County, California.</p>
      </div>
      <div><h4 style={{fontSize:"0.68rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Kitchen Check</h4>{["All Counties","How It Works","About"].map(function(l){return <a key={l} href="#" className="btn" style={{display:"block",fontSize:"0.74rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>{l}</a>;})}</div>
      <div><h4 style={{fontSize:"0.68rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>EvidLY</h4>{["Product","Pricing","Book a Demo"].map(function(l){return <a key={l} href="#" className="btn" style={{display:"block",fontSize:"0.74rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>{l}</a>;})}</div>
      <div><h4 style={{fontSize:"0.68rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Contact</h4><a href="mailto:founders@getevidly.com" className="btn" style={{display:"block",fontSize:"0.74rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>founders@getevidly.com</a><a href="tel:8553843591" className="btn" style={{display:"block",fontSize:"0.74rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>(855) EVIDLY1</a><a href="tel:2096007675" className="btn" style={{display:"block",fontSize:"0.74rem",color:"rgba(255,255,255,0.5)",textDecoration:"none"}}>(209) 600-7675</a></div>
    </div>
    <div style={{maxWidth:960,margin:"14px auto 0",paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <span style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.25)"}}>© 2026 EvidLY, LLC. Kitchen Check is a free public resource. Calibrated for {c.agencyShort}.</span>
      <div style={{display:"flex",gap:14}}>{["Privacy","Terms","Cookies"].map(function(l){return <a key={l} href="#" className="btn" style={{fontSize:"0.66rem",color:"rgba(255,255,255,0.3)",textDecoration:"none"}}>{l}</a>;})}</div>
    </div>
  </footer>

  </div>);
}
