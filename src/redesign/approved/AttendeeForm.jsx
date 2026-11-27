import React, { useEffect, useRef, useState } from "react";
import { EMAIL_RE } from "./liveShared";

/* The ticket panel's "Who's coming?" step (Nov 27 2026, the owner: "filling details for other doesn't work well").

   The boards' version kept only the open ticket's fields on the page and read them back from the page when the
   visitor moved between tickets; "This ticket is for me" did nothing, so buying only for colleagues was not
   possible; company and job title were dropped; and "Let attendees fill in their own details" only showed a toast
   (the checkout needs every attendee's name and email, so that option is gone until the backend supports it).

   This one holds every answer itself: every ticket's card is open with its own fields, the buyer can untick "This
   ticket is for me" and give their own details for the receipt, and a missing field is marked where it is.
   draft = { forMe, buyer: { first, last, email }, people: [{ first, last, email, company, title }] }; the
   wrapper (LiveSite.jsx / LivePhone.jsx) keeps it on the instance and checks out with orderFrom(). Styles:
   newLook.css (.nx-att*). Both layouts. */

import { padded, personMissing } from "./attendeeOrder";

function Field({ label, value, onChange, type = "text", auto, err, optional, wide }) {
  return (
    <label className={`nx-att-f${wide ? " wide" : ""}${err ? " is-err" : ""}`}>
      <span>{label}{optional ? <small> (optional)</small> : null}</span>
      <input type={type} value={value} autoComplete={auto} onChange={(e) => onChange(e.target.value)} aria-invalid={err ? true : undefined} />
      {err ? <em>{err}</em> : null}
    </label>
  );
}

export default function AttendeeForm({ names, draft, onChange, attempt = 0 }) {
  const [d, setD] = useState(() => padded(draft, names.length));
  const [closed, setClosed] = useState({});
  const box = useRef(null);
  const view = padded(d, names.length);
  const show = attempt > 0;
  const put = (next) => { setD(next); onChange(next); };
  const setPerson = (i, k, v) => put({ ...view, people: view.people.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  const setBuyer = (k, v) => put({ ...view, buyer: { ...view.buyer, [k]: v } });

  // After a Continue with something missing: every card that needs details opens, and the first one comes into view.
  useEffect(() => {
    if (!attempt) return undefined;
    const t = setTimeout(() => { const el = box.current && box.current.querySelector(".is-err"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60);
    return () => clearTimeout(t);
  }, [attempt]);

  const errs = (p) => (show ? {
    first: !String(p.first).trim() ? "Add a first name" : "",
    last: !String(p.last).trim() ? "Add a last name" : "",
    email: !EMAIL_RE.test(String(p.email).trim()) ? (String(p.email).trim() ? "Check the email" : "Add an email") : "",
  } : {});

  return (
    <div className="nx-att" ref={box}>
      {view.people.map((p, i) => {
        const e = errs(p);
        const done = !personMissing(p);
        const open = !closed[i] || (show && !done);
        const sub = i === 0 ? (view.forMe ? "You, the buyer" : "Someone else") : "A colleague or guest";
        return (
          <div key={i} className={`nx-att-card${open ? " open" : ""}`}>
            <button type="button" className="nx-att-head" aria-expanded={open} onClick={() => setClosed({ ...closed, [i]: open })}>
              <span className="nx-att-n">{i + 1}</span>
              <span className="nx-att-t"><b>Ticket {i + 1} · {names[i]}</b><small>{done ? [p.first, p.last].join(" ").trim() || sub : sub}</small></span>
              <span className={`nx-att-state${done ? " ok" : ""}`}>{done ? "Done" : "Details needed"}</span>
            </button>
            {open ? (
              <div className="nx-att-body">
                {i === 0 ? (
                  <label className="nx-att-me">
                    <input type="checkbox" checked={view.forMe} onChange={(ev) => put({ ...view, forMe: ev.target.checked })} />
                    This ticket is for me
                  </label>
                ) : null}
                <div className="nx-att-grid">
                  <Field label="First name" value={p.first} onChange={(v) => setPerson(i, "first", v)} auto={i === 0 && view.forMe ? "given-name" : "off"} err={e.first} />
                  <Field label="Last name" value={p.last} onChange={(v) => setPerson(i, "last", v)} auto={i === 0 && view.forMe ? "family-name" : "off"} err={e.last} />
                  <Field label="Email" type="email" value={p.email} onChange={(v) => setPerson(i, "email", v)} auto={i === 0 && view.forMe ? "email" : "off"} err={e.email} wide />
                  <Field label="Company" value={p.company} onChange={(v) => setPerson(i, "company", v)} auto={i === 0 && view.forMe ? "organization" : "off"} optional />
                  <Field label="Job title" value={p.title} onChange={(v) => setPerson(i, "title", v)} auto={i === 0 && view.forMe ? "organization-title" : "off"} optional />
                </div>
                {i === 0 && !view.forMe ? <p className="nx-att-note">The ticket is emailed to this person. Your own details for the receipt are below.</p> : null}
              </div>
            ) : null}
          </div>
        );
      })}
      {!view.forMe ? (() => {
        const e = errs(view.buyer);
        return (
          <div className="nx-att-card open nx-att-buyer">
            <div className="nx-att-head" role="presentation">
              <span className="nx-att-n nx-att-you">You</span>
              <span className="nx-att-t"><b>Your details</b><small>For the receipt and a copy of every ticket</small></span>
            </div>
            <div className="nx-att-body">
              <div className="nx-att-grid">
                <Field label="First name" value={view.buyer.first} onChange={(v) => setBuyer("first", v)} auto="given-name" err={e.first} />
                <Field label="Last name" value={view.buyer.last} onChange={(v) => setBuyer("last", v)} auto="family-name" err={e.last} />
                <Field label="Email" type="email" value={view.buyer.email} onChange={(v) => setBuyer("email", v)} auto="email" err={e.email} wide />
              </div>
            </div>
          </div>
        );
      })() : null}
    </div>
  );
}
