import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import InspectionReadinessForm from "../../components/lead-magnet/InspectionReadinessForm";

// ═══ EVIDLY PALETTE ═══
const E={navy:"#1E2D4D",navyL:"#2A3D62",navyD:"#151F38",gold:"#A08C5A",goldL:"#B8A474",goldD:"#8A7748",vid:"#B0BEC5",w:"#fff",cream:"#F8F7F4",g1:"#f5f5f5",g2:"#e5e5e5",g3:"#d1d5db",g4:"#9ca3af",g5:"#6b7280",g6:"#4b5563",g8:"#1f2937",grn:"#16a34a",grnBg:"#f0fdf4",red:"#dc2626",redBg:"#fef2f2",wrn:"#f59e0b",wrnBg:"#fffbeb",orn:"#ea580c",bluePale:"#e8edf5"};
const S={grn:"#1B5E20",grnL:"#4CAF50",charD:"#263238",char:"#37474F",bg:"#F5F3F0",bd:"#D6CFC5",tx:"#2D2A26",sub:"#6B6560"};
const ff="system-ui,-apple-system,sans-serif";

function Logo({s="1.2rem",light=false,tagline=false}){
  var vidColor=light?E.w:E.navy;
  var tagColor=light?"rgba(255,255,255,0.55)":"rgba(30,45,77,0.6)";
  return(
    <span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:2,lineHeight:1}}>
      <span style={{fontWeight:800,fontSize:s,letterSpacing:-0.5,fontFamily:ff,lineHeight:1}}>
        <span style={{color:E.gold}}>E</span><span style={{color:vidColor}}>vid</span><span style={{color:E.gold}}>LY</span>
      </span>
      {tagline&&<span style={{fontSize:"calc("+s+" * 0.3)",fontWeight:700,letterSpacing:"0.2em",color:tagColor,textTransform:"uppercase",lineHeight:1,fontFamily:ff,whiteSpace:"nowrap"}}>Lead with Confidence</span>}
    </span>
  );
}

function STIcon({sz=30}){return(<div style={{width:sz,height:sz,background:S.grn,borderRadius:sz*0.2,display:"inline-flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:sz*0.34,fontWeight:900,color:E.w,letterSpacing:-0.5,lineHeight:1,marginBottom:sz*0.06}}>ST</span><div style={{display:"flex",gap:1.5,alignItems:"flex-end"}}>{[5,8,11,7,10].map(function(h,i){return <div key={i} style={{width:sz*0.055,height:h*(sz/72),background:"rgba(255,255,255,"+(0.25+i*0.12)+")",borderRadius:1}}/>;})}</div></div>);}
function STLogo({s="1.2rem",light=false}){return <span style={{fontWeight:800,fontSize:s,fontFamily:ff}}><span style={{color:S.grn}}>Score</span><span style={{color:light?E.w:S.charD}}>Table</span></span>;}

// ═══ MODALS ═══
var MD={demo:{ic:"\u{1F5A5}️",t:"See Where You Stand",s:"45 min. We'll walk your county, your numbers, and your dashboard.",b:"Get the Full Picture →",c:"gold",subj:"Demo Request"},signup:{ic:"\u{1F680}",t:"Get Started with EvidLY",s:"Lock in your Founder spot at $99/mo — yours forever.",b:"Reserve My Spot →",c:"gold",subj:"Founder Signup"},schedule:{ic:"\u{1F4C5}",t:"Request an Overview",s:"45 min. We'll answer your questions. No pressure.",b:"Pick a Time →",c:"gold",subj:"Overview Request"},sales:{ic:"\u{1F3E2}",t:"Multi-Location Inquiry",s:"11+ locations. Let's build something custom.",b:"Start the Conversation →",c:"navy",subj:"Enterprise Inquiry",msg:1},chat:{ic:"\u{1F4AC}",t:"Send a Message",s:"We'll get back to you within a few hours.",b:"Send →",c:"gold",subj:"Chat Message",msg:1},signin:{ic:"\u{1F511}",t:"Sign In",s:"EvidLY launches May 5, 2026.",si:1}};

// ═══ WALKTHROUGH ═══
var WK=[
  {ic:"\u{1F305}",t:"Opening Checklist",su:"Start the day with the full picture",tx:"Sanitizer concentration, handwashing stations, employee health, pest evidence, prep surfaces — each maps to a CalCode condition. Two minutes and you know everything's good.",n:"CalCode doesn't require a checklist. It requires these conditions to be met. Your morning check confirms they are.",a:"§113953, §113967, §113980"},
  {ic:"\u{1F4E6}",t:"Receiving Temperatures",su:"Know what came in and whether it's right",tx:"Poultry ≤41°F, frozen ≤0°F. Out-of-range? Reject, document, and track that vendor's history over time.",n:"Three missed receiving logs is one of the most common issues found. EvidLY lets you know when a delivery hasn't been logged.",a:"§113980"},
  {ic:"\u{1F321}️",t:"Temperature Monitoring",su:"Every reading becomes an operational signal",tx:"Walk-in coolers, freezers, hot holding, cold holding, cooling events. Every reading auto-maps to revenue risk, liability exposure, and insurance documentation — in real time.",n:"A walk-in at 46°F with no readings since 6am isn't just a food safety issue. It's $4,200 in potential product loss, a liability event, and a gap in your insurance documentation. EvidLY connects the dots.",a:"§113996, §114002"},
  {ic:"\u{1F319}",t:"Closing Checklist",su:"End the day with everything accounted for",tx:"Final cooler/freezer logs, storage order, cooling completed to 41°F, surfaces sanitized, drains cleared, doors sealed.",n:"The 3-day weekend gap starts with a Friday close that didn't get done. This makes sure it does.",a:"§113996, §114002, §114049"},
  {ic:"\u{1F4CB}",t:"HACCP Documentation",su:"Auto-built from everything above",hc:1,tx:"CalCode §114015–114016 requires written HACCP plans and CCP monitoring logs. Most kitchens don't have them.",n:"Every temp logged in Steps 1–4 already populated your CCP logs. Receiving→CCP-04. Equipment→CCP-01&02. Cooling→CCP-03. It's already done.",a:"§114015, §114016"},
  {ic:"\u{1F393}",t:"Training & Certificates",su:"Food Handler Cards, ServSafe, all tracked",tx:"CalCode requires a Food Handler Card within 30 days of hire (§113948) and at least one Certified Food Protection Manager (§113947.1).",n:"Someone asks 'show me your food handler cards.' One tap. Every cert, expiration, and training history.",a:"§113947.1, §113948"},
];

// ═══ JURISDICTIONS ═══
var ALL_V=[{id:1,t:"Hair restraint",sv:"minor",c:1},{id:2,t:"Goods on floor",sv:"minor",c:1},{id:3,t:"Sanitizer low",sv:"minor",c:1},{id:4,t:"Ceiling damaged",sv:"minor",c:0},{id:5,t:"Wiping cloths",sv:"minor",c:0},{id:6,t:"Gap under door",sv:"minor",c:0},{id:7,t:"Grease on hoods",sv:"minor",c:0},{id:8,t:"Restroom supplies",sv:"minor",c:0},{id:9,t:"Cross-contamination",sv:"major",c:1},{id:10,t:"Walk-in 46F",sv:"major",c:0},{id:11,t:"Freezer log gap",sv:"major",c:0},{id:12,t:"Storage order",sv:"major",c:0},{id:13,t:"Receiving missing",sv:"major",c:0},{id:14,t:"Cooling violation",sv:"major",c:0},{id:15,t:"Hot hold <135F",sv:"critical",c:0},{id:16,t:"No handwashing",sv:"critical",c:0},{id:17,t:"Ill employee",sv:"critical",c:0},{id:18,t:"No HACCP plan",sv:"critical",c:0},{id:19,t:"CCP not monitored",sv:"critical",c:0},{id:20,t:"No checklists",sv:"critical",c:0}];
var JR=[{id:"fresno",co:"Fresno",ag:"Fresno County DPH",m:"reinspect",w:{c:0,m:0,n:0},h:"No points. Majors corrected on-site?",f:"Uncorrected major = Reinspection"},{id:"kern",co:"Kern",ag:"Kern County PHS",m:"deduction",w:{c:5,m:3,n:1},h:"100-point deduction. Criticals=5, majors=3.",f:"Below 75 = Closure"},{id:"la",co:"Los Angeles",ag:"LA County DPH",m:"deduction",w:{c:4,m:2,n:1},h:"Start at 100. Subtract per violation.",f:"Below 70 = Fail"},{id:"merced",co:"Merced",ag:"Merced County DPH",m:"accumulate",w:{c:4,m:2,n:2},h:"Points from zero. Minors=2.",f:"14+ = Unsatisfactory"},{id:"riverside",co:"Riverside",ag:"Riverside County EH",m:"deduction",w:{c:4,m:2,n:1},h:"Same as LA. Only A passes.",f:"Below 90 = Fail"},{id:"sacramento",co:"Sacramento",ag:"Sacramento EMD",m:"count",w:{c:1,m:1,n:0},h:"Counts majors. Color placard.",f:"4+ majors = Red"},{id:"sanjoaquin",co:"San Joaquin",ag:"San Joaquin County PH",m:"reinspect",w:{c:0,m:0,n:0},h:"CalCode standard. Stockton.",f:"Uncorrected = Reinspection"},{id:"yosemite",co:"Yosemite (NPS)",ag:"NPS + Mariposa",m:"reinspect",w:{c:0,m:0,n:0},h:"DUAL: NPS FDA 2022 + Mariposa.",f:"Reinspection from BOTH"}];
function grd(j,sc,mj,pt,un){if(j.m==="reinspect")return un===0?{d:mj>0?"Pass ("+mj+" corrected)":"Pass",p:"pass"}:{d:"Reinspection Required",p:"fail"};if(j.m==="count")return mj<=1?{d:"Green",p:"pass"}:mj<=3?{d:"Yellow",p:"warn"}:{d:"Red",p:"fail"};if(j.m==="accumulate")return pt<=6?{d:"Good - "+pt+" pts",p:"pass"}:pt<=13?{d:"Satisfactory - "+pt+" pts",p:"warn"}:{d:"Unsatisfactory - "+pt+" pts",p:"fail"};if(j.id==="kern")return sc<75?{d:"CLOSED",p:"fail"}:{d:(sc>=90?"A":sc>=80?"B":"C")+" - "+sc,p:sc>=90?"pass":"warn"};if(j.id==="riverside")return{d:sc>=90?"A - PASS":(sc>=80?"B":sc>=70?"C":"F")+" - FAIL",p:sc>=90?"pass":"fail"};var g=sc>=90?"A":sc>=80?"B":sc>=70?"C":"F";return{d:g+" - "+sc,p:sc>=70?"pass":"fail"};}
function calc(j,vs){var dd=0,pt=0,mj=0,un=0,mn=0;for(var i=0;i<vs.length;i++){var v=vs[i],p=v.sv==="critical"?j.w.c:v.sv==="major"?j.w.m:j.w.n;if(j.m==="accumulate")pt+=p;else if(j.m!=="reinspect"&&j.m!=="count")dd+=p;if(v.sv==="critical"||v.sv==="major"){mj++;if(!v.c)un++;}else mn++;}var sc=(j.m==="reinspect"||j.m==="count")?null:Math.max(0,100-dd);var g=grd(j,sc,mj,pt,un);return{d:g.d,p:g.p,sc:sc,dd:dd,pt:pt,mj:mj,un:un,mn:mn};}
var STS={pass:{bg:E.grnBg,bd:E.grn,tx:"#065f46",lb:"PASS"},fail:{bg:E.redBg,bd:E.red,tx:"#991b1b",lb:"FAIL"},warn:{bg:E.wrnBg,bd:E.wrn,tx:"#92400e",lb:"WARNING"}};
var BD=["jolt.com","joltup.com","safetyculture.com","safetyculture.io","fooddocs.com","fooddocs.io","zenput.com","crunchtime.com","bluecart.com","marketman.com","restaurant365.com","toast.com","toasttab.com"];
var BC=["jolt","safety culture","safetyculture","fooddocs","zenput","crunchtime","bluecart","marketman","toast pos","toasttab"];
function isBl(e,c){var d=(e||"").split("@")[1]||"";d=d.toLowerCase();var l=(c||"").toLowerCase();for(var i=0;i<BD.length;i++)if(d===BD[i]||d.endsWith("."+BD[i]))return 1;for(var i=0;i<BC.length;i++)if(l.indexOf(BC[i])>=0)return 1;return 0;}

var CA_COUNTIES=["Alameda","Alpine","Amador","Butte","Calaveras","Colusa","Contra Costa","Del Norte","El Dorado","Fresno","Glenn","Humboldt","Imperial","Inyo","Kern","Kings","Lake","Lassen","Los Angeles","Madera","Marin","Mariposa","Mendocino","Merced","Modoc","Mono","Monterey","Napa","Nevada","Orange","Placer","Plumas","Riverside","Sacramento","San Benito","San Bernardino","San Diego","San Francisco","San Joaquin","San Luis Obispo","San Mateo","Santa Barbara","Santa Clara","Santa Cruz","Shasta","Sierra","Siskiyou","Solano","Sonoma","Stanislaus","Sutter","Tehama","Trinity","Tulare","Tuolumne","Ventura","Yolo","Yuba"];

// ═══════════════════════════════════════
export default function LandingPage(){
  var navigate=useNavigate();
  var [modal,setModal]=useState(null);
  var [mf,setMf]=useState({first:"",last:"",email:"",company:"",locations:"1",msg:""});
  var [mDone,setMDone]=useState(false);
  var [step,setStep]=useState(0);
  var [lead,setLead]=useState({name:"",email:"",company:"",county:"",locations:"",phone:"",notes:""});
  var [slider,setSlider]=useState(8);
  var [stName,setStName]=useState("");
  var [stEmail,setStEmail]=useState("");
  var [stPhone,setStPhone]=useState("");
  var [stBiz,setStBiz]=useState("");
  var [stCounty,setStCounty]=useState("");
  var [stDone,setStDone]=useState(false);
  var stReady=stName&&stEmail&&stPhone&&stBiz&&stCounty;
  var [cookie,setCookie]=useState(true);
  var [irrOpen,setIrrOpen]=useState(false);
  var [mobileMenu,setMobileMenu]=useState(false);
  var [countdown,setCountdown]=useState({d:0,h:0,m:0,s:0});

  // Countdown to May 5, 2026
  useEffect(function(){
    var target=new Date("2026-05-05T00:00:00-07:00").getTime();
    function tick(){
      var diff=Math.max(0,target-Date.now());
      setCountdown({
        d:Math.floor(diff/86400000),
        h:Math.floor((diff%86400000)/3600000),
        m:Math.floor((diff%3600000)/60000),
        s:Math.floor((diff%60000)/1000)
      });
    }
    tick();
    var iv=setInterval(tick,1000);
    return function(){clearInterval(iv);};
  },[]);

  // Smooth scroll — React Router fix
  var scrollTo=useCallback(function(e,id){
    e.preventDefault();
    var el=document.getElementById(id);
    if(el)el.scrollIntoView({behavior:"smooth"});
    setMobileMenu(false);
  },[]);

  var av=ALL_V.slice(0,slider);
  var res=JR.map(function(j){return Object.assign({j:j},calc(j,av));});
  var blk=isBl(lead.email,lead.company);
  var lok=lead.name&&lead.email&&lead.company&&lead.county&&!blk;
  var cur=WK[step];

  var goldLine={position:"absolute",bottom:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,"+E.gold+",transparent)"};
  var bG={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.gold,color:E.w,fontFamily:ff};
  var bN={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.navy,color:E.w,fontFamily:ff};
  var bO={padding:"11px 22px",border:"2px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:"transparent",color:E.w,fontFamily:ff};
  var bGO={padding:"9px 18px",border:"2px solid "+E.gold,borderRadius:8,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",background:"transparent",color:E.gold,fontFamily:ff};
  var dinp={width:"100%",padding:"10px 12px",border:"1px solid "+S.bd,borderRadius:8,fontSize:"0.85rem",boxSizing:"border-box",outline:"none",background:E.w,color:S.tx,fontFamily:ff};
  var ginp={width:"100%",padding:"9px 11px",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,fontSize:"0.85rem",boxSizing:"border-box",outline:"none",background:"rgba(255,255,255,0.08)",color:E.w,fontFamily:ff};
  var lbl={fontSize:"0.72rem",fontWeight:600,color:"rgba(255,255,255,0.4)"};

  function openCalendly(){window.open("https://calendly.com/evidly/demo","_blank");}
  function openM(m){if(m==="demo"){openCalendly();return;}setModal(m);setMDone(false);setMf({first:"",last:"",email:"",company:"",locations:"1",msg:""});}
  function submitM(){if(!mf.first||!mf.email)return;var m=MD[modal];window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[EvidLY] "+m.subj+" - "+(mf.company||mf.first))+"&body="+encodeURIComponent("Name: "+mf.first+" "+mf.last+"\nEmail: "+mf.email+"\nCompany: "+mf.company+"\nLocations: "+mf.locations+(mf.msg?"\nMessage: "+mf.msg:"")),"_blank");setMDone(true);}

  function SL({t,c}){return <div style={{fontSize:"0.68rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:c||E.gold,marginBottom:10}}>{t}</div>;}

  var cdBox={display:"inline-flex",flexDirection:"column",alignItems:"center",padding:"6px 12px",background:"rgba(255,255,255,0.06)",borderRadius:8,minWidth:48};

  return(
  <div style={{fontFamily:ff,color:E.g8,lineHeight:1.6,background:E.cream,minHeight:"100vh"}}>
  <style>{`button{all:unset;box-sizing:border-box;cursor:pointer;} button:disabled{cursor:not-allowed;} a.btn{all:unset;box-sizing:border-box;cursor:pointer;display:inline-block;}
@media(max-width:768px){.lp-nav-links{display:none!important;}.lp-nav-btns{display:none!important;}.lp-hamburger{display:flex!important;}.lp-irr-grid{grid-template-columns:1fr!important;text-align:center!important;}.lp-footer-grid{grid-template-columns:1fr 1fr!important;}.lp-hero-btns{flex-direction:column!important;align-items:center!important;}}`}</style>

  {/* COOKIE */}
  {cookie&&<div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:E.w,borderTop:"1px solid "+E.g2,padding:"14px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 -2px 10px rgba(0,0,0,0.06)"}}>
    <p style={{flex:1,fontSize:"0.8rem",color:E.g6,margin:0,minWidth:200}}>We use cookies to enhance your experience. <a href="#" style={{color:E.navy}}>Cookie Policy</a></p>
    <button onClick={function(){setCookie(false);}} style={{padding:"7px 16px",borderRadius:6,border:"1px solid "+E.g2,background:E.w,fontSize:"0.78rem",fontWeight:600,cursor:"pointer",color:E.g6}}>Settings</button>
    <button onClick={function(){setCookie(false);}} style={{padding:"7px 16px",borderRadius:6,border:"none",background:E.navy,color:E.w,fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}>Accept All</button>
  </div>}

  {/* MODAL */}
  {modal&&<div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={function(){setModal(null);}}>
    <div style={{background:E.w,borderRadius:16,maxWidth:440,width:"100%",position:"relative",maxHeight:"90vh",overflow:"auto"}} onClick={function(e){e.stopPropagation();}}>
      <button onClick={function(){setModal(null);}} style={{position:"absolute",top:12,right:12,background:"none",border:"none",fontSize:20,cursor:"pointer",color:E.g4,zIndex:1}}>&times;</button>
      {mDone?(<div style={{padding:"48px 28px",textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:8}}>&#9989;</div><h3 style={{fontSize:"1.1rem",fontWeight:700,color:E.navy,marginBottom:6}}>You're all set!</h3><p style={{fontSize:"0.85rem",color:E.g5}}>Email client opened with your details. Or reach us at founders@getevidly.com.</p></div>)
      :MD[modal].si?(<div style={{padding:"32px 28px",textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:8}}>{MD[modal].ic}</div><h3 style={{fontWeight:700,color:E.navy,marginBottom:4}}>{MD[modal].t}</h3><p style={{fontSize:"0.85rem",color:E.g5,marginBottom:16}}>{MD[modal].s}</p><div style={{background:E.cream,borderRadius:10,padding:16,marginBottom:16,border:"1px solid "+E.g2}}><p style={{fontSize:"0.85rem",color:E.g6,margin:0}}>Launching May 5, 2026. Reserve your <strong>Founder spot</strong> now.</p></div><button onClick={function(){openM("signup");}} style={Object.assign({},bG,{width:"100%"})}>Reserve My Spot →</button></div>)
      :(<div style={{padding:"28px"}}><div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:"2.2rem",marginBottom:6}}>{MD[modal].ic}</div><h3 style={{fontWeight:700,color:E.navy,marginBottom:4}}>{MD[modal].t}</h3><p style={{fontSize:"0.82rem",color:E.g5}}>{MD[modal].s}</p></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}><div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>First Name *</label><input value={mf.first} onChange={function(e){setMf(Object.assign({},mf,{first:e.target.value}));}} style={dinp} placeholder="Jane"/></div><div><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>Last Name</label><input value={mf.last} onChange={function(e){setMf(Object.assign({},mf,{last:e.target.value}));}} style={dinp} placeholder="Kim"/></div></div>
        <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>Email *</label><input value={mf.email} onChange={function(e){setMf(Object.assign({},mf,{email:e.target.value}));}} style={dinp} placeholder="jane@restaurant.com"/></div>
        <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>Company</label><input value={mf.company} onChange={function(e){setMf(Object.assign({},mf,{company:e.target.value}));}} style={dinp} placeholder="Pacific Kitchen Group"/></div>
        <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>Locations</label><select value={mf.locations} onChange={function(e){setMf(Object.assign({},mf,{locations:e.target.value}));}} style={dinp}><option>1</option><option>2-5</option><option>6-10</option><option>11+</option></select></div>
        {MD[modal].msg&&<div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:E.g5}}>Message</label><textarea value={mf.msg} onChange={function(e){setMf(Object.assign({},mf,{msg:e.target.value}));}} style={Object.assign({},dinp,{minHeight:60,resize:"vertical",fontFamily:"inherit"})} placeholder="Tell us more..."/></div>}
        <button onClick={submitM} style={Object.assign({},MD[modal].c==="navy"?bN:bG,{width:"100%",marginTop:4})}>{MD[modal].b}</button>
        <p style={{fontSize:"0.72rem",color:E.g4,textAlign:"center",marginTop:8}}>Or <a href="mailto:founders@getevidly.com" style={{color:E.gold}}>founders@getevidly.com</a></p>
      </div>)}
    </div>
  </div>}

  {/* IRR FORM MODAL */}
  {irrOpen&&<InspectionReadinessForm sourcePage="landing" onClose={function(){setIrrOpen(false);}}/>}

  {/* CHAT WIDGET */}
  <div style={{position:"fixed",bottom:cookie?72:24,right:24,zIndex:150}}>
    <button onClick={function(){openM("chat");}} style={{width:52,height:52,borderRadius:"50%",background:E.navy,border:"none",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
  </div>

  {/* ═══ HEADER / NAVBAR ═══ */}
  <header style={{background:E.g1,borderBottom:"1px solid "+E.g2,padding:"0 24px",position:"sticky",top:0,zIndex:100}}>
    <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",height:60}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginRight:28}}><Logo s="1.4rem" tagline/></div>
      <nav className="lp-nav-links" style={{display:"flex",gap:18,flex:1}}>
        <a href="#how-it-works" onClick={function(e){scrollTo(e,"how-it-works");}} style={{textDecoration:"none",color:E.g5,fontWeight:500,fontSize:"0.82rem"}}>How It Works</a>
        <a href="#coverage" onClick={function(e){scrollTo(e,"coverage");}} style={{textDecoration:"none",color:E.g5,fontWeight:500,fontSize:"0.82rem"}}>Coverage</a>
        <a href="#pricing" onClick={function(e){scrollTo(e,"pricing");}} style={{textDecoration:"none",color:E.g5,fontWeight:500,fontSize:"0.82rem"}}>Pricing</a>
      </nav>
      <div className="lp-nav-btns" style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={function(){setIrrOpen(true);}} style={bGO}>{"✓"} Free Operations Check</button>
        <button onClick={openCalendly} style={Object.assign({},bG,{padding:"9px 18px",fontSize:"0.82rem"})}>Book a Tour</button>
        <button onClick={function(){openM("signin");}} style={{padding:"9px 14px",border:"1px solid "+E.g2,borderRadius:8,fontSize:"0.78rem",fontWeight:600,cursor:"pointer",background:E.w,color:E.g6}}>Sign In</button>
      </div>
      {/* Hamburger — mobile only */}
      <div className="lp-hamburger" style={{display:"none",marginLeft:"auto",cursor:"pointer",flexDirection:"column",gap:4,padding:8}} onClick={function(){setMobileMenu(!mobileMenu);}}>
        <div style={{width:22,height:2,background:E.navy,borderRadius:1}}/>
        <div style={{width:22,height:2,background:E.navy,borderRadius:1}}/>
        <div style={{width:22,height:2,background:E.navy,borderRadius:1}}/>
      </div>
    </div>
  </header>

  {/* MOBILE MENU */}
  {mobileMenu&&<div style={{position:"fixed",inset:0,zIndex:99,background:"rgba(0,0,0,0.4)"}} onClick={function(){setMobileMenu(false);}}>
    <div style={{position:"absolute",top:60,left:0,right:0,background:E.w,borderBottom:"1px solid "+E.g2,padding:"16px 24px",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}} onClick={function(e){e.stopPropagation();}}>
      <button onClick={function(){setIrrOpen(true);setMobileMenu(false);}} style={Object.assign({},bGO,{width:"100%",marginBottom:8,textAlign:"center",display:"block"})}>
        {"✓"} Free Operations Check
      </button>
      <a href="#how-it-works" onClick={function(e){scrollTo(e,"how-it-works");}} style={{display:"block",padding:"10px 0",fontSize:"0.88rem",color:E.g6,fontWeight:500,textDecoration:"none",borderBottom:"1px solid "+E.g2}}>How It Works</a>
      <a href="#coverage" onClick={function(e){scrollTo(e,"coverage");}} style={{display:"block",padding:"10px 0",fontSize:"0.88rem",color:E.g6,fontWeight:500,textDecoration:"none",borderBottom:"1px solid "+E.g2}}>Coverage</a>
      <a href="#pricing" onClick={function(e){scrollTo(e,"pricing");}} style={{display:"block",padding:"10px 0",fontSize:"0.88rem",color:E.g6,fontWeight:500,textDecoration:"none",borderBottom:"1px solid "+E.g2}}>Pricing</a>
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <button onClick={function(){openCalendly();setMobileMenu(false);}} style={Object.assign({},bG,{flex:1,textAlign:"center",fontSize:"0.82rem",padding:"10px 0"})}>Book a Tour</button>
        <button onClick={function(){openM("signin");setMobileMenu(false);}} style={{flex:1,padding:"10px 0",border:"1px solid "+E.g2,borderRadius:8,fontSize:"0.82rem",fontWeight:600,cursor:"pointer",background:E.w,color:E.g6,textAlign:"center"}}>Sign In</button>
      </div>
    </div>
  </div>}

  {/* ═══ HERO ═══ */}
  <section style={{padding:"80px 24px 64px",background:"linear-gradient(160deg,#2a3f6b,"+E.navy+")",textAlign:"center",position:"relative"}}>
    <div style={goldLine}/>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <h1 style={{fontSize:"clamp(1.8rem,5vw,3rem)",fontWeight:800,lineHeight:1.1,margin:"0 0 16px",color:E.w}}>Operations intelligence for <span style={{color:E.gold}}>California commercial kitchens.</span></h1>
      <p style={{fontSize:"1.05rem",color:"rgba(255,255,255,0.5)",maxWidth:540,margin:"0 auto 28px",lineHeight:1.7}}>Every operational signal — from a missed temperature to an expired certificate — mapped to its real dollar impact.</p>
      <div className="lp-hero-btns" style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button onClick={function(){openM("demo");}} style={Object.assign({},bG,{padding:"14px 30px",fontSize:"0.95rem"})}>See Where You Stand →</button>
        <button onClick={function(e){scrollTo(e,"pricing");}} style={Object.assign({},bO,{padding:"14px 24px",fontSize:"0.95rem"})}>See Pricing ↓</button>
      </div>
      <p style={{marginTop:16,fontSize:"0.8rem",color:"rgba(255,255,255,0.3)"}}>Launching May 5, 2026 · $99/mo founder pricing · 90+ kitchens already served</p>
    </div>
  </section>

  {/* ═══ IRR ABOVE FOLD ═══ */}
  <section style={{padding:"48px 24px",background:E.navy,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
    <div className="lp-irr-grid" style={{maxWidth:960,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:40,alignItems:"center"}}>
      <div>
        <div style={{fontSize:"0.68rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:E.goldL,marginBottom:10}}>Free Operations Check</div>
        <h2 style={{fontSize:"clamp(1.2rem,3vw,1.6rem)",fontWeight:800,color:E.w,margin:"0 0 12px",lineHeight:1.3}}>Know exactly where your kitchen stands — before anyone else tells you.</h2>
        <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.45)",lineHeight:1.7,margin:0}}>Get a personalized operations risk score. Every signal — temperatures, certifications, vendor records, facility safety — mapped to real dollar impact. Takes 2 minutes. No account required.</p>
      </div>
      <div style={{textAlign:"center"}}>
        <button onClick={function(){setIrrOpen(true);}} style={Object.assign({},bG,{padding:"16px 32px",fontSize:"0.95rem"})}>Get My Free Operations Check →</button>
        <p style={{fontSize:"0.76rem",color:"rgba(255,255,255,0.25)",marginTop:10}}>No credit card. No account. Just your score.</p>
      </div>
    </div>
  </section>

  {/* ═══ COVERAGE ═══ */}
  <section id="coverage" style={{padding:"72px 24px",background:E.w}}>
    <div style={{maxWidth:780,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <SL t="Coverage"/>
        <h2 style={{fontSize:"clamp(1.3rem,4vw,2rem)",fontWeight:800,color:E.navy,margin:"0 0 8px"}}>Food safety and facility safety. One place.</h2>
        <p style={{fontSize:"0.88rem",color:E.g5,maxWidth:540,margin:"0 auto"}}>Every operational signal — from a walk-in cooler reading to an expired hood cleaning certificate — becomes a dollar figure you can act on.</p>
      </div>
      <div style={{background:E.cream,borderRadius:16,padding:"28px 24px",border:"1px solid "+E.g2}}>
        {["Every temperature accounted for — receiving, holding, cooling, all in one place","Cooling events tracked from start to finish so nothing gets missed","HACCP documentation that builds itself from what you already do every day","Certifications and training records always current, always accessible","Your county's actual grading method applied to your data — so you see what an inspector would see","Run a self-inspection anytime and know exactly where you stand before anyone else walks in","Facility safety records — hoods, suppression, equipment, extinguishers — organized with the right frequencies","Vendor documentation stored, tracked, and flagged before anything expires","One dashboard for everything — no more binders, spreadsheets, or guessing"].map(function(f){return <div key={f} style={{display:"flex",gap:8,fontSize:"0.84rem",color:E.g6,marginBottom:8}}><span style={{color:E.gold,fontWeight:700,flexShrink:0}}>{"✓"}</span>{f}</div>;})}
      </div>
    </div>
  </section>

  {/* ═══ YOUR COUNTY — LIVE DEMO ═══ */}
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
        <div style={{display:"flex",justifyContent:"space-between",maxWidth:400,margin:"4px auto 0",fontSize:"0.68rem",color:E.g4}}><span>Clean</span><span style={{color:E.g4}}>Minor issues</span><span style={{color:E.wrn}}>Major issues</span><span style={{color:E.red}}>Critical</span></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
        {res.map(function(r){var st=STS[r.p];return(<div key={r.j.id} style={{borderRadius:12,border:"2px solid "+st.bd,overflow:"hidden",background:E.w}}>
          <div style={{padding:"10px 14px",background:st.bg}}><span style={{fontWeight:800,fontSize:"0.82rem",color:st.tx}}>{r.j.co}</span><span style={{float:"right",fontSize:"0.68rem",fontWeight:700,color:st.tx,textTransform:"uppercase"}}>{st.lb}</span></div>
          <div style={{padding:"12px 14px"}}><div style={{fontSize:"1.1rem",fontWeight:800,color:E.navy,marginBottom:4}}>{r.d}</div><div style={{fontSize:"0.72rem",color:E.g5}}>{r.j.ag}</div><div style={{fontSize:"0.72rem",color:E.g4,marginTop:4,fontStyle:"italic"}}>{r.j.h}</div></div>
        </div>);})}
      </div>
      <p style={{textAlign:"center",fontSize:"0.82rem",color:E.g5,marginTop:20}}>This is why county matters. EvidLY knows the difference.</p>
    </div>
  </section>

  {/* ═══ HOW IT WORKS ═══ */}
  <section id="how-it-works" style={{padding:"64px 24px 80px",background:"linear-gradient(160deg,#2a3f6b,"+E.navy+")"}}>
    <div style={{maxWidth:660,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <SL t="How It Works" c={E.goldL}/>
        <h2 style={{fontSize:"clamp(1.3rem,3.5vw,1.8rem)",fontWeight:800,color:E.w,margin:"0 0 6px"}}>What a day looks like in <Logo s="clamp(1.1rem,3vw,1.5rem)" light/></h2>
        <p style={{fontSize:"0.84rem",color:"rgba(255,255,255,0.4)"}}>6 steps. Every CalCode reference included.</p>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:20}}>
        {WK.map(function(w,i){return <div key={i} onClick={function(){setStep(i);}} style={{flex:1,height:4,borderRadius:2,background:i<=step?E.gold:"rgba(255,255,255,0.1)",cursor:"pointer",transition:"background 0.2s"}}/>;})}</div>
      <div style={{background:"rgba(255,255,255,0.04)",borderRadius:16,border:"1px solid rgba(255,255,255,0.08)",overflow:"hidden"}}>
        <div style={{padding:"22px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:"1.5rem"}}>{cur.ic}</div>
          <div><div style={{fontSize:"0.68rem",color:E.goldL,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Step {step+1} of {WK.length}</div><h3 style={{fontSize:"1.05rem",fontWeight:700,color:E.w,margin:0}}>{cur.t}</h3><div style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.4)"}}>{cur.su}</div></div>
        </div>
        <div style={{padding:"20px 24px"}}><p style={{fontSize:"0.86rem",color:"rgba(255,255,255,0.6)",lineHeight:1.7,margin:"0 0 14px"}}>{cur.tx}</p>
          <div style={{background:"rgba(160,140,90,0.08)",borderRadius:10,padding:"14px 16px",borderLeft:"3px solid "+E.gold,marginBottom:14}}><div style={{fontSize:"0.68rem",fontWeight:700,color:E.goldL,marginBottom:4}}>Why this matters</div><p style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.5)",margin:0,lineHeight:1.6}}>{cur.n}</p></div>
          <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.25)"}}>CalCode: {cur.a}</div>
        </div>
        <div style={{padding:"14px 24px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:10}}>
          {step>0&&<button onClick={function(){setStep(step-1);}} style={Object.assign({},bO,{padding:"8px 18px",fontSize:"0.8rem"})}>Back</button>}
          {step<WK.length-1?<button onClick={function(){setStep(step+1);}} style={Object.assign({},bG,{padding:"8px 18px",fontSize:"0.8rem",marginLeft:"auto"})}>Next: {WK[step+1].t} →</button>
          :<button onClick={function(){openM("demo");}} style={Object.assign({},bG,{padding:"8px 18px",fontSize:"0.8rem",marginLeft:"auto"})}>Get the Full Picture →</button>}
        </div>
      </div>
      {step===WK.length-1&&<div style={{marginTop:24,background:"rgba(255,255,255,0.04)",borderRadius:14,border:"1px solid rgba(255,255,255,0.08)",padding:24}}>
        <h3 style={{fontSize:"1rem",fontWeight:700,color:E.w,marginBottom:4}}>Want to see this for your county?</h3>
        <p style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.4)",marginBottom:16}}>Enter your details and we'll walk you through how it works for your specific location.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={lbl}>Name *</label><input value={lead.name} onChange={function(e){setLead(Object.assign({},lead,{name:e.target.value}));}} style={ginp} placeholder="Jane Kim"/></div>
          <div><label style={lbl}>Email *</label><input value={lead.email} onChange={function(e){setLead(Object.assign({},lead,{email:e.target.value}));}} style={ginp} placeholder="jane@restaurant.com"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={lbl}>Company *</label><input value={lead.company} onChange={function(e){setLead(Object.assign({},lead,{company:e.target.value}));}} style={ginp} placeholder="Pacific Kitchen"/></div>
          <div><label style={lbl}>County *</label><select value={lead.county} onChange={function(e){setLead(Object.assign({},lead,{county:e.target.value}));}} style={ginp}><option value="">Select...</option>{CA_COUNTIES.map(function(c){return <option key={c} value={c}>{c}</option>;})}</select></div>
        </div>
        {blk&&<div style={{background:E.redBg,border:"1px solid "+E.red,borderRadius:8,padding:10,marginBottom:10,fontSize:"0.78rem",color:E.red}}>Competitor domains are not eligible for demo access.</div>}
        <button disabled={!lok} onClick={function(){openM("demo");}} style={Object.assign({},bG,{width:"100%",opacity:lok?1:0.4})}>Show Me →</button>
      </div>}
    </div>
  </section>

  {/* ═══ SCORETABLE ═══ */}
  <section style={{background:"linear-gradient(160deg,"+S.charD+" 0%,"+S.char+" 100%)",padding:"56px 24px 64px",textAlign:"center",position:"relative"}}>
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,"+S.grnL+",transparent)"}}/>
    <div style={{maxWidth:620,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16}}>
        <STIcon sz={44}/><STLogo s="1.5rem" light/>
      </div>
      <div style={{display:"inline-block",padding:"6px 16px",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:100,fontSize:"0.72rem",fontWeight:700,color:"rgba(255,255,255,0.6)",letterSpacing:1,textTransform:"uppercase",marginBottom:20}}>Free from <STLogo s="0.72rem" light/> {"•"} No Account Required</div>
      <h2 style={{fontSize:"clamp(1.4rem,4vw,2.2rem)",fontWeight:800,color:E.w,lineHeight:1.15,margin:"0 0 10px"}}>Want to see how your county grades kitchens?</h2>
      <p style={{fontSize:"0.92rem",color:"rgba(255,255,255,0.5)",maxWidth:480,margin:"0 auto 28px"}}>62 agencies in California. Different methods. Different thresholds. Look up yours.</p>
      <div style={{background:S.bg,borderRadius:14,padding:24,border:"1px solid "+S.bd,textAlign:"left"}}>
        {!stDone?(<div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:"0.72rem",fontWeight:600,color:S.sub,display:"block",marginBottom:3}}>County</label>
            <select value={stCounty} onChange={function(e){setStCounty(e.target.value);}} style={dinp}>
              <option value="">Select your county...</option>
              {CA_COUNTIES.map(function(c){return <option key={c} value={c}>{c} County</option>;})}
            </select>
          </div>
          {stCounty&&<div style={{background:E.w,borderRadius:10,padding:16,border:"1px solid "+S.bd,marginBottom:14}}>
            <p style={{fontSize:"0.86rem",color:S.tx,fontWeight:700,marginBottom:4}}>{stCounty} County</p>
            <p style={{fontSize:"0.82rem",color:S.sub,margin:0}}>Enter your info to see {stCounty} County's full grading method, passing threshold, and what the numbers mean.</p>
          </div>}
          {stCounty&&<div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><label style={{fontSize:"0.72rem",fontWeight:600,color:S.sub}}>Name *</label><input value={stName} onChange={function(e){setStName(e.target.value);}} style={dinp} placeholder="Jane Kim"/></div>
              <div><label style={{fontSize:"0.72rem",fontWeight:600,color:S.sub}}>Phone *</label><input value={stPhone} onChange={function(e){setStPhone(e.target.value);}} style={dinp} placeholder="(555) 123-4567"/></div>
            </div>
            <div style={{marginBottom:10}}><label style={{fontSize:"0.72rem",fontWeight:600,color:S.sub}}>Email *</label><input value={stEmail} onChange={function(e){setStEmail(e.target.value);}} style={dinp} placeholder="jane@restaurant.com"/></div>
            <div style={{marginBottom:14}}><label style={{fontSize:"0.72rem",fontWeight:600,color:S.sub}}>Business Name *</label><input value={stBiz} onChange={function(e){setStBiz(e.target.value);}} style={dinp} placeholder="Pacific Kitchen"/></div>
            <button disabled={!stReady} onClick={function(){window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[ScoreTable] County Inquiry - "+stBiz+" ("+stCounty+")")+"&body="+encodeURIComponent("Name: "+stName+"\nEmail: "+stEmail+"\nPhone: "+stPhone+"\nBusiness: "+stBiz+"\nCounty: "+stCounty),"_blank");var slug=stCounty.toLowerCase().replace(/\s+/g,"-")+"-county";navigate("/scoretable/"+slug);}} style={Object.assign({},bN,{width:"100%",opacity:stReady?1:0.4})}>See {stCounty} County on ScoreTable →</button>
          </div>}
        </div>):(<div style={{textAlign:"center"}}>
          <div style={{fontSize:"1.5rem",marginBottom:8}}>{"✅"}</div>
          <p style={{fontSize:"0.9rem",fontWeight:700,color:S.tx,marginBottom:4}}>Thanks, {stName}!</p>
          <p style={{fontSize:"0.84rem",color:S.sub}}>Full {stCounty} County details launching with <STLogo s="0.84rem"/> on May 5, 2026.</p>
        </div>)}
      </div>
    </div>
  </section>

  {/* ═══ WHO BUILT THIS ═══ */}
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

  {/* ═══ FEATURE LIST (outside pricing — fixes countdown timer hook destruction) ═══ */}
  <section style={{padding:"48px 24px 0",background:E.cream}}>
    <div style={{maxWidth:800,margin:"0 auto",textAlign:"center"}}>
      <SL t="Everything Included"/>
      <h2 style={{fontSize:"clamp(1.1rem,3vw,1.5rem)",fontWeight:800,color:E.navy,margin:"0 0 20px"}}>One platform. Every signal. Every dollar.</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:8,textAlign:"left"}}>
        {["Scored against your county — not a generic checklist","Know where you stand before an inspector walks in","Every temp, checklist, and record in one place","Covers food safety and facility safety together","Your whole team, no extra cost","If it's not right in 45 days, you pay nothing"].map(function(f){return <div key={f} style={{display:"flex",gap:7,fontSize:"0.84rem",color:E.g6,padding:"6px 0"}}><span style={{color:E.gold,fontWeight:700,flexShrink:0}}>{"✓"}</span>{f}</div>;})}
      </div>
    </div>
  </section>

  {/* ═══ PRICING ═══ */}
  <section id="pricing" style={{padding:"40px 24px 72px",background:E.cream}}>
    <div style={{maxWidth:800,margin:"0 auto",textAlign:"center"}}>
      <SL t="Pricing"/>
      <h2 style={{fontSize:"clamp(1.3rem,4vw,2rem)",fontWeight:800,color:E.navy,margin:"0 0 8px"}}>Simple. Fair. Locked.</h2>

      {/* FounderUrgency countdown */}
      <div style={{display:"inline-flex",gap:12,alignItems:"center",background:"linear-gradient(135deg,"+E.navyD+","+E.navy+")",borderRadius:12,padding:"14px 24px",marginBottom:28}}>
        <span style={{fontSize:"0.72rem",fontWeight:700,color:E.goldL,textTransform:"uppercase",letterSpacing:1}}>Founder pricing locks in</span>
        <div style={{display:"flex",gap:8}}>
          <div style={cdBox}><span style={{fontSize:"1.1rem",fontWeight:800,color:E.w,lineHeight:1}}>{countdown.d}</span><span style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.4)",marginTop:2}}>days</span></div>
          <div style={cdBox}><span style={{fontSize:"1.1rem",fontWeight:800,color:E.w,lineHeight:1}}>{String(countdown.h).padStart(2,"0")}</span><span style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.4)",marginTop:2}}>hrs</span></div>
          <div style={cdBox}><span style={{fontSize:"1.1rem",fontWeight:800,color:E.w,lineHeight:1}}>{String(countdown.m).padStart(2,"0")}</span><span style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.4)",marginTop:2}}>min</span></div>
          <div style={cdBox}><span style={{fontSize:"1.1rem",fontWeight:800,color:E.w,lineHeight:1}}>{String(countdown.s).padStart(2,"0")}</span><span style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.4)",marginTop:2}}>sec</span></div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20}}>
        <div style={{background:E.cream,borderRadius:16,padding:"32px 24px",border:"2px solid "+E.gold,position:"relative"}}>
          <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:E.gold,color:E.w,fontWeight:700,fontSize:"0.7rem",padding:"4px 14px",borderRadius:100,textTransform:"uppercase",letterSpacing:1}}>Founder</div>
          <div style={{fontSize:"0.75rem",fontWeight:700,textTransform:"uppercase",color:E.gold,marginBottom:8,marginTop:4}}>For 1–10 Locations</div>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:4,marginBottom:6}}>
            <span style={{fontSize:"2.8rem",fontWeight:800,color:E.navy}}>$99</span><span style={{fontSize:"1rem",color:E.g4}}>/mo</span>
          </div>
          <p style={{fontSize:"0.82rem",color:E.g6,marginBottom:4}}>+ $49/mo per additional location</p>
          <div style={{display:"inline-block",background:E.grnBg,color:E.grn,fontWeight:700,fontSize:"0.76rem",padding:"5px 12px",borderRadius:8,marginBottom:16}}>This price is yours forever</div>
          <div style={{marginBottom:16}}>
            <button onClick={function(){openM("signup");}} style={Object.assign({},bN,{padding:"12px 32px",fontSize:"0.9rem"})}>Reserve My Spot →</button>
          </div>
          <p style={{fontSize:"0.76rem",color:E.g4,margin:0}}>87 of 100 founder spots remaining</p>
        </div>
        <div style={{background:E.cream,borderRadius:16,padding:"32px 24px",border:"1px solid "+E.g2}}>
          <div style={{fontSize:"0.75rem",fontWeight:700,textTransform:"uppercase",color:E.navy,marginBottom:8,marginTop:4}}>11+ Locations</div>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:4,marginBottom:6}}>
            <span style={{fontSize:"2.4rem",fontWeight:800,color:E.navy}}>Custom</span>
          </div>
          <p style={{fontSize:"0.82rem",color:E.g6,marginBottom:16}}>For operators running multiple locations who need one clear picture across all of them.</p>
          <div style={{display:"flex",flexDirection:"column",gap:7,textAlign:"left",maxWidth:280,margin:"0 auto 16px"}}>{["Everything in every location, visible in one place","Every location scored against its own jurisdiction","One login for your whole operation","Scales with you — no per-seat limits","Your brand, your platform if needed","Plug into your existing systems via API","A dedicated person who knows your account"].map(function(f){return <div key={f} style={{display:"flex",gap:7,fontSize:"0.82rem",color:E.g6}}><span style={{color:E.navy,fontWeight:700}}>{"✓"}</span>{f}</div>;})}</div>
          <button onClick={function(){openM("sales");}} style={Object.assign({},bG,{padding:"12px 32px",fontSize:"0.9rem"})}>Let's Talk →</button>
          <p style={{marginTop:10,fontSize:"0.76rem",color:E.g4}}>founders@getevidly.com | (855) EVIDLY1</p>
        </div>
      </div>
    </div>
  </section>

  {/* ═══ IRR SECTION ═══ */}
  <section id="irr" style={{padding:"64px 24px",background:"linear-gradient(160deg,"+E.navyD+","+E.navy+")",textAlign:"center",position:"relative"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,"+E.gold+",transparent)"}}/>
    <div style={{maxWidth:640,margin:"0 auto"}}>
      <SL t="Free Operations Check" c={E.goldL}/>
      <h2 style={{fontSize:"clamp(1.3rem,4vw,2rem)",fontWeight:800,color:E.w,margin:"0 0 12px",lineHeight:1.2}}>Your operation, scored. Every risk, in dollars.</h2>
      <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.45)",maxWidth:480,margin:"0 auto 24px",lineHeight:1.7}}>Get your free operations check and see exactly where you stand — before an inspector, carrier, or auditor does.</p>
      <button onClick={function(){setIrrOpen(true);}} style={Object.assign({},bG,{padding:"14px 28px",fontSize:"0.95rem"})}>Get My Free Operations Check →</button>
      <p style={{fontSize:"0.76rem",color:"rgba(255,255,255,0.25)",marginTop:12}}>No credit card. No account. 2 minutes.</p>
    </div>
  </section>

  {/* ═══ FINAL CTA ═══ */}
  <section style={{padding:"64px 24px",background:"linear-gradient(160deg,#2a3f6b,"+E.navy+")",textAlign:"center",position:"relative"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,"+E.gold+",transparent)"}}/>
    <h2 style={{fontSize:"clamp(1.4rem,4vw,2rem)",fontWeight:800,color:E.w,marginBottom:10}}>Lead with Confidence. Know Where You Stand.</h2>
    <p style={{fontSize:"0.92rem",color:"rgba(255,255,255,0.4)",marginBottom:22,maxWidth:460,margin:"0 auto 22px"}}>45 minutes. We'll walk your county, your dashboard, and answer every question.</p>
    <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
      <button onClick={function(){openM("demo");}} style={Object.assign({},bG,{padding:"12px 26px",fontSize:"0.9rem"})}>See Where You Stand →</button>
      <button onClick={function(e){scrollTo(e,"pricing");}} style={Object.assign({},bO,{padding:"12px 24px",fontSize:"0.9rem"})}>See Pricing ↓</button>
    </div>
  </section>

  {/* ═══ QUIET CREDIBILITY ═══ */}
  <section style={{padding:"28px 24px",background:"#354a73",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
    <p style={{maxWidth:600,margin:"0 auto",textAlign:"center",fontSize:"0.82rem",color:"rgba(255,255,255,0.25)",lineHeight:1.7,fontStyle:"italic"}}>The operations intelligence platform for California commercial kitchens.</p>
  </section>

  {/* FOOTER */}
  <footer style={{padding:"40px 24px 20px",background:"#354a73"}}>
    <div className="lp-footer-grid" style={{maxWidth:960,margin:"0 auto",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:24}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Logo s="0.95rem" light tagline/></div>
        <p style={{fontSize:"0.74rem",color:"rgba(255,255,255,0.25)",margin:"6px 0 8px",lineHeight:1.5,maxWidth:200}}>The operations intelligence platform for California commercial kitchens.</p>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}><STIcon sz={18}/><span style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.3)"}}><STLogo s="0.72rem" light/></span></div>
      </div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.4)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Product</h4>
        <a href="#how-it-works" onClick={function(e){scrollTo(e,"how-it-works");}} style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",textDecoration:"none",marginBottom:6}}>How It Works</a>
        <a href="#coverage" onClick={function(e){scrollTo(e,"coverage");}} style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",textDecoration:"none",marginBottom:6}}>Coverage</a>
        <a href="#pricing" onClick={function(e){scrollTo(e,"pricing");}} style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",textDecoration:"none",marginBottom:6}}>Pricing</a>
        <a href="/kitchen-check/merced-county" style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",textDecoration:"none",marginBottom:6}}>Kitchen Check</a>
      </div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.4)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Company</h4>{[["About Us","#"],["Kitchen to Community","/kitchen-to-community"],["Careers","#"],["Blog","#"]].map(function(l){return <a key={l[0]} href={l[1]} style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",textDecoration:"none",marginBottom:6}}>{l[0]}</a>;})}</div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.4)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Legal</h4>{["Privacy Policy","Terms of Service","Cookie Policy","Security"].map(function(l){return <a key={l} href="#" style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",textDecoration:"none",marginBottom:6}}>{l}</a>;})}</div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.4)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Contact</h4><a href="mailto:founders@getevidly.com" style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",textDecoration:"none",marginBottom:6}}>founders@getevidly.com</a><a href="tel:8553843591" style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",textDecoration:"none",marginBottom:6}}>(855) EVIDLY1</a><a href="tel:2096007675" style={{display:"block",fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",textDecoration:"none",marginBottom:6}}>(209) 600-7675</a></div>
    </div>
    <div style={{maxWidth:960,margin:"16px auto 0",paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <span style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.12)"}}>{"©"} 2026 <Logo s="0.7rem" light/>, LLC. All rights reserved.</span>
      <div style={{display:"flex",gap:16}}>{["Privacy Policy","Terms of Service","Cookie Policy","Do Not Sell My Info"].map(function(l){return <a key={l} href="#" style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.15)",textDecoration:"none"}}>{l}</a>;})}</div>
    </div>
  </footer>

  </div>);
}
