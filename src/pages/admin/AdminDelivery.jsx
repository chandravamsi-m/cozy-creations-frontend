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

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/settings/delivery`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      if (data.delivery) {
        setSettings(data.delivery);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load delivery settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/admin/settings/delivery`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      const data = await res.json();
      setSettings(data.delivery);
      showToast("Delivery settings updated successfully!", "success");
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Delivery Settings</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Delivery Charges</h3>
            <p className="text-sm text-gray-500">Enable or disable delivery charges store-wide.</p>
          </div>
          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.isActive}
              onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Delivery Amount */}
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

            {/* Free Delivery Threshold */}
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

          {/* Message */}
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


          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-black text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider text-sm hover:bg-gray-800 transition-colors disabled:bg-gray-400 flex items-center gap-2"
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
