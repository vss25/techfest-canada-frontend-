import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/* =========================================================
   Maintenance mode (kill switch). Asks GET /api/status on load
   and every 60 s. If the site is switched off, every public
   route shows a branded "We'll be right back" screen. Staff
   routes (/admin, /admin-login) always render so the switch can
   be turned back off. Fails open: if the check fails, the site
   is shown as normal.
========================================================= */

const STATUS_API =
  (import.meta.env.VITE_ADMIN_API_URL || "https://techfest-canada-backend.onrender.com/api") + "/status";

const isStaffPath = (p) => p === "/admin" || p.startsWith("/admin/") || p === "/admin-login";

function MaintenanceScreen({ message }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
        background:
          "radial-gradient(900px 520px at 100% 0%, rgba(232,69,139,0.22), transparent 60%), radial-gradient(800px 520px at 0% 100%, rgba(139,92,246,0.22), transparent 60%), #0B0716",
        color: "#F4F0FB",
        fontFamily: "'Montserrat', system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        <img
          src="/Tech_Festival_Canada_Logo_Dark_Transparent.png"
          alt="The Tech Festival Canada"
          style={{ height: 88, width: "auto", margin: "0 auto 36px", display: "block" }}
        />
        <div
          aria-hidden="true"
          style={{
            height: 4, width: 96, margin: "0 auto 28px", borderRadius: 99,
            background: "linear-gradient(90deg, #E8458B, #8B5CF6, #F59E42)",
          }}
        />
        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.7rem, 5vw, 2.6rem)", fontWeight: 800, lineHeight: 1.15, margin: 0, letterSpacing: "0.5px" }}>
          We'll be right back
        </h1>
        <p style={{ marginTop: 18, fontSize: "1.05rem", lineHeight: 1.7, color: "rgba(244,240,251,0.78)", whiteSpace: "pre-wrap" }}>
          {message || "We're making some updates. Please check back soon."}
        </p>
        <p style={{ marginTop: 36, fontSize: "0.8rem", color: "rgba(169,161,194,0.8)" }}>
          Questions? <a href="mailto:info@thetechfestival.com" style={{ color: "#F59E42", textDecoration: "underline" }}>info@thetechfestival.com</a>
        </p>
      </div>
    </main>
  );
}

export default function MaintenanceGate({ children }) {
  const { pathname } = useLocation();
  const [status, setStatus] = useState({ live: true, message: "" });

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(STATUS_API, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (alive) setStatus({ live: data?.live !== false, message: String(data?.message || "") });
      } catch {
        if (alive) setStatus({ live: true, message: "" }); // fail open
      }
    };
    check();
    const t = setInterval(check, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!status.live && !isStaffPath(pathname)) return <MaintenanceScreen message={status.message} />;
  return children;
}
