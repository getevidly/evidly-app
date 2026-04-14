/**
 * SCORETABLE WASHINGTON STATE PAGE
 * URL: getevidly.com/scoretable/washington
 *
 * DB-driven state page — pulls all 39 WA county jurisdictions from Supabase.
 * Searchable county grid, stat cards, CTA capture.
 * Matches ScoreTableCountyPage visual template exactly.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

// ═══ PALETTE (matches ScoreTableCountyPage) ═══
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

function Logo({s="1.2rem",light=false,tagline=false}){
  return(
    <span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:2,lineHeight:1}}>
      <span style={{fontWeight:800,fontSize:s,letterSpacing:-0.5,fontFamily:ff,lineHeight:1}}>
        <span style={{color:E.gold}}>E</span>
        <span style={{color:light?E.w:E.navy}}>vid</span>
        <span style={{color:E.gold}}>LY</span>
      </span>
      {tagline&&<span style={{fontSize:`calc(${s} * 0.3)`,fontWeight:700,letterSpacing:"0.2em",color:light?"rgba(255,255,255,0.55)":"rgba(37,57,107,0.6)",textTransform:"uppercase",lineHeight:1,fontFamily:ff,whiteSpace:"nowrap"}}>Answers before you ask.</span>}
    </span>
  );
}

function STIcon({sz=24}){return <div style={{width:sz,height:sz,borderRadius:6,background:S.grn,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:E.w,fontWeight:800,fontSize:sz*0.5,fontFamily:ff,lineHeight:1}}>ST</span></div>;}
function STLogo({s="1rem",light=false}){return <span style={{fontWeight:800,fontSize:s,letterSpacing:-0.5,fontFamily:ff,lineHeight:1}}><span style={{color:light?"rgba(255,255,255,0.85)":S.grn}}>Score</span><span style={{color:light?E.w:S.charD}}>Table</span></span>;}

function toSlug(county){return county.toLowerCase().replace(/\s+/g,"-");}

export default function ScoreTableWashington(){
  var [counties,setCounties]=useState([]);
  var [loading,setLoading]=useState(true);
  var [search,setSearch]=useState("");
  var [cookie,setCookie]=useState(true);

  // CTA lead
  var [ltName,setLtName]=useState("");
  var [ltEmail,setLtEmail]=useState("");
  var [ltPhone,setLtPhone]=useState("");
  var [ltBiz,setLtBiz]=useState("");
  var [ltDone,setLtDone]=useState(false);
  var ltReady=ltName&&ltEmail&&ltPhone&&ltBiz;

  useEffect(function(){
    supabase
      .from("jurisdictions")
      .select("county, agency_name, grading_config")
      .eq("state","WA")
      .order("county")
      .then(function(res){
        if(res.data)setCounties(res.data);
        setLoading(false);
      });
  },[]);

  var filtered=counties.filter(function(c){
    if(!search)return true;
    var s=search.toLowerCase();
    return c.county.toLowerCase().includes(s)||c.agency_name.toLowerCase().includes(s);
  });

  function submitLead(){
    if(!ltReady)return;
    window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[ScoreTable WA] Lead - "+ltBiz)+"&body="+encodeURIComponent("Name: "+ltName+"\nEmail: "+ltEmail+"\nPhone: "+ltPhone+"\nBusiness: "+ltBiz+"\nState: Washington"),"_blank");
    setLtDone(true);
  }

  var bG={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.gold,color:E.w,fontFamily:ff};
  var bN={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.navy,color:E.w,fontFamily:ff};
  var dinp={width:"100%",padding:"10px 12px",border:"1px solid "+E.g2,borderRadius:8,fontSize:"0.85rem",boxSizing:"border-box",outline:"none",background:E.w,color:E.g8,fontFamily:ff};

  return(
  <div style={{fontFamily:ff,color:E.g8,lineHeight:1.6,background:E.cream,minHeight:"100vh"}}>
  <style>{`button{all:unset;box-sizing:border-box;cursor:pointer;} button:disabled{cursor:not-allowed;} a.btn{all:unset;box-sizing:border-box;cursor:pointer;display:inline-block;}`}</style>

  {/* COOKIE */}
  {cookie&&<div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:E.w,borderTop:"1px solid "+E.g2,padding:"14px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 -2px 10px rgba(0,0,0,0.06)"}}>
    <p style={{flex:1,fontSize:"0.8rem",color:E.g6,margin:0,minWidth:200}}>We use cookies to enhance your experience. <a href="/privacy" style={{color:E.navy}}>Cookie Policy</a></p>
    <button onClick={function(){setCookie(false);}} style={{padding:"7px 16px",borderRadius:6,border:"1px solid "+E.g2,background:E.w,fontSize:"0.78rem",fontWeight:600,cursor:"pointer",color:E.g6}}>Settings</button>
    <button onClick={function(){setCookie(false);}} style={{padding:"7px 16px",borderRadius:6,border:"none",background:E.navy,color:E.w,fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}>Accept All</button>
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
        {[["Counties","#counties"],["About","#about"]].map(function(x){return <a key={x[0]} href={x[1]} style={{textDecoration:"none",color:E.g5,fontWeight:500,fontSize:"0.8rem"}}>{x[0]}</a>;})}
      </nav>
      <div style={{display:"flex",gap:8}}>
        <a className="btn" href="https://www.getevidly.com" style={{padding:"7px 14px",fontSize:"0.78rem",fontWeight:700,textDecoration:"none",display:"inline-block",background:E.navy,color:E.w,borderRadius:8,fontFamily:ff,cursor:"pointer"}}>Get EvidLY →</a>
      </div>
    </div>
  </header>

  {/* BREADCRUMB */}
  <div style={{background:E.w,borderBottom:"1px solid "+E.g1,padding:"7px 24px"}}>
    <div style={{maxWidth:1100,margin:"0 auto",fontSize:"0.72rem",color:E.g4}}>
      <a href="/" style={{color:E.g4,textDecoration:"none"}}>EvidLY</a>{" › "}
      <a href="/scoretable" style={{color:E.g4,textDecoration:"none"}}>ScoreTable</a>{" › "}
      <span style={{color:E.navy,fontWeight:600}}>Washington</span>
    </div>
  </div>

  {/* ═══ HERO ═══ */}
  <section style={{padding:"56px 24px 48px",background:"linear-gradient(160deg,#F5F3F0,"+E.cream+")",borderBottom:"1px solid "+E.g2,textAlign:"center"}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:16}}>
        <STIcon sz={32}/><STLogo s="1.1rem"/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}>
        <span style={{display:"inline-block",padding:"4px 14px",borderRadius:100,fontSize:"0.7rem",fontWeight:700,border:"1.5px solid "+E.gold,color:E.gold,background:"transparent"}}>Washington</span>
        <span style={{display:"inline-block",padding:"4px 14px",borderRadius:100,fontSize:"0.7rem",fontWeight:700,border:"1px solid #86efac",color:"#15803d",background:"#f0fdf4"}}>WAC 246-215</span>
      </div>
      <h1 style={{fontSize:"clamp(1.8rem,5vw,2.6rem)",fontWeight:800,lineHeight:1.1,margin:"0 0 14px",color:E.navy}}>Washington food safety inspection scores</h1>
      <p style={{fontSize:"0.96rem",color:E.g5,maxWidth:560,margin:"0 auto 8px",lineHeight:1.7}}>Washington Department of Health oversees food safety through Local Health Jurisdictions (LHJs) enforcing WAC 246-215, based on the FDA Food Code. All 39 counties use a Red/Blue violation system.</p>
      <p style={{fontSize:"0.92rem",color:E.gold,fontStyle:"italic",margin:"0 auto 28px"}}>The score behind every table.</p>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <a className="btn" href="#counties" style={Object.assign({},bN,{textDecoration:"none",display:"inline-block"})}>Browse All 39 Counties →</a>
      </div>
    </div>
  </section>

  {/* ═══ STAT CARDS ═══ */}
  <section style={{padding:"44px 24px",background:E.w,borderBottom:"1px solid "+E.g2}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
        {[
          {label:"Counties",value:"39"},
          {label:"Authority",value:"WAC 246-215"},
          {label:"Public Posting",value:"No mandate",note:"King, Kitsap, Pierce exception"},
          {label:"Data",value:"Live JIE"},
        ].map(function(s){return(
          <div key={s.label} style={{background:E.cream,borderRadius:9,padding:12,border:"1px solid "+E.g2,textAlign:"center"}}>
            <div style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:3}}>{s.label}</div>
            <div style={{fontSize:"0.8rem",fontWeight:700,color:E.navy,lineHeight:1.3}}>{s.value}</div>
            {s.note&&<div style={{fontSize:"0.62rem",color:E.g4,marginTop:2}}>{s.note}</div>}
          </div>
        );})}
      </div>
    </div>
  </section>

  {/* ═══ COUNTY GRID ═══ */}
  <section id="counties" style={{padding:"64px 24px",background:E.cream}}>
    <div style={{maxWidth:920,margin:"0 auto"}}>
      <h2 style={{fontSize:"clamp(1.3rem,4vw,1.8rem)",fontWeight:800,color:E.navy,marginBottom:8,textAlign:"center"}}>All 39 Washington Counties</h2>
      <p style={{fontSize:"0.88rem",color:E.g5,textAlign:"center",maxWidth:560,margin:"0 auto 24px",lineHeight:1.7}}>Select a county to see its food safety inspection methodology, scoring system, and enforcement details.</p>

      {/* SEARCH */}
      <div style={{maxWidth:400,margin:"0 auto 28px"}}>
        <input
          value={search}
          onChange={function(e){setSearch(e.target.value);}}
          placeholder="Search counties..."
          style={Object.assign({},dinp,{textAlign:"center"})}
        />
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:"40px 0"}}>
          <div style={{fontSize:"0.88rem",color:E.g4}}>Loading counties...</div>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          {filtered.map(function(c){
            var slug=toSlug(c.county);
            var gc=c.grading_config||{};
            var system=gc.system||gc.type||"WAC 246-215";
            return(
              <Link key={c.county} to={"/scoretable/washington/"+slug} style={{textDecoration:"none",background:E.w,borderRadius:10,padding:"16px",border:"1px solid "+E.g2,display:"block",transition:"border-color 0.15s"}}>
                <div style={{fontSize:"0.88rem",fontWeight:700,color:E.navy,marginBottom:4}}>{c.county} County</div>
                <div style={{fontSize:"0.72rem",color:E.g5,lineHeight:1.5,marginBottom:6}}>{c.agency_name}</div>
                <div style={{fontSize:"0.66rem",color:E.g4}}>{system}</div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading&&search&&filtered.length===0&&(
        <div style={{textAlign:"center",padding:"32px 0"}}>
          <p style={{fontSize:"0.88rem",color:E.g5}}>No counties match "{search}"</p>
        </div>
      )}
    </div>
  </section>

  {/* ═══ ABOUT SECTION ═══ */}
  <section id="about" style={{padding:"64px 24px",background:E.w,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.6rem)",fontWeight:800,color:E.navy,marginBottom:16,textAlign:"center"}}>How Washington inspects commercial kitchens</h2>
      <div style={{fontSize:"0.88rem",color:E.g5,lineHeight:1.8}}>
        <p style={{marginBottom:16}}>Washington State Department of Health sets food safety standards through <strong>WAC 246-215</strong>, based on the FDA Food Code. Enforcement is delegated to 35 Local Health Jurisdictions (LHJs) serving all 39 counties.</p>
        <p style={{marginBottom:16}}>All WA jurisdictions use a <strong>Red/Blue violation system</strong>. Red violations are critical items that directly contribute to foodborne illness risk. Blue violations are non-critical items related to general sanitation and facility maintenance.</p>
        <p style={{marginBottom:16}}>Unlike California, Washington has <strong>no statewide letter grade or public posting mandate</strong>. However, King County, Kitsap Public Health District, and Tacoma-Pierce County Health Department operate voluntary or mandatory placard programs.</p>
        <p>Inspection frequency is risk-based across all jurisdictions. Higher-risk establishments receive more frequent inspections.</p>
      </div>
    </div>
  </section>

  {/* ═══ EVIDLY SOFT PITCH / CTA ═══ */}
  <section style={{padding:"64px 24px",background:E.w,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,"+E.navyD+","+E.navy+")",borderRadius:18,padding:"36px 32px",textAlign:"center"}}>
        <div style={{marginBottom:16}}><Logo s="1.4rem" light tagline/></div>
        <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.7rem)",fontWeight:800,color:E.w,margin:"0 0 10px",lineHeight:1.2}}>Know your Washington inspection score before an inspector does.</h2>
        <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.55)",maxWidth:460,margin:"0 auto 24px",lineHeight:1.7}}>EvidLY applies your county's exact methodology to your daily data — so you see your score in real time, not after the fact.</p>
        {!ltDone?(
        <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:20,border:"1px solid rgba(255,255,255,0.1)",maxWidth:480,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={{fontSize:"0.7rem",fontWeight:600,color:"rgba(255,255,255,0.45)",display:"block",marginBottom:3}}>Your Name *</label><input value={ltName} onChange={function(e){setLtName(e.target.value);}} style={{width:"100%",padding:"9px 11px",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:"0.84rem",boxSizing:"border-box",outline:"none",background:"rgba(255,255,255,0.1)",color:E.w,fontFamily:ff}} placeholder="Jane Kim"/></div>
            <div><label style={{fontSize:"0.7rem",fontWeight:600,color:"rgba(255,255,255,0.45)",display:"block",marginBottom:3}}>Phone *</label><input value={ltPhone} onChange={function(e){setLtPhone(e.target.value);}} style={{width:"100%",padding:"9px 11px",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:"0.84rem",boxSizing:"border-box",outline:"none",background:"rgba(255,255,255,0.1)",color:E.w,fontFamily:ff}} placeholder="(206) 555-0100"/></div>
          </div>
          <div style={{marginBottom:10}}><label style={{fontSize:"0.7rem",fontWeight:600,color:"rgba(255,255,255,0.45)",display:"block",marginBottom:3}}>Business Name *</label><input value={ltBiz} onChange={function(e){setLtBiz(e.target.value);}} style={{width:"100%",padding:"9px 11px",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:"0.84rem",boxSizing:"border-box",outline:"none",background:"rgba(255,255,255,0.1)",color:E.w,fontFamily:ff}} placeholder="Pacific Kitchen"/></div>
          <div style={{marginBottom:14}}><label style={{fontSize:"0.7rem",fontWeight:600,color:"rgba(255,255,255,0.45)",display:"block",marginBottom:3}}>Email *</label><input value={ltEmail} onChange={function(e){setLtEmail(e.target.value);}} style={{width:"100%",padding:"9px 11px",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:"0.84rem",boxSizing:"border-box",outline:"none",background:"rgba(255,255,255,0.1)",color:E.w,fontFamily:ff}} placeholder="jane@restaurant.com"/></div>
          <button disabled={!ltReady} onClick={submitLead} style={Object.assign({},bG,{width:"100%",opacity:ltReady?1:0.4,fontSize:"0.9rem",padding:"12px"})}>Book a Demo — 45 Minutes →</button>
          <p style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.25)",marginTop:8}}>Launching May 5, 2026 · $99/mo founder pricing</p>
        </div>):(
        <div style={{textAlign:"center",paddingTop:8}}>
          <div style={{fontSize:"1.8rem",marginBottom:8}}>✅</div>
          <p style={{color:"rgba(255,255,255,0.7)",fontSize:"0.88rem"}}>We'll be in touch, {ltName}. Check <strong>{ltEmail}</strong> for calendar confirmation.</p>
        </div>)}
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
        <p style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.3)",marginTop:6,lineHeight:1.5}}>Serving Washington State.</p>
      </div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>ScoreTable</h4>{[["All Counties","#counties"],["About","#about"]].map(function(l){return <a key={l[0]} href={l[1]} style={{display:"block",fontSize:"0.76rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>{l[0]}</a>;})}</div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>EvidLY</h4>{["Product","Pricing","Kitchen to Community","Book a Demo"].map(function(l){return <a key={l} href="#" style={{display:"block",fontSize:"0.76rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>{l}</a>;})}</div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Contact</h4><a href="mailto:founders@getevidly.com" style={{display:"block",fontSize:"0.76rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>founders@getevidly.com</a><a href="tel:8553843591" style={{display:"block",fontSize:"0.76rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>(855) EVIDLY1</a><a href="tel:2096007675" style={{display:"block",fontSize:"0.76rem",color:"rgba(255,255,255,0.5)",textDecoration:"none"}}>(209) 600-7675</a></div>
    </div>
    <div style={{maxWidth:960,margin:"14px auto 0",paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <span style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.25)"}}>© 2026 EvidLY, LLC. <STLogo s="0.68rem" light/> is a free public resource. Data sourced from WA DOH and local health jurisdictions.</span>
      <div style={{display:"flex",gap:14}}>{["Privacy","Terms","Cookies"].map(function(l){return <a key={l} href="#" style={{fontSize:"0.66rem",color:"rgba(255,255,255,0.3)",textDecoration:"none"}}>{l}</a>;})}</div>
    </div>
  </footer>

  </div>);
}
