import { createContext, useContext } from "react";

/** { me, access, isManagement, isSuperAdmin, isVolunteer } — shared by the shell and pages (volunteers: People only, access.js). */
export const AdminContext = createContext({ me: null, access: null, isManagement: false, isSuperAdmin: false, isVolunteer: false });
export const useAdmin = () => useContext(AdminContext);
