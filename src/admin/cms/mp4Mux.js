/* =========================================================
   A tiny MP4 writer for the hero video loops (Nov 25 2026, the owner: "can you see why there is lag in streaming").
   The browser's MediaRecorder writes "fragmented" MP4s with no length (mvhd duration 0) and no index, so players
   treat them like a live stream: the loop hitches every time it jumps back to the start. This writes the plain kind
   instead: ftyp, then moov (length, frame index, keyframes) BEFORE the picture data ("fast start"), one video track,
   constant frame rate, no audio. Input: H.264 chunks in AVC format from WebCodecs' VideoEncoder.
     const mp4 = muxMp4({ width, height, fps, avcC, samples: [{ data: Uint8Array, key: boolean }] })  → Uint8Array
   Pure (no browser APIs), tested in mp4Mux.test.mjs.
========================================================= */

const enc = new TextEncoder();
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16 = (n) => [(n >>> 8) & 255, n & 255];
const bytes = (...parts) => {
  const arrs = parts.map((p) => (p instanceof Uint8Array ? p : Uint8Array.from(p)));
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};
/** One box: size, 4-letter type, contents. */
export const box = (type, ...content) => {
  const body = bytes(...content);
  return bytes(u32(body.length + 8), enc.encode(type), body);
};
const full = (type, version, flags, ...content) => box(type, [version, (flags >>> 16) & 255, (flags >>> 8) & 255, flags & 255], ...content);
const MATRIX = [...u32(0x00010000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x00010000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x40000000)];
const zeros = (n) => new Array(n).fill(0);

export function muxMp4({ width, height, fps = 30, avcC, samples }) {
  if (!samples?.length) throw new Error("No frames to write.");
  if (!avcC?.length) throw new Error("The encoder gave no H.264 settings (avcC).");
  const timescale = fps * 1000;           // each frame lasts exactly 1000 ticks
  const n = samples.length;
  const durationMs = Math.round((n * 1000) / fps);
  const mediaDuration = n * 1000;

  const avc1 = box("avc1",
    zeros(6), u16(1),                      // reserved, data reference index
    zeros(16),                             // pre-defined / reserved
    u16(width), u16(height),
    u32(0x00480000), u32(0x00480000),      // 72 dpi
    u32(0), u16(1),                        // reserved, frame count
    zeros(32),                             // compressor name
    u16(0x0018), u16(0xffff),              // depth, pre-defined
    box("avcC", avcC));
  const keys = [];
  samples.forEach((s, i) => { if (s.key) keys.push(i + 1); });

  const stbl = (chunkOffset) => box("stbl",
    full("stsd", 0, 0, u32(1), avc1),
    full("stts", 0, 0, u32(1), u32(n), u32(1000)),
    full("stss", 0, 0, u32(keys.length), ...keys.map(u32)),
    full("stsc", 0, 0, u32(1), u32(1), u32(n), u32(1)),
    full("stsz", 0, 0, u32(0), u32(n), ...samples.map((s) => u32(s.data.length))),
    full("stco", 0, 0, u32(1), u32(chunkOffset)));

  const moov = (chunkOffset) => box("moov",
    full("mvhd", 0, 0, u32(0), u32(0), u32(1000), u32(durationMs), u32(0x00010000), u16(0x0100), zeros(10), MATRIX, zeros(24), u32(2)),
    box("trak",
      full("tkhd", 0, 3, u32(0), u32(0), u32(1), u32(0), u32(durationMs), zeros(8), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(width << 16), u32(height << 16)),
      box("mdia",
        full("mdhd", 0, 0, u32(0), u32(0), u32(timescale), u32(mediaDuration), u16(0x55c4), u16(0)),
        full("hdlr", 0, 0, u32(0), enc.encode("vide"), zeros(12), enc.encode("VideoHandler"), [0]),
        box("minf",
          full("vmhd", 0, 1, zeros(8)),
          box("dinf", full("dref", 0, 0, u32(1), full("url ", 0, 1))),
          stbl(chunkOffset)))));

  const ftyp = box("ftyp", enc.encode("isom"), u32(0x200), enc.encode("isom"), enc.encode("iso2"), enc.encode("avc1"), enc.encode("mp41"));
  const sizeOfMoov = moov(0).length;                  // the offset field is fixed-size, so the length doesn't change
  const dataStart = ftyp.length + sizeOfMoov + 8;     // after the mdat header
  const mdatSize = samples.reduce((t, s) => t + s.data.length, 0) + 8;
  return bytes(ftyp, moov(dataStart), u32(mdatSize), enc.encode("mdat"), ...samples.map((s) => s.data));
}
