import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ExternalLink, Trophy, X } from "lucide-react";
import { longDate } from "../lib/awardWinners";

/* =========================================================
   "The results are out" on /awards (Oct 31 2026): every Catalyst
   Awards winner as a card (the award and the company), and on a
   click the winner's page (/awards/winners/<id>?embed=1: the
   certificate, the details, Download PDF / JPG and Share on
   LinkedIn) in an iframe in a dialog. The list: GET /api/awards/winners
   (src/lib/awardWinners.js), shown only while it's live and has
   winners (Admin › Catalyst Awards › Winners).
========================================================= */

export default function AwardWinnersSection({ winners, awardsNight, dark, textMain, textMid, accent, cardBg, cardBdr, sectionBg }) {
  const [open, setOpen] = useState(null); // the winner shown in the dialog
  const special = winners.filter((w) => w.special);
  const matrix = winners.filter((w) => !w.special);

  return (
    <section id="winners" className="aw-winners" style={{ background: sectionBg, borderTop: "1px solid " + cardBdr, borderBottom: "1px solid " + cardBdr, scrollMarginTop: 80 }}>
      <style>{css({ dark, textMain, textMid, accent, cardBg, cardBdr })}</style>
      <div className="aw-winners-inner">
        <header className="aw-winners-head">
          <span className="aw-winners-pill"><Trophy size={13} aria-hidden="true" /> Results are out</span>
          <h2>The Catalyst Awards 2026 <span>winners</span></h2>
          <p>
            Here are the winners across the categories, presented at the Catalyst Awards Gala Night on {longDate(awardsNight)} in Toronto.
            Select a winner to see the award, download the certificate or share it on LinkedIn.
          </p>
        </header>

        <WinnerGrid list={matrix} onOpen={setOpen} />
        {special.length > 0 && (
          <>
            <p className="aw-winners-sub">Special recognition</p>
            <WinnerGrid list={special} onOpen={setOpen} />
          </>
        )}
      </div>
      {open && <WinnerDialog winner={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function WinnerGrid({ list, onOpen }) {
  return (
    <ul className="aw-winners-grid">
      {list.map((w, i) => (
        <motion.li key={w.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.45, delay: (i % 3) * 0.06 }}>
          <button type="button" className="aw-winner-card" onClick={() => onOpen(w)} aria-haspopup="dialog">
            <span className="aw-winner-tags">
              {w.special ? <span className="aw-winner-tag aw-winner-tag-special">Special recognition</span> : <>
                {w.pillar && <span className="aw-winner-tag">{w.pillar}</span>}
              </>}
            </span>
            <span className="aw-winner-award">{w.award}</span>
            <span className="aw-winner-company">{w.company}</span>
            {w.showCompany && <span className="aw-winner-person">{w.presentedTo}</span>}
            <span className="aw-winner-more">View award <ChevronRight size={15} aria-hidden="true" /></span>
          </button>
        </motion.li>
      ))}
    </ul>
  );
}

function WinnerDialog({ winner, onClose }) {
  const closeRef = useRef(null);
  const src = `/awards/winners/${winner.id}?embed=1`;

  useEffect(() => {
    const before = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (before && typeof before.focus === "function") before.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div className="aw-dialog-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="aw-dialog" role="dialog" aria-modal="true" aria-label={`${winner.award}: ${winner.presentedTo}`}>
        <div className="aw-dialog-bar">
          <span className="aw-dialog-title">{winner.company}</span>
          <a className="aw-dialog-link" href={`/awards/winners/${winner.id}`} target="_blank" rel="noopener">
            <ExternalLink size={15} aria-hidden="true" /> <span>Open in a new tab</span>
          </a>
          <button ref={closeRef} type="button" className="aw-dialog-close" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <iframe className="aw-dialog-frame" src={src} title={`${winner.award}: certificate, details and sharing`} />
      </div>
    </div>
  );
}

const css = ({ dark, textMain, textMid, accent, cardBg, cardBdr }) => `
.aw-winners-inner { max-width: 1180px; margin: 0 auto; padding: clamp(3.5rem, 7vw, 6rem) 5%; }
.aw-winners-head { text-align: center; max-width: 760px; margin: 0 auto clamp(2rem, 4vw, 3rem); }
.aw-winners-pill { display: inline-flex; align-items: center; gap: 7px; background: rgba(245,166,35,0.12); border: 1px solid rgba(245,166,35,0.35); color: #f5a623;
  font-family: 'Orbitron', sans-serif; font-size: 0.68rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 8px 18px; border-radius: 999px; }
.aw-winners-head h2 { font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: clamp(1.7rem, 4vw, 2.8rem); line-height: 1.12; color: ${textMain}; margin: 18px 0 14px; text-wrap: balance; }
.aw-winners-head h2 span { background: linear-gradient(135deg, #7a3fd1, #f5a623); -webkit-background-clip: text; background-clip: text; color: transparent; }
.aw-winners-head p { font-family: 'Montserrat', sans-serif; font-size: clamp(0.98rem, 1.5vw, 1.08rem); line-height: 1.75; color: ${textMid}; margin: 0; }
.aw-winners-sub { font-family: 'Orbitron', sans-serif; font-size: 0.62rem; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #f5a623; margin: clamp(2.2rem, 4vw, 3rem) 0 14px; }
.aw-winners-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.aw-winners-grid > li { display: flex; min-width: 0; }
.aw-winner-card { width: 100%; text-align: left; display: flex; flex-direction: column; gap: 8px; padding: 20px 20px 16px; border-radius: 18px; cursor: pointer; font: inherit;
  background: ${cardBg}; border: 1px solid ${cardBdr}; color: ${textMain}; transition: border-color .25s ease, transform .25s ease, box-shadow .25s ease;
  box-shadow: ${dark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 4px 20px rgba(122,63,209,0.05)"}; }
.aw-winner-card:hover { border-color: #f5a623; transform: translateY(-2px); box-shadow: ${dark ? "0 12px 34px rgba(0,0,0,0.4)" : "0 12px 30px rgba(122,63,209,0.12)"}; }
.aw-winner-card:focus-visible { outline: 3px solid ${accent}; outline-offset: 3px; }
.aw-winner-tags { display: flex; gap: 6px; flex-wrap: wrap; min-height: 22px; }
.aw-winner-tag { font-family: 'Orbitron', sans-serif; font-size: 0.56rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 4px 9px; border-radius: 6px;
  background: ${dark ? "rgba(185,158,255,0.10)" : "rgba(122,63,209,0.08)"}; color: ${dark ? "#b99eff" : "#7a3fd1"}; }
.aw-winner-tag-special { background: rgba(245,166,35,0.12); color: ${dark ? "#f5a623" : "#a35f00"}; }
.aw-winner-award { font-family: 'Montserrat', sans-serif; font-size: 0.86rem; font-weight: 600; line-height: 1.5; color: ${textMid}; }
.aw-winner-company { font-family: 'Orbitron', sans-serif; font-size: clamp(1rem, 1.6vw, 1.15rem); font-weight: 800; line-height: 1.3; color: ${textMain}; overflow-wrap: anywhere; }
.aw-winner-person { font-family: 'Montserrat', sans-serif; font-size: 0.86rem; font-weight: 600; color: ${dark ? "#cdb8ff" : "#5b2fa6"}; margin-top: -4px; }
.aw-winner-more { margin-top: auto; padding-top: 8px; display: inline-flex; align-items: center; gap: 4px; font-family: 'Orbitron', sans-serif; font-size: 0.62rem; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase; color: ${dark ? "#f5a623" : accent}; }
@media (max-width: 960px) { .aw-winners-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .aw-winners-grid { grid-template-columns: 1fr; } }

.aw-dialog-back { position: fixed; inset: 0; z-index: 20000; background: rgba(6,2,15,0.72); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: clamp(0px, 3vw, 28px); }
.aw-dialog { width: min(1180px, 100%); height: min(92vh, 980px); display: flex; flex-direction: column; border-radius: 20px; overflow: hidden; background: #06020f;
  border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 40px 120px rgba(0,0,0,0.6); }
.aw-dialog-bar { display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 18px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #fff; }
.aw-dialog-title { flex: 1; min-width: 0; font-family: 'Orbitron', sans-serif; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.aw-dialog-link { display: inline-flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 600; text-decoration: none; padding: 8px 10px; border-radius: 10px; }
.aw-dialog-link:hover { color: #fff; background: rgba(255,255,255,0.06); }
.aw-dialog-close { width: 40px; height: 40px; border-radius: 99px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.06); color: #fff; cursor: pointer; }
.aw-dialog-close:hover { background: rgba(255,255,255,0.12); }
.aw-dialog-close:focus-visible, .aw-dialog-link:focus-visible { outline: 2px solid #f5a623; outline-offset: 2px; }
.aw-dialog-frame { flex: 1; width: 100%; border: 0; background: #06020f; }
@media (max-width: 600px) {
  .aw-dialog-back { padding: 0; }
  .aw-dialog { height: 100%; border-radius: 0; border: 0; }
  .aw-dialog-link span { display: none; }
}
`;
