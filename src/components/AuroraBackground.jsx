import { useEffect, useRef, useState } from "react";

/* =========================================================
   Full-screen aurora / mesh-gradient background (WebGL, no libraries)
   ---------------------------------------------------------
   A small fragment shader: domain-warped noise in the TTFC colours
   (purple #7a3fd1, magenta #e8458b, orange #f5a623 on #06020f) that
   drifts slowly and leans gently toward the pointer.
   - prefers-reduced-motion: one still frame, no pointer response.
   - Tab hidden: the animation loop stops until it's visible again.
   - No WebGL (or the shader fails): a plain CSS gradient instead.
   - WebGL context lost (iOS does this to background tabs): set up
     again when the browser restores it; the CSS gradient only if it
     doesn't come back.
   Light on phones: reduced resolution (the image is soft anyway),
   at most ~30 frames a second (the drift is slow), 4 noise octaves.
   Precision: the noise needs 32-bit floats, so the shader asks for
   highp (mediump is often 16-bit on phones, where any hash goes flat);
   a GPU that can't give highp in fragment shaders gets the CSS
   gradient. The hash has no sin() (imprecise for large arguments on
   many mobile GPUs) and time goes in as a loop of small numbers that
   never jumps, rather than a number that grows forever.
========================================================= */

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform vec2 u_flow;    // how far the drift has got, round a slow loop (see draw())
uniform float u_phase;  // curtain sway, 0..2pi
uniform vec2 u_pointer; // 0..1, y up

// "Hash without Sine" (Dave Hoskins): no sin(), so it doesn't depend on how precisely the GPU does sin(62000.0).
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main() {
  float s = min(u_res.x, u_res.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / s;
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 m = (u_pointer - 0.5) * u_res / s;
  vec2 w = u_flow;                       // starts out as (0, t): a slow drift upward
  vec2 wd = vec2(w.y + w.x, w.y - w.x);  // starts out as (t, t)

  // Domain warping: noise feeding noise, for slow flowing folds.
  vec2 q = vec2(fbm(p * 0.85 + w), fbm(p * 0.85 + vec2(5.2, 0.0) - w));
  vec2 r = vec2(fbm(p * 0.75 + 1.8 * q + vec2(1.7, 9.2) + wd * 1.3 + m * 0.25),
                fbm(p * 0.75 + 1.8 * q + vec2(8.3, 2.8) - wd * 1.1 - m * 0.25));
  float f = fbm(p * 0.9 + 2.0 * r);

  vec3 ink = vec3(0.024, 0.008, 0.059);
  vec3 purple = vec3(0.478, 0.247, 0.820);
  vec3 magenta = vec3(0.910, 0.271, 0.545);
  vec3 orange = vec3(0.961, 0.651, 0.137);

  vec3 col = ink;
  col = mix(col, purple, smoothstep(0.28, 0.78, f));
  col = mix(col, magenta, smoothstep(0.38, 0.78, r.x) * smoothstep(0.3, 0.7, f) * 0.85);
  col = mix(col, orange, smoothstep(0.52, 0.82, r.y) * smoothstep(0.45, 0.8, f) * 0.6);

  // Aurora curtains: soft vertical light bending with the flow.
  float curtain = pow(0.5 + 0.5 * sin(p.x * 3.2 + f * 5.0 + u_phase), 6.0);
  col += mix(purple, magenta, uv.x) * curtain * 0.28 * smoothstep(-0.3, 0.6, p.y + 0.4 * f);

  // A gentle glow where the pointer is.
  float d = length(p - m);
  col += mix(magenta, purple, 0.4) * 0.16 * exp(-d * d * 2.5);

  // Keep it dark enough for white text, and darken the edges.
  vec2 v = uv - 0.5;
  col *= 1.0 - 0.95 * dot(v, v);
  col = mix(ink, col, 0.86);
  gl_FragColor = vec4(col, 1.0);
}
`;

const FALLBACK =
  "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(122,63,209,0.55) 0%, transparent 60%)," +
  "radial-gradient(ellipse 70% 55% at 85% 75%, rgba(232,69,139,0.38) 0%, transparent 60%)," +
  "radial-gradient(ellipse 60% 45% at 60% 105%, rgba(245,166,35,0.22) 0%, transparent 60%)," +
  "#06020f";

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

// The drift goes round a loop: LOOP seconds, at the speed it always had (DRIFT noise units a second),
// with the curtains swaying SWAY times per loop (about 0.1 radians a second). Seamless, and small numbers.
const LOOP = 900;
const DRIFT = 0.035;
const RADIUS = (DRIFT * LOOP) / (2 * Math.PI);
const SWAY = 15;
const FRAME_MS = 1000 / 30;
const RESTORE_WAIT = 4000; // ms a lost context gets to come back (while the tab is visible) before the CSS gradient takes over

export default function AuroraBackground({ resolution = 0.4 }) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [generation, setGeneration] = useState(0); // bumped when a lost WebGL context is restored: set up again
  const startRef = useRef(0);
  const pointerRef = useRef({ x: 0.5, y: 0.55, tx: 0.5, ty: 0.55 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let gl = null;
    try {
      gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, powerPreference: "low-power", preserveDrawingBuffer: false })
        || canvas.getContext("experimental-webgl");
    } catch { gl = null; }
    if (!gl) { setFailed(true); return undefined; }
    // No real 32-bit floats in fragment shaders (old ES2-era GPUs report 0 or fp24's 16 bits): the noise would go flat.
    const highp = gl.getShaderPrecisionFormat?.(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!gl.isContextLost() && highp && highp.precision < 20) { setFailed(true); return undefined; }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = vs && fs ? gl.createProgram() : null;
    if (prog) {
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
    }
    if (!prog || !gl.getProgramParameter(prog, gl.LINK_STATUS)) { setFailed(true); return undefined; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one big triangle
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uFlow = gl.getUniformLocation(prog, "u_flow");
    const uPhase = gl.getUniformLocation(prog, "u_phase");
    const uPointer = gl.getUniformLocation(prog, "u_pointer");

    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduced = !!motion?.matches;
    const pointer = pointerRef.current;
    // Kept across a context restore, so the picture carries on where it was.
    if (!startRef.current) startRef.current = performance.now();
    const start = startRef.current;
    // A fixed moment for the still frame, so it always looks the same.
    const STILL_TIME = 18;
    let raf = 0;
    let lost = false;
    let last = 0;
    let giveUp = 0;
    let vw = 0;
    let vh = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr * resolution));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr * resolution));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (vw !== w || vh !== h) {
        vw = w;
        vh = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (time) => {
      resize();
      const a = ((time % LOOP) / LOOP) * 2 * Math.PI;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uFlow, RADIUS * (Math.cos(a) - 1), RADIUS * Math.sin(a));
      gl.uniform1f(uPhase, (SWAY * a) % (2 * Math.PI));
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now) => {
      raf = 0;
      if (lost) return;
      // ~30 fps is plenty for something this slow, and halves the work (and the card's backdrop blur) on 60-120 Hz screens.
      if (now - last >= FRAME_MS - 4) {
        const dt = last ? Math.min(100, now - last) : FRAME_MS;
        last = now;
        // Ease toward the pointer so it feels like a current, not a cursor (same feel at any frame rate).
        const k = 1 - Math.pow(0.97, dt / (1000 / 60));
        pointer.x += (pointer.tx - pointer.x) * k;
        pointer.y += (pointer.ty - pointer.y) * k;
        draw((now - start) / 1000 + STILL_TIME);
      }
      if (!reduced && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const play = () => {
      if (lost) return;
      if (reduced) { draw(STILL_TIME); return; }
      if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

    const onPointer = (e) => {
      if (reduced) return;
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = 1 - e.clientY / window.innerHeight;
    };
    // Lost context: wait for the browser to restore it (preventDefault asks it to). The countdown to the
    // CSS fallback only runs while the tab is visible, since browsers restore when they come back to it.
    const armGiveUp = () => { if (!giveUp && !document.hidden) giveUp = setTimeout(() => setFailed(true), RESTORE_WAIT); };
    const disarmGiveUp = () => { clearTimeout(giveUp); giveUp = 0; };
    const onVisibility = () => {
      if (lost) { if (document.hidden) disarmGiveUp(); else armGiveUp(); return; }
      if (document.hidden) stop(); else play();
    };
    const onResize = () => { if (!lost && (reduced || document.hidden)) draw(STILL_TIME); };
    const onMotion = () => { reduced = !!motion?.matches; stop(); play(); };
    const onLost = (e) => { e.preventDefault(); lost = true; stop(); armGiveUp(); };
    const onRestored = () => { disarmGiveUp(); setGeneration((g) => g + 1); };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    motion?.addEventListener?.("change", onMotion);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    play();

    return () => {
      stop();
      disarmGiveUp();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      motion?.removeEventListener?.("change", onMotion);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      // Objects from a lost context are already gone (and deleting them would only log errors).
      if (!lost && !gl.isContextLost()) {
        gl.deleteBuffer(buf);
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
      }
    };
  }, [resolution, generation]);

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, background: FALLBACK, pointerEvents: "none" }}>
      {!failed && (
        <canvas
          ref={canvasRef}
          data-testid="aurora-canvas"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
        />
      )}
    </div>
  );
}
