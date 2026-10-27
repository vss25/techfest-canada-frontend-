import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, CalendarClock, ExternalLink, Handshake, Info, Lock, Megaphone, RefreshCw, RotateCcw, Save, Trophy, Users } from "lucide-react";
import { useApi } from "../hooks";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, Modal, PageHeader, SectionTitle, StatTile, Switch, TableWrap,
  Textarea,
} from "../ui";
import { num, when } from "../format";
import {
  NETWORKERS_THANKS_ME, SWAG_DEFAULTS, SWAG_DEFAULT_RULES, SWAG_KEYS, SWAG_PAGE, fillSwagText, networkersView, parseToronto, swagFrom, swagShort, swagWhen,
  torontoIso, torontoLocalInput,
} from "../../lib/swag";
import { swagApi } from "./swagApi";

/* =========================================================
   Admin › Website & app › Top networkers (batch 7 as the swag kit
   giveaway; Oct 27 2026, the organiser: the top 3 do NOT get a swag
   kit, the leaderboard is "appreciation for starting conversations
   and meeting people"; the kits go to every attendee who tags TTFC
   on LinkedIn or Instagram, not run from here).
     - The settings (management saves): "Celebrate the top networkers
       at the announce time" (swag.celebrate, on by default), how
       many, when points stop counting, when they're celebrated, the
       title and the appreciation text ({kits}, {cutoff} and
       {announce} filled in, previewed as people see it on
       thetechfestival.com/swag and in the apps), and "Old apps'
       prize banner (keep OFF)" (swag.enabled: only older app
       versions read it).
     - The top networkers: the top {kits} counted from the live
       leaderboard (at the cutoff once it has passed) and who's left
       out and why (hidden from the leaderboard, no pass, staff or
       volunteer, hidden from the app, banned).
     - Celebrate them (management, after the cutoff): a confirm with
       the names and the thank-you; then each gets the in-app
       notification and push. Nothing is sent before that click.
   Server calls: ./swagApi.js.
========================================================= */

const STAGE = {
  off: { label: "Off" },
  open: { label: "On · points count" },
  closed: { label: "Points are in" },
  announced: { label: "Celebrated" },
};

/** The stored settings as form values (Toronto times as datetime-local values). */
function formFrom(rows) {
  const by = Object.fromEntries((rows || []).map((r) => [r.key, r.value]));
  const v = (k) => (by[k] === undefined || by[k] === null || by[k] === "" ? SWAG_DEFAULTS[k] : by[k]);
  return {
    "swag.enabled": v("swag.enabled") === true || v("swag.enabled") === "true",
    "swag.celebrate": !(v("swag.celebrate") === false || v("swag.celebrate") === "false"),
    "swag.kits": String(v("swag.kits")),
    "swag.cutoff": torontoLocalInput(parseToronto(v("swag.cutoff"))),
    "swag.announce": torontoLocalInput(parseToronto(v("swag.announce"))),
    "swag.title": String(v("swag.title")),
    "swag.rules": String(v("swag.rules")),
  };
}

/** Form values → what's stored (times as ISO with Toronto's offset, the defaults stored as empty). */
function storedFrom(form) {
  const rules = form["swag.rules"].trim();
  const title = form["swag.title"].trim();
  return {
    "swag.enabled": !!form["swag.enabled"],
    "swag.celebrate": !!form["swag.celebrate"],
    "swag.kits": String(Math.max(1, Math.min(50, Math.round(Number(form["swag.kits"]) || 0)))),
    "swag.cutoff": torontoIso(form["swag.cutoff"]),
    "swag.announce": torontoIso(form["swag.announce"]),
    "swag.title": title === SWAG_DEFAULTS["swag.title"] ? "" : title,
    "swag.rules": rules === SWAG_DEFAULT_RULES ? "" : rules,
  };
}

export default function SwagKit() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const settings = useApi(swagApi.contentPath);
  const winners = useApi(swagApi.winnersPath);
  const rows = useMemo(() => (settings.data || []).filter((r) => SWAG_KEYS.includes(r.key)), [settings.data]);
  const saved = useMemo(() => formFrom(rows), [rows]);
  const [draft, setDraft] = useState(null);
  const form = draft || saved;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [announcing, setAnnouncing] = useState(false);

  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const live = swagFrom(values);
  const preview = swagFrom({ ...storedFrom(form) });
  const dirty = !!draft && JSON.stringify(storedFrom(draft)) !== JSON.stringify(storedFrom(saved));
  const missing = settings.data && !rows.length; // the server hasn't got the swag keys yet
  const set = (k, v) => { setDraft({ ...form, [k]: v }); setErr(""); };

  const save = async () => {
    const next = storedFrom(form);
    if (!next["swag.cutoff"] || !next["swag.announce"]) { setErr("Pick both times."); return; }
    if (parseToronto(next["swag.announce"]) < parseToronto(next["swag.cutoff"])) { setErr("The celebration can't be before points stop counting."); return; }
    const before = storedFrom(saved);
    const changed = SWAG_KEYS.filter((k) => JSON.stringify(next[k]) !== JSON.stringify(before[k]));
    setSaving(true); setErr("");
    try {
      for (const k of changed) await swagApi.saveSetting(k, next[k]);
      toast.success(changed.includes("swag.celebrate")
        ? `Saved. The celebration is ${next["swag.celebrate"] ? "on" : "off"}: the apps and /swag show it within about a minute`
        : "Saved. The apps and /swag pick it up within about a minute");
      setDraft(null);
      settings.reload();
      winners.reload();
    } catch (e) { setErr(e?.message || "Couldn't save"); toast.error(e); } finally { setSaving(false); }
  };

  const w = winners.data;
  const announced = w?.announced || null;
  const list = (announced?.winners?.length ? announced.winners : w?.winners) || [];
  const excluded = w?.excluded || [];
  const final = w ? !!w.cutoffPassed && !w.live : live.phase === "closed" || live.phase === "announced";
  const canAnnounce = isManagement && (w ? !!w.canAnnounce : false);
  const stage = live.celebrate ? STAGE[live.phase] || STAGE.open : STAGE.off;
  const pv = networkersView(preview, parseToronto(preview.announce) - 3600000);

  return (
    <>
      <PageHeader
        eyebrow="Website & app"
        title="Top networkers"
        description="The leaderboard is appreciation for starting conversations and meeting people, not a prize. At the announce time the apps celebrate the top networkers: a card on the leaderboard and pinned in the feed, and each of them gets a thank-you in the app when you click Celebrate. thetechfestival.com/swag explains how the leaderboard works. (The kits go to every attendee who tags TTFC on LinkedIn or Instagram; that isn't run from here.)"
        actions={(
          <>
            <Button icon={ExternalLink} onClick={() => window.open(SWAG_PAGE, "_blank", "noopener")}>Open How the leaderboard works</Button>
            <Button icon={RefreshCw} onClick={() => { settings.reload(); winners.reload(); }}>Refresh</Button>
          </>
        )}
      />

      {!isManagement && (
        <Banner tone="info" icon={Lock} className="mb-6" title="Changing these settings and celebrating the top networkers are for management">
          You can see the settings and the top networkers.
        </Banner>
      )}
      {missing && (
        <Banner tone="warn" icon={Info} className="mb-6" title="The server doesn't have these settings yet">
          They appear once the latest backend update is live. Until then the apps and /swag use the built-in settings.
        </Banner>
      )}
      {live.enabled && (
        <Banner tone="danger" icon={AlertTriangle} className="mb-6" title="The old apps' prize banner is on">
          Older versions of the apps will show the old prize banner. Turn “Old apps' prize banner” off below and save.
        </Banner>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Celebration" value={stage.label} icon={Handshake} tone={live.celebrate ? "good" : "purple"} hint={live.celebrate ? "The apps celebrate the top networkers" : "Nothing shows in the apps"} />
        <StatTile label="Top networkers" value={num(live.kits)} icon={Trophy} tone="orange" hint="How many are celebrated" />
        <StatTile label="Points count until" value={swagShort(live.cutoff)} icon={CalendarClock} tone="purple" hint="Toronto time" />
        <StatTile label="Celebrated at" value={announced ? when(announced.at) : swagShort(live.announce)} icon={BellRing} tone="good"
          hint={announced ? `Celebrated${announced.by ? ` by ${announced.by}` : ""}` : "When you click Celebrate the top networkers"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <Card>
          <SectionTitle hint="Saved for everyone: the apps and /swag pick changes up within about a minute.">Settings</SectionTitle>
          {settings.loading && !settings.data ? <LoadingState /> : settings.error && !settings.data ? <ErrorState error={settings.error} onRetry={settings.reload} /> : (
            <div className="flex flex-col gap-5">
              <Switch checked={form["swag.celebrate"]} onChange={(v) => set("swag.celebrate", v)} disabled={!isManagement || saving}
                label="Celebrate the top networkers at the announce time"
                description="On: until then the apps' leaderboard says when the top networkers will be celebrated; at the announce time they show the top networkers on the leaderboard and pinned in the feed. Off: none of it shows." />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="How many top networkers" hint="1–50">
                  {(id) => <Input id={id} type="number" min={1} max={50} inputMode="numeric" value={form["swag.kits"]} onChange={(e) => set("swag.kits", e.target.value)} disabled={!isManagement} />}
                </Field>
                <Field label="Points count until" hint="Toronto time">
                  {(id) => <Input id={id} type="datetime-local" value={form["swag.cutoff"]} onChange={(e) => set("swag.cutoff", e.target.value)} disabled={!isManagement} />}
                </Field>
                <Field label="Celebrate at" hint="Toronto time">
                  {(id) => <Input id={id} type="datetime-local" value={form["swag.announce"]} onChange={(e) => set("swag.announce", e.target.value)} disabled={!isManagement} />}
                </Field>
              </div>
              <Field label="Title" hint="On the apps' leaderboard banner and on /swag.">
                {(id) => <Input id={id} value={form["swag.title"]} maxLength={80} onChange={(e) => set("swag.title", e.target.value)} disabled={!isManagement} />}
              </Field>
              <Field label="Appreciation text" hint="On /swag. {kits}, {cutoff} and {announce} are filled in for people (see the preview).">
                {(id) => <Textarea id={id} rows={6} value={form["swag.rules"]} maxLength={2000} onChange={(e) => set("swag.rules", e.target.value)} disabled={!isManagement} className="text-sm" />}
              </Field>
              <div className="rounded-2xl border border-ttfc-line p-4">
                <Switch checked={form["swag.enabled"]} onChange={(v) => set("swag.enabled", v)} disabled={!isManagement || saving}
                  label="Old apps' prize banner (keep OFF)"
                  description="Only older versions of the apps read this switch: on, they show the old prize banner and card. Keep it off; it has nothing to do with the celebration above." />
              </div>
              {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
              {isManagement && (
                <div className="flex flex-wrap gap-2 border-t border-ttfc-line pt-4">
                  <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={save}>Save</Button>
                  <Button icon={RotateCcw} disabled={!draft} onClick={() => { setDraft(null); setErr(""); }}>Undo changes</Button>
                  <Button variant="ghost" icon={RotateCcw} disabled={form["swag.rules"] === SWAG_DEFAULT_RULES && form["swag.title"] === SWAG_DEFAULTS["swag.title"]}
                    onClick={() => setDraft({ ...form, "swag.rules": SWAG_DEFAULT_RULES, "swag.title": SWAG_DEFAULTS["swag.title"] })}
                    title="The built-in title and appreciation text (then Save)">Default title and text</Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle hint="As people see it in the apps and on /swag (with your unsaved changes).">Preview</SectionTitle>
          <div className="flex gap-4">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-ttfc-orange/15 text-ttfc-orange" aria-hidden="true"><Handshake className="h-6 w-6" /></span>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-snug">{preview.title}</p>
              <p className="mt-0.5 text-sm text-ttfc-muted">{form["swag.celebrate"] ? pv.line : "The celebration is off: no banner or card in the apps."}</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ttfc-muted">{fillSwagText(form["swag.rules"] || SWAG_DEFAULT_RULES, preview)}</p>
        </Card>
      </div>

      <Card className="mt-8">
        <SectionTitle hint={final
          ? `The leaderboard at the cutoff (${swagWhen(live.cutoff)})${w?.takenAt ? `, taken ${when(w.takenAt)}` : ""}. Counted: people on the leaderboard with a pass, not staff or volunteers, not hidden or banned.`
          : `The live leaderboard. Points count until ${swagWhen(live.cutoff)}. Counted: people on the leaderboard with a pass, not staff or volunteers, not hidden or banned.`}>
          {announced ? "The top networkers (celebrated)" : final ? "The top networkers" : "Top networkers now"}
        </SectionTitle>
        {winners.loading && !w ? <LoadingState label="Working out the leaderboard…" /> : winners.error && !w ? (
          <ErrorState error={winners.error} onRetry={winners.reload} title={winners.error?.status === 404 ? "Not available yet: the server needs the latest backend update" : "Couldn't load the leaderboard"} />
        ) : (
          <>
            {announced && (
              <Banner tone="good" icon={BellRing} className="mb-4" title={`Celebrated ${when(announced.at)}${announced.by ? ` by ${announced.by}` : ""}`}>
                Each of them got the thank-you in the app and as a push.
              </Banner>
            )}
            {list.length ? (
              <TableWrap>
                <thead><tr><th className="w-12">#</th><th>Person</th><th className="text-right">Points</th></tr></thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.userId || p.id}>
                      <td className="font-mono text-sm">{p.rank ?? list.indexOf(p) + 1}</td>
                      <td>
                        <span className="block font-semibold">{p.name || "No name"}</span>
                        <span className="block text-xs text-ttfc-muted">{[p.organization, p.email].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td className="text-right font-semibold">{num(p.points)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : <EmptyState icon={Users} title="Nobody yet" body="People appear here once they earn points with “Show me on the leaderboard” on." />}
            {excluded.length > 0 && (
              <details className="mt-4 rounded-xl border border-ttfc-line px-4 py-3 text-sm">
                <summary className="cursor-pointer font-semibold">Left out ({num(excluded.length)}): high on the leaderboard but not counted</summary>
                <ul className="mt-2 space-y-1 text-ttfc-muted">
                  {excluded.map((x) => <li key={x.userId || x.name}>{x.name || "No name"} · {num(x.points)} points · {x.reasonLabel || x.reason}</li>)}
                </ul>
              </details>
            )}
            {isManagement && !announced && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ttfc-line pt-4">
                <Button variant="primary" icon={Megaphone} disabled={!canAnnounce || !list.length || !live.celebrate} onClick={() => setAnnouncing(true)}
                  title={!live.celebrate ? "Turn on the celebration first" : !final ? `Points count until ${swagWhen(live.cutoff)}` : list.length ? "Shows the names first; nothing is sent until you confirm" : "Nobody to celebrate"}>
                  Celebrate the top networkers
                </Button>
                <span className="text-xs text-ttfc-dim">
                  {!live.celebrate ? "Turn on “Celebrate the top networkers” first." : !final ? `Available after ${swagWhen(live.cutoff)}.` : "You'll see the names and the message first. Nothing is sent until you confirm."}
                </span>
              </div>
            )}
          </>
        )}
      </Card>

      {announcing && (
        <AnnounceDialog winners={list} onClose={() => { setAnnouncing(false); winners.reload(); }}
          onDone={(r) => { const n = r?.announced?.winners?.length ?? list.length; toast.success(`Thanked ${num(n)} top ${n === 1 ? "networker" : "networkers"} in the app`); winners.reload(); }} />
      )}
    </>
  );
}

/** What the server's 409s mean, for the dialog. */
const ANNOUNCE_ERRORS = {
  changed: "The leaderboard changed since this list was made. Check the names below, then confirm again.",
  not_yet: "Points still count. You can celebrate once the cutoff has passed.",
  swag_off: "Turn on “Celebrate the top networkers” first.",
  celebrate_off: "Turn on “Celebrate the top networkers” first.",
  already_announced: "The top networkers were already celebrated.",
};

/** The names and the message, then type ANNOUNCE. A "changed" answer swaps in the new names to check again. */
function AnnounceDialog({ winners: first, onClose, onDone }) {
  const [winners, setWinners] = useState(first);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const armed = typed.trim() === "ANNOUNCE" && winners.length > 0;
  const go = async () => {
    if (!armed || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await swagApi.announce(winners.map((p) => p.userId || p.id));
      onDone(r);
      onClose();
    } catch (e) {
      if (e?.code === "changed" && Array.isArray(e.data?.winners)) { setWinners(e.data.winners); setTyped(""); }
      setErr(ANNOUNCE_ERRORS[e?.code] || e?.message || "Something went wrong");
    } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} size="md" tone="danger"
      title={`Celebrate ${winners.length === 1 ? "the top networker" : `the ${winners.length} top networkers`}?`}
      description="Each one gets a thank-you notification in the TTFC app and a push on their phone, and the apps show them on the leaderboard and in the feed. It can't be undone."
      footer={(
        <>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" icon={Megaphone} loading={busy} disabled={!armed} onClick={go}>Celebrate</Button>
        </>
      )}>
      <div className="flex flex-col gap-4 text-sm">
        <ol className="divide-y divide-ttfc-line/70 rounded-xl border border-ttfc-line">
          {winners.map((p) => (
            <li key={p.userId || p.id} className="flex items-center gap-3 px-3 py-2">
              <span className="w-6 text-right font-mono text-xs text-ttfc-dim">{p.rank}</span>
              <span className="min-w-0 flex-1"><b className="block truncate">{p.name}</b><span className="block truncate text-xs text-ttfc-muted">{p.organization || p.email}</span></span>
              <Badge tone="purple">{num(p.points)} pts</Badge>
            </li>
          ))}
        </ol>
        <p className="rounded-xl border border-ttfc-line px-3 py-2"><span className="text-ttfc-dim">The message (the server sends it): </span>“{NETWORKERS_THANKS_ME}”</p>
        <Field label={<>Type <span className="font-mono">ANNOUNCE</span> to confirm</>}>
          {(id) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ANNOUNCE" className="font-mono" disabled={busy} data-autofocus />}
        </Field>
        {err && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">{err}</p>}
      </div>
    </Modal>
  );
}
