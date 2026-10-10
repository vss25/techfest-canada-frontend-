import { AlertTriangle, ExternalLink, Info, MailCheck } from "lucide-react";
import { Badge, Banner, PageHeader } from "../ui";

/* Who receives each website form. Static reference, from a code audit on Oct 3, 2026.
   Update this list whenever a form's recipients change. */
const LAST_CHECKED = "Oct 3, 2026";

const ROWS = [
  {
    form: "Catalyst Awards nomination",
    what: "Nominate a person or company for an award",
    path: "/awards/nominations",
    to: ["baldeep@thetechfestival.com", "nicole@thetechfestival.com"],
    via: "backend",
    viaNote: "from noreply@thetechfestival.com",
    reply: "Confirmation email. Replies go to enquire@thetechfestival.com.",
  },
  {
    form: "Media & press accreditation",
    what: "Journalists and creators applying for a press pass",
    path: "/media",
    to: ["sales@thetechfestival.com", "nicole@thetechfestival.com", "marcom@thetechfestival.com"],
    toNote: "The server's MEDIA_INBOX setting can override this list.",
    via: "backend",
    reply: "Confirmation email. Replies go to marcom@thetechfestival.com.",
  },
  {
    form: "India Startup Pavilion application",
    what: "Application plus $500 deposit",
    path: "/exhibit/india-pavilion",
    to: ["sales@thetechfestival.com"],
    via: "backend",
    reply: "Receipt email.",
  },
  { form: "General enquiry pop-up", what: "The “Inquire” buttons around the site", to: ["baldeep@thetechfestival.com"], via: "emailjs", reply: null },
  { form: "Sponsor enquiry pop-up", what: "Pop-up from sponsor buttons", to: ["baldeep@thetechfestival.com"], via: "emailjs", reply: null },
  { form: "Sponsor page form", what: "Form on the Sponsor page", path: "/sponsor", to: ["baldeep@thetechfestival.com"], via: "emailjs", reply: null },
  { form: "Exhibit / booth enquiry", what: "Booth and exhibitor enquiries", path: "/exhibit", to: ["baldeep@thetechfestival.com"], via: "emailjs", reply: null },
  { form: "Speaker application", what: "People applying to speak", path: "/speakers", to: ["baldeep@thetechfestival.com"], via: "emailjs", reply: null },
  { form: "Volunteer application", what: "People applying to volunteer", path: "/volunteer", to: [], toNote: "Set in the EmailJS template — no address in the website code.", via: "emailjs", reply: null, check: true },
  { form: "Institutional partnership enquiry", what: "Organisations asking to partner", path: "/partners2026", to: [], toNote: "Set in the EmailJS template — no address in the website code.", via: "emailjs", reply: null, check: true },
  { form: "Newsletter sign-up", what: "Email box in the footer and on some pages", to: [], toNote: "Not emailed to staff — saved as a subscriber.", via: "saved", reply: "Confirmation email from noreply@thetechfestival.com." },
  { form: "Brochure download", what: "Request a brochure", path: "/brochures", to: ["sales@thetechfestival.com"], toNote: "A receipt for each download. Every download is also listed under Leads → Brochure downloads.", via: "backend", viaNote: "from noreply@thetechfestival.com", reply: "The brochure (download link, or the PDF attached when it's small enough). Replies go to sales@thetechfestival.com." },
  { form: "Ticket purchase", what: "Buying a pass through Stripe", path: "/tickets", to: [], toNote: "No staff email.", via: "stripe", reply: "Their ticket, from tickets@thetechfestival.com." },
];

const VIA = {
  backend: { label: "Backend email", tone: "purple", hint: "Resend" },
  emailjs: { label: "EmailJS", tone: "orange", hint: "service_gy3fvru, template_ufqzzep" },
  saved: { label: "Saved only", tone: "neutral" },
  stripe: { label: "Stripe", tone: "good" },
};

function Where({ path }) {
  if (!path) return <span className="text-ttfc-dim">Site-wide pop-up</span>;
  return (
    <a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-ttfc-pink hover:underline">
      {path} <ExternalLink className="h-3 w-3" aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function Recipients({ r }) {
  return (
    <div className="space-y-1">
      {r.to.map((e) => <p key={e} className="break-all font-mono text-xs text-ttfc-text">{e}</p>)}
      {r.toNote && <p className="text-xs text-ttfc-muted">{r.toNote}</p>}
      {r.check && (
        <p className="inline-flex items-start gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] font-semibold text-amber-200">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" /> Check the template's To address in EmailJS
        </p>
      )}
    </div>
  );
}

function How({ r }) {
  const v = VIA[r.via];
  return (
    <div className="space-y-1">
      <Badge tone={v.tone}>{v.label}</Badge>
      {(r.viaNote || v.hint) && <p className="break-words text-xs text-ttfc-dim">{[v.hint, r.viaNote].filter(Boolean).join(", ")}</p>}
    </div>
  );
}

const Reply = ({ r }) => (r.reply ? <span className="text-sm">{r.reply}</span> : <span className="text-sm text-ttfc-dim">No automatic reply</span>);

export default function EmailTracking() {
  return (
    <>
      <PageHeader
        eyebrow="Staff & safety"
        title="Email tracking"
        description="Who receives each form on the website, how it's sent, and what the person who filled it in gets back. Use it to find a missing enquiry or to know who should be answering."
      />
      <Banner tone="info" icon={Info} className="mb-6" title="EmailJS templates can change the recipient">
        Forms sent with EmailJS use a template whose “To” address can override what's listed here. For anything marked “Check the template”, confirm the address in the EmailJS dashboard.
      </Banner>

      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto rounded-[18px] border border-ttfc-line bg-ttfc-panel xl:block">
        <table className="adm-table">
          <caption className="sr-only">Website forms and who receives them</caption>
          <thead>
            <tr><th>Form / what it is</th><th>Where on the site</th><th>Who receives it</th><th>How it's sent</th><th>Sender gets back</th></tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.form} className="align-top">
                <td className="min-w-[160px]"><p className="font-semibold">{r.form}</p><p className="text-xs text-ttfc-muted">{r.what}</p></td>
                <td className="whitespace-nowrap"><Where path={r.path} /></td>
                <td className="min-w-[190px]"><Recipients r={r} /></td>
                <td className="min-w-[120px]"><How r={r} /></td>
                <td className="min-w-[160px]"><Reply r={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
        {ROWS.map((r) => (
          <li key={r.form} className="rounded-[18px] border border-ttfc-line bg-ttfc-panel p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{r.form}</p>
                <p className="text-xs text-ttfc-muted">{r.what}</p>
              </div>
              <MailCheck className="h-4 w-4 shrink-0 text-ttfc-dim" aria-hidden="true" />
            </div>
            <dl className="grid gap-3 text-sm">
              <div><dt className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ttfc-dim">Where</dt><dd><Where path={r.path} /></dd></div>
              <div><dt className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ttfc-dim">Who receives it</dt><dd><Recipients r={r} /></dd></div>
              <div><dt className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ttfc-dim">How it's sent</dt><dd><How r={r} /></dd></div>
              <div><dt className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ttfc-dim">Sender gets back</dt><dd><Reply r={r} /></dd></div>
            </dl>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-ttfc-dim">Last checked: {LAST_CHECKED}. If a form or inbox changes, ask a developer to update this page.</p>
    </>
  );
}
