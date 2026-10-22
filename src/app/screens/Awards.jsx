import { useEffect } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, ChevronRight, ClipboardList, Grid3x3, LogIn, Star, Trophy } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn, signOut } from "../lib/auth";
import { content, flag } from "../lib/content";
import { awards, awardsLine, refreshAwardsSummary } from "../lib/awards";
import { LINKS, TECH_PILLARS } from "../lib/config";
import { Button, TopBar } from "../components/ui";

/* =========================================================
   Catalyst Awards (iOS AwardsView): the hero, the counts
   (Awards = the categories that received eligible applications,
   GET /api/app/awards/summary; Applications opens the list for
   pass holders), evaluation criteria, the five pillars, the road
   to awards night, and Nominate while nominations are open
   (site.nominations_open, the website's switch). Until the
   summary has loaded the screen shows no number (never "28").
========================================================= */

const EVALUATION = [
  ["Impact", 30, "#e0408a"], ["Innovation", 25, "var(--pur)"], ["Scale", 20, "#f58733"], ["Canadian", 15, "#d52b1e"], ["Execution", 10, "#a9a6b8"],
];
const DATES = [
  ["Jun", "Framework"], ["Jul–Aug", null], ["Sep", "Screening"], ["Oct 6", "Shortlist"], ["Oct 15", "Winners sealed"], ["Oct 26", "Awards Night"],
];

function CountCard({ icon, value, label, to, hint }) {
  const Icon = icon;
  const inner = (
    <>
      <Icon aria-hidden="true" className="award-count-ico" />
      <b className="figure">{value}</b>
      <span>{label}</span>
      {hint && <span className="award-count-hint">{hint}</span>}
    </>
  );
  return to
    ? <Link to={to} className="award-count award-count--link pressable" aria-label={`${value} ${label}. Opens the list`}>{inner}<ChevronRight aria-hidden="true" className="award-count-chev" /></Link>
    : <div className="award-count">{inner}</div>;
}

export default function Awards() {
  const a = useStore(auth);
  const ct = useStore(content);
  const { summary } = useStore(awards);
  const signedIn = isSignedIn(a);
  useEffect(() => { refreshAwardsSummary({ force: true }); }, []);

  const total = awardsLine(summary); // "12 Awards", or null while unknown
  const open = flag(ct, "site.nominations_open", true);
  // Hidden when staff switch the list off (the summary's `enabled`, or the site.award_applications switch itself).
  const showApps = summary?.enabled !== false && flag(ct, "site.award_applications", true) && summary?.applicationsCount != null;

  return (
    <div className="page">
      <TopBar title="Catalyst Awards" />
      <main id="main" className="pad stack-lg awards-page" style={{ paddingTop: 16 }}>
        <section className="stack-sm" aria-label="Catalyst Awards">
          <span className="eyebrow awards-eyebrow">Awards night · Oct 26, 2026</span>
          <h1 className="awards-hero">{total ? `${total}.` : "Catalyst Awards."}<br />One stage. Infinite impact.</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Honouring the pioneers transforming industries through technology. Categories span the 5×5 pillar-sector matrix and special recognition awards.</p>
        </section>

        <div className="award-counts">
          {total && <CountCard icon={Trophy} value={summary.categoriesCount} label={summary.categoriesCount === 1 ? "Award" : "Awards"} />}
          <CountCard icon={Grid3x3} value="5×5" label="Matrix" />
          <CountCard icon={Star} value="3" label="Special" />
        </div>
        {showApps && (
          <div className="award-counts award-counts--one">
            <CountCard icon={ClipboardList} value={summary.applicationsCount} label={summary.applicationsCount === 1 ? "Application" : "Applications"}
              to={signedIn ? "/awards/applications" : undefined} />
          </div>
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
          <h2 id="pillars-h" className="eyebrow">The 5 pillar categories</h2>
          {TECH_PILLARS.map((p) => (
            <div key={p} className="card row award-pillar">
              <Star aria-hidden="true" className="award-pillar-star" />
              <span style={{ flex: 1, minWidth: 0 }}><span className="tiny muted bold" style={{ display: "block" }}>The Catalyst Award for</span><b>{p}</b></span>
              <span className="tiny muted">5 categories</span>
            </div>
          ))}
        </section>

        <section className="stack-sm" aria-labelledby="dates-h">
          <h2 id="dates-h" className="eyebrow awards-eyebrow--orange">Road to awards night</h2>
          <div className="card stack-sm" style={{ gap: 12 }}>
            {DATES.map(([when, what], i) => (
              <div key={when} className="row award-date">
                <span className={"award-date-when" + (i === DATES.length - 1 ? " is-night" : "")}>{when}</span>
                <b className="small">{what || (open ? "Nominations open (free)" : "Nominations (now closed)")}</b>
              </div>
            ))}
          </div>
        </section>

        {open ? (
          <Button variant="primary" size="lg" block icon={Trophy} onClick={() => window.open(`${LINKS.awards}#nominations`, "_blank", "noopener,noreferrer")}>Nominate someone</Button>
        ) : (
          <div className="card row-top" style={{ gap: 12 }}>
            <BadgeCheck aria-hidden="true" style={{ width: 22, height: 22, color: "var(--pur)", flex: "none" }} />
            <span>
              <b style={{ display: "block", fontSize: 15 }}>Nominations are now closed</b>
              <span className="small muted">Thank you for your interest. Winners will be announced at the Catalyst Awards Night on Oct 26 in Toronto.</span>
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
