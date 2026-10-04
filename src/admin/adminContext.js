import { createContext, useContext } from "react";

/** { me, kill, setKill, reloadKill } — shared by the shell and pages. */
export const AdminContext = createContext({ me: null, kill: null, setKill: () => {}, reloadKill: () => {} });
export const useAdmin = () => useContext(AdminContext);
