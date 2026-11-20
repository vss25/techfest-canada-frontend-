/* Shared by the content calendar (CalendarItems.jsx, SocialCalendar.jsx). */

export const ITEM_STATUS = {
  planned: ["#8A86A0", "#F6F5FA", "Planned"],
  done: ["#166534", "#F0FDF4", "Done on time"],
  late: ["#B45309", "#FFFBEB", "Done late"],
  missed: ["#B91C1C", "#FEF2F2", "Not done"],
};

/** A CSV file's text → rows of cells (quotes, commas and line breaks inside quotes handled). */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  let s = String(text || "");
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1); // Excel's byte-order mark
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === "," || ch === "\t") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && s[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim()));
}

