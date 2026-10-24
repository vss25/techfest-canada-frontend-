import { createContext, useContext } from "react";

/** { me, access, isManagement, isVolunteer } — shared by the shell and pages (volunteers: People only, access.js). */
export const AdminContext = createContext({ me: null, access: null, isManagement: false, isVolunteer: false });
export const useAdmin = () => useContext(AdminContext);
