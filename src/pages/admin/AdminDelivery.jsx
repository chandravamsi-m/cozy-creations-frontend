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
    attarWeights: {
      "3ml": 80,
      "6ml": 120,
      "9ml": 150,
      "12ml": 200,
      "25ml": 300,
      "50ml": 400,
      "100ml": 500
    }
  });

  const [originalPaymentSettings, setOriginalPaymentSettings] = useState(null);
  const [originalDeliverySettings, setOriginalDeliverySettings] = useState(null);

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
          const parsed = {
            ...d.payment,
            platformFee: getStableAdminNumberValue(d.payment.platformFee ?? 0),
          };
          setPaymentSettings(parsed);
          setOriginalPaymentSettings(parsed);
        }
      }
      if (delRes.ok) {
        const d = await delRes.json();
        if (d.delivery) {
          const parsed = {
            ...d.delivery,
            amount: getStableAdminNumberValue(d.delivery.amount ?? 0),
            freeDeliveryThreshold: getStableAdminNumberValue(d.delivery.freeDeliveryThreshold ?? 0),
            attarWeights: d.delivery.attarWeights || deliverySettings.attarWeights,
          };
          setDeliverySettings(parsed);
          setOriginalDeliverySettings(parsed);
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
            attarWeights: deliverySettings.attarWeights,
          }),
        })
      ]);

      if (!payRes.ok || !delRes.ok) throw new Error("Save failed");

      // Update global context cache
      await refreshSettings();
      
      // Update original settings so button disables again
      setOriginalPaymentSettings(paymentSettings);
      setOriginalDeliverySettings(deliverySettings);

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

  const hasChanges =
    JSON.stringify(paymentSettings) !== JSON.stringify(originalPaymentSettings) ||
    JSON.stringify(deliverySettings) !== JSON.stringify(originalDeliverySettings);

  const sortedAttarWeights = Object.entries(deliverySettings.attarWeights).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-row items-center justify-between gap-2 px-1 pt-1 mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 leading-none">Delivery & Store Settings</h2>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="bg-black hover:bg-gray-800 text-white flex justify-center items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl transition-all font-bold tracking-widest text-xs disabled:bg-gray-300 shadow-sm active:scale-95 disabled:active:scale-100 whitespace-nowrap shrink-0"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="sm:hidden">Saving</span>
              <span className="hidden sm:inline">Saving...</span>
            </>
          ) : (
            <>
              <span className="sm:hidden">Save</span>
              <span className="hidden sm:inline">Save Settings</span>
            </>
          )}
        </button>
      </div>
      <div className="sm:bg-white sm:border sm:border-gray-100 sm:rounded-2xl sm:p-6 sm:shadow-sm">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* ── Payment Section ── */}
          <div className="bg-white sm:bg-gray-50 rounded-2xl sm:rounded-xl p-5 sm:p-6 border border-gray-100 shadow-sm sm:shadow-none">
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
          <div className="bg-white sm:bg-blue-50 rounded-2xl sm:rounded-xl p-5 sm:p-6 border border-gray-100 sm:border-blue-100 shadow-sm sm:shadow-none">
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

        </div>

        {/* ── Default Shipping Weights Section ── */}
        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-xl shadow-sm sm:shadow-none overflow-hidden mt-4 sm:mt-6">
          <div className="bg-gray-50/50 p-5 sm:p-6 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm tracking-wide uppercase mb-1">Attar Shipping Weights (Grams)</h3>
            <p className="text-[11px] text-gray-500 font-medium">Configure exact package weight (including box, glass bottle, etc.) for each size to calculate accurate Shiprocket shipping.</p>
          </div>
          
          <div className="p-5 sm:p-6">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                Attar Volumes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedAttarWeights.map(([label, weight]) => (
                  <div key={label} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:border-purple-200 transition-colors group">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={weight}
                        onChange={(e) => {
                          const val = coerceAdminNumberInput(String(weight), e.target.value);
                          setDeliverySettings(p => ({
                            ...p,
                            attarWeights: { ...p.attarWeights, [label]: val }
                          }));
                        }}
                        onWheel={preventNumberWheelChange}
                        className="w-16 px-2 py-1 text-right bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all text-xs font-bold text-gray-900"
                        placeholder="0"
                      />
                      <span className="text-[10px] font-bold text-gray-400">g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

      </div>
    </div>
  );
}
