import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home";
import Programme from "./pages/Programme";
import Speakers from "./pages/Speakers";
import SpeakerProfile from "./pages/Speakerprofile";
import Sponsors from "./pages/Sponsors";
import Tickets from "./pages/Tickets";
import Resources from "./pages/Resources";
import Dashboard from "./pages/Dashboard";
import Privacy from "./pages/Privacy";
import ProtectedRoute from "./components/ProtectedRoute";
import AboutUs from "./components/AboutUs";
import AuthSuccess from "./pages/AuthSuccess";
import ResetPassword from "./pages/ResetPassword";
import TicketBar from "./components/TicketBar";
import Agenda from "./pages/Agenda";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AdminRoute from "./components/AdminRoute";
import Sponsor from "./pages/Sponsor";
import Exhibit from "./pages/Exhibit";
import Brochures from "./pages/Brochures";
import Venue from "./pages/Venue";
import ScrollToTop from "./components/ScrollToTop";
import Awards from "./pages/Awards";
import KycForm from "./pages/KycForm";
import Volunteer from "./pages/Volunteer";
import partners2026 from "./pages/partners2026";

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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/programme" element={<Programme />} />
        <Route path="/speakers" element={<Speakers />} />
        <Route path="/speakers/:id" element={<SpeakerProfile />} />
        <Route path="/sponsors" element={<Sponsors />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/first-timers" element={<Resources />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/on-demand" element={<Resources />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <Route path="/auth-success" element={<AuthSuccess />} />
        <Route path="/sponsor" element={<Sponsor />} />
        <Route path="/exhibit" element={<Exhibit />} />
        <Route path="/brochures" element={<Brochures />} />
        <Route path="/venue" element={<Venue />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/awards" element={<Awards />} />
        <Route path="/kyc" element={<KycForm />} />
        <Route path="/volunteer" element={<Volunteer />} />
        <Route path="/institutions-involved" element={<InstitutionsInvolved />} />
      </Routes>
      <TicketBar />
    </BrowserRouter>
  );
}

export default App;
