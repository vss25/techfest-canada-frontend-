import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, CheckCheck, Eye, EyeOff, Pencil, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, Select, Tabs, TableWrap, Textarea } from "../ui";
import { when } from "../format";
import { StatusBadge } from "./parts";
import { personPath } from "../people/peopleMeta";
import { HiddenBadge, UnhideDialog } from "../people/HideFromApp";
import { HIDDEN_CONTENT_HINT, whileHiddenText } from "../people/peopleMeta";

/* =========================================================
   Event day › App moderation: reports, everything people post
   (approve, hide, edit, delete), and Hidden people (Oct 21 2026):
   everyone staff hid from the app (shadow mode, backend
   services/appHide.js), with "Show in app again". Anything a
   hidden person wrote is marked Hidden from app; the status
   filter's "By people hidden from the app" lists only that.
   ?tab=<key> opens a tab; ?only=hidden picks that filter.
========================================================= */

const TYPES = [
  { key: "reports", label: "Reports" }, { key: "hidden", label: "Hidden people" }, { key: "post", label: "Posts" }, { key: "comment", label: "Comments" },
  { key: "discussion", label: "Discussions" }, { key: "reply", label: "Replies" }, { key: "group", label: "Groups" },
  { key: "groupMessage", label: "Group messages" }, { key: "question", label: "Q&A" },
];
const HIDDEN_PEOPLE = "hidden-people";   // the status filter's value for "By people hidden from the app"
const textOf = (r) => r.title || r.name || r.body || "";

function Reports({ status, onDelete }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(`/console/reports?status=${status}`);
  const resolve = async (id, s) => {
    try { await api.patch(`/console/reports/${id}`, { status: s }); toast.success(s === "dismissed" ? "Report dismissed" : "Report resolved"); reload(); }
    catch (err) { toast.error(err); }
  };
  const hide = async (r) => {
    try { await api.patch(`/console/content/${r.targetType}/${r.targetId}`, { status: "hidden" }); toast.success("Hidden from the app"); reload(); }
    catch (err) { toast.error(err); }
  };
  if (loading) return <LoadingState />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (!data?.length) return <EmptyState icon={ShieldCheck} title={status === "open" ? "No open reports" : "Nothing here"} body={status === "open" ? "All clear — nobody has reported anything that needs attention." : undefined} />;
  return (
    <TableWrap>
      <thead><tr><th>Reported</th><th>Content</th><th>Reason</th><th>By</th><th>When</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>
        {data.map((r) => (
          <tr key={r.id}>
            <td><Badge tone="warn">{r.targetType}</Badge></td>
            <td className="max-w-sm"><p className="line-clamp-3">{r.preview}</p></td>
            <td className="max-w-[200px] text-ttfc-muted">{r.reason}</td>
            <td className="text-ttfc-muted">
              {r.reporterName}
              {r.reporterHidden && <HiddenBadge className="mt-1 block" hint="Sent by someone hidden from the app, so nobody was alerted." />}
            </td>
            <td className="whitespace-nowrap text-ttfc-muted">{when(r.createdAt)}</td>
            <td>
              <div className="flex flex-wrap justify-end gap-1.5">
                {r.targetType !== "user" && r.targetType !== "message" && (
                  <>
                    <Button size="sm" icon={EyeOff} onClick={() => hide(r)}>Hide it</Button>
                    <Button size="sm" variant="dangerOutline" icon={Trash2} onClick={() => onDelete({ type: r.targetType, id: r.targetId, after: reload })}>Delete</Button>
                  </>
                )}
                {r.targetType === "user" && <Button size="sm" icon={UserRound} onClick={() => navigate(`/admin/app/people/${r.targetId}`)}>Open person</Button>}
                {status === "open" && (
                  <>
                    <Button size="sm" icon={CheckCheck} onClick={() => resolve(r.id, "resolved")}>Resolve</Button>
                    <Button size="sm" variant="ghost" icon={X} onClick={() => resolve(r.id, "dismissed")}>Dismiss</Button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function ContentList({ type, status, onDelete }) {
  const toast = useToast();
  const query = status === HIDDEN_PEOPLE ? "?hidden=1" : status ? `?status=${status}` : "";
  const { data, error, loading, reload, setData } = useApi(`/console/content/${type}${query}`);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const setStatus = async (r, s) => {
    try {
      await api.patch(`/console/content/${type}/${r.id}`, { status: s });
      setData((xs) => (xs || []).map((x) => (x.id === r.id ? { ...x, status: s } : x)));
      toast.success(s === "hidden" ? "Hidden from the app" : "Approved — visible in the app");
    } catch (err) { toast.error(err); }
  };
  const saveText = async (r) => {
    const text = draft.trim();
    if (!text) { toast.error("Text can't be empty"); return; }
    setSaving(true);
    try {
      await api.patch(`/console/content/${type}/${r.id}/text`, { text });
      const field = r.title !== undefined ? "title" : r.name !== undefined ? "name" : "body";
      setData((xs) => (xs || []).map((x) => (x.id === r.id ? { ...x, [field]: text } : x)));
      setEditing(null);
      toast.success("Text updated in the app");
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };

  if (loading) return <LoadingState />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (!data?.length) {
    return status === HIDDEN_PEOPLE
      ? <EmptyState icon={ShieldCheck} title="Nothing from hidden people" body="Nobody hidden from the app has written anything of this kind." />
      : <EmptyState title="Nothing here" body="Try another status filter." />;
  }
  return (
    <TableWrap>
      <thead><tr><th>By</th><th>Text</th><th>Status</th><th>When</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>
        {data.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap font-semibold">
              {r.authorName || r.ownerName || "—"}
              {r.authorHidden && <HiddenBadge className="mt-1 block font-normal" hint={HIDDEN_CONTENT_HINT} />}
            </td>
            <td className="min-w-[240px] max-w-lg">
              {editing === r.id ? (
                <div className="space-y-2">
                  <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edit text" autoFocus />
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="primary" icon={Check} loading={saving} onClick={() => saveText(r)}>Save text</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
                  </div>
                </div>
              ) : <p className="line-clamp-4 whitespace-pre-wrap">{textOf(r)}</p>}
            </td>
            <td>
              <StatusBadge status={r.status} />
              {r.authorHidden && r.status === "approved" && <span className="mt-1 block text-[11px] text-ttfc-dim">Only they see it</span>}
            </td>
            <td className="whitespace-nowrap text-ttfc-muted">{when(r.createdAt)}</td>
            <td>
              <div className="flex flex-wrap justify-end gap-1.5">
                {editing !== r.id && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => { setEditing(r.id); setDraft(textOf(r)); }}>Edit</Button>}
                {r.status !== "approved" && <Button size="sm" icon={Eye} onClick={() => setStatus(r, "approved")}>Approve</Button>}
                {r.status !== "hidden" && <Button size="sm" icon={EyeOff} onClick={() => setStatus(r, "hidden")}>Hide</Button>}
                <Button size="sm" variant="dangerOutline" icon={Trash2} onClick={() => onDelete({ type, id: r.id, after: () => setData((xs) => (xs || []).filter((x) => x.id !== r.id)) })}>Delete</Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

/* Everyone staff hid from the app: since when, by whom, their private note, what they wrote while hidden. */
function HiddenPeople() {
  const { data, error, loading, reload } = useApi("/console/people/app-hidden");
  const [showing, setShowing] = useState(null); // a row
  if (loading) return <LoadingState />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  const rows = data?.rows || [];
  return (
    <>
      <Banner tone="info" icon={EyeOff} className="mb-4" title="Hidden from the app">
        These people use the app as normal and haven't been told. Nobody else sees them or anything they do: messages, posts,
        comments, likes, requests and votes. To hide someone, open their People profile and use Hide from app.
      </Banner>
      {!rows.length ? (
        <EmptyState icon={ShieldCheck} title="Nobody is hidden" body="Hide someone from their People profile if they're causing trouble." />
      ) : (
        <TableWrap>
          <thead><tr><th>Person</th><th>Hidden since</th><th>Private note</th><th>While hidden</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="max-w-[220px]">
                  <Link to={personPath(r.id)} className="block truncate font-semibold hover:text-ttfc-pink hover:underline">{r.name}</Link>
                  {r.email && <span className="block truncate font-mono text-xs text-ttfc-muted">{r.email}</span>}
                  {!r.onApp && <span className="mt-1 block text-xs text-ttfc-dim">Not on the app yet</span>}
                </td>
                <td className="whitespace-nowrap text-ttfc-muted">{when(r.appHidden.at)}{r.appHidden.byName && <span className="block text-xs text-ttfc-dim">by {r.appHidden.byName}</span>}</td>
                <td className="max-w-[260px]"><p className="line-clamp-3 whitespace-pre-wrap text-sm">{r.appHidden.reason || <span className="text-ttfc-dim">None</span>}</p></td>
                <td className="max-w-[260px] text-sm text-ttfc-muted">
                  {!r.whileHidden ? "—" : r.whileHidden.total ? whileHiddenText(r.whileHidden, data.labels) : "Nothing yet"}
                </td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <Link to={personPath(r.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ttfc-line bg-ttfc-panel2 px-3 text-xs font-semibold hover:border-ttfc-purple/60">
                      <UserRound className="h-4 w-4" aria-hidden="true" /> Profile
                    </Link>
                    {r.canChange && <Button size="sm" variant="primary" icon={Eye} onClick={() => setShowing(r)}>Show in app again…</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <UnhideDialog open={!!showing} onClose={() => setShowing(null)} personId={showing?.id} name={showing?.name}
        whileHidden={showing?.whileHidden} labels={data?.labels} onDone={reload} />
    </>
  );
}

export default function Moderation() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab");
  const [tab, setTabState] = useState(TYPES.some((t) => t.key === asked) ? asked : "reports");
  const [reportStatus, setReportStatus] = useState("open");
  const [contentStatus, setContentStatus] = useState(params.get("only") === "hidden" ? HIDDEN_PEOPLE : "");
  const [confirm, setConfirm] = useState(null);
  const setTab = (t) => {
    setTabState(t);
    const p = new URLSearchParams(params);
    if (t === "reports") p.delete("tab"); else p.set("tab", t);
    p.delete("only");
    setParams(p, { replace: true });
  };

  return (
    <>
      <PageHeader eyebrow="Event day" title="App moderation" description="Approve, hide, edit or delete anything people post. Hiding is reversible; deleting is not. Hidden people lists everyone staff hid from the app." />
      <Tabs tabs={TYPES} value={tab} onChange={setTab} label="What to moderate" />
      <div className={`mb-5 max-w-xs ${tab === "hidden" ? "hidden" : ""}`}>
        {tab === "reports" ? (
          <Select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} aria-label="Report status">
            <option value="open">Open</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option>
          </Select>
        ) : (
          <Select value={contentStatus} onChange={(e) => setContentStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option><option value="pending">Waiting for approval</option><option value="held">Held by the filter</option>
            <option value="hidden">Hidden</option><option value="approved">Live</option>
            <option value={HIDDEN_PEOPLE}>By people hidden from the app</option>
          </Select>
        )}
      </div>
      <div role="tabpanel">
        {tab === "reports"
          ? <Reports status={reportStatus} onDelete={setConfirm} />
          : tab === "hidden"
            ? <HiddenPeople />
            : <ContentList key={tab} type={tab} status={contentStatus} onDelete={setConfirm} />}
      </div>
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={`Delete this ${confirm?.type || "item"}?`}
        body="It's removed from the app for everyone. This can't be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          await api.del(`/console/content/${confirm.type}/${confirm.id}`);
          toast.success("Deleted");
          confirm.after?.();
        }}
      />
    </>
  );
}
