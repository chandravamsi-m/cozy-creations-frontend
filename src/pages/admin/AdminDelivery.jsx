import React, { useState, useEffect } from "react";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function AdminDelivery() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    isActive: false,
    amount: 0,
    freeDeliveryThreshold: 0,
    message: ""
  });

  const [paymentSettings, setPaymentSettings] = useState({
    isCodEnabled: true
  });

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch Delivery Settings
      const delRes = await fetch(`${BACKEND_URL}/settings/delivery`);
      if (delRes.ok) {
        const delData = await delRes.json();
        if (delData.delivery) setSettings(delData.delivery);
      }

      // Fetch Payment Settings
      const payRes = await fetch(`${BACKEND_URL}/settings/payment`);
      if (payRes.ok) {
        const payData = await payRes.json();
        if (payData.payment) setPaymentSettings(payData.payment);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Save Delivery Settings
      const delRes = await fetch(`${BACKEND_URL}/admin/settings/delivery`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(settings),
      });

      // Save Payment Settings
      const payRes = await fetch(`${BACKEND_URL}/admin/settings/payment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(paymentSettings),
      });

      if (!delRes.ok || !payRes.ok) throw new Error("Failed to save settings");

      showToast("Settings updated successfully!", "success");
    } catch (err) {
      console.error(err);
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
    <div className="p-4 sm:p-5 relative">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 truncate">Store Settings</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Delivery Charges</h3>
            <p className="text-sm text-gray-500">Enable or disable delivery charges store-wide.</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, isActive: !settings.isActive })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 p-1 ${settings.isActive ? "bg-green-600" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.isActive ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Standard Delivery Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                value={settings.amount}
                onChange={(e) => setSettings({ ...settings, amount: e.target.value === "" ? "" : Number(e.target.value) })}
                disabled={!settings.isActive}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Free Delivery Threshold (₹)
              </label>
              <input
                type="number"
                min="0"
                value={settings.freeDeliveryThreshold}
                onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: e.target.value === "" ? "" : Number(e.target.value) })}
                disabled={!settings.isActive}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <p className="text-xs text-gray-500">Orders above this amount will have free delivery. Set to 0 to disable.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">
              Delivery Message (Optional)
            </label>
            <input
              type="text"
              value={settings.message}
              onChange={(e) => setSettings({ ...settings, message: e.target.value })}
              placeholder="e.g. Free delivery on orders above ₹999!"
              disabled={!settings.isActive}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 mt-6">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Payment Options</h3>
            <p className="text-sm text-gray-500">Enable or disable payment methods.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <p className="font-bold text-gray-900">Cash on Delivery (COD)</p>
              <p className="text-xs text-gray-500">Allow customers to pay with cash upon delivery.</p>
            </div>
            <button
              type="button"
              onClick={() => setPaymentSettings({ ...paymentSettings, isCodEnabled: !paymentSettings.isCodEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 p-1 ${paymentSettings.isCodEnabled ? "bg-green-600" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${paymentSettings.isCodEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-8 py-3 rounded-xl transition-all font-bold uppercase tracking-widest text-xs disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-blue-100 active:scale-95"
        >
          {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
          Save
        </button>
      </div>
    </div>
  );
}
