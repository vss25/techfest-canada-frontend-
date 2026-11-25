import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { Card, PageHeader } from "./ui";
import { START_HERE, helpFor } from "./help";
import { workspacesFor } from "./access";
import { useAdmin } from "./adminContext";
import { HelpContent } from "./HelpButton";

/* Home › Help & how-to: Start here for someone new, then every page's guide (help.js) by workspace,
   searchable. Each page also shows its own guide from the ⓘ next to its title. */

const pathOf = (to) => (to ? `/admin/${to}` : "/admin");

export default function HelpGuide() {
  const { isManagement, isSuperAdmin, isVolunteer } = useAdmin();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const workspaces = useMemo(() => workspacesFor({ isManagement, isSuperAdmin, isVolunteer }).map((w) => ({
    ...w,
    pages: w.groups.flatMap((g) => g.items).filter((it) => it.to !== "help")
      .map((it) => ({ ...it, guide: helpFor(it.to) })).filter((it) => it.guide)
      .filter((it) => !needle || [it.label, it.guide.what, ...it.guide.steps, ...it.guide.tips].join(" ").toLowerCase().includes(needle)),
  })).filter((w) => w.pages.length), [isManagement, isSuperAdmin, isVolunteer, needle]);

  return (
    <>
      <PageHeader title="Help & how-to" description="How the panel works, and a guide to every page. Every page also has an ⓘ next to its title with its own guide." />
      {!needle && (
        <Card className="mb-6 grid gap-4">
          <h2 className="text-lg font-bold text-[#151035]">Start here</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {START_HERE.map((s) => (
              <section key={s.h} className="rounded-xl border border-[#E3E0EE] bg-[#F6F5FA] p-4">
                <h3 className="mb-1 text-sm font-semibold text-[#151035]">{s.h}</h3>
                <p className="text-sm leading-relaxed text-[#4A4566]">{s.p}</p>
              </section>
            ))}
          </div>
        </Card>
      )}
      <label className="mb-4 flex h-10 max-w-md items-center gap-2 rounded-[10px] border border-[#E3E0EE] bg-white px-3 text-sm focus-within:ring-2 focus-within:ring-[#D6308C]">
        <Search className="h-4 w-4 text-[#6B6688]" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the guides, e.g. publish, speaker, refund" aria-label="Search the guides"
          className="min-w-0 flex-1 bg-transparent text-[#151035] outline-none placeholder:text-[#8A86A0]" />
      </label>
      {!workspaces.length && <p className="text-sm text-[#6B6688]">No guide mentions “{q}”.</p>}
      <div className="grid gap-6">
        {workspaces.map((w) => (
          <section key={w.id} aria-labelledby={`help-${w.id}`}>
            <h2 id={`help-${w.id}`} className="mb-1 text-base font-bold text-[#151035]">{w.label}</h2>
            <p className="mb-3 text-xs text-[#6B6688]">{w.job}</p>
            <div className="grid gap-2">
              {w.pages.map((it) => (
                <details key={it.to} open={!!needle} className="group rounded-xl border border-[#E3E0EE] bg-white">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-[#151035]">{it.label}</span>
                      <span className="block truncate text-xs text-[#6B6688]">{it.guide.what}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#8A86A0] transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="border-t border-[#E3E0EE] px-4 pb-4 pt-3">
                    <HelpContent guide={it.guide} />
                    <Link to={pathOf(it.to)} className="mt-4 inline-block text-sm font-semibold text-[#D6308C] hover:underline">Open {it.label} →</Link>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
