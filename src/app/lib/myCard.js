import { ApiError, get, put } from "./api";
import { auth, can, firstName } from "./auth";
import { connectInPerson, connectionWith, refreshConnections, requestConnection, respondConnection, social } from "./social";
import { createStore, local } from "./store";
import { showAlert } from "./ui";
import {
  accountEmailOf, buildVCard, derivedItems, detailCount, firstLinkedIn, itemsForSave, MAX_CONTACT_ITEMS, sharedSentence, vcfFileName,
} from "./contactCard";

/* =========================================================
   My contact card (GET / PUT /social/contact-card), cached on
   this device so the Profile section renders instantly and
   offline, and the "Share your contact details" sheet that
   every exchange moment goes through:
     request · accept · scan · vcard · manage
   (spec sections 4 and 5). Demo mode answers from lib/demo.js.
========================================================= */

const CACHE = "ttfc.app.contactCard";
const OPEN = "ttfc.contactCard.open";   // the Profile card expanded (per device, closed by default)
const SEEN = "ttfc.contactCard.seen";   // expanded at least once (the Profile tab dot stops)

/** card: { items, accountEmail, canShare, saved, max, kinds, qrShare, qrSharePicked } */
export const myCard = createStore({
  card: null, owner: "", loading: false, failed: false,
  sheet: null,     // the open share sheet: { moment, person, conn, onConfirm, resolve }
  wantAdd: 0,      // bumped when a share sheet's "Add contact details" asks the Profile card to open the picker
  open: local.get(OPEN) === "1",
  seen: local.get(SEEN) === "1",
});

const ownerId = () => auth.get().me?.id || "";

function cached() {
  const c = local.json(CACHE, null);
  return c && c.owner && c.card ? c : null;
}

function setCard(card) {
  const owner = ownerId();
  myCard.set({ card, owner, failed: false });
  if (owner) local.setJSON(CACHE, { owner, card });
}

// The card is part of /social/me too: keep it in step whenever the account loads (e.g. after Edit profile).
// Only a newly loaded card counts: local edits to `me` (applyLinkedIn) keep the same object.
let lastMe = null;
let lastMeCard = null;
function syncFromAuth() {
  const me = auth.get().me;
  if (me === lastMe) return;
  lastMe = me;
  const fresh = me?.contactCard;
  if (fresh && Array.isArray(fresh.items)) {
    if (fresh !== lastMeCard) { lastMeCard = fresh; setCard(fresh); }
  } else if (me?.id && !myCard.get().card) {
    const c = cached();
    if (c && c.owner === me.id) myCard.set({ card: c.card, owner: c.owner });
  }
}
// Signed in at launch: the last card on this device (it's cleared on sign-out) until the account loads.
if (["user", "demo"].includes(auth.get().mode)) {
  const c = cached();
  if (c) myCard.set({ card: c.card, owner: c.owner });
}
syncFromAuth();
auth.subscribe(syncFromAuth);

window.addEventListener("ttfc:signed-out", () => {
  local.set(CACHE, null);
  myCard.set({ card: null, owner: "", loading: false, failed: false, sheet: null });
});

/** Without an answer from the server (older backend, offline and nothing cached): the card worked out from the profile. */
function fallbackCard() {
  const a = auth.get();
  const accountEmail = accountEmailOf(a.me?.email || a.user?.email);
  const items = derivedItems({ accountEmail, linkedinUrl: a.me?.linkedinUrl || a.user?.linkedinUrl });
  return {
    items, accountEmail, canShare: can("shareContact"), saved: false, max: MAX_CONTACT_ITEMS, kinds: [],
    qrShare: items.filter((it) => it.shareByDefault).map((it) => it.id), qrSharePicked: false, fallback: true,
  };
}

/** The card to show: the server's (or the cache), else the fallback. */
export function cardOf(s = myCard.get()) {
  const me = ownerId();
  if (s.card && (!me || !s.owner || s.owner === me)) return s.card;
  return fallbackCard();
}

export const canShareContact = (card = cardOf()) => (typeof card?.canShare === "boolean" ? card.canShare : can("shareContact"));

export async function refreshCard() {
  myCard.set({ loading: true });
  try {
    const card = await get("social/contact-card");
    setCard(card);
    myCard.set({ loading: false });
    return card;
  } catch {
    myCard.set({ loading: false, failed: true });
    return null;
  }
}

/** Copies the profile LinkedIn the server settled on into the signed-in account. */
function applyLinkedIn(url) {
  if (typeof url !== "string") return;
  const a = auth.get();
  if ((a.me?.linkedinUrl || "") === url && (a.user?.linkedinUrl || "") === url) return;
  auth.set({ me: a.me ? { ...a.me, linkedinUrl: url } : a.me, user: a.user ? { ...a.user, linkedinUrl: url } : a.user });
}

/**
 * Saves the whole list in display order (every add, edit, delete, switch and reorder).
 * Shows the change straight away; the server's answer replaces it, a refusal puts it back.
 * → { ok: true } or { ok: false, error, index }
 */
export async function saveItems(items) {
  const before = cardOf();
  myCard.set({ card: { ...before, items }, owner: ownerId() });
  try {
    const r = await put("social/contact-card", { items: itemsForSave(items) });
    const { linkedinUrl, ...card } = r || {};
    setCard(card);
    applyLinkedIn(typeof linkedinUrl === "string" ? linkedinUrl : firstLinkedIn(card.items));
    return { ok: true };
  } catch (e) {
    myCard.set({ card: before });
    const index = e instanceof ApiError && Number.isInteger(e.data?.index) ? e.data.index : -1;
    return { ok: false, error: e?.message || "Couldn't save. Try again.", index };
  }
}

/** The connect QR sheet's checklist: what people who scan my QR get. */
export async function saveQrShare(ids) {
  try {
    const card = await put("social/contact-card/qr-share", { share: ids });
    setCard(card);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Couldn't save. Try again." };
  }
}

let qrTimer = null;
/** The QR sheet's ticks: shown straight away, saved half a second after the last change. */
export function queueQrShare(ids) {
  const card = cardOf();
  myCard.set({ card: { ...card, qrShare: ids, qrSharePicked: true }, owner: ownerId() });
  clearTimeout(qrTimer);
  qrTimer = setTimeout(async () => {
    const r = await saveQrShare(ids);
    if (!r.ok) { showAlert("Couldn't save", r.error); refreshCard(); }
  }, 500);
}

/** Copies a value, then the "Copied" toast. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    try { document.execCommand("copy"); } catch { /* nothing more to try */ }
    el.remove();
  }
  showAlert("Copied");
}

/** Expands / collapses the Profile card (remembered on this device); the first expand counts as seen. */
export function setCardOpen(open) {
  local.set(OPEN, open ? "1" : "0");
  if (open) local.set(SEEN, "1");
  myCard.set({ open, seen: myCard.get().seen || open });
}

/** Whether the card is known yet (server, cache, or the server didn't answer): no dots while it loads. */
const cardKnown = (s) => !!s.card || s.failed;

/** Fewer than 2 ways to reach me: the dot and "Add at least 2 ways to reach you". */
export const needsDetails = (s = myCard.get()) => cardKnown(s) && detailCount(cardOf(s).items) < 2;

/** The Profile tab dot: needs details and the card was never expanded on this device. */
export const profileTabDot = (s = myCard.get()) => needsDetails(s) && !s.seen;

/** Asks the Profile contact card to open "Add a contact detail" (from a share sheet with nothing to share), expanded. */
export function requestAddDetail() {
  setCardOpen(true);
  myCard.set({ wantAdd: myCard.get().wantAdd + 1 });
}
export function clearAddRequest() {
  if (myCard.get().wantAdd) myCard.set({ wantAdd: 0 });
}

// ---------- The share sheet ----------

/**
 * Opens "Share your contact details".
 *   moment     request | accept | scan | vcard | manage
 *   person     { id, name } (vcard: me)
 *   conn       the connection with them, if any (myShare / mySharePicked)
 *   onConfirm  (share: ids | undefined) → { ok } | { error }; share is undefined when sharing is off
 * → Promise<boolean> (true when the action went through)
 */
export function openShareSheet({ moment, person, conn = null, onConfirm }) {
  const open = myCard.get().sheet;
  if (open) open.resolve(false);
  return new Promise((resolve) => {
    myCard.set({ sheet: { moment, person, conn, onConfirm, resolve, key: Date.now() } });
    if (!myCard.get().card || myCard.get().failed) refreshCard();
  });
}

export function closeShareSheet(done = false) {
  const sh = myCard.get().sheet;
  if (!sh) return;
  myCard.set({ sheet: null });
  sh.resolve(done);
}

const countOf = (c, share) => (Array.isArray(c?.myShare) ? c.myShare.length : (share || []).length);

/** Connect (send a request) → the sheet, then POST connections/request with `share`. */
export function connectWithSharing(person, { given } = {}) {
  return openShareSheet({
    moment: "request", person, conn: connectionWith(person.id)?.conn || null,
    async onConfirm(share) {
      const c = await requestConnection(person, "", share);
      if (!c) return { error: social.get().lastError || "Couldn't send. Try again." };
      showAlert("Request sent", `${given || firstName(person.name)} will see your request in the app. ${sharedSentence(countOf(c, share))}`);
      return { ok: true };
    },
  });
}

/** Accept an invitation → the sheet, then POST connections/:id/respond with `share`. */
export function acceptWithSharing(conn) {
  const person = conn.user || { id: "", name: "" };
  return openShareSheet({
    moment: "accept", person, conn,
    async onConfirm(share) {
      const c = await respondConnection(conn, true, share);
      if (!c) return { error: social.get().lastError || "Couldn't accept. Try again." };
      showAlert("Request accepted", `${person.name || "They"} is now in your network. ${sharedSentence(countOf(c, share))}`);
      return { ok: true };
    },
  });
}

/**
 * A connect code was scanned → the sheet, then POST connections/in-person with `share`.
 * `connectLocal` (demo codes without a user id) records the connection on this device instead.
 */
export function scanWithSharing({ userId, name, connectLocal }) {
  const person = { id: userId || "", name: name || "" };
  return openShareSheet({
    moment: "scan", person, conn: userId ? connectionWith(userId)?.conn || null : null,
    async onConfirm(share) {
      const c = connectLocal ? await connectLocal(share) : await connectInPerson(userId, share);
      if (!c) return { error: social.get().lastError || "Couldn't connect. Check your connection and try again." };
      showAlert("Connected in person", `${c.user?.name || name} is now in your network. ${sharedSentence(countOf(c, share))}`);
      return { ok: true };
    },
  });
}

/** "What I share with <First>" → the sheet, then PUT users/:id/share. */
export function manageSharing(person, conn) {
  return openShareSheet({
    moment: "manage", person, conn,
    async onConfirm(share) {
      try {
        await put(`social/users/${encodeURIComponent(person.id)}/share`, { share });
        await refreshConnections();
        showAlert("Saved");
        return { ok: true };
      } catch (e) { return { error: e?.message || "Couldn't save. Try again." }; }
    },
  });
}

// ---------- vCard files ----------

/**
 * Shares a .vcf with the system share sheet when the browser can share files,
 * else downloads it. Call straight from a tap (share needs the user's gesture).
 */
export function shareVCardFile({ name, jobTitle, organization, items }) {
  const text = buildVCard({ name, jobTitle, organization, items });
  const fileName = vcfFileName(name);
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/vcard" }));
    const el = document.createElement("a");
    el.href = url;
    el.download = fileName;
    document.body.appendChild(el);
    el.click();
    el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  let file = null;
  try { file = new File([text], fileName, { type: "text/vcard" }); } catch { file = null; }
  if (file && navigator.canShare?.({ files: [file] }) && navigator.share) {
    navigator.share({ files: [file], title: name || "Contact" }).catch((e) => { if (e?.name !== "AbortError") download(); });
  } else {
    download();
  }
}

/** "Share my contact": the sheet (moment vcard), then a vCard of only the ticked items. */
export function shareMyVCard() {
  const a = auth.get();
  const me = a.me || {};
  const name = me.name || a.user?.name || "";
  return openShareSheet({
    moment: "vcard", person: { id: me.id || "", name },
    onConfirm(share) {
      const items = cardOf().items.filter((it) => (share || []).includes(it.id));
      shareVCardFile({ name, jobTitle: me.jobTitle || a.user?.jobTitle || "", organization: me.organization || a.user?.organization || "", items });
      return { ok: true };
    },
  });
}
