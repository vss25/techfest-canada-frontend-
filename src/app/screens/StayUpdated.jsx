import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Award, CheckCircle2, Coffee, Handshake, Mic2, Store, Users, UtensilsCrossed } from "lucide-react";
import { useStore } from "../lib/store";
import { content, refreshContent } from "../lib/content";
import { API } from "../lib/config";
import { isDemoApi } from "../lib/api";
import { Button, TopBar } from "../components/ui";
import { INTERESTS, blocks, checkForm, heroParts, joinWaitlist, lines, stayFrom } from "../../lib/stayUpdated";

/* =========================================================
   Stay updated (/app/stay-updated, Oct 23 2026): the TTFC 2027
   waitlist, the same page as thetechfestival.com/stay-updated in
   the web app's look. "TTFC 2027 · Toronto · Dates to be
   announced", the five pillars and five sectors, what to expect,
   "1000+ attendees across 2 days", then email + phone (both
   required), the three ticks and the consent line; the server's
   thank-you replaces the form. Same API (POST /api/stay-updated,
   source "webapp"), same staff-edited wording (stay.* app content
   keys, src/lib/stayUpdated.js). For everyone, guests and signed-
   out visitors included. Reached from Profile › Settings, the
   guest Profile and a small card on Home. No store badges here.
   In the demo nothing is sent (an in-app answer only).
========================================================= */

const EXPECT_ICONS = [Mic2, Award, Store, Coffee, UtensilsCrossed, Handshake];

function Form({ copy }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ticks, setTicks] = useState([]);
  const [hp, setHp] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState("");
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const thanksRef = useRef(null);

  useEffect(() => { if (done) thanksRef.current?.focus(); }, [done]);
  const toggle = (k) => setTicks((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    const found = checkForm({ email, phone });
    setErrors(found);
    setFormError("");
    if (found.email) { emailRef.current?.focus(); return; }
    if (found.phone) { phoneRef.current?.focus(); return; }
    setSending(true);
    try {
      if (isDemoApi()) { await new Promise((r) => setTimeout(r, 400)); setDone(copy["stay.thanks"]); return; }
      const r = await joinWaitlist(API, { email, phone, interests: ticks, source: "webapp", hp });
      setDone(r.message || copy["stay.thanks"]);
    } catch (err) {
      if (err.field === "email" || err.field === "phone") {
        setErrors({ [err.field]: err.message });
        (err.field === "email" ? emailRef : phoneRef).current?.focus();
      } else setFormError(err.message);
    } finally { setSending(false); }
  };

  if (done) {
    return (
      <section className="card wl-thanks" role="status" aria-live="polite">
        <CheckCircle2 className="wl-thanks-ico" aria-hidden="true" />
        <h2 ref={thanksRef} tabIndex={-1} className="wl-thanks-title">{copy["stay.thanks_title"]}</h2>
        <p className="muted" style={{ margin: 0 }}>{done}</p>
        <Link to="/" className="btn pressable" style={{ marginTop: 6 }}>Back to Home</Link>
      </section>
    );
  }

  return (
    <form className="card stack wl-form" onSubmit={submit} noValidate aria-labelledby="wl-form-h" aria-busy={sending || undefined}>
      <h2 id="wl-form-h" className="wl-h2">{copy["stay.form_title"]}</h2>
      <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>{copy["stay.form_intro"]}</p>
      <label className="field">
        <span className="field-label">{copy["stay.field_email"]}</span>
        <input ref={emailRef} className="input" type="email" name="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
          required maxLength={254} value={email} placeholder="you@company.com" disabled={sending}
          aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "wl-email-err" : undefined}
          onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: "" })); }} />
        {errors.email && <span id="wl-email-err" className="error-text">{errors.email}</span>}
      </label>
      <label className="field">
        <span className="field-label">{copy["stay.field_phone"]}</span>
        <input ref={phoneRef} className="input" type="tel" name="phone" inputMode="tel" autoComplete="tel" required maxLength={40} value={phone}
          placeholder="+1 416 555 0100" disabled={sending}
          aria-invalid={errors.phone ? true : undefined} aria-describedby={errors.phone ? "wl-phone-err" : undefined}
          onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors((x) => ({ ...x, phone: "" })); }} />
        {errors.phone && <span id="wl-phone-err" className="error-text">{errors.phone}</span>}
      </label>
      <fieldset className="wl-ticks" disabled={sending}>
        <legend className="field-label">{copy["stay.interests_label"]}</legend>
        {INTERESTS.map((k) => (
          <label key={k} className={"wl-tick pressable" + (ticks.includes(k) ? " is-on" : "")}>
            <input type="checkbox" name="interests" value={k} checked={ticks.includes(k)} onChange={() => toggle(k)} />
            <span>{copy[`stay.interest_${k}`]}</span>
          </label>
        ))}
      </fieldset>
      {/* Only bots fill this in. */}
      <div className="wl-hp" aria-hidden="true">
        <label>Leave this empty<input type="text" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
      </div>
      {formError && <p className="error-text" role="alert" style={{ margin: 0 }}>{formError}</p>}
      <Button type="submit" variant="primary" size="lg" block icon={ArrowRight} loading={sending}>{sending ? "Joining…" : copy["stay.button"]}</Button>
      <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>{copy["stay.consent"]} <Link to="/legal/privacy">Privacy Policy</Link></p>
    </form>
  );
}

export default function StayUpdated() {
  const c = useStore(content);
  useEffect(() => { refreshContent(); }, []);
  const copy = stayFrom(c.values);
  const hero = heroParts(copy["stay.hero_title"]);

  return (
    <div className="page">
      <TopBar title={copy["stay.eyebrow"]} />
      <main id="main" className="pad stack-lg" style={{ paddingTop: 16, paddingBottom: 32 }}>
        <section className="card wl-hero" aria-labelledby="wl-hero-h">
          <h2 id="wl-hero-h" className="wl-hero-title">
            <span className="wl-hero-lead">{hero.lead}</span>
            {hero.rest.length > 0 && <span className="wl-hero-rest">{hero.rest.map((p, i) => <span key={i}><span className="sr-only"> · </span>{p}</span>)}</span>}
          </h2>
          <p className="wl-hero-intro">{copy["stay.hero_intro"]}</p>
          <p className="wl-stat"><Users aria-hidden="true" />{copy["stay.stat"]}</p>
          <a href="#wl-join" className="btn btn-primary pressable wl-hero-btn" onClick={(e) => { e.preventDefault(); document.getElementById("wl-join")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{copy["stay.button"]}</a>
        </section>

        <section className="stack-sm" aria-labelledby="wl-prog-h">
          <h2 id="wl-prog-h" className="eyebrow">{copy["stay.program_title"]}</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>{copy["stay.program_intro"]}</p>
          <div className="card wl-list-card">
            <h3 className="wl-h3">{copy["stay.pillars_title"]}</h3>
            <ol className="wl-list">{lines(copy["stay.pillars"]).map((x) => <li key={x}>{x}</li>)}</ol>
          </div>
          <div className="card wl-list-card">
            <h3 className="wl-h3">{copy["stay.sectors_title"]}</h3>
            <ol className="wl-list">{lines(copy["stay.sectors"]).map((x) => <li key={x}>{x}</li>)}</ol>
          </div>
        </section>

        <section className="stack-sm" aria-labelledby="wl-exp-h">
          <h2 id="wl-exp-h" className="eyebrow">{copy["stay.expect_title"]}</h2>
          <ul className="card wl-expect">
            {blocks(copy["stay.expect"]).map((b, i) => {
              const Icon = EXPECT_ICONS[i % EXPECT_ICONS.length];
              return (
                <li key={`${b.title}-${i}`}>
                  <span className="lead-icon" aria-hidden="true"><Icon /></span>
                  <span><b>{b.title}</b>{b.body && <span className="tiny muted wl-expect-body">{b.body}</span>}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <div id="wl-join" style={{ scrollMarginTop: 72 }}>
          <Form copy={copy} />
        </div>
      </main>
    </div>
  );
}
