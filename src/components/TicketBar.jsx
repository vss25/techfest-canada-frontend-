import { Link, useLocation } from "react-router-dom";
import { STAY_UPDATED_PATH, eventOver } from "../lib/eventOver";

export default function TicketBar() {
  const location = useLocation();
  
  // No "Get your pass" bar where people already have one (their emailed profile link).
  // The router matches paths ignoring case and a trailing slash (/RSVP, /rsvp/ open the RSVP page), so compare the same way.
  const path = location.pathname.replace(/\/+$/, "").toLowerCase() || "/";
  // A Catalyst Awards winner's page (/awards/winners/<id>) is a focused page like /share/linkedin: no bar.
  if (path.startsWith("/awards/winners/")) return null;
  if (path === "/tickets" || path === "/complete-profile" || path === "/app-login" || path === "/rsvp" || path === "/attending" || path === "/share/linkedin" || path === "/survey" || path === "/rate") {
    return null;
  }

  // After TTFC 2026 (src/lib/eventOver.js): "Stay updated for 2027" to the 2027 page instead of passes for 2026.
  const over = eventOver();
  if (over && path === STAY_UPDATED_PATH) return null;

  return (
    <div className="ticket-bar">
      <div className="ticket-bar-inner" style={{ width: "100%", display: "flex" }}>
        <Link 
          to={over ? STAY_UPDATED_PATH : "/tickets"} 
          className="ticket-btn" 
          style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}
        >
          {over ? "Stay Updated for 2027 →" : "Get Your Pass →"}
        </Link>
      </div>
    </div>
  );
}
