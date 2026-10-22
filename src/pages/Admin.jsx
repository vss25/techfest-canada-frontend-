import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { LogOut, ShieldX } from "lucide-react";

import "../admin/admin.css";
import AdminShell from "../admin/AdminShell";
import Toaster from "../admin/Toaster";
import { AdminContext } from "../admin/adminContext";
import { adminFetch, signOut, PASSWORD_REQUIRED } from "../admin/api";
import { Button, ErrorState, ManagementOnly, Spinner } from "../admin/ui";

import Overview from "../admin/sections/Overview";
import Legacy from "../admin/sections/Legacy";
import Speakers from "../admin/cms/Speakers";
import AgendaAdmin from "../admin/cms/Agenda";
import LogoCollection from "../admin/cms/LogoCollection";
import SiteSettings from "../admin/cms/SiteSettings";
import AttendingOrgs from "../admin/cms/AttendingOrgs";
import AppOverview from "../admin/app/AppOverview";
import People from "../admin/app/People";
import Person from "../admin/app/Person";
import LiveActivity from "../admin/app/LiveActivity";
import Moderation from "../admin/app/Moderation";
import AppText from "../admin/app/AppText";
import AppRights from "../admin/app/AppRights";
import Broadcast from "../admin/app/Broadcast";
import AuditLog from "../admin/app/AuditLog";
import PwaInstalls from "../admin/app/PwaInstalls";
import StaffAccounts from "../admin/staff/StaffAccounts";
import KillSwitch from "../admin/staff/KillSwitch";
import TicketManager from "../admin/tickets/TicketManager";
import SpeakerPasses from "../admin/tickets/SpeakerPasses";
import IssuedPasses, { ExhibitorPasses } from "../admin/tickets/IssuedPasses";
import PurchaseEmail from "../admin/tickets/PurchaseEmail";
import SalesAnalytics from "../admin/tickets/SalesAnalytics";
import Inventory from "../admin/tickets/Inventory";
import EmailTracking from "../admin/staff/EmailTracking";
import MyAccount from "../admin/staff/MyAccount";
import BrochureDownloads from "../admin/leads/BrochureDownloads";
import IndiaPavilion from "../admin/leads/IndiaPavilion";
import FormSubmissions from "../admin/leads/FormSubmissions";
import Rsvps from "../admin/leads/Rsvps";
import CatalystNominations from "../admin/awards/CatalystNominations";
import JuryJurors from "../admin/awards/JuryJurors";
import JuryAllocation from "../admin/awards/JuryAllocation";
import JuryRubric from "../admin/awards/JuryRubric";
import JuryResults from "../admin/awards/JuryResults";
import AttendingCampaign from "../admin/marketing/AttendingCampaign";
import AppInvite from "../admin/app/AppInvite";
import RsvpReminders from "../admin/marketing/RsvpReminders";
import PeopleDirectory from "../admin/people/PeopleDirectory";
import PersonProfile from "../admin/people/PersonProfile";

// Existing admin features — wrapped and restyled, logic unchanged.
import CheckIn from "../components/CheckIn";

const EVENT_DAY = "Event day"; // the sidebar section (admin/nav.js)
const LOGO_STRIPS = "More › Logo strips";

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
  const [access, setAccess] = useState(null); // { staffRole, isManagement }

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

  // Access level: "management" sees everything; "staff" doesn't see sales, money, promo codes or staff settings.
  useEffect(() => {
    if (me?.role !== "admin") return undefined;
    let alive = true;
    adminFetch("/console/me").then(
      (a) => { if (alive) setAccess({ staffRole: a.staffRole || (a.isManagement ? "management" : "staff"), isManagement: !!a.isManagement }); },
      (err) => {
        // Signed in with an emailed code: the panel wants the password (handled below).
        if (!alive || err?.code === PASSWORD_REQUIRED) return;
        // Older servers without access levels: show everything (the server still enforces its own rules).
        setAccess({ staffRole: err?.status === 404 ? "management" : "staff", isManagement: err?.status === 404 });
      },
    );
    return () => { alive = false; };
  }, [me]);

  // Expired / invalid session anywhere → back to sign-in
  useEffect(() => {
    const onUnauthorized = () => {
      signOut();
      navigate("/admin-login", { replace: true, state: { expired: true } });
    };
    // Signed in elsewhere with an emailed code (apps, website): fine for the rest of the site,
    // but the panel only takes a password sign-in. They stay signed in to the site.
    const onPasswordRequired = () => navigate("/admin-login", { replace: true, state: { passwordRequired: true } });
    window.addEventListener("ttfc:admin-unauthorized", onUnauthorized);
    window.addEventListener("ttfc:admin-password-required", onPasswordRequired);
    return () => {
      window.removeEventListener("ttfc:admin-unauthorized", onUnauthorized);
      window.removeEventListener("ttfc:admin-password-required", onPasswordRequired);
    };
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

  const isManagement = !!access?.isManagement;
  const ctx = useMemo(() => ({ me, kill, setKill, reloadKill: () => setKillNonce((n) => n + 1), access, isManagement }), [me, kill, access, isManagement]);

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
  if (!me || (me.role === "admin" && !access)) {
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

            <Route path="people" element={<PeopleDirectory />} />
            <Route path="people/:id" element={<PersonProfile />} />
            <Route path="attendees" element={<TicketManager />} />
            <Route path="speaker-passes" element={<SpeakerPasses />} />
            <Route path="purchase-email" element={<PurchaseEmail />} />
            <Route path="issued-passes" element={<IssuedPasses />} />
            <Route path="exhibitor-passes" element={<ExhibitorPasses />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="check-in" element={<Legacy eyebrow={EVENT_DAY} title="Check-in" description="Point the camera at a ticket's QR code to check the attendee in. Allow camera access when your browser asks."><CheckIn /></Legacy>} />
            <Route path="analytics" element={<ManagementOnly><SalesAnalytics /></ManagementOnly>} />

            <Route path="content" element={<Navigate to="/admin/content/speakers" replace />} />
            <Route path="content/agenda" element={<AgendaAdmin />} />
            <Route path="content/speakers" element={<Speakers />} />
            <Route path="content/partners" element={
              <LogoCollection key="partner" type="partner" title="Partners" singular="partner" withCategory
                description="Partner logos on the Partners page and in the apps' Organisations, grouped by category. Partners in the Featured Partners row are the paid partners (also on the Featured Partners page). Each partner has its own website and app switches; Active off hides it everywhere without deleting it." />
            } />
            <Route path="content/sponsors" element={
              <LogoCollection key="sponsors" type="partner" title="Featured Partners" singular="Featured Partner" withCategory sponsorsOnly
                description="The paid partners: the Featured Partners row on the Partners page, and the Featured Partners section shown first in the apps' Organisations. These are the same records as on the Partners page, so the website and the apps always read one copy. Add a description and choose where each one shows." />
            } />
            <Route path="content/organisations" element={<AttendingOrgs />} />
            <Route path="content/alumni-logos" element={
              <LogoCollection key="sponsor" type="sponsor" title="Team alumni" singular="logo" eyebrow={LOGO_STRIPS}
                description={'The "Our team includes alumni from" logo strip on the Home and Sponsors pages. These aren\'t the paid partners: those are under Website & app › Featured Partners.'} />
            } />
            <Route path="content/sponsor-marquee" element={
              <LogoCollection key="sponsorMarquee" type="sponsorMarquee" title="Community & speakers' companies" singular="logo" eyebrow={LOGO_STRIPS}
                description={'The scrolling logo strips: "Our Community" on the Home page and "Where our speakers work at" on the Speakers page. Not sponsors.'} />
            } />
            <Route path="content/home-sponsors" element={
              <LogoCollection key="homeSponsor" type="homeSponsor" title="Home sponsors" singular="home sponsor" eyebrow="Not in the sidebar"
                description="These logos aren't shown anywhere on the website or in the apps; they only feed the company-logo picker in People. Hidden from the sidebar, kept for that." />
            } />
            <Route path="content/settings" element={<SiteSettings />} />

            <Route path="brochure-downloads" element={<BrochureDownloads />} />
            <Route path="india-pavilion" element={<IndiaPavilion />} />
            <Route path="form-submissions" element={<FormSubmissions />} />
            <Route path="rsvps" element={<Rsvps />} />
            <Route path="awards" element={<CatalystNominations />} />
            <Route path="awards/jury" element={<JuryJurors />} />
            <Route path="awards/allocation" element={<JuryAllocation />} />
            <Route path="awards/rubric" element={<JuryRubric />} />
            <Route path="awards/results" element={<ManagementOnly><JuryResults /></ManagementOnly>} />

            <Route path="marketing/attending" element={<AttendingCampaign />} />
            <Route path="app/invite" element={<AppInvite />} />
            <Route path="marketing/rsvp-reminders" element={<RsvpReminders />} />

            <Route path="app" element={<AppOverview />} />
            <Route path="app/people" element={<People />} />
            <Route path="app/people/:id" element={<Person />} />
            <Route path="app/activity" element={<LiveActivity />} />
            <Route path="app/moderation" element={<Moderation />} />
            <Route path="app/text" element={<AppText />} />
            <Route path="app/rights" element={<AppRights />} />
            <Route path="app/broadcast" element={<Broadcast />} />
            <Route path="app/audit" element={<AuditLog />} />
            <Route path="app/pwa" element={<PwaInstalls />} />

            <Route path="staff" element={<ManagementOnly><StaffAccounts /></ManagementOnly>} />
            <Route path="kill-switch" element={<KillSwitch />} />
            <Route path="email-tracking" element={<EmailTracking />} />
            <Route path="account" element={<MyAccount />} />

            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </AdminShell>
      </Toaster>
    </AdminContext.Provider>
  );
}
