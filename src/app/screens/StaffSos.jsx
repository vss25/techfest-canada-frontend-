import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUp, CheckCheck, Eye, LifeBuoy, Mail, MapPin, Phone, RotateCcw } from "lucide-react";
import { norm, replySos, setSosStatus, sortForStaff, SOS_MAX, staffSos, staffSosOne } from "../lib/sos";
import { listTime } from "../lib/time";
import { showAlert, usePolling } from "../lib/ui";
import { Button, Chip, Empty, IconButton, Spinner, TopBar } from "../components/ui";

/* =========================================================
   Staff › SOS inbox (/staff/sos, one request at /staff/sos/:id;
   Oct 22 2026). For staff, volunteers with the staff role,
   moderators and management (the server says 403 to anyone else).
   Open requests first with a red count; each one: who, what, where,
   call / email them, the thread, a reply (it pushes to the attendee
   and marks it seen), Acknowledge, Resolve. Refreshed every 15 s
   while open. A new request pushes to staff with a link here.
   The admin panel has the same at Event day › SOS & help.
========================================================= */

const FILTERS = [["active", "Open"], ["resolved", "Resolved"], ["all", "All"]];
const telOf = (r) => r.links?.tel || (r.phone ? `tel:${String(r.phone).replace(/[^+\d]/g, "")}` : "");
const mailOf = (r) => r.links?.mailto || (r.email ? `mailto:${r.email}` : "");

function StatusPill({ r }) {
  return <span className={`sos-pill sos-pill--${r.status}`}>{r.status === "open" ? "New" : r.statusLabel}</span>;
}

function Forbidden() {
  return <Empty icon={LifeBuoy} title="For TTFC staff">The SOS inbox is for staff, volunteers on the staff team and moderators.</Empty>;
}

function List() {
  const [filter, setFilter] = useState("active");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  usePolling(async () => {
    try { setData(await staffSos(filter)); setError(null); } catch (e) { setError(e); }
  }, 15000, [filter]);
  const open = data?.counts.open || 0;
  const list = data ? sortForStaff(data.requests) : [];
  return (
    <div className="page">
      <TopBar title="SOS inbox" right={open ? <span className="sos-count" aria-label={`${open} new`}>{open}</span> : null} />
      <main id="main" className="pad stack" style={{ paddingTop: 12 }}>
        {error?.status === 403 ? <Forbidden /> : (
          <>
            <div className="chips" role="group" aria-label="Show">
              {FILTERS.map(([k, label]) => (
                <Chip key={k} on={filter === k} onClick={() => { setFilter(k); setData(null); }}
                  count={k === "active" && data ? (data.counts.open + data.counts.acknowledged) : k === "resolved" && data ? data.counts.resolved : undefined}>{label}</Chip>
              ))}
            </div>
            {!data ? (error ? <p className="muted center">{error.message}</p> : <Spinner label="Loading requests" />) : list.length === 0 ? (
              <Empty icon={LifeBuoy} title={filter === "resolved" ? "Nothing resolved yet" : "No open requests"}>New ones show here and send you a notification.</Empty>
            ) : list.map((r) => (
              <Link key={r.id} to={`/staff/sos/${encodeURIComponent(r.id)}`} className={"list-row pressable sos-row" + (r.status === "open" ? " sos-row--new" : "")}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="row" style={{ gap: 6 }}><b className="ellipsis">{r.categoryLabel}</b><StatusPill r={r} /></span>
                  <span className="small ellipsis" style={{ display: "block" }}>{r.name || "Someone"}{r.location ? ` · ${r.location}` : ""}</span>
                  <span className="tiny muted clamp-2">{r.message}</span>
                </span>
                <time className="tiny muted" dateTime={r.createdAt}>{listTime(r.createdAt)}</time>
              </Link>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

function Detail({ id }) {
  const [r, setR] = useState(null);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState("");
  usePolling(async () => {
    try { setR(await staffSosOne(id)); setError(null); } catch (e) { setError(e); }
  }, 15000, [id]);

  const act = async (what, fn) => {
    setBusy(what);
    try { setR(norm(await fn())); } catch (e) { showAlert("Couldn't save", e.message); } finally { setBusy(""); }
  };
  const reply = (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    act("reply", () => replySos(id, body)).then(() => setDraft(""));
  };

  if (error?.status === 403) return <div className="page"><TopBar title="SOS" /><main className="pad"><Forbidden /></main></div>;
  return (
    <div className="page">
      <TopBar title={r ? r.categoryLabel : "SOS request"} />
      <main id="main" className="pad stack" style={{ paddingTop: 12 }}>
        {!r ? (error ? <p className="muted center">{error.status === 404 ? "This request isn't there any more." : error.message}</p> : <Spinner label="Loading the request" />) : (
          <>
            <section className="card stack-sm">
              <div className="row" style={{ gap: 8 }}>
                <b style={{ flex: 1, fontSize: 17 }}>{r.name || "Someone"}</b>
                <StatusPill r={r} />
              </div>
              <span className="small muted">{r.categoryLabel} · {listTime(r.createdAt)}</span>
              {r.location && <span className="small row" style={{ gap: 4 }}><MapPin aria-hidden="true" style={{ width: 14, height: 14 }} />{r.location}</span>}
              <div className="row wrap" style={{ gap: 8 }}>
                {telOf(r) && <a href={telOf(r)} className="btn btn-primary pressable"><Phone aria-hidden="true" />Call {r.phone}</a>}
                {mailOf(r) && <a href={mailOf(r)} className="btn pressable"><Mail aria-hidden="true" />Email</a>}
              </div>
              {r.acknowledgedBy?.name && <span className="tiny muted">Seen by {r.acknowledgedBy.name}{r.acknowledgedAt ? ` · ${listTime(r.acknowledgedAt)}` : ""}</span>}
              {r.resolvedBy?.name && <span className="tiny muted">Resolved by {r.resolvedBy.name}{r.resolvedAt ? ` · ${listTime(r.resolvedAt)}` : ""}</span>}
            </section>

            <section className="stack-sm" aria-label="Messages">
              <div className="sos-msg sos-msg--them"><b className="tiny">{r.name || "Attendee"}</b><p>{r.message}</p><time className="tiny muted" dateTime={r.createdAt}>{listTime(r.createdAt)}</time></div>
              {r.messages.map((m, i) => (
                <div key={i} className={"sos-msg" + (m.from === "staff" ? " sos-msg--staff sos-msg--mine" : " sos-msg--them")}>
                  <b className="tiny">{m.from === "staff" ? (m.staffName || "Staff") : (r.name || "Attendee")}</b>
                  <p>{m.body}</p>
                  <time className="tiny muted" dateTime={m.at}>{listTime(m.at)}</time>
                </div>
              ))}
            </section>

            <form className="composer-bar sos-reply" onSubmit={reply} style={{ position: "static" }}>
              <textarea className="input" rows={2} value={draft} maxLength={SOS_MAX} onChange={(e) => setDraft(e.target.value)}
                placeholder="Reply to them (they get a notification)…" aria-label="Reply to the attendee" />
              <IconButton icon={ArrowUp} label="Send reply" filled type="submit" disabled={!draft.trim() || !!busy} />
            </form>
            <div className="row wrap" style={{ gap: 8 }}>
              {r.status === "open" && <Button icon={Eye} loading={busy === "acknowledged"} onClick={() => act("acknowledged", () => setSosStatus(id, "acknowledged"))}>Acknowledge</Button>}
              {r.status !== "resolved"
                ? <Button variant="primary" icon={CheckCheck} loading={busy === "resolved"} onClick={() => act("resolved", () => setSosStatus(id, "resolved"))}>Resolve</Button>
                : <Button icon={RotateCcw} loading={busy === "open"} onClick={() => act("open", () => setSosStatus(id, "open"))}>Reopen</Button>}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function StaffSos() {
  const { id } = useParams();
  return id ? <Detail id={id} /> : <List />;
}
