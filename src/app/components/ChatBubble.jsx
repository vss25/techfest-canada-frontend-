import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Clock, Reply } from "lucide-react";
import { listTime } from "../lib/time";
import { READ_BLUE, RECEIPT_LABEL } from "../lib/receipts";
import { givenName } from "../lib/ui";
import { whoIsTyping } from "../lib/typing";
import { Avatar, Popover } from "./ui";

/* =========================================================
   One bubble style for 1:1 chat, group chat and discussion
   threads (iOS ChatBubble), the "Alex is typing" line (iOS
   TypingIndicator) and a long-press menu (iOS contextMenu)
   for Report / Block on other people's messages. Your own
   1:1 messages carry read receipts by the time (lib/receipts).
========================================================= */

/** ✓ sent · ✓✓ delivered (grey) · ✓✓ read (blue) · a clock while held for review. */
export function Ticks({ state }) {
  if (!state) return null;
  const Icon = state === "held" ? Clock : state === "sent" ? Check : CheckCheck;
  return (
    <span className={"ticks ticks--" + state} role="img" aria-label={RECEIPT_LABEL[state]} title={RECEIPT_LABEL[state]}
      style={state === "read" ? { color: READ_BLUE } : undefined}>
      <Icon aria-hidden="true" />
    </span>
  );
}

/** Long press (or right-click) opens a small menu by the bubble. items: [{ label, icon, onClick, danger }]. */
function useLongPress(enabled) {
  const [anchor, setAnchor] = useState(null);
  const timer = useRef(null);
  const start = (e) => {
    if (!enabled) return;
    const el = e.currentTarget;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAnchor(el.getBoundingClientRect()), 480);
  };
  const cancel = () => clearTimeout(timer.current);
  useEffect(() => () => clearTimeout(timer.current), []);
  const handlers = enabled ? {
    onPointerDown: start, onPointerUp: cancel, onPointerLeave: cancel, onPointerCancel: cancel,
    onContextMenu: (e) => { e.preventDefault(); setAnchor(e.currentTarget.getBoundingClientRect()); },
  } : {};
  return [handlers, anchor, () => setAnchor(null)];
}

/** `receipt`: lib/receipts receiptOf(message), for your own 1:1 messages ("held" shows the held line instead). */
export function ChatBubble({ text, mine, author, avatarUrl, timestamp, quote, held, receipt, onReply, menu }) {
  const items = (menu || []).filter(Boolean);
  const [press, anchor, close] = useLongPress(!mine && items.length > 0);
  return (
    <div className={mine ? "cb-row cb-row--mine" : "cb-row"}>
      {!mine && author && <Avatar name={author} src={avatarUrl} size={28} />}
      <div className="cb-col">
        {!mine && author && <span className="cb-author">{author}</span>}
        <div className={"cb" + (mine ? " cb--mine" : "") + (held ? " cb--held" : "")} {...press}>
          {quote && <span className="cb-quote"><span>{quote}</span></span>}
          {text}
        </div>
        <span className="cb-meta">
          {held && <span className="row" style={{ gap: 3 }}><Clock aria-hidden="true" />Held for review</span>}
          {timestamp && (receipt && receipt !== "held" ? (
            <span className="cb-time"><time dateTime={timestamp}>{listTime(timestamp)}</time><Ticks state={receipt} /></span>
          ) : <time dateTime={timestamp}>{listTime(timestamp)}</time>)}
          {onReply && <button type="button" className="cb-reply pressable" onClick={onReply} aria-label={`Reply to ${author || "this message"}`}><Reply aria-hidden="true" />Reply</button>}
        </span>
      </div>
      {anchor && (
        <Popover anchor={anchor} onClose={close} width={220} label="Message options">
          <div className="pop-menu" role="menu">
            {items.map((it) => {
              const I = it.icon;
              return <button key={it.label} type="button" role="menuitem" className={it.danger ? "danger" : undefined} onClick={() => { close(); it.onClick(); }}>{I && <I aria-hidden="true" width={16} />}{it.label}</button>;
            })}
          </div>
        </Popover>
      )}
    </div>
  );
}

/** "Alex is typing" above a group or discussion composer; polls every 2.5 s, collapses when nobody is. */
export function TypingIndicator({ scope, id }) {
  const [names, setNames] = useState([]);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!id) return undefined;
    let alive = true, tick = 0;
    const loop = async () => {
      if (!alive) return;
      if (tick % 6 === 0 && document.visibilityState === "visible") {
        const who = await whoIsTyping(scope, id);
        if (alive) setNames(who);
      }
      tick += 1;
      if (alive) setPhase((p) => (p + 1) % 3);
    };
    loop();
    const t = setInterval(loop, 420);
    return () => { alive = false; clearInterval(t); };
  }, [scope, id]);
  const label = names.length === 0 ? ""
    : names.length === 1 ? `${givenName(names[0])} is typing`
      : names.length === 2 ? `${givenName(names[0])} and ${givenName(names[1])} are typing`
        : `${givenName(names[0])} and ${names.length - 1} others are typing`;
  return (
    <div className={"typing" + (names.length ? " typing--on" : "")} aria-live="polite">
      {names.length > 0 && (
        <>
          <span className="typing-dots" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} style={{ opacity: phase === i ? 1 : 0.35 }} />)}</span>
          <span className="ellipsis">{label}</span>
        </>
      )}
    </div>
  );
}
