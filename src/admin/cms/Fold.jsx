import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/* A section of a long editor that can be closed (Nov 26 2026, step 3 of the admin redesign: the Event page was
   one very long form). Closed: one row with the section's name and what it is for. Open: the section itself,
   with Hide in its corner. The form's values live in the page, so closing a section loses nothing. */
export default function Fold({ title, summary, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-expanded="false"
        className="flex w-full items-center gap-3 rounded-xl border border-[#E3E0EE] bg-white px-[18px] py-3.5 text-left outline-none hover:bg-[#F6F5FA] focus-visible:ring-2 focus-visible:ring-[#D6308C]">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[#151035]">{title}</span>
          {summary && <span className="mt-0.5 block text-sm text-[#6B6688]">{summary}</span>}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ttfc-pink">Open <ChevronDown className="h-4 w-4" aria-hidden="true" /></span>
      </button>
    );
  }
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(false)} aria-expanded="true" aria-label={`Hide ${title}`}
        className="absolute right-3 top-3 z-[1] inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-[#6B6688] outline-none hover:bg-[#F6F5FA] hover:text-[#151035] focus-visible:ring-2 focus-visible:ring-[#D6308C]">
        Hide <ChevronUp className="h-4 w-4" aria-hidden="true" />
      </button>
      {children}
    </div>
  );
}
