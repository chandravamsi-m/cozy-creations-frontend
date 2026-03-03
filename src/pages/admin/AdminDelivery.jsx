import React, { useState, useEffect } from "react";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const CATEGORIES = [
  { id: "flower", label: "Flower Candles", icon: "🌸" },
  { id: "animal", label: "Animal Candles", icon: "🐾" },
  { id: "festive", label: "Festive Candles", icon: "🎉" },
  { id: "glassjar", label: "Glass Jar Candles", icon: "🫙" },
  { id: "special", label: "Special Candles", icon: "⭐" },
];

const DEFAULT_PACKAGING = {
  flower: { l: 12, w: 12, h: 10 },
  animal: { l: 15, w: 15, h: 12 },
  festive: { l: 18, w: 15, h: 12 },
  glassjar: { l: 12, w: 12, h: 14 },
  special: { l: 20, w: 20, h: 15 },
};

export default function AdminDelivery() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState({ isCodEnabled: true });

  // Store packaging as strings to avoid the leading-zero bug with number inputs
  const [categoryPackaging, setCategoryPackaging] = useState(
    Object.fromEntries(Object.entries(DEFAULT_PACKAGING).map(([k, v]) => [k, { l: String(v.l), w: String(v.w), h: String(v.h) }]))
  );

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const [payRes, pkgRes] = await Promise.all([
        fetch(`${BACKEND_URL}/settings/payment`),
        fetch(`${BACKEND_URL}/settings/packaging`),
      ]);
      if (payRes.ok) { const d = await payRes.json(); if (d.payment) setPaymentSettings(d.payment); }
      if (pkgRes.ok) {
        const d = await pkgRes.json();
        if (d.categoryPackaging) {
          setCategoryPackaging(prev => {
            const merged = { ...prev };
            Object.entries(d.categoryPackaging).forEach(([cat, val]) => {
              merged[cat] = { l: String(val.l ?? ""), w: String(val.w ?? ""), h: String(val.h ?? "") };
            });
            return merged;
          });
        }
      }
    } catch (err) {
      showToast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const updatePkg = (catId, field, value) => {
    // Store raw string — don't convert to Number yet so leading zeros can't form
    setCategoryPackaging(prev => ({
      ...prev,
      [catId]: { ...prev[catId], [field]: value },
    }));
  };

  const handleSave = async () => {
    // Convert strings to numbers only at save time
    const numericPackaging = Object.fromEntries(
      Object.entries(categoryPackaging).map(([cat, pkg]) => [
        cat,
        { l: Number(pkg.l) || 0, w: Number(pkg.w) || 0, h: Number(pkg.h) || 0 },
      ])
    );

    setSaving(true);
    try {
      const [payRes, pkgRes] = await Promise.all([
        fetch(`${BACKEND_URL}/admin/settings/payment`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify(paymentSettings),
        }),
        fetch(`${BACKEND_URL}/admin/settings/packaging`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ categoryPackaging: numericPackaging }),
        }),
      ]);
      if (!payRes.ok || !pkgRes.ok) throw new Error("Save failed");
      showToast("Settings saved!", "success");
    } catch (err) {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 space-y-6">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Store Settings</h2>

      {/* ── Packaging Box Sizes ── */}
      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
        <div className="mb-5 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">📦 Packaging Box Size per Category</h3>
          <p className="text-xs text-gray-500 mt-1">
            Enter the packed box dimensions for each candle type. Shipping rates at checkout are
            calculated automatically using these dimensions and each product's weight.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-3 pr-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="pb-3 px-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Length (cm)</th>
                <th className="pb-3 px-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Width (cm)</th>
                <th className="pb-3 px-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Height (cm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {CATEGORIES.map((cat) => {
                const pkg = categoryPackaging[cat.id] || { l: "", w: "", h: "" };
                return (
                  <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-2 font-semibold text-gray-800">
                        <span className="text-lg">{cat.icon}</span>
                        {cat.label}
                      </span>
                    </td>
                    {["l", "w", "h"].map((field) => (
                      <td key={field} className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={pkg[field]}
                          onChange={(e) => updatePkg(cat.id, field, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          placeholder="—"
                          className="w-20 text-center border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 focus:border-yellow-accent"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3 italic">
          * Product weight is fetched from each product automatically. Shiprocket charges whichever is higher between actual weight and volumetric weight ( L×W×H ÷ 5000 ).
        </p>
      </div>


      {/* ── Payment Options ── */}
      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
        <h3 className="text-base font-bold text-gray-900 mb-4 pb-4 border-b border-gray-100">Payment Options</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div>
            <p className="font-bold text-gray-900 text-sm">Cash on Delivery (COD)</p>
            <p className="text-xs text-gray-500">Allow customers to pay with cash on delivery.</p>
          </div>
          <button
            type="button"
            onClick={() => setPaymentSettings(p => ({ ...p, isCodEnabled: !p.isCodEnabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 p-1 ${paymentSettings.isCodEnabled ? "bg-green-600" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${paymentSettings.isCodEnabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs disabled:bg-gray-300 shadow-lg shadow-blue-100 active:scale-95 transition-all"
        >
          {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
          Save Settings
        </button>
      </div>
    </div>
  );
}
