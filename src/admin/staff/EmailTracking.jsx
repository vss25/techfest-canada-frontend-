import { ExternalLink, Info, MailCheck } from "lucide-react";
import { Badge, Banner, PageHeader } from "../ui";

/* Who receives each website form. Static reference, from a code audit on Oct 3, 2026,
   updated Oct 11, 2026 when the EmailJS forms moved to the backend.
   Update this list whenever a form's recipients change. */
const LAST_CHECKED = "Oct 11, 2026";

/* The forms that used EmailJS until Oct 2026: now saved by the backend first
   (Leads → Form submissions), then emailed (server setting FORMS_INBOX). */
const SAVED_FORM = {
  to: ["baldeep@thetechfestival.com"],
  toNote: "Saved in the admin panel first (More › Form submissions), then emailed. Reply goes straight to the person.",
  via: "backend",
  viaNote: "from enquire@thetechfestival.com",
  reply: null,
};

const ROWS = [
  {
    form: "Catalyst Awards nomination",
    what: "Nominate a person or company for an award",
    path: "/awards/nominations",
    to: ["baldeep@thetechfestival.com", "nicole@thetechfestival.com"],
    via: "backend",
    viaNote: "from enquire@thetechfestival.com",
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
  { form: "General enquiry pop-up", what: "The “Inquire” buttons around the site", ...SAVED_FORM },
  { form: "Sponsor enquiry pop-up", what: "Pop-up from the sponsor buttons", path: "/sponsor", ...SAVED_FORM },
  { form: "Exhibit / booth enquiry", what: "Booth and exhibitor enquiries", path: "/exhibit", ...SAVED_FORM },
  { form: "Speaker application", what: "People applying to speak", path: "/speakers", ...SAVED_FORM },
  { form: "Volunteer application", what: "People applying to volunteer", path: "/volunteer", ...SAVED_FORM },
  { form: "Institutional partnership enquiry", what: "Organisations asking to partner", path: "/partners2026", ...SAVED_FORM },
  { form: "Newsletter sign-up", what: "Email box in the footer and on some pages", to: [], toNote: "Not emailed to staff — saved as a subscriber.", via: "saved", reply: "Confirmation email from enquire@thetechfestival.com." },
  { form: "Brochure download", what: "Request a brochure", path: "/brochures", to: ["sales@thetechfestival.com"], toNote: "A receipt for each download. Every download is also listed under More › Brochure downloads.", via: "backend", viaNote: "from enquire@thetechfestival.com", reply: "The brochure (download link, or the PDF attached when it's small enough). Replies go to sales@thetechfestival.com." },
  { form: "Ticket purchase", what: "Buying a pass through Stripe", path: "/tickets", to: [], toNote: "No staff email.", via: "stripe", reply: "Their ticket, from tickets@thetechfestival.com." },
];

const VIA = {
  backend: { label: "Backend email", tone: "purple", hint: "Resend" },
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
        eyebrow="More › Settings"
        title="Where website forms go"
        description="Who receives each form on the website, how it's sent, and what the person who filled it in gets back. Use it to find a missing enquiry or to know who should be answering."
      />
      <Banner tone="info" icon={Info} className="mb-6" title="Every enquiry is saved before it's emailed">
        The volunteer, speaker, booth, sponsor, partnership and general enquiry forms no longer use EmailJS. Each one is saved in the admin panel first (More › Form submissions), then emailed to baldeep@thetechfestival.com. If an email goes missing, the submission is still there.
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
