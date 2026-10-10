import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, FileDown, Info, Search } from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { ADMIN_API, getToken } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, EmptyState, ErrorState, Input, LoadingState, PageHeader, TableWrap } from "../ui";
import { when } from "../format";

const PAGE = 50;

/* What happened to the "here's your brochure" email (set by the backend). */
const STATUS = {
  sent: { tone: "good", label: "Emailed" },
  sending: { tone: "purple", label: "Sending…" },
  failed: { tone: "bad", label: "Email failed" },
  duplicate: { tone: "neutral", label: "Already emailed", hint: "Same person asked again within 10 minutes, so it wasn't sent twice" },
  legacy: { tone: "neutral", label: "Not emailed", hint: "Downloaded before brochure emails started" },
  blocked: { tone: "neutral", label: "Bot, not emailed", hint: "Looked like a bot (random text or filled in instantly), so nobody was emailed" },
};

function EmailStatus({ r }) {
  const s = STATUS[r.emailStatus] || STATUS.legacy;
  const how = r.emailStatus === "sent" && r.delivery ? (r.delivery === "attached" ? "PDF attached" : "Download link") : "";
  return (
    <div className="space-y-1" title={s.hint}>
      <Badge tone={s.tone}>{s.label}</Badge>
      {how && <p className="text-[11px] text-ttfc-dim">{how}</p>}
    </div>
  );
}

/** "https://www.google.com/search" → "google.com" */
function source(ref) {
  if (!ref) return "";
  try { return new URL(ref).hostname.replace(/^www\./, ""); } catch { return ref; }
}

export default function BrochureDownloads() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [exporting, setExporting] = useState(false);
  const page = Math.max(0, Number(params.get("page")) || 0);
  const showSpam = params.get("spam") === "1";
  const dq = useDebounced(q.trim(), 300);

  const qs = new URLSearchParams({ page: String(page) });
  if (dq) qs.set("q", dq);
  if (showSpam) qs.set("spam", "1");
  const { data, error, loading, reload, refreshing } = useApi(`/console/brochure-downloads?${qs}`);

  const update = (next) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) { if (v === "" || v == null || v === 0) p.delete(k); else p.set(k, String(v)); }
    setParams(p, { replace: true });
  };
  const onSearch = (v) => { setQ(v); update({ q: v.trim(), page: 0 }); };
  const spamCount = data?.spam ?? 0;

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  // Spreadsheet of every download matching the search (management only: it holds phone numbers)
  const exportCsv = async () => {
    setExporting(true);
    try {
      const eq = new URLSearchParams();
      if (dq) eq.set("q", dq);
      if (showSpam) eq.set("spam", "1");
      const res = await fetch(`${ADMIN_API}/console/brochure-downloads/export${eq.toString() ? `?${eq}` : ""}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `ttfc-brochure-downloads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { toast.error(err); } finally { setExporting(false); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Leads"
        title="Brochure downloads"
        description="Everyone who filled in the form on the Brochure page, newest first. Each person is emailed the brochure, and sales@thetechfestival.com gets a receipt."
        actions={isManagement && (
          <Button icon={Download} loading={exporting} onClick={exportCsv} disabled={!total} title="Every download matching the search, with phone numbers">Download CSV</Button>
        )}
      />

      {!isManagement && (
        <Banner tone="info" icon={Info} className="mb-6" title="Need a spreadsheet?">
          Downloading the list as a CSV is for management. Ask a manager if you need one.
        </Banner>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search name, email, company or phone" className="pl-9" aria-label="Search brochure downloads" />
        </div>
        <p className="text-sm text-ttfc-muted" aria-live="polite">
          {loading ? "Loading…" : `${total.toLocaleString()} ${showSpam ? "bot sign-up" : "download"}${total === 1 ? "" : "s"}`}{refreshing && !loading ? " · updating…" : ""}
        </p>
        {(showSpam || spamCount > 0) && (
          <Button size="sm" variant="ghost" onClick={() => update({ spam: showSpam ? "" : "1", page: 0 })}
            title="Sign-ups with random text in the name or company, or filled in instantly. They are never emailed.">
            {showSpam ? "Back to real downloads" : `${spamCount.toLocaleString()} bot sign-up${spamCount === 1 ? "" : "s"} hidden · show`}
          </Button>
        )}
      </div>

      {loading ? <LoadingState label="Loading brochure downloads…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState
          icon={FileDown}
          title={dq ? "No downloads match" : "No brochure downloads yet"}
          body={dq ? "Try a different name, email, company or phone number." : "People appear here as soon as they fill in the form on the Brochure page."}
        />
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr><th>Downloaded</th><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Industry</th><th>Brochure</th><th>Brochure email</th><th>Sales told</th><th>Came from</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap text-ttfc-muted">{when(r.createdAt)}</td>
                  <td className="whitespace-nowrap font-semibold">{r.name || <span className="text-ttfc-dim">No name</span>}</td>
                  <td className="max-w-[200px] text-xs">
                    <span className="block truncate font-semibold" title={r.company}>{r.company || <span className="font-normal text-ttfc-dim">—</span>}</span>
                    {r.jobTitle && <span className="block truncate text-ttfc-muted" title={r.jobTitle}>{r.jobTitle}</span>}
                  </td>
                  <td className="max-w-[220px] truncate font-mono text-xs">
                    <a href={`mailto:${r.email}`} className="text-ttfc-muted hover:text-ttfc-pink hover:underline" title={r.email}>{r.email}</a>
                  </td>
                  <td className="whitespace-nowrap font-mono text-xs text-ttfc-muted">{r.phone || "—"}</td>
                  <td className="max-w-[160px] truncate text-xs text-ttfc-muted" title={r.industry}>{r.industry || "—"}</td>
                  <td className="text-xs text-ttfc-muted">{r.brochureTitle}</td>
                  <td><EmailStatus r={r} /></td>
                  <td>{r.salesNotified ? <Badge tone="good">Yes</Badge> : <span className="text-xs text-ttfc-dim">No</span>}</td>
                  <td className="max-w-[180px] text-xs text-ttfc-muted">
                    {r.page && <span className="block truncate font-mono" title="Page on the website">{r.page}</span>}
                    {r.referrer ? <span className="block truncate" title={r.referrer}>{source(r.referrer)}</span> : !r.page && <span className="text-ttfc-dim">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button icon={ChevronLeft} disabled={page === 0} onClick={() => update({ page: page - 1 })}>Previous</Button>
              <span className="text-sm text-ttfc-muted">Page {page + 1} of {pages}</span>
              <Button disabled={page + 1 >= pages} onClick={() => update({ page: page + 1 })}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
