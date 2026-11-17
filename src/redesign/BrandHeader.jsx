import React from "react";
import { Link } from "react-router-dom";
import { eventTicketsPath, featuredEvent, useEvents } from "../lib/events";

/* The one solid navy header of the approved design (redesign step 1). The gold Tickets
   button goes to this event's tickets, else the next event's. */
export default function BrandHeader({ ev }) {
  const { events } = useEvents();
  const target = ev || featuredEvent(events);
  return (
    <header className="tb-header">
      <div className="tb-wrap">
        <Link to="/" aria-label="The Tech Festival Canada, home">
          <img className="tb-logo" src="/Tech_Festival_Canada_Logo_Dark_Transparent.webp" alt="The Tech Festival Canada" />
        </Link>
        <nav className="tb-nav" aria-label="Main">
          <Link to="/">Events</Link>
          <Link to="/speakers">Speakers</Link>
          <Link to="/partners">Partners</Link>
          <Link to="/awards">Awards</Link>
          <Link to="/about">About</Link>
        </nav>
        <div className="tb-header-cta">
          <Link className="tb-btn tb-btn-ghost tb-btn-sm" to="/app-login">Log in</Link>
          {target && <Link className="tb-btn tb-btn-gold tb-btn-sm" to={eventTicketsPath(target)}>Tickets</Link>}
        </div>
      </div>
    </header>
  );
}
