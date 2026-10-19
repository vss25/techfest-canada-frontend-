import { useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { Banner, Button, ErrorState, LoadingState, PageHeader, Select, Tabs } from "../ui";
import { when } from "../format";
import { useLivePreview } from "./speakerEmailHooks";
import { EmailCopyEditor, EmailPreview } from "./EmailCopyEditor";
import { countSet, tidyCopy } from "./passEmailHooks";

/* =========================================================
   Admin → Tickets & attendees → Purchase email
   ---------------------------------------------------------
   Every word of the confirmation email a buyer gets after a
   website checkout (with the ticket PDF, the QR code and the
   Apple Wallet button): subject, preview text, the venue
   header, greeting and intro, the pass name, what it
   includes, the captions, event details, tips, the app block
   and the footer. The pass name, tagline, paragraph, list and
   tips are per pass type (the tabs); everything else is one
   value for every purchase. The live preview is the real
   email, built by the server with a made-up buyer.
   Saving is management only and audited; staff can look.
   Booth confirmations take the header, event details, app and
   footer only.
   Backend: GET|PUT /console/purchase-email, POST /preview.
========================================================= */

const BASE = "/console/purchase-email";

export default function PurchaseEmail() {
  const toast = useToast();
  const { isManagement } = useAdmin();
  const { data, error, loading, reload, setData } = useApi(BASE);
  const [draft, setDraft] = useState(null);
  const [tier, setTier] = useState("power");
  const [booth, setBooth] = useState(false);
  const [cxo, setCxo] = useState("auto");
  const [saving, setSaving] = useState(false);

  const saved = useMemo(() => tidyCopy(data?.copy || {}), [data]);
  const value = draft || saved;
  const dirty = !!draft && JSON.stringify(tidyCopy(draft)) !== JSON.stringify(saved);
  const fields = data?.fields || [];
  const tierLabel = data?.tiers?.find((t) => t.key === tier)?.label || "";
  const body = { ...tidyCopy(value), tier: booth ? "booth" : tier, ...(cxo === "auto" ? {} : { cxoBreakfast: cxo === "on" }) };
  const preview = useLivePreview(`${BASE}/preview`, body, { enabled: !!data });

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put(BASE, tidyCopy(draft));
      setData(r);
      setDraft(null);
      toast.success("Purchase email saved. Every new purchase gets this wording.");
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Tickets & attendees"
        title="Purchase email"
        description="The confirmation every buyer gets after checkout, with their ticket PDF, QR code and Apple Wallet button. Change any word of it; the pass name, what's included and the tips are per pass type."
        actions={isManagement ? (
          <div className="flex flex-wrap gap-2">
            {dirty && <Button variant="ghost" icon={RotateCcw} onClick={() => setDraft(null)}>Discard changes</Button>}
            <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={save}>Save</Button>
          </div>
        ) : undefined}
      />
      {!isManagement && (
        <Banner tone="info" className="mb-6" title="Changing the purchase email is for management">You can see the wording and preview the email.</Banner>
      )}
      {loading ? <LoadingState label="Loading the email…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : data && (
        <>
          <Tabs
            label="Pass type"
            value={tier}
            onChange={(k) => { setTier(k); setBooth(false); }}
            tabs={(data.tiers || []).map((t) => ({ key: t.key, label: t.label, count: countSet(value, fields.filter((f) => f.tier), t.key) || undefined }))}
          />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="min-w-0">
              <EmailCopyEditor
                fields={fields}
                sections={data.sections}
                value={value}
                onChange={setDraft}
                defaults={data.defaults?.[tier] || {}}
                tier={tier}
                tierLabel={tierLabel}
                placeholders={data.placeholders}
                note={`Fields marked "${tierLabel} only" are for ${tierLabel} buyers; the rest go to every buyer.`}
                disabled={!isManagement}
              />
              {data.updatedAt && <p className="mt-3 text-xs text-ttfc-dim">Last saved {when(data.updatedAt)}{data.updatedBy ? ` by ${data.updatedBy}` : ""}.</p>}
            </div>
            <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="mr-auto text-sm font-semibold">Preview: {booth ? "booth confirmation" : `${tierLabel} buyer`} (Jane Doe, made up)</p>
                <label className="inline-flex items-center gap-1.5 text-xs text-ttfc-muted">
                  <input type="checkbox" checked={booth} onChange={(e) => setBooth(e.target.checked)} className="h-4 w-4 accent-ttfc-pink" />
                  Booth confirmation
                </label>
                <Select value={cxo} onChange={(e) => setCxo(e.target.value)} className="w-auto py-1.5 text-xs" aria-label="CxO Breakfast in the preview" disabled={booth}>
                  <option value="auto">CxO Breakfast: as the pass</option>
                  <option value="on">CxO Breakfast: switched on</option>
                  <option value="off">CxO Breakfast: switched off</option>
                </Select>
              </div>
              {booth && <p className="mb-2 text-xs text-ttfc-dim">Booth confirmations take the header, event details, app and footer only.</p>}
              {preview.error && !preview.data
                ? <ErrorState error={preview.error} title="Couldn't render the preview" />
                : preview.data ? <EmailPreview preview={preview.data} loading={preview.loading} error={preview.data && preview.error} title="Purchase email preview" />
                  : <LoadingState label="Building the preview…" />}
            </div>
          </div>
        </>
      )}
    </>
  );
}
