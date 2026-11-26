import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, GitPullRequestArrow, Lock, Send, Upload } from "lucide-react";
import { Badge, Button } from "../ui";
import { useApi } from "../hooks";
import { changeState } from "./workflowState";

/* =========================================================
   The website content workflow (Nov 2026):
     Save                (any staff)   kept in the panel; no website changes
     Send to staging     (any staff)   shows on the staging site for review
     Publish to live     (any staff)   goes on thetechfestival.com
   Editors show these as one flow with one main button (PublishFlow below).
   Backend: /api/cms (routes/cms.js). Every editor saves with ?draft=1 and lists with
   ?drafts=1; Admin › Website content › Changes sends and publishes in batches.
========================================================= */

/** The small badge an editor shows on a row with changes on their way. Nothing for live rows. */
export function ChangeBadge({ doc, className }) {
  const st = changeState(doc);
  return st ? <Badge tone={st.tone} className={className}>{st.label}</Badge> : null;
}

/** The line at the top of each content editor: what is waiting to be published, with the way there.
    Nothing when nothing is waiting (Nov 26 2026, step 2 of the admin redesign: it was a paragraph on every page). */
export function WorkflowBanner() {
  const { data } = useApi("/cms/changes");
  const unsent = data?.counts?.unsent || 0, staged = data?.counts?.staged || 0;
  if (!unsent && !staged) return null;
  const waiting = [unsent && `${unsent} saved, not sent yet`, staged && `${staged} on staging`].filter(Boolean).join(" · ");
  return (
    <Link to="/admin/content/changes"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-[#E3E0EE] bg-white px-3.5 py-2.5 text-sm text-[#4A4566] outline-none hover:bg-[#F6F5FA] focus-visible:ring-2 focus-visible:ring-[#D6308C]">
      <GitPullRequestArrow className="h-4 w-4 shrink-0 text-[#8A86A0]" aria-hidden="true" />
      <span>Website changes waiting: <b className="text-[#151035]">{waiting}</b></span>
      <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap font-semibold text-ttfc-pink">Review and publish <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
    </Link>
  );
}

/* One publish flow (Nov 26 2026, step 2 of the admin redesign). An editor's header used to carry Save, Send to
   staging and Publish to live side by side. Now it shows where the page stands (Saved › On staging › Live) and
   ONE main button: the next step.
     changes not on staging yet (typed or saved)  → Send to staging   (saves first)
     on staging, nothing newer                    → Publish to live   (with "Check on staging")
     nothing waiting                              → "Live: nothing to publish"
   Save stays as a small button while there are unsaved changes (autosave does it after 30 seconds anyway). */
const STEPS = ["Saved", "On staging", "Live"];
export function PublishFlow({ dirty, hasDraft, staged, busy = "", disabled = false, onSave, onStage, onPublish, publishBlocked = false, publishWhy = "", stagingHref, onOpenStaging, children }) {
  const pending = !!dirty || !!hasDraft;
  // Where the newest version of the page is: 0 = only saved here, 1 = on staging, 2 = live.
  const at = pending ? 0 : staged ? 1 : 2;
  const off = disabled || !!busy;
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
      {children}
      <ol aria-label="Where this page's changes are" className="flex items-center gap-1.5 text-xs">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === at ? "step" : undefined} className={`flex items-center gap-1.5 ${i === at ? "font-bold text-[#151035]" : "text-[#8A86A0]"}`}>
            {i > 0 && <span aria-hidden="true">›</span>}
            <span className={`h-1.5 w-1.5 rounded-full ${i === at ? "bg-[#D6308C]" : i < at ? "bg-[#1F9D55]" : "bg-[#D5D2E0]"}`} aria-hidden="true" />
            {i === 0 && dirty ? "Not saved yet" : label}
          </li>
        ))}
      </ol>
      {dirty && onSave && <Button size="sm" onClick={onSave} disabled={off} loading={busy === "save"}>Save</Button>}
      {at === 1 && (stagingHref
        ? <a href={stagingHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-ttfc-pink hover:underline">Check on staging <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
        : onOpenStaging ? <Button size="sm" variant="ghost" icon={ExternalLink} onClick={onOpenStaging}>Check on staging</Button> : null)}
      {at === 0 && <Button variant="primary" icon={Send} onClick={onStage} disabled={off}>{busy === "stage" ? "Sending…" : "Send to staging"}</Button>}
      {at === 1 && <Button variant="primary" icon={publishBlocked ? Lock : Upload} onClick={onPublish} disabled={off || publishBlocked} title={publishWhy || undefined}>{busy === "publish" ? "Publishing…" : "Publish to live"}</Button>}
      {at === 2 && <span className="rounded-full bg-[#E8F6EE] px-3 py-1.5 text-xs font-semibold text-[#17663A]">Live: nothing to publish</span>}
    </div>
  );
}
