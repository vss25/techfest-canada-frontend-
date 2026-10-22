import { useMemo, useState } from "react";
import { BellRing, CalendarClock, ExternalLink, Gift, Info, Lock, Megaphone, RefreshCw, RotateCcw, Save, Trophy, Users } from "lucide-react";
import { useApi } from "../hooks";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, Modal, PageHeader, SectionTitle, StatTile, Switch, TableWrap,
  Textarea,
} from "../ui";
import { num, when } from "../format";
import {
  SWAG_ALT, SWAG_DEFAULTS, SWAG_DEFAULT_RULES, SWAG_KEYS, SWAG_PAGE, SWAG_THUMB, fillSwagText, parseToronto, swagFrom, swagShort, swagWhen, torontoIso,
  torontoLocalInput,
} from "../../lib/swag";
import { swagApi } from "./swagApi";

/* =========================================================
   Admin › Website & app › Swag kit giveaway (batch 7, Oct 22 2026)
   The organiser: "download the app and get a chance to win the swag
   kit … they can win that through the gamified version in the app".
     - The settings (management saves): on/off (off until management
       turns it on), how many kits, when points stop counting, when
       winners are told, the title and the rules (with {kits},
       {cutoff} and {announce} filled in, previewed as people see it
       on thetechfestival.com/swag and in the apps).
     - Who'd win: the top {kits} eligible people from the live
       leaderboard (at the cutoff once it has passed) and who's left
       out and why (hidden from the leaderboard, no pass, staff or
       volunteer, hidden from the app, banned).
     - Announce winners (management, after the cutoff): a confirm
       with the names and the message; then each winner gets the
       in-app notification and push. Nothing is sent before that click.
   Server calls: ./swagApi.js.
========================================================= */

const NOTICE = "You won a TTFC swag kit! Collect it at the registration desk.";
const STAGE = {
  off: { tone: "neutral", label: "Off" },
  open: { tone: "good", label: "On · points count" },
  closed: { tone: "warn", label: "Points are in" },
  announced: { tone: "purple", label: "Winners time" },
};

/** The stored settings as form values (Toronto times as datetime-local values). */
function formFrom(rows) {
  const by = Object.fromEntries((rows || []).map((r) => [r.key, r.value]));
  const v = (k) => (by[k] === undefined || by[k] === null || by[k] === "" ? SWAG_DEFAULTS[k] : by[k]);
  return {
    "swag.enabled": v("swag.enabled") === true || v("swag.enabled") === "true",
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
    if (parseToronto(next["swag.announce"]) < parseToronto(next["swag.cutoff"])) { setErr("Winners can't be told before points stop counting."); return; }
    const before = storedFrom(saved);
    const changed = SWAG_KEYS.filter((k) => JSON.stringify(next[k]) !== JSON.stringify(before[k]));
    setSaving(true); setErr("");
    try {
      for (const k of changed) await swagApi.saveSetting(k, next[k]);
      toast.success(changed.includes("swag.enabled")
        ? `Saved. The giveaway is ${next["swag.enabled"] ? "on" : "off"}: the apps and /swag show it within about a minute`
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
  const final = w ? !!w.cutoffPassed && !w.live : live.stage === "closed" || live.stage === "announced";
  const canAnnounce = isManagement && (w ? !!w.canAnnounce : false);
  const stage = STAGE[live.stage] || STAGE.off;

  return (
    <>
      <PageHeader
        eyebrow="Website & app"
        title="Swag kit giveaway"
        description="People earn points in the TTFC app; the top ones on the leaderboard at the cutoff each win a TTFC swag kit. The apps show a banner on the leaderboard and a card in the feed while it's on, and thetechfestival.com/swag has the rules."
        actions={(
          <>
            <Button icon={ExternalLink} onClick={() => window.open(SWAG_PAGE, "_blank", "noopener")}>Open the rules page</Button>
            <Button icon={RefreshCw} onClick={() => { settings.reload(); winners.reload(); }}>Refresh</Button>
          </>
        )}
      />

      {!isManagement && (
        <Banner tone="info" icon={Lock} className="mb-6" title="Changing the giveaway and announcing winners are for management">
          You can see the settings and who would win.
        </Banner>
      )}
      {missing && (
        <Banner tone="warn" icon={Info} className="mb-6" title="The server doesn't have the giveaway settings yet">
          They appear once the latest backend update is live. Until then the apps and /swag use the built-in settings (off).
        </Banner>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Giveaway" value={stage.label} icon={Gift} tone={live.enabled ? "good" : "purple"} hint={live.enabled ? "Showing in the apps and on /swag" : "Hidden in the apps"} />
        <StatTile label="Kits" value={num(live.kits)} icon={Trophy} tone="orange" hint="One per winner" />
        <StatTile label="Points count until" value={swagShort(live.cutoff)} icon={CalendarClock} tone="purple" hint="Toronto time" />
        <StatTile label="Winners told" value={announced ? when(announced.at) : swagShort(live.announce)} icon={BellRing} tone="good"
          hint={announced ? `Announced${announced.by ? ` by ${announced.by}` : ""}` : "When you click Announce winners"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <Card>
          <SectionTitle hint="Saved for everyone: the apps and /swag pick changes up within about a minute.">Settings</SectionTitle>
          {settings.loading && !settings.data ? <LoadingState /> : settings.error && !settings.data ? <ErrorState error={settings.error} onRetry={settings.reload} /> : (
            <div className="flex flex-col gap-5">
              <Switch checked={form["swag.enabled"]} onChange={(v) => set("swag.enabled", v)} disabled={!isManagement || saving}
                label="Giveaway on" description="On: the Points banner and the feed card in the apps, and the rules on /swag. Off: none of it shows (the /swag page says it opens soon)." />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Number of kits" hint="The top this many win (1–50).">
                  {(id) => <Input id={id} type="number" min={1} max={50} inputMode="numeric" value={form["swag.kits"]} onChange={(e) => set("swag.kits", e.target.value)} disabled={!isManagement} />}
                </Field>
                <Field label="Points count until" hint="Toronto time">
                  {(id) => <Input id={id} type="datetime-local" value={form["swag.cutoff"]} onChange={(e) => set("swag.cutoff", e.target.value)} disabled={!isManagement} />}
                </Field>
                <Field label="Winners told at" hint="Toronto time">
                  {(id) => <Input id={id} type="datetime-local" value={form["swag.announce"]} onChange={(e) => set("swag.announce", e.target.value)} disabled={!isManagement} />}
                </Field>
              </div>
              <Field label="Title" hint="In the apps' banner and card, on /swag and in the email.">
                {(id) => <Input id={id} value={form["swag.title"]} maxLength={80} onChange={(e) => set("swag.title", e.target.value)} disabled={!isManagement} />}
              </Field>
              <Field label="The rules" hint="{kits}, {cutoff} and {announce} are filled in for people (see the preview).">
                {(id) => <Textarea id={id} rows={7} value={form["swag.rules"]} maxLength={2000} onChange={(e) => set("swag.rules", e.target.value)} disabled={!isManagement} className="text-sm" />}
              </Field>
              {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
              {isManagement && (
                <div className="flex flex-wrap gap-2 border-t border-ttfc-line pt-4">
                  <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={save}>Save</Button>
                  <Button icon={RotateCcw} disabled={!draft} onClick={() => { setDraft(null); setErr(""); }}>Undo changes</Button>
                  <Button variant="ghost" icon={RotateCcw} disabled={form["swag.rules"] === SWAG_DEFAULT_RULES && form["swag.title"] === SWAG_DEFAULTS["swag.title"]}
                    onClick={() => setDraft({ ...form, "swag.rules": SWAG_DEFAULT_RULES, "swag.title": SWAG_DEFAULTS["swag.title"] })}
                    title="The built-in title and rules (then Save)">Default title and rules</Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle hint="As people see it on /swag (with your unsaved changes).">Preview</SectionTitle>
          <div className="flex gap-4">
            <img src={SWAG_THUMB} alt={SWAG_ALT} width="600" height="508" className="h-24 w-28 flex-none rounded-xl object-cover" />
            <div className="min-w-0">
              <p className="text-lg font-bold leading-snug">{preview.title}</p>
              <p className="mt-1 text-sm text-ttfc-muted">Top {preview.kits} at {swagWhen(preview.cutoff)} win · winners told {swagWhen(preview.announce)}</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ttfc-muted">{fillSwagText(form["swag.rules"] || SWAG_DEFAULT_RULES, preview)}</p>
        </Card>
      </div>

      <Card className="mt-8">
        <SectionTitle hint={final
          ? `The leaderboard at the cutoff (${swagWhen(live.cutoff)})${w?.takenAt ? `, taken ${when(w.takenAt)}` : ""}. Only people who can win are counted: on the leaderboard, with a pass, not staff or volunteers, not hidden or banned.`
          : `If it ended now: the live leaderboard. Points count until ${swagWhen(live.cutoff)}. Only people who can win are counted.`}>
          {announced ? "The winners" : final ? "Who won" : "Who would win now"}
        </SectionTitle>
        {winners.loading && !w ? <LoadingState label="Working out the leaderboard…" /> : winners.error && !w ? (
          <ErrorState error={winners.error} onRetry={winners.reload} title={winners.error?.status === 404 ? "Not available yet: the server needs the latest backend update" : "Couldn't load the leaderboard"} />
        ) : (
          <>
            {announced && (
              <Banner tone="good" icon={BellRing} className="mb-4" title={`Announced ${when(announced.at)}${announced.by ? ` by ${announced.by}` : ""}`}>
                Each winner got “{NOTICE}” in the app and as a push.
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
                <summary className="cursor-pointer font-semibold">Left out ({num(excluded.length)}): high on the leaderboard but can&apos;t win</summary>
                <ul className="mt-2 space-y-1 text-ttfc-muted">
                  {excluded.map((x) => <li key={x.userId || x.name}>{x.name || "No name"} · {num(x.points)} points · {x.reasonLabel || x.reason}</li>)}
                </ul>
              </details>
            )}
            {isManagement && !announced && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ttfc-line pt-4">
                <Button variant="primary" icon={Megaphone} disabled={!canAnnounce || !list.length} onClick={() => setAnnouncing(true)}
                  title={!live.enabled ? "Turn the giveaway on first" : !final ? `Points count until ${swagWhen(live.cutoff)}` : list.length ? "Shows the names first; nothing is sent until you confirm" : "Nobody to announce"}>
                  Announce winners
                </Button>
                <span className="text-xs text-ttfc-dim">
                  {!live.enabled ? "Turn the giveaway on first." : !final ? `Available after ${swagWhen(live.cutoff)}.` : "You'll see the names and the message first. Nothing is sent until you confirm."}
                </span>
              </div>
            )}
          </>
        )}
      </Card>

      {announcing && (
        <AnnounceDialog winners={list} onClose={() => { setAnnouncing(false); winners.reload(); }}
          onDone={(r) => { const n = r?.announced?.winners?.length ?? list.length; toast.success(`Told ${num(n)} ${n === 1 ? "winner" : "winners"} in the app`); winners.reload(); }} />
      )}
    </>
  );
}

/** What the server's 409s mean, for the dialog. */
const ANNOUNCE_ERRORS = {
  changed: "The leaderboard changed since this list was made. Check the names below, then confirm again.",
  not_yet: "Points still count. You can announce once the cutoff has passed.",
  swag_off: "Turn on the swag giveaway first.",
  already_announced: "The winners were already announced.",
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
      title={`Tell ${winners.length === 1 ? "the winner" : `the ${winners.length} winners`}?`}
      description="Each one gets a notification in the TTFC app and a push on their phone. It can't be undone."
      footer={(
        <>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" icon={Megaphone} loading={busy} disabled={!armed} onClick={go}>Announce winners</Button>
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
        <p className="rounded-xl border border-ttfc-line px-3 py-2"><span className="text-ttfc-dim">The message: </span>“{NOTICE}”</p>
        <Field label={<>Type <span className="font-mono">ANNOUNCE</span> to confirm</>}>
          {(id) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ANNOUNCE" className="font-mono" disabled={busy} data-autofocus />}
        </Field>
        {err && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">{err}</p>}
      </div>
    </Modal>
  );
}
