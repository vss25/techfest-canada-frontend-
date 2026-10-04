import { useState } from "react";
import { KeyRound, ShieldCheck, Trash2, UserPlus, UserCog } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, PasswordInput, TableWrap } from "../ui";
import { ago, initials } from "../format";

function AddStaff({ onAdded }) {
  const toast = useToast();
  const [f, setF] = useState({ email: "", name: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(f.email.trim())) errs.email = "Enter a valid email address";
    if (f.password && f.password.length < 8) errs.password = "At least 8 characters";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const body = { email: f.email.trim().toLowerCase(), name: f.name.trim() };
      if (f.password) body.password = f.password;
      const r = await api.post("/console/staff", body);
      toast.success(r.created ? `${r.email} can now sign in to the staff panel` : `${r.email} now has staff access`);
      setF({ email: "", name: "", password: "" });
      onAdded();
    } catch (err) {
      setErrors({ form: err.message });
      toast.error(err);
    } finally { setBusy(false); }
  };

  return (
    <Card as="form" onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold"><UserPlus className="h-4 w-4 text-ttfc-pink" aria-hidden="true" /> Add staff</h2>
        <p className="mt-1 text-xs leading-relaxed text-ttfc-muted">
          New people need a password (8+ characters) — share it with them privately. If the email already has an account, they're promoted and the password is optional. To reset a staff member's password, add them again with a new one.
        </p>
      </div>
      <Field label="Email" required error={errors.email}>
        {(id) => <Input id={id} type="email" autoComplete="off" value={f.email} onChange={set("email")} placeholder="name@company.com" />}
      </Field>
      <Field label="Name">{(id) => <Input id={id} value={f.name} onChange={set("name")} autoComplete="off" maxLength={80} />}</Field>
      <Field label="Password" error={errors.password} hint="Required for brand-new accounts.">
        {(id) => <PasswordInput id={id} value={f.password} onChange={set("password")} />}
      </Field>
      {errors.form && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{errors.form}</p>}
      <Button variant="primary" type="submit" icon={UserPlus} loading={busy} className="w-full">Give staff access</Button>
    </Card>
  );
}

function ChangePassword() {
  const toast = useToast();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (f.next.length < 8) errs.next = "At least 8 characters";
    if (f.next !== f.confirm) errs.confirm = "The two new passwords don't match";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.post("/console/me/password", { current: f.current, next: f.next });
      toast.success("Your password has been changed");
      setF({ current: "", next: "", confirm: "" });
    } catch (err) {
      setErrors({ form: err.message });
      toast.error(err);
    } finally { setBusy(false); }
  };
  return (
    <Card as="form" onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold"><KeyRound className="h-4 w-4 text-ttfc-orange" aria-hidden="true" /> Change my password</h2>
        <p className="mt-1 text-xs text-ttfc-muted">Signed in with Google and never set one? Leave “Current password” empty.</p>
      </div>
      <Field label="Current password">{(id) => <PasswordInput id={id} value={f.current} onChange={set("current")} autoComplete="current-password" />}</Field>
      <Field label="New password" error={errors.next} hint="At least 8 characters.">{(id) => <PasswordInput id={id} value={f.next} onChange={set("next")} />}</Field>
      <Field label="Confirm new password" error={errors.confirm}>{(id) => <PasswordInput id={id} value={f.confirm} onChange={set("confirm")} />}</Field>
      {errors.form && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{errors.form}</p>}
      <Button type="submit" icon={KeyRound} loading={busy} className="w-full">Update password</Button>
    </Card>
  );
}

export default function StaffAccounts() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi("/console/staff");
  const [removing, setRemoving] = useState(null);

  return (
    <>
      <PageHeader eyebrow="Staff & safety" title="Staff accounts" description="People who can sign in to this panel. Staff can see and change everything here, so only add people you trust." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !data?.length ? (
            <EmptyState icon={UserCog} title="No staff found" />
          ) : (
            <TableWrap>
              <thead><tr><th>Person</th><th>Sign-in</th><th>Last active</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ttfc-panel3 text-xs font-bold" aria-hidden="true">{initials(s.name, s.email)}</span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1.5 font-semibold">{s.name}{s.isMe && <Badge tone="pink">You</Badge>}</p>
                          <p className="truncate font-mono text-xs text-ttfc-muted">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Badge>{s.provider === "google" ? "Google" : s.provider === "linkedin" ? "LinkedIn" : "Email"}</Badge>
                        {s.hasPassword ? <Badge tone="good" icon={ShieldCheck}>Password set</Badge> : <Badge tone="warn">No password</Badge>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-ttfc-muted">{ago(s.lastActiveAt)}</td>
                    <td className="text-right">
                      <Button size="sm" variant="dangerOutline" icon={Trash2} disabled={s.isMe} title={s.isMe ? "You can't remove your own access" : undefined} onClick={() => setRemoving(s)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
        <div className="space-y-6">
          <AddStaff onAdded={reload} />
          <ChangePassword />
        </div>
      </div>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.name || "this person"}'s staff access?`}
        body="Their account stays, but they can no longer sign in to the staff panel. You can add them back any time."
        confirmLabel="Remove access"
        onConfirm={async () => {
          await api.del(`/console/staff/${removing.id}`);
          setData((xs) => (xs || []).filter((x) => x.id !== removing.id));
          toast.success(`${removing.name} is no longer staff`);
        }}
      />
    </>
  );
}

