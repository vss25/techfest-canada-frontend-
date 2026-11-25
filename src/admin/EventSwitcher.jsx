import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "./hooks";
import { useToast } from "./toastContext";
import { AdminEventContext, EVENT_KEY, eventTag, eventWhen, pickStart, splitEvents, useAdminEvent } from "./eventContext";

/* =========================================================
   The event switcher (approved admin design, board 17): in the top
   bar, the event the panel is working on, with its status; the
   menu lists upcoming events, past ones on request ("Show past
   events"), and "+ New event". Scoped workspaces show the same
   event as a chip in their menu. The choice is remembered in this
   browser (localStorage, best effort).
========================================================= */

const read = () => { try { return window.localStorage.getItem(EVENT_KEY) || ""; } catch { return ""; } };
const save = (id) => { try { window.localStorage.setItem(EVENT_KEY, id); } catch { /* not remembered */ } };

export function AdminEventProvider({ children, enabled = true }) {
  const events = useApi(enabled ? "/cms/event?drafts=1" : null);
  const configs = useApi(enabled ? "/admin/events" : null);
  const reloadEvents = events.reload, reloadConfigs = configs.reload;
  // What needs attention (the bell and the gold badges): website changes waiting and open SOS requests.
  const changes = useApi(enabled ? "/cms/changes" : null, { interval: 60000 });
  const sos = useApi(enabled ? "/console/sos?status=open" : null, { interval: 60000 });
  // Nov 20 2026: flags the team raised and this person's overdue tasks (Home › My work).
  const work = useApi(enabled ? "/console/commitments?scope=mine&status=open" : null, { interval: 60000 });
  const [chosen, setChosen] = useState(read);
  const [open, setOpen] = useState(false);
  const value = useMemo(() => {
    const list = (events.data || []).filter((e) => e && e.name);
    const byKey = new Map(((configs.data && configs.data.events) || []).map((c) => [c.eventKey, c]));
    const withConfig = list.map((e) => ({ ...e, config: byKey.get(e.eventKey?.current || e.eventKey) || null }));
    const current = pickStart(withConfig, chosen);
    const waiting = (changes.data?.counts?.unsent || 0) + (changes.data?.counts?.staged || 0);
    const sosOpen = sos.data?.counts?.open || 0;
    return {
      attention: { changes: waiting, sos: sosOpen, flags: work.data?.counts?.flags || 0, overdue: work.data?.counts?.overdue || 0,
        total: waiting + sosOpen + (work.data?.counts?.flags || 0) + (work.data?.counts?.overdue || 0),
        // All three counts have arrived (the bell's "seen" waits for this, so loading zeros don't reset it).
        ready: !!(changes.data && sos.data && work.data) },
      events: withConfig, current, open, setOpen, loading: events.loading,
      refresh: () => { reloadEvents(); reloadConfigs(); },
      setCurrent: (id) => { save(id); setChosen(id); },
    };
  }, [events.data, events.loading, configs.data, changes.data, sos.data, work.data, chosen, open, reloadEvents, reloadConfigs]);
  return <AdminEventContext.Provider value={value}>{children}</AdminEventContext.Provider>;
}

const Dot = () => <span className="h-2 w-2 shrink-0 rounded-[2px] bg-[#D6308C]" aria-hidden="true" />;

function EventMenu({ onPick, className = "" }) {
  const { events, current, setCurrent, setOpen } = useAdminEvent();
  const toast = useToast();
  const [showPast, setShowPast] = useState(false);
  const { upcoming, past } = splitEvents(events);
  const currentIsPast = current && past.some((e) => e._id === current._id);
  const shownPast = showPast || currentIsPast ? past : [];
  const pick = (ev) => {
    setCurrent(ev._id);
    setOpen(false);
    onPick?.();
    toast.success(`Event pages now show ${ev.name}`);
  };
  const Row = ({ ev }) => {
    const tag = eventTag(ev, ev.config);
    return (
      <button type="button" role="menuitem" onClick={() => pick(ev)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-left hover:bg-[#F6F5FA] ${current?._id === ev._id ? "bg-[#F6F5FA]" : "bg-white"}`}>
        <span className="flex min-w-0 flex-col gap-px">
          <b className="truncate text-sm text-[#151035]">{ev.name}</b>
          <span className="truncate text-xs text-[#6B6688]">{eventWhen(ev)}</span>
        </span>
        <span className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: tag.bg, color: tag.fg }}>{tag.label}</span>
      </button>
    );
  };
  return (
    <div role="menu" aria-label="Choose an event" className={`z-30 w-[320px] rounded-xl border border-[#E3E0EE] bg-white p-1.5 shadow-[0_14px_34px_rgba(21,16,53,.14)] ${className}`}>
      {/* The home page isn't an event, but it is edited like one (Nov 25 2026, the owner): straight to its editor. */}
      <Link to="/admin/content/home" role="menuitem" onClick={() => { setOpen(false); onPick?.(); }}
        className="mb-1 flex w-full items-center gap-2.5 rounded-lg border-b border-[#E3E0EE] bg-white px-2.5 py-[9px] text-left hover:bg-[#F6F5FA]">
        <span className="flex min-w-0 flex-col gap-px">
          <b className="truncate text-sm text-[#151035]">Home page</b>
          <span className="truncate text-xs text-[#6B6688]">Headline, picture, video, speakers, sections</span>
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-[#F1F0F5] px-2 py-0.5 text-[11px] font-semibold text-[#151035]">Edit</span>
      </Link>
      {upcoming.map((ev) => <Row key={ev._id} ev={ev} />)}
      {shownPast.length > 0 && <span className="block px-2.5 pb-1 pt-2 text-[11px] font-semibold tracking-[.08em] text-[#8A86A0]">PAST EVENTS · READ ONLY AFTER 7 DAYS</span>}
      {shownPast.map((ev) => <Row key={ev._id} ev={ev} />)}
      <div className="mt-1.5 flex items-center gap-2 border-t border-[#E3E0EE] px-1 pb-0.5 pt-1.5">
        {past.length > 0 && !currentIsPast && (
          <button type="button" onClick={() => setShowPast((v) => !v)} className="h-[30px] rounded-[7px] px-2 text-[13px] font-semibold text-[#151035] hover:bg-[#F6F5FA]">
            {showPast ? "Hide past events" : `Show past events (${past.length})`}
          </button>
        )}
        <Link to="/admin/content/events?new=1" onClick={() => { setOpen(false); onPick?.(); }} className="ml-auto px-2 text-[13px] font-semibold text-[#D6308C] hover:underline">+ New event</Link>
      </div>
    </div>
  );
}

/** Closes on a click outside or Escape. The desktop switcher and the phone chip share one
    "open" flag and both stay mounted (one hidden by CSS), so only the one on screen may close
    it: otherwise the hidden one closed the menu on mousedown, before a pick could land
    (Nov 22 2026: the switcher only worked on Home, the one page without the phone chip). */
function useDismiss(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => {
      const el = ref.current;
      if (!el || !el.getClientRects().length) return; // hidden (display: none): not ours to close
      if (!el.contains(e.target)) setOpen(false);
    };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", esc); };
  }, [open, setOpen, ref]);
}

/** The top bar's switcher: ▪ Vancouver Briefing 2027  On sale  ⌄ */
export function EventSwitcher() {
  const { current, open, setOpen, events } = useAdminEvent();
  const ref = useRef(null);
  useDismiss(open, setOpen, ref);
  if (!events.length) return null;
  const tag = current ? eventTag(current, current.config) : null;
  return (
    <div className="relative shrink-0" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"
        className="flex h-10 items-center gap-2.5 rounded-[10px] border border-[#E3E0EE] bg-white px-3 text-sm font-semibold text-[#151035] outline-none hover:bg-[#F6F5FA] focus-visible:ring-2 focus-visible:ring-[#D6308C]">
        <Dot />
        <span className="max-w-[220px] truncate">{current ? current.name : "Choose an event"}</span>
        {tag && <span className="text-xs font-medium text-[#6B6688]">{tag.label}</span>}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#151035" strokeWidth="2" aria-hidden="true" className={open ? "rotate-180 transition-transform" : "transition-transform"}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && <EventMenu className="absolute left-0 top-[46px]" />}
    </div>
  );
}

/** The chip at the top of a scoped workspace's menu: ▪ Vancouver Briefing 2027  Change */
export function EventChip({ onOpen }) {
  const { current, setOpen } = useAdminEvent();
  if (!current) return null;
  return (
    <button type="button" title={current.name} onClick={() => { setOpen(true); onOpen?.(); }}
      className="mx-2 flex h-[34px] min-w-0 items-center gap-2 whitespace-nowrap rounded-[9px] bg-[#FBE9F3] px-2.5 text-left text-xs font-semibold text-[#9D1D63] outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C]">
      <span className="h-[7px] w-[7px] shrink-0 rounded-[2px] bg-[#D6308C]" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{current.name}</span>
      <span className="shrink-0 text-[#D6308C] underline">Change</span>
    </button>
  );
}

/** The phone's version (board 18): an outlined chip in the navy header; the menu opens under it. */
export function PhoneEventChip() {
  const { current, open, setOpen } = useAdminEvent();
  const ref = useRef(null);
  useDismiss(open, setOpen, ref);
  if (!current) return null;
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 rounded-[10px] border border-white/30 bg-transparent px-3 text-[13px] font-semibold text-white">
        <span className="h-[7px] w-[7px] rounded-[2px] bg-[#D6308C]" aria-hidden="true" />
        <span className="min-w-0 truncate">{current.name}</span>
        <span className="ml-auto text-xs opacity-70">Change</span>
      </button>
      {open && <EventMenu className="absolute left-0 right-0 top-[42px] !w-auto" />}
    </div>
  );
}
