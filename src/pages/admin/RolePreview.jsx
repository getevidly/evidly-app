import { useState } from "react";

const NAVY = "#0B1628";
const GOLD = "#C49A2B";
const BODY_TEXT = "#1A2535";
const MUTED = "#6B7F96";
const STEEL_SLATE = "linear-gradient(135deg, #2A4A7F 0%, #1E3A6E 60%, #2C4F8A 100%)";
const PAGE_BG = "#F5F6F8";
const SIDEBAR_BG = "#1E3A5F";
const SIDEBAR_TEXT = "#94a3b8";
const SIDEBAR_ACTIVE_BG = "rgba(30,64,175,0.3)";
const FONT = { fontFamily: "system-ui,-apple-system,sans-serif" };

const NAV_SECTIONS = [
  { id:"top", label:null, items:[{ id:"dashboard",label:"Dashboard",icon:"⊞"},{ id:"calendar",label:"Calendar",icon:"📅"}] },
  { id:"food_safety", label:"FOOD SAFETY", items:[
    { id:"checklists",label:"Checklists",icon:"✅"},
    { id:"temperatures",label:"Temperature Readings",icon:"🌡️"},
    { id:"log-temp",label:"Log Temp",icon:"🌡️"},
    { id:"haccp",label:"HACCP",icon:"🔬"},
    { id:"corrective-actions",label:"Corrective Actions",icon:"🔧"},
    { id:"incidents",label:"Incidents",icon:"⚠️"},
    { id:"incident-reporting",label:"Incident Reporting",icon:"📝"},
    { id:"incident-playbook",label:"Incident Playbook",icon:"📖"},
    { id:"report-issue",label:"Report Issue",icon:"🚨"},
  ]},
  { id:"facility_safety", label:"FACILITY SAFETY", items:[
    { id:"fire-safety",label:"Fire Safety",icon:"🔥"},
    { id:"vendor-services",label:"Vendor Services",icon:"🛠️"},
  ]},
  { id:"compliance", label:"COMPLIANCE", items:[
    { id:"documents",label:"Documents",icon:"📄"},
    { id:"self-inspection",label:"Self-Inspection",icon:"🔍"},
    { id:"training-records",label:"Training Records",icon:"🎓"},
  ]},
  { id:"insights", label:"INSIGHTS", items:[
    { id:"ai-insights",label:"AI Insights",icon:"🤖"},
    { id:"alerts",label:"Alerts",icon:"🔔"},
    { id:"analytics",label:"Analytics",icon:"📊"},
    { id:"benchmarks",label:"Benchmarks",icon:"📐"},
    { id:"insurance-score",label:"Insurance Score",icon:"🛡️"},
    { id:"iot-monitoring",label:"IoT Monitoring",icon:"📡"},
    { id:"jurisdiction-intel",label:"Jurisdiction Intelligence",icon:"⚖️"},
    { id:"leaderboard",label:"Leaderboard",icon:"🏆"},
    { id:"operations-intel",label:"Operations Intelligence",icon:"🧠"},
    { id:"regulatory",label:"Regulatory Updates",icon:"📰"},
    { id:"reporting",label:"Reporting",icon:"📈"},
  ]},
  { id:"tools", label:"TOOLS", items:[
    { id:"inspector-view",label:"Inspector View",icon:"👁️"},
    { id:"photos",label:"Photos",icon:"📷"},
    { id:"self-diagnosis",label:"Self-Diagnosis",icon:"🔬"},
    { id:"vendor-connect",label:"Vendor Connect",icon:"🛒"},
  ]},
  { id:"administration", label:"ADMINISTRATION", items:[
    { id:"equipment-admin",label:"Equipment",icon:"⚙️"},
    { id:"locations",label:"Locations",icon:"📍"},
    { id:"roles-permissions",label:"Roles & Permissions",icon:"🔑"},
    { id:"sensors-admin",label:"Sensors",icon:"📡"},
    { id:"settings",label:"Settings",icon:"⚙️"},
    { id:"team",label:"Team",icon:"👥"},
    { id:"vendors",label:"Vendors",icon:"🏢"},
  ]},
  { id:"help", label:null, items:[{ id:"help",label:"Help",icon:"❓"}] },
];

const ROLE_ITEMS = {
  owner_operator:{ top:["dashboard","calendar"],food_safety:["checklists","temperatures","haccp","corrective-actions","incidents","incident-reporting","incident-playbook"],facility_safety:["fire-safety","vendor-services"],compliance:["documents","self-inspection","training-records"],insights:["jurisdiction-intel","operations-intel","ai-insights","analytics","reporting","regulatory","alerts","iot-monitoring","insurance-score","leaderboard","benchmarks"],tools:["vendor-connect","photos","inspector-view","self-diagnosis"],administration:["vendors","team","locations","equipment-admin","sensors-admin","roles-permissions","settings"],help:["help"] },
  executive:{ top:["dashboard","calendar"],food_safety:["incident-playbook"],facility_safety:[],compliance:["documents","training-records"],insights:["jurisdiction-intel","operations-intel","ai-insights","analytics","reporting","regulatory","alerts","insurance-score","leaderboard","benchmarks"],tools:["inspector-view"],administration:["locations","settings"],help:["help"] },
  compliance_manager:{ top:["dashboard","calendar"],food_safety:["checklists","temperatures","haccp","corrective-actions","incidents","incident-playbook"],facility_safety:["fire-safety","vendor-services"],compliance:["documents","self-inspection","training-records"],insights:["jurisdiction-intel","operations-intel","ai-insights","analytics","reporting","regulatory","alerts","insurance-score"],tools:["inspector-view","self-diagnosis"],administration:["locations","settings"],help:["help"] },
  facilities:{ top:["dashboard","calendar"],food_safety:["incidents","incident-reporting","incident-playbook"],facility_safety:["fire-safety","vendor-services"],compliance:["documents","training-records"],insights:["reporting","regulatory","alerts","iot-monitoring"],tools:["vendor-connect","inspector-view","self-diagnosis"],administration:["vendors","locations","equipment-admin","sensors-admin","settings"],help:["help"] },
  chef:{ top:["dashboard","calendar"],food_safety:["checklists","temperatures","haccp","corrective-actions"],facility_safety:[],compliance:["documents","training-records"],insights:["ai-insights"],tools:["self-diagnosis"],administration:["team","settings"],help:["help"] },
  kitchen_manager:{ top:["dashboard","calendar"],food_safety:["checklists","temperatures","haccp","corrective-actions","incidents","incident-reporting","incident-playbook"],facility_safety:["vendor-services"],compliance:["documents","training-records"],insights:["ai-insights","analytics","reporting","alerts"],tools:["vendor-connect","photos","inspector-view","self-diagnosis"],administration:["vendors","team","locations","equipment-admin","settings"],help:["help"] },
  kitchen_staff:{ top:["dashboard"],food_safety:["log-temp","checklists","report-issue"],facility_safety:[],compliance:[],insights:[],tools:[],administration:[],help:["help"] },
};

const ROLES = [
  { id:"owner_operator",     label:"Owner / Operator",   short:"Owner",      color:"#1E40AF" },
  { id:"executive",          label:"Executive",          short:"Executive",  color:"#6B21A8" },
  { id:"compliance_manager", label:"Compliance Manager", short:"Compliance", color:"#065F46" },
  { id:"facilities",         label:"Facilities Manager", short:"Facilities", color:"#9A3412" },
  { id:"chef",               label:"Chef",               short:"Chef",       color:"#1E3A5F" },
  { id:"kitchen_manager",    label:"Kitchen Manager",    short:"Mgr",        color:"#78350F" },
  { id:"kitchen_staff",      label:"Kitchen Staff",      short:"Staff",      color:"#374151" },
];

function Sidebar({ role, activeItem, onItem, compact }) {
  const roleItems = ROLE_ITEMS[role] || ROLE_ITEMS.owner_operator;
  return (
    <div style={{ width:compact?44:180, background:SIDEBAR_BG, height:"100%", display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto", overflowX:"hidden" }}>
      <div style={{ padding:compact?"10px 0":"10px 12px", display:"flex", alignItems:"center", gap:7, borderBottom:"1px solid rgba(255,255,255,0.05)", justifyContent:compact?"center":"flex-start" }}>
        <div style={{ width:24, height:24, borderRadius:5, background:"rgba(196,154,43,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:10, fontWeight:900, color:GOLD }}>E</span>
        </div>
        {!compact && <span style={{ fontSize:12, fontWeight:900, letterSpacing:"-0.03em" }}><span style={{ color:GOLD }}>E</span><span style={{ color:"white" }}>vid</span><span style={{ color:GOLD }}>LY</span></span>}
      </div>
      <div style={{ flex:1, paddingTop:4 }}>
        {NAV_SECTIONS.map(section => {
          const allowed = roleItems[section.id] || [];
          const visible = section.items.filter(i => allowed.includes(i.id));
          if (!visible.length) return null;
          return (
            <div key={section.id} style={{ marginBottom:1 }}>
              {section.label && !compact && (
                <div style={{ padding:"5px 10px 1px" }}>
                  <span style={{ fontSize:7, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.1em" }}>{section.label}</span>
                </div>
              )}
              {visible.map(item => {
                const isActive = activeItem === item.id;
                return (
                  <div key={item.id} onClick={()=>onItem(item.id)} style={{ display:"flex", alignItems:"center", gap:7, padding:compact?"6px 0":"5px 12px", background:isActive?SIDEBAR_ACTIVE_BG:"transparent", borderLeft:isActive?`2px solid ${GOLD}`:"2px solid transparent", justifyContent:compact?"center":"flex-start", cursor:"pointer" }}>
                    <span style={{ fontSize:11 }}>{item.icon}</span>
                    {!compact && <span style={{ fontSize:10, color:isActive?"white":SIDEBAR_TEXT, fontWeight:isActive?600:400, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.label}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background:"white", borderRadius:7, border:"1px solid #e5e7eb", overflow:"hidden", ...style }}>{children}</div>;
}
function CH({ title, action }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderBottom:"1px solid #f3f4f6" }}>
      <span style={{ fontSize:10, fontWeight:700, color:BODY_TEXT, ...FONT }}>{title}</span>
      {action && <span style={{ fontSize:9, color:NAVY, fontWeight:600, cursor:"pointer" }}>{action} →</span>}
    </div>
  );
}
function TaskRow({ label, status, sublabel }) {
  const dot = status==="done"?"#16a34a":status==="overdue"?"#dc2626":status==="in_progress"?GOLD:"#d1d5db";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", borderBottom:"1px solid #f9fafb", background:status==="overdue"?"#fef2f2":"white" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:dot, flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:10, color:status==="done"?"#9ca3af":BODY_TEXT, textDecoration:status==="done"?"line-through":"none", ...FONT }}>{label}</div>
        {sublabel && <div style={{ fontSize:8, color:MUTED, ...FONT }}>{sublabel}</div>}
      </div>
    </div>
  );
}
function LocRow({ name, city, food, fire, open }) {
  const fc={ok:{bg:"#f0fdf4",c:"#166534",l:"✓"},action:{bg:"#fef2f2",c:"#991b1b",l:"!"},pending:{bg:"#fffbeb",c:"#92400e",l:"~"}};
  const fp=fc[food]||{bg:"#f1f5f9",c:"#475569",l:"?"}, rp=fc[fire]||{bg:"#f1f5f9",c:"#475569",l:"?"};
  const dot=food==="ok"&&fire==="ok"?"#16a34a":food==="action"||fire==="action"?"#dc2626":GOLD;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderBottom:"1px solid #f9fafb" }}>
      <span style={{ width:7, height:7, borderRadius:"50%", background:dot, flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:10, fontWeight:600, color:BODY_TEXT, ...FONT }}>{name} <span style={{ fontWeight:400, color:MUTED }}>· {city}</span></div>
        <div style={{ display:"flex", gap:4, marginTop:2 }}>
          <span style={{ fontSize:7, fontWeight:700, background:fp.bg, color:fp.c, borderRadius:3, padding:"1px 5px" }}>Food {fp.l}</span>
          <span style={{ fontSize:7, fontWeight:700, background:rp.bg, color:rp.c, borderRadius:3, padding:"1px 5px" }}>Fire {rp.l}</span>
        </div>
      </div>
      {open>0 && <span style={{ background:"#fef2f2", color:"#991b1b", borderRadius:10, padding:"1px 6px", fontSize:7, fontWeight:700 }}>{open} open</span>}
    </div>
  );
}
function Banner({ status, headline, sub, pillars, pills }) {
  const isR=status==="risk", isC=status==="covered";
  const bg=isR?"linear-gradient(135deg,#2D0A00,#6B1A0A)":STEEL_SLATE;
  const sc=isC?GOLD:isR?"#fc8181":"#FCD34D";
  const sl=isC?"✓ You're covered":isR?"! Action required":"⚠ Needs attention";
  return (
    <div style={{ background:bg, borderRadius:9, padding:"14px 16px", color:"white", marginBottom:10, ...FONT }}>
      <div style={{ fontSize:8, fontWeight:800, color:sc, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:5 }}>{sl}</div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:pills?10:0 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, lineHeight:1.3, marginBottom:2 }}>{headline}</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.45)" }}>{sub}</div>
        </div>
        {pillars && (
          <div style={{ display:"flex", gap:5, flexShrink:0 }}>
            {pillars.map(p=>(
              <div key={p.l} style={{ background:p.ok?"rgba(255,255,255,0.08)":"rgba(220,38,38,0.18)", border:`1px solid ${p.ok?"rgba(255,255,255,0.1)":"rgba(220,38,38,0.35)"}`, borderRadius:6, padding:"7px 10px", textAlign:"center", minWidth:56 }}>
                <div style={{ fontSize:12, fontWeight:800, color:p.ok?GOLD:"#fc8181" }}>{p.v}</div>
                <div style={{ fontSize:7, color:"rgba(255,255,255,0.4)", marginTop:1 }}>{p.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {pills && <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{pills}</div>}
    </div>
  );
}
function SPill({ icon, label, value }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:6, padding:"6px 10px", display:"flex", gap:6, alignItems:"center", border:"1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize:12 }}>{icon}</span>
      <div>
        <div style={{ fontSize:7, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</div>
        <div style={{ fontSize:11, fontWeight:700, color:"white" }}>{value}</div>
      </div>
    </div>
  );
}
function Att({ sev, title, loc, pillar, risk }) {
  const rc={liability:{bg:"#fef2f2",c:"#991b1b",l:"Liability"},revenue:{bg:"#fffbeb",c:"#92400e",l:"Revenue"},cost:{bg:"#f0f4ff",c:"#3730a3",l:"Cost"},operational:{bg:"#f0fdf4",c:"#166534",l:"Operational"}};
  const rb=rc[risk]||rc.operational;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px", borderBottom:"1px solid #f9fafb", background:sev==="critical"?"#fef2f2":"white" }}>
      <span style={{ fontSize:11 }}>{sev==="critical"?"🔴":"🟡"}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:10, fontWeight:600, color:sev==="critical"?"#991b1b":BODY_TEXT, ...FONT }}>{title}</div>
        <div style={{ fontSize:8, color:MUTED, ...FONT }}>{loc} · {pillar}</div>
      </div>
      <span style={{ background:rb.bg, color:rb.c, borderRadius:3, padding:"1px 5px", fontSize:7, fontWeight:700 }}>{rb.l}</span>
    </div>
  );
}

function OOContent() {
  const [tab, setTab] = useState("standing");
  return (
    <div>
      <Banner status="attention" headline="Mostly covered. Fire safety needs attention." sub="Pacific Catering Co. · 3 locations" pillars={[{l:"Food",v:"3/3",ok:true},{l:"Fire",v:"2/3",ok:false},{l:"Open",v:"4",ok:false}]} />
      <div style={{ display:"flex", borderBottom:"1px solid #e5e7eb", marginBottom:10 }}>
        {[["standing","📍 Standing"],["action","⚡ Actions"],["upcoming","📅 Upcoming"]].map(([t,lb])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"5px 12px", border:"none", background:"none", cursor:"pointer", fontSize:10, fontWeight:tab===t?700:500, color:tab===t?NAVY:MUTED, borderBottom:tab===t?`2px solid ${NAVY}`:"2px solid transparent", marginBottom:-1, ...FONT }}>{lb}</button>
        ))}
      </div>
      {tab==="standing" && <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <Card><CH title="Location Standing" /><LocRow name="Main Kitchen" city="Fresno" food="ok" fire="ok" open={0} /><LocRow name="Catering Hub" city="Modesto" food="ok" fire="action" open={3} /><LocRow name="Central Kitchen" city="Merced" food="ok" fire="pending" open={1} /></Card>
        <Card><CH title="Today's Operations" /><TaskRow label="Afternoon temp logs" status="in_progress" sublabel="2 of 8" /><TaskRow label="Evening checklist" status="pending" sublabel="Due 10 PM" /><TaskRow label="Morning checklist" status="done" /><TaskRow label="Hood cleaning" status="overdue" sublabel="Catering Hub" /></Card>
      </div>}
      {tab==="action" && <Card><CH title="Action Items" /><Att sev="critical" title="Fire suppression record expired" loc="Catering Hub" pillar="Fire Safety" risk="liability" /><Att sev="warning" title="Walk-in cooler trending high" loc="Main Kitchen" pillar="Food Safety" risk="revenue" /><Att sev="warning" title="Hood cleaning overdue" loc="Catering Hub" pillar="Facility Safety" risk="operational" /></Card>}
      {tab==="upcoming" && <Card><CH title="Compliance Events" />
        {[{day:"Today",item:"Afternoon temp logs",s:"in_progress"},{day:"Today",item:"Hood cleaning",s:"overdue"},{day:"Tomorrow",item:"Stanislaus County inspection",s:"upcoming"},{day:"Thu",item:"Pest control",s:"upcoming"}].map((r,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", borderBottom:"1px solid #f9fafb" }}>
            <div style={{ minWidth:54, fontSize:8, fontWeight:700, color:r.day==="Today"?NAVY:MUTED, textTransform:"uppercase" }}>{r.day}</div>
            <div style={{ flex:1, fontSize:10, color:r.s==="overdue"?"#991b1b":BODY_TEXT, fontWeight:r.s==="overdue"?600:400 }}>{r.item}</div>
            <span style={{ background:r.s==="overdue"?"#fef2f2":r.s==="in_progress"?"#fffbeb":"#f1f5f9", color:r.s==="overdue"?"#991b1b":r.s==="in_progress"?"#92400e":"#6b7280", borderRadius:10, padding:"1px 6px", fontSize:7, fontWeight:700 }}>{r.s==="overdue"?"Overdue":r.s==="in_progress"?"In Progress":"Upcoming"}</span>
          </div>
        ))}
      </Card>}
    </div>
  );
}
function ExecContent() {
  return <div><Banner status="attention" headline="Portfolio — one location requires executive attention." sub="Pacific Catering Co. · 3 locations" pillars={[{l:"OK",v:"2/3",ok:false},{l:"Open",v:"4",ok:false},{l:"Spend",v:"$6.7k",ok:true}]} /><Card style={{marginBottom:8}}><CH title="Location Standing" /><LocRow name="Main Kitchen" city="Fresno" food="ok" fire="ok" open={0} /><LocRow name="Catering Hub" city="Modesto" food="ok" fire="action" open={3} /><LocRow name="Central Kitchen" city="Merced" food="ok" fire="pending" open={1} /></Card><Card><CH title="Needs Executive Attention" /><Att sev="critical" title="Fire suppression record expired" loc="Catering Hub" pillar="Fire Safety" risk="liability" /><Att sev="warning" title="Fire suppression due in 12 days" loc="Central Kitchen" pillar="Fire Safety" risk="liability" /></Card></div>;
}
function ComplianceContent() {
  return <div><Banner status="risk" headline="Active compliance risk — immediate action required." sub="Pacific Catering Co. · 3 locations" pillars={[{l:"Critical",v:"2",ok:false},{l:"Next Insp.",v:"Mar 28",ok:true},{l:"Missing",v:"1",ok:false}]} /><Card style={{marginBottom:8}}><CH title="Compliance Standing" /><LocRow name="Main Kitchen" city="Fresno" food="ok" fire="ok" open={0} /><LocRow name="Catering Hub" city="Modesto" food="ok" fire="action" open={3} /></Card><Card><CH title="Alerts" /><Att sev="critical" title="3 open violations, reinspection within 30 days" loc="Catering Hub" pillar="Food Safety" risk="liability" /><Att sev="warning" title="HACCP plan not on file" loc="Central Kitchen" pillar="Food Safety" risk="revenue" /></Card></div>;
}
function FacilitiesContent() {
  return <div><Banner status="risk" headline="Fire safety action required at Catering Hub." sub="Pacific Catering Co. · 3 locations" pillars={[{l:"Due",v:"3",ok:false},{l:"Open",v:"4",ok:false},{l:"Spend",v:"$6.7k",ok:true}]} /><Card style={{marginBottom:8}}><CH title="Facility Standing" /><LocRow name="Main Kitchen" city="Fresno" food="ok" fire="ok" open={0} /><LocRow name="Catering Hub" city="Modesto" food="ok" fire="action" open={3} /></Card><Card><CH title="Attention Items" /><Att sev="critical" title="Fire extinguisher service tag expired" loc="Catering Hub" pillar="Fire Safety" risk="liability" /><Att sev="warning" title="Fire suppression expires in 12 days" loc="Central Kitchen" pillar="Fire Safety" risk="liability" /></Card></div>;
}
function KMContent() {
  return <div><Banner status="attention" headline="Kitchen on track — one temp log overdue." sub="Main Kitchen · Fresno" pills={[<SPill key="t" icon="📋" label="Tasks" value="3/7" />,<SPill key="l" icon="🌡️" label="Temp Logs" value="4/6" />,<SPill key="s" icon="👥" label="On Shift" value="4" />]} /><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Card><CH title="Today's Tasks" /><TaskRow label="Morning checklist" status="done" sublabel="6:15 AM" /><TaskRow label="Midday checklist" status="in_progress" sublabel="4/8 items" /><TaskRow label="Prep cooler log" status="overdue" sublabel="2 hrs overdue" /></Card><Card><CH title="Inspection Readiness" />{[{i:"Temp logs current",ok:true},{i:"Checklists on file",ok:true},{i:"HACCP plan",ok:false},{i:"Pest records",ok:true}].map((r,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 12px",borderBottom:"1px solid #f9fafb"}}><span style={{color:r.ok?"#16a34a":"#dc2626",fontWeight:700,fontSize:11}}>{r.ok?"✓":"✕"}</span><span style={{fontSize:10,color:r.ok?BODY_TEXT:"#991b1b",...FONT}}>{r.i}</span>{!r.ok&&<span style={{marginLeft:"auto",background:"#fef2f2",color:"#991b1b",borderRadius:10,padding:"1px 6px",fontSize:7,fontWeight:700}}>Missing</span>}</div>)}</Card></div></div>;
}
function ChefContent() {
  return <div><Banner status="attention" headline="Kitchen running — prep cooler log overdue." sub="Main Kitchen · Fresno" pills={[<SPill key="t" icon="🌡️" label="Logs" value="4/6" />,<SPill key="c" icon="✅" label="Checklists" value="2/3" />,<SPill key="h" icon="🔬" label="HACCP" value="All OK" />]} /><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Card><CH title="Temperatures" action="Log Now" />{[{n:"Walk-in Cooler #1",t:"37.8°F",ok:true},{n:"Walk-in Cooler #2",t:"39.5°F",ok:true},{n:"Walk-in Freezer",t:"−2°F",ok:true},{n:"Prep Cooler",t:"—",ok:false}].map((r,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 12px",borderBottom:"1px solid #f9fafb",background:!r.ok?"#fffbeb":"white"}}><div style={{flex:1,fontSize:10,fontWeight:600,color:BODY_TEXT,...FONT}}>{r.n}</div><span style={{fontSize:10,fontWeight:700,color:r.ok?BODY_TEXT:MUTED}}>{r.t}</span><span style={{background:r.ok?"#f0fdf4":"#fffbeb",color:r.ok?"#166534":"#92400e",borderRadius:10,padding:"1px 6px",fontSize:7,fontWeight:700}}>{r.ok?"OK":"Log Needed"}</span></div>)}</Card><Card><CH title="Checklists" />{[{n:"Opening",s:"done",d:12,t:12},{n:"Midday",s:"in_progress",d:4,t:8},{n:"Closing",s:"not_started",d:0,t:10}].map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 12px",borderBottom:"1px solid #f9fafb"}}><span style={{fontSize:12}}>{c.s==="done"?"✅":c.s==="in_progress"?"🔨":"○"}</span><div style={{flex:1}}><div style={{fontSize:10,fontWeight:600,color:BODY_TEXT,...FONT}}>{c.n}</div><div style={{fontSize:8,color:MUTED}}>{c.d}/{c.t} items</div></div><span style={{background:c.s==="done"?"#f0fdf4":c.s==="in_progress"?"#fffbeb":"#f9fafb",color:c.s==="done"?"#166534":c.s==="in_progress"?"#92400e":"#6b7280",borderRadius:10,padding:"1px 6px",fontSize:7,fontWeight:700}}>{c.s==="done"?"Done":c.s==="in_progress"?"In Progress":"Not Started"}</span></div>)}</Card></div></div>;
}
function StaffContent() {
  return <div><div style={{background:STEEL_SLATE,borderRadius:9,padding:"13px 14px",color:"white",marginBottom:10,...FONT}}><div style={{fontSize:7,fontWeight:800,color:GOLD,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>✓ On Track</div><div style={{fontSize:14,fontWeight:700,marginBottom:2}}>Good afternoon, Sofia.</div><div style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>Main Kitchen · Fresno</div><div style={{background:"rgba(255,255,255,0.08)",borderRadius:6,padding:"8px 11px",marginTop:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontSize:7,color:"rgba(255,255,255,0.4)",textTransform:"uppercase"}}>My Standing Today</div><div style={{fontSize:16,fontWeight:900,color:GOLD,marginTop:2}}>1 of 3 Done</div></div><div style={{width:34,height:34,borderRadius:"50%",border:`2px solid ${GOLD}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:GOLD}}>33%</div></div></div><Card style={{marginBottom:8}}><CH title="My Tasks — Today" />{[{t:"Morning opening checklist",s:"done",time:"6:15 AM"},{t:"Check prep cooler temp",s:"pending",time:"Due 2:00 PM"},{t:"Check walk-in cooler #2",s:"pending",time:"Due 2:00 PM"}].map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 12px",borderBottom:"1px solid #f9fafb"}}><div style={{width:14,height:14,borderRadius:3,background:t.s==="done"?"#f0fdf4":"#f9fafb",border:`2px solid ${t.s==="done"?"#16a34a":"#d1d5db"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{t.s==="done"&&<span style={{fontSize:7,color:"#16a34a",fontWeight:900}}>✓</span>}</div><div style={{flex:1,fontSize:10,color:t.s==="done"?"#9ca3af":BODY_TEXT,textDecoration:t.s==="done"?"line-through":"none",...FONT}}>{t.t}</div><div style={{fontSize:8,color:MUTED}}>{t.time}</div></div>)}</Card><div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:7,padding:"9px 12px",display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:16}}>⚠️</span><div style={{flex:1}}><div style={{fontSize:10,fontWeight:800,color:"#991b1b",...FONT}}>See something wrong?</div><div style={{fontSize:9,color:"#7f1d1d"}}>Report it immediately.</div></div><button style={{background:"#dc2626",color:"white",border:"none",borderRadius:6,padding:"5px 10px",fontSize:9,fontWeight:800,cursor:"pointer"}}>Report</button></div></div>;
}

const CONTENT_MAP = { owner_operator:OOContent, executive:ExecContent, compliance_manager:ComplianceContent, facilities:FacilitiesContent, chef:ChefContent, kitchen_manager:KMContent, kitchen_staff:StaffContent };

function DiffPanel({ roleA, roleB }) {
  const getItems = (rid) => new Set(Object.values(ROLE_ITEMS[rid]||{}).flat());
  const setA = getItems(roleA), setB = getItems(roleB);
  const all = new Set([...setA, ...setB]);
  const onlyA=[...all].filter(i=>setA.has(i)&&!setB.has(i));
  const onlyB=[...all].filter(i=>!setA.has(i)&&setB.has(i));
  const shared=[...all].filter(i=>setA.has(i)&&setB.has(i));
  const getLabel=(id)=>{ for(const s of NAV_SECTIONS){ const f=s.items.find(i=>i.id===id); if(f) return `${f.icon} ${f.label}`; } return id; };
  const rA=ROLES.find(r=>r.id===roleA), rB=ROLES.find(r=>r.id===roleB);
  return (
    <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:10, overflow:"hidden", ...FONT }}>
      <div style={{ padding:"10px 14px", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", gap:8 }}>
        <span>🔀</span>
        <span style={{ fontSize:12, fontWeight:700, color:BODY_TEXT }}>Access Diff</span>
        <span style={{ fontSize:10, color:MUTED }}>Navigation visibility comparison</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr" }}>
        <div style={{ padding:"11px 13px", borderRight:"1px solid #f3f4f6" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:rA?.color||NAVY }} />
            <span style={{ fontSize:10, fontWeight:700, color:rA?.color||NAVY }}>Only {rA?.short}</span>
            <span style={{ background:"#eff6ff", color:"#1d4ed8", borderRadius:10, padding:"1px 7px", fontSize:9, fontWeight:700, marginLeft:"auto" }}>{onlyA.length}</span>
          </div>
          {onlyA.map(id=><div key={id} style={{ fontSize:9, color:BODY_TEXT, padding:"3px 0", borderBottom:"1px solid #f9fafb" }}>{getLabel(id)}</div>)}
          {onlyA.length===0 && <div style={{ fontSize:9, color:MUTED, fontStyle:"italic" }}>None exclusive</div>}
        </div>
        <div style={{ padding:"11px 13px", borderRight:"1px solid #f3f4f6", background:"#fafafa" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9 }}>
            <span style={{ fontSize:10, fontWeight:700, color:"#166534" }}>✓ Shared</span>
            <span style={{ background:"#f0fdf4", color:"#166534", borderRadius:10, padding:"1px 7px", fontSize:9, fontWeight:700, marginLeft:"auto" }}>{shared.length}</span>
          </div>
          {shared.slice(0,10).map(id=><div key={id} style={{ fontSize:9, color:BODY_TEXT, padding:"3px 0", borderBottom:"1px solid #f0fdf4" }}>{getLabel(id)}</div>)}
          {shared.length>10 && <div style={{ fontSize:9, color:MUTED, marginTop:3 }}>+{shared.length-10} more</div>}
        </div>
        <div style={{ padding:"11px 13px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:rB?.color||NAVY }} />
            <span style={{ fontSize:10, fontWeight:700, color:rB?.color||NAVY }}>Only {rB?.short}</span>
            <span style={{ background:"#fef3c7", color:"#92400e", borderRadius:10, padding:"1px 7px", fontSize:9, fontWeight:700, marginLeft:"auto" }}>{onlyB.length}</span>
          </div>
          {onlyB.map(id=><div key={id} style={{ fontSize:9, color:BODY_TEXT, padding:"3px 0", borderBottom:"1px solid #f9fafb" }}>{getLabel(id)}</div>)}
          {onlyB.length===0 && <div style={{ fontSize:9, color:MUTED, fontStyle:"italic" }}>None exclusive</div>}
        </div>
      </div>
    </div>
  );
}

function PreviewPane({ roleId, label, accentColor, compact }) {
  const [activeItem, setActiveItem] = useState("dashboard");
  const DashContent = CONTENT_MAP[roleId] || OOContent;
  const isStaff = roleId === "kitchen_staff";
  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, minWidth:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:accentColor }} />
        <span style={{ fontSize:11, fontWeight:700, color:BODY_TEXT, ...FONT }}>{label}</span>
        <div style={{ flex:1, height:1, background:"#e5e7eb" }} />
        <span style={{ fontSize:9, color:MUTED, ...FONT, background:"#f1f5f9", padding:"2px 8px", borderRadius:10 }}>
          {isStaff ? "Mobile-first · No sidebar" : compact ? "Compact sidebar" : "Full sidebar"}
        </span>
      </div>
      <div style={{ background:"#f3f4f6", borderRadius:"9px 9px 0 0", padding:"7px 11px", display:"flex", alignItems:"center", gap:7, border:"1px solid #e5e7eb", borderBottom:"none" }}>
        <div style={{ display:"flex", gap:4 }}>
          {["#fc5f57","#fdbc2c","#33c748"].map(c=><div key={c} style={{ width:9, height:9, borderRadius:"50%", background:c }} />)}
        </div>
        <div style={{ flex:1, background:"white", borderRadius:4, padding:"2px 9px", fontSize:9, color:MUTED, border:"1px solid #e5e7eb", ...FONT }}>
          app.getevidly.com/dashboard
        </div>
        <div style={{ background:accentColor, color:"white", borderRadius:8, padding:"2px 8px", fontSize:8, fontWeight:700, ...FONT }}>{label.split(" ")[0]}</div>
      </div>
      <div style={{ border:"1px solid #e5e7eb", borderRadius:"0 0 9px 9px", overflow:"hidden", display:"flex", height:500 }}>
        {!isStaff && <Sidebar role={roleId} activeItem={activeItem} onItem={setActiveItem} compact={compact} />}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ background:"white", borderBottom:"1px solid #f3f4f6", padding:"7px 12px", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            {isStaff && <div style={{ width:22, height:22, borderRadius:4, background:NAVY, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:9, fontWeight:900, color:GOLD }}>E</span></div>}
            <span style={{ fontSize:10, fontWeight:700, color:BODY_TEXT, ...FONT }}>Dashboard</span>
            <span style={{ fontSize:9, color:MUTED }}>Pacific Catering Co.</span>
            <div style={{ marginLeft:"auto", width:22, height:22, borderRadius:"50%", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:NAVY }}>A</div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:12, background:PAGE_BG }}>
            <DashContent />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RolePreview() {
  const [mode, setMode] = useState("single");
  const [roleA, setRoleA] = useState("owner_operator");
  const [roleB, setRoleB] = useState("kitchen_staff");
  const [showDiff, setShowDiff] = useState(false);
  const rA = ROLES.find(r=>r.id===roleA);
  const rB = ROLES.find(r=>r.id===roleB);
  return (
    <div style={{ background:"#E8ECF1", minHeight:"100vh", ...FONT }}>
      <div style={{ padding:"20px 24px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:BODY_TEXT, margin:0, letterSpacing:"-0.03em" }}>Role Preview</h1>
            <p style={{ fontSize:11, color:MUTED, margin:"3px 0 0" }}>See exactly what each role sees — navigation, layout, and access — before customers do.</p>
          </div>
          <div style={{ display:"flex", gap:7, alignItems:"center" }}>
            <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:8, padding:3, display:"flex", gap:2 }}>
              {[["single","Single View"],["compare","⚡ Side-by-Side"]].map(([m,label])=>(
                <button key={m} onClick={()=>setMode(m)} style={{ padding:"5px 13px", borderRadius:6, border:"none", cursor:"pointer", fontSize:10, fontWeight:mode===m?700:500, background:mode===m?NAVY:"transparent", color:mode===m?"white":MUTED, transition:"all 0.15s" }}>{label}</button>
              ))}
            </div>
            {mode==="compare" && (
              <button onClick={()=>setShowDiff(s=>!s)} style={{ padding:"6px 13px", borderRadius:8, border:`1.5px solid ${showDiff?NAVY:"#e5e7eb"}`, background:showDiff?NAVY:"white", color:showDiff?"white":MUTED, fontSize:10, fontWeight:600, cursor:"pointer" }}>
                🔀 {showDiff?"Hide Diff":"Show Diff"}
              </button>
            )}
          </div>
        </div>
        <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:10, padding:"12px 16px", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {mode==="compare" && <div style={{ width:8, height:8, borderRadius:"50%", background:rA?.color||NAVY }} />}
              <span style={{ fontSize:10, fontWeight:700, color:MUTED, whiteSpace:"nowrap" }}>{mode==="compare" ? "Role A" : "Viewing as"}:</span>
              <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                {ROLES.map(r=>(
                  <button key={r.id} onClick={()=>setRoleA(r.id)} style={{ padding:"3px 11px", borderRadius:20, border:`1.5px solid ${roleA===r.id?r.color:"#e5e7eb"}`, background:roleA===r.id?r.color:"white", color:roleA===r.id?"white":MUTED, fontSize:9, fontWeight:roleA===r.id?700:400, cursor:"pointer", opacity:mode==="compare"&&roleB===r.id?0.35:1 }}>{r.label}</button>
                ))}
              </div>
            </div>
            {mode==="compare" && (
              <>
                <div style={{ width:1, height:30, background:"#e5e7eb" }} />
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:rB?.color||NAVY }} />
                  <span style={{ fontSize:10, fontWeight:700, color:MUTED, whiteSpace:"nowrap" }}>Role B:</span>
                  <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                    {ROLES.map(r=>(
                      <button key={r.id} onClick={()=>setRoleB(r.id)} style={{ padding:"3px 11px", borderRadius:20, border:`1.5px solid ${roleB===r.id?r.color:"#e5e7eb"}`, background:roleB===r.id?r.color:"white", color:roleB===r.id?"white":MUTED, fontSize:9, fontWeight:roleB===r.id?700:400, cursor:"pointer", opacity:roleA===r.id?0.35:1 }}>{r.label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {mode==="single" ? (
          <PreviewPane roleId={roleA} label={rA?.label||""} accentColor={rA?.color||NAVY} compact={false} />
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
              <PreviewPane roleId={roleA} label={rA?.label||""} accentColor={rA?.color||NAVY} compact={true} />
              <div style={{ width:1, background:"#d1d5db", alignSelf:"stretch", flexShrink:0, marginTop:26 }} />
              <PreviewPane roleId={roleB} label={rB?.label||""} accentColor={rB?.color||NAVY} compact={true} />
            </div>
            {showDiff && <DiffPanel roleA={roleA} roleB={roleB} />}
          </div>
        )}
        <div style={{ marginTop:16, padding:"10px 14px", background:"rgba(196,154,43,0.07)", border:"1px solid rgba(196,154,43,0.2)", borderRadius:8, display:"flex", gap:9, alignItems:"center" }}>
          <span style={{ fontSize:13 }}>🔒</span>
          <span style={{ fontSize:10, color:"#78600A" }}>
            <strong>Pre-launch QA only.</strong> Role Preview uses sample data — no real tenant accounts required. Navigation and access are rendered live from the actual role config. Discrepancies here = discrepancies in production.
          </span>
        </div>
      </div>
    </div>
  );
}
