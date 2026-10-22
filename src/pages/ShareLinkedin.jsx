import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AtSign, BarChart3, Check, Copy, ExternalLink, Linkedin, Loader2, MessagesSquare, RotateCcw } from "lucide-react";
import AuroraBackground from "../components/AuroraBackground";
import { ATT_CSS } from "./attendingStyles";
import { ENQUIRE, LINKEDIN_PAGE, copyText, copyTextNow, isLinkedinPostUrl, linkedinShareUrl } from "../lib/attending";
import { isDemoToken, loadShareDraft, startSharePost } from "../lib/sharePagesApi";

/* =========================================================
   /share/linkedin?t=<token>: a session chat or a live poll from
   the TTFC app, as a LinkedIn post (Oct 22 2026). Unlinked and
   noindex, like /attending (same look). The app asks the backend
   for the token (POST /api/app/linkedin/share), so the page knows
   who it's for and what to show:
     - the session (title, when, where) and the chat's topic, or
       the poll's question and its results so far,
     - an editable post ("#TTFC2026"; we tag TTFC's page),
     - "Post to LinkedIn": the text goes to the backend, LinkedIn
       asks to allow posting, the backend posts it with a link to
       the session attached and comes back to #posted=1&post=<URL>
       (or #post_error=<code>), as /attending does. Only those posts
       are confirmed and earn the +15 points.
     - if that fails: copy the text and open LinkedIn's share box
       (no points: LinkedIn can't tell us it was posted).
   Server calls: src/lib/sharePagesApi.js. t=demo… is the app's
   demo mode: nothing reaches the server or LinkedIn.
========================================================= */

const POST_ERRORS = {
  cancelled: "You cancelled on LinkedIn, so nothing was posted. Try again whenever you’re ready.",
  unavailable: "Posting straight to LinkedIn isn’t available right now. You can still copy the text and open LinkedIn.",
  expired: "That took a little too long. Press “Post to LinkedIn” again.",
  busy: "Too many tries. Wait a few minutes, then try again.",
  posted: "You’ve already shared this one on LinkedIn.",
};
const postErrorText = (code) => POST_ERRORS[code] || "LinkedIn didn’t accept the post. Try again, or copy the text and open LinkedIn.";
const LOAD_ERRORS = {
  invalid: "This link isn’t complete. Go back to the TTFC app and tap Share on LinkedIn again.",
  expired: "This link has expired. Go back to the TTFC app and tap Share on LinkedIn again.",
};
const DRAFT_KEY = "ttfc.share.linkedin.draft";

/** The token from ?t=, and what LinkedIn sent back in the fragment (#posted=1&post=… or #post_error=…). */
function readLocation() {
  if (typeof window === "undefined") return { t: "", posted: null, postError: "", fromApp: false };
  const q = new URLSearchParams(window.location.search);
  const f = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const post = f.get("post") || "";
  return {
    t: q.get("t") || "",
    posted: f.get("posted") === "1" ? { url: isLinkedinPostUrl(post) ? post : "" } : null,
    postError: (f.get("post_error") || "").replace(/[^a-z_]/g, "").slice(0, 40),
    fromApp: q.get("from") !== "web",
    had: window.location.hash.length > 1,
  };
}

function savedText(t) {
  try { const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); return d?.t === t && typeof d.text === "string" ? d.text : ""; } catch { return ""; }
}
function saveText(t, text) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ t, text })); } catch { /* private mode */ } }

export default function ShareLinkedin() {
  const [loc] = useState(readLocation);
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState(() => (loc.t ? "" : LOAD_ERRORS.invalid));
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
    if (loc.had) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    return () => { document.title = prev; robots.remove(); document.body.classList.remove("att-open"); };
  }, [loc.had]);

  useEffect(() => {
    if (!loc.t) return undefined;
    let live = true;
    loadShareDraft(loc.t).then(
      (d) => { if (!live) return; setDraft(d); setText((cur) => cur || String(d.text || "").slice(0, 3000)); },
      (e) => { if (live) setLoadError(LOAD_ERRORS[e?.code] || (e?.status === 404 || e?.status === 410 ? LOAD_ERRORS.expired : e?.message || "We couldn’t load this. Try again in a moment.")); },
    );
    return () => { live = false; };
  }, [loc.t]);

  const already = draft?.posted?.url || "";
  const post = async () => {
    if (!draft || posting) return;
    setPosting(true);
    setPostError("");
    saveText(loc.t, text);
    try {
      const r = await startSharePost(loc.t, text);
      if (r.demo) { setPosting(false); setPosted({ url: "", demo: true }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      window.location.assign(r.redirect);
    } catch (e) {
      setPosting(false);
      setPostError(postErrorText(e?.code));
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
  const maxPct = useMemo(() => Math.max(1, ...(draft?.poll?.options || []).map((o) => o.pct || 0)), [draft]);

  return (
    <div className="att-root">
      <style>{ATT_CSS + CSS}</style>
      <AuroraBackground />

      <header className="att-brand">
        <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.png" alt="The Tech Festival Canada" width="240" height="150" />
      </header>

      <div className="att-hero">
        <p className="att-eyebrow">TTFC 2026 · Share on LinkedIn</p>
        <h1 className="att-title">{title}</h1>
        <p className="att-sub">Edit the post if you like, then Post to LinkedIn. We attach a link to the session and tag {LINKEDIN_PAGE.name}.</p>
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
            {loc.fromApp && <a className="att-back-app" href="/app/">Back to the TTFC app</a>}
          </div>
        </div>
      )}

      {loadError ? (
        <section className="att-card sl-narrow" role="alert">
          <p className="att-error" style={{ margin: 0 }}><AlertCircle size={16} aria-hidden="true" /><span>{loadError}</span></p>
          <a className="att-back-app" href="/app/">Open the TTFC app</a>
        </section>
      ) : !draft ? (
        <section className="att-card sl-narrow sl-loading" aria-busy="true"><Loader2 size={22} className="att-spin" aria-hidden="true" /> Loading your post…</section>
      ) : !posted && (
        <main className="att-grid">
          <div className="att-preview-col">
            <section className="att-card" aria-label="What you're sharing">
              <p className="sl-kicker">{isPoll ? <><BarChart3 size={15} aria-hidden="true" /> Live poll</> : <><MessagesSquare size={15} aria-hidden="true" /> Session chat</>}</p>
              <h2 className="sl-session">{draft.session?.title}</h2>
              {(draft.session?.when || draft.session?.place) && <p className="sl-meta">{[draft.session.when, draft.session.place].filter(Boolean).join(" · ")}</p>}
              {draft.topic && <p className="sl-topic">{draft.topic}</p>}
              {isPoll && draft.poll && (
                <div className="sl-poll">
                  <p className="sl-question">{draft.poll.question}</p>
                  <ul className="sl-results" aria-label="Results so far">
                    {draft.poll.options.map((o) => (
                      <li key={o.label}>
                        <span className="sl-bar" style={{ width: `${Math.max(4, ((o.pct || 0) / maxPct) * 100)}%` }} aria-hidden="true" />
                        <span className="sl-opt">{o.label}</span><b className="sl-pct">{o.pct}%</b>
                      </li>
                    ))}
                  </ul>
                  {draft.poll.total > 0 && <p className="sl-meta">{draft.poll.total.toLocaleString()} votes so far</p>}
                </div>
              )}
              {draft.article?.url && (
                <div className="sl-article" aria-label="The link attached to your post">
                  <span className="sl-article-host">{draft.article.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</span>
                  <b>{draft.article.title}</b>
                  {draft.article.description && <span>{draft.article.description}</span>}
                </div>
              )}
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
            <textarea id="sl-text" className="att-input att-textarea" value={text} onChange={(e) => setText(e.target.value.slice(0, 3000))} rows={10} />
            <p className="att-count" aria-live="off">{text.length.toLocaleString()} / 3,000</p>
            <p className="att-hint">
              <AtSign size={14} aria-hidden="true" />
              <span>We’ll tag <a className="att-link" href={LINKEDIN_PAGE.url} target="_blank" rel="noopener noreferrer">{LINKEDIN_PAGE.name}</a>’s LinkedIn page and attach a link to the session.</span>
            </p>

            <div className="att-actions">
              {already ? (
                <p className="att-done" role="status"><Check size={16} aria-hidden="true" /> You’ve shared this on LinkedIn already. <a className="att-link" href={already} target="_blank" rel="noopener noreferrer">View it</a></p>
              ) : (
                <>
                  <button type="button" className="att-btn" onClick={post} disabled={posting || !text.trim()} aria-busy={posting || undefined}>
                    {posting ? <Loader2 size={20} className="att-spin" aria-hidden="true" /> : <Linkedin size={20} aria-hidden="true" />}
                    {posting ? "Opening LinkedIn…" : "Post to LinkedIn"}
                  </button>
                  {!postError && <p className="att-hint att-hint-center">LinkedIn asks you to allow it once, then your post goes up.</p>}
                  <p className="att-hint att-hint-center att-points-note"><span><b>+15 points</b> in the TTFC app (up to 5 shares). Points are added when you post with Post to LinkedIn.</span></p>
                </>
              )}
              {postError && (
                <div className="att-error att-post-error" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <div>
                    <span>{postError}</span>
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
.sl-meta { margin: 6px 0 0; font-size: 13.5px; color: rgba(255,255,255,0.72); }
.sl-topic { margin: 14px 0 0; padding: 12px 14px; border-radius: 14px; font-size: 15px; line-height: 1.5; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); }
.sl-poll { margin-top: 16px; }
.sl-question { margin: 0 0 10px; font-size: 16px; font-weight: 700; line-height: 1.4; }
.sl-results { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.sl-results li { position: relative; display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 12px; border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
.sl-bar { position: absolute; inset: 0 auto 0 0; background: linear-gradient(90deg, rgba(122,63,209,0.55), rgba(232,69,139,0.4)); }
.sl-opt, .sl-pct { position: relative; }
.sl-opt { flex: 1; font-size: 14.5px; }
.sl-pct { font-variant-numeric: tabular-nums; font-size: 14.5px; }
.sl-article { display: flex; flex-direction: column; gap: 3px; margin-top: 16px; padding: 12px 14px; border-radius: 14px; background: #f3f2ef; color: #1d1d1f; }
.sl-article b { font-size: 14.5px; line-height: 1.35; }
.sl-article span { font-size: 12.5px; color: #555; }
.sl-article .sl-article-host { text-transform: lowercase; font-size: 11.5px; color: #666; }
`;
