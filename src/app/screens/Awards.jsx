import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, ChevronRight, ClipboardList, ExternalLink, LogIn, Medal, Star, Trophy } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn, signOut } from "../lib/auth";
import { content, flag } from "../lib/content";
import { awards, refreshAwardWinners, refreshAwardsSummary } from "../lib/awards";
import { LINKS, TECH_PILLARS } from "../lib/config";
import { Button, Sheet, TopBar } from "../components/ui";

/* =========================================================
   Catalyst Awards (iOS AwardsView): the hero, "See the
   applications" (the list for pass holders, while staff have it
   on), evaluation criteria, the five pillars, and Nominate while
   nominations are open (site.nominations_open, the website's
   switch). No numbers anywhere (Oct 22 2026, the organiser: "hide
   the number of applicants … the number of awards … the 'Road to
   Awards Night' section").
   Oct 31 2026 ("results are out"): the winners first, the award and
   the company; a tap opens the website's winner page in a sheet
   (/awards/winners/<id>?embed=1: the certificate as PDF / JPG and
   Share on LinkedIn, TTFC's page tagged). Hidden until they're live.
========================================================= */

// What the embedded winner page posts on Escape (src/lib/awardWinners.js AWARD_CLOSE_MESSAGE; not imported, so the
// web app doesn't pull in the website's form helpers).
const AWARD_CLOSE_MESSAGE = "ttfc-award-close";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "")); return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : ""; };

const EVALUATION = [
  ["Impact", 30, "#e0408a"], ["Innovation", 25, "var(--pur)"], ["Scale", 20, "#f58733"], ["Canadian", 15, "#d52b1e"], ["Execution", 10, "#a9a6b8"],
];

export default function Awards() {
  const a = useStore(auth);
  const ct = useStore(content);
  const { summary, winners, awardsNight } = useStore(awards);
  const signedIn = isSignedIn(a);
  const [openWinner, setOpenWinner] = useState(null);
  useEffect(() => { refreshAwardsSummary({ force: true }); refreshAwardWinners(); }, []);
  const frameRef = useRef(null);
  // Escape inside the winner's page (the iframe has focus) closes the sheet too.
  useEffect(() => {
    if (!openWinner) return undefined;
    const onMessage = (e) => {
      if (e.origin === window.location.origin && e.source === frameRef.current?.contentWindow && e.data?.type === AWARD_CLOSE_MESSAGE) setOpenWinner(null);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [openWinner]);
  const categoryWinners = winners.filter((w) => !w.special);
  const specialWinners = winners.filter((w) => w.special);

  const open = flag(ct, "site.nominations_open", true);
  // Hidden when staff switch the list off (the summary's `enabled`, or the site.award_applications switch itself).
  const showApps = summary?.enabled !== false && flag(ct, "site.award_applications", true);

  return (
    <div className="page">
      <TopBar title="Catalyst Awards" />
      <main id="main" className="pad stack-lg awards-page" style={{ paddingTop: 16 }}>
        <section className="stack-sm" aria-label="Catalyst Awards">
          <span className="eyebrow awards-eyebrow">Awards night · Oct 26, 2026</span>
          <h1 className="awards-hero">The Catalyst Awards.<br />One stage. Infinite impact.</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Honouring the pioneers transforming industries through technology, across the technology pillars and applied sectors, with special recognition awards.</p>
        </section>

        {winners.length > 0 && (
          <section className="stack-sm" aria-labelledby="winners-h">
            <span className="eyebrow awards-eyebrow"><Medal aria-hidden="true" style={{ width: 13, height: 13, verticalAlign: "-2px" }} /> Results are out</span>
            <h2 id="winners-h" style={{ margin: 0, fontSize: 22 }}>The winners</h2>
            <p className="small muted" style={{ margin: 0 }}>Here are the winners across the categories, presented at the Catalyst Awards Gala Night on {longDate(awardsNight)} in Toronto. Tap a winner to see the award, download the certificate or share it on LinkedIn.</p>
            {categoryWinners.map((w) => <WinnerRow key={w.id} w={w} onOpen={setOpenWinner} />)}
            {specialWinners.length > 0 && <h3 className="eyebrow" style={{ marginTop: 10 }}>Special recognition</h3>}
            {specialWinners.map((w) => <WinnerRow key={w.id} w={w} onOpen={setOpenWinner} />)}
          </section>
        )}

        {showApps && signedIn && (
          <Link to="/awards/applications" className="list-row pressable" style={{ padding: 14 }}>
            <span className="lead-icon lead-icon--accent" style={{ width: 34, height: 34 }}><ClipboardList aria-hidden="true" /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: "block" }}>See the applications</b>
              <span className="tiny muted">The people, organisations and teams nominated</span>
            </span>
            <ChevronRight className="chev" aria-hidden="true" />
          </Link>
        )}
        {showApps && !signedIn && (
          <div className="info-note" style={{ alignItems: "center" }}>
            <LogIn aria-hidden="true" style={{ width: 18, height: 18, flex: "none" }} />
            <span style={{ flex: 1 }}>Sign in to see applications</span>
            <button type="button" className="btn btn-sm" onClick={() => signOut()}>Sign in</button>
          </div>
        )}

        <section className="stack-sm" aria-labelledby="eval-h">
          <h2 id="eval-h" className="eyebrow awards-eyebrow">Evaluation criteria</h2>
          <div className="card stack-sm" style={{ gap: 12 }}>
            {EVALUATION.map(([label, weight, color]) => (
              <div key={label} className="stack-sm" style={{ gap: 6 }}>
                <div className="row small bold"><span style={{ flex: 1 }}>{label}</span><span style={{ color }}>{weight}%</span></div>
                <div className="rule-bar" aria-hidden="true"><i style={{ width: `${weight}%`, background: color }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="stack-sm" aria-labelledby="pillars-h">
          <h2 id="pillars-h" className="eyebrow">The pillar categories</h2>
          {TECH_PILLARS.map((p) => (
            <div key={p} className="card row award-pillar">
              <Star aria-hidden="true" className="award-pillar-star" />
              <span style={{ flex: 1, minWidth: 0 }}><span className="tiny muted bold" style={{ display: "block" }}>The Catalyst Award for</span><b>{p}</b></span>
            </div>
          ))}
        </section>

        {open ? (
          <Button variant="primary" size="lg" block icon={Trophy} onClick={() => window.open(`${LINKS.awards}#nominations`, "_blank", "noopener,noreferrer")}>Nominate someone</Button>
        ) : (
          <div className="card row-top" style={{ gap: 12 }}>
            <BadgeCheck aria-hidden="true" style={{ width: 22, height: 22, color: "var(--pur)", flex: "none" }} />
            <span>
              <b style={{ display: "block", fontSize: 15 }}>Nominations are now closed</b>
              <span className="small muted">{winners.length > 0
                ? "Thank you to everyone who took part. The winners were announced at the Catalyst Awards Gala Night on Oct 26 in Toronto."
                : "Thank you for your interest. Winners will be announced at the Catalyst Awards Night on Oct 26 in Toronto."}</span>
            </span>
          </div>
        )}
      </main>
      {openWinner && (
        <Sheet open full onClose={() => setOpenWinner(null)} title={openWinner.company}
          actions={{ left: <a className="link-btn" href={`/awards/winners/${openWinner.id}`} target="_blank" rel="noopener noreferrer" aria-label="Open in the browser"><ExternalLink aria-hidden="true" style={{ width: 18, height: 18 }} /></a> }}>
          <iframe ref={frameRef} className="winner-frame" src={`/awards/winners/${openWinner.id}?embed=1`} title={`${openWinner.award}: certificate, details and sharing`} />
        </Sheet>
      )}
    </div>
  );
}

function WinnerRow({ w, onOpen }) {
  return (
    <button type="button" className="list-row pressable winner-row" style={{ padding: 14, width: "100%", textAlign: "left" }} onClick={() => onOpen(w)} aria-haspopup="dialog">
      <span className="lead-icon lead-icon--accent" style={{ width: 34, height: 34 }}><Trophy aria-hidden="true" /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: "block", overflowWrap: "anywhere" }}>{w.company}</b>
        {w.showCompany && <span className="tiny bold" style={{ display: "block", color: "var(--pur)" }}>{w.presentedTo}</span>}
        <span className="tiny muted" style={{ display: "block" }}>{w.award}</span>
      </span>
      <ChevronRight className="chev" aria-hidden="true" />
    </button>
  );
}
