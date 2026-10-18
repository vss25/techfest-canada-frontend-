import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, Download, FileText, HelpCircle, LogOut, Moon, Pencil, QrCode, RotateCcw, ShieldCheck, Ticket, Trophy, Users, Eye, Linkedin, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStore } from "../lib/store";
import { auth, bestTicket, isSignedIn, isTeam, loadAccount, signOut } from "../lib/auth";
import { social } from "../lib/social";
import { pwa, promptInstall } from "../lib/pwa";
import { theme, setTheme } from "../lib/theme";
import { resetDemo } from "../lib/demo";
import { patch } from "../lib/api";
import { fileURL, LINKS, shortTopic } from "../lib/config";
import { passPayload } from "../lib/qr";
import { confirmDialog, safeHref, showAlert } from "../lib/ui";
import { Avatar, Button, Segmented, Switch, TopBar } from "../components/ui";

/* =========================================================
   Profile (iOS ProfileView): who you are, your pass QR, your
   topics, settings (theme, install, notifications, privacy,
   sign out). Guests get a sign-in card instead.
========================================================= */

function Row({ to, href, icon, title, subtitle, onClick, tone }) {
  const Icon = icon;
  const inner = (
    <>
      <span className="lead-icon" style={tone === "danger" ? { background: "rgba(213,43,30,.14)", color: "var(--red)" } : undefined}><Icon aria-hidden="true" /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: tone === "danger" ? "var(--red)" : undefined }}>{title}</b>
        {subtitle && <span className="tiny muted">{subtitle}</span>}
      </span>
      {(to || href) && <ChevronRight className="chev" aria-hidden="true" />}
    </>
  );
  if (to) return <Link to={to} className="list-row pressable">{inner}</Link>;
  if (href) return <a href={href} className="list-row pressable" target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{inner}</a>;
  return <button type="button" className="list-row pressable" onClick={onClick}>{inner}</button>;
}

export default function Profile() {
  const a = useStore(auth);
  const s = useStore(social);
  const p = useStore(pwa);
  const t = useStore(theme);
  const navigate = useNavigate();
  const signedIn = isSignedIn(a);
  const me = a.me;
  const user = a.user;
  const ticket = bestTicket(user);
  const accepted = s.connections.accepted.length;

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

  const toggleHidden = async (hidden) => {
    try {
      await patch("profile", { directoryHidden: hidden });
      await loadAccount();
    } catch (e) { showAlert("Couldn't save", e.message); }
  };

  const settings = (
    <section className="stack-sm" aria-labelledby="settings-h">
      <h2 id="settings-h" className="section-title">Settings</h2>
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}><Moon aria-hidden="true" style={{ width: 17, height: 17, color: "var(--pur-alt)" }} /><b style={{ fontSize: 14.5 }}>Appearance</b></div>
        <Segmented label="Appearance" value={t.value} onChange={setTheme}
          options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
      </div>
      <div className="settings-group">
        {!p.standalone && (
          <Row icon={Download} title="Install app" subtitle={p.installed ? "Already installed? Open it from your Home Screen." : "Add TTFC to your Home Screen"} onClick={install} />
        )}
        {p.standalone && <Row icon={Smartphone} title="Can't find the app later?" subtitle="How to find TTFC on your Home Screen" to="/install?find=1" />}
        {signedIn && <Row icon={Bell} title="Notifications" to="/notifications" />}
        <Row icon={ShieldCheck} title="Privacy Policy" to="/legal/privacy" />
        <Row icon={FileText} title="Terms of Use" to="/legal/terms" />
        <Row icon={HelpCircle} title="Help & support" subtitle={LINKS.support} href={`mailto:${LINKS.support}`} />
        {a.mode === "demo" && (
          <Row icon={RotateCcw} title="Reset demo" subtitle="Back to the sample data" onClick={() => { resetDemo(); loadAccount(); window.location.reload(); }} />
        )}
        {signedIn ? <Row icon={LogOut} title={a.mode === "demo" ? "Leave the demo" : "Sign out"} onClick={doSignOut} tone="danger" />
          : <Row icon={LogOut} title="Sign in" onClick={() => signOut()} />}
      </div>
    </section>
  );

  if (!signedIn) {
    return (
      <div className="page">
        <TopBar title="Profile" back={false} />
        <main id="main" className="pad mt-16 stack-lg">
          <div className="card stack" style={{ textAlign: "center", alignItems: "center" }}>
            <Eye aria-hidden="true" style={{ width: 30, height: 30, color: "var(--pur-alt)" }} />
            <h1 style={{ fontSize: 20, margin: 0 }}>You're browsing as a guest</h1>
            <p className="muted" style={{ margin: 0 }}>Sign in with your pass to build a contact card, connect with attendees, save sessions to your account, and unlock your feed.</p>
            <Button variant="primary" size="lg" block onClick={() => signOut()}>Sign up / Sign in</Button>
          </div>
          {settings}
        </main>
      </div>
    );
  }

  const linkedin = safeHref(me?.linkedinUrl || user?.linkedinUrl);
  const topics = me?.topics || user?.topics || [];
  return (
    <div className="page">
      <TopBar title="Profile" back={false} right={a.mode === "demo" ? <span className="demo-pill">Demo</span> : null} />
      <main id="main" className="pad mt-16 stack-lg">
        <section className="stack" style={{ alignItems: "center", textAlign: "center" }}>
          <Avatar name={me?.name || user?.name} src={fileURL(me?.avatarUrl)} size={96} />
          <div>
            <h1 style={{ fontSize: 23, margin: 0 }}>{me?.name || user?.name || "Your profile"}</h1>
            {(me?.jobTitle || me?.organization) && <div className="muted">{[me.jobTitle, me.organization].filter(Boolean).join(" · ")}</div>}
            {me?.tagline && <div className="small" style={{ marginTop: 4 }}>“{me.tagline}”</div>}
          </div>
          <div className="row">
            <Link to="/profile/edit" className="btn btn-sm"><Pencil aria-hidden="true" />Edit profile</Link>
            {linkedin && <a href={linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-sm"><Linkedin aria-hidden="true" />LinkedIn</a>}
          </div>
        </section>

        <Link to="/profile/pass" className="pass-card card-link pressable" aria-label="Your pass. Opens the QR code for the door">
          <div className="row">
            <Ticket aria-hidden="true" style={{ width: 18, height: 18 }} />
            <b style={{ flex: 1 }}>Your pass</b>
            <span className="small" style={{ opacity: 0.85 }}>TTFC 2026 · Oct 26–27</span>
          </div>
          {ticket ? (
            <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
              <div style={{ background: "#fff", borderRadius: 10, padding: 6, lineHeight: 0 }}><QRCodeSVG value={passPayload(ticket.ticketId)} size={72} level="M" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{ticket.tierName}</div>
                <div className="pass-id small" style={{ opacity: 0.9 }}>LINKED · {ticket.ticketId.toUpperCase()}</div>
                <div className="tiny" style={{ opacity: 0.85, marginTop: 4 }}>Tap to show your QR at the door</div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10 }} className="small">No pass linked to this account yet. Tap to link one.</div>
          )}
        </Link>

        {isTeam(user) && (
          <div className="note" role="note">
            <b>{user.role === "volunteer" ? "Volunteer account" : "Staff account"}</b>
            <div className="small">Door check-in is in the TTFC app for now.</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <Link to="/network/connected" className="list-row pressable" style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", gap: 4 }}>
            <Users aria-hidden="true" style={{ width: 18, height: 18, color: "var(--pur-alt)" }} />
            <b style={{ fontSize: 14 }}>Network</b><span className="tiny muted">{accepted} connection{accepted === 1 ? "" : "s"}</span>
          </Link>
          <Link to="/profile/pass?tab=connect" className="list-row pressable" style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", gap: 4 }}>
            <QrCode aria-hidden="true" style={{ width: 18, height: 18, color: "var(--pur-alt)" }} />
            <b style={{ fontSize: 14 }}>Connect QR</b><span className="tiny muted">Meet in person</span>
          </Link>
          <a href={LINKS.awards} target="_blank" rel="noopener noreferrer" className="list-row pressable" style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", gap: 4 }}>
            <Trophy aria-hidden="true" style={{ width: 18, height: 18, color: "var(--pur-alt)" }} />
            <b style={{ fontSize: 14 }}>Awards</b><span className="tiny muted">28 categories</span>
          </a>
        </div>

        <section className="stack-sm" aria-labelledby="topics-h">
          <div className="row"><h2 id="topics-h" className="section-title" style={{ flex: 1 }}>My topics</h2><Link to="/profile/edit" className="link-btn" style={{ padding: 0, minHeight: 0 }}>Edit</Link></div>
          {topics.length ? <div className="tag-list">{topics.map((x) => <span key={x} className="tag">{shortTopic(x)}</span>)}</div>
            : <p className="small muted" style={{ margin: 0 }}>No topics yet. Tap Edit to pick what you're here for.</p>}
        </section>

        <section className="card" aria-label="Directory">
          <Switch
            label="Show me in the attendee list"
            description="Name, title, company and pass only. Never your email."
            checked={!user?.directoryHidden}
            onChange={(on) => toggleHidden(!on)}
          />
          <div className="tiny muted">{user?.email || me?.email}{user?.tickets ? ` · ${user.tickets.length} pass${user.tickets.length === 1 ? "" : "es"}` : ""}</div>
        </section>

        {settings}
      </main>
    </div>
  );
}
