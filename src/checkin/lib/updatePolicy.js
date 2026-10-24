/* =========================================================
   TTFC Check-in: when a new version of the app is put to use
   ---------------------------------------------------------
   A new version (a waiting service worker) is only applied by itself
   (it reloads the page) while no station is running: on the sign-in
   screen, the loading screen, the station picker or the Start screen.
   A running station is never reloaded on its own, in front or in the
   background: its chime, banners and own Undo would be lost. It shows
   "Update ready · tap to reload" instead; the taps waiting on the
   device are kept through the reload.
   Pure; node --test src/checkin/lib/updatePolicy.test.mjs
========================================================= */

/** The screens on which a waiting update applies itself. */
export const AUTO_UPDATE_SCREENS = Object.freeze(["login", "loading", "stations", "start"]);
export const autoUpdateAllowed = (screen) => AUTO_UPDATE_SCREENS.includes(screen);

/**
 * createUpdateController({ activate, reload, onReady })
 *   activate(worker)  apply that waiting worker (it reloads the page)
 *   reload()          reload the page (nothing waiting)
 *   onReady(bool)     "Update ready" to show / hide
 * → { found(worker), setScreen(name), applyNow(), ready() }
 */
export function createUpdateController({ activate, reload = () => {}, onReady = () => {} } = {}) {
  let screen = "loading";
  let waiting = null;
  let ready = false;
  let applied = false;
  const setReady = (v) => { if (v !== ready) { ready = v; onReady(v); } };
  const go = () => { if (!waiting || applied) return; applied = true; activate(waiting); };
  return {
    /** A new version is installed and waiting. */
    found(worker) {
      if (!worker) return;
      waiting = worker;
      if (autoUpdateAllowed(screen)) go();
      else setReady(true);
    },
    /** The screen the app shows now ("station" while a station is running). */
    setScreen(name) {
      screen = name || "loading";
      if (waiting && autoUpdateAllowed(screen)) go();
    },
    /** "Update ready" tapped. */
    applyNow() { if (waiting) go(); else reload(); },
    ready: () => ready,
    screen: () => screen,
  };
}
