import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useStore } from "../lib/store";
import { content, refreshContent } from "../lib/content";
import { API } from "../lib/config";
import { isDemoApi } from "../lib/api";
import { Button, TopBar } from "../components/ui";
import { INTERESTS, checkForm, heroParts, joinWaitlist, stayFrom } from "../../lib/stayUpdated";
import { journeyFrom } from "../../lib/stayJourney";
import JourneyView from "../../components/StayJourney";

/* =========================================================
   Stay updated (/app/stay-updated, Oct 23 2026): the TTFC 2027
   waitlist, the same page as thetechfestival.com/stay-updated in
   the web app's look: the hero, email + phone (both required), the
   three ticks and the consent line (the server's thank-you
   replaces the form), then the 2027 journey: the map of Canada and
   the stops (components/StayJourney.jsx, compact; stay.journey).
   The 5 × 5 programme and "What to expect" were removed on Oct 23
   2026; no attendee count on 2027 material. Same API (POST /api/stay-updated,
   source "webapp"), same staff-edited wording (stay.* app content
   keys, src/lib/stayUpdated.js). For everyone, guests and signed-
   out visitors included. Reached from Profile › Settings, the
   guest Profile and a small card on Home. No store badges here.
   In the demo nothing is sent (an in-app answer only).
========================================================= */

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
  const stops = journeyFrom(copy["stay.journey"]);

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
          <a href="#wl-join" className="btn btn-primary pressable wl-hero-btn" onClick={(e) => { e.preventDefault(); document.getElementById("wl-join")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{copy["stay.button"]}</a>
        </section>

        {/* The form straight after the hero (the organiser, Oct 23 2026: "Bring the contact form up"). */}
        <div id="wl-join" style={{ scrollMarginTop: 72 }}>
          <Form copy={copy} />
        </div>

        {/* The 2027 journey (the organiser, Oct 23 2026): the map of Canada and the stops, in order. */}
        <section className="stack-sm" aria-labelledby="wl-journey-h">
          <h2 id="wl-journey-h" className="eyebrow">{copy["stay.journey_title"]}</h2>
          {copy["stay.journey_intro"] && <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>{copy["stay.journey_intro"]}</p>}
          <div className="wl-journey">
            <JourneyView stops={stops} compact mapTitle={`Map of Canada: ${copy["stay.journey_title"]}`} />
          </div>
        </section>
      </main>
    </div>
  );
}
