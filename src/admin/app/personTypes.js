/* =========================================================
   Person types and app rights, for the admin panel.
   The server decides (backend services/teamRoles.js and
   services/appRights.js); this copy of the same rules only
   previews a person's rights while their type is being edited.
========================================================= */

export const PERSON_TYPES = ["attendee", "speaker", "exhibitor", "vip", "staff", "vendor", "volunteer"];

export const TYPE_LABELS = {
  attendee: "Attendee",
  speaker: "Speaker",
  exhibitor: "Exhibitor",
  vip: "VIP",
  staff: "Staff",
  vendor: "Vendor",
  volunteer: "Volunteer",
};

export const RIGHTS = [
  "sendMessages", "receiveMessages", "sendRequests", "receiveRequests",
  "post", "comment", "startDiscussions", "createGroups", "shareContact",
  "deleteAnyPost", "moderate", "checkIn",
];

export const RIGHT_LABELS = {
  sendMessages: "Send messages",
  receiveMessages: "Receive messages",
  sendRequests: "Send connection requests",
  receiveRequests: "Receive connection requests",
  post: "Post in the feed",
  comment: "Comment",
  startDiscussions: "Start discussions",
  createGroups: "Create groups",
  shareContact: "Share contact details on badge scan",
  deleteAnyPost: "Delete any post",
  moderate: "Moderate content",
  checkIn: "Check people in",
};

/** Combined with AND across someone's types (the most protective wins). */
export const INBOUND_RIGHTS = ["receiveMessages", "receiveRequests"];
/** Staff accounts (admin panel access) always keep these. */
export const ADMIN_POWERS = ["deleteAnyPost", "moderate", "checkIn"];

/** Changing these is management only, like changing someone's role. */
export const TEAM_TYPES = ["staff", "volunteer"];

const inOrder = (set) => PERSON_TYPES.filter((t) => set.has(t));

/**
 * Effective types from what's stored plus the automatic ones.
 * `auto`: [{ type, from }] from the server (attendee aside), `holdsPass`: has a ticket or pass.
 * Attendee is automatic for pass holders with no other type.
 */
export function effectiveTypes({ types = [], typesOff = [], auto = [], holdsPass = false }) {
  const off = new Set(typesOff);
  const on = new Set([...types, ...auto.map((a) => a.type)]);
  for (const t of off) on.delete(t);
  if (!on.size && !off.has("attendee") && holdsPass) on.add("attendee");
  return inOrder(on);
}

/** Same rule as the server's effectiveRights (flags = { allowPosts, allowGroups }). */
export function effectiveRights(types, matrix, person = {}, flags = {}) {
  const list = types.length ? types : ["attendee"];
  const cols = list.map((t) => matrix?.[t] || {});
  const out = {};
  for (const r of RIGHTS) out[r] = INBOUND_RIGHTS.includes(r) ? cols.every((c) => !!c[r]) : cols.some((c) => !!c[r]);
  if (person.messagesOff) out.receiveMessages = false;
  if (person.requestsOff) out.receiveRequests = false;
  if (person.role === "admin") for (const r of ADMIN_POWERS) out[r] = true;
  if (flags.allowPosts === false) out.post = false;
  if (flags.allowGroups === false) out.createGroups = false;
  return out;
}

/** Switch one type on or off for a person: { types, typesOff } after the change. */
export function toggleType(t, { types = [], typesOff = [], auto = [], holdsPass = false }, wantOn) {
  let nextTypes = types.filter((x) => x !== t);
  let nextOff = typesOff.filter((x) => x !== t);
  const has = (ty, off) => effectiveTypes({ types: ty, typesOff: off, auto, holdsPass }).includes(t);
  if (wantOn) {
    if (!has(nextTypes, nextOff)) nextTypes = [...nextTypes, t];
  } else if (has(nextTypes, nextOff)) {
    nextOff = [...nextOff, t];
  }
  return { types: inOrder(new Set(nextTypes)), typesOff: inOrder(new Set(nextOff)) };
}

/** Tags for a people list: their types, minus what the role badge already says and minus attendee. */
export function typeTags(types = [], role = "user") {
  return types.filter((t) => t !== "attendee" && !(t === "staff" && role === "admin") && !(t === "volunteer" && role === "volunteer"));
}

export const TYPE_TONE = { vip: "orange", speaker: "purple", exhibitor: "purple", staff: "pink", vendor: "neutral", volunteer: "purple", attendee: "neutral" };
