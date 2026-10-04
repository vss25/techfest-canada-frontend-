import { useAdmin } from "../adminContext";
import { Badge, PageHeader } from "../ui";
import { ChangePassword } from "./StaffAccounts";

export default function MyAccount() {
  const { me, isManagement } = useAdmin();
  return (
    <>
      <PageHeader eyebrow="Staff & safety" title="My account" description="Your staff sign-in for this panel." />
      <div className="grid max-w-3xl gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[18px] border border-ttfc-line bg-ttfc-panel p-5 sm:p-6">
          <p className="text-sm font-semibold">{me?.name}</p>
          <p className="font-mono text-xs text-ttfc-muted">{me?.email}</p>
          <div className="mt-4"><Badge tone={isManagement ? "orange" : "neutral"}>{isManagement ? "Management" : "Staff"}</Badge></div>
          <p className="mt-2 text-xs text-ttfc-muted">
            {isManagement
              ? "You can see everything, including sales, revenue, promo codes and staff settings."
              : "You can use everything except sales, revenue, promo codes and staff settings. Ask management if you need more access."}
          </p>
        </div>
        <ChangePassword />
      </div>
    </>
  );
}
