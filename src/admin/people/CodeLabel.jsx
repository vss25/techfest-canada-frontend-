import { Tag } from "lucide-react";
import { Badge } from "../ui";

/* =========================================================
   The coupon code a ticket was bought with (Oct 20 2026, the
   organiser: "show what coupon code did the person use to purchase
   the ticket"), on People, a person's passes, Headcounts & RSVPs
   and Ticket records. The server works it out (backend
   services/promoCodes.js): { kind, code, discount, label }.
     code     the code and its discount: SPRING20 · 20% off
     none     "No code" (bought without one)
     staff    "Given by staff", "Complimentary", "Speaker Pass"…
              (a pass staff made: never shown as a coupon), muted
     unknown  "—" (nothing on record)
   `prefix`: "Code:" before a code (a person's passes).
========================================================= */

export default function CodeLabel({ code, prefix = false, className = "" }) {
  if (!code || code.kind === "unknown") return <span className={`text-xs text-ttfc-dim ${className}`} title="Nothing on record for this ticket">—</span>;
  if (code.kind === "code") {
    return (
      <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`} title={code.label}>
        {prefix && <span className="text-xs text-ttfc-muted">Code:</span>}
        <Badge tone="pink" icon={Tag} className="font-mono">{code.code}</Badge>
        {code.discount ? <span className="text-xs text-ttfc-muted">{code.discount}% off</span> : null}
      </span>
    );
  }
  return <span className={`text-xs ${code.kind === "staff" ? "italic text-ttfc-dim" : "text-ttfc-muted"} ${className}`}>{code.label}</span>;
}
