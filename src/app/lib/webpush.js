import { del, get, isDemoApi, post } from "./api";
import { beforeSignOut } from "./auth";
import { createStore, local } from "./store";
import { watchIncoming } from "./social";
import { showAlert } from "./ui";
import { detectOS, isStandalone } from "../../lib/pwaPlatform";

/* =========================================================
   Message notifications (Web Push), like the iOS and Android
   apps' pushes for new chat messages.
   • "Turn on notifications" (Chats banner, Settings) asks for
     permission from that tap, subscribes this device with the
     server's VAPID key (GET /api/app/webpush-key) and hands the
     subscription to the server (POST /api/app/webpush). The
     service worker (sw/sw.js) shows the pushes; a tap opens
     the chat: /app/chat/<senderId>.
   • iPhone and iPad only get Web Push in the app added to the
     Home Screen (iOS 16.4+): in a Safari tab we point to the TTFC
     app on the App Store instead (Oct 22 2026: no more Home
     Screen install prompts).
   • Until the server has this device (it couldn't be reached,
     or demo mode), the app's own chat-list check notifies while
     the app is open in the background.
   • Signing out removes this device from the server
     (DELETE /api/app/webpush) and unsubscribes it.
========================================================= */

const ON_KEY = "ttfc.push.on";
const ENDPOINT_KEY = "ttfc.push.endpoint";
const ICON = "/app/icons/icon-192.png";
const BADGE = "/app/icons/icon-96.png";

/** "ok" | "install" (iPhone/iPad outside the Home Screen app) | "unsupported" */
function supportNow() {
  if (typeof window === "undefined") return "unsupported";
  if (detectOS() === "ios" && !isStandalone()) return "install";
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window ? "ok" : "unsupported";
}
const permissionNow = () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);
const wanted = () => local.get(ON_KEY) === "1";

export const webPush = createStore({
  support: supportNow(),
  permission: permissionNow(),
  on: wanted() && permissionNow() === "granted",
  registered: false,   // the server has this device's subscription (this session)
  busy: false,
});

const refresh = () => {
  const permission = permissionNow();
  webPush.set({ permission, on: wanted() && permission === "granted" });
};

/** The web app route a notification opens for a chat. */
export const chatURL = (userId) => `/app/chat/${encodeURIComponent(userId)}`;

export const BLOCKED_HELP = detectOS() === "ios"
  ? "Turn them on in Settings › Notifications › TTFC."
  : "Allow notifications for this site in your browser's settings, then try again.";

async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  try { return (await navigator.serviceWorker.getRegistration("/app/")) || null; } catch { return null; }
}

function keyBytes(base64url) {
  const s = String(base64url).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
function sameKey(buf, bytes) {
  if (!buf) return false;
  const a = new Uint8Array(buf);
  return a.length === bytes.length && a.every((v, i) => v === bytes[i]);
}

/** Subscribes this device (permission granted) and gives the subscription to the server. */
async function subscribe() {
  if (isDemoApi()) return; // demo: nothing leaves the device; the app's own check notifies
  const reg = await registration();
  if (!reg?.pushManager) throw new Error("Reload the app, then try again.");
  const { publicKey } = await get("app/webpush-key", { auth: false });
  if (!publicKey) throw new Error("Try again in a moment.");
  const key = keyBytes(publicKey);
  let sub = await reg.pushManager.getSubscription();
  // A new server key: the old subscription can't receive anything any more.
  if (sub && !sameKey(sub.options?.applicationServerKey, key)) { await sub.unsubscribe().catch(() => {}); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const { endpoint, keys = {} } = sub.toJSON();
  await post("app/webpush", { subscription: { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } } });
  local.set(ENDPOINT_KEY, endpoint);
  webPush.set({ registered: true });
}

/** "Turn on notifications": call straight from the tap (iOS only asks from a user gesture). */
export async function turnOnNotifications() {
  const st = webPush.get();
  if (st.busy) return false;
  if (st.support !== "ok") {
    showAlert("Notifications aren't available here", st.support === "install" ? "Get the TTFC app from the App Store or Google Play to get message notifications." : "This browser can't show notifications.");
    return false;
  }
  webPush.set({ busy: true });
  try {
    const permission = permissionNow() === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") {
      refresh();
      if (permission === "denied") showAlert("Notifications are blocked", BLOCKED_HELP);
      return false;
    }
    local.set(ON_KEY, "1");
    refresh();
    try {
      await subscribe();
      showAlert("Notifications on", "You'll get a notification when someone messages you.");
    } catch (e) {
      // Still on: the next launch tries again, and the app notifies while it's open in the background.
      showAlert("Couldn't finish turning on notifications", e?.message || "Try again in a moment.");
    }
    return true;
  } finally {
    webPush.set({ busy: false });
  }
}

/** Removes this device from the server and the browser. `token`: the signed-in token (sign-out passes the old one);
    `server: false` for demo mode (nothing was sent). */
async function dropSubscription({ token, server = !isDemoApi() } = {}) {
  const saved = local.get(ENDPOINT_KEY, "");
  local.set(ENDPOINT_KEY, null);
  webPush.set({ registered: false });
  const reg = await registration();
  const sub = reg?.pushManager ? await reg.pushManager.getSubscription().catch(() => null) : null;
  const endpoint = saved || sub?.endpoint;
  if (endpoint && server) await del("app/webpush", { body: { endpoint }, ...(token ? { token } : {}) }).catch(() => {});
  await sub?.unsubscribe().catch(() => {});
}

export async function turnOffNotifications() {
  local.set(ON_KEY, null);
  refresh();
  await dropSubscription();
}

/** At launch, signed in with notifications on and allowed: the subscription must use the server's current key
    (else unsubscribe and subscribe again), and the server gets it again (a lost or revoked subscription heals). */
export async function syncNotifications() {
  refresh();
  const st = webPush.get();
  if (!st.on || st.support !== "ok") return;
  try { await subscribe(); } catch { /* next launch */ }
}

beforeSignOut(({ mode, token }) => {
  const had = wanted();
  local.set(ON_KEY, null);
  refresh();
  if (had) dropSubscription({ token, server: mode === "user" });
});

if (typeof document !== "undefined") {
  // Notifications switched on or off in the phone's settings while the app was away.
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
}

// ---------- While the app is open but hidden ----------

/** A new message found by the chat-list check while the app is in the background (no push for this device). */
async function notifyLocally(t) {
  const st = webPush.get();
  if (!st.on || st.registered || document.visibilityState === "visible") return;
  const id = t.user?.id;
  if (!id) return;
  const title = t.user.name || "New message";
  const options = { body: t.lastMessage?.body || "", tag: `dm.${id}`, data: { url: chatURL(id) }, icon: ICON, badge: BADGE };
  const reg = await registration();
  if (reg?.showNotification) { await reg.showNotification(title, options).catch(() => {}); return; }
  try {
    const n = new Notification(title, options);
    n.onclick = () => { window.focus(); openAppURL(options.data.url); n.close(); };
  } catch { /* phones need the service worker */ }
}

watchIncoming({
  whileHidden: () => webPush.get().on && !webPush.get().registered,
  notify: notifyLocally,
});

// ---------- A tap on a notification ----------

let navigateTo = null;
/** "/app/chat/x" → "/chat/x" in the app's router (or a page load when the router isn't ready). */
function openAppURL(url) {
  const path = String(url || "");
  if (!path.startsWith("/app/")) return;
  if (navigateTo) navigateTo(path.slice(4));
  else window.location.assign(path);
}

/** App.jsx: the service worker asks an open window to show a notification's screen. Returns the cleanup. */
export function listenForNotificationTaps(navigate) {
  navigateTo = navigate;
  if (!("serviceWorker" in navigator)) return () => { navigateTo = null; };
  const onMessage = (e) => { if (e.data?.type === "NAVIGATE") openAppURL(e.data.url); };
  navigator.serviceWorker.addEventListener("message", onMessage);
  return () => { navigateTo = null; navigator.serviceWorker.removeEventListener("message", onMessage); };
}
