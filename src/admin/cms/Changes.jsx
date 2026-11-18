import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, GitPullRequestArrow, PauseCircle, RefreshCw, Send, Trash2, Upload } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader } from "../ui";
import { stagingUrl } from "./workflowState";
import { useAdmin } from "../adminContext";

/* =========================================================
   Admin › Website & app › Changes (Nov 2026): every website
   content change on its way to the website, in one place.
   Saved, not sent  → "Send to staging" (any staff)
   On staging       → checked on the staging site, then
                      "Publish to live" (any staff)
   Backend: GET /api/cms/changes, POST /changes/stage,
   POST /changes/publish, DELETE /:type/:id/draft?which=.
========================================================= */

const EDITOR = {
  event: (id) => `/admin/content/events?edit=${id}`,
  speaker: (id) => `/admin/content/speakers?edit=${id}`,
  session: (id) => `/admin/content/agenda?edit=${id}`,
  partner: (id) => `/admin/content/partners?edit=${id}`,
  sponsor: (id) => `/admin/content/alumni-logos?edit=${id}`,
  sponsorMarquee: (id) => `/admin/content/sponsor-marquee?edit=${id}`,
  homeSponsor: (id) => `/admin/content/home-sponsors?edit=${id}`,
  siteSettings: () => "/admin/content/settings",
  aboutContent: () => "/admin/content/settings",
};

const when = (iso) => (iso ? new Date(iso).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
// "citySkyline" → "city skyline": field names as words.
const word = (k) => k.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
const fieldList = (f) => { const w = f.map(word); return w.length > 6 ? `${w.slice(0, 6).join(", ")} +${w.length - 6} more` : w.join(", "); };

function Row({ item, checked, onCheck, onDiscard, busy }) {
  return (
    <li className="flex flex-col gap-3 border-t border-ttfc-line px-4 py-3 first:border-t-0 sm:flex-row sm:items-start">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[rgb(var(--ttfc-pink))]"
        checked={checked}
        onChange={(e) => onCheck(e.target.checked)}
        aria-label={`Select ${item.title}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ttfc-muted">{item.typeLabel}</span>
          <span className="truncate font-semibold">{item.title}</span>
          {item.isNew && <Badge tone="pink">New</Badge>}
          {item.unsent && <Badge tone="warn">Saved, not sent</Badge>}
          {item.staged && <Badge tone="purple">On staging</Badge>}
        </div>
        <div className="mt-1 grid gap-0.5 text-xs text-ttfc-muted">
          {item.unsent && (
            <span>Saved{item.wipBy ? ` by ${item.wipBy}` : ""} {when(item.wipAt)}{item.fields.length ? ` · ${fieldList(item.fields)}` : ""}</span>
          )}
          {item.staged && (
            <span>Sent to staging{item.stagedBy ? ` by ${item.stagedBy}` : ""} {when(item.stagedAt)}{item.stagedFields.length && !item.isNew ? ` · ${fieldList(item.stagedFields)}` : ""}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {EDITOR[item.type] && <Link to={EDITOR[item.type](item.id)} className="rounded-lg border border-ttfc-line px-3 py-1.5 text-xs font-semibold hover:border-ttfc-muted">Edit</Link>}
        <Button size="sm" variant="ghost" icon={Trash2} onClick={onDiscard} disabled={busy}>Throw away</Button>
      </div>
    </li>
  );
}

export default function Changes() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi("/cms/changes");
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState(null);
  const items = useMemo(() => data?.items || [], [data]);
  // Any staff member publishes what's on staging (Nov 17 2026); the server says so in canPublish.
  const canPublish = data?.canPublish !== false;
  // Publishing paused until the new website launches (Nov 17 2026): the live site keeps its content.
  const paused = data?.publishingPaused === true;
  const { isManagement } = useAdmin();
  const setPaused = (next) => setConfirm({
    title: next ? "Pause publishing to the live website?" : "Turn publishing on?",
    body: next
      ? "Nobody can publish to the live website until a manager turns it on again. Saving and sending to staging keep working."
      : "Staff can publish what's on staging to the live website again. Do this when the new website goes live.",
    label: next ? "Pause publishing" : "Turn publishing on",
    tone: next ? "danger" : "primary",
    go: async () => {
      await api.put("/cms/publishing", { paused: next });
      toast.success(next ? "Publishing is paused." : "Publishing is on.");
      reload();
    },
  });
  const unsent = items.filter((i) => i.unsent);
  const staged = items.filter((i) => i.staged);
  // Sanity drafts nobody sent from here (left in Sanity Studio or by an old script): never published from this page.
  const older = data?.older || [];
  const chosen = (list) => {
    const sel = list.filter((i) => picked.has(i.id));
    return sel.length ? sel : list;
  };
  const toStage = chosen(unsent);
  const toPublish = chosen(staged);
  const toggle = (id, on) => setPicked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });

  const run = async (name, fn) => {
    setBusy(name);
    try { await fn(); setPicked(new Set()); reload(); } catch (err) { toast.error(err); } finally { setBusy(""); }
  };
  const sendToStaging = () => run("stage", async () => {
    const out = await api.post("/cms/changes/stage", { ids: toStage.map((i) => i.id) });
    toast.success(`${out.staged.length} ${out.staged.length === 1 ? "change is" : "changes are"} on staging. Open the staging site to check.`);
  });
  const publish = async () => {
    const out = await api.post("/cms/changes/publish", { ids: toPublish.map((i) => i.id) });
    toast.success(`Published ${out.published.length}. It's live on the website within about a minute.`);
    setPicked(new Set());
    reload();
  };
  const discard = (item, which) => setConfirm({
    title: `Throw away changes to ${item.title}?`,
    body: which === "unsent"
      ? (item.staged ? "The changes saved since it was sent to staging are thrown away. The staging version stays."
        : item.isNew ? "It's deleted, since it was never sent anywhere." : "The saved changes are thrown away. The website keeps its current version.")
      : (item.isNew && !item.unsent ? "It comes off staging and is deleted, since it was never on the website."
        : "It comes off staging. The website keeps its current version."),
    label: "Throw away",
    tone: "danger",
    go: async () => {
      await api.del(`/cms/${item.type}/${item.id}/draft?which=${which}`);
      toast.success("Thrown away.");
      reload();
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Website & app"
        title="Website changes"
        description="Website content on its way to the website. Saving in an editor keeps the change here. Send it to staging, check it on the staging site, then publish it to the live website."
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={reload} disabled={loading}>Refresh</Button>
            <a href={stagingUrl("/")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-ttfc-line px-3 py-2 text-sm font-semibold hover:border-ttfc-muted">
              Open staging site <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </>
        )}
      />
      {paused && (
        <Banner tone="warn" icon={PauseCircle} className="mb-4 max-w-3xl" title="Publishing to the live website is paused"
          action={isManagement && <Button variant="secondary" onClick={() => setPaused(false)}>Turn publishing on</Button>}>
          The live website keeps its current content until the new website launches. Keep saving and sending changes to staging: everything on staging is published together at launch.
        </Banner>
      )}
      <Banner tone="info" icon={GitPullRequestArrow} className="mb-4 max-w-3xl">
        The staging site shows staged content to staff who are signed in there: sign in once on the staging site with your staff email and password, then use Open staging site.
      </Banner>
      {loading && !data ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="grid gap-6">
          <Card className="grid gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="mr-auto">
                <h2 className="font-semibold">Saved, not sent</h2>
                <p className="text-xs text-ttfc-muted">{unsent.length ? `${unsent.length} waiting. Nothing here is on any website yet.` : "Nothing waiting."}</p>
              </div>
              <Button variant="primary" icon={Send} onClick={sendToStaging} disabled={!toStage.length || !!busy}>
                {busy === "stage" ? "Sending…" : toStage.length === unsent.length ? "Send all to staging" : `Send ${toStage.length} to staging`}
              </Button>
            </div>
            {unsent.length > 0 && (
              <ul className="rounded-xl border border-ttfc-line">
                {unsent.map((i) => <Row key={i.id} item={i} checked={picked.has(i.id)} onCheck={(on) => toggle(i.id, on)} onDiscard={() => discard(i, "unsent")} busy={!!busy} />)}
              </ul>
            )}
          </Card>

          <Card className="grid gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="mr-auto">
                <h2 className="font-semibold">On staging</h2>
                <p className="text-xs text-ttfc-muted">{staged.length ? `${staged.length} on the staging site, not on the live website yet.` : "Nothing on staging."}</p>
              </div>
              {paused ? (
                staged.length > 0 && <span className="text-xs text-ttfc-muted">Published together when the new website launches</span>
              ) : canPublish ? (
                <Button
                  variant="primary"
                  icon={Upload}
                  disabled={!toPublish.length || !!busy}
                  onClick={() => setConfirm({
                    title: toPublish.length === staged.length ? "Publish everything on staging?" : `Publish ${toPublish.length} to the live website?`,
                    body: `${toPublish.map((i) => i.title).slice(0, 8).join(", ")}${toPublish.length > 8 ? ` and ${toPublish.length - 8} more` : ""} will be live on thetechfestival.com and in the apps within about a minute.`,
                    label: "Publish to live",
                    tone: "primary",
                    go: publish,
                  })}
                >
                  {toPublish.length === staged.length ? "Publish all to live" : `Publish ${toPublish.length} to live`}
                </Button>
              ) : staged.length > 0 && <span className="text-xs text-ttfc-muted">A manager publishes these</span>}
            </div>
            {staged.length > 0 && (
              <ul className="rounded-xl border border-ttfc-line">
                {staged.map((i) => <Row key={i.id} item={i} checked={picked.has(i.id)} onCheck={(on) => toggle(i.id, on)} onDiscard={() => discard(i, "staged")} busy={!!busy} />)}
              </ul>
            )}
          </Card>
          {older.length > 0 && (
            <Card className="grid gap-3">
              <div>
                <h2 className="font-semibold">Older drafts, not from this panel</h2>
                <p className="text-xs text-ttfc-muted">
                  {older.length} unpublished {older.length === 1 ? "draft" : "drafts"} left in Sanity before this page existed. They aren't on the live website and can't be published from here.
                  To put one live, edit it in its editor and send it to staging. They do show on the staging site, so throw away the ones nobody needs.
                </p>
              </div>
              <ul className="rounded-xl border border-ttfc-line">
                {older.map((o) => (
                  <li key={o.id} className="flex flex-col gap-2 border-t border-ttfc-line px-4 py-3 first:border-t-0 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-ttfc-muted">{o.typeLabel}</span>
                        <span className="truncate font-semibold">{o.title}</span>
                        <Badge tone={o.isNew ? "neutral" : "warn"}>{o.isNew ? "Never on the website" : "Edits to a live item"}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-ttfc-muted">Last changed {when(o.updatedAt)}{o.fields.length && !o.isNew ? ` · ${fieldList(o.fields)}` : ""}</div>
                    </div>
                    <Button size="sm" variant="ghost" icon={Trash2} disabled={!!busy} onClick={() => setConfirm({
                      title: `Throw away the older draft of ${o.title}?`,
                      body: o.isNew ? "It was never on the website, so it's deleted for good." : "The live version stays exactly as it is; only these unpublished edits go.",
                      label: "Throw away", tone: "danger",
                      go: async () => { await api.del(`/cms/${o.type}/${o.id}/draft?which=older`); toast.success("Thrown away."); reload(); },
                    })}>Throw away</Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {!items.length && !older.length && <EmptyState title="No changes on their way" body="Edits saved in Event pages, Agenda, Speakers, Partners and the other website editors show up here." />}
        </div>
      )}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm?.go()}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.label}
        tone={confirm?.tone}
      />
    </>
  );
}
