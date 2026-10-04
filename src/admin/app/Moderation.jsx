import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCheck, Eye, EyeOff, Pencil, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, Select, Tabs, TableWrap, Textarea } from "../ui";
import { when } from "../format";
import { StatusBadge } from "./parts";

const TYPES = [
  { key: "reports", label: "Reports" }, { key: "post", label: "Posts" }, { key: "comment", label: "Comments" },
  { key: "discussion", label: "Discussions" }, { key: "reply", label: "Replies" }, { key: "group", label: "Groups" },
  { key: "groupMessage", label: "Group messages" }, { key: "question", label: "Q&A" },
];
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
            <td className="text-ttfc-muted">{r.reporterName}</td>
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
  const { data, error, loading, reload, setData } = useApi(`/console/content/${type}${status ? `?status=${status}` : ""}`);
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
  if (!data?.length) return <EmptyState title="Nothing here" body="Try another status filter." />;
  return (
    <TableWrap>
      <thead><tr><th>By</th><th>Text</th><th>Status</th><th>When</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>
        {data.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap font-semibold">{r.authorName || r.ownerName || "—"}</td>
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
            <td><StatusBadge status={r.status} /></td>
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

export default function Moderation() {
  const toast = useToast();
  const [tab, setTab] = useState("reports");
  const [reportStatus, setReportStatus] = useState("open");
  const [contentStatus, setContentStatus] = useState("");
  const [confirm, setConfirm] = useState(null);

  return (
    <>
      <PageHeader eyebrow="App" title="Moderation" description="Approve, hide, edit or delete anything people post. Hiding is reversible; deleting is not." />
      <Tabs tabs={TYPES} value={tab} onChange={setTab} label="What to moderate" />
      <div className="mb-5 max-w-xs">
        {tab === "reports" ? (
          <Select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} aria-label="Report status">
            <option value="open">Open</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option>
          </Select>
        ) : (
          <Select value={contentStatus} onChange={(e) => setContentStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option><option value="pending">Waiting for approval</option><option value="held">Held by the filter</option>
            <option value="hidden">Hidden</option><option value="approved">Live</option>
          </Select>
        )}
      </div>
      <div role="tabpanel">
        {tab === "reports"
          ? <Reports status={reportStatus} onDelete={setConfirm} />
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
