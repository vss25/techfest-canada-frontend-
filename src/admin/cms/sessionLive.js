/* Per-session live polls and audience Q&A. The rule is a copy of
   techfest-canada-backend services/sessionLive.js (keep the two in step);
   the server enforces it and the apps read the same Sanity fields.

   Each session has `polls` and `qa`: "auto" | "on" | "off" (missing = "auto").
   "on" is on, "off" is off. "auto" is on when the session has a moderator
   (moderator.name not blank) and is not a keynote (format "keynote") or a
   break (isBreak true or format "break"). The global switches (App text &
   switches: flag.polls, flag.qa) still apply on top: global off = off everywhere. */

export const LIVE_MODES = ["auto", "on", "off"];
export const LIVE_FEATURES = ["polls", "qa"];

/** Anything that isn't "on" or "off" counts as "auto". */
export const liveMode = (v) => (v === "on" || v === "off" ? v : "auto");

/** What "auto" resolves to and why: "break" | "keynote" | "noModerator" (all off) or "moderator" (on). */
export function autoReason(s) {
  if (s?.isBreak === true || s?.format === "break") return "break";
  if (s?.format === "keynote") return "keynote";
  if (!String(s?.moderator?.name ?? "").trim()) return "noModerator";
  return "moderator";
}

/** Is `feature` ("polls" | "qa") on for this session, before the global switch? */
export function featureOn(s, feature) {
  const mode = liveMode(s?.[feature]);
  if (mode === "on") return true;
  if (mode === "off") return false;
  return autoReason(s) === "moderator";
}

/** { pollsOn, qaOn } for a session. `global` = the flag.polls / flag.qa switches (default on). */
export function sessionLive(s, global = {}) {
  return {
    pollsOn: global.polls !== false && featureOn(s, "polls"),
    qaOn: global.qa !== false && featureOn(s, "qa"),
  };
}

/* ---------- admin panel text ---------- */

export const FEATURE_LABELS = { polls: "Live polls", qa: "Audience Q&A" };
export const BADGE_LABELS = { polls: "Polls", qa: "Q&A" };
export const MODE_LABELS = { auto: "Auto", on: "On", off: "Off" };

export const AUTO_HINTS = {
  moderator: "Auto: on, this session has a moderator",
  keynote: "Auto: off, keynote",
  break: "Auto: off, break",
  noModerator: "Auto: off, no moderator",
};

/** flag.polls / flag.qa from /console/app-content rows → { polls, qa } (on unless switched off; old rows may be "false"). */
export function globalSwitches(rows) {
  const value = (key) => {
    const v = (Array.isArray(rows) ? rows : []).find((r) => r?.key === key)?.value;
    return !(v === false || v === "false");
  };
  return { polls: value("flag.polls"), qa: value("flag.qa") };
}
