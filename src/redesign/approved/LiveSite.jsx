import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ApprovedSite from "./ApprovedSite";
import LivePhone from "./LivePhone";
import useSeo from "../../hooks/useSeo";
import { urlFor } from "../../utils/sanity";
import { findEvent, useEventContent, useEvents } from "../../lib/events";
import { AGENDA_SOON, toDesignSessions } from "../../data/approvedAgendas";
import {
  CITY_EVENT, EMAIL_RE, PAGE_FORM, PAGE_PATH, SCREEN_PATH, cityPath, countdownTo, fieldsNear, fullDate, monthShort, pick, post, routeFor, sendForm, splitName,
} from "./liveShared";
import { fetchTicketTypes, multiCheckout } from "../../lib/ticketsApi";

/* The approved website design (board 12), live (redesign step 2, Nov 2026).
   ApprovedSite is generated 1:1 from the approved board and must not be edited by hand.
   This file is the only place it meets the real site:
   - each screen of the design has its own address (/, the six 2027 event pages,
     /speakers, /partners, /awards, /highlights/2026, /exhibit, /sponsor, /contact, …);
   - the six events' dates, themes and photos come from the event records in the admin panel;
   - each event's agenda comes from Admin › Agenda ("announced soon" until it has sessions);
   - ticket types and prices come from the backend, and "Pay" places a real order (Stripe);
   - every form posts to the backend (forms inbox, brochure, waitlist), sign-in uses the
     real account API. Anything the board shows as sample content stays as approved. */

class LiveSite extends ApprovedSite {
  static getDerivedStateFromProps(props, state) {
    if (props.routeKey === state.routeKey) return null;
    const r = props.route || { screen: "home" };
    return {
      routeKey: props.routeKey, screen: r.screen, city: r.city, page: r.page, faq: r.faq ?? state.faq,
      sec: r.sec ?? "", drawer: !!r.drawer, menu: false, more: false, spk: null, auth: state.auth, dl: null,
    };
  }

  componentDidMount() {
    if (this.props.data?.types) this.setState({ q: this.props.data.types.map(() => 0) });
    this.afterRoute();
  }
  componentDidUpdate(prev) {
    if (prev.routeKey !== this.props.routeKey) this.afterRoute();
    if (prev.data?.types !== this.props.data?.types && this.props.data?.types) {
      this.setState({ q: this.props.data.types.map(() => 0), step: 1, done: false });
    }
  }
  afterRoute() {
    const sec = this.state.sec;
    if (sec) setTimeout(() => document.getElementById("ev-" + sec)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    else if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  // The board's simulated wait is not used on the live site: real requests show it instead.
  load(text, after) { after(); }
  busy(text) { this.setState({ loading: true, loadText: text, menu: false, more: false }); }
  idle() { this.setState({ loading: false }); }
  async run(text, job, okText) {
    this.busy(text);
    try { await job(); this.idle(); if (okText) this.toast(okText); return true; } catch (err) { this.idle(); this.toast(err.message); return false; }
  }

  go(screen, extra) {
    return (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const { page, ...rest } = extra || {};
      const path = screen === "page" ? PAGE_PATH[page] : SCREEN_PATH[screen];
      if (Object.keys(rest).length) this.setState(rest);
      if (path) this.props.navigate(path);
    };
  }
  goCityFn(id) {
    return (e) => { if (e && e.preventDefault) e.preventDefault(); this.props.navigate(cityPath(id)); };
  }
  goSec(id) {
    return (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (this.state.screen === "event") {
        this.setState({ sec: id, menu: false, more: false });
        setTimeout(() => document.getElementById("ev-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
        return;
      }
      this.props.navigate(cityPath("van") + (id === "agenda" ? "/agenda" : ""), { state: { sec: id } });
    };
  }

  form(name, f, extra) { return sendForm(name, f, extra); }

  checkout() {
    const types = this.props.data?.types;
    const evKey = this.props.eventKey;
    if (!types || !evKey) { this.toast("Tickets go on sale soon"); return; }
    if (this.state.later) { this.toast("For now, add each attendee's first name, last name and email"); return; }
    this.saveOpenAttendee();
    const att = this.att || {};
    const list = [];
    types.forEach((t, i) => { for (let k = 0; k < (this.state.q[i] || 0); k++) list.push(t); });
    const attendees = list.map((t, idx) => {
      const a = att[idx] || {};
      return { firstName: a.first || "", lastName: a.last || "", email: a.email || "", ticketTypeId: t.id };
    });
    const missing = attendees.findIndex((a) => !a.firstName || !a.lastName || !EMAIL_RE.test(a.email));
    if (missing >= 0) { this.setState({ openAtt: missing }); this.toast(`Ticket ${missing + 1}: add a first name, last name and email`); return; }
    const items = types.map((t, i) => ({ ticketTypeId: t.id, quantity: this.state.q[i] || 0 })).filter((x) => x.quantity > 0);
    const b = attendees[0];
    this.run("Securing your tickets", async () => {
      const res = await multiCheckout({ eventKey: evKey, booker: { name: `${b.firstName} ${b.lastName}`, email: b.email }, items, attendees });
      if (res && res.url) { window.location.assign(res.url); return; }
      this.setState({ done: true });
    });
  }

  // Only the open attendee's fields exist on the page; keep each one's answers as the visitor moves between them.
  attPanel() { return this.rootEl && this.rootEl.querySelector('[aria-expanded="true"].p-press + .p-in'); }
  saveOpenAttendee() {
    const panel = this.attPanel();
    if (!panel || this.state.step !== 2) return;
    const f = fieldsNear(panel.querySelector("input, textarea") || panel);
    this.att = this.att || {};
    this.att[this.state.openAtt] = { first: f["first name"] || "", last: f["last name"] || "", email: f.email || "" };
  }
  restoreOpenAttendee() {
    const panel = this.attPanel();
    const a = this.att && this.att[this.state.openAtt];
    if (!panel || !a) return;
    panel.querySelectorAll("label").forEach((l) => {
      const input = l.querySelector("input:not([type=checkbox])");
      if (!input) return;
      const t = l.textContent.trim().toLowerCase();
      if (t.startsWith("first name")) input.value = a.first;
      else if (t.startsWith("last name")) input.value = a.last;
      else if (t.startsWith("email")) input.value = a.email;
    });
  }

  renderVals() {
    const v = super.renderVals();
    const s = this.state;
    const at = (e) => (e && e.currentTarget) || null;
    const n = (v.sessions || []).length;
    const maxSlide = Math.max(0, n - 3);
    const slide = Math.min(s.slide || 0, maxSlide);
    v.trackX = -slide * 413;
    v.slideLabel = n ? `${slide + 1}–${Math.min(n, slide + 3)} of ${n}` : "";
    v.prevOpacity = slide === 0 ? 0.4 : 1;
    v.nextOpacity = slide >= maxSlide ? 0.4 : 1;
    v.prevSlide = () => this.setState({ slide: Math.max(0, slide - 1) });
    v.nextSlide = () => this.setState({ slide: Math.min(maxSlide, slide + 1) });
    v.fakeLoad = (e) => { if (e && e.preventDefault) e.preventDefault(); this.setState({ auth: "login", authStep2: false }); };
    v.moreToast = (e) => { if (e && e.preventDefault) e.preventDefault(); this.setState({ more: false }); this.props.navigate(PAGE_PATH.contact); };
    v.sendFiles = (e) => {
      const f = fieldsNear(at(e));
      const { firstName, lastName } = splitName(pick(f, "name"));
      this.run("Sending", () => post("/brochure/submit", { firstName, lastName: lastName || "-", email: f.email, page: window.location.pathname, _hp: "" }),
        "Sent. Check your inbox for both files");
    };
    v.submitDl = (e) => {
      const f = fieldsNear(at(e));
      const nm = splitName(pick(f, "name"));
      const firstName = pick(f, "first") || nm.firstName;
      const lastName = pick(f, "last") || nm.lastName || "-";
      this.run("Sending the report", async () => {
        await post("/brochure/submit", { firstName, lastName, email: f.email, company: pick(f, "company"), page: window.location.pathname, _hp: "" });
        this.setState({ dlSent: true });
      });
    };
    v.sendEnquiry = (e) => {
      const f = fieldsNear(at(e));
      this.run("Sending your enquiry", () => this.form("partnership", f, { interests: (s.interests || ["Sponsorship"]).join(", "), event: cityPath(s.city || "van") }),
        "Thanks. The partnerships team will reply soon");
    };
    v.submitForm = (e) => {
      const f = fieldsNear(at(e));
      this.run("Sending", () => this.form(PAGE_FORM[s.page] || "inquiry", f, { page: s.page }), "Thanks. We will be in touch soon");
    };
    v.notifySoon = (e) => {
      const f = fieldsNear(at(e));
      const name = pick(f, "name") || String(f.email || "").split("@")[0];
      this.run("Saving", () => post("/stay-updated", { name, email: f.email, interests: ["delegate"], source: "website", consent: true, _hp: "" }),
        "We'll email you when tickets open");
    };
    v.awNotify = (e) => {
      const f = fieldsNear(at(e));
      if (!f.email) { this.toast("Add your email first"); return; }
      this.run("Saving", () => this.form("inquiry", { ...f, name: f.email.split("@")[0] }, { topic: "Catalyst Awards 2027: notify when nominations open" }),
        "We'll email you when 2027 nominations open");
    };
    v.pkgReq = () => { const pkg = s.pkg; this.setState({ pkg: null, interests: [pkg && pkg[0] === "t" ? "Sponsorship" : "Exhibiting"] }); this.goSec("contact")(); };
    v.fpReq = () => { this.setState({ fp: false, interests: ["Exhibiting"] }); this.goSec("contact")(); this.toast("Tell us your details and we'll hold booth " + (s.fpSel || "B4")); };
    v.forgotPw = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const f = fieldsNear(at(e));
      if (!f.email) { this.toast("Enter your email first"); return; }
      this.run("Sending", () => post("/auth/forgot-password", { email: f.email }), "Reset link sent to your email");
    };
    v.authSocial = () => { this.setState({ auth: null }); this.props.navigate("/app-login"); };
    v.authEmail = (e) => {
      const f = fieldsNear(at(e));
      const password = pick(f, "password");
      if (s.auth === "signup") { this.signup = { email: f.email, password }; this.setState({ authStep2: true, prefilled: false }); return; }
      this.run("Signing you in", async () => {
        const data = await post("/auth/login", { email: f.email, password });
        this.finishAuth(data.token);
      });
    };
    v.finishSignup = (e) => {
      const f = fieldsNear(at(e));
      const name = [f["first name"], f["last name"]].filter(Boolean).join(" ");
      const su = this.signup || {};
      this.run("Creating your account", async () => {
        const data = await post("/auth/register", { name, email: su.email, password: su.password, company: f.company, jobTitle: f["job title"] });
        this.finishAuth(data.token, name);
      }, "Welcome to TTFC. Check your email to verify");
    };
    v.checkout = () => this.checkout();
    v.toggleLater = () => this.toast("For now, add each attendee's first name, last name and email");
    if (Array.isArray(v.attendees)) {
      v.attendees = v.attendees.map((a, idx) => ({
        ...a,
        toggle: () => { this.saveOpenAttendee(); this.setState({ openAtt: s.openAtt === idx ? -1 : idx }, () => this.restoreOpenAttendee()); },
      }));
    }
    const toAtt = v.toAttendees;
    v.toAttendees = () => { if (!this.props.data?.types) { this.toast("Tickets go on sale soon"); return; } this.att = {}; toAtt(); };
    return v;
  }

  finishAuth(token, name = "") {
    localStorage.setItem("token", token);
    window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { token, name } }));
    this.setState({ auth: null, authStep2: false, signedIn: true });
  }

  render() {
    return (
      <div style={{ display: "contents" }} ref={(el) => { this.rootEl = el; }}>
        {super.render()}
      </div>
    );
  }
}

/** One route element for every screen of the approved design. `fallback` renders for
    addresses that look like event pages but aren't one of the six 2027 events. */
const PHONE_QUERY = "(max-width: 820px)";
// The phone design has no partners or awards screen; those two stay on the desktop design.
const PHONE_SCREENS = ["home", "event", "page", "past", "speakers"];
function usePhone() {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}

export default function ApprovedRoute({ fallback = null }) {
  const location = useLocation();
  const phone = usePhone();
  const navigate = useNavigate();
  const base = routeFor(location.pathname);
  // goSec from another screen lands on the event page with the section to scroll to.
  const route = base && location.state && location.state.sec ? { ...base, sec: location.state.sec } : base;
  const { events } = useEvents();
  const [types, setTypes] = useState(null);
  // The countdown moves on every minute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  const byCity = useMemo(() => {
    const out = {};
    Object.entries(CITY_EVENT).forEach(([id, c]) => { out[id] = findEvent(events, c); });
    return out;
  }, [events]);
  const van = byCity.van;
  const evKey = van && van.eventKey;

  useEffect(() => {
    let live = true;
    if (evKey) fetchTicketTypes(evKey).then((list) => { if (live) setTypes(list && list.length ? list : null); });
    return () => { live = false; };
  }, [evKey]);

  // The agenda: the sessions of the event this page is about (Vancouver on the home page).
  const ev = route && route.city ? byCity[route.city] : null;
  const content = useEventContent(ev || van);
  const sessionsData = useMemo(() => {
    if (content.loading) return undefined;   // the design's own rows until the first answer (no flash of "soon")
    const rows = toDesignSessions(content.sessions);
    return rows.length ? rows : AGENDA_SOON;
  }, [content]);

  const data = useMemo(() => ({
    CITIES: (base) => {
      const out = { ...base };
      Object.keys(out).forEach((id) => {
        const ev = byCity[id];
        // Venue and audience: the event's own fields, else the approved design's wording (never "[Venue]").
        out[id] = { venue: "Venue announced with tickets", venueArea: `Downtown ${out[id].name}`, audience: "150 senior delegates", ...out[id] };
        if (!ev) return;
        const c = { ...out[id] };
        if (ev.venueName) c.venue = ev.venueName;
        if (ev.venueAddress) c.venueArea = ev.venueAddress;
        if (ev.audience) c.audience = ev.audience;
        // A fixed date shows in full, with a countdown to it; without one, the month (and no countdown).
        if (ev.startDate) { c.date = fullDate(ev.startDate); c.month = monthShort(ev.startDate); }
        Object.assign(c, countdownTo(ev.startDate, id, now));
        if (ev.theme) c.theme = ev.theme;
        if (ev.formatLine) c.format = ev.formatLine;
        if (ev.tagline) c.blurb = ev.tagline; // "One line under the name" (the older long descriptions belong to the previous design)
        // The city photo on the approved design: the event's "City skyline" photo when one is set
        // in the admin panel (the older hero photos belong to the previous design).
        if (ev.citySkyline && ev.citySkyline.asset) { c.img = urlFor(ev.citySkyline).width(2000).quality(78).auto("format").url(); c.credit = ev.photoCredit || ""; }
        out[id] = c;
      });
      return out;
    },
    types: types ? types.map((t) => ({ id: t.id, name: t.name, note: t.description, cents: t.priceCents })) : undefined,
    sessionsData,
  }), [byCity, types, now, sessionsData]);

  useSeo(
    route && route.screen === "event" && ev ? `${ev.name} · The Tech Festival Canada` : undefined,
    route && route.screen === "event" && ev ? ev.theme || undefined : undefined,
  );

  if (!route) return fallback;
  const View = phone && PHONE_SCREENS.includes(route.screen) ? LivePhone : LiveSite;
  return (
    <View
      route={route}
      routeKey={location.pathname + "|" + location.key}
      navigate={navigate}
      data={data}
      eventKey={evKey}
      loaderMs={0}
    />
  );
}
