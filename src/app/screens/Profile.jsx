import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck, Bell, ChevronRight, Download, FileText, HelpCircle, Landmark, LogOut, Moon, Pencil, QrCode, RotateCcw,
  LogIn, ScanLine, ShieldCheck, Smartphone, Sun, Ticket, Trophy, Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import { auth, bestTicket, isSignedIn, isTeam, loadAccount, signOut } from "../lib/auth";
import { social } from "../lib/social";
import { pwa, promptInstall } from "../lib/pwa";
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

const BadgeScanner = lazy(() => import("../components/BadgeScanner"));

/* =========================================================
   Profile (iOS ProfileView): points (top left) and the gear
   (top right), your tile and name, the pass strip (pass,
   connect QR, Scan) with Add to Apple Wallet under it on Apple
   devices, the contact card, availability, connections, Awards,
   and Interests last. Notifications, theme, About and sign out
   are in Settings (the gear). Guests get the sign-in card.
========================================================= */

const THEME_ICON = { system: Smartphone, light: Sun, dark: Moon };

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

/** iOS SettingsSheet, most used first: notifications, theme, About AtlasLink; then account,
    links, and sign out last. (Session reminders are app-only:
    a browser can't alert you when the web app is closed.) */
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
          {!p.standalone && <Row icon={Download} title={p.installed ? "Open the installed app" : "Install the app"} onClick={install} />}
          {p.standalone && <Row icon={Smartphone} title="Find TTFC on your Home Screen" to="/install?find=1" />}
          <Row icon={ShieldCheck} title="Privacy Policy" to="/legal/privacy" />
          <Row icon={FileText} title="Terms of Use" to="/legal/terms" />
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

  return (
    <div className="page">
      {/* Points top left (as on Home), Settings top right: both always in reach. */}
      <TopBar title="Profile" back={false}
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

        {/* Awards as a row like Connections (Network, My pass and the brochure repeated the tabs and the pass strip) */}
        <a href={LINKS.awards} target="_blank" rel="noopener noreferrer" className="list-row pressable" style={{ padding: 14 }}>
          <span className="lead-icon lead-icon--accent" style={{ width: 34, height: 34 }}><Trophy aria-hidden="true" /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: "block" }}>Catalyst Awards</b>
            <span className="tiny muted">28 categories</span>
          </span>
          <ChevronRight className="chev" aria-hidden="true" />
        </a>

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
