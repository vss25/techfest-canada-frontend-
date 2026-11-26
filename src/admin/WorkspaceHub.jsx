import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronRight, Lock } from "lucide-react";
import { workspacesFor } from "./access";
import { useAdmin } from "./adminContext";

/* =========================================================
   A workspace's pages as cards (/admin/ws/<id>): what the phone's
   bottom tabs open in the approved design (board 18), and a plain
   index of the workspace on any screen. The cards are the
   workspace menu's pages, grouped the same way.
========================================================= */

const pathOf = (to) => (to ? `/admin/${to}` : "/admin");

export default function WorkspaceHub() {
  const { id } = useParams();
  const { isManagement, isSuperAdmin, isVolunteer } = useAdmin();
  const all = workspacesFor({ isManagement, isSuperAdmin, isVolunteer });
  const ws = all.find((w) => w.id === id);
  if (!ws) return <Navigate to="/admin" replace />;
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-[#6B6688]">{ws.label}</span>
        <h1 className="text-[22px] font-bold text-[#151035]">{ws.label}</h1>
        <p className="text-sm text-[#4A4566]">{ws.job}</p>
      </div>
      {ws.groups.map((g, gi) => (
        <section key={gi} className="flex flex-col gap-2" aria-label={g.title || ws.label}>
          {g.title && <h2 className="pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A86A0]">{g.title}</h2>}
          {g.items.map((it) => (
            <Link key={it.to} to={pathOf(it.to)}
              className="flex items-center gap-2.5 rounded-xl border border-[#E3E0EE] bg-white p-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C]">
              <span className="flex min-w-0 flex-col gap-0.5">
                <b className="text-[15px] text-[#151035]">{it.menuLabel || it.label}</b>
                <span className="text-xs text-[#6B6688]">{g.title ? `${ws.label} › ${g.title}` : ws.label}</span>
              </span>
              {it.management && <Lock className="h-3.5 w-3.5 shrink-0 text-[#B45309]" aria-label="Management only" />}
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#8A86A0]" aria-hidden="true" />
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}
