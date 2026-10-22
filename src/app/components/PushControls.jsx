import { useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, X } from "lucide-react";
import { useStore, local } from "../lib/store";
import { BLOCKED_HELP, turnOffNotifications, turnOnNotifications, webPush } from "../lib/webpush";
import { IconButton, Switch } from "./ui";

/* =========================================================
   "Turn on notifications" for new messages (lib/webpush.js):
   a banner at the top of Chats until it's on or dismissed, and
   the switch in Settings. iPhone in a Safari tab: add the app
   to the Home Screen first (Web Push only works there).
========================================================= */

const BANNER_KEY = "ttfc.push.bannerDismissed";
const INSTALL_TEXT = "Add TTFC to your Home Screen to get message notifications";

/** `className`: the wrapper's (nothing renders when there's nothing to say). */
export function PushBanner({ className }) {
  const p = useStore(webPush);
  const [hidden, setHidden] = useState(() => local.get(BANNER_KEY) === "1");
  if (hidden || p.on || p.support === "unsupported" || p.permission === "denied") return null;
  const dismiss = () => { local.set(BANNER_KEY, "1"); setHidden(true); };
  const install = p.support === "install";
  return (
    <div className={className}>
      <div className="banner push-banner" role="region" aria-label="Message notifications">
        <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
          <BellRing aria-hidden="true" className="push-banner-ico" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{install ? "Get message notifications" : "Know when someone writes"}</b>
            <p>{install ? `${INSTALL_TEXT}.` : "Get a notification on this phone for new messages."}</p>
          </div>
          <IconButton icon={X} label="Not now" small onClick={dismiss} />
        </div>
        {install
          ? <Link to="/install?from=push" className="btn btn-block">Show me how</Link>
          : <button type="button" className="btn btn-block" onClick={turnOnNotifications} disabled={p.busy}>Turn on notifications</button>}
      </div>
    </div>
  );
}

/** Settings › Notifications › On this phone. */
export function PushSetting() {
  const p = useStore(webPush);
  if (p.support === "unsupported") return <p className="tiny muted" style={{ margin: 0 }}>This browser can't show notifications.</p>;
  if (p.support === "install") {
    return (
      <div className="stack-sm">
        <span className="small">{INSTALL_TEXT}.</span>
        <Link to="/install?from=push-settings" className="small bold" style={{ color: "var(--pur-alt)" }}>Show me how</Link>
      </div>
    );
  }
  const blocked = p.permission === "denied";
  return (
    <Switch
      label="Notifications"
      description={blocked ? `Notifications are blocked. ${BLOCKED_HELP}` : p.on ? "On for this phone." : "Turn on to get messages, replies and mentions on this phone."}
      checked={p.on}
      disabled={blocked || p.busy}
      onChange={(v) => (v ? turnOnNotifications() : turnOffNotifications())}
    />
  );
}
