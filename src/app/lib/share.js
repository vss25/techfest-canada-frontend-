/* =========================================================
   Sharing a feed post (iOS PostSharing.swift, Android
   PostSharing.kt): the caption per app, what goes to the share
   sheet and in which order, and the note shown afterwards.
   Pure (no DOM), so `node --test src/app/lib/share.test.mjs`
   runs it. The card itself: lib/shareCard.js.
========================================================= */

export const FESTIVAL_HANDLE = "@thetechfestival";
export const LINKEDIN_PAGE = "https://www.linkedin.com/company/thetechfestival";
export const WEBSITE = "thetechfestival.com";
export const SITE_URL = "https://www.thetechfestival.com";
/** Instagram has no link that fills in a DM; on a computer we open the inbox and the caption is on the clipboard. */
export const INSTAGRAM_INBOX = "https://www.instagram.com/direct/inbox/";

/** Instagram · WhatsApp · LinkedIn · X; null = More… (every app). */
export const PLATFORMS = ["instagram", "whatsapp", "linkedin", "x"];
export const PLATFORM_LABEL = { instagram: "Instagram", whatsapp: "WhatsApp", linkedin: "LinkedIn", x: "X" };

function festivalTag(platform) {
  if (platform === "linkedin") return `The Tech Festival Canada · ${LINKEDIN_PAGE}`;
  if (platform === "x" || platform === "instagram") return FESTIVAL_HANDLE;
  return WEBSITE;
}

function alreadyTagged(text, platform) {
  const t = text.toLowerCase();
  if (platform === "linkedin") return t.includes("linkedin.com/company/thetechfestival");
  if (platform === "x" || platform === "instagram") return t.includes(FESTIVAL_HANDLE);
  return t.includes(WEBSITE);
}

/** "Name on TTFC: text", the link, then the festival's tag for that app (null = the website). */
export function caption(author, body, link = "", platform = null) {
  const text = String(body || "").trim();
  const name = String(author || "").trim();
  let out = !name ? text : !text ? `${name} on TTFC` : `${name} on TTFC: ${text}`;
  const l = String(link || "").trim();
  if (l && !out.includes(l)) out += (out ? "\n\n" : "") + l;
  if (!alreadyTagged(out, platform)) out += (out ? "\n\n" : "") + festivalTag(platform);
  return out;
}

/**
 * What goes to the share sheet, in order: the post card, the photos, the
 * video, then the caption. Media before text, so WhatsApp / LinkedIn keep
 * the pictures. Instagram gets media only (its caption comes from the
 * clipboard). X takes at most 4 photos and no video beside them; LinkedIn
 * can't mix photos and a video in one post, so those two get photos only.
 */
export function orderedItems(platform, card, photos, videos, captionItem) {
  if (platform === "instagram") return [card, ...photos, ...videos];
  if (platform === "x") return [card, ...photos.slice(0, 3), captionItem];
  if (platform === "linkedin") return [card, ...photos, captionItem];
  return [card, ...photos, ...videos, captionItem];
}

/** The short note shown once the share sheet is up (the caption is always copied too). */
export function copiedNote(platform) {
  if (platform === "instagram") return "Pick Instagram, then send it to a chat. Link copied too.";
  if (platform) return `Pick ${PLATFORM_LABEL[platform]}. Caption copied too.`;
  return "Caption copied too.";
}

/** Strict percent-encoding: only A–Z a–z 0–9 - . _ ~ stay as they are (same as the apps). */
export function encode(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/** The web composer with the text filled in (no app / no file sharing). Instagram: null. */
export function shareUrl(platform, text) {
  const q = encode(text);
  if (platform === "x") return `https://x.com/intent/post?text=${q}`;
  if (platform === "linkedin") return `https://www.linkedin.com/feed/?shareActive=true&text=${q}`;
  if (platform === "whatsapp") return `https://wa.me/?text=${q}`;
  return null;
}

/**
 * What a tap on a share target does, decided before anything async so the tap still counts
 * (Safari blocks window.open after an await: it returns null and nothing shows; Oct 22 2026).
 * `text`: the caption for that app. `env`: { canShare: navigator.share exists, canShareCard: it takes the card
 * files, cardReady, mobile }.
 * → { open?: url, share?: "card" | "text" | "link", download?: true, note: [title, message] }
 *   The caption is always copied as well.
 *  • X / LinkedIn: their own composer with the text filled in (the app opens through its universal link).
 *  • Instagram: no link fills in a DM, so the share sheet with the caption and a link (Instagram › Send to a
 *    chat); on a computer, the Instagram inbox.
 *  • WhatsApp / More…: the share sheet with the post card when it's ready, else the caption alone.
 */
export function sharePlan(platform, text, env = {}) {
  const { canShare = false, canShareCard = false, cardReady = false, mobile = true } = env;
  if (platform === "x" || platform === "linkedin") {
    return { open: shareUrl(platform, text), note: [`Opening ${PLATFORM_LABEL[platform]}`, "Your post is filled in. The text is copied too, in case it's empty."] };
  }
  if (platform === "instagram") {
    if (canShare && mobile) return { share: "link", note: ["Pick Instagram, then send it to a chat.", "Link copied too."] };
    return { open: INSTAGRAM_INBOX, note: ["Caption and link copied", "Paste them into an Instagram chat."] };
  }
  if (canShare && cardReady && canShareCard) return { share: "card", note: [copiedNote(platform)] };
  if (canShare && mobile) return { share: "text", note: [copiedNote(platform)] };
  // A computer without a share sheet: save the card, copy the caption, open WhatsApp Web.
  return { open: platform === "whatsapp" ? shareUrl("whatsapp", text) : undefined, download: cardReady || undefined,
    note: [cardReady ? "Card saved and caption copied" : "Caption copied",
      platform === "whatsapp" ? (cardReady ? "Add the card to your WhatsApp message." : "Paste it in WhatsApp.") : "Paste it wherever you share it."] };
}
