import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

/* A friendly placeholder for parts of the app that aren't on the web yet. */

export default function ComingSoon({ title = "Coming soon to the web app", children, actions }) {
  return (
    <div className="card stack" style={{ alignItems: "center", textAlign: "center", padding: "28px 20px" }} role="status">
      <span style={{ width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", background: "var(--pur-tint)", color: "var(--pur-alt)" }}>
        <Sparkles aria-hidden="true" style={{ width: 26, height: 26 }} />
      </span>
      <h2 style={{ fontSize: 19, margin: 0 }}>{title}</h2>
      {children && <p className="muted" style={{ margin: 0 }}>{children}</p>}
      {actions === undefined ? <Link to="/schedule" className="btn btn-primary">Open the schedule</Link> : actions}
    </div>
  );
}
