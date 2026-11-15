import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

/* =========================================================
   Reveal-on-scroll, in the site's own motion language —
   Home.jsx's blur-rise items and Venue.jsx's FadeIn: content
   settles up with a soft blur the first time it scrolls into
   view. Used by the Phase 4 event pages so sections arrive
   the way the home page's do. Visitors who prefer reduced
   motion get the content plainly, with no hidden state.
========================================================= */

export default function Reveal({ children, delay = 0, y = 26, style, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced) {
    return (
      <div style={style} className={className}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ type: "spring", bounce: 0.25, duration: 1.1, delay }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** The animated brand-gradient rule Home.jsx draws under its
    big titles (purple → orange), here anchored left for the
    event pages' section headings. */
export function GradientRule({ style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={inView ? { scaleX: 1, opacity: 1 } : {}}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.15 }}
      style={{
        width: 84,
        height: 3,
        borderRadius: 2,
        background: "linear-gradient(90deg, #7a3fd1, var(--brand-orange, #f5a623))",
        transformOrigin: "left center",
        ...style,
      }}
    />
  );
}
