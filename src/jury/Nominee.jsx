import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, ExternalLink, Lock, PencilLine, RefreshCw, RotateCcw, Save, Send,
} from "lucide-react";
import { jury } from "./api";
import { SCORE_VALUES, anchorFor, displayUrl, fmtToronto, fmtTotal, savedAgo, scoredCount, totalOf, cx } from "./juryLib";
import { Button, Chip, Modal, RichText, Spinner } from "./ui";
import { focusText } from "../lib/catalystCategories.js";

/* One nominee: the profile (category, nominee, links, who nominated them,
   the statements) and the juror's assessment (the rubric's 1–5 scores with
   their anchors, an optional recommendation and comment, the live total).
   Drafts save a second after any change ("Saved" shows when they're in),
   "Save draft" saves now, "Submit" asks first. A submitted assessment can be
   reopened with Edit until the deadline (the submitted one counts until it's
   submitted again). Phones get a sticky bar with the total and the next step;
   on wide screens the assessment stays in view beside the profile. */

const EMPTY = Object.freeze({ scores: {}, recommendation: "", comment: "" });
const AUTOSAVE_MS = 1000;

const fromSet = (s) => (s ? { scores: { ...(s.scores || {}) }, recommendation: s.recommendation || "", comment: s.comment || "" } : { ...EMPTY, scores: {} });
const sameForm = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function Criterion({ c, value, onChange, readOnly, share, open, onToggle, missing }) {
  const id = `crit-${c.key}`;
  return (
    <fieldset className={cx("j-crit", missing && "is-missing")} id={id} aria-describedby={c.help ? `${id}-help` : undefined}>
      <legend className="j-crit-legend">
        <span className="j-crit-name">{c.label}</span>
        {share && <span className="j-crit-share">{share}% of the total</span>}
      </legend>
      {c.help && <p id={`${id}-help`} className="j-crit-help">{c.help}</p>}
      <div className="j-seg">
        {SCORE_VALUES.map((v) => (
          <label key={v} className={cx("j-seg-opt", value === v && "is-on", readOnly && "is-readonly")}>
            <input type="radio" name={id} value={v} checked={value === v} disabled={readOnly} onChange={() => onChange(v)} />
            <span>{v}</span>
          </label>
        ))}
      </div>
      <div className="j-seg-scale" aria-hidden="true"><span>1 · low</span><span>5 · high</span></div>
      {value ? <p className="j-anchor-now"><span className="j-strong">{value}:</span> {anchorFor(c, value)}</p> : missing ? <p className="j-anchor-now j-missing-text">Choose a score from 1 to 5.</p> : null}
      <button type="button" className="j-link j-small" aria-expanded={open} aria-controls={`${id}-guide`} onClick={onToggle}>
        {open ? "Hide the guide" : "What 1, 3 and 5 mean"}
      </button>
      {open && (
        <dl id={`${id}-guide`} className="j-anchors">
          {["1", "3", "5"].map((p) => <div key={p}><dt>{p}</dt><dd>{c.anchors?.[p] || "—"}</dd></div>)}
        </dl>
      )}
    </fieldset>
  );
}

function Statement({ s }) {
  const long = s.text.length > 1400;
  const [open, setOpen] = useState(!long);
  const text = open ? s.text : `${s.text.slice(0, 900).replace(/\s+\S*$/, "")}…`;
  return (
    <section className="j-card j-statement" aria-labelledby={`st-${s.key}`}>
      <h2 id={`st-${s.key}`} className="j-h2">{s.title}</h2>
      <RichText text={text} />
      {long && <button type="button" className="j-link" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Show less" : "Read all of it"}</button>}
    </section>
  );
}

function SaveStatus({ save, state, onRetry }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  if (state === "submitted") return <span className="j-save is-done"><Check className="j-ico-sm" aria-hidden="true" /> Submitted</span>;
  if (save.status === "pending") return <span className="j-save">Unsaved changes</span>;
  if (save.status === "saving") return <span className="j-save"><Spinner className="j-ico-sm" /> Saving…</span>;
  if (save.status === "saved") return <span className="j-save is-done"><Check className="j-ico-sm" aria-hidden="true" /> {savedAgo(save.at)}</span>;
  if (save.status === "error") {
    return (
      <span className="j-save is-error">
        <AlertTriangle className="j-ico-sm" aria-hidden="true" /> Not saved
        {onRetry && <button type="button" className="j-link j-small" onClick={onRetry}>Retry</button>}
      </span>
    );
  }
  return <span className="j-save" />;
}

export default function Nominee({ basePath, onToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState("not_started");
  const [save, setSave] = useState({ status: "idle", at: null, error: null });
  const [guides, setGuides] = useState({});
  const [dialog, setDialog] = useState(""); // submit | conflict
  const [dialogError, setDialogError] = useState("");
  const [busy, setBusy] = useState("");
  const [reason, setReason] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const [submitted, setSubmitted] = useState(null); // { at, total } just now

  const formRef = useRef(EMPTY);
  const dirty = useRef(false);
  const timer = useRef(null);
  const inFlight = useRef(null);
  const queued = useRef(false);
  const idRef = useRef(id);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await jury.get(`/nominations/${id}`);
      const a = d.assessment;
      const f = a.state === "submitted" ? fromSet(a.submission) : a.draft ? fromSet(a.draft) : fromSet(null);
      formRef.current = f;
      dirty.current = false;
      setForm(f);
      setState(a.state);
      setSave({ status: a.lastSavedAt && a.state !== "submitted" ? "saved" : "idle", at: a.lastSavedAt, error: null });
      setData(d);
    } catch (err) { setError(err); }
  }, [id]);

  /* ---------- saving drafts ---------- */

  const flush = useCallback(({ keepalive = false } = {}) => {
    clearTimeout(timer.current);
    if (!dirty.current) return inFlight.current || Promise.resolve();
    if (inFlight.current) { queued.current = true; return inFlight.current; }
    dirty.current = false;
    const nid = idRef.current;
    const body = formRef.current;
    setSave((s) => ({ ...s, status: "saving" }));
    const request = jury.put(`/nominations/${nid}/draft`, body, { keepalive }).then(
      (r) => {
        if (idRef.current !== nid) return;
        setState(r.state);
        setSave({ status: dirty.current ? "pending" : "saved", at: r.savedAt, error: null });
      },
      (err) => {
        if (idRef.current !== nid) return;
        dirty.current = true;
        setSave({ status: "error", at: null, error: err });
        if (err.code === "locked") setData((d) => d && { ...d, locked: true });
        if (err.code === "submitted" || err.code === "changed") { dirty.current = false; load(); }
      },
    );
    const tracked = request.finally(() => {
      if (inFlight.current !== tracked) return; // a later nominee's save owns it now
      inFlight.current = null;
      if (queued.current) { queued.current = false; if (dirty.current) flush(); }
    });
    inFlight.current = tracked;
    return tracked;
  }, [load]);

  // A new nominee: load it. Leaving one: send what's still waiting for it (after any save in flight), then forget
  // it, so nothing typed for one nominee can ever be saved on another.
  useEffect(() => {
    idRef.current = id;
    formRef.current = { ...EMPTY, scores: {} };
    setData(null);
    setSubmitted(null);
    setShowMissing(false);
    setGuides({});
    load();
    window.scrollTo(0, 0);
    return () => {
      clearTimeout(timer.current);
      if (dirty.current) {
        const nid = idRef.current;
        const body = formRef.current;
        const send = () => jury.put(`/nominations/${nid}/draft`, body, { keepalive: true }).catch(() => {});
        if (inFlight.current) inFlight.current.finally(send); else send();
      }
      dirty.current = false;
      queued.current = false;
      inFlight.current = null;
    };
  }, [id, load]);

  useEffect(() => {
    const warn = (e) => { if (dirty.current || inFlight.current) { e.preventDefault(); e.returnValue = ""; } };
    const online = () => { if (dirty.current) flush(); };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("online", online);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("online", online); };
  }, [flush]);

  const change = (patch) => {
    const next = { ...formRef.current, ...patch };
    if (sameForm(next, formRef.current)) return;
    formRef.current = next;
    setForm(next);
    dirty.current = true;
    setSave((s) => ({ ...s, status: "pending" }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(), AUTOSAVE_MS);
  };

  const go = async (to) => {
    await flush();
    navigate(to);
  };

  /* ---------- the derived bits ---------- */

  const criteria = useMemo(() => data?.rubric?.criteria || [], [data]);
  const shares = useMemo(() => {
    const ws = criteria.map((c) => Number(c.weight) || 0);
    if (!ws.length || ws.every((w) => w === ws[0])) return null;
    const sum = ws.reduce((a, b) => a + b, 0) || 1;
    return Object.fromEntries(criteria.map((c) => [c.key, Math.round(((Number(c.weight) || 0) / sum) * 1000) / 10]));
  }, [criteria]);

  if (error && !data) {
    return (
      <div className="j-card j-center-card" role="alert">
        <p className="j-strong">{error.status === 404 ? "This nomination isn't on your list" : "Couldn't load this nomination"}</p>
        <p className="j-muted">{error.message}</p>
        <div className="j-row-center">
          {error.status !== 404 && <Button icon={RefreshCw} onClick={load}>Try again</Button>}
          <Link className="j-btn j-btn-secondary" to={basePath}>All nominations</Link>
        </div>
      </div>
    );
  }
  if (!data) return <div className="j-loading" role="status"><Spinner /> Loading the nomination…</div>;

  const n = data.nominee;
  const locked = !!data.locked;
  const readOnly = locked || state === "submitted";
  const total = totalOf(form.scores, criteria);
  const scored = scoredCount(form.scores, criteria);
  const complete = criteria.length > 0 && scored === criteria.length;
  const missing = criteria.filter((c) => !form.scores[c.key]).map((c) => c.key);
  const commentMax = data.commentMax || 500;

  const askSubmit = () => {
    if (!complete) {
      setShowMissing(true);
      const el = document.getElementById(`crit-${missing[0]}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.querySelector("input")?.focus({ preventScroll: true });
      return;
    }
    setDialogError("");
    setDialog("submit");
  };

  const doSubmit = async () => {
    setBusy("submit"); setDialogError("");
    clearTimeout(timer.current);
    try {
      if (inFlight.current) await inFlight.current.catch(() => {});
      const r = await jury.post(`/nominations/${id}/submit`, formRef.current);
      dirty.current = false;
      setState("submitted");
      setSave({ status: "idle", at: r.submittedAt, error: null });
      setSubmitted({ at: r.submittedAt, total: r.total, again: r.resubmitted });
      setDialog("");
      onToast?.(r.resubmitted ? "Changes submitted. Thank you." : "Assessment submitted. Thank you.");
      const d = await jury.get(`/nominations/${id}`).catch(() => null);
      if (d) setData(d);
    } catch (err) {
      setDialogError(err.message);
      if (err.code === "locked") setData((d) => d && { ...d, locked: true });
      if (dirty.current) timer.current = setTimeout(() => flush(), AUTOSAVE_MS);
    } finally { setBusy(""); }
  };

  const doEdit = async () => {
    setBusy("edit");
    try {
      const r = await jury.post(`/nominations/${id}/edit`);
      const f = fromSet(r.draft);
      formRef.current = f;
      setForm(f);
      setState("editing");
      setSubmitted(null);
      setSave({ status: "saved", at: r.draft?.savedAt || null, error: null });
    } catch (err) {
      onToast?.(err.message);
      if (err.code === "locked") setData((d) => d && { ...d, locked: true });
    } finally { setBusy(""); }
  };

  const doDiscard = async () => {
    setBusy("discard");
    clearTimeout(timer.current);
    try {
      if (inFlight.current) await inFlight.current.catch(() => {});
      dirty.current = false;
      await jury.post(`/nominations/${id}/discard`);
      onToast?.("Changes discarded. Your submitted assessment stands.");
      await load();
    } catch (err) { onToast?.(err.message); } finally { setBusy(""); }
  };

  const doConflict = async () => {
    setBusy("conflict"); setDialogError("");
    try {
      await jury.post(`/nominations/${id}/conflict`, { reason });
      clearTimeout(timer.current);
      dirty.current = false;
      setDialog("");
      onToast?.("Conflict of interest noted. We'll reassign this nomination.");
      navigate(basePath);
    } catch (err) { setDialogError(err.message); } finally { setBusy(""); }
  };

  const nextAfter = data.nextId ? `${basePath}/n/${data.nextId}` : basePath;
  const category = n.categoryType === "special" ? n.specialAward : <>{n.pillar} <span aria-hidden="true">×</span><span className="sr-only">in</span> {n.sector}</>;
  // The startup's focus as staff last set it: "<pillar> · <sector>" (older servers send only the sector).
  const focus = n.focus || focusText(n);

  const primary = locked ? null : state === "submitted" ? (
    <Button variant="primary" onClick={() => go(nextAfter)}>{data.nextId ? <>Next nominee <ArrowRight className="j-ico" aria-hidden="true" /></> : "All nominations"}</Button>
  ) : (
    <Button variant="primary" icon={Send} onClick={askSubmit} aria-describedby="j-total-line">{state === "editing" ? "Submit changes" : "Submit"}</Button>
  );

  return (
    <div className="j-nominee">
      <nav className="j-crumbs" aria-label="Nominations">
        <Link to={basePath} className="j-back" onClick={(e) => { if (dirty.current) { e.preventDefault(); go(basePath); } }}>
          <ArrowLeft className="j-ico" aria-hidden="true" /> All nominations
        </Link>
        <div className="j-pager">
          <button type="button" className="j-iconbtn" disabled={!data.prevId} onClick={() => go(`${basePath}/n/${data.prevId}`)} aria-label="Previous nominee">
            <ChevronLeft className="j-ico" aria-hidden="true" />
          </button>
          <span className="j-pager-pos">{data.position} of {data.count}</span>
          <button type="button" className="j-iconbtn" disabled={!data.nextId} onClick={() => go(`${basePath}/n/${data.nextId}`)} aria-label="Next nominee">
            <ChevronRight className="j-ico" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {locked && (
        <p className="j-note j-note-warn" role="status"><Lock className="j-ico-sm" aria-hidden="true" />
          Judging closed{data.deadlineText ? ` on ${data.deadlineText}` : ""}. You can read this assessment, but it can't be changed.</p>
      )}

      <div className="j-layout">
        <article className="j-profile" aria-labelledby="j-nominee-name">
          <div className="j-card j-profile-card">
            <p className="j-cat">{category}</p>
            <h1 id="j-nominee-name" className="j-h1">{n.nomineeName}</h1>
            {(n.nomineeTitle || (n.nomineeOrganisation && n.nomineeOrganisation !== n.nomineeName)) && (
              <p className="j-sub">{[n.nomineeTitle, n.nomineeOrganisation !== n.nomineeName ? n.nomineeOrganisation : ""].filter(Boolean).join(", ")}</p>
            )}
            <dl className="j-facts">
              {n.nomineeType && <div><dt>Nominee</dt><dd>{n.nomineeType}</dd></div>}
              {n.nomineeOrganisation && <div><dt>Organisation</dt><dd>{n.nomineeOrganisation}</dd></div>}
              {n.nomineeLocation && <div><dt>Location</dt><dd>{n.nomineeLocation}</dd></div>}
              {focus && <div><dt>Focus</dt><dd>{focus}</dd></div>}
              {n.website && <div><dt>Website</dt><dd><a href={n.website} target="_blank" rel="noopener noreferrer nofollow">{displayUrl(n.website)}<ExternalLink className="j-ico-xs" aria-label="(opens in a new tab)" /></a></dd></div>}
              {n.linkedin && <div><dt>LinkedIn</dt><dd><a href={n.linkedin} target="_blank" rel="noopener noreferrer nofollow">{displayUrl(n.linkedin)}<ExternalLink className="j-ico-xs" aria-label="(opens in a new tab)" /></a></dd></div>}
              <div><dt>Nomination</dt><dd>{n.nominatedBy}</dd></div>
            </dl>
            <a href="#j-score" className="j-jump">Go to scoring <ArrowRight className="j-ico-sm" aria-hidden="true" /></a>
          </div>
          {n.statements.length ? n.statements.map((s) => <Statement key={s.key} s={s} />) : (
            <div className="j-card"><p className="j-muted">No statement came with this nomination.</p></div>
          )}
        </article>

        <aside className="j-score" id="j-score" aria-labelledby="j-score-title">
          <div className="j-card j-score-card">
            <div className="j-score-head">
              <h2 id="j-score-title" className="j-h2">Your assessment</h2>
              <Chip state={state} />
            </div>

            {submitted && (
              <div className="j-note j-note-good" role="status">
                <p className="j-strong">{submitted.again ? "Changes submitted." : "Submitted."} Thank you!</p>
                <p>Total {fmtTotal(submitted.total)} / 100. You can still edit it until {data.deadlineText || "the deadline"}.</p>
              </div>
            )}
            {state === "submitted" && !submitted && (
              <p className="j-note j-note-good">Submitted{data.assessment?.submission?.submittedAt ? ` ${fmtToronto(data.assessment.submission.submittedAt)}` : ""}.
                {!locked && " You can edit it until the deadline."}</p>
            )}
            {state === "submitted" && !locked && (
              <Button icon={PencilLine} loading={busy === "edit"} onClick={doEdit} className="j-block">Edit assessment</Button>
            )}
            {state === "editing" && (
              <p className="j-note j-note-edit">You're changing a submitted assessment. Your submitted scores still count until you submit again.</p>
            )}

            {!readOnly && <p className="j-hint">Score each criterion from 1 (low) to 5 (high). Tap "What 1, 3 and 5 mean" for the guide.</p>}

            {criteria.map((c) => (
              <Criterion key={c.key} c={c} value={Number(form.scores[c.key]) || 0} readOnly={readOnly} share={shares?.[c.key]}
                open={!!guides[c.key]} onToggle={() => setGuides((g) => ({ ...g, [c.key]: !g[c.key] }))}
                missing={showMissing && !form.scores[c.key]}
                onChange={(v) => change({ scores: { ...formRef.current.scores, [c.key]: v } })} />
            ))}

            <fieldset className="j-recs">
              <legend className="j-crit-legend"><span className="j-crit-name">Overall recommendation</span><span className="j-optional">optional</span></legend>
              <div className="j-rec-row">
                {(data.recommendations || []).map((r) => (
                  <button key={r.key} type="button" aria-pressed={form.recommendation === r.key} disabled={readOnly}
                    className={cx("j-rec", `j-rec-${r.key}`, form.recommendation === r.key && "is-on")}
                    onClick={() => change({ recommendation: formRef.current.recommendation === r.key ? "" : r.key })}>
                    {r.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="j-comment">
              <label htmlFor="j-comment" className="j-crit-legend"><span className="j-crit-name">Comment</span><span className="j-optional">optional</span></label>
              <textarea id="j-comment" className="j-input j-textarea" rows={3} maxLength={commentMax} value={form.comment} readOnly={readOnly}
                onChange={(e) => change({ comment: e.target.value.slice(0, commentMax) })}
                placeholder={readOnly ? "" : "A line or two for the other jurors and the awards team."} aria-describedby="j-comment-count" />
              <p id="j-comment-count" className="j-count">{form.comment.length} / {commentMax}</p>
            </div>

            <div className="j-score-foot">
            <div className="j-total" id="j-total-line">
              <span className="j-total-label">Total</span>
              <span className="j-total-num">{fmtTotal(total)}</span>
              <span className="j-total-of">/ 100</span>
              <span className="j-total-sub">{scored} of {criteria.length} scored</span>
            </div>

            {showMissing && !complete && !readOnly && (
              <p className="j-error" role="alert">Score every criterion to submit ({missing.length} left).</p>
            )}

            {!locked && state !== "submitted" && (
              <div className="j-actions">
                {state === "editing" ? (
                  <Button icon={RotateCcw} loading={busy === "discard"} onClick={doDiscard}>Discard changes</Button>
                ) : (
                  <Button icon={Save} onClick={() => { dirty.current = dirty.current || save.status !== "saved"; flush(); }} disabled={save.status === "saving"}>Save draft</Button>
                )}
                <span className="j-actions-primary">{primary}</span>
              </div>
            )}
            {!locked && state === "submitted" && <div className="j-actions"><span className="j-actions-primary">{primary}</span></div>}
            <div className="j-save-row"><SaveStatus save={save} state={state} onRetry={() => flush()} /></div>
            </div>

            {!locked && (
              <button type="button" className="j-link j-danger-link" onClick={() => { setReason(""); setDialogError(""); setDialog("conflict"); }}>
                Declare a conflict of interest
              </button>
            )}
          </div>
        </aside>
      </div>

      <div className="j-bottombar" role="region" aria-label="Assessment summary">
        <div className="j-bb-info">
          <span className="j-bb-total"><span className="j-strong">{fmtTotal(total)}</span> / 100</span>
          <span className="j-bb-sub">{scored}/{criteria.length} scored{(state === "submitted" || save.status !== "idle") && <> · <SaveStatus save={save} state={state} /></>}</span>
        </div>
        {!locked ? primary : <span className="j-bb-sub"><Lock className="j-ico-sm" aria-hidden="true" /> Closed</span>}
      </div>

      <Modal open={dialog === "submit"} onClose={() => { if (!busy) setDialog(""); }}
        title={state === "editing" ? "Submit your changes?" : "Submit your assessment?"}
        description={`${n.nomineeName}: total ${fmtTotal(total)} / 100.`}
        footer={<>
          <Button onClick={() => setDialog("")} disabled={!!busy}>Not yet</Button>
          <Button variant="primary" icon={Send} loading={busy === "submit"} onClick={doSubmit} data-autofocus>Submit</Button>
        </>}>
        <ul className="j-summary">
          {criteria.map((c) => <li key={c.key}><span>{c.label}</span><span className="j-strong">{form.scores[c.key] || "—"}</span></li>)}
          <li><span>Recommendation</span><span className="j-strong">{(data.recommendations || []).find((r) => r.key === form.recommendation)?.label || "None"}</span></li>
        </ul>
        <p className="j-muted j-small">You can still edit it until {data.deadlineText || "the deadline"}.</p>
        {dialogError && <p className="j-error" role="alert">{dialogError}</p>}
      </Modal>

      <Modal open={dialog === "conflict"} onClose={() => { if (!busy) setDialog(""); }} tone="danger"
        title="Declare a conflict of interest?"
        description={`${n.nomineeName} will come off your list and the Catalyst Awards team will reassign it. Your scores for it won't count.`}
        footer={<>
          <Button onClick={() => setDialog("")} disabled={!!busy}>Cancel</Button>
          <Button variant="danger" loading={busy === "conflict"} onClick={doConflict}>Declare conflict</Button>
        </>}>
        <label htmlFor="j-reason" className="j-label">Reason <span className="j-optional">optional, only the awards team sees it</span></label>
        <textarea id="j-reason" className="j-input j-textarea" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="For example: I advise this company." data-autofocus />
        {dialogError && <p className="j-error" role="alert">{dialogError}</p>}
      </Modal>
    </div>
  );
}
