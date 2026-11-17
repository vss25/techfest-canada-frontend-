import { useLocation } from "react-router-dom";
import { fieldHelpFor } from "./help";
import { navItemFor } from "./nav";

/* The explanation of one field on the current page (help.js FIELD_HELP), for the ⓘ after its label. */
/** The explanation for a field on the page at this address, or "". */
export function useFieldHelp(label) {
  const { pathname } = useLocation();
  const to = navItemFor(pathname)?.item.to;
  return typeof label === "string" ? fieldHelpFor(to, label) : "";
}

