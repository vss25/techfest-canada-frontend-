import { Camera } from "lucide-react";
import { MEDIA, MEDIA_HELP, bandChip } from "./mediaMark";

/* =========================================================
   Media = Yes, shown the same way everywhere VIP is (Oct 23
   2026): the dark-blue "Media" mark (People rows and profile,
   Give a pass, Exhibitor and Speaker passes), and the pass
   colour chip the server sends as `band` ("Media · Connect
   Pass" on dark blue; VIP gold, Speaker red, … the same
   colours as the door card). Rules in mediaMark.js.
========================================================= */

const cx = (...c) => c.filter(Boolean).join(" ");

/** The dark-blue Media mark, like the VIP badge. */
export function MediaMark({ className = "", title = MEDIA_HELP }) {
  return (
    <span title={title} style={{ background: MEDIA.bg, color: MEDIA.text, borderColor: MEDIA.bg }}
      className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold", className)}>
      <Camera className="h-3 w-3" aria-hidden="true" />
      {MEDIA.label}
    </span>
  );
}

/** The person's pass in its colour: "Media · Connect Pass", "VIP · Power Pass", "Connect Pass" on green. Null without a band. */
export function PassBand({ band, className = "", size = "sm" }) {
  const c = bandChip(band);
  if (!c) return null;
  return (
    <span title={c.title} style={{ background: c.bg, color: c.color, borderColor: c.bg }} data-band={c.key}
      className={cx("inline-flex max-w-full items-baseline gap-1 whitespace-nowrap rounded-full border font-semibold",
        size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs", className)}>
      <span>{c.label}</span>
      {c.sub && <span className={cx("font-medium opacity-85", size === "lg" ? "text-xs" : "text-[10px]")}>· {c.sub}</span>}
    </span>
  );
}
