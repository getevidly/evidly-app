import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const C = {
  navy: "#1E2D4D", gold: "#A08C5A", goldD: "#8A7748",
  white: "#FFFFFF", cream: "#F8F7F4", g1: "#f5f5f4", g2: "#e7e5e4",
  g3: "#d6d3d1", g4: "#a8a29e", g5: "#78716c", g6: "#57534e", g8: "#1c1917",
  green: "#16a34a", greenBg: "#f0fdf4",
  orange: "#c2410c", orangeBg: "#fff7ed",
  red: "#dc2626", redBg: "#fef2f2",
  blue: "#1d4ed8", blueBg: "#eff6ff",
};
const FF = "system-ui,-apple-system,sans-serif";

const CA_COUNTIES = ["Alameda","Alpine","Amador","Butte","Calaveras","Colusa","Contra Costa","Del Norte","El Dorado","Fresno","Glenn","Humboldt","Imperial","Inyo","Kern","Kings","Lake","Lassen","Los Angeles","Madera","Marin","Mariposa","Mendocino","Merced","Modoc","Mono","Monterey","Napa","Nevada","Orange","Placer","Plumas","Riverside","Sacramento","San Benito","San Bernardino","San Diego","San Francisco","San Joaquin","San Luis Obispo","San Mateo","Santa Barbara","Santa Clara","Santa Cruz","Shasta","Sierra","Siskiyou","Solano","Sonoma","Stanislaus","Sutter","Tehama","Trinity","Tulare","Tuolumne","Ventura","Yolo","Yuba"];

const b = {
  gold:    { border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", background:C.gold, color:C.white, fontFamily:FF },
  navy:    { border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", background:C.navy, color:C.white, fontFamily:FF },
  outline: { border:"2px solid rgba(255,255,255,0.25)", borderRadius:8, fontWeight:700, cursor:"pointer", background:"transparent", color:C.white, fontFamily:FF },
  ghost:   { border:`2px solid ${C.g2}`, borderRadius:8, fontWeight:700, cursor:"pointer", background:"transparent", color:C.navy, fontFamily:FF },
};
const inp = { width:"100%", padding:"10px 12px", border:`1px solid ${C.g3}`, borderRadius:8, fontSize:"0.875rem", boxSizing:"border-box", outline:"none", background:C.white, color:C.g8, fontFamily:FF };

function Logo({ size="1.15rem", light=false, tagline=false }) {
  return (
    <span style={{ display:"inline-flex", flexDirection:"column", alignItems:"flex-start", gap:1, lineHeight:1 }}>
      <span style={{ fontWeight:800, fontSize:size, letterSpacing:"-0.03em", fontFamily:FF, lineHeight:1 }}>
        <span style={{ color:C.gold }}>E</span>
        <span style={{ color:light ? C.white : C.navy }}>vid</span>
        <span style={{ color:C.gold }}>LY</span>
      </span>
      {tagline && <span style={{ fontSize:`calc(${size} * 0.28)`, fontWeight:700, letterSpacing:"0.18em", color:light?"rgba(255,255,255,0.45)":"rgba(30,45,77,0.5)", textTransform:"uppercase", lineHeight:1, fontFamily:FF, whiteSpace:"nowrap" }}>Lead with Confidence</span>}
    </span>
  );
}

function Ey({ children }) {
  return <div style={{ fontSize:"0.68rem", fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", color:C.gold, marginBottom:10, fontFamily:FF }}>{children}</div>;
}

function Fld({ label, children, mb=0 }) {
  return <div style={{ marginBottom:mb||10 }}><label style={{ fontSize:"0.7rem", fontWeight:700, color:C.g5, display:"block", marginBottom:4, fontFamily:FF }}>{label}</label>{children}</div>;
}

function FounderUrgency() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const end = new Date("2026-07-04T23:59:59"), diff = Math.max(0, end - now);
  const dd = Math.floor(diff / 86400000), hh = Math.floor((diff % 86400000) / 3600000);
  const mm = Math.floor((diff % 3600000) / 60000), ss = Math.floor((diff % 60000) / 1000);
  return (
    <div style={{ background:C.navy, borderRadius:12, padding:"18px 22px", border:"1px solid rgba(160,140,90,0.25)", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
      <div style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", color:C.gold, marginBottom:10, textAlign:"center", fontFamily:FF }}>Founder Pricing Window Open</div>
      <div style={{ display:"flex", gap:20, justifyContent:"center", flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ textAlign:"center", minWidth:180 }}>
          <div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.35)", marginBottom:6, fontFamily:FF }}>Spots Remaining</div>
          <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:6, height:8, marginBottom:6, overflow:"hidden" }}><div style={{ height:"100%", width:"6%", background:`linear-gradient(90deg,${C.gold},${C.gold})`, borderRadius:6 }} /></div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.68rem", color:"rgba(255,255,255,0.3)", fontFamily:FF }}><span>3 of 50 claimed</span><span style={{ color:C.gold, fontWeight:800 }}>47 left</span></div>
        </div>
        <div style={{ width:1, height:44, background:"rgba(255,255,255,0.1)" }} />
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.35)", marginBottom:6, fontFamily:FF }}>Expires July 4, 2026</div>
          <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
            {[[dd,"Days"],[hh,"Hrs"],[mm,"Min"],[ss,"Sec"]].map(([v,l]) => (
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontWeight:900, fontSize:"1.4rem", color:C.white, lineHeight:1, fontVariantNumeric:"tabular-nums", minWidth:34, fontFamily:FF }}>{String(v).padStart(2,"0")}</div>
                <div style={{ fontSize:"0.58rem", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:FF }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p style={{ textAlign:"center", fontSize:"0.7rem", color:"rgba(255,255,255,0.22)", marginTop:10, marginBottom:0, fontFamily:FF }}>$99/mo first location + $49/mo per additional (up to 10), locked for life. After July 4 or 50 founders — $199/mo + $99/mo per location.</p>
    </div>
  );
}

function TourModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ first:"", last:"", email:"", company:"", county:"", locations:"1", challenge:"" });
  const [sub, setSub] = useState(false);
  const ready = form.first && form.email && form.company && form.county;
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  async function submit() {
    if (!ready) return;
    setSub(true);
    await new Promise(r => setTimeout(r, 700));
    setStep(2);
    setSub(false);
  }
  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
      <div style={{ background:C.white, borderRadius:16, maxWidth:460, width:"100%", position:"relative", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute", top:14, right:14, background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.g4, lineHeight:1, zIndex:1 }}>{"\u00D7"}</button>
        <div style={{ display:"flex", borderBottom:`1px solid ${C.g2}` }}>
          {["1  Your details","2  Pick your time"].map((lbl,i) => {
            const active = step===i+1, done = step>i+1;
            return <div key={i} style={{ flex:1, padding:"12px 16px", textAlign:"center", fontSize:"0.72rem", fontWeight:700, fontFamily:FF, color:active?C.navy:done?C.green:C.g4, borderBottom:`2px solid ${active?C.navy:done?C.green:"transparent"}` }}>{done?"\u2713 "+lbl.slice(2):lbl}</div>;
          })}
        </div>
        {step===1 && (
          <div style={{ padding:"28px 28px 24px" }}>
            <h3 style={{ fontWeight:800, color:C.navy, fontSize:"1.05rem", margin:"0 0 5px", fontFamily:FF }}>Book a Guided Tour</h3>
            <p style={{ fontSize:"0.82rem", color:C.g5, margin:"0 0 20px", fontFamily:FF, lineHeight:1.6 }}>Tell us about your operation and we'll align your jurisdictions before we meet.</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <Fld label="First Name *"><input value={form.first} onChange={set("first")} style={inp} placeholder="Jane" /></Fld>
              <Fld label="Last Name"><input value={form.last} onChange={set("last")} style={inp} placeholder="Kim" /></Fld>
            </div>
            <Fld label="Email *" mb={10}><input value={form.email} onChange={set("email")} style={inp} placeholder="jane@restaurant.com" type="email" /></Fld>
            <Fld label="Business Name *" mb={10}><input value={form.company} onChange={set("company")} style={inp} placeholder="Pacific Kitchen Group" /></Fld>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <Fld label="County *"><select value={form.county} onChange={set("county")} style={inp}><option value="">Select...</option>{CA_COUNTIES.map(c => <option key={c}>{c}</option>)}</select></Fld>
              <Fld label="Locations"><select value={form.locations} onChange={set("locations")} style={inp}><option>1</option><option>2-5</option><option>6-10</option><option>11+</option></select></Fld>
            </div>
            <Fld label="Biggest compliance challenge?" mb={18}><textarea value={form.challenge} onChange={set("challenge")} style={{...inp,minHeight:64,resize:"vertical"}} placeholder="e.g. Inspection prep, temp tracking..." /></Fld>
            <button disabled={!ready||sub} onClick={submit} style={{...b.navy,width:"100%",fontSize:"0.9rem",padding:"13px",opacity:ready&&!sub?1:0.4}}>{sub?"Sending...":"Submit & Pick a Time \u2192"}</button>
            <p style={{ fontSize:"0.7rem", color:C.g4, textAlign:"center", marginTop:8, fontFamily:FF }}>Goes directly to the EvidLY team. No auto-responders.</p>
          </div>
        )}
        {step===2 && (
          <div style={{ padding:"40px 28px", textAlign:"center" }}>
            <div style={{ fontSize:"2.2rem", marginBottom:12 }}>{"\uD83D\uDCEC"}</div>
            <h3 style={{ fontWeight:800, color:C.navy, fontSize:"1.05rem", margin:"0 0 8px", fontFamily:FF }}>Check your email to confirm.</h3>
            <p style={{ fontSize:"0.84rem", color:C.g5, lineHeight:1.7, fontFamily:FF }}>We sent a confirmation to <strong>{form.email}</strong>.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function scrollTo(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior:"smooth" }); }

function NavBar({ onTour, onIRR }) {
  const [open, setOpen] = useState(false);
  const NAV = [["How It Works","how-it-works"],["Coverage","coverage"],["Pricing","pricing"]];
  return (
    <header style={{ background:C.white, borderBottom:`1px solid ${C.g2}`, padding:"0 24px", position:"sticky", top:0, zIndex:100 }}>
      <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", height:68, gap:12 }}>
        <a href="/" style={{ textDecoration:"none", marginRight:20, flexShrink:0 }}><Logo size="1.45rem" tagline /></a>
        <nav style={{ display:"flex", gap:24, flex:1, alignItems:"center" }}>
          {NAV.map(([lbl,id]) => <button key={lbl} onClick={() => scrollTo(id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.g5, fontWeight:500, fontSize:"0.84rem", fontFamily:FF, padding:0 }}>{lbl}</button>)}
        </nav>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={onIRR} style={{ background:"transparent", border:`1.5px solid ${C.gold}`, color:C.gold, borderRadius:6, padding:"7px 14px", fontSize:"0.78rem", fontWeight:700, cursor:"pointer", fontFamily:FF, whiteSpace:"nowrap" }}>Free Operations Check</button>
          <button onClick={onTour} style={{...b.gold,padding:"9px 20px",fontSize:"0.82rem"}}>Book a Tour</button>
          <button onClick={() => setOpen(!open)} style={{ background:"none", border:"none", cursor:"pointer", padding:"8px 4px", display:"flex", flexDirection:"column", gap:4, marginLeft:4 }}>
            {[0,1,2].map(i => <span key={i} style={{ width:20, height:2, background:open?C.gold:C.g4, borderRadius:1, display:"block" }} />)}
          </button>
        </div>
      </div>
      {open && (
        <div style={{ background:C.white, borderTop:`1px solid ${C.g2}`, padding:"10px 24px 18px" }}>
          <button onClick={() => { setOpen(false); onIRR(); }} style={{ display:"block", width:"100%", textAlign:"left", background:"none", border:"none", cursor:"pointer", padding:"11px 0", fontSize:"0.9rem", color:C.gold, borderBottom:`1px solid ${C.g1}`, fontWeight:700, fontFamily:FF }}>{"\u2713"} Free Operations Check</button>
          {NAV.map(([lbl,id]) => <button key={lbl} onClick={() => { setOpen(false); scrollTo(id); }} style={{ display:"block", width:"100%", textAlign:"left", background:"none", border:"none", cursor:"pointer", padding:"11px 0", fontSize:"0.9rem", color:C.g6, borderBottom:`1px solid ${C.g1}`, fontWeight:500, fontFamily:FF }}>{lbl}</button>)}
          <button onClick={() => { setOpen(false); onTour(); }} style={{...b.gold,width:"100%",marginTop:14,padding:"13px",fontSize:"0.9rem"}}>Book a Guided Tour \u2192</button>
        </div>
      )}
    </header>
  );
}

function HeroSection({ onTour }) {
  return (
    <section style={{ padding:"88px 24px 72px", background:`linear-gradient(155deg,#253356,${C.navy})`, textAlign:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
      <div style={{ maxWidth:660, margin:"0 auto", position:"relative" }}>
        <div style={{ display:"inline-block", padding:"4px 14px", background:"rgba(160,140,90,0.15)", border:"1px solid rgba(160,140,90,0.3)", borderRadius:100, fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:C.gold, marginBottom:20, fontFamily:FF }}>Launching May 5, 2026 {"\u00B7"} Founder Pricing Open</div>
        <h1 style={{ fontSize:"clamp(1.9rem,5.5vw,3.1rem)", fontWeight:700, lineHeight:1.1, margin:"0 0 20px", color:C.white, fontFamily:FF, letterSpacing:"-0.02em" }}>Operations intelligence for <span style={{ color:C.gold }}>California commercial kitchens.</span></h1>
        <p style={{ fontSize:"1rem", color:"rgba(255,255,255,0.55)", maxWidth:520, margin:"0 auto 32px", lineHeight:1.75, fontFamily:FF }}>Food safety and facility safety — scored against your county's actual grading method. Every operational signal translated into revenue, liability, cost, and workforce risk. One dashboard. Real answers.</p>
        <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", alignItems:"center" }}>
          <button onClick={onTour} style={{...b.gold,padding:"15px 34px",fontSize:"0.97rem"}}>Book a Guided Tour \u2192</button>
          <button onClick={() => scrollTo("pricing")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"0.85rem", color:"rgba(255,255,255,0.4)", borderBottom:"1px solid rgba(255,255,255,0.18)", paddingBottom:1, fontFamily:FF }}>See Pricing {"\u2193"}</button>
        </div>
        <p style={{ marginTop:18, fontSize:"0.76rem", color:"rgba(255,255,255,0.22)", fontFamily:FF }}>$99/mo founder pricing — locked for life through July 4, 2026</p>
      </div>
    </section>
  );
}

function IRRAboveFold({ onIRR }) {
  return (
    <section style={{ background:C.navy, padding:"48px 24px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
      <div style={{ maxWidth:660, margin:"0 auto", position:"relative", display:"flex", alignItems:"center", gap:32, flexWrap:"wrap", justifyContent:"center" }}>
        <div style={{ flex:"1 1 300px", textAlign:"left" }}>
          <div style={{ display:"inline-block", padding:"3px 12px", background:"rgba(160,140,90,0.15)", border:"1px solid rgba(160,140,90,0.3)", borderRadius:100, fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:C.gold, marginBottom:12, fontFamily:FF }}>Free {"\u00B7"} 2 Minutes</div>
          <h2 style={{ fontSize:"clamp(1.15rem,3vw,1.45rem)", fontWeight:700, color:C.white, margin:"0 0 8px", lineHeight:1.2, letterSpacing:"-0.02em", fontFamily:FF }}>See how your operation is running <span style={{ color:C.gold }}>— right now.</span></h2>
          <p style={{ fontSize:"0.82rem", color:"rgba(255,255,255,0.45)", margin:0, lineHeight:1.7, fontFamily:FF }}>Daily activity, scored. Every risk in dollars. Takes 2 minutes — no account needed.</p>
        </div>
        <div style={{ flexShrink:0, textAlign:"center" }}>
          <button onClick={onIRR} style={{...b.gold,padding:"13px 28px",fontSize:"0.9rem",display:"block",marginBottom:8}}>Get My Free Operations Check \u2192</button>
          <p style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.22)", margin:0, fontFamily:FF }}>Used by 100+ California commercial kitchens</p>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section style={{ background:C.navy, borderBottom:"1px solid rgba(255,255,255,0.05)", padding:"20px 24px" }}>
      <div style={{ maxWidth:900, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center", gap:28, flexWrap:"wrap" }}>
        {[{s:"300+",l:"Commercial kitchens served per year"},{s:"62",l:"California jurisdictions covered"},{s:null,l:"Aramark \u00B7 Cintas \u00B7 Yosemite NPS"},{s:null,l:"IKECA Certified \u00B7 Veteran-Owned"}].map((item,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:28 }}>
            {i>0 && <div style={{ width:1, height:30, background:"rgba(255,255,255,0.08)" }} />}
            <div style={{ textAlign:"center" }}>
              {item.s && <div style={{ fontSize:"1.25rem", fontWeight:900, color:C.gold, lineHeight:1, fontFamily:FF }}>{item.s}</div>}
              <div style={{ fontSize:item.s?"0.66rem":"0.78rem", color:"rgba(255,255,255,0.35)", marginTop:item.s?2:0, fontFamily:FF }}>{item.l}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks({ onTour }) {
  const steps = [
    {n:"01",t:"Connect your county",b:"We load your jurisdiction's actual grading method — weights, thresholds, and passing criteria — so your data is scored the way your inspector scores it."},
    {n:"02",t:"Log your operations",b:"Temperatures, checklists, certifications, vendor documents, hood cleaning records. Everything in one place, updated in real time by your team."},
    {n:"03",t:"Know how your operation stands",b:"See your operational picture before anyone else does. Every signal becomes a dollar figure — what's at risk, what's exposed, and what it's costing you right now."},
  ];
  return (
    <section id="how-it-works" style={{ padding:"80px 24px", background:C.white }}>
      <div style={{ maxWidth:920, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <Ey>How It Works</Ey>
          <h2 style={{ fontSize:"clamp(1.4rem,4vw,2rem)", fontWeight:700, color:C.navy, margin:"0 0 10px", fontFamily:FF, letterSpacing:"-0.02em" }}>From your county to your dashboard in minutes.</h2>
          <p style={{ fontSize:"0.9rem", color:C.g5, maxWidth:480, margin:"0 auto", fontFamily:FF, lineHeight:1.7 }}>No manual setup. No generic checklists. EvidLY uses your jurisdiction's real scoring logic from day one.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
          {steps.map((s,i) => (
            <div key={i} style={{ padding:"32px 28px", background:i%2===0?C.cream:C.white, borderRadius:14, border:`1px solid ${C.g2}` }}>
              <div style={{ fontSize:"2.2rem", fontWeight:900, color:C.g2, lineHeight:1, marginBottom:14, fontFamily:FF }}>{s.n}</div>
              <h3 style={{ fontSize:"1rem", fontWeight:700, color:C.navy, margin:"0 0 10px", fontFamily:FF }}>{s.t}</h3>
              <p style={{ fontSize:"0.85rem", color:C.g5, margin:0, lineHeight:1.7, fontFamily:FF }}>{s.b}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", marginTop:36 }}><button onClick={onTour} style={{...b.navy,padding:"13px 30px",fontSize:"0.9rem"}}>See It Live on Your County \u2192</button></div>
      </div>
    </section>
  );
}

function Coverage() {
  const pillars = [
    {label:"Food Safety",icon:"\uD83C\uDF21\uFE0F",color:C.navy,items:["Temperature monitoring — receiving, holding, cooling, all tracked","HACCP documentation built automatically from daily logs","Food handler cards and ServSafe certs — always current","Morning and closing checklists mapped to CalCode conditions","Receiving logs with vendor history and rejection tracking"]},
    {label:"Facility Safety",icon:"\uD83D\uDD25",color:C.gold,items:["Hood cleaning schedules per NFPA 96-2024 Table 12.4 frequencies","Fire suppression inspection records and due-date alerts","Extinguisher documentation and service history","Vendor compliance — certs, insurance, service records","Equipment calibration logs and maintenance tracking"]},
  ];
  return (
    <section id="coverage" style={{ padding:"80px 24px", background:C.cream }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <Ey>What's Covered</Ey>
          <h2 style={{ fontSize:"clamp(1.4rem,4vw,2rem)", fontWeight:700, color:C.navy, margin:"0 0 10px", fontFamily:FF, letterSpacing:"-0.02em" }}>Food safety and facility safety.<br/>One place.</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          {pillars.map(p => (
            <div key={p.label} style={{ background:C.white, borderRadius:16, padding:"30px 26px", border:`1px solid ${C.g2}`, borderTop:`4px solid ${p.color}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}><span style={{ fontSize:"1.4rem" }}>{p.icon}</span><h3 style={{ fontSize:"1.05rem", fontWeight:700, color:p.color, margin:0, fontFamily:FF }}>{p.label}</h3></div>
              {p.items.map(item => <div key={item} style={{ display:"flex", gap:10, marginBottom:10, fontSize:"0.84rem", color:C.g6, lineHeight:1.55, fontFamily:FF }}><span style={{ color:p.color, flexShrink:0, fontWeight:700 }}>{"\u2713"}</span>{item}</div>)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Intelligence({ onTour }) {
  const pillars = [
    {icon:"\uD83D\uDCC8",label:"Revenue Protected",start:"Revenue at Risk",color:C.orange,bg:C.orangeBg,bd:"#fdba74",tx:"#7c2d12",h:"Without visibility, revenue loss happens before you can respond.",pts:["Temporary closure averages $12,000\u2013$18,000 in lost revenue per event","Inspection results are posted publicly before you can respond","Repeat violations trigger more frequent inspections"]},
    {icon:"\uD83D\uDEE1\uFE0F",label:"Liability Covered",start:"Liability Uncovered",color:"#991B1B",bg:C.redBg,bd:"#fca5a5",tx:"#7f1d1d",h:"Documentation gaps are your biggest legal exposure — and the easiest to close.",pts:["Foodborne illness without documentation logs = presumed negligence","Fire suppression gaps create premises liability beyond CalCode","PSE non-compliance may affect your coverage"]},
    {icon:"\uD83D\uDCA1",label:"Costs Controlled",start:"Costs Unpredictable",color:C.blue,bg:C.blueBg,bd:"#93c5fd",tx:"#1e3a8a",h:"Reactive maintenance costs 2\u20133\u00D7 what scheduled maintenance costs.",pts:["Emergency hood cleaning runs 2\u20133\u00D7 the cost of a scheduled visit","Reinspection fees: $200\u2013$500 per visit depending on jurisdiction","Expired certifications mean rushed replacements at premium pricing"]},
    {icon:"\u2705",label:"Always Ready",start:"Operations Challenged",color:"#166634",bg:"#f0fdf4",bd:"#86efac",tx:"#14532d",h:"Documentation gaps always surface at the worst possible moment.",pts:["Missing vendor records block your ability to prove due diligence","Unscheduled equipment downtime from missed calibration logs","Reinspection window shrinks when corrective actions aren't documented"]},
    {icon:"\uD83D\uDC65",label:"Team Current",start:"Workforce Uncertified",color:"#6B21A8",bg:"#faf5ff",bd:"#d8b4fe",tx:"#581c87",h:"Expired certifications are among the most cited violations in California.",pts:["Missing CFPM coverage = immediate critical violation in any CA jurisdiction","Food handler card gaps expose you to per-employee fines","Staff turnover without onboarding tracking leaves invisible certification holes"]},
  ];
  function Card({ p }) {
    return (
      <div style={{ background:p.bg, borderRadius:14, border:`1px solid ${p.bd}`, borderLeft:`4px solid ${p.color}`, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${p.bd}`, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:"1.1rem" }}>{p.icon}</span>
          <div><div style={{ fontSize:"0.62rem", fontWeight:600, color:p.color, opacity:0.55, textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:FF }}>{p.start}</div><div style={{ fontWeight:800, fontSize:"0.92rem", color:p.color, fontFamily:FF }}>{p.label}</div></div>
        </div>
        <div style={{ padding:"16px 18px", flex:1 }}>
          <p style={{ fontSize:"0.84rem", fontWeight:700, color:p.tx, margin:"0 0 12px", lineHeight:1.5, fontFamily:FF }}>{p.h}</p>
          {p.pts.map(pt => <div key={pt} style={{ display:"flex", gap:8, marginBottom:8, fontSize:"0.78rem", color:p.tx, lineHeight:1.5, fontFamily:FF }}><span style={{ color:p.color, flexShrink:0, fontWeight:700 }}>{"\u2192"}</span>{pt}</div>)}
        </div>
      </div>
    );
  }
  return (
    <section style={{ padding:"80px 24px", background:C.white }}>
      <div style={{ maxWidth:980, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <div style={{ display:"inline-block", padding:"4px 14px", background:"rgba(160,140,90,0.1)", border:"1px solid rgba(160,140,90,0.25)", borderRadius:100, fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:C.goldD, marginBottom:14, fontFamily:FF }}>Operations Intelligence Engine</div>
          <h2 style={{ fontSize:"clamp(1.4rem,4vw,2rem)", fontWeight:800, color:C.navy, margin:"0 0 12px", fontFamily:FF, letterSpacing:"-0.02em", lineHeight:1.2 }}>Every signal, from where you are<br/><span style={{ color:C.gold }}>to where you need to be.</span></h2>
          <p style={{ fontSize:"0.9rem", color:C.g5, maxWidth:500, margin:"0 auto", fontFamily:FF, lineHeight:1.7 }}>Most operators don't know where they stand until someone tells them. EvidLY gives you that picture first.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:14 }}>{pillars.slice(0,3).map(p => <Card key={p.label} p={p}/>)}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14, maxWidth:660, margin:"0 auto" }}>{pillars.slice(3).map(p => <Card key={p.label} p={p}/>)}</div>
        <div style={{ marginTop:28, background:C.cream, borderRadius:12, border:`1px solid ${C.g2}`, padding:"16px 20px" }}><p style={{ fontSize:"0.75rem", color:C.g5, margin:0, textAlign:"center", lineHeight:1.6, fontStyle:"italic", fontFamily:FF }}>Revenue and liability figures are general estimates based on publicly available industry data. PSE/insurance impacts vary by carrier, policy, and jurisdiction.</p></div>
        <div style={{ textAlign:"center", marginTop:32 }}><button onClick={onTour} style={{...b.gold,padding:"13px 30px",fontSize:"0.9rem"}}>See Your Operation's Full Picture \u2192</button></div>
      </div>
    </section>
  );
}

function Founders() {
  return (
    <section style={{ padding:"80px 24px", background:C.cream, borderTop:`1px solid ${C.g2}` }}>
      <div style={{ maxWidth:860, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <Ey>Who Built This</Ey>
          <h2 style={{ fontSize:"clamp(1.3rem,4vw,1.9rem)", fontWeight:700, color:C.navy, margin:"0 0 16px", fontFamily:FF, letterSpacing:"-0.02em" }}>Built from 300 kitchens a year. Not a whitepaper.</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:28 }}>
          <div style={{ background:C.white, borderRadius:14, padding:"26px 22px", border:`1px solid ${C.g2}`, borderTop:`4px solid ${C.navy}` }}><p style={{ fontSize:"0.86rem", color:C.g6, lineHeight:1.75, margin:0, fontFamily:FF }}>We're in over <strong>300 commercial kitchens every year</strong> — including Aramark's seven locations at Yosemite National Park, Cintas, and the largest operators across California's Central Valley. EvidLY was built from what we see on the ground every day.</p></div>
          <div style={{ background:C.white, borderRadius:14, padding:"26px 22px", border:`1px solid ${C.g2}`, borderTop:`4px solid ${C.gold}` }}><p style={{ fontSize:"0.86rem", color:C.g6, lineHeight:1.75, margin:0, fontFamily:FF }}>The compliance frameworks behind EvidLY come from two decades of enterprise security and regulatory consulting — for Blue Cross, Kaiser, the NFL, the State of Tennessee, and organizations that cannot afford to get it wrong.</p></div>
        </div>
        <div style={{ display:"flex", borderRadius:14, overflow:"hidden", border:`1px solid ${C.g2}` }}>
          {[{n:"300+",l:"Commercial kitchens per year"},{n:"20+",l:"Years in enterprise compliance"},{n:"62",l:"CA jurisdictions mapped"}].map((s,i) => (
            <div key={i} style={{ flex:"1 1 160px", padding:"22px 20px", textAlign:"center", background:C.white, borderLeft:i>0?`1px solid ${C.g2}`:"none" }}>
              <div style={{ fontSize:"1.6rem", fontWeight:900, color:C.navy, lineHeight:1, fontFamily:FF }}>{s.n}</div>
              <div style={{ fontSize:"0.72rem", color:C.g4, marginTop:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:FF }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onTour, onIRR }) {
  const ff = ["1\u201310 locations, all on one dashboard","Each location scored against its own county — not a generic checklist","Food safety and facility safety in one place","Your whole team included, no per-seat cost","Know how your operation stands — every single day","This price is yours forever — never increases","If it's not right in 45 days, you pay nothing"];
  const ef = ["Every location visible in one place","Each location scored against its own jurisdiction","Custom branding and API access available","No per-seat limits — scales with you","Dedicated account support","Pricing built around your operation"];
  return (
    <section id="pricing" style={{ padding:"80px 24px", background:C.white }}>
      <div style={{ maxWidth:820, margin:"0 auto", textAlign:"center" }}>
        <Ey>Pricing</Ey>
        <h2 style={{ fontSize:"clamp(1.4rem,4vw,2rem)", fontWeight:700, color:C.navy, margin:"0 0 8px", fontFamily:FF, letterSpacing:"-0.02em" }}>Simple. Fair. Locked.</h2>
        <p style={{ fontSize:"0.9rem", color:C.g5, maxWidth:460, margin:"0 auto 28px", fontFamily:FF, lineHeight:1.7 }}>Founder pricing available through July 4, 2026 — or the first 50 founders.</p>
        <FounderUrgency />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginTop:28 }}>
          <div style={{ background:C.white, borderRadius:16, padding:"36px 28px", border:`2px solid ${C.gold}`, position:"relative" }}>
            <div style={{ position:"absolute", top:-13, left:"50%", transform:"translateX(-50%)", background:C.gold, color:C.white, fontWeight:700, fontSize:"0.68rem", padding:"4px 16px", borderRadius:100, textTransform:"uppercase", whiteSpace:"nowrap", fontFamily:FF }}>Founder Pricing</div>
            <div style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", color:C.gold, marginBottom:10, marginTop:6, fontFamily:FF }}>1\u201310 Locations {"\u00B7"} Through July 4 or 50 Founders</div>
            <div style={{ background:C.cream, borderRadius:12, padding:"18px 16px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:4, marginBottom:4 }}><span style={{ fontSize:"2.8rem", fontWeight:900, color:C.navy, fontFamily:FF }}>$99</span><span style={{ fontSize:"1rem", color:C.g4, fontFamily:FF }}>/mo</span></div>
              <p style={{ fontSize:"0.8rem", color:C.g5, margin:"0 0 2px", fontFamily:FF }}>for your first location</p>
              <div style={{ width:"100%", height:1, background:C.g2, margin:"10px 0" }} />
              <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:4, marginBottom:2 }}><span style={{ fontSize:"1.8rem", fontWeight:900, color:C.navy, fontFamily:FF }}>+$49</span><span style={{ fontSize:"0.9rem", color:C.g4, fontFamily:FF }}>/mo per additional</span></div>
              <p style={{ fontSize:"0.78rem", color:C.g5, margin:0, fontFamily:FF }}>up to 10 locations total</p>
            </div>
            <div style={{ display:"inline-block", background:C.greenBg, color:C.green, fontWeight:700, fontSize:"0.74rem", padding:"5px 14px", borderRadius:8, marginBottom:20, fontFamily:FF }}>This price is yours forever — never increases</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, textAlign:"left", marginBottom:20 }}>{ff.map(f => <div key={f} style={{ display:"flex", gap:8, fontSize:"0.82rem", color:C.g6, fontFamily:FF, lineHeight:1.5 }}><span style={{ color:C.gold, fontWeight:700, flexShrink:0 }}>{"\u2713"}</span>{f}</div>)}</div>
            <button onClick={onTour} style={{...b.navy,width:"100%",padding:"14px",fontSize:"0.92rem"}}>Reserve My Founder Spot \u2192</button>
            <p style={{ marginTop:10, fontSize:"0.74rem", color:C.g4, fontFamily:FF }}>After July 4 or 50 founders — $199/mo + $99/mo per location</p>
          </div>
          <div style={{ background:C.cream, borderRadius:16, padding:"36px 28px", border:`1px solid ${C.g2}`, display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", color:C.g5, marginBottom:10, marginTop:6, fontFamily:FF }}>Enterprise {"\u00B7"} 11+ Locations</div>
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:4, marginBottom:8 }}><span style={{ fontSize:"2.4rem", fontWeight:900, color:C.navy, fontFamily:FF }}>Custom</span></div>
            <p style={{ fontSize:"0.84rem", color:C.g6, marginBottom:20, fontFamily:FF, lineHeight:1.7 }}>For operators and groups running 11 or more locations who need a single operational intelligence picture across their entire portfolio.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8, textAlign:"left", marginBottom:20 }}>{ef.map(f => <div key={f} style={{ display:"flex", gap:8, fontSize:"0.82rem", color:C.g6, fontFamily:FF, lineHeight:1.5 }}><span style={{ color:C.g5, fontWeight:700, flexShrink:0 }}>{"\u2713"}</span>{f}</div>)}</div>
            <div style={{ flex:1 }} />
            <button onClick={onTour} style={{...b.ghost,width:"100%",padding:"14px",fontSize:"0.92rem"}}>Let's Talk \u2192</button>
            <p style={{ marginTop:10, fontSize:"0.74rem", color:C.g4, fontFamily:FF }}>founders@getevidly.com {"\u00B7"} (855) EVIDLY1</p>
          </div>
        </div>
        <div style={{ marginTop:36, padding:"28px 32px", background:C.cream, borderRadius:14, border:`1px solid ${C.g2}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:20 }}>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:"0.68rem", fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:C.gold, marginBottom:6, fontFamily:FF }}>Not ready to commit?</div>
            <p style={{ fontSize:"0.9rem", fontWeight:700, color:C.navy, margin:"0 0 4px", fontFamily:FF }}>Start with a free Operations Check.</p>
            <p style={{ fontSize:"0.82rem", color:C.g5, margin:0, fontFamily:FF }}>2 minutes. No account required.</p>
          </div>
          <button onClick={onIRR} style={{...b.gold,padding:"12px 24px",fontSize:"0.88rem",flexShrink:0}}>Get My Free Operations Check \u2192</button>
        </div>
      </div>
    </section>
  );
}

function K2CSection({ onK2C }) {
  const [locs, setLocs] = useState(50);
  const meals = locs * 100;
  return (
    <section style={{ padding:"72px 24px", background:C.cream, borderTop:`1px solid ${C.g2}` }}>
      <div style={{ maxWidth:820, margin:"0 auto" }}>
        <div style={{ background:C.white, borderRadius:20, border:`1px solid ${C.g2}`, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.05)" }}>
          <div style={{ background:"linear-gradient(135deg,#14532d,#166534)", padding:"32px 36px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize:"32px 32px" }} />
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
            <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:24 }}>
              <div style={{ flex:"1 1 280px" }}>
                <div style={{ fontSize:"0.6rem", fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", color:C.gold, marginBottom:8, fontFamily:FF }}>Kitchen to Community {"\u00B7"} K2C</div>
                <h2 style={{ fontSize:"clamp(1.3rem,3.5vw,1.8rem)", fontWeight:800, color:C.white, margin:"0 0 10px", lineHeight:1.2, letterSpacing:"-0.02em", fontFamily:FF }}>Every kitchen.<br/>Every meal matters.</h2>
                <p style={{ fontSize:"0.84rem", color:"rgba(255,255,255,0.55)", margin:0, lineHeight:1.7, fontFamily:FF }}>$10 per location per month. ~100 meals donated. Tracked individually per location, per month.</p>
              </div>
              <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:16, padding:"22px 28px", border:"1px solid rgba(255,255,255,0.12)", flexShrink:0, textAlign:"center", minWidth:200 }}>
                <div style={{ fontSize:"0.62rem", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.12em", fontFamily:FF, marginBottom:8 }}>Meals at {locs} location{locs!==1?"s":""}</div>
                <div style={{ fontSize:"2.8rem", fontWeight:900, color:C.gold, lineHeight:1, fontFamily:FF, fontVariantNumeric:"tabular-nums" }}>{meals.toLocaleString()}</div>
                <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.3)", marginTop:4, fontFamily:FF }}>meals / month</div>
                <div style={{ marginTop:14 }}>
                  <input type="range" min={1} max={200} value={locs} onChange={e => setLocs(Number(e.target.value))} style={{ width:"100%", accentColor:C.gold, cursor:"pointer" }} />
                  <div style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.25)", fontFamily:FF, marginTop:3 }}>drag to see scale</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding:"28px 36px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
              {[{icon:"\uD83C\uDF7D\uFE0F",title:"$10 / location / month",body:"~100 meals donated per location. Automatically calculated and applied to every active subscription."},{icon:"\uD83D\uDCCA",title:"Tracked individually",body:"Every donation recorded per location, per month. Full history visible in your Admin Console."},{icon:"\uD83E\uDD1D",title:"Partner: No Kid Hungry",body:"Transparent reporting on where every dollar goes. Verified impact, not a marketing line."}].map(item => (
                <div key={item.title} style={{ background:C.cream, borderRadius:12, padding:"18px 16px", border:`1px solid ${C.g2}` }}>
                  <div style={{ fontSize:"1.4rem", marginBottom:8 }}>{item.icon}</div>
                  <div style={{ fontWeight:700, fontSize:"0.84rem", color:C.navy, marginBottom:6, fontFamily:FF }}>{item.title}</div>
                  <div style={{ fontSize:"0.76rem", color:C.g5, lineHeight:1.6, fontFamily:FF }}>{item.body}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"linear-gradient(135deg,#14532d,#166534)", borderRadius:12, padding:"16px 22px", marginBottom:24, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
              <span style={{ fontSize:"1.4rem" }}>{"\uD83C\uDF31"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:"0.88rem", color:C.white, fontFamily:FF, marginBottom:2 }}>At 2,000 locations — 2.4 million meals a year.</div>
                <div style={{ fontSize:"0.76rem", color:"rgba(255,255,255,0.5)", fontFamily:FF }}>Every EvidLY subscription is a direct contribution. No separate donation. No opt-in required.</div>
              </div>
              <div style={{ textAlign:"center", flexShrink:0 }}>
                <div style={{ fontSize:"1.6rem", fontWeight:900, color:C.gold, fontFamily:FF, lineHeight:1 }}>2.4M</div>
                <div style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.3)", fontFamily:FF, textTransform:"uppercase", letterSpacing:"0.1em" }}>meals / yr</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
              <p style={{ fontSize:"0.8rem", color:C.g5, margin:0, lineHeight:1.6, fontFamily:FF, maxWidth:440 }}>California commercial kitchens feed their communities every day. K2C makes sure that impact extends beyond the table — one meal per subscription, tracked and reported for every location you run.</p>
              <button onClick={onK2C} style={{...b.navy,padding:"12px 24px",fontSize:"0.88rem",flexShrink:0}}>Learn About K2C \u2192</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IRRSection({ onIRR }) {
  return (
    <section id="irr" style={{ padding:"72px 24px", background:`linear-gradient(155deg,#253356,${C.navy})`, textAlign:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
      <div style={{ maxWidth:580, margin:"0 auto", position:"relative" }}>
        <div style={{ display:"inline-block", padding:"4px 14px", background:"rgba(160,140,90,0.15)", border:"1px solid rgba(160,140,90,0.3)", borderRadius:100, fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:C.gold, marginBottom:18, fontFamily:FF }}>Free {"\u00B7"} Creates Your EvidLY Account</div>
        <h2 style={{ fontSize:"clamp(1.4rem,4vw,2rem)", fontWeight:700, color:C.white, margin:"0 0 14px", lineHeight:1.15, letterSpacing:"-0.02em", fontFamily:FF }}>Your operation, scored.<br/><span style={{ color:C.gold }}>Every risk, in dollars.</span></h2>
        <p style={{ fontSize:"0.9rem", color:"rgba(255,255,255,0.5)", maxWidth:420, margin:"0 auto 28px", lineHeight:1.75, fontFamily:FF }}>See how your operation is running in 2 minutes. Get your baseline report and your EvidLY account — instantly.</p>
        <button onClick={onIRR} style={{...b.gold,padding:"14px 34px",fontSize:"0.95rem"}}>Get My Free Operations Check \u2192</button>
        <p style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.2)", marginTop:12, fontFamily:FF }}>Used by 100+ California commercial kitchens</p>
      </div>
    </section>
  );
}

function FinalCTA({ onTour }) {
  return (
    <section style={{ padding:"72px 24px", background:`linear-gradient(155deg,#253356,${C.navy})`, textAlign:"center", position:"relative" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <h2 style={{ fontSize:"clamp(1.4rem,4vw,2rem)", fontWeight:700, color:C.white, margin:"0 0 12px", fontFamily:FF, letterSpacing:"-0.02em" }}>Ready to see it for your operation?</h2>
        <p style={{ fontSize:"0.92rem", color:"rgba(255,255,255,0.4)", marginBottom:28, lineHeight:1.7, fontFamily:FF }}>45 minutes. Your county, your numbers, your dashboard — live.</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", alignItems:"center" }}>
          <button onClick={onTour} style={{...b.gold,padding:"15px 34px",fontSize:"0.97rem"}}>Book a Guided Tour \u2192</button>
          <button onClick={() => scrollTo("pricing")} style={{...b.outline,padding:"15px 24px",fontSize:"0.9rem"}}>See Pricing {"\u2193"}</button>
        </div>
      </div>
    </section>
  );
}

function Footer({ onK2C }) {
  const col = { fontSize:"0.78rem", color:"rgba(255,255,255,0.35)", textDecoration:"none", display:"block", marginBottom:8, fontFamily:FF };
  const head = { fontSize:"0.65rem", fontWeight:800, color:"rgba(255,255,255,0.3)", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.12em", fontFamily:FF };
  return (
    <footer style={{ background:"#283f6a", padding:"48px 24px 28px" }}>
      <div style={{ maxWidth:1040, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:28, marginBottom:32 }}>
          <div>
            <Logo size="1rem" light tagline />
            <p style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.28)", marginTop:12, lineHeight:1.7, fontFamily:FF, maxWidth:260 }}>The operations intelligence platform for California commercial kitchens. Launching May 5, 2026.</p>
            <div style={{ marginTop:14 }}>
              <a href="mailto:founders@getevidly.com" style={{...col,color:"rgba(255,255,255,0.4)"}}>founders@getevidly.com</a>
              <span style={{...col,color:"rgba(255,255,255,0.4)"}}>(855) EVIDLY1</span>
            </div>
          </div>
          <div>
            <div style={head}>Product</div>
            <button onClick={() => scrollTo("how-it-works")} style={{...col,background:"none",border:"none",cursor:"pointer",padding:0}}>How It Works</button>
            <button onClick={() => scrollTo("coverage")} style={{...col,background:"none",border:"none",cursor:"pointer",padding:0}}>What's Covered</button>
            <button onClick={() => scrollTo("pricing")} style={{...col,background:"none",border:"none",cursor:"pointer",padding:0}}>Pricing</button>
            <span style={col}>Inspection Readiness</span>
            <span style={col}>ScoreTable {"\u2197"}</span>
          </div>
          <div>
            <div style={head}>Company</div>
            <button onClick={onK2C} style={{...col,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}}>Kitchen to Community</button>
            <span style={col}>Blog</span>
            <span style={col}>About Us</span>
          </div>
          <div>
            <div style={head}>Legal</div>
            <span style={col}>Privacy Policy</span>
            <span style={col}>Terms of Service</span>
            <span style={col}>Cookie Policy</span>
            <span style={col}>Security</span>
          </div>
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:14 }}>
          <span style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.15)", fontFamily:FF }}>{"\u00A9"} 2026 EvidLY LLC. All rights reserved. {"\u00B7"} IKECA Member #76716495 {"\u00B7"} Veteran-Owned</span>
        </div>
      </div>
    </footer>
  );
}

function CookieBanner({ onAccept, onClose }) {
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:200, background:C.white, borderTop:`1px solid ${C.g2}`, padding:"14px 24px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", boxShadow:"0 -2px 12px rgba(0,0,0,0.07)" }}>
      <p style={{ flex:1, fontSize:"0.8rem", color:C.g6, margin:0, fontFamily:FF, lineHeight:1.6 }}>We use cookies to improve your experience.</p>
      <button onClick={onClose} style={{ padding:"7px 14px", borderRadius:6, border:`1px solid ${C.g2}`, background:C.white, fontSize:"0.78rem", fontWeight:600, cursor:"pointer", color:C.g6, fontFamily:FF }}>Manage</button>
      <button onClick={onAccept} style={{ padding:"7px 16px", borderRadius:6, border:"none", background:C.navy, color:C.white, fontSize:"0.78rem", fontWeight:600, cursor:"pointer", fontFamily:FF }}>Accept All</button>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [tourOpen, setTourOpen] = useState(false);
  const [cookie, setCookie] = useState(true);
  const openTour = useCallback(() => setTourOpen(true), []);
  const openIRR = useCallback(() => navigate("/operations-check"), [navigate]);
  const openK2C = useCallback(() => navigate("/kitchen-to-community"), [navigate]);
  return (
    <div style={{ fontFamily:FF, color:C.g8, lineHeight:1.6, background:C.cream, minHeight:"100vh" }}>
      <style>{`*,*::before,*::after{box-sizing:border-box;}button{all:unset;cursor:pointer;}`}</style>
      {tourOpen && <TourModal onClose={() => setTourOpen(false)} />}
      {cookie && <CookieBanner onAccept={() => setCookie(false)} onClose={() => setCookie(false)} />}
      <NavBar onTour={openTour} onIRR={openIRR} />
      <HeroSection onTour={openTour} />
      <IRRAboveFold onIRR={openIRR} />
      <TrustBar />
      <HowItWorks onTour={openTour} />
      <Coverage />
      <Intelligence onTour={openTour} />
      <Founders />
      <Pricing onTour={openTour} onIRR={openIRR} />
      <K2CSection onK2C={openK2C} />
      <IRRSection onIRR={openIRR} />
      <FinalCTA onTour={openTour} />
      <Footer onK2C={openK2C} />
    </div>
  );
}
