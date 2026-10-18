import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck, Bell, ChevronRight, Download, FileText, HelpCircle, LogOut, Moon, Pencil, QrCode, RotateCcw,
  ScanLine, ShieldCheck, Smartphone, Sun, Ticket, Trophy, UserPlus, Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import { auth, bestTicket, isSignedIn, isTeam, loadAccount, signOut } from "../lib/auth";
import { bookmarks, social } from "../lib/social";
import { pwa, promptInstall } from "../lib/pwa";
import { theme, setTheme, THEME_LABEL } from "../lib/theme";
import { resetDemo } from "../lib/demo";
import { patch } from "../lib/api";
import { fileURL, LINKS, shortTopic } from "../lib/config";
import { EVENT_START, now as clockNow } from "../lib/time";
import { confirmDialog, showAlert } from "../lib/ui";
import { Avatar, Button, Sheet, Switch, TopBar } from "../components/ui";
import { GearFill } from "../components/Glyphs";
import ContactCard from "../components/ContactCard";

const BadgeScanner = lazy(() => import("../components/BadgeScanner"));

/* =========================================================
   Profile (iOS ProfileView): the gear (settings), your tile,
   name and pills, stats, the pass, your connect QR and Scan,
   the contact card, connections, quick links, topics, then
   points, notifications, theme and sign out. Guests get the
   sign-in card.
========================================================= */

const THEME_ICON = { system: Smartphone, light: Sun, dark: Moon };
const NEXT_THEME = { system: "dark", dark: "light", light: "system" };

function Row({ to, href, icon, title, onClick, tone }) {
  const Icon = icon;
  const inner = (
    <>
      <span className="lead-icon" style={tone === "danger" ? { color: "var(--red)" } : undefined}><Icon aria-hidden="true" /></span>
      <b style={{ flex: 1, minWidth: 0, color: tone === "danger" ? "var(--red)" : undefined }}>{title}</b>
      <ChevronRight className="chev" aria-hidden="true" />
    </>
  );
  if (to) return <Link to={to} className="list-row pressable">{inner}</Link>;
  if (href) return <a href={href} className="list-row pressable" target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{inner}</a>;
  return <button type="button" className="list-row pressable" onClick={onClick}>{inner}</button>;
}

/** iOS SettingsSheet: appearance, account (and the attendee-list switch), then links. */
function SettingsSheet({ onClose }) {
  const a = useStore(auth);
  const p = useStore(pwa);
  const t = useStore(theme);
  const navigate = useNavigate();
  const user = a.user;

  const install = async () => {
    if (p.canPrompt) {
      const outcome = await promptInstall();
      if (outcome === "unavailable") navigate("/install?from=profile");
      return;
    }
    navigate("/install?from=profile");
  };
  const toggleHidden = async (hidden) => {
    try {
      await patch("profile", { directoryHidden: hidden });
      await loadAccount();
    } catch (e) { showAlert("Couldn't save", e.message); }
  };
  const passes = user?.tickets?.length || 0;
  const role = user?.isAdmin || user?.role === "admin" ? " · staff" : user?.role === "volunteer" ? " · volunteer" : "";

  return (
    <Sheet open onClose={onClose} title="Settings" full>
      <div className="sheet-body stack" style={{ overflow: "auto", flex: 1, paddingBottom: 24 }}>
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
              <Switch label="Show me in the attendee list" description="Name, title, company and pass only. Never your email."
                checked={!user?.directoryHidden} onChange={(on) => toggleHidden(!on)} />
            </>
          )}
        </section>

        <div className="settings-group">
          {!p.standalone && <Row icon={Download} title={p.installed ? "Open the installed app" : "Install the app"} onClick={install} />}
          {p.standalone && <Row icon={Smartphone} title="Find TTFC on your Home Screen" to="/install?find=1" />}
          <Row icon={Trophy} title="Catalyst Awards" href={LINKS.awards} />
          <Row icon={FileText} title="Brochure" href={LINKS.brochure} />
          <Row icon={ShieldCheck} title="Privacy Policy" to="/legal/privacy" />
          <Row icon={FileText} title="Terms of Use" to="/legal/terms" />
          <Row icon={HelpCircle} title="Help & support" href={`mailto:${LINKS.support}?subject=${encodeURIComponent("TTFC app support")}`} />
          {a.mode === "demo" && (
            <Row icon={RotateCcw} title="Reset demo" onClick={() => { resetDemo(); loadAccount(); window.location.reload(); }} />
          )}
        </div>
      </div>
    </Sheet>
  );
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <b className="figure">{value}</b>
      <span>{label}</span>
    </div>
  );
}

export default function Profile() {
  const a = useStore(auth);
  const s = useStore(social);
  const t = useStore(theme);
  const navigate = useNavigate();
  const [settings, setSettings] = useState(false);
  const [scan, setScan] = useState(false);
  const signedIn = isSignedIn(a);
  const me = a.me;
  const user = a.user;

  const doSignOut = async () => {
    const ok = await confirmDialog({ title: "Sign out of TTFC?", message: "Your schedule and chats stay on your account. Sign in again any time.", confirm: "Sign out", destructive: true });
    if (ok) signOut();
  };

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
          <p>Create your free profile to build a contact card, connect with attendees, save sessions, and unlock your personalised feed.</p>
          <Button variant="primary" size="lg" block icon={UserPlus} onClick={() => signOut()}>Sign up / Sign in</Button>
          <div className="settings-group" style={{ width: "100%", marginTop: 18 }}>
            <Row icon={ShieldCheck} title="Privacy Policy" to="/legal/privacy" />
            <Row icon={FileText} title="Terms of Use" to="/legal/terms" />
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
  const saved = bookmarks(s).length;
  const daysToGo = Math.max(0, Math.floor((EVENT_START.getTime() - clockNow().getTime()) / 86400000));
  const country = me?.country || user?.country || "";
  const org = me?.organization || user?.organization || "";
  const ThemeIcon = THEME_ICON[t.value] || Smartphone;

  return (
    <div className="page">
      <TopBar title="Profile" back={false} right={a.mode === "demo" ? <span className="demo-pill">Demo</span> : null} />
      <main id="main" className="pad stack-lg" style={{ paddingTop: 8 }}>
        <section className="profile-block" aria-label="You">
          <div className="profile-gear">
            <button type="button" className="gear-btn pressable" aria-label="Settings" onClick={() => setSettings(true)}><GearFill /></button>
          </div>
          <Avatar name={name} src={fileURL(me?.avatarUrl)} size={110} />
          <div className="profile-names">
            <h1>{name}</h1>
            {me?.jobTitle && <div className="profile-title">{me.jobTitle}</div>}
            {org && <div className="profile-org">{org}</div>}
            {me?.tagline && <div className="profile-tagline">“{me.tagline}”</div>}
          </div>
          <Link to="/profile/edit" className="edit-link"><Pencil aria-hidden="true" />Edit profile</Link>
        </section>

        {isTeam(user) && (
          <div className="note" role="note">
            <b>{user.role === "volunteer" ? "Volunteer account" : "Staff account"}</b>
            <div className="small">Door check-in is in the TTFC app for now.</div>
          </div>
        )}

        <div className="stats">
          <Stat value={accepted.length} label="Connections" />
          <Stat value={saved} label="Saved" />
          <Stat value={daysToGo} label="Days to go" />
        </div>

        <Link to="/profile/pass" className="pass-cta pressable" aria-label={ticket ? `Your pass: ${ticket.tierName}. Opens the QR code for the door` : "Your pass: not linked yet. Tap to link it"}>
          <QrCode aria-hidden="true" className="pass-cta-qr" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="pass-cta-label">Your pass</span>
            <span className="pass-cta-tier">{ticket ? ticket.tierName : "No pass yet"}</span>
            {ticket
              ? <span className="pass-cta-id"><BadgeCheck aria-hidden="true" />LINKED · {ticket.ticketId.toUpperCase()}</span>
              : <span className="pass-cta-id" style={{ fontWeight: 600 }}>Not linked yet — tap to link your real pass</span>}
          </span>
          <ChevronRight aria-hidden="true" className="pass-cta-chev" />
        </Link>

        <div className="row" style={{ gap: 10, alignItems: "stretch" }}>
          <Link to="/profile/pass?tab=connect" className="connect-row pressable">
            <span className="connect-ico"><QrCode aria-hidden="true" /></span>
            <span><b>My connect QR</b><small>Show to connect in person</small></span>
          </Link>
          <button type="button" className="scan-tile pressable" onClick={() => setScan(true)} aria-label="Scan a badge">
            <ScanLine aria-hidden="true" /><span>SCAN</span>
          </button>
        </div>

        <section className="stack-sm" aria-labelledby="contact-h">
          <h2 id="contact-h" className="eyebrow">Contact card</h2>
          <ContactCard org={org} country={country} />
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

        <div className="quick-grid">
          <Link to="/network/connected" className="quick pressable"><span className="quick-ico"><Users aria-hidden="true" /></span><span className="row"><b>Network</b><span className="spacer" /><b className="accent-text tiny">{accepted.length}</b></span></Link>
          <Link to="/profile/pass" className="quick pressable"><span className="quick-ico"><Ticket aria-hidden="true" /></span><b>My pass</b>{ticket && <small>{ticket.tierName}</small>}</Link>
          <a href={LINKS.brochure} target="_blank" rel="noopener noreferrer" className="quick pressable"><span className="quick-ico"><FileText aria-hidden="true" /></span><b>Brochure</b></a>
          <a href={LINKS.awards} target="_blank" rel="noopener noreferrer" className="quick pressable"><span className="quick-ico"><Trophy aria-hidden="true" /></span><b>Awards</b><small>28 categories</small></a>
        </div>

        <section className="stack-sm" aria-labelledby="topics-h">
          <div className="row"><h2 id="topics-h" className="eyebrow" style={{ flex: 1 }}>My topics</h2><Link to="/profile/edit" className="small bold muted" style={{ textDecoration: "none" }}>Edit</Link></div>
          <div className="card" style={{ padding: 14, borderRadius: 14 }}>
            {topics.length ? <div className="tag-list">{topics.map((x) => <span key={x} className="chip" style={{ minHeight: 28 }}>{shortTopic(x)}</span>)}</div>
              : <p className="small muted" style={{ margin: 0 }}>No topics yet — tap Edit to pick what you're here for.</p>}
          </div>
        </section>

        <div className="settings-group">
          <Row icon={Trophy} title="Points & leaderboard" to="/points" />
          <Row icon={Bell} title="Notifications" to="/notifications" />
          <Row icon={ThemeIcon} title={`Theme · ${THEME_LABEL[t.value]}`} onClick={() => setTheme(NEXT_THEME[t.value] || "system")} />
          <Row icon={LogOut} title={a.mode === "demo" ? "Leave the demo" : "Sign out"} onClick={doSignOut} tone="danger" />
        </div>
      </main>
      {settings && <SettingsSheet onClose={() => setSettings(false)} />}
      {scan && <Suspense fallback={null}><BadgeScanner onClose={() => setScan(false)} onConnected={() => navigate("/network/connected")} /></Suspense>}
    </div>
  );
}
