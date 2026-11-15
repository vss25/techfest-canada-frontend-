import React from "react";
import { useEventFaqs } from "../lib/events";

/* =========================================================
   Contextual FAQs (Phase 4): no global /faq page — each
   event page ends with its own stack, layered Global → City
   → Event in the data and shown event-first here (the
   event's own answers are the ones its visitors need most).
========================================================= */

export default function EventFaqs({ ev }) {
  const faqs = useEventFaqs(ev);
  if (!ev || faqs.length === 0) return null;
  return (
    <section aria-label="Frequently asked questions" style={{ maxWidth: 860, margin: "0 auto", padding: "8px 20px 8px" }}>
      <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.3rem, 3vw, 1.8rem)", fontWeight: 800, margin: "0 0 18px" }}>
        Questions, answered
      </h2>
      <div style={{ display: "grid", gap: 10 }}>
        {faqs.map((f) => (
          <details key={f._id} style={{ border: "1px solid rgba(127,90,240,0.2)", borderRadius: 14, padding: "14px 18px", background: "rgba(127,90,240,0.05)" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}>{f.question}</summary>
            {String(f.answer || "").split(/\n\s*\n/).filter(Boolean).map((p, i) => (
              <p key={i} style={{ margin: "10px 0 0", lineHeight: 1.65, opacity: 0.88 }}>{p}</p>
            ))}
          </details>
        ))}
      </div>
    </section>
  );
}
