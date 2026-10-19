import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { local } from "../lib/store";

/* A one-time explanatory card at the bottom of a screen (iOS .coachmark). */

const KEY = "ttfc.seenBlurbs";
const seen = () => { const v = local.json(KEY, []); return Array.isArray(v) ? v : []; };

export default function Coachmark({ id, title, message, icon }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (seen().includes(id) || /[?&]no-coachmarks=1/.test(window.location.search)) return undefined;
    const t = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(t);
  }, [id]);
  if (!show) return null;
  const Icon = icon;
  const close = () => { local.setJSON(KEY, [...new Set([...seen(), id])]); setShow(false); };
  return (
    <div className="coachmark" role="note">
      <span className="coachmark-ico" aria-hidden="true"><Icon /></span>
      <span style={{ flex: 1, minWidth: 0 }}><b>{title}</b><span>{message}</span></span>
      <button type="button" className="coachmark-x pressable" aria-label="Close" onClick={close}><X aria-hidden="true" /></button>
    </div>
  );
}
