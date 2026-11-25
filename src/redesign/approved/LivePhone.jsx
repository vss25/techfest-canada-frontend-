import React from "react";
import VideoFacade from "./VideoFacade";
import ApprovedPhone from "./ApprovedPhone";
import HeroBackgroundVideo from "../../components/HeroBackgroundVideo";
import { HOME_HEIGHTS } from "../../lib/heroFrame";
import { multiCheckout } from "../../lib/ticketsApi";
import { EMAIL_RE, PAGE_FORM, PAGE_PATH, SCREEN_PATH, cityPath, fieldsNear, pick, post, sendForm, splitName } from "./liveShared";

/* The approved phone design (board 13), live: the phone counterpart of LiveSite.jsx.
   ApprovedPhone is generated 1:1 from the board; here it gets real addresses, data,
   checkout, forms and sign-in. The board's 390 × 844 frame fills the phone's screen. */

const FILL = `.ap-phone > .ap-root > div:first-child { width: 100% !important; height: 100dvh !important; }
.ap-phone { position: fixed; inset: 0; z-index: 50; background: #FFFFFF; }
.ap-phone .ap-root span[style*="bottom: 8px"][style*="z-index: 2"][style*="0.55)"] { display: none; }`;
/* That last rule: the board's event hero has a second photo credit with Vancouver's photographer typed
   in, under the real one ("Photo: {credit}" at the top). Every city showed Vancouver's credit too. */

export default class LivePhone extends ApprovedPhone {
  static getDerivedStateFromProps(props, state) {
    if (props.routeKey === state.routeKey) return null;
    const r = props.route || { screen: "home" };
    return {
      routeKey: props.routeKey, screen: r.screen, city: r.city || state.city || "van", page: r.page, faq: r.faq ?? state.faq,
      sec: r.sec ?? "", sheet: r.drawer ? "tix" : null, menu: false, ov: null,
    };
  }

  componentDidMount() {
    if (this.props.data?.types) this.setState({ q: this.props.data.types.map(() => 0) });
    this.afterRoute();
  }
  componentDidUpdate(prev) {
    if (prev.routeKey !== this.props.routeKey) this.afterRoute();
    if (prev.data?.types !== this.props.data?.types && this.props.data?.types) this.setState({ q: this.props.data.types.map(() => 0), step: 1 });
  }
  afterRoute() {
    const sec = this.state.sec;
    if (sec) setTimeout(() => this.scrollEl?.querySelector("#m-" + sec)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    else if (this.scrollEl) this.scrollEl.scrollTop = 0;
  }

  load(text, after) { after(); }
  toast(t) { this.toastIt(t); }
  async run(text, job, okText) {
    this.setState({ loading: true, ldText: text, menu: false });
    try { await job(); this.setState({ loading: false }); if (okText) this.toastIt(okText); return true; } catch (err) { this.setState({ loading: false }); this.toastIt(err.message); return false; }
  }

  go(screen) { return (e) => { if (e && e.preventDefault) e.preventDefault(); if (SCREEN_PATH[screen]) this.props.navigate(SCREEN_PATH[screen]); }; }
  goPage(k) { return (e) => { if (e && e.preventDefault) e.preventDefault(); this.props.navigate(PAGE_PATH[k]); }; }
  goCityFn(id) { return (e) => { if (e && e.preventDefault) e.preventDefault(); this.props.navigate(cityPath(id)); }; }
  jump(id) {
    return (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (this.state.screen === "event") {
        this.setState({ sec: id, menu: false });
        setTimeout(() => this.scrollEl?.querySelector("#m-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        return;
      }
      this.props.navigate(cityPath("van"), { state: { sec: id } });
    };
  }

  // Only the open attendee's fields exist; keep each one's answers while moving between them.
  attPanel() { return this.rootEl && Array.from(this.rootEl.querySelectorAll("button.m-press + .m-in")).find((p) => p.querySelector('input[aria-label="Full name"]')); }
  saveOpenAttendee() {
    const panel = this.attPanel();
    if (!panel) return;
    const get = (l) => (panel.querySelector(`input[aria-label="${l}"]`)?.value || "").trim();
    this.att = this.att || {};
    this.att[this.state.openAtt] = { name: get("Full name"), email: get("Email"), extra: get("Company and job title") };
  }
  restoreOpenAttendee() {
    const panel = this.attPanel();
    const a = this.att && this.att[this.state.openAtt];
    if (!panel || !a) return;
    const set = (l, v) => { const i = panel.querySelector(`input[aria-label="${l}"]`); if (i) i.value = v || ""; };
    set("Full name", a.name); set("Email", a.email); set("Company and job title", a.extra);
  }

  checkout() {
    const types = this.props.data?.types;
    const evKey = this.props.eventKey;
    if (!types || !evKey) { this.toastIt("Tickets go on sale soon"); return; }
    this.saveOpenAttendee();
    const list = [];
    types.forEach((t, i) => { for (let k = 0; k < (this.state.q[i] || 0); k++) list.push(t); });
    const attendees = list.map((t, idx) => {
      const a = (this.att || {})[idx] || {};
      const { firstName, lastName } = splitName(a.name);
      return { firstName, lastName, email: a.email || "", ticketTypeId: t.id, ...(a.extra ? { company: a.extra } : {}) };
    });
    const missing = attendees.findIndex((a) => !a.firstName || !a.lastName || !EMAIL_RE.test(a.email));
    if (missing >= 0) {
      this.setState({ openAtt: missing }, () => this.restoreOpenAttendee());
      this.toastIt(`Ticket ${missing + 1}: add a full name (first and last) and email`);
      return;
    }
    const items = types.map((t, i) => ({ ticketTypeId: t.id, quantity: this.state.q[i] || 0 })).filter((x) => x.quantity > 0);
    const b = attendees[0];
    this.run("Securing your tickets", async () => {
      const res = await multiCheckout({ eventKey: evKey, booker: { name: `${b.firstName} ${b.lastName}`, email: b.email }, items, attendees });
      if (res && res.url) { window.location.assign(res.url); return; }
      this.setState({ step: 3 });
    });
  }

  finishAuth(token, name = "") {
    localStorage.setItem("token", token);
    window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { token, name } }));
    this.setState({ ov: null, authStep2: false, signedIn: true });
  }

  renderVals() {
    const v = super.renderVals();
    // The event's video on phones too, when staff chose "Video" (LiveSite sets c.video only then).
    if (v.c && v.c.heights) v.heroH = v.c.heights;
    v.homeH = HOME_HEIGHTS.phone;   // the home page's hero: full screen (Nov 25 2026)
    if (v.c && v.c.video) {
      const playing = v.c.video;
      v.heroVideo = <HeroBackgroundVideo key={v.c.video} src={v.c.video} position={v.c.pos} anyDevice onPlaying={() => { if (this.state.heroPlaying !== playing) this.setState({ heroPlaying: playing }); }} />;
      v.hideCredit = this.state.heroPlaying === v.c.video;
    }
    const s = this.state;
    // The agenda from Admin › Agenda (LiveSite's ApprovedRoute passes it for both designs).
    const rows = this.props.data && this.props.data.sessionsData;
    if (rows) v.sessions = rows;
    // Nov 18 2026: the event's own speakers and partners when there are any, else the board's
    // "announced soon" cards; no sample booths or counts (LiveSite.jsx passes the same props).
    // Nov 20 2026: no sample prices while this event has no tickets on sale; the real lowest price once it has.
    const tt = this.props.data && this.props.data.types;
    if (this.props.ticketsSoon) { v.tickets = []; v.hint = "Tickets for this event aren't on sale yet. Leave your email on this page and we'll tell you the moment they open."; v.fromPrice = "Tickets on sale soon"; }
    else if (tt && tt.length) v.fromPrice = "From $" + Math.round(Math.min(...tt.map((t) => Number(t.cents) || 0)) / 100);
    if (v.c && v.c.mapsUrl) { v.mapsUrl = v.c.mapsUrl; v.mapNote = v.c.venueLine + ". Open it in Maps for directions."; }
    const spk = this.props.evSpeakers;
    if (spk) {
      v.four = [...spk.slice(0, 4), ...Array.from({ length: Math.max(0, 4 - spk.length) }, () => ({}))];
      const f = s.spkF || "All";
      const shown = spk.filter((x) => f === "All" || x.kind === f);
      v.spkList = shown.map((x, i) => ({ ...x, n: i + 1, open: () => {} }));
      v.spkCount = `Showing ${shown.length} of ${spk.length}`;
      v.spkIntro = `${spk.length} ${spk.length === 1 ? "speaker" : "speakers"} confirmed so far. More are announced as the programme fills.`;
    } else {
      // One "to be announced" note, with Toronto 2026's speakers meanwhile (LiveSite.jsx has the same rule).
      const si = this.props.standIns || {};
      const was = si.speakers || [];
      const tag = (r) => (r ? r + " · " + si.spkLabel : si.spkLabel);
      v.spkSoon = si.spk ? { title: si.spk.heading, text: was.length ? si.spk.text : si.spk.none } : { title: "Speakers to be announced", text: "" };
      v.four = was.slice(0, 4).map((x) => ({ ...x, role: tag(x.role) }));
      v.spkList = was.map((x, i) => ({ ...x, role: tag(x.role), n: i + 1, open: () => {} }));
      v.spkIntro = `This event's speakers are announced soon. Until then, these are speakers from ${si.spkLabel || "an earlier event"}.`;
      v.spkCount = was.length ? `Speakers from ${si.spkLabel}` : "";
    }
    const evp = this.props.evPartners;
    // Two to a row: an odd number gets one "Announcing soon" tile to finish the row.
    if (evp) v.phPartners = evp;
    else {
      const si = this.props.standIns || {};
      const wasP = si.partners || [];
      v.ptSoon = si.ptn ? { title: si.ptn.heading, text: wasP.length ? si.ptn.text : si.ptn.none } : { title: "Partners to be announced", text: "" };
      v.phPartners = wasP.slice(0, 6).map((p) => ({ name: p.title || "", logo: p.name, tier: si.ptnLabel }));
    }
    v.goPartnersAll = (e) => { if (e && e.preventDefault) e.preventDefault(); this.props.navigate(SCREEN_PATH.partners || "/partners"); };
    v.exFilters = [];
    v.exList = [];
    v.exSoon = { title: "Exhibitors to be announced", text: "Booths are being booked now. Exhibitors are listed here as they are confirmed." };
    // Toronto 2026: real speakers (with photos) and partner logos (LiveSite.jsx usePast2026).
    const past = this.props.past2026;
    if (past) {
      if (past.speakers.length) v.starSpeakers = past.speakers.slice(0, 4);
      if (past.partners.length) v.sixLogos = past.partners.map((p) => ({ n: p.name }));
      if (past.photos) v.galleryFour = past.photos.slice(0, 4);
      if (past.recap) v.recapPlayer = <VideoFacade video={past.recap} radius={12} />;
    }
    const at = (e) => (e && e.currentTarget) || null;
    v.goSpeakers = (e) => { if (e && e.preventDefault) e.preventDefault(); this.props.navigate("/speakers"); };
    v.soon = (e) => { if (e && e.preventDefault) e.preventDefault(); this.setState({ menu: false }); this.props.navigate(PAGE_PATH.contact); };
    v.submitForm = (e) => this.run("Sending", () => sendForm(PAGE_FORM[s.page] || "inquiry", fieldsNear(at(e)), { page: s.page }), "Thanks. We will be in touch soon");
    v.sendEnquiry = (e) => this.run("Sending your enquiry", () => sendForm("partnership", fieldsNear(at(e)), { event: cityPath(s.city || "van") }), "Thanks. Sales will reply soon");
    v.notifySoon = (e) => {
      const f = fieldsNear(at(e));
      const name = pick(f, "name") || String(f.email || "").split("@")[0];
      this.run("Saving", () => post("/stay-updated", { name, email: f.email, interests: ["delegate"], source: "website", consent: true, _hp: "" }), "We'll email you when tickets open");
    };
    v.pkgReq = () => { this.setState({ ov: null }); this.jump("contact")(); };
    v.fpReq = () => { this.setState({ ov: null }); this.jump("contact")(); this.toastIt("Tell us your details and we'll hold booth " + (s.fpSel || "B2")); };
    v.authSocial = () => { this.setState({ ov: null }); this.props.navigate("/app-login"); };
    v.authEmail = (e) => {
      const f = fieldsNear(at(e));
      const password = pick(f, "password");
      if (s.auth === "signup") { this.signup = { email: f.email, password }; this.setState({ authStep2: true }); return; }
      this.run("Signing you in", async () => { const data = await post("/auth/login", { email: f.email, password }); this.finishAuth(data.token); });
    };
    v.finishSignup = (e) => {
      const f = fieldsNear(at(e));
      const name = pick(f, "full name") || [f["first name"], f["last name"]].filter(Boolean).join(" ") || pick(f, "name");
      const su = this.signup || {};
      this.run("Creating your account", async () => {
        const data = await post("/auth/register", { name, email: su.email, password: su.password, company: pick(f, "company") });
        this.finishAuth(data.token, name);
      }, "Welcome to TTFC. Check your email to verify");
    };
    const primary = v.primary;
    if (s.sheet === "dl") {
      v.primary = (e) => {
        const f = fieldsNear(at(e));
        const { firstName, lastName } = splitName(pick(f, "name"));
        this.run("Sending", async () => {
          await post("/brochure/submit", { firstName, lastName: lastName || "-", email: f.email, page: window.location.pathname, _hp: "" });
          this.setState({ sheet: null });
        }, "Sent. Check your inbox");
      };
    } else if (s.step === 1) {
      v.primary = () => { if (!this.props.data?.types) { this.toastIt("Tickets go on sale soon"); return; } this.att = {}; primary(); };
    } else if (s.step === 2) {
      v.primary = () => this.checkout();
    }
    if (Array.isArray(v.attendees)) {
      v.attendees = v.attendees.map((a, idx) => ({
        ...a,
        toggle: () => { this.saveOpenAttendee(); this.setState({ openAtt: s.openAtt === idx ? -1 : idx }, () => this.restoreOpenAttendee()); },
      }));
    }
    return v;
  }

  render() {
    return (
      <div className="ap-phone" ref={(el) => { this.rootEl = el; }}>
        <style>{FILL}</style>
        {super.render()}
      </div>
    );
  }
}
