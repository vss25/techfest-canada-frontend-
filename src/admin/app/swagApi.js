import { api } from "../api";

/* =========================================================
   The admin side of the swag kit giveaway (batch 7, Oct 22 2026), every server call in one place:
     - the settings (Admin › Website & app › Swag kit giveaway): the app content keys swag.enabled, swag.kits,
       swag.cutoff, swag.announce, swag.title, swag.rules, read with GET /console/app-content and saved one by
       one with PUT /console/app-content/:key { value } (as App text & switches does);
     - the winners: GET /console/swag → { settings, winners: [{ userId, name, organization, points, rank }], live
       (true: the live leaderboard, before the cutoff), takenAt, cutoffPassed, announced: { at, by, winners } | null,
       canAnnounce } and POST /console/swag/announce { confirm: "ANNOUNCE", userIds (the ones shown, in order) }
       (management, after the cutoff: each winner gets the in-app notification and push "You won a TTFC swag kit!
       …", personal id swag-winners-2026) → { announced }; 409 code changed (the answer has the new winners) |
       not_yet | swag_off | already_announced;
     - the app download emails (App invite email page): the campaign each one uses, "App invite" and
       "Win the swag kit" (campaign key app-swag-2026, its own sends so people can get each once): /console/app-swag
       mirrors /console/app-invite (people already on the app come back with usingApp, canSelect false, reason
       usingApp; the recipients answer says swagEnabled; sends answer 409 { code: "swag_off" } while it's off).
   Backend: be-swag, branch claude/swag-oct22.
========================================================= */

export const swagApi = {
  contentPath: "/console/app-content",
  saveSetting: (key, value) => api.put(`/console/app-content/${encodeURIComponent(key)}`, { value }),
  winnersPath: "/console/swag",
  announce: (userIds) => api.post("/console/swag/announce", { userIds, confirm: "ANNOUNCE" }),
};

/** The app download emails. Each campaign has the same routes (template, preview, recipients, send-test,
    send-batch, send-all; the app invite also send-one) under its own base. `notOnAppOnly`: only people who've never signed in to the
    app can get it (the server checks again for each person when it sends). */
export const CAMPAIGNS = [
  {
    key: "app-invite", label: "App invite", base: "/console/app-invite", notOnAppOnly: false, sendOne: true,
    title: "App invite email",
    blurb: "One email to everyone with a pass or a role at TTFC 2026: “Open the TTFC app”, how to add it to their home screen, and the email to sign in with.",
    subjectHint: "Open the TTFC app",
  },
  {
    key: "app-swag-2026", label: "Win the swag kit", base: "/console/app-swag", notOnAppOnly: true, sendOne: false,
    title: "“Win the swag kit” email",
    blurb: "For people who haven't opened the TTFC app yet: get the app and you could win the TTFC swag kit (the photo is in the email), with the same install steps and the rules link.",
    subjectHint: "Get the TTFC app — and you could win the swag kit",
  },
];

export const campaignByKey = (key) => CAMPAIGNS.find((c) => c.key === key) || CAMPAIGNS[0];
