import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";
import "./jury.css";
import { SIGNED_OUT_EVENT, clearJuryToken, getJuryToken, jury } from "./api";
import SignIn from "./SignIn";
import Home from "./Home";
import Nominee from "./Nominee";
import { Button, Modal, Spinner, Toast } from "./ui";

/* =========================================================
   thetechfestival.com/awards/jury-admin: the Catalyst Awards
   jury portal (Oct 2026). Not in any menu, noindex. Light only:
   the page takes the site out of dark mode while it's open
   (and keeps it out if the system switches), and every colour
   is set here (jury.css), whatever the site or the system says.
     /awards/jury-admin          home (progress, the list)
     /awards/jury-admin/n/:id    one nominee and its assessment
   Backend: /api/jury (routes/jury.js), jury tokens only.
========================================================= */

export const JURY_BASE = "/awards/jury-admin";

const setMeta = (name, content) => {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  const created = !el;
  const before = el?.getAttribute("content");
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.append(el); }
  el.setAttribute("content", content);
  return () => { if (created) el.remove(); else el.setAttribute("content", before ?? ""); };
};

/** Light page while the portal is open: no dark mode, light browser chrome, noindex. Everything is put back after. */
function useLightPage() {
  useLayoutEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const hadDark = body.classList.contains("dark-mode");
    const theme = html.getAttribute("data-theme");
    const scheme = html.style.colorScheme;
    const title = document.title;
    const keepLight = () => {
      if (body.classList.contains("dark-mode")) body.classList.remove("dark-mode");
      if (html.getAttribute("data-theme") !== "light") html.setAttribute("data-theme", "light");
    };
    body.classList.add("ttfc-jury-open");
    html.style.colorScheme = "light";
    keepLight();
    const obs = new MutationObserver(keepLight);
    obs.observe(body, { attributes: true, attributeFilter: ["class"] });
    obs.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    const undo = [setMeta("robots", "noindex, nofollow"), setMeta("color-scheme", "light only"), setMeta("theme-color", "#ffffff")];
    document.title = "Jury · Catalyst Awards · TTFC 2026";
    return () => {
      obs.disconnect();
      undo.forEach((f) => f());
      body.classList.remove("ttfc-jury-open");
      if (hadDark) body.classList.add("dark-mode");
      if (theme) html.setAttribute("data-theme", theme); else html.removeAttribute("data-theme");
      html.style.colorScheme = scheme;
      document.title = title;
    };
  }, []);
}

function AccountDialog({ open, onClose, me, onSignOut }) {
  return (
    <Modal open={open} onClose={() => onClose(false)} title={me?.juror?.name || "Your account"} description={me?.juror?.email}
      footer={<Button icon={LogOut} onClick={onSignOut}>Sign out</Button>}>
      <p className="j-hint">You sign in with a one-time 6-digit code sent to this email address. There's no password to remember.</p>
    </Modal>
  );
}

export default function JuryPortal() {
  useLightPage();
  const { pathname } = useLocation();
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(() => (getJuryToken() ? "checking" : "signed-out"));
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState("");
  const [account, setAccount] = useState(false);
  const clearToast = useCallback(() => setToast(""), []);

  const loadMe = useCallback(() => jury.get("/me").then(
    (m) => { setMe(m); setStatus("in"); },
    (err) => {
      if (err.status === 401) { setStatus("signed-out"); return; }
      setNotice(err.message);
      setStatus(getJuryToken() ? "error" : "signed-out");
    },
  ), []);

  useEffect(() => {
    if (status !== "checking") return;
    jury.get("/me").then(
      (m) => { setMe(m); setStatus("in"); },
      (err) => {
        if (err.status === 401) { setStatus("signed-out"); return; }
        setNotice(err.message);
        setStatus(getJuryToken() ? "error" : "signed-out");
      },
    );
  }, [status]);
  useEffect(() => {
    const out = (e) => { setMe(null); setStatus("signed-out"); setNotice(e.detail?.message || "Your session has ended. Please sign in again."); };
    window.addEventListener(SIGNED_OUT_EVENT, out);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, out);
  }, []);
  // Each page starts at the top (signing in too).
  useEffect(() => { window.scrollTo(0, 0); }, [pathname, status]);

  const signOut = () => {
    clearJuryToken();
    setAccount(false);
    setMe(null);
    setNotice("You've signed out.");
    setStatus("signed-out");
  };

  return (
    <div className="jury">
      <a href="#j-main" className="j-skip">Skip to content</a>
      <header className="j-header">
        <div className="j-header-inner">
          <Link to={JURY_BASE} className="j-brand" aria-label="Catalyst Awards jury: home">
            <span className="j-brand-mark">TTFC 2026</span>
            <span className="j-brand-name">Catalyst Awards <span className="j-brand-sep">·</span> Jury</span>
          </Link>
          {status === "in" && me && (
            <button type="button" className="j-account" onClick={() => setAccount(true)} aria-haspopup="dialog" aria-label={`Your account: ${me.juror.name}`}>
              <UserRound className="j-ico" aria-hidden="true" />
              <span className="j-account-name">{me.juror.name}</span>
            </button>
          )}
        </div>
      </header>

      <main id="j-main" className="j-main" tabIndex={-1}>
        {status === "checking" && <div className="j-loading" role="status"><Spinner /> Opening the jury portal…</div>}
        {status === "error" && (
          <div className="j-card j-center-card" role="alert">
            <p className="j-strong">Couldn't open the jury portal</p>
            <p className="j-muted">{notice}</p>
            <div className="j-row-center">
              <Button onClick={() => setStatus("checking")}>Try again</Button>
              <Button variant="ghost" onClick={signOut}>Sign out</Button>
            </div>
          </div>
        )}
        {status === "signed-out" && (
          <SignIn notice={notice} onSignedIn={() => { setNotice(""); setStatus("checking"); }} />
        )}
        {status === "in" && me && (
          <Routes>
            <Route index element={<Home juror={me.juror} basePath={JURY_BASE} />} />
            <Route path="n/:id" element={<Nominee basePath={JURY_BASE} onToast={setToast} />} />
            <Route path="*" element={<Navigate to={JURY_BASE} replace />} />
          </Routes>
        )}
      </main>

      <footer className="j-footer">
        <p>The Catalyst Awards at The Tech Festival Canada 2026 · Questions? <a href="mailto:enquire@thetechfestival.com">enquire@thetechfestival.com</a></p>
      </footer>

      <AccountDialog open={account} me={me} onSignOut={signOut}
        onClose={(changed) => { setAccount(false); if (changed) loadMe(); }} />
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
