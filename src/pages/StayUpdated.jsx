import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowDown, ArrowRight, CheckCircle2 } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JourneyView from "../components/StayJourney";
import useSiteSettings, { PUBLIC_API } from "../hooks/useSiteSettings";
import { INTERESTS, checkForm, goToWaitlistForm, heroParts, joinWaitlist, sourceFrom, stayFrom } from "../lib/stayUpdated";
import { journeyFrom } from "../lib/stayJourney";

/* =========================================================
   /stay-updated: the TTFC 2027 waitlist (Oct 23 2026).
   The organiser: "Stay-updated to have preview of 2027 events and
   an bar to add the email and join the waitlist to attend. Also
   tickmark on sponsorship, exhibitor or delegation interest."
   No invented facts: the hero ("TTFC 2027 · Toronto · November
   2027"), the waitlist bar right under it (email + phone, both
   required, three ticks, the consent line, an in-place thank-you
   with the server's message), then the 2027 journey (the
   organiser, Oct 23 2026: "Put canada's map and show cities to
   show the journey"): a map of Canada with the stops in order and
   the list of stops (components/StayJourney.jsx; the stops are the
   stay.journey key, edited in Admin › Sales & emails › 2027
   waitlist › 2027 journey). The 5 × 5 programme and "What to
   expect" were removed the same day; no attendee count on 2027
   material. Every word is a stay.* app content key (… › Wording),
   with the defaults in src/lib/stayUpdated.js. ?source=ios|android|
   webapp (links from the apps) is sent with the form. No store
   badges on this page. Light and dark like the rest of the site.
   The web app has the same page at /app/stay-updated.
========================================================= */

function useDarkMode() {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.body.classList.contains("dark-mode"));
  useEffect(() => {
    const read = () => setDark(document.body.classList.contains("dark-mode"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** The page's title and description for search engines and link previews, put back when leaving. */
function useSeo(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    const set = (sel, attr, value) => {
      let el = document.head.querySelector(sel);
      let created = false;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr.name, attr.value);
        document.head.appendChild(el);
        created = true;
      }
      const before = el.getAttribute("content");
      el.setAttribute("content", value);
      return () => { if (created) el.remove(); else el.setAttribute("content", before ?? ""); };
    };
    const undo = [
      set('meta[name="description"]', { name: "name", value: "description" }, description),
      set('meta[property="og:title"]', { name: "property", value: "og:title" }, title),
      set('meta[property="og:description"]', { name: "property", value: "og:description" }, description),
      set('meta[name="twitter:title"]', { name: "name", value: "twitter:title" }, title),
      set('meta[name="twitter:description"]', { name: "name", value: "twitter:description" }, description),
    ];
    return () => { document.title = prevTitle; undo.forEach((fn) => fn()); };
  }, [title, description]);
}

function WaitlistForm({ copy, source }) {
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
      <div className="su-thanks" role="status" aria-live="polite">
        <CheckCircle2 className="su-thanks-ico" aria-hidden="true" />
        <h3 ref={thanksRef} tabIndex={-1} className="su-thanks-title">{copy["stay.thanks_title"]}</h3>
        <p className="su-thanks-text">{done}</p>
        <Link to="/" className="su-ghost">Back to the homepage <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
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

export default function StayUpdated() {
  const settings = useSiteSettings();
  const copy = stayFrom(settings);
  const dark = useDarkMode();
  const { search, hash } = useLocation();
  // Arriving from the footer button (/stay-updated#join): straight to the form, after the page has rendered.
  useEffect(() => {
    if (hash !== "#join") return undefined;
    const id = setTimeout(goToWaitlistForm, 60);
    return () => clearTimeout(id);
  }, [hash]);
  const source = sourceFrom(search);
  useSeo(copy["stay.seo_title"], copy["stay.seo_description"]);

  const hero = heroParts(copy["stay.hero_title"]);
  const stops = journeyFrom(copy["stay.journey"]);

  const t = dark
    ? { bg: "#06020f", bg2: "#0b0518", text: "#ffffff", mid: "rgba(225,215,255,0.8)", dim: "rgba(200,185,255,0.6)", card: "rgba(255,255,255,0.045)", line: "rgba(155,135,245,0.2)", accent: "#c4adff", chip: "rgba(155,135,245,0.16)", input: "rgba(255,255,255,0.06)", err: "#ff9b9b", skyline: 0.16 }
    : { bg: "#faf9ff", bg2: "#f2eefc", text: "#0d0520", mid: "rgba(13,5,32,0.72)", dim: "rgba(13,5,32,0.55)", card: "#ffffff", line: "rgba(122,63,209,0.16)", accent: "#6a2fc4", chip: "rgba(122,63,209,0.09)", input: "#ffffff", err: "#b42318", skyline: 0.22 };
  // The journey's map and list (components/StayJourney.jsx): the land in a soft brand tint, opaque labels.
  const journeyVars = {
    "--jv-text": t.text, "--jv-mid": t.mid, "--jv-card": dark ? "#0f0820" : "#ffffff", "--jv-line": t.line, "--jv-accent": t.accent, "--jv-chip": t.chip,
    "--jv-land": dark ? "rgba(155,135,245,0.2)" : "rgba(122,63,209,0.09)", "--jv-land-edge": dark ? "rgba(196,173,255,0.45)" : "rgba(122,63,209,0.3)",
    "--jv-route": dark ? "#c4adff" : "#6a2fc4", "--jv-label-bg": dark ? "#150b2c" : "#ffffff",
  };

  return (
    <>
      <Navbar />
      <main className="su" style={{
        "--su-bg": t.bg, "--su-bg2": t.bg2, "--su-text": t.text, "--su-mid": t.mid, "--su-dim": t.dim, "--su-card": t.card, "--su-line": t.line,
        "--su-accent": t.accent, "--su-chip": t.chip, "--su-input": t.input, "--su-err": t.err,
      }}>
        <style>{`
          .su { background: var(--su-bg); color: var(--su-text); min-height: 100vh; overflow-x: hidden; overflow-x: clip; }
          .su-wrap { max-width: 1080px; margin: 0 auto; padding: 0 16px; }
          .su-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
          .su-hero { position: relative; padding: clamp(100px, 12vw, 132px) 0 clamp(56px, 7vw, 88px); text-align: center; isolation: isolate; }
          .su-hero::before { content: ""; position: absolute; inset: 0; z-index: -2;
            background: radial-gradient(ellipse 70% 55% at 50% 0%, rgba(122,63,209,${dark ? 0.35 : 0.16}) 0%, transparent 70%),
                        radial-gradient(ellipse 45% 35% at 85% 30%, rgba(245,166,35,${dark ? 0.16 : 0.12}) 0%, transparent 70%); }
          .su-skyline { position: absolute; left: 0; right: 0; bottom: 0; height: min(22vw, 190px); z-index: -1; pointer-events: none;
            background: url(/toronto-skyline.png) center bottom / cover no-repeat; opacity: ${t.skyline};
            ${dark ? "filter: invert(1) brightness(0.9);" : "mix-blend-mode: multiply;"}
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 55%, #000 75%, transparent 100%);
                    mask-image: linear-gradient(to bottom, transparent 0%, #000 55%, #000 75%, transparent 100%); }
          .su-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; background: var(--su-chip); color: var(--su-accent);
            font-size: 13px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; }
          .su-h1 { margin: 18px 0 0; font-family: 'Orbitron', sans-serif; font-weight: 900; line-height: 1.05; letter-spacing: -0.5px; }
          .su-h1-lead { display: block; font-size: clamp(44px, 9vw, 92px);
            background: linear-gradient(135deg, #7a3fd1 10%, #d9468f 55%, #f5a623 95%); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .su-h1-rest { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 20px; font-family: inherit; }
          .su-h1-rest > span { display: inline-flex; align-items: center; min-height: 40px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--su-line);
            background: var(--su-card); font-size: clamp(13px, 2vw, 17px); font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: var(--su-text); }
          .su-intro { max-width: 640px; margin: 22px auto 0; font-size: clamp(16px, 2.1vw, 19px); line-height: 1.6; color: var(--su-mid); }
          .su-hero-cta { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px 18px; margin-top: 30px; }
          .su-btn, .su-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 0 26px; border: 0; border-radius: 999px;
            background: linear-gradient(135deg, #7a3fd1 0%, #f5a623 100%); color: #fff; font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 800;
            letter-spacing: 1px; text-transform: uppercase; text-decoration: none; cursor: pointer; box-shadow: 0 6px 20px rgba(122,63,209,0.28); transition: transform .15s, box-shadow .15s, opacity .15s; white-space: nowrap; }
          .su-btn:hover:not(:disabled), .su-cta:hover { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(122,63,209,0.36); }
          .su-btn:disabled { opacity: 0.65; cursor: progress; }
          .su-btn:focus-visible, .su-cta:focus-visible, .su-input:focus-visible, .su-tick:focus-within, .su-ghost:focus-visible, .su-consent a:focus-visible {
            outline: 3px solid var(--su-accent); outline-offset: 2px; }
          .su-sec { padding: clamp(48px, 7vw, 80px) 0; }
          .su-sec--alt { background: var(--su-bg2); }
          .su-h2 { margin: 0; font-family: 'Orbitron', sans-serif; font-size: clamp(24px, 3.6vw, 34px); font-weight: 800; line-height: 1.15; }
          .su-lede { max-width: 680px; margin: 12px 0 0; font-size: 17px; line-height: 1.6; color: var(--su-mid); }
          .su-journey { margin-top: 28px; }
          .su-join { position: relative; border-radius: 26px; padding: clamp(24px, 4vw, 40px); background: var(--su-card); border: 1px solid var(--su-line);
            box-shadow: 0 24px 60px rgba(122,63,209,${dark ? 0.22 : 0.12}); overflow: hidden; }
          .su-join::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 4px; background: linear-gradient(90deg, #7a3fd1 0 40%, #d9468f 40% 75%, #f5a623 75% 100%); }
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
          @media (prefers-reduced-motion: reduce) { .su-btn, .su-cta { transition: none; } }
        `}</style>

        <section className="su-hero" aria-labelledby="su-h1">
          <div className="su-skyline" aria-hidden="true" />
          <div className="su-wrap">
            <p className="su-chip" style={{ margin: 0 }}>{copy["stay.eyebrow"]}</p>
            <h1 id="su-h1" className="su-h1">
              <span className="su-h1-lead">{hero.lead}</span>
              {hero.rest.length > 0 && (
                <span className="su-h1-rest">
                  {hero.rest.map((p, i) => <span key={i}><span className="su-sr"> · </span>{p}</span>)}
                </span>
              )}
            </h1>
            <p className="su-intro">{copy["stay.hero_intro"]}</p>
            <div className="su-hero-cta">
              <a href="#join" className="su-cta">{copy["stay.button"]} <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        {/* The form straight after the hero (the organiser, Oct 23 2026: "Bring the contact form up"). */}
        <section id="join" className="su-sec su-sec--alt" aria-labelledby="su-join" style={{ scrollMarginTop: 80, paddingTop: "clamp(24px, 4vw, 40px)" }}>
          <div className="su-wrap">
            <div className="su-join">
              <h2 id="su-join" className="su-h2">{copy["stay.form_title"]}</h2>
              <WaitlistForm copy={copy} source={source} />
            </div>
          </div>
        </section>

        {/* The 2027 journey (the organiser, Oct 23 2026): the map of Canada and the stops, in order. */}
        <section className="su-sec" aria-labelledby="su-journey">
          <div className="su-wrap">
            <h2 id="su-journey" className="su-h2">{copy["stay.journey_title"]}</h2>
            {copy["stay.journey_intro"] && <p className="su-lede">{copy["stay.journey_intro"]}</p>}
            <div className="su-journey" style={journeyVars}>
              <JourneyView stops={stops} mapTitle={`Map of Canada: ${copy["stay.journey_title"]}`} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
