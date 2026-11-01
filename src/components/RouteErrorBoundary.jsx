import { Component } from "react";
import { useLocation } from "react-router-dom";

/* =========================================================
   Around the site's routes (Oct 31 2026): the pages load their code
   when first opened (React.lazy). If that download fails and the
   page doesn't reload itself (index.html's stale-build guard reloads
   at most once every 30 s, and not when storage is blocked), this
   shows "Reload" instead of a blank screen. Moving to another page
   clears it.
========================================================= */

class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("PAGE LOAD ERROR:", error);
  }

  componentDidUpdate(prev) {
    if (this.state.failed && prev.pathname !== this.props.pathname) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "120px 20px 60px", textAlign: "center", fontFamily: "'Montserrat', sans-serif" }}>
        <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>This page didn’t load.</p>
        <p style={{ margin: 0, opacity: 0.75 }}>Check your connection, then reload the page.</p>
        <button type="button" onClick={() => window.location.reload()}
          style={{ marginTop: 6, padding: "12px 28px", borderRadius: 999, border: 0, cursor: "pointer", color: "#fff", fontFamily: "'Orbitron', sans-serif", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", background: "linear-gradient(135deg, #7a3fd1, #f5a623)" }}>
          Reload
        </button>
      </div>
    );
  }
}

export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <Boundary pathname={pathname}>{children}</Boundary>;
}
