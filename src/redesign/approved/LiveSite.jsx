import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ApprovedSite from "./ApprovedSite";
import VideoFacade from "./VideoFacade";
import HeroBackgroundVideo from "../../components/HeroBackgroundVideo";
import WhyComeBox, { WhyComeBody } from "../../components/WhyComeBox";
import { resolveWhy } from "../../lib/whyCome";
import { heroVideoSrc } from "../../lib/siteFiles";
import { heroShadeBackground } from "../../lib/heroShade";
import { HOME_HEIGHTS, heroHeights, heroPosition } from "../../lib/heroFrame";
import LivePhone from "./LivePhone";
import { homeCityFor, homeEyebrow, homeOrder } from "../../lib/homeLayout";
import { speakerGrid, speakersSoon } from "./speakerGrid";
import "./siteLook.css"; // the new look (Nov 25 2026): light, compact type, the colour rules
import "./siteDark.css"; // only applies with ?theme=dark (src/lib/siteDarkPreview.js)
import SeasonRail from "./SeasonRail";
import "./newLook.css";
import { applyNewLook } from "./newLookVals";
import useNewLookEffects from "./useNewLookEffects";
import { normalizeSpeakerSlug, speakerSlug } from "../../seo/slug";
import { seasonStops } from "../../lib/seasonRail";
import { eventWording } from "../../lib/eventWording";
import { applySitePreviewTheme } from "../../lib/siteDarkPreview";
import useSeo from "../../hooks/useSeo";
import { client, urlFor } from "../../utils/sanity";
import { ECOSYSTEM_GROUP, FEATURED_GROUP, PILLAR_GROUPS, SECTOR_GROUPS, eventRowOf, matrixGroupOf, partnerOnEvent } from "../../data/partnerMatrix";
import { findEvent, useEventContent, useEvents } from "../../lib/events";
import { AGENDA_SOON, toDesignSessions } from "../../data/approvedAgendas";
import { STAND_IN_DEFAULT_FROM, standInLabel, standInWords } from "../../lib/standIns";
import {
  CITY_EVENT, EMAIL_RE, PAGE_FORM, PAGE_PATH, SCREEN_PATH, cityPath, countdownTo, fieldsNear, fullDate, monthShort, pick, post, routeFor, sendForm, splitName,
} from "./liveShared";
import { fetchTicketTypes, multiCheckout } from "../../lib/ticketsApi";

// The Toronto 2026 post-show report (public/, the same file the backend emails: services/brochureDownloads.js "report2026").
const REPORT_PDF = "/TTFC-2026-Post-Show-Report-2027-Prospectus.pdf";
function downloadReport() {
  const a = document.createElement("a");
  a.href = REPORT_PDF;
  a.download = "TTFC_2026_Post_Show_Report_2027_Prospectus.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* The approved website design (board 12), live (redesign step 2, Nov 2026).
   ApprovedSite is generated 1:1 from the approved board and must not be edited by hand.
   This file is the only place it meets the real site:
   - each screen of the design has its own address (/, the six 2027 event pages,
     /speakers, /partners, /awards, /highlights/2026, /exhibit, /sponsor, /contact, …);
   - the six events' dates, themes and photos come from the event records in the admin panel;
   - each event's agenda comes from Admin › Agenda ("announced soon" until it has sessions);
   - the Partners page's logos come from Admin › Partners & sponsors, in their rows;
   - the Toronto 2026 page shows the 2026 speakers (featured first, with photos), partner logos
     (Featured Partners first) and the festival's own photos;
   - ticket types and prices come from the backend, and "Pay" places a real order (Stripe);
   - every form posts to the backend (forms inbox, brochure, waitlist), sign-in uses the
     real account API. Anything the board shows as sample content stays as approved.
   - Nov 18 2026: each event page's speakers and partners (that event's own, with their row for
     it), the Speakers page, the Exhibitors page and the Partners page's 2027 tab use real
     records when there are any and the board's "announced soon" cards when there aren't
     (ApprovedSite reads sp.name / sp.img / sp.role, ex.sub, v.evPartners, v.pt2027Groups,
     v.spkIntro and the ptDefaultYear prop for that, falling back to the board's own text).
     The Partners page opens on the most recently completed year, or on the current season
     when Website switches › Open on this year's partners is on. */

const PAST_EVENT = "event-ttfc-2026-main";
const ROW_TITLES = Object.fromEntries([FEATURED_GROUP, ...PILLAR_GROUPS, ...SECTOR_GROUPS, ECOSYSTEM_GROUP].map((g) => [g.key, g.title]));
const SPEAKER_KINDS = { keynote: "Keynote", panelist: "Panel", moderator: "Moderator", fireside: "Fireside chat" };
/** An event's year: its first day, else the year in its record id or name. */
const yearOf = (ev) => Number(String((ev && ev.startDate) || "").slice(0, 4)) || Number((String((ev && ev._id) || "") + " " + String((ev && ev.name) || "")).match(/20\d\d/)?.[0]) || 0;
const logoImg = (p, h) => (p.logo && p.logo.asset
  ? <img src={urlFor(p.logo).height(h * 2).fit("max").auto("format").url()} alt={p.name} loading="lazy"
      style={{ display: "block", maxHeight: Math.round(h * Math.min(2.5, Math.max(0.3, (Number(p.logoScale) || 100) / 100))), maxWidth: "80%", width: "auto", height: "auto", objectFit: "contain", margin: "0 auto" }} />
  : p.name);

// How many 220px speaker tiles fit across the desktop Speakers section (1280px max, 32px sides, 24px gaps).
const speakerCols = () => {
  if (typeof document === "undefined") return 5;
  const w = Math.min(1280, document.documentElement.clientWidth || 1280) - 64;
  return Math.max(1, Math.floor((w + 24) / (220 + 24)));
};
class LiveSite extends ApprovedSite {
  static getDerivedStateFromProps(props, state) {
    const homeCity = props.homeCity || "van";
    if (props.routeKey === state.routeKey) return state.screen === "home" && state.city !== homeCity ? { city: homeCity } : null;
    const r = props.route || { screen: "home" };
    return {
      routeKey: props.routeKey, screen: r.screen, city: r.city || (r.screen === "home" ? homeCity : undefined), page: r.page, faq: r.faq ?? state.faq,
      sec: r.sec ?? "", drawer: !!r.drawer, menu: false, more: false, spk: null, auth: state.auth, dl: null,
    };
  }

  componentDidMount() {
    if (this.props.data?.types) this.setState({ q: this.props.data.types.map(() => 0) });
    this.afterRoute();
    this.fixSpeakerDrawer();
    this.onSpkResize = () => { const c = speakerCols(); if (c !== this.state.spkCols) this.setState({ spkCols: c }); };
    this.onSpkResize();
    window.addEventListener("resize", this.onSpkResize);
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.onSpkResize);
    if (super.componentWillUnmount) super.componentWillUnmount();
  }
  /* Nov 23 2026 (event data audit): the speaker drawer only opens from Toronto 2026's speakers (the home and
     2026 pages' "star speakers"), but the board's text says "<kind> · Vancouver Briefing 2027" and "Also spoke at
     Toronto 2026". Name the event they spoke at and drop the second line. Text nodes the board fixes, so React
     leaves them as set here. */
  fixSpeakerDrawer() {
    const root = this.rootEl;
    if (!root) return;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.parentElement?.closest("aside")) continue;
      if (n.nodeValue === " · Vancouver City Briefing 2027") n.nodeValue = " · Toronto 2026";
      else if (n.nodeValue === "Also spoke at Toronto 2026") n.parentElement.style.display = "none";
    }
  }
  componentDidUpdate(prev) {
    this.fixSpeakerDrawer();
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
      this.props.navigate(cityPath((this.state.screen === "home" && this.state.city) || "van") + (id === "agenda" ? "/agenda" : ""), { state: { sec: id } });
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
    // The Partners page's count: the partner records shown (the design's own wording until they load).
    if (this.props.ptCount) v.ptCountText = `${this.props.ptCount} partners and supporters · 2026`;
    // Real speakers, partners and the Partners page's 2027 rows where there are any; the board's
    // "announced soon" cards (and honest wording) where there aren't.
    // Nov 20 2026, "graceful when information isn't available": no sample prices while an event has no
    // tickets on sale, a Maps link and map note only once the venue is named, a working speaker search.
    if (this.props.ticketsSoon) {
      v.tickets = [];
      v.discountHint = "Tickets for this event aren't on sale yet. Leave your email on this page and we'll tell you the moment they open.";
    }
    if (v.c && v.c.mapsUrl) { v.mapsUrl = v.c.mapsUrl; v.mapNote = v.c.venueLine + ". Open it in Maps for directions."; }
    v.spkSearch = (e) => this.setState({ spkQ: e.target.value });
    const spk = this.props.evSpeakers;
    const goSpk = this.go("speakers", { spkF: "All" }, "Loading speakers");
    const f = s.spkF || "All";
    const grid = speakerGrid(spk, 2 * (s.spkCols || 5), goSpk);
    if (grid) {
      // At least SPK_MIN confirmed: only real speakers, two rows at most, then "See all speakers".
      v.speakers = grid.shown.map((x, i) => ({ ...x, n: i + 1, open: goSpk }));
      v.spkMore = grid.more;
      // Filters are the kinds these speakers really have (the board's fixed list missed Speaker and Moderator).
      const kinds = ["All", ...new Set(spk.map((x) => x.kind))];
      v.spkFilters = kinds.map((label) => { const on = f === label; return { label, on, bg: on ? "#151035" : "#FFFFFF", color: on ? "#FFFFFF" : "#151035", border: on ? "#151035" : "#D4D4D8", pick: () => this.setState({ spkF: label }) }; });
      const q = String(s.spkQ || "").trim().toLowerCase();
      const shown = spk.filter((x) => (f === "All" || x.kind === f) && (!q || (x.name + " " + x.role).toLowerCase().includes(q)));
      v.spkList = shown.map((x, i) => ({ ...x, n: i + 1, open: () => {} }));
      v.spkCount = shown.length ? `Showing ${shown.length} of ${spk.length}` : "No speakers match that search";
      v.spkIntro = `${spk.length} ${spk.length === 1 ? "speaker" : "speakers"} confirmed so far. More are announced as the programme fills.`;
    } else {
      // Nov 20 2026 (the owner): say "to be announced" ONCE, and show who spoke at Toronto 2026 meanwhile,
      // instead of a row of identical "Speaker to be announced" cards.
      const si = this.props.standIns || {};
      const was = si.speakers || [];
      const tag = (r) => (r ? r + " · " + si.spkLabel : si.spkLabel);
      // Fewer than SPK_MIN confirmed: one "coming soon" note and a link to Toronto 2026's speakers, no tiles.
      v.spkSoon = speakersSoon(v.goPast);
      v.speakers = [];
      v.spkList = was.map((x, i) => ({ ...x, role: tag(x.role), n: i + 1, open: v.goPast }));
      v.spkFilters = [];
      v.spkIntro = `This event's speakers are announced soon. Until then, these are speakers from ${si.spkLabel || "an earlier event"}.`;
      v.spkCount = was.length ? `Speakers from ${si.spkLabel}` : "";
    }
    // The event's partners, then "Announcing soon" tiles up to the board's six.
    // The event's own partners; with none yet, ONE "to be announced" note and Toronto 2026's partners meanwhile.
    const evp = this.props.evPartners;
    if (evp) v.evPartners = evp;
    else {
      const si = this.props.standIns || {};
      const wasP = si.partners || [];
      v.ptSoon = si.ptn ? { title: si.ptn.heading, text: wasP.length ? si.ptn.text : si.ptn.none } : { title: "Partners to be announced", text: "" };
      v.evPartners = wasP.map((p) => ({ name: p.title || "", logo: p.name, tier: si.ptnLabel }));
    }
    v.pt2027Groups = this.props.pt2027Groups || null;
    // Exhibitors: no booth is sold yet, so no sample booth numbers or topic filters.
    v.exFilters = [];
    v.exList = [];
    v.exSoon = { title: "Exhibitors to be announced", text: "Booths are being booked now. Exhibitors are listed here as they are confirmed." };
    // The event's background video (Admin › Event pages), over its city photo and sized like it. Staff choose photo
    // OR video (heroMedia): "video" plays on every device (data saver and reduced motion keep the photo).
    // The shade over the photo / video (Admin › Event pages › Top of the page; "default" = the usual fade).
    if (v.c) { v.shadeFull = { position: "absolute", inset: "0", background: heroShadeBackground(v.c.shade, "full") }; v.shadeSoon = { position: "absolute", inset: "0", background: heroShadeBackground(v.c.shade, "soon") }; }
    // The photo credit is for the city photo: it hides once the event's own video is playing over it (Nov 25 2026).
    if (v.c && v.c.video) {
      const playing = v.c.video;
      v.heroVideo = <HeroBackgroundVideo key={v.c.video} src={v.c.video} position={v.c.posD} anyDevice onPlaying={() => { if (this.state.heroPlaying !== playing) this.setState({ heroPlaying: playing }); }} />;
      v.hideCredit = this.state.heroPlaying === v.c.video;
    }
    if (v.c && v.c.heights) v.heroH = v.c.heights;
    v.homeH = HOME_HEIGHTS.desktop;   // the home page's hero: full screen (Nov 25 2026)
    // The home page (Admin › Content › Home page, Nov 25 2026): the event its top promotes (the pinned one, else the
    // next) and its sections in order. Vancouver keeps the design's own wording (editable in Website text & media).
    v.homeOrder = this.props.homeOrder;
    // The new look (Nov 25 2026): the season timeline under each page's hero, and "Tickets on sale" on the event's
    // hero only while its tickets really are on sale.
    v.seasonRail = <SeasonRail stops={this.props.season} go={v.goCity} goPast={v.goPast} here={s.screen === "event" ? s.city : null} />;
    v.onSale = !this.props.ticketsSoon && !!(this.props.data && this.props.data.types && this.props.data.types.length);
    if (s.screen === "home" && s.city && v.c && v.goCity) {
      v.homeGo = v.goCity[s.city] || v.goEvent;
      // Vancouver too once it has its own photo (Nov 25 2026, the owner: no stock photo or its credit on the home page).
      if (s.city !== "van" || v.c.ownPhoto) v.homeHero = { img: v.c.img, alt: v.c.title, eyebrow: homeEyebrow(v.c), title: v.c.title, blurb: v.c.blurb, credit: v.c.credit, posD: v.c.posD || "center", pos: v.c.pos || v.c.posD || "center" };
    }
    if (v.c && v.c.why) {
      v.whyEyebrow = v.c.why.eyebrow;
      v.whyHeading = v.c.why.heading;
      v.whyBody = <WhyComeBody why={v.c.why} />;
      v.whyBox = <WhyComeBox key={v.c.id} why={v.c.why} />;
    }
    const past = this.props.past2026;
    if (past) {
      if (past.speakers.length) v.starSpeakers = past.speakers.slice(0, 4).map((x, i) => ({ ...x, open: () => this.setState({ spk: { n: i + 1, kind: x.kind } }) }));
      if (past.partners.length) v.pastPartners = past.partners;
      v.photos = PAST_PHOTOS;
      if (past.recap) {
        v.recapPlayer = <VideoFacade video={past.recap} radius={16} />;
        v.recapCaption = past.recap.title;
      }
    }
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
        // The post-show report, not the 2026 sponsorship brochure (services/brochureDownloads.js "report2026").
        await post("/brochure/submit", { brochure: "report2026", firstName, lastName, email: f.email, company: pick(f, "company"), page: window.location.pathname, _hp: "" });
        this.setState({ dlSent: true });
        downloadReport();
      });
    };
    // "Download now" in the sent state (the generated design only closed the dialog).
    v.downloadReport = (e) => { if (e && e.preventDefault) e.preventDefault(); downloadReport(); this.setState({ dl: null }); };
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
    return applyNewLook(v, this, { openTix: v.openDrawer });
  }

  finishAuth(token, name = "") {
    localStorage.setItem("token", token);
    window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { token, name } }));
    this.setState({ auth: null, authStep2: false, signedIn: true });
  }

  render() {
    return (
      <div className="ap-desk" style={{ display: "contents" }} ref={(el) => { this.rootEl = el; }}>
        <style>{NARROW}</style>
        {super.render()}
      </div>
    );
  }
}

/* The desktop board on phones and tablets (mobile audit, Nov 23 2026). The phone board has no
   Partners or Awards screen, and iPads from 821px get the desktop board, so its fixed 3-6 column grids
   squeezed award winners and partner logos into slivers ("Validgri", "Transient" cut off). Below
   1000px those grids drop to two columns, and below 560px three-column ones to one. Grids that already
   wrap (auto-fit / auto-fill) are untouched. The board's inline styles need !important to override. */
const NARROW = `@media (max-width: 1000px) {
  .ap-desk .ap-root [style*="grid-template-columns: repeat(3,"],
  .ap-desk .ap-root [style*="grid-template-columns: repeat(4,"],
  .ap-desk .ap-root [style*="grid-template-columns: repeat(6,"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
}
@media (max-width: 560px) {
  .ap-desk .ap-root [style*="grid-template-columns: repeat(3,"],
  .ap-desk .ap-root [style*="grid-template-columns: 1fr 1fr"],
  .ap-desk .ap-root [style*="grid-template-columns: minmax(0px, 1fr) minmax(0px, 1fr)"],
  .ap-desk .ap-root [style*="grid-template-columns: minmax(0px, 1.2fr) minmax(0px, 1fr)"] { grid-template-columns: minmax(0, 1fr) !important; }
  /* Awards › how winners are chosen: dot, criterion, weight, then the description on its own line. */
  .ap-desk .ap-root [style*="grid-template-columns: 14px 160px 48px"] { grid-template-columns: 14px minmax(0, 1fr) 48px !important; }
  .ap-desk .ap-root [style*="grid-template-columns: 14px 160px 48px"] > :nth-child(4) { grid-column: 1 / -1; }
}`;
/* The browser writes minmax(0, 1fr) back as minmax(0px, 1fr) in the style attribute: match that. */

/** One route element for every screen of the approved design. `fallback` renders for
    addresses that look like event pages but aren't one of the six 2027 events. */
const PHONE_QUERY = "(max-width: 820px)";
// The phone design has no partners or awards screen; those two stay on the desktop design.
const PHONE_SCREENS = ["home", "event", "page", "past", "speakers", "agenda", "speaker"];
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

/* Toronto 2026 in pictures: the festival's own photography (also the old site's gallery strip). */
const PAST_PHOTOS = [
  ["/ft-conference.jpg", "Keynote presentation at The Tech Festival Canada"],
  ["/ft-expo.jpg", "The expo and networking floor"],
  ["/ft-gala.jpg", "Gala dinner and networking reception"],
  ["/ft-awards.jpg", "The Catalyst Awards ceremony"],
  ["/ft-breakfast.jpg", "CxO breakfast with senior leaders"],
  ["/ft-audience.webp", "The audience at The Tech Festival Canada"],
  ["/ft-panel.webp", "A panel discussion"],
  ["/ft-clinic.jpg", "Inside a clinic session"],
].map(([src, alt], i) => ({ n: i + 1, src, alt }));

/** The 2026 speakers and partners for the Toronto 2026 page (null until loaded or when unreadable). */
function usePast2026(on) {
  const [past, setPast] = useState(null);
  useEffect(() => {
    if (!on || past) return undefined;
    let live = true;
    const ev = "event-ttfc-2026-main";
    const scoped = `(!defined(events) || count(events) == 0 || $ev in events[]._ref)`;
    Promise.all([
      client.fetch(`*[_type == "speaker" && !(_id in path("drafts.**")) && defined(image.asset) && ${scoped}] | order(coalesce(featured, false) desc, order asc)[0...12]{ name, title, company, speakerType, image }`, { ev }),
      client.fetch(`*[_type == "partner" && active != false && showOnWebsite != false && defined(logo.asset) && ${scoped}] | order(order asc){ _id, name, logo, matrixGroup, logoScale }`, { ev }),
      // The recap box: a YouTube / Vimeo video from Admin › Content › Videos (2026's first, else one marked for the home page).
      client.fetch(`*[_type == "video" && active != false && defined(videoId) && ($ev in events[]._ref || showOnHome == true)] | order(($ev in events[]._ref) desc, coalesce(order, 9999) asc, recordedOn desc)[0]{ title, provider, videoId, thumbnailUrl, url }`, { ev }).catch(() => null),
    ]).then(([spk, ptn, recap]) => {
      if (!live) return;
      const kinds = { keynote: "Keynote", panelist: "Panel", moderator: "Moderator", fireside: "Fireside chat" };
      const speakers = (spk || []).map((x) => ({
        name: x.name,
        role: [x.title, x.company].map((v) => String(v || "").trim()).filter(Boolean).join(", "),
        kind: kinds[x.speakerType] || "Speaker",
        img: urlFor(x.image).width(480).height(600).fit("crop").auto("format").url(),
      }));
      const sorted = [...(ptn || [])].sort((a, b) => (matrixGroupOf(b) === "featured") - (matrixGroupOf(a) === "featured"));
      const partners = sorted.slice(0, 6).map((p) => ({
        name: <img src={urlFor(p.logo).height(120).fit("max").auto("format").url()} alt={p.name} title={p.name} loading="lazy"
          style={{ display: "block", maxHeight: 48, maxWidth: "75%", objectFit: "contain", margin: "0 auto" }} />,
        tier: matrixGroupOf(p) === "featured" ? "Featured partner" : "Partner", title: p.name,
      }));
      // Every 2026 partner logo, for the moving row under the home page's top section (Nov 25 2026).
      const logos = sorted.map((p) => ({
        title: p.name,
        logo: <img src={urlFor(p.logo).height(120).fit("max").auto("format").url()} alt={p.name} title={p.name} loading="lazy" />,
      }));
      setPast({ speakers, partners, logos, photos: PAST_PHOTOS, recap: recap || null });
    }).catch(() => { if (live) setPast(null); });
    return () => { live = false; };
  }, [on, past]);
  return past;
}

/* A speaker's page (the new look, Nov 25 2026): the speaker whose name makes this slug, the sessions they are in
   and four more speakers from the same event. undefined while loading, null when nobody matches. */
function useSpeakerDoc(slug, events) {
  const [state, setState] = useState({ slug: "", doc: undefined });
  useEffect(() => {
    if (!slug) return undefined;
    let live = true;
    const wanted = normalizeSpeakerSlug(slug);
    const pub = `!(_id in path("drafts.**"))`;
    client.fetch(`*[_type == "speaker" && ${pub}] | order(coalesce(featured, false) desc, order asc){ _id, name, title, company, speakerType, image, shortBio, bio, linkedin, "eventIds": events[]._ref }`)
      .then(async (list) => {
        const all = (list || []).filter((x) => x && x.name);
        const me = all.find((x) => speakerSlug(x.name) === wanted);
        if (!me) { if (live) setState({ slug, doc: null }); return; }
        const card = (x) => ({
          name: x.name,
          role: [x.title, x.company].map((t) => String(t || "").trim()).filter(Boolean).join(", "),
          kind: SPEAKER_KINDS[x.speakerType] || "Speaker",
          img: x.image && x.image.asset ? urlFor(x.image).width(600).height(750).fit("crop").auto("format").url() : "",
        });
        const evId = (me.eventIds || [])[0] || PAST_EVENT;
        const sessions = await client.fetch(
          `*[_type == "session" && ${pub} && (references($id) || $name in speakers[].name || moderator.name == $name)]{ title, day, time, type, format, description, speakers, moderator, isBreak }`,
          { id: me._id, name: me.name },
        ).catch(() => []);
        const others = all.filter((x) => x._id !== me._id && x.image && x.image.asset && (!(x.eventIds || []).length || (x.eventIds || []).includes(evId))).slice(0, 4).map(card);
        const bio = typeof me.shortBio === "string" && me.shortBio.trim() ? me.shortBio.trim() : typeof me.bio === "string" ? me.bio.trim() : "";
        if (live) setState({ slug, doc: { ...card(me), bio, linkedin: /^https?:\/\//i.test(me.linkedin || "") ? me.linkedin : "", evId, talks: toDesignSessions(sessions || []), others } });
      })
      .catch(() => { if (live) setState({ slug, doc: null }); });
    return () => { live = false; };
  }, [slug]);
  const doc = state.slug === slug ? state.doc : undefined;
  if (!doc) return doc;
  const ev = (events || []).find((e) => e._id === doc.evId);
  return { ...doc, eventLabel: ev ? eventWording(ev.name) : "", eventTitle: ev ? eventWording(ev.name) : "" };
}

/* While an event has no speakers / partners of its own, its page shows another event's (Nov 22 2026,
   the owner: chosen per event in Admin › Content › Event page; default Toronto 2026, featured first).
   → { label, speakers, partners, spk: {heading, text, none}, ptn: {…} }, null until loaded. */
function useStandIns(ev, events) {
  const [out, setOut] = useState(null);
  const refId = (r) => (typeof r === "string" ? r : (r && r._ref) || "");
  const spkFrom = refId(ev && ev.standInSpeakersFrom) || STAND_IN_DEFAULT_FROM;
  const ptnFrom = refId(ev && ev.standInPartnersFrom) || STAND_IN_DEFAULT_FROM;
  const spkIds = ((ev && ev.standInSpeakers) || []).map(refId).filter(Boolean);
  const ptnIds = ((ev && ev.standInPartners) || []).map(refId).filter(Boolean);
  const key = [ev && ev._id, spkFrom, ptnFrom, spkIds.join(","), ptnIds.join(",")].join("|");
  const evById = (id) => (events || []).find((e) => e._id === id);
  const spkLabel = standInLabel(evById(spkFrom));
  const ptnLabel = standInLabel(evById(ptnFrom));
  useEffect(() => {
    if (!ev) { setOut(null); return undefined; }
    let live = true;
    const scoped = (v) => `(!defined(events) || count(events) == 0 || ${v} in events[]._ref)`;
    const byPick = (ids) => (a, b) => ids.indexOf(a._id) - ids.indexOf(b._id);
    const pub = `!(_id in path("drafts.**"))`;
    Promise.all([
      spkIds.length
        ? client.fetch(`*[_type == "speaker" && ${pub} && _id in $ids && defined(image.asset)]{ _id, name, title, company, speakerType, image }`, { ids: spkIds }).then((l) => (l || []).sort(byPick(spkIds)))
        : client.fetch(`*[_type == "speaker" && ${pub} && defined(image.asset) && ${scoped("$ev")}] | order(coalesce(featured, false) desc, order asc)[0...12]{ _id, name, title, company, speakerType, image }`, { ev: spkFrom }),
      ptnIds.length
        ? client.fetch(`*[_type == "partner" && ${pub} && _id in $ids && defined(logo.asset)]{ _id, name, logo, matrixGroup, eventRows }`, { ids: ptnIds }).then((l) => (l || []).sort(byPick(ptnIds)))
        : client.fetch(`*[_type == "partner" && ${pub} && active != false && showOnWebsite != false && defined(logo.asset) && ${scoped("$ev")}] | order(order asc){ _id, name, logo, matrixGroup, eventRows }`, { ev: ptnFrom })
          .then((l) => [...(l || [])].sort((a, b) => (matrixGroupOf(b) === "featured") - (matrixGroupOf(a) === "featured")).slice(0, 6)),
    ]).then(([spk, ptn]) => {
      if (!live) return;
      const kinds = { keynote: "Keynote", panelist: "Panel", moderator: "Moderator", fireside: "Fireside chat" };
      setOut({
        speakers: (spk || []).map((x) => ({
          name: x.name,
          role: [x.title, x.company].map((v) => String(v || "").trim()).filter(Boolean).join(", "),
          kind: kinds[x.speakerType] || "Speaker",
          img: urlFor(x.image).width(480).height(600).fit("crop").auto("format").url(),
        })),
        partners: (ptn || []).map((p) => ({
          name: <img src={urlFor(p.logo).height(120).fit("max").auto("format").url()} alt={p.name} title={p.name} loading="lazy"
            style={{ display: "block", maxHeight: 48, maxWidth: "75%", objectFit: "contain", margin: "0 auto" }} />,
          title: p.name,
        })),
      });
    }).catch(() => { if (live) setOut({ speakers: [], partners: [] }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!out) return null;
  return {
    ...out,
    spkLabel, ptnLabel,
    spk: standInWords("speakers", spkLabel, ev && ev.standInSpeakersHeading, ev && ev.standInSpeakersText),
    ptn: standInWords("partners", ptnLabel, ev && ev.standInPartnersHeading, ev && ev.standInPartnersText),
  };
}

export default function ApprovedRoute({ fallback = null }) {
  const location = useLocation();
  // The website is dark (src/lib/siteDarkPreview.js; ?theme=light previews the light version), on this design's pages only.
  useEffect(() => {
    if (routeFor(location.pathname)) applySitePreviewTheme(); else document.documentElement.removeAttribute("data-site-theme");
  }, [location.search, location.pathname]);
  // Dark belongs to this design's pages only: leaving them (the admin panel, older pages) takes it off again.
  useEffect(() => () => { document.documentElement.removeAttribute("data-site-theme"); }, []);
  const phone = usePhone();
  const navigate = useNavigate();
  const base = routeFor(location.pathname);
  // goSec from another screen lands on the event page with the section to scroll to.
  const route = base && location.state && location.state.sec ? { ...base, sec: location.state.sec } : base;
  const { events } = useEvents();
  const [typesFor, setTypesFor] = useState({ key: "", list: null });
  // The countdown moves on every minute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  const byCity = useMemo(() => {
    const out = {};
    Object.entries(CITY_EVENT).forEach(([id, c]) => { out[id] = findEvent(events, c); });
    return out;
  }, [events]);
  const van = byCity.van;
  // The home page's settings (Admin › Content › Home page): the event its top promotes and its sections in order.
  // Read through the preview-aware client, so staff see staged changes on staging. Nothing saved = the next event.
  const [homeDoc, setHomeDoc] = useState(null);
  useEffect(() => {
    let live = true;
    client.fetch(`*[_id == "homePage"][0]{ "heroEvent": heroEvent._ref, sections[]{ key, on } }`)
      .then((d) => { if (live) setHomeDoc(d || {}); })
      .catch(() => { if (live) setHomeDoc({}); });
    return () => { live = false; };
  }, []);
  const homeCity = useMemo(() => homeCityFor(homeDoc && homeDoc.heroEvent, byCity, new Date(now).toISOString().slice(0, 10)), [homeDoc, byCity, now]);
  const homeSections = useMemo(() => homeOrder(homeDoc && homeDoc.sections), [homeDoc]);
  const seasonDay = new Date(now).toISOString().slice(0, 10);
  const season = useMemo(() => seasonStops(byCity, seasonDay), [byCity, seasonDay]);
  // The event this page is about (Vancouver, the next event, on pages that aren't an event's):
  // its tickets, its agenda, its checkout. Each event sells its own tickets (Nov 17 2026: every
  // page used to load Vancouver's).
  const ev = route && route.city ? byCity[route.city] : route && route.screen === "home" && homeCity !== "van" ? byCity[homeCity] || null : null;
  const evKey = (ev || van) && (ev || van).eventKey;

  useEffect(() => {
    let live = true;
    if (evKey) fetchTicketTypes(evKey).then((list) => { if (live) setTypesFor({ key: evKey, list: list && list.length ? list : null }); });
    return () => { live = false; };
  }, [evKey]);
  // Only this event's list: never another event's while this one loads.
  const types = typesFor.key === evKey ? typesFor.list : null;

  // The agenda: the sessions of the event this page is about.
  const content = useEventContent(ev || van);
  const sessionsData = useMemo(() => {
    if (content.loading) return undefined;   // the design's own rows until the first answer (no flash of "soon")
    const rows = toDesignSessions(content.sessions);
    return rows.length ? rows : AGENDA_SOON;
  }, [content]);

  // Home › Agenda highlights (Nov 25 2026): every 2027 event's sessions, so visitors can pick an event that has an
  // agenda. One query, read through the preview-aware client (staging shows staged agendas).
  const [allSessions, setAllSessions] = useState(null);
  const onHome = !!(route && route.screen === "home");
  useEffect(() => {
    if (!onHome || allSessions) return undefined;
    let live = true;
    client.fetch(`*[_type == "session" && count(events) > 0]{ _id, title, day, time, endTime, type, format, isBreak, description, speakers, moderator, image, mediaUrl, "eventIds": events[]._ref }`)
      .then((list) => { if (live) setAllSessions(list || []); })
      .catch(() => { if (live) setAllSessions([]); });
    return () => { live = false; };
  }, [onHome, allSessions]);
  const homeAgendas = useMemo(() => {
    const out = {};
    if (!allSessions) return out;
    Object.keys(byCity).forEach((id) => {
      const evId = byCity[id] && byCity[id]._id;
      if (evId) out[id] = toDesignSessions(allSessions.filter((x) => (x.eventIds || []).includes(evId) && !x.isBreak));
    });
    return out;
  }, [allSessions, byCity]);

  // Partners page: the partner records (logo, row) from the admin panel, instead of the design's sample names.
  const [partners, setPartners] = useState(null);
  const onPartners = !!(route && route.screen === "partners");
  useEffect(() => {
    if (!onPartners || partners) return undefined;
    let live = true;
    client.fetch(`*[_type == "partner" && active != false && showOnWebsite != false]{ _id, name, logo, matrixGroup, logoScale, events, eventRows } | order(order asc)`)
      .then((list) => { if (live) setPartners(list || []); })
      .catch(() => { if (live) setPartners([]); });
    return () => { live = false; };
  }, [onPartners, partners]);
  // The Partners page's 2027 tab: each 2027 event's own partners (Featured first), when any are set.
  const pt2027Groups = useMemo(() => {
    if (!partners || !partners.length) return null;
    const groups = (events || []).filter((e) => e && e.name && yearOf(e) === 2027)
      .sort((a, b) => String(a.startDate || "9").localeCompare(String(b.startDate || "9")))
      .map((e) => {
        const mine = partners.filter((p) => (p.events || []).some((r) => r && r._ref === e._id))
          .sort((a, b) => (eventRowOf(b, e._id) === "featured") - (eventRowOf(a, e._id) === "featured"));
        return { kind: e.startDate ? monthShort(e.startDate) : "2027", title: eventWording(e.name), count: mine.length + (mine.length === 1 ? " partner" : " partners"),
          cols: 6, h: 76, fs: 14, items: mine.map((p) => ({ n: logoImg(p, 40) })) };
      })
      .filter((g) => g.items.length);
    return groups.length ? groups : null;
  }, [partners, events]);

  // Which year the Partners page opens on: the most recently completed year's (tab 0 = 2026),
  // or the current season's when Website switches › Open on this year's partners is on.
  const [showCurrentYear, setShowCurrentYear] = useState(false);
  useEffect(() => {
    if (!onPartners) return undefined;
    let live = true;
    client.fetch(`*[_type == "siteSettings"][0].partnersShowCurrentYear`).then((v) => { if (live) setShowCurrentYear(v === true); }).catch(() => {});
    return () => { live = false; };
  }, [onPartners]);
  const ptDefaultYear = useMemo(() => {
    const today = new Date(now).toISOString().slice(0, 10);
    const years = (events || []).filter((e) => e && yearOf(e));
    const done = years.filter((e) => (e.endDate || e.startDate) && (e.endDate || e.startDate) < today).map(yearOf);
    const next = years.filter((e) => !(e.endDate || e.startDate) || (e.endDate || e.startDate) >= today).map(yearOf);
    const year = showCurrentYear ? (next.length ? Math.min(...next) : 2027) : (done.length ? Math.max(...done) : 2026);
    return Math.min(1, Math.max(0, year - 2026));   // the board's tabs: 2026, 2027
  }, [events, now, showCurrentYear]);

  // The event page: that event's own partners (in their row for it, Featured first) and speakers.
  const evId = (ev || van) && (ev || van)._id;
  const evPartners = useMemo(() => {
    const list = (content.partners || []).filter((p) => p && p.name)
      .sort((a, b) => (eventRowOf(b, evId) === "featured") - (eventRowOf(a, evId) === "featured"));
    if (!list.length) return null;
    return list.slice(0, 12).map((p) => {
      const row = eventRowOf(p, evId);
      return { name: p.name, logo: logoImg(p, 44), tier: row === "featured" ? "Featured partner" : ROW_TITLES[row] || "Partner" };
    });
  }, [content.partners, evId]);
  const evSpeakers = useMemo(() => {
    const list = (content.speakers || []).filter((x) => x && x.name);
    if (!list.length) return null;
    return list.map((x) => ({
      name: x.name,
      role: [x.title, x.company].map((v) => String(v || "").trim()).filter(Boolean).join(", "),
      kind: SPEAKER_KINDS[x.speakerType] || "Speaker",
      img: x.image && x.image.asset ? urlFor(x.image).width(480).height(600).fit("crop").auto("format").url() : "",
    }));
  }, [content.speakers]);

  const past2026 = usePast2026(!!route);
  useNewLookEffects(!!route);
  const speakerDoc = useSpeakerDoc(route && route.screen === "speaker" ? route.slug : "", events);
  const standIns = useStandIns(ev || van, events);
  const partners2026 = useMemo(() => (partners ? partners.filter((p) => partnerOnEvent(p, PAST_EVENT)) : null), [partners]);
  const partnerRows = useMemo(() => {
    if (!partners2026 || !partners2026.length) return null;
    const rows = {};
    partners2026.forEach((p) => {
      const k = eventRowOf(p, PAST_EVENT);
      const scale = Math.min(2.5, Math.max(0.3, (Number(p.logoScale) || 100) / 100));
      const tile = p.logo && p.logo.asset
        ? <img src={urlFor(p.logo).height(160).fit("max").auto("format").url()} alt={p.name} title={p.name} loading="lazy"
            style={{ display: "block", maxHeight: Math.round((k === "featured" ? 64 : 40) * scale), maxWidth: `min(${Math.round(80 * scale)}%, 100%)`, width: "auto", height: "auto", objectFit: "contain", margin: "0 auto" }} />
        : p.name;
      (rows[k] = rows[k] || []).push(tile);
    });
    return rows;
  }, [partners2026]);

  const data = useMemo(() => ({
    CITIES: (base) => {
      const out = { ...base };
      Object.keys(out).forEach((id) => {
        const ev = byCity[id];
        // Venue and audience: the event's own fields, else the approved design's wording (never "[Venue]").
        out[id] = { venue: "Venue announced with tickets", venueArea: `Downtown ${out[id].name}`, audience: "150 senior delegates", ...out[id] };
        // "Why come" (Admin › Event pages, Nov 25 2026): the event's own words and media; without them the design's,
        // with the BC paragraph only on Vancouver (src/lib/whyCome.js).
        out[id].why = resolveWhy(ev || {}, { cityId: id, cityName: out[id].name });
        if (!ev) return;
        const c = { ...out[id] };
        if (ev.venueName) {
          c.venue = ev.venueName;
          // Nov 20 2026: a named venue replaces "venue announced soon" everywhere and gets a real Maps link.
          c.venueLine = [ev.venueName, ev.venueAddress].filter(Boolean).join(" · ");
          c.mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([ev.venueName, ev.venueAddress].filter(Boolean).join(", "));
        }
        if (ev.venueAddress) c.venueArea = ev.venueAddress;
        if (ev.audience) c.audience = ev.audience;
        // A fixed date shows in full, with a countdown to it; without one, the month (and no countdown).
        if (ev.startDate) { c.date = fullDate(ev.startDate); c.month = monthShort(ev.startDate); c.startDate = String(ev.startDate).slice(0, 10); }
        Object.assign(c, countdownTo(ev.startDate, id, now));
        if (ev.theme) c.theme = ev.theme;
        if (ev.formatLine) c.format = ev.formatLine;
        if (ev.tagline) c.blurb = ev.tagline; // "One line under the name" (the older long descriptions belong to the previous design)
        // The city photo on the approved design: the event's "City skyline" photo when one is set
        // in the admin panel (the older hero photos belong to the previous design).
        if (ev.citySkyline && ev.citySkyline.asset) { c.img = urlFor(ev.citySkyline).width(2000).quality(78).auto("format").url(); c.credit = ev.photoCredit || ""; c.ownPhoto = true; }
        // Its background video (Nov 24 2026): only our own Sanity uploads (heroVideoSrc); the photo stays its first frame.
        // Photo or video, never both (Nov 25 2026): heroMedia, else the video when there is one.
        c.media = ev.heroMedia === "photo" || ev.heroMedia === "video" ? ev.heroMedia : (heroVideoSrc(ev.heroVideoUrl) ? "video" : "photo");
        c.video = c.media === "video" ? heroVideoSrc(ev.heroVideoUrl) : "";
        c.shade = ev.heroShade || "default";
        // Framing and height of the top of the page (Admin › Event pages, Nov 25 2026): unset = the design's.
        c.posD = heroPosition(ev.heroFocus, c.posD || "center");
        c.pos = heroPosition(ev.heroFocus, c.pos || "center");
        c.heights = heroHeights(ev.heroHeight);
        out[id] = c;
      });
      return out;
    },
    types: types ? types.map((t) => ({ id: t.id, name: t.name, note: t.description, cents: t.priceCents })) : undefined,
    sessionsData,
    PT: partnerRows ? (base) => {
      const out = {};
      Object.keys(base).forEach((k) => { out[k] = partnerRows[k] || []; });
      Object.keys(partnerRows).forEach((k) => { if (!out[k]) out[k] = partnerRows[k]; });
      return out;
    } : undefined,
    // Rows with partners only; the admin panel's Energy & Utilities row goes before Ecosystem.
    PTG: partnerRows ? (base) => {
      const list = base.filter(([k]) => k !== "ecosystem");
      if (partnerRows.energy) list.push(["energy", "Energy & Utilities", "Sector"]);
      list.push(base.find(([k]) => k === "ecosystem"));
      return list.filter((g) => g && (partnerRows[g[0]] || []).length);
    } : undefined,
  }), [byCity, types, now, sessionsData, partnerRows]);

  const seoEv = ev || van;
  useSeo(
    route && route.screen === "event" && ev ? `${eventWording(ev.name)} · The Tech Festival Canada`
      : route && route.screen === "agenda" && seoEv ? `Agenda · ${eventWording(seoEv.name)} · The Tech Festival Canada`
      : route && route.screen === "speaker" && speakerDoc ? `${speakerDoc.name} · Speakers · The Tech Festival Canada` : undefined,
    route && route.screen === "event" && ev ? ev.theme || undefined
      : route && route.screen === "speaker" && speakerDoc ? speakerDoc.role || undefined : undefined,
  );

  if (!route) return fallback;
  const View = phone && PHONE_SCREENS.includes(route.screen) ? LivePhone : LiveSite;
  return (
    <View
      route={route}
      routeKey={location.pathname + "|" + location.key}
      navigate={navigate}
      data={data}
      ptCount={partners2026 && partners2026.length ? partners2026.length : 0}
      ptDefaultYear={ptDefaultYear}
      ticketsSoon={!types && typesFor.key === (evKey || "")}
      pt2027Groups={pt2027Groups}
      evPartners={evPartners}
      evSpeakers={evSpeakers}
      past2026={past2026}
      standIns={standIns}
      eventKey={evKey}
      homeCity={homeCity}
      homeOrder={homeSections}
      season={season}
      speakerDoc={speakerDoc}
      homeAgendas={homeAgendas}
      loaderMs={0}
    />
  );
}
