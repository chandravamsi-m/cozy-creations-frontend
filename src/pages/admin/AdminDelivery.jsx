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
    <div className="p-0 sm:p-5 relative">
      <div className="p-4 sm:p-8 bg-transparent sm:bg-white sm:rounded-2xl sm:shadow-md sm:border sm:border-gray-100">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 mb-6">
          🚚 Delivery & Store Settings
        </h1>

        <div className="space-y-8">
          {/* ── Packaging Section ── */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📦</span>
              <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider text-xs">Packaging Dimensions</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Set default box sizes per category for dynamic shipping calculations.
            </p>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm border-spacing-y-2 border-separate">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="pb-4 font-bold uppercase tracking-wider text-[10px]">Category</th>
                    <th className="pb-4 px-4 font-bold uppercase tracking-wider text-[10px] text-center">L (cm)</th>
                    <th className="pb-4 px-4 font-bold uppercase tracking-wider text-[10px] text-center">W (cm)</th>
                    <th className="pb-4 px-4 font-bold uppercase tracking-wider text-[10px] text-center">H (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-transparent">
                  {CATEGORIES.map((cat) => {
                    const pkg = categoryPackaging[cat.id] || { l: "", w: "", h: "" };
                    return (
                      <tr key={cat.id} className="group transition-colors">
                        <td className="py-1.5 pr-4">
                          <div className="flex items-center gap-3 bg-gray-50/50 p-2.5 rounded-2xl group-hover:bg-gray-100/50 transition-colors">
                            <span className="text-lg w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm">{cat.icon}</span>
                            <span className="font-bold text-gray-800 text-sm tracking-tight">{cat.label}</span>
                          </div>
                        </td>
                        {["l", "w", "h"].map((field) => (
                          <td key={field} className="py-1.5 px-1 text-center">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={pkg[field]}
                              onChange={(e) => updatePkg(cat.id, field, e.target.value)}
                              className="w-20 text-center bg-gray-50 border-none rounded-xl py-2.5 px-2 font-bold text-gray-900 text-sm focus:bg-white focus:ring-2 focus:ring-yellow-accent transition-all placeholder:text-gray-300"
                              placeholder="0"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-4">
              {CATEGORIES.map((cat) => {
                const pkg = categoryPackaging[cat.id] || { l: "", w: "", h: "" };
                return (
                  <div key={cat.id} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xl w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm">{cat.icon}</span>
                      <span className="font-bold text-gray-900">{cat.label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { f: "l", l: "Len" },
                        { f: "w", l: "Wid" },
                        { f: "h", l: "Hei" }
                      ].map((item) => (
                        <div key={item.f} className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">{item.l}</label>
                          <input
                            type="number"
                            value={pkg[item.f]}
                            onChange={(e) => updatePkg(cat.id, item.f, e.target.value)}
                            className="w-full text-center bg-white border border-gray-100 rounded-xl py-2.5 font-bold text-gray-900 text-xs focus:ring-2 focus:ring-yellow-accent"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-6 flex items-start gap-2 italic">
              <span className="text-gray-300">💡</span>
              Shiprocket uses the higher of actual weight vs volumetric weight (L×W×H ÷ 5000) for calculation.
            </p>
          </section>

          <hr className="border-gray-50" />

          {/* ── Payment Section ── */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl">💳</span>
              <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider text-xs">Payment Methods</h3>
            </div>
            <div className="flex items-center justify-between p-5 bg-gray-50/50 rounded-3xl border border-gray-100 hover:border-green-100 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm">💵</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm sm:text-base">Cash on Delivery (COD)</p>
                  <p className="text-[11px] text-gray-500 font-medium tracking-tight">Enable cash payments at the doorstep.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentSettings(p => ({ ...p, isCodEnabled: !p.isCodEnabled }))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all shrink-0 p-1.5 ${paymentSettings.isCodEnabled ? "bg-green-500" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${paymentSettings.isCodEnabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </section>

          {/* ── Save Button ── */}
          <div className="flex justify-end pt-8 border-t border-gray-50">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-black uppercase tracking-[0.1em] text-[12px] shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:bg-gray-300"
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              {saving ? "SAVING..." : "SAVE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
