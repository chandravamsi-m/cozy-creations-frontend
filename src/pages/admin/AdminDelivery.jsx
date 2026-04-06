import React, { useState, useEffect } from "react";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import Skeleton from "../../components/common/Skeleton";
import { useSettings } from "../../contexts/SettingsContext";
import { Banknote, Settings, Truck } from "lucide-react";
import { apiFetch } from "../../lib/api";
import {
  coerceAdminNumberInput,
  getStableAdminNumberValue,
  parseAdminNumber,
  preventNumberWheelChange,
} from "../../utils/adminNumberInputs";

export default function AdminDelivery() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  const { refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState({
    isCodEnabled: true,
    isPlatformFeeEnabled: false,
    platformFee: 0
  });

  const [deliverySettings, setDeliverySettings] = useState({
    isActive: false,
    amount: 0,
    freeDeliveryThreshold: 0,
    isShippingFeeEnabled: true
  });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const [payRes, delRes] = await Promise.all([
        apiFetch("/settings/payment"),
        apiFetch("/settings/delivery")
      ]);

      if (payRes.ok) {
        const d = await payRes.json();
        if (d.payment) {
          setPaymentSettings({
            ...d.payment,
            platformFee: getStableAdminNumberValue(d.payment.platformFee ?? 0),
          });
        }
      }
      if (delRes.ok) {
        const d = await delRes.json();
        if (d.delivery) {
          setDeliverySettings({
            ...d.delivery,
            amount: getStableAdminNumberValue(d.delivery.amount ?? 0),
            freeDeliveryThreshold: getStableAdminNumberValue(d.delivery.freeDeliveryThreshold ?? 0),
          });
        }
      }
    } catch {
      showToast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const [payRes, delRes] = await Promise.all([
        apiFetch("/admin/settings/payment", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            ...paymentSettings,
            platformFee: parseAdminNumber(paymentSettings.platformFee),
          }),
        }),
        apiFetch("/admin/settings/delivery", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            ...deliverySettings,
            amount: parseAdminNumber(deliverySettings.amount),
            freeDeliveryThreshold: parseAdminNumber(deliverySettings.freeDeliveryThreshold),
          }),
        })
      ]);

      if (!payRes.ok || !delRes.ok) throw new Error("Save failed");

      // Update global context cache
      await refreshSettings();

      showToast("Settings saved!", "success");
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 space-y-6">
        <Skeleton width="300px" height="32px" className="mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton height="250px" borderRadius="16px" className="w-full" />
          <Skeleton height="250px" borderRadius="16px" className="w-full" />
        </div>
        <Skeleton height="150px" borderRadius="16px" className="w-full" />
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-5 relative">
      <div className="p-4 sm:p-6 bg-transparent sm:bg-white sm:rounded-2xl sm:shadow-md sm:border sm:border-gray-100">
        <h2 className="text-xl font-black text-gray-900 mb-6">Delivery & Store Settings</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Payment Section ── */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Payment Methods</p>
            
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:border-blue-200">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl">
                  <Banknote className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Cash on Delivery (COD)</p>
                  <p className="text-[10px] text-gray-500 font-medium">Enable cash payments at the doorstep.</p>
                </div>
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

          {/* ── Platform Fee Section ── */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4">Platform Fee Settings</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:border-blue-200">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl">
                    <Settings className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Enable Platform Fee</p>
                    <p className="text-[10px] text-gray-500 font-medium">Charge a small fee on every order.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentSettings(p => ({ ...p, isPlatformFeeEnabled: !p.isPlatformFeeEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 p-1 ${paymentSettings.isPlatformFeeEnabled ? "bg-green-600" : "bg-gray-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${paymentSettings.isPlatformFeeEnabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {paymentSettings.isPlatformFeeEnabled && (
                <div className="p-4 bg-white border border-blue-100 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Fee Amount (₹)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    value={paymentSettings.platformFee}
                    onChange={(e) =>
                      setPaymentSettings((p) => ({
                        ...p,
                        platformFee: coerceAdminNumberInput(String(p.platformFee ?? ""), e.target.value, { allowDecimal: true }),
                      }))
                    }
                    onWheel={preventNumberWheelChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-medium shadow-inner"
                    placeholder="e.g. 80"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* ── Shipping Fee Settings Section ── */}
          <div className="bg-orange-50 rounded-xl p-6 border border-orange-100 lg:col-span-2">
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-4">Shipping Config</p>
            
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:border-orange-200">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl">
                  <Truck className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Enable Shipping Fee</p>
                  <p className="text-[10px] text-gray-500 font-medium">Toggle on to dynamically apply shipping charges across the store.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeliverySettings(p => ({ ...p, isShippingFeeEnabled: !p.isShippingFeeEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 p-1 ${deliverySettings.isShippingFeeEnabled ? "bg-green-600" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${deliverySettings.isShippingFeeEnabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Save Button ── */}
        <div className="mt-8 flex justify-end pt-6 border-t border-gray-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-8 py-3 rounded-xl transition-all font-bold uppercase tracking-widest text-xs disabled:bg-gray-300 shadow-lg shadow-blue-100 active:scale-95"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
