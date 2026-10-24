import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, CheckCircle2, ChevronRight } from "lucide-react";
import { useStore } from "../lib/store";
import { content } from "../lib/content";
import { API } from "../lib/config";
import { isDemoApi } from "../lib/api";
import { markStayJoined, stayJoined } from "../lib/stayJoined";
import { Button } from "./ui";
import { INTERESTS, checkForm, heroParts, joinWaitlist, stayFrom } from "../../lib/stayUpdated";

/* =========================================================
   The TTFC 2027 waitlist sign-up in the web app (Oct 23–24 2026),
   one form everywhere: the Stay updated screen (/app/stay-updated),
   the end of the Schedule (StayAgendaSection) and, from Home's
   "Stay updated for TTFC 2027" card (StayHomeCard), the screen.
   The organiser (Oct 24 2026): "Add the stay-updated section for
   someone to sign up for 2027 on the app too."
   The same as the website's form (src/lib/stayUpdated.js): email +
   phone (both required), the three ticks, the consent line, the
   staff-edited stay.* wording (Admin › Sales & emails › 2027
   waitlist › Wording), POST /api/stay-updated with source
   "webapp"; the server's thank-you replaces the form. In the demo
   nothing is sent (an in-app answer only). No store badges here.
========================================================= */

/** The form. `heading`: the title's level ("h2" on the screen, "h3" inside a section); `home`: a Back to Home link
    on the thank-you. */
export function StayForm({ copy, heading = "h2", home = true }) {
  const id = useId();
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
  const H = heading;

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
      markStayJoined();
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
        <H ref={thanksRef} tabIndex={-1} className="wl-thanks-title">{copy["stay.thanks_title"]}</H>
        <p className="muted" style={{ margin: 0 }}>{done}</p>
        {home && <Link to="/" className="btn pressable" style={{ marginTop: 6 }}>Back to Home</Link>}
      </section>
    );
  }

  return (
    <form className="card stack wl-form" onSubmit={submit} noValidate aria-labelledby={`${id}-h`} aria-busy={sending || undefined}>
      <H id={`${id}-h`} className="wl-h2">{copy["stay.form_title"]}</H>
      <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>{copy["stay.form_intro"]}</p>
      <label className="field">
        <span className="field-label">{copy["stay.field_email"]}</span>
        <input ref={emailRef} className="input" type="email" name="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
          required maxLength={254} value={email} placeholder="you@company.com" disabled={sending}
          aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? `${id}-email-err` : undefined}
          onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: "" })); }} />
        {errors.email && <span id={`${id}-email-err`} className="error-text">{errors.email}</span>}
      </label>
      <label className="field">
        <span className="field-label">{copy["stay.field_phone"]}</span>
        <input ref={phoneRef} className="input" type="tel" name="phone" inputMode="tel" autoComplete="tel" required maxLength={40} value={phone}
          placeholder="+1 416 555 0100" disabled={sending}
          aria-invalid={errors.phone ? true : undefined} aria-describedby={errors.phone ? `${id}-phone-err` : undefined}
          onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors((x) => ({ ...x, phone: "" })); }} />
        {errors.phone && <span id={`${id}-phone-err`} className="error-text">{errors.phone}</span>}
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

/** "Stay updated for TTFC 2027" with the hero's place and month ("Toronto", "November 2027"). */
function StayTitle({ copy, id, icon = false }) {
  const hero = heroParts(copy["stay.hero_title"]);
  return (
    <>
      <h2 id={id} className="stay-title">
        {icon && <span className="stay-title-ico" aria-hidden="true"><CalendarClock /></span>}
        {/* "TTFC 2027" kept on one line. */}
        <span>Stay updated for {(hero.lead || "TTFC 2027").replace(/ /g, "\u00a0")}</span>
      </h2>
      {hero.rest.length > 0 && <span className="wl-hero-rest stay-chips">{hero.rest.map((p) => <span key={p}>{p}</span>)}</span>}
    </>
  );
}

/** Already on the list (this device): a short "you're in" with the way to the 2027 journey. */
function Joined({ copy }) {
  return (
    <Link to="/stay-updated" className="card stay-joined pressable">
      <CheckCircle2 aria-hidden="true" className="stay-joined-ico" />
      <span style={{ flex: 1, minWidth: 0 }}>
        <b>{copy["stay.thanks_title"]}</b>
        <span className="tiny muted">{copy["stay.journey_title"]}</span>
      </span>
      <ChevronRight aria-hidden="true" style={{ width: 16, height: 16, flex: "none", color: "var(--tx2)" }} />
    </Link>
  );
}

/** Home: the sign-up card; its button opens the Stay updated screen at the form. */
export function StayHomeCard() {
  const c = useStore(content);
  const { joined } = useStore(stayJoined);
  const copy = stayFrom(c.values);
  if (joined) return <Joined copy={copy} />;
  return (
    <section className="card stay-card" aria-labelledby="stay-home-h">
      <StayTitle copy={copy} id="stay-home-h" icon />
      <Link to="/stay-updated#wl-join" className="btn btn-primary btn-block pressable stay-card-btn">
        {copy["stay.button"]}<ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}

/** The end of the Schedule: the form itself, under "Stay updated for TTFC 2027". */
export function StayAgendaSection() {
  const c = useStore(content);
  // Decided when the screen opens: joining here keeps the server's thank-you on screen.
  const [joinedBefore] = useState(() => stayJoined.get().joined);
  const copy = stayFrom(c.values);
  return (
    <section className="pad stack-sm stay-section" aria-labelledby="stay-agenda-h">
      <StayTitle copy={copy} id="stay-agenda-h" />
      {joinedBefore ? <Joined copy={copy} /> : <StayForm copy={copy} heading="h3" home={false} />}
    </section>
  );
}
