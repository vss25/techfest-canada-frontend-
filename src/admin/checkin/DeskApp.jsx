import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, ExternalLink, MonitorSmartphone, Save, TimerReset } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Button, Card, Input, LoadingState, SectionTitle, Switch } from "../ui";
import { STATION_LINKS, deskUrl, isDeskPath, stationUrl } from "./deskLink";

const DESK_NAME = "TTFC Check-in";

/* =========================================================
   Admin › Event day › Check-in: the "Check-in desk app" card and the
   desk's settings (Oct 23 2026). Staff only (this panel).
   • The app's link (/checkin/: unlisted, the public website never
     links to it), each station's own link (/checkin/lobby, …/floor-1,
     Oct 24 2026) and a QR code to open it on each iPad or phone, and
     how to install it (optional: a browser tab works the same) and how
     volunteers get a login. The link comes from the server at runtime
     (GET /api/checkin/desk/info, staff only, password sign-in).
   • Desk settings: when each station is open, per day. The CxO
     Breakfast, Lunch and the evening entry follow the live agenda (the
     website's /agenda) with doors opening `before` minutes earlier and
     closing `after` minutes later; staff change those minutes, or set
     any station's hours by hand, or close it for a day, and switch the
     optional evening entry station off, and how many drink coupons a
     person gets (Oct 27 2026: drinks.perPerson, 1–5, default 2; the
     Drinks station's stepper starts there, the pass desk issues that
     many). Saved with PUT /api/checkin/desk/settings (audited
     checkin_desk_settings).
========================================================= */

const DAYS = [["day1", "Day 1 · Mon Oct 26"], ["day2", "Day 2 · Tue Oct 27"]];
const AGENDA = ["breakfast", "lunch", "evening"];
const SOURCE = { agenda: "From the agenda", fallback: "Agenda not read: Oct 23 times", staff: "Set by hand", default: "Default" };

export function DeskAppCard() {
  const toast = useToast();
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let gone = false;
    api.get("/checkin/desk/info")
      .then((r) => { if (gone) return; if (isDeskPath(r?.path)) setPath(r.path); else setError("The server didn't send the desk link."); })
      .catch((e) => { if (!gone) setError(e.message || "Couldn't load the desk link."); });
    return () => { gone = true; };
  }, []);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = deskUrl(origin, path);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Couldn't copy: select the link and copy it"); }
  };
  return (
    <Card className="mb-6">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-base font-semibold"><MonitorSmartphone className="h-4 w-4 text-ttfc-pink" aria-hidden="true" /> Check-in desk app ({DESK_NAME})</h2>
          <p className="mt-1 text-sm text-ttfc-muted">
            For the lobby (Mark arrived), the Floor 1 pass desk (Check in &amp; give pass, with a live notification, the guest&apos;s inclusions and a chime for each arrival), the CxO Breakfast, Lunch,
            the evening entry (On the list / Not on the list), the media desk, AV, exhibitors and Drinks (drink coupons: a soft check-in for people who collected their pass before). Staff and volunteers sign in with their email and password.
            The link is unlisted (not on the website, not in search engines): only share it with the team. The sign-in is what protects it.
          </p>
          {path ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="max-w-full break-all rounded-lg bg-ttfc-contrast/5 px-2.5 py-1.5 text-sm" data-testid="desk-link">{url}</code>
              <Button size="sm" icon={Copy} onClick={copy}>Copy link</Button>
              <a className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-ttfc-text hover:bg-ttfc-contrast/5" href={path} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" aria-hidden="true" /> Open</a>
            </div>
          ) : error ? (
            <p className="mt-3 text-sm text-red-300">Desk link: {error} Ask TTFC tech for it.</p>
          ) : (
            <div className="mt-3"><LoadingState label="Loading the desk link…" /></div>
          )}
          {path && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ttfc-dim">Each station&apos;s own link (a device stays on it after a reload)</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5" data-testid="station-links">
                {STATION_LINKS.map((x) => (
                  <li key={x.key}>
                    <a className="inline-flex h-8 items-center rounded-lg bg-ttfc-contrast/5 px-2.5 text-xs font-semibold text-ttfc-text hover:bg-ttfc-contrast/10" href={`${path}${x.slug}`} target="_blank" rel="noreferrer" title={stationUrl(origin, path, x.slug)}>
                      {x.label} <span className="ml-1 font-normal text-ttfc-dim">/{x.slug}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-ttfc-muted">
            <li>On each iPad or phone, scan the QR code with the camera (or type the link) and open it in Safari or Chrome. It works straight away in the browser.</li>
            <li>Optional, to have it on the Home Screen: on iPad / iPhone (iOS 26) tap Share → View More → Add to Home Screen → Add; on Android Chrome or a laptop with Chrome / Edge: ⋮ → Install app.</li>
            <li>Sign in, pick the station on the home page (or open the station&apos;s own link above, e.g. …/checkin/lobby: the device stays on it after a reload) and tap <b>Start</b>: that turns on the chime and keeps the screen awake. On iPads also set Settings › Display &amp; Brightness › Auto-Lock › Never, and keep them plugged in.</li>
            <li>Volunteers need a login: management adds them in <a className="underline" href="/admin/staff">More › Staff accounts</a> (role Volunteer, with a password; add the same email again with a new password to reset it). Staff use their own panel password.</li>
          </ol>
        </div>
        <div className="flex flex-col items-center gap-2">
          {url ? (
            <>
              <div className="rounded-2xl bg-white p-3"><QRCodeSVG value={url} size={176} level="M" /></div>
              <span className="text-xs text-ttfc-dim">Scan to open on a device</span>
            </>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function DeskSettings() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = () => api.get("/checkin/desk/settings").then((r) => { setData(r); setDraft(structuredClone(r.settings || {})); setError(""); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const stations = data?.stations || [];
  const set = (fn) => setDraft((d) => { const n = structuredClone(d || {}); fn(n); return n; });
  const dirty = useMemo(() => data && JSON.stringify(strip(draft)) !== JSON.stringify(strip(data.settings)), [draft, data]);

  if (error) return <Card><p className="text-sm text-red-300">Desk settings: {error}</p></Card>;
  if (!data || !draft) return <Card><LoadingState label="Loading desk settings…" /></Card>;

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put("/checkin/desk/settings", strip(draft));
      setData(r);
      setDraft(structuredClone(r.settings || {}));
      toast.success("Desk settings saved");
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Card className="mb-6">
      <SectionTitle hint={`${data.agendaRead ? "The live agenda was read just now." : "The agenda couldn't be read: the meal stations use the times it had on Oct 23."} Toronto time. Outside these hours a tap needs a second tap ("Admit anyway") and is logged as an override.`}>
        Check-in desk settings: station hours
      </SectionTitle>
      <div className="mb-4">
        <Switch checked={draft.stations?.evening !== false} onChange={(v) => set((n) => { n.stations = { ...(n.stations || {}), evening: v }; })}
          label="Evening entry station (Awards Night on Day 1, Gala on Day 2)" description="Optional: switch it off to remove it from every device's station list." />
      </div>
      {data.drinks && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="desk-drinks-per" className="font-semibold">Drink coupons per person</label>
          <Input id="desk-drinks-per" className="!w-20 !px-2 !py-1" type="number" min={data.drinks.min || 1} max={data.drinks.max || 5} step={1}
            value={draft.drinks?.perPerson ?? data.drinks.perPerson}
            onChange={(e) => set((n) => { n.drinks = { perPerson: e.target.value === "" ? "" : Number(e.target.value) }; })} />
          <span className="text-xs text-ttfc-dim">{data.drinks.min || 1}–{data.drinks.max || 5}, default {data.defaults?.drinks?.perPerson ?? 2}. The Drinks station starts at this number (− / + per person); the pass desk issues this many with a first-time check-in.</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-ttfc-dim"><th className="py-2 pr-3">Station</th>{DAYS.map(([k, l]) => <th key={k} className="py-2 pr-3">{l}</th>)}</tr></thead>
          <tbody>
            {stations.map((st) => (
              <tr key={st.key} className="border-t border-ttfc-line align-top">
                <td className="py-3 pr-3"><b>{st.label}</b><div className="text-xs text-ttfc-dim">{st.sub}</div></td>
                {DAYS.map(([day]) => <td key={day} className="py-3 pr-3"><DayCell st={st.key} day={day} data={data} draft={draft} set={set} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={save}>Save settings</Button>
        <Button icon={TimerReset} disabled={saving} onClick={() => setDraft({ windows: {}, buffers: {}, stations: draft.stations || {}, ...(draft.drinks ? { drinks: draft.drinks } : {}) })}>Back to the agenda and defaults</Button>
        {data.settings?.updatedBy && <span className="text-xs text-ttfc-dim">Last saved by {data.settings.updatedBy}</span>}
      </div>
    </Card>
  );
}

const strip = (s) => ({ windows: s?.windows || {}, buffers: s?.buffers || {}, stations: s?.stations || {}, ...(s?.drinks ? { drinks: s.drinks } : {}) });

function DayCell({ st, day, data, draft, set }) {
  const resolved = data.windows?.[st]?.[day];
  const manual = draft.windows?.[st] && day in draft.windows[st] ? draft.windows[st][day] : undefined;
  const agenda = AGENDA.includes(st);
  const buf = { ...(data.defaults?.buffers?.[st]?.[day] || {}), ...(draft.buffers?.[st]?.[day] || {}) };
  const session = resolved?.session;
  const setManual = (v) => set((n) => { n.windows = n.windows || {}; n.windows[st] = { ...(n.windows[st] || {}) }; if (v === undefined) delete n.windows[st][day]; else n.windows[st][day] = v; });
  const setBuf = (k, v) => set((n) => { n.buffers = n.buffers || {}; n.buffers[st] = { ...(n.buffers[st] || {}) }; n.buffers[st][day] = { ...(n.buffers[st][day] || {}), [k]: v === "" ? undefined : Number(v) }; });
  return (
    <div className="flex flex-col gap-1.5">
      {resolved ? <span><b>{resolved.open}–{resolved.close}</b> <Badge tone={resolved.source === "staff" ? "orange" : resolved.source === "agenda" ? "good" : "neutral"}>{SOURCE[resolved.source]}</Badge></span> : <Badge tone="warn">Closed</Badge>}
      {agenda && session && <span className="text-xs text-ttfc-dim">{session.title} {session.start}–{session.end}</span>}
      {agenda && manual === undefined && (
        <span className="flex items-center gap-1 text-xs text-ttfc-muted">
          Doors <Input aria-label="Minutes before" className="!w-16 !px-2 !py-1" type="number" min={0} max={240} value={buf.before ?? ""} onChange={(e) => setBuf("before", e.target.value)} /> min before,
          <Input aria-label="Minutes after" className="!w-16 !px-2 !py-1" type="number" min={0} max={360} value={buf.after ?? ""} onChange={(e) => setBuf("after", e.target.value)} /> after
        </span>
      )}
      {manual === undefined ? (
        <button type="button" className="self-start text-xs text-ttfc-pink underline" onClick={() => setManual({ open: resolved?.open || "07:00", close: resolved?.close || "18:00" })}>Set hours by hand</button>
      ) : manual === null ? (
        <span className="text-xs">Closed this day · <button type="button" className="text-ttfc-pink underline" onClick={() => setManual(undefined)}>Undo</button></span>
      ) : (
        <span className="flex flex-wrap items-center gap-1 text-xs">
          <Input aria-label="Opens" className="!w-24 !px-2 !py-1" type="time" value={manual.open} onChange={(e) => setManual({ ...manual, open: e.target.value })} />–
          <Input aria-label="Closes" className="!w-24 !px-2 !py-1" type="time" value={manual.close} onChange={(e) => setManual({ ...manual, close: e.target.value })} />
          <button type="button" className="text-ttfc-pink underline" onClick={() => setManual(null)}>Closed</button>
          <button type="button" className="text-ttfc-pink underline" onClick={() => setManual(undefined)}>{agenda ? "Use the agenda" : "Use default"}</button>
        </span>
      )}
    </div>
  );
}
