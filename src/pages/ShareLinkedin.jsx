import { useEffect, useState } from "react";
import { AlertCircle, AtSign, BarChart3, Check, Copy, ExternalLink, Linkedin, Loader2, MessagesSquare, RotateCcw } from "lucide-react";
import AuroraBackground from "../components/AuroraBackground";
import { ATT_CSS } from "./attendingStyles";
import { ENQUIRE, LINKEDIN_PAGE, copyText, copyTextNow, isLinkedinPostUrl, linkedinShareUrl } from "../lib/attending";
import { isDemoToken, loadShareDraft, startSharePost } from "../lib/sharePagesApi";

/* =========================================================
   /share/linkedin?t=<token>: a session's discussion or a live
   poll from the TTFC app, as a LinkedIn post (Oct 22 2026).
   Unlinked and noindex, like /attending (same look). The app asks
   the backend for the token (POST /api/app/linkedin/share, 2 hours),
   so the page knows who it's for and what to show:
     - the session and the link card that goes with the post
       (title, description, the session on thetechfestival.com),
     - the post, editable (the server wrote it: the poll's question
       and results so far, "#TTFC2026"; we tag TTFC's page),
     - "Post to LinkedIn": the text is saved with the token, LinkedIn
       asks to allow posting, the backend posts it and comes back to
       #posted=1&post=<URL>, or #post_error=<code>&t=<token> (the
       draft is kept, so "Try again" works). Only those posts are
       confirmed and earn the +15 points.
     - if that fails or isn't available: copy the text and open
       LinkedIn's share box (no points: LinkedIn can't tell us).
   Server calls: src/lib/sharePagesApi.js. t=demo is the app's demo
   mode: nothing reaches the server or LinkedIn.
========================================================= */

const POST_ERRORS = {
  cancelled: "You cancelled on LinkedIn, so nothing was posted. Try again whenever you’re ready.",
  denied: "LinkedIn didn’t allow the post, so nothing was posted. Try again and choose Allow.",
  unavailable: "Posting straight to LinkedIn isn’t available right now. You can still copy the text and open LinkedIn.",
  expired: "That took a little too long. Press “Post to LinkedIn” again.",
  busy: "Too many tries. Wait a few minutes, then try again.",
};
const postErrorText = (code) => POST_ERRORS[code] || "LinkedIn didn’t accept the post. Try again, or copy the text and open LinkedIn.";
const LOAD_ERRORS = {
  invalid: "This link isn’t complete. Go back to the TTFC app and tap Share on LinkedIn again.",
  expired: "This link has expired (they last 2 hours, or it’s been posted). Go back to the TTFC app and tap Share on LinkedIn again.",
};
const DRAFT_KEY = "ttfc.share.linkedin.draft";

/** The token (?t=, or #…&t= after a failed try) and what LinkedIn sent back (#posted=1&post=… or #post_error=…). */
function readLocation() {
  if (typeof window === "undefined") return { t: "", posted: null, postError: "", had: false };
  const q = new URLSearchParams(window.location.search);
  const f = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const post = f.get("post") || "";
  return {
    t: q.get("t") || f.get("t") || "",
    posted: f.get("posted") === "1" ? { url: isLinkedinPostUrl(post) ? post : "" } : null,
    postError: (f.get("post_error") || "").replace(/[^a-z_]/g, "").slice(0, 40),
    had: window.location.hash.length > 1,
  };
}

function savedText(t) {
  try { const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); return d?.t === t && typeof d.text === "string" ? d.text : ""; } catch { return ""; }
}
function saveText(t, text) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ t, text })); } catch { /* private mode */ } }
function clearText() { try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ } }

export default function ShareLinkedin() {
  const [loc] = useState(readLocation);
  const [draft, setDraft] = useState(null);
  // Back from LinkedIn after posting there's no token (the draft is used up): just the good news.
  const [loadError, setLoadError] = useState(() => (loc.t || loc.posted ? "" : LOAD_ERRORS.invalid));
  const [text, setText] = useState(() => savedText(loc.t));
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(loc.posted);
  const [postError, setPostError] = useState(loc.postError ? postErrorText(loc.postError) : "");
  const [copied, setCopied] = useState(false);
  const demo = isDemoToken(loc.t);

  /* Hidden page: out of search engines, a quiet title, the dark background; the fragment leaves the address bar. */
  useEffect(() => {
    const prev = document.title;
    document.title = "Share on LinkedIn · TTFC 2026";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);
    document.body.classList.add("att-open");
    if (loc.had) {
      const q = new URLSearchParams(window.location.search);
      if (loc.t && !q.get("t")) q.set("t", loc.t); // keep the token for a reload after a failed try
      window.history.replaceState(window.history.state, "", window.location.pathname + (q.toString() ? `?${q}` : ""));
    }
    if (loc.posted) clearText();
    return () => { document.title = prev; robots.remove(); document.body.classList.remove("att-open"); };
  }, [loc]);

  useEffect(() => {
    if (!loc.t || loc.posted) return undefined;
    let live = true;
    loadShareDraft(loc.t).then(
      (d) => { if (!live) return; setDraft(d); setText((cur) => cur || String(d.text || "").slice(0, d.maxLength || 3000)); },
      (e) => { if (live) setLoadError(LOAD_ERRORS[e?.code] || (e?.status === 404 || e?.status === 410 ? LOAD_ERRORS.expired : e?.message || "We couldn’t load this. Try again in a moment.")); },
    );
    return () => { live = false; };
  }, [loc]);

  const max = draft?.maxLength || 3000;
  const available = draft?.available !== false;
  const post = async () => {
    if (!draft || posting || !available) return;
    setPosting(true);
    setPostError("");
    saveText(loc.t, text);
    try {
      const r = await startSharePost(loc.t, text);
      if (r.demo) { setPosting(false); setPosted({ url: "", demo: true }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      window.location.assign(r.redirect);
    } catch (e) {
      setPosting(false);
      if (e?.code === "expired" || e?.status === 404) setLoadError(LOAD_ERRORS.expired);
      else setPostError(e?.code === "text" ? e.message : postErrorText(e?.code));
    }
  };
  /* The manual way (no points): copy the text, open LinkedIn's share box with it filled in. */
  const manual = () => {
    const ok = copyTextNow(text);
    window.open(linkedinShareUrl(text), "_blank", "noopener,noreferrer");
    if (ok) flash(); else copyText(text).then((done) => { if (done) flash(); });
  };
  const flash = () => { setCopied(true); setTimeout(() => setCopied(false), 2200); };
  const reset = () => setText(String(draft?.text || ""));

  const isPoll = draft?.kind === "poll";
  const title = !draft ? "Share on LinkedIn" : isPoll ? "Share this poll" : "Share this conversation";
  const host = (draft?.link || "").replace(/^https?:\/\/(www\.)?/, "").split("/")[0];

  return (
    <div className="att-root">
      <style>{ATT_CSS + CSS}</style>
      <AuroraBackground />

      <header className="att-brand">
        <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.webp" alt="The Tech Festival Canada" width="240" height="150" />
      </header>

      <div className="att-hero">
        <p className="att-eyebrow">TTFC 2026 · Share on LinkedIn</p>
        <h1 className="att-title">{posted ? "Shared on LinkedIn" : title}</h1>
        {!posted && <p className="att-sub">Edit the post if you like, then Post to LinkedIn. We attach a link to the session and tag {draft?.page || LINKEDIN_PAGE.name}.</p>}
      </div>

      {posted && (
        <div className="att-posted" role="status">
          <span className="att-posted-icon"><Check size={22} aria-hidden="true" /></span>
          <div>
            <p className="att-posted-title">You’re on LinkedIn!</p>
            <p className="att-posted-sub">{posted.demo
              ? "Demo: nothing was posted. In the real app your post goes up with a link to the session and +15 points are added."
              : "Your post is live with a link to the session. Your +15 points are added in the TTFC app."}</p>
            {posted.url && (
              <a className="att-text-btn" href={posted.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> View your post</a>
            )}
            <a className="att-back-app" href="/app/">Back to the TTFC app</a>
          </div>
        </div>
      )}

      {posted ? null : loadError ? (
        <section className="att-card sl-narrow" role="alert">
          <p className="att-error" style={{ margin: 0 }}><AlertCircle size={16} aria-hidden="true" /><span>{loadError}</span></p>
          <a className="att-back-app" href="/app/">Open the TTFC app</a>
        </section>
      ) : !draft ? (
        <section className="att-card sl-narrow sl-loading" aria-busy="true"><Loader2 size={22} className="att-spin" aria-hidden="true" /> Loading your post…</section>
      ) : (
        <main className="att-grid">
          <div className="att-preview-col">
            <section className="att-card" aria-label="What you're sharing">
              <p className="sl-kicker">{isPoll ? <><BarChart3 size={15} aria-hidden="true" /> Live poll</> : <><MessagesSquare size={15} aria-hidden="true" /> Session discussion</>}</p>
              <h2 className="sl-session">{draft.sessionTitle || draft.title}</h2>
              {draft.link && (
                <div className="sl-article" aria-label="The link card that goes with your post">
                  {host && <span className="sl-article-host">{host}</span>}
                  <b>{draft.title}</b>
                  {draft.description && <span>{draft.description}</span>}
                </div>
              )}
              <p className="sl-meta">This link works for 2 hours.{isPoll ? " The results in the post are the room’s votes so far." : ""}</p>
            </section>
          </div>

          <section className="att-card att-controls" aria-labelledby="sl-post-h">
            <div className="att-step-head">
              <span className="att-step-n" aria-hidden="true">1</span>
              <h2 id="sl-post-h" className="att-step-title">Your post</h2>
              {text !== String(draft.text || "") && (
                <button type="button" className="att-text-btn att-step-aside" onClick={reset}><RotateCcw size={14} aria-hidden="true" /> Reset</button>
              )}
            </div>
            <label className="att-label att-sr" htmlFor="sl-text">LinkedIn post text</label>
            <textarea id="sl-text" className="att-input att-textarea" value={text} onChange={(e) => setText(e.target.value.slice(0, max))} rows={10} />
            <p className="att-count" aria-live="off">{text.length.toLocaleString()} / {max.toLocaleString()}</p>
            <p className="att-hint">
              <AtSign size={14} aria-hidden="true" />
              <span>We’ll tag <a className="att-link" href={LINKEDIN_PAGE.url} target="_blank" rel="noopener noreferrer">{draft.page || LINKEDIN_PAGE.name}</a>’s LinkedIn page and attach a link to the session.</span>
            </p>

            <div className="att-actions">
              {available ? (
                <>
                  <button type="button" className="att-btn" onClick={post} disabled={posting || !text.trim()} aria-busy={posting || undefined}>
                    {posting ? <Loader2 size={20} className="att-spin" aria-hidden="true" /> : <Linkedin size={20} aria-hidden="true" />}
                    {posting ? "Opening LinkedIn…" : postError ? "Try again" : "Post to LinkedIn"}
                  </button>
                  {!postError && <p className="att-hint att-hint-center">LinkedIn asks you to allow it once, then your post goes up.</p>}
                  <p className="att-hint att-hint-center att-points-note"><span><b>+15 points</b> in the TTFC app (up to 5 shares). Points are added when you post with Post to LinkedIn.</span></p>
                </>
              ) : (
                <p className="att-error" role="status"><AlertCircle size={16} aria-hidden="true" /><span>Posting straight to LinkedIn isn’t available right now. You can still copy the text and open LinkedIn (no points).</span></p>
              )}
              {(postError || !available) && (
                <div className={available ? "att-error att-post-error" : "sl-manual"} role={available ? "alert" : undefined}>
                  {available && <AlertCircle size={16} aria-hidden="true" />}
                  <div>
                    {available && <span>{postError}</span>}
                    <button type="button" className="att-text-btn" onClick={manual}><Copy size={14} aria-hidden="true" /> {copied ? "Copied. LinkedIn is open" : "Copy the text and open LinkedIn (no points)"}</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      <footer className="att-foot">
        <p>{demo ? "Demo: this page never posts anything." : "Your text goes only to LinkedIn when you post it. We note that you did, for your points."}</p>
        <p>Questions? <a className="att-link" href={`mailto:${ENQUIRE}`}>{ENQUIRE}</a></p>
      </footer>
    </div>
  );
}

const CSS = `
.sl-narrow { position: relative; z-index: 1; max-width: 560px; display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }
.sl-loading { flex-direction: row; align-items: center; gap: 10px; color: rgba(255,255,255,0.85); }
.sl-kicker { display: inline-flex; align-items: center; gap: 7px; margin: 0 0 10px; font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: #ffc56b; }
.sl-session { margin: 0; font-size: 21px; line-height: 1.3; font-weight: 800; }
.sl-meta { margin: 12px 0 0; font-size: 13px; color: rgba(255,255,255,0.7); }
.sl-article { display: flex; flex-direction: column; gap: 3px; margin-top: 16px; padding: 12px 14px; border-radius: 14px; background: #f3f2ef; color: #1d1d1f; }
.sl-article b { font-size: 14.5px; line-height: 1.35; }
.sl-article span { font-size: 12.5px; color: #555; }
.sl-article .sl-article-host { text-transform: lowercase; font-size: 11.5px; color: #666; }
.sl-manual { margin-top: 10px; display: flex; justify-content: center; }
`;
