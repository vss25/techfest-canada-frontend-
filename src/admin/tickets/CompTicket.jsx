import { useState } from "react";
import { Copy } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Button, Drawer, Field, Input, Select } from "../ui";

const TIERS = [
  ["power", "Power"], ["apex", "Apex"], ["influence", "Influence"], ["connect", "Connect"], ["discover", "Discover"], ["session", "Session"],
];
const EMPTY = { name: "", email: "", tier: "power" };

/** Management: issue a free pass (speakers, guests, the App Review account). */
export function CompTicketDrawer({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [made, setMade] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const close = () => { setForm(EMPTY); setMade(null); onClose(); };

  async function create() {
    setSaving(true);
    try {
      const r = await api.post("/console/tickets/complimentary", form);
      setMade(r);
      onCreated?.();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast.success("Copied"), () => {});

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Complimentary ticket"
      description="A free pass for a speaker, guest or the App Review account. It works in the app, on the website and at the door."
      footer={made
        ? <Button variant="primary" onClick={close}>Done</Button>
        : <><Button variant="primary" loading={saving} onClick={create}>Create ticket</Button><Button variant="ghost" onClick={close}>Cancel</Button></>}
    >
      {made ? (
        <div className="space-y-4">
          <Banner tone="good" title="Ticket created">
            {made.name} can sign in to the app with <b>Sign in with ticket ID</b>, or with a sign-in link sent to {made.email}.
          </Banner>
          <dl className="grid grid-cols-[auto,1fr,auto] items-center gap-x-4 gap-y-3 text-sm">
            <dt className="text-ttfc-muted">Last name</dt><dd className="font-semibold">{made.lastName}</dd>
            <dd><Button size="sm" variant="ghost" icon={Copy} onClick={() => copy(made.lastName)}>Copy</Button></dd>
            <dt className="text-ttfc-muted">Ticket ID</dt><dd className="font-mono font-semibold">{made.ticketId}</dd>
            <dd><Button size="sm" variant="ghost" icon={Copy} onClick={() => copy(made.ticketId)}>Copy</Button></dd>
          </dl>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Full name" hint="First and last name. They sign in with the last name.">
            {(id) => <Input id={id} value={form.name} onChange={set("name")} placeholder="App Review" />}
          </Field>
          <Field label="Email" hint="Sign-in links go here. No email is sent when you create the ticket.">
            {(id) => <Input id={id} type="email" value={form.email} onChange={set("email")} placeholder="appreview@thetechfestival.com" />}
          </Field>
          <Field label="Pass">
            {(id) => (
              <Select id={id} value={form.tier} onChange={set("tier")}>
                {TIERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            )}
          </Field>
        </div>
      )}
    </Drawer>
  );
}
