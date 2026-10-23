import { storePlan } from "../lib/appStores";
import { detectOS, isMobileDevice } from "../lib/pwaPlatform";
import { track } from "../lib/pwaEvents";

/* =========================================================
   "Download on the App Store" / "Get it on Google Play" badges,
   drawn in the official style (black, grey edge, the Apple logo
   and the four-colour Play triangle) so they read the same on a
   light or a dark page. Both badges are always the same size and
   width (the organiser, Oct 23 2026: "Make the logo same size").
   Device-aware (lib/appStores.js storePlan): an iPhone / iPad gets
   only the App Store, an Android phone only Google Play (Oct 23
   2026, App Store guideline 2.3.10: the iPhone app opens our pages
   in its in-app browser); a computer gets App Store, Google Play.
   A store whose link isn't
   set has no badge, and with neither nothing renders. On a
   computer the stores open in a new tab; on a phone in the same
   one (the App Store / Play Store app takes over, also from
   Instagram's or LinkedIn's browser). The email versions of these
   badges: the backend's services/appInviteEmail.js, with the logos
   from public/email/.
   Used by /app/install, the web app's Home card, sign-in screen and
   desktop page, and the website's homepage, footer, /swag, prompts
   and post-purchase card. Inline styles, so it looks the same on both.
   Props: where (for the click stat), os (default: this device),
   size "lg" | "md" | "sm", align "center" | "start", style.
========================================================= */

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** One size for both badges: height, fixed width (fits "GET IT ON Google Play", the longer one), type and logo. */
const SIZES = {
  lg: { h: 58, w: 204, top: 11, name: 21, glyph: 28, pad: "8px 12px", radius: 13 },
  md: { h: 50, w: 176, top: 10, name: 18, glyph: 24, pad: "7px 10px", radius: 11 },
  sm: { h: 42, w: 148, top: 8.5, name: 15, glyph: 20, pad: "5px 8px", radius: 9 },
};

function Glyph({ store, size }) {
  if (store === "play") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}>
        <path d="M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924Z" fill="#00A0FF" />
        <path d="M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973Z" fill="#00D37F" />
        <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594Z" fill="#FFCE00" />
        <path d="M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21Z" fill="#F2364B" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none", marginTop: -2 }}>
      <path fill="#fff" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09ZM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

export default function StoreBadges({ where, os, size = "md", align = "center", style }) {
  const plan = storePlan(os || detectOS());
  if (!plan.stores.length) return null;
  const newTab = !isMobileDevice();
  return (
    <div className="store-badges" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: align === "start" ? "flex-start" : "center", gap: 10, ...style }}>
      {plan.stores.map((s) => {
        const main = s.id === plan.primary;
        const z = SIZES[size] || SIZES.md;
        return (
          <a key={s.id} href={s.url} aria-label={s.label} data-store={s.id} data-primary={main ? "1" : undefined}
            {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : { rel: "noopener" })}
            onClick={() => track("pwa_store_click", { store: s.id, where, primary: main })}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: Math.round(z.h / 6), width: z.w, height: z.h,
              padding: z.pad, boxSizing: "border-box", flex: "none", borderRadius: z.radius, background: "#000", color: "#fff",
              border: "1px solid #a6a6a6", textDecoration: "none", fontFamily: FONT, textAlign: "left", lineHeight: 1.08,
              whiteSpace: "nowrap", WebkitTapHighlightColor: "transparent",
            }}>
            <Glyph store={s.id} size={z.glyph} />
            <span>
              <span style={{ display: "block", fontSize: z.top, fontWeight: 500, letterSpacing: s.id === "play" ? 0.6 : 0.1 }}>{s.top}</span>
              <span style={{ display: "block", fontSize: z.name, fontWeight: 600, letterSpacing: -0.3 }}>{s.name}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
