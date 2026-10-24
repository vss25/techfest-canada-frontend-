/* node --test src/checkin/lib/sse.test.mjs: frames split across chunks, comments, CRLF, ids and JSON data. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSseParser } from "./sse.js";

test("frames arrive whole, however the bytes are split", () => {
  const frames = [];
  const p = createSseParser((f) => frames.push(f));
  const text = 'retry: 2000\n\nevent: hello\ndata: {"serverTime":"2026-10-26T13:00:00Z"}\n\n: keep-alive\n\nid: 12\nevent: events\ndata: {"events":[{"seq":12}],"cursor":12}\n\n';
  for (let i = 0; i < text.length; i += 7) p.feed(text.slice(i, i + 7));
  assert.deepEqual(frames, [
    { event: "hello", data: { serverTime: "2026-10-26T13:00:00Z" }, id: null },
    { event: "events", data: { events: [{ seq: 12 }], cursor: 12 }, id: "12" },
  ]);
});

test("CRLF line ends, multi-line data, plain text", () => {
  const frames = [];
  const p = createSseParser((f) => frames.push(f));
  p.feed("event: ping\r\ndata: one\r\ndata: two\r\n\r\ndata: x\n");
  assert.deepEqual(frames, [{ event: "ping", data: "one\ntwo", id: null }]);
  p.feed("\n");
  assert.deepEqual(frames[1], { event: "message", data: "x", id: null });
});
