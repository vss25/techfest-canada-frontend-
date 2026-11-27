import React, { useEffect, useRef, useState } from "react";

/* The two headers (Nov 27 2026, the owner: "Two headers. Header 1 - City Briefings (along with Cities) and
   Flagship Event. Header 2 - Agenda, Speakers, Partners, More for each city... awards for flagship. Home Page
   should only have header 1").

   TopBar is header 1, on every page: the logo (Home), the five City Briefings by name, and the Flagship Event. EventBar is header 2 on a phone (on a computer the board's own header row is header 2, see
   .nl-head2 in newLook.css). Styles: newLook.css (.nl-top*, .nl-sub*). */

const act = (fn) => (e) => { if (e && e.preventDefault) e.preventDefault(); if (fn) fn(e); };

export function TopBar({ phone, cities = [], flagship, goHome, isHome, here, login, account, onTickets, ttfc = [] }) {
  // The owner, later the same day: "name all the cities on the header both mobile and desktop instead of a drop
  // down". On a phone the row of names scrolls sideways beside the logo, and the current event is scrolled into view.
  const row = useRef(null);
  // The TTFC menu (About us, Newsroom, Contact, Get the app): the site's own links, so they live in header 1.
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const menu = ttfc.length ? (
    <div className="nl-top-drop" ref={box}>
      <button type="button" className="nl-top-item nl-top-ttfc" aria-expanded={open} aria-label="TTFC: about, news, contact, app" onClick={() => setOpen(!open)}>
        TTFC
        <svg className={open ? "up" : ""} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open ? (
        <div className="nl-top-menu nl-top-menu-r" role="menu" aria-label="TTFC">
          {ttfc.map((l) => <a key={l.label} href="#" role="menuitem" onClick={act((e) => { setOpen(false); l.go(e); })}>{l.label}</a>)}
        </div>
      ) : null}
    </div>
  ) : null;
  useEffect(() => {
    const el = row.current;
    const on = el && el.querySelector(".on");
    if (on && el.scrollWidth > el.clientWidth) el.scrollLeft = Math.max(0, on.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft - 28);
  }, [here]);
  return (
    <div className={`nl-top${phone ? " nl-top-phone" : ""}${isHome ? " is-home" : ""}`} data-dark="1">
      <div className="nl-top-in">
        <a href="#" className="nl-top-logo" onClick={act(goHome)} aria-label="TTFC home"><img src="/ttfc-logo-header.png" alt="The Tech Festival Canada" /></a>
        <nav className="nl-top-nav" aria-label="Events" ref={row}>
          <span className="nl-top-group">City Briefings</span>
          {cities.map((c) => (
            <a key={c.id} href="#" className={`nl-top-item${c.id === here ? " on" : ""}`} aria-current={c.id === here ? "page" : undefined} onClick={act(c.go)} title={`${c.name} City Briefing · ${c.when}`}>{c.short || c.name}</a>
          ))}
          <i className="nl-top-sep" aria-hidden="true" />
          {flagship ? (
            <a href="#" className={`nl-top-item nl-top-flag${here === flagship.id ? " on" : ""}`} aria-current={here === flagship.id ? "page" : undefined} onClick={act(flagship.go)}>Flagship Event - Toronto</a>
          ) : null}
        </nav>
        {phone ? menu : (
          <div className="nl-top-side">
            {menu}
            {account || (login ? <a href="#" className="nl-top-login" onClick={act(login)}>Log in</a> : null)}
            {onTickets ? <button type="button" className="nx-btn nx-buy nl-top-buy" onClick={onTickets}>Tickets</button> : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** Header 2 on a phone: the event's own links in one row that scrolls sideways. links = [{ label, go, on }]. */
export function EventBar({ label, links = [], onMore }) {
  return (
    <nav className="nl-sub" aria-label={label ? `${label}: sections` : "Event sections"} data-dark="1">
      {label ? <span className="nl-sub-name">{label}</span> : null}
      {links.map((l) => <a key={l.label} href="#" className={l.on ? "on" : ""} onClick={act(l.go)}>{l.label}</a>)}
      {onMore ? <a href="#" onClick={act(onMore)}>More</a> : null}
    </nav>
  );
}

const INTERESTS = ["Sponsor", "Exhibit", "Speak"];

/** The partnership form (Home and the Sponsor page): it captures the lead, and sales sends the packages after.
    onSend(fields, interests) sends it (the same route as an event page's enquiry). */
export function PartnerForm({ onSend }) {
  const [f, setF] = useState({ name: "", email: "", company: "", message: "" });
  const [picked, setPicked] = useState(["Sponsor"]);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k) => setPicked(picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k]);
  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setErr("Add your name and a work email so we can reply."); return; }
    setErr("");
    onSend({ ...f, name: f.name.trim(), email: f.email.trim() }, picked.length ? picked : ["Sponsor"]);
  };
  return (
    <section className="nx-s nx-pform" id="partner-form" aria-label="Partner with TTFC"><div className="nx-wrap">
      <div className="nx-head">
        <span className="nx-ghost-word" aria-hidden="true">TTFC</span>
        <div>
          <h2 className="nx-h2">Partner with <em>TTFC</em></h2>
          <p className="nx-lead">Sponsor, exhibit or speak across the 2027 season. Leave your details and we'll send you the partnership packages.</p>
        </div>
      </div>
      <form className="nx-pform-box" onSubmit={submit} noValidate>
        <div className="nx-pform-pick" role="group" aria-label="I want to">
          {INTERESTS.map((k) => <button key={k} type="button" className={picked.includes(k) ? "on" : ""} aria-pressed={picked.includes(k)} onClick={() => toggle(k)}>{k}</button>)}
        </div>
        <div className="nx-pform-grid">
          <label>Full name<input type="text" name="name" autoComplete="name" value={f.name} onChange={set("name")} required /></label>
          <label>Work email<input type="email" name="email" autoComplete="email" value={f.email} onChange={set("email")} required /></label>
          <label>Company<input type="text" name="company" autoComplete="organization" value={f.company} onChange={set("company")} /></label>
          <label className="wide">What are you looking for? (optional)<textarea name="message" rows={3} value={f.message} onChange={set("message")} /></label>
        </div>
        {err ? <p className="nx-pform-err" role="alert">{err}</p> : null}
        <div className="nx-pform-foot">
          <button type="submit" className="nx-btn nx-buy">Send me the packages</button>
          <span>Goes to sales@thetechfestival.com. We reply within two working days.</span>
        </div>
      </form>
    </div></section>
  );
}
