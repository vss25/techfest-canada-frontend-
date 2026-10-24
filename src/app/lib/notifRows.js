/* =========================================================
   Server notification rows (GET social/notifications) as items
   of the Notifications list (lib/notifications.js). Pure; tested
   in notifRows.test.mjs.
     personal / report  a message from the TTFC team: opens its link
     conn               "<name> connected with you" / "Scanned your
                        TTFC pass" (someone scanned your entry QR,
                        Oct 24 2026): a connection row (the people
                        icon) that opens their profile
   Ids keep the "pn-" prefix: reading one tells the server.
========================================================= */

export function serverItem(n) {
  const base = { id: `pn-${n.id}`, title: n.title || "", detail: n.body || "", date: n.createdAt, serverRead: !!n.readAt, from: n.sentByName || "" };
  if (n.kind === "conn") {
    const who = String(n.fromUserId || "");
    return {
      ...base, kind: "connection", to: who ? `/people/${encodeURIComponent(who)}` : "/network/connected",
      connectionId: String(n.connectionId || ""), avatarUrl: n.avatarUrl || "",
    };
  }
  return { ...base, kind: "personal", link: n.link || "ttfc://tab/home" };
}
