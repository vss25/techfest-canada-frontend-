import { createContext, useContext } from "react";

export const ToastContext = createContext({
  success: () => {},
  error: () => {},
  info: () => {},
});

/** toast.success("Saved"), toast.error(err) — err may be an Error or a string. */
export const useToast = () => useContext(ToastContext);
