import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Film, HardDrive, Lock, RotateCcw, Scissors, UploadCloud } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { uploadRaw } from "./uploadFile";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, LoadingState, focusRing } from "../ui";
import { SITE_FILES, isCdnFile } from "../../lib/siteFiles";
import useCmsStatus from "./useCmsStatus";
import VideoEditor from "./VideoEditor";

/* =========================================================
   Site settings › Large site files: the home page video and the
   brochure PDF. Each upload goes up as the raw file to
   POST /api/cms/upload-file (management only, ≤ 40 MB), which
   stores the same bytes on Sanity's CDN and returns { url }; the
   url is then saved in the app content key (site.hero_video_url /
   site.brochure_url) with the usual console content save. The
   website switches to it within about a minute. The brochure goes
   up as it is; the home page video opens the video editor first
   (VideoEditor.jsx: trim, speed, size; silent loop, Nov 25 2026),
   and the current one can be trimmed or sped up again.
========================================================= */

const MAX_BYTES = 40 * 1024 * 1024;

const FILES = [
  {
    id: "heroVideo", icon: Film, type: "video/mp4", accept: "video/mp4,video/quicktime,video/webm,video/*", kind: "video",
    label: "Home page video",
    description: "The looping video behind the logo at the top of the homepage. Computers play it; phones and tablets show a still frame instead.",
  },
  {
    id: "brochure", icon: FileText, type: "application/pdf", accept: "application/pdf,.pdf", kind: "PDF",
    label: "Brochure PDF",
    description: "The sponsorship brochure on the Brochure page, its Download button and the link in brochure emails.",
  },
];

const mb = (n) => `${(n / 1e6).toFixed(1)} MB`;   // like Finder and Explorer show it

/** Size of a file from a HEAD request (null when the server doesn't say or can't be reached). */
function useFileSize(url) {
  const [sizes, setSizes] = useState({});
  useEffect(() => {
    if (!url) return undefined;
    const ctrl = new AbortController();
    fetch(url, { method: "HEAD", signal: ctrl.signal, cache: "no-store" })
      .then((r) => (r.ok ? Number(r.headers.get("content-length")) || null : null))
      .catch(() => null)
      .then((n) => { if (!ctrl.signal.aborted) setSizes((s) => ({ ...s, [url]: n })); });
    return () => ctrl.abort();
  }, [url]);
  return url in sizes ? sizes[url] : undefined;   // undefined = still checking
}

function FileRow({ file, value, canUpload, onSaved }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);   // null | 0…1 while uploading
  const [phase, setPhase] = useState("");           // "" | "upload" | "save"
  const [justUploaded, setJustUploaded] = useState(null);   // { url, bytes }
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null);     // the home video: a File just picked, or the current URL
  const isVideo = file.id === "heroVideo";
  const { fallback } = SITE_FILES[file.id];
  const current = value || fallback;
  const onCdn = isCdnFile(current);
  const checked = useFileSize(current);
  const size = justUploaded?.url === current ? justUploaded.bytes : checked;
  const Icon = file.icon;
  const busy = !!phase;

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr("");
    if (isVideo) {
      if (!String(f.type).startsWith("video/")) { setErr("Choose a video file (MP4 works everywhere)."); return; }
      setEditing(f);
      return;
    }
    if (f.type !== file.type) { setErr(`Choose an ${file.kind} file.`); return; }
    if (f.size > MAX_BYTES) { setErr(`That file is ${mb(f.size)}. Files must be 40 MB or smaller.`); return; }
    setPhase("upload"); setProgress(0);
    try {
      const out = await uploadRaw(f, setProgress);
      setPhase("save");
      await api.put(`/console/app-content/${encodeURIComponent(SITE_FILES[file.id].key)}`, { value: out.url });
      setJustUploaded({ url: out.url, bytes: f.size });
      onSaved(SITE_FILES[file.id].key, out.url);
      toast.success(`${file.label} uploaded. The website uses it within about a minute.`);
    } catch (e2) {
      setErr(e2.message);
      toast.error(e2);
    } finally {
      setPhase(""); setProgress(null);
    }
  };

  // The video editor's upload: send the finished loop, then save it as the home page video.
  const uploadVideo = async (f, onProgress) => {
    const out = await uploadRaw(f, onProgress);
    await api.put(`/console/app-content/${encodeURIComponent(SITE_FILES[file.id].key)}`, { value: out.url });
    return out;
  };
  const videoDone = ({ url, file: f }) => {
    setEditing(null);
    setJustUploaded({ url, bytes: f.size });
    onSaved(SITE_FILES[file.id].key, url);
    toast.success(`${file.label} saved. The website uses it within about a minute.`);
  };

  const switchToBuiltIn = async () => {
    setPhase("save"); setErr("");
    try {
      await api.put(`/console/app-content/${encodeURIComponent(SITE_FILES[file.id].key)}`, { value: "" });
      onSaved(SITE_FILES[file.id].key, "");
      toast.success(`${file.label}: back to the built-in copy within about a minute.`);
    } catch (e2) { setErr(e2.message); toast.error(e2); } finally { setPhase(""); }
  };

  const pct = progress == null ? 0 : Math.round(progress * 100);

  return (
    <div className="grid gap-4 px-4 py-5 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-8">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ttfc-purple/15 text-violet-200">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ttfc-text">{file.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ttfc-muted">{file.description}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-ttfc-muted">
            <span className="text-ttfc-dim">Served from</span>
            {onCdn
              ? <Badge tone="good" icon={UploadCloud}>Sanity CDN</Badge>
              : <Badge tone="warn" icon={HardDrive}>Website build</Badge>}
            <span className="tabular-nums">{size === undefined ? "checking size…" : size ? mb(size) : "size unknown"}</span>
            <a href={current} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 rounded-md font-semibold text-ttfc-muted hover:text-ttfc-text ${focusRing}`}>
              Open <ExternalLink className="h-3 w-3" aria-hidden="true" /><span className="sr-only"> {file.label} (new tab)</span>
            </a>
          </div>
          {!onCdn && (
            <p className="mt-1.5 text-xs text-ttfc-dim">Shipped with every website update ({fallback}). Upload it once to take it off the deploys.</p>
          )}
          {phase && (
            <div className="mt-3 max-w-sm" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-ttfc-panel2" role="progressbar" aria-label={`Uploading ${file.label}`}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={phase === "upload" ? pct : 100}>
                <div className="h-full rounded-full bg-gradient-to-r from-ttfc-pink to-ttfc-purple transition-[width] duration-200"
                  style={{ width: `${phase === "upload" ? pct : 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-ttfc-muted tabular-nums">
                {phase === "upload" && pct < 100 ? `Uploading… ${pct}%` : "Saving to the CDN…"}
              </p>
            </div>
          )}
          {err && <p role="alert" className="mt-2 text-xs text-red-300">{err}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-end">
        <input ref={inputRef} type="file" accept={file.accept} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pick} />
        <Button variant="primary" size="sm" icon={UploadCloud} loading={busy} disabled={!canUpload}
          onClick={() => inputRef.current?.click()}>
          {onCdn ? "Upload a new copy" : "Upload"}
        </Button>
        {isVideo && (
          <Button size="sm" icon={Scissors} disabled={busy || !canUpload} onClick={() => { setErr(""); setEditing(current); }}>Trim or speed up</Button>
        )}
        {onCdn && value && (
          <button type="button" onClick={switchToBuiltIn} disabled={busy || !canUpload}
            className={`inline-flex items-center gap-1 rounded-md text-xs font-semibold text-ttfc-muted hover:text-ttfc-text disabled:opacity-50 ${focusRing}`}>
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Use the built-in copy
          </button>
        )}
      </div>
      {editing && <VideoEditor source={editing} name="home-hero" upload={uploadVideo} onDone={videoDone} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default function LargeSiteFiles() {
  const { isManagement } = useAdmin();
  const { configured } = useCmsStatus();
  const { data, error, setData } = useApi("/console/app-content");
  const valueOf = (key) => String((data || []).find((r) => r.key === key)?.value ?? "");
  const known = (data || []).some((r) => r.key === SITE_FILES.heroVideo.key);
  const canUpload = isManagement && configured !== false && known;
  const onSaved = (key, v) => setData((xs) => (xs || []).map((x) => (x.key === key ? { ...x, value: v } : x)));

  return (
    <section aria-labelledby="large-files-h" className="mb-10">
      <h2 id="large-files-h" className="mb-1 text-base font-semibold">Large site files</h2>
      <p className="mb-4 max-w-2xl text-sm text-ttfc-muted">
        Upload these once and they're served from Sanity's CDN instead of being copied into every website update. The brochure goes up exactly as it is (PDF, up to 40 MB). The video first opens an editor: pick the part to loop and its speed, and it's made into a small silent loop.
      </p>
      {!isManagement && (
        <Banner tone="info" icon={Lock} className="mb-4 max-w-2xl">Only management can upload these files.</Banner>
      )}
      {configured === false && (
        <Banner tone="warn" icon={Lock} className="mb-4 max-w-2xl">Uploads are off until SANITY_WRITE_TOKEN is added on Render.</Banner>
      )}
      {data && !known && (
        <Banner tone="warn" className="mb-4 max-w-2xl">These settings need the latest backend update.</Banner>
      )}
      {error && !data && <p className="mb-4 text-sm text-red-300" role="alert">{error.message}</p>}
      {!data && !error ? <LoadingState className="max-w-2xl py-8" /> : (
        <Card className="max-w-2xl divide-y divide-ttfc-line p-0 sm:p-0">
          {FILES.map((f) => (
            <FileRow key={f.id} file={f} value={valueOf(SITE_FILES[f.id].key)} canUpload={canUpload} onSaved={onSaved} />
          ))}
        </Card>
      )}
    </section>
  );
}
