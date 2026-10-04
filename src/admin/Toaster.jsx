import { useCallback, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { ToastContext } from "./toastContext";

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TONE = {
  success: "border-emerald-400/30 bg-[#0f2a22] text-emerald-100",
  error: "border-red-400/40 bg-[#2d1018] text-red-100",
  info: "border-ttfc-purple/40 bg-ttfc-panel2 text-ttfc-text",
};

export default function Toaster({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = ++idRef.current;
    const text = message instanceof Error ? message.message : String(message ?? "");
    setItems((xs) => [...xs.slice(-3), { id, type, text }]);
    setTimeout(() => dismiss(id), type === "error" ? 6500 : 3200);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100000] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
        aria-live="polite"
        role="status"
      >
        {items.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl shadow-black/40 backdrop-blur animate-in fade-in slide-in-from-bottom-2 ${TONE[t.type]}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="flex-1 leading-snug">{t.text}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-md p-0.5 opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ttfc-purple"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
