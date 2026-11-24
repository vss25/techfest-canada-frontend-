import { useApi } from "../hooks";
import { useAdmin } from "../adminContext";
import { ErrorState, LoadingState, PageHeader } from "../ui";
import { PromoCodes } from "../tickets/Inventory";
import EventOnly from "../EventOnly";

/* =========================================================
   Admin › Marketing › Promo codes (Nov 18 2026; the approved design puts promo codes in Marketing).
   Any staff can add codes; one that's more than 50% off, free, or has no usage limit is saved
   switched off until a manager approves it (backend services/promoApproval.js). Revenue and
   discount given stay management only. The codes panel itself lives in tickets/Inventory.jsx.
========================================================= */

function PromoCodesPageForEvent() {
  const { isManagement } = useAdmin();
  const { data, error, loading, reload } = useApi("/admin/inventory");
  const passes = Array.isArray(data) ? data.filter((t) => !t.archived && !String(t.tier).startsWith("booth-")).sort((a, b) => (a.price || 0) - (b.price || 0)).map((t) => t.tier) : [];
  return (
    <>
      <PageHeader title="Promo codes"
        description={isManagement
          ? "Discount codes buyers enter at checkout. Staff can add codes; ones over 50% off, free, or without a usage limit wait for your approval."
          : "Discount codes buyers enter at checkout. Codes over 50% off, free, or without a usage limit wait for a manager's approval before they work."} />
      {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : <PromoCodes passes={passes} heading={false} />}
    </>
  );
}

export default function PromoCodesPage() {
  return <EventOnly title="Promo codes" what="promo codes" because="The promo codes here are for The Tech Festival Canada 2026's passes and booths. Codes for this event come with its own ticket types."><PromoCodesPageForEvent /></EventOnly>;
}
