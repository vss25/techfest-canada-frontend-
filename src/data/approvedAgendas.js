/* The agendas written into the approved website design (board 12), by city.
   Admin › Agenda can copy one into the CMS as saved changes for that event, so staff
   edit them there instead of the design's sample text. Times are 24-hour. */

export const APPROVED_AGENDAS = {
  vancouver: [
    { type: "Keynote", format: "keynote", time: "09:00", endTime: "09:30", title: "Opening: Five Pillars, One Sector, Canada Builds in BC",
      description: "The thesis for the day: how AI, quantum, cyber, robotics and cleantech meet the build-out of BC’s energy corridor." },
    { type: "Panel", format: "panel", time: "09:30", endTime: "10:15", title: "Building the Corridor: Power, Pipelines & Tidewater",
      description: "Transmission, LNG and port operators on what the North Coast corridor needs from technology suppliers, and when." },
    { type: "Panel", format: "panel", time: "10:15", endTime: "11:00", title: "AI in Production, Not Pilots, and the 400 MW Fight for Power",
      description: "Enterprise AI already running in operations, and the data-centre load question BC’s grid has to answer." },
    { type: "Fireside chat", format: "fireside", time: "11:20", endTime: "12:00", title: "Decarbonising the Hard Stuff",
      description: "One industrial decarbonisation project with real numbers: cost, timeline and what the technology delivered." },
    { type: "Panel", format: "panel", time: "12:50", endTime: "13:30", title: "Securing What Runs the Province: OT Cyber & Digital Trust",
      description: "Operational-technology security for utilities and mines, from audit findings to the fixes that work." },
    { type: "Demo sprint", format: "provocation", time: "13:35", endTime: "14:05", title: "Robots You Can Buy on Monday",
      description: "Three live robotics demos judged by a buyer: what is ready to deploy on a site today." },
    { type: "Fireside chat", format: "fireside", time: "14:05", endTime: "14:45", title: "Quantum: Two Clusters, One Country",
      description: "Ontario and BC quantum leaders on the realistic horizon and post-quantum readiness for critical infrastructure." },
    { type: "Closing panel", format: "closing", time: "14:55", endTime: "15:40", title: "What Gets Built, Funded & Permitted Next",
      description: "Project owners, investors and permitting leads put their 2027 commitments on the record." },
  ],
};

/** The approved agenda for an event record, by its city ("Vancouver" → vancouver), or null. */
export function approvedAgendaFor(ev) {
  const city = String(ev?.city || "").toLowerCase().trim();
  return APPROVED_AGENDAS[city] || null;
}

/** "13:35" → "1:35" (the approved design writes times without AM / PM). */
export function shortTime(t) {
  if (!t || typeof t !== "string" || !t.includes(":")) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}`;
}

const FORMAT_WORDS = {
  keynote: "Keynote", panel: "Panel", fireside: "Fireside chat", opening: "Opening", closing: "Closing panel",
  networking: "Networking", break: "Break", briefing: "Boardroom briefing", provocation: "Provocation",
  dialogue: "Leadership dialogue", awards: "Awards", Performance: "Performance",
};

/** CMS sessions → the approved design's agenda rows { kind, time, title, desc, who, more }. */
export function toDesignSessions(sessions = []) {
  return [...sessions]
    .filter((s) => s && s.title && s.time)
    .sort((a, b) => (Number(a.day) || 1) - (Number(b.day) || 1) || String(a.time).localeCompare(String(b.time)))
    .map((s) => {
      const people = (s.speakers || []).map((p) => p?.name).filter(Boolean);
      const mod = s.moderator?.name;
      const multiDay = sessions.some((x) => Number(x.day) > 1);
      return {
        kind: s.type || FORMAT_WORDS[s.format] || "Session",
        time: (multiDay ? `Day ${Number(s.day) || 1} · ` : "") + shortTime(s.time),
        title: s.title,
        desc: s.description || "",
        who: s.isBreak ? "" : [mod && `Moderator: ${mod}`, people.length ? people.join(", ") : ""].filter(Boolean).join(" · ") || "Speakers to be announced",
        more: "",
      };
    });
}

/** What the agenda shows before an event has any sessions. */
export const AGENDA_SOON = [{
  kind: "Coming soon", time: "", title: "The agenda is announced soon",
  desc: "Sessions and times are published here as they are confirmed. Join the list to hear first.", who: "", more: "",
}];
