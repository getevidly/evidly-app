/**
 * FlowOverview — the Outreach tab's stage-by-stage flow reference.
 *
 * Content and styling are reproduced verbatim from the approved mock
 * "R — Flow overview (audience, send, purpose).html". The markup is inlined
 * rather than hand-converted to JSX so the copy cannot drift from the mock:
 * it is a static string with no interpolation and no user input.
 *
 * Every CSS rule is scoped under .flow-overview, including the three media
 * queries, so nothing leaks into the other Marketing tabs. The mock's page
 * chrome — topbar, wordmark, breadcrumb, email — is omitted.
 */

const FLOW_CSS = `
.flow-overview{--navy:#1C2A3A; --ink:#20293c; --ink-2:#4A5566; --ink-3:#5F6875; --muted:#6B7480;
    --stone:#6E675A; --stone-2:#A79E8B;
    --ember:#B24A2E; --ember-deep:#8F3A22; --ember-bg:#F6E7E1;
    --slate:#3E6B8A; --slate-bg:#E8EEF4; --slate-line:#D2DFE9;
    --green:#3E5E4B; --green-bg:#E3ECE1; --green-line:#C4DBCB;
    --gold:#8A6412; --amber-bg:#F7EDD3; --amber-line:#E7D6B0;
    --red:#9E3B32; --red-bg:#F6E3DF; --red-line:#E4C4BE;
    --line:#E2E6EA; --line-2:#EDF0F3; --band:#F0F3F6;
    --paper:#FFFFFF; --canvas:#F4F6F8; --cream:#FAF7F0;
    --sans:'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    --mono:'IBM Plex Mono','Courier New',monospace;}
.flow-overview *{box-sizing:border-box}
.flow-overview .wrap{max-width:1180px;margin:0 auto;padding:20px 16px 0}
.flow-overview .hd{margin-bottom:20px}
.flow-overview .hd h1{margin:0;font-size:25px;font-weight:700;color:var(--navy);letter-spacing:-.025em}
.flow-overview .hd p{margin:8px 0 0;font-size:14px;color:var(--muted);line-height:1.65;max-width:82ch}
.flow-overview .hd p b{color:var(--ink);font-weight:600}
.flow-overview .legend{display:flex;gap:14px;flex-wrap:wrap;background:var(--paper);border:1px solid var(--line);
    border-radius:10px;padding:12px 16px;margin-bottom:22px}
.flow-overview .legend span{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted)}
.flow-overview .chip{font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;
    padding:4px 8px;border-radius:4px;font-weight:500}
.flow-overview .chip.ev{background:var(--green-bg);color:var(--green);border:1px solid var(--green-line)}
.flow-overview .chip.hs{background:var(--slate-bg);color:var(--slate);border:1px solid var(--slate-line)}
.flow-overview .chip.pg{background:var(--band);color:var(--stone);border:1px solid var(--line)}
.flow-overview .chip.nb{background:var(--red-bg);color:var(--red);border:1px solid var(--red-line)}
.flow-overview .chip.sg{background:var(--amber-bg);color:var(--gold);border:1px solid var(--amber-line)}
.flow-overview .lane{margin-bottom:30px}
.flow-overview .lane-h{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;padding:13px 18px;border-radius:10px 10px 0 0;
    border:1px solid var(--line);border-bottom:0;background:var(--paper)}
.flow-overview .lane.warm .lane-h{border-left:4px solid var(--green)}
.flow-overview .lane.cold .lane-h{border-left:4px solid var(--slate)}
.flow-overview .lane-h .t{font-size:19px;font-weight:700;color:var(--navy);letter-spacing:-.02em}
.flow-overview .lane-h .aud{font-size:13px;color:var(--muted)}
.flow-overview .lane-h .n{margin-left:auto;font-family:var(--mono);font-size:10px;letter-spacing:.12em;
    text-transform:uppercase;color:var(--stone-2)}
.flow-overview .stages{border:1px solid var(--line);border-radius:0 0 10px 10px;background:var(--paper);overflow:hidden}
.flow-overview .stage{display:grid;grid-template-columns:1fr;border-bottom:1px solid var(--line-2)}
@media(min-width:900px){ .flow-overview .stage{grid-template-columns:210px 1fr 300px} }
.flow-overview .stage:last-child{border-bottom:0}
.flow-overview .st-l{padding:16px 18px;background:#FBFCFD;border-bottom:1px solid var(--line-2)}
@media(min-width:900px){ .flow-overview .st-l{border-bottom:0;border-right:1px solid var(--line-2)} }
.flow-overview .st-n{display:flex;align-items:center;gap:9px}
.flow-overview .st-num{width:24px;height:24px;border-radius:6px;background:var(--navy);color:#fff;flex:none;
    display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:11px}
.flow-overview .st-name{font-size:15px;font-weight:700;color:var(--ink);letter-spacing:-.01em}
.flow-overview .st-trig{font-family:var(--mono);font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;
    color:var(--stone-2);margin-top:8px;line-height:1.6}
.flow-overview .st-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.flow-overview .st-m{padding:16px 18px;border-bottom:1px solid var(--line-2)}
@media(min-width:900px){ .flow-overview .st-m{border-bottom:0;border-right:1px solid var(--line-2)} }
.flow-overview .k{font-family:var(--mono);font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:var(--stone-2)}
.flow-overview .aud{font-size:13.5px;color:var(--ink);margin-top:5px;font-weight:600}
.flow-overview .sent{margin-top:13px}
.flow-overview .sent ul{margin:6px 0 0;padding:0;list-style:none}
.flow-overview .sent li{font-size:13px;color:var(--ink-2);line-height:1.6;padding-left:15px;position:relative;margin-bottom:3px}
.flow-overview .sent li::before{content:'·';position:absolute;left:4px;color:var(--stone-2);font-weight:700}
.flow-overview .cta-line{margin-top:11px;display:inline-block;font-size:12.5px;font-weight:600;color:var(--ember-deep);
    background:var(--ember-bg);border-radius:6px;padding:5px 11px}
.flow-overview .cta-line.none{background:var(--band);color:var(--stone)}
.flow-overview .st-r{padding:16px 18px;background:var(--cream)}
.flow-overview .purp{font-size:13.5px;color:var(--ink);line-height:1.65;margin-top:5px}
.flow-overview .purp b{color:var(--ember-deep);font-weight:600}
.flow-overview .not{margin-top:11px;background:var(--paper);border:1px solid var(--line);border-radius:8px;
    padding:10px 12px;font-size:12.5px;color:var(--muted);line-height:1.6}
.flow-overview .not b{color:var(--ink);font-weight:600}
.flow-overview .foot{max-width:1180px;margin:0 auto;padding:0 16px}
.flow-overview .rules{background:var(--paper);border:1px solid var(--line);border-radius:11px;padding:18px 20px}
.flow-overview .rules h3{margin:0 0 12px;font-size:17px;font-weight:700;color:var(--navy);letter-spacing:-.01em}
.flow-overview .rule{display:flex;gap:12px;padding:11px 0;border-bottom:1px solid var(--line-2)}
.flow-overview .rule:last-child{border-bottom:0}
.flow-overview .rule .i{width:7px;height:7px;border-radius:50%;background:var(--ember);flex:none;margin-top:8px}
.flow-overview .rule .b{font-size:13.5px;color:var(--ink-2);line-height:1.65}
.flow-overview .rule .b b{color:var(--ink);font-weight:700}
`;

const FLOW_HTML = `
<div class="wrap">

  <div class="hd">
    <h1>The flow, stage by stage</h1>
    <p>Every stage on both paths: <b>who receives it, what is actually sent, and why that stage exists.</b> Read this before adding anyone to a list. The purpose column is the part that matters — a stage sent for the wrong reason still arrives, and still costs you the reader.</p>
  </div>

  <div class="legend">
    <span><i class="chip ev">EvidLY</i> sends from our own domain</span>
    <span><i class="chip hs">ListKit</i> bulk send, suppression handled there</span>
    <span><i class="chip pg">Page</i> not an email — a screen they land on</span>
    <span><i class="chip sg">Sign-off</i> cannot fire until you approve it</span>
    <span><i class="chip nb">Not built</i></span>
  </div>

  <!-- ================= WARM ================= -->
  <div class="lane warm">
    <div class="lane-h">
      <span class="t">Warm</span>
      <span class="aud">A Cleaning Pros Plus client — we clean their kitchen exhaust and hood</span>
      <span class="n">6 stages</span>
    </div>
    <div class="stages">

      <div class="stage">
        <div class="st-l">
          <div class="st-n"><span class="st-num">1</span><span class="st-name">County briefing</span></div>
          <div class="st-trig">Trigger · added to the list<br />Sends · immediately</div>
          <div class="st-chips"><span class="chip ev">EvidLY</span><span class="chip sg">Sign-off</span></div>
        </div>
        <div class="st-m">
          <div class="k">Audience</div>
          <div class="aud">Every warm recipient, once their county is approved</div>
          <div class="sent">
            <div class="k">What is sent</div>
            <ul>
              <li>Who inspects them — both authorities, named</li>
              <li>How that county evaluates a commercial kitchen</li>
              <li>What it weights heaviest, where we hold it</li>
              <li>The hood cleaning frequency it enforces</li>
              <li>Their most recent certificate goes on file, and every cleaning after it</li>
            </ul>
          </div>
          <span class="cta-line">Your EvidLY invitation is on its way</span>
        </div>
        <div class="st-r">
          <div class="k">Purpose</div>
          <div class="purp"><b>Give before asking.</b> It is the only email in the set that hands something over and requests nothing. For a client it reinforces why they hired us; it also gets them thinking about who can ask them for what, so everything after it lands on a reader already thinking about the problem.</div>
          <div class="not"><b>Not the sale.</b> This is the opening act. It does not ask for a meeting and it does not pitch the product.</div>
        </div>
      </div>

      <div class="stage">
        <div class="st-l">
          <div class="st-n"><span class="st-num">2</span><span class="st-name">Client invite</span></div>
          <div class="st-trig">Trigger · briefing sent<br />Sends · 4 days later</div>
          <div class="st-chips"><span class="chip ev">EvidLY</span><span class="chip sg">Sign-off</span></div>
        </div>
        <div class="st-m">
          <div class="k">Audience</div>
          <div class="aud">Warm only — held if they have no invite on file</div>
          <div class="sent">
            <div class="k">What is sent</div>
            <ul>
              <li>Their hood cleaning service certificate is on file</li>
              <li>The four people who ask, and on whose schedule</li>
              <li>Fire safety, food safety and intelligence, itemised</li>
              <li>A teaser of the dashboard, with their real ring counts</li>
            </ul>
          </div>
          <span class="cta-line">See the dashboard →</span>
        </div>
        <div class="st-r">
          <div class="k">Purpose</div>
          <div class="purp"><b>State the one thing we can prove, then show the rest.</b> Their certificate is on file — that is the fact this whole path rests on. Everything else is what sits alongside it and is not yet held.</div>
          <div class="not"><b>The rings are what EvidLY holds, not a compliance score.</b> The rest may well exist in a binder or a vendor's inbox. Nothing here claims otherwise.</div>
        </div>
      </div>

      <div class="stage">
        <div class="st-l">
          <div class="st-n"><span class="st-num">3</span><span class="st-name">Sample dashboard</span></div>
          <div class="st-trig">Trigger · they click<br />/join · forwardable</div>
          <div class="st-chips"><span class="chip pg">Page</span></div>
        </div>
        <div class="st-m">
          <div class="k">Audience</div>
          <div class="aud">Anyone the invite reaches, or is forwarded to</div>
          <div class="sent">
            <div class="k">What they see</div>
            <ul>
              <li>A worked sample — Pacific Restaurant Group, three kitchens, 3 of 54</li>
              <li>Four people who can ask · what someone can ask for</li>
              <li>What is at risk, with the what-if control beneath it</li>
              <li>Business records, kitchen and vendor</li>
            </ul>
          </div>
          <span class="cta-line">See your records →</span>
        </div>
        <div class="st-r">
          <div class="k">Purpose</div>
          <div class="purp"><b>Show the product working before showing them their own position.</b> A client's account holds one certificate — a dashboard at 1 of 54 sells nothing. The sample carries a year of records so the argument is visible.</div>
          <div class="not"><b>Deliberately imperfect, and deliberately not theirs.</b> A sample at 100% would suggest the product is not needed. Nobody sees their own dashboard until the account is configured.</div>
        </div>
      </div>

      <div class="stage">
        <div class="st-l">
          <div class="st-n"><span class="st-num">4</span><span class="st-name">Their records</span></div>
          <div class="st-trig">Trigger · they click<br />/gate/:token · not forwardable</div>
          <div class="st-chips"><span class="chip pg">Page</span></div>
        </div>
        <div class="st-m">
          <div class="k">Audience</div>
          <div class="aud">One named organisation — this link is theirs alone</div>
          <div class="sent">
            <div class="k">What they see</div>
            <ul>
              <li>Their hood cleaning certificate, on file and current</li>
              <li>Fire 1 of 5 · Food 0 of 13 · Business 0 of 6 · 5 per vendor</li>
              <li>Every requirement, with its citation and what proves it</li>
            </ul>
          </div>
          <span class="cta-line">Take the study →</span>
        </div>
        <div class="st-r">
          <div class="k">Purpose</div>
          <div class="purp"><b>The only surface that shows a named organisation its actual position.</b> Everything before it is general or a sample; this is theirs, and it is the first moment the gap is concrete.</div>
          <div class="not"><b>Never forward this one.</b> Every other stage carries nothing organisation-specific and can be passed around inside a company. This cannot.</div>
        </div>
      </div>

      <div class="stage">
        <div class="st-l">
          <div class="st-n"><span class="st-num">5</span><span class="st-name">Study invitation</span></div>
          <div class="st-trig">Trigger · gate viewed<br />Sends · 2 days later</div>
          <div class="st-chips"><span class="chip ev">EvidLY</span><span class="chip sg">Sign-off</span><span class="chip nb">Not built</span></div>
        </div>
        <div class="st-m">
          <div class="k">Audience</div>
          <div class="aud">Anyone who opened their gate — tagged <span style="font-family:var(--mono);font-size:12px">?from=client</span></div>
          <div class="sent">
            <div class="k">What is sent</div>
            <ul>
              <li>A short ask — three minutes, and they already know the answers</li>
              <li>Why their answers matter beyond their own kitchen</li>
              <li>No repeat of the gate; they have just seen it</li>
            </ul>
          </div>
          <span class="cta-line">Take the study →</span>
        </div>
        <div class="st-r">
          <div class="k">Purpose</div>
          <div class="purp"><b>The trigger is a gate view, not a configured account.</b> Most accounts never reach configuration, so keying this to it would stall silently for exactly the people worth following up with.</div>
          <div class="not"><b>Tag them separately or they bias the study.</b> A CPP client is not a random California kitchen. Split out, they become the comparison the study exists to produce.</div>
        </div>
      </div>

      <div class="stage">
        <div class="st-l">
          <div class="st-n"><span class="st-num">6</span><span class="st-name">Snapshot, then the meeting</span></div>
          <div class="st-trig">Trigger · study completed<br />On screen · immediately</div>
          <div class="st-chips"><span class="chip pg">Page</span></div>
        </div>
        <div class="st-m">
          <div class="k">Audience</div>
          <div class="aud">Anyone who finishes the study, warm or cold</div>
          <div class="sent">
            <div class="k">What they see</div>
            <ul>
              <li>Their own bands — could send, would have to find, not on file</li>
              <li>Three free options: findings, county briefing, forwardable link</li>
              <li>Then, separately, the meeting — named to the records they flagged</li>
            </ul>
          </div>
          <span class="cta-line">Book a meeting →</span>
        </div>
        <div class="st-r">
          <div class="k">Purpose</div>
          <div class="purp"><b>The first of two meeting asks, and the only one they see on screen.</b> It is reasoned from their own answers, which is why it converts where a generic ask does not.</div>
          <div class="not"><b>The meeting is not a tick box.</b> Beside three free, anonymous options it loses every time — so it sits below them, on its own.</div>
        </div>
      </div>

    </div>
  </div>

  <!-- ================= COLD ================= -->
  <div class="lane cold">
    <div class="lane-h">
      <span class="t">Cold</span>
      <span class="aud">A California commercial kitchen we have never seen — no relationship, no records</span>
      <span class="n">5 stages</span>
    </div>
    <div class="stages">

      <div class="stage">
        <div class="st-l">
          <div class="st-n"><span class="st-num">1</span><span class="st-name">County briefing</span></div>
          <div class="st-trig">Trigger · list handed over<br />Sends · manual, per county</div>
          <div class="st-chips"><span class="chip hs">ListKit</span><span class="chip sg">Sign-off</span></div>
        </div>
        <div class="st-m">
          <div class="k">Audience</div>
          <div class="aud">Kitchens in one approved county, exported as a list</div>
          <div class="sent">
            <div class="k">What is sent</div>
            <ul>
              <li>Identical body to the warm version — same four county sections</li>
              <li>Nothing about their kitchen; we have never seen it</li>
            </ul>
          </div>
          <span class="cta-line">Take the study →</span>
        </div>
        <div class="st-r">
          <div class="k">Purpose</div>
          <div class="purp"><b>The one cold email, and the one cold call to action.</b> Same message on LinkedIn, the show QR, the call script and the postcard — only the delivery differs.</div>
          <div class="not"><b>Sent from ListKit, not EvidLY.</b> Our sending domain carries the invite, the gate links and every vendor request. Cold volume there risks the mail that has to arrive.</div>
        </div>
      </div>

      <div class="stage">
        <div class="st-l">
          <div class="st-n"><span class="st-num">2</span><span class="st-name">The study</span></div>
          <div class="st-trig">Trigger · they click<br />getevidly.com/study</div>
          <div class="st-chips"><span class="chip pg">Page</span></div>
        </div>
        <div class="st-m">
          <div class="k">Audience</div>
          <div class="aud">Anyone who arrives, from any channel, tagged or not</div>
          <div class="sent">
            <div class="k">What they see</div>
            <ul>
              <li>One question first, alone — food, facility, or both</li>
              <li>Then 12, 15 or 19 questions depending on the answer</li>
              <li>No login, every answer saved as they go</li>
            </ul>
          </div>
          <span class="cta-line none">No ask until the end</span>
        </div>
        <div class="st-r">
          <div class="k">Purpose</div>
          <div class="purp"><b>The main attraction.</b> Everything upstream exists to get someone here, because their answers are what makes every downstream message specific to them.</div>
          <div class="not"><b>Question one is alone for a reason.</b> It routes rather than measures, so until it is answered the counter cannot show a total — and nobody wants to start something of unknown length.</div>
        </div>
      </div>

      <div class="stage">
        <div class="st-l">
          <div class="st-n"><span class="st-num">3</span><span class="st-name">Their briefing, with their answers</span></div>
          <div class="st-trig">Trigger · study completed<br />Sends · immediately</div>
          <div class="st-chips"><span class="chip ev">EvidLY</span></div>
        </div>
        <div class="st-m">
          <div class="k">Audience</div>
          <div class="aud">Anyone who ticked "send me a briefing for my county"</div>
          <div class="sent">
            <div class="k">What is sent</div>
            <ul>
              <li>The same four county sections they already read</li>
              <li>Plus one new section — what they told us, read back</li>
            </ul>
          </div>
          <span class="cta-line none">No ask — it is a delivery</span>
        </div>
        <div class="st-r">
          <div class="k">Purpose</div>
          <div class="purp"><b>Keeping the promise.</b> They gave three minutes on the understanding they would get something back. This is it, and nothing is duplicated — a section is added.</div>
          <div class="not"><b>Their answers, never a finding.</b> We have not inspected their kitchen and the email says so.</div>
        </div>
      </div>

      <div class="stage">
        <div class="st-l">
          <div class="st-n"><span class="st-num">4</span><span class="st-name">Forwardable link</span></div>
          <div class="st-trig">Trigger · they asked for one<br />Sends · immediately</div>
          <div class="st-chips"><span class="chip ev">EvidLY</span></div>
        </div>
        <div class="st-m">
          <div class="k">Audience</div>
          <div class="aud">Anyone who ticked "send me a link I can forward"</div>
          <div class="sent">
            <div class="k">What is sent</div>
            <ul>
              <li>A study link they can pass on, tagged <span style="font-family:var(--mono);font-size:12px">?from=referral</span></li>
              <li>We never ask for the colleague's address</li>
            </ul>
          </div>
          <span class="cta-line">Take the study →</span>
        </div>
        <div class="st-r">
          <div class="k">Purpose</div>
          <div class="purp"><b>How one kitchen gets covered by two people.</b> Food safety and facility safety usually sit with different people, so a single respondent can only answer half.</div>
          <div class="not"><b>They forward it, not us.</b> Asking for a colleague's address turns a favour into a data grab.</div>
        </div>
      </div>

      <div class="stage">
        <div class="st-l">
          <div class="st-n"><span class="st-num">5</span><span class="st-name">Follow-up, if unbooked</span></div>
          <div class="st-trig">Trigger · study completed<br />Sends · 5 days later</div>
          <div class="st-chips"><span class="chip ev">EvidLY</span><span class="chip sg">Sign-off</span><span class="chip nb">Not built</span></div>
        </div>
        <div class="st-m">
          <div class="k">Audience</div>
          <div class="aud">Completed the study, did not book a meeting</div>
          <div class="sent">
            <div class="k">What is sent</div>
            <ul>
              <li>The two or three records they said were not on file, named</li>
              <li>Nothing new asked for — the same meeting, a second time</li>
            </ul>
          </div>
          <span class="cta-line">Book a meeting →</span>
        </div>
        <div class="st-r">
          <div class="k">Purpose</div>
          <div class="purp"><b>The most qualified person in the flow.</b> They told us exactly what they cannot produce. Today the sequence ends at the results page and this person is never contacted again.</div>
          <div class="not"><b>Second and last meeting ask.</b> Two earned asks, not a sequence of chasers.</div>
        </div>
      </div>

    </div>
  </div>

</div>

<div class="foot">
  <div class="rules">
    <h3>What holds across every stage</h3>
    <div class="rule"><span class="i"></span><div class="b"><b>Nothing sends without sign-off, per step.</b> Editing a step's copy clears it. An unsigned step waits in the queue with that reason on its row.</div></div>
    <div class="rule"><span class="i"></span><div class="b"><b>No county sends until its briefing is approved</b> — and approval lapses on its own when the jurisdiction record changes, because one approval must never cover content that moved underneath it.</div></div>
    <div class="rule"><span class="i"></span><div class="b"><b>We never assert the negative about a kitchen we have not seen.</b> Cold surfaces show what is required, never what someone is missing. Only the gate shows a named organisation its own position.</div></div>
    <div class="rule"><span class="i"></span><div class="b"><b>Everything up to the gate is forwardable.</b> That is how a kitchen manager gets the facilities director involved — and the food and facility split means two people usually have to see it.</div></div>
    <div class="rule"><span class="i"></span><div class="b"><b>The county sections are derived, never typed.</b> Framing copy around them is editable; the facts inside them change only when the jurisdiction record does.</div></div>
    <div class="rule"><span class="i"></span><div class="b"><b>A held send says why on its own row.</b> County not approved, no invite on file, sending paused, step not signed off. Nothing fails silently.</div></div>
  </div>
</div>
`;

export default function FlowOverview() {
  return (
    <div className="flow-overview">
      <style>{FLOW_CSS}</style>
      <div dangerouslySetInnerHTML={{ __html: FLOW_HTML }} />
    </div>
  );
}
