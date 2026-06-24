import { useEffect, useState } from "react";

const API = "https://techfest-canada-backend.onrender.com/api";

const DISCOUNTS = [10, 25, 50];
const TIERS = [
  { value: "connect", label: "Connect" },
  { value: "influence", label: "Influence" },
  { value: "power", label: "Power" },
];

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TTFC";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminInventory() {

  const [isDark, setIsDark] = useState(true);
  const [inventory, setInventory] = useState([]);

  /* ===== PROMO CODE STATE ===== */
  const [promos, setPromos] = useState([]);
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState(10);
  const [customDiscount, setCustomDiscount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [newTiers, setNewTiers] = useState([]); // empty = all passes
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMsg, setPromoMsg] = useState("");

  useEffect(() => {
    const checkDarkMode = () => { setIsDark(document.body.classList.contains("dark-mode")); };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => { loadInventory(); loadPromos(); }, []);

  const loadInventory = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/admin/inventory`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Inventory load failed:", err); }
  };

  const updatePrice = async (tier, price) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/admin/inventory/${tier}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ price: Number(price) }) });
      loadInventory();
    } catch (err) { console.error("Price update failed"); }
  };

  const updateTotal = async (tier, total) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/admin/inventory/${tier}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ total: Number(total) }) });
      loadInventory();
    } catch (err) { console.error("Total update failed"); }
  };

  /* ================= PROMO CODES ================= */
  const loadPromos = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/admin/promos`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPromos(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Promo load failed:", err); }
  };

  const toggleTier = (tier) => {
    setNewTiers((prev) => prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]);
  };

  const createPromo = async () => {
    const code = newCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) { setPromoMsg("Enter a code or click Generate."); return; }

    const discount = useCustom ? Number(customDiscount) : Number(newDiscount);
    if (!discount || discount <= 0 || discount > 100) {
      setPromoMsg("Discount must be between 1 and 100.");
      return;
    }

    setPromoBusy(true);
    setPromoMsg("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/admin/promos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, discount, tiers: newTiers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setNewCode("");
      setNewDiscount(10);
      setCustomDiscount("");
      setUseCustom(false);
      setNewTiers([]);
      const scope = newTiers.length === 0 ? "all passes" : newTiers.join(", ");
      setPromoMsg(`Created ${data.code} (${data.discount}% off, valid for: ${scope}).`);
      loadPromos();
    } catch (err) {
      setPromoMsg(err.message || "Create failed");
    } finally {
      setPromoBusy(false);
    }
  };

  const togglePromo = async (promo) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/admin/promos/${promo._id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ active: !promo.active }) });
      loadPromos();
    } catch (err) { console.error("Toggle failed"); }
  };

  const deletePromo = async (promo) => {
    if (!window.confirm(`Delete promo code ${promo.code}? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/admin/promos/${promo._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      loadPromos();
    } catch (err) { console.error("Delete failed"); }
  };

  /* ================= CALCULATIONS ================= */
  const totalRevenue = inventory.reduce((sum, i) => sum + (i.sold * (i.price || 0)), 0);
  const totalSold = inventory.reduce((sum, i) => sum + i.sold, 0);
  const totalRemaining = inventory.reduce((sum, i) => sum + (i.total - i.sold), 0);
  const cardClass = isDark ? "stat-card" : "stat-card stat-card-light";

  const t = {
    text: isDark ? "#ffffff" : "#0d0520",
    muted: isDark ? "rgba(255,255,255,0.55)" : "rgba(13,5,32,0.55)",
    panel: isDark ? "rgba(255,255,255,0.03)" : "rgba(122,63,209,0.03)",
    border: isDark ? "rgba(255,255,255,0.10)" : "rgba(122,63,209,0.14)",
    inputBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.04)",
    inputBorder: isDark ? "rgba(255,255,255,0.14)" : "rgba(122,63,209,0.20)",
    rowBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.08)",
  };

  return (
    <>
    <div className="admin-card">
      <h2 className={isDark ? "text-white" : "text-gray-900"}>Ticket Inventory</h2>

      <div className="inventory-stats">
        <div className={cardClass}>
          <p className={isDark ? "text-gray-400" : "text-gray-600"}>Total Revenue</p>
          <h2 className={isDark ? "text-white" : "text-gray-900"}>${totalRevenue.toLocaleString()}</h2>
        </div>
        <div className={cardClass}>
          <p className={isDark ? "text-gray-400" : "text-gray-600"}>Tickets Sold</p>
          <h2 className={isDark ? "text-white" : "text-gray-900"}>{totalSold}</h2>
        </div>
        <div className={cardClass}>
          <p className={isDark ? "text-gray-400" : "text-gray-600"}>Tickets Remaining</p>
          <h2 className={isDark ? "text-white" : "text-gray-900"}>{totalRemaining}</h2>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>Tier</th><th>Price</th><th>Total</th><th>Sold</th><th>Remaining</th><th>Revenue</th><th>Progress</th></tr>
          </thead>
          <tbody>
            {inventory.map((item) => {
              const remaining = item.total - item.sold;
              const revenue = item.sold * (item.price || 0);
              const percent = (item.sold / item.total) * 100;
              return (
                <tr key={item.tier}>
                  <td className={isDark ? "text-white" : "text-gray-900"}>{item.tier.toUpperCase()}</td>
                  <td><input type="number" className={isDark ? "inventory-input" : "inventory-input inventory-input-light"} defaultValue={item.price} onBlur={(e) => updatePrice(item.tier, e.target.value)} /></td>
                  <td><input type="number" className={isDark ? "inventory-input" : "inventory-input inventory-input-light"} defaultValue={item.total} onBlur={(e) => updateTotal(item.tier, e.target.value)} /></td>
                  <td className={isDark ? "text-white" : "text-gray-900"}>{item.sold}</td>
                  <td className={remaining <= 10 ? "remaining-low" : isDark ? "remaining-ok" : "remaining-ok-light"}>{remaining}</td>
                  <td className={isDark ? "text-white" : "text-gray-900"}>${revenue}</td>
                  <td>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
                    <small className={isDark ? "text-gray-400" : "text-gray-600"}>{Math.round(percent)}%</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* ============================================================= */}
    {/* ===== PROMO CODES ===== */}
    {/* ============================================================= */}
    <div className="admin-card" style={{ marginTop: 24 }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2 className={isDark ? "text-white" : "text-gray-900"} style={{ margin: 0 }}>Promo Codes</h2>
        <span style={{ fontSize: "0.72rem", color: t.muted }}>Per-pass scoping &middot; enforced on Stripe checkout</span>
      </div>

      {/* ---- Create panel ---- */}
      <div style={{ marginTop: 18, padding: "20px", background: t.panel, border: "1px solid " + t.border, borderRadius: 14, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Row 1: Code + Generate + Discount */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>

          {/* Code input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 200px", minWidth: 180 }}>
            <label style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: t.muted }}>Code</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") createPromo(); }}
                placeholder="e.g. LAUNCH25"
                spellCheck={false}
                style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontWeight: 700, fontSize: "15px", letterSpacing: "1.5px", textTransform: "uppercase", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
              <button onClick={() => setNewCode(genCode())} title="Generate random code"
                style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid " + t.inputBorder, background: "transparent", color: t.text, fontWeight: 700, fontSize: "0.74rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              </button>
            </div>
          </div>

          {/* Discount selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: t.muted }}>Discount</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {DISCOUNTS.map((d) => {
                const active = !useCustom && newDiscount === d;
                return (
                  <button key={d} onClick={() => { setNewDiscount(d); setUseCustom(false); }}
                    style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid " + (active ? "#7a3fd1" : t.inputBorder), background: active ? "linear-gradient(135deg, #7a3fd1, #f5a623)" : "transparent", color: active ? "#fff" : t.text, fontWeight: 800, fontSize: "0.78rem", cursor: "pointer", transition: "all 0.15s" }}>
                    {d}%
                  </button>
                );
              })}
              <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid " + (useCustom ? "#7a3fd1" : t.inputBorder), borderRadius: 10, padding: "2px 6px 2px 8px", background: useCustom ? (isDark ? "rgba(122,63,209,0.12)" : "rgba(122,63,209,0.06)") : "transparent" }}>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customDiscount}
                  onChange={(e) => { setCustomDiscount(e.target.value); setUseCustom(true); }}
                  onFocus={() => setUseCustom(true)}
                  placeholder="Custom"
                  style={{ width: 70, padding: "8px 4px", border: "none", background: "transparent", color: t.text, fontWeight: 700, fontSize: "0.85rem", outline: "none", fontFamily: "inherit" }}
                />
                <span style={{ color: t.muted, fontWeight: 700, fontSize: "0.85rem" }}>%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Tier scope */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: t.muted }}>Valid For</label>
            <span style={{ fontSize: "0.66rem", color: t.muted, fontStyle: "italic" }}>
              {newTiers.length === 0 ? "All passes" : `${newTiers.length} pass${newTiers.length === 1 ? "" : "es"} selected`}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {/* All passes */}
            <button onClick={() => setNewTiers([])}
              style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid " + (newTiers.length === 0 ? "#7a3fd1" : t.inputBorder), background: newTiers.length === 0 ? "linear-gradient(135deg, #7a3fd1, #f5a623)" : "transparent", color: newTiers.length === 0 ? "#fff" : t.text, fontWeight: 800, fontSize: "0.74rem", letterSpacing: "0.3px", cursor: "pointer" }}>
              All Passes
            </button>
            {TIERS.map((tier) => {
              const active = newTiers.includes(tier.value);
              return (
                <button key={tier.value} onClick={() => toggleTier(tier.value)}
                  style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid " + (active ? "#7a3fd1" : t.inputBorder), background: active ? "rgba(122,63,209,0.18)" : "transparent", color: active ? (isDark ? "#c8a8ff" : "#7a3fd1") : t.text, fontWeight: 800, fontSize: "0.74rem", letterSpacing: "0.3px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {active && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                  {tier.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Create button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={createPromo} disabled={promoBusy}
            style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #7a3fd1, #f5a623)", color: "#fff", fontWeight: 800, fontSize: "0.74rem", letterSpacing: "0.5px", cursor: promoBusy ? "not-allowed" : "pointer", opacity: promoBusy ? 0.6 : 1, boxShadow: "0 4px 16px rgba(122,63,209,0.3)" }}>
            {promoBusy ? "Creating\u2026" : "Create Promo Code"}
          </button>
        </div>
      </div>

      {promoMsg && (
        <div style={{ marginTop: 10, fontSize: "0.78rem", color: promoMsg.startsWith("Created") ? "#3fb968" : "#e05555", fontWeight: 600 }}>{promoMsg}</div>
      )}

      {/* ---- Existing codes table ---- */}
      <div className="table-wrapper" style={{ marginTop: 18 }}>
        <table className="admin-table">
          <thead>
            <tr><th>Code</th><th>Discount</th><th>Valid For</th><th>Status</th><th>Used</th><th>Action</th></tr>
          </thead>
          <tbody>
            {promos.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: t.muted, padding: "20px 0" }}>No promo codes yet. Create one above.</td></tr>
            )}
            {promos.map((promo) => {
              const scope = Array.isArray(promo.tiers) && promo.tiers.length > 0
                ? promo.tiers.map(tr => tr.charAt(0).toUpperCase() + tr.slice(1)).join(", ")
                : "All passes";
              return (
                <tr key={promo._id}>
                  <td className={isDark ? "text-white" : "text-gray-900"} style={{ fontWeight: 700, letterSpacing: "1px" }}>{promo.code}</td>
                  <td className={isDark ? "text-white" : "text-gray-900"}>{promo.discount}%</td>
                  <td className={isDark ? "text-white" : "text-gray-900"} style={{ fontSize: "0.85rem" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: (Array.isArray(promo.tiers) && promo.tiers.length > 0) ? "rgba(122,63,209,0.15)" : "rgba(63,185,104,0.15)", color: (Array.isArray(promo.tiers) && promo.tiers.length > 0) ? (isDark ? "#c8a8ff" : "#7a3fd1") : "#3fb968", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.3px" }}>
                      {scope}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => togglePromo(promo)}
                      style={{ padding: "5px 12px", borderRadius: 999, border: "1px solid " + (promo.active ? "rgba(63,185,104,0.5)" : t.inputBorder), background: promo.active ? "rgba(63,185,104,0.15)" : "transparent", color: promo.active ? "#3fb968" : t.muted, fontWeight: 700, fontSize: "0.68rem", letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer" }}>
                      {promo.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className={isDark ? "text-white" : "text-gray-900"}>{promo.timesUsed ?? 0}</td>
                  <td>
                    <button onClick={() => deletePromo(promo)}
                      style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(224,85,85,0.4)", background: "transparent", color: "#e05555", fontWeight: 700, fontSize: "0.68rem", letterSpacing: "0.5px", cursor: "pointer" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
