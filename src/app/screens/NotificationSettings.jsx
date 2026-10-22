import { useEffect } from "react";
import { useStore } from "../lib/store";
import { DIGEST_PREF, loadNotifyPrefs, NOTIFY_PREFS, notifyPrefs, setNotifyPref } from "../lib/engage";
import { PushSetting } from "../components/PushControls";
import { Spinner, Switch, TopBar } from "../components/ui";

/* =========================================================
   Settings › Notifications (Oct 22 2026; iOS NotificationSettingsView):
   this phone's notifications on or off, then what you hear about on
   every device (GET / PATCH social/notify/prefs, lib/engage.js), and
   the "what you missed" email. Each switch flips on the first tap and
   saves on its own.
========================================================= */

export default function NotificationSettings() {
  const { prefs, error, saving } = useStore(notifyPrefs);
  useEffect(() => { loadNotifyPrefs(); }, []);

  const row = (p) => (
    <Switch key={p.key} label={p.label} description={p.hint} checked={prefs?.[p.key] !== false}
      disabled={!!saving[p.key]} onChange={(v) => setNotifyPref(p.key, v)} />
  );

  return (
    <div className="page">
      <TopBar title="Notifications" />
      <main id="main" className="pad stack-lg" style={{ paddingTop: 16 }}>
        <section className="card stack-sm" aria-labelledby="np-phone">
          <h2 id="np-phone" className="eyebrow">On this phone</h2>
          <PushSetting />
        </section>

        {!prefs ? (error ? <p className="muted center">{error}</p> : <Spinner label="Loading your notification settings" />) : (
          <>
            <section className="card stack-sm" aria-labelledby="np-what">
              <h2 id="np-what" className="eyebrow">Notify me about</h2>
              <div className="stack-sm notify-prefs">{NOTIFY_PREFS.map(row)}</div>
              <p className="tiny muted" style={{ margin: 0 }}>For this phone and the TTFC app on your other devices. You never get notified about your own activity, or about people you've blocked.</p>
            </section>
            <section className="card stack-sm" aria-labelledby="np-email">
              <h2 id="np-email" className="eyebrow">Email</h2>
              {row(DIGEST_PREF)}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
