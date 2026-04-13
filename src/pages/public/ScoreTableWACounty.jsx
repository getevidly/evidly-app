/**
 * SCORETABLE WASHINGTON COUNTY PAGE
 * URL: getevidly.com/scoretable/washington/:countySlug
 *
 * DB-driven single county page — pulls jurisdiction data from Supabase.
 * All content from grading_config JSONB — nothing hardcoded.
 * Matches ScoreTableCountyPage visual template exactly.
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
      {tagline&&<span style={{fontSize:`calc(${s} * 0.3)`,fontWeight:700,letterSpacing:"0.2em",color:light?"rgba(255,255,255,0.55)":"rgba(37,57,107,0.6)",textTransform:"uppercase",lineHeight:1,fontFamily:ff,whiteSpace:"nowrap"}}>Lead with Confidence</span>}
    </span>
  );
}

function STIcon({sz=24}){return <div style={{width:sz,height:sz,borderRadius:6,background:S.grn,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:E.w,fontWeight:800,fontSize:sz*0.5,fontFamily:ff,lineHeight:1}}>ST</span></div>;}
function STLogo({s="1rem",light=false}){return <span style={{fontWeight:800,fontSize:s,letterSpacing:-0.5,fontFamily:ff,lineHeight:1}}><span style={{color:light?"rgba(255,255,255,0.85)":S.grn}}>Score</span><span style={{color:light?E.w:S.charD}}>Table</span></span>;}

export default function ScoreTableWACounty(){
  var {countySlug}=useParams();
  var [j,setJ]=useState(null);
  var [loading,setLoading]=useState(true);
  var [cookie,setCookie]=useState(true);

  // CTA lead
  var [ltName,setLtName]=useState("");
  var [ltEmail,setLtEmail]=useState("");
  var [ltPhone,setLtPhone]=useState("");
  var [ltBiz,setLtBiz]=useState("");
  var [ltDone,setLtDone]=useState(false);
  var ltReady=ltName&&ltEmail&&ltPhone&&ltBiz;

  useEffect(function(){
    if(!countySlug)return;
    // Convert slug to county name for matching
    // e.g. "grays-harbor" -> match where lower(replace(county,' ','-')) = 'grays-harbor'
    supabase
      .from("jurisdictions")
      .select("*")
      .eq("state","WA")
      .then(function(res){
        if(res.data){
          var match=res.data.find(function(row){
            return row.county.toLowerCase().replace(/\s+/g,"-")===countySlug;
          });
          if(match)setJ(match);
        }
        setLoading(false);
      });
  },[countySlug]);

  function submitLead(){
    if(!ltReady)return;
    var county=j?j.county:"Washington";
    window.open("mailto:founders@getevidly.com?subject="+encodeURIComponent("[ScoreTable WA] Lead - "+ltBiz+" ("+county+" County)")+"&body="+encodeURIComponent("Name: "+ltName+"\nEmail: "+ltEmail+"\nPhone: "+ltPhone+"\nBusiness: "+ltBiz+"\nCounty: "+county+", WA"),"_blank");
    setLtDone(true);
  }

  var bG={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.gold,color:E.w,fontFamily:ff};
  var bN={padding:"11px 22px",border:"none",borderRadius:8,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",background:E.navy,color:E.w,fontFamily:ff};

  if(loading){
    return(
      <div style={{fontFamily:ff,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:E.cream}}>
        <p style={{color:E.g4}}>Loading...</p>
      </div>
    );
  }

  if(!j){
    return(
      <div style={{fontFamily:ff,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:E.cream,gap:16}}>
        <h1 style={{color:E.navy,fontSize:"1.4rem",fontWeight:800}}>County not found</h1>
        <p style={{color:E.g5,fontSize:"0.88rem"}}>No Washington jurisdiction found for "{countySlug}".</p>
        <Link to="/scoretable/washington" style={{color:E.gold,fontWeight:700,fontSize:"0.88rem"}}>← All Washington counties</Link>
      </div>
    );
  }

  var gc=j.grading_config||{};
  var insp=gc.inspection_details||{};
  var scoring=gc.scoring_details||{};
  var display=gc.display_details||{};
  var violTypes=scoring.violation_types||{};
  var thresholds=scoring.enforcement_thresholds||null;
  var noRatingPlacard=gc.no_rating_placard!==false; // default true
  var hasPlacard=gc.no_rating_placard===false;
  var offices=insp.offices||[];
  var portalUrl=insp.inspection_portal_url||null;
  var enforcer=insp.local_enforcer||j.agency_name;
  var districtNote=display.district_note||null;

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
        {[["Enforcement","#enforcement"],["Violations","#violations"],["Placard","#placard"]].map(function(x){return <a key={x[0]} href={x[1]} style={{textDecoration:"none",color:E.g5,fontWeight:500,fontSize:"0.8rem"}}>{x[0]}</a>;})}
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
      <Link to="/scoretable/washington" style={{color:E.g4,textDecoration:"none"}}>Washington</Link>{" › "}
      <span style={{color:E.navy,fontWeight:600}}>{j.county} County</span>
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
        {hasPlacard&&<span style={{display:"inline-block",padding:"4px 14px",borderRadius:100,fontSize:"0.7rem",fontWeight:700,border:"1px solid "+E.wrn,color:"#92400e",background:E.wrnBg}}>Local placard system</span>}
      </div>
      <h1 style={{fontSize:"clamp(1.8rem,5vw,2.6rem)",fontWeight:800,lineHeight:1.1,margin:"0 0 14px",color:E.navy}}>{j.county} County food safety inspection scores</h1>
      <p style={{fontSize:"0.96rem",color:E.g5,maxWidth:560,margin:"0 auto 8px",lineHeight:1.7}}>Inspections by {enforcer}. Washington food safety enforcement under WAC 246-215.</p>
      <p style={{fontSize:"0.92rem",color:E.gold,fontStyle:"italic",margin:"0 auto 28px"}}>The score behind every table.</p>
    </div>
  </section>

  {/* ═══ STAT CARDS ═══ */}
  <section style={{padding:"44px 24px",background:E.w,borderBottom:"1px solid "+E.g2}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
        <div style={{background:E.cream,borderRadius:9,padding:12,border:"1px solid "+E.g2,textAlign:"center"}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:3}}>Evaluation</div>
          <div style={{fontSize:"0.8rem",fontWeight:700,color:E.navy,lineHeight:1.3}}>Red / Blue violation system</div>
        </div>
        <div style={{background:E.cream,borderRadius:9,padding:12,border:"1px solid "+E.g2,textAlign:"center"}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:3}}>Public Posting</div>
          <div style={{fontSize:"0.8rem",fontWeight:700,color:E.navy,lineHeight:1.3}}>{hasPlacard?"Mandatory":"No mandate"}</div>
        </div>
        <div style={{background:E.cream,borderRadius:9,padding:12,border:"1px solid "+E.g2,textAlign:"center"}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:3}}>Inspection Freq.</div>
          <div style={{fontSize:"0.8rem",fontWeight:700,color:E.navy,lineHeight:1.3}}>Risk-based</div>
        </div>
        <div style={{background:E.cream,borderRadius:9,padding:12,border:"1px solid "+E.g2,textAlign:"center"}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:3}}>Data</div>
          <div style={{fontSize:"0.8rem",fontWeight:700,color:E.navy,lineHeight:1.3}}>Live JIE</div>
        </div>
      </div>
    </div>
  </section>

  {/* ═══ ENFORCEMENT AGENCY ═══ */}
  <section id="enforcement" style={{padding:"64px 24px",background:E.cream}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.6rem)",fontWeight:800,color:E.navy,marginBottom:16}}>Enforcement agency</h2>
      <div style={{background:E.w,borderRadius:12,padding:"20px 24px",border:"1px solid "+E.g2}}>
        <div style={{fontSize:"0.92rem",fontWeight:700,color:E.navy,marginBottom:8}}>{enforcer}</div>
        {offices.length>0&&(
          <div style={{marginBottom:12}}>
            <div style={{fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:6}}>Offices</div>
            {offices.map(function(o,i){
              return(
                <div key={i} style={{fontSize:"0.84rem",color:E.g5,marginBottom:4,lineHeight:1.6}}>
                  {o.city&&<strong>{o.city}</strong>}{o.phone&&<span> — {o.phone}</span>}
                </div>
              );
            })}
          </div>
        )}
        <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:"0.84rem",color:E.g5}}>
          <div><span style={{color:E.g4,fontWeight:600}}>Authority:</span> WAC 246-215</div>
        </div>
        {portalUrl&&(
          <div style={{marginTop:12}}>
            <a href={portalUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"0.84rem",color:E.navy,fontWeight:600}}>View inspection results →</a>
          </div>
        )}
      </div>

      {/* District note */}
      {districtNote&&(
        <div style={{marginTop:12,padding:"12px 16px",background:E.bluePale,borderRadius:8,border:"1px solid "+E.g3}}>
          <p style={{fontSize:"0.82rem",color:E.g6,margin:0}}>{districtNote}</p>
        </div>
      )}
    </div>
  </section>

  {/* ═══ VIOLATION CATEGORIES ═══ */}
  <section id="violations" style={{padding:"64px 24px",background:E.w,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.6rem)",fontWeight:800,color:E.navy,marginBottom:16}}>Violation categories</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* Red violations */}
        <div style={{background:E.redBg,borderRadius:12,padding:"20px",border:"1px solid "+E.red+"33"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{display:"inline-block",width:12,height:12,borderRadius:"50%",background:E.red}}></span>
            <span style={{fontSize:"0.88rem",fontWeight:700,color:E.red}}>Red Violations</span>
          </div>
          <p style={{fontSize:"0.82rem",color:E.g6,margin:"0 0 10px",lineHeight:1.6}}>{violTypes.red||"Critical items that directly contribute to foodborne illness risk. Require immediate correction."}</p>
        </div>
        {/* Blue violations */}
        <div style={{background:E.bluePale,borderRadius:12,padding:"20px",border:"1px solid "+E.navy+"22"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{display:"inline-block",width:12,height:12,borderRadius:"50%",background:E.navy}}></span>
            <span style={{fontSize:"0.88rem",fontWeight:700,color:E.navy}}>Blue Violations</span>
          </div>
          <p style={{fontSize:"0.82rem",color:E.g6,margin:"0 0 10px",lineHeight:1.6}}>{violTypes.blue||"Non-critical items related to general sanitation and facility maintenance. Correction required by next inspection."}</p>
        </div>
      </div>
    </div>
  </section>

  {/* ═══ RATING / PLACARD SYSTEM ═══ */}
  <section id="placard" style={{padding:"64px 24px",background:E.cream,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.6rem)",fontWeight:800,color:E.navy,marginBottom:16}}>Rating placard</h2>
      {hasPlacard?(
        <div style={{background:E.w,borderRadius:12,padding:"20px 24px",border:"1px solid "+E.g2}}>
          <p style={{fontSize:"0.88rem",color:E.g5,lineHeight:1.7,margin:0}}>
            {gc.placard_description||j.county+" County operates a local placard or rating system. Inspection results are publicly posted at the establishment."}
          </p>
          {scoring.rating_scale&&(
            <div style={{marginTop:16}}>
              <div style={{fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:8}}>Rating Scale</div>
              {(Array.isArray(scoring.rating_scale)?scoring.rating_scale:[]).map(function(r,i){
                return(
                  <div key={i} style={{display:"flex",gap:8,alignItems:"baseline",marginBottom:4}}>
                    <span style={{fontSize:"0.84rem",fontWeight:700,color:E.navy,minWidth:100}}>{r.label||r}</span>
                    {r.description&&<span style={{fontSize:"0.82rem",color:E.g5}}>{r.description}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ):(
        <div style={{background:E.w,borderRadius:12,padding:"20px 24px",border:"1px solid "+E.g2}}>
          <p style={{fontSize:"0.88rem",color:E.g5,lineHeight:1.7,margin:0}}>
            No public placard or letter grade system — inspection results available on request from {enforcer}.
          </p>
        </div>
      )}
    </div>
  </section>

  {/* ═══ ENFORCEMENT THRESHOLDS (conditional) ═══ */}
  {thresholds&&(
  <section style={{padding:"64px 24px",background:E.w,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.6rem)",fontWeight:800,color:E.navy,marginBottom:16}}>Local enforcement thresholds</h2>
      <div style={{background:E.cream,borderRadius:12,padding:"20px 24px",border:"1px solid "+E.g2}}>
        {thresholds.follow_up_required&&(
          <div style={{marginBottom:12}}>
            <div style={{fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:4}}>Follow-up Required</div>
            <p style={{fontSize:"0.84rem",color:E.g5,margin:0}}>{thresholds.follow_up_required}</p>
          </div>
        )}
        {thresholds.probation&&(
          <div style={{marginBottom:12}}>
            <div style={{fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:4}}>Probation</div>
            <p style={{fontSize:"0.84rem",color:E.g5,margin:0}}>{thresholds.probation}</p>
          </div>
        )}
        {thresholds.follow_up_pass_standard&&(
          <div>
            <div style={{fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:E.g4,marginBottom:4}}>Follow-up Pass Standard</div>
            <p style={{fontSize:"0.84rem",color:E.g5,margin:0}}>{thresholds.follow_up_pass_standard}</p>
          </div>
        )}
      </div>
    </div>
  </section>
  )}

  {/* ═══ EVIDLY SOFT PITCH / CTA ═══ */}
  <section style={{padding:"64px 24px",background:E.w,borderTop:"1px solid "+E.g2}}>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,"+E.navyD+","+E.navy+")",borderRadius:18,padding:"36px 32px",textAlign:"center"}}>
        <div style={{marginBottom:16}}><Logo s="1.4rem" light tagline/></div>
        <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.7rem)",fontWeight:800,color:E.w,margin:"0 0 10px",lineHeight:1.2}}>Know your {j.county} County score before an inspector does.</h2>
        <p style={{fontSize:"0.88rem",color:"rgba(255,255,255,0.55)",maxWidth:460,margin:"0 auto 24px",lineHeight:1.7}}>EvidLY applies {enforcer}'s exact methodology to your daily data — so you see your score in real time, not after the fact.</p>
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

  {/* ═══ BACK LINK ═══ */}
  <section style={{padding:"24px",background:E.cream,borderTop:"1px solid "+E.g2,textAlign:"center"}}>
    <Link to="/scoretable/washington" style={{fontSize:"0.88rem",fontWeight:700,color:E.gold,textDecoration:"none"}}>← All Washington counties</Link>
  </section>

  {/* FOOTER */}
  <footer style={{padding:"36px 24px 20px",background:"#2C3E5C"}}>
    <div style={{maxWidth:960,margin:"0 auto",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:24}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><STIcon sz={22}/><STLogo s="0.95rem" light/></div>
        <p style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.4)",lineHeight:1.6,marginBottom:6}}>The Score Behind Every Table.</p>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}><Logo s="0.8rem" light tagline/></div>
        <p style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.3)",marginTop:6,lineHeight:1.5}}>Serving {j.county} County, Washington.</p>
      </div>
      <div><h4 style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>ScoreTable</h4><Link to="/scoretable/washington" style={{display:"block",fontSize:"0.76rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",marginBottom:5}}>All WA Counties</Link></div>
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
