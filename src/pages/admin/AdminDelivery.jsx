import React, { useState, useEffect } from "react";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function AdminDelivery() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState({ isCodEnabled: true });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const payRes = await fetch(`${BACKEND_URL}/settings/payment`);
      if (payRes.ok) { 
        const d = await payRes.json(); 
        if (d.payment) setPaymentSettings(d.payment); 
      }
    } catch (err) {
      showToast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payRes = await fetch(`${BACKEND_URL}/admin/settings/payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(paymentSettings),
      });
      if (!payRes.ok) throw new Error("Save failed");
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
          🚚 Delivery &amp; Store Settings
        </h1>

        <div className="space-y-8">

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
