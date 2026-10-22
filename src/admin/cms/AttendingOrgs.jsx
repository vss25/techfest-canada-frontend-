import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Eye, EyeOff, GitMerge, ImageOff, ImagePlus, RefreshCw, Search, SearchCheck, Star, X } from "lucide-react";
import { useApi } from "../hooks";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, EmptyState, ErrorState, Field, Input, LoadingState, Modal, PageHeader, Select, TableWrap } from "../ui";
import LogoPicker, { CompanyMark } from "../people/LogoPicker";
import { orgsApi, orgsFrom } from "./orgsApi";

/* =========================================================
   Attending organisations (Oct 21 2026): the one list the apps
   show under Organisations (GET /api/app/organisations), merged
   by the server from the website's partners, the speakers'
   organisations and the organisation of everyone with a pass,
   one entry per organisation. New organisations appear on their
   own as people join. Staff can add or change a logo (upload a
   file up to 2 MB, paste an image link, or pick one the search
   found; Oct 22 2026, the organiser: "allow the ability to add
   logos of the organizations whose people are attending"),
   remove one, hide an organisation from the apps' list, merge two
   names that are the same organisation ("merge X into Y"), or have
   the logo searched for again. "Missing logo" lists the ones still
   without. A partner's logo is its website partner record's, so
   those rows link there. Changes show in the apps within a minute.
   API calls: cms/orgsApi.js.
========================================================= */

const SOURCE = {
  website: { label: "Website", tone: "good", hint: "The logo on the website's Partners list" },
  company: { label: "Company record", tone: "purple", hint: "Set in People (company logo) or here" },
  auto: { label: "Found automatically", tone: "orange", hint: "Found from the people's work email or the website; check it" },
  "": { label: "No logo", tone: "neutral", hint: "The apps show the initials" },
};
const SHOW = [["all", "All"], ["nologo", "Missing logo"], ["auto", "Found automatically"], ["hidden", "Hidden from the apps"]];
const LOGO_MAX = 2 * 1024 * 1024;
/** The partner record on the Partners page (opens its editor), else the Partners page searched by name. */
const partnerLink = (o) => (o.partnerId ? `/admin/content/partners?edit=${encodeURIComponent(o.partnerId)}` : `/admin/content/partners?q=${encodeURIComponent(o.name)}`);

function MergeDialog({ from, items, onClose, onDone }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [to, setTo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((o) => o.key !== from.key && (!t || o.name.toLowerCase().includes(t))).slice(0, 30);
  }, [items, from.key, q]);
  const merge = async () => {
    setBusy(true); setError("");
    try {
      await orgsApi.merge(from.key, to.key);
      toast.success(`${from.name} is now shown as ${to.name}`);
      onDone();
      onClose();
    } catch (err) { setError(err?.message || "Couldn't merge them. Try again."); }
    finally { setBusy(false); }
  };
  return (
    <Modal open onClose={() => !busy && onClose()} size="lg" title={`Merge ${from.name} into…`}
      description="Pick the name to keep. Everyone at the two is counted together under it, with its logo. You can undo this under Merged names."
      footer={<>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" icon={GitMerge} loading={busy} disabled={!to} onClick={merge}>{to ? `Merge into ${to.name}` : "Merge"}</Button>
      </>}>
      <Field label="Find the organisation to keep">
        {(id) => <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name" autoFocus />}
      </Field>
      <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto">
        {list.map((o) => (
          <label key={o.key} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-sm ${to?.key === o.key ? "border-ttfc-pink bg-ttfc-pink/10" : "border-ttfc-line bg-ttfc-panel2 hover:border-ttfc-purple/60"}`}>
            <input type="radio" name="merge-to" className="sr-only" checked={to?.key === o.key} onChange={() => setTo(o)} />
            <CompanyMark url={o.logo} name={o.name} size="sm" />
            <span className="min-w-0 flex-1 truncate font-semibold">{o.name}</span>
            <span className="text-xs text-ttfc-muted">{o.attendeeCount} {o.attendeeCount === 1 ? "person" : "people"}</span>
          </label>
        ))}
        {!list.length && <p className="py-6 text-center text-sm text-ttfc-muted">No organisation matches that.</p>}
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
    </Modal>
  );
}

export default function AttendingOrgs() {
  const toast = useToast();
  const [fresh, setFresh] = useState(0); // Refresh: the server builds the list again now
  const { data, error, loading, refreshing, reload } = useApi(fresh ? `${orgsApi.listPath(true)}&n=${fresh}` : orgsApi.listPath(false));
  const [q, setQ] = useState("");
  const [show, setShow] = useState("all");
  const [logoFor, setLogoFor] = useState(null);
  const [mergeFrom, setMergeFrom] = useState(null);
  const [busyKey, setBusyKey] = useState("");
  const { items, aliases, updatedAt, cmsOk, counts: server } = useMemo(() => orgsFrom(data), [data]);
  const missing = server.missingLogo;
  const counts = useMemo(() => ({ all: server.total, nologo: server.missingLogo, auto: items.filter((o) => o.logoSource === "auto").length, hidden: items.filter((o) => o.hidden).length }), [items, server]);
  // After a logo change: the server builds the list again (fresh=1), so the row shows it straight away.
  const rebuilt = () => setFresh((n) => n + 1);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((o) => {
      if (t && !o.name.toLowerCase().includes(t) && !o.key.includes(t)) return false;
      if (show === "nologo") return !o.logo;
      if (show === "auto") return o.logoSource === "auto";
      if (show === "hidden") return o.hidden;
      return true;
    });
  }, [items, q, show]);

  const toggleHidden = async (o) => {
    setBusyKey(o.key);
    try {
      await orgsApi.setHidden(o, !o.hidden);
      toast.success(o.hidden ? `${o.name} is back in the apps' list` : `${o.name} is hidden from the apps' list`);
      reload();
    } catch (err) { toast.error(err); } finally { setBusyKey(""); }
  };
  const unmerge = async (a) => {
    setBusyKey(`alias:${a.from}`);
    try {
      await orgsApi.unmerge(a.from);
      toast.success(`“${a.from}” is listed on its own again`);
      reload();
    } catch (err) { toast.error(err); } finally { setBusyKey(""); }
  };
  const remerge = async (a) => {
    setBusyKey(`alias:${a.from}`);
    try {
      await orgsApi.merge(a.from, a.into);
      toast.success(`“${a.from}” is shown as ${a.intoName} again`);
      reload();
    } catch (err) { toast.error(err); } finally { setBusyKey(""); }
  };
  const clearLogo = async (o) => {
    setBusyKey(`clear:${o.key}`);
    try {
      await orgsApi.clearLogo(o);
      toast.success(`${o.name}'s logo is removed`);
      rebuilt();
    } catch (err) { toast.error(err); } finally { setBusyKey(""); }
  };
  const lookAgain = async (o) => {
    setBusyKey(`lookup:${o.key}`);
    try {
      await orgsApi.lookup(o.key);
      toast.success(`We'll look for ${o.name}'s logo again in the next minute`);
      reload();
    } catch (err) { toast.error(err); } finally { setBusyKey(""); }
  };

  return (
    <div>
      <PageHeader eyebrow="Website & app" title="Attending organisations"
        description="Everyone the apps show under Organisations: the website's partners, the speakers' organisations and the organisation of everyone with a pass, one entry per organisation. New ones appear on their own as people join. Featured Partners come first, in their own order (Website & app › Featured Partners). Changes show in the apps within a minute."
        actions={<Button icon={RefreshCw} loading={refreshing && !loading} onClick={() => setFresh((n) => n + 1)}>Refresh</Button>} />
      {data && !cmsOk && (
        <Banner tone="warn" className="mb-4" title="The website's partner list didn't load this time">
          Partners and their logos may be missing until the next refresh.
        </Banner>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="Search organisations" aria-label="Search organisations" />
        </div>
        <Select value={show} onChange={(e) => setShow(e.target.value)} aria-label="Show">
          {SHOW.map(([v, l]) => <option key={v} value={v}>{l}{data ? ` (${counts[v].toLocaleString()})` : ""}</option>)}
        </Select>
      </div>
      {data && missing > 0 && show !== "nologo" && (
        <Banner tone="info" icon={ImagePlus} className="mb-4" title={`${missing.toLocaleString()} ${missing === 1 ? "organisation has" : "organisations have"} no logo yet`}
          action={<Button size="sm" onClick={() => setShow("nologo")}>Show them</Button>}>
          The apps show their initials. Add a logo: upload a file (up to 2 MB), paste an image link, or pick one the search finds.
        </Banner>
      )}

      {loading ? <LoadingState label="Loading organisations…" /> : error && !data ? (
        <ErrorState error={error} onRetry={reload} title="Couldn't load the organisations" />
      ) : !rows.length ? (
        <EmptyState icon={Building2} title={q || show !== "all" ? "No organisations match" : "No organisations yet"}
          body={q || show !== "all" ? "Try a different name or filter." : "They appear as soon as partners, speakers or people with a pass are added."} />
      ) : (
        <>
          <p className="mb-2 text-xs text-ttfc-muted">
            {rows.length.toLocaleString()} of {items.length.toLocaleString()} organisations{updatedAt ? ` · updated ${new Date(updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
          </p>
          <TableWrap>
            <thead>
              <tr><th>Organisation</th><th>Logo from</th><th className="text-right">People</th><th className="text-right">Speakers</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const src = SOURCE[o.logoSource] || SOURCE[""];
                return (
                  <tr key={o.key} className={o.hidden ? "opacity-60" : undefined}>
                    <td>
                      <div className="flex items-center gap-3">
                        <CompanyMark url={o.logo} name={o.name} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold">{o.name}</span>
                            {o.featured && <Badge tone="pink" icon={Star}>Featured Partner</Badge>}
                            {o.hidden && <Badge tone="bad" icon={EyeOff}>Hidden from the apps</Badge>}
                          </div>
                          <span className="block truncate font-mono text-[11px] text-ttfc-dim" title="The name every spelling is matched by">{o.key}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span title={src.hint}><Badge tone={src.tone}>{src.label}</Badge></span>
                      {o.logoBy && o.logoSource === "company" && <span className="mt-1 block text-[11px] text-ttfc-dim">by {o.logoBy}</span>}
                    </td>
                    <td className="text-right tabular-nums">{o.attendeeCount}</td>
                    <td className="text-right tabular-nums">{o.speakerCount}</td>
                    <td className="whitespace-nowrap text-right">
                      {o.partner ? (
                        <Link to={partnerLink(o)} title="A partner's logo is its website partner record's: add or change it there"
                          className="mr-1 inline-flex h-8 items-center gap-1 rounded-lg border border-ttfc-line px-2.5 text-xs font-semibold text-ttfc-pink hover:border-ttfc-pink/60">
                          <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />{o.logo ? "Change on Partners" : "Add on Partners"}
                        </Link>
                      ) : (
                        <Button size="sm" variant={o.logo ? undefined : "primary"} icon={ImagePlus} onClick={() => setLogoFor(o)}>{o.logo ? "Change logo" : "Add logo"}</Button>
                      )}
                      {o.logoSource === "company" && !o.partner && (
                        <Button size="sm" variant="ghost" icon={ImageOff} loading={busyKey === `clear:${o.key}`} onClick={() => clearLogo(o)} title="Remove the logo staff set; the automatic one (or the initials) shows">Remove logo</Button>
                      )}
                      {(o.logoSource === "auto" || !o.logo) && !o.partner && (
                        <Button size="sm" variant="ghost" icon={SearchCheck} loading={busyKey === `lookup:${o.key}`} onClick={() => lookAgain(o)} title="Look for the logo on the internet again">Look again</Button>
                      )}
                      {o.hiddenBy === "partner" ? (
                        <Link to="/admin/content/partners" title="Hidden by the partner's app switch on the Partners page"
                          className="mr-1 inline-flex h-8 items-center rounded-lg px-2 text-xs font-semibold text-ttfc-pink hover:underline">Hidden on Partners</Link>
                      ) : (
                        <Button size="sm" variant="ghost" icon={o.hidden ? Eye : EyeOff} loading={busyKey === o.key} onClick={() => toggleHidden(o)}>{o.hidden ? "Show" : "Hide"}</Button>
                      )}
                      {!o.featured && <Button size="sm" variant="ghost" icon={GitMerge} onClick={() => setMergeFrom(o)}>Merge into…</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </>
      )}

      <section className="mt-8">
        <h2 className="text-base font-semibold">Merged names</h2>
        <p className="mb-3 mt-0.5 text-xs text-ttfc-muted">Names shown as another organisation ("ontario government" → Government of Ontario). Remove one to list it on its own again; a built-in one is switched off and can be switched back on.</p>
        {aliases.length ? (
          <div className="space-y-2">
            {aliases.map((a) => (
              <div key={a.from} className={`flex flex-wrap items-center gap-3 rounded-xl border border-ttfc-line bg-ttfc-panel p-3 text-sm ${a.off ? "opacity-70" : ""}`}>
                <span className="min-w-0 flex-1">
                  <b className="font-mono text-xs">{a.from}</b> <span className="text-ttfc-muted">{a.off ? "isn't merged into" : "is shown as"}</span> <b>{a.intoName}</b>
                  {a.builtin && <Badge tone="neutral" className="ml-2">Built in</Badge>}
                  {a.off && <Badge tone="warn" className="ml-2">Switched off</Badge>}
                  {a.by && <span className="ml-2 text-xs text-ttfc-dim">by {a.by}</span>}
                </span>
                {a.off
                  ? <Button size="sm" variant="ghost" icon={GitMerge} loading={busyKey === `alias:${a.from}`} onClick={() => remerge(a)}>Merge again</Button>
                  : <Button size="sm" variant="ghost" icon={X} loading={busyKey === `alias:${a.from}`} onClick={() => unmerge(a)}>Remove</Button>}
              </div>
            ))}
          </div>
        ) : <Banner tone="info">No merged names yet. Use “Merge into…” on a row when two names are the same organisation.</Banner>}
      </section>

      {logoFor && (
        <LogoPicker open onClose={() => setLogoFor(null)} company={logoFor.companyName || logoFor.name} domain={logoFor.website || logoFor.autoDomain}
          orgKey={logoFor.key} maxBytes={LOGO_MAX} onSaved={() => { toast.info("The apps show the new logo within a minute"); rebuilt(); }} />
      )}
      {mergeFrom && <MergeDialog from={mergeFrom} items={items} onClose={() => setMergeFrom(null)} onDone={reload} />}
    </div>
  );
}
