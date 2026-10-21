import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import Home from "./pages/Home";
import Programme from "./pages/Programme";
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
// Catalyst Awards jury portal: unlinked, noindex, light only (src/jury). Loaded only when someone opens it.
const JuryPortal = lazy(() => import("./jury/JuryPortal"));
import MaintenanceGate from "./components/MaintenanceGate";
import CookieConsent from "./components/CookieConsent";
import { AnnouncementBar, AgendaGate } from "./components/SiteNotices";
import { isStandalone } from "./lib/pwaPlatform";

// The staff panel is loaded only when someone opens it.
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
// "Get the TTFC app" prompt: the install guide on phones and tablets, a QR code to the phone on
// computers (the web app is phone-only). Not inside the installed app; loaded on its own.
const InstallAppPrompt = lazy(() => import("./components/InstallAppPrompt"));
const SHOW_INSTALL_PROMPT = typeof window !== "undefined" && !isStandalone();

/* The jury portal (/awards/jury-admin) is a focused tool for the Catalyst Awards jury: no ticket bar,
   announcement, cookie banner or app prompt on it. The router matches paths ignoring case. */
const isJuryPath = (p) => /^\/awards\/jury-admin(\/|$)/i.test(p);
function OffJury({ children }) {
  const { pathname } = useLocation();
  return isJuryPath(pathname) ? null : children;
}

function AdminLoading() {
  return <div style={{ minHeight: "100vh", background: "#0B0716" }} aria-busy="true" />;
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
      <MaintenanceGate>
      <OffJury><AnnouncementBar /></OffJury>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/programme" element={<AgendaGate><Programme /></AgendaGate>} />
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
      </Routes>
      <OffJury><TicketBar /></OffJury>
      </MaintenanceGate>
      <OffJury><CookieConsent /></OffJury>
      {SHOW_INSTALL_PROMPT && <OffJury><Suspense fallback={null}><InstallAppPrompt /></Suspense></OffJury>}
    </BrowserRouter>
  );
}

export default App;
