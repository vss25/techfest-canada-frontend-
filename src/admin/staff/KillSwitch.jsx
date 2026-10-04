import { useState } from "react";
import { AlertTriangle, Power, RadioTower, ShieldAlert } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { useAdmin } from "../adminContext";
import { Button, Card, ErrorState, Field, LoadingState, Modal, PageHeader, PasswordInput, Textarea } from "../ui";
import { when } from "../format";

function ConfirmWithPassword({ action, message, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const goingOff = action === "off" || action === "update";
  const copy = {
    off: { title: "Take the website and app offline?", body: "Every public page and the iOS app will show the maintenance message until someone switches them back on. Staff can still use this panel.", cta: "Take everything offline", variant: "danger" },
    on: { title: "Bring the website and app back online?", body: "Visitors and app users will get the normal site again within about a minute.", cta: "Bring back online", variant: "success" },
    update: { title: "Update the maintenance message?", body: "The site stays offline; visitors will see the new message.", cta: "Update message", variant: "primary" },
  }[action];

  const submit = async (e) => {
    e.preventDefault();
    if (!password) { setError("Type your password to confirm"); return; }
    setBusy(true); setError("");
    try {
      const s = await api.post("/console/kill-switch", { enabled: goingOff, password, message });
      onDone(s);
    } catch (err) {
      setError(err.message || "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      size="sm"
      tone={action === "off" ? "danger" : undefined}
      title={copy.title}
      description={copy.body}
      footer={<>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant={copy.variant} type="submit" form="kill-confirm" loading={busy} icon={Power}>{copy.cta}</Button>
      </>}
    >
      <form id="kill-confirm" onSubmit={submit} className="space-y-3 pb-2">
        {goingOff && (
          <div className="rounded-xl border border-ttfc-line bg-ttfc-ink/60 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ttfc-dim">Visitors will see</p>
            <p className="whitespace-pre-wrap">{message}</p>
          </div>
        )}
        <Field label="Your password" error={error}>
          {(id) => <PasswordInput id={id} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" data-autofocus />}
        </Field>
      </form>
    </Modal>
  );
}

export default function KillSwitch() {
  const toast = useToast();
  const { setKill } = useAdmin();
  const { data, error, loading, reload, setData } = useApi("/console/kill-switch");
  const [message, setMessage] = useState(null);
  const [action, setAction] = useState(null);

  if (loading) return <LoadingState />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const off = !!data.enabled;
  const msg = message ?? data.message ?? "";
  const done = (s) => {
    setData(s); setKill(s); setAction(null); setMessage(null);
    toast[s.enabled ? "info" : "success"](
      action === "update" ? "Maintenance message updated" : s.enabled ? "The website and app are now OFFLINE" : "The website and app are back online",
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Staff & safety"
        title="Kill switch"
        description="Takes the public website and the iOS app offline in an emergency. Staff pages (this panel) keep working so you can always switch it back."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section
          aria-live="polite"
          className={`relative overflow-hidden rounded-[22px] border p-6 sm:p-8 ${off ? "border-red-400/50 bg-gradient-to-br from-red-600/25 via-ttfc-panel to-ttfc-panel" : "border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-ttfc-panel to-ttfc-panel"}`}
        >
          <div className="flex items-start gap-4">
            <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${off ? "bg-red-500/25 text-red-200" : "bg-emerald-400/20 text-emerald-200"}`}>
              {off ? <AlertTriangle className="h-7 w-7" aria-hidden="true" /> : <RadioTower className="h-7 w-7" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-ttfc-muted">Current status</p>
              <p className={`mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl ${off ? "text-red-200" : "text-emerald-200"}`}>
                Website &amp; app {off ? "OFFLINE" : "LIVE"}
              </p>
              <p className="mt-2 text-sm text-ttfc-muted">
                {data.since ? `${off ? "Taken offline" : "Last switched on"} ${data.by ? `by ${data.by} ` : ""}· ${when(data.since)}` : "Never switched off."}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Field label="Message shown to visitors" hint="Appears on every public page and in the app while offline.">
              {(id) => <Textarea id={id} rows={3} maxLength={500} value={msg} onChange={(e) => setMessage(e.target.value)} />}
            </Field>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {off ? (
              <>
                <Button size="lg" variant="success" icon={Power} onClick={() => setAction("on")} className="sm:flex-1">Bring website &amp; app back online</Button>
                <Button size="lg" onClick={() => setAction("update")} disabled={msg === data.message || !msg.trim()}>Update message</Button>
              </>
            ) : (
              <Button size="lg" variant="danger" icon={Power} onClick={() => setAction("off")} disabled={!msg.trim()} className="sm:flex-1">
                Take website &amp; app offline
              </Button>
            )}
          </div>
        </section>

        <Card className="space-y-4 text-sm leading-relaxed text-ttfc-muted">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ttfc-text"><ShieldAlert className="h-4 w-4 text-ttfc-orange" aria-hidden="true" /> Before you use it</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Every public page shows a “We'll be right back” screen with your message. The app shows it too.</li>
            <li>Ticket sales, sign-ups and app features stop until it's switched back on.</li>
            <li>This panel, check-in scanning and payment webhooks keep working.</li>
            <li>You need your own password to switch it either way. Each attempt is in the audit log.</li>
            <li>Signed in with Google and never set a password? Set one first under Staff accounts → Change my password.</li>
          </ul>
        </Card>
      </div>

      {action && <ConfirmWithPassword action={action} message={msg.trim()} onClose={() => setAction(null)} onDone={done} />}
    </>
  );
}
