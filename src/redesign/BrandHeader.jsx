import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./brand.css";
import { compareEvents, eventPath, eventTicketsPath, featuredEvent, useEvents } from "../lib/events";

/* The one solid navy header of the approved design (redesign steps 1–2).
   Events (dropdown of the 2027 events), Speakers, Partners, Awards, More (About, Exhibit,
   Partner with us, Media, Volunteer, Highlights, Contact), Log in, gold Tickets.
   `fixed` keeps it pinned over older pages that leave room for a fixed header. */

const MORE = [
  ["About TTFC", "/about"], ["Exhibit", "/exhibit"], ["Partner with us", "/sponsor"], ["Media", "/media"],
  ["Volunteer", "/volunteer"], ["Toronto 2026 highlights", "/highlights/2026"], ["Contact", "/contact"],
];

function Menu({ label, items, id }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="tb-menu" ref={ref}>
      <button type="button" className="tb-menu-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {label} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="tb-menu-list" id={id} role="menu">
          {items.map(([l, to, sub]) => (
            <Link key={to} to={to} role="menuitem">{l}{sub && <small>{sub}</small>}</Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BrandHeader({ ev, fixed = false }) {
  const { events } = useEvents();
  const target = ev || featuredEvent(events);
  const { pathname } = useLocation();
  // The phone menu is open for the page it was opened on, so it closes on navigation.
  const [phoneFor, setPhoneFor] = useState(null);
  const phoneOpen = phoneFor === pathname;
  const eventItems = (events || []).filter((e) => Number(e.year) >= 2027).sort(compareEvents)
    .map((e) => [e.name, eventPath(e), e.statusNote || ""]);
  eventItems.push(["Toronto 2026 (past)", "/toronto/2026/main-event", "Oct 26–27, 2026"]);
  return (
    <header className={`tb-header${fixed ? " tb-header-fixed" : ""}`}>
      <div className="tb-wrap">
        <Link to="/" aria-label="The Tech Festival Canada, home">
          <img className="tb-logo" src="/Tech_Festival_Canada_Logo_Dark_Transparent.webp" alt="The Tech Festival Canada" />
        </Link>
        <nav className="tb-nav" aria-label="Main">
          <Menu key={`e${pathname}`} label="Events" items={eventItems} id="tb-events-menu" />
          <Link to="/speakers">Speakers</Link>
          <Link to="/partners">Partners</Link>
          <Link to="/awards">Awards</Link>
          <Menu key={`m${pathname}`} label="More" items={MORE} id="tb-more-menu" />
        </nav>
        <div className="tb-header-cta">
          <Link className="tb-btn tb-btn-ghost tb-btn-sm tb-hide-sm" to="/app-login">Log in</Link>
          {target && <Link className="tb-btn tb-btn-gold tb-btn-sm" to={eventTicketsPath(target)}>Tickets</Link>}
          <button type="button" className="tb-burger" aria-label="Menu" aria-expanded={phoneOpen} onClick={() => setPhoneFor(phoneOpen ? null : pathname)}>
            <span aria-hidden="true">{phoneOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {/* A div, not <nav>: the old global stylesheet turns a bare <nav> into an 80px sticky bar. */}
      {phoneOpen && (
        <div role="navigation" className="tb-phone-nav" aria-label="Main">
          <b>Events</b>
          {eventItems.map(([l, to]) => <Link key={to} to={to}>{l}</Link>)}
          <b>Explore</b>
          <Link to="/speakers">Speakers</Link>
          <Link to="/partners">Partners</Link>
          <Link to="/awards">Awards</Link>
          {MORE.map(([l, to]) => <Link key={to} to={to}>{l}</Link>)}
          <Link to="/app-login">Log in</Link>
        </div>
      )}
    </header>
  );
}
