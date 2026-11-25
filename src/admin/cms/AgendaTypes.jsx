import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { adminFetch } from "../api";
import { useToast } from "../toastContext";
import { Button, IconButton, Input, Modal, Select } from "../ui";
import { FORMAT_KEYS, FORMAT_MAP } from "../../data/sessionFormats";

/* =========================================================
   Admin › Agenda › Session types (Nov 25 2026): the list in the session editor's "Session type" dropdown, which
   staff add to and edit themselves (case studies, roundtables, receptions, closing remarks …). Each type is a
   label (what the website shows on the session) and a colour style. Saved for everyone at once
   (backend /api/console/agenda-types); editing the list never changes sessions already saved.
========================================================= */

export function AgendaTypesDialog({ open, onClose, types, onSaved }) {
  const toast = useToast();
  const [rows, setRows] = useState(types);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (open) { setRows(types.map((t) => ({ ...t }))); setErr(""); } }, [open, types]);

  const edit = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i, d) => setRows((rs) => {
    const j = i + d;
    if (j < 0 || j >= rs.length) return rs;
    const out = [...rs];
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  });

  const check = () => {
    const seen = new Set();
    for (const r of rows) {
      const k = r.label.trim().toLowerCase();
      if (!k) continue;
      if (seen.has(k)) return `"${r.label.trim()}" is in the list twice.`;
      seen.add(k);
    }
    return seen.size ? "" : "Keep at least one session type.";
  };

  const save = async () => {
    const problem = check();
    if (problem) { setErr(problem); return; }
    setSaving(true);
    try {
      const r = await adminFetch("/console/agenda-types", { method: "PUT", body: { types: rows.filter((x) => x.label.trim()) } });
      onSaved(r.types);
      toast.success("Session types saved. They show in the dropdown for everyone.");
      onClose();
    } catch (e) { setErr(e?.message || "Couldn't save. Try again."); } finally { setSaving(false); }
  };

  const reset = async () => {
    setSaving(true);
    try {
      const r = await adminFetch("/console/agenda-types/reset", { method: "POST" });
      onSaved(r.types);
      setRows(r.types.map((t) => ({ ...t })));
      toast.success("Back to the standard list.");
    } catch (e) { setErr(e?.message || "Couldn't reset. Try again."); } finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Session types"
      description="The choices in the agenda's Session type dropdown. The name is what the website shows on a session; the colour sets its badge. Changes here don't alter sessions you've already saved."
      footer={<>
        <Button icon={RotateCcw} onClick={reset} disabled={saving} title="Replace the list with the standard one">Standard list</Button>
        <span className="flex-1" />
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={save} loading={saving}>Save types</Button>
      </>}
    >
      <ul className="space-y-2" aria-label="Session types">
        {rows.map((r, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <Input aria-label={`Type ${i + 1} name`} value={r.label} maxLength={60} placeholder="e.g. Case Study"
              onChange={(e) => { setErr(""); edit(i, { label: e.target.value }); }} className="min-w-0 flex-1" />
            <Select aria-label={`Type ${i + 1} colour`} value={r.format} onChange={(e) => edit(i, { format: e.target.value })} className="w-full sm:w-48">
              {FORMAT_KEYS.map((k) => <option key={k} value={k}>Colour: {FORMAT_MAP[k]?.label || k}</option>)}
            </Select>
            <span className="flex shrink-0 items-center">
              <IconButton icon={ArrowUp} label={`Move ${r.label || "type"} up`} onClick={() => move(i, -1)} disabled={i === 0} />
              <IconButton icon={ArrowDown} label={`Move ${r.label || "type"} down`} onClick={() => move(i, 1)} disabled={i === rows.length - 1} />
              <IconButton icon={Trash2} label={`Remove ${r.label || "type"}`} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} />
            </span>
          </li>
        ))}
      </ul>
      <Button icon={Plus} className="mt-3" onClick={() => setRows((rs) => [...rs, { label: "", format: "keynote" }])} disabled={rows.length >= 60}>Add a type</Button>
      {err && <p role="alert" className="mt-3 text-sm font-semibold text-[#B91C1C]">{err}</p>}
    </Modal>
  );
}
