import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PUBLIC_API } from "../hooks/useSiteSettings";
import { INTERESTS, checkForm, joinWaitlist } from "../lib/stayUpdated";

/* =========================================================
   The TTFC 2027 waitlist form (Oct 23 2026), one copy for the
   website: /stay-updated (src/pages/StayUpdated.jsx) and the
   "Stay updated for TTFC 2027" section at the bottom of
   /programme (src/pages/Programme.jsx, Oct 24 2026). Email +
   phone (both required), the three interest ticks, the consent
   line with the Privacy Policy link and the honeypot; it posts
   to POST {API}/stay-updated with `source` and the server's
   thank-you replaces it. Every word is a stay.* key (`copy` =
   stayFrom(useSiteSettings()), src/lib/stayUpdated.js), edited
   in Admin › Sales & emails › 2027 waitlist › Wording.
   The web app has its own screen (src/app/screens/StayUpdated.jsx).

   Its look is the "su-" classes below, coloured by the page's
   --su-* variables (--su-text, --su-mid, --su-dim, --su-line,
   --su-input, --su-chip, --su-accent, --su-err).
========================================================= */

export const WAITLIST_FORM_CSS = `
  .su-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  .su-lede { max-width: 680px; margin: 12px 0 0; font-size: 17px; line-height: 1.6; color: var(--su-mid); }
  .su-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 0 26px; border: 0; border-radius: 999px;
    background: linear-gradient(135deg, #7a3fd1 0%, #f5a623 100%); color: #fff; font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 800;
    letter-spacing: 1px; text-transform: uppercase; text-decoration: none; cursor: pointer; box-shadow: 0 6px 20px rgba(122,63,209,0.28); transition: transform .15s, box-shadow .15s, opacity .15s; white-space: nowrap; }
  .su-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(122,63,209,0.36); }
  .su-btn:disabled { opacity: 0.65; cursor: progress; }
  .su-btn:focus-visible, .su-input:focus-visible, .su-tick:focus-within, .su-ghost:focus-visible, .su-consent a:focus-visible {
    outline: 3px solid var(--su-accent); outline-offset: 2px; }
  .su-fs { border: 0; margin: 0; padding: 0; min-width: 0; }
  .su-form { margin-top: 22px; }
  .su-bar { display: grid; gap: 16px 14px; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: start;
    grid-template-areas: "email phone" "ticks ticks" "consent btn"; }
  .su-bar.has-err { grid-template-areas: "email phone" "ticks ticks" "err err" "consent btn"; }
  .su-bar > .su-field:nth-child(1) { grid-area: email; }
  .su-bar > .su-field:nth-child(2) { grid-area: phone; }
  .su-bar > .su-ticks { grid-area: ticks; }
  .su-bar > .su-form-err { grid-area: err; }
  .su-bar > .su-consent { grid-area: consent; align-self: center; }
  .su-bar > .su-btn { grid-area: btn; align-self: center; justify-self: end; min-width: 240px; }
  .su-field { display: grid; gap: 6px; min-width: 0; }
  .su-label { font-size: 14px; font-weight: 700; color: var(--su-text); padding: 0; }
  .su-input { width: 100%; box-sizing: border-box; min-height: 52px; padding: 0 16px; border-radius: 14px; border: 1.5px solid var(--su-line);
    background: var(--su-input); color: var(--su-text); font-size: 16px; font-family: inherit; }
  .su-input::placeholder { color: var(--su-dim); }
  .su-input[aria-invalid="true"] { border-color: var(--su-err); }
  .su-err { margin: 0; font-size: 14px; line-height: 1.4; color: var(--su-err); font-weight: 600; }
  .su-ticks { border: 0; margin: 4px 0 0; padding: 0; min-width: 0; }
  .su-tick-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
  .su-tick { position: relative; display: inline-flex; align-items: center; gap: 10px; min-height: 46px; padding: 0 16px 0 12px; border-radius: 999px;
    border: 1.5px solid var(--su-line); background: var(--su-input); cursor: pointer; font-size: 15px; font-weight: 600; user-select: none; }
  .su-tick.is-on { border-color: var(--su-accent); background: var(--su-chip); }
  .su-tick input { width: 20px; height: 20px; margin: 0; accent-color: #7a3fd1; cursor: pointer; }
  .su-consent { margin: 0; font-size: 14px; line-height: 1.5; color: var(--su-mid); }
  .su-consent a { color: var(--su-accent); font-weight: 700; }
  .su-hp { position: absolute; left: -10000px; top: auto; width: 1px; height: 1px; overflow: hidden; }
  .su-thanks { display: grid; justify-items: center; text-align: center; gap: 10px; padding: 12px 0 4px; }
  .su-thanks-ico { width: 52px; height: 52px; color: #2fa36b; }
  .su-thanks-title { margin: 4px 0 0; font-family: 'Orbitron', sans-serif; font-size: clamp(20px, 3vw, 26px); font-weight: 800; outline: none; }
  .su-thanks-text { margin: 0; max-width: 520px; font-size: 17px; line-height: 1.6; color: var(--su-mid); }
  .su-ghost { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-top: 6px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--su-line);
    color: var(--su-text); font-weight: 600; text-decoration: none; }
  @media (max-width: 760px) {
    .su-bar { grid-template-columns: 1fr; grid-template-areas: "email" "phone" "ticks" "consent" "btn"; }
    .su-bar.has-err { grid-template-areas: "email" "phone" "ticks" "err" "consent" "btn"; }
    .su-bar > .su-btn { width: 100%; min-width: 0; justify-self: stretch; margin-top: 4px; }
    .su-tick { flex: 1 1 100%; }
  }
  @media (prefers-reduced-motion: reduce) { .su-btn { transition: none; } }
`;

/** The waitlist form. `copy`: stayFrom(settings); `source`: "website" | "webapp" | "ios" | "android" | "programme". */
export default function WaitlistForm({ copy, source }) {
  const uid = useId();
  const id = (k) => `${uid}-${k}`;
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
      const r = await joinWaitlist(PUBLIC_API, { email, phone, interests: ticks, source, hp });
      setDone(r.message || copy["stay.thanks"]);
    } catch (err) {
      if (err.field === "email" || err.field === "phone") {
        setErrors({ [err.field]: err.message });
        (err.field === "email" ? emailRef : phoneRef).current?.focus();
      } else {
        setFormError(err.message);
      }
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <>
        <style>{WAITLIST_FORM_CSS}</style>
        <div className="su-thanks" role="status" aria-live="polite">
          <CheckCircle2 className="su-thanks-ico" aria-hidden="true" />
          <h3 ref={thanksRef} tabIndex={-1} className="su-thanks-title">{copy["stay.thanks_title"]}</h3>
          <p className="su-thanks-text">{done}</p>
          <Link to="/" className="su-ghost">Back to the homepage <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </>
    );
  }

  const field = (k, label, input) => (
    <div className="su-field">
      <label htmlFor={id(k)} className="su-label">{label}</label>
      {input}
      {errors[k] && <p id={id(`${k}-err`)} className="su-err">{errors[k]}</p>}
    </div>
  );

  return (
    <>
    <style>{WAITLIST_FORM_CSS}</style>
    <p className="su-lede" style={{ marginTop: 10 }}>{copy["stay.form_intro"]}</p>
    <form className="su-form" onSubmit={submit} noValidate aria-busy={sending || undefined}>
      <fieldset className="su-fs" disabled={sending}>
        <legend className="su-sr">{copy["stay.form_title"]}</legend>
        <div className={"su-bar" + (formError ? " has-err" : "")}>
          {field("email", copy["stay.field_email"], (
            <input id={id("email")} ref={emailRef} className="su-input" type="email" name="email" inputMode="email" autoComplete="email"
              autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} placeholder="you@company.com"
              aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? id("email-err") : undefined}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: "" })); }} />
          ))}
          {field("phone", copy["stay.field_phone"], (
            <input id={id("phone")} ref={phoneRef} className="su-input" type="tel" name="phone" inputMode="tel" autoComplete="tel"
              required maxLength={40} value={phone} placeholder="+1 416 555 0100"
              aria-invalid={errors.phone ? true : undefined} aria-describedby={errors.phone ? id("phone-err") : undefined}
              onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors((x) => ({ ...x, phone: "" })); }} />
          ))}
          <fieldset className="su-ticks">
            <legend className="su-label">{copy["stay.interests_label"]}</legend>
            <div className="su-tick-row">
              {INTERESTS.map((k) => (
                <label key={k} className={"su-tick" + (ticks.includes(k) ? " is-on" : "")}>
                  <input type="checkbox" name="interests" value={k} checked={ticks.includes(k)} onChange={() => toggle(k)} />
                  <span>{copy[`stay.interest_${k}`]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {formError && <p className="su-err su-form-err" role="alert">{formError}</p>}
          <p className="su-consent">{copy["stay.consent"]} <Link to="/privacy">Privacy Policy</Link></p>
          <button type="submit" className="su-btn" disabled={sending}>
            {sending ? "Joining…" : copy["stay.button"]}
          </button>
        </div>

        {/* Only bots fill this in. */}
        <div className="su-hp" aria-hidden="true">
          <label htmlFor={id("hp")}>Leave this empty</label>
          <input id={id("hp")} type="text" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </div>

      </fieldset>
    </form>
    </>
  );
}

