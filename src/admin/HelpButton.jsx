import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { Drawer } from "./ui";
import { helpFor } from "./help";
import { useFieldHelp } from "./fieldHelp";

/* The ⓘ next to every page title: how to use this page (help.js), in a side panel.
   Pages without a guide show nothing. */

export function HelpContent({ guide }) {
  return (
    <div className="flex flex-col gap-5 text-sm leading-relaxed text-[#4A4566]">
      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A86A0]">What it's for</h3>
        <p className="text-[#151035]">{guide.what}</p>
      </section>
      {guide.steps.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A86A0]">How to use it</h3>
          <ol className="flex flex-col gap-2">
            {guide.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#151035] text-[11px] font-semibold text-white" aria-hidden="true">{i + 1}</span>
                <span className="text-[#151035]">{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {guide.tips.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A86A0]">Good to know</h3>
          <ul className="flex flex-col gap-1.5">
            {guide.tips.map((t, i) => (
              <li key={i} className="flex gap-2"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#D6308C]" aria-hidden="true" /><span>{t}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function HelpButton({ to, title }) {
  const [open, setOpen] = useState(false);
  const guide = helpFor(to);
  if (!guide) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`How to use ${title || "this page"}`}
        title="How to use this page"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E3E0EE] bg-white text-[#6B6688] transition-colors hover:border-[#D6308C] hover:text-[#D6308C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C]"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={`How to use: ${title || "this page"}`}
        footer={<Link to="/admin/help" onClick={() => setOpen(false)} className="text-sm font-semibold text-[#D6308C] hover:underline">All guides and Start here →</Link>}
      >
        <HelpContent guide={guide} />
      </Drawer>
    </>
  );
}

/* ---------- Help on a single field or section ----------
   An ⓘ after a field's label when this page's guide explains that field (help.js FIELD_HELP,
   keyed by the page and the label as shown). Click it: the explanation opens under the label. */

/** A field's label row with its ⓘ and, when opened, the explanation. `as` is the label element. */
export function HelpLabel({ label, children, className = "", as: As = "label", htmlFor, text: given }) {
  const found = useFieldHelp(label);
  const text = given || found;
  const [open, setOpen] = useState(false);
  const panel = useId();
  return (
    <span className={`flex flex-col gap-1.5 ${className}`}>
      <span className="flex items-center gap-1.5">
        <As {...(As === "label" ? { htmlFor } : {})} className="text-[13px] font-semibold text-ttfc-text/90">{children}</As>
        {text && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panel}
            aria-label={`What is ${label}?`} title={`What is ${label}?`}
            className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C] ${open ? "border-[#D6308C] bg-[#D6308C] text-white" : "border-[#CFCBE0] bg-white text-[#6B6688] hover:border-[#D6308C] hover:text-[#D6308C]"}`}>
            i
          </button>
        )}
      </span>
      {text && open && (
        <span id={panel} role="note" className="block rounded-lg border border-[#E3E0EE] bg-[#F6F5FA] px-3 py-2 text-xs font-normal leading-relaxed text-[#4A4566]">{text}</span>
      )}
    </span>
  );
}
