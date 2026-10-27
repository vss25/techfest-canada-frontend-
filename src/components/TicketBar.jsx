import { Link, useLocation } from "react-router-dom";

export default function TicketBar() {
  const location = useLocation();
  
  // No "Get your pass" bar where people already have one (their emailed profile link).
  // The router matches paths ignoring case and a trailing slash (/RSVP, /rsvp/ open the RSVP page), so compare the same way.
  const path = location.pathname.replace(/\/+$/, "").toLowerCase() || "/";
  if (path === "/tickets" || path === "/complete-profile" || path === "/app-login" || path === "/rsvp" || path === "/attending" || path === "/share/linkedin" || path === "/survey" || path === "/rate") {
    return null;
  }

  return (
    <div className="ticket-bar">
      <div className="ticket-bar-inner" style={{ width: "100%", display: "flex" }}>
        <Link 
          to="/tickets" 
          className="ticket-btn" 
          style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}
        >
          Get Your Pass →
        </Link>
      </div>
    </div>
  );
}
