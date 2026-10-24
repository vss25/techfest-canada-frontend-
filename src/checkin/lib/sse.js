/* =========================================================
   TTFC Check-in: reading the live stream
   ---------------------------------------------------------
   The server's Server-Sent Events (GET /api/checkin/desk/stream) are
   read with fetch, not EventSource, so the sign-in travels in the
   Authorization header and never in a URL (EventSource can't send
   headers). Works in Safari (iPad / iPhone, tab or Home Screen),
   Chrome, Edge and Firefox. This file only turns the bytes into
   { event, data, id } frames.
   Pure; node --test src/checkin/lib/sse.test.mjs
========================================================= */

/** A parser: feed(text) as chunks arrive; onFrame({ event, data, id }) for each complete frame. */
export function createSseParser(onFrame) {
  let buf = "";
  let event = "";
  let data = [];
  let id = null;
  const dispatch = () => {
    if (data.length) {
      const text = data.join("\n");
      let parsed = text;
      try { parsed = JSON.parse(text); } catch { /* plain text */ }
      onFrame({ event: event || "message", data: parsed, id });
    }
    event = ""; data = []; id = null;
  };
  return {
    feed(chunk) {
      buf += String(chunk).replace(/\r\n?/g, "\n");
      let i;
      while ((i = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (line === "") { dispatch(); continue; }
        if (line.startsWith(":")) continue; // a comment (keep-alive)
        const c = line.indexOf(":");
        const field = c === -1 ? line : line.slice(0, c);
        let value = c === -1 ? "" : line.slice(c + 1);
        if (value.startsWith(" ")) value = value.slice(1);
        if (field === "event") event = value;
        else if (field === "data") data.push(value);
        else if (field === "id") id = value;
      }
    },
  };
}
