import { api } from "../api";

/* =========================================================
   The admin side of the leaderboard's top networkers (batch 7 as the swag kit giveaway; appreciation, not a prize,
   since Oct 27 2026: Admin › Website & app › Top networkers), every server call in one place. The settings now also
   have swag.celebrate (the celebration at the announce time; the announce depends on it, not on swag.enabled, which
   is only the old apps' prize banner):
     - the settings (Admin › Website & app › Swag kit giveaway): the app content keys swag.enabled, swag.kits,
       swag.cutoff, swag.announce, swag.title, swag.rules, read with GET /console/app-content and saved one by
       one with PUT /console/app-content/:key { value } (as App text & switches does);
     - the winners: GET /console/swag → { settings, winners: [{ userId, name, organization, points, rank }], live
       (true: the live leaderboard, before the cutoff), takenAt, cutoffPassed, announced: { at, by, winners } | null,
       canAnnounce } and POST /console/swag/announce { confirm: "ANNOUNCE", userIds (the ones shown, in order) }
       (management, after the cutoff: each winner gets the in-app notification and push "You won a TTFC swag kit!
       …", personal id swag-winners-2026) → { announced }; 409 code changed (the answer has the new winners) |
       not_yet | swag_off | already_announced;
     - the email: there's no separate one (the organiser, Oct 22 2026: "this is supposed to be an advertisement for
       the app, not a separate campaign"). While the giveaway is on, the App invite email carries the swag block
       (its wording is on the App invite email page, /console/app-invite).
   Backend: be-swag (claude/swag-oct22) and be-swinv (claude/swag-invite).
========================================================= */

export const swagApi = {
  contentPath: "/console/app-content",
  saveSetting: (key, value) => api.put(`/console/app-content/${encodeURIComponent(key)}`, { value }),
  winnersPath: "/console/swag",
  announce: (userIds) => api.post("/console/swag/announce", { userIds, confirm: "ANNOUNCE" }),
};
