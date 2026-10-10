import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import KycForm from "./pages/KycForm";
import Volunteer from "./pages/Volunteer";
import Partners2026 from "./pages/partners2026";
import Organizers from "./pages/Organizers";
import LinkedinLanding from "./pages/Linkedin";
import Media from "./pages/Media";
import CompleteProfile from "./pages/CompleteProfile";
import AppLogin from "./pages/AppLogin";
import MaintenanceGate from "./components/MaintenanceGate";
import CookieConsent from "./components/CookieConsent";
import { AnnouncementBar, AgendaGate } from "./components/SiteNotices";

// The staff panel is loaded only when someone opens it.
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));

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
      <AnnouncementBar />
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
        <Route path="/kyc" element={<KycForm />} />
        <Route path="/volunteer" element={<Volunteer />} />
        <Route path="/partners2026" element={<Partners2026 />} />
        <Route path="/organizers" element={<Organizers />} />
        <Route path="/linkedin" element={<LinkedinLanding />} />
        <Route path="/media" element={<Media />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/app-login" element={<AppLogin />} />
      </Routes>
      <TicketBar />
      </MaintenanceGate>
      <CookieConsent />
    </BrowserRouter>
  );
}

export default App;
