import { timeText } from "./timers.js";

const WHERE = { lobby: "Lobby", desk: "Pass desk", scanner: "QR scan", breakfast: "Breakfast", lunch: "Lunch", evening: "Evening", media: "Media desk", av: "AV", exhibitor: "Exhibitor desk", admin: "Admin" };

/** "10:42 AM by Sam (Lobby)" (· pending, · override, · practice on a day that isn't an event day). */
export function byLine(m) {
  if (!m) return "";
  const where = WHERE[m.station] || "";
  return `${timeText(m.at)}${m.by?.name ? ` by ${m.by.name}` : ""}${where ? ` (${where})` : ""}${m.pending ? " · pending" : ""}${m.override ? " · override" : ""}${m.practice ? " · practice" : ""}`;
}
