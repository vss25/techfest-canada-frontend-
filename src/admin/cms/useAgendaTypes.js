import { useState } from "react";
import { useApi } from "../hooks";
import { DEFAULT_SESSION_TYPES } from "../../data/sessionFormats";

/** The current list: the saved one, or the standard list until it loads (or if it can't). */
export function useAgendaTypes() {
  const res = useApi("/console/agenda-types");
  const [local, setLocal] = useState(null);
  const types = local || res.data?.types || DEFAULT_SESSION_TYPES;
  return { types, isDefault: local ? false : res.data?.isDefault !== false, set: setLocal, error: res.error };
}
