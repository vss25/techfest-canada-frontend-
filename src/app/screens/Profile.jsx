import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck, Bell, BellRing, CalendarClock, Camera, ChevronRight, Download, FileText, Hand, HelpCircle, IdCard, Landmark, LifeBuoy, LogOut, Mic, Moon, Pencil, QrCode, RotateCcw,
  LogIn, ScanLine, ShieldCheck, Smartphone, Sun, Ticket, Trophy, Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import { auth, bestTicket, can, isSignedIn, isTeam, loadAccount, signOut } from "../lib/auth";
import { staffSos } from "../lib/sos";
import { social } from "../lib/social";
import { theme, setTheme, THEME_LABEL } from "../lib/theme";
import { points, refreshPoints } from "../lib/points";
import { resetDemo } from "../lib/demo";
import { fileURL, LINKS, shortTopic } from "../lib/config";
import { confirmDialog } from "../lib/ui";
import { Avatar, Button, Sheet, TopBar } from "../components/ui";
import { GearFill, TrophyFill } from "../components/Glyphs";
import AppleWalletButton from "../components/AppleWallet";
import ContactCard from "../components/ContactCard";
import { GetPassCard } from "../components/PassesSheet";
import { profileTagView } from "../lib/profileTag";
import { ProfileGlow, ProfileTagPill } from "../components/ProfileTag";
import BrandMark from "../components/BrandMark";
import { AttendingRow } from "../components/LinkedInCta";
import { AvailabilityRows } from "../components/Availability";
import { availabilitySummary } from "../lib/availability";

const BadgeScanner = lazy(() => import("../components/BadgeScanner"));

/* =========================================================
   Profile (iOS ProfileView): points (top left) and the gear
   (top right), your tile and name, the pass strip (pass,
   connect QR, Scan) with Add to Apple Wallet under it on Apple
   devices, the contact card, availability, connections, Awards,
   and Interests last. Notifications, theme, About and sign out
   are in Settings (the gear). Guests get the sign-in card.
   Your pass type (Oct 20 2026, /auth/me `profileTag`, lib/
   profileTag.js): a glow at the screen's edge in its colour (the
   upper half: along the top and down both sides) while this
   screen is open, and a pill in the same colour under
   your name, job title and company (Media dark blue, Speaker
   red, Staff purple, Volunteer orange, any other pass green; no
   one is labelled VIP), so door staff can tell it from a distance. The pill
   has no words (the organiser: "Just show the colored tab/pill"):
   a small icon in it, and its name for screen readers. Nothing
   else in the app changes colour. The TTFC brand (Oct 20 2026,
   the organiser: "more branding"; "Just the logo"): the logo
   mark in the header row instead of the word "Profile" (still
   the screen's name for screen readers; a tap on the mark pops
   it and scrolls to the top), and a hairline in the
   logo's colours under your header (so this header has no
   hairline of its own). The glow and the pill stay the pass
   colour only.
========================================================= */

const THEME_ICON = { system: Smartphone, light: Sun, dark: Moon };

function Row({ to, href, icon, title, onClick, tone, badge }) {
  const Icon = icon;
  const inner = (
    <>
      <span className="lead-icon" style={tone === "danger" || tone === "sos" ? { color: "var(--red)" } : undefined}><Icon aria-hidden="true" /></span>
      <b style={{ flex: 1, minWidth: 0, color: tone === "danger" ? "var(--red)" : undefined }}>{title}</b>
      {badge}
      <ChevronRight className="chev" aria-hidden="true" />
    </>
  );
  if (to) return <Link to={to} className="list-row pressable">{inner}</Link>;
  if (href) return <a href={href} className="list-row pressable" target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{inner}</a>;
  return <button type="button" className="list-row pressable" onClick={onClick}>{inner}</button>;
}

/** Staff: the SOS inbox, with a red count of new requests (the server decides who can open it). */
function SosInboxRow() {
  const [open, setOpen] = useState(0);
  useEffect(() => {
    let alive = true;
    staffSos("active").then((r) => { if (alive) setOpen(r.counts.open); }, () => {});
    return () => { alive = false; };
  }, []);
  return (
    <Link to="/staff/sos" className="list-row pressable" style={{ padding: 14 }}>
      <span className="lead-icon" style={{ width: 34, height: 34, color: "var(--red)" }}><LifeBuoy aria-hidden="true" /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: "block" }}>SOS inbox</b>
        <span className="tiny muted">Staff: help requests from attendees</span>
      </span>
      {open > 0 && <span className="sos-count" aria-label={`${open} new`}>{open}</span>}
      <ChevronRight className="chev" aria-hidden="true" />
    </Link>
  );
}

/** iOS SettingsSheet, most used first: notifications (the list, then the switch for message
    notifications), theme, About AtlasLink; then account, links, and sign out last. (Session
    reminders are app-only: a browser can't alert you when the web app is closed.) */
function SettingsSheet({ onClose }) {
  const a = useStore(auth);
  const t = useStore(theme);
  const user = a.user;

  const doSignOut = async () => {
    const ok = await confirmDialog({ title: "Sign out of TTFC?", message: "Your schedule and chats stay on your account. Sign in again any time.", confirm: "Sign out", destructive: true });
    if (ok) signOut();
  };
  const passes = user?.tickets?.length || 0;
  const role = user?.isAdmin || user?.role === "admin" ? " · staff" : user?.role === "volunteer" ? " · volunteer" : "";

  return (
    <Sheet open onClose={onClose} title="Settings" full>
      <div className="sheet-body stack" style={{ overflow: "auto", flex: 1, paddingBottom: 24 }}>
        <div className="settings-group">
          <Row icon={Bell} title="Notifications" to="/notifications" />
          <Row icon={BellRing} title="Notification settings" to="/profile/notifications" />
        </div>

        <section className="card stack-sm" aria-labelledby="appearance-h">
          <h2 id="appearance-h" className="eyebrow">Appearance</h2>
          <div className="theme-tiles" role="radiogroup" aria-label="Appearance">
            {["system", "light", "dark"].map((v) => {
              const Icon = THEME_ICON[v];
              return (
                <button key={v} type="button" role="radio" aria-checked={t.value === v} className="theme-tile pressable" onClick={() => setTheme(v)}>
                  <Icon aria-hidden="true" />{THEME_LABEL[v]}
                </button>
              );
            })}
          </div>
        </section>

        <div className="settings-group">
          <Row icon={Landmark} title="About AtlasLink" href={`${LINKS.website}/about`} />
        </div>

        <section className="card stack-sm" aria-labelledby="account-h">
          <h2 id="account-h" className="eyebrow">Account</h2>
          {a.mode === "demo" ? (
            <>
              <b>Demo account</b>
              <span className="tiny muted">Data stays on this device. Sign out and sign in with your TTFC account to sync passes.</span>
            </>
          ) : (
            <>
              <b>{user?.name || user?.email}</b>
              <span className="tiny muted">{user?.email}{` · ${passes} pass${passes === 1 ? "" : "es"}`}{role}</span>
              {/* No attendee-list switch: everyone is listed and only staff can hide someone (Oct 18). */}
            </>
          )}
        </section>

        <div className="settings-group">
          {/* Oct 22 2026: the App Store / Google Play apps, never the web app's Home Screen install. */}
          <Row icon={Download} title="Get the TTFC app" to="/install?from=profile" />
          <Row icon={ShieldCheck} title="Privacy Policy" to="/legal/privacy" />
          <Row icon={FileText} title="Terms of Use" to="/legal/terms" />
          <Row icon={LifeBuoy} tone="sos" title="Help & SOS" to="/help" />
          <Row icon={HelpCircle} title="Help & support" href={`mailto:${LINKS.support}?subject=${encodeURIComponent("TTFC app support")}`} />
          {a.mode === "demo" && (
            <Row icon={RotateCcw} title="Reset demo" onClick={() => { resetDemo(); loadAccount(); window.location.reload(); }} />
          )}
          <Row icon={LogOut} title={a.mode === "demo" ? "Leave the demo" : "Sign out"} onClick={doSignOut} tone="danger" />
        </div>
      </div>
    </Sheet>
  );
}

export default function Profile() {
  const a = useStore(auth);
  const s = useStore(social);
  const pts = useStore(points);
  const navigate = useNavigate();
  const [settings, setSettings] = useState(false);
  const [scan, setScan] = useState(false);
  const signedIn = isSignedIn(a);
  const me = a.me;
  const user = a.user;

  useEffect(() => { if (signedIn) refreshPoints(); }, [signedIn]);

  if (!signedIn) {
    return (
      <div className="page">
        <TopBar title="Profile" back={false} />
        <main id="main" className="pad guest-gate">
          <span className="guest-logo" role="img" aria-label="The Tech Festival Canada">
            <img src="/app/brand/logo.webp" alt="" width="182" height="90" className="logo-for-dark" />
            <img src="/app/brand/logo-dark.webp" alt="" width="182" height="104" className="logo-for-light" loading="lazy" />
          </span>
          <h1>You're browsing as a guest</h1>
          <p>Have a pass? Sign in to build your contact card, connect with attendees, save sessions and get your personalised feed.</p>
          <Button variant="primary" size="lg" block icon={LogIn} onClick={() => signOut()}>Sign in</Button>
          <GetPassCard where="profile" />
          <div className="settings-group" style={{ width: "100%", marginTop: 18 }}>
            <Row icon={ShieldCheck} title="Privacy Policy" to="/legal/privacy" />
            <Row icon={FileText} title="Terms of Use" to="/legal/terms" />
            <Row icon={LifeBuoy} tone="sos" title="Help & SOS" to="/help" />
            <Row icon={HelpCircle} title="Help & support" href={`mailto:${LINKS.support}`} />
          </div>
        </main>
      </div>
    );
  }

  const name = me?.name || user?.name || "Your profile";
  const topics = me?.topics || user?.topics || [];
  const ticket = bestTicket(user);
  const accepted = s.connections.accepted;
  const country = me?.country || user?.country || "";
  const org = me?.organization || user?.organization || "";
  const total = pts.me?.total;
  const tag = profileTagView(user?.profileTag);
  const free = availabilitySummary(me?.availabilitySlots, me?.availabilitySpots, me?.meetingSpot);

  return (
    <div className="page">
      {tag && <ProfileGlow tag={tag} />}
      {/* Points top left (as on Home), Settings top right: both always in reach. */}
      {/* The header's title is the TTFC mark (a tap pops it and scrolls to the top); "Profile" for screen readers. */}
      <TopBar title={<BrandMark />} titleLabel="Profile" back={false} brand={false}
        left={(
          <Link to="/points" className="points-pill pressable" aria-label={total != null ? `${total} festival points. Opens your points and the leaderboard` : "Festival points. Opens your points and the leaderboard"}>
            <TrophyFill />{total != null && <span className="figure">{total}</span>}
          </Link>
        )}
        right={(
          <span className="row" style={{ gap: 8 }}>
            {a.mode === "demo" && <span className="demo-pill">Demo</span>}
            <button type="button" className="gear-btn pressable" aria-label="Settings" onClick={() => setSettings(true)}><GearFill /></button>
          </span>
        )} />
      <main id="main" className="pad stack-lg" style={{ paddingTop: 8 }}>
        <section className="profile-block" aria-label="You">
          <Avatar name={name} src={fileURL(me?.avatarUrl)} size={110} />
          <div className="profile-names">
            <h1>{name}</h1>
            {me?.jobTitle && <div className="profile-title">{me.jobTitle}</div>}
            {org && <div className="profile-org">{org}</div>}
            {tag && <ProfileTagPill tag={tag} />}
            {me?.tagline && <div className="profile-tagline">“{me.tagline}”</div>}
          </div>
          <Link to="/profile/edit" className="edit-link"><Pencil aria-hidden="true" />Edit profile</Link>
          <span className="brand-hairline" aria-hidden="true" />
        </section>

        {isTeam(user) && (
          <div className="note" role="note">
            <b>{user.role === "volunteer" ? "Volunteer account" : "Staff account"}</b>
            <div className="small">Door check-in is in the TTFC app for now.</div>
          </div>
        )}
        {/* Staff tools (Oct 22 2026): the SOS inbox. The demo shows it too, with made-up requests. */}
        {(isTeam(user) || can("moderate", a) || a.mode === "demo") && <SosInboxRow />}

        {/* One strip (as on iOS and Android): the pass opens the ticket; then My QR and Scan.
            Apple devices: Add to Apple Wallet right under it, once a pass is linked. */}
        <div className="stack-sm">
          <div className="pass-strip">
            <Link to="/profile/pass" className="pass-strip-pass pressable" aria-label={ticket ? `Your pass: ${ticket.tierName}${ticket ? ", linked" : ""}` : "Your pass: not linked yet. Tap to link it"}>
              <span className="pass-strip-ico"><Ticket aria-hidden="true" /></span>
              <span style={{ minWidth: 0 }}>
                <span className="pass-strip-tier">{ticket ? ticket.tierName : "No pass yet"}{ticket && <BadgeCheck aria-hidden="true" />}</span>
                {!ticket && <span className="pass-strip-sub">Link your pass</span>}
              </span>
            </Link>
            <Link to="/profile/pass?tab=connect" className="pass-strip-btn pressable" aria-label="My connect QR"><span><QrCode aria-hidden="true" /></span>My QR</Link>
            <button type="button" className="pass-strip-btn pressable" onClick={() => setScan(true)} aria-label="Scan a badge"><span><ScanLine aria-hidden="true" /></span>Scan</button>
          </div>
          {ticket && <AppleWalletButton ticketId={ticket.ticketId} />}
        </div>

        <ContactCard org={org} country={country} />

        {/* Free to meet (iOS availabilityCard): your days and places, as people see them; a tap edits. */}
        <section className="stack-sm" aria-labelledby="free-h">
          <h2 id="free-h" className="eyebrow">Free to meet</h2>
          <Link to="/profile/availability" className="list-row pressable avail-card">
            <span className="lead-icon lead-icon--accent" style={{ width: 34, height: 34 }}><CalendarClock aria-hidden="true" /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              {free ? <AvailabilityRows slots={me.availabilitySlots} spots={me.availabilitySpots} meetingSpot={me.meetingSpot} /> : (
                <>
                  <b style={{ display: "block" }}>Set when you're free to meet</b>
                  <span className="tiny muted">Everyone on the app will see it on your profile.</span>
                </>
              )}
            </span>
            <ChevronRight className="chev" aria-hidden="true" />
          </Link>
        </section>

        <Link to="/network/connected" className="list-row pressable" style={{ padding: 14 }}>
          {accepted.length ? (
            <span className="avatar-stack" aria-hidden="true">{accepted.slice(0, 4).map((c) => <Avatar key={c.id} name={c.user?.name} src={fileURL(c.user?.avatarUrl)} size={34} ring />)}</span>
          ) : <span className="lead-icon lead-icon--accent" style={{ width: 34, height: 34 }}><Users aria-hidden="true" /></span>}
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: "block" }}>Connections</b>
            <span className="tiny muted">{accepted.length ? `${accepted.length} at TTFC · tap to view` : "Start building your TTFC network"}</span>
          </span>
          <ChevronRight className="chev" aria-hidden="true" />
        </Link>

        {/* LinkedIn (Oct 22 2026): "Tell your network you're attending · +50 points", done once posted. */}
        <AttendingRow />

        {/* Awards as a row like Connections; no counts (Oct 22 2026). */}
        <Link to="/awards" className="list-row pressable" style={{ padding: 14 }}>
          <span className="lead-icon lead-icon--accent" style={{ width: 34, height: 34 }}><Trophy aria-hidden="true" /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: "block" }}>Catalyst Awards</b>
            <span className="tiny muted">How winners are chosen, and the applications</span>
          </span>
          <ChevronRight className="chev" aria-hidden="true" />
        </Link>

        <section className="stack-sm" aria-labelledby="topics-h">
          <div className="row"><h2 id="topics-h" className="eyebrow" style={{ flex: 1 }}>Interests</h2><Link to="/profile/edit" className="small bold muted" style={{ textDecoration: "none" }}>Edit</Link></div>
          <div className="card" style={{ padding: 14, borderRadius: 14 }}>
            {topics.length ? <div className="tag-list">{topics.map((x) => <span key={x} className="chip" style={{ minHeight: 28 }}>{shortTopic(x)}</span>)}</div>
              : <p className="small muted" style={{ margin: 0 }}>No topics yet — tap Edit to pick what you're here for.</p>}
          </div>
        </section>
      </main>
      {settings && <SettingsSheet onClose={() => setSettings(false)} />}
      {scan && <Suspense fallback={null}><BadgeScanner onClose={() => setScan(false)} onConnected={() => navigate("/network/connected")} /></Suspense>}
    </div>
  );
}
