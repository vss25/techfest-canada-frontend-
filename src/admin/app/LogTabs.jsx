import { useNavigate } from "react-router-dom";
import { useAdmin } from "../adminContext";
import { Tabs } from "../ui";

const LOG_TABS = [
  { key: "changes", label: "Changes", to: "/admin/app/audit" },
  { key: "staff", label: "Staff activity", to: "/admin/app/staff-activity" },
];

/** The audit log's tabs (Changes · Staff activity), for the super admin only: everyone else sees no tabs. */
export default function LogTabs({ value }) {
  const { isSuperAdmin } = useAdmin();
  const navigate = useNavigate();
  if (!isSuperAdmin) return null;
  return <Tabs label="Log" tabs={LOG_TABS} value={value} onChange={(k) => navigate(LOG_TABS.find((t) => t.key === k).to)} />;
}
