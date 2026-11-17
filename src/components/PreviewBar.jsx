import React, { useEffect, useState } from "react";
import { exitPreview, isPreview, previewFailure } from "../lib/preview";

/* The bar staff see while previewing unpublished changes (src/lib/preview.js).
   Fixed to the bottom so it never covers the page's own header. */
export default function PreviewBar() {
  const [on] = useState(() => isPreview());
  const [failed, setFailed] = useState(() => previewFailure());
  useEffect(() => {
    const f = () => setFailed(previewFailure());
    window.addEventListener("ttfc:preview-failed", f);
    return () => window.removeEventListener("ttfc:preview-failed", f);
  }, []);
  if (!on) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9999,
        background: "#151035", color: "#fff", borderTop: "3px solid #F5A623",
        padding: "10px max(16px, env(safe-area-inset-left, 0px)) calc(10px + env(safe-area-inset-bottom, 0px))",
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
        fontFamily: "Poppins, system-ui, sans-serif", fontSize: 14,
      }}
    >
      <strong style={{ color: "#F5A623" }}>Preview</strong>
      <span style={{ flex: "1 1 260px" }}>
        {failed
          ? `Unpublished changes couldn't load (${failed}). You're seeing the live page.`
          : "You're seeing unpublished changes. Visitors still see the live page until it's published."}
      </span>
      <a href="/admin/content/events" style={{ color: "#fff", textDecoration: "underline" }}>Back to the admin panel</a>
      <button
        type="button"
        onClick={exitPreview}
        style={{ background: "#D6308C", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", font: "inherit", fontWeight: 600, cursor: "pointer" }}
      >
        Exit preview
      </button>
    </div>
  );
}
