import { ADMIN_API, api, getToken } from "../api";

/* =========================================================
   The admin side of the attendee survey (Oct 26 2026), every server call in one place (backend
   claude/survey-winners; management saves and sends, staff read, the server enforces it):
     GET  /console/survey → { config: { enabled, opensAt, closesAt, title, intro, thankYou, notifyTitle, notifyBody,
          autoNotify, notifiedAt?, questions }, counts: { responses, app, link }, averages, url }
     PUT  /console/survey { enabled, opensAt, closesAt, title, intro, thankYou, notifyTitle, notifyBody, autoNotify,
          questions } → { config }
     GET  /console/survey/responses?page= (0-based) → { total, page, size, questions, rows: [{ id, at, source, name,
          email, title, company, answers }] }
     GET  /console/survey/export → CSV
     POST /console/survey/notify { confirm: "SEND" } → { sent }   (the app notification + push, now)
     GET  /console/survey/email?audience=day1|day2|both → { count, sample: [names], subject, html, text }   (preview only)
     POST /console/survey/email { audience, confirm: "SEND" } → { sent, skipped } | 403 { code: "closed" } before it opens
     GET  /console/survey/link?email= → { name, email, url, checkedIn, warning? }   (one person's personal link, management)
     POST /console/survey/links { emails } → [{ email, name, url, checkedIn, warning? } | { email, error }]
   The organiser (Oct 26 2026): nothing is sent until they have reviewed the survey; autoNotify is off by default. The
   survey is by invitation only ("sent out to attendees one on one") and only for people who checked in: there's no
   public link, staff share each person's own.
========================================================= */

export const AUDIENCES = Object.freeze([
  { key: "day1", label: "Checked in Day 1", hint: "Monday, October 26" },
  { key: "day2", label: "Checked in Day 2", hint: "Tuesday, October 27" },
  { key: "both", label: "Either day", hint: "Checked in on Monday or Tuesday" },
]);

export const surveyApi = {
  path: "/console/survey",
  save: (config) => api.put("/console/survey", config),
  responsesPath: (page) => `/console/survey/responses?page=${Math.max(0, page | 0)}`,
  notify: () => api.post("/console/survey/notify", { confirm: "SEND" }),
  link: (email) => api.get(`/console/survey/link?email=${encodeURIComponent(email)}`),
  links: (emails) => api.post("/console/survey/links", { emails }),
  emailPath: (audience) => `/console/survey/email?audience=${encodeURIComponent(audience)}`,
  email: (audience) => api.post("/console/survey/email", { audience, confirm: "SEND" }),
  /** The CSV as a download (the server's file name, else ttfc-survey-<date>.csv). */
  async exportCsv() {
    const res = await fetch(`${ADMIN_API}/console/survey/export`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Export failed (${res.status})`);
    const name = /filename="?([^";]+)"?/i.exec(res.headers.get("Content-Disposition") || "")?.[1] || `ttfc-survey-${new Date().toISOString().slice(0, 10)}.csv`;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
