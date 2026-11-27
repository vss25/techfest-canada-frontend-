import { useState } from "react";

/* A YouTube or Vimeo video in the approved design's recap box (Nov 18 2026). Shows the video's
   picture and a play button; the provider's player loads only when someone presses play, so the
   page stays fast and nothing is hosted on our site. YouTube's no-cookie player and Vimeo's
   do-not-track setting, so no tracking cookies before the visitor chooses to play. */

function embedUrl(video) {
  if (!video) return "";
  if (video.provider === "youtube") return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.videoId)}?autoplay=1&rel=0&modestbranding=1`;
  if (video.provider === "vimeo") {
    const [id, hash] = String(video.videoId || "").split(":");
    return `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1&dnt=1${hash ? `&h=${encodeURIComponent(hash)}` : ""}`;
  }
  return "";
}

export default function VideoFacade({ video, radius = 0 }) {
  const [playing, setPlaying] = useState(false);
  const src = embedUrl(video);
  if (!src) return null;
  const fill = { position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, borderRadius: radius };
  const box = { position: "relative", width: "100%", height: "100%" };
  if (playing) {
    return <div style={box}><iframe src={src} title={video.title || "Video"} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen style={fill} /></div>;
  }
  return (
    <div style={box}><button type="button" onClick={() => setPlaying(true)} aria-label={`Play: ${video.title || "video"}`} className="p-press"
      style={{ ...fill, padding: 0, cursor: "pointer", background: "#151035", display: "block" }}>
      {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: radius }} />}
      <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: 68, height: 68, marginLeft: -34, marginTop: -34, borderRadius: 999, background: "rgba(21,16,53,.82)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="26" height="26" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#FFFFFF" /></svg>
      </span>
    </button></div>
  );
}
