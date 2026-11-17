import React, { useEffect, useRef, useState } from "react";
import {
  enterPreview, exitPreview, formatStagingUntil, isPreview, isStagingSite, previewFailure, stagingUntil, wantsPreview,
} from "../lib/preview";

/* The staging banner (Nov 2026; src/lib/preview.js, Admin › Changes).
   On the staging site everyone sees it: this is staging, not the live website, and until when
   the staging link works. Staff signed in there also see what's been sent to staging, and can
   go to Changes to publish it. Elsewhere it shows only for ?preview=1.
   Fixed to the bottom so it never covers the page's own header; the page gets room for it. */
const BAR = {
  position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9999,
  background: "#151035", color: "#fff", borderTop: "3px solid #F5A623",
  padding: "10px max(16px, env(safe-area-inset-left, 0px)) calc(10px + env(safe-area-inset-bottom, 0px))",
  display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 14px",
  fontFamily: "Poppins, system-ui, sans-serif", fontSize: 14, lineHeight: 1.45,
};
const TAG = { background: "#F5A623", color: "#151035", fontWeight: 700, borderRadius: 6, padding: "2px 8px", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", whiteSpace: "nowrap" };
const LINK = { color: "#fff", textDecoration: "underline", whiteSpace: "nowrap" };
const BTN = { background: "#D6308C", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", font: "inherit", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none" };
const GHOST = { ...BTN, background: "transparent", border: "1px solid #ffffff66" };

export default function PreviewBar() {
  const [staging] = useState(() => isStagingSite());
  const [on] = useState(() => isPreview());
  const [asked] = useState(() => wantsPreview());
  const [failed, setFailed] = useState(() => previewFailure());
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(null);
  useEffect(() => {
    const f = () => setFailed(previewFailure());
    window.addEventListener("ttfc:preview-failed", f);
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => { window.removeEventListener("ttfc:preview-failed", f); clearInterval(t); };
  }, []);
  const shown = staging || asked;
  // Room at the bottom of the page for the bar, so it never hides the footer.
  useEffect(() => {
    if (!shown || !ref.current || typeof ResizeObserver === "undefined") return undefined;
    const el = ref.current;
    // Its height also goes in --ttfc-staging-bar, so things pinned to the bottom (the admin's phone tabs and rail) sit above it.
    const root = document.documentElement.style;
    const ro = new ResizeObserver(() => { document.body.style.paddingBottom = `${el.offsetHeight}px`; root.setProperty("--ttfc-staging-bar", `${el.offsetHeight}px`); });
    ro.observe(el);
    return () => { ro.disconnect(); document.body.style.paddingBottom = ""; root.removeProperty("--ttfc-staging-bar"); };
  }, [shown]);
  if (!shown) return null;

  const until = staging ? stagingUntil() : null;
  const expired = until && until.getTime() <= now;
  const back = encodeURIComponent(window.location.pathname + window.location.search);
  const inAdmin = window.location.pathname.startsWith("/admin");

  let content;
  if (on) {
    content = failed
      ? "The changes on staging couldn't load, so this shows the live content. Reload to try again."
      : "You're seeing the changes sent to staging. The live website keeps its current content until they're published.";
  } else if (asked) {
    content = "Sign in with your staff account to see the changes sent to staging. Until then this shows the live content.";
  } else {
    content = "You're seeing the live content here.";
  }

  return (
    <div role="region" aria-label="Staging environment" ref={ref} style={BAR}>
      <span style={TAG}>{staging ? "Staging environment" : "Preview"}</span>
      <span style={{ flex: "1 1 320px" }}>
        {staging && (
          <strong style={{ display: "block", color: expired ? "#FFB4B4" : "#F5A623" }}>
            {expired
              ? `This isn't the live website. The staging link expired on ${formatStagingUntil(until)}: ask for a new one.`
              : `This isn't the live website. Staging is available until ${formatStagingUntil(until)}.`}
          </strong>
        )}
        {!inAdmin && <span title={on && failed ? failed : undefined}>{content}</span>}
      </span>
      {on && !inAdmin && <a href="/admin/content/changes" style={BTN}>Review &amp; publish</a>}
      {on && !inAdmin && <button type="button" onClick={exitPreview} style={GHOST}>Show live content</button>}
      {!on && asked && !inAdmin && <a href={`/admin-login?next=${back}`} style={LINK}>Staff sign-in</a>}
      {!on && !asked && staging && !inAdmin && <button type="button" onClick={enterPreview} style={GHOST}>Show staged changes</button>}
    </div>
  );
}
