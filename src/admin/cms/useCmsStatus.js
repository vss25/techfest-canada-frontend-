import { useApi } from "../hooks";

/** { configured, loading } — configured is true/false once known, null while loading or on error. */
export default function useCmsStatus() {
  const { data, error } = useApi("/cms/status");
  return { configured: data ? !!data.configured : null, error };
}
