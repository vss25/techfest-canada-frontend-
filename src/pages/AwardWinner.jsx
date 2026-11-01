import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, AtSign, Building2, CalendarDays, Check, Copy, ExternalLink, FileText, Image as ImageIcon, Linkedin,
  Loader2, MapPin, RotateCcw, Trophy, User,
} from "lucide-react";
import AuroraBackground from "../components/AuroraBackground";
import { ATT_CSS } from "./attendingStyles";
import { ENQUIRE, LINKEDIN_PAGE, copyText, copyTextNow, downloadBlob, isLinkedinPostUrl, linkedinShareUrl } from "../lib/attending";
import {
  AWARD_CLOSE_MESSAGE, EVENT, POST_MAX, VENUE, VOICES, fileBase, isWinnerId, loadWinner, longDate, postText, recipientLine,
  startAwardPost,
} from "../lib/awardWinners";
import { CERT_H, CERT_W, canvasBlob, drawCertificate, jpegToPdf } from "../lib/certificate";
import useSeo from "../hooks/useSeo";
import Breadcrumbs from "../seo/Breadcrumbs";
import { NOT_FOUND_ROBOTS, SITE_NAME, winnerMeta } from "../seo/routes";

/* =========================================================
   /awards/winners/:id: one Catalyst Awards winner (Oct 31 2026).
   The /awards page opens it in an iframe (?embed=1: no logo, no
   aurora, no footer); the apps open it in their browser; it's also
   the link people share.
     - the certificate, drawn in the browser (src/lib/certificate.js):
       what they see is what they download, as a JPG or an A4 PDF;
     - the details: the award, who it was presented to, the company,
       the date, TTFC 2026 and the venue;
     - Share on LinkedIn: a post written for them ("We won" or
       "Congratulate them"), editable. "Post to LinkedIn" sends the
       certificate and the text to the backend, LinkedIn asks them to
       allow posting, and the post goes up with the certificate and
       The Tech Festival Canada's page tagged; back here at
       #posted=1&post=<URL>, or #post_error=<code> (the text is kept
       in this tab for "Try again"). Inside the iframe LinkedIn opens
       in the whole window (it can't be framed).
     - if that isn't available: copy the text and open LinkedIn's
       share box (no tag there: they type @ and pick the page).
   Server calls: src/lib/awardWinners.js.
========================================================= */

const POST_ERRORS = {
  cancelled: "You cancelled on LinkedIn, so nothing was posted. Try again whenever you’re ready.",
  denied: "LinkedIn didn’t allow the post, so nothing was posted. Try again and choose Allow.",
  unavailable: "Posting straight to LinkedIn isn’t available right now. You can still copy the text and open LinkedIn.",
  expired: "That took a little too long. Press “Post to LinkedIn” again.",
  busy: "Too many tries. Wait a few minutes, then try again.",
  withdrawn: "This award isn’t shown on the website at the moment, so nothing was posted.",
};
const postErrorText = (code) => POST_ERRORS[code] || "LinkedIn didn’t accept the post. Try again, or copy the text and open LinkedIn.";
const DRAFT_KEY = "ttfc.award.post";

function readLocation() {
  if (typeof window === "undefined") return { embed: false, posted: null, postError: "", had: false };
  const q = new URLSearchParams(window.location.search);
  const f = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const post = f.get("post") || "";
  let framed = false;
  try { framed = window.self !== window.top; } catch { framed = true; }
  return {
    embed: q.get("embed") === "1" || framed,
    posted: f.get("posted") === "1" ? { url: isLinkedinPostUrl(post) ? post : "" } : null,
    postError: (f.get("post_error") || "").replace(/[^a-z_]/g, "").slice(0, 40),
    had: window.location.hash.length > 1,
  };
}

function savedDraft(id) {
  try { const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); return d?.id === id && typeof d.text === "string" ? d : null; } catch { return null; }
}
function saveDraft(id, voice, text) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ id, voice, text })); } catch { /* private mode */ } }
function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ } }

export default function AwardWinner() {
  const { id: rawId = "" } = useParams();
  const id = rawId.toLowerCase();
  const [loc] = useState(readLocation);
  const [winner, setWinner] = useState(null);
  const [loadError, setLoadError] = useState(isWinnerId(id) ? "" : "We couldn’t find that award.");
  const [missing, setMissing] = useState(!isWinnerId(id));   // no such award (not just a failed load): noindex
  const [preview, setPreview] = useState("");   // object URL of the certificate JPG
  const [busy, setBusy] = useState("");          // "pdf" | "jpg" while saving
  const kept = useMemo(() => savedDraft(id), [id]);
  const [voice, setVoice] = useState(kept?.voice === "congrats" ? "congrats" : "winner");
  const [text, setText] = useState(kept?.text || "");
  const [posting, setPosting] = useState(false);
  const [posted] = useState(loc.posted);
  const [postError, setPostError] = useState(loc.postError ? postErrorText(loc.postError) : "");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);
  const jpgRef = useRef(null);
  const embed = loc.embed;

  /* The title, the page's dark look, and the trip back from LinkedIn out of the address bar. */
  useEffect(() => {
    document.body.classList.add("att-open");
    if (loc.had) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    if (loc.posted) clearDraft();
    if (loc.posted || loc.postError) window.scrollTo(0, 0); // back from LinkedIn: the news is at the top
    return () => document.body.classList.remove("att-open");
  }, [loc]);

  /* In the /awards dialog or the web app's sheet, focus is in here: Escape asks the page around us to close. */
  useEffect(() => {
    if (!embed || window.parent === window) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      try { window.parent.postMessage({ type: AWARD_CLOSE_MESSAGE }, window.location.origin); } catch { /* not ours */ }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [embed]);

  useEffect(() => {
    if (!isWinnerId(id)) return undefined;
    let live = true;
    loadWinner(id).then(
      (r) => {
        if (!live) return;
        setWinner(r.winner);
        setText((cur) => cur || postText(r.winner, kept?.voice === "congrats" ? "congrats" : "winner"));
      },
      (e) => {
        if (!live) return;
        setMissing(e?.status === 404);
        setLoadError(e?.status === 404 ? "We couldn’t find that award. It may have moved: see all the winners on the Catalyst Awards page." : "We couldn’t load this award. Try again in a moment.");
      },
    );
    return () => { live = false; };
  }, [id, kept]);

  /* The head once loaded (Oct 31 2026; src/seo/routes.js winnerMeta, as the build wrote it): the winner's title and
     description, the canonical without ?embed=1, the breadcrumb JSON-LD; back to the route's when leaving. An award
     that isn't there: noindex. A failed load changes nothing. */
  const seo = useMemo(() => (winner ? winnerMeta({ ...winner, id: winner.id || id }) : null), [winner, id]);
  useSeo(
    seo ? seo.title : missing ? `Award not found | ${SITE_NAME}` : undefined,
    seo?.description,
    seo ? { canonical: seo.canonical, robots: seo.robots, image: seo.image, jsonLd: seo.jsonLd }
      : missing ? { canonical: null, robots: NOT_FOUND_ROBOTS, jsonLd: null } : {},
  );

  /* The certificate: drawn once, kept as a JPG (the preview, the download and the LinkedIn image). */
  useEffect(() => {
    if (!winner) return undefined;
    let live = true;
    let url = "";
    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    drawCertificate(canvas, winner)
      .then(() => canvasBlob(canvas, "image/jpeg", 0.93))
      .then((blob) => {
        if (!live) return;
        jpgRef.current = blob;
        url = URL.createObjectURL(blob);
        setPreview(url);
      })
      .catch(() => { if (live) setPreview("error"); });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [winner]);

  const ready = preview && preview !== "error";
  const saveJpg = async () => {
    if (!ready || busy) return;
    downloadBlob(jpgRef.current, `${fileBase(winner)}.jpg`);
  };
  const savePdf = async () => {
    if (!ready || busy) return;
    setBusy("pdf");
    try {
      const bytes = new Uint8Array(await jpgRef.current.arrayBuffer());
      const pdf = jpegToPdf(bytes, { width: CERT_W, height: CERT_H, title: `${winner.award}: ${recipientLine(winner)}`, subject: `${EVENT}, Catalyst Awards` });
      downloadBlob(pdf, `${fileBase(winner)}.pdf`);
    } finally {
      setBusy("");
    }
  };

  const chooseVoice = (v) => {
    if (v === voice) return;
    const untouched = !text.trim() || text === postText(winner, voice);
    setVoice(v);
    if (untouched) setText(postText(winner, v));
  };
  const reset = () => setText(postText(winner, voice));
  const post = async () => {
    if (!winner || !ready || posting || !text.trim()) return;
    setPosting(true);
    setPostError("");
    saveDraft(id, voice, text);
    try {
      const image = canvasRef.current.toDataURL("image/jpeg", 0.9);
      const r = await startAwardPost(id, image, text);
      // LinkedIn can't be shown inside a frame: the whole window goes there (and comes back to this page).
      (embed && window.top ? window.top : window).location.assign(r.redirect);
    } catch (e) {
      setPosting(false);
      setPostError(e?.code === "text" ? e.message : postErrorText(e?.code));
    }
  };
  const flash = () => { setCopied(true); setTimeout(() => setCopied(false), 2200); };
  const manual = () => {
    const ok = copyTextNow(text);
    window.open(linkedinShareUrl(text), "_blank", "noopener,noreferrer");
    if (ok) flash(); else copyText(text).then((done) => { if (done) flash(); });
  };

  return (
    <div className={`att-root aw-win${embed ? " aw-win-embed" : ""}`}>
      <style>{ATT_CSS + CSS}</style>
      {!embed && <AuroraBackground />}

      {!embed && (
        <header className="att-brand aw-win-brand">
          <a href="/awards" className="aw-win-back"><ArrowLeft size={16} aria-hidden="true" /> All winners</a>
          <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.png" alt="The Tech Festival Canada" width="240" height="150" />
        </header>
      )}

      {posted && (
        <div className="att-posted" role="status">
          <span className="att-posted-icon"><Check size={22} aria-hidden="true" /></span>
          <div>
            <p className="att-posted-title">You’re on LinkedIn!</p>
            <p className="att-posted-sub">Your post is live with the certificate, and {LINKEDIN_PAGE.name} is tagged.</p>
            {posted.url && <a className="att-text-btn" href={posted.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> View your post</a>}
          </div>
        </div>
      )}

      {loadError ? (
        <section className="att-card aw-win-narrow" role="alert">
          <p className="att-error" style={{ margin: 0 }}><AlertCircle size={16} aria-hidden="true" /><span>{loadError}</span></p>
          <a className="att-back-app" href="/awards" target={embed ? "_top" : undefined}>See all the winners</a>
        </section>
      ) : !winner ? (
        <section className="att-card aw-win-narrow aw-win-loading" aria-busy="true"><Loader2 size={22} className="att-spin" aria-hidden="true" /> Loading the award…</section>
      ) : (
        <>
          {!embed && <Breadcrumbs className="aw-win-crumbs" crumbs={seo.crumbs} linkStyle={{ color: "rgba(255,255,255,0.82)" }} />}
          <div className="att-hero aw-win-hero">
            <p className="att-eyebrow"><Trophy size={13} aria-hidden="true" /> Catalyst Awards 2026 · Winner</p>
            <h1 className="att-title aw-win-title">{winner.presentedTo}</h1>
            {winner.showCompany && <p className="aw-win-company">{winner.company}</p>}
            <p className="att-sub aw-win-award">{winner.award}</p>
          </div>

          <main className="att-grid">
            <div className="att-preview-col">
              <section className="att-card" aria-label="Certificate">
                <div className="aw-win-cert" style={{ aspectRatio: `${CERT_W} / ${CERT_H}` }}>
                  {ready
                    ? <img src={preview} alt={`Certificate: ${winner.award}, presented to ${recipientLine(winner)} on ${longDate(winner.presentedOn)} at ${EVENT}`} />
                    : <span className="aw-win-cert-busy">{preview === "error" ? "The certificate couldn’t be drawn in this browser." : <><Loader2 size={20} className="att-spin" aria-hidden="true" /> Drawing the certificate…</>}</span>}
                </div>
                <div className="att-actions-row aw-win-dl">
                  <button type="button" className="att-btn-ghost" onClick={savePdf} disabled={!ready || !!busy} aria-busy={busy === "pdf" || undefined}>
                    {busy === "pdf" ? <Loader2 size={17} className="att-spin" aria-hidden="true" /> : <FileText size={17} aria-hidden="true" />} Download PDF
                  </button>
                  <button type="button" className="att-btn-ghost" onClick={saveJpg} disabled={!ready || !!busy}>
                    <ImageIcon size={17} aria-hidden="true" /> Download JPG
                  </button>
                </div>
              </section>

              <section className="att-card aw-win-details" aria-labelledby="aw-win-details-h">
                <h2 id="aw-win-details-h" className="att-step-title">About this award</h2>
                <dl>
                  <div><dt><Trophy size={15} aria-hidden="true" /> Award</dt><dd>{winner.award}</dd></div>
                  <div><dt><User size={15} aria-hidden="true" /> Presented to</dt><dd>{winner.presentedTo}</dd></div>
                  {winner.showCompany && <div><dt><Building2 size={15} aria-hidden="true" /> Company</dt><dd>{winner.company}</dd></div>}
                  <div><dt><CalendarDays size={15} aria-hidden="true" /> Presented on</dt><dd>{longDate(winner.presentedOn)}</dd></div>
                  <div><dt><MapPin size={15} aria-hidden="true" /> At</dt><dd>{EVENT}, {VENUE}</dd></div>
                </dl>
                {winner.citation && <p className="aw-win-cite">“{winner.citation}”</p>}
                <p className="aw-win-about">
                  The Catalyst Awards are The Tech Festival Canada’s awards for the people and organisations transforming industries through
                  technology, across five technology pillars and five applied sectors, with three special recognition awards. The jury chose the
                  winners, who were presented at the Catalyst Awards Gala Night on the evening of Day 1.
                </p>
                {winner.website && <a className="att-text-btn" href={winner.website} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> {winner.website.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>}
              </section>
            </div>

            <section className="att-card att-controls" aria-labelledby="aw-win-post-h">
              <div className="att-step-head">
                <span className="att-step-n" aria-hidden="true"><Linkedin size={15} /></span>
                <h2 id="aw-win-post-h" className="att-step-title">Share on LinkedIn</h2>
                {text !== postText(winner, voice) && (
                  <button type="button" className="att-text-btn att-step-aside" onClick={reset}><RotateCcw size={14} aria-hidden="true" /> Reset</button>
                )}
              </div>
              <div className="att-seg aw-win-voice" role="radiogroup" aria-label="Who’s posting">
                {VOICES.map((v) => (
                  <button key={v.key} type="button" role="radio" aria-checked={voice === v.key} className="att-seg-btn" data-on={voice === v.key ? "" : undefined} onClick={() => chooseVoice(v.key)}>{v.label}</button>
                ))}
              </div>
              <label className="att-label" htmlFor="aw-win-text">Your post (edit it as you like)</label>
              <textarea id="aw-win-text" className="att-input att-textarea" value={text} onChange={(e) => setText(e.target.value.slice(0, POST_MAX))} rows={9} />
              <p className="att-count" aria-live="off">{text.length.toLocaleString()} / {POST_MAX.toLocaleString()}</p>
              <p className="att-hint">
                <AtSign size={14} aria-hidden="true" />
                <span>We’ll tag <a className="att-link" href={LINKEDIN_PAGE.url} target="_blank" rel="noopener noreferrer">{LINKEDIN_PAGE.name}</a>’s LinkedIn page where your post names it, and attach the certificate.</span>
              </p>

              <div className="att-actions">
                <button type="button" className="att-btn" onClick={post} disabled={posting || !ready || !text.trim()} aria-busy={posting || undefined}>
                  {posting ? <Loader2 size={20} className="att-spin" aria-hidden="true" /> : <Linkedin size={20} aria-hidden="true" />}
                  {posting ? "Opening LinkedIn…" : postError ? "Try again" : "Post to LinkedIn"}
                </button>
                {!postError && <p className="att-hint att-hint-center">LinkedIn asks you to allow it once, then your post goes up with the certificate.</p>}
                {postError && (
                  <div className="att-error att-post-error" role="alert">
                    <AlertCircle size={16} aria-hidden="true" />
                    <div><span>{postError}</span></div>
                  </div>
                )}
                <div className="aw-win-manual">
                  <button type="button" className="att-text-btn" onClick={manual}><Copy size={14} aria-hidden="true" /> {copied ? "Copied. LinkedIn is open" : "Or copy the text and open LinkedIn yourself"}</button>
                  <p className="aw-win-manual-note">That way, download the JPG to attach it, and type @{LINKEDIN_PAGE.name} to tag the page.</p>
                </div>
              </div>
            </section>
          </main>
        </>
      )}

      {!embed && (
        <footer className="att-foot">
          <p>Your text goes only to LinkedIn, and only when you post it.</p>
          <p>Questions? <a className="att-link" href={`mailto:${ENQUIRE}`}>{ENQUIRE}</a></p>
        </footer>
      )}
    </div>
  );
}

const CSS = `
.aw-win-embed { padding: 18px 14px 22px; background: #06020f; }
.aw-win-brand { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.aw-win-back { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 600; text-decoration: none; }
.aw-win-back:hover { color: #fff; }
.aw-win-crumbs { position: relative; z-index: 1; max-width: 720px; margin: 4px 0 14px; font-size: 13px; color: rgba(255,255,255,0.6); }
.aw-win-crumbs ol { justify-content: center; }
.aw-win-narrow { max-width: 560px; display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }
.aw-win-loading { flex-direction: row; align-items: center; gap: 10px; color: rgba(255,255,255,0.85); }
.aw-win-hero { margin-bottom: 22px; }
.aw-win-embed .aw-win-hero { margin-bottom: 16px; }
.aw-win-hero .att-eyebrow { display: inline-flex; align-items: center; gap: 7px; }
.aw-win-title { font-size: clamp(1.5rem, 4.6vw, 2.4rem); overflow-wrap: anywhere; }
.aw-win-company { margin: 8px 0 0; font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 17px; color: #cdb8ff; }
.aw-win-award { margin-top: 10px; font-weight: 600; }
.aw-win-cert { position: relative; width: 100%; max-width: 100%; border-radius: 14px; overflow: hidden; background: #0a0516; box-shadow: 0 18px 50px rgba(3,0,12,0.6), 0 0 0 1px rgba(255,255,255,0.08); }
.aw-win-cert img { display: block; width: 100%; height: 100%; object-fit: cover; }
.aw-win-cert-busy { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px; text-align: center; color: rgba(255,255,255,0.8); font-size: 14px; }
.aw-win-dl { margin-top: 14px; }
.aw-win-details { margin-top: 18px; }
.aw-win-details dl { margin: 14px 0 0; display: grid; gap: 12px; }
.aw-win-details dl > div { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 12px; align-items: baseline; }
.aw-win-details dt { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #ffc56b; }
.aw-win-details dd { margin: 0; font-size: 15px; line-height: 1.5; color: #fff; overflow-wrap: anywhere; }
.aw-win-cite { margin: 16px 0 0; font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.86); font-style: italic; }
.aw-win-about { margin: 16px 0 10px; font-size: 13.5px; line-height: 1.65; color: rgba(255,255,255,0.7); }
.aw-win-voice { margin-bottom: 14px; }
.aw-win-manual { margin-top: 16px; display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
.aw-win-manual-note { margin: 0; font-size: 12.5px; color: rgba(255,255,255,0.62); line-height: 1.5; }
@media (max-width: 560px) {
  .aw-win-details dl > div { grid-template-columns: 1fr; gap: 3px; }
}
`;
