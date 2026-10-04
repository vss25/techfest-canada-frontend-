import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { LogOut, ShieldX } from "lucide-react";

import "../admin/admin.css";
import AdminShell from "../admin/AdminShell";
import Toaster from "../admin/Toaster";
import { AdminContext } from "../admin/adminContext";
import { adminFetch, signOut } from "../admin/api";
import { Button, ErrorState, Spinner } from "../admin/ui";

import Overview from "../admin/sections/Overview";
import Legacy from "../admin/sections/Legacy";
import Speakers from "../admin/cms/Speakers";
import LogoCollection from "../admin/cms/LogoCollection";
import SiteSettings from "../admin/cms/SiteSettings";
import AppOverview from "../admin/app/AppOverview";
import People from "../admin/app/People";
import Person from "../admin/app/Person";
import LiveActivity from "../admin/app/LiveActivity";
import Moderation from "../admin/app/Moderation";
import AppText from "../admin/app/AppText";
import Broadcast from "../admin/app/Broadcast";
import AuditLog from "../admin/app/AuditLog";
import StaffAccounts from "../admin/staff/StaffAccounts";
import KillSwitch from "../admin/staff/KillSwitch";
import TicketManager from "../admin/tickets/TicketManager";
import SalesAnalytics from "../admin/tickets/SalesAnalytics";

// Existing admin features — wrapped and restyled, logic unchanged.
import AdminInventory from "../components/AdminInventory";
import CheckIn from "../components/CheckIn";
import AdminNominations from "../components/AdminNominations";

const T = "Tickets & attendees";
const M = "Marketing";

/** The panel is always dark: existing components read body.dark-mode. */
function useAdminBody() {
  useEffect(() => {
    const body = document.body;
    const hadDark = body.classList.contains("dark-mode");
    body.classList.add("dark-mode", "ttfc-admin-open");
    return () => {
      body.classList.remove("ttfc-admin-open");
      if (!hadDark) body.classList.remove("dark-mode");
    };
  }, []);
}

function FullScreen({ children }) {
  return <div className="ttfc-admin flex min-h-screen items-center justify-center p-6">{children}</div>;
}

export default function Admin() {
  useAdminBody();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState(null);
  const [kill, setKill] = useState(null);
  const [killNonce, setKillNonce] = useState(0);

  const handleSignOut = useCallback(() => {
    signOut();
    navigate("/admin-login", { replace: true });
  }, [navigate]);

  // Who's signed in
  useEffect(() => {
    let alive = true;
    adminFetch("/auth/me").then(
      (u) => { if (alive) setMe(u || {}); },
      (err) => { if (alive) setMeError(err); },
    );
    return () => { alive = false; };
  }, []);

  // Expired / invalid session anywhere → back to sign-in
  useEffect(() => {
    const onUnauthorized = () => {
      signOut();
      navigate("/admin-login", { replace: true, state: { expired: true } });
    };
    window.addEventListener("ttfc:admin-unauthorized", onUnauthorized);
    return () => window.removeEventListener("ttfc:admin-unauthorized", onUnauthorized);
  }, [navigate]);

  // Website / app status for the top bar (every 60 s)
  useEffect(() => {
    if (me?.role !== "admin") return undefined;
    let alive = true;
    const load = () => adminFetch("/console/kill-switch").then((s) => alive && setKill(s), () => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [me, killNonce]);

  const ctx = useMemo(() => ({ me, kill, setKill, reloadKill: () => setKillNonce((n) => n + 1) }), [me, kill]);

  if (meError) {
    return (
      <FullScreen>
        <div className="w-full max-w-md">
          <ErrorState error={meError} title="Couldn't check your account" onRetry={() => window.location.reload()} />
          <div className="mt-4 text-center"><Button variant="ghost" icon={LogOut} onClick={handleSignOut}>Sign out</Button></div>
        </div>
      </FullScreen>
    );
  }
  if (!me) {
    return (
      <FullScreen>
        <div className="flex flex-col items-center gap-3 text-sm text-ttfc-muted" role="status"><Spinner className="h-7 w-7" /> Opening the staff panel…</div>
      </FullScreen>
    );
  }
  if (me.role !== "admin") {
    return (
      <FullScreen>
        <div className="w-full max-w-md rounded-[22px] border border-ttfc-line bg-ttfc-panel p-8 text-center">
          <ShieldX className="mx-auto mb-4 h-10 w-10 text-ttfc-pink" aria-hidden="true" />
          <h1 className="text-xl font-bold">This account isn't staff</h1>
          <p className="mt-2 text-sm text-ttfc-muted">
            You're signed in as {me.email || "a non-staff account"}. Ask an admin to give you access under Staff accounts.
          </p>
          <Button className="mt-6" variant="primary" icon={LogOut} onClick={handleSignOut}>Sign in with another account</Button>
        </div>
      </FullScreen>
    );
  }

  return (
    <AdminContext.Provider value={ctx}>
      <Toaster>
        <AdminShell me={me} kill={kill} onSignOut={handleSignOut}>
          <Routes>
            <Route index element={<Overview />} />

            <Route path="attendees" element={<TicketManager />} />
            <Route path="inventory" element={<Legacy eyebrow={T} title="Inventory" description="Passes left of each type, and pricing."><AdminInventory /></Legacy>} />
            <Route path="check-in" element={<Legacy eyebrow={T} title="Check-in" description="Point the camera at a ticket's QR code to check the attendee in. Allow camera access when your browser asks."><CheckIn /></Legacy>} />
            <Route path="analytics" element={<SalesAnalytics />} />

            <Route path="nominations" element={<Legacy eyebrow={M} title="Nominations" description="Catalyst Awards nominations."><AdminNominations /></Legacy>} />

            <Route path="content" element={<Navigate to="/admin/content/speakers" replace />} />
            <Route path="content/speakers" element={<Speakers />} />
            <Route path="content/partners" element={
              <LogoCollection key="partner" type="partner" title="Partners" singular="partner" withCategory
                description="Partner logos on the Partners page, grouped by category. Switch a logo off to hide it without deleting it." />
            } />
            <Route path="content/sponsors" element={
              <LogoCollection key="sponsor" type="sponsor" title="Sponsors" singular="sponsor"
                description="The sponsor logo strip on the Home, Sponsors, Sponsor and Awards pages." />
            } />
            <Route path="content/sponsor-marquee" element={
              <LogoCollection key="sponsorMarquee" type="sponsorMarquee" title="Sponsor marquee" singular="logo"
                description="The scrolling logo strip on the Home and Speakers pages." />
            } />
            <Route path="content/home-sponsors" element={
              <LogoCollection key="homeSponsor" type="homeSponsor" title="Home sponsors" singular="home sponsor"
                description="Home sponsor logos." />
            } />
            <Route path="content/settings" element={<SiteSettings />} />

            <Route path="app" element={<AppOverview />} />
            <Route path="app/people" element={<People />} />
            <Route path="app/people/:id" element={<Person />} />
            <Route path="app/activity" element={<LiveActivity />} />
            <Route path="app/moderation" element={<Moderation />} />
            <Route path="app/text" element={<AppText />} />
            <Route path="app/broadcast" element={<Broadcast />} />
            <Route path="app/audit" element={<AuditLog />} />

            <Route path="staff" element={<StaffAccounts />} />
            <Route path="kill-switch" element={<KillSwitch />} />

            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </AdminShell>
      </Toaster>
    </AdminContext.Provider>
  );
}
