import { useEffect, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";

export default function WavyBackground({
  children,
  className,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = "slow",
  waveOpacity = 0.5,
  style,
}) {
  var canvasRef = useRef(null);
  var animIdRef = useRef(0);
  var [isSafari, setIsSafari] = useState(false);

  useEffect(function () {
    setIsSafari(
      typeof window !== "undefined" &&
        navigator.userAgent.includes("Safari") &&
        !navigator.userAgent.includes("Chrome")
    );
  }, []);

  useEffect(function () {
    var noise = createNoise3D();
    var canvas = canvasRef.current;
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var w, h, nt = 0;

    var waveColors = colors || [
      "#D6308C",
      "#9b57e8",
      "#f5a623",
      "#c084fc",
      "#e879f9",
    ];

    var spd = speed === "fast" ? 0.002 : 0.001;

    function resize() {
      w = ctx.canvas.width = window.innerWidth;
      h = ctx.canvas.height = window.innerHeight;
      ctx.filter = "blur(" + blur + "px)";
    }

    resize();
    window.addEventListener("resize", resize);

    function drawWave(n) {
      nt += spd;
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.lineWidth = waveWidth || 50;
        ctx.strokeStyle = waveColors[i % waveColors.length];
        for (var x = 0; x < w; x += 5) {
          var y = noise(x / 800, 0.3 * i, nt) * 100;
          ctx.lineTo(x, y + h * 0.5);
        }
        ctx.stroke();
        ctx.closePath();
      }
    }

    function render() {
      ctx.fillStyle = backgroundFill || "black";
      ctx.globalAlpha = waveOpacity;
      ctx.fillRect(0, 0, w, h);
      drawWave(5);
      animIdRef.current = requestAnimationFrame(render);
    }

    render();

    return function () {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animIdRef.current);
    };
  }, [blur, speed, waveWidth, waveOpacity, backgroundFill, colors]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
          ...(isSafari ? { filter: "blur(" + blur + "px)" } : {}),
        }}
      />
      <div style={{ position: "relative", zIndex: 10 }}>{children}</div>
    </div>
  );
}

