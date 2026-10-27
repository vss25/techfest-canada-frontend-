import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDown, ArrowUp, BellRing, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Copy, Download, Eye, Info, Lock, Mail, MessageSquareText,
  Link2, Pencil, Plus, RefreshCw, RotateCcw, Save, Send, Trash2, UserRoundX, Users, X,
} from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { useAdminTheme } from "../theme";
import {
  Badge, Banner, Bars, Button, Card, EmptyState, ErrorState, Field, IconButton, Input, LoadingState, Modal, PageHeader, SectionTitle, Select, StatTile,
  Switch, TableWrap, Tabs, Textarea, focusRing,
} from "../ui";
import { num, when } from "../format";
import EmailPreview from "./EmailPreview";
import SurveyQuestion, { SURVEY_QUESTION_CSS } from "../../components/SurveyQuestion";
import { surveyVars } from "../../lib/surveyTheme";
import { swagShort } from "../../lib/swag";
import {
  CAN_CONTROL, HAS_NA, HAS_OPTIONS, HAS_SCALE, LIMITS, PREVIEW_KEY, QUESTION_TYPES, SURVEY_DEFAULTS, SURVEY_PAGE, TYPE_LABELS, adminPhase, answerText,
  averageOf, blankQuestion, changeType, checkConfig, configToForm, formToConfig, groupSections, moveItem, normalizeQuestion, renameSection,
  NOTIFY_LIMITS, PEOPLE_STATUSES, alreadyAnswered, linkRowFrom, linksCsv, linksText, notifyPlanText, parseEmails, peopleRowFrom, progressText,
  sectionNames, surveyWhen, torontoShort,
} from "../../lib/survey";
import { parseToronto } from "../../lib/swag";
import { AUDIENCES, surveyApi } from "./surveyApi";

/* =========================================================
   Admin › Website & app › Attendee survey (Oct 26 2026)
   The organiser: the survey opens on Day 2 at 4:00 PM (Toronto);
   "nothing is sent until they review the survey". Management edits
   and sends, staff read (the server enforces it too).
     - Status: on / opens at / open / closed, responses (from the app
       and from the link), and the automatic app notification (on by
       default since Oct 26: waves of N every M minutes from a delay
       after opening, with its progress).
     - Invitations (Oct 26 2026, the organiser wants to see who
       answered so nobody is sent it twice): everyone who checked in,
       filtered (All · Not answered · Answered · Emailed · Not
       emailed), searched, with when each was emailed, notified in the
       app and answered (Toronto time), 50 a page, Export CSV.
     - Responses: per-question averages (stars, 0–10 with the NPS,
       counts for the picks; N/A counted apart, never in an average),
       the answers 50 a page, Export CSV.
     - Questions: add (any type), edit every field (a new type keeps
       the text), delete (an inline "Delete? Yes / No"; answers already
       given stay in the CSV), reorder, add / rename / reorder
       sections, options with add / remove / reorder, the words under
       the scale, "Allow N/A" (stars, 0–10, pick one), "Show only if"
       another question's answer includes an option (per question, or
       for a whole section, e.g. "Speaking at TTFC" only for speakers);
       each open question shows a live preview as /survey renders it
       (components/SurveyQuestion.jsx).
     - Settings: on/off, opens / closes (Toronto time), the title,
       intro and thank-you, the app notification's title and text, and
       the automatic notification switch.
     - Share & send: by invitation only (the organiser: "This isn't a
       public survey. This would be sent out to attendees one on one"),
       so no public link: "Personal link for an attendee" (by email,
       with Copy) and "Links for a list" (paste emails: a table with
       Copy all and a CSV), each marked "Not checked in" when the
       survey will refuse them; "Send the app notification now" and
       "Email the survey" (checked in Day 1, Day 2 or either: the
       count, some names and the email itself), each confirmed by
       typing SEND, and only while the survey is open. Preview (staff)
       opens /survey?preview=1 with the draft.
   Questions and Settings are one draft with one Save (kept across the
   tabs); leaving with unsaved changes asks first. Preview opens
   /survey?preview=1 with the draft. Server calls: ./surveyApi.js.
========================================================= */

const TABS = ["responses", "people", "questions", "settings", "send"];
const PHASE = {
  off: { label: "Off", tone: "neutral" },
  before: { label: "Not open yet", tone: "purple" },
  open: { label: "Open", tone: "good" },
  closed: { label: "Closed", tone: "neutral" },
};
const SOURCE_LABEL = { app: "App", link: "Link", email: "Email", ios: "iPhone app", android: "Android app", webapp: "Web app", website: "Link" };
const cx = (...a) => a.filter(Boolean).join(" ");

/** Why the send buttons are off (null = they can be used). */
function sendBlocker({ isManagement, phase, config, dirty }) {
  if (!isManagement) return "Sending is for management.";
  if (phase === "off") return "Turn the survey on first (Settings), then save.";
  if (phase === "before") return `The survey opens at ${surveyWhen(parseToronto(config?.opensAt))}. You can send it once it's open.`;
  if (phase === "closed") return "The survey has closed.";
  if (dirty) return "Save or undo your changes first, so people get the survey you see.";
  return null;
}

export default function Survey() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const { theme } = useAdminTheme();
  const dark = theme !== "light";
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "responses";
  const setTab = (t) => { const p = new URLSearchParams(params); if (t === "responses") p.delete("tab"); else p.set("tab", t); setParams(p, { replace: true }); };

  const main = useApi(surveyApi.path);
  const config = main.data?.config || (main.data ? {} : null);
  const saved = useMemo(() => (main.data ? configToForm(main.data.config || {}) : null), [main.data]);
  const [draft, setDraft] = useState(null);
  const form = draft || saved;
  const dirty = !!draft && !!saved && JSON.stringify(formToConfig(draft)) !== JSON.stringify(formToConfig(saved));
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const pageRef = useRef(null);

  // The phase moves on with the clock (the send buttons switch on at the opening time without a reload).
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  // Unsaved changes: the browser asks before closing or reloading; a link elsewhere in the panel asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    const onClick = (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a || pageRef.current?.contains(a) || a.target === "_blank" || e.defaultPrevented) return;
      if (!window.confirm("You have unsaved changes to the survey. Leave without saving them?")) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", onUnload); document.removeEventListener("click", onClick, true); };
  }, [dirty]);

  const phase = adminPhase(config, now);
  const counts = main.data?.counts || {};
  const readOnly = !isManagement;
  const update = (patch) => { setDraft({ ...form, ...patch }); if (problems.length) setProblems([]); };

  const save = async () => {
    const found = checkConfig(form);
    setProblems(found);
    if (found.length) { toast.error(found.length === 1 ? found[0].message : `${found.length} things to fix before saving`); return; }
    setSaving(true);
    try {
      const body = formToConfig(form);
      const r = await surveyApi.save(body);
      main.setData((d) => ({ ...(d || {}), config: r?.config || body }));
      setDraft(null);
      toast.success("Saved. /survey and the apps show the changes within about a minute");
      main.reload();
    } catch (e) { toast.error(e); } finally { setSaving(false); }
  };

  const openPreview = () => {
    try { localStorage.setItem(PREVIEW_KEY, JSON.stringify({ at: Date.now(), config: formToConfig(form || {}) })); } catch { /* the preview shows the saved survey */ }
    window.open(`${SURVEY_PAGE}?preview=1`, "_blank", "noopener");
  };

  const opens = parseToronto(config?.opensAt);
  const closes = parseToronto(config?.closesAt);
  const notifiedAt = config?.notifiedAt || null;
  const phaseTile = PHASE[phase];

  return (
    <div ref={pageRef}>
      <style>{SURVEY_QUESTION_CSS}</style>
      <PageHeader
        eyebrow="Website & app"
        title="Attendee survey"
        description="By invitation only: each attendee who checked in gets their own link (in the TTFC app, by email, or one you copy for them), which fills in who they are. Nothing goes out before the survey opens. With the automatic app notification on, people on the app are told in small waves from the opening time; the email goes only when management clicks “Email the survey”. Invitations shows who has answered, so nobody gets it twice."
        actions={(
          <>
            <Button icon={Eye} onClick={openPreview} disabled={!form} title="Opens /survey with your unsaved changes; nothing is sent">Preview</Button>
            <Button icon={RefreshCw} onClick={main.reload}>Refresh</Button>
          </>
        )}
      />

      {readOnly && (
        <Banner tone="info" icon={Lock} className="mb-6" title="Changing the survey and sending it are for management">
          You can see the settings, the questions and the answers.
        </Banner>
      )}

      {main.loading && !main.data ? <LoadingState label="Loading the survey…" /> : main.error && !main.data ? (
        <ErrorState error={main.error} onRetry={main.reload}
          title={main.error?.status === 404 ? "Not available yet: the server needs the latest backend update" : "Couldn't load the survey"} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile label="Survey" value={phaseTile.label} icon={ClipboardList} tone={phase === "open" ? "good" : "purple"}
              hint={phase === "off" ? "Off: /survey says it's closed" : phase === "before" ? `Opens ${surveyWhen(opens)}` : phase === "open" ? (Number.isFinite(closes) ? `Until ${surveyWhen(closes)}` : "Open now") : `Closed ${surveyWhen(closes)}`} />
            <StatTile label="Responses" value={num(counts.responses ?? 0)} icon={Users} tone="pink"
              hint={`${num(counts.app ?? 0)} from the app · ${num(counts.link ?? 0)} from the link`} />
            <StatTile label="Opens" value={Number.isFinite(opens) ? swagShort(opens) : "—"} icon={CalendarClock} tone="orange"
              hint={Number.isFinite(closes) ? `Closes ${swagShort(closes)} · Toronto time` : "Toronto time"} />
            <StatTile label="Automatic app notification" value={main.data?.notifyProgress?.done ? "Done" : config?.autoNotify ? "On" : "Off"} icon={BellRing} tone={config?.autoNotify ? "good" : "neutral"}
              hint={progressText(main.data?.notifyProgress) || (config?.autoNotify ? notifyPlanText(config).replace(/^On — /, "") : notifiedAt ? `Last sent by hand ${when(notifiedAt)}` : "Nothing is sent until you click Send")} />
          </div>

          <Tabs label="Attendee survey" value={tab} onChange={setTab} tabs={[
            { key: "responses", label: "Responses", count: num(counts.responses ?? 0) },
            { key: "people", label: "Invitations" },
            { key: "questions", label: "Questions", count: form?.questions?.length ?? 0 },
            { key: "settings", label: "Settings" },
            { key: "send", label: "Share & send" },
          ]} />

          {tab === "responses" && <Responses data={main.data} configQuestions={config?.questions} />}
          {tab === "people" && <Invitations />}
          {tab === "questions" && form && (
            <QuestionEditor questions={form.questions} onChange={(questions) => update({ questions })} readOnly={readOnly} problems={problems} dark={dark} />
          )}
          {tab === "settings" && form && <SettingsForm form={form} update={update} readOnly={readOnly} problems={problems} notifiedAt={notifiedAt} progress={main.data?.notifyProgress} />}
          {tab === "send" && (
            <SendPanel config={config} progress={main.data?.notifyProgress} phase={phase} dirty={dirty} isManagement={isManagement} onPreview={openPreview}
              onSent={main.reload} blocker={sendBlocker({ isManagement, phase, config, dirty })} />
          )}

          {(tab === "questions" || tab === "settings") && isManagement && (
            <div className="sticky bottom-3 z-10 mt-6 flex flex-col gap-3 rounded-2xl border border-ttfc-line bg-ttfc-panel/95 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur sm:flex-row sm:items-center" role="region" aria-label="Save the survey">
              <p className="text-sm" aria-live="polite">
                {dirty ? <><Badge tone="warn" className="mr-2">Unsaved changes</Badge>They go live on /survey and in the apps when you save.</> : <span className="text-ttfc-muted">Everything is saved.</span>}
              </p>
              <div className="flex gap-2 sm:ml-auto">
                <Button icon={RotateCcw} disabled={!draft} onClick={() => { setDraft(null); setProblems([]); }}>Undo changes</Button>
                <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={save}>Save</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ================= Responses ================= */

function NaLine({ a }) {
  return a.na ? <p className="mt-1 text-xs text-ttfc-muted">N/A: {num(a.na)} (not in the average)</p> : null;
}

function Average({ q, a }) {
  return <><AverageValue q={q} a={a} /><NaLine a={a} /></>;
}

function AverageValue({ q, a }) {
  if (q.type === "rating" && a.avg !== null) {
    return <p className="text-2xl font-bold tabular-nums">{a.avg.toFixed(1)} <span className="text-base text-ttfc-orange" aria-hidden="true">★</span><span className="text-sm font-medium text-ttfc-muted"> / 5</span></p>;
  }
  if (q.type === "nps") {
    return (
      <p className="text-2xl font-bold tabular-nums">
        {a.avg !== null ? a.avg.toFixed(1) : "—"}<span className="text-sm font-medium text-ttfc-muted"> / 10</span>
        {a.nps !== null && <span className="ml-3 text-sm font-semibold text-ttfc-muted">NPS {a.nps > 0 ? "+" : ""}{Math.round(a.nps)}</span>}
      </p>
    );
  }
  if (a.counts) {
    const rows = Object.entries(a.counts).map(([key, count]) => ({ key, count: Number(count) || 0 })).sort((x, y) => y.count - x.count);
    return <Bars rows={rows} empty="No answers yet" />;
  }
  if (a.avg !== null) return <p className="text-2xl font-bold tabular-nums">{a.avg.toFixed(1)}</p>;
  return null;
}

function Responses({ data, configQuestions }) {
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const res = useApi(surveyApi.responsesPath(page));
  const questions = useMemo(() => {
    const list = Array.isArray(res.data?.questions) && res.data.questions.length ? res.data.questions : configQuestions || [];
    return list.map((q, i) => normalizeQuestion(q, i));
  }, [res.data?.questions, configQuestions]);
  const averages = data?.averages;
  const withAverages = questions.map((q) => ({ q, a: averageOf(averages, q.id) })).filter((x) => x.a && (x.a.avg !== null || x.a.nps !== null || x.a.counts || x.a.na !== null));
  const rows = res.data?.rows || [];
  const total = res.data?.total ?? data?.counts?.responses ?? 0;
  const size = res.data?.size || 50;
  const pages = Math.max(1, Math.ceil(total / size));

  const exportCsv = async () => {
    setExporting(true);
    try { await surveyApi.exportCsv(); } catch (e) { toast.error(e); } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6">
      {withAverages.length > 0 && (
        <Card>
          <SectionTitle hint="Across every response so far.">Averages</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {withAverages.map(({ q, a }) => (
              <div key={q.id} className="rounded-xl border border-ttfc-line p-4">
                <p className="line-clamp-2 text-sm font-semibold" title={q.label}>{q.label}</p>
                <p className="mb-2 mt-0.5 text-xs text-ttfc-dim">{TYPE_LABELS[q.type]}{a.count !== null ? ` · ${num(a.count)} ${a.count === 1 ? "answer" : "answers"}` : ""}</p>
                <Average q={q} a={a} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-ttfc-muted" aria-live="polite">
          {res.loading ? "Loading…" : `${num(total)} ${total === 1 ? "response" : "responses"}`}{res.refreshing && !res.loading ? " · updating…" : ""}
        </p>
        <div className="ml-auto flex gap-2">
          <Button icon={RefreshCw} onClick={res.reload}>Refresh</Button>
          <Button icon={Download} loading={exporting} disabled={!total} onClick={exportCsv} title="Every response, every question (questions taken out of the survey too)">Export CSV</Button>
        </div>
      </div>

      {res.loading ? <LoadingState label="Loading the answers…" /> : res.error && !res.data ? (
        <ErrorState error={res.error} onRetry={res.reload} title={res.error?.status === 404 ? "Not available yet: the server needs the latest backend update" : "Couldn't load the answers"} />
      ) : !rows.length ? (
        <EmptyState icon={MessageSquareText} title="No answers yet" body="Answers appear here as soon as people send the survey from /survey or the apps." />
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <th>When</th><th>Person</th><th>From</th>
                {questions.map((q) => <th key={q.id} className="max-w-[220px]"><span className="line-clamp-2" title={q.label}>{q.label}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap text-ttfc-muted">{when(r.at)}</td>
                  <td className="max-w-[240px]">
                    <span className="block truncate font-semibold text-ttfc-text" title={r.name}>{r.name || <span className="font-normal text-ttfc-dim">No name</span>}</span>
                    {(r.title || r.company) && <span className="block truncate text-xs text-ttfc-muted">{[r.title, r.company].filter(Boolean).join(" · ")}</span>}
                    {r.email && <a href={`mailto:${r.email}`} className="block truncate font-mono text-[11px] text-ttfc-dim hover:text-ttfc-pink hover:underline">{r.email}</a>}
                  </td>
                  <td className="whitespace-nowrap text-xs text-ttfc-muted">{SOURCE_LABEL[r.source] || r.source || "—"}</td>
                  {questions.map((q) => {
                    const t = answerText(q, r.answers?.[q.id]);
                    return <td key={q.id} className="max-w-[260px] text-sm"><span className="line-clamp-3 whitespace-pre-line" title={t}>{t || <span className="text-ttfc-dim">—</span>}</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <Button icon={ChevronLeft} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
              <span className="text-sm text-ttfc-muted">Page {page + 1} of {pages}</span>
              <Button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ================= Questions ================= */

/** The list kept in section order (sections in the order they first appear), as /survey shows it. */
const bySection = (list) => groupSections(list).flatMap((g) => g.questions);

function QuestionEditor({ questions, onChange, readOnly, problems, dark }) {
  const [open, setOpen] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [adding, setAdding] = useState(false);
  const list = useMemo(() => bySection(questions || []), [questions]);
  const groups = groupSections(list);
  const sections = sectionNames(list);
  const commit = (next) => onChange(bySection(next));
  const problemsFor = (q) => problems.filter((p) => p.where === `q:${q.key}`).map((p) => p.message);
  const numberOf = new Map(list.map((q, i) => [q.key, i + 1]));
  // The questions another can depend on: pick-one / pick-any questions above it, with text and options.
  const controlsBefore = (index) => list.slice(0, Math.max(0, index)).filter((x) => CAN_CONTROL.includes(x.type) && x.label.trim() && (x.options || []).some((o) => o.trim()));
  const setSectionShowIf = (title, showIf) => commit(list.map((q) => ((q.section || "") === title ? { ...q, showIf } : q)));

  // A problem found on Save opens the first question that has one (when the list of problems changes).
  const [seenProblems, setSeenProblems] = useState(problems);
  if (problems !== seenProblems) {
    setSeenProblems(problems);
    const first = problems.find((p) => p.where.startsWith("q:"));
    if (first) setOpen(first.where.slice(2));
  }

  const setQ = (key, next) => commit(list.map((q) => (q.key === key ? next : q)));
  const moveQ = (key, dir) => {
    const i = list.findIndex((q) => q.key === key);
    const j = i + dir;
    if (j < 0 || j >= list.length || (list[j].section || "") !== (list[i].section || "")) return;
    commit(moveItem(list, i, j));
  };
  const removeQ = (key) => { commit(list.filter((q) => q.key !== key)); setConfirmDelete(""); if (open === key) setOpen(""); };
  const addTo = (section, type = "rating") => {
    const q = blankQuestion(type, section);
    const last = list.map((x) => x.section || "").lastIndexOf(section);
    const next = [...list];
    next.splice(last < 0 ? next.length : last + 1, 0, q);
    commit(next);
    setOpen(q.key);
  };
  const moveSection = (gi, dir) => {
    const g = [...groups];
    const j = gi + dir;
    if (j < 0 || j >= g.length) return;
    [g[gi], g[j]] = [g[j], g[gi]];
    onChange(g.flatMap((x) => x.questions));
  };

  return (
    <div className="space-y-5">
      <Banner tone="info" icon={Info}>
        Questions show on /survey in this order, under their section. Deleting a question keeps the answers already given: they stay in the CSV export.
        {readOnly ? "" : " Nothing changes for people until you click Save."}
      </Banner>
      {problems.some((p) => p.where === "questions") && (
        <p role="alert" className="text-sm text-red-300">{problems.filter((p) => p.where === "questions").map((p) => p.message).join(" ")}</p>
      )}

      {!list.length && <EmptyState icon={ClipboardList} title="No questions yet" body={readOnly ? "Management adds the questions." : "Add a section and its first question below."} />}

      {groups.map((g, gi) => (
        <Card key={`sec-${gi}`} className="p-4 sm:p-5">
          <SectionHead title={g.title} index={gi} total={groups.length} count={g.questions.length} readOnly={readOnly} taken={sections}
            onRename={(name) => onChange(renameSection(list, g.title, name))} onMove={(dir) => moveSection(gi, dir)}
            questions={g.questions} controls={controlsBefore(list.findIndex((x) => x.key === g.questions[0]?.key))}
            onShowIf={(showIf) => setSectionShowIf(g.title, showIf)} />
          <ol className="mt-3 space-y-2">
            {g.questions.map((q, qi) => {
              const n = numberOf.get(q.key);
              return (
                <QuestionRow key={q.key} q={q} number={n} open={open === q.key} onToggle={() => setOpen(open === q.key ? "" : q.key)}
                  canUp={qi > 0} canDown={qi < g.questions.length - 1} onMove={(dir) => moveQ(q.key, dir)}
                  confirming={confirmDelete === q.key} onAskDelete={() => setConfirmDelete(q.key)} onCancelDelete={() => setConfirmDelete("")} onDelete={() => removeQ(q.key)}
                  onChange={(next) => setQ(q.key, next)} sections={sections} readOnly={readOnly} problems={problemsFor(q)} dark={dark}
                  controls={controlsBefore(list.findIndex((x) => x.key === q.key))} all={list} />
              );
            })}
          </ol>
          {!readOnly && (
            <Button size="sm" variant="ghost" icon={Plus} className="mt-3" disabled={list.length >= LIMITS.questions} onClick={() => addTo(g.title)}>
              Add a question{g.title ? ` to “${g.title}”` : ""}
            </Button>
          )}
        </Card>
      ))}

      {!readOnly && (adding
        ? <AddSection taken={sections} onCancel={() => setAdding(false)} onAdd={(name, type) => { addTo(name, type); setAdding(false); }} />
        : <Button icon={Plus} disabled={list.length >= LIMITS.questions} onClick={() => setAdding(true)}>Add a section</Button>)}
    </div>
  );
}

function SectionHead({ title, index, total, count, readOnly, taken, onRename, onMove, questions, controls, onShowIf }) {
  const [name, setName] = useState(title);
  const [err, setErr] = useState("");
  const apply = () => {
    const next = name.replace(/\s+/g, " ").trim();
    if (next === title) { setErr(""); return; }
    if (next && taken.includes(next)) { setErr("Another section has this name."); return; }
    setErr("");
    onRename(next);
  };
  const inputId = `sec-name-${index}`;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[200px] flex-1">
        <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ttfc-orange">Section {index + 1} · {count} {count === 1 ? "question" : "questions"}</label>
        {readOnly
          ? <p className="mt-1 text-base font-semibold">{title || <span className="text-ttfc-dim">No section heading</span>}</p>
          : <Input id={inputId} value={name} maxLength={LIMITS.section} placeholder="No section heading" className="mt-1 font-semibold"
            onChange={(e) => setName(e.target.value)} onBlur={apply} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } if (e.key === "Escape") { setName(title); setErr(""); } }}
            aria-describedby={err ? `${inputId}-err` : undefined} aria-invalid={err ? true : undefined} />}
        {err && <p id={`${inputId}-err`} className="mt-1 text-xs text-red-300" role="alert">{err}</p>}
      </div>
      {!readOnly && total > 1 && (
        <div className="flex gap-1">
          <IconButton icon={ArrowUp} label="Move this section up" disabled={index === 0} onClick={() => onMove(-1)} />
          <IconButton icon={ArrowDown} label="Move this section down" disabled={index === total - 1} onClick={() => onMove(1)} />
        </div>
      )}
      <SectionShowIf questions={questions} controls={controls} readOnly={readOnly} onChange={onShowIf} idBase={`sec-${index}`} />
    </div>
  );
}

const sameShowIf = (a, b) => (a?.question || "") === (b?.question || "") && (a?.includes || "") === (b?.includes || "");

/** "Who sees this section": the same "Show only if" for every question in it (or "set per question" when they differ). */
function SectionShowIf({ questions, controls, readOnly, onChange, idBase }) {
  const first = questions[0]?.showIf || null;
  const uniform = questions.every((q) => sameShowIf(q.showIf, first));
  const [mixedOpen, setMixedOpen] = useState(false);
  if (!controls.length && !first) return null;
  return (
    <div className="w-full">
      {uniform || mixedOpen ? (
        <ShowIfPicker value={uniform ? first : null} controls={controls} readOnly={readOnly} onChange={(v) => { onChange(v); setMixedOpen(false); }}
          idBase={idBase} label="Who sees this section" alwaysLabel="Everyone" />
      ) : (
        <p className="text-xs text-ttfc-muted">
          Who sees this section: set per question.{" "}
          {!readOnly && <button type="button" className={cx("font-semibold text-ttfc-pink hover:underline", focusRing)} onClick={() => setMixedOpen(true)}>Set it for the whole section</button>}
        </p>
      )}
    </div>
  );
}

const short = (t, n = 48) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/** "Always" or "Only if <question> includes <option>": `controls` are the pick-one / pick-any questions above. */
function ShowIfPicker({ value, controls, readOnly, onChange, idBase, label = "Show this question", alwaysLabel = "Always" }) {
  const sel = value?.question || "";
  const ctl = controls.find((c) => c.key === sel || (c.id && c.id === sel));
  const options = (ctl?.options || []).map((o) => o.trim()).filter(Boolean);
  const missing = !!sel && !ctl;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label={label} hint={sel ? "Hidden for everyone else: nothing is asked or sent for it." : controls.length ? "Or only for people who gave an answer above." : "Add a pick-one or pick-any question above to show this only for some answers."}>
        {(id) => (
          <Select id={id} value={missing ? "__missing" : ctl ? ctl.key : ""} disabled={readOnly || (!controls.length && !sel)}
            onChange={(e) => {
              const key = e.target.value;
              if (!key) { onChange(null); return; }
              const c = controls.find((x) => x.key === key);
              if (c) onChange({ question: c.key, includes: (c.options || []).map((o) => o.trim()).find(Boolean) || "" });
            }}>
            <option value="">{alwaysLabel}</option>
            {missing && <option value="__missing" disabled>A question that's no longer above: choose again</option>}
            {controls.map((c) => <option key={c.key} value={c.key}>Only if “{short(c.label)}” includes…</option>)}
          </Select>
        )}
      </Field>
      {ctl && (
        <Field label="…this answer" id={`${idBase}-showif-opt`}>
          {(id) => (
            <Select id={id} value={options.includes(value.includes) ? value.includes : ""} disabled={readOnly} onChange={(e) => onChange({ question: ctl.key, includes: e.target.value })}>
              {!options.includes(value.includes) && <option value="" disabled>{value.includes ? `“${value.includes}” isn't an option any more` : "Choose an answer"}</option>}
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          )}
        </Field>
      )}
    </div>
  );
}

function AddSection({ taken, onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("rating");
  const [err, setErr] = useState("");
  const add = () => {
    const next = name.replace(/\s+/g, " ").trim();
    if (!next) { setErr("Give the section a heading."); return; }
    if (taken.includes(next)) { setErr("There's already a section with this heading."); return; }
    onAdd(next, type);
  };
  return (
    <Card className="p-4 sm:p-5">
      <SectionTitle hint="A section is a heading on /survey with its questions under it. It starts with one question.">Add a section</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <Field label="Section heading" error={err}>
          {(id) => <Input id={id} value={name} maxLength={LIMITS.section} placeholder="e.g. Next year" data-autofocus autoFocus onChange={(e) => { setName(e.target.value); setErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } if (e.key === "Escape") onCancel(); }} />}
        </Field>
        <Field label="Its first question">
          {(id) => <Select id={id} value={type} onChange={(e) => setType(e.target.value)}>{QUESTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</Select>}
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" icon={Plus} onClick={add}>Add the section</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

function QuestionRow({ q, number, open, onToggle, canUp, canDown, onMove, confirming, onAskDelete, onCancelDelete, onDelete, onChange, sections, readOnly, problems, dark, controls, all }) {
  const dependents = all.filter((x) => x.showIf?.question === q.key).length;
  const bad = problems.length > 0;
  return (
    <li className={cx("rounded-2xl border bg-ttfc-panel2/40", bad ? "border-red-400/50" : open ? "border-ttfc-purple/50" : "border-ttfc-line")}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="w-6 flex-none text-right font-mono text-xs text-ttfc-dim">{number}</span>
        <button type="button" onClick={onToggle} aria-expanded={open} className={cx("min-w-0 flex-1 rounded-lg text-left", focusRing)}>
          <span className="block truncate text-sm font-semibold">{q.label || <span className="italic text-ttfc-dim">New question: add its text</span>}</span>
          <span className="mt-1 flex flex-wrap gap-1">
            <Badge tone="purple">{TYPE_LABELS[q.type]}</Badge>
            {q.required && <Badge tone="pink">Required</Badge>}
            {q.allowNA && HAS_NA.includes(q.type) && <Badge>N/A allowed</Badge>}
            {q.showIf && <Badge tone="orange">Only if “{short(q.showIf.includes, 24)}”</Badge>}
            {!q.id && <Badge tone="good">New</Badge>}
            {bad && <Badge tone="bad">Needs a fix</Badge>}
          </span>
        </button>
        {!readOnly && (
          <>
            <IconButton icon={ArrowUp} label={`Move question ${number} up`} disabled={!canUp} onClick={() => onMove(-1)} />
            <IconButton icon={ArrowDown} label={`Move question ${number} down`} disabled={!canDown} onClick={() => onMove(1)} />
            <IconButton icon={Trash2} label={`Delete question ${number}`} onClick={onAskDelete} className="hover:text-red-300" />
          </>
        )}
        <IconButton icon={open ? X : Pencil} label={open ? `Close question ${number}` : readOnly ? `View question ${number}` : `Edit question ${number}`} onClick={onToggle} />
      </div>
      {confirming && (
        <div className="flex flex-wrap items-center gap-2 border-t border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm" role="alert">
          <span className="min-w-[200px] flex-1">
            Delete “{q.label || "this new question"}”? Answers already given stay in the CSV export.
            {dependents > 0 && ` ${dependents === 1 ? "One question is" : `${dependents} questions are`} shown only for an answer to it: choose again for ${dependents === 1 ? "it" : "them"} after deleting.`}
          </span>
          <Button size="sm" variant="danger" icon={Trash2} onClick={onDelete}>Yes, delete</Button>
          <Button size="sm" onClick={onCancelDelete} data-autofocus>No, keep it</Button>
        </div>
      )}
      {bad && open && <ul className="mx-3 mb-1 list-disc pl-5 text-xs text-red-300" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      {open && <QuestionForm q={q} number={number} onChange={onChange} sections={sections} readOnly={readOnly} dark={dark} controls={controls} />}
    </li>
  );
}

function QuestionForm({ q, number, onChange, sections, readOnly, dark, controls }) {
  const set = (patch) => onChange({ ...q, ...patch });
  const opts = q.options || [];
  const setOpt = (i, v) => set({ options: opts.map((o, k) => (k === i ? v : o)) });
  const [pv, setPv] = useState(undefined);
  const shown = normalizeQuestion(q);
  const previewQ = { ...shown, id: q.key, label: shown.label || "Your question" };
  const base = `qf-${q.key}`;
  return (
    <div className="grid gap-4 border-t border-ttfc-line px-3 pb-4 pt-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-4">
        <Field label="Question" required>
          {(id) => <Input id={id} value={q.label} maxLength={LIMITS.label} placeholder="e.g. Overall, how was TTFC 2026?" onChange={(e) => set({ label: e.target.value })} disabled={readOnly} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" hint="Changing it keeps the question's text.">
            {(id) => (
              <Select id={id} value={q.type} onChange={(e) => onChange(changeType(q, e.target.value))} disabled={readOnly}>
                {QUESTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Section" hint="Rename or add sections with their headings.">
            {(id) => (
              <Select id={id} value={q.section || ""} onChange={(e) => set({ section: e.target.value })} disabled={readOnly}>
                {[...new Set(["", ...sections])].map((s) => <option key={s || "none"} value={s}>{s || "No section heading"}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Help text" hint="Optional: a line under the question.">
          {(id) => <Input id={id} value={q.help} maxLength={LIMITS.help} onChange={(e) => set({ help: e.target.value })} disabled={readOnly} />}
        </Field>

        {HAS_OPTIONS.includes(q.type) && (
          <fieldset className="flex flex-col gap-2" disabled={readOnly}>
            <legend className="mb-1.5 text-[13px] font-semibold text-ttfc-text/90">Options <span className="font-normal text-ttfc-dim">({q.type === "multi" ? "people pick any" : "people pick one"}; at least two)</span></legend>
            <ol className="flex flex-col gap-2">
              {opts.map((o, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-5 flex-none text-right font-mono text-xs text-ttfc-dim" aria-hidden="true">{i + 1}</span>
                  <Input value={o} maxLength={LIMITS.option} aria-label={`Option ${i + 1}`} placeholder={`Option ${i + 1}`} id={`${base}-opt-${i}`} onChange={(e) => setOpt(i, e.target.value)} />
                  {!readOnly && (
                    <>
                      <IconButton icon={ArrowUp} label={`Move option ${i + 1} up`} disabled={i === 0} onClick={() => set({ options: moveItem(opts, i, i - 1) })} />
                      <IconButton icon={ArrowDown} label={`Move option ${i + 1} down`} disabled={i === opts.length - 1} onClick={() => set({ options: moveItem(opts, i, i + 1) })} />
                      <IconButton icon={X} label={`Remove option ${i + 1}`} onClick={() => set({ options: opts.filter((_, k) => k !== i) })} className="hover:text-red-300" />
                    </>
                  )}
                </li>
              ))}
            </ol>
            {!readOnly && (
              <Button size="sm" variant="ghost" icon={Plus} className="self-start" disabled={opts.length >= LIMITS.options}
                onClick={() => { set({ options: [...opts, ""] }); setTimeout(() => document.getElementById(`${base}-opt-${opts.length}`)?.focus(), 0); }}>
                Add an option
              </Button>
            )}
          </fieldset>
        )}

        {HAS_SCALE.includes(q.type) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={q.type === "nps" ? "Words under 0" : "Words under 1 star"} hint="Optional">
              {(id) => <Input id={id} value={q.minLabel} maxLength={LIMITS.scaleLabel} placeholder={q.type === "nps" ? "Not likely" : "Poor"} onChange={(e) => set({ minLabel: e.target.value })} disabled={readOnly} />}
            </Field>
            <Field label={q.type === "nps" ? "Words under 10" : "Words under 5 stars"} hint="Optional">
              {(id) => <Input id={id} value={q.maxLabel} maxLength={LIMITS.scaleLabel} placeholder={q.type === "nps" ? "Very likely" : "Excellent"} onChange={(e) => set({ maxLabel: e.target.value })} disabled={readOnly} />}
            </Field>
          </div>
        )}

        <Switch checked={q.required} onChange={(v) => set({ required: v })} disabled={readOnly} label="Required"
          description={q.type === "consent" ? "People must tick the box to send the survey." : "Off: people can skip it (the default). On: they can't send the survey without answering it."} />
        {HAS_NA.includes(q.type) && (
          <Switch checked={!!q.allowNA} onChange={(v) => set({ allowNA: v })} disabled={readOnly} label="Allow N/A"
            description="Adds an N/A choice. N/A answers are counted apart and left out of the averages." />
        )}
        <ShowIfPicker value={q.showIf} controls={controls} readOnly={readOnly} onChange={(showIf) => set({ showIf })} idBase={`qf-${q.key}`} />
        <p className="text-xs text-ttfc-dim">
          {q.id ? <>Answer key <span className="font-mono">{q.id}</span> (the CSV column; it stays the same when you edit the question).</> : "New: its answer key is made from the question text when you save."}
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ttfc-dim">How it looks on /survey</p>
        <div className="rounded-2xl border border-ttfc-line p-4" style={{ ...surveyVars(dark), background: "var(--sv-bg)", color: "var(--sv-text)" }}>
          {HAS_OPTIONS.includes(q.type) && !shown.options.length
            ? <p className="text-sm" style={{ color: "var(--sv-mid)" }}>Add options to see them here.</p>
            : <SurveyQuestion q={previewQ} number={number} idBase="pv" value={pv} onChange={setPv} />}
        </div>
        <p className="mt-2 text-xs text-ttfc-dim">Try it: answers here aren't saved.</p>
      </div>
    </div>
  );
}

/* ================= Settings ================= */

function SettingsForm({ form, update, readOnly, problems, notifiedAt, progress }) {
  const err = (where) => problems.filter((p) => p.where === where).map((p) => p.message).join(" ") || undefined;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
      <Card>
        <SectionTitle hint="Saved for everyone: /survey and the apps pick changes up within about a minute.">The survey</SectionTitle>
        <div className="flex flex-col gap-5">
          <Switch checked={form.enabled} onChange={(v) => update({ enabled: v })} disabled={readOnly} label="Survey on"
            description="On: /survey opens at the time below and the apps show a card on Home from then. Off: /survey says it's closed and the apps show nothing." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opens at" hint="Toronto time" error={err("opensAt")}>
              {(id) => <Input id={id} type="datetime-local" value={form.opensAt} onChange={(e) => update({ opensAt: e.target.value })} disabled={readOnly} />}
            </Field>
            <Field label="Closes at" hint="Toronto time" error={err("closesAt")}>
              {(id) => <Input id={id} type="datetime-local" value={form.closesAt} onChange={(e) => update({ closesAt: e.target.value })} disabled={readOnly} />}
            </Field>
          </div>
          <Field label="Title" hint="The page's heading.">
            {(id) => <Input id={id} value={form.title} maxLength={LIMITS.title} placeholder={SURVEY_DEFAULTS.title} onChange={(e) => update({ title: e.target.value })} disabled={readOnly} />}
          </Field>
          <Field label="Introduction" hint="Under the title.">
            {(id) => <Textarea id={id} rows={3} value={form.intro} maxLength={LIMITS.intro} placeholder={SURVEY_DEFAULTS.intro} onChange={(e) => update({ intro: e.target.value })} disabled={readOnly} />}
          </Field>
          <Field label="Thank-you message" hint="Shown after someone sends their answers.">
            {(id) => <Textarea id={id} rows={3} value={form.thankYou} maxLength={LIMITS.thankYou} placeholder={SURVEY_DEFAULTS.thankYou} onChange={(e) => update({ thankYou: e.target.value })} disabled={readOnly} />}
          </Field>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="The in-app notification and push, and the card on the apps' Home.">App notification</SectionTitle>
        <div className="flex flex-col gap-5">
          <Field label="Notification title">
            {(id) => <Input id={id} value={form.notifyTitle} maxLength={LIMITS.notifyTitle} placeholder={SURVEY_DEFAULTS.notifyTitle} onChange={(e) => update({ notifyTitle: e.target.value })} disabled={readOnly} />}
          </Field>
          <Field label="Notification text">
            {(id) => <Textarea id={id} rows={3} value={form.notifyBody} maxLength={LIMITS.notifyBody} placeholder={SURVEY_DEFAULTS.notifyBody} onChange={(e) => update({ notifyBody: e.target.value })} disabled={readOnly} />}
          </Field>
          <div className="rounded-2xl border border-ttfc-line bg-ttfc-panel2/60 p-3" aria-label="Notification preview">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">
              <img src="/app/icons/icon-96.png" alt="" width="18" height="18" className="rounded" /> TTFC · now
            </p>
            <p className="mt-1 text-sm font-semibold">{form.notifyTitle.trim() || SURVEY_DEFAULTS.notifyTitle}</p>
            <p className="text-sm text-ttfc-muted">{form.notifyBody.trim() || SURVEY_DEFAULTS.notifyBody}</p>
          </div>
          <div className="rounded-2xl border border-ttfc-line p-4">
            <Switch checked={form.autoNotify} onChange={(v) => update({ autoNotify: v })} disabled={readOnly}
              label={`Automatic app notification: ${notifyPlanText(form)}`}
              description={form.autoNotify
                ? "People on the app who checked in and haven't answered get this notification once each, in small waves, so the server and the team aren't flooded."
                : "Off: nothing is sent automatically. Send it yourself with “Send the app notification now” (Share & send)."} />
            {form.autoNotify && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Field label="Start" hint="Minutes after the survey opens" error={err("notifyStartDelayMin")}>
                  {(id) => <Input id={id} type="number" inputMode="numeric" min={NOTIFY_LIMITS.delay.min} max={NOTIFY_LIMITS.delay.max} value={form.notifyStartDelayMin} onChange={(e) => update({ notifyStartDelayMin: e.target.value })} disabled={readOnly} />}
                </Field>
                <Field label="People per wave" hint={`${NOTIFY_LIMITS.batch.min}–${NOTIFY_LIMITS.batch.max}`} error={err("notifyBatchSize")}>
                  {(id) => <Input id={id} type="number" inputMode="numeric" min={NOTIFY_LIMITS.batch.min} max={NOTIFY_LIMITS.batch.max} value={form.notifyBatchSize} onChange={(e) => update({ notifyBatchSize: e.target.value })} disabled={readOnly} />}
                </Field>
                <Field label="Every" hint="Minutes between waves" error={err("notifyIntervalMin")}>
                  {(id) => <Input id={id} type="number" inputMode="numeric" min={NOTIFY_LIMITS.interval.min} max={NOTIFY_LIMITS.interval.max} value={form.notifyIntervalMin} onChange={(e) => update({ notifyIntervalMin: e.target.value })} disabled={readOnly} />}
                </Field>
              </div>
            )}
            {progressText(progress) && <p className="mt-3"><Badge tone={progress?.done ? "good" : "purple"} icon={BellRing}>{progressText(progress)}</Badge></p>}
            {notifiedAt && <p className="mt-2 text-xs text-ttfc-muted">Last sent by hand {when(notifiedAt)}.</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ================= Share & send ================= */

const CLOSED_TEXT = "The survey isn't open yet, so it can't be sent. Try again once it opens.";

/** Type SEND to confirm; the server's error shows inside and the dialog stays open. */
function ConfirmSend({ title, description, confirmLabel, icon, onConfirm, onClose, children }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const armed = typed.trim() === "SEND";
  const go = async () => {
    if (!armed || busy) return;
    setBusy(true); setErr("");
    try { await onConfirm(); onClose(); } catch (e) { setErr(e?.code === "closed" ? CLOSED_TEXT : e?.message || "Something went wrong"); setBusy(false); }
  };
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} size="md" tone="danger" title={title} description={description}
      footer={(
        <>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" icon={icon} loading={busy} disabled={!armed} onClick={go}>{confirmLabel}</Button>
        </>
      )}>
      <div className="flex flex-col gap-4 text-sm">
        {children}
        <Field label={<>Type <span className="font-mono">SEND</span> to confirm</>}>
          {(id) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="SEND" className="font-mono" disabled={busy} data-autofocus />}
        </Field>
        {err && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">{err}</p>}
      </div>
    </Modal>
  );
}

function SendPanel({ config, progress, dirty, isManagement, onPreview, onSent, blocker }) {
  const toast = useToast();
  const [asking, setAsking] = useState("");
  const [audience, setAudience] = useState("day1");
  const [lastNotify, setLastNotify] = useState(null);
  const [lastEmail, setLastEmail] = useState(null);
  const email = useApi(surveyApi.emailPath(audience));
  const aud = AUDIENCES.find((a) => a.key === audience) || AUDIENCES[0];
  const e = email.data;
  const count = Number(e?.count) || 0;
  const sample = Array.isArray(e?.sample) ? e.sample.filter((x) => typeof x === "string" && x.trim()).slice(0, 8) : [];
  const notifyTitle = (config?.notifyTitle || "").trim() || SURVEY_DEFAULTS.notifyTitle;
  const notifyBody = (config?.notifyBody || "").trim() || SURVEY_DEFAULTS.notifyBody;
  const n = (v) => (Array.isArray(v) ? v.length : Number(v) || 0);

  return (
    <div className="space-y-6">
      {dirty && (
        <Banner tone="warn" icon={Info} title="You have unsaved changes">Save them (Questions or Settings) before sending, so people get the survey you see.</Banner>
      )}

      <Banner tone="info" icon={Lock} title="By invitation only">
        There's no public link: /survey without a personal link says “This survey is by invitation”, and people who didn't check in can't answer.
        {" "}<button type="button" className={cx("font-semibold underline", focusRing)} onClick={onPreview}>Preview the survey</button> (nothing is sent).
      </Banner>

      <PersonalLink isManagement={isManagement} />
      <ListLinks isManagement={isManagement} />

      <Card>
        <SectionTitle hint="An in-app notification and a push, now, to everyone on the TTFC app who checked in and hasn't answered (people already notified by the automatic waves aren't told twice by the server).">Send the app notification now</SectionTitle>
        <div className="rounded-2xl border border-ttfc-line bg-ttfc-panel2/60 p-3">
          <p className="text-sm font-semibold">{notifyTitle}</p>
          <p className="text-sm text-ttfc-muted">{notifyBody}</p>
        </div>
        <p className="mt-3 text-xs text-ttfc-dim">
          Automatic app notification: <b className="text-ttfc-text">{notifyPlanText(config)}</b> (Settings).
          {progressText(progress) ? ` ${progressText(progress)}.` : ""}
          {config?.notifiedAt ? ` Last sent by hand ${when(config.notifiedAt)}.` : ""}
        </p>
        {lastNotify && <Banner tone="good" icon={BellRing} className="mt-3" title={`Sent to ${num(n(lastNotify.sent))} ${n(lastNotify.sent) === 1 ? "person" : "people"}`}>{when(lastNotify.at)}</Banner>}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ttfc-line pt-4">
          <Button variant="primary" icon={BellRing} disabled={!!blocker} onClick={() => setAsking("notify")}>Send the app notification now</Button>
          {blocker && <span className="text-xs text-ttfc-dim">{blocker}</span>}
        </div>
      </Card>

      <Card>
        <SectionTitle hint="The survey by email, with each person's own link. Choose who gets it; you see how many people and the email itself before anything is sent.">Email the survey</SectionTitle>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Who gets the email">
          {AUDIENCES.map((a) => (
            <button key={a.key} type="button" role="radio" aria-checked={audience === a.key} onClick={() => setAudience(a.key)}
              className={cx("rounded-xl border px-3.5 py-2 text-left text-sm transition", audience === a.key ? "border-ttfc-purple bg-ttfc-purple/15 text-ttfc-text" : "border-ttfc-line text-ttfc-muted hover:text-ttfc-text", focusRing)}>
              <span className="block font-semibold">{a.label}</span>
              <span className="block text-xs text-ttfc-dim">{a.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-ttfc-line p-4" aria-live="polite">
          {email.loading && !e ? <p className="text-sm text-ttfc-muted">Counting…</p> : email.error && !e ? (
            <p className="text-sm text-red-300">{email.error?.status === 404 ? "Not available yet: the server needs the latest backend update." : email.error.message}</p>
          ) : (
            <>
              <p className="text-2xl font-bold tabular-nums">{num(count)} <span className="text-base font-medium text-ttfc-muted">{count === 1 ? "person" : "people"} · {aud.label.toLowerCase()}</span></p>
              {sample.length > 0 && (
                <p className="mt-1 text-sm text-ttfc-muted">
                  For example {sample.join(", ")}{count > sample.length ? ` and ${num(count - sample.length)} more` : ""}.
                </p>
              )}
              {alreadyAnswered(e) !== null && (
                <p className="mt-2"><Badge tone="good" icon={CheckCircle2}>Already answered: {num(alreadyAnswered(e))} (won't be emailed)</Badge></p>
              )}
              {email.refreshing && <p className="mt-1 text-xs text-ttfc-dim">Updating…</p>}
            </>
          )}
        </div>

        {lastEmail && (
          <Banner tone="good" icon={Mail} className="mt-4" title={`Emailed ${num(n(lastEmail.sent))} ${n(lastEmail.sent) === 1 ? "person" : "people"} (${lastEmail.label.toLowerCase()})`}>
            {n(lastEmail.skipped) ? `${num(n(lastEmail.skipped))} skipped by the server (for example, people who already answered or unsubscribed). ` : ""}{when(lastEmail.at)}
          </Banner>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ttfc-line pt-4">
          <Button variant="primary" icon={Send} disabled={!!blocker || !count} onClick={() => setAsking("email")}>Email the survey</Button>
          <span className="text-xs text-ttfc-dim">{blocker || (!count && e ? "Nobody to email for this choice." : `To ${num(count)} ${count === 1 ? "person" : "people"}; you confirm by typing SEND.`)}</span>
        </div>

        {(e?.html || e?.text) && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ttfc-dim">The email</p>
            <EmailPreview preview={e} loading={email.refreshing} error={email.error} title="Survey email preview" />
          </div>
        )}
      </Card>

      {asking === "notify" && isManagement && (
        <ConfirmSend title="Send the app notification now?" icon={BellRing} confirmLabel="Send the app notification now" onClose={() => setAsking("")}
          description="Everyone signed in to the TTFC app who hasn't answered gets it in the app and as a push on their phone. It can't be undone."
          onConfirm={async () => {
            const r = await surveyApi.notify();
            setLastNotify({ sent: r?.sent ?? 0, at: new Date().toISOString() });
            toast.success(`App notification sent to ${num(n(r?.sent))}`);
            onSent();
          }}>
          <div className="rounded-xl border border-ttfc-line px-3 py-2"><b className="block">{notifyTitle}</b><span className="text-ttfc-muted">{notifyBody}</span></div>
        </ConfirmSend>
      )}
      {asking === "email" && isManagement && (
        <ConfirmSend title={`Email the survey to ${num(count)} ${count === 1 ? "person" : "people"}?`} icon={Send} confirmLabel="Email the survey" onClose={() => setAsking("")}
          description={`${aud.label}. Each gets the email shown on this page with their own link. It can't be undone.`}
          onConfirm={async () => {
            const r = await surveyApi.email(audience);
            setLastEmail({ sent: r?.sent ?? 0, skipped: r?.skipped ?? 0, label: aud.label, at: new Date().toISOString() });
            toast.success(`Survey emailed to ${num(n(r?.sent))}`);
            email.reload();
            onSent();
          }}>
          {e?.subject && <p className="rounded-xl border border-ttfc-line px-3 py-2"><span className="text-ttfc-dim">Subject: </span>{e.subject}</p>}
        </ConfirmSend>
      )}
    </div>
  );
}

/* ================= Personal links ================= */

/** "✓ Answered on …", "Emailed on …", "App notified on …" (Toronto time), so nobody is sent it twice. */
function TrackBadges({ row }) {
  return (
    <>
      {Number.isFinite(row.answeredAt) && <Badge tone="good">✓ Answered on {torontoShort(row.answeredAt)}</Badge>}
      {Number.isFinite(row.emailedAt) && <Badge tone="purple" icon={Mail}>Emailed on {torontoShort(row.emailedAt)}</Badge>}
      {Number.isFinite(row.appNotifiedAt) && <Badge icon={BellRing}>App notified on {torontoShort(row.appNotifiedAt)}</Badge>}
    </>
  );
}

/** "Not checked in — the survey will refuse them" (the organiser: "you can't survey if you haven't attended or checked in"). */
function CheckInBadge({ row }) {
  if (row.checkedIn === false) return <Badge tone="bad" icon={UserRoundX}>Not checked in — the survey will refuse them</Badge>;
  if (row.checkedIn === true) return <Badge tone="good" icon={CheckCircle2}>Checked in</Badge>;
  return null;
}

async function copyText(text, toast, done = "Copied") {
  try { await navigator.clipboard.writeText(text); toast.success(done); } catch { toast.error("Couldn't copy. Select the text and copy it."); }
}

/** One attendee's own link, found by email, to share one on one. */
function PersonalLink({ isManagement }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [row, setRow] = useState(null);
  const [err, setErr] = useState("");
  const find = async (e) => {
    e?.preventDefault();
    const v = parseEmails(email).emails[0];
    if (!v) { setErr("Enter the attendee's email address."); setRow(null); return; }
    setBusy(true); setErr(""); setRow(null);
    try { setRow(linkRowFrom({ email: v, ...(await surveyApi.link(v)) })); } catch (ex) { setErr(ex?.status === 404 ? "Nobody with a pass or an app account has this email." : ex?.message || "Couldn't find them"); } finally { setBusy(false); }
  };
  return (
    <Card>
      <SectionTitle hint="Their own link fills in who they are. Share it with that person only: anyone with it answers as them.">Personal link for an attendee</SectionTitle>
      {!isManagement ? <p className="text-sm text-ttfc-muted">Personal links are for management.</p> : (
        <>
          <form onSubmit={find} className="flex flex-col gap-2 sm:flex-row">
            <Input type="email" inputMode="email" autoComplete="off" spellCheck={false} value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }}
              placeholder="their email, e.g. priya@dhl.com" aria-label="The attendee's email" className="sm:max-w-sm" />
            <Button type="submit" icon={Link2} loading={busy}>Get their link</Button>
          </form>
          {err && <p role="alert" className="mt-2 text-sm text-red-300">{err}</p>}
          {row && (
            <div className="mt-4 rounded-2xl border border-ttfc-line p-4" aria-live="polite">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm">{row.name || "No name"}</b>
                <span className="font-mono text-xs text-ttfc-muted">{row.email}</span>
                <CheckInBadge row={row} />
                <TrackBadges row={row} />
              </div>
              {row.warning && row.checkedIn !== false && <p className="mt-1 text-xs text-amber-200">{row.warning}</p>}
              {row.error && <p className="mt-1 text-xs text-red-300">{row.error}</p>}
              {row.url && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input readOnly value={row.url} aria-label={`${row.name || row.email}'s personal link`} className="font-mono text-xs" onFocus={(ev) => ev.target.select()} />
                  <Button icon={Copy} onClick={() => copyText(row.url, toast, "Personal link copied")}>Copy</Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/** Links for a pasted list of emails: a table, Copy all, and a CSV. */
function ListLinks({ isManagement }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const parsed = parseEmails(text);
  const make = async () => {
    if (!parsed.emails.length) { setErr("Paste at least one email address."); return; }
    setBusy(true); setErr("");
    try {
      const r = await surveyApi.links(parsed.emails);
      const list = Array.isArray(r) ? r : Array.isArray(r?.links) ? r.links : Array.isArray(r?.rows) ? r.rows : [];
      setRows(list.map(linkRowFrom));
    } catch (ex) { setErr(ex?.message || "Couldn't make the links"); } finally { setBusy(false); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([`\uFEFF${linksCsv(rows)}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ttfc-survey-links-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const notIn = (rows || []).filter((r) => r.checkedIn === false).length;
  const withLink = (rows || []).filter((r) => r.url).length;
  return (
    <Card>
      <SectionTitle hint="Paste emails (one per line, commas, or a column from a spreadsheet). You get each person's own link to send one on one.">Links for a list</SectionTitle>
      {!isManagement ? <p className="text-sm text-ttfc-muted">Personal links are for management.</p> : (
        <>
          <Textarea rows={4} value={text} onChange={(e) => { setText(e.target.value); setErr(""); }} placeholder={"priya@dhl.com\ndaniel@lakeshore.ca"} aria-label="Emails" className="font-mono text-xs" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button icon={Link2} loading={busy} disabled={!parsed.emails.length} onClick={make}>Make {parsed.emails.length ? num(parsed.emails.length) : ""} {parsed.emails.length === 1 ? "link" : "links"}</Button>
            <span className="text-xs text-ttfc-dim">{parsed.extra ? `Only the first ${num(parsed.emails.length)}; ${num(parsed.extra)} more left out.` : "Nothing is sent to anyone."}</span>
          </div>
          {err && <p role="alert" className="mt-2 text-sm text-red-300">{err}</p>}
          {rows && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-ttfc-muted" aria-live="polite">
                  {num(withLink)} {withLink === 1 ? "link" : "links"}{notIn ? ` · ${num(notIn)} not checked in` : ""}{rows.length - withLink ? ` · ${num(rows.length - withLink)} without a link` : ""}
                </p>
                <div className="ml-auto flex gap-2">
                  <Button icon={Copy} disabled={!withLink} onClick={() => copyText(linksText(rows), toast, `Copied ${num(withLink)} ${withLink === 1 ? "link" : "links"}`)}>Copy all</Button>
                  <Button icon={Download} disabled={!rows.length} onClick={download}>Download CSV</Button>
                </div>
              </div>
              <TableWrap>
                <thead><tr><th>Name</th><th>Email</th><th>Checked in</th><th>Survey</th><th>Personal link</th><th className="w-20"><span className="sr-only">Copy</span></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.email} className="align-top">
                      <td className="max-w-[200px] truncate font-semibold">{r.name || <span className="font-normal text-ttfc-dim">—</span>}</td>
                      <td className="max-w-[220px] truncate font-mono text-xs text-ttfc-muted">{r.email}</td>
                      <td>{r.checkedIn === null ? <span className="text-xs text-ttfc-dim">—</span> : <CheckInBadge row={r} />}</td>
                      <td><span className="flex flex-wrap gap-1"><TrackBadges row={r} />{!Number.isFinite(r.answeredAt) && !Number.isFinite(r.emailedAt) && !Number.isFinite(r.appNotifiedAt) && <span className="text-xs text-ttfc-dim">—</span>}</span></td>
                      <td className="max-w-[320px]">
                        {r.url ? <span className="block truncate font-mono text-xs" title={r.url}>{r.url}</span> : <span className="text-xs text-red-300">{r.error || "No link"}</span>}
                        {r.warning && r.checkedIn !== false && <span className="block text-[11px] text-amber-200">{r.warning}</span>}
                      </td>
                      <td>{r.url && <Button size="sm" icon={Copy} onClick={() => copyText(r.url, toast, "Personal link copied")} aria-label={`Copy ${r.name || r.email}'s link`}>Copy</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ================= Invitations: who answered, who was told ================= */

const SOURCE_SHORT = { app: "App", link: "Link", email: "Email", ios: "iPhone app", android: "Android app", webapp: "Web app" };

function Invitations() {
  const toast = useToast();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const dq = useDebounced(q.trim(), 300);
  const res = useApi(surveyApi.peoplePath({ status, q: dq, page }));
  const counts = res.data?.counts || {};
  const rows = (res.data?.rows || []).map(peopleRowFrom);
  const total = res.data?.total ?? 0;
  const size = res.data?.size || 50;
  const pages = Math.max(1, Math.ceil(total / size));
  const tile = (label, v, icon, tone, hint) => <StatTile label={label} value={res.data ? num(v ?? 0) : "…"} icon={icon} tone={tone} hint={hint} />;
  const exportCsv = async () => {
    setExporting(true);
    try { await surveyApi.peopleExport({ status, q: dq }); } catch (e) { toast.error(e); } finally { setExporting(false); }
  };
  const time = (ms) => (Number.isFinite(ms) ? <span className="whitespace-nowrap text-xs">{torontoShort(ms)}</span> : <span className="text-xs text-ttfc-dim">—</span>);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {tile("Checked in", counts.checkedIn, Users, "purple", "Can answer")}
        {tile("Answered", counts.answered, CheckCircle2, "good")}
        {tile("Not answered", counts.notAnswered, ClipboardList, "orange")}
        {tile("Emailed", counts.emailed, Mail, "pink")}
        {tile("App notified", counts.appNotified, BellRing, "purple")}
        {tile("On the app", counts.onApp, MessageSquareText, "neutral")}
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Show">
        {PEOPLE_STATUSES.map((x) => {
          const n = x.count(counts);
          return (
            <button key={x.key} type="button" aria-pressed={status === x.key} onClick={() => { setStatus(x.key); setPage(0); }}
              className={cx("inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition", status === x.key ? "bg-ttfc-contrast/10 text-ttfc-text" : "text-ttfc-muted hover:bg-ttfc-contrast/5 hover:text-ttfc-text", focusRing)}>
              {x.label}{Number.isFinite(n) && <span className="rounded-full bg-ttfc-contrast/5 px-1.5 text-[11px] tabular-nums">{num(n)}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, email or company" aria-label="Search the invitations" className="sm:max-w-sm" />
        <p className="text-sm text-ttfc-muted sm:ml-auto" aria-live="polite">
          {res.loading ? "Loading…" : `${num(total)} ${total === 1 ? "person" : "people"}`}{res.refreshing && !res.loading ? " · updating…" : ""} · times in Toronto
        </p>
        <Button icon={RefreshCw} onClick={res.reload}>Refresh</Button>
        <Button icon={Download} loading={exporting} disabled={!total} onClick={exportCsv} title="Everyone matching this filter and search">Export CSV</Button>
      </div>

      {res.loading ? <LoadingState label="Loading who's been invited…" /> : res.error && !res.data ? (
        <ErrorState error={res.error} onRetry={res.reload} title={res.error?.status === 404 ? "Not available yet: the server needs the latest backend update" : "Couldn't load the invitations"} />
      ) : !rows.length ? (
        <EmptyState icon={Users} title={dq || status !== "all" ? "Nobody matches" : "Nobody checked in yet"} body={dq || status !== "all" ? "Try another filter or search." : "People appear here once they've checked in."} />
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr><th>Name</th><th>Company</th><th>On app</th><th>Checked in</th><th>Emailed</th><th>App notified</th><th>Answered</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const answered = Number.isFinite(r.answeredAt);
                return (
                  <tr key={r.email || r.name} className={cx("align-top", answered && "bg-emerald-400/[0.06]")}>
                    <td className="max-w-[240px]">
                      <span className="block truncate font-semibold text-ttfc-text" title={r.name}>{r.name || <span className="font-normal text-ttfc-dim">No name</span>}</span>
                      {r.email && <span className="block truncate font-mono text-[11px] text-ttfc-dim">{r.email}</span>}
                    </td>
                    <td className="max-w-[200px] truncate text-ttfc-muted">{r.company || "—"}</td>
                    <td>{r.onApp ? <Badge tone="purple">On app</Badge> : <span className="text-xs text-ttfc-dim">No</span>}</td>
                    <td className="whitespace-nowrap text-xs">{r.days.length ? r.days.map((d) => `D${d}`).join(" · ") : <span className="text-ttfc-dim">—</span>}</td>
                    <td>{time(r.emailedAt)}</td>
                    <td>{time(r.appNotifiedAt)}</td>
                    <td>
                      {answered ? (
                        <>
                          <Badge tone="good">✓ Answered</Badge>
                          <span className="mt-1 block whitespace-nowrap text-xs text-ttfc-muted">{torontoShort(r.answeredAt)}{r.source ? ` · ${SOURCE_SHORT[r.source] || r.source}` : ""}</span>
                          {Number.isFinite(r.updatedAt) && r.updatedAt > r.answeredAt + 60000 && <span className="block whitespace-nowrap text-[11px] text-ttfc-dim">Updated {torontoShort(r.updatedAt)}</span>}
                        </>
                      ) : <span className="text-xs text-ttfc-dim">Not yet</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <Button icon={ChevronLeft} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
              <span className="text-sm text-ttfc-muted">Page {page + 1} of {pages}</span>
              <Button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
