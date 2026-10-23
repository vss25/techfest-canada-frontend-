import { timeText } from "./timers.js";

/** "10:42 AM by Sam (Lobby)". */
export function byLine(m) {
  if (!m) return "";
  const where = { lobby: "Lobby", desk: "Pass desk", scanner: "QR scan", breakfast: "Breakfast", lunch: "Lunch", evening: "Evening", media: "Media desk", av: "AV", exhibitor: "Exhibitor desk", admin: "Admin" }[m.station] || "";
  return `${timeText(m.at)}${m.by?.name ? ` by ${m.by.name}` : ""}${where ? ` (${where})` : ""}${m.pending ? " · pending" : ""}${m.override ? " · override" : ""}`;
}

