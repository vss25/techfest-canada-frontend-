import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, BellRing, Eye, EyeOff, Lock, MessageSquare, RotateCcw, Trash2, UserCheck } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Bars, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, LoadingState, Modal, Tabs,
  TableWrap, Textarea,
} from "../ui";
import { when, initials } from "../format";
import { EventRow, StatusBadge } from "./parts";
import ProfileEditor from "./ProfileEditor";

function MessagesPane({ id }) {
  const [revealed, setRevealed] = useState(false);
  const [thread, setThread] = useState(null);
  const threads = useApi(revealed ? `/console/users/${id}/threads` : null);
  const conv = useApi(thread ? `/console/threads/${encodeURIComponent(thread.threadKey)}` : null);

  return (
    <div className="space-y-4">
      <Banner tone="warn" icon={Lock} title="Private messages">
        Opening the conversation list, and each conversation, is recorded in the audit log with your name. Only look when there's a safety reason.
      </Banner>
      {!revealed ? (
        <Button icon={Eye} onClick={() => setRevealed(true)}>I understand — show conversations</Button>
      ) : threads.loading ? <LoadingState /> : threads.error ? <ErrorState error={threads.error} onRetry={threads.reload} /> : !threads.data?.length ? (
        <EmptyState icon={MessageSquare} title="No direct messages" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <TableWrap>
            <thead><tr><th>With</th><th>Last message</th><th>#</th><th>When</th></tr></thead>
            <tbody>
              {threads.data.map((t) => (
                <tr key={t.threadKey} className={`is-clickable ${thread?.threadKey === t.threadKey ? "bg-white/5" : ""}`} tabIndex={0}
                  onClick={() => setThread(t)} onKeyDown={(e) => e.key === "Enter" && setThread(t)}>
                  <td className="font-semibold">{t.otherName}</td>
                  <td className="max-w-[220px] truncate text-ttfc-muted">{t.last}</td>
                  <td className="tabular-nums">{t.count}</td>
                  <td className="whitespace-nowrap text-ttfc-muted">{when(t.at)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Card className="max-h-[560px] overflow-y-auto">
            {!thread ? <p className="py-10 text-center text-sm text-ttfc-dim">Pick a conversation to read it.</p>
              : conv.loading ? <LoadingState /> : conv.error ? <ErrorState error={conv.error} onRetry={conv.reload} /> : (
                <ul className="space-y-3">
                  {(conv.data || []).map((m) => {
                    const mine = m.fromId === id;
                    return (
                      <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${mine ? "rounded-br-md bg-gradient-to-br from-ttfc-pink/30 to-ttfc-purple/30" : "rounded-bl-md bg-ttfc-panel2"}`}>
                          <p className="mb-1 text-[11px] text-ttfc-muted">{m.from} · {when(m.at)}{m.status !== "approved" && ` · ${m.status}`}</p>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
          </Card>
        </div>
      )}
    </div>
  );
}

function ContentPane({ d, onChanged }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const rows = [
    ...(d.posts || []).map((x) => ({ type: "post", x, text: x.body })),
    ...(d.comments || []).map((x) => ({ type: "comment", x, text: x.body })),
    ...(d.discussions || []).map((x) => ({ type: "discussion", x, text: x.title })),
  ];
  const setStatus = async (type, xid, status) => {
    try {
      await api.patch(`/console/content/${type}/${xid}`, { status });
      toast.success(status === "hidden" ? "Hidden from the app" : "Visible in the app");
      onChanged();
    } catch (err) { toast.error(err); }
  };
  if (!rows.length) return <EmptyState title="Nothing posted" />;
  return (
    <>
      <TableWrap>
        <thead><tr><th>Type</th><th>Text</th><th>Status</th><th>When</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {rows.map(({ type, x, text }) => (
            <tr key={type + x._id}>
              <td><Badge>{type}</Badge></td>
              <td className="max-w-md"><p className="line-clamp-3">{text}</p></td>
              <td><StatusBadge status={x.status} /></td>
              <td className="whitespace-nowrap text-ttfc-muted">{when(x.createdAt)}</td>
              <td>
                <div className="flex justify-end gap-1.5">
                  {x.status !== "hidden"
                    ? <Button size="sm" icon={EyeOff} onClick={() => setStatus(type, x._id, "hidden")}>Hide</Button>
                    : <Button size="sm" icon={Eye} onClick={() => setStatus(type, x._id, "approved")}>Show</Button>}
                  <Button size="sm" variant="dangerOutline" icon={Trash2} onClick={() => setConfirm({ type, id: x._id })}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={`Delete this ${confirm?.type}?`}
        body="It's removed from the app for everyone. This can't be undone — hiding is reversible."
        confirmLabel="Delete"
        onConfirm={async () => { await api.del(`/console/content/${confirm.type}/${confirm.id}`); toast.success("Deleted"); onChanged(); }}
      />
    </>
  );
}

function Chips({ items, tone }) {
  return items?.length ? <div className="flex flex-wrap gap-1.5">{items.map((t) => <Badge key={t} tone={tone}>{t}</Badge>)}</div> : <p className="text-sm text-ttfc-dim">None</p>;
}

export default function Person() {
  const { id } = useParams();
  return <PersonView key={id} id={id} />;
}

function PersonView({ id }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: d, error, loading, reload } = useApi(`/console/users/${id}`);
  const [tab, setTab] = useState("profile");
  const [del, setDel] = useState(false);
  const [suspend, setSuspend] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingState label="Loading person…" />;
  if (error && !d) return <ErrorState error={error} onRetry={reload} />;
  const u = d.user;
  const onApp = !!(u.appOnboarded || u.lastActiveAt); // same rule as the app's "on the app"
  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "activity", label: "Activity", count: d.activity?.total ?? 0 },
    { key: "interests", label: "Interests" },
    { key: "messages", label: "Messages", count: d.messageCount ?? 0 },
    { key: "content", label: "Posts & comments", count: (d.posts?.length || 0) + (d.comments?.length || 0) + (d.discussions?.length || 0) },
    { key: "network", label: "Connections", count: d.connections?.length ?? 0 },
    { key: "tickets", label: "Tickets", count: (u.tickets || []).length },
  ];

  const toggleSuspend = async () => {
    setBusy(true);
    try {
      await api.patch(`/console/users/${id}`, u.banned ? { banned: false } : { banned: true, bannedReason: reason });
      toast.success(u.banned ? `${u.name} can use the app again` : `${u.name} is suspended`);
      setSuspend(false); setReason(""); reload();
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };

  return (
    <>
      <Link to="/admin/app/people" className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-ttfc-muted hover:text-ttfc-text">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> People
      </Link>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ttfc-pink via-ttfc-purple to-ttfc-orange text-lg font-bold text-white" aria-hidden="true">
          {initials(u.name, u.email)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{u.name}</h1>
            {u.role === "admin" && <Badge tone="pink">Staff</Badge>}
            {u.banned && <Badge tone="bad">Suspended</Badge>}
          </div>
          <p className="mt-1 text-sm text-ttfc-muted">
            {u.email} · {[u.jobTitle, u.organization].filter(Boolean).join(" · ") || "No title yet"} · joined {when(u.createdAt)} · last active {when(u.lastActiveAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            icon={BellRing}
            disabled={!onApp || u.banned}
            title={u.banned ? "Suspended people can't get notifications." : onApp ? `Write a notification to ${u.name}` : "They haven't signed into the app yet, so they can't get app notifications."}
            onClick={() => navigate(`/admin/app/broadcast?to=${encodeURIComponent(id)}`)}
          >
            Send notification
          </Button>
          <Button variant={u.banned ? "success" : "dangerOutline"} icon={u.banned ? UserCheck : Ban} onClick={() => setSuspend(true)}>
            {u.banned ? "Reinstate" : "Suspend"}
          </Button>
        </div>
      </header>
      {!onApp && !u.banned && (
        <p className="-mt-3 mb-5 text-xs text-ttfc-dim">Not on the app yet, so app notifications aren't available for {u.name}.</p>
      )}

      <Tabs tabs={tabs} value={tab} onChange={setTab} label="Person details" />

      <div role="tabpanel">
        {tab === "profile" && <ProfileEditor key={JSON.stringify(u)} id={id} user={u} onSaved={reload} onDelete={() => setDel(true)} />}
        {tab === "activity" && (d.events?.length ? (
          <Card className="p-0 sm:p-0"><ul>{d.events.map((e, i) => <EventRow key={e._id || i} e={e} />)}</ul></Card>
        ) : <EmptyState title="No activity recorded yet" />)}
        {tab === "interests" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-4">
              <div><h3 className="mb-2 text-sm font-semibold">Chosen topics</h3><Chips items={u.topics} tone="pink" /></div>
              <div><h3 className="mb-2 text-sm font-semibold">Sessions saved</h3><Chips items={d.sessions} /></div>
              <div><h3 className="mb-2 text-sm font-semibold">Groups</h3><Chips items={d.groups} /></div>
            </Card>
            <Card><h3 className="mb-4 text-sm font-semibold">What they look at</h3><Bars rows={d.activity?.interests || []} /></Card>
            <Card><h3 className="mb-4 text-sm font-semibold">Screens</h3><Bars rows={d.activity?.screens || []} /></Card>
            <Card><h3 className="mb-4 text-sm font-semibold">Buttons</h3><Bars rows={d.activity?.taps || []} /></Card>
            <Card><h3 className="mb-4 text-sm font-semibold">Searches</h3><Bars rows={d.activity?.searches || []} /></Card>
          </div>
        )}
        {tab === "messages" && <MessagesPane key={id} id={id} />}
        {tab === "content" && <ContentPane d={d} onChanged={reload} />}
        {tab === "network" && (d.connections?.length ? (
          <TableWrap>
            <thead><tr><th>With</th><th>Status</th><th>How</th><th>Since</th></tr></thead>
            <tbody>
              {d.connections.map((c) => (
                <tr key={c.id} className="is-clickable" tabIndex={0} onClick={() => navigate(`/admin/app/people/${c.withId}`)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/admin/app/people/${c.withId}`)}>
                  <td className="font-semibold">{c.with}</td>
                  <td><Badge>{c.status}</Badge></td>
                  <td className="text-ttfc-muted">{c.kind === "inPerson" ? "Met in person" : "In the app"}</td>
                  <td className="whitespace-nowrap text-ttfc-muted">{when(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : <EmptyState title="No connections yet" />)}
        {tab === "tickets" && ((u.tickets || []).length ? (
          <TableWrap>
            <thead><tr><th>Ticket ID</th><th>Pass</th><th>Bought</th><th>Checked in</th></tr></thead>
            <tbody>
              {u.tickets.map((t) => (
                <tr key={t.ticketId}>
                  <td className="font-mono text-xs">{t.ticketId}</td>
                  <td>{t.type}</td>
                  <td className="text-ttfc-muted">{when(t.purchaseDate)}</td>
                  <td>{t.checkedIn ? <Badge tone="good">{when(t.checkedInAt)}</Badge> : <Badge>Not yet</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : <EmptyState title="No tickets on this account" />)}
      </div>

      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        title={`Delete ${u.name}'s account?`}
        body="Their profile, posts and messages are removed for good. Paid tickets stay valid. This can't be undone."
        confirmLabel="Delete account"
        onConfirm={async () => {
          const r = await api.del(`/console/users/${id}`);
          if (r && r.deleted === false) throw new Error("The account couldn't be deleted.");
          toast.success("Account deleted. Paid tickets stay valid.");
          navigate("/admin/app/people");
        }}
      />

      <Modal
        open={suspend}
        onClose={() => !busy && setSuspend(false)}
        size="sm"
        tone={u.banned ? undefined : "danger"}
        title={u.banned ? `Reinstate ${u.name}?` : `Suspend ${u.name}?`}
        description={u.banned ? "They'll be able to sign in and post again." : "They won't be able to use the app's community features until reinstated."}
        footer={<>
          <Button onClick={() => setSuspend(false)} disabled={busy}>Cancel</Button>
          <Button variant={u.banned ? "success" : "danger"} icon={u.banned ? RotateCcw : Ban} loading={busy} onClick={toggleSuspend}>
            {u.banned ? "Reinstate" : "Suspend account"}
          </Button>
        </>}
      >
        {!u.banned && (
          <Field label="Reason (shown to staff)">{(fid) => <Textarea id={fid} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} data-autofocus />}</Field>
        )}
      </Modal>
    </>
  );
}
