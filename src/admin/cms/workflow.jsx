import { Link } from "react-router-dom";
import { ArrowRight, GitPullRequestArrow } from "lucide-react";
import { Badge, Banner } from "../ui";
import { useApi } from "../hooks";
import { changeState } from "./workflowState";

/* =========================================================
   The website content workflow (Nov 2026):
     Save                (any staff)   kept in the panel; no website changes
     Send to staging     (any staff)   shows on the staging site for review
     Publish to live     (any staff)   goes on thetechfestival.com
   Backend: /api/cms (routes/cms.js). Every editor saves with ?draft=1 and lists with
   ?drafts=1; Admin › Website content › Changes sends and publishes in batches.
========================================================= */

/** The small badge an editor shows on a row with changes on their way. Nothing for live rows. */
export function ChangeBadge({ doc, className }) {
  const st = changeState(doc);
  return st ? <Badge tone={st.tone} className={className}>{st.label}</Badge> : null;
}

/** The banner at the top of each content editor: how saving works, and what's waiting. */
export function WorkflowBanner() {
  const { data } = useApi("/cms/changes");
  const unsent = data?.counts?.unsent || 0, staged = data?.counts?.staged || 0;
  const waiting = [unsent && `${unsent} saved, not sent`, staged && `${staged} on staging`].filter(Boolean).join(" · ");
  return (
    <Banner
      tone="info"
      icon={GitPullRequestArrow}
      action={<Link to="/admin/content/changes" className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-ttfc-pink hover:underline">Website changes{waiting ? ` (${waiting})` : ""} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
    >
      Saving doesn't change the website. When your changes are ready, send them to staging from Website changes, check them on the staging site, then publish them to the live website.
    </Banner>
  );
}
