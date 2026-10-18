import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck, Bell, Building2, ChevronRight, Download, FileText, HelpCircle, Link2, LogOut, MapPin, Moon, Pencil, QrCode, RotateCcw,
  ScanLine, Share, ShieldCheck, Smartphone, Sun, Ticket, Trophy, UserPlus, Users,
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
import { confirmDialog, safeHref, showAlert } from "../lib/ui";
import { Avatar, Button, Sheet, Switch, TopBar } from "../components/ui";
import { GearFill } from "../components/Glyphs";

const BadgeScanner = lazy(() => import("../components/BadgeScanner"));

/* =========================================================
   Profile (iOS ProfileView): the gear (settings), your tile,
   name, stats, the pass strip (pass, connect QR, Scan),
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
  const linkedin = safeHref(me?.linkedinUrl || user?.linkedinUrl);
  const topics = me?.topics || user?.topics || [];
  const ticket = bestTicket(user);
  const accepted = s.connections.accepted;
  const saved = bookmarks(s).length;
  const daysToGo = Math.max(0, Math.floor((EVENT_START.getTime() - clockNow().getTime()) / 86400000));
  const country = me?.country || user?.country || "";
  const org = me?.organization || user?.organization || "";
  const ThemeIcon = THEME_ICON[t.value] || Smartphone;

  const shareContact = async () => {
    const lines = [name];
    if (me?.jobTitle) lines.push([me.jobTitle, org].filter(Boolean).join(" · "));
    if (linkedin) lines.push(`LinkedIn: ${linkedin}`);
    lines.push("Met at The Tech Festival Canada 2026 · Toronto");
    const text = lines.join("\n");
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); showAlert("Contact copied", "Paste it into a message or email."); }
    } catch { /* cancelled */ }
  };

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

        {/* One strip (as on iOS and Android): the pass opens the ticket; then My QR and Scan */}
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

        <section className="stack-sm" aria-labelledby="contact-h">
          <h2 id="contact-h" className="eyebrow">Contact card</h2>
          <div className="card contact-card">
            {linkedin
              ? <a href={linkedin} target="_blank" rel="noopener noreferrer" className="contact-row"><Link2 aria-hidden="true" /><span>LinkedIn</span><b className="ellipsis">{linkedin.replace(/^https?:\/\/(www\.)?/, "")}</b></a>
              : <Link to="/profile/edit" className="contact-row"><Link2 aria-hidden="true" /><span>LinkedIn</span><b>Not added</b></Link>}
            <hr className="hairline" />
            <Link to="/profile/edit" className="contact-row"><Building2 aria-hidden="true" /><span>Organization</span><b className="ellipsis">{org || "—"}</b></Link>
            <hr className="hairline" />
            <Link to="/profile/edit" className="contact-row"><MapPin aria-hidden="true" /><span>Residence</span><b className="ellipsis">{country || "—"}</b></Link>
            <button type="button" className="share-contact pressable" onClick={shareContact}><Share aria-hidden="true" />Share my contact</button>
          </div>
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
