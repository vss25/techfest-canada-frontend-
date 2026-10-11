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
   Rendered at reduced resolution (the image is soft anyway) to stay
   light on phones.
========================================================= */

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_pointer; // 0..1, y up

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main() {
  float s = min(u_res.x, u_res.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / s;
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 m = (u_pointer - 0.5) * u_res / s;
  float t = u_time * 0.035;

  // Domain warping: noise feeding noise, for slow flowing folds.
  vec2 q = vec2(fbm(p * 0.85 + vec2(0.0, t)), fbm(p * 0.85 + vec2(5.2, -t)));
  vec2 r = vec2(fbm(p * 0.75 + 1.8 * q + vec2(1.7, 9.2) + t * 1.3 + m * 0.25),
                fbm(p * 0.75 + 1.8 * q + vec2(8.3, 2.8) - t * 1.1 - m * 0.25));
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
  float curtain = pow(0.5 + 0.5 * sin(p.x * 3.2 + f * 5.0 + t * 3.0), 6.0);
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

export default function AuroraBackground({ resolution = 0.55 }) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let gl = null;
    try {
      gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, powerPreference: "low-power", preserveDrawingBuffer: false })
        || canvas.getContext("experimental-webgl");
    } catch { gl = null; }
    if (!gl) { setFailed(true); return undefined; }

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
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uPointer = gl.getUniformLocation(prog, "u_pointer");

    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduced = !!motion?.matches;
    const pointer = { x: 0.5, y: 0.55, tx: 0.5, ty: 0.55 };
    const start = performance.now();
    // A fixed moment for the still frame, so it always looks the same.
    const STILL_TIME = 18;
    let raf = 0;
    let lost = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr * resolution));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr * resolution));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (time) => {
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now) => {
      raf = 0;
      if (lost) return;
      // Ease toward the pointer so it feels like a current, not a cursor.
      pointer.x += (pointer.tx - pointer.x) * 0.03;
      pointer.y += (pointer.ty - pointer.y) * 0.03;
      draw((now - start) / 1000 + STILL_TIME);
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
    const onVisibility = () => (document.hidden ? stop() : play());
    const onResize = () => { if (reduced || document.hidden) draw(STILL_TIME); };
    const onMotion = () => { reduced = !!motion?.matches; stop(); play(); };
    const onLost = (e) => { e.preventDefault(); lost = true; stop(); setFailed(true); };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    motion?.addEventListener?.("change", onMotion);
    canvas.addEventListener("webglcontextlost", onLost);
    play();

    return () => {
      stop();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      motion?.removeEventListener?.("change", onMotion);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [resolution]);

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
