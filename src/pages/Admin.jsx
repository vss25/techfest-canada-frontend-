import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { LogOut, ShieldX } from "lucide-react";

import "../admin/admin.css";
import AdminShell from "../admin/AdminShell";
import Toaster from "../admin/Toaster";
import { AdminContext } from "../admin/adminContext";
import { VOLUNTEER_ACCESS, accountKind } from "../admin/access";
import { AdminThemeContext, useAdminThemeRoot } from "../admin/theme";
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
import TicketManager from "../admin/tickets/TicketManager";
import SpeakerPasses from "../admin/tickets/SpeakerPasses";
import IssuedPasses, { ExhibitorPasses } from "../admin/tickets/IssuedPasses";
import PurchaseEmail from "../admin/tickets/PurchaseEmail";
import SalesAnalytics from "../admin/tickets/SalesAnalytics";
import Inventory from "../admin/tickets/Inventory";
import EmailTracking from "../admin/staff/EmailTracking";
import MyAccount from "../admin/staff/MyAccount";
import BrochureDownloads from "../admin/leads/BrochureDownloads";
import Waitlist2027 from "../admin/leads/Waitlist2027";
import IndiaPavilion from "../admin/leads/IndiaPavilion";
import FormSubmissions from "../admin/leads/FormSubmissions";
import Rsvps from "../admin/leads/Rsvps";
import EventSummary from "../admin/leads/EventSummary";
import CatalystNominations from "../admin/awards/CatalystNominations";
import JuryJurors from "../admin/awards/JuryJurors";
import JuryAllocation from "../admin/awards/JuryAllocation";
import JuryRubric from "../admin/awards/JuryRubric";
import JuryResults from "../admin/awards/JuryResults";
import AttendingCampaign from "../admin/marketing/AttendingCampaign";
import AppInvite from "../admin/app/AppInvite";
import SosHelp from "../admin/app/SosHelp";
import DigestEmails from "../admin/app/DigestEmails";
import UnsubscribedEmails from "../admin/app/UnsubscribedEmails";
import SwagKit from "../admin/app/SwagKit";
import RsvpReminders from "../admin/marketing/RsvpReminders";
import PeopleDirectory from "../admin/people/PeopleDirectory";
import PersonProfile from "../admin/people/PersonProfile";
import { NotForVolunteers, VolunteerDirectory, VolunteerProfile } from "../admin/people/VolunteerPeople";

// Existing admin features — wrapped and restyled, logic unchanged.
import CheckIn from "../components/CheckIn";

const EVENT_DAY = "Event day"; // the sidebar section (admin/nav.js)
const LOGO_STRIPS = "More › Logo strips";

/** Existing components read body.dark-mode: on while the panel is dark, off in its light mode; put back on close. */
function useAdminBody(dark) {
  useEffect(() => {
    const body = document.body;
    const hadDark = body.classList.contains("dark-mode");
    body.classList.add("ttfc-admin-open");
    return () => {
      body.classList.remove("ttfc-admin-open");
      body.classList.toggle("dark-mode", hadDark);
    };
  }, []);
  useEffect(() => { document.body.classList.toggle("dark-mode", dark); }, [dark]);
}

function FullScreen({ children }) {
  return <div className="ttfc-admin flex min-h-screen items-center justify-center p-6">{children}</div>;
}

/* Light / dark theme (admin/theme.js): System, Light or Dark, chosen in the top bar. */
export default function Admin() {
  const theme = useAdminThemeRoot();
  useAdminBody(theme.theme === "dark");
  return (
    <AdminThemeContext.Provider value={theme}>
      <AdminPanel />
    </AdminThemeContext.Provider>
  );
}

function AdminPanel() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState(null);
  const [staffAccess, setAccess] = useState(null); // { staffRole, isManagement }

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
  // Volunteers (role "volunteer") see People only, read only (admin/access.js), and never ask for this.
  const kind = accountKind(me);
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

  // Volunteers have one fixed access: People, read only, never management. (No kill switch any more, Oct 23 2026:
  // the panel can't take the website or the apps offline; only the developers can, through Vercel / Render.)
  const isVolunteer = kind === "volunteer";
  const access = isVolunteer ? VOLUNTEER_ACCESS : staffAccess;
  const isManagement = !!access?.isManagement;
  const ctx = useMemo(() => ({ me, access, isManagement, isVolunteer }), [me, access, isManagement, isVolunteer]);

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
  if (!me || (kind === "staff" && !access)) {
    return (
      <FullScreen>
        <div className="flex flex-col items-center gap-3 text-sm text-ttfc-muted" role="status"><Spinner className="h-7 w-7" /> Opening the staff panel…</div>
      </FullScreen>
    );
  }
  if (kind === "none") {
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
        <AdminShell me={me} onSignOut={handleSignOut}>
          {isVolunteer ? (
            // Volunteers: People only, read only. Any other address: "Not available for volunteer accounts".
            <Routes>
              <Route index element={<Navigate to="/admin/people" replace />} />
              <Route path="people" element={<VolunteerDirectory />} />
              <Route path="people/:id" element={<VolunteerProfile />} />
              <Route path="*" element={<NotForVolunteers />} />
            </Routes>
          ) : (
          <Routes>
            <Route index element={<Overview />} />

            <Route path="people" element={<PeopleDirectory />} />
            <Route path="people/:id" element={<PersonProfile />} />
            <Route path="attendees" element={<TicketManager />} />
            <Route path="speaker-passes" element={<SpeakerPasses />} />
            <Route path="purchase-email" element={<PurchaseEmail />} />
            <Route path="waitlist-2027" element={<Waitlist2027 />} />
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
            <Route path="event-summary" element={<EventSummary />} />
            <Route path="rsvps" element={<Rsvps />} />
            <Route path="awards" element={<CatalystNominations />} />
            <Route path="awards/jury" element={<JuryJurors />} />
            <Route path="awards/allocation" element={<JuryAllocation />} />
            <Route path="awards/rubric" element={<JuryRubric />} />
            <Route path="awards/results" element={<ManagementOnly><JuryResults /></ManagementOnly>} />

            <Route path="marketing/attending" element={<AttendingCampaign />} />
            <Route path="app/invite" element={<AppInvite />} />
            <Route path="app/sos" element={<SosHelp />} />
            <Route path="app/digest" element={<DigestEmails />} />
            <Route path="app/unsubscribes" element={<UnsubscribedEmails />} />
            <Route path="app/swag" element={<SwagKit />} />
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
            <Route path="email-tracking" element={<EmailTracking />} />
            <Route path="account" element={<MyAccount />} />

            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
          )}
        </AdminShell>
      </Toaster>
    </AdminContext.Provider>
  );
}
