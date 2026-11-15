import React from "react";
import { Link } from "react-router-dom";

/* =========================================================
   Year pills for the pages that sit above single events
   (Awards, Highlights, national Partners — Phase 4): one row
   of years, INCLUDING future announced editions. A past year
   is that year's record; a future year is a real, clickable
   announced state. Pills are navigation, not CTAs — the
   one-button rule is untouched. The selected year lives in
   the URL (/{page}/:year).
========================================================= */

export default function YearPills({ years, current, basePath }) {
  if (!years || years.length < 2) return null;
  return (
    <nav aria-label="Choose a year" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {years.map((y) => {
        const active = Number(y) === Number(current);
        return (
          <Link key={y} to={`${basePath}/${y}`} aria-current={active ? "page" : undefined}
            style={{
              padding: "8px 18px", borderRadius: 999, textDecoration: "none",
              fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: 1,
              border: `1.5px solid ${active ? "#f5a623" : "rgba(127,90,240,0.35)"}`,
              background: active ? "rgba(245,166,35,0.14)" : "transparent",
              color: "inherit",
            }}>
            {y}
          </Link>
        );
      })}
    </nav>
  );
}
