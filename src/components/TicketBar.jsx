import { Link, useLocation } from "react-router-dom";

export default function TicketBar() {
  const location = useLocation();
  
  // No "Get your pass" bar where people already have one (their emailed profile link).
  if (location.pathname === "/tickets" || location.pathname === "/complete-profile") {
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
