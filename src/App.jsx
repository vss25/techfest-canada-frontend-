import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import Home from "./pages/Home";
import Speakers from "./pages/Speakers";
import SpeakerProfile from "./pages/Speakerprofile";
import Sponsors from "./pages/Sponsors";
import Tickets from "./pages/Tickets";
import Checkout from "./pages/Checkout";
import Resources from "./pages/Resources";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import ProtectedRoute from "./components/ProtectedRoute";
import AboutUs from "./components/AboutUs";
import AuthSuccess from "./pages/AuthSuccess";
import ResetPassword from "./pages/ResetPassword";
import TicketBar from "./components/TicketBar";
import Agenda from "./pages/Agenda";
import AdminRoute from "./components/AdminRoute";
import Sponsor from "./pages/Sponsor";
import Exhibit from "./pages/Exhibit";
import IndiaPavilion from "./pages/IndiaPavilion";
import PavilionPayment from "./pages/PavilionPayment";
import Brochures from "./pages/Brochures";
import Venue from "./pages/Venue";
import ScrollToTop from "./components/ScrollToTop";
import Awards from "./pages/Awards";
import Volunteer from "./pages/Volunteer";
import Partners2026 from "./pages/partners2026";
import Organizers from "./pages/Organizers";
import LinkedinLanding from "./pages/Linkedin";
import Media from "./pages/Media";
import CompleteProfile from "./pages/CompleteProfile";
import AppLogin from "./pages/AppLogin";
// Unlinked RSVP page: reached only by typing thetechfestival.com/rsvp (noindex, not in any menu).
const Rsvp = lazy(() => import("./pages/Rsvp"));
// Unlinked "I'm attending" page: opened from the campaign email (noindex, not in any menu).
const Attending = lazy(() => import("./pages/Attending"));
// Unlinked page the TTFC app opens (Oct 22 2026): a session's discussion or a poll as a LinkedIn post (noindex, not in any menu).
const ShareLinkedin = lazy(() => import("./pages/ShareLinkedin"));
// "Win the TTFC swag kit" rules page (Oct 22 2026): linked from the swag email, the apps and the install page.
const Swag = lazy(() => import("./pages/Swag"));
// "Stay updated": the TTFC 2027 waitlist (Oct 23 2026).
const StayUpdated = lazy(() => import("./pages/StayUpdated"));
// "Programme": TTFC 2026 at a glance (Oct 24 2026): key times, the agenda, speakers, exhibitors, the 2027 waitlist.
const Programme = lazy(() => import("./pages/Programme"));
// Catalyst Awards jury portal: unlinked, noindex, light only (src/jury). Loaded only when someone opens it.
const JuryPortal = lazy(() => import("./jury/JuryPortal"));
// The TTFC 2026 fact sheet (Oct 23 2026): UNLISTED, only at its direct link /fact-sheet/<token> (src/lib/factSheetRoute.js).
// Not in any menu, footer or sitemap; noindex. Its own chunk, so its text isn't in the main bundle.
const FactSheet = lazy(() => import("./pages/FactSheet"));
import { FACT_SHEET_PATH, isFactSheetPath } from "./lib/factSheetRoute";
import CookieConsent from "./components/CookieConsent";
import { AnnouncementBar, AgendaGate } from "./components/SiteNotices";
import { isStandalone } from "./lib/pwaPlatform";

// The staff panel is loaded only when someone opens it.
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
// "Get the TTFC app" prompt: the App Store / Google Play badges on phones and tablets, plus a QR code to the
// phone on computers. Not inside the installed web app; loaded on its own.
const InstallAppPrompt = lazy(() => import("./components/InstallAppPrompt"));
const SHOW_INSTALL_PROMPT = typeof window !== "undefined" && !isStandalone();

/* The jury portal (/awards/jury-admin) is a focused tool for the Catalyst Awards jury, and the unlisted fact sheet
   a one-page document: no ticket bar, announcement, cookie banner or app prompt on them. The router matches paths
   ignoring case, except the fact sheet's: only its exact link opens it (any other spelling is an unknown page). */
const isJuryPath = (p) => /^\/awards\/jury-admin(\/|$)/i.test(p);
function OffJury({ children }) {
  const { pathname } = useLocation();
  return isJuryPath(pathname) || isFactSheetPath(pathname) ? null : children;
}

/* The staff panel's light / dark choice (src/admin/theme.js; index.html applies it before the
   first paint), so the loading screen matches the panel even when arriving from another page. */
function adminLight() {
  const set = document.documentElement.getAttribute("data-admin-theme");
  if (set) return set === "light";
  try {
    const choice = localStorage.getItem("ttfc.admin.theme");
    if (choice === "light" || choice === "dark") return choice === "light";
  } catch { /* storage blocked: follow the device */ }
  return !!window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
}

function AdminLoading() {
  return <div style={{ minHeight: "100vh", background: adminLight() ? "#F4F2F9" : "#0B0716" }} aria-busy="true" />;
}

/* ================= SYSTEM THEME DETECTOR ================= */
function applySystemTheme() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = prefersDark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
}

function App() {
  useEffect(() => {
    applySystemTheme();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applySystemTheme();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <OffJury><AnnouncementBar /></OffJury>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/programme" element={<AgendaGate><Suspense fallback={<div style={{ minHeight: "100vh" }} aria-busy="true" />}><Programme /></Suspense></AgendaGate>} />
        <Route path="/speakers" element={<Speakers />} />
        <Route path="/speakers/:slug" element={<SpeakerProfile />} />
        <Route path="/sponsors" element={<Sponsors />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/tickets/checkout" element={<Checkout />} />
        <Route path="/first-timers" element={<Navigate to="/" replace />} />
        {/* Briefings page hidden (Oct 2026); src/pages/Briefings.jsx kept for later */}
        <Route path="/briefings" element={<Navigate to="/" replace />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/on-demand" element={<Resources />} />
        {/* The attendee dashboard was retired (the app replaces it); keep old links working. */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/agenda" element={<AgendaGate><Agenda /></AgendaGate>} />
        <Route
          path="/admin-login"
          element={
            <Suspense fallback={<AdminLoading />}>
              <AdminLogin />
            </Suspense>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <Suspense fallback={<AdminLoading />}>
                <Admin />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route path="/auth-success" element={<AuthSuccess />} />
        <Route path="/sponsor" element={<Sponsor />} />
        <Route path="/exhibit" element={<Exhibit />} />
        <Route path="/exhibit/india-pavilion" element={<IndiaPavilion />} />
        <Route path="/exhibit/india-pavilion/pay" element={<PavilionPayment />} />
        <Route path="/brochures" element={<Brochures />} />
        <Route path="/venue" element={<Venue />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/awards" element={<Awards />} />
        <Route path="/awards/nominations" element={<Awards />} />
        <Route path="/awards/jury-admin/*" element={<Suspense fallback={<div style={{ minHeight: "100vh", background: "#f6f4fa" }} aria-busy="true" />}><JuryPortal /></Suspense>} />
        {/* KYC form hidden (13 Oct 2026); the page is kept in src/pages/KycForm.jsx */}
        <Route path="/kyc" element={<Navigate to="/" replace />} />
        <Route path="/volunteer" element={<Volunteer />} />
        <Route path="/partners2026" element={<Partners2026 />} />
        <Route path="/organizers" element={<Organizers />} />
        <Route path="/linkedin" element={<LinkedinLanding />} />
        <Route path="/media" element={<Media />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/app-login" element={<AppLogin />} />
        <Route path="/rsvp" element={<Suspense fallback={<div style={{ minHeight: "100vh", background: "#06020f" }} aria-busy="true" />}><Rsvp /></Suspense>} />
        <Route path="/attending" element={<Suspense fallback={<div style={{ minHeight: "100vh", background: "#06020f" }} aria-busy="true" />}><Attending /></Suspense>} />
        <Route path="/share/linkedin" element={<Suspense fallback={<div style={{ minHeight: "100vh", background: "#06020f" }} aria-busy="true" />}><ShareLinkedin /></Suspense>} />
        <Route path="/swag" element={<Suspense fallback={<div style={{ minHeight: "100vh" }} aria-busy="true" />}><Swag /></Suspense>} />
        <Route path="/stay-updated" element={<Suspense fallback={<div style={{ minHeight: "100vh" }} aria-busy="true" />}><StayUpdated /></Suspense>} />
        <Route path={FACT_SHEET_PATH} caseSensitive element={<Suspense fallback={<div style={{ minHeight: "100vh" }} aria-busy="true" />}><FactSheet /></Suspense>} />
      </Routes>
      <OffJury><TicketBar /></OffJury>
      <OffJury><CookieConsent /></OffJury>
      {SHOW_INSTALL_PROMPT && <OffJury><Suspense fallback={null}><InstallAppPrompt /></Suspense></OffJury>}
    </BrowserRouter>
  );
}

export default App;
