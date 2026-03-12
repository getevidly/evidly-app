import { useState } from "react";

// ── PRODUCTION COLOR TOKENS ───────────────────────────────────────────────────
const NAVY="#1E2D4D",GOLD="#A08C5A",BODY="#1E2D4D",MUTED="#6B7F96",SB="#07111F",SBT="#94a3b8",PBG="#F4F6FA";
const STEEL="linear-gradient(135deg,#1E2D4D 0%,#152340 60%,#243560 100%)";
const RBKG="linear-gradient(135deg,#2D0A00,#6B1A0A,#3D1208)";
const FF={fontFamily:"system-ui,-apple-system,sans-serif"};
const BG={ok:{background:"#f0fdf4",color:"#166534"},wn:{background:"#fffbeb",color:"#92400e"},er:{background:"#fef2f2",color:"#991b1b"},in:{background:"#f0f4ff",color:"#3730a3"},gy:{background:"#f1f5f9",color:"#475569"}};

// ── PRIMITIVES ────────────────────────────────────────────────────────────────
const Dot=({c})=><span style={{width:8,height:8,borderRadius:"50%",background:c,display:"inline-block",flexShrink:0}}/>;
const Pill=({p,t})=><span style={{...BG[p]||BG.gy,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,whiteSpace:"nowrap"}}>{t}</span>;
const Btn=({l,d,o,s,oc})=><button onClick={oc} style={{background:d?"#DC2626":o?"white":NAVY,color:o?NAVY:"white",border:o?`1.5px solid ${NAVY}`:"none",borderRadius:6,padding:s?"4px 10px":"7px 14px",fontSize:s?10:11,fontWeight:700,cursor:"pointer",flexShrink:0,...FF}}>{l}</button>;
const Row=({bg,children})=><div style={{display:"flex",alignItems:"center",gap:9,padding:"9px 13px",borderBottom:"1px solid #f9fafb",background:bg||"white",...FF}}>{children}</div>;
const Card=({t,a,onA,children})=><div style={{background:"white",border:"1px solid #E5E7EB",borderRadius:8,overflow:"hidden",marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 13px",borderBottom:"1px solid #F3F4F6"}}><span style={{fontSize:12,fontWeight:700,color:BODY,...FF}}>{t}</span>{a&&<span onClick={()=>onA?.(a)} style={{fontSize:11,color:NAVY,fontWeight:600,cursor:"pointer",...FF}}>{a} →</span>}</div>{children}</div>;
const SBar=({s})=><div style={{display:"grid",gridTemplateColumns:`repeat(${s.length},1fr)`,gap:8,marginBottom:10}}>{s.map(([l,v,c],i)=><div key={i} style={{background:"white",border:"1px solid #E5E7EB",borderRadius:8,padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5,...FF}}>{l}</div><div style={{fontSize:20,fontWeight:900,color:c||NAVY,...FF}}>{v}</div></div>)}</div>;

// ── ACTION PANEL ──────────────────────────────────────────────────────────────
const gp=(cta,{primary:nm="",secondary:inf=""})=>{
  const n=(nm||"").split(" — ")[0];
  if(/Log Now|Log Again|\+ Log Temp/.test(cta)) return{t:`Log Temperature — ${n||"Select Unit"}`,f:{l:"Temperature (°F)",type:"number",ph:"e.g. 38.5"},p:"Save Reading"};
  if(/Schedule/.test(cta)) return{t:`Schedule Service — ${n}`,i:inf||"",f:{l:"Preferred Date",type:"date"},p:"Request Service"};
  if(/View|Manage/.test(cta)) return{t:n||"Detail",i:inf||"",rows:[["d","📋","View Full History",null,"in","Records"],["d","✏️","Add Note / Comment",null,null,null,"Add"],["d","📊","Generate Report",null,null,null,"Export"]],p:"Close"};
  if(/Contact/.test(cta)) return{t:`Contact — ${n}`,rows:[["d","📞","Call Vendor",null,null,null,"Call"],["d","📧","Send Email",null,null,null,"Email"],["d","📄","View COI",null,"ok","Current"]],p:"Close"};
  if(/Edit/.test(cta)) return{t:`Edit — ${n}`,f:{l:"Name",ph:n||""},p:"Save Changes"};
  if(/Start/.test(cta)) return{t:`Start — ${n}`,i:"Complete each item and submit when done.",f:{l:"Assign to Location",type:"select",opts:["Main Kitchen"]},p:"Begin"};
  if(/Use/.test(cta)) return{t:`Use Template — ${n}`,f:{l:"Location",type:"select",opts:["Main Kitchen"]},p:"Create Checklist"};
  if(/Invite/.test(cta)) return{t:"Invite Team Member",f:{l:"Email Address",type:"email",ph:"email@yourorganization.com"},p:"Send Invite"};
  if(/Upload/.test(cta)) return{t:"Upload Document",f:{l:"Document Type",type:"select",opts:["HACCP Plan","Certificate","COI","Permit","Contract","Other"]},p:"Upload"};
  if(/Download|Export|Generate/.test(cta)) return{t:"Export Report",f:{l:"Format",type:"select",opts:["PDF","CSV","Excel"]},p:"Download"};
  if(/Report Issue|Report New/.test(cta)) return{t:"Report an Issue",f:{l:"Issue Type",type:"select",opts:["Food Safety","Equipment","Pest Activity","Injury / Near Miss","Other"]},p:"Submit Report"};
  if(/Add Record/.test(cta)) return{t:"Add Training Record",f:{l:"Certification Type",type:"select",opts:["Food Handler Card","Food Manager (CFPM)","HACCP Level 2","ServSafe","Other"]},p:"Save"};
  if(/Add Location/.test(cta)) return{t:"Add Location",f:{l:"Location Name",ph:"e.g. North Kitchen"},p:"Add Location"};
  if(/Add/.test(cta)) return{t:cta,f:{l:"Name",ph:"Enter name…"},p:"Add"};
  if(/Mark All/.test(cta)) return{t:"Mark All Alerts Read",i:"This will mark all active alerts as acknowledged.",p:"Confirm"};
  if(/Get Started/.test(cta)) return{t:"Get Started",i:"Add your first location to begin.",f:{l:"Location Name",ph:"e.g. Main Kitchen"},p:"Add Location"};
  return{t:nm||cta,i:inf||"",p:"OK"};
};

function AP({cfg,onClose}){
  if(!cfg) return null;
  const F=cfg.f;
  return <>
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50}}/>
    <div style={{position:"absolute",bottom:0,left:0,right:0,background:"white",borderRadius:"12px 12px 0 0",zIndex:51,...FF}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:"1px solid #F3F4F6"}}>
        <span style={{fontSize:13,fontWeight:700,color:BODY,...FF}}>{cfg.t}</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:MUTED,lineHeight:1}}>✕</button>
      </div>
      <div style={{padding:"12px 14px",maxHeight:280,overflowY:"auto"}}>
        {cfg.i&&<div style={{background:"#F8FAFC",borderRadius:6,padding:"9px 11px",marginBottom:12,fontSize:11,color:MUTED,lineHeight:1.5,...FF}}>{cfg.i}</div>}
        {F&&<div style={{marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:MUTED,marginBottom:4,...FF}}>{F.l}</div>
          {F.type==="select"
            ?<select style={{width:"100%",padding:"8px 10px",border:"1px solid #E5E7EB",borderRadius:6,fontSize:12,...FF}}>{F.opts?.map(o=><option key={o}>{o}</option>)}</select>
            :<input type={F.type||"text"} placeholder={F.ph||""} style={{width:"100%",padding:"8px 10px",border:"1px solid #E5E7EB",borderRadius:6,fontSize:12,...FF}}/>
          }
        </div>}
        {cfg.rows?.map((r,i)=>{
          const[,icon,primary,secondary,bp,bt]=r;
          return <div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 0",borderBottom:"1px solid #f9fafb",...FF}}>
            <span style={{fontSize:14,flexShrink:0}}>{icon}</span>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:BODY}}>{primary}</div>{secondary&&<div style={{fontSize:10,color:MUTED}}>{secondary}</div>}</div>
            {bp&&bt&&<span style={{...BG[bp]||BG.gy,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700}}>{bt}</span>}
            {r[6]&&<button onClick={onClose} style={{fontSize:10,color:NAVY,fontWeight:600,background:"none",border:"1px solid #E5E7EB",borderRadius:5,padding:"3px 9px",cursor:"pointer",...FF}}>{r[6]}</button>}
          </div>;
        })}
      </div>
      <div style={{padding:"10px 14px 14px",display:"flex",gap:8,justifyContent:"flex-end",borderTop:"1px solid #F3F4F6"}}>
        <Btn l="Cancel" o oc={onClose}/>
        {cfg.p&&<Btn l={cfg.p} oc={onClose}/>}
      </div>
    </div>
  </>;
}

function Banner({type,st,h,s}){
  if(type==="n") return <div style={{background:STEEL,borderRadius:10,padding:"15px 17px",color:"white",marginBottom:12}}><div style={{fontSize:15,fontWeight:700,...FF}}>{h}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:2,...FF}}>{s}</div><div style={{height:2,background:GOLD,width:"40%",marginTop:9,borderRadius:2}}/></div>;
  const r=st==="r",a=st==="a";
  const sc=r?"#fc8181":a?"#FCD34D":GOLD;
  const sl=r?"!  Action required":a?"⚠  Needs attention":"✓  You're covered";
  return <div style={{background:r?RBKG:STEEL,borderRadius:10,padding:"15px 17px",color:"white",marginBottom:12}}><div style={{fontSize:9,fontWeight:800,color:sc,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:5,...FF}}>{sl}</div><div style={{fontSize:15,fontWeight:700,lineHeight:1.3,marginBottom:3,...FF}}>{h}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",...FF}}>{s}</div><div style={{height:2,background:GOLD,width:"40%",marginTop:9,borderRadius:2}}/></div>;
}

function renderRow(row,i,oa){
  if(row[0]==="!"){
    const crit=row[1]==="c";
    return <Row key={i} bg={crit?"#fef2f2":"white"}><span style={{fontSize:12}}>{crit?"🔴":"🟡"}</span><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:crit?"#991b1b":BODY,...FF}}>{row[2]}</div><div style={{fontSize:10,color:MUTED,...FF}}>{row[3]}</div></div><Btn l="View" s o oc={()=>oa?.("View",{primary:row[2],secondary:row[3]})}/></Row>;
  }
  if(row[0]==="~"){
    return <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7,...FF}}><span style={{fontSize:11,color:MUTED,width:160,flexShrink:0}}>{row[1]}</span><div style={{flex:1,height:7,background:"#F3F4F6",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${row[2]}%`,background:row[3]||"#166534",borderRadius:3}}/></div><span style={{fontSize:11,fontWeight:700,color:row[3]||"#166534",width:32,textAlign:"right"}}>{row[2]}%</span></div>;
  }
  if(row[0]==="?"){
    const ok=row[2];
    return <Row key={i}><span style={{color:ok?"#16a34a":"#dc2626",fontWeight:700,fontSize:14}}>{ok?"✓":"✕"}</span><div style={{flex:1,fontSize:12,color:ok?BODY:"#991b1b",fontWeight:ok?400:600,...FF}}>{row[1]}</div>{!ok&&<Pill p="er" t="Missing"/>}</Row>;
  }
  if(row[0]==="t"){
    const s=row[2],dc={done:"#16a34a",over:"#dc2626",prog:GOLD,pend:"#d1d5db"}[s]||"#d1d5db";
    return <Row key={i} bg={s==="over"?"#fef2f2":"white"}><Dot c={dc}/><div style={{flex:1}}><div style={{fontSize:12,color:s==="done"?"#9ca3af":BODY,textDecoration:s==="done"?"line-through":"none",...FF}}>{row[1]}</div>{row[3]&&<div style={{fontSize:10,color:MUTED,...FF}}>{row[3]}</div>}</div><span onClick={()=>oa?.("View",{primary:row[1],secondary:row[3]})} style={{fontSize:10,color:NAVY,fontWeight:600,cursor:"pointer",...FF}}>View →</span></Row>;
  }
  const[,icon,primary,secondary,bp,bt,cta]=row;
  return <Row key={i}><span style={{fontSize:icon?.length>2?11:14,fontWeight:icon?.length>2?800:400,color:icon?.length>2?NAVY:"inherit",flexShrink:0}}>{icon||"📄"}</span><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:BODY,...FF}}>{primary}</div>{secondary&&<div style={{fontSize:10,color:MUTED,...FF}}>{secondary}</div>}</div>{bp&&bt&&<Pill p={bp} t={bt}/>}{cta&&<Btn l={cta} s o oc={()=>oa?.(cta,{primary,secondary})}/>}</Row>;
}

function renderCard(card,i,oa){
  const[title,action,...rows]=card;
  if(!rows.length) return null;
  const isProg=rows[0][0]==="~";
  return <Card key={i} t={title} a={action||null} onA={cta=>oa?.(cta,{primary:"",secondary:""})}>
    {isProg?<div style={{padding:"12px 13px 6px"}}>{rows.map((r,j)=>renderRow(r,j,oa))}</div>:rows.map((r,j)=>renderRow(r,j,oa))}
  </Card>;
}

// ── PAGE DATA ─────────────────────────────────────────────────────────────────
const PD={
  checklists:[
    {type:"n",h:"Checklists",s:"Main Kitchen · March 11, 2026"},
    [["Completed","1","#16a34a"],["In Progress","1",GOLD],["Not Started","1",MUTED],["Overdue","0","#16a34a"]],
    ["Today's Checklists","New Checklist",
      ["d","✅","Opening Checklist","12/12 items · 6:15 AM","ok","Done"],
      ["d","🔄","Midday Checklist","4/8 items · 12:02 PM","wn","In Progress"],
      ["d","⭕","Closing Checklist","0/10 items · Due 10 PM","gy","Pending"],
    ],
    ["Templates",null,
      ["d","📋","Opening Checklist",null,null,null,"Use"],
      ["d","📋","Midday Checklist",null,null,null,"Use"],
      ["d","📋","Closing Checklist",null,null,null,"Use"],
    ],
  ],
  temperatures:[
    {type:"n",h:"Temperature Readings",s:"Main Kitchen · March 11, 2026"},
    [["Units","5"],["In Range","4","#16a34a"],["Needs Log","1","#92400e"],["Alerts","0","#16a34a"]],
    ["Current Readings","Log Manual",
      ["d","🟢","Walk-in Cooler #1","IoT · 35–41°F · 2 min ago","ok","37.8°F"],
      ["d","🟢","Walk-in Cooler #2","IoT · 35–41°F · 2 min ago","ok","39.5°F"],
      ["d","🟢","Walk-in Freezer","IoT · < 0°F · 2 min ago","ok","−2.1°F"],
      ["d","🟢","Hot Hold Unit","IoT · > 135°F · 2 min ago","ok","141°F"],
      ["d","🟡","Prep Cooler","Manual · Log needed","wn","—","Log Now"],
    ],
    ["Today's Log History","Export",
      ["d","📝","Walk-in Cooler #1 · 37.8°F","Auto (IoT) · 2:04 PM","ok","OK"],
      ["d","📝","Prep Cooler · 38.6°F","Maria R. · 11:45 AM","ok","OK"],
    ],
  ],
  "temp-logs":[
    {type:"n",h:"Log Temperature",s:"Main Kitchen · March 11, 2026"},
    ["Select Unit",null,
      ["d","🟡","Prep Cooler","Last log: 11:45 AM","wn","Log Needed","Log Now"],
      ["d","🟢","Walk-in Cooler #1","Last: 2:04 PM (Auto)","ok","Current","Log Again"],
      ["d","🟢","Walk-in Cooler #2","Last: 2:04 PM (Auto)","ok","Current","Log Again"],
      ["d","🟢","Walk-in Freezer","Last: 2:04 PM (Auto)","ok","Current","Log Again"],
    ],
  ],
  haccp:[
    {type:"n",h:"HACCP",s:"Main Kitchen · Fresno, CA"},
    [["CCPs","5"],["Monitored","5","#16a34a"],["Deviations","0","#16a34a"],["Plan","Active","#166534"]],
    ["Critical Control Points",null,
      ["d","CCP-1","Receiving — Pathogen growth","Limit: ≤41°F on delivery","ok","✓ Met"],
      ["d","CCP-2","Cold Storage — Pathogen growth","Limit: ≤41°F at all times","ok","✓ Met"],
      ["d","CCP-3","Cooking — Pathogen survival","Limit: ≥165°F internal temp","ok","✓ Met"],
      ["d","CCP-4","Hot Holding — Pathogen growth","Limit: ≥135°F","ok","✓ Met"],
      ["d","CCP-5","Cooling — Pathogen growth","Limit: 140°F→70°F in 2 hr","ok","✓ Met"],
    ],
  ],
  corrective:[
    {type:"n",h:"Corrective Actions",s:"Main Kitchen · Fresno, CA"},
    [["Open","1","#dc2626"],["In Progress","1",GOLD],["Resolved/Mo","4","#16a34a"],["Avg Resolution","1.8d"]],
    ["Corrective Actions","Add New",
      ["!","w","Prep cooler temp log gaps this week","CA-013 · Due Mar 15"],
    ],
  ],
  incidents:[
    {type:"n",h:"Incidents",s:"Main Kitchen · Fresno, CA"},
    [["Open","1","#dc2626"],["Resolved/Mo","3","#16a34a"],["Avg Resolution","1.4d"],["Critical","0","#16a34a"]],
    ["Active Incidents","Report New",
      ["!","w","Walk-in cooler door seal damaged","INC-024 · Main Kitchen · Mar 10"],
    ],
    ["Recently Resolved",null,
      ["d","✅","Walk-in temp spike (recovered)",null,"ok","Resolved"],
      ["d","✅","Drain clog near prep area",null,"ok","Resolved"],
    ],
  ],
  "facility-safety":[
    {type:"n",h:"Facility Safety",s:"Main Kitchen · Fresno, CA"},
    [["Hood System","1"],["Status","Current","#16a34a"],["Last Service","Feb 8"],["Next Service","Mar 16","#92400e"]],
    ["Hood Cleaning","Schedule",
      ["d","🟢","Main Kitchen","Cleaning Pros Plus · Last: Feb 8 · Next: Mar 16","ok","Current"],
    ],
    ["Ansul / Fire Suppression",null,
      ["d","🟡","Main Kitchen","Last: Sep 15, 2025 · Next: Mar 15, 2026","wn","Due Soon"],
    ],
  ],
  services:[
    {type:"n",h:"Vendor Services",s:"Main Kitchen · Fresno, CA"},
    [["Active Vendors","3"],["Services/Mo","2"],["Annual Spend","$2.2k"],["COIs Current","3/3","#16a34a"]],
    ["Active Vendors","Add Vendor",
      ["d","🏢","Cleaning Pros Plus — Hood Cleaning","(209) 636-6116 · Next: Mar 16","ok","COI ✓","View"],
      ["d","🏢","Central Valley Pest — Pest Control","(559) 201-4400 · Next: Mar 21","ok","COI ✓","View"],
      ["d","🏢","Valley Fire Systems — Fire Suppression","(209) 555-0122 · Next: Mar 15","ok","COI ✓","View"],
    ],
  ],
  documents:[
    {type:"n",h:"Documents",s:"Main Kitchen · 12 documents"},
    [["Total","12"],["Expiring 30d","1","#92400e"],["Expired","0","#16a34a"],["Missing","0","#16a34a"]],
    ["Document Library","Upload",
      ["d","📄","HACCP Plan — Main Kitchen","Food Safety · Expires Dec 31, 2026","ok","Current"],
      ["d","📄","Food Manager Cert — Maria R.","Certification · Expires Jun 15, 2026","ok","Current"],
      ["d","📄","Hood Cleaning COI — Cleaning Pros Plus","COI · Expires Apr 1, 2026","wn","Due Soon"],
      ["d","📄","Business License — Fresno County","Permit · Expires Jan 31, 2027","ok","Current"],
    ],
  ],
  "self-inspection":[
    {type:"n",h:"Self-Inspection",s:"Main Kitchen · Fresno, CA"},
    [["Last Inspection","Mar 5"],["Score","94/100","#166534"],["Issues Found","2","#92400e"],["Next Due","Apr 5"]],
    ["Inspection Checklist","Start New",
      ["d","✅","Temperature Control","6/6 items passed","ok","✓ Passed"],
      ["d","⚠️","Food Handling Practices","7/8 items passed","wn","Issue Found"],
      ["d","✅","Personal Hygiene","5/5 items passed","ok","✓ Passed"],
      ["d","⚠️","Facility & Equipment","9/10 items passed","wn","Issue Found"],
    ],
  ],
  training:[
    {type:"n",h:"Training Records",s:"Main Kitchen · 4 staff members"},
    [["Staff Members","4"],["Certs Current","4","#16a34a"],["Expiring 30d","1","#92400e"],["Expired","0","#16a34a"]],
    ["Staff Certification Status","Add Record",
      ["d","👤","Maria Rodriguez — Food Manager (CFPM)","Expires Jun 15, 2026","ok","Current"],
      ["d","👤","Carlos Mendez — Food Handler Card","Expires Apr 30, 2026","wn","Due Soon"],
      ["d","👤","Sofia Kim — Food Handler Card","Expires Dec 1, 2026","ok","Current"],
      ["d","👤","David Lee — Food Handler Card","Expires Nov 15, 2026","ok","Current"],
    ],
  ],
  "ai-insights":[
    {type:"n",h:"AI Insights",s:"Main Kitchen · EvidLY Intelligence"},
    ["Top Insights This Week",null,
      ["!","w","Ansul fire suppression service due Mar 15 — schedule now to avoid gap","Risk Alert"],
      ["!","w","Prep cooler temp logs missed 3× this week — reinforce with staff","Pattern Detected"],
      ["d","🟢","Checklist completion up 18% vs last month","Positive Trend","ok","↑ Good"],
    ],
    ["Compliance Drivers",null,
      ["~","Temp log compliance",87,"#16a34a"],
      ["~","Checklist completion",94,"#16a34a"],
      ["~","Fire safety currency",67,"#dc2626"],
      ["~","Vendor COI currency",100,"#166534"],
    ],
  ],
  alerts:[
    {type:"n",h:"Alerts",s:"Main Kitchen · 2 active"},
    [["Active","2","#92400e"],["Critical","0","#16a34a"],["Warnings","2","#92400e"],["Resolved Today","1","#16a34a"]],
    ["Active Alerts","Mark All Read",
      ["!","w","Prep cooler temp log overdue","Main Kitchen · 2 hours"],
      ["!","w","Fire suppression due in 5 days","Main Kitchen · Mar 16"],
    ],
  ],
  analytics:[
    {type:"n",h:"Analytics",s:"Main Kitchen · 30-day view"},
    [["Checklist Completion","97%","#166534"],["Temp Logs","95%","#16a34a"],["Open Items","2","#92400e"],["Trend","↑ 12%","#166534"]],
    ["Performance — Main Kitchen",null,
      ["d","🟢","Checklists","97% completion this month","ok","Strong"],
      ["d","🟢","Temperature Logs","95% logged on time","ok","Strong"],
      ["d","🟡","Fire Safety","Ansul service due Mar 15","wn","Due Soon"],
      ["d","🟢","Vendor COIs","All current","ok","Current"],
    ],
    ["30-Day Trend",null,
      ["~","Week 1",89,"#92400e"],
      ["~","Week 2",91,"#d97706"],
      ["~","Week 3",93,"#166534"],
      ["~","Week 4",97,"#166534"],
    ],
  ],
  intelligence:[
    {type:"n",h:"Operations Intelligence",s:"Main Kitchen · EvidLY Intelligence Engine"},
    [["Revenue Risk","$4k","#92400e"],["Liability Risk","Medium","#d97706"],["Cost Risk","$2.2k"],["Op. Risk","Low","#16a34a"]],
    ["Risk Dimensions",null,
      ["d","🟠","Revenue Risk","Ansul service due Mar 15 — failure before then risks inspection closure","wn","$4k exposure"],
      ["d","🟡","Liability Risk","Fire suppression approaching expiry — schedule before Mar 15","wn","Medium"],
      ["d","🔵","Cost Risk","$2,220 annual vendor spend across 3 services","in","$2.2k/yr"],
      ["d","🟢","Operational Risk","Checklists and temp logs on track — well managed","ok","Low"],
    ],
  ],
  "jurisdiction-intel":[
    {type:"n",h:"Jurisdiction Intelligence",s:"Main Kitchen · Fresno County"},
    ["Your Jurisdiction Coverage",null,
      ["d","⚖️","Fresno County EHD — Main Kitchen","A–F letter grade · Last insp: Jan 15, 2026","ok","Active"],
    ],
  ],
  regulatory:[
    {type:"n",h:"Regulatory Updates",s:"California · Food & Fire Safety"},
    ["Recent Updates",null,
      ["d","🔥","NFPA 96-2024 — Hood cleaning frequency table updated","Jan 15, 2026","er","Fire Safety"],
      ["d","🍽️","CalCode 2025 — Temperature holding requirements clarified","Dec 1, 2025","in","Food Safety"],
      ["d","⚖️","Fresno County EHD — New inspection scoring weights Q1 2026","Nov 14, 2025","in","Jurisdiction"],
    ],
  ],
  "insurance-risk":[
    {type:"n",h:"Insurance Risk",s:"Carrier-facing data · Main Kitchen"},
    [["P1 Revenue","89","#16a34a"],["P2 Liability","74","#d97706"],["P3 Cost","85","#16a34a"],["P4 Operational","91","#16a34a"]],
    ["Risk Pillars",null,
      ["d","89","P1 Revenue Risk","Temp log compliance strong; checklists at 97%"],
      ["d","74","P2 Liability Risk","Fire suppression approaching expiry — schedule before Mar 15"],
      ["d","85","P3 Cost Risk","Vendor spend normal; no anomalies detected"],
      ["d","91","P4 Operational Risk","Well managed — all key metrics trending up"],
    ],
  ],
  leaderboard:[
    {type:"n",h:"Leaderboard",s:"Main Kitchen · March 2026"},
    ["Your Standing",null,
      ["d","🥇","Main Kitchen — Fresno","You're the top performer in your peer group","ok","97 / 100"],
    ],
  ],
  reporting:[
    {type:"n",h:"Reporting",s:"Main Kitchen · Export & Share"},
    ["Available Reports","Generate",
      ["d","📊","Monthly Compliance Summary","Food Safety · PDF · Last: Mar 1",null,null,"Download"],
      ["d","📊","Temperature Log Export","Food Safety · CSV · Last: Mar 10",null,null,"Download"],
      ["d","📊","Vendor Service History","Facility Safety · PDF · Last: Feb 28",null,null,"Download"],
      ["d","📊","Annual Hood Cleaning Record","Fire Safety · PDF · Last: Jan 31",null,null,"Download"],
    ],
  ],
  "iot-monitoring":[
    {type:"n",h:"IoT Monitoring",s:"Main Kitchen · 5 of 6 sensors online"},
    [["Online","5/6","#16a34a"],["Alerts","0","#16a34a"],["Avg Uptime","99.2%"],["Last Sync","2 min ago"]],
    ["Sensor Status",null,
      ["d","📡","Walk-in Cooler #1 Sensor","Battery: 84% · 37.8°F","ok","Online"],
      ["d","📡","Walk-in Cooler #2 Sensor","Battery: 71% · 39.5°F","ok","Online"],
      ["d","📡","Walk-in Freezer Sensor","Battery: 92% · −2.1°F","ok","Online"],
      ["d","📡","Hot Hold Unit Sensor","Battery: 65% · 141°F","ok","Online"],
      ["d","📡","Prep Cooler Sensor","Battery: — · Offline","gy","Offline"],
    ],
  ],
  benchmarks:[
    {type:"n",h:"Benchmarks",s:"Main Kitchen vs. California average"},
    ["Performance Benchmarks",null,
      ["~","Checklist Completion (CA avg: 81%)",94,"#166534"],
      ["~","Temp Log Compliance (CA avg: 76%)",87,"#16a34a"],
      ["~","Vendor COI Currency (CA avg: 88%)",100,"#166534"],
      ["~","Fire Safety Currency (CA avg: 79%)",67,"#dc2626"],
    ],
  ],
  "inspector-view":[
    {type:"n",h:"Inspector View",s:"Main Kitchen · Fresno, CA · As an inspector would see it"},
    ["Food Safety Standing",null,
      ["d","✅","Temperature Control",null,"ok","Compliant"],
      ["d","✅","Food Handling Practices",null,"ok","Compliant"],
      ["d","⚠️","Facility Cleanliness",null,"wn","Minor Issue"],
      ["d","✅","Pest Control",null,"ok","Compliant"],
    ],
    ["Fire Safety Standing",null,
      ["d","✅","Hood System",null,"ok","Current"],
      ["d","🟡","Ansul / Suppression",null,"wn","Due Soon"],
      ["d","✅","Fire Extinguishers",null,"ok","Current"],
    ],
  ],
  "photo-evidence":[
    {type:"n",h:"Photo Evidence",s:"Main Kitchen · Compliance documentation"},
    [["Total","18"],["This Month","5"],["Flagged","0","#16a34a"],["Location","1"]],
    ["Recent Photos","Upload",
      ["d","📷","Hood cleaning completion — Main Kitchen","Hood Cleaning · Mar 8, 2026","in","Hood Cleaning"],
      ["d","📷","Walk-in cooler thermometer reading","Temperature · Mar 10, 2026","in","Temperature"],
      ["d","📷","Pest control service record","Pest Control · Mar 5, 2026","in","Pest Control"],
    ],
  ],
  marketplace:[
    {type:"n",h:"Vendor Marketplace",s:"Find certified vendors in your area"},
    ["Recommended Vendors",null,
      ["d","🏢","Cleaning Pros Plus — Hood Cleaning","Central Valley · (209) 636-6116","ok","IKECA","Contact"],
      ["d","🏢","Central Valley Pest — Pest Control","Fresno · (559) 201-4400",null,null,"Contact"],
      ["d","🏢","Valley Fire Systems — Fire Suppression","Fresno · (209) 555-0122",null,null,"Contact"],
    ],
  ],
  "self-diagnosis":[
    {type:"n",h:"Self-Diagnosis",s:"Identify compliance gaps before an inspector does"},
    ["Run a Diagnosis",null,
      ["d","🌡️","Temperature Control",null,null,null,"Start"],
      ["d","🍽️","Food Handling Practices",null,null,null,"Start"],
      ["d","🔥","Fire Safety & Equipment",null,null,null,"Start"],
      ["d","📄","Documentation",null,null,null,"Start"],
    ],
    ["Last Diagnosis — Mar 5, 2026",null,
      ["?","Temperature logs current",true],
      ["?","Checklists filed daily",true],
      ["?","HACCP plan on file",false],
      ["?","Fire suppression current",false],
    ],
  ],
  locations:[
    {type:"n",h:"Locations",s:"Main Kitchen · Fresno, CA"},
    [["Total","1"],["Active","1","#16a34a"],["Open Items","2","#92400e"],["Annual Spend","$2.2k"]],
    ["Your Location","Add Location",
      ["d","📍","Main Kitchen — Fresno","1234 Blackstone Ave · Fresno County EHD","ok","0 open","Manage"],
    ],
  ],
  team:[
    {type:"n",h:"Team",s:"Main Kitchen · 4 members"},
    [["Members","4"],["Active Shifts","2","#16a34a"],["Certs Current","4/4","#16a34a"],["Roles","3"]],
    ["Team Members","Invite",
      ["d","👤","Maria Rodriguez — Chef","Main Kitchen · On shift","ok","On Shift"],
      ["d","👤","Carlos Mendez — Kitchen Manager","Main Kitchen · On shift","ok","On Shift"],
      ["d","👤","Sofia Kim — Kitchen Staff","Main Kitchen · Active","in","Active"],
      ["d","👤","David Lee — Kitchen Staff","Main Kitchen · Active","in","Active"],
    ],
  ],
  equipment:[
    {type:"n",h:"Equipment",s:"Main Kitchen · 12 items tracked"},
    [["Total Items","12"],["Current","10","#16a34a"],["Due Soon","2","#92400e"],["Out of Service","0","#16a34a"]],
    ["Equipment Inventory","Add Item",
      ["d","⚙️","Walk-in Cooler #1 — Main Kitchen","Refrigeration · Last service: Jan 2026","ok","Current"],
      ["d","⚙️","Walk-in Freezer — Main Kitchen","Refrigeration · Last service: Jan 2026","ok","Current"],
      ["d","⚙️","Hood System — Line 1 — Main Kitchen","Ventilation · Last service: Feb 2026","ok","Current"],
      ["d","⚙️","Ansul System — Main Kitchen","Fire Suppression · Last service: Sep 2025","wn","Due Soon"],
    ],
  ],
  vendors:[
    {type:"n",h:"Vendors",s:"Main Kitchen · 3 active vendors"},
    [["Active","3"],["COIs Current","3/3","#16a34a"],["Expiring 30d","0","#16a34a"],["Annual Spend","$2.2k"]],
    ["Vendor Directory","Add Vendor",
      ["d","🏢","Cleaning Pros Plus — Hood Cleaning","(209) 636-6116 · $1,040/yr","ok","COI ✓","View"],
      ["d","🏢","Central Valley Pest — Pest Control","(559) 201-4400 · $380/yr","ok","COI ✓","View"],
      ["d","🏢","Valley Fire Systems — Fire Suppression","(209) 555-0122 · $780/yr","ok","COI ✓","View"],
    ],
  ],
  roles:[
    {type:"n",h:"Roles & Permissions",s:"Main Kitchen · 7 roles configured"},
    ["Role Configuration",null,
      ["d","🔑","Owner / Operator","1 user · Full access — all locations, all reports, billing",null,null,"Edit"],
      ["d","🔑","Executive","1 user · Read-only portfolio view, no configuration",null,null,"Edit"],
      ["d","🔑","Compliance Manager","1 user · Compliance data, inspection records, violations",null,null,"Edit"],
      ["d","🔑","Facilities Manager","1 user · Equipment, fire safety, vendor records",null,null,"Edit"],
      ["d","🔑","Chef","1 user · Food safety, temp logs, HACCP checklists",null,null,"Edit"],
      ["d","🔑","Kitchen Manager","1 user · Daily ops, staff tasks, checklists",null,null,"Edit"],
      ["d","🔑","Kitchen Staff","2 users · Assigned checklists and temp logs only",null,null,"Edit"],
    ],
  ],
  settings:[
    {type:"n",h:"Settings",s:"Main Kitchen · Fresno, CA"},
    ["Organization",null,
      ["d","🏢","Organization Name","Main Kitchen",null,null,"Edit"],
      ["d","💳","Subscription","Founder Plan · $99/mo","ok","Active"],
      ["d","📧","Billing Email","owner@yourorganization.com",null,null,"Edit"],
    ],
    ["Notifications",null,
      ["d","🔔","Inspection alerts",null,"ok","On"],
      ["d","🔔","Temperature alerts",null,"ok","On"],
      ["d","🔔","Checklist reminders",null,"ok","On"],
      ["d","🔔","Weekly digest",null,"gy","Off"],
    ],
  ],
  calendar:[
    {type:"n",h:"Calendar",s:"Main Kitchen · March 2026"},
    ["Upcoming Events",null,
      ["d","📅","Afternoon temp logs","Today · Main Kitchen","wn","In Progress"],
      ["d","📅","Fire suppression service","Mar 15 · Main Kitchen","in","Upcoming"],
      ["d","📅","Hood cleaning scheduled","Mar 16 · Main Kitchen","in","Upcoming"],
      ["d","📅","Fresno County EHD inspection window","Apr 1–15 · Main Kitchen","in","Upcoming"],
    ],
  ],
};

// ── PAGE RENDERER ─────────────────────────────────────────────────────────────
function GenericPage({id,oa}){
  const pg=PD[id];
  if(!pg) return <div style={{padding:20,color:MUTED,...FF}}>No sample data for: {id}</div>;
  const[banner,...rest]=pg;
  const isStats=rest.length>0&&Array.isArray(rest[0][0]);
  const stats=isStats?rest[0]:null;
  const cards=isStats?rest.slice(1):rest;
  return <div><Banner {...banner}/>{stats&&<SBar s={stats}/>}{cards.map((c,i)=>renderCard(c,i,oa))}</div>;
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({role,sample,oa}){
  if(!sample) return <div><Banner type="n" h="Welcome to EvidLY" s="Wednesday, March 11, 2026"/><div style={{background:"white",border:"1px solid #E5E7EB",borderRadius:8,padding:"40px 24px",textAlign:"center",...FF}}><div style={{fontSize:32,marginBottom:12}}>⊞</div><div style={{fontSize:14,fontWeight:700,color:BODY,marginBottom:6}}>No data yet</div><div style={{fontSize:12,color:MUTED,marginBottom:18}}>Add your first location to get started.</div><Btn l="Add Location" oc={()=>oa?.("Add Location",{})}/></div></div>;

  if(role==="kitchen_staff") return <div>
    <div style={{background:STEEL,borderRadius:10,padding:"15px 17px",color:"white",marginBottom:12}}>
      <div style={{fontSize:9,fontWeight:800,color:GOLD,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:5,...FF}}>✓  On Track</div>
      <div style={{fontSize:15,fontWeight:700,...FF}}>Good afternoon.</div>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2,...FF}}>Wednesday, March 11, 2026 · Main Kitchen</div>
      <div style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"10px 14px",marginTop:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:8,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",...FF}}>My Standing Today</div><div style={{fontSize:18,fontWeight:900,color:GOLD,marginTop:2,...FF}}>1 of 3 Done</div></div>
        <div style={{width:42,height:42,borderRadius:"50%",border:`3px solid ${GOLD}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:GOLD,...FF}}>33%</div>
      </div>
    </div>
    <Card t="My Tasks — Today">
      <Row><div style={{width:16,height:16,borderRadius:4,border:"2px solid #16a34a",background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:8,color:"#16a34a",fontWeight:900}}>✓</span></div><span style={{fontSize:12}}>📋</span><div style={{flex:1,fontSize:12,color:"#9ca3af",textDecoration:"line-through",...FF}}>Morning opening checklist</div><span style={{fontSize:10,color:MUTED,...FF}}>6:15 AM</span></Row>
      <Row><div style={{width:16,height:16,borderRadius:4,border:"2px solid #d1d5db",background:"#f9fafb",flexShrink:0}}/><span style={{fontSize:12}}>🌡️</span><div style={{flex:1,fontSize:12,color:BODY,...FF}}>Check prep cooler temperature</div><span style={{fontSize:10,color:MUTED,...FF}}>Due 2:00 PM</span><Btn l="Start" s oc={()=>oa?.("Start",{primary:"Log Temperature — Prep Cooler"})}/></Row>
      <Row><div style={{width:16,height:16,borderRadius:4,border:"2px solid #d1d5db",background:"#f9fafb",flexShrink:0}}/><span style={{fontSize:12}}>🌡️</span><div style={{flex:1,fontSize:12,color:BODY,...FF}}>Check walk-in cooler #2</div><span style={{fontSize:10,color:MUTED,...FF}}>Due 2:00 PM</span><Btn l="Start" s oc={()=>oa?.("Start",{primary:"Log Temperature — Walk-in Cooler #2"})}/></Row>
    </Card>
    <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"12px 14px",display:"flex",gap:10,alignItems:"center"}}>
      <span style={{fontSize:20}}>⚠️</span><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#991b1b",...FF}}>See something wrong?</div><div style={{fontSize:11,color:"#7f1d1d",...FF}}>Report it immediately.</div></div><Btn l="Report Issue" d oc={()=>oa?.("Report Issue",{})}/>
    </div>
  </div>;

  const cfg={
    owner_operator:{st:"a",h:"Mostly covered — fire suppression service due in 5 days.",s:"Main Kitchen · Fresno, CA"},
    executive:{st:"a",h:"Main Kitchen standing — fire suppression service due soon.",s:"Main Kitchen · Fresno, CA"},
    compliance_manager:{st:"a",h:"Compliance on track — one item needs attention before Mar 15.",s:"Main Kitchen · Fresno, CA"},
    facilities:{st:"a",h:"Fire suppression service due Mar 15 — schedule now.",s:"Main Kitchen · Fresno, CA"},
    chef:{st:"a",h:"Kitchen running — prep cooler log overdue.",s:"Main Kitchen · Fresno, CA"},
    kitchen_manager:{st:"a",h:"Kitchen is on track — one temp log overdue.",s:"Main Kitchen · Fresno, CA"},
  };
  const bc=cfg[role]||cfg.owner_operator;
  return <div>
    <Banner type="c" {...bc}/>
    <Card t="Location Standing">
      {renderRow(["d","🟢","Main Kitchen — Fresno","Food ✓ OK · Fire ✓ OK · Ansul due Mar 15","ok","0 open"],0,oa)}
    </Card>
    {(role==="owner_operator"||role==="kitchen_manager")&&<Card t="Today's Tasks" a="View All" onA={cta=>oa?.(cta,{})}>
      {renderRow(["t","Morning checklist","done","6:15 AM"],0,oa)}
      {renderRow(["t","Midday checklist","prog","4 / 8 items"],1,oa)}
      {renderRow(["t","Prep cooler temp log","over","2 hours overdue"],2,oa)}
      {renderRow(["t","Evening checklist","pend","Due 10:00 PM"],3,oa)}
    </Card>}
    {role==="compliance_manager"&&<Card t="Open Alerts" onA={cta=>oa?.(cta,{})}>
      {renderRow(["!","w","Fire suppression service due in 5 days","Main Kitchen · Facility Safety"],0,oa)}
      {renderRow(["!","w","Prep cooler temp log overdue","Main Kitchen · Food Safety"],1,oa)}
    </Card>}
    {role==="facilities"&&<Card t="Services Due Soon" onA={cta=>oa?.(cta,{})}>
      {renderRow(["d","🛠️","Fire Suppression — Main Kitchen","Valley Fire Systems · Due Mar 15","wn","Due in 5d","Schedule"],0,oa)}
      {renderRow(["d","🛠️","Hood Cleaning — Main Kitchen","Cleaning Pros Plus · Next: Mar 16","ok","Scheduled","View"],1,oa)}
    </Card>}
    {role==="chef"&&<Card t="Temperature Readings" a="Log Now" onA={cta=>oa?.(cta,{primary:"Temperature Reading"})}>
      {renderRow(["d","🟢","Walk-in Cooler #1","IoT · 37.8°F","ok","In Range"],0,oa)}
      {renderRow(["d","🟢","Walk-in Cooler #2","IoT · 39.5°F","ok","In Range"],1,oa)}
      {renderRow(["d","🟡","Prep Cooler","Manual · Log needed","wn","—","Log Now"],2,oa)}
    </Card>}
    {role==="executive"&&<SBar s={[["Location","OK","#16a34a"],["Open Items","2","#92400e"],["Annual Spend","$2.2k"]]}/>}
  </div>;
}

// ── PAGE CONTENT ROUTER ───────────────────────────────────────────────────────
function PageContent({pageId,role,sample,oa}){
  if(pageId==="dashboard") return <Dashboard role={role} sample={sample} oa={oa}/>;
  if(!sample){
    const label=pageId.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());
    return <div><Banner type="n" h={label} s="Wednesday, March 11, 2026"/><div style={{background:"white",border:"1px solid #E5E7EB",borderRadius:8,padding:"40px 24px",textAlign:"center",...FF}}><div style={{fontSize:14,fontWeight:700,color:BODY,marginBottom:6}}>{label}</div><div style={{fontSize:12,color:MUTED,marginBottom:18}}>No data yet — toggle Sample Data ON to see this page populated.</div><Btn l="Get Started" oc={()=>oa?.("Get Started",{primary:label})}/></div></div>;
  }
  return <GenericPage id={pageId} oa={oa}/>;
}

// ── NAV CONFIG ────────────────────────────────────────────────────────────────
const NAV=[
  {id:"top",lbl:null,items:[["dashboard","Dashboard","⊞"],["calendar","Calendar","📅"]]},
  {id:"food",lbl:"FOOD SAFETY",items:[["checklists","Checklists","✅"],["temperatures","Temperature Readings","🌡️"],["haccp","HACCP","🔬"],["corrective","Corrective Actions","🔧"],["incidents","Incidents","⚠️"]]},
  {id:"fire",lbl:"FACILITY SAFETY",items:[["facility-safety","Facility Safety","🔥"],["services","Vendor Services","🛠️"]]},
  {id:"comp",lbl:"COMPLIANCE",items:[["documents","Documents","📄"],["self-inspection","Self-Inspection","🔍"],["training","Training Records","🎓"]]},
  {id:"ins",lbl:"INSIGHTS",items:[["ai-insights","AI Insights","🤖"],["alerts","Alerts","🔔"],["analytics","Analytics","📊"],["intelligence","Operations Intelligence","🧠"],["jurisdiction-intel","Jurisdiction Intelligence","⚖️"],["regulatory","Regulatory Updates","📰"],["insurance-risk","Insurance Risk","🛡️"],["leaderboard","Leaderboard","🏆"],["reporting","Reporting","📈"],["iot-monitoring","IoT Monitoring","📡"],["benchmarks","Benchmarks","📐"]]},
  {id:"tls",lbl:"TOOLS",items:[["inspector-view","Inspector View","👁️"],["photo-evidence","Photos","📷"],["marketplace","Vendor Marketplace","🛒"],["self-diagnosis","Self-Diagnosis","🔬"]]},
  {id:"adm",lbl:"ADMINISTRATION",items:[["locations","Locations","📍"],["team","Team","👥"],["equipment","Equipment","⚙️"],["vendors","Vendors","🏢"],["roles","Roles & Permissions","🔑"],["settings","Settings","⚙️"]]},
];

const ALLOWED={
  owner_operator:["dashboard","calendar","checklists","temperatures","haccp","corrective","incidents","facility-safety","services","documents","self-inspection","training","ai-insights","alerts","analytics","intelligence","jurisdiction-intel","regulatory","insurance-risk","leaderboard","reporting","iot-monitoring","benchmarks","inspector-view","photo-evidence","marketplace","self-diagnosis","locations","team","equipment","vendors","roles","settings"],
  executive:["dashboard","calendar","documents","training","analytics","intelligence","reporting","benchmarks","inspector-view","locations","settings"],
  compliance_manager:["dashboard","calendar","checklists","temperatures","haccp","corrective","incidents","facility-safety","services","documents","self-inspection","training","ai-insights","alerts","analytics","jurisdiction-intel","regulatory","reporting","inspector-view","self-diagnosis","locations","settings"],
  facilities:["dashboard","calendar","incidents","facility-safety","services","documents","alerts","regulatory","iot-monitoring","marketplace","inspector-view","self-diagnosis","locations","equipment","vendors","settings"],
  chef:["dashboard","calendar","checklists","temperatures","haccp","corrective","documents","training","ai-insights","self-diagnosis","settings"],
  kitchen_manager:["dashboard","calendar","checklists","temperatures","haccp","corrective","incidents","services","documents","training","ai-insights","alerts","analytics","reporting","marketplace","photo-evidence","inspector-view","self-diagnosis","locations","team","equipment","settings"],
  kitchen_staff:["dashboard","temp-logs","checklists","incidents"],
};

const MNAV={
  owner_operator:[["dashboard","Home","⊞"],["temperatures","Temps","🌡️"],["checklists","Checks","✅"],["incidents","Issues","⚠️"],["settings","More","⚙️"]],
  executive:[["dashboard","Home","⊞"],["analytics","Analytics","📊"],["locations","Locations","📍"],["reporting","Reports","📈"],["settings","More","⚙️"]],
  compliance_manager:[["dashboard","Home","⊞"],["checklists","Checks","✅"],["self-inspection","Inspect","🔍"],["alerts","Alerts","🔔"],["reporting","Reports","📈"]],
  facilities:[["dashboard","Home","⊞"],["equipment","Equip","⚙️"],["vendors","Vendors","🏢"],["facility-safety","Fire","🔥"],["incidents","Issues","⚠️"]],
  chef:[["dashboard","Home","⊞"],["temperatures","Temps","🌡️"],["checklists","Checks","✅"],["haccp","HACCP","🔬"],["ai-insights","AI","🤖"]],
  kitchen_manager:[["dashboard","Home","⊞"],["temperatures","Temps","🌡️"],["checklists","Checks","✅"],["incidents","Issues","⚠️"],["settings","More","⚙️"]],
  kitchen_staff:[["dashboard","Today","⊞"],["checklists","Checks","✅"],["temp-logs","Temps","🌡️"],["incidents","Report","⚠️"]],
};

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function Sidebar({role,active,onNav,collapsed}){
  const allowed=ALLOWED[role]||[];
  const[exp,setExp]=useState({top:1,food:1,fire:1,comp:1,ins:1,tls:1,adm:1});
  return <div style={{width:collapsed?46:218,background:SB,flexShrink:0,display:"flex",flexDirection:"column",height:"100%",transition:"width 0.2s",overflowY:"auto",overflowX:"hidden"}}>
    <div style={{padding:collapsed?"11px 0":"11px 13px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:8,justifyContent:collapsed?"center":"flex-start"}}>
      <div style={{width:28,height:28,borderRadius:6,background:"rgba(160,140,90,0.18)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,fontWeight:900,color:GOLD,...FF}}>E</span></div>
      {!collapsed&&<span style={{fontSize:13,fontWeight:900,...FF}}><span style={{color:GOLD}}>E</span><span style={{color:"white"}}>vid</span><span style={{color:GOLD}}>LY</span></span>}
    </div>
    <div style={{flex:1,paddingTop:4,paddingBottom:10}}>
      {NAV.map(({id,lbl,items})=>{
        const vis=items.filter(([pid])=>allowed.includes(pid));
        if(!vis.length) return null;
        const open=exp[id]!==0;
        return <div key={id}>
          {lbl&&!collapsed&&<button onClick={()=>setExp(e=>({...e,[id]:open?0:1}))} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 13px 2px",background:"none",border:"none",cursor:"pointer"}}>
            <span style={{fontSize:9,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:"0.1em",...FF}}>{lbl}</span>
            <span style={{fontSize:8,color:"#475569",transform:open?"rotate(0)":"rotate(-90deg)",transition:"0.15s"}}>▼</span>
          </button>}
          {(open||collapsed)&&vis.map(([pid,plbl,icon])=>{
            const on=active===pid;
            return <button key={pid} onClick={()=>onNav(pid)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:collapsed?"7px 0":"6px 15px",background:on?"rgba(160,140,90,0.15)":"transparent",border:"none",cursor:"pointer",borderLeft:on?`3px solid ${GOLD}`:"3px solid transparent",justifyContent:collapsed?"center":"flex-start"}}>
              <span style={{fontSize:13,flexShrink:0}}>{icon}</span>
              {!collapsed&&<span style={{fontSize:11,color:on?"white":SBT,fontWeight:on?600:400,...FF,whiteSpace:"nowrap"}}>{plbl}</span>}
            </button>;
          })}
        </div>;
      })}
    </div>
    {!collapsed&&<div style={{padding:"8px 12px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:24,height:24,borderRadius:"50%",background:"rgba(160,140,90,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:GOLD,flexShrink:0}}>A</div>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:10,fontWeight:600,color:"white",...FF,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Arthur Haggerty</div><div style={{fontSize:9,color:"#475569",...FF}}>admin@getevidly.com</div></div>
    </div>}
  </div>;
}

// ── BOTTOM BAR ────────────────────────────────────────────────────────────────
function BottomBar({role,active,onNav}){
  const items=MNAV[role]||MNAV.owner_operator;
  return <div style={{background:SB,borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",justifyContent:"space-around",padding:"6px 0 4px",flexShrink:0}}>
    {items.map(([id,lbl,icon])=>{const on=active===id;return <button key={id} onClick={()=>onNav(id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"2px 5px",background:"none",border:"none",cursor:"pointer",minWidth:38}}>
      <span style={{fontSize:17}}>{icon}</span>
      <span style={{fontSize:9,color:on?GOLD:"#64748b",fontWeight:on?700:400,...FF}}>{lbl}</span>
      {on&&<div style={{width:3,height:3,borderRadius:"50%",background:GOLD}}/>}
    </button>;})}
  </div>;
}

// ── PANEL ─────────────────────────────────────────────────────────────────────
function Panel({role,page,onNav,sample,collapsed,mobile,width}){
  const isStaff=role==="kitchen_staff";
  const[mMenu,setMMenu]=useState(false);
  const[pan,setPan]=useState(null);
  const oa=(cta,data)=>setPan(gp(cta,data||{}));
  const label=page.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());

  if(mobile) return <div style={{background:"white",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 18px rgba(0,0,0,0.14)",display:"flex",flexDirection:"column",height:700,width:width||360,position:"relative"}}>
    <div style={{background:SB,padding:"8px 12px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
      {!isStaff&&<button onClick={()=>setMMenu(s=>!s)} style={{background:"none",border:"none",color:"white",fontSize:17,cursor:"pointer",padding:"2px 4px"}}>☰</button>}
      <span style={{fontSize:13,fontWeight:900,...FF}}><span style={{color:GOLD}}>E</span><span style={{color:"white"}}>vid</span><span style={{color:GOLD}}>LY</span></span>
      {page!=="dashboard"&&<span style={{fontSize:10,color:"rgba(255,255,255,0.5)",...FF}}>{label}</span>}
      <div style={{marginLeft:"auto",width:24,height:24,borderRadius:"50%",background:"rgba(160,140,90,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:GOLD,...FF}}>A</div>
    </div>
    {mMenu&&!isStaff&&<div style={{position:"absolute",zIndex:100,top:0,left:0,right:0,bottom:0,display:"flex"}}>
      <div style={{width:256,background:SB,height:"100%",overflowY:"auto"}}>
        <div style={{padding:"10px 12px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:900,...FF}}><span style={{color:GOLD}}>E</span><span style={{color:"white"}}>vid</span><span style={{color:GOLD}}>LY</span></span>
          <button onClick={()=>setMMenu(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:15,cursor:"pointer"}}>✕</button>
        </div>
        <Sidebar role={role} active={page} onNav={id=>{onNav(id);setMMenu(false);}} collapsed={false}/>
      </div>
      <div style={{flex:1,background:"rgba(0,0,0,0.5)"}} onClick={()=>setMMenu(false)}/>
    </div>}
    <div style={{flex:1,overflowY:"auto",padding:12,background:PBG}}>
      <PageContent pageId={page} role={role} sample={sample} oa={oa}/>
    </div>
    <BottomBar role={role} active={page} onNav={onNav}/>
    <AP cfg={pan} onClose={()=>setPan(null)}/>
  </div>;

  return <div style={{background:"white",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.11)",display:"flex",height:700,position:"relative"}}>
    {!isStaff&&<Sidebar role={role} active={page} onNav={onNav} collapsed={collapsed}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:"white",borderBottom:"2px solid #A08C5A",padding:"8px 15px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <button onClick={()=>onNav("dashboard")} style={{fontSize:11,color:MUTED,background:"none",border:"none",cursor:"pointer",...FF}}>Dashboard</button>
        {page!=="dashboard"&&<><span style={{fontSize:11,color:MUTED}}>›</span><span style={{fontSize:11,fontWeight:700,color:BODY,...FF}}>{label}</span></>}
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          {!isStaff&&<><Btn l="+ Log Temp" oc={()=>oa("+ Log Temp",{primary:"Select Unit"})}/><Btn l="Checklist" o oc={()=>onNav("checklists")}/></>}
          <div style={{width:26,height:26,borderRadius:"50%",background:"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:NAVY,...FF}}>A</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:15,background:PBG}}>
        <PageContent pageId={page} role={role} sample={sample} oa={oa}/>
      </div>
    </div>
    <AP cfg={pan} onClose={()=>setPan(null)}/>
  </div>;
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
const ROLES=[
  {id:"owner_operator",lbl:"Owner / Operator",desc:"Full access — all locations, all reports, billing"},
  {id:"executive",lbl:"Executive",desc:"Read-only portfolio view, no configuration"},
  {id:"compliance_manager",lbl:"Compliance Manager",desc:"Compliance data, inspection records, violations"},
  {id:"facilities",lbl:"Facilities Manager",desc:"Equipment, fire safety, vendor records"},
  {id:"chef",lbl:"Chef",desc:"Food safety, temp logs, HACCP checklists"},
  {id:"kitchen_manager",lbl:"Kitchen Manager",desc:"Daily ops, staff tasks, checklists"},
  {id:"kitchen_staff",lbl:"Kitchen Staff",desc:"Assigned checklists and temp logs only"},
];

export default function RolePreview(){
  const[role,setRole]=useState("owner_operator");
  const[sample,setSample]=useState(true);
  const[dPage,setDPage]=useState("dashboard");
  const[mPage,setMPage]=useState("dashboard");
  const[col,setCol]=useState(false);
  const[dWidth,setDWidth]=useState(900);
  const[mWidth,setMWidth]=useState(360);
  const cr=ROLES.find(r=>r.id===role);
  const isStaff=role==="kitchen_staff";
  const changeRole=r=>{setRole(r);setDPage("dashboard");setMPage("dashboard");};

  return <div style={{background:"#E2E8F0",minHeight:"100vh",...FF}}>
    <div style={{background:NAVY,padding:"9px 15px"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
        <a href="/admin" style={{fontSize:11,color:"rgba(255,255,255,0.45)",textDecoration:"none",fontWeight:500,...FF}}>Admin Console</a>
        <span style={{fontSize:11,color:"rgba(255,255,255,0.25)"}}>›</span>
        <span style={{fontSize:11,color:"rgba(255,255,255,0.7)",...FF}}>Role Preview</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginBottom:8}}>
        <span style={{fontSize:9,fontWeight:800,color:GOLD,textTransform:"uppercase",letterSpacing:"0.12em",marginRight:4,...FF}}>ROLE</span>
        {ROLES.map(r=><button key={r.id} onClick={()=>changeRole(r.id)} style={{padding:"5px 11px",borderRadius:999,border:"1px solid",borderColor:role===r.id?GOLD:"rgba(255,255,255,0.15)",background:role===r.id?GOLD:"transparent",color:role===r.id?"#1E2D4D":"#94A3B8",fontSize:11,fontWeight:role===r.id?700:400,cursor:"pointer",whiteSpace:"nowrap",...FF}}>{r.lbl}</button>)}
        <div style={{width:1,height:18,background:"rgba(255,255,255,0.12)",margin:"0 3px"}}/>
        <button onClick={()=>setSample(s=>!s)} style={{padding:"5px 12px",borderRadius:999,border:"1px solid",borderColor:sample?"#34D399":"rgba(255,255,255,0.15)",background:sample?"rgba(52,211,153,0.1)":"transparent",color:sample?"#34D399":"#94A3B8",fontSize:11,fontWeight:sample?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:5,...FF}}>
          <span>{sample?"●":"○"}</span>{sample?"Sample Data ON":"Sample Data OFF"}
        </button>
        {!isStaff&&<button onClick={()=>setCol(s=>!s)} style={{padding:"5px 10px",borderRadius:999,border:"1px solid rgba(255,255,255,0.12)",background:"transparent",color:"#94A3B8",fontSize:11,cursor:"pointer",...FF}}>{col?"Expand ↔":"Collapse ↔"}</button>}
        <div style={{display:"flex",alignItems:"center",gap:12,marginLeft:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:700,textTransform:"uppercase",...FF}}>🖥 {dWidth}px</span>
            <input type="range" min={600} max={1400} step={20} value={dWidth} onChange={e=>setDWidth(Number(e.target.value))} style={{width:80,accentColor:GOLD,cursor:"pointer"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:700,textTransform:"uppercase",...FF}}>📱 {mWidth}px</span>
            <input type="range" min={320} max={480} step={10} value={mWidth} onChange={e=>setMWidth(Number(e.target.value))} style={{width:60,accentColor:GOLD,cursor:"pointer"}}/>
          </div>
        </div>
      </div>
      <div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:6,padding:"5px 11px",fontSize:11,color:"#92400E",...FF}}>
        <strong>ROLE PREVIEW MODE</strong> ▸ Viewing as <strong>{cr?.lbl}</strong> — {cr?.desc}.
        {sample?<span style={{marginLeft:8,color:"#166534",fontWeight:700}}>● Sample data ON — every page is fully populated.</span>:<span style={{marginLeft:8}}>Toggle Sample Data ON to see the system fully populated.</span>}
      </div>
    </div>
    <div style={{display:"flex",gap:12,padding:12,alignItems:"flex-start",overflowX:"auto"}}>
      <div style={{width:dWidth,flexShrink:0}}>
        <div style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:7,...FF}}>🖥 Desktop</div>
        <Panel role={role} page={dPage} onNav={setDPage} sample={sample} collapsed={col} mobile={false}/>
      </div>
      <div style={{flexShrink:0,width:mWidth}}>
        <div style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:7,...FF}}>📱 Mobile</div>
        <Panel role={role} page={mPage} onNav={setMPage} sample={sample} collapsed={col} mobile={true} width={mWidth}/>
      </div>
    </div>
  </div>;
}
