/* =========================================================
   Global search: the search box in the admin top bar and the
   command palette it opens (also ⌘K / Ctrl-K on every page).
   - Pages and settings come from the static index (instant);
     everything else from POST /api/console/search, 200 ms after
     typing stops, at most 5 per group, with "See all in …"
     where the page has its own search.
   - At least 2 characters; an email or a ticket ID matches
     exactly (the server's rules).
   - Keyboard: ↑ ↓ move, Enter opens, ⌘/Ctrl-Enter opens in a
     new tab, Esc closes. ARIA combobox + listbox with groups.
   - Recent searches and opened results stay in this browser
     (recents.js), per staff account.
========================================================= */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Award, CalendarCheck, CalendarDays, CornerDownLeft, Eraser, FileDown, Gem, Gift, GraduationCap, Handshake, History, IdCard,
  Inbox, Landmark, LayoutGrid, Loader2, Mic2, Search, SearchX, Store, Ticket, TicketPlus, ToggleRight, User, UserCog, X, Zap,
} from "lucide-react";
import { adminFetch } from "../api";
import { useAdmin } from "../adminContext";
import { useDebounced } from "../hooks";
import { IconButton, focusRing } from "../ui";
import { isSponsor } from "../../data/sponsors";
import { exactTerm, highlight, readQuery } from "./match";
import { searchAdminIndex } from "./adminIndex";
import { clearRecents, loadRecents, rememberSearch } from "./recents";

const cx = (...a) => a.filter(Boolean).join(" ");
const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
const SHORTCUT = IS_MAC ? "⌘K" : "Ctrl K";
const DEBOUNCE_MS = 200;

const TYPE_ICONS = {
  person: User, ticket: Ticket, "speaker-pass": IdCard, "issued-pass": TicketPlus, "exhibitor-pass": Store, "comp-pass": Gift,
  rsvp: CalendarCheck, session: CalendarDays, "cms-speaker": Mic2, partner: Handshake, sponsor: Gem, logo: GraduationCap,
  nomination: Award, form: Inbox, brochure: FileDown, pavilion: Landmark, staff: UserCog,
  page: LayoutGrid, setting: ToggleRight, action: Zap,
};

/* The website decides which partners are sponsors (src/data/sponsors.js, with its built-in Featured Partners list):
   label and link them the same way here. */
function withSponsorRule(group) {
  if (group.key !== "partners") return group;
  return {
    ...group,
    items: group.items.map((it) => (isSponsor({ _id: it.id, matrixGroup: it.meta?.matrixGroup })
      ? { ...it, type: "sponsor", subtitle: ["Featured Partner (sponsor)", it.meta?.active === false ? "Hidden" : ""].filter(Boolean).join(" · "),
        link: `/admin/content/sponsors?edit=${encodeURIComponent(it.id)}` }
      : it)),
  };
}

function Marked({ text, q }) {
  const parts = highlight(text, { words: q.words, exact: exactTerm(q) });
  return parts.map((p, i) => (p.hit
    ? <mark key={i} className="rounded-[4px] bg-ttfc-pink/25 px-px text-white">{p.text}</mark>
    : <span key={i}>{p.text}</span>));
}

/** The search box in the top bar: a wide box on tablets and up, an icon on phones. Typing into it opens the palette. */
function SearchTrigger({ onOpen }) {
  const onKeyDown = (e) => {
    if (e.key.length === 1 && e.key !== " " && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); onOpen(e.key); }
  };
  return (
    <>
      <button
        type="button"
        onClick={() => onOpen("")}
        onKeyDown={onKeyDown}
        aria-haspopup="dialog"
        aria-keyshortcuts={IS_MAC ? "Meta+K" : "Control+K"}
        aria-label={`Search the admin panel (${SHORTCUT})`}
        className={cx(
          "hidden h-10 w-60 items-center gap-2 rounded-xl border border-ttfc-line bg-ttfc-panel2/70 px-3 text-left text-sm text-ttfc-dim transition hover:border-ttfc-purple/60 hover:text-ttfc-muted md:flex lg:w-72 xl:w-96",
          focusRing,
        )}
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">Search people, tickets, pages…</span>
        <kbd className="rounded-md border border-ttfc-line bg-ttfc-ink px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ttfc-muted" aria-hidden="true">{SHORTCUT}</kbd>
      </button>
      <IconButton icon={Search} label="Search the admin panel" onClick={() => onOpen("")} onKeyDown={onKeyDown} aria-haspopup="dialog" className="md:hidden" />
    </>
  );
}

function Palette({ initial, onClose, onGo }) {
  const { me, isManagement } = useAdmin();
  const userId = String(me?._id || me?.id || me?.email || "");
  const [text, setText] = useState(initial);
  const [recents, setRecents] = useState(() => loadRecents(userId));
  const [res, setRes] = useState({ for: "", data: null, error: null });
  const [nav, setNav] = useState({ key: "", index: 0 });
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const uid = useId();
  const listboxId = `${uid}-list`;
  const statusId = `${uid}-status`;
  const optionId = (i) => `${uid}-opt-${i}`;

  const q = useMemo(() => readQuery(text), [text]);
  const dq = useDebounced(q.tooShort ? "" : q.text, DEBOUNCE_MS);

  // The server's groups, 200 ms after typing stops; an older answer never replaces a newer one (aborted).
  useEffect(() => {
    if (!dq) return undefined;
    const ctrl = new AbortController();
    adminFetch("/console/search", { method: "POST", body: { q: dq }, signal: ctrl.signal }).then(
      (data) => setRes({ for: dq, data, error: null }),
      (error) => { if (error?.name !== "AbortError") setRes({ for: dq, data: null, error }); },
    );
    return () => ctrl.abort();
  }, [dq]);

  // Focus the box (caret at the end), lock the page behind, give focus back on close.
  useEffect(() => {
    const before = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }, 10);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = overflow;
      if (before && typeof before.focus === "function" && document.contains(before)) before.focus({ preventScroll: true });
    };
  }, []);

  const fresh = !q.tooShort && res.for === q.text;
  const loading = !q.tooShort && !fresh;
  const server = !q.tooShort && res.data && !res.data.tooShort ? res.data : null;
  const pages = useMemo(() => searchAdminIndex(q, { isManagement }), [q, isManagement]);

  /* Groups → one flat list of options (what ↑ ↓ walk through). */
  const groups = useMemo(() => {
    const out = [];
    if (q.tooShort) {
      if (recents.queries.length) {
        out.push({ key: "recent-q", label: "Recent searches",
          options: recents.queries.map((query) => ({ key: `rq:${query}`, kind: "query", query, title: query })) });
      }
      if (recents.results.length) {
        out.push({ key: "recent-r", label: "Recently opened",
          options: recents.results.map((r) => ({ key: `rr:${r.link}`, kind: "result", item: r, title: r.title, subtitle: r.subtitle, groupLabel: r.group, recent: true })) });
      }
      if (out.length) out[out.length - 1].options.push({ key: "clear", kind: "clear", title: "Clear recent searches" });
      return out;
    }
    const pageGroup = pages.items.length ? [{
      key: "pages", label: "Pages and settings", total: pages.total, more: pages.total > pages.items.length,
      options: pages.items.map((p) => ({ key: `p:${p.id}`, kind: "result", item: { ...p, icon: undefined }, icon: p.icon, title: p.title, subtitle: p.subtitle, groupLabel: "Pages and settings" })),
    }] : [];
    const serverGroups = (server?.groups || []).map(withSponsorRule).map((g) => ({
      key: g.key, label: g.label, total: g.total, more: g.more, stale: !fresh,
      options: [
        ...g.items.map((it) => ({ key: `${g.key}:${it.type}:${it.id}`, kind: "result", item: it, title: it.title, subtitle: it.subtitle, groupLabel: g.label, stale: !fresh })),
        ...(g.seeAll ? [{ key: `${g.key}:all`, kind: "all", title: g.seeAll.label, link: g.seeAll.link, count: g.more ? g.total : 0, stale: !fresh }] : []),
      ],
    }));
    // An exact email / ticket ID hit comes first; otherwise pages, then the rest in the server's order.
    return server?.query?.exact ? [...serverGroups, ...pageGroup] : [...pageGroup, ...serverGroups];
  }, [q, recents, pages, server, fresh]);

  const options = useMemo(() => groups.flatMap((g) => g.options), [groups]);
  const optionsKey = useMemo(() => options.map((o) => o.key).join("|"), [options]);
  const active = nav.key === optionsKey ? Math.min(nav.index, options.length - 1) : 0;
  const move = (i) => setNav({ key: optionsKey, index: i });

  useEffect(() => {
    document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, optionsKey, uid]);

  const choose = (o, { newTab = false } = {}) => {
    if (!o) return;
    if (o.kind === "query") { setText(o.query); inputRef.current?.focus(); return; }
    if (o.kind === "clear") { clearRecents(); setRecents(loadRecents(userId)); inputRef.current?.focus(); return; }
    if (o.stale) return; // results for an older query: wait for this one's
    const link = o.kind === "all" ? o.link : o.item.link;
    const next = rememberSearch(userId, o.recent ? "" : q.text, o.kind === "result"
      ? { ...o.item, group: o.groupLabel } : null);
    if (newTab) { window.open(link, "_blank", "noopener"); setRecents(next); return; }
    onGo(link);
  };

  const onKeyDown = (e) => {
    const n = options.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (n) move((active + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(options[active], { newTab: e.metaKey || e.ctrlKey });
    } else if (e.key === "Escape") {
      // Only the palette closes, not a drawer or dialog open behind it.
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === "Tab") {
      // Keep focus in the palette.
      const els = [...(panelRef.current?.querySelectorAll("input,button:not([disabled])") || [])];
      if (els.length < 2) { e.preventDefault(); return; }
      const i = els.indexOf(document.activeElement);
      const to = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : (i === els.length - 1 ? 0 : i + 1);
      e.preventDefault();
      els[to].focus();
    }
  };

  const failed = fresh ? server?.failed || [] : [];
  const resultCount = groups.reduce((n, g) => n + g.options.filter((o) => o.kind === "result").length, 0);
  let status = "";
  if (!text.trim()) status = recents.queries.length || recents.results.length ? "" : "Search people, tickets, passes, RSVPs, sessions, speakers, partners, leads, pages and settings.";
  else if (q.tooShort) status = "Type at least 2 characters.";
  else if (res.error && res.for === q.text) status = res.error.message || "Search isn't working right now.";
  else if (loading && !resultCount) status = "Searching…";
  else if (fresh && !resultCount) status = `No results for “${q.text}”.`;
  const liveStatus = status || (fresh ? `${resultCount} result${resultCount === 1 ? "" : "s"}${failed.length ? `; couldn't search ${failed.length} source${failed.length === 1 ? "" : "s"}` : ""}.` : loading ? "Searching…" : "");

  return createPortal(
    <div className="ttfc-admin-portal fixed inset-0 z-[99995] flex items-start justify-center sm:p-6 sm:pt-[9vh]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search the admin panel"
        className="relative flex h-full w-full flex-col overflow-hidden bg-ttfc-panel text-ttfc-text shadow-2xl shadow-black/60 animate-in fade-in slide-in-from-top-2 sm:h-auto sm:max-h-[min(680px,82vh)] sm:max-w-2xl sm:rounded-[22px] sm:border sm:border-ttfc-line"
      >
        <div className="flex items-center gap-2 border-b border-ttfc-line px-3 sm:px-4">
          <Search className="h-5 w-5 shrink-0 text-ttfc-pink" aria-hidden="true" />
          <label htmlFor={`${uid}-input`} className="sr-only">Search the admin panel</label>
          <input
            id={`${uid}-input`}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={options.length ? optionId(active) : undefined}
            aria-describedby={statusId}
            inputMode="search"
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={100}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search people, tickets, passes, pages…"
            className="h-14 min-w-0 flex-1 bg-transparent px-1 text-base text-ttfc-text outline-none placeholder:text-ttfc-dim"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ttfc-purple" aria-hidden="true" />}
          {text && (
            <button type="button" onClick={() => { setText(""); inputRef.current?.focus(); }} aria-label="Clear the search"
              className={cx("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ttfc-muted hover:bg-white/5 hover:text-ttfc-text", focusRing)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close search"
            className={cx("shrink-0 rounded-lg px-2 py-1.5 text-sm font-semibold text-ttfc-muted hover:text-ttfc-text sm:border sm:border-ttfc-line sm:px-1.5 sm:py-0.5 sm:text-[11px]", focusRing)}>
            <span className="sm:hidden" aria-hidden="true">Cancel</span>
            <span className="hidden sm:inline" aria-hidden="true">Esc</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        <div id={listboxId} role="listbox" aria-label="Search results">
          {groups.map((g) => (
            <div key={g.key} role="group" aria-labelledby={`${uid}-g-${g.key}`} className={cx("pt-2", g.stale && "opacity-60")}>
              <p id={`${uid}-g-${g.key}`} className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ttfc-dim">
                {g.label}{g.more && g.total ? <span className="font-semibold normal-case tracking-normal"> · {g.total}</span> : null}
              </p>
              {g.options.map((o) => {
                const i = options.indexOf(o);
                const on = i === active;
                const Icon = o.kind === "query" ? History : o.kind === "all" ? ArrowRight : o.kind === "clear" ? Eraser : o.icon || TYPE_ICONS[o.item?.type] || Search;
                const quiet = o.kind === "all" || o.kind === "clear";
                return (
                  <div
                    key={o.key}
                    id={optionId(i)}
                    role="option"
                    aria-selected={on}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseMove={() => { if (!on) move(i); }}
                    onClick={(e) => choose(o, { newTab: e.metaKey || e.ctrlKey })}
                    className={cx(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                      on ? "bg-white/[0.07] shadow-[inset_0_0_0_1px_rgba(139,92,246,0.55)]" : "hover:bg-white/[0.03]",
                    )}
                  >
                    <span className={cx("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      o.kind === "all" ? "text-ttfc-pink" : o.kind === "clear" ? "text-ttfc-dim" : "bg-ttfc-panel3 text-ttfc-muted", on && !quiet && "text-ttfc-text")}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cx("block truncate text-sm", o.kind === "all" ? "font-semibold text-ttfc-pink" : o.kind === "clear" ? "text-ttfc-muted" : "font-semibold text-ttfc-text")}>
                        {o.kind === "result" && !o.recent ? <Marked text={o.title} q={q} /> : o.title}
                        {o.kind === "all" && o.count ? <span className="font-normal text-ttfc-muted"> ({o.count})</span> : null}
                      </span>
                      {o.subtitle && (
                        <span className="block truncate text-xs text-ttfc-muted">
                          {o.recent ? <>{o.groupLabel ? `${o.groupLabel} · ` : ""}{o.subtitle}</> : <Marked text={o.subtitle} q={q} />}
                        </span>
                      )}
                    </span>
                    {o.item?.exact && <span className="hidden shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 sm:inline">Exact</span>}
                    {(o.item?.badges || []).slice(0, 2).map((b) => (
                      <span key={b} className="hidden shrink-0 rounded-full border border-ttfc-line bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-ttfc-muted sm:inline">{b}</span>
                    ))}
                    <CornerDownLeft className={cx("hidden h-4 w-4 shrink-0 text-ttfc-dim sm:block", !on && "invisible")} aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

          {status && (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-ttfc-muted">
              {fresh && !resultCount ? <SearchX className="h-6 w-6 text-ttfc-dim" aria-hidden="true" /> : null}
              <p>{status}</p>
            </div>
          )}
          {failed.length > 0 && (
            <p className="mx-3 mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              Couldn't search {failed.map((f) => f.label).join(", ")} just now. Everything else is up to date; try again in a moment.
            </p>
          )}
        </div>

        <p id={statusId} role="status" aria-live="polite" className="sr-only">{liveStatus}</p>
        <div className="hidden items-center gap-4 border-t border-ttfc-line px-4 py-2.5 text-[11px] text-ttfc-dim sm:flex" aria-hidden="true">
          <span><kbd className="font-sans font-semibold text-ttfc-muted">↑</kbd> <kbd className="font-sans font-semibold text-ttfc-muted">↓</kbd> move</span>
          <span><kbd className="font-sans font-semibold text-ttfc-muted">Enter</kbd> open</span>
          <span><kbd className="font-sans font-semibold text-ttfc-muted">{IS_MAC ? "⌘" : "Ctrl"} Enter</kbd> new tab</span>
          <span><kbd className="font-sans font-semibold text-ttfc-muted">Esc</kbd> close</span>
          <span className="ml-auto">Emails and ticket IDs match exactly</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * The top bar's search box + the palette. `onNavigated` lets the shell re-open the page fresh when a result
 * links to the page that's already open (its search, drawer or highlight then follows the link).
 */
export default function GlobalSearch({ onNavigated }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(null); // null = closed, else { initial }

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || String(e.key).toLowerCase() !== "k") return;
      // Rich-text editors keep ⌘K for their own link button.
      if (e.target?.closest?.('[contenteditable="true"], .ql-editor')) return;
      e.preventDefault();
      setOpen((o) => (o ? null : { initial: "" }));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <SearchTrigger onOpen={(initial) => setOpen({ initial })} />
      {open && (
        <Palette
          initial={open.initial}
          onClose={() => setOpen(null)}
          onGo={(link) => { setOpen(null); navigate(link); onNavigated?.(link); }}
        />
      )}
    </>
  );
}
