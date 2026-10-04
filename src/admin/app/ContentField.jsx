import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Button, Input, Switch, Textarea } from "../ui";
import { when } from "../format";

/* One editable key from GET /api/console/app-content, saved with
   PUT /api/console/app-content/:key. Used by App text & switches and
   by Site settings → Website options. */
export default function ContentField({ item, label: labelProp, help, onSaved, placeholder, type, showKey = true, savedMessage = "Saved — live in the app within a minute" }) {
  const toast = useToast();
  const label = labelProp || item.key;
  const isBool = typeof item.default === "boolean";
  const [value, setValue] = useState(isBool ? !!item.value : String(item.value ?? ""));
  const [saving, setSaving] = useState(false);
  const dirty = isBool ? value !== !!item.value : value !== String(item.value ?? "");

  const save = async (v = value) => {
    setSaving(true);
    try {
      await api.put(`/console/app-content/${encodeURIComponent(item.key)}`, { value: v });
      toast.success(savedMessage);
      onSaved(item.key, v);
    } catch (err) {
      toast.error(err);
      if (isBool) setValue(!!item.value);
    } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-3 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-8">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ttfc-text">{label}</p>
        {help && <p className="mt-0.5 text-xs text-ttfc-muted">{help}</p>}
        {showKey && <p className="mt-1.5 font-mono text-[11px] text-ttfc-dim">{item.key}</p>}
        <p className="mt-1 text-[11px] text-ttfc-dim">{item.updatedBy ? `Changed by ${item.updatedBy} · ${when(item.updatedAt)}` : JSON.stringify(item.value) === JSON.stringify(item.default) ? "Using the default" : "Custom value"}</p>
      </div>
      {isBool ? (
        <div className="flex items-center gap-3">
          <Switch checked={value} disabled={saving} ariaLabel={label} onChange={(v) => { setValue(v); save(v); }} />
          <span className="text-sm text-ttfc-muted">{value ? "On" : "Off"}</span>
        </div>
      ) : (
        <div className="space-y-2">
          {type ? (
            <Input type={type} value={value} onChange={(e) => setValue(e.target.value)} aria-label={label} placeholder={placeholder} maxLength={500}
              onKeyDown={(e) => { if (e.key === "Enter" && dirty) { e.preventDefault(); save(); } }} />
          ) : (
            <Textarea rows={Math.min(6, Math.max(2, Math.ceil(value.length / 70)))} value={value} onChange={(e) => setValue(e.target.value)} aria-label={label} placeholder={placeholder} maxLength={2000} />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" icon={Save} disabled={!dirty} loading={saving} onClick={() => save()}>Save</Button>
            {dirty && <Button size="sm" variant="ghost" onClick={() => setValue(String(item.value ?? ""))}>Undo</Button>}
            {value !== String(item.default ?? "") && (
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => setValue(String(item.default ?? ""))}>Use default</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

