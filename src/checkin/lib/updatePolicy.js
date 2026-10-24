/* =========================================================
   TTFC Check-in: when a new version of the app is put to use
   ---------------------------------------------------------
   A new version (a waiting service worker) is only applied by itself
   (it reloads the page) while no station has been running in this tab:
   on the sign-in screen, the loading screen, and the Start screen and
   station picker before any station was started in this tab. Once a
   station has been started in a tab, it is never reloaded on its own,
   in front or in the background, and neither the station picker opened
   over it (Switch station) nor the Start screen it leads to changes
   that: its chime, banners and own Undo (of a tap made seconds before
   the switch) would be lost. It shows "Update ready ·
   tap to reload" instead; the taps waiting on the device are kept
   through the reload. A reload applied by itself from the Start screen
   comes back on that Start screen (resume), like the tap does.
   Pure; node --test src/checkin/lib/updatePolicy.test.mjs
========================================================= */

/** The screens on which a waiting update applies itself (the picker only before any station was started here). */
export const AUTO_UPDATE_SCREENS = Object.freeze(["login", "loading", "stations", "start"]);
export const autoUpdateAllowed = (screen) => AUTO_UPDATE_SCREENS.includes(screen);

/**
 * The screen the update policy is told about, from what the app shows. `started`: a station is started now (sound on,
 * banners, own Undo), the picker may be open over it; `startedBefore`: a station was started earlier in this tab (this
 * sign-in). Any station screen, the lock screen, and the picker and Start screen once a station has run here count as
 * "station".
 */
export function updateScreen({ screen = "loading", started = false, startedBefore = false } = {}) {
  if (screen === "locked") return "station";
  if ((screen === "stations" || screen === "start") && (started || startedBefore)) return "station";
  return screen || "loading";
}

/**
 * createUpdateController({ activate, reload, onReady })
 *   activate(worker, { resume })  apply that waiting worker (it reloads the page); `resume`: the station to reopen on
 *                                 its Start screen after the reload ("" for none)
 *   reload({ resume })            reload the page (nothing waiting)
 *   onReady(bool)                 "Update ready" to show / hide
 * → { found(worker), setScreen(name, { station }), applyNow({ station }), ready(), screen() }
 */
export function createUpdateController({ activate, reload = () => {}, onReady = () => {} } = {}) {
  let screen = "loading";
  let station = "";
  let waiting = null;
  let ready = false;
  let applied = false;
  const setReady = (v) => { if (v !== ready) { ready = v; onReady(v); } };
  const go = (resume) => { if (!waiting || applied) return; applied = true; activate(waiting, { resume: resume || "" }); };
  // By itself: only the Start screen has a station to come back to (its Start screen again, one tap for sound).
  const auto = () => go(screen === "start" ? station : "");
  return {
    /** A new version is installed and waiting. */
    found(worker) {
      if (!worker) return;
      waiting = worker;
      if (autoUpdateAllowed(screen)) auto();
      else setReady(true);
    },
    /** The screen the app shows now (updateScreen(): "station" while a station runs or has run in this tab). */
    setScreen(name, { station: st = "" } = {}) {
      screen = name || "loading";
      station = st || "";
      if (waiting && autoUpdateAllowed(screen)) auto();
    },
    /** "Update ready" tapped: `station` comes back on its Start screen. */
    applyNow({ station: st = "" } = {}) { if (waiting) go(st); else reload({ resume: st || "" }); },
    ready: () => ready,
    screen: () => screen,
  };
}
