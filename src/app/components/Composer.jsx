import { useMemo, useRef, useState } from "react";
import { AtSign, ImagePlus, Link2, Video, X, Loader2 } from "lucide-react";
import { useStore } from "../lib/store";
import { auth } from "../lib/auth";
import { cms } from "../lib/cms";
import { createPost, social } from "../lib/social";
import { fileURL, POST_TAGS } from "../lib/config";
import { blobToDataURL, compressImage, uploadMedia, videoInfo } from "../lib/media";
import { insertMention, mentionQuery } from "../lib/mentions";
import { isDemoApi } from "../lib/api";
import { showAlert } from "../lib/ui";
import { Avatar, Button, Chip, IconButton, Sheet } from "./ui";

/* =========================================================
   New post (iOS FeedComposer): text, photos and a ≤30 s video
   (straight to Cloudinary with the server's signed upload when
   media uploads are on; otherwise one inline photo), a link,
   topic tags and @-tagging of speakers and attendees.
========================================================= */

export default function Composer({ onClose }) {
  const a = useStore(auth);
  const s = useStore(social);
  const c = useStore(cms);
  const [text, setText] = useState("");
  const [caret, setCaret] = useState(0);
  const [items, setItems] = useState([]); // {id, type, blob, previewUrl, width, height, duration}
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [tags, setTags] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [tagPicker, setTagPicker] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [posting, setPosting] = useState(false);
  const [status, setStatus] = useState("");
  const [preparing, setPreparing] = useState(false);
  const fileRef = useRef(null);
  const textRef = useRef(null);
  const media = s.media || { enabled: false, maxItems: 1, maxVideoSeconds: 30 };
  const maxItems = media.enabled ? Math.max(1, media.maxItems || 6) : 1;
  const me = a.me || {};

  const candidates = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const sp of c.speakers) { const k = sp.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push({ type: "speaker", id: sp.id, name: sp.name, detail: [sp.title, sp.company].filter(Boolean).join(" · "), photo: sp.photo }); } }
    for (const p of s.people) {
      const k = p.name.toLowerCase();
      if (seen.has(k) || p.id === me.id || s.blocked.includes(p.id)) continue;
      seen.add(k);
      out.push({ type: "user", id: p.id, name: p.name, detail: [p.jobTitle, p.organization].filter(Boolean).join(" · "), photo: fileURL(p.avatarUrl) });
    }
    return out;
  }, [c.speakers, s.people, s.blocked, me.id]);

  const q = mentionQuery(text, caret);
  const suggestions = q === null ? [] : candidates.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  const pickList = candidates.filter((x) => !pickQuery || [x.name, x.detail].some((v) => v.toLowerCase().includes(pickQuery.toLowerCase()))).slice(0, 50);

  const tag = (x, fromPicker = false) => {
    const next = fromPicker ? insertMention(text, x.name, text.length) : insertMention(text, x.name, caret);
    setText(next);
    if (!mentions.some((m) => m.id === x.id)) setMentions((ms) => [...ms, { type: x.type, id: x.id, name: x.name }]);
    setTagPicker(false);
    setTimeout(() => { textRef.current?.focus(); const end = next.length; textRef.current?.setSelectionRange(end, end); setCaret(end); }, 30);
  };

  const pick = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setPreparing(true);
    const next = [];
    let rejected = "";
    for (const f of files) {
      try {
        if (f.type.startsWith("video/")) {
          if (!media.enabled) { rejected = "Videos need photo and video uploads switched on."; continue; }
          const info = await videoInfo(f);
          if (info.duration > (media.maxVideoSeconds || 30) + 0.5) { URL.revokeObjectURL(info.url); rejected = `Videos can be up to ${media.maxVideoSeconds || 30} seconds. Trim it and try again.`; continue; }
          if (f.size > 95 * 1024 * 1024) { URL.revokeObjectURL(info.url); rejected = "That video is too large. Try a shorter one."; continue; }
          next.push({ id: Math.random().toString(36).slice(2), type: "video", blob: f, previewUrl: info.url, width: info.width, height: info.height, duration: info.duration });
        } else {
          const { blob, width, height } = await compressImage(f, media.enabled ? { maxEdge: 1600, maxBytes: 900000 } : { maxEdge: 1280, maxBytes: 430000 });
          next.push({ id: Math.random().toString(36).slice(2), type: "image", blob, previewUrl: URL.createObjectURL(blob), width, height });
        }
      } catch (err) { rejected = err.message; }
    }
    setItems((xs) => [...(maxItems > 1 ? xs : []), ...next].slice(0, maxItems));
    setPreparing(false);
    if (rejected) showAlert("Some items weren't added", rejected);
  };

  const canPost = (text.trim() || items.length) && !posting && !preparing;

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      const body = text.trim();
      const payload = { body, topicTags: tags, linkUrl: link.trim(), ...(mentions.length ? { mentions: mentions.filter((m) => body.includes("@" + m.name)) } : {}) };
      if (items.length && media.enabled) {
        const up = [];
        for (let i = 0; i < items.length; i++) {
          setStatus(`Uploading ${i + 1} of ${items.length}…`);
          up.push(await uploadMedia(items[i]));
        }
        payload.media = up;
      } else if (items.length) {
        payload.imageData = await blobToDataURL(items[0].blob);
      }
      setStatus("");
      const p = await createPost(payload);
      onClose();
      if (p.status === "held") showAlert("Post held", "It'll appear in the feed once the TTFC team has reviewed it.");
      else showAlert("Posted to the TTFC feed");
    } catch (err) {
      setStatus("");
      showAlert("Couldn't post", err.message);
    } finally { setPosting(false); }
  };

  return (
    <Sheet open onClose={onClose} title="New post" full
      actions={{
        left: <button type="button" className="link-btn" style={{ color: "var(--tx2)" }} onClick={onClose}>Cancel</button>,
        right: <button type="button" className="link-btn" onClick={submit} disabled={!canPost} style={{ opacity: canPost ? 1 : 0.5, fontWeight: 700 }}>{posting ? (status ? "Uploading…" : "Posting…") : "Post"}</button>,
      }}>
      <div className="sheet-body stack" style={{ flex: 1, overflow: "auto", paddingBottom: 20 }}>
        <div className="row">
          <Avatar name={me.name} src={fileURL(me.avatarUrl)} size={44} />
          <div><b>{me.name || "You"}</b><div className="tiny muted">{isDemoApi() ? "Posting to the TTFC feed (demo)" : "Posting to everyone at TTFC"}</div></div>
        </div>
        <textarea
          ref={textRef}
          className="textarea"
          style={{ minHeight: 150 }}
          value={text}
          maxLength={4000}
          onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart); }}
          onSelect={(e) => setCaret(e.target.selectionStart)}
          placeholder="What's on your mind? Share a thought or ask a question — photos and a video are optional."
          aria-label="Post text"
          autoFocus
        />
        {suggestions.length > 0 && (
          <div className="mention-list" role="listbox" aria-label="Tag someone">
            {suggestions.map((x) => (
              <button key={x.type + x.id} type="button" role="option" aria-selected="false" onClick={() => tag(x)}>
                <Avatar name={x.name} src={x.photo} size={30} round={x.type === "speaker"} />
                <span style={{ minWidth: 0 }}><b className="small" style={{ display: "block" }}>{x.name}{x.type === "speaker" ? " · Speaker" : ""}</b><span className="tiny muted ellipsis" style={{ display: "block" }}>{x.detail}</span></span>
              </button>
            ))}
          </div>
        )}
        <div className="row wrap" style={{ gap: 8 }}>
          <input ref={fileRef} type="file" hidden multiple={maxItems > 1} accept={media.enabled ? "image/*,video/*" : "image/*"} onChange={pick} />
          <Button size="sm" icon={media.enabled ? ImagePlus : ImagePlus} onClick={() => fileRef.current?.click()}>{items.length ? "Add more" : media.enabled ? "Photos / video" : "Photo"}</Button>
          <Button size="sm" icon={Link2} onClick={() => { setShowLink((v) => !v); if (showLink) setLink(""); }}>{showLink ? "Remove link" : "Link"}</Button>
          <Button size="sm" icon={AtSign} onClick={() => setTagPicker(true)}>Tag people</Button>
        </div>
        {(items.length > 0 || preparing) && (
          <div className="media-strip">
            {items.map((m, i) => (
              <div key={m.id} className="media-thumb">
                {m.type === "video" ? <video src={m.previewUrl} muted playsInline /> : <img src={m.previewUrl} alt={`Photo ${i + 1}`} />}
                {m.type === "video" && <Video aria-label="Video" style={{ position: "absolute", left: 6, bottom: 6, width: 16, height: 16, color: "#fff" }} />}
                <IconButton icon={X} label="Remove" onClick={() => setItems((xs) => xs.filter((y) => y.id !== m.id))} />
              </div>
            ))}
            {preparing && <div className="media-thumb" style={{ display: "grid", placeItems: "center", background: "var(--elevated)" }}><Loader2 aria-label="Preparing" style={{ animation: "spin .8s linear infinite" }} /></div>}
          </div>
        )}
        {status && <p className="small bold" style={{ margin: 0, color: "var(--pur-alt)" }} role="status">{status}</p>}
        {showLink && (
          <label className="field"><span className="field-label">Link</span><input className="input" type="url" inputMode="url" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} /></label>
        )}
        <div className="stack-sm">
          <span className="section-title">Tag topics</span>
          <div className="chips chips--wrap">
            {POST_TAGS.map((t) => <Chip key={t} on={tags.includes(t)} onClick={() => setTags((xs) => (xs.includes(t) ? xs.filter((y) => y !== t) : [...xs, t].slice(0, 8)))}>{t}</Chip>)}
          </div>
        </div>
      </div>
      {tagPicker && (
        <Sheet open onClose={() => setTagPicker(false)} title="Tag people" full>
          <div className="sheet-body stack-sm" style={{ flex: 1, overflow: "auto" }}>
            <input className="input" placeholder="Name or company" value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} autoFocus aria-label="Search people" />
            <div className="mention-list">
              {pickList.map((x) => (
                <button key={x.type + x.id} type="button" onClick={() => tag(x, true)}>
                  <Avatar name={x.name} src={x.photo} size={34} round={x.type === "speaker"} />
                  <span style={{ minWidth: 0 }}><b className="small" style={{ display: "block" }}>{x.name}{x.type === "speaker" ? " · Speaker" : ""}</b><span className="tiny muted ellipsis" style={{ display: "block" }}>{x.detail}</span></span>
                </button>
              ))}
              {pickList.length === 0 && <p className="muted small center" style={{ padding: 16, margin: 0 }}>No one matches.</p>}
            </div>
          </div>
        </Sheet>
      )}
    </Sheet>
  );
}
