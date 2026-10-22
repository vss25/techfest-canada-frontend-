import { useState } from "react";
import { Info, MailX, Plus, Search, UserCheck } from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, SectionTitle, TableWrap, Textarea } from "../ui";
import { num, when } from "../format";

/* =========================================================
   Admin → Website & app → Unsubscribed emails (Oct 22 2026)
   The organiser: "make sure people who have unsubscribed don't get
   the emails". Everyone on this list is left out of every bulk
   email: the app invite, the "I'm attending" campaign and nudges,
   RSVP reminders, People sends and Audience campaigns. Each is
   checked again just before it goes. Passes, tickets, sign-in
   codes and receipts still go.
   People get on the list themselves (the Unsubscribe link in each
   email, their mail app's Unsubscribe button, the website), or
   staff paste in the replies that say "unsubscribe".
   Backend (routes/unsubscribes.js), all under BASE:
     GET  /console/unsubscribes?q=          → { count, rows: [{ email, at, source, sourceLabel, by }], sources, canEdit }
     POST /console/unsubscribes { emails }  → { added, already, invalid, emails }
     POST /console/unsubscribes/remove { email } (management) → { removed, email }
========================================================= */

const BASE = "/console/unsubscribes";

export default function UnsubscribedEmails() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim().toLowerCase(), 250);
  const list = useApi(dq ? `${BASE}?q=${encodeURIComponent(dq)}` : BASE);
  const [paste, setPaste] = useState("");
  const [adding, setAdding] = useState(false);
  const [invalid, setInvalid] = useState([]);
  const [removing, setRemoving] = useState(null); // the address waiting for OK

  const d = list.data;
  const rows = d?.rows || [];

  const add = async () => {
    setAdding(true);
    try {
      const r = await api.post(BASE, { emails: paste });
      setInvalid(r.invalid || []);
      setPaste("");
      toast.success(r.added
        ? `${num(r.added)} added to the list${r.already ? `, ${num(r.already)} already on it` : ""}.`
        : `All ${num(r.already)} were already on the list.`);
      list.reload();
    } catch (e) { toast.error(e); } finally { setAdding(false); }
  };

  const remove = async () => {
    const email = removing;
    await api.post(`${BASE}/remove`, { email });
    toast.success(`${email} will get TTFC emails again.`);
    list.reload();
  };

  return (
    <>
      <PageHeader
        eyebrow="Website & app"
        title="Unsubscribed emails"
        description="People on this list get no bulk emails from the admin panel: the app invite, the “I’m attending” campaign and nudges, RSVP reminders, People sends and Audience campaigns. Passes, tickets, sign-in codes and receipts still go."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <SectionTitle hint="For replies that say “unsubscribe”, or a note to enquire@ or marcom@.">Add people who asked by email</SectionTitle>
            <Field label="Email addresses" hint="Paste addresses, or whole emails: the addresses are picked out. Up to 2,000 at once.">
              {(id) => <Textarea id={id} rows={7} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"jane@example.com\nJohn Roe <john@example.com>"} />}
            </Field>
            {invalid.length > 0 && (
              <p className="mt-3 text-xs text-ttfc-dim">Not email addresses, left out: {invalid.join(", ")}</p>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="primary" icon={Plus} loading={adding} disabled={!paste.trim()} onClick={add}>Add to the list</Button>
            </div>
          </Card>

          <Banner tone="info" icon={Info} title="How people get on the list">
            Each campaign email has an Unsubscribe link, and Gmail, Outlook and Apple Mail show their own Unsubscribe button. Both add the address here straight away. Replies that say “unsubscribe” still arrive at enquire@ or marcom@: paste those above.
          </Banner>
        </div>

        <Card className="min-w-0">
          <SectionTitle hint={d ? `${num(d.count)} ${d.count === 1 ? "address" : "addresses"} in all${dq ? `, ${num(rows.length)} matching` : ""}.` : undefined}>On the list</SectionTitle>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email" className="pl-9" aria-label="Search unsubscribed emails" />
          </div>

          {list.loading && !d ? <LoadingState label="Loading…" /> : list.error && !d ? <ErrorState error={list.error} onRetry={list.reload} /> : !rows.length ? (
            <EmptyState icon={MailX} title={dq ? "No matches" : "No one has unsubscribed"} body={dq ? "No address on the list contains that." : "When someone unsubscribes, or you add them here, they show up in this list."} />
          ) : (
            <TableWrap>
              <thead><tr><th>Email</th><th>How</th><th>When</th>{d.canEdit && <th className="w-0"><span className="sr-only">Actions</span></th>}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.email}>
                    <td className="break-all font-semibold">{r.email}</td>
                    <td>
                      <span className="block text-sm">{r.sourceLabel}</span>
                      {r.by && <span className="block text-xs text-ttfc-muted">{r.by}</span>}
                    </td>
                    <td className="whitespace-nowrap text-sm text-ttfc-muted">{r.at ? when(r.at) : "—"}</td>
                    {d.canEdit && (
                      <td className="text-right">
                        <Button size="sm" icon={UserCheck} onClick={() => setRemoving(r.email)}>Resubscribe</Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
          {rows.length >= 2000 && <p className="mt-3 text-xs text-ttfc-dim">Showing the newest 2,000. Search to find others.</p>}
        </Card>
      </div>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        title="Take this address off the list?"
        confirmLabel="Resubscribe"
        tone="danger"
      >
        <p className="text-sm text-ttfc-muted">
          <span className="font-semibold text-ttfc-text">{removing}</span> will get bulk emails again. Only do this when they’ve asked to hear from TTFC again.
        </p>
      </ConfirmDialog>
    </>
  );
}
