import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Briefcase, Camera, Flag, Hand, Heart, Link2, Loader2, MessageCircle, MessageSquare, MoreHorizontal, Send, Share2, Trash2, ArrowUpRight, Megaphone, X as XIcon } from "lucide-react";
import { useStore } from "../lib/store";
import { cms } from "../lib/cms";
import { auth, can, firstName, isSignedIn } from "../lib/auth";
import { blockUser, deletePost, report, social, toggleLike } from "../lib/social";
import { fileURL, FEATURES } from "../lib/config";
import { mentionPath, splitMentions } from "../lib/mentions";
import { postTime } from "../lib/time";
import { prepareShare, shareSourceOf, sharePrepared } from "../lib/shareCard";
import { confirmDialog, safeHref, showAlert } from "../lib/ui";
import { Avatar, IconButton, Kicker } from "./ui";
import Comments from "./Comments";

/* =========================================================
   A feed post (iOS FeedPostCard): text first, then photos /
   video (swipe when there are several), then Like · Comment ·
   Share. Double-tap the media to like. "@Name" links to the
   person or speaker.
========================================================= */

function MediaCarousel({ media, onDoubleTap }) {
  const [index, setIndex] = useState(0);
  const lastTap = useRef(0);
  const first = media[0] || {};
  const aspect = first.width > 0 && first.height > 0 ? Math.min(1.91, Math.max(0.8, first.width / first.height)) : 1;
  const onScroll = (e) => {
    const el = e.currentTarget;
    setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  const onPointerUp = () => {
    const t = Date.now();
    if (t - lastTap.current < 320) onDoubleTap();
    lastTap.current = t;
  };
  return (
    <div className="post-media" onPointerUp={onPointerUp}>
      <div className="carousel" style={{ aspectRatio: String(aspect) }} onScroll={onScroll} tabIndex={media.length > 1 ? 0 : undefined} aria-label={media.length > 1 ? `${media.length} photos and videos, swipe to see more` : undefined}>
        {media.map((m, i) => (
          m.type === "video"
            ? <video key={i} src={fileURL(m.url)} poster={m.posterUrl ? fileURL(m.posterUrl) : undefined} controls playsInline preload="metadata" style={{ aspectRatio: String(aspect) }} />
            : <img key={i} src={fileURL(m.url)} alt="" loading="lazy" decoding="async" style={{ aspectRatio: String(aspect) }} crossOrigin={/^https?:\/\//.test(m.url) && !m.url.startsWith(window.location.origin) ? "anonymous" : undefined} />
        ))}
      </div>
      {media.length > 1 && (
        <>
          <span className="carousel-count" aria-hidden="true">{index + 1}/{media.length}</span>
          <div className="carousel-dots" aria-hidden="true">{media.map((_, i) => <i key={i} className={i === index ? "on" : ""} />)}</div>
        </>
      )}
    </div>
  );
}

export default function PostCard({ post }) {
  const a = useStore(auth);
  const s = useStore(social);
  const c = useStore(cms);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [burst, setBurst] = useState(0);
  const signedIn = isSignedIn(a);
  const mine = a.me?.id && post.authorId === a.me.id;
  const staffCanRemove = !mine && (post.canRemove || can("deleteAnyPost", a));
  const author = s.people.find((p) => p.id === post.authorId);
  const badge = post.authorTier === "Speaker Pass" || author?.kind === "speaker" ? "Speaker" : author?.kind === "exhibitor" ? "Exhibitor" : null;
  const media = post.media?.length ? post.media : post.imageUrl ? [{ type: "image", url: post.imageUrl }] : [];
  const hasMedia = media.length > 0;
  const long = post.body.length > (hasMedia ? 200 : 450);
  const subtitle = [post.authorTitle, post.authorOrg].filter(Boolean).join(" · ") || (post.kind === "announcement" ? "Announcement" : "Member");
  const link = safeHref(post.linkUrl);

  const like = () => {
    if (!signedIn) { showAlert("Sign up to react", "Guests can read the feed. Sign in to like and comment."); return; }
    toggleLike(post);
  };
  const doubleTap = () => {
    setBurst((n) => n + 1);
    if (!post.likedByMe) like();
  };
  // Share menu: the post goes as a card image (author, text with its line breaks,
  // photos, TTFC footer) plus the photos / video and the caption (lib/shareCard.js).
  // The card is prepared as soon as the menu opens, so picking an app can open the
  // share sheet straight from that tap.
  const [shareMenu, setShareMenu] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const prepared = useRef(null);
  const openShare = () => {
    setShareMenu((v) => !v);
    if (!prepared.current || prepared.current.body !== post.body) {
      const job = { body: post.body, value: null, promise: null };
      job.promise = prepareShare(shareSourceOf(post, subtitle)).then((v) => { job.value = v; return v; });
      job.promise.catch(() => { if (prepared.current === job) prepared.current = null; });
      prepared.current = job;
    }
  };
  const shareTo = async (platform) => {
    setShareMenu(false);
    const job = prepared.current;
    if (job?.value) { sharePrepared(job.value, platform); return; }
    setPreparing(true);
    try { sharePrepared(await job.promise, platform); }
    catch { showAlert("Couldn't prepare the post", "Check your connection and try again."); }
    finally { setPreparing(false); }
  };
  const remove = async () => {
    setMenu(false);
    const ok = await confirmDialog({
      title: mine ? "Delete this post?" : "Remove this post for everyone?",
      message: mine ? "It disappears from the feed for everyone." : "It disappears from the feed for everyone. The author isn't told.",
      confirm: mine ? "Delete" : "Remove", destructive: true,
    });
    if (ok && !(await deletePost(post))) showAlert("Couldn't remove it", social.get().lastError || "Check your connection and try again.");
  };
  const reportPost = async () => {
    setMenu(false);
    const ok = await confirmDialog({ title: "Report this post?", message: "The TTFC team reviews reports within 24 hours during the event.", confirm: "Report post", destructive: true });
    if (ok && (await report("post", post.id))) showAlert("Thanks for telling us", "The TTFC team will review it.");
  };
  const block = async () => {
    setMenu(false);
    const ok = await confirmDialog({ title: `Block ${post.authorName}?`, message: "You won't see each other's posts or messages.", confirm: `Block ${firstName(post.authorName)}`, destructive: true });
    if (ok && (await blockUser(post.authorId))) showAlert(`${post.authorName} is blocked`);
  };

  const parts = splitMentions(post.body, post.mentions, s.people);
  return (
    <article className="post" aria-label={`Post by ${post.authorName}`}>
      <header className="post-head" style={{ position: "relative" }}>
        <Avatar name={post.authorName} src={fileURL(post.authorAvatarUrl)} size={38}
          badge={post.kind === "announcement" ? <span className="avatar-badge"><Megaphone aria-hidden="true" /></span> : null} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            {FEATURES.network && post.authorId && post.kind !== "announcement" ? <Link to={`/people/${encodeURIComponent(post.authorId)}`} className="post-author ellipsis" style={{ color: "inherit", textDecoration: "none" }}>{post.authorName}</Link> : <span className="post-author ellipsis">{post.authorName}</span>}
            {post.kind === "announcement" ? <BadgeCheck aria-label="Official" style={{ width: 14, height: 14, color: "var(--pur-alt)", flex: "none" }} /> : badge ? <Kicker tone="accent">{badge}</Kicker> : null}
          </div>
          <div className="post-sub ellipsis">{subtitle} · <time dateTime={post.createdAt}>{postTime(post.createdAt)}</time>{post.status === "held" ? " · Held for review" : ""}</div>
        </div>
        {signedIn && <IconButton icon={MoreHorizontal} label="More options" small onClick={() => setMenu((v) => !v)} aria-expanded={menu} />}
        {menu && (
          <div className="menu" role="menu" onMouseLeave={() => setMenu(false)}>
            {mine && <button type="button" role="menuitem" className="danger" onClick={remove}><Trash2 aria-hidden="true" width={16} />Delete post</button>}
            {!mine && <button type="button" role="menuitem" onClick={reportPost}><Flag aria-hidden="true" width={16} />Report post</button>}
            {!mine && post.kind !== "announcement" && post.authorId && <button type="button" role="menuitem" className="danger" onClick={block}><Hand aria-hidden="true" width={16} />Block {firstName(post.authorName)}</button>}
            {staffCanRemove && <button type="button" role="menuitem" className="danger" onClick={remove}><Trash2 aria-hidden="true" width={16} />Remove post (staff)</button>}
          </div>
        )}
      </header>

      {post.body && (
        <div className={"post-body" + (!hasMedia && post.body.length < 120 ? " post-body--big" : "")} style={!expanded && long ? { display: "-webkit-box", WebkitLineClamp: hasMedia ? 4 : 10, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}>
          {parts.map((p, i) => {
            if (!p.mention) return <span key={i}>{p.text}</span>;
            const to = p.mention.type === "speaker" || FEATURES.network ? mentionPath(p.mention, c) : null;
            return to ? <Link key={i} to={to} className="mention">{p.text}</Link> : <span key={i} className="mention">{p.text}</span>;
          })}
        </div>
      )}
      {long && !expanded && <button type="button" className="link-btn" style={{ padding: "0 16px 8px", minHeight: 0, color: "var(--tx2)" }} onClick={() => setExpanded(true)}>See more</button>}
      {link && (
        <a className="post-link" href={link} target="_blank" rel="noopener noreferrer nofollow">
          <span className="ico"><Link2 aria-hidden="true" style={{ width: 13, height: 13 }} /></span>
          <span className="ellipsis" style={{ flex: 1 }}>{link.replace(/^https?:\/\//, "")}</span>
          <ArrowUpRight aria-hidden="true" style={{ width: 13, height: 13, color: "var(--tx2)" }} />
        </a>
      )}
      {post.topicTags?.length > 0 && <div className="post-tags">{post.topicTags.map((t) => "#" + t.replace(/[\s&]/g, "")).join(" ")}</div>}
      {hasMedia && (
        <div style={{ position: "relative" }}>
          <MediaCarousel media={media} onDoubleTap={doubleTap} />
          {burst > 0 && <div key={burst} className="heart-burst" aria-hidden="true"><Heart /></div>}
        </div>
      )}
      {(post.likeCount > 0 || post.commentCount > 0) && (
        <div className="post-counts">
          {post.likeCount > 0 && <><Heart aria-hidden="true" /><span>{post.likeCount}</span></>}
          <span className="spacer" />
          {post.commentCount > 0 && <button type="button" className="text-btn small" onClick={() => setShowComments(true)}>{post.commentCount === 1 ? "1 comment" : `${post.commentCount} comments`}</button>}
        </div>
      )}
      <div className="post-actions">
        <button type="button" className={"post-action pressable" + (post.likedByMe ? " post-action--on" : "")} aria-pressed={!!post.likedByMe} onClick={like}>
          <Heart aria-hidden="true" />Like
        </button>
        <button type="button" className="post-action pressable" onClick={() => setShowComments(true)} aria-label={`Comment, ${post.commentCount} so far`}>
          <MessageCircle aria-hidden="true" />Comment
        </button>
        <button type="button" className="post-action pressable" onClick={openShare} aria-haspopup="menu" aria-expanded={shareMenu} disabled={preparing}>
          {preparing ? <Loader2 aria-hidden="true" className="spin" /> : <Send aria-hidden="true" />}{preparing ? "Sharing…" : "Share"}
        </button>
      </div>
      {shareMenu && (
        <div className="post-share-wrap">
          <div className="menu post-share-menu" role="menu" onMouseLeave={() => setShareMenu(false)}>
            <button type="button" role="menuitem" onClick={() => shareTo("instagram")}><Camera aria-hidden="true" width={16} />Instagram</button>
            <button type="button" role="menuitem" onClick={() => shareTo("whatsapp")}><MessageSquare aria-hidden="true" width={16} />WhatsApp</button>
            <button type="button" role="menuitem" onClick={() => shareTo("linkedin")}><Briefcase aria-hidden="true" width={16} />LinkedIn</button>
            <button type="button" role="menuitem" onClick={() => shareTo("x")}><XIcon aria-hidden="true" width={16} />X</button>
            <hr />
            <button type="button" role="menuitem" onClick={() => shareTo(null)}><Share2 aria-hidden="true" width={16} />More…</button>
          </div>
        </div>
      )}
      {showComments && <Comments post={post} onClose={() => setShowComments(false)} />}
    </article>
  );
}
