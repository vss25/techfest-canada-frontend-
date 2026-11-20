import { Link } from "react-router-dom";
import { useApi } from "../hooks";
import { useAdminEvent } from "../eventContext";
import { Banner, ErrorState, LoadingState, PageHeader } from "../ui";
import SalesAnalytics from "../tickets/SalesAnalytics";

/* Sales › Revenue follows the event chosen in the top bar (Nov 20 2026). TTFC 2026 keeps its full
   revenue page (Stripe); any other event shows only what THAT event has sold, so a 2027 event
   never shows 2026's numbers. API: /console/sales-event/summary. */

const money = (cents) => (Number(cents || 0) / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD" });

export default function EventRevenue() {
  const { current: ev, loading } = useAdminEvent();
  const eventKey = ev?.eventKey?.current || ev?.eventKey || "";
  const other = !!eventKey && eventKey !== "ttfc-2026-main";
  const { data, error, reload } = useApi(other ? `/console/sales-event/summary?event=${eventKey}` : null);
  if (loading && !ev) return <LoadingState />;
  if (!other) return <SalesAnalytics />;
  return (
    <>
      <PageHeader title="Revenue" description={`What ${ev.name} has sold so far. Only paid orders for this event are counted.`} />
      {error && !data ? <ErrorState error={error} onRetry={reload} /> : !data ? <LoadingState /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[["Paid orders", data.orders.toLocaleString(), "for this event"], ["Tickets sold", data.tickets.toLocaleString(), "across those orders"],
              ["Before tax", money(data.subtotalCents), "after discounts"], ["Collected", money(data.totalCents), "including tax"]].map(([l, v, s]) => (
              <div key={l} className="flex flex-col gap-0.5 rounded-xl border border-[#E3E0EE] bg-white px-4 py-3.5">
                <span className="text-xs text-[#6B6688]">{l}</span><b className="text-[22px] text-[#151035]">{v}</b><span className="text-xs text-[#6B6688]">{s}</span>
              </div>
            ))}
          </div>
          {data.orders === 0 && (
            <Banner tone="info" title={`Nothing has been sold for ${ev.name} yet`}>
              Numbers appear here as soon as the first ticket is paid for. To see who took part before and invite them back, open <Link to="/admin/past-participants" className="font-semibold text-[#9D1D63] hover:underline">Past participants</Link>.
            </Banner>
          )}
          <p className="mt-4 text-[13px] text-[#6B6688]">TTFC 2026's revenue is on this same page when TTFC 2026 is the event chosen at the top.</p>
        </>
      )}
    </>
  );
}
