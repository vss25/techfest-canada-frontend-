import { createContext, useContext } from "react";

export const ToastContext = createContext({
  success: () => {},
  error: () => {},
  info: () => {},
});

/** toast.success("Saved"), toast.error(err) — err may be an Error or a string.
    Optional 2nd argument: { action: { label: "Undo", onClick }, duration } */
export const useToast = () => useContext(ToastContext);
